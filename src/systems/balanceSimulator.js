/**
 * src/systems/balanceSimulator.js — 轻量级 28 天蒙特卡洛平衡模拟器
 *
 * 复用游戏真实参数（难度配置、第一轮回保护、恐惧画像），
 * 用于 CI 回归测试和手动平衡分析。
 *
 * 输出格式与 tests/balance_report_v2.json 对齐。
 *
 * 用法:
 *   import { runSimulation, runSuite } from '../systems/balanceSimulator.js';
 *   const result = runSimulation({ difficulty: 1, fear: 'ocean', loop: 0, runs: 200 });
 *   const suite = await runSuite({ runs: 100 });
 */

import {
  DIFFICULTY_LEVELS,
  getDifficultyConfig,
  getPhaseProtection,
  getMaxSanLoss,
  getStartingFood,
  getStartingAp,
} from '../config/difficulty.js';
import {
  adjustSanLossForLoop23,
  adjustStarvationDamage,
  adjustMonsterChance,
  isFirstLoopProtected,
} from '../systems/firstLoopBalance.js';

// ── 恐惧画像简化的生存影响 ──────────────────────────────────
// 完整 fearProfile.js 用 6 轴（ocean/body/control/isolation/knowledge/morality）
// 此处用 fearResourceWeights 的宏观结论做生存层近似。
const FEAR_SURVIVAL_MODS = {
  ocean:     { sanMult: 1.15, hpMult: 1.0,  label: '深海恐惧' },
  body:      { sanMult: 1.10, hpMult: 1.10, label: '肉体恐怖' },
  control:   { sanMult: 0.90, hpMult: 0.95, label: '控制恐惧' },
  isolation: { sanMult: 0.95, hpMult: 1.05, label: '孤立恐惧' },
  knowledge: { sanMult: 1.05, hpMult: 0.90, label: '知识成瘾' },
  morality:  { sanMult: 0.85, hpMult: 1.10, label: '道德困境' },
};

// ── 区域定义 ────────────────────────────────────────────────
const AREAS = [
  { id: 'town_center',        danger: 1, connections: ['harbor_district', 'voxchester_manor', 'whispering_forest', 'catacombs_entrance'] },
  { id: 'harbor_district',    danger: 2, connections: ['town_center', 'lighthouse'] },
  { id: 'voxchester_manor',   danger: 3, connections: ['town_center', 'catacombs_entrance'] },
  { id: 'whispering_forest',  danger: 3, connections: ['town_center', 'forbidden_grove'] },
  { id: 'catacombs_entrance', danger: 4, connections: ['town_center', 'deep_catacombs'] },
  { id: 'deep_catacombs',     danger: 5, connections: ['catacombs_entrance', 'ruins_of_yith'] },
  { id: 'lighthouse',         danger: 3, connections: ['harbor_district'] },
  { id: 'forbidden_grove',    danger: 4, connections: ['whispering_forest'] },
  { id: 'ruins_of_yith',      danger: 5, connections: ['deep_catacombs'] },
];

const AREA_MAP = {};
AREAS.forEach((a) => { AREA_MAP[a.id] = a; });

// 安全区域（低危险，适合回血）
const SAFE_AREAS = ['town_center', 'harbor_district'];

// ── 封印状态（与 engineCore seal_state_machine 对齐）────────
function getSealModifier(day) {
  if (day >= 21) return { sanLossMult: 1.3 };
  if (day >= 14) return { sanLossMult: 1.15 };
  if (day >= 7)  return { sanLossMult: 1.05 };
  return { sanLossMult: 1.0 };
}

// ── 确定性 RNG（xorshift）───────────────────────────────────
function makeRng(seed) {
  let s = seed != null ? seed | 0 : (Math.random() * 0xFFFFFFFF) | 0;
  if (s === 0) s = 1;
  return {
    next() {
      s ^= s << 13;
      s ^= s >> 17;
      s ^= s << 5;
      return (s >>> 0) / 4294967296;
    },
    range(lo, hi) {
      return lo + Math.floor(this.next() * (hi - lo + 1));
    },
    pick(arr) {
      return arr[Math.floor(this.next() * arr.length)];
    },
    chance(p) { return this.next() < p; },
  };
}

// ── 辅助：从加权列表选一个 ──────────────────────────────────
function weightedPick(rng, items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng.next() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

// ── 应用保护到伤害值 ────────────────────────────────────────
function applyProtection(rawLoss, level, day, cfg, type) {
  // type: 'san' | 'hp'
  const protKey = type === 'hp' ? 'hp_protection' : 'san_protection';
  const maxKey   = type === 'hp' ? 'max_hp_per_action' : 'max_san_per_action';
  const dayMaxKey = type === 'hp' ? 'max_hp_per_day' : 'max_san_per_day';

  const phaseProt = getPhaseProtection(level, day);
  let loss = Math.max(1, Math.round(rawLoss * phaseProt));
  loss = Math.min(loss, cfg[maxKey] || 3);
  return loss;
}

// ── 单次 28 天模拟 ──────────────────────────────────────────
export function simulateRun(opts) {
  const seed = opts.seed != null ? opts.seed : Math.floor(Math.random() * 0xFFFFFFFF);
  const rng = makeRng(seed);
  const level = opts.difficulty || 1;
  const fearKey = opts.fear || null;
  const loopCount = opts.loop || 0;

  const cfg = getDifficultyConfig(level);
  const fearMod = fearKey && FEAR_SURVIVAL_MODS[fearKey]
    ? FEAR_SURVIVAL_MODS[fearKey]
    : { sanMult: 1.0, hpMult: 1.0 };

  // 初始状态
  const s = {
    day: 0,
    ap: getStartingAp(level),
    hp: 11,
    san: 60,
    food: getStartingFood(level),
    money: 5,
    area: 'town_center',
    visited: { town_center: 1 },
    starvationDays: 0,
    sanLostToday: 0,
    hpLostToday: 0,
    death: null,
    deathDay: 0,
    deathCause: null,
    clues: 0,
    totalApWasted: 0,
    phaseLoss: {
      '1_7':  { sanLoss: 0, hpLoss: 0, clues: 0 },
      '8_14': { sanLoss: 0, hpLoss: 0, clues: 0 },
      '15_21':{ sanLoss: 0, hpLoss: 0, clues: 0 },
      '22_28':{ sanLoss: 0, hpLoss: 0, clues: 0 },
    },
    sanCurve: [60],
    exploreCount: 0,
    restCount: 0,
  };

  const phaseForDay = (d) => d <= 7 ? '1_7' : d <= 14 ? '8_14' : d <= 21 ? '15_21' : '22_28';

  // ── 主循环：28 天 ──────────────────────────────────────
  for (let day = 1; day <= 28; day++) {
    if (s.death) break;

    s.day = day;
    s.sanLostToday = 0;
    s.hpLostToday = 0;

    // 每日恢复间隔
    const recInterval = cfg.day_recovery?.interval || 2;
    if (day > 1 && day % recInterval === 0) {
      s.san = Math.min(99, s.san + (cfg.day_recovery?.san || 1));
      s.hp  = Math.min(11,  s.hp  + (cfg.day_recovery?.hp || 1));
    }

    // AP 回满
    const maxAp = 12;
    s.ap = maxAp;

    // ── 日间行动循环 ──────────────────────────────────
    const sealMod = getSealModifier(day);
    let apWastedToday = 0;

    while (s.ap > 0 && s.hp > 0 && s.san > 0) {
      // ── 构建可选行动 ──────────────────────────────
      const actions = [];
      const curAreaId = s.area;
      const curArea = AREA_MAP[curAreaId];
      const inSafe = SAFE_AREAS.includes(curAreaId);
      const lowFood = s.food <= 1;
      const lowHp = s.hp <= 3;
      const lowSan = s.san <= 25;
      const midSan = s.san <= 45;

      // 购买食物（最高优先级当饥饿时）
      if (s.ap >= 1 && s.money >= (cfg.food_price || 3) && s.food < 5) {
        actions.push({ type: 'buy_food', cost: 1, w: lowFood ? 10 : 3 });
      }

      // 探索
      if (s.ap >= 2) {
        actions.push({ type: 'explore', cost: 2, w: lowSan ? 0.3 : 1.0 });
      }

      // 移动
      if (s.ap >= 1 && curArea) {
        curArea.connections.forEach((tid) => {
          const target = AREA_MAP[tid];
          if (!target) return;
          let w = 1.0;
          if (lowHp && SAFE_AREAS.includes(tid)) w = 5.0; // 逃往安全区
          if (target.danger >= 4 && s.san < 30) w = 0.1;  // 高理智才去危险区
          actions.push({ type: 'move', target: tid, danger: target.danger, cost: 1, w });
        });
      }

      // 交谈
      if (s.ap >= 1) {
        actions.push({ type: 'talk', cost: 1, w: midSan ? 2.0 : 0.5 });
      }

      // 工作（ desperation only — 钱只用来买食物）
      if (s.ap >= 1 && (curAreaId === 'town_center') && s.money < 3) {
        actions.push({ type: 'work', cost: 1, w: 4.0 });
      }

      // 休息（需要食物）
      if (s.food > 0) {
        actions.push({ type: 'rest', cost: 0, w: lowHp ? 8.0 : lowFood ? 5.0 : 2.0 });
      }

      if (actions.length === 0) {
        apWastedToday += s.ap;
        break;
      }

      // 加权随机选择
      const chosen = weightedPick(rng, actions, actions.map((a) => a.w));

      // 扣 AP
      if (chosen.cost > 0) s.ap -= chosen.cost;

      // ── 执行行动 ──────────────────────────────────
      switch (chosen.type) {
        case 'buy_food': {
          s.money -= (cfg.food_price || 3);
          s.food = Math.min(5, s.food + 1);
          break;
        }
        case 'explore': {
          s.exploreCount++;
          const areaDanger = AREA_MAP[s.area]?.danger || 1;
          const sealM = sealMod.sanLossMult;
          const fearS = fearMod.sanMult;

          // 探索掉 SAN — 概率随区域危险 + 难度上升
          const sanChance = (cfg.explore_san_chance || 0.1) + areaDanger * (cfg.explore_danger_mult || 0.03);
          if (rng.chance(sanChance)) {
            let loss = rng.range(1, 2 + areaDanger);
            loss = adjustSanLossForLoop23(loss, { loopCount });
            loss = Math.round(loss * sealM * fearS);
            loss = applyProtection(loss, level, day, cfg, 'san');
            if (s.sanLostToday + loss <= (cfg.max_san_per_day || 8)) {
              s.san = Math.max(0, s.san - loss);
              s.sanLostToday += loss;
            }
          }

          // 获得线索
          if (rng.chance(0.25)) s.clues++;

          // 怪物遭遇
          const mChance = adjustMonsterChance(
            (cfg.monster_hp_chance || 0.06) * areaDanger * (day > 14 ? 1.5 : 1),
            { loopCount }
          );
          if (rng.chance(mChance)) {
            let hpLoss = rng.range(1, cfg.monster_hp_max || 3);
            hpLoss = Math.round(hpLoss * fearMod.hpMult);
            hpLoss = applyProtection(hpLoss, level, day, cfg, 'hp');
            if (s.hpLostToday + hpLoss <= (cfg.max_hp_per_day || 4)) {
              s.hp = Math.max(0, s.hp - hpLoss);
              s.hpLostToday += hpLoss;
            }
          }
          break;
        }
        case 'move': {
          s.area = chosen.target;
          s.visited[s.area] = (s.visited[s.area] || 0) + 1;
          const targetDanger = chosen.danger || 1;
          // 移动进高危险区域有概率掉 SAN
          if (targetDanger >= 3 && rng.chance(0.04 * targetDanger)) {
            let loss = rng.range(1, targetDanger);
            loss = adjustSanLossForLoop23(loss, { loopCount });
            loss = Math.round(loss * sealMod.sanLossMult * fearMod.sanMult);
            loss = applyProtection(loss, level, day, cfg, 'san');
            if (s.sanLostToday + loss <= (cfg.max_san_per_day || 8)) {
              s.san = Math.max(0, s.san - loss);
              s.sanLostToday += loss;
            }
          }
          break;
        }
        case 'talk': {
          const talkCfg = cfg.talk_san_recovery || { chance: 0.4, min: 1, max: 3 };
          if (rng.chance(talkCfg.chance)) {
            const gain = rng.range(talkCfg.min, talkCfg.max);
            s.san = Math.min(99, s.san + gain);
          }
          break;
        }
        case 'work': {
          s.money += rng.range(2, 5);
          break;
        }
        case 'rest': {
          s.restCount++;
          s.food = Math.max(0, s.food - 1);
          // 休息恢复：AP 已满，主要恢复 HP + 少量 SAN
          s.hp = Math.min(11, s.hp + 2);
          s.san = Math.min(99, s.san + Math.round((cfg.rest_san_recovery || 3) * 0.5));
          break;
        }
      }
    }

    // 记录本日浪费 AP
    s.totalApWasted += apWastedToday;

    // ── 夜晚结算 ──────────────────────────────────────
    // 基础食物消耗（不在行动中扣除，统一在夜晚结算）
    const baseFood = 1; // 每晚基础消耗
    const actionFoodCost = Math.min(s.exploreCount, 3); // 探索额外消耗
    const totalFoodCost = baseFood + actionFoodCost;

    s.food = Math.max(0, s.food - totalFoodCost);

    if (s.food <= 0) {
      s.starvationDays++;
      let dmg = adjustStarvationDamage(2, { loopCount });
      // 饥饿高发时额外扣 HP
      if (s.starvationDays > 2) dmg += 1;
      s.hp = Math.max(0, s.hp - dmg);
    } else {
      s.starvationDays = 0;
      // 有食物：微恢复
      s.hp = Math.min(11, s.hp + 1);
      s.san = Math.min(99, s.san + 1);
    }

    // 自然 SAN 缓慢恢复
    s.san = Math.min(99, s.san + 0.5);

    // 污染缓慢积累（间接通过 safehouseCorruption）
    const sealM = getSealModifier(day);
    s._corruption = (s._corruption || 0) + sealM.sanLossMult * 0.3;

    // 腐蚀被动掉 SAN（高污染时即使不探索也会掉）
    const corrDrain = Math.floor((s._corruption || 0) / 25);
    if (corrDrain > 0) {
      const drain = Math.min(corrDrain, s.san);
      s.san = Math.max(0, s.san - drain);
    }

    // 记录 SAN 曲线
    s.sanCurve.push(s.san);

    // 累计阶段统计
    const ph = phaseForDay(day);
    s.phaseLoss[ph].sanLoss += s.sanLostToday;
    s.phaseLoss[ph].hpLoss  += s.hpLostToday;

    // 死亡判定
    if (s.hp <= 0) {
      s.death = true;
      s.deathDay = day;
      s.deathCause = 'HP';
      break;
    }
    if (s.san <= 0) {
      s.death = true;
      s.deathDay = day;
      s.deathCause = 'SAN';
      break;
    }

    // 重置日间计数器
    s.exploreCount = 0;
    s.restCount = 0;
  }

  // 存活判定
  if (!s.death) {
    s.death = false;
    s.deathDay = 28;
    s.deathCause = null;
  }

  return {
    seed,
    difficulty: level,
    fear: fearKey,
    loop: loopCount,
    survived: !s.death,
    days: s.deathDay,
    deathCause: s.deathCause,
    finalSan: s.san,
    finalHp: s.hp,
    finalFood: s.food,
    clues: s.clues,
    areasVisited: Object.keys(s.visited).length,
    totalApWasted: s.totalApWasted,
    phaseLoss: s.phaseLoss,
    sanCurve: s.sanCurve,
  };
}

// ── 批量聚合 ────────────────────────────────────────────────
export function aggregateResults(results) {
  const n = results.length;
  const surv = results.filter((r) => r.survived).length;
  const hpDeaths = results.filter((r) => r.deathCause === 'HP').length;
  const sanDeaths = results.filter((r) => r.deathCause === 'SAN').length;
  const avgDays = results.reduce((a, r) => a + r.days, 0) / n;
  const avgSan = results.reduce((a, r) => a + r.finalSan, 0) / n;
  const avgHp = results.reduce((a, r) => a + r.finalHp, 0) / n;
  const avgClues = results.reduce((a, r) => a + r.clues, 0) / n;
  const avgApWasted = results.reduce((a, r) => a + r.totalApWasted, 0) / n;
  const avgAreas = results.reduce((a, r) => a + r.areasVisited, 0) / n;

  const phases = {};
  ['1_7', '8_14', '15_21', '22_28'].forEach((p) => {
    phases[p] = {
      avgSanLoss: results.reduce((a, r) => a + r.phaseLoss[p].sanLoss, 0) / n,
      avgHpLoss:  results.reduce((a, r) => a + r.phaseLoss[p].hpLoss, 0) / n,
      avgClues:   results.reduce((a, r) => a + r.phaseLoss[p].clues, 0) / n,
    };
  });

  const byFear = {};
  results.forEach((r) => {
    const k = r.fear || 'neutral';
    if (!byFear[k]) byFear[k] = { n: 0, surv: 0, days: 0 };
    byFear[k].n++;
    if (r.survived) byFear[k].surv++;
    byFear[k].days += r.days;
  });
  Object.values(byFear).forEach((d) => {
    d.avg = d.days / d.n;
    d.survRate = (d.surv / d.n * 100).toFixed(1) + '%';
  });

  const byDiff = {};
  results.forEach((r) => {
    const k = String(r.difficulty);
    if (!byDiff[k]) byDiff[k] = { n: 0, surv: 0, days: 0 };
    byDiff[k].n++;
    if (r.survived) byDiff[k].surv++;
    byDiff[k].days += r.days;
  });
  Object.values(byDiff).forEach((d) => {
    d.avg = d.days / d.n;
    d.survRate = (d.surv / d.n * 100).toFixed(1) + '%';
  });

  const sanCurve = [];
  for (let d = 0; d <= 28; d++) {
    const vals = results.map((r) => r.sanCurve[d] ?? r.sanCurve[r.sanCurve.length - 1] ?? 0);
    sanCurve.push({ day: d, avg: vals.reduce((a, v) => a + v, 0) / n });
  }

  return {
    n,
    overall: {
      survRate: (surv / n * 100).toFixed(1) + '%',
      avgDays: avgDays.toFixed(2),
      avgSan: avgSan.toFixed(1),
      avgHp: avgHp.toFixed(1),
      avgClues: avgClues.toFixed(1),
      avgApWasted: avgApWasted.toFixed(1),
      avgAreas: avgAreas.toFixed(1),
      deaths: { HP: hpDeaths, SAN: sanDeaths, surv },
    },
    phases,
    byFear,
    byDiff,
    sanCurve,
  };
}

// ── 便捷：单次模拟 ──────────────────────────────────────────
export function runSimulation(opts) {
  const runs = opts.runs || 100;
  const seedBase = opts.seed != null ? opts.seed : Date.now();
  const results = [];
  for (let i = 0; i < runs; i++) {
    results.push(simulateRun({
      difficulty: opts.difficulty || 1,
      fear: opts.fear || null,
      loop: opts.loop || 0,
      seed: seedBase + i,
    }));
  }
  return aggregateResults(results);
}

// ── 便捷：全难度套件 ────────────────────────────────────────
export async function runSuite(opts) {
  const runs = opts.runs || 50;
  const seedBase = opts.seed != null ? opts.seed : Date.now();
  const fears = Object.keys(FEAR_SURVIVAL_MODS);
  const results = [];

  for (let level = 1; level <= 13; level++) {
    for (let fi = 0; fi < fears.length; fi++) {
      for (let i = 0; i < runs; i++) {
        results.push(simulateRun({
          difficulty: level,
          fear: fears[fi],
          loop: 0,
          seed: seedBase + level * 10000 + fi * 1000 + i,
        }));
      }
    }
  }

  return aggregateResults(results);
}
