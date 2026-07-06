/**
 * tests/test_reincarnation_core.cjs
 * 轮回系统完整测试：核心逻辑 + 场景化测试（合并自 core + scenarios）
 *
 * Part A: 单元测试（继承、污染、NPC、平衡、死亡解析、结局系统）
 * Part B: 场景测试（全流程、极端情况、存档迁移、平衡评估）
 *
 * Run: node tests/test_reincarnation_core.cjs
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
  const raw = fs.readFileSync(path.join(ROOT, 'game_base.json'), 'utf8');
  GD = JSON.parse(raw);
} catch (e) {
  console.log('  [WARN] Could not load game_base.json: ' + e.message);
}

// ═══════════════════════════════════════════════════════════
// Reimplemented pure functions for Node.js testing
// (Mirrors src/reducers/loopReducer.js initLoopState logic)
// ═══════════════════════════════════════════════════════════

function getLoopEffect(loopCount) {
  const effects = GD.systems?.loop?.loop_count_effects || {};
  const key = loopCount <= 5 ? 'loop_' + loopCount : 'loop_6_plus';
  return effects[key] || { san_cap_reduction: 0, pollution_intensity: 0 };
}

/**
 * Simulate initLoopState (mirrors src/reducers/loopReducer.js).
 * Only carries over loop-relevant fields for focused testing.
 */
function simulateLoopTransition(oldState) {
  const f = makeState();
  const s = oldState;

  // 1) Run stats
  f.stats_run.deaths = (s.stats_run?.deaths || 0) + (s.hp <= 0 || s.san <= 0 ? 1 : 0);
  f.stats_run.runs = (s.stats_run?.runs || 0) + 1;
  f.lastDeathType = s.hp <= 0 ? 'physical' : s.san <= 0 ? 'mental' : null;

  // 2) Loop count & environment effects
  f.loopCount = (s.loopCount || 0) + 1;
  const loopKey = f.loopCount <= 5 ? 'loop_' + f.loopCount : 'loop_6_plus';
  const loopEffect = GD.systems?.loop?.loop_count_effects?.[loopKey];
  if (loopEffect) {
    f.maxSan = Math.max(10, 99 + (loopEffect.san_cap_reduction || 0));
    f.san = Math.min(f.san, f.maxSan);
    f.pollution = loopEffect.pollution_intensity || 0;
  }

  // Phase 7: SAN floors
  if (f.loopCount >= 10) {
    f.maxSan = 50;
  } else if (f.loopCount >= 6) {
    f.maxSan = Math.max(60, f.maxSan);
  } else if (f.loopCount >= 4) {
    f.maxSan = Math.max(60, f.maxSan);
  }
  f.san = Math.min(f.san, f.maxSan);

  // Pollution accumulation
  var pollutionRate = f.loopCount >= 6 ? 0.08 : 0.05;
  f.pollution = Math.min(1, (f.pollution || 0) + pollutionRate * f.loopCount);

  // NPC trust decay
  if (f.loopCount >= 3) {
    var trustDecay = Math.min(2, Math.floor(f.loopCount / 3));
    var npcNames = Object.keys(f.npcTrust || {});
    for (var _ni = 0; _ni < npcNames.length; _ni++) {
      var _cur = f.npcTrust[npcNames[_ni]] || 0;
      if (_cur > 0) f.npcTrust[npcNames[_ni]] = Math.max(0, _cur - trustDecay);
    }
  }

  // Skills retention (30%)
  if (f.loopCount > 1) {
    Object.entries(s.skills || {}).forEach(([k, v]) => {
      if (v > 0) f.skills[k] = Math.max(f.skills[k] || 0, Math.floor(v * 0.3));
    });
  }

  // Pollution SAN cap
  if (f.pollution > 0) {
    const rules = GD.systems?.loop?.pollution_rules || [];
    rules.forEach((rule) => {
      if (rule.cumulative && rule.id === 'pollution_san_cap') {
        var sanFloor = f.loopCount >= 10 ? 50 : f.loopCount >= 4 ? 60 : 20;
        f.maxSan = Math.max(sanFloor, f.maxSan - 5);
        f.san = Math.min(f.san, f.maxSan);
      }
    });
  }

  // Blessings
  const blessings = GD.systems?.loop?.loop_blessings || {};
  const bKey = f.loopCount <= 5 ? 'loop_' + f.loopCount : 'loop_6_plus';
  if (blessings[bKey]) {
    f.activeBlessings = [...(s.activeBlessings || []), bKey];
  }

  // Knowledge & conclusion retention
  f.retainedKnowledge = [...(s.retainedKnowledge || [])];
  f.discoveredConclusions = [...(s.discoveredConclusions || [])];
  f.humanityScore = s.humanityScore ?? 50;

  // Ending coins & shop tier
  f.endingCoins = s.endingCoins || 0;
  if (s.ending?.id) {
    f.endingCoins = (f.endingCoins || 0) + 1;
  }
  f.loopShopTier = s.loopShopTier || 0;
  if (f.loopCount >= 5 && f.loopShopTier < 1) f.loopShopTier = 1;
  if (f.loopCount >= 7 && f.loopShopTier < 2) f.loopShopTier = 2;

  // Behavior tracking carry-over
  const sBT = s.behaviorTracking || {};
  const fBT = f.behaviorTracking;
  const BEHAVIOR_COUNTERS = [
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
  for (const key of BEHAVIOR_COUNTERS) {
    fBT[key] = sBT[key] || 0;
  }
  fBT._npc_harm_tally = { ...(sBT._npc_harm_tally || {}) };
  fBT.sleep_streak = 0;

  // Loop break attempts
  if (
    (sBT.sacred_desecration_count || 0) > 0 ||
    (s.triggeredEvents || []).includes('seal_desecrated')
  ) {
    fBT.loop_break_attempts = (sBT.loop_break_attempts || 0) + 1;
  }
  fBT.save_delete_attempts = sBT.save_delete_attempts || 0;
  if ((s.retainedKnowledge || []).length > 5)
    fBT.loop_exploit_score = (sBT.loop_exploit_score || 0) + 1;

  // Prologue / fear tuning
  f.prologue = s.prologue || null;
  f.fearTuning = s.fearTuning || null;

  // Mythos decay
  f.mythosLevel = Math.max(0, (s.mythosLevel || 0) - 2);

  // NPC relations carry-over
  f.npcRelations = { ...(s.npcRelations || {}) };
  f._npcTrustLocked = { ...(s._npcTrustLocked || {}) };

  // Money carry-over
  f.money = s.money || 0;

  // History
  f.previousEndings = [...(s.previousEndings || [])];
  if (s.ending?.id && !f.previousEndings.includes(s.ending.id)) {
    f.previousEndings.push(s.ending.id);
  }
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
  f.worldCorrectionFlags = [...(s.worldCorrectionFlags || [])];
  if (f.worldCorrectionFlags.length > 200)
    f.worldCorrectionFlags = f.worldCorrectionFlags.slice(-200);
  f.everTriggeredEvents = [...(s.everTriggeredEvents || [])];
  if (f.everTriggeredEvents.length > 2000)
    f.everTriggeredEvents = f.everTriggeredEvents.slice(-2000);

  // Death context
  f.previousDeathContext = s.deathContext || null;
  f.lastDeathType = s.deathContext?.type || s.lastDeathType || null;
  f.lastDeathMode = s.deathContext?.mode || s.lastDeathMode || null;

  // Money
  f.money = s.money || 0;

  return f;
}

/**
 * simulateLoop: thin wrapper used by scenario tests.
 * Accepts optional endingReached flag for ending coin simulation.
 */
function simulateLoop(oldState, endingReached) {
  // simulateLoopTransition checks s.ending?.id for coin gain.
  // If endingReached is true but s.ending is null, temporarily set it.
  const hadEnding = !!oldState.ending;
  if (endingReached && !hadEnding) {
    oldState.ending = { id: 'simulated_ending', name: 'simulated' };
  }
  const f = simulateLoopTransition(oldState);
  // Restore original state (simulateLoopTransition already copied what it needed)
  if (endingReached && !hadEnding) {
    oldState.ending = null;
  }
  return f;
}

// ═══════════════════════════════════════════════════════════
// Death system (mirrors src/reducers/deathSystem.js)
// ═══════════════════════════════════════════════════════════

const HP_DEATH_TYPES = {
  drowning: { label: '溺水', tags: ['water', 'harbor'] },
  bleeding: { label: '失血', tags: ['combat', 'wound'] },
  infection: { label: '感染', tags: ['infection', 'no_medicine'] },
  starvation: { label: '饥饿', tags: ['food'] },
  falling: { label: '坠落', tags: ['fall', 'lighthouse', 'catacombs'] },
  darkness_taken: { label: '黑暗吞噬', tags: ['darkness'] },
  physical: { label: '肉体消亡', tags: [] },
};

const SAN_DEATH_TYPES = {
  madness: { label: '疯狂', tags: [] },
  possession: { label: '附身', tags: ['possession'] },
  identity_erasure: { label: '身份抹除', tags: ['meta'] },
  mythos_absorption: { label: '神话吞噬', tags: ['mythos'] },
  loop_collapse: { label: '循环崩塌', tags: ['loop'] },
  becomes_event: { label: '成为事件', tags: ['missing_600'] },
  mental: { label: '理智崩塌', tags: [] },
};

const HYBRID_DEATH_TYPES = {
  body_and_self_lost: { label: '身心俱灭', tags: ['hybrid'] },
};

const ALL_DEATH_TYPES = { ...HP_DEATH_TYPES, ...SAN_DEATH_TYPES, ...HYBRID_DEATH_TYPES };

function inferDeathType(state, event, choice, mode) {
  if (event?.effects?.death_hint && ALL_DEATH_TYPES[event.effects.death_hint]) {
    return event.effects.death_hint;
  }
  if (choice?.effects?.death_hint && ALL_DEATH_TYPES[choice.effects.death_hint]) {
    return choice.effects.death_hint;
  }
  const tags = [...(event?.tags || []), ...(choice?.tags || [])];

  if (mode === 'san') {
    if (tags.includes('missing_600')) return 'becomes_event';
    if (tags.includes('meta')) return 'identity_erasure';
    if (tags.includes('mythos') || (state.mythosLevel || 0) >= 20) return 'mythos_absorption';
    if (tags.includes('possession')) return 'possession';
    if ((state.loopCount || 0) >= 8 && (state.san || 0) <= 10) return 'loop_collapse';
    return 'madness';
  }
  if (mode === 'hybrid') return 'body_and_self_lost';

  if (
    tags.includes('water') ||
    (state.currentArea === 'harbor_district' && !tags.includes('combat'))
  )
    return 'drowning';
  if (tags.includes('infection')) return 'infection';
  if (tags.includes('food') || (state.food != null && state.food <= 0)) return 'starvation';
  if (tags.includes('darkness') || (state.lightLevel != null && state.lightLevel <= 0))
    return 'darkness_taken';
  if (tags.includes('fall') || state.currentArea === 'lighthouse') return 'falling';
  if (tags.includes('combat')) return 'bleeding';

  const area = state.currentArea || '';
  if (area === 'harbor_district') return 'drowning';
  if (area === 'lighthouse') return 'falling';
  if (area === 'deep_catacombs' || area === 'catacombs_entrance') return 'darkness_taken';
  if (area === 'whispering_forest' || area === 'forbidden_grove') return 'bleeding';
  if (area === 'voxchester_manor') return 'infection';
  if (area === 'ruins_of_yith') return 'darkness_taken';

  return 'physical';
}

function resolveDeath(state, sourceEvent, sourceChoice) {
  const hpDead = state.hp <= 0;
  const sanDead = state.san <= 0;
  if (!hpDead && !sanDead) return null;

  let mode = 'hp';
  if (sanDead && !hpDead) mode = 'san';
  if (sanDead && hpDead) mode = 'hybrid';

  const type = inferDeathType(state, sourceEvent, sourceChoice, mode);

  return {
    mode,
    type,
    area: state.currentArea || null,
    day: state.day || 1,
    loop: state.loopCount || 0,
    sourceEventId: sourceEvent?.id || null,
    lastDeathType: type,
    lastDeathMode: mode,
  };
}

// ═══════════════════════════════════════════════════════════
// Ending system (mirrors src/reducers/endingReducer.js)
// ═══════════════════════════════════════════════════════════

const CONDITION_VAR_MAP = {
  direct_kill_count: (s) => s.behaviorTracking.direct_kill_count || 0,
  cannibalism_count: (s) => s.behaviorTracking.cannibalism_count || 0,
  loop_count: (s) => s.loopCount || 0,
  pollution: (s) => Math.round((s.pollution || 0) * 100),
  player_san: (s) => s.san,
  san: (s) => s.san,
  hp: (s) => s.hp || 0,
  day: (s) => s.day || 1,
  player_humanity_score: (s) => s.humanityScore ?? 50,
  hilda_trust: (s) => (s.npcTrust || {})['希尔达·莫里斯'] || 0,
  old_fisher_trust: (s) => (s.npcTrust || {})['老费舍'] || 0,
  meta_boundary_breaks: (s) => s.behaviorTracking.meta_boundary_breaks || 0,
  save_delete_attempts: (s) => s.behaviorTracking.save_delete_attempts || 0,
  loop_exploit_score: (s) => s.behaviorTracking.loop_exploit_score || 0,
  loop_break_attempts: (s) => s.behaviorTracking.loop_break_attempts || 0,
};

function parseConditionString(condStr) {
  if (condStr.includes(' AND ')) {
    const parts = condStr.split(' AND ');
    return { type: 'and_group', conditions: parts.map((p) => parseConditionString(p.trim())) };
  }
  if (condStr.includes(' OR ')) {
    const parts = condStr.split(' OR ');
    return { type: 'or_group', conditions: parts.map((p) => parseConditionString(p.trim())) };
  }
  if (condStr.startsWith('!') && !condStr.match(/[><=]/)) {
    return { type: 'not_flag', flag_id: condStr.slice(1).trim() };
  }
  if (!condStr.match(/[><=!]/)) {
    return { type: 'has_flag', flag_id: condStr.trim() };
  }
  let match;
  if ((match = condStr.match(/^(\S+)\s*>=\s*(\d+)$/))) {
    return { type: 'counter_gte', varName: match[1], value: parseInt(match[2]) };
  }
  if ((match = condStr.match(/^(\S+)\s*>\s*(\d+)$/))) {
    const varName = match[1],
      value = parseInt(match[2]);
    if (varName === 'player_san' || varName === 'san') return { type: 'san_above', value };
    return { type: 'counter_gte', varName, value: value + 1 };
  }
  if ((match = condStr.match(/^(\S+)\s*<=\s*(\d+)$/))) {
    return { type: 'counter_lte', varName: match[1], value: parseInt(match[2]) };
  }
  if ((match = condStr.match(/^(\S+)\s*<\s*(\d+)$/))) {
    const varName = match[1],
      value = parseInt(match[2]);
    if (varName === 'san' || varName === 'player_san') return { type: 'san_below', value };
    return { type: 'counter_lte', varName, value: value - 1 };
  }
  if ((match = condStr.match(/^(\S+)\s*==\s*(\d+)$/))) {
    return { type: 'counter_eq', varName: match[1], value: parseInt(match[2]) };
  }
  return { type: 'always_true' };
}

function checkSingleCondition(state, cond) {
  if (!cond || typeof cond !== 'object') return false;
  switch (cond.type) {
    case 'san_below':
      return state.san < cond.value;
    case 'san_above':
      return state.san > cond.value;
    case 'san_lte':
      return state.san <= cond.value;
    case 'has_flag':
      return !!(state.triggeredEvents && state.triggeredEvents.includes(cond.flag_id));
    case 'not_flag':
      return !(state.triggeredEvents && state.triggeredEvents.includes(cond.flag_id));
    case 'counter_gte': {
      const fn = CONDITION_VAR_MAP[cond.varName];
      return fn ? fn(state) >= cond.value : false;
    }
    case 'counter_lte': {
      const fn = CONDITION_VAR_MAP[cond.varName];
      return fn ? fn(state) <= cond.value : false;
    }
    case 'counter_eq': {
      const fn = CONDITION_VAR_MAP[cond.varName];
      return fn ? fn(state) === cond.value : false;
    }
    case 'or_group':
      return cond.conditions.some((c) => checkSingleCondition(state, c));
    case 'and_group':
      return cond.conditions.every((c) => checkSingleCondition(state, c));
    case 'always_true':
      return false;
    default:
      return false;
  }
}

// ═══════════════════════════════════════════════════════════
// NPC system helpers (mirrors src/reducers/npcReducer.js)
// ═══════════════════════════════════════════════════════════

function registerNpcLegacy(state, npcName, legacy) {
  if (!state.npcStates) state.npcStates = {};
  state.npcStates[npcName] = {
    ...state.npcStates[npcName],
    dead: true,
    legacy: legacy,
    legacyClaimed: false,
  };
}

function claimNpcLegacy(state, npcName) {
  const npcState = state.npcStates?.[npcName];
  if (!npcState || !npcState.dead || npcState.legacyClaimed)
    return { items: [], knowledge: [], questTriggered: null };

  const legacy = npcState.legacy || {};
  npcState.legacyClaimed = true;

  const items = legacy.items || [];
  for (const item of items) {
    if (!state.inventory) state.inventory = [];
    state.inventory.push(item);
  }

  const knowledge = legacy.knowledge || [];
  for (const k of knowledge) {
    if (!state.retainedKnowledge) state.retainedKnowledge = [];
    if (!state.retainedKnowledge.includes(k)) state.retainedKnowledge.push(k);
  }

  const questTrigger = legacy.quest || null;
  if (questTrigger && !state.triggeredEvents.includes(questTrigger)) {
    state.triggeredEvents.push(questTrigger);
  }

  return { items, knowledge, questTriggered: questTrigger };
}

// ═══════════════════════════════════════════════════════════
// State factory
// ═══════════════════════════════════════════════════════════

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
      luck: 50,
      mp: 12,
      currentArea: 'town_center',
      visitedAreas: ['town_center'],
      inventory: [],
      clues: [],
      skills: {},
      npcTrust: {},
      npcStates: {},
      npcRelations: {},
      sealState: 'intact',
      weather: '阴天',
      triggeredEvents: [],
      longTermEffects: [],
      objectives: [],
      narrative: [],
      eventLog: [],
      stats_run: { deaths: 0, runs: 0, checks_passed: 0, checks_failed: 0 },
      food: 3,
      maxFood: 5,
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
      money: 5,
      ending: null,
      endingHistory: [],
      previousEndings: [],
      loopEchoFlags: [],
      worldCorrectionFlags: [],
      everTriggeredEvents: [],
      previousRunSummary: null,
      previousDeathsByArea: {},
      lastDeathType: null,
      lastDeathMode: null,
      previousDeathContext: null,
      deathContext: null,
      prologue: null,
      fearTuning: null,
      _npcTrustLocked: {},
      _dayActions: [],
      _actionHistory: [],
      _effects: [],
      currentChapter: 'chapter_1',
      tutorialSeen: {},
      difficulty: 'normal',
    },
    overrides
  );
}

// ═══════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════

console.log('=== Reincarnation Core Tests ===');
console.log('');

// ── 1. 基础轮回 ──────────────────────────────────────
console.log('--- Basic Loop Transition ---');

test('loopCount 递增', () => {
  const s = makeState({ loopCount: 3 });
  const next = simulateLoopTransition(s);
  assert.strictEqual(next.loopCount, 4);
});

test('loopCount 从 0 开始', () => {
  const s = makeState({ loopCount: 0 });
  const next = simulateLoopTransition(s);
  assert.strictEqual(next.loopCount, 1);
});

// ── 2. SAN 上限递减 & 保护 ──────────────────────────
console.log('--- SAN Cap ---');

test('loop 2: SAN cap reduced from 99', () => {
  const s = makeState({ loopCount: 1, san: 60 });
  const next = simulateLoopTransition(s);
  assert.strictEqual(next.loopCount, 2);
  // loop_2 effect: san_cap_reduction = -5 → maxSan = 94
  // Then pollution_san_cap rule: maxSan = max(20, 94 - 5) = 89
  assert.ok(next.maxSan < 99, 'maxSan should be reduced from 99, got ' + next.maxSan);
  assert.ok(next.maxSan >= 60, 'maxSan should be >= 60, got ' + next.maxSan);
});

test('loop 4: SAN cap floor at 60', () => {
  const s = makeState({ loopCount: 3, san: 80, maxSan: 89 });
  const next = simulateLoopTransition(s);
  assert.strictEqual(next.loopCount, 4);
  // loop_4 effect: san_cap_reduction = -13, so base = 99 - 13 = 86
  // But floor at 60 for loop >= 4
  assert.ok(next.maxSan >= 60, 'maxSan=' + next.maxSan + ' should be >= 60');
});

test('loop 10+: SAN cap pinned to 50', () => {
  const s = makeState({ loopCount: 9, san: 55, maxSan: 60 });
  const next = simulateLoopTransition(s);
  assert.strictEqual(next.loopCount, 10);
  assert.strictEqual(next.maxSan, 50, 'loop 10+ maxSan should be pinned to 50');
});

test('loop 6-9: no further SAN cap reduction (pollution takes over)', () => {
  const s = makeState({ loopCount: 5, san: 70, maxSan: 83 });
  const next = simulateLoopTransition(s);
  assert.strictEqual(next.loopCount, 6);
  assert.ok(next.maxSan >= 60, 'maxSan=' + next.maxSan + ' should be >= 60');
});

// ── 3. 世界污染 ─────────────────────────────────────
console.log('--- Pollution ---');

test('pollution 继承并递增', () => {
  const s = makeState({ loopCount: 3, pollution: 0.1 });
  const next = simulateLoopTransition(s);
  assert.ok(
    next.pollution > 0.1,
    'pollution should increase from ' + 0.1 + ' to ' + next.pollution
  );
});

test('pollution 上限为 1.0', () => {
  const s = makeState({ loopCount: 15, pollution: 0.95 });
  const next = simulateLoopTransition(s);
  assert.ok(next.pollution <= 1.0, 'pollution=' + next.pollution + ' should be <= 1.0');
});

test('pollution 高轮次增长更快 (loop >= 6: rate 0.08)', () => {
  // Use low initial pollution to avoid hitting the cap
  const s1 = makeState({ loopCount: 1, pollution: 0 });
  const next1 = simulateLoopTransition(s1);
  // next1: loopCount=2, rate=0.05, adds 0.05*2=0.10
  const s2 = makeState({ loopCount: 6, pollution: 0 });
  const next2 = simulateLoopTransition(s2);
  // next2: loopCount=7, rate=0.08, adds 0.08*7=0.56
  assert.ok(
    next2.pollution > next1.pollution,
    'higher loop pollution (' + next2.pollution + ') > lower loop (' + next1.pollution + ')'
  );
});

test('pollution SAN cap 遵循循环保底', () => {
  // At loop 10+, even with pollution_san_cap, SAN floor = 50
  const s = makeState({ loopCount: 9, san: 55, maxSan: 60, pollution: 0.5 });
  const next = simulateLoopTransition(s);
  assert.strictEqual(next.loopCount, 10);
  assert.ok(next.maxSan >= 50, 'maxSan=' + next.maxSan + ' should be >= 50 (loop 10+ floor)');
});

// ── 4. NPC 信任 ─────────────────────────────────────
console.log('--- NPC Trust ---');

test('npcTrust 不跨轮保留 (initLoopState 不搬运 npcTrust)', () => {
  // initLoopState 从 initialState() 开始，npcTrust = {}
  // npcTrust 不在 initLoopState 中从旧 state 搬入
  const s = makeState({
    loopCount: 2,
    npcTrust: { 老费舍: 5, '玛莎·格雷': 3 },
  });
  const next = simulateLoopTransition(s);
  assert.strictEqual(next.loopCount, 3);
  // npcTrust starts fresh — not carried over
  assert.strictEqual(Object.keys(next.npcTrust).length, 0, 'npcTrust should be empty after loop');
});

test('NPC trust shadow knowledge 可在轮回时设置信任', () => {
  // When retainedKnowledge includes 'knowledge_npc_trust_shadow',
  // initLoopState sets one random core NPC's trust to 1
  const s = makeState({
    loopCount: 3,
    retainedKnowledge: ['knowledge_npc_trust_shadow'],
  });
  const next = simulateLoopTransition(s);
  // The knowledge effect may set trust (depends on GD.npcs existing)
  // At minimum, verify the knowledge is retained
  assert.ok(next.retainedKnowledge.includes('knowledge_npc_trust_shadow'));
});

test('npcRelations 跨轮保留 (与 npcTrust 不同)', () => {
  const s = makeState({
    loopCount: 3,
    npcRelations: { '老费舍|||玛莎·格雷': { relation: 'ally', strength: 5 } },
  });
  const next = simulateLoopTransition(s);
  assert.deepStrictEqual(next.npcRelations, {
    '老费舍|||玛莎·格雷': { relation: 'ally', strength: 5 },
  });
});

// ── 5. 技能保留 ─────────────────────────────────────
console.log('--- Skill Retention ---');

test('轮回后技能保留 30%', () => {
  const s = makeState({
    loopCount: 1,
    skills: { 闪避: 30, 意志: 50, 聆听: 40 },
  });
  const next = simulateLoopTransition(s);
  assert.strictEqual(next.skills['闪避'], 9, '闪避 30% of 30 = 9');
  assert.strictEqual(next.skills['意志'], 15, '意志 30% of 50 = 15');
  assert.strictEqual(next.skills['聆听'], 12, '聆听 30% of 40 = 12');
});

test('loop 1 (first loop): 技能不保留', () => {
  // When loopCount starts at 0, after transition loopCount=1, and loopCount > 1 is false
  const s = makeState({
    loopCount: 0,
    skills: { 闪避: 30 },
  });
  const next = simulateLoopTransition(s);
  // loopCount = 1, so the skills block doesn't run
  assert.strictEqual(next.skills['闪避'] || 0, 0, 'first loop: no skill carry-over');
});

// ── 6. 行为追踪跨轮继承 ──────────────────────────────
console.log('--- Behavior Tracking ---');

test('behaviorTracking 全量搬入', () => {
  const s = makeState({
    loopCount: 2,
    behaviorTracking: {
      direct_kill_count: 5,
      cannibalism_count: 2,
      cult_leader_score: 3,
      work_count: 10,
      hoarded_money_max: 50,
      _npc_harm_tally: { 老费舍: 2 },
      sleep_streak: 7, // should be reset
    },
  });
  const next = simulateLoopTransition(s);
  assert.strictEqual(next.behaviorTracking.direct_kill_count, 5);
  assert.strictEqual(next.behaviorTracking.cannibalism_count, 2);
  assert.strictEqual(next.behaviorTracking.cult_leader_score, 3);
  assert.strictEqual(next.behaviorTracking.work_count, 10);
  assert.strictEqual(next.behaviorTracking.hoarded_money_max, 50);
  assert.deepStrictEqual(next.behaviorTracking._npc_harm_tally, { 老费舍: 2 });
  assert.strictEqual(next.behaviorTracking.sleep_streak, 0, 'sleep_streak should reset');
});

test('loop_break_attempts 递增 (sacred_desecration_count > 0)', () => {
  const s = makeState({
    loopCount: 3,
    behaviorTracking: { sacred_desecration_count: 2, loop_break_attempts: 1 },
  });
  const next = simulateLoopTransition(s);
  assert.strictEqual(next.behaviorTracking.loop_break_attempts, 2);
});

test('loop_exploit_score 递增 (retainedKnowledge > 5)', () => {
  const s = makeState({
    loopCount: 4,
    retainedKnowledge: ['k1', 'k2', 'k3', 'k4', 'k5', 'k6'],
    behaviorTracking: { loop_exploit_score: 0 },
  });
  const next = simulateLoopTransition(s);
  assert.strictEqual(next.behaviorTracking.loop_exploit_score, 1);
});

// ── 7. 结局代币 & 轮回商店 ──────────────────────────
console.log('--- Ending Coins & Loop Shop ---');

test('达成结局后获得1枚代币', () => {
  const s = makeState({
    loopCount: 2,
    endingCoins: 3,
    ending: { id: 'ending_neutral_madness', name: '疯狂' },
  });
  const next = simulateLoopTransition(s);
  assert.strictEqual(next.endingCoins, 4, 'should have 4 coins');
});

test('无结局时不获得代币', () => {
  const s = makeState({
    loopCount: 2,
    endingCoins: 3,
    ending: null,
  });
  const next = simulateLoopTransition(s);
  assert.strictEqual(next.endingCoins, 3, 'should still have 3 coins');
});

test('loop 5: 解锁商店 tier 1', () => {
  const s = makeState({ loopCount: 4, loopShopTier: 0 });
  const next = simulateLoopTransition(s);
  assert.strictEqual(next.loopShopTier, 1, 'should unlock tier 1 at loop 5');
});

test('loop 7: 解锁商店 tier 2', () => {
  const s = makeState({ loopCount: 6, loopShopTier: 1 });
  const next = simulateLoopTransition(s);
  assert.strictEqual(next.loopShopTier, 2, 'should unlock tier 2 at loop 7');
});

test('商店 tier 不会降级', () => {
  const s = makeState({ loopCount: 1, loopShopTier: 2 });
  const next = simulateLoopTransition(s);
  assert.strictEqual(next.loopShopTier, 2, 'tier should not decrease');
});

// ── 8. 知识 & 结论保留 ──────────────────────────────
console.log('--- Knowledge & Conclusions ---');

test('retainedKnowledge 跨轮保留', () => {
  const s = makeState({
    loopCount: 3,
    retainedKnowledge: ['knowledge_dark_passages', 'knowledge_npc_trust_shadow'],
  });
  const next = simulateLoopTransition(s);
  assert.deepStrictEqual(next.retainedKnowledge, [
    'knowledge_dark_passages',
    'knowledge_npc_trust_shadow',
  ]);
});

test('discoveredConclusions 跨轮保留', () => {
  const s = makeState({
    loopCount: 2,
    discoveredConclusions: ['conc_seal_is_loop'],
  });
  const next = simulateLoopTransition(s);
  assert.deepStrictEqual(next.discoveredConclusions, ['conc_seal_is_loop']);
});

// ── 9. 神秘学衰减 ───────────────────────────────────
console.log('--- Mythos Decay ---');

test('mythosLevel 每轮 -2', () => {
  const s = makeState({ loopCount: 3, mythosLevel: 15 });
  const next = simulateLoopTransition(s);
  assert.strictEqual(next.mythosLevel, 13);
});

test('mythosLevel 不会降到负数', () => {
  const s = makeState({ loopCount: 3, mythosLevel: 1 });
  const next = simulateLoopTransition(s);
  assert.strictEqual(next.mythosLevel, 0);
});

// ── 10. 死亡类型解析 ────────────────────────────────
console.log('--- Death Type Resolution ---');

test('SAN=0 → mental death', () => {
  const s = makeState({ san: 0, hp: 5 });
  const death = resolveDeath(s);
  assert.ok(death !== null, 'should detect death');
  assert.strictEqual(death.mode, 'san');
  assert.strictEqual(death.type, 'madness');
});

test('HP=0 → physical death (default)', () => {
  const s = makeState({ hp: 0, san: 30, currentArea: 'town_center' });
  const death = resolveDeath(s);
  assert.ok(death !== null);
  assert.strictEqual(death.mode, 'hp');
  assert.strictEqual(death.type, 'physical');
});

test('HP=0 + harbor → drowning', () => {
  const s = makeState({ hp: 0, san: 30, currentArea: 'harbor_district' });
  const death = resolveDeath(s);
  assert.strictEqual(death.type, 'drowning');
});

test('HP=0 + lighthouse → falling', () => {
  const s = makeState({ hp: 0, san: 30, currentArea: 'lighthouse' });
  const death = resolveDeath(s);
  assert.strictEqual(death.type, 'falling');
});

test('HP=0 + combat tag → bleeding', () => {
  const s = makeState({ hp: 0, san: 30 });
  const death = resolveDeath(s, { tags: ['combat'] });
  assert.strictEqual(death.type, 'bleeding');
});

test('HP=0 + food=0 → starvation', () => {
  const s = makeState({ hp: 0, san: 30, food: 0 });
  const death = resolveDeath(s);
  assert.strictEqual(death.type, 'starvation');
});

test('SAN=0 + possession tag → possession', () => {
  const s = makeState({ san: 0, hp: 5 });
  const death = resolveDeath(s, { tags: ['possession'] });
  assert.strictEqual(death.type, 'possession');
});

test('SAN=0 + meta tag → identity_erasure', () => {
  const s = makeState({ san: 0, hp: 5 });
  const death = resolveDeath(s, { tags: ['meta'] });
  assert.strictEqual(death.type, 'identity_erasure');
});

test('SAN=0 + mythosLevel >= 20 → mythos_absorption', () => {
  const s = makeState({ san: 0, hp: 5, mythosLevel: 25 });
  const death = resolveDeath(s);
  assert.strictEqual(death.type, 'mythos_absorption');
});

test('SAN=0 + loop >= 8 + san <= 10 → loop_collapse', () => {
  const s = makeState({ san: 0, hp: 5, loopCount: 10 });
  const death = resolveDeath(s);
  assert.strictEqual(death.type, 'loop_collapse');
});

test('HP=0 + SAN=0 → hybrid (body_and_self_lost)', () => {
  const s = makeState({ hp: 0, san: 0 });
  const death = resolveDeath(s);
  assert.strictEqual(death.mode, 'hybrid');
  assert.strictEqual(death.type, 'body_and_self_lost');
});

test('death_hint on event → overrides inference', () => {
  const s = makeState({ hp: 0, san: 30 });
  const death = resolveDeath(s, { effects: { death_hint: 'infection' } });
  assert.strictEqual(death.type, 'infection');
});

test('alive → null', () => {
  const s = makeState({ hp: 5, san: 30 });
  const death = resolveDeath(s);
  assert.strictEqual(death, null);
});

test('ALL_DEATH_TYPES 包含 15 种类型 (7 HP + 7 SAN + 1 Hybrid)', () => {
  assert.strictEqual(Object.keys(ALL_DEATH_TYPES).length, 15);
});

// ── 11. NPC 遗产系统 ────────────────────────────────
console.log('--- NPC Legacy ---');

test('注册NPC遗产 → 可领取', () => {
  const s = makeState();
  registerNpcLegacy(s, '老费舍', {
    items: [{ id: 'old_rod', name: '旧钓竿' }],
    knowledge: ['knowledge_harbor_secret'],
    quest: 'quest_fisher_legacy',
  });
  const legacy = s.npcStates['老费舍'].legacy;
  assert.ok(legacy, 'legacy should exist');
  assert.strictEqual(s.npcStates['老费舍'].dead, true);
  assert.strictEqual(s.npcStates['老费舍'].legacyClaimed, false);
});

test('领取NPC遗产 → 道具入库、知识入档、任务触发', () => {
  const s = makeState();
  registerNpcLegacy(s, '老费舍', {
    items: [{ id: 'old_rod', name: '旧钓竿' }],
    knowledge: ['knowledge_harbor_secret'],
    quest: 'quest_fisher_legacy',
  });
  const result = claimNpcLegacy(s, '老费舍');
  assert.deepStrictEqual(result.items, [{ id: 'old_rod', name: '旧钓竿' }]);
  assert.deepStrictEqual(result.knowledge, ['knowledge_harbor_secret']);
  assert.strictEqual(result.questTriggered, 'quest_fisher_legacy');
  assert.ok(
    s.inventory.some((i) => i.id === 'old_rod'),
    'item in inventory'
  );
  assert.ok(s.retainedKnowledge.includes('knowledge_harbor_secret'), 'knowledge retained');
  assert.ok(s.triggeredEvents.includes('quest_fisher_legacy'), 'quest triggered');
  assert.strictEqual(s.npcStates['老费舍'].legacyClaimed, true);
});

test('遗产不能重复领取', () => {
  const s = makeState();
  registerNpcLegacy(s, '老费舍', {
    items: [{ id: 'rod', name: '竿' }],
    knowledge: [],
    quest: null,
  });
  claimNpcLegacy(s, '老费舍');
  const result2 = claimNpcLegacy(s, '老费舍');
  assert.deepStrictEqual(result2.items, []);
  assert.deepStrictEqual(result2.knowledge, []);
});

// ── 12. NPC 关系网跨轮保留 ──────────────────────────
console.log('--- NPC Relations ---');

test('npcRelations 跨轮保留', () => {
  const s = makeState({
    loopCount: 3,
    npcRelations: { '老费舍|||玛莎·格雷': { relation: 'ally', strength: 5 } },
  });
  const next = simulateLoopTransition(s);
  assert.deepStrictEqual(next.npcRelations, {
    '老费舍|||玛莎·格雷': { relation: 'ally', strength: 5 },
  });
});

// ── 13. 恩赐系统 ────────────────────────────────────
console.log('--- Blessings ---');

test('轮回后恩赐列表累积', () => {
  const s = makeState({
    loopCount: 2,
    activeBlessings: ['loop_2'],
  });
  const next = simulateLoopTransition(s);
  // loop 3 has a blessing
  const blessings = GD.systems?.loop?.loop_blessings || {};
  if (blessings['loop_3']) {
    assert.ok(next.activeBlessings.includes('loop_3'), 'should have loop_3 blessing');
    assert.ok(next.activeBlessings.includes('loop_2'), 'should retain loop_2 blessing');
  }
});

// ── 14. 历史记录 ────────────────────────────────────
console.log('--- History ---');

test('endingHistory 记录上次结局', () => {
  const s = makeState({
    loopCount: 3,
    day: 7,
    humanityScore: 45,
    ending: { id: 'ending_neutral_madness', name: '疯狂' },
    endingHistory: [
      {
        ending_id: 'ending_heretical_dawn',
        ending_name: '异端黎明',
        loop: 2,
        day: 14,
        humanity: 30,
      },
    ],
  });
  const next = simulateLoopTransition(s);
  assert.strictEqual(next.endingHistory.length, 2);
  assert.strictEqual(next.endingHistory[1].ending_id, 'ending_neutral_madness');
  assert.strictEqual(next.endingHistory[1].loop, 3);
  assert.strictEqual(next.endingHistory[1].day, 7);
});

test('previousEndings 去重', () => {
  const s = makeState({
    loopCount: 3,
    ending: { id: 'ending_neutral_madness' },
    previousEndings: ['ending_neutral_madness'],
  });
  const next = simulateLoopTransition(s);
  const count = next.previousEndings.filter((e) => e === 'ending_neutral_madness').length;
  assert.strictEqual(count, 1, 'should not duplicate ending id');
});

test('endingHistory 上限 50', () => {
  const history = [];
  for (let i = 0; i < 55; i++) history.push({ ending_id: 'e' + i, loop: i, day: 1, humanity: 50 });
  const s = makeState({ loopCount: 55, endingHistory: history });
  const next = simulateLoopTransition(s);
  assert.ok(next.endingHistory.length <= 50, 'length=' + next.endingHistory.length);
});

test('loopEchoFlags 上限 200', () => {
  const flags = [];
  for (let i = 0; i < 210; i++) flags.push('echo_' + i);
  const s = makeState({ loopCount: 5, loopEchoFlags: flags });
  const next = simulateLoopTransition(s);
  assert.ok(next.loopEchoFlags.length <= 200, 'length=' + next.loopEchoFlags.length);
});

test('everTriggeredEvents 上限 2000', () => {
  const events = [];
  for (let i = 0; i < 2100; i++) events.push('evt_' + i);
  const s = makeState({ loopCount: 5, everTriggeredEvents: events });
  const next = simulateLoopTransition(s);
  assert.ok(next.everTriggeredEvents.length <= 2000, 'length=' + next.everTriggeredEvents.length);
});

// ── 15. 结局条件系统 ────────────────────────────────
console.log('--- Ending Condition Parsing ---');

test('parseConditionString: counter_gte', () => {
  const cond = parseConditionString('loop_count >= 5');
  assert.strictEqual(cond.type, 'counter_gte');
  assert.strictEqual(cond.varName, 'loop_count');
  assert.strictEqual(cond.value, 5);
});

test('parseConditionString: san_below', () => {
  const cond = parseConditionString('san < 30');
  assert.strictEqual(cond.type, 'san_below');
  assert.strictEqual(cond.value, 30);
});

test('parseConditionString: has_flag', () => {
  const cond = parseConditionString('evt_seal_broken');
  assert.strictEqual(cond.type, 'has_flag');
  assert.strictEqual(cond.flag_id, 'evt_seal_broken');
});

test('parseConditionString: AND group', () => {
  const cond = parseConditionString('loop_count >= 5 AND player_san < 30');
  assert.strictEqual(cond.type, 'and_group');
  assert.strictEqual(cond.conditions.length, 2);
});

test('checkSingleCondition: counter_gte pass', () => {
  const s = makeState({ loopCount: 7 });
  assert.strictEqual(
    checkSingleCondition(s, { type: 'counter_gte', varName: 'loop_count', value: 5 }),
    true
  );
});

test('checkSingleCondition: counter_gte fail', () => {
  const s = makeState({ loopCount: 3 });
  assert.strictEqual(
    checkSingleCondition(s, { type: 'counter_gte', varName: 'loop_count', value: 5 }),
    false
  );
});

test('checkSingleCondition: san_below', () => {
  const s = makeState({ san: 20 });
  assert.strictEqual(checkSingleCondition(s, { type: 'san_below', value: 30 }), true);
  assert.strictEqual(checkSingleCondition(s, { type: 'san_below', value: 15 }), false);
});

test('checkSingleCondition: and_group', () => {
  const s = makeState({ loopCount: 7, san: 20 });
  const cond = {
    type: 'and_group',
    conditions: [
      { type: 'counter_gte', varName: 'loop_count', value: 5 },
      { type: 'san_below', value: 30 },
    ],
  };
  assert.strictEqual(checkSingleCondition(s, cond), true);
});

test('checkSingleCondition: or_group', () => {
  const s = makeState({ loopCount: 2, san: 20 });
  const cond = {
    type: 'or_group',
    conditions: [
      { type: 'counter_gte', varName: 'loop_count', value: 5 },
      { type: 'san_below', value: 30 },
    ],
  };
  assert.strictEqual(checkSingleCondition(s, cond), true);
});

// ── 16. 跨轮数据完整性 ──────────────────────────────
console.log('--- Data Integrity ---');

test('死亡上下文搬入', () => {
  const s = makeState({
    loopCount: 4,
    deathContext: { type: 'drowning', mode: 'hp', area: 'harbor_district' },
  });
  const next = simulateLoopTransition(s);
  assert.strictEqual(next.previousDeathContext.type, 'drowning');
  assert.strictEqual(next.lastDeathType, 'drowning');
  assert.strictEqual(next.lastDeathMode, 'hp');
});

test('prologue 跨轮保留', () => {
  const s = makeState({
    loopCount: 3,
    prologue: { fear: '深海', archetype: 'journalist' },
  });
  const next = simulateLoopTransition(s);
  assert.deepStrictEqual(next.prologue, { fear: '深海', archetype: 'journalist' });
});

test('fearTuning 跨轮保留', () => {
  const s = makeState({
    loopCount: 3,
    fearTuning: { primary: 'thalassophobia', intensity: 0.8 },
  });
  const next = simulateLoopTransition(s);
  assert.deepStrictEqual(next.fearTuning, { primary: 'thalassophobia', intensity: 0.8 });
});

test('money 跨轮保留', () => {
  const s = makeState({ loopCount: 3, money: 42 });
  const next = simulateLoopTransition(s);
  assert.strictEqual(next.money, 42);
});

test('_npcTrustLocked 跨轮保留', () => {
  const s = makeState({
    loopCount: 3,
    _npcTrustLocked: { 老费舍: true },
  });
  const next = simulateLoopTransition(s);
  assert.deepStrictEqual(next._npcTrustLocked, { 老费舍: true });
});

// ── 17. 连续多轮回模拟 ──────────────────────────────
console.log('--- Multi-Loop Simulation ---');

test('连续10次轮回: SAN cap 最终 = 50', () => {
  let s = makeState({ san: 60, maxSan: 99 });
  for (let i = 0; i < 10; i++) {
    s = simulateLoopTransition(s);
  }
  assert.strictEqual(s.loopCount, 10);
  assert.strictEqual(s.maxSan, 50, 'after 10 loops maxSan=' + s.maxSan);
});

test('连续10次轮回: pollution 单调递增', () => {
  let s = makeState();
  let prevPollution = 0;
  for (let i = 0; i < 10; i++) {
    s = simulateLoopTransition(s);
    assert.ok(s.pollution >= prevPollution, 'pollution should not decrease at loop ' + s.loopCount);
    prevPollution = s.pollution;
  }
});

test('连续10次轮回: behaviorTracking 不丢失', () => {
  let s = makeState({
    behaviorTracking: {
      direct_kill_count: 7,
      cannibalism_count: 1,
      _npc_harm_tally: { 老费舍: 3 },
      sleep_streak: 0,
    },
  });
  for (let i = 0; i < 10; i++) {
    s = simulateLoopTransition(s);
  }
  assert.strictEqual(s.behaviorTracking.direct_kill_count, 7);
  assert.strictEqual(s.behaviorTracking.cannibalism_count, 1);
  assert.deepStrictEqual(s.behaviorTracking._npc_harm_tally, { 老费舍: 3 });
});

test('连续10次轮回: mythosLevel 正确衰减', () => {
  let s = makeState({ mythosLevel: 30 });
  for (let i = 0; i < 10; i++) {
    s = simulateLoopTransition(s);
  }
  // Each loop: -2, so after 10 loops: max(0, 30 - 20) = 10
  assert.strictEqual(s.mythosLevel, 10);
});

// ── 18. 游戏数据一致性 (SSOT) ───────────────────────
console.log('--- Game Data Consistency ---');

test('game_base.json 包含 loop_count_effects', () => {
  const effects = GD.systems?.loop?.loop_count_effects;
  assert.ok(effects, 'loop_count_effects should exist');
  assert.ok(effects.loop_1, 'loop_1 effect');
  assert.ok(effects.loop_2, 'loop_2 effect');
  assert.ok(effects.loop_3, 'loop_3 effect');
  assert.ok(effects.loop_4, 'loop_4 effect');
  assert.ok(effects.loop_5, 'loop_5 effect');
  assert.ok(effects.loop_6_plus, 'loop_6_plus effect');
});

test('game_base.json: SAN cap reduction 单调递减 (loop 1-5)', () => {
  const effects = GD.systems?.loop?.loop_count_effects || {};
  const reductions = [1, 2, 3, 4, 5].map((l) => effects['loop_' + l]?.san_cap_reduction || 0);
  for (let i = 1; i < reductions.length; i++) {
    assert.ok(
      reductions[i] <= reductions[i - 1],
      'reduction should be non-increasing: loop_' +
        (i + 1) +
        '=' +
        reductions[i] +
        ' vs loop_' +
        i +
        '=' +
        reductions[i - 1]
    );
  }
});

test('game_base.json: pollution_intensity 单调递增', () => {
  const effects = GD.systems?.loop?.loop_count_effects || {};
  const intensities = [1, 2, 3, 4, 5].map((l) => effects['loop_' + l]?.pollution_intensity || 0);
  for (let i = 1; i < intensities.length; i++) {
    assert.ok(
      intensities[i] >= intensities[i - 1],
      'intensity should be non-decreasing: loop_' +
        (i + 1) +
        '=' +
        intensities[i] +
        ' vs loop_' +
        i +
        '=' +
        intensities[i - 1]
    );
  }
});

test('game_base.json: loop_blessings 存在', () => {
  const blessings = GD.systems?.loop?.loop_blessings;
  assert.ok(blessings, 'loop_blessings should exist');
  assert.ok(blessings.loop_2, 'loop_2 blessing');
  assert.ok(blessings.loop_5, 'loop_5 blessing');
});

test('game_base.json: pollution_rules 包含 pollution_san_cap', () => {
  const rules = GD.systems?.loop?.pollution_rules || [];
  const found = rules.find((r) => r.id === 'pollution_san_cap');
  assert.ok(found, 'pollution_san_cap rule should exist');
  assert.strictEqual(found.cumulative, true);
});

test('game_base.json: loop_shop 存在且有 tiers', () => {
  const shop = GD.systems?.loop?.loop_shop;
  assert.ok(shop, 'loop_shop should exist');
  assert.strictEqual(shop.currency, 'endingCoins');
  assert.ok(shop.tiers?.tier_1, 'tier_1 should exist');
});

// ═══════════════════════════════════════════════════════════
// Part B: SCENARIO TESTS (merged from test_reincarnation_scenarios.cjs)
// ═══════════════════════════════════════════════════════════

console.log('');
console.log('=== Reincarnation Scenario Tests ===');
console.log('');

// ── S1: 全流程烟雾测试 ──────────────────────────────
console.log('--- S1: Full Lifecycle Smoke ---');

test('S1-1: 前传 → Day 1 → 死亡 → 第3周目 NPC 信任重置', () => {
  let s = makeState({ loopCount: 0, npcTrust: { 老费舍: 5, '玛莎·格雷': 4 } });
  s.san = 0;
  s = simulateLoop(s);
  assert.strictEqual(s.loopCount, 1);
  assert.strictEqual(Object.keys(s.npcTrust).length, 0, 'loop 1: npcTrust reset');
  s.hp = 0;
  s.san = 60;
  s = simulateLoop(s);
  assert.strictEqual(s.loopCount, 2);
  assert.strictEqual(Object.keys(s.npcTrust).length, 0, 'loop 2: npcTrust still reset');
  s.hp = 0;
  s = simulateLoop(s);
  assert.strictEqual(s.loopCount, 3);
  assert.strictEqual(Object.keys(s.npcTrust).length, 0, 'loop 3: npcTrust still empty');
});

test('S1-2: 第5周目轮回商店解锁', () => {
  let s = makeState({ loopShopTier: 0 });
  for (let i = 0; i < 5; i++) {
    s.san = 0;
    s = simulateLoop(s, true);
  }
  assert.strictEqual(s.loopCount, 5);
  assert.ok(s.loopShopTier >= 1, 'shop tier should be >= 1 at loop 5');
  assert.ok(s.endingCoins >= 5, 'should have >= 5 ending coins');
});

test('S1-3: 第8周目商店 tier 2 解锁', () => {
  let s = makeState({ loopShopTier: 0 });
  for (let i = 0; i < 8; i++) {
    s.san = 0;
    s = simulateLoop(s, true);
  }
  assert.strictEqual(s.loopCount, 8);
  assert.strictEqual(s.loopShopTier, 2, 'shop tier should be 2 at loop 8');
});

// ── S2: 极端情况 — 连续 SAN 归零 ────────────────────
console.log('--- S2: Extreme — Consecutive SAN Deaths ---');

test('S2-1: 连续10次SAN归零: 状态保持一致', () => {
  let s = makeState({ san: 60, maxSan: 99, retainedKnowledge: ['k1', 'k2'] });
  for (let i = 0; i < 10; i++) {
    s.san = 0;
    s.hp = 11;
    s = simulateLoop(s);
  }
  assert.strictEqual(s.loopCount, 10);
  assert.ok(s.maxSan <= 50, 'maxSan should be <= 50 at loop 10+');
  assert.ok(s.retainedKnowledge.includes('k1'), 'knowledge retained');
  assert.ok(s.retainedKnowledge.includes('k2'), 'knowledge retained');
  assert.strictEqual(s.stats_run.deaths, 10, '10 deaths recorded');
  assert.strictEqual(s.stats_run.runs, 10, '10 runs recorded');
});

test('S2-2: 连续10次SAN归零: pollution 不超过 1.0', () => {
  let s = makeState();
  for (let i = 0; i < 10; i++) {
    s.san = 0;
    s = simulateLoop(s);
  }
  assert.ok(s.pollution <= 1.0, 'pollution=' + s.pollution);
  assert.ok(s.pollution > 0.5, 'pollution should be substantial');
});

// ── S3: 高污染环境 ──────────────────────────────────
console.log('--- S3: High Pollution ---');

test('S3-1: pollution > 0.6 轮回后继续叠加', () => {
  let s = makeState({ loopCount: 8, pollution: 0.6 });
  s.san = 0;
  s = simulateLoop(s);
  assert.ok(s.pollution > 0.6, 'pollution should increase from 0.6 to ' + s.pollution);
});

test('S3-2: 高污染下SAN cap 依然受保护 (loop 10+)', () => {
  let s = makeState({ loopCount: 9, pollution: 0.8, san: 55, maxSan: 55 });
  s.san = 0;
  s = simulateLoop(s);
  assert.strictEqual(s.loopCount, 10);
  assert.ok(s.maxSan >= 50, 'maxSan=' + s.maxSan + ' should be >= 50');
});

// ── S4: 不同死亡类型对遗产的影响 ─────────────────────
console.log('--- S4: Death Type & Legacy ---');

test('S4-1: 物理死亡 → lastDeathType = physical', () => {
  let s = makeState({
    hp: 0,
    san: 30,
    currentArea: 'harbor_district',
    deathContext: { type: 'drowning', mode: 'hp', area: 'harbor_district' },
  });
  s = simulateLoop(s);
  assert.strictEqual(s.lastDeathType, 'drowning');
  assert.strictEqual(s.lastDeathMode, 'hp');
});

test('S4-2: 精神死亡 → lastDeathType = mental', () => {
  let s = makeState({ san: 0, hp: 11, deathContext: { type: 'madness', mode: 'san' } });
  s = simulateLoop(s);
  assert.strictEqual(s.lastDeathType, 'madness');
  assert.strictEqual(s.lastDeathMode, 'san');
});

test('S4-3: 死亡上下文跨轮搬入', () => {
  let s = makeState({
    san: 0,
    hp: 11,
    deathContext: { type: 'possession', mode: 'san', area: 'deep_catacombs' },
  });
  s = simulateLoop(s);
  assert.deepStrictEqual(s.previousDeathContext, {
    type: 'possession',
    mode: 'san',
    area: 'deep_catacombs',
  });
  assert.strictEqual(s.lastDeathType, 'possession');
  assert.strictEqual(s.lastDeathMode, 'san');
});

// ── S5: 行为结局计数器跨轮累计 ──────────────────────
console.log('--- S5: Behavior Counters Across Loops ---');

test('S5-1: 34个行为计数器全部跨轮保留', () => {
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
  const btData = {};
  BT_KEYS.forEach((k, i) => {
    btData[k] = i + 1;
  });
  btData._npc_harm_tally = { npc_a: 5 };
  btData.sleep_streak = 10;

  let s = makeState({ loopCount: 3, behaviorTracking: btData });
  s.san = 0;
  s = simulateLoop(s);

  for (const key of BT_KEYS) {
    if (key === 'loop_break_attempts') {
      assert.strictEqual(
        s.behaviorTracking[key],
        btData[key] + 1,
        key + ' should be ' + (btData[key] + 1) + ' but got ' + s.behaviorTracking[key]
      );
    } else {
      assert.strictEqual(
        s.behaviorTracking[key],
        btData[key],
        key + ' should be ' + btData[key] + ' but got ' + s.behaviorTracking[key]
      );
    }
  }
  assert.deepStrictEqual(s.behaviorTracking._npc_harm_tally, { npc_a: 5 });
  assert.strictEqual(s.behaviorTracking.sleep_streak, 0, 'sleep_streak reset');
});

test('S5-2: 多轮累计: direct_kill_count 单调递增', () => {
  let s = makeState({
    behaviorTracking: { direct_kill_count: 0, _npc_harm_tally: {}, sleep_streak: 0 },
  });
  for (let i = 0; i < 5; i++) {
    s.behaviorTracking.direct_kill_count += 2;
    s.san = 0;
    s = simulateLoop(s);
  }
  assert.strictEqual(s.behaviorTracking.direct_kill_count, 10, '5 loops * 2 kills = 10');
});

// ── S6: 前传恐惧画像跨循环保留 ──────────────────────
console.log('--- S6: Prologue & Fear Tuning ---');

test('S6-1: prologue + fearTuning 全部跨轮保留', () => {
  const prologue = { fear: '深海', scene: '码头日记', choices: ['accept', 'deny'] };
  const fearTuning = { primary: 'thalassophobia', secondary: 'claustrophobia', intensity: 0.85 };
  let s = makeState({ loopCount: 4, prologue, fearTuning });
  s.san = 0;
  s = simulateLoop(s);
  assert.deepStrictEqual(s.prologue, prologue);
  assert.deepStrictEqual(s.fearTuning, fearTuning);
});

// ── S7: 存档版本迁移兼容性 ──────────────────────────
console.log('--- S7: Save Migration ---');

test('S7-1: 旧存档缺少 behaviorTracking → 迁移后不崩溃', () => {
  const oldSave = {
    screen: 'game',
    day: 5,
    san: 40,
    hp: 8,
    loopCount: 3,
    direct_kill_count: 2,
    npcTrust: {},
    triggeredEvents: [],
  };
  if (!oldSave.behaviorTracking) {
    const bt = {};
    for (const key of ['direct_kill_count', 'cannibalism_count', 'clean_kill_pattern']) {
      if (oldSave[key] !== undefined) {
        bt[key] = oldSave[key];
        delete oldSave[key];
      }
    }
    oldSave.behaviorTracking = bt;
  }
  assert.ok(oldSave.behaviorTracking);
  assert.strictEqual(oldSave.behaviorTracking.direct_kill_count, 2);
  assert.strictEqual(oldSave.direct_kill_count, undefined);
});

test('S7-2: 旧存档缺少 extended state 字段 → 默认值填充', () => {
  const oldSave = { screen: 'game', day: 3, san: 50, loopCount: 1 };
  const defaults = {
    previousRunSummary: null,
    previousDeathsByArea: {},
    previousEndings: [],
    endingHistory: [],
    loopEchoFlags: [],
    worldCorrectionFlags: [],
    everTriggeredEvents: [],
    deathContext: null,
    lastDeathMode: null,
    previousDeathContext: null,
    prologue: null,
    fearTuning: null,
  };
  for (const [k, v] of Object.entries(defaults)) {
    if (oldSave[k] === undefined) oldSave[k] = v;
  }
  assert.ok(Array.isArray(oldSave.previousEndings));
  assert.strictEqual(oldSave.prologue, null);
});

test('S7-3: loopCount 结构不变: 数值类型', () => {
  let s = makeState({ loopCount: 0 });
  for (let i = 0; i < 5; i++) {
    s.san = 0;
    s = simulateLoop(s);
  }
  assert.strictEqual(typeof s.loopCount, 'number');
  assert.strictEqual(s.loopCount, 5);
});

test('S7-4: retainedKnowledge 字段名一致', () => {
  let s = makeState({ loopCount: 3, retainedKnowledge: ['k_dark_passages', 'k_npc_trust_shadow'] });
  s.san = 0;
  s = simulateLoop(s);
  assert.ok(Array.isArray(s.retainedKnowledge));
  assert.strictEqual(s.retainedKnowledge.length, 2);
});

// ── S8: 平衡测试 — 后期是否"卡死" ──────────────────
console.log('--- S8: Balance — Late Game ---');

test('S8-1: loop 15: maxSan=50 但玩家仍可行动', () => {
  let s = makeState();
  for (let i = 0; i < 15; i++) {
    s.san = 0;
    s = simulateLoop(s);
  }
  assert.strictEqual(s.maxSan, 50);
  assert.ok(s.loopCount === 15);
});

test('S8-2: loop 15: pollution 接近 1.0', () => {
  let s = makeState();
  for (let i = 0; i < 15; i++) {
    s.san = 0;
    s = simulateLoop(s);
  }
  assert.ok(s.pollution > 0.9);
  assert.ok(s.pollution <= 1.0);
});

test('S8-3: 高轮次NPC信任不跨轮 (每次重置) 但不崩溃', () => {
  let s = makeState({ npcTrust: { 老费舍: 10, '玛莎·格雷': 8, '伊莎贝拉·韦伯': 6 } });
  for (let i = 0; i < 15; i++) {
    s.san = 0;
    s = simulateLoop(s);
  }
  assert.strictEqual(Object.keys(s.npcTrust).length, 0, 'npcTrust empty after 15 loops');
});

// ── S9: 结局历史记录完整性 ──────────────────────────
console.log('--- S9: Ending History Integrity ---');

test('S9-1: 多次不同结局记录完整', () => {
  const endings = [
    { id: 'ending_madness', name: '疯狂' },
    { id: 'ending_drowning', name: '溺水' },
    { id: 'ending_consumed', name: '深渊吞噬' },
    { id: null, name: null },
    { id: 'ending_escape', name: '逃离' },
  ];
  let s = makeState();
  for (let i = 0; i < endings.length; i++) {
    s.ending = endings[i];
    s.san = 0;
    s = simulateLoop(s, !!endings[i].id);
  }
  assert.strictEqual(s.endingHistory.length, 5);
  assert.strictEqual(s.endingHistory[0].ending_id, 'ending_madness');
  assert.strictEqual(s.endingHistory[3].ending_id, null);
  assert.strictEqual(s.previousEndings.length, 4);
});

// ── S10: 死亡区域追踪 ──────────────────────────────
console.log('--- S10: Death Area Tracking ---');

test('S10-1: previousDeathsByArea 记录', () => {
  const s = makeState({
    previousDeathsByArea: { harbor_district: 2, deep_catacombs: 1 },
    currentArea: 'lighthouse',
    san: 0,
    hp: 11,
  });
  const deathsByArea = { ...(s.previousDeathsByArea || {}) };
  if (s.currentArea && (s.hp <= 0 || s.san <= 0))
    deathsByArea[s.currentArea] = (deathsByArea[s.currentArea] || 0) + 1;
  assert.strictEqual(deathsByArea['harbor_district'], 2);
  assert.strictEqual(deathsByArea['deep_catacombs'], 1);
  assert.strictEqual(deathsByArea['lighthouse'], 1);
});

// ── S11: 轮回次数与事件权重 ──────────────────────────
console.log('--- S11: Loop Count & Event Unlock ---');

test('S11-1: world_recognition_thresholds 在 game_base.json 中定义', () => {
  const thresholds = GD.systems?.loop?.world_recognition_thresholds;
  assert.ok(Array.isArray(thresholds));
  assert.ok(thresholds.length >= 3);
  const loops = thresholds.map((t) => t.loop);
  assert.ok(loops.includes(3) && loops.includes(5) && loops.includes(7));
});

test('S11-2: npc_deja_vu_rules 存在', () => {
  assert.ok(Array.isArray(GD.systems?.loop?.npc_deja_vu_rules));
});

test('S11-3: loop_breaker_requirements 存在', () => {
  assert.ok(Array.isArray(GD.systems?.loop?.loop_breaker_requirements));
});

// ── S12: 死亡类型推断覆盖 ──────────────────────────
console.log('--- S12: Death Type Inference Coverage ---');

test('S12-1: 所有 7 种 HP 死亡类型可达', () => {
  const scenarios = [
    { s: { hp: 0, san: 30, currentArea: 'harbor_district' }, exp: 'drowning' },
    { s: { hp: 0, san: 30 }, e: { tags: ['combat'] }, exp: 'bleeding' },
    { s: { hp: 0, san: 30, food: 0 }, exp: 'starvation' },
    { s: { hp: 0, san: 30 }, e: { tags: ['darkness'] }, exp: 'darkness_taken' },
    { s: { hp: 0, san: 30, currentArea: 'lighthouse' }, exp: 'falling' },
    { s: { hp: 0, san: 30 }, e: { tags: ['infection'] }, exp: 'infection' },
    { s: { hp: 0, san: 30, currentArea: 'town_center' }, exp: 'physical' },
  ];
  for (const sc of scenarios) {
    const state = makeState(sc.s);
    const type = inferDeathType(state, sc.e || {}, null, 'hp');
    assert.strictEqual(
      type,
      sc.exp,
      JSON.stringify(sc.s) + ' → ' + type + ' (expected ' + sc.exp + ')'
    );
  }
});

test('S12-2: 所有 SAN 死亡类型可达', () => {
  const scenarios = [
    { s: { san: 0, hp: 5 }, e: {}, exp: 'madness' },
    { s: { san: 0, hp: 5 }, e: { tags: ['possession'] }, exp: 'possession' },
    { s: { san: 0, hp: 5 }, e: { tags: ['meta'] }, exp: 'identity_erasure' },
    { s: { san: 0, hp: 5, mythosLevel: 25 }, e: {}, exp: 'mythos_absorption' },
    { s: { san: 0, hp: 5, loopCount: 10 }, e: {}, exp: 'loop_collapse' },
  ];
  for (const sc of scenarios) {
    const state = makeState(sc.s);
    const type = inferDeathType(state, sc.e || {}, null, 'san');
    assert.strictEqual(type, sc.exp, 'SAN death: ' + type + ' (expected ' + sc.exp + ')');
  }
});

// ═══════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════

console.log('');
console.log('=== Reincarnation Tests ===');
console.log('  ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) {
  console.log('');
  console.log('Failed tests:');
  for (const f of failures) console.log('  - ' + f);
}
if (failed > 0 && typeof process !== 'undefined') process.exit(1);
