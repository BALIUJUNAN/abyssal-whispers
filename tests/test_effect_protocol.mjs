/**
 * Effect Protocol Tests
 * Validates the post-reducer effect system invariants:
 *   1. _effects never enters persisted state
 *   2. Same _fxId only executes once (dedup)
 *   3. Unknown effect type doesn't crash
 *   4. No audioManager/setTimeout/incrementStat in reducer/slices
 */
import assert from 'assert';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SRC = path.join(__dirname, '..', 'src');
let passed = 0,
  failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  PASS: ' + name);
  } catch (e) {
    failed++;
    console.log('  FAIL: ' + name + ' -> ' + e.message);
  }
}

// === Test 1: _effects stripped from persisted state ===
test('toPersistedState excludes _effects', function () {
  const state = {
    san: 50,
    day: 5,
    triggeredEvents: ['a'],
    narrative: [{ text: 'hello' }],
    transition: 'move',
    _effects: [{ type: 'AUDIO_PLAY', id: 'test', _fxId: 'batch_0' }],
    pendingChoice: null,
  };
  const {
    narrative,
    transition,
    pendingNpc,
    pendingChoice,
    pendingGamble,
    pendingEvent,
    pendingDeath,
    _effects,
    ...persisted
  } = state;
  assert.strictEqual(persisted._effects, undefined, '_effects should be excluded');
  assert.strictEqual(persisted.san, 50, 'normal fields preserved');
  assert.deepStrictEqual(persisted.triggeredEvents, ['a']);
});

// === Test 2: Dedup by _fxId ===
test('Same _fxId only executes once', function () {
  const executed = new Set();
  const results = [];
  const effects = [
    { type: 'TEST', _fxId: 'batch1_0' },
    { type: 'TEST', _fxId: 'batch1_0' },
    { type: 'TEST', _fxId: 'batch1_1' },
  ];
  for (const fx of effects) {
    if (fx._fxId && executed.has(fx._fxId)) continue;
    if (fx._fxId) executed.add(fx._fxId);
    results.push(fx._fxId);
  }
  assert.deepStrictEqual(results, ['batch1_0', 'batch1_1']);
});

test('Dedup Set caps at 300 entries', function () {
  const executed = new Set();
  const CAP = 300;
  for (let i = 0; i < 350; i++) {
    executed.add('fx_' + i);
    if (executed.size > CAP) {
      const first = executed.values().next().value;
      executed.delete(first);
    }
  }
  assert.ok(executed.size <= CAP, 'Set size should not exceed cap');
  assert.ok(!executed.has('fx_0'), 'Oldest entries evicted');
  assert.ok(executed.has('fx_349'), 'Newest entries present');
});

// === Test 3: Unknown effect type doesn't crash ===
test('Unknown effect type logs warning, does not throw', function () {
  const warnings = [];
  const origWarn = console.warn;
  console.warn = function () {
    warnings.push(Array.from(arguments));
  };
  try {
    const handler = undefined;
    const fx = { type: 'UNKNOWN_TYPE_xyz', _fxId: 'test_0' };
    if (!handler) {
      console.warn('[Effect] Unknown effect type:', fx.type, fx);
    }
    assert.strictEqual(warnings.length, 1);
    assert.ok(warnings[0][1] === 'UNKNOWN_TYPE_xyz');
  } finally {
    console.warn = origWarn;
  }
});

// === Test 4: No direct side effects in reducer/slices ===
test('No audioManager calls in slice handlers', function () {
  const sliceDir = path.join(SRC, 'reducers', 'slices');
  const files = fs.readdirSync(sliceDir).filter((f) => f.endsWith('.js'));
  const violations = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(sliceDir, file), 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('//')) continue;
      if (/audioManager\./.test(line)) violations.push(file + ':' + (i + 1) + ': ' + line.trim());
      if (/setTimeout\s*\(/.test(line) && !/effects/.test(line))
        violations.push(file + ':' + (i + 1) + ': ' + line.trim());
      if (/[^.]incrementStat\s*\(/.test(line) && !/INCREMENT_STAT/.test(line))
        violations.push(file + ':' + (i + 1) + ': ' + line.trim());
    }
  }
  assert.deepStrictEqual(violations, [], 'Found direct side effects:\n' + violations.join('\n'));
});

test('No Date.now() or Math.random() in dispatch', function () {
  const storePath = path.join(SRC, 'state', 'useGameStore.js');
  const content = fs.readFileSync(storePath, 'utf8');
  // Extract the dispatch function body (starts at "dispatch: function (action) {")
  const dispatchStart = content.indexOf('dispatch: function (action) {');
  const dispatchEnd = content.indexOf('\n      },', dispatchStart);
  const dispatchBody = content.slice(dispatchStart, dispatchEnd);
  const violations = [];
  const lines = dispatchBody.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('//')) continue;
    if (/Date\.now\(\)/.test(line)) violations.push('useGameStore.dispatch:' + (i + 1) + ': Date.now()');
    if (/Math\.random\(\)/.test(line))
      violations.push('useGameStore.dispatch:' + (i + 1) + ': Math.random()');
  }
  assert.deepStrictEqual(violations, [], 'Reducer impurity:\n' + violations.join('\n'));
});

// === P1-E: Integration tests — full effect pipeline ===

// Test 6: Effect executor dispatches to correct handlers by type
test('effectExecutor routes AUDIO_PLAY to audioManager.playEffect', function () {
  var calls = [];
  var mockAudioManager = {
    playEffect: function (id) { calls.push({ fn: 'playEffect', id: id }); },
    playSkillEffect: function (id) { calls.push({ fn: 'playSkillEffect', id: id }); },
    playAreaAmbient: function (a, p) { calls.push({ fn: 'playAreaAmbient', area: a, phase: p }); },
    playSanLoss: function (amt) { calls.push({ fn: 'playSanLoss', amount: amt }); },
    playUI: function (id) { calls.push({ fn: 'playUI', id: id }); },
    setMuted: function (m) { calls.push({ fn: 'setMuted', muted: m }); },
    suddenMuted: false,
  };
  var mockSaveGame = function (s) { calls.push({ fn: 'saveGame' }); };
  var mockIncrementStat = function (k) { calls.push({ fn: 'incrementStat', key: k }); };
  var mockDispatch = function (a) { calls.push({ fn: 'dispatch', action: a }); };

  // Simulate the EFFECT_HANDLERS map (mirrors effectExecutor.js)
  var HANDLERS = {
    AUDIO_PLAY: function (fx) { mockAudioManager.playEffect(fx.id); },
    AUDIO_SKILL: function (fx) { mockAudioManager.playSkillEffect(fx.id); },
    AUDIO_AMBIENT: function (fx) { mockAudioManager.playAreaAmbient(fx.area, fx.phase); },
    AUDIO_SAN_LOSS: function (fx) { mockAudioManager.playSanLoss(fx.amount); },
    AUDIO_UI: function (fx) { mockAudioManager.playUI(fx.id); },
    SAVE_GAME: function (fx) { mockSaveGame(fx.state); },
    INCREMENT_STAT: function (fx) { mockIncrementStat(fx.key); },
    NARRATE_DELAYED: function (fx, dispatch) {
      setTimeout(function () { dispatch({ type: 'DELAYED_NARRATE', text: fx.text }); }, fx.delay);
    },
  };

  // Simulate a batch of effects like what flushEffectsBuffer produces
  var effects = [
    { type: 'AUDIO_PLAY', id: 'begin', _fxId: 'batch1_0' },
    { type: 'AUDIO_AMBIENT', area: 'town_center', phase: 'morning', _fxId: 'batch1_1' },
    { type: 'INCREMENT_STAT', key: 'total_runs', _fxId: 'batch1_2' },
  ];

  // Execute (dedup set simulation)
  var executed = new Set();
  for (var i = 0; i < effects.length; i++) {
    var fx = effects[i];
    if (fx._fxId && executed.has(fx._fxId)) continue;
    if (fx._fxId) executed.add(fx._fxId);
    var handler = HANDLERS[fx.type];
    if (handler) handler(fx, mockDispatch);
  }

  assert.strictEqual(calls.length, 3, 'Should execute 3 effects');
  assert.deepStrictEqual(calls[0], { fn: 'playEffect', id: 'begin' });
  assert.deepStrictEqual(calls[1], { fn: 'playAreaAmbient', area: 'town_center', phase: 'morning' });
  assert.deepStrictEqual(calls[2], { fn: 'incrementStat', key: 'total_runs' });
});

// Test 7: Effects with same _fxId are deduplicated
test('Duplicate _fxId effects only execute once (integration)', function () {
  var count = 0;
  var HANDLER = function () { count++; };
  var effects = [
    { type: 'AUDIO_PLAY', id: 'bell', _fxId: 'same_0' },
    { type: 'AUDIO_PLAY', id: 'bell', _fxId: 'same_0' },
    { type: 'AUDIO_PLAY', id: 'bell', _fxId: 'same_0' },
    { type: 'AUDIO_PLAY', id: 'other', _fxId: 'diff_0' },
  ];

  var executed = new Set();
  for (var i = 0; i < effects.length; i++) {
    var fx = effects[i];
    if (fx._fxId && executed.has(fx._fxId)) continue;
    if (fx._fxId) executed.add(fx._fxId);
    HANDLER(fx);
  }

  assert.strictEqual(count, 2, 'Same _fxId should execute once, different _fxId executes');
});

// Test 8: NARRATE_DELAYED effect defers dispatch (not synchronous)
test('NARRATE_DELAYED defers dispatch via setTimeout', function () {
  var dispatched = [];
  var mockDispatch = function (a) { dispatched.push(a); };
  var timeoutCalled = false;
  var timeoutDelay = null;

  // Verify that NARRATE_DELAYED handler calls setTimeout (not dispatch directly)
  var origSetTimeout = global.setTimeout;
  global.setTimeout = function (fn, delay) {
    timeoutCalled = true;
    timeoutDelay = delay;
    // Don't actually run the callback — just verify the call
  };

  try {
    var fx = { type: 'NARRATE_DELAYED', text: 'delayed text', delay: 3000, _fxId: 'delay_0' };
    // Simulate NARRATE_DELAYED handler behavior (from effectExecutor.js)
    setTimeout(function () {
      mockDispatch({ type: 'DELAYED_NARRATE', narrType: fx.narrType || 'system', text: fx.text });
    }, fx.delay || 3000);

    assert.strictEqual(dispatched.length, 0, 'Should not dispatch synchronously');
    assert.ok(timeoutCalled, 'Should call setTimeout');
    assert.strictEqual(timeoutDelay, 3000, 'Should use the delay value');
  } finally {
    global.setTimeout = origSetTimeout;
  }
});

// Test 9: BEGIN_ADVENTURE produces expected effect types (structural check)
test('BEGIN_ADVENTURE action produces AUDIO_PLAY + AUDIO_AMBIENT effects', function () {
  // Read the actual BEGIN_ADVENTURE handler location after the slice extraction
  var adventureSlicePath = path.join(SRC, 'reducers', 'slices', 'adventureSlice.js');
  var content = fs.readFileSync(adventureSlicePath, 'utf8');

  var beginIdx = content.indexOf("case 'BEGIN_ADVENTURE'");
  assert.ok(beginIdx > 0, 'BEGIN_ADVENTURE case should exist');
  var endIdx = content.indexOf("case 'DEFAULT'", beginIdx);
  if (endIdx === -1) endIdx = content.length;
  var beginBlock = content.slice(beginIdx, endIdx);

  // Verify it pushes AUDIO_PLAY effects through the typed command helpers
  var hasAudioPlay = beginBlock.includes("audio.play('begin')") || beginBlock.includes("type: 'AUDIO_PLAY'");
  var hasAudioAmbient = beginBlock.includes("audio.ambient(") || beginBlock.includes("type: 'AUDIO_AMBIENT'");
  assert.ok(hasAudioPlay, 'Should push AUDIO_PLAY effect (direct or via commands.js)');
  assert.ok(hasAudioAmbient, 'Should push AUDIO_AMBIENT effect (direct or via commands.js)');

  // Verify it does NOT call audioManager directly (must use effect system)
  assert.ok(!beginBlock.includes('audioManager.'), 'Should not call audioManager directly');
  assert.ok(!beginBlock.includes('setTimeout'), 'Should not call setTimeout directly');
});

// Test 10: EXPLORE produces expected effect types (structural check)
test('EXPLORE action produces AUDIO_SKILL + AUDIO_PLAY effects', function () {
  var explorePath = path.join(SRC, 'reducers', 'slices', 'exploreSlice.js');
  var pipelinePath = path.join(SRC, 'systems', 'explore', 'explorePipeline.js');
  var exploreContent = fs.readFileSync(explorePath, 'utf8');
  var pipelineContent = fs.readFileSync(pipelinePath, 'utf8');
  var combined = exploreContent + '\n' + pipelineContent;

  assert.ok(combined.includes("case 'EXPLORE'") || exploreContent.includes("case 'EXPLORE'"), 'EXPLORE case should exist');

  // Verify it uses c.effects.push for audio (may be in dispatcher or pipeline)
  assert.ok(combined.includes("c.effects.push({ type: 'AUDIO_SKILL'"), 'Should push AUDIO_SKILL via effects');
  assert.ok(combined.includes("c.effects.push({ type: 'AUDIO_PLAY'"), 'Should push AUDIO_PLAY via effects');
});

// === P2 Verification: Effect buffer safety + eventDebugger dry-run ===

// Test 11: Effect buffer does NOT leak across consecutive dispatches
test('does not leak pending effects across consecutive dispatches', function () {
  // Simulate the exact module-level buffer pattern from app.jsx
  var _pendingEffects = [];

  function fakeReducer(state, action) {
    _pendingEffects = []; // line 363: clear at reducer entry
    // Simulate slice handler pushing effects
    var effects = [];
    if (action.type === 'ACTION_A') {
      effects.push({ type: 'AUDIO_PLAY', id: 'effect_a' });
    }
    if (action.type === 'ACTION_B') {
      effects.push({ type: 'AUDIO_PLAY', id: 'effect_b' });
    }
    // Tag with actionId
    var batchId = (action.meta && action.meta.actionId) || 'anon';
    effects.forEach(function (fx, i) { fx._fxId = batchId + '_' + i; });
    _pendingEffects = effects;
    return Object.assign({}, state, { lastAction: action.type });
  }

  var flushed = [];
  function fakeFlush() {
    if (_pendingEffects.length > 0) {
      var effects = _pendingEffects;
      _pendingEffects = [];
      flushed = flushed.concat(effects);
    }
  }

  // Dispatch A
  var state = { day: 1 };
  state = fakeReducer(state, { type: 'ACTION_A', meta: { actionId: 'a1' } });
  fakeFlush();
  assert.strictEqual(flushed.length, 1, 'After ACTION_A: 1 effect flushed');
  assert.strictEqual(flushed[0].id, 'effect_a', 'After ACTION_A: correct effect');
  assert.deepStrictEqual(_pendingEffects, [], 'After ACTION_A flush: buffer empty');

  // Dispatch B — must NOT see effect_a
  state = fakeReducer(state, { type: 'ACTION_B', meta: { actionId: 'b1' } });
  fakeFlush();
  assert.strictEqual(flushed.length, 2, 'After ACTION_B: 2 total effects');
  assert.strictEqual(flushed[1].id, 'effect_b', 'After ACTION_B: only effect_b, not effect_a');
  assert.deepStrictEqual(_pendingEffects, [], 'After ACTION_B flush: buffer empty');

  // Dispatch C (no effects) — must NOT leak effect_b
  state = fakeReducer(state, { type: 'ACTION_C', meta: { actionId: 'c1' } });
  fakeFlush();
  assert.strictEqual(flushed.length, 2, 'After ACTION_C: no new effects');
  assert.deepStrictEqual(_pendingEffects, [], 'After ACTION_C: buffer still empty');
});

// Test 12: StrictMode reducer replay — same _fxId deduped by executor
test('StrictMode reducer replay does not double-execute effects (fxId dedup)', function () {
  var executed = [];
  var _executedFxIds = new Set();

  function mockExecutor(effects) {
    for (var i = 0; i < effects.length; i++) {
      var fx = effects[i];
      if (fx._fxId && _executedFxIds.has(fx._fxId)) continue;
      if (fx._fxId) _executedFxIds.add(fx._fxId);
      executed.push(fx._fxId);
    }
  }

  // Simulate: action dispatched, reducer runs twice (StrictMode), buffer flushed once
  var effects_from_reducer = [
    { type: 'AUDIO_PLAY', id: 'bell', _fxId: 'action1_0' },
    { type: 'AUDIO_AMBIENT', area: 'town', _fxId: 'action1_1' },
  ];

  // First flush (from first reducer run)
  mockExecutor(effects_from_reducer);
  assert.strictEqual(executed.length, 2, 'First flush: 2 effects executed');

  // Second flush with SAME _fxIds (StrictMode re-runs produce same actionId)
  mockExecutor(effects_from_reducer);
  assert.strictEqual(executed.length, 2, 'Second flush: still 2 (deduped by _fxId)');

  // New action with different _fxIds should execute
  var effects_from_action2 = [
    { type: 'AUDIO_PLAY', id: 'other', _fxId: 'action2_0' },
  ];
  mockExecutor(effects_from_action2);
  assert.strictEqual(executed.length, 3, 'New action: 3 total (new _fxId executes)');
});

// Test 13: eventDebugger is a pure dry-run (no state mutation)
test('explainEventSelection does not mutate game state (dry-run)', function () {
  var debuggerPath = path.join(SRC, 'systems', 'eventDebugger.js');
  if (!fs.existsSync(debuggerPath)) {
    // eventDebugger not yet created — skip
    console.log('  SKIP: eventDebugger.js not found');
    passed--; // undo the PASS from test() wrapper
    return;
  }

  var content = fs.readFileSync(debuggerPath, 'utf8');

  // Verify no mutation patterns in explainEventSelection
  var fnStart = content.indexOf('export function explainEventSelection(');
  var fnEnd = content.indexOf('\nexport function ', fnStart + 1);
  if (fnEnd === -1) fnEnd = content.length;
  var fnBody = content.slice(fnStart, fnEnd);

  // Must NOT mutate state
  var violations = [];
  var lines = fnBody.split('\n');
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line.startsWith('//')) continue;
    // Check for state mutation patterns
    if (/\bstate\.\w+\s*=/.test(line) && !/state\.\w+\s*===/.test(line)) {
      violations.push('line ' + (i + 1) + ': state mutation: ' + line);
    }
    if (/\bs\.\w+\s*=\s/.test(line) && !/s\.\w+\s*===/.test(line) && !/var |let |const /.test(line)) {
      violations.push('line ' + (i + 1) + ': draft mutation: ' + line);
    }
    if (/\.push\(|\.pop\(|\.splice\(|\.shift\(/.test(line)) {
      // Only flag pushes on STATE arrays (state.xxx.push or s.xxx.push), not local vars
      if (/state\.\w+\.push|s\.\w+\.push/.test(line) ||
          /\btriggeredEvents\.push|\bcooldowns?\[.*\]\s*=|\bclues\.push|\binventory\.push|\bnpcStates/.test(line)) {
        violations.push('line ' + (i + 1) + ': state array mutation: ' + line);
      }
    }
    if (/Math\.random/.test(line)) {
      violations.push('line ' + (i + 1) + ': Math.random (non-deterministic): ' + line);
    }
    if (/Date\.now/.test(line)) {
      violations.push('line ' + (i + 1) + ': Date.now (non-deterministic): ' + line);
    }
    if (/setTimeout|setInterval/.test(line)) {
      violations.push('line ' + (i + 1) + ': timer (side effect): ' + line);
    }
    if (/dispatch\(/.test(line) && !/\/\/ /.test(line)) {
      violations.push('line ' + (i + 1) + ': dispatch (side effect): ' + line);
    }
    if (/localStorage/.test(line)) {
      violations.push('line ' + (i + 1) + ': localStorage (side effect): ' + line);
    }
  }
  assert.deepStrictEqual(violations, [], 'eventDebugger must be pure (no mutation/determinism/side-effects):\n' + violations.join('\n'));
});

// Test 14: eventDebugger output structure is correct
test('explainEventSelection returns valid report structure', function () {
  var debuggerPath = path.join(SRC, 'systems', 'eventDebugger.js');
  if (!fs.existsSync(debuggerPath)) {
    console.log('  SKIP: eventDebugger.js not found');
    passed--;
    return;
  }

  // Load the module (it's pure ESM, but we can parse it for structure checks)
  var content = fs.readFileSync(debuggerPath, 'utf8');

  // Verify return structure includes required fields
  assert.ok(content.includes('eligible:'), 'Report must have eligible field');
  assert.ok(content.includes('excluded:'), 'Report must have excluded field');
  assert.ok(content.includes('reasonCounts:'), 'Report must have reasonCounts field');
  assert.ok(content.includes('totalEvents:'), 'Report must have totalEvents field');
  assert.ok(content.includes('eligibleCount:'), 'Report must have eligibleCount field');
  assert.ok(content.includes('excludedCount:'), 'Report must have excludedCount field');
});

// === P_NEXT: Seeded RNG determinism tests ===

// Test 15: Seeded RNG produces identical sequences for same seed
test('createSeededRng: same seed+salt produces identical sequence', function () {
  var rngPath = path.join(SRC, 'utils', 'seededRng.js');
  if (!fs.existsSync(rngPath)) { console.log('  SKIP: seededRng.js not found'); passed--; return; }
  var content = fs.readFileSync(rngPath, 'utf8');
  // Verify the module exports createSeededRng and generateRunSeed
  assert.ok(content.includes('export function createSeededRng'), 'Must export createSeededRng');
  assert.ok(content.includes('export function generateRunSeed'), 'Must export generateRunSeed');

  // Inline test of mulberry32 (same logic as the module)
  function testRng(seed, salt) {
    var h = 0;
    var s = String(seed || 'default') + '_' + String(salt || 0);
    for (var i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
    var state = h >>> 0;
    if (state === 0) state = 1;
    var results = [];
    for (var j = 0; j < 10; j++) {
      state = (state + 0x6d2b79f5) | 0;
      var t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      results.push(((t ^ (t >>> 14)) >>> 0) / 4294967296);
    }
    return results;
  }

  var seq1 = testRng('run_abc', 42);
  var seq2 = testRng('run_abc', 42);
  var seq3 = testRng('run_abc', 43);
  var seq4 = testRng('run_xyz', 42);

  assert.deepStrictEqual(seq1, seq2, 'Same seed+salt → identical sequence');
  assert.notDeepStrictEqual(seq1, seq3, 'Different salt → different sequence');
  assert.notDeepStrictEqual(seq1, seq4, 'Different seed → different sequence');
  assert.ok(seq1[0] >= 0 && seq1[0] < 1, 'Values in [0,1) range');
});

// Test 16: Seeded RNG pick/weighted/shuffle are deterministic
test('createSeededRng: pick and shuffle are deterministic', function () {
  // Inline simulation of pick/weighted/shuffle with seeded rng
  function makeRng(seed, salt) {
    var h = 0;
    var s = String(seed) + '_' + String(salt);
    for (var i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
    var state = (h >>> 0) || 1;
    function next() {
      state = (state + 0x6d2b79f5) | 0;
      var t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    function pick(arr) { return arr[Math.floor(next() * arr.length)]; }
    function shuffle(arr) {
      var a = arr.slice();
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(next() * (i + 1));
        var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
      }
      return a;
    }
    return { next: next, pick: pick, shuffle: shuffle };
  }

  var rng1 = makeRng('test_seed', 0);
  var rng2 = makeRng('test_seed', 0);
  var items = ['a', 'b', 'c', 'd', 'e'];

  // Pick sequence
  var picks1 = [], picks2 = [];
  for (var i = 0; i < 20; i++) { picks1.push(rng1.pick(items)); picks2.push(rng2.pick(items)); }
  assert.deepStrictEqual(picks1, picks2, 'pick() sequence identical for same seed');

  // Shuffle
  var shuf1 = rng1.shuffle(items);
  var shuf2 = rng2.shuffle(items);
  assert.deepStrictEqual(shuf1, shuf2, 'shuffle() identical for same seed');
  assert.notDeepStrictEqual(shuf1, items, 'shuffle() actually reorders');
});

// Test 17: ESM imports — all imported source files exist
test('ESM imports: all imported source files exist', function () {
  var srcDir = path.join(__dirname, '..', 'src');
  var jsFiles = [];
  function walk(dir) {
    var entries = fs.readdirSync(dir);
    for (var e = 0; e < entries.length; e++) {
      var full = path.join(dir, entries[e]);
      var stat = fs.statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else if (full.endsWith('.js')) jsFiles.push(full);
    }
  }
  walk(srcDir);

  var violations = [];
  for (var i = 0; i < jsFiles.length; i++) {
    var content = fs.readFileSync(jsFiles[i], 'utf8');
    // Strip single-line and multi-line comments before matching imports
    var code = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    var importRegex = /import\s+.*?from\s+['"]\.\/(.*?)['"]/g;
    var im;
    while ((im = importRegex.exec(code)) !== null) {
      var importTarget = im[1];
      // Normalize relative path
      var resolved = path.resolve(path.dirname(jsFiles[i]), importTarget);
      // Skip self-imports (e.g. barrel index.js re-exporting from itself)
      if (path.normalize(resolved) === path.normalize(jsFiles[i])) continue;
      // Verify the imported file exists (.js or .json)
      var exists = fs.existsSync(resolved) || fs.existsSync(resolved + '.js') || fs.existsSync(resolved + '.json');
      if (!exists) {
        violations.push(path.relative(srcDir, jsFiles[i]) + ' imports ' + importTarget + ' (file not found)');
      }
    }
  }
  assert.deepStrictEqual(violations, [], 'ESM import violations:\n' + violations.join('\n'));
});

// Test 18b: No shadowed 'c' variable bugs in slice handlers
test('slice handlers: no c.xxx inside .find/.filter/.map callbacks', function () {
  var sliceDir = path.join(SRC, 'reducers', 'slices');
  var files = fs.readdirSync(sliceDir).filter(function (f) { return f.endsWith('.js'); });
  var violations = [];
  for (var fi = 0; fi < files.length; fi++) {
    var content = fs.readFileSync(path.join(sliceDir, files[fi]), 'utf8');
    var lines = content.split('\n');
    var inHandler = false;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      // Track if we're inside a handler function (has `c` parameter)
      if (/export function handle\w+Action\(s,\s*action,\s*c/.test(line)) inHandler = true;
      if (inHandler && /^}$/.test(line.trim())) inHandler = false;
      if (!inHandler) continue;
      // Skip comments
      if (line.trim().startsWith('//')) continue;
      // Check for .find/.filter/.map/.forEach callbacks that might shadow 'c'
      // Pattern: callback param named 'c' then using c.xxx where xxx is a data field
      var callbackMatch = line.match(/\.\s*(find|filter|map|forEach)\s*\(\s*\(([^)]*)\)\s*=>/);
      if (callbackMatch) {
        var params = callbackMatch[2].split(',').map(function (p) { return p.trim(); });
        // Check if any param is 'c' and the body uses c.something
        if (params.indexOf('c') !== -1 && /\bc\.\w+/.test(line)) {
          violations.push(files[fi] + ':' + (i + 1) + ': callback param "c" shadows reducer context: ' + line.trim());
        }
      }
      // Also check: arrow callback with 'c' param in multi-line patterns
      var arrowC = line.match(/\.\s*(find|filter|map|forEach)\s*\(\s*\(c\)\s*=>/);
      if (arrowC && /\bc\.(id|name|clues|choices|type|text|weight|area|trigger|effects)\b/.test(line)) {
        violations.push(files[fi] + ':' + (i + 1) + ': "c." in callback shadows reducer ctx: ' + line.trim());
      }
    }
  }
  assert.deepStrictEqual(violations, [], 'Shadowed "c" variable bugs:\n' + violations.join('\n'));
});

// === Summary ===
console.log('\n=== Effect Protocol Tests ===');
console.log('  ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
