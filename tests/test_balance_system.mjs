// tests/test_balance_system.mjs — 游戏平衡系统全面测试
// 覆盖：难度配置完整性、graduated protection、恐惧画像平衡、难度单调性、
//       消耗速率合理性、SAN/HP 死亡比率、模拟器回归、封印状态

import {
  DIFFICULTY_LEVELS,
  getDifficultyConfig,
  getPhaseProtection,
  getMaxSanLoss,
  getStartingFood,
  getStartingAp,
  getWorkIncomeMin,
  getFoodPrice,
  getSafeZoneDays,
  getDifficultyPhase,
} from '../src/config/difficulty.js';
import {
  adjustSanLossForLoop23,
  adjustStarvationDamage,
  adjustMonsterChance,
  isFirstLoopProtected,
  isInSafeWindow,
  shouldBlockLethalEvent,
  PROTECTION_CONFIG,
  GRADUATED_CONFIG,
} from '../src/systems/firstLoopBalance.js';
import {
  simulateRun,
  aggregateResults,
  runSimulation,
} from '../src/systems/balanceSimulator.js';

let passed = 0, failed = 0;
function assert(name, cond, detail) {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.log('  FAIL: ' + name + (detail ? ' — ' + detail : ''));
  }
}

function section(title) {
  console.log('\n=== ' + title + ' ===');
}

// ═══════════════════════════════════════════════════════════
// Section 1: 难度配置完整性 (13 levels)
// ═══════════════════════════════════════════════════════════
section('1. 难度配置完整性');

assert('1a: 13 个难度等级全部加载', Object.keys(DIFFICULTY_LEVELS).length === 13,
  'found ' + Object.keys(DIFFICULTY_LEVELS).length);

assert('1b: 等级 1 存在且名称正确',
  DIFFICULTY_LEVELS[1]?.name === '薄雾');

assert('1c: 等级 13 存在且名称正确',
  DIFFICULTY_LEVELS[13]?.name === '归渊');

assert('1d: 每个等级都有 expected_survival',
  [1,2,3,4,5,6,7,8,9,10,11,12,13].every((l) =>
    DIFFICULTY_LEVELS[l]?.expected_survival && DIFFICULTY_LEVELS[l]?.expected_days));

assert('1e: 每个等级都有 san_protection 5 阶段',
  [1,2,3,4,5,6,7,8,9,10,11,12,13].every((l) => {
    const sp = DIFFICULTY_LEVELS[l]?.san_protection;
    return sp && sp.day_1_3 != null && sp.day_4_7 != null &&
           sp.day_8_14 != null && sp.day_15_21 != null && sp.day_22_28 != null;
  }));

assert('1f: 每个等级都有 hp_protection 5 阶段',
  [1,2,3,4,5,6,7,8,9,10,11,12,13].every((l) => {
    const hp = DIFFICULTY_LEVELS[l]?.hp_protection;
    return hp && hp.day_1_3 != null && hp.day_4_7 != null &&
           hp.day_8_14 != null && hp.day_15_21 != null && hp.day_22_28 != null;
  }));

assert('1g: 每个等级都有 starting_food >= 0',
  [1,2,3,4,5,6,7,8,9,10,11,12,13].every((l) =>
    (DIFFICULTY_LEVELS[l]?.starting_food || 0) >= 0));

assert('1h: 每个等级都有 starting_ap >= 1',
  [1,2,3,4,5,6,7,8,9,10,11,12,13].every((l) =>
    (DIFFICULTY_LEVELS[l]?.starting_ap || 0) >= 1));

assert('1i: 每个等级都有 day_recovery',
  [1,2,3,4,5,6,7,8,9,10,11,12,13].every((l) =>
    DIFFICULTY_LEVELS[l]?.day_recovery?.interval >= 1));

assert('1j: 每个等级都有 category 字段',
  [1,2,3,4,5,6,7,8,9,10,11,12,13].every((l) =>
    DIFFICULTY_LEVELS[l]?.category));

// ═══════════════════════════════════════════════════════════
// Section 2: 难度单调性
// ═══════════════════════════════════════════════════════════
section('2. 难度单调性');

// 2a: starting_food 应该随难度递减（L13=0 是特例）
let prevFood = 99;
let foodMonotonic = true;
for (let l = 1; l <= 13; l++) {
  const f = DIFFICULTY_LEVELS[l].starting_food;
  if (f > prevFood) foodMonotonic = false;
  prevFood = f;
}
assert('2a: starting_food 不递增（高难度食物更少）', foodMonotonic);

// 2b: starting_ap 应该随难度递减
let prevAp = 99;
let apMonotonic = true;
for (let l = 1; l <= 13; l++) {
  const a = DIFFICULTY_LEVELS[l].starting_ap;
  if (a > prevAp) apMonotonic = false;
  prevAp = a;
}
assert('2b: starting_ap 不递增（高难度 AP 更少）', apMonotonic);

// 2c: explore_san_chance 应该随难度递增
let prevEsc = -1;
let escMonotonic = true;
for (let l = 1; l <= 13; l++) {
  const e = DIFFICULTY_LEVELS[l].explore_san_chance;
  if (e < prevEsc) escMonotonic = false;
  prevEsc = e;
}
assert('2c: explore_san_chance 不递减（高难度更易掉 SAN）', escMonotonic);

// 2d: max_hp_per_action 应该随难度递增或持平
let prevMhpa = -1;
let mhpaMonotonic = true;
for (let l = 1; l <= 13; l++) {
  const m = DIFFICULTY_LEVELS[l].max_hp_per_action;
  if (m < prevMhpa) mhpaMonotonic = false;
  prevMhpa = m;
}
assert('2d: max_hp_per_action 不递减', mhpaMonotonic);

// 2e: rest_san_recovery 应该随难度递减
let prevRsr = 99;
let rsrMonotonic = true;
for (let l = 1; l <= 13; l++) {
  const r = DIFFICULTY_LEVELS[l].rest_san_recovery;
  if (r > prevRsr) rsrMonotonic = false;
  prevRsr = r;
}
assert('2e: rest_san_recovery 不递增（高难度恢复更少）', rsrMonotonic);

// 2f: 解析 expected_survival 为数值范围
function parseSurvivalRange(str) {
  // "35-45%" → [35, 45], "<1%" → [0, 1], "25-35%" → [25, 35]
  const m = String(str).match(/(\d+)-(\d+)/);
  if (m) return [parseInt(m[1]), parseInt(m[2])];
  const lt = String(str).match(/<(\d+)/);
  if (lt) return [0, parseInt(lt[1])];
  return null;
}
const l1Range = parseSurvivalRange(DIFFICULTY_LEVELS[1].expected_survival);
const l13Range = parseSurvivalRange(DIFFICULTY_LEVELS[13].expected_survival);
assert('2f: L1 预期生存率下限 > L13 预期生存率上限',
  l1Range && l13Range && l1Range[0] > l13Range[1],
  'L1=' + DIFFICULTY_LEVELS[1].expected_survival + ' L13=' + DIFFICULTY_LEVELS[13].expected_survival);

// 2g: day_1_3 保护倍率应随难度递增（更难 = 保护更弱 → 倍率更大）
const l1Prot = DIFFICULTY_LEVELS[1].san_protection.day_1_3;
const l13Prot = DIFFICULTY_LEVELS[13].san_protection.day_1_3;
assert('2g: L1 day_1_3 保护 < L13 day_1_3 保护（L1 更保护）',
  l1Prot < l13Prot);

// ═══════════════════════════════════════════════════════════
// Section 3: 保护倍率合理性
// ═══════════════════════════════════════════════════════════
section('3. 保护倍率合理性');

// 3a: 所有保护倍率应在 [0, 1] 区间
let allProtInRange = true;
for (let l = 1; l <= 13; l++) {
  const sp = DIFFICULTY_LEVELS[l].san_protection;
  const hp = DIFFICULTY_LEVELS[l].hp_protection;
  for (const key of ['day_1_3', 'day_4_7', 'day_8_14', 'day_15_21', 'day_22_28']) {
    if ((sp[key] < 0 || sp[key] > 1) || (hp[key] < 0 || hp[key] > 1)) {
      allProtInRange = false;
    }
  }
}
assert('3a: 所有保护倍率在 [0, 1] 区间', allProtInRange);

// 3b: 同一难度内，保护倍率应随时间递增（前期保护更强）
let phaseMonotonic = true;
for (let l = 1; l <= 13; l++) {
  const sp = DIFFICULTY_LEVELS[l].san_protection;
  const phases = [sp.day_1_3, sp.day_4_7, sp.day_8_14, sp.day_15_21, sp.day_22_28];
  for (let i = 1; i < phases.length; i++) {
    if (phases[i] < phases[i - 1]) phaseMonotonic = false;
  }
}
assert('3b: 所有难度的保护倍率随时间非递减', phaseMonotonic);

// 3c: L13 应该无保护（所有倍率 = 1.0）
const l13sp = DIFFICULTY_LEVELS[13].san_protection;
assert('3c: L13 (归渊) 无 SAN 保护',
  l13sp.day_1_3 === 1 && l13sp.day_4_7 === 1 && l13sp.day_22_28 === 1);

const l13hp = DIFFICULTY_LEVELS[13].hp_protection;
assert('3d: L13 (归渊) 无 HP 保护',
  l13hp.day_1_3 === 1 && l13hp.day_4_7 === 1 && l13hp.day_22_28 === 1);

// 3e: L1 day_1_3 保护应明显低于 1.0（至少 50% 减免）
assert('3e: L1 day_1_3 SAN 保护 < 0.5（至少 50% 减免）',
  DIFFICULTY_LEVELS[1].san_protection.day_1_3 < 0.5);

// ═══════════════════════════════════════════════════════════
// Section 4: 第一轮回 Graduated Protection
// ═══════════════════════════════════════════════════════════
section('4. 第一轮回 Graduated Protection');

// 4a: loop 0 (第一轮回) 应受保护
assert('4a: isFirstLoopProtected(loop=0) = true',
  isFirstLoopProtected({ loopCount: 0 }));
assert('4b: isFirstLoopProtected(loop=1) = false',
  !isFirstLoopProtected({ loopCount: 1 }));
assert('4c: isFirstLoopProtected(loop=2) = false',
  !isFirstLoopProtected({ loopCount: 2 }));

// 4d: 安全窗口
assert('4d: isInSafeWindow(loop=0, day=1) = true',
  isInSafeWindow({ loopCount: 0, day: 1 }));
assert('4e: isInSafeWindow(loop=0, day=3) = true',
  isInSafeWindow({ loopCount: 0, day: 3 }));
assert('4f: isInSafeWindow(loop=0, day=4) = false',
  !isInSafeWindow({ loopCount: 0, day: 4 }));

// 4g: SAN 损失在 loop0→loop1→loop2 应递减，loop3 无上限（回归原始值）
const rawLoss = 10;
const l0san = adjustSanLossForLoop23(rawLoss, { loopCount: 0 });
const l1san = adjustSanLossForLoop23(rawLoss, { loopCount: 1 });
const l2san = adjustSanLossForLoop23(rawLoss, { loopCount: 2 });
const l3san = adjustSanLossForLoop23(rawLoss, { loopCount: 3 });
assert('4g: SAN 损失递减 loop0 <= loop1 <= loop2 <= loop3',
  l0san <= l1san && l1san <= l2san && l2san <= l3san,
  `${l0san} <= ${l1san} <= ${l2san} <= ${l3san}`);

// 4h: 饥饿伤害递减
const rawStarve = 2;
const l0starve = adjustStarvationDamage(rawStarve, { loopCount: 0 });
const l1starve = adjustStarvationDamage(rawStarve, { loopCount: 1 });
const l2starve = adjustStarvationDamage(rawStarve, { loopCount: 2 });
assert('4h: 饥饿伤害递减 loop0 <= loop1 <= loop2',
  l0starve <= l1starve && l1starve <= l2starve);

// 4i: 怪物概率递减
const rawChance = 0.3;
const l0mon = adjustMonsterChance(rawChance, { loopCount: 0 });
const l1mon = adjustMonsterChance(rawChance, { loopCount: 1 });
const l2mon = adjustMonsterChance(rawChance, { loopCount: 2 });
assert('4i: 怪物概率递减 loop0 <= loop1 <= loop2',
  l0mon <= l1mon && l1mon <= l2mon);

// 4j: PROTECTION_CONFIG 常量存在
assert('4j: PROTECTION_CONFIG 有 5 个字段',
  Object.keys(PROTECTION_CONFIG).length >= 5);

// 4k: GRADUATED_CONFIG 有 loop2 和 loop3
assert('4k: GRADUATED_CONFIG.loop2 存在', !!GRADUATED_CONFIG.loop2);
assert('4l: GRADUATED_CONFIG.loop3 存在', !!GRADUATED_CONFIG.loop3);

// 4m: loop3 不应该阻止致命事件
assert('4m: shouldBlockLethalEvent(loop=3) = false',
  !shouldBlockLethalEvent({ tags: ['instant_death'] }, { loopCount: 3 }));

assert('4n: shouldBlockLethalEvent(loop=0, day=1) = true',
  shouldBlockLethalEvent(null, { loopCount: 0, day: 1 }));

// ═══════════════════════════════════════════════════════════
// Section 5: 恐惧画像平衡
// ═══════════════════════════════════════════════════════════
section('5. 恐惧画像平衡（轻量模拟）');

const FEAR_KEYS = ['ocean', 'body', 'control', 'isolation', 'knowledge', 'morality'];
const SIM_RUNS = 80;

for (const fear of FEAR_KEYS) {
  const result = runSimulation({
    difficulty: 1,
    fear,
    runs: SIM_RUNS,
    seed: 1000 + FEAR_KEYS.indexOf(fear) * 100,
  });

  const survRate = parseFloat(result.overall.survRate);
  const hpDeaths = result.overall.deaths.HP;
  const sanDeaths = result.overall.deaths.SAN;

  // 5a: 不应 0% 生存（恐惧画像不应让玩家无法存活）
  assert('5a: [' + fear + '] 生存率 > 0%（至少 ' + SIM_RUNS + ' 次中 1 次）',
    survRate > 0, 'survRate=' + result.overall.survRate);

  // 5b: 不应 100% 生存
  assert('5b: [' + fear + '] 生存率 < 100%',
    survRate < 100, 'survRate=' + result.overall.survRate);

  // 5c: 生存率应在合理范围 [5%, 80%]
  assert('5c: [' + fear + '] 生存率在 [5%, 80%]',
    survRate >= 5 && survRate <= 80,
    'survRate=' + result.overall.survRate);

  // 5d: 不应纯 HP 碾压（至少 10 次死亡中要有一些 SAN 死亡，否则说明 SAN 系统没接入）
  const totalDeaths = hpDeaths + sanDeaths;
  const survCount = SIM_RUNS - totalDeaths;
  if (totalDeaths > 10) {
    assert('5d: [' + fear + '] 有非 HP 死亡类型（SAN 或存活）',
      sanDeaths > 0 || survCount > 0,
      'HP=' + hpDeaths + ' SAN=' + sanDeaths + ' surv=' + survCount);
  }
}

// ═══════════════════════════════════════════════════════════
// Section 6: 难度梯度验证
// ═══════════════════════════════════════════════════════════
section('6. 难度梯度验证');

const diffResults = [];
for (let level = 1; level <= 13; level++) {
  const r = runSimulation({
    difficulty: level,
    fear: null,
    runs: SIM_RUNS,
    seed: 2000 + level * 100,
  });
  diffResults.push({ level, survRate: parseFloat(r.overall.survRate), avgDays: parseFloat(r.overall.avgDays) });
}

// 6a: 生存率应大致随难度递减
let survivalDescending = true;
for (let i = 1; i < diffResults.length; i++) {
  if (diffResults[i].survRate > diffResults[i - 1].survRate + 8) {
    survivalDescending = false;
  }
}
assert('6a: 生存率大致随难度递减（相邻级差不超过 8%）',
  survivalDescending,
  diffResults.map((r) => 'L' + r.level + '=' + r.survRate.toFixed(1) + '%').join(', '));

// 6b: 平均存活天数应随难度递减
let daysDescending = true;
for (let i = 1; i < diffResults.length; i++) {
  if (diffResults[i].avgDays > diffResults[i - 1].avgDays + 3) {
    daysDescending = false;
  }
}
assert('6b: 平均存活天数大致随难度递减',
  daysDescending,
  diffResults.map((r) => 'L' + r.level + '=' + r.avgDays.toFixed(1)).join(', '));

// 6c: L1 不应过于容易（生存率 < 80%）
const l1Result = diffResults.find((r) => r.level === 1);
assert('6c: L1 生存率 < 80%（不能太简单）',
  l1Result.survRate < 80, 'L1 surv=' + l1Result.survRate.toFixed(1) + '%');

// 6d: L13 不应比 L1 更容易（生存率应更低）
const l13Result = diffResults.find((r) => r.level === 13);
assert('6d: L13 生存率 <= L1 生存率（更高难度不会更容易）',
  l13Result.survRate <= l1Result.survRate,
  'L13=' + l13Result.survRate.toFixed(1) + '% L1=' + l1Result.survRate.toFixed(1) + '%');

// ═══════════════════════════════════════════════════════════
// Section 7: 消耗速率合理性
// ═══════════════════════════════════════════════════════════
section('7. 消耗速率合理性');

// 7a: L13 (0 food, no rest recovery) 应与 L1 (3 food, rest +3 SAN) 结果有显著差异
const l13Starve = runSimulation({
  difficulty: 13, fear: null, runs: 60, seed: 3000,
});
assert('7a: L13(0食物)与L1(3食物)平均天数差异 > 3',
  Math.abs(l13Starve.overall.avgDays - l1Result.avgDays) > 3,
  'L13=' + l13Starve.overall.avgDays + ' L1=' + l1Result.avgDays);

// 7b: AP 利用率不应极端低（> 70% AP 浪费说明 AI 太笨）
const l1Check = diffResults.find((r) => r.level === 1);
const l1SimDetail = runSimulation({ difficulty: 1, fear: null, runs: 80, seed: 3100 });
assert('7b: L1 AP 浪费率 < 70%',
  l1SimDetail.overall.avgApWasted < 70,
  'apWasted=' + l1SimDetail.overall.avgApWasted);

// 7c: 探索应至少访问 2 个区域
assert('7c: L1 平均探索区域 >= 2',
  l1SimDetail.overall.avgAreas >= 2,
  'areas=' + l1SimDetail.overall.avgAreas);

// ═══════════════════════════════════════════════════════════
// Section 8: 封印状态随天数递增
// ═══════════════════════════════════════════════════════════
section('8. 封印状态随天数递增');

// getSealModifier 在 balanceSimulator 内部，
// 此处用 getPhaseProtection 验证难度配置中的阶段保护递增
for (let l = 1; l <= 13; l++) {
  const sp = DIFFICULTY_LEVELS[l].san_protection;
  const phases = [sp.day_1_3, sp.day_4_7, sp.day_8_14, sp.day_15_21, sp.day_22_28];
  let nonDecreasing = true;
  for (let i = 1; i < phases.length; i++) {
    if (phases[i] < phases[i - 1] - 0.001) nonDecreasing = false;
  }
  assert('8a: L' + l + ' 阶段保护非递减', nonDecreasing,
    DIFFICULTY_LEVELS[l].name + ': ' + phases.join(' → '));
}

// ═══════════════════════════════════════════════════════════
// Section 9: 模拟器可复现性（种子确定性）
// ═══════════════════════════════════════════════════════════
section('9. 模拟器可复现性（种子确定性）');

const SEED = 42;
const runA = runSimulation({ difficulty: 3, fear: 'ocean', runs: 50, seed: SEED });
const runB = runSimulation({ difficulty: 3, fear: 'ocean', runs: 50, seed: SEED });

assert('9a: 同种子同参数 → 相同生存率',
  runA.overall.survRate === runB.overall.survRate,
  'A=' + runA.overall.survRate + ' B=' + runB.overall.survRate);
assert('9b: 同种子同参数 → 相同平均天数',
  runA.overall.avgDays === runB.overall.avgDays,
  'A=' + runA.overall.avgDays + ' B=' + runB.overall.avgDays);

// 不同种子应产生不同结果
const runC = runSimulation({ difficulty: 3, fear: 'ocean', runs: 50, seed: SEED + 1 });
assert('9c: 不同种子 → 不同结果（至少一个指标不同）',
  runA.overall.survRate !== runC.overall.survRate ||
  runA.overall.avgDays !== runC.overall.avgDays);

// ═══════════════════════════════════════════════════════════
// Section 10: 模拟器输出结构完整性
// ═══════════════════════════════════════════════════════════
section('10. 模拟器输出结构完整性');

const sampleRun = simulateRun({ difficulty: 1, fear: null, loop: 0, seed: 999 });
assert('10a: 输出含 survived 字段', typeof sampleRun.survived === 'boolean');
assert('10b: 输出含 days 字段（1-28）', sampleRun.days >= 1 && sampleRun.days <= 28);
assert('10c: 输出含 deathCause 或 null', sampleRun.deathCause === null ||
  ['HP', 'SAN'].includes(sampleRun.deathCause));
assert('10d: 输出含 finalSan（0-99）', sampleRun.finalSan >= 0 && sampleRun.finalSan <= 99);
assert('10e: 输出含 finalHp（0-11）', sampleRun.finalHp >= 0 && sampleRun.finalHp <= 11);
assert('10f: 输出含 phaseLoss 对象',
  sampleRun.phaseLoss && typeof sampleRun.phaseLoss === 'object');
assert('10g: 输出含 sanCurve 数组（长度 29）',
  Array.isArray(sampleRun.sanCurve) && sampleRun.sanCurve.length === 29);

// aggregateResults 结构
const agg = aggregateResults([sampleRun]);
assert('10h: aggregateResults 有 overall 字段', !!agg.overall);
assert('10i: aggregateResults 有 phases 字段', !!agg.phases);
assert('10j: aggregateResults 有 byFear 字段', !!agg.byFear);
assert('10k: aggregateResults 有 byDiff 字段', !!agg.byDiff);
assert('10l: aggregateResults 有 sanCurve 字段', Array.isArray(agg.sanCurve));
assert('10m: overall.survRate 是字符串带 %',
  typeof agg.overall.survRate === 'string' && agg.overall.survRate.includes('%'));

// ═══════════════════════════════════════════════════════════
// 汇总
// ═══════════════════════════════════════════════════════════
console.log('\n' + '='.repeat(50));
console.log('  Balance Test Results: ' + passed + ' passed, ' + failed + ' failed');
console.log('='.repeat(50));

if (failed > 0) {
  console.log('\n  ❌ BALANCE TESTS FAILED');
  process.exit(1);
} else {
  console.log('\n  ✅ ALL BALANCE TESTS PASSED');
  process.exit(0);
}
