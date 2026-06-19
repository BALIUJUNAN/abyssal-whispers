#!/usr/bin/env node
/**
 * scripts/simulate_loops.cjs
 * 轮回模拟器 — 批量模拟多次轮回并输出统计报表
 *
 * 用法:
 *   node scripts/simulate_loops.cjs --loops 10 --seed 123
 *   node scripts/simulate_loops.cjs --loops 20 --report report.txt
 *   node scripts/simulate_loops.cjs --loops 100 --batch 10 --progress
 *   node scripts/simulate_loops.cjs --loops 50 --difficulty 10
 *
 * 参数:
 *   --loops N      模拟轮回次数 (默认 10)
 *   --seed  N      随机种子 (可复现)
 *   --report FILE  输出报表文件路径 (默认 stdout)
 *   --verbose      输出每轮详情
 *   --batch N      每N轮输出一次进度 (默认不输出)
 *   --progress     启用进度条输出
 *   --difficulty N 模拟难度等级 1-21 (默认 1)
 *   --json         输出JSON格式结果
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// ── Parse args ──────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name, def) {
  const idx = args.indexOf('--' + name);
  if (idx === -1) return def;
  return args[idx + 1] || def;
}
const MAX_LOOPS = parseInt(getArg('loops', '10'), 10);
const SEED = getArg('seed', null);
const REPORT_FILE = getArg('report', null);
const VERBOSE = args.includes('--verbose');
const BATCH_SIZE = parseInt(getArg('batch', '0'), 10);
const PROGRESS = args.includes('--progress');
const DIFFICULTY = parseInt(getArg('difficulty', '1'), 10);
const JSON_OUTPUT = args.includes('--json');

// ── Performance: Cache game data at module level ────
let _cachedGD = null;
let _cachedPath = null;
function loadGameData() {
  const dataPath = path.join(ROOT, 'game_base.json');
  if (_cachedGD && _cachedPath === dataPath) return _cachedGD;
  _cachedPath = dataPath;
  _cachedGD = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  return _cachedGD;
}

// ── Performance: Pre-compute loop effects table ─────
function buildLoopEffectsTable(GD) {
  const table = {};
  const loopEffects = GD.systems?.loop?.loop_count_effects || {};
  for (let i = 1; i <= 21; i++) {
    const key = i <= 5 ? 'loop_' + i : 'loop_6_plus';
    table[i] = loopEffects[key] || { san_cap_reduction: 0, pollution_intensity: 0 };
  }
  return table;
}

// ── Performance: Pre-compute pollution rules ────────
function buildPollutionRules(GD) {
  const rules = [];
  for (const rule of GD.systems?.loop?.pollution_rules || []) {
    if (rule.cumulative && rule.id === 'pollution_san_cap') {
      rules.push(rule);
    }
  }
  return rules;
}

// ── Seeded PRNG (xorshift32) ────────────────────────
let _seed = SEED ? parseInt(SEED, 10) : Date.now();
function seededRandom() {
  _seed ^= _seed << 13;
  _seed ^= _seed >> 17;
  _seed ^= _seed << 5;
  return (_seed >>> 0) / 4294967296;
}

// ── Load game data (Feature 3: cached via loadGameData) ──
// Actual load deferred to main loop to allow graceful error handling

// ── State factory ───────────────────────────────────
function makeState(overrides) {
  return Object.assign(
    {
      screen: 'game',
      day: 1,
      ap: 12,
      maxAp: 12,
      stats: { STR: 50, CON: 55, DEX: 55, APP: 50, POW: 60, INT: 65, SIZ: 60, EDU: 70 },
      hp: 11,
      maxHp: 11,
      san: 60,
      maxSan: 99,
      currentArea: 'town_center',
      visitedAreas: ['town_center'],
      inventory: [],
      clues: [],
      skills: {},
      npcTrust: { 老费舍: 5, '玛莎·格雷': 3, '伊莎贝拉·韦伯': 2 },
      npcStates: {},
      npcRelations: {},
      triggeredEvents: [],
      longTermEffects: [],
      stats_run: { deaths: 0, runs: 0 },
      food: 3,
      maxFood: 5,
      loopCount: 0,
      pollution: 0,
      retainedKnowledge: [],
      discoveredConclusions: [],
      mythosLevel: 10,
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
      money: 5,
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
    },
    overrides
  );
}

// ── Loop transition (Feature 3: accepts cached data for performance) ─────────────────
function simulateLoop(s, GD, loopEffectsTable, pollutionRules) {
  const f = makeState();

  f.stats_run.deaths = (s.stats_run?.deaths || 0) + (s.hp <= 0 || s.san <= 0 ? 1 : 0);
  f.stats_run.runs = (s.stats_run?.runs || 0) + 1;

  f.loopCount = (s.loopCount || 0) + 1;

  // Feature 3: Use pre-computed loop effects table
  const loopEffect = loopEffectsTable[f.loopCount] || { san_cap_reduction: 0, pollution_intensity: 0 };
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

  if (f.loopCount >= 3) {
    var trustDecay = Math.min(2, Math.floor(f.loopCount / 3));
    var npcNames = Object.keys(f.npcTrust || {});
    for (var n = 0; n < npcNames.length; n++) {
      if (f.npcTrust[npcNames[n]] > 0) f.npcTrust[npcNames[n]] = Math.max(0, f.npcTrust[npcNames[n]] - trustDecay);
    }
  }

  // Feature 3: Use pre-computed pollution rules
  if (f.pollution > 0) {
    for (var r = 0; r < pollutionRules.length; r++) {
      var rule = pollutionRules[r];
      var sanFloor = f.loopCount >= 10 ? 50 : f.loopCount >= 4 ? 60 : 20;
      f.maxSan = Math.max(sanFloor, f.maxSan - 5);
      f.san = Math.min(f.san, f.maxSan);
    }
  }

  f.retainedKnowledge = [...(s.retainedKnowledge || [])];
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
  f.previousDeathContext = s.deathContext || null;
  f.lastDeathType = s.deathContext?.type || s.lastDeathType || null;
  f.lastDeathMode = s.deathContext?.mode || s.lastDeathMode || null;

  return f;
}

// ── Simulate a single run (random survival days) ────
function simulateRun(s) {
  const survivalDays = Math.floor(seededRandom() * 14) + 3; // 3-16 days
  const deathRoll = seededRandom();
  let deathMode;
  if (deathRoll < 0.4) {
    deathMode = 'san';
    s.san = 0;
    s.hp = 11;
  } else if (deathRoll < 0.8) {
    deathMode = 'hp';
    s.hp = 0;
    s.san = 60;
  } else {
    deathMode = 'hybrid';
    s.hp = 0;
    s.san = 0;
  }

  // Random ending reached (60% chance)
  const endingReached = seededRandom() < 0.6;
  if (endingReached) {
    const endingPool = [
      'ending_madness',
      'ending_drowning',
      'ending_escape',
      'ending_consumed',
      'ending_heretical_dawn',
    ];
    s.ending = {
      id: endingPool[Math.floor(seededRandom() * endingPool.length)],
      name: 'simulated',
    };
  } else {
    s.ending = null;
  }

  return { survivalDays, deathMode, endingReached };
}

// ── Main simulation ─────────────────────────────────
const lines = [];
const startTime = Date.now();

// Feature 3: Cache game data and pre-compute tables
let GD;
try {
  GD = loadGameData();
} catch (e) {
  console.error('[ERROR] Cannot load game_base.json:', e.message);
  process.exit(1);
}
const LOOP_EFFECTS_TABLE = buildLoopEffectsTable(GD);
const POLLUTION_RULES = buildPollutionRules(GD);

// Feature 3: JSON output accumulator
const jsonResult = {
  config: { loops: MAX_LOOPS, seed: SEED, difficulty: DIFFICULTY },
  loopData: [],
  summary: null,
};

function log(msg) {
  lines.push(msg);
  if (VERBOSE || PROGRESS) console.log(msg);
}

// Feature 3: Progress reporting
function reportProgress(current, total) {
  const pct = Math.round((current / total) * 100);
  const bar = '█'.repeat(Math.floor(pct / 2)) + '░'.repeat(50 - Math.floor(pct / 2));
  process.stdout.write(`\r  ${bar} ${pct}% (${current}/${total})`);
  if (current >= total) process.stdout.write('\n');
}

log('╔══════════════════════════════════════════════════════════╗');
log('║           轮回模拟报表 / Loop Simulation Report          ║');
log('╠══════════════════════════════════════════════════════════╣');
log('║  生成时间: ' + new Date().toISOString().padEnd(44) + '║');
log('║  模拟轮回: ' + String(MAX_LOOPS).padEnd(44) + '║');
log('║  难度等级: ' + String(DIFFICULTY).padEnd(44) + '║');
log('║  随机种子: ' + String(SEED || 'auto (' + _seed + ')').padEnd(44) + '║');
log('╚══════════════════════════════════════════════════════════╝');
log('');

let state = makeState();
const loopData = [];

for (let i = 0; i < MAX_LOOPS; i++) {
  const runInfo = simulateRun(state);
  const preLoop = {
    loopCount: state.loopCount,
    san: state.san,
    maxSan: state.maxSan,
    pollution: state.pollution,
    mythosLevel: state.mythosLevel,
    npcTrustSum: Object.values(state.npcTrust).reduce((a, b) => a + b, 0),
  };

  // Feature 3: Use cached loop effects table instead of GD lookup
  state = simulateLoop(state, GD, LOOP_EFFECTS_TABLE, POLLUTION_RULES);

  const postLoop = {
    loopCount: state.loopCount,
    san: state.san,
    maxSan: state.maxSan,
    pollution: state.pollution,
    mythosLevel: state.mythosLevel,
    endingCoins: state.endingCoins,
    loopShopTier: state.loopShopTier,
    npcTrustSum: Object.values(state.npcTrust).reduce((a, b) => a + b, 0),
  };

  loopData.push({ ...runInfo, preLoop, postLoop });

  log(
    '  Loop ' +
      String(state.loopCount).padStart(2) +
      ' │ 死因: ' +
      runInfo.deathMode.padEnd(7) +
      ' │ 存活: ' +
      String(runInfo.survivalDays).padStart(2) +
      '天' +
      ' │ SAN: ' +
      String(postLoop.san).padStart(2) +
      '/' +
      String(postLoop.maxSan).padStart(2) +
      ' │ 污染: ' +
      (postLoop.pollution * 100).toFixed(1).padStart(5) +
      '%' +
      ' │ 结局: ' +
      (runInfo.endingReached ? '✓' : '✗')
  );

  // Feature 3: Batch progress reporting
  if (BATCH_SIZE > 0 && (i + 1) % BATCH_SIZE === 0) {
    reportProgress(i + 1, MAX_LOOPS);
  }
}

// Final progress
if (BATCH_SIZE > 0) reportProgress(MAX_LOOPS, MAX_LOOPS);

const elapsed = Date.now() - startTime;

// Feature 3: Build JSON summary
const avgSurvival = loopData.reduce((s, d) => s + d.survivalDays, 0) / loopData.length;
const deathModes = { san: 0, hp: 0, hybrid: 0 };
loopData.forEach((d) => { deathModes[d.deathMode]++; });
const endingRate = loopData.filter((d) => d.endingReached).length / loopData.length;

jsonResult.summary = {
  avgSurvival: Math.round(avgSurvival * 10) / 10,
  deathModes,
  endingRate: Math.round(endingRate * 100),
  elapsed,
  finalState: {
    loopCount: state.loopCount,
    maxSan: state.maxSan,
    san: state.san,
    pollution: Math.round(state.pollution * 1000) / 1000,
    endingCoins: state.endingCoins,
    loopShopTier: state.loopShopTier,
    npcTrust: state.npcTrust,
  },
};

log('');
log('── 统计摘要 / Summary ──────────────────────────────────────');
log('');

log('  平均存活天数:    ' + avgSurvival.toFixed(1));
log('  死因分布:');
log(
  '    理智崩塌 (SAN): ' +
    deathModes.san +
    ' (' +
    ((deathModes.san / MAX_LOOPS) * 100).toFixed(0) +
    '%)'
);
log(
  '    肉体消亡 (HP):  ' +
    deathModes.hp +
    ' (' +
    ((deathModes.hp / MAX_LOOPS) * 100).toFixed(0) +
    '%)'
);
log(
  '    身心俱灭 (混合):' +
    deathModes.hybrid +
    ' (' +
    ((deathModes.hybrid / MAX_LOOPS) * 100).toFixed(0) +
    '%)'
);
log('  结局达成率:      ' + (endingRate * 100).toFixed(0) + '%');
log('');
log('  最终状态:');
log('    轮回次数:      ' + state.loopCount);
log('    SAN上限:       ' + state.maxSan);
log('    当前SAN:       ' + state.san);
log('    世界污染:      ' + (state.pollution * 100).toFixed(1) + '%');
log('    神秘学等级:    ' + state.mythosLevel);
log('    结局代币:      ' + state.endingCoins);
log('    商店等级:      Tier ' + state.loopShopTier);
log('    已达成结局:    ' + state.previousEndings.length + ' 种');
log('    NPC信任总和:   ' + Object.values(state.npcTrust).reduce((a, b) => a + b, 0));
log('');
log('  NPC信任衰减曲线:');
for (const [name, trust] of Object.entries(state.npcTrust)) {
  log('    ' + name + ': ' + trust);
}
log('');
log('  行为计数器:');
const bt = state.behaviorTracking;
const btDisplay = [
  'direct_kill_count',
  'cannibalism_count',
  'work_count',
  'hoarded_money_max',
  'meta_boundary_breaks',
  'loop_break_attempts',
];
for (const key of btDisplay) {
  if (bt[key]) log('    ' + key + ': ' + bt[key]);
}
log('');
log('  耗时: ' + elapsed + 'ms');
log('');

// ── Balance assessment ──────────────────────────────
log('── 平衡评估 / Balance Assessment ────────────────────────────');
log('');

const warnings = [];
if (state.maxSan < 50) warnings.push('⚠ SAN上限跌破50 — 可能导致后期过于困难');
if (state.pollution > 0.95) warnings.push('⚠ 污染接近100% — Meta层UI可能崩溃');
const trustSum = Object.values(state.npcTrust).reduce((a, b) => a + b, 0);
if (trustSum === 0) warnings.push('⚠ 所有NPC信任归零 — NPC交互可能失效');
if (endingRate < 0.3) warnings.push('⚠ 结局达成率 < 30% — 可能需要降低难度');
if (endingRate > 0.9) warnings.push('⚠ 结局达成率 > 90% — 可能需要增加挑战');
if (avgSurvival < 5) warnings.push('⚠ 平均存活 < 5天 — 可能过于困难');
if (avgSurvival > 20) warnings.push('⚠ 平均存活 > 20天 — 可能过于简单');
if (state.loopCount >= 10 && state.maxSan === 50 && state.san < 10)
  warnings.push('⚠ loop10+ SAN接近0 — 即死风险过高');

if (warnings.length === 0) {
  log('  ✅ 所有指标在预期范围内');
} else {
  for (const w of warnings) log('  ' + w);
}
log('');

// ── Output report file ──────────────────────────────
if (REPORT_FILE) {
  const reportPath = path.resolve(ROOT, REPORT_FILE);
  fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
  console.log('Report written to: ' + reportPath);
} else if (!VERBOSE) {
  // Print to stdout if not verbose (verbose already printed)
  for (const line of lines) console.log(line);
}

console.log('');
console.log('Simulation complete: ' + MAX_LOOPS + ' loops in ' + elapsed + 'ms');

// Feature 3: JSON output
if (JSON_OUTPUT) {
  const jsonOut = JSON.stringify(jsonResult, null, 2);
  if (REPORT_FILE) {
    fs.writeFileSync(path.resolve(ROOT, REPORT_FILE), jsonOut, 'utf8');
    console.log('JSON report written to: ' + REPORT_FILE);
  } else {
    console.log(jsonOut);
  }
}
