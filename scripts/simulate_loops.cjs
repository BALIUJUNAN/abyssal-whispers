#!/usr/bin/env node
/**
 * scripts/simulate_loops.cjs — 28天资源曲线模拟器 v3
 *
 * 模拟 1000 次标准玩法，校准食物/药品/线索产出量，
 * 目标：标准玩法存活率 30%-40%（贴合克苏鲁生存基调）
 *
 * 核心机制：
 *   - 资源欺诈（SAN 联动）：高 SAN 如实，低 SAN 虚高显示但实际获取打折
 *   - 恐惧画像差异化资源权重
 *   - 28天精细化资源曲线
 *   - RNG bug 修复：每轮独立种子
 *
 * 用法:
 *   node scripts/simulate_loops.cjs --loops 1000 --seed 42
 *   node scripts/simulate_loops.cjs --loops 1000 --fear ocean --coping avoidant
 *   node scripts/simulate_loops.cjs --loops 1000 --target-survival 35
 *   node scripts/simulate_loops.cjs --loops 1000 --all-fears   # 全恐惧画像对比
 *   node scripts/simulate_loops.cjs --loops 500 --calibrate    # 自动校准模式
 *   node scripts/simulate_loops.cjs --engine --loops 1000     # 使用纯 JS 引擎
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// ── Parse args (MUST precede USE_ENGINE_CORE) ─────────
const args = process.argv.slice(2);
function getArg(name, def) {
  const idx = args.indexOf('--' + name);
  if (idx === -1) return def;
  return args[idx + 1] || def;
}
const MAX_LOOPS = parseInt(getArg('loops', '1000'), 10);
const SEED_ARG = getArg('seed', null);
const VERBOSE = args.includes('--verbose');
const PROGRESS = args.includes('--progress');
const JSON_OUTPUT = args.includes('--json');
const FEAR_PRIMARY = getArg('fear', null);
const COPING = getArg('coping', null);
const TARGET_SURVIVAL = parseFloat(getArg('target-survival', '35'));
const ALL_FEARS = args.includes('--all-fears');
const CALIBRATE = args.includes('--calibrate');

// ── Optional: Pure JS engine core (engine/engineCore.js) ──────────────
// Use --engine flag to use the pure JS engineCore.js instead of inline simulation.
// engineCore.js runs in pure Node.js with zero React/browser dependencies.
const USE_ENGINE_CORE = args.includes('--engine');
let engineCore = null;
if (USE_ENGINE_CORE) {
  try {
    engineCore = require('../src/engine/engineCore.js');
    if (VERBOSE) console.log('[sim] Using engineCore.js (pure JS engine)');
  } catch (e) {
    console.warn('[sim] engineCore.js not available, falling back to inline simulation:', e.message);
  }
}



// ── Seeded PRNG (xorshift32) ────────────────────────
// FIX (v3): increment global seed so each makeRng(null) call produces a
// different sequence. Previously all 1000 runs shared the same seed,
// making results non-independent.
var _masterSeed = SEED_ARG ? parseInt(SEED_ARG, 10) : Date.now();

function seededRandom() {
  _masterSeed ^= _masterSeed << 13;
  _masterSeed ^= _masterSeed >> 17;
  _masterSeed ^= _masterSeed << 5;
  return (_masterSeed >>> 0) / 4294967296;
}

function makeRng(seed) {
  // Use fresh seed per call when seed is null — each call gets a unique sequence
  var s = seed != null ? seed : (_masterSeed++);
  return {
    next: function () {
      s ^= s << 13;
      s ^= s >> 17;
      s ^= s << 5;
      return (s >>> 0) / 4294967296;
    },
    intBetween: function (lo, hi) {
      return lo + Math.floor(this.next() * (hi - lo + 1));
    },
    pick: function (arr) {
      return arr[Math.floor(this.next() * arr.length)];
    },
    seed: s,
  };
}

// ── Calibration Parameters (v3 — tuned for 30-40% survival) ──
var CAL = {
  // Starting resources
  startingFood: 4,             // v3: 3→4 (extra day buffer)
  startingAp: 12,
  startingMoney: 5,
  startingSan: 55,
  startingHp: 10,

  // Daily consumption
  dailyFoodConsumption: 1,       // 1 food per day base
  starvationHpDamage: 2,         // HP damage per starvation day (v3: 1→2)
  starvationSanDamage: 2,        // SAN damage per starvation day (v3: 1→2)

  // starvationHpDamage: 3 (v3: was 2 — primary survival pressure)
  starvationHpDamage: 2,       // v3: 3→2 (HP death at 34.7% was too high)
  // Work system
  workApCost: 2,
  workIncomeMin: 3,
  workIncomeMax: 8,             // v3: 10→8 (less reliable income)
  buyFoodApCost: 1,
  foodPrice: 4,                 // v3: 3→4 (food buying is primary survival, needs nerf)

  // Resource gain rates (per 100 explore events) — v3: drastically reduced
  foodPerHundredEvents: 40,      // v3: 35→40 (calibrated for ~35% survival)
  medicinePerHundredEvents: 12,  // v3: 15→12
  cluePerHundredEvents: 25,      // v3: 35→25

  // Medicine effectiveness
  medicineCureAmount: 3,
  medicineUseThreshold: 4,

  // Clue progression requirement
  cluesNeededForEnding: 5,

  // SAN pressure curve (per day, base) — v3: significantly increased
  baseSanLossPerDay: 3.0,        // v3: 1.5→3.0
  sanLossVariance: 1.5,          // v3: 1.0→1.5

  // Area danger multipliers
  areaDangerMult: {
    town_center: 0.8,
    harbor_district: 1.3,        // v3: 1.2→1.3
    lighthouse: 1.6,             // v3: 1.5→1.6
    catacombs_entrance: 2.0,     // v3: 1.8→2.0
    deep_catacombs: 2.5,         // v3: 2.0→2.5
    voxchester_manor: 1.5,       // v3: 1.4→1.5
    forbidden_grove: 1.8,        // v3: 1.6→1.8
    ruins_of_yith: 2.5,          // v3: 2.2→2.5
  },

  // Infection rates by area — v3: slightly increased
  infectionRisk: {
    town_center: 0,
    harbor_district: 0.35,       // v3: 0.3→0.35
    lighthouse: 0,
    catacombs_entrance: 0.25,    // v3: 0.2→0.25
    deep_catacombs: 0.6,         // v3: 0.5→0.6
    voxchester_manor: 0.15,      // v3: 0.1→0.15
    forbidden_grove: 0.4,        // v3: 0.3→0.4
    ruins_of_yith: 0.6,          // v3: 0.5→0.6
  },
};

// ── Resource Fraud State (SAN-driven) ───────────────
// Mirrors resourceFraud.js tiers but self-contained for simulation.
// High SAN = accurate, low SAN = inflated display + reduced actual gains.
function getResourceFraudState(san) {
  if (san >= 50) return { displayMult: 1.0, realMult: 1.0, active: false, tier: 0 };
  if (san >= 35) return { displayMult: 1.15, realMult: 1.0,  active: true, tier: 1 };   // mild
  if (san >= 20) return { displayMult: 1.30, realMult: 0.80, active: true, tier: 2 };  // moderate
  if (san >= 10) return { displayMult: 1.50, realMult: 0.60, active: true, tier: 3 };  // severe
  return            { displayMult: 1.70, realMult: 0.40, active: true, tier: 4 };       // critical
}

// ── Fear Profile → SAN loss modifier ─────────────────
// Survival fears (isolation, body, morality) get reduced SAN loss
// representing safer playstyle / safehouse refuge.
// Knowledge fears (knowledge, control) get increased SAN loss
// representing deeper investigation into horror.
function getSanLossModifier(fearW) {
  if (!fearW) return 1.0;
  // Survival-oriented fears reduce SAN drain (safehouse refuge)
  if (fearW.food >= 1.3) return 0.80;       // 20% less SAN loss
  // Knowledge-oriented fears increase SAN drain (deep investigation)
  if (fearW.clue >= 1.3) return 1.25;       // 25% more SAN loss
  return 1.0;
}

// ── Fear Profile Resource Weights ────────────────────
// Maps game fear types + coping styles to resource generation multipliers.
// "survival fear" (isolation/body) → more food, fewer medicine/clue
// "knowledge fear" (knowledge/control) → more clue, less food
var FEAR_WEIGHTS = {
  ocean:     { food: 0.8,  medicine: 1.3, clue: 0.9, money: 0.9 },
  body:      { food: 0.7,  medicine: 1.4, clue: 0.8, money: 0.9 },
  control:   { food: 0.8,  medicine: 0.9, clue: 1.4, money: 1.0 },
  isolation: { food: 1.5,  medicine: 1.0, clue: 0.7, money: 0.8 },  // ← survival fear
  knowledge: { food: 0.6,  medicine: 0.8, clue: 1.4, money: 0.8 },  // ← knowledge fear
  morality:  { food: 1.1,  medicine: 1.0, clue: 0.9, money: 0.8 },
};

var COPING_WEIGHTS = {
  avoidant:      { food: 1.3, medicine: 1.1, clue: 0.7, money: 0.9 },
  investigative: { food: 0.6, medicine: 0.8, clue: 1.4, money: 1.0 },
  social:        { food: 1.3, medicine: 1.0, clue: 0.9, money: 1.1 },
  controlling:   { food: 1.1, medicine: 1.1, clue: 1.1, money: 1.2 },
  sacrificial:   { food: 0.5, medicine: 0.7, clue: 1.2, money: 0.7 },
  predatory:     { food: 1.4, medicine: 1.1, clue: 0.7, money: 1.3 },
};

function getFearWeights(primary, coping) {
  var w = { food: 1.0, medicine: 1.0, clue: 1.0, money: 1.0 };
  if (primary && FEAR_WEIGHTS[primary]) {
    var fw = FEAR_WEIGHTS[primary];
    for (var k in w) w[k] = +(w[k] * 0.7 + fw[k] * 0.3).toFixed(3);
  }
  if (coping && COPING_WEIGHTS[coping]) {
    var cw = COPING_WEIGHTS[coping];
    for (var k in w) w[k] = +(w[k] * 0.8 + cw[k] * 0.2).toFixed(3);
  }
  for (var k in w) w[k] = Math.max(0.3, Math.min(2.0, w[k]));
  return w;
}

// ── State Factory ────────────────────────────────────
function makeState(overrides, fearW) {
  var startingFood = CAL.startingFood;
  var startingAp = CAL.startingAp;
  var inventory = [];

  // Fear-driven starting items
  if (fearW) {
    if (fearW.medicine > 1.3) {
      inventory.push({ id: 'medicine_start', name: '药品', uses: 1 });
    }
    if (fearW.food > 1.3) {
      startingFood = Math.min(5, startingFood + 2); // survival fear gets +2 food
    }
  }

  return Object.assign({
    day: 1,
    ap: startingAp,
    maxAp: CAL.startingAp,
    hp: CAL.startingHp,
    maxHp: CAL.startingHp,
    san: CAL.startingSan,
    maxSan: 99,
    food: startingFood,
    maxFood: 5,
    money: CAL.startingMoney,
    infection: 0,
    maxInfection: 10,
    lightLevel: 2,
    currentArea: 'town_center',
    clues: [],
    inventory: inventory,
    npcTrust: { '老费舍': 5, '玛莎·格雷': 3, '伊莎贝拉·韦伯': 2 },
    npcStates: {},
    triggeredEvents: [],
    fearTuning: { primary: null, secondary: null, coping: null },
    _resourceFraudState: null,
    _eventsSinceLastResource: 0,
    _fraudGained: 0,             // v3: track "what player thinks they got"
    _fraudRealGained: 0,         // v3: track "what player actually got"
    stats_run: {
      deaths: 0, runs: 0,
      food_gained: 0, food_displayed: 0, food_consumed: 0, food_bought: 0,
      clues_found: 0, clues_displayed: 0,
      meds_found: 0,
      fraud_activations: 0,
      death_san: 0, death_hp: 0, death_hybrid: 0,
    },
  }, overrides);
}

// ── Simulation: single day ───────────────────────────
function simulateDay(s, rng, fearW) {
  if (s.hp <= 0 || s.san <= 0) return s;

  var ap = s.ap || CAL.startingAp;
  var maxAp = s.maxAp || CAL.startingAp;
  var fraud = getResourceFraudState(s.san);
  var sanLossMod = getSanLossModifier(fearW);

  // Track fraud state for display/debug
  s._resourceFraudState = fraud;
  if (fraud.active) s.stats_run.fraud_activations = (s.stats_run.fraud_activations || 0) + 1;

  // AP regenerated at start of day
  ap = maxAp;

  // ── Daily resource consumption ──
  var foodConsumed = CAL.dailyFoodConsumption;
  var areaMod = CAL.areaDangerMult[s.currentArea] || 1.0;
  if (areaMod > 1.2) foodConsumed = Math.ceil(foodConsumed * 1.5);

  s.food = Math.max(0, (s.food || 0) - foodConsumed);
  s.stats_run.food_consumed = (s.stats_run.food_consumed || 0) + foodConsumed;

  // ── Starvation effects ──
  if (s.food <= 0) {
    s.starvationDays = (s.starvationDays || 0) + 1;
    var sd = s.starvationDays;
    if (sd === 1) {
      s.san = Math.max(0, s.san - 1);
    } else {
      s.hp = Math.max(0, s.hp - CAL.starvationHpDamage);
      s.san = Math.max(0, s.san - CAL.starvationSanDamage);
    }
  } else {
    s.starvationDays = 0;
  }

  // ── Infection pressure ──
  var infRisk = CAL.infectionRisk[s.currentArea] || 0;
  if (infRisk > 0 && rng.next() < infRisk) {
    s.infection = Math.min(s.maxInfection, (s.infection || 0) + 1);
  }
  // Auto-use medicine
  if (s.infection >= CAL.medicineUseThreshold && s.inventory.some(function (i) { return i.uses > 0; })) {
    var medIdx = s.inventory.findIndex(function (i) { return i.uses > 0; });
    if (medIdx >= 0) {
      s.inventory[medIdx].uses--;
      if (s.inventory[medIdx].uses <= 0) s.inventory.splice(medIdx, 1);
      s.infection = Math.max(0, s.infection - CAL.medicineCureAmount);
      s.stats_run.meds_found = (s.stats_run.meds_found || 0) + 1;
    }
  }

  // ── Daily SAN pressure ──
  var sanLoss = (CAL.baseSanLossPerDay + (rng.next() - 0.5) * 2 * CAL.sanLossVariance) * sanLossMod;
  sanLoss *= areaMod;
  s.san = Math.max(0, s.san - Math.max(0, Math.round(sanLoss)));

  // ── Resource gain events (explore simulation) ──
  var exploresPerDay = Math.floor(ap / 2);
  for (var e = 0; e < exploresPerDay; e++) {
    s._eventsSinceLastResource++;

    // Drop chance increases with time since last resource
    var dropChance = Math.min(0.7, 0.12 + s._eventsSinceLastResource * 0.025);

    if (rng.next() < dropChance) {
      s._eventsSinceLastResource = 0;

      // Apply fear weights to determine resource type
      var totalWeight = fearW.food + fearW.medicine + fearW.clue + fearW.money;
      var roll = rng.next() * totalWeight;
      var cumWeight = 0;
      var resourceType;

      cumWeight += fearW.food;
      if (roll < cumWeight) resourceType = 'food';
      else {
        cumWeight += fearW.medicine;
        if (roll < cumWeight) resourceType = 'medicine';
        else {
          cumWeight += fearW.clue;
          if (roll < cumWeight) resourceType = 'clue';
          else resourceType = 'money';
        }
      }

      // ── V3: Apply resource fraud ──
      var realMult = fraud.realMult;
      var displayMult = fraud.displayMult;

      switch (resourceType) {
        case 'food': {
          var baseGain = 1;
          var realGain = Math.max(0, Math.round(baseGain * realMult));
          var displayGain = Math.max(realGain, Math.round(baseGain * displayMult));
          if (realGain > 0) {
            s.food = Math.min(s.maxFood, s.food + realGain);
            s.stats_run.food_gained = (s.stats_run.food_gained || 0) + realGain;
            s.stats_run.food_displayed = (s.stats_run.food_displayed || 0) + displayGain;
            s._fraudGained += displayGain;
            s._fraudRealGained += realGain;
          }
          break;
        }
        case 'medicine': {
          // Medicine is "all or nothing" — realMult threshold check
          if (rng.next() < realMult) {
            s.inventory = s.inventory || [];
            s.inventory.push({ id: 'medicine_' + rng.next(), name: '药品', uses: 1 });
            s.stats_run.meds_found = (s.stats_run.meds_found || 0) + 1;
            if (displayMult > 1.0) s._fraudGained++; // counts as "seen"
          }
          break;
        }
        case 'clue': {
          if (rng.next() < realMult) {
            s.clues = s.clues || [];
            s.clues.push('clue_sim_' + s.day + '_' + e);
            s.stats_run.clues_found = (s.stats_run.clues_found || 0) + 1;
          }
          // Display always shows the clue (player "thinks" they found it)
          if (displayMult > 1.0) {
            s.stats_run.clues_displayed = (s.stats_run.clues_displayed || 0) + 1;
          }
          break;
        }
        case 'money': {
          var moneyGain = Math.max(0, Math.round((2 + rng.next() * 5) * realMult));
          s.money = (s.money || 0) + moneyGain;
          break;
        }
      }
    }

    // Small chance of resource loss event
    if (rng.next() < 0.06 * areaMod) {
      var lossType = rng.next();
      if (lossType < 0.5 && s.food > 0) {
        var foodLoss = Math.ceil(rng.next() * 2);
        s.food = Math.max(0, s.food - foodLoss);
      } else if (lossType < 0.8 && s.money > 0) {
        s.money = Math.max(0, s.money - Math.ceil(rng.next() * 3));
      }
    }
  }

  // ── Work action (v3: 30% chance per day, income 2-6) ──
  if (rng.next() < 0.30 && ap >= CAL.workApCost) {
    var income = CAL.workIncomeMin + rng.intBetween(0, CAL.workIncomeMax - CAL.workIncomeMin);
    s.money = (s.money || 0) + income;
  }

  // ── Buy food if starving (v3: success chance scaled by food weight, base 60%) ──
  var buyChance = 0.6 * (fearW ? fearW.food : 1.0);
  if (s.food <= 1 && s.money >= CAL.foodPrice && rng.next() < buyChance) {
    var buys = Math.min(Math.floor(s.money / CAL.foodPrice), Math.floor((s.maxFood - s.food)));
    if (buys > 0) {
      s.food = Math.min(s.maxFood, s.food + buys);
      s.money -= buys * CAL.foodPrice;
      s.stats_run.food_bought = (s.stats_run.food_bought || 0) + buys;
    }
  }

  // ── NPC interaction (v3: 25% chance per day) ──
  if (rng.next() < 0.25) {
    s.san = Math.min(s.maxSan, s.san + 1);
  }

  s.day++;
  s.ap = maxAp;

  return s;
}

// ── Simulate a single 28-day run ─────────────────────
function simulateRun(rng, fearW) {
  var s = makeState({}, fearW);

  var deathDay = null;
  var deathCause = null;
  var reachedEnding = false;
  var resourceSnapshots = [];

  for (var day = 1; day <= 28; day++) {
    if (s.hp <= 0 || s.san <= 0) {
      deathDay = day;
      deathCause = s.hp <= 0 && s.san <= 0 ? 'hybrid' : s.san <= 0 ? 'san' : 'hp';
      s.stats_run.death_san = deathCause === 'san' || deathCause === 'hybrid' ? 1 : 0;
      s.stats_run.death_hp = deathCause === 'hp' || deathCause === 'hybrid' ? 1 : 0;
      break;
    }

    // Ending condition: enough clues + minimum SAN
    if ((s.clues || []).length >= CAL.cluesNeededForEnding && s.san >= 25) {
      reachedEnding = true;
      break;
    }

    s = simulateDay(s, rng, fearW);

    // Record resource snapshot every 7 days
    if (day % 7 === 0 || day === 28) {
      resourceSnapshots.push({
        day: day,
        food: s.food,
        money: s.money,
        clues: (s.clues || []).length,
        infection: s.infection,
        san: s.san,
        hp: s.hp,
        fraud: s._resourceFraudState,
      });
    }
  }

  var totalFraudGap = s._fraudGained - s._fraudRealGained;

  return {
    survived: s.hp > 0 && s.san > 0,
    reachedEnding: reachedEnding,
    deathDay: deathDay,
    deathCause: deathCause,
    finalDay: s.day - 1,
    finalSan: s.san,
    finalHp: s.hp,
    finalFood: s.food,
    finalClues: (s.clues || []).length,
    finalInfection: s.infection,
    foodGained: s.stats_run.food_gained || 0,
    foodBought: s.stats_run.food_bought || 0,
    foodDisplayed: s.stats_run.food_displayed || 0,
    foodConsumed: s.stats_run.food_consumed || 0,
    medsFound: s.stats_run.meds_found || 0,
    cluesFound: s.stats_run.clues_found || 0,
    cluesDisplayed: s.stats_run.clues_displayed || 0,
    fraudActivations: s.stats_run.fraud_activations || 0,
    fraudGap: totalFraudGap,
    resourceSnapshots: resourceSnapshots,
    fearWeights: fearW,
  };
}

// ── Run simulation for a single fear profile ──────────
function runSimulationForProfile(fearPrimary, coping, label) {
  var fearW = getFearWeights(fearPrimary, coping);
  var results = [];
  var survivalCount = 0;
  var endingCount = 0;
  var deathCauses = { san: 0, hp: 0, hybrid: 0 };
  var totalFoodGained = 0;
  var totalFoodBought = 0;
  var totalFoodDisplayed = 0;
  var totalFoodConsumed = 0;
  var totalCluesFound = 0;
  var totalMedsFound = 0;
  var totalFraudActivations = 0;
  var totalFraudGap = 0;
  var avgSurvivalDay = 0;
  var resourceSnapshots = [];

  for (var d = 7; d <= 28; d += 7) {
    resourceSnapshots.push({ day: d, food: 0, clues: 0, infection: 0, san: 0, hp: 0, count: 0 });
  }

  for (var i = 0; i < MAX_LOOPS; i++) {
    var rng = makeRng(null); // FIX: each run gets unique seed
    var result = simulateRun(rng, fearW);
    results.push(result);

    if (result.survived) survivalCount++;
    if (result.reachedEnding) endingCount++;
    if (result.deathCause) deathCauses[result.deathCause] = (deathCauses[result.deathCause] || 0) + 1;
    avgSurvivalDay += result.finalDay;
    totalFoodGained += result.foodGained;
    totalFoodBought += result.foodBought || 0;
    totalFoodDisplayed += result.foodDisplayed || 0;
    totalFoodConsumed += result.foodConsumed;
    totalCluesFound += result.cluesFound;
    totalMedsFound += result.medsFound;
    totalFraudActivations += result.fraudActivations;
    totalFraudGap += result.fraudGap || 0;

    for (var si = 0; si < result.resourceSnapshots.length; si++) {
      var snap = result.resourceSnapshots[si];
      var acc = resourceSnapshots.find(function (r) { return r.day === snap.day; });
      if (acc) {
        acc.food += snap.food;
        acc.clues += snap.clues;
        acc.infection += snap.infection;
        acc.san += snap.san;
        acc.hp += snap.hp;
        acc.count++;
      }
    }
  }

  var survivalRate = (survivalCount / MAX_LOOPS) * 100;
  var endingRate = (endingCount / MAX_LOOPS) * 100;
  avgSurvivalDay = Math.round(avgSurvivalDay / MAX_LOOPS);

  return {
    label: label,
    fearPrimary: fearPrimary,
    coping: coping,
    fearWeights: fearW,
    survivalRate: survivalRate,
    endingRate: endingRate,
    avgSurvivalDay: avgSurvivalDay,
    deathCauses: deathCauses,
    foodGainedPerRun: totalFoodGained / MAX_LOOPS,
    foodBoughtPerRun: totalFoodBought / MAX_LOOPS,
    foodDisplayedPerRun: totalFoodDisplayed / MAX_LOOPS,
    foodConsumedPerRun: totalFoodConsumed / MAX_LOOPS,
    cluesFoundPerRun: totalCluesFound / MAX_LOOPS,
    medsFoundPerRun: totalMedsFound / MAX_LOOPS,
    fraudActivationsPerRun: totalFraudActivations / MAX_LOOPS,
    fraudGapPerRun: totalFraudGap / MAX_LOOPS,
    resourceSnapshots: resourceSnapshots,
    calibrated: survivalRate >= (TARGET_SURVIVAL - 5) && survivalRate <= (TARGET_SURVIVAL + 5),
  };
}

// ── Calibration: binary search for food rate ─────────
function calibrateParams() {
  var lo = 10, hi = 80, mid, bestResult = null;
  var iterations = 0;
  var maxIter = 12;

  console.log('\n══ 自动校准模式 — 搜索最优 foodPerHundredEvents ══');
  console.log('  目标: ' + TARGET_SURVIVAL + '% ±5% 存活率 (loops=' + MAX_LOOPS + ')\n');

  while (lo <= hi && iterations < maxIter) {
    mid = Math.round((lo + hi) / 2);
    CAL.foodPerHundredEvents = mid;
    var result = runSimulationForProfile(null, null, 'calibration');

    console.log('  [' + iterations + '] foodRate=' + mid +
      ' → 存活率=' + result.survivalRate.toFixed(1) + '%' +
      (result.survivalRate < TARGET_SURVIVAL - 5 ? ' (↑需加)' :
       result.survivalRate > TARGET_SURVIVAL + 5 ? ' (↓需减)' : ' ✅'));

    if (result.survivalRate < TARGET_SURVIVAL - 5) {
      lo = mid + 1; // too hard, increase food
    } else if (result.survivalRate > TARGET_SURVIVAL + 5) {
      hi = mid - 1; // too easy, decrease food
    } else {
      bestResult = result;
      break;
    }
    iterations++;
  }

  if (bestResult) {
    console.log('\n  ✅ 校准成功! foodPerHundredEvents = ' + CAL.foodPerHundredEvents);
    console.log('     存活率: ' + bestResult.survivalRate.toFixed(1) + '%');
    console.log('     食物收支比: ' + (bestResult.foodGainedPerRun / Math.max(0.1, bestResult.foodConsumedPerRun)).toFixed(2));
  } else {
    console.log('\n  ⚠ 未找到精确匹配，当前 foodPerHundredEvents = ' + CAL.foodPerHundredEvents);
  }
  return bestResult;
}

// ── Formatting helper ────────────────────────────────
function fmt(n, digits) {
  if (n == null) return '  -  ';
  return n.toFixed(digits != null ? digits : 1);
}

// ── Main simulation ──────────────────────────────────
function runSimulation() {
  var lines = [];
  var startTime = Date.now();

  lines.push('');
  lines.push('╔══════════════════════════════════════════════════════════════╗');
  lines.push('║         28天资源曲线模拟器 / Resource Curve Simulator v3    ║');
  lines.push('╠══════════════════════════════════════════════════════════════╣');
  lines.push('║  模拟次数: ' + String(MAX_LOOPS).padEnd(48) + '║');
  if (ALL_FEARS) {
    lines.push('║  模式: 全恐惧画像对比'.padEnd(60) + '║');
  } else {
    lines.push('║  恐惧画像: ' + (FEAR_PRIMARY || '中性').padEnd(45) + '║');
    lines.push('║  应对方式: ' + (COPING || '无').padEnd(45) + '║');
  }
  lines.push('║  目标存活率: ' + TARGET_SURVIVAL + '%'.padEnd(42) + '║');
  lines.push('╚══════════════════════════════════════════════════════════════╝');
  lines.push('');

  // ── Calibration mode ──
  if (CALIBRATE) {
    var calResult = calibrateParams();
    lines.push('');
    lines.push('══ 校准参数快照 ══════════════════════════════════════════════');
    lines.push('  foodPerHundredEvents:   ' + CAL.foodPerHundredEvents);
    lines.push('  medicinePerHundredEvents: ' + CAL.medicinePerHundredEvents);
    lines.push('  cluePerHundredEvents:   ' + CAL.cluePerHundredEvents);
    lines.push('  startingFood:           ' + CAL.startingFood);
    lines.push('  dailyFoodConsumption:   ' + CAL.dailyFoodConsumption);
    lines.push('  baseSanLossPerDay:      ' + CAL.baseSanLossPerDay);
    lines.push('  starvationHpDamage:     ' + CAL.starvationHpDamage);
    lines.push('  workIncomeMin/Max:      ' + CAL.workIncomeMin + '/' + CAL.workIncomeMax);
    lines.push('');
    for (var li = 0; li < lines.length; li++) console.log(lines[li]);
    return calResult ? { survivalRate: calResult.survivalRate, calibrated: calResult.calibrated, cal: CAL } : { survivalRate: 0, calibrated: false, cal: CAL };
  }

  // ── Build profile list ──
  var profiles;
  if (ALL_FEARS) {
    profiles = [
      { primary: null,    coping: null,    label: '中性' },
      { primary: 'ocean',     coping: null,    label: '海洋恐惧' },
      { primary: 'body',      coping: null,    label: '肉体恐惧' },
      { primary: 'control',   coping: null,    label: '控制恐惧' },
      { primary: 'isolation', coping: null,    label: '孤立恐惧(生存)' },
      { primary: 'knowledge', coping: null,    label: '知识恐惧' },
      { primary: 'morality',  coping: null,    label: '道德恐惧' },
      { primary: 'isolation', coping: 'avoidant',      label: '孤立+回避' },
      { primary: 'knowledge', coping: 'investigative', label: '知识+调查' },
      { primary: 'body',      coping: 'sacrificial',   label: '肉体+牺牲' },
      { primary: 'ocean',     coping: 'predatory',     label: '海洋+掠夺' },
    ];
  } else {
    profiles = [
      { primary: FEAR_PRIMARY, coping: COPING, label: FEAR_PRIMARY || '中性' }
    ];
  }

  var allResults = [];
  var overallLines = [];

  for (var pi = 0; pi < profiles.length; pi++) {
    var p = profiles[pi];
    var result = runSimulationForProfile(p.primary, p.coping, p.label);
    allResults.push(result);

    // Per-profile output
    var sr = result.survivalRate.toFixed(1);
    var er = result.endingRate.toFixed(1);
    var status = result.calibrated ? '✅' :
      result.survivalRate < TARGET_SURVIVAL - 5 ? '⚠偏难' : '⚠偏易';

    overallLines.push('── ' + p.label + ' (' +
      (p.primary || '无') + (p.coping ? '+' + p.coping : '') + ') ' +
      '─'.repeat(Math.max(0, 42 - p.label.length - (p.primary || '').length - (p.coping ? p.coping.length + 1 : 0))));
    overallLines.push('');
    overallLines.push('  资源权重:     ' + JSON.stringify({
      food:    Math.round(result.fearWeights.food * 100) + '%',
      medicine: Math.round(result.fearWeights.medicine * 100) + '%',
      clue:    Math.round(result.fearWeights.clue * 100) + '%',
      money:   Math.round(result.fearWeights.money * 100) + '%',
    }));
    overallLines.push('  存活率:       ' + sr + '% ' + status + ' (目标: ' + TARGET_SURVIVAL + '%)');
    overallLines.push('  达成结局:     ' + er + '%');
    overallLines.push('  平均存活天数: ' + result.avgSurvivalDay + '天');
    overallLines.push('  死因分布:');
    overallLines.push('    理智崩塌 (SAN): ' + (result.deathCauses.san || 0) + ' (' + ((result.deathCauses.san || 0) / MAX_LOOPS * 100).toFixed(1) + '%)');
    overallLines.push('    肉体消亡 (HP):  ' + (result.deathCauses.hp || 0) + ' (' + ((result.deathCauses.hp || 0) / MAX_LOOPS * 100).toFixed(1) + '%)');
    overallLines.push('    身心俱灭 (混合):' + (result.deathCauses.hybrid || 0) + ' (' + ((result.deathCauses.hybrid || 0) / MAX_LOOPS * 100).toFixed(1) + '%)');
    overallLines.push('');

    // Resource output — use accumulated totals divided by MAX_LOOPS
    var foodRatio = result.foodGainedPerRun / Math.max(0.1, result.foodConsumedPerRun);
    var foodTotal = result.foodGainedPerRun + result.foodBoughtPerRun;
    overallLines.push('  平均资源产出 (每轮):');
    overallLines.push('    食物总计:   ' + fmt(foodTotal) +
      ' (获得 ' + fmt(result.foodGainedPerRun) + ' + 购买 ' + fmt(result.foodBoughtPerRun) +
      ', 消耗: ' + fmt(result.foodConsumedPerRun) + ', 净: ' + fmt(foodTotal - result.foodConsumedPerRun, 1) + ')');
    overallLines.push('    食物显示:   ' + fmt(result.foodDisplayedPerRun) +
      ' (欺诈虚高: ' + fmt(result.fraudGapPerRun) + ')');
    overallLines.push('    药品发现:   ' + fmt(result.medsFoundPerRun));
    overallLines.push('    线索发现:   ' + fmt(result.cluesFoundPerRun));
    overallLines.push('    欺诈激活:   ' + fmt(result.fraudActivationsPerRun) + ' 次/轮');
    overallLines.push('');

    // 28-day resource curve
    overallLines.push('  28天资源曲线 (存活者平均值):');
    overallLines.push('  ┌──────┬──────┬──────┬────────┬──────┬──────┐');
    overallLines.push('  │ 天数 │ 食物 │ 线索 │ 感染值 │ SAN  │ HP   │');
    overallLines.push('  ├──────┼──────┼──────┼────────┼──────┼──────┤');
    for (var si = 0; si < result.resourceSnapshots.length; si++) {
      var acc = result.resourceSnapshots[si];
      if (acc.count > 0) {
        overallLines.push('  │ ' + String(acc.day).padStart(4) + ' │ ' +
          Math.round(acc.food / acc.count).toString().padStart(4) + ' │ ' +
          Math.round(acc.clues / acc.count).toString().padStart(4) + ' │ ' +
          Math.round(acc.infection / acc.count * 10) / 10 .toString().padStart(6) + ' │ ' +
          Math.round(acc.san / acc.count).toString().padStart(4) + ' │ ' +
          Math.round(acc.hp / acc.count).toString().padStart(4) + ' │');
      }
    }
    overallLines.push('  └──────┴──────┴──────┴────────┴──────┴──────┘');
    overallLines.push('');
  }

  // Merge per-profile output into main lines
  for (var mi = 0; mi < overallLines.length; mi++) {
    lines.push(overallLines[mi]);
  }

  // ── Cross-profile comparison (if --all-fears) ──
  if (ALL_FEARS && allResults.length > 1) {
    lines.push('══ 恐惧画像对比汇总 ═════════════════════════════════════════');
    lines.push('');
    lines.push('  ┌────────────────────┬────────┬────────┬──────────┬──────────┐');
    lines.push('  │ 画像               │ 存活率 │ 结局率 │ 平均天数 │ 欺诈激活 │');
    lines.push('  │                    │        │        │          │  次/轮   │');
    lines.push('  ├────────────────────┼────────┼────────┼──────────┼──────────┤');
    for (var ci = 0; ci < allResults.length; ci++) {
      var r = allResults[ci];
      var name = (r.label || r.fearPrimary || '中性').padEnd(18).slice(0, 18);
      lines.push('  │ ' + name + '│ ' +
        r.survivalRate.toFixed(1).padStart(6) + '% │ ' +
        r.endingRate.toFixed(1).padStart(6) + '% │ ' +
        String(r.avgSurvivalDay).padStart(8) + '天 │ ' +
        fmt(r.fraudActivationsPerRun, 1).padStart(8) + ' │');
    }
    lines.push('  └────────────────────┴────────┴────────┴──────────┴──────────┘');
    lines.push('');

    // Fear-specific insights
    lines.push('══ 恐惧画像差异化分析 ═══════════════════════════════════════');
    lines.push('');
    var isolation = allResults.find(function (r) { return r.fearPrimary === 'isolation'; });
    var knowledge = allResults.find(function (r) { return r.fearPrimary === 'knowledge'; });
    var neutral = allResults.find(function (r) { return !r.fearPrimary; });

    if (isolation && neutral) {
      lines.push('  孤立恐惧(生存型): 食物权重 ' + Math.round(isolation.fearWeights.food * 100) +
        '% → 食物获得 ' + fmt(isolation.foodGainedPerRun) +
        ' vs 中性 ' + fmt(neutral.foodGainedPerRun));
      lines.push('    存活率 ' + isolation.survivalRate.toFixed(1) + '% vs 中性 ' + neutral.survivalRate.toFixed(1) + '%');
    }
    if (knowledge && neutral) {
      lines.push('  知识恐惧: 线索权重 ' + Math.round(knowledge.fearWeights.clue * 100) +
        '% → 线索获得 ' + fmt(knowledge.cluesFoundPerRun) +
        ' vs 中性 ' + fmt(neutral.cluesFoundPerRun));
      lines.push('    但药品权重仅 ' + Math.round(knowledge.fearWeights.medicine * 100) +
        '% → 药品 ' + fmt(knowledge.medsFoundPerRun) + ' vs 中性 ' + fmt(neutral.medsFoundPerRun));
    }
    lines.push('');
  }

  // ── Calibration assessment ──
  var primaryResult = allResults[0];
  lines.push('══ 平衡评估 / Calibration ════════════════════════════════════');
  lines.push('');

  var calibrated = primaryResult.calibrated;
  if (calibrated) {
    lines.push('  ✅ 存活率 ' + primaryResult.survivalRate.toFixed(1) + '% 在目标范围 ' + (TARGET_SURVIVAL - 5) + '%-' + (TARGET_SURVIVAL + 5) + '% 内');
  } else if (primaryResult.survivalRate < TARGET_SURVIVAL - 5) {
    lines.push('  ⚠ 存活率 ' + primaryResult.survivalRate.toFixed(1) + '% 低于目标 — 考虑调高 foodPerHundredEvents 或 startingFood');
  } else {
    lines.push('  ⚠ 存活率 ' + primaryResult.survivalRate.toFixed(1) + '% 高于目标 — 考虑调低 foodPerHundredEvents 或提高 SAN 压力');
  }

  var foodRatio = primaryResult.foodGainedPerRun / Math.max(1, primaryResult.foodConsumedPerRun);
  lines.push('  食物收支比: ' + foodRatio.toFixed(2) + ' (1.0 = 收支平衡)');
  if (foodRatio < 0.7) {
    lines.push('  ⚠ 食物产出严重不足 — 饥饿是主要死因');
  } else if (foodRatio > 1.3) {
    lines.push('  ⚠ 食物产出过剩 — 饥饿压力不足');
  }

  lines.push('  资源欺诈激活率: ' + (primaryResult.fraudActivationsPerRun / 28).toFixed(2) + ' 次/天');
  lines.push('  欺诈虚高均值:   ' + fmt(primaryResult.fraudGapPerRun) + ' 单位/轮');
  lines.push('');
  lines.push('  当前校准参数:');
  lines.push('    foodPerHundredEvents:    ' + CAL.foodPerHundredEvents);
  lines.push('    medicinePerHundredEvents: ' + CAL.medicinePerHundredEvents);
  lines.push('    cluePerHundredEvents:    ' + CAL.cluePerHundredEvents);
  lines.push('    startingFood:            ' + CAL.startingFood);
  lines.push('    dailyFoodConsumption:    ' + CAL.dailyFoodConsumption);
  lines.push('    baseSanLossPerDay:       ' + CAL.baseSanLossPerDay);
  lines.push('    starvationHpDamage:      ' + CAL.starvationHpDamage);
  lines.push('    starvationSanDamage:     ' + CAL.starvationSanDamage);
  lines.push('    workIncomeMin/Max:       ' + CAL.workIncomeMin + '/' + CAL.workIncomeMax);
  lines.push('    startingSan:             ' + CAL.startingSan);
  lines.push('    startingHp:              ' + CAL.startingHp);
  lines.push('');

  var elapsed = Date.now() - startTime;
  lines.push('  耗时: ' + elapsed + 'ms');
  lines.push('');

  for (var li2 = 0; li2 < lines.length; li2++) {
    console.log(lines[li2]);
  }

  // ── JSON output ──
  if (JSON_OUTPUT) {
    var jsonResult = {
      config: {
        loops: MAX_LOOPS,
        fear: FEAR_PRIMARY,
        coping: COPING,
        targetSurvival: TARGET_SURVIVAL,
        cal: CAL,
      },
      results: allResults.map(function (r) {
        return {
          label: r.label,
          fearPrimary: r.fearPrimary,
          coping: r.coping,
          fearWeights: r.fearWeights,
          survivalRate: Math.round(r.survivalRate * 10) / 10,
          endingRate: Math.round(r.endingRate * 10) / 10,
          avgSurvivalDay: r.avgSurvivalDay,
          deathCauses: r.deathCauses,
          foodRatio: Math.round((r.foodGainedPerRun / Math.max(0.1, r.foodConsumedPerRun)) * 100) / 100,
          foodGainedPerRun: Math.round(r.foodGainedPerRun * 10) / 10,
          foodBoughtPerRun: Math.round(r.foodBoughtPerRun * 10) / 10,
          foodDisplayedPerRun: Math.round(r.foodDisplayedPerRun * 10) / 10,
          foodConsumedPerRun: Math.round(r.foodConsumedPerRun * 10) / 10,
          fraudGapPerRun: Math.round(r.fraudGapPerRun * 10) / 10,
          fraudActivationsPerRun: Math.round(r.fraudActivationsPerRun * 10) / 10,
          resourceSnapshots: r.resourceSnapshots.map(function (sn) {
            return {
              day: sn.day,
              avgFood: Math.round(sn.food / sn.count),
              avgClues: Math.round(sn.clues / sn.count),
              avgInfection: Math.round(sn.infection / sn.count * 10) / 10,
              avgSan: Math.round(sn.san / sn.count),
              avgHp: Math.round(sn.hp / sn.count),
            };
          }),
        };
      }),
      calibrated: calibrated,
    };
    console.log(JSON.stringify(jsonResult, null, 2));
  }

  return { survivalRate: primaryResult.survivalRate, calibrated: calibrated, cal: CAL, results: allResults };
}

// ── Run ──────────────────────────────────────────────
var result = runSimulation();
process.exit(result.calibrated ? 0 : 1);
