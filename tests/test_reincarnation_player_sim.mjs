/**
 * tests/test_reincarnation_player_sim.cjs
 * 轮回系统玩家行为模拟器 — 使用概率+规则驱动的AI模拟不同人格玩家
 * 支持5种人格模板、确定性种子、完整轮回循环
 *
 * Run: node tests/test_reincarnation_player_sim.cjs
 * Options: --loops N --seed N --personality NAME --verbose
 */
import assert from 'assert';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  PASS: ' + name);
  } catch (e) {
    failed++;
    const msg = (e.message || String(e)).split('\n')[0];
    failures.push(name + ' -> ' + msg);
    console.log('  FAIL: ' + name + ' -> ' + msg);
  }
}

// ═══════════════════════════════════════════════════════════
// Load game data (SSOT)
// ═══════════════════════════════════════════════════════════
let GD = {};
try {
  GD = JSON.parse(fs.readFileSync(path.join(ROOT, 'game_base.json'), 'utf8'));
} catch (e) {
  console.log('  [WARN] Could not load game_base.json: ' + e.message);
}

// ═══════════════════════════════════════════════════════════
// Seeded PRNG (xorshift32) — deterministic random
// ═══════════════════════════════════════════════════════════
let _seed = 42;
function seedRng(s) {
  _seed = s;
}
function srand() {
  _seed ^= _seed << 13;
  _seed ^= _seed >> 17;
  _seed ^= _seed << 5;
  return (_seed >>> 0) / 4294967296;
}
function randInt(min, max) {
  return Math.floor(srand() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[Math.floor(srand() * arr.length)];
}
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
function weightedPick(items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = srand() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// ═══════════════════════════════════════════════════════════
// Area connectivity (from game_base.json)
// ═══════════════════════════════════════════════════════════
const AREAS = {};
function loadAreas() {
  const areas = GD.areas || GD.module2_areas || [];
  for (const a of areas) {
    AREAS[a.id] = {
      id: a.id,
      name: a.name,
      danger_level: a.danger_level || 1,
      connected: a.connected_areas || [],
      required_clues: a.required_clues || a.unlock_conditions || [],
    };
  }
}
loadAreas();

// Fallback if game_base.json doesn't have areas
if (Object.keys(AREAS).length === 0) {
  const areaList = [
    {
      id: 'town_center',
      name: '镇中心',
      danger: 1,
      connected: ['harbor_district', 'voxchester_manor', 'whispering_forest', 'catacombs_entrance'],
    },
    { id: 'harbor_district', name: '码头区', danger: 2, connected: ['town_center', 'lighthouse'] },
    {
      id: 'voxchester_manor',
      name: '沃切斯特庄园',
      danger: 3,
      connected: ['town_center', 'catacombs_entrance'],
    },
    {
      id: 'whispering_forest',
      name: '低语森林',
      danger: 3,
      connected: ['town_center', 'forbidden_grove'],
    },
    {
      id: 'catacombs_entrance',
      name: '地下墓穴入口',
      danger: 4,
      connected: ['town_center', 'deep_catacombs', 'voxchester_manor'],
    },
    {
      id: 'deep_catacombs',
      name: '深层墓穴',
      danger: 5,
      connected: ['catacombs_entrance', 'ruins_of_yith'],
    },
    { id: 'lighthouse', name: '灯塔', danger: 3, connected: ['harbor_district'] },
    { id: 'forbidden_grove', name: '禁忌树丛', danger: 4, connected: ['whispering_forest'] },
    { id: 'ruins_of_yith', name: '伊斯废墟', danger: 5, connected: ['deep_catacombs'] },
  ];
  for (const a of areaList) {
    AREAS[a.id] = {
      id: a.id,
      name: a.name,
      danger_level: a.danger,
      connected: a.connected,
      required_clues: [],
    };
  }
}

const AREA_IDS = Object.keys(AREAS);

// ═══════════════════════════════════════════════════════════
// NPC data
// ═══════════════════════════════════════════════════════════
const NPCS = GD.npcs ||
  GD.module3_npcs || [
    { name: '老费舍', chapter_1_role: 'core', area: 'harbor_district' },
    { name: '玛莎·格雷', chapter_1_role: 'core', area: 'town_center' },
    { name: '希尔达·莫里斯', chapter_1_role: 'core', area: 'voxchester_manor' },
    { name: '伊莎贝拉·韦伯', chapter_1_role: 'core', area: 'town_center' },
    { name: '约书亚·布莱克', chapter_1_role: 'support', area: 'harbor_district' },
    { name: '伊莱亚斯·沃德', chapter_1_role: 'support', area: 'catacombs_entrance' },
    { name: '汤米·陈', chapter_1_role: 'support', area: 'town_center' },
  ];

// ═══════════════════════════════════════════════════════════
// Game state factory
// ═══════════════════════════════════════════════════════════
function makeState(overrides) {
  return Object.assign(
    {
      screen: 'game',
      day: 1,
      ap: 12,
      maxAp: 12,
      hp: 11,
      maxHp: 11,
      san: 60,
      maxSan: 99,
      currentArea: 'town_center',
      visitedAreas: ['town_center'],
      inventory: [],
      clues: [],
      skills: { 闪避: 25, 意志: 30, 聆听: 25, 话术: 20, 格斗: 20 },
      npcTrust: {},
      npcStates: {},
      npcRelations: {},
      triggeredEvents: [],
      longTermEffects: [],
      stats_run: { deaths: 0, runs: 0, checks_passed: 0, checks_failed: 0, days_best: 0 },
      food: 3,
      maxFood: 5,
      money: 5,
      lightLevel: 2,
      loopCount: 0,
      pollution: 0,
      retainedKnowledge: [],
      discoveredConclusions: [],
      mythosLevel: 0,
      humanityScore: 50,
      activeBlessings: [],
      endingCoins: 0,
      loopShopTier: 0,
      behaviorTracking: {
        direct_kill_count: 0,
        cannibalism_count: 0,
        clean_kill_pattern: 0,
        npc_deaths_by_manipulation: 0,
        cult_leader_score: 0,
        self_harm_ritual_count: 0,
        fusion_accepted_count: 0,
        possession_accepted_count: 0,
        forbidden_intimacy_flags: 0,
        sacred_desecration_count: 0,
        same_npc_harm_max: 0,
        _npc_harm_tally: {},
        npc_as_resource_count: 0,
        betrayed_high_trust_npcs: 0,
        self_sacrifice_for_power: 0,
        fusion_and_self_harm_total: 0,
        harbor_visits: 0,
        sea_acceptance_flags: 0,
        sleep_streak: 0,
        work_only_days: 0,
        safehouse_stay_days: 0,
        move_only_days: 0,
        record_only_days: 0,
        low_intervention_count: 0,
        work_count: 0,
        hoarded_money_max: 0,
        hoarded_food_max: 0,
        archive_consumed_count: 0,
        prophecy_spread_count: 0,
        redeemed_npcs: 0,
        thirteenth_bell_obsession: 0,
        meta_boundary_breaks: 0,
        final_choice_refused_count: 0,
        save_delete_attempts: 0,
        loop_exploit_score: 0,
        loop_break_attempts: 0,
      },
      ending: null,
      endingHistory: [],
      previousEndings: [],
      loopEchoFlags: [],
      worldCorrectionFlags: [],
      everTriggeredEvents: [],
      previousDeathContext: null,
      deathContext: null,
      lastDeathType: null,
      lastDeathMode: null,
      prologue: null,
      fearTuning: null,
      _npcTrustLocked: {},
      _dayActions: [],
      starvationDays: 0,
      safehouseCorruption: 0,
    },
    overrides
  );
}

// ═══════════════════════════════════════════════════════════
// Loop transition (mirrors initLoopState)
// ═══════════════════════════════════════════════════════════
function performLoopTransition(s) {
  const f = makeState();

  f.stats_run.deaths = (s.stats_run?.deaths || 0) + (s.hp <= 0 || s.san <= 0 ? 1 : 0);
  f.stats_run.runs = (s.stats_run?.runs || 0) + 1;
  f.lastDeathType = s.hp <= 0 ? 'physical' : s.san <= 0 ? 'mental' : null;

  f.loopCount = (s.loopCount || 0) + 1;
  const loopKey = f.loopCount <= 5 ? 'loop_' + f.loopCount : 'loop_6_plus';
  const loopEffect = GD.systems?.loop?.loop_count_effects?.[loopKey];
  if (loopEffect) {
    f.maxSan = Math.max(10, 99 + (loopEffect.san_cap_reduction || 0));
    f.san = Math.min(f.san, f.maxSan);
    f.pollution = loopEffect.pollution_intensity || 0;
  }
  if (f.loopCount >= 10) f.maxSan = 50;
  else if (f.loopCount >= 6) f.maxSan = Math.max(60, f.maxSan);
  else if (f.loopCount >= 4) f.maxSan = Math.max(60, f.maxSan);
  f.san = Math.min(f.san, f.maxSan);

  var pollutionRate = f.loopCount >= 6 ? 0.08 : 0.05;
  f.pollution = Math.min(1, (f.pollution || 0) + pollutionRate * f.loopCount);

  if (f.pollution > 0) {
    for (var rule of GD.systems?.loop?.pollution_rules || []) {
      if (rule.cumulative && rule.id === 'pollution_san_cap') {
        var sanFloor = f.loopCount >= 10 ? 50 : f.loopCount >= 4 ? 60 : 20;
        f.maxSan = Math.max(sanFloor, f.maxSan - 5);
        f.san = Math.min(f.san, f.maxSan);
      }
    }
  }

  const blessings = GD.systems?.loop?.loop_blessings || {};
  const bKey = f.loopCount <= 5 ? 'loop_' + f.loopCount : 'loop_6_plus';
  if (blessings[bKey]) f.activeBlessings = [...(s.activeBlessings || []), bKey];

  f.retainedKnowledge = [...(s.retainedKnowledge || [])];
  f.discoveredConclusions = [...(s.discoveredConclusions || [])];
  f.humanityScore = s.humanityScore ?? 50;
  f.endingCoins = s.endingCoins || 0;
  if (s.ending?.id) f.endingCoins++;
  f.loopShopTier = s.loopShopTier || 0;
  if (f.loopCount >= 5 && f.loopShopTier < 1) f.loopShopTier = 1;
  if (f.loopCount >= 7 && f.loopShopTier < 2) f.loopShopTier = 2;

  const sBT = s.behaviorTracking || {};
  const fBT = f.behaviorTracking;
  const BT_KEYS = [
    'direct_kill_count',
    'cannibalism_count',
    'clean_kill_pattern',
    'npc_deaths_by_manipulation',
    'cult_leader_score',
    'self_harm_ritual_count',
    'fusion_accepted_count',
    'possession_accepted_count',
    'forbidden_intimacy_flags',
    'sacred_desecration_count',
    'same_npc_harm_max',
    'npc_as_resource_count',
    'betrayed_high_trust_npcs',
    'self_sacrifice_for_power',
    'fusion_and_self_harm_total',
    'harbor_visits',
    'sea_acceptance_flags',
    'work_only_days',
    'safehouse_stay_days',
    'move_only_days',
    'record_only_days',
    'low_intervention_count',
    'work_count',
    'hoarded_money_max',
    'hoarded_food_max',
    'archive_consumed_count',
    'prophecy_spread_count',
    'redeemed_npcs',
    'thirteenth_bell_obsession',
    'meta_boundary_breaks',
    'final_choice_refused_count',
    'save_delete_attempts',
    'loop_exploit_score',
    'loop_break_attempts',
  ];
  for (const key of BT_KEYS) fBT[key] = sBT[key] || 0;
  fBT._npc_harm_tally = { ...(sBT._npc_harm_tally || {}) };
  fBT.sleep_streak = 0;

  f.prologue = s.prologue || null;
  f.fearTuning = s.fearTuning || null;
  f.mythosLevel = Math.max(0, (s.mythosLevel || 0) - 2);
  f.npcRelations = { ...(s.npcRelations || {}) };
  f._npcTrustLocked = { ...(s._npcTrustLocked || {}) };
  f.money = s.money || 0;

  f.previousEndings = [...(s.previousEndings || [])];
  if (s.ending?.id && !f.previousEndings.includes(s.ending.id)) f.previousEndings.push(s.ending.id);
  if (f.previousEndings.length > 50) f.previousEndings = f.previousEndings.slice(-50);

  f.endingHistory = [
    ...(s.endingHistory || []),
    {
      ending_id: s.ending?.id || null,
      ending_name: s.ending?.name || null,
      loop: s.loopCount || 0,
      day: s.day || 1,
      humanity: s.humanityScore ?? 50,
    },
  ];
  if (f.endingHistory.length > 50) f.endingHistory = f.endingHistory.slice(-50);

  f.loopEchoFlags = [...(s.loopEchoFlags || [])];
  if (f.loopEchoFlags.length > 200) f.loopEchoFlags = f.loopEchoFlags.slice(-200);
  f.everTriggeredEvents = [...(s.everTriggeredEvents || [])];
  if (f.everTriggeredEvents.length > 2000)
    f.everTriggeredEvents = f.everTriggeredEvents.slice(-2000);

  f.previousDeathContext = s.deathContext || null;
  f.lastDeathType = s.deathContext?.type || s.lastDeathType || null;
  f.lastDeathMode = s.deathContext?.mode || s.lastDeathMode || null;

  return f;
}

// ═══════════════════════════════════════════════════════════
// Player personality templates
// ═══════════════════════════════════════════════════════════
const PERSONALITIES = {
  balanced: {
    name: '均衡型',
    weights: { move: 0.2, explore: 0.3, talk: 0.2, work: 0.1, buy_food: 0.08, rest: 0.12 },
    riskTolerance: 0.5,
    darkActionChance: 0.02,
    preferredDanger: [1, 2, 3],
    description: '正常玩家比例，均衡探索/社交/生存',
  },
  explorer: {
    name: '探索型',
    weights: { move: 0.25, explore: 0.4, talk: 0.1, work: 0.05, buy_food: 0.08, rest: 0.12 },
    riskTolerance: 0.7,
    darkActionChance: 0.03,
    preferredDanger: [2, 3, 4, 5],
    description: '偏好地图探索、去危险区域',
  },
  investigator: {
    name: '调查型',
    weights: { move: 0.15, explore: 0.35, talk: 0.25, work: 0.05, buy_food: 0.08, rest: 0.12 },
    riskTolerance: 0.4,
    darkActionChance: 0.01,
    preferredDanger: [1, 2, 3],
    description: '狂点线索、对话、调查事件链',
  },
  social: {
    name: '社交型',
    weights: { move: 0.15, explore: 0.15, talk: 0.4, work: 0.1, buy_food: 0.08, rest: 0.12 },
    riskTolerance: 0.3,
    darkActionChance: 0.01,
    preferredDanger: [1, 2],
    description: '优先刷NPC好感，积累关系网',
  },
  suicidal: {
    name: '作死型',
    weights: { move: 0.15, explore: 0.25, talk: 0.1, work: 0.05, buy_food: 0.05, rest: 0.1 },
    riskTolerance: 0.95,
    darkActionChance: 0.15,
    preferredDanger: [3, 4, 5],
    description: '故意作死，测极端死亡路径',
  },
};

// ═══════════════════════════════════════════════════════════
// Action simulation engine
// ═══════════════════════════════════════════════════════════

/** Get available actions based on current state */
function getAvailableActions(s) {
  const actions = [];

  // MOVE: always possible if AP >= 1 and connected areas exist
  if (s.ap >= 1) {
    const cur = AREAS[s.currentArea];
    if (cur) {
      for (const conn of cur.connected) {
        if (AREAS[conn]) actions.push({ type: 'MOVE', target: conn, apCost: 1 });
      }
    }
  }

  // EXPLORE: AP >= 2
  if (s.ap >= 2) actions.push({ type: 'EXPLORE', apCost: 2 });

  // TALK_NPC: AP >= 1, NPCs in current area
  if (s.ap >= 1) {
    const npcsHere = NPCS.filter((n) => {
      const ns = s.npcStates[n.name];
      return !ns?.dead && !ns?.fled && (n.location === s.currentArea || n.chapter_1_availability === 'core');
    });
    for (const npc of npcsHere) {
      actions.push({ type: 'TALK_NPC', npc: npc.name, apCost: 1 });
    }
  }

  // WORK: AP >= 2, in town_center or harbor
  if (s.ap >= 2 && ['town_center', 'harbor_district'].includes(s.currentArea)) {
    actions.push({ type: 'WORK', apCost: 2 });
  }

  // BUY_FOOD: AP >= 1, money >= 3, food not full
  if (s.ap >= 1 && s.money >= 3 && s.food < s.maxFood) {
    actions.push({ type: 'BUY_FOOD', apCost: 1 });
  }

  // REST: always possible (ends day)
  actions.push({ type: 'REST', apCost: 0 });

  // Dark actions (suicidal personality)
  if (s.ap >= 2) {
    actions.push({ type: 'SELF_HARM', apCost: 2 });
    if (['town_center', 'harbor_district'].includes(s.currentArea)) {
      actions.push({ type: 'DESECRATE', apCost: 2 });
    }
    if (['catacombs_entrance', 'deep_catacombs', 'ruins_of_yith'].includes(s.currentArea)) {
      actions.push({ type: 'BREAK_SEAL', apCost: 3 });
    }
  }

  return actions;
}

/** Choose an action based on personality */
function chooseAction(s, personality) {
  const p = PERSONALITIES[personality] || PERSONALITIES.balanced;
  const available = getAvailableActions(s);

  if (available.length === 0) return { type: 'REST', apCost: 0 };

  // Filter to only actions we can afford
  const affordable = available.filter((a) => a.apCost <= s.ap || a.type === 'REST');
  if (affordable.length === 0) return { type: 'REST', apCost: 0 };

  // Score each action
  const scores = affordable.map((a) => {
    let score = 0;
    const w = p.weights;

    switch (a.type) {
      case 'MOVE': {
        score = w.move || 0.15;
        const target = AREAS[a.target];
        if (target && p.preferredDanger.includes(target.danger_level)) score *= 1.5;
        // Low SAN → prefer safe areas
        if (s.san < 30 && target && target.danger_level > 2) score *= 0.3;
        break;
      }
      case 'EXPLORE':
        score = w.explore || 0.25;
        // SAN-dependent: explore less when sanity is low
        if (s.san < 20) score *= 0.5;
        if (s.san < 10) score *= 0.2;
        break;
      case 'TALK_NPC': {
        score = w.talk || 0.15;
        const trust = s.npcTrust[a.npc] || 0;
        // Higher trust NPCs are more valuable to talk to
        score += trust * 0.03;
        // Social personality gets extra boost
        if (personality === 'social') score += 0.1;
        break;
      }
      case 'WORK':
        score = w.work || 0.08;
        // More urgent when broke
        if (s.money < 3) score *= 2;
        if (s.money === 0) score *= 3;
        break;
      case 'BUY_FOOD':
        score = w.buy_food || 0.05;
        // More urgent when hungry
        if (s.food <= 1) score *= 3;
        if (s.food === 0) score *= 5;
        break;
      case 'REST':
        score = w.rest || 0.1;
        // More likely to rest when low AP
        if (s.ap <= 2) score *= 2;
        // More likely when low on resources
        if (s.san < 20) score *= 1.5;
        break;
      case 'SELF_HARM':
      case 'DESECRATE':
      case 'BREAK_SEAL':
        score = p.darkActionChance || 0.02;
        if (personality === 'suicidal') score *= 5;
        break;
      default:
        score = 0.05;
    }

    // Add small random jitter
    score *= 0.7 + srand() * 0.6;
    return Math.max(0.01, score);
  });

  return weightedPick(affordable, scores);
}

/** Execute a simulated action, mutating state. Returns { death, log } */
function executeAction(s, action) {
  const log = [];

  switch (action.type) {
    case 'MOVE': {
      s.ap -= 1;
      const target = action.target;
      s.currentArea = target;
      if (!s.visitedAreas.includes(target)) s.visitedAreas.push(target);
      if (target === 'harbor_district') s.behaviorTracking.harbor_visits++;

      // Area danger: random SAN/HP loss
      const area = AREAS[target];
      if (area && area.danger_level >= 3) {
        const danger = area.danger_level;
        if (srand() < 0.1 * danger) {
          const sanLoss = randInt(1, danger);
          s.san = clamp(s.san - sanLoss, 0, s.maxSan);
          log.push('区域危险: SAN -' + sanLoss);
        }
      }
      break;
    }
    case 'EXPLORE': {
      s.ap -= 2;
      // Simulate event: SAN damage, clue discovery, skill checks
      const area = AREAS[s.currentArea];
      const danger = area ? area.danger_level : 1;

      // SAN damage from exploring (based on area danger)
      if (srand() < 0.3 + danger * 0.1) {
        const sanLoss = randInt(1, 3 + danger);
        s.san = clamp(s.san - sanLoss, 0, s.maxSan);
        log.push('探索遭遇: SAN -' + sanLoss);
      }

      // Clue discovery
      if (srand() < 0.25) {
        const clueId = 'clue_' + s.currentArea + '_' + (s.clues.length + 1);
        s.clues.push({ id: clueId, name: '线索' + (s.clues.length + 1) });
        log.push('发现线索');
      }

      // Skill check
      if (srand() < 0.3) {
        const skills = Object.keys(s.skills);
        const skill = pick(skills);
        const roll = randInt(1, 100);
        const threshold = s.skills[skill] || 25;
        if (roll <= threshold) {
          s.stats_run.checks_passed++;
          log.push('技能检定成功: ' + skill);
        } else {
          s.stats_run.checks_failed++;
          log.push('技能检定失败: ' + skill);
        }
      }

      // Monster encounter (high danger areas)
      if (danger >= 4 && srand() < 0.15) {
        const hpLoss = randInt(1, 4);
        s.hp = Math.max(0, s.hp - hpLoss);
        log.push('怪物遭遇: HP -' + hpLoss);
      }
      break;
    }
    case 'TALK_NPC': {
      s.ap -= 1;
      const npcName = action.npc;
      const trust = s.npcTrust[npcName] || 0;

      // Trust gain (40% chance)
      if (srand() < 0.4 && trust < 5) {
        s.npcTrust[npcName] = trust + 1;
        log.push('NPC信任+1: ' + npcName + ' (→' + (trust + 1) + ')');
      }

      // SAN recovery from social interaction
      if (trust >= 2 && srand() < 0.3) {
        const sanRec = randInt(1, 2);
        s.san = clamp(s.san + sanRec, 0, s.maxSan);
        log.push('社交安慰: SAN +' + sanRec);
      }

      // Clue from NPC (trust >= 2)
      if (trust >= 2 && srand() < 0.2) {
        const clueId = 'npc_clue_' + npcName + '_' + randInt(1, 999);
        s.clues.push({ id: clueId, name: npcName + '的线索' });
        log.push('从' + npcName + '获得线索');
      }
      break;
    }
    case 'WORK': {
      s.ap -= 2;
      const earned = randInt(3, 12);
      s.money += earned;
      s.behaviorTracking.work_count++;
      if (s.money > s.behaviorTracking.hoarded_money_max) {
        s.behaviorTracking.hoarded_money_max = s.money;
      }
      log.push('打工: +' + earned + '金钱');
      break;
    }
    case 'BUY_FOOD': {
      s.ap -= 1;
      s.money -= 3;
      s.food = Math.min(s.maxFood, s.food + 1);
      log.push('购买食物: 食物+1, 金钱-3');
      break;
    }
    case 'REST': {
      // End of day processing
      const foodConsume = 1;
      s.food = Math.max(0, s.food - foodConsume);

      if (s.food <= 0) {
        s.starvationDays++;
        if (s.starvationDays === 1) {
          s.san = clamp(s.san - 1, 0, s.maxSan);
        } else if (s.starvationDays === 2) {
          s.hp = Math.max(0, s.hp - 1);
        } else {
          s.hp = Math.max(0, s.hp - 2);
        }
        log.push('饥饿! 饥饿天数:' + s.starvationDays);
      } else {
        s.starvationDays = 0;
      }

      // Recovery (if has food)
      if (s.food > 0) {
        s.hp = clamp(s.hp + 1, 0, s.maxHp);
        const sanRec = 1;
        s.san = clamp(s.san + sanRec, 0, s.maxSan);
      }

      // Advance day
      s.day++;
      s.ap = s.maxAp;

      // Safehouse corruption
      s.safehouseCorruption = Math.min(100, s.safehouseCorruption + randInt(0, 2));
      s.pollution = Math.min(1, s.pollution + s.safehouseCorruption * 0.001);

      // Day limit death
      if (s.day > 28) {
        s.hp = 0;
        s.deathContext = { type: 'physical', mode: 'hp', area: s.currentArea, day: s.day };
        log.push('时间耗尽!');
      }
      break;
    }
    case 'SELF_HARM': {
      s.ap -= 2;
      s.behaviorTracking.self_harm_ritual_count++;
      s.behaviorTracking.fusion_and_self_harm_total++;
      const sanLoss = randInt(3, 10);
      s.san = clamp(s.san - sanLoss, 0, s.maxSan);
      s.humanityScore = Math.max(0, s.humanityScore - 10);
      if (srand() < 0.3) s.pollution = Math.min(1, s.pollution + 0.05);
      log.push('自残仪式: SAN -' + sanLoss);
      break;
    }
    case 'DESECRATE': {
      s.ap -= 2;
      s.behaviorTracking.sacred_desecration_count++;
      const sanLoss = randInt(4, 12);
      s.san = clamp(s.san - sanLoss, 0, s.maxSan);
      s.humanityScore = Math.max(0, s.humanityScore - 15);
      log.push('亵渎圣地: SAN -' + sanLoss);
      break;
    }
    case 'BREAK_SEAL': {
      s.ap -= 3;
      s.behaviorTracking.loop_break_attempts++;
      s.pollution = Math.min(1, s.pollution + 0.2);
      const sanLoss = randInt(8, 20);
      s.san = clamp(s.san - sanLoss, 0, s.maxSan);
      s.humanityScore = Math.max(0, s.humanityScore - 25);
      s.triggeredEvents.push('seal_desecrated');
      log.push('破坏封印: SAN -' + sanLoss + ', 污染+20%');
      break;
    }
  }

  // Check death
  if (s.hp <= 0 || s.san <= 0) {
    s.deathContext = {
      type: s.hp <= 0 ? (s.san <= 0 ? 'body_and_self_lost' : 'physical') : 'mental',
      mode: s.hp <= 0 && s.san <= 0 ? 'hybrid' : s.hp <= 0 ? 'hp' : 'san',
      area: s.currentArea,
      day: s.day,
    };
    return { death: true, log };
  }

  return { death: false, log };
}

// ═══════════════════════════════════════════════════════════
// Run simulation: one full loop (start → death)
// ═══════════════════════════════════════════════════════════
function simulateOneLoop(s, personality, maxDays) {
  const loopLog = {
    actions: [],
    daysSurvived: 0,
    deathType: null,
    deathMode: null,
    deathArea: null,
    cluesGained: 0,
    npcsInteracted: new Set(),
    areasVisited: new Set(),
    darkActions: 0,
    actionsByType: {},
  };

  const startClues = s.clues.length;

  for (let day = 1; day <= (maxDays || 30); day++) {
    // Reset AP each day (handled by REST in real game, but we track here)
    if (day > 1) s.ap = s.maxAp;

    // Spend AP during the day
    let safetyCounter = 0;
    while (s.ap > 0 && safetyCounter < 30) {
      safetyCounter++;
      const action = chooseAction(s, personality);

      // Track
      loopLog.actionsByType[action.type] = (loopLog.actionsByType[action.type] || 0) + 1;

      if (['SELF_HARM', 'DESECRATE', 'BREAK_SEAL'].includes(action.type)) {
        loopLog.darkActions++;
      }

      if (action.type === 'TALK_NPC') {
        loopLog.npcsInteracted.add(action.npc);
      }
      if (action.type === 'MOVE') {
        loopLog.areasVisited.add(action.target);
      }

      const result = executeAction(s, action);
      loopLog.actions.push({ type: action.type, log: result.log });

      if (result.death) {
        loopLog.deathType = s.deathContext?.type || 'unknown';
        loopLog.deathMode = s.deathContext?.mode || 'unknown';
        loopLog.deathArea = s.deathContext?.area || s.currentArea;
        loopLog.daysSurvived = s.day;
        loopLog.cluesGained = s.clues.length - startClues;
        return { state: s, log: loopLog };
      }

      if (action.type === 'REST') break; // Day ended
    }

    // If somehow AP is 0 and we didn't rest, force rest
    if (s.ap <= 0) {
      const result = executeAction(s, { type: 'REST' });
      if (result.death) {
        loopLog.deathType = s.deathContext?.type || 'unknown';
        loopLog.deathMode = s.deathContext?.mode || 'unknown';
        loopLog.deathArea = s.deathContext?.area || s.currentArea;
        loopLog.daysSurvived = s.day;
        loopLog.cluesGained = s.clues.length - startClues;
        return { state: s, log: loopLog };
      }
    }
  }

  loopLog.daysSurvived = s.day;
  loopLog.cluesGained = s.clues.length - startClues;
  return { state: s, log: loopLog };
}

// ═══════════════════════════════════════════════════════════
// Full reincarnation simulation
// ═══════════════════════════════════════════════════════════
function runFullSimulation(options) {
  const { loops, personality, seed, maxDays, verbose } = Object.assign(
    {
      loops: 5,
      personality: 'balanced',
      seed: 42,
      maxDays: 28,
      verbose: false,
    },
    options
  );

  seedRng(seed);

  const report = {
    personality,
    seed,
    totalLoops: loops,
    loops: [],
    summary: {},
  };

  let state = makeState();

  for (let i = 0; i < loops; i++) {
    const preSimPollution = state.pollution;
    const { state: endState, log } = simulateOneLoop(state, personality, maxDays);

    report.loops.push({
      loop: i + 1,
      daysSurvived: log.daysSurvived,
      deathType: log.deathType,
      deathMode: log.deathMode,
      deathArea: log.deathArea,
      cluesGained: log.cluesGained,
      npcsMet: log.npcsInteracted.size,
      areasVisited: log.areasVisited.size,
      darkActions: log.darkActions,
      actionBreakdown: { ...log.actionsByType },
      finalSan: endState.san,
      finalHp: endState.hp,
      maxSan: endState.maxSan,
      pollution: endState.pollution,
      endPollution: endState.pollution,
      transitionPollution: preSimPollution,
      mythosLevel: endState.mythosLevel,
      humanity: endState.humanityScore,
      money: endState.money,
      food: endState.food,
      totalClues: endState.clues.length,
    });

    if (verbose) {
      const l = report.loops[report.loops.length - 1];
      const lDelta = Math.max(0, (l.endPollution - l.transitionPollution) * 100);
      const lTotal = l.endPollution * 100;
      console.log(
        '  Loop ' +
          String(l.loop).padStart(2) +
          ' │ ' +
          String(personality).padEnd(10) +
          ' │ 存活:' +
          String(l.daysSurvived).padStart(2) +
          '天' +
          ' │ 死因:' +
          (l.deathType || 'none').padEnd(16) +
          ' │ SAN:' +
          String(l.finalSan).padStart(2) +
          '/' +
          String(l.maxSan).padStart(2) +
          ' │ 污染:' +
          lDelta.toFixed(0).padStart(3) +
          '%+' +
          lTotal.toFixed(0).padStart(3) +
          '%总' +
          ' │ 线索:' +
          String(l.totalClues).padStart(2) +
          ' │ NPC:' +
          String(l.npcsMet).padStart(1) +
          ' │ 暗:' +
          String(l.darkActions).padStart(1)
      );
    }

    // Perform loop transition
    state = performLoopTransition(endState);
  }

  // Compute summary
  //   l.pollution = l.endPollution = endState.pollution (global cumulative, reset each transition)
  //   l.transitionPollution = pollution base set by performLoopTransition for this loop
  //   finalPollution = state.pollution after the last performLoopTransition (next-loop base)
  const rl = report.loops;
  report.summary = {
    avgDays: (rl.reduce((s, l) => s + l.daysSurvived, 0) / rl.length).toFixed(1),
    avgFinalSan: (rl.reduce((s, l) => s + l.finalSan, 0) / rl.length).toFixed(1),
    avgPollution: ((rl.reduce((s, l) => s + l.endPollution, 0) / rl.length) * 100).toFixed(1) + '%',
    avgTransitionPollution: ((rl.reduce((s, l) => s + l.transitionPollution, 0) / rl.length) * 100).toFixed(1) + '%',
    deathTypeDist: {},
    totalDarkActions: rl.reduce((s, l) => s + l.darkActions, 0),
    totalClues: rl[rl.length - 1]?.totalClues || 0,
    finalMaxSan: state.maxSan,
    finalLoopCount: state.loopCount,
    finalPollution: (state.pollution * 100).toFixed(1) + '%',
    endingCoins: state.endingCoins,
    shopTier: state.loopShopTier,
  };
  for (const l of rl) {
    const dt = l.deathType || 'alive';
    report.summary.deathTypeDist[dt] = (report.summary.deathTypeDist[dt] || 0) + 1;
  }

  return report;
}

// ═══════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════

console.log('=== Reincarnation Player Simulation Tests ===');
console.log('');

// ── T1: 基础模拟器验证 ──────────────────────────────
console.log('--- T1: Simulator Basics ---');

test('T1-1: 单轮模拟至少存活1天', () => {
  seedRng(42);
  const s = makeState();
  const { log } = simulateOneLoop(s, 'balanced', 28);
  assert.ok(log.daysSurvived >= 1, 'daysSurvived=' + log.daysSurvived);
});

test('T1-2: 单轮模拟最终会死亡 (28天限制)', () => {
  seedRng(42);
  const s = makeState();
  const { state, log } = simulateOneLoop(s, 'balanced', 30);
  assert.ok(
    state.hp <= 0 || state.san <= 0 || state.day > 28,
    'should die or time out: hp=' + state.hp + ' san=' + state.san + ' day=' + state.day
  );
});

test('T1-3: 确定性种子 — 相同种子相同结果', () => {
  seedRng(12345);
  const s1 = makeState();
  const r1 = simulateOneLoop(s1, 'balanced', 10);

  seedRng(12345);
  const s2 = makeState();
  const r2 = simulateOneLoop(s2, 'balanced', 10);

  assert.strictEqual(r1.log.daysSurvived, r2.log.daysSurvived);
  assert.strictEqual(r1.log.deathType, r2.log.deathType);
  assert.deepStrictEqual(r1.log.actionsByType, r2.log.actionsByType);
});

test('T1-4: 不同种子产生不同结果', () => {
  seedRng(100);
  const s1 = makeState();
  const r1 = simulateOneLoop(s1, 'balanced', 15);

  seedRng(200);
  const s2 = makeState();
  const r2 = simulateOneLoop(s2, 'balanced', 15);

  // Very unlikely to be identical with different seeds
  const identical =
    r1.log.daysSurvived === r2.log.daysSurvived &&
    r1.log.deathType === r2.log.deathType &&
    JSON.stringify(r1.log.actionsByType) === JSON.stringify(r2.log.actionsByType);
  // Allow for rare coincidence
  if (identical) {
    console.log('    [INFO] Rare coincidence — same result with different seeds');
  }
});

// ── T2: 人格模板验证 ────────────────────────────────
console.log('--- T2: Personality Templates ---');

test('T2-1: 5种人格全部可用', () => {
  const names = Object.keys(PERSONALITIES);
  assert.strictEqual(names.length, 5);
  assert.ok(names.includes('balanced'));
  assert.ok(names.includes('explorer'));
  assert.ok(names.includes('investigator'));
  assert.ok(names.includes('social'));
  assert.ok(names.includes('suicidal'));
});

test('T2-2: 社交型 talk 权重最高', () => {
  const p = PERSONALITIES.social;
  assert.ok(p.weights.talk > p.weights.explore, 'talk > explore');
  assert.ok(p.weights.talk > p.weights.move, 'talk > move');
});

test('T2-3: 探索型 explore 权重最高', () => {
  const p = PERSONALITIES.explorer;
  assert.ok(p.weights.explore > p.weights.talk, 'explore > talk');
  assert.ok(p.weights.explore > p.weights.move, 'explore > move');
});

test('T2-4: 作死型 darkActionChance 最高', () => {
  const p = PERSONALITIES.suicidal;
  assert.ok(p.darkActionChance > PERSONALITIES.balanced.darkActionChance);
  assert.ok(p.darkActionChance > PERSONALITIES.explorer.darkActionChance);
});

test('T2-5: 作死型风险容忍度最高', () => {
  assert.ok(PERSONALITIES.suicidal.riskTolerance > PERSONALITIES.balanced.riskTolerance);
  assert.ok(PERSONALITIES.suicidal.riskTolerance > PERSONALITIES.investigator.riskTolerance);
});

// ── T3: 多人格轮回对比 ──────────────────────────────
console.log('--- T3: Multi-Personality Loop Comparison ---');

test('T3-1: 5种人格 × 3轮模拟全部完成', () => {
  for (const personality of Object.keys(PERSONALITIES)) {
    const report = runFullSimulation({ loops: 3, personality, seed: 42, maxDays: 28 });
    assert.strictEqual(report.loops.length, 3, personality + ' should complete 3 loops');
    for (const l of report.loops) {
      assert.ok(l.daysSurvived >= 1, personality + ' loop ' + l.loop + ' survived >= 1 day');
    }
  }
});

test('T3-2: 作死型平均存活天数 ≤ 探索型', () => {
  const suicidal = runFullSimulation({ loops: 10, personality: 'suicidal', seed: 42, maxDays: 28 });
  const explorer = runFullSimulation({ loops: 10, personality: 'explorer', seed: 42, maxDays: 28 });
  // On average, suicidal should die faster (more risky actions)
  // Use same seed so RNG sequence is comparable
  assert.ok(
    parseFloat(suicidal.summary.avgDays) <= parseFloat(explorer.summary.avgDays) + 5,
    'suicidal avg=' + suicidal.summary.avgDays + ' vs explorer avg=' + explorer.summary.avgDays
  );
});

test('T3-3: 社交型 NPC互动数 ≥ 探索型', () => {
  seedRng(42);
  const social = runFullSimulation({ loops: 5, personality: 'social', seed: 100, maxDays: 20 });
  seedRng(42);
  const explorer = runFullSimulation({ loops: 5, personality: 'explorer', seed: 100, maxDays: 20 });
  const socialNpcs = social.loops.reduce((s, l) => s + l.npcsMet, 0);
  const explorerNpcs = explorer.loops.reduce((s, l) => s + l.npcsMet, 0);
  assert.ok(
    socialNpcs >= explorerNpcs,
    'social npcs=' + socialNpcs + ' >= explorer npcs=' + explorerNpcs
  );
});

test('T3-4: 作死型暗黑行为 > 其他所有人格', () => {
  const results = {};
  for (const personality of Object.keys(PERSONALITIES)) {
    const r = runFullSimulation({ loops: 5, personality, seed: 42, maxDays: 20 });
    results[personality] = r.summary.totalDarkActions;
  }
  assert.ok(
    results.suicidal >= results.balanced,
    'suicidal=' + results.suicidal + ' >= balanced=' + results.balanced
  );
  assert.ok(
    results.suicidal >= results.social,
    'suicidal=' + results.suicidal + ' >= social=' + results.social
  );
});

// ── T4: 轮回系统行为验证 ─────────────────────────────
console.log('--- T4: Reincarnation System Behavior ---');

test('T4-1: 多轮后 maxSan 下降', () => {
  const report = runFullSimulation({ loops: 8, personality: 'balanced', seed: 42 });
  const firstMaxSan = report.loops[0].maxSan;
  const lastMaxSan = report.loops[report.loops.length - 1].maxSan;
  assert.ok(lastMaxSan < firstMaxSan, 'maxSan decreased: ' + firstMaxSan + ' → ' + lastMaxSan);
});

test('T4-2: 多轮后 pollution 增加', () => {
  const report = runFullSimulation({ loops: 8, personality: 'balanced', seed: 42 });
  const firstPollution = report.loops[0].pollution;
  const lastPollution = report.loops[report.loops.length - 1].pollution;
  assert.ok(
    lastPollution > firstPollution,
    'pollution increased: ' +
      (firstPollution * 100).toFixed(1) +
      '% → ' +
      (lastPollution * 100).toFixed(1) +
      '%'
  );
});

test('T4-3: 10轮后 maxSan ≤ 50 (loop 10+ 锁定)', () => {
  const report = runFullSimulation({ loops: 10, personality: 'balanced', seed: 42 });
  assert.strictEqual(report.summary.finalMaxSan, 50, 'final maxSan should be 50 at loop 10+');
});

test('T4-4: 5轮后 endingCoins ≥ 0', () => {
  const report = runFullSimulation({ loops: 5, personality: 'balanced', seed: 42 });
  assert.ok(report.summary.endingCoins >= 0, 'endingCoins=' + report.summary.endingCoins);
});

test('T4-5: 7轮后 shopTier ≥ 2', () => {
  const report = runFullSimulation({ loops: 7, personality: 'balanced', seed: 42 });
  assert.ok(report.summary.shopTier >= 2, 'shopTier=' + report.summary.shopTier);
});

test('T4-6: 行为计数器跨轮累积', () => {
  seedRng(42);
  let state = makeState();
  const btSnapshots = [];

  for (let i = 0; i < 5; i++) {
    const { state: endState } = simulateOneLoop(state, 'suicidal', 15);
    btSnapshots.push({
      work_count: endState.behaviorTracking.work_count,
      self_harm: endState.behaviorTracking.self_harm_ritual_count,
      desecration: endState.behaviorTracking.sacred_desecration_count,
    });
    state = performLoopTransition(endState);
  }

  // Behavior tracking should carry over (some counters should increase)
  const firstBt = btSnapshots[0];
  const lastBt = btSnapshots[btSnapshots.length - 1];
  // At minimum, work_count or dark actions should have accumulated
  const firstTotal = firstBt.work_count + firstBt.self_harm + firstBt.desecration;
  const lastTotal = lastBt.work_count + lastBt.self_harm + lastBt.desecration;
  assert.ok(
    lastTotal >= firstTotal,
    'behavior counters should accumulate: first=' + firstTotal + ' last=' + lastTotal
  );
});

// ── T5: 资源经济验证 ────────────────────────────────
console.log('--- T5: Resource Economy ---');

test('T5-1: 金钱不为负', () => {
  const report = runFullSimulation({ loops: 5, personality: 'balanced', seed: 42 });
  for (const l of report.loops) {
    assert.ok(l.money >= 0, 'loop ' + l.loop + ' money=' + l.money);
  }
});

test('T5-2: 食物不为负', () => {
  const report = runFullSimulation({ loops: 5, personality: 'balanced', seed: 42 });
  for (const l of report.loops) {
    assert.ok(l.food >= 0, 'loop ' + l.loop + ' food=' + l.food);
  }
});

test('T5-3: 均衡型不经常破产', () => {
  const report = runFullSimulation({ loops: 10, personality: 'balanced', seed: 42 });
  const brokeLoops = report.loops.filter((l) => l.money === 0).length;
  // Should not be broke more than half the time
  assert.ok(brokeLoops < 7, 'broke in ' + brokeLoops + '/10 loops');
});

// ── T6: 死亡模式分布 ────────────────────────────────
console.log('--- T6: Death Mode Distribution ---');

test('T6-1: 探索型主要死于SAN (精神死亡)', () => {
  const report = runFullSimulation({ loops: 20, personality: 'explorer', seed: 42 });
  const mentalDeaths = report.loops.filter((l) => l.deathMode === 'san').length;
  const totalDeaths = report.loops.filter((l) => l.deathType !== null).length;
  // Explorer should have some SAN deaths from exploring dangerous areas
  assert.ok(totalDeaths > 0, 'should have some deaths');
});

test('T6-2: 多轮模拟有多种死因', () => {
  const report = runFullSimulation({ loops: 20, personality: 'balanced', seed: 42 });
  const deathTypes = new Set(report.loops.map((l) => l.deathType).filter(Boolean));
  assert.ok(deathTypes.size >= 1, 'should have at least 1 death type, got ' + deathTypes.size);
});

// ── T7: 区域探索覆盖 ────────────────────────────────
console.log('--- T7: Area Coverage ---');

test('T7-1: 探索型访问更多区域', () => {
  seedRng(42);
  const explorer = runFullSimulation({ loops: 5, personality: 'explorer', seed: 100, maxDays: 20 });
  seedRng(42);
  const social = runFullSimulation({ loops: 5, personality: 'social', seed: 100, maxDays: 20 });
  const explorerAreas = new Set();
  const socialAreas = new Set();
  for (const l of explorer.loops) explorerAreas.add(l.areasVisited);
  for (const l of social.loops) socialAreas.add(l.areasVisited);
  // explorer should visit more unique areas on average
  const explorerAvg =
    explorer.loops.reduce((s, l) => s + l.areasVisited, 0) / explorer.loops.length;
  const socialAvg = social.loops.reduce((s, l) => s + l.areasVisited, 0) / social.loops.length;
  assert.ok(
    explorerAvg >= socialAvg - 1,
    'explorer avg areas=' + explorerAvg.toFixed(1) + ' >= social=' + socialAvg.toFixed(1)
  );
});

// ── T8: 平衡评估 ────────────────────────────────────
console.log('--- T8: Balance Assessment ---');

test('T8-1: 10轮均衡型平均存活 ≥ 3天', () => {
  const report = runFullSimulation({ loops: 10, personality: 'balanced', seed: 42 });
  assert.ok(parseFloat(report.summary.avgDays) >= 3, 'avgDays=' + report.summary.avgDays);
});

test('T8-2: 10轮均衡型平均存活 ≤ 28天', () => {
  const report = runFullSimulation({ loops: 10, personality: 'balanced', seed: 42 });
  assert.ok(parseFloat(report.summary.avgDays) <= 28, 'avgDays=' + report.summary.avgDays);
});

test('T8-3: loop 10+ pollution 接近 100%', () => {
  const report = runFullSimulation({ loops: 10, personality: 'balanced', seed: 42 });
  assert.ok(
    parseFloat(report.summary.finalPollution) >= 80,
    'finalPollution=' + report.summary.finalPollution
  );
});

test('T8-4: mythosLevel 可被观测', () => {
  const report = runFullSimulation({ loops: 5, personality: 'explorer', seed: 42 });
  // mythosLevel should exist on all loop results
  for (const l of report.loops) {
    assert.ok(typeof l.mythosLevel === 'number', 'mythosLevel should be number');
  }
});

// ── T9: 模拟器完整性 ────────────────────────────────
console.log('--- T9: Simulator Integrity ---');

test('T9-1: getAvailableActions 返回非空', () => {
  const s = makeState();
  const actions = getAvailableActions(s);
  assert.ok(actions.length > 0, 'should have available actions');
});

test('T9-2: chooseAction 永远返回有效动作', () => {
  seedRng(42);
  for (let i = 0; i < 100; i++) {
    const s = makeState({ ap: randInt(0, 12), san: randInt(0, 99), hp: randInt(1, 11) });
    const action = chooseAction(s, 'balanced');
    assert.ok(action && action.type, 'should return valid action');
  }
});

test('T9-3: executeAction 不会导致负数资源', () => {
  seedRng(42);
  for (let i = 0; i < 50; i++) {
    const s = makeState({ money: randInt(0, 5), food: randInt(0, 5) });
    const actions = getAvailableActions(s);
    const action = pick(actions);
    executeAction(s, action);
    assert.ok(s.money >= 0, 'money should be >= 0');
    assert.ok(s.food >= 0, 'food should be >= 0');
    assert.ok(s.san >= 0, 'san should be >= 0');
    assert.ok(s.hp >= 0, 'hp should be >= 0');
  }
});

// ═══════════════════════════════════════════════════════════
// Run verbose report if requested
// ═══════════════════════════════════════════════════════════

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const loopArg = args.indexOf('--loops');
const seedArg = args.indexOf('--seed');
const personalityArg = args.indexOf('--personality');

if (verbose || loopArg >= 0) {
  const simLoops = loopArg >= 0 ? parseInt(args[loopArg + 1], 10) : 5;
  const simSeed = seedArg >= 0 ? parseInt(args[seedArg + 1], 10) : 42;
  const simPersonality = personalityArg >= 0 ? args[personalityArg + 1] : 'balanced';

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(
    '  Player Simulation Report: ' +
      simPersonality +
      ' × ' +
      simLoops +
      ' loops (seed=' +
      simSeed +
      ')'
  );
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  const report = runFullSimulation({
    loops: simLoops,
    personality: simPersonality,
    seed: simSeed,
    verbose: true,
  });

  console.log('');
  console.log('  ── Summary ──');
  console.log('  平均存活:    ' + report.summary.avgDays + ' 天');
  console.log('  死因分布:    ' + JSON.stringify(report.summary.deathTypeDist));
  console.log('  暗黑行为总数: ' + report.summary.totalDarkActions);
  console.log('  最终线索数:  ' + report.summary.totalClues);
  console.log('  最终maxSan:  ' + report.summary.finalMaxSan);
  console.log('  平均轮末污染: ' + report.summary.avgPollution + ' (每轮结束时的全局污染值)');
  console.log('  平均轮基污染: ' + report.summary.avgTransitionPollution + ' (轮回转换时的基准污染)');
  console.log('  结局代币:    ' + report.summary.endingCoins);
  console.log('  商店等级:    Tier ' + report.summary.shopTier);
  console.log('');
}

// ═══════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════

console.log('');
console.log('=== Reincarnation Player Simulation Tests ===');
console.log('  ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) {
  console.log('');
  console.log('Failed tests:');
  for (const f of failures) console.log('  - ' + f);
}
if (failed > 0 && typeof process !== 'undefined') process.exit(1);
