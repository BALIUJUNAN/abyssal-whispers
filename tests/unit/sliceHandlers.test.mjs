// tests/unit/sliceHandlers.test.mjs — Unit tests for slice handler core branches
//
// Tests the deterministic mutation contracts of each slice handler:
// AP consumption, state mutations, narration, and effects.
// Uses a seeded RNG for reproducibility.
//
// Run: node tests/unit/sliceHandlers.test.mjs

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(TEST_DIR, '..', '..');
function testPath(rel) { return join(ROOT, rel); }

// ── Environment setup (before any game module imports) ────────────

// Mock localStorage
if (typeof globalThis.localStorage === 'undefined') {
  var _lsStore = {};
  globalThis.localStorage = {
    getItem: (k) => _lsStore[k] || null,
    setItem: (k, v) => { _lsStore[k] = String(v); },
    removeItem: (k) => { delete _lsStore[k]; },
    clear: () => { _lsStore = {}; },
  };
}

// Load game data and set global GD (used by gameHelpers.js and others)
const baseData = JSON.parse(readFileSync(testPath('game_base.json'), 'utf-8'));
globalThis.GD = baseData;

// Configure SaveManager before any module imports it
try {
  var saveMgr = await import('../../src/engine/SaveManager.js');
  saveMgr.configureSaveManager({ toPersistedState: function (s) { return s; } });
} catch (e) {
  // SaveManager may not be available in all test environments
}

// ── Seeded RNG (same as test_full_flow.mjs) ────────────────────────

function createSeededRng(seed, idx) {
  let h = 0;
  const s = seed + ':' + idx;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  let state = Math.abs(h) || 1;
  return {
    next() { state = (state * 1664525 + 1013904223) & 0x7fffffff; return state / 0x7fffffff; },
    pick(arr) { return arr[Math.floor(this.next() * arr.length)]; },
    intBetween(min, max) { return Math.floor(this.next() * (max - min + 1)) + min; },
  };
}

// ── Mock Context Builder ──────────────────────────────────────────

function createMockCtx(GD) {
  var ctx = {
    GD: GD || baseData,
    bt: {},
    rng: createSeededRng('slice_test', 0),
    log: function () {},
  };
  ctx._narrCalls = [];
  ctx._effects = [];
  ctx.narr = function (type, text, extra) { ctx._narrCalls.push({ type, text, extra }); };
  ctx.effects = ctx._effects;
  return ctx;
}

function createMockRng(seed, idx) {
  return createSeededRng(seed || 'slice_test', idx || 0);
}

// Run a slice handler and return { draft, c, ctx }
function runSliceHandler(handler, draft, action, c, ctx) {
  var result = handler(draft, action, c, ctx);
  return { draft, c, ctx, result };
}

// ── Minimal draft state ───────────────────────────────────────────

function createDraft(overrides) {
  return {
    day: 1, ap: 12, maxAp: 12, san: 60, maxSan: 60,
    hp: 10, maxHp: 10, luck: 50, mp: 0, money: 10,
    food: 3, pollution: 0, safehouseCorruption: 0,
    currentArea: 'town_center', visitedAreas: ['town_center'],
    inventory: [], clues: [], skills: {},
    stats: { STR: 50, CON: 55, DEX: 55, APP: 50, POW: 60, INT: 65, SIZ: 60, EDU: 70 },
    npcTrust: {}, npcStates: {}, npcRelations: {},
    sealState: 'intact', weather: 'clear',
    currentSafehouse: 'safehouse_1', currentChapter: 'chapter_1',
    humanityScore: 50, archetype: null, loopCount: 0,
    difficulty: 'normal', difficultyLevel: 1,
    objectives: [], completedChains: [], triggeredEvents: [],
    triggeredSilentEvents: [], seenEventTexts: {},
    longTermEffects: [], madnessActive: null,
    narrative: [], eventLog: [], _dayActions: [], _actionIndex: 0,
    _effects: [], _apLies: false, _apOffset: 0, _runtime: {}, _debug: {},
    stats_run: {}, stats_today: {}, categoryCountsToday: {}, categoryCountsRun: {},
    abnormalStreak: 0, eventCooldowns: {}, _madnessApMultiplier: 1,
    runMemory: [], fearTuning: null, retainedKnowledge: [],
    _dayStartArea: null, tutorialSeen: {},
    ...overrides,
  };
}

// ── Imports (after environment setup) ─────────────────────────────

import { handleDailyAction } from '../../src/reducers/slices/dailySlice.js';
import { handleDarkAction } from '../../src/reducers/slices/darkSlice.js';
import { handleCoreAction } from '../../src/reducers/slices/coreSlice.js';
import { handleLoopAction } from '../../src/reducers/slices/loopSlice.js';
import { handleExploreAction } from '../../src/reducers/slices/exploreSlice.js';
import { handleNpcAction } from '../../src/reducers/slices/npcSlice.js';

// ── Tests ─────────────────────────────────────────────────────────

var passed = 0, failed = 0;
function assert(name, cond) {
  if (cond) { passed++; console.log('  PASS ' + name); }
  else { failed++; console.error('  FAIL ' + name); }
}

// ─── dailySlice ───────────────────────────────────────────────────

console.log('=== dailySlice ===');

{
  // WORK: AP consumed, money increases
  var s = createDraft({ ap: 6, money: 10 });
  var c = createMockCtx();
  var ctx = { GD: baseData };
  handleDailyAction(s, { type: 'WORK' }, c, ctx);
  assert('WORK ap -= 2', s.ap === 4);
  assert('WORK money increased', s.money > 10);
  assert('WORK bt.work_count', c.bt.work_count === 1);
  assert('WORK narr called', c._narrCalls.length > 0);
}

{
  // WORK: insufficient AP
  var s = createDraft({ ap: 1 });
  var c = createMockCtx();
  var ctx = { GD: baseData };
  handleDailyAction(s, { type: 'WORK' }, c, ctx);
  assert('WORK no AP: ap unchanged', s.ap === 1);
}

{
  // REST: day advances, HP/SAN recovery
  var s = createDraft({ day: 1, ap: 0, hp: 5, maxHp: 10, san: 50, maxSan: 60, food: 3 });
  var c = createMockCtx();
  var ctx = { GD: baseData };
  handleDailyAction(s, { type: 'REST' }, c, ctx);
  assert('REST day advanced', s.day === 2);
  assert('REST HP recovered', s.hp > 5);
}

// ─── darkSlice ────────────────────────────────────────────────────

console.log('=== darkSlice ===');

{
  // SELF_HARM: AP consumed, SAN decreases, humanity decreases
  var s = createDraft({ ap: 6, san: 60, maxSan: 60, humanityScore: 50, pollution: 0 });
  var rng = createMockRng('dark_test', 42);
  var c = createMockCtx();
  c.rng = rng;
  var ctx = { GD: baseData };
  handleDarkAction(s, { type: 'SELF_HARM' }, c, ctx);
  assert('SELF_HARM ap -= 2', s.ap === 4);
  assert('SELF_HARM san decreased', s.san < 60);
  assert('SELF_HARM humanity decreased', s.humanityScore < 50);
  assert('SELF_HARM bt.self_harm_ritual_count', c.bt.self_harm_ritual_count === 1);
  assert('SELF_HARM bt.fusion_and_self_harm_total', c.bt.fusion_and_self_harm_total === 1);
  assert('SELF_HARM narr called', c._narrCalls.length > 0);
}

{
  // SELF_HARM: insufficient AP
  var s = createDraft({ ap: 1 });
  var c = createMockCtx();
  var ctx = { GD: baseData };
  handleDarkAction(s, { type: 'SELF_HARM' }, c, ctx);
  assert('SELF_HARM no AP: ap unchanged', s.ap === 1);
}

{
  // SPREAD_PROPHECY: AP consumed, SAN decreases
  var s = createDraft({ ap: 6, san: 60, maxSan: 60, humanityScore: 50 });
  var rng = createMockRng('prophecy_test', 0);
  var c = createMockCtx();
  c.rng = rng;
  var ctx = { GD: baseData };
  handleDarkAction(s, { type: 'SPREAD_PROPHECY' }, c, ctx);
  assert('SPREAD_PROPHECY ap -= 2', s.ap === 4);
  assert('SPREAD_PROPHECY san decreased', s.san < 60);
  assert('SPREAD_PROPHECY bt.prophecy_spread_count', c.bt.prophecy_spread_count === 1);
  assert('SPREAD_PROPHECY bt.cult_leader_score', c.bt.cult_leader_score === 1);
}

// ─── coreSlice ────────────────────────────────────────────────────

console.log('=== coreSlice ===');

{
  // SET_DIFFICULTY: sets difficulty and difficultyLevel
  var s = createDraft();
  var c = createMockCtx();
  var ctx = { GD: baseData };
  handleCoreAction(s, { type: 'SET_DIFFICULTY', difficulty: 2 }, c, ctx);
  assert('SET_DIFFICULTY difficultyLevel=2', s.difficultyLevel === 2);
  assert('SET_DIFFICULTY difficulty=hard', s.difficulty === 'hard');
}

{
  // SET_ARCHETYPE: sets archetype
  var s = createDraft();
  var c = createMockCtx();
  var ctx = { GD: baseData };
  handleCoreAction(s, { type: 'SET_ARCHETYPE', archetypeId: 'investigator' }, c, ctx);
  assert('SET_ARCHETYPE archetype=investigator', s.archetype === 'investigator');
}

{
  // ROLL_STATS: generates stats dict
  var s = createDraft({ archetype: null });
  var c = createMockCtx();
  var ctx = { GD: baseData };
  handleCoreAction(s, { type: 'ROLL_STATS' }, c, ctx);
  assert('ROLL_STATS stats is object', typeof s.stats === 'object');
  assert('ROLL_STATS has STR', typeof s.stats.STR === 'number');
  assert('ROLL_STATS has POW', typeof s.stats.POW === 'number');
}

// ─── loopSlice ────────────────────────────────────────────────────

console.log('=== loopSlice ===');

{
  // NEW_GAME: replaces game fields in place with day=1, loopCount incremented
  var s = createDraft({ day: 15, loopCount: 2 });
  var c = createMockCtx();
  var ctx = { GD: baseData };
  var result = handleLoopAction(s, { type: 'NEW_GAME' }, c, ctx);
  assert('NEW_GAME uses Immer mutation contract', result === null);
  assert('NEW_GAME day=1', s.day === 1);
  assert('NEW_GAME loopCount incremented', s.loopCount === 3);
}

// ─── exploreSlice ────────────────────────────────────────────────

console.log('=== exploreSlice ===');

{
  // MOVE: AP consumed, currentArea changes
  var s = createDraft({ ap: 6, currentArea: 'town_center' });
  var c = createMockCtx();
  var ctx = { GD: baseData };
  handleExploreAction(s, { type: 'MOVE', areaId: 'harbor_district' }, c, ctx);
  assert('MOVE ap -= 1', s.ap === 5);
  assert('MOVE currentArea changed', s.currentArea === 'harbor_district');
}

{
  // MOVE: insufficient AP
  var s = createDraft({ ap: 0, currentArea: 'town_center' });
  var c = createMockCtx();
  var ctx = { GD: baseData };
  handleExploreAction(s, { type: 'MOVE', areaId: 'harbor_district' }, c, ctx);
  assert('MOVE no AP: ap unchanged', s.ap === 0);
}

{
  // EXPLORE: AP consumed
  var s = createDraft({ ap: 6, currentArea: 'town_center' });
  var rng = createMockRng('explore_test', 0);
  var c = createMockCtx();
  c.rng = rng;
  var ctx = { GD: baseData };
  handleExploreAction(s, { type: 'EXPLORE' }, c, ctx);
  assert('EXPLORE ap -= 2', s.ap === 4);
}

// ─── npcSlice ────────────────────────────────────────────────────

console.log('=== npcSlice ===');

{
  // TALK_NPC: AP consumed, pendingNpc set
  var npc = { name: '玛莎·格雷', trust_layers: [{ level: 0, dialogue: '你好。' }] };
  var s = createDraft({ ap: 6, npcStates: {} });
  var rng = createMockRng('npc_test', 0);
  var c = createMockCtx();
  c.rng = rng;
  var ctx = { GD: baseData };
  handleNpcAction(s, { type: 'TALK_NPC', npc: npc }, c, ctx);
  assert('TALK_NPC ap -= 1', s.ap === 5);
  assert('TALK_NPC pendingNpc set', s.pendingNpc && s.pendingNpc.npc.name === '玛莎·格雷');
}

{
  // TALK_NPC: insufficient AP
  var npc = { name: '玛莎·格雷', trust_layers: [{ level: 0, dialogue: '你好。' }] };
  var s = createDraft({ ap: 0, npcStates: {} });
  var c = createMockCtx();
  var ctx = { GD: baseData };
  handleNpcAction(s, { type: 'TALK_NPC', npc: npc }, c, ctx);
  assert('TALK_NPC no AP: ap unchanged', s.ap === 0);
}

// ─── RNG determinism ──────────────────────────────────────────────

console.log('=== RNG determinism ===');

{
  // Same action + same seed → same state mutations
  function runWork(seed) {
    var s = createDraft({ ap: 6, money: 10 });
    var rng = createMockRng(seed, 0);
    var c = createMockCtx();
    c.rng = rng;
    var ctx = { GD: baseData };
    handleDailyAction(s, { type: 'WORK' }, c, ctx);
    return { ap: s.ap, money: s.money, bt_work: c.bt.work_count };
  }
  var r1 = runWork('determinism');
  var r2 = runWork('determinism');
  assert('WORK deterministic: ap', r1.ap === r2.ap);
  assert('WORK deterministic: money', r1.money === r2.money);
  assert('WORK deterministic: bt', r1.bt_work === r2.bt_work);
}

{
  // SELF_HARM: same seed → same SAN loss
  function runSelfHarm(seed) {
    var s = createDraft({ ap: 6, san: 60, maxSan: 60, humanityScore: 50, pollution: 0 });
    var rng = createMockRng(seed, 0);
    var c = createMockCtx();
    c.rng = rng;
    var ctx = { GD: baseData };
    handleDarkAction(s, { type: 'SELF_HARM' }, c, ctx);
    return { san: s.san, humanity: s.humanityScore, pollution: s.pollution };
  }
  var r1 = runSelfHarm('dark_det');
  var r2 = runSelfHarm('dark_det');
  assert('SELF_HARM deterministic: san', r1.san === r2.san);
  assert('SELF_HARM deterministic: humanity', r1.humanity === r2.humanity);
  assert('SELF_HARM deterministic: pollution', r1.pollution === r2.pollution);
}

// ─── Summary ─────────────────────────────────────────────────────

console.log('='.repeat(50));
console.log('Total: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
else console.log('ALL TESTS PASSED');
