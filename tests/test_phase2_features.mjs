// tests/test_phase2_features.mjs — Phase 2 专项测试
// 覆盖：has_flag 触发、微恐怖投放、玩家痕迹、NPC 覆盖率

import { checkTriggerExtended } from '../src/reducers/extendedEvents.js';
import { hasTriggered, syncTriggeredSet } from '../src/utils/triggeredSet.js';
import { isMicroHorror, getConsecutiveMicroHorrorCount, applyMicroHorrorDilution, EVENT_BUDGET } from '../src/reducers/extendedEvents.js';
import { detectPlayerTraces, getPlayerTraceNarrative, recordPlayerTrace, TRACE_DESCRIPTIONS, TRACE_AREA_BINDINGS } from '../src/systems/playerTraces.js';
import { NPC_CONTEXTUAL_LINES } from '../src/data/npcContextualLines.js';
import { events as silentEvents } from '../src/data/events_silent.js';

var passed = 0, failed = 0;
function assert(name, cond) {
  if (cond) { passed++; console.log('  PASS: ' + name); }
  else { failed++; console.log('  FAIL: ' + name); }
}

// ── Helper ──
function makeState(overrides) {
  return {
    currentArea: 'church', loopCount: 2, day: 1, chapter: 1,
    triggeredEvents: [], _triggeredSet: null,
    clues: [], inventory: [], humanityScore: 50,
    san: 60, hp: 10, maxHp: 10, food: 3, lightLevel: 1,
    safehouseCorruption: 0, mythosLevel: 0, ap: 6, maxAp: 12,
    lastDeathType: null, lastDeathMode: null,
    previousDeathsByArea: {}, previousEndings: [],
    npcTrust: {}, behaviorTracking: {},
    playerTraces: [], _todayEventTypes: [],
    visitedAreas: [], deathContext: null,
    ...overrides,
  };
}

function sync(state) { syncTriggeredSet(state); }

// ═══════════════════════════════════════════
// Section 1: has_flag trigger condition
// ═══════════════════════════════════════════
console.log('\n=== 1. has_flag trigger condition ===');

// 1a: string flag set → pass
var s1 = makeState({ triggeredEvents: ['flag_alpha'] });
sync(s1);
assert('has_flag string (set)', checkTriggerExtended(
  { trigger: { areas: ['church'], has_flag: 'flag_alpha' } }, s1, {}
));

// 1b: string flag unset → fail
var s2 = makeState({ triggeredEvents: [] });
sync(s2);
assert('has_flag string (unset)', !checkTriggerExtended(
  { trigger: { areas: ['church'], has_flag: 'flag_alpha' } }, s2, {}
));

// 1c: array, all set → pass
var s3 = makeState({ triggeredEvents: ['f1', 'f2', 'f3'] });
sync(s3);
assert('has_flag array (all set)', checkTriggerExtended(
  { trigger: { areas: ['church'], has_flag: ['f1', 'f2', 'f3'] } }, s3, {}
));

// 1d: array, partial → fail
assert('has_flag array (partial)', !checkTriggerExtended(
  { trigger: { areas: ['church'], has_flag: ['f1', 'f4'] } }, s3, {}
));

// 1e: no has_flag → unaffected
assert('no has_flag', checkTriggerExtended(
  { trigger: { areas: ['church'], min_loop: 2 } }, s2, {}
));

// 1f: has_flag + other conditions (combined gate)
var s4 = makeState({ triggeredEvents: ['trace_break_in_harbor'], loopCount: 3 });
sync(s4);
assert('has_flag + min_loop combined', checkTriggerExtended(
  { trigger: { areas: ['church'], has_flag: 'trace_break_in_harbor', min_loop: 2 } }, s4, {}
));

// 1g: flag set via add_flag alias (triggeredEvents contains it) — same area
var s5 = makeState({ triggeredEvents: ['seen_shadow_slow'], currentArea: 'town_center' });
sync(s5);
assert('has_flag via add_flag path', checkTriggerExtended(
  { trigger: { areas: ['town_center'], has_flag: 'seen_shadow_slow' } }, s5, {}
));

// ═══════════════════════════════════════════
// Section 2: micro_horror system
// ═══════════════════════════════════════════
console.log('\n=== 2. micro_horror system ===');

// 2a: isMicroHorror classification
assert('isMicroHorror true', isMicroHorror({ type: 'micro_horror' }));
assert('isMicroHorror false (silent)', !isMicroHorror({ type: 'silent' }));
assert('isMicroHorror false (null)', !isMicroHorror(null));
assert('isMicroHorror false (undefined type)', !isMicroHorror({}));

// 2b: getConsecutiveMicroHorrorCount
var stateClean = makeState({ _todayEventTypes: [] });
assert('zero streak (empty)', getConsecutiveMicroHorrorCount(stateClean) === 0);

var stateOne = makeState({ _todayEventTypes: [
  { type: '氛围事件', isBuffer: true },
  { type: 'micro_horror', isBuffer: false },
] });
assert('one streak (single)', getConsecutiveMicroHorrorCount(stateOne) === 1);

var stateTwo = makeState({ _todayEventTypes: [
  { type: '氛围事件', isBuffer: true },
  { type: 'micro_horror', isBuffer: false },
  { type: 'micro_horror', isBuffer: false },
] });
assert('two streak (double)', getConsecutiveMicroHorrorCount(stateTwo) === 2);

var stateThree = makeState({ _todayEventTypes: [
  { type: 'micro_horror', isBuffer: false },
  { type: 'micro_horror', isBuffer: false },
  { type: 'micro_horror', isBuffer: false },
] });
assert('three streak (triple)', getConsecutiveMicroHorrorCount(stateThree) === 3);

// Streak resets at non-micro_horror
var stateReset = makeState({ _todayEventTypes: [
  { type: 'micro_horror', isBuffer: false },
  { type: 'silent', isBuffer: true },
  { type: 'micro_horror', isBuffer: false },
] });
assert('streak resets after buffer', getConsecutiveMicroHorrorCount(stateReset) === 1);

// 2c: applyMicroHorrorDilution — streak < 2 = no change
var candidates1 = [
  { event: { normalcy_anchor: true, type: 'silent' }, weight: 1.0 },
  { event: { normalcy_anchor: false, type: 'loop_locked' }, weight: 1.0 },
];
var diluted1 = applyMicroHorrorDilution(candidates1, stateOne);
assert('no dilution (streak=1)', diluted1[0].weight === 1.0);

// 2d: applyMicroHorrorDilution — streak >= 2 = buffer boosted
var diluted2 = applyMicroHorrorDilution(candidates1, stateTwo);
assert('dilution boosts buffer (1.5x)', diluted2[0].weight === 1.5);
assert('dilution leaves non-buffer unchanged', diluted2[1].weight === 1.0);

// 2e: EVENT_BUDGET has micro_horror with maxPerDay: 1
assert('EVENT_BUDGET.micro_horror exists', !!EVENT_BUDGET.micro_horror);
assert('micro_horror maxPerDay=1', EVENT_BUDGET.micro_horror.maxPerDay === 1);

// 2f: micro_horror 事件数据完整性（无需 GD，直接验证事件文件结构）
// 验证 micro_horror 事件的 trigger/weight/once_per_run 规范
var mhEvents = silentEvents.filter(function(e) { return e.type === 'micro_horror'; });
assert('micro_horror events count >= 5', mhEvents.length >= 5, 'found ' + mhEvents.length);

// 所有 micro_horror 事件应有 weight <= 0.5（低权重，不喧宾夺主）
var allLowWeight = mhEvents.every(function(e) { return (e.weight || 1) <= 0.5; });
assert('all micro_horror weight <= 0.5', allLowWeight);

// 所有 micro_horror 事件应有 probability <= 0.1（低触发率）
var allLowProb = mhEvents.every(function(e) {
  var p = e.trigger?.probability;
  return p == null || p <= 0.1;
});
assert('all micro_horror probability <= 0.1', allLowProb);

// 所有 micro_horror 事件应标记 once_per_run（同局不重复）
var allOncePerRun = mhEvents.every(function(e) { return e.trigger?.once_per_run === true; });
assert('all micro_horror once_per_run', allOncePerRun);

// ═══════════════════════════════════════════
// Section 3: Player traces pilot
// ═══════════════════════════════════════════
console.log('\n=== 3. player traces pilot ===');

  // 3a: trace descriptions registered
  assert('trace_broken_window_church exists', !!TRACE_DESCRIPTIONS['trace_broken_window_church']);
  assert('trace_dropped_item_harbor exists', !!TRACE_DESCRIPTIONS['trace_dropped_item_harbor']);
  assert('trace_sat_chair_manor exists', !!TRACE_DESCRIPTIONS['trace_sat_chair_manor']);

  // 3b: recordPlayerTrace sets flag + adds to playerTraces
  var sTrace = makeState({ playerTraces: [], triggeredEvents: [] });
  sync(sTrace);
  recordPlayerTrace(sTrace, 'trace_sat_chair_manor', 'voxchester_manor');
  assert('recordPlayerTrace adds to playerTraces', sTrace.playerTraces.length === 1);
  assert('recordPlayerTrace sets flag', hasTriggered(sTrace, 'trace_sat_chair_manor'));
  assert('trace area correct', sTrace.playerTraces[0].areas.includes('voxchester_manor'));

  // 3c: duplicate record is ignored
  recordPlayerTrace(sTrace, 'trace_sat_chair_manor', 'voxchester_manor');
  assert('duplicate trace ignored', sTrace.playerTraces.length === 1);

  // 3d: detectPlayerTraces auto-detects flag-based traces
  var sDetect = makeState({
    playerTraces: [],
    triggeredEvents: ['trace_broken_window_church', 'trace_dropped_item_harbor'],
    previousDeathsByArea: { church: 1 },
    behaviorTracking: { direct_kill_count: 3 },
  });
  sync(sDetect);
  var detected = detectPlayerTraces(sDetect);
  var detectedIds = detected.map((t) => t.traceId);
  assert('detectPlayerTraces finds flag trace (broken_window)', detectedIds.includes('trace_broken_window_church'));
  assert('detectPlayerTraces finds flag trace (dropped_item)', detectedIds.includes('trace_dropped_item_harbor'));
  assert('detectPlayerTraces finds death trace', detectedIds.includes('npc_death_church'));
  assert('detectPlayerTraces finds behavior trace', detectedIds.includes('killing_spree'));

  // 3e: getPlayerTraceNarrative returns text
  var sNarr = makeState({
    playerTraces: [{ traceId: 'trace_sat_chair_manor', areas: ['voxchester_manor'], textIndex: 0 }],
  });
  var narr = getPlayerTraceNarrative('voxchester_manor', sNarr);
  assert('getPlayerTraceNarrative returns text', !!narr && narr.includes('痕迹'));
  assert('getPlayerTraceNarrative null for wrong area', getPlayerTraceNarrative('church', sNarr) === null);

  // 3f: trace echo event triggerable
  assert('trace echo event has_flag check',
    checkTriggerExtended(
      { trigger: { areas: ['church'], has_flag: 'trace_break_in_harbor', min_loop: 2 } },
      makeState({ triggeredEvents: ['trace_break_in_harbor'], loopCount: 2 }),
      {}
    )
  );
  assert('trace echo event blocked without flag',
    !checkTriggerExtended(
      { trigger: { areas: ['church'], has_flag: 'trace_break_in_harbor', min_loop: 2 } },
      makeState({ triggeredEvents: [], loopCount: 2 }),
      {}
    )
  );

  // ═══════════════════════════════════════════
  // Section 4: NPC dialogue coverage
  // ═══════════════════════════════════════════
  console.log('\n=== 4. NPC dialogue coverage ===');

  var npcNames = Object.keys(NPC_CONTEXTUAL_LINES);
  assert('8 NPCs registered', npcNames.length === 8);

  var minLines = 12; // minimum acceptable lines per NPC
  npcNames.forEach((name) => {
    var lines = NPC_CONTEXTUAL_LINES[name] || [];
    assert(name + ' has >= ' + minLines + ' lines', lines.length >= minLines);
  });

  // Each NPC should have at least one line at each priority tier (1-3, 4-6, 7-8)
  npcNames.forEach((name) => {
    var lines = NPC_CONTEXTUAL_LINES[name] || [];
    var hasLow = lines.some((l) => (l.priority || 0) <= 3);
    var hasMid = lines.some((l) => (l.priority || 0) >= 4 && (l.priority || 0) <= 6);
    var hasHigh = lines.some((l) => (l.priority || 0) >= 7);
    assert(name + ' has low-priority lines (1-3)', hasLow);
    assert(name + ' has mid-priority lines (4-6)', hasMid);
    assert(name + ' has high-priority lines (7+)', hasHigh);
  });

  // Each NPC should have lines in key tag categories
  var requiredTags = ['greeting', 'lore', 'loop'];
  npcNames.forEach((name) => {
    var lines = NPC_CONTEXTUAL_LINES[name] || [];
    var allTags = lines.flatMap((l) => l.tags || []);
    requiredTags.forEach((tag) => {
      assert(name + ' has "' + tag + '" tag lines', allTags.includes(tag));
    });
  });

  // New P0 memory lines should be present for 3 NPCs
  var memoryLines = [
    { npc: '老费舍', text: '锚还记得你' },
    { npc: '伊莱亚斯·沃德', text: '体温比上次低了' },
    { npc: '希尔达·莫里斯', text: '上次你从这里出去' },
  ];
  memoryLines.forEach(({ npc, text }) => {
    var lines = NPC_CONTEXTUAL_LINES[npc] || [];
    assert(npc + ' has memory line containing "' + text + '"',
      lines.some((l) => l.text.includes(text)));
  });

  // ═══════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════
  console.log('\n========================================');
  console.log('  Phase 2 Feature Tests: ' + passed + ' passed, ' + failed + ' failed');
  console.log('========================================');

  if (failed > 0) process.exit(1);
