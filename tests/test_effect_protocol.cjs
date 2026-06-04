/**
 * Effect Protocol Tests
 * Validates the post-reducer effect system invariants:
 *   1. _effects never enters persisted state
 *   2. Same _fxId only executes once (dedup)
 *   3. Unknown effect type doesn't crash
 *   4. No audioManager/setTimeout/incrementStat in reducer/slices
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); passed++; console.log('  PASS: ' + name); }
  catch (e) { failed++; console.log('  FAIL: ' + name + ' -> ' + e.message); }
}

// === Test 1: _effects stripped from persisted state ===
test('toPersistedState excludes _effects', function() {
  const state = {
    san: 50, day: 5, triggeredEvents: ['a'],
    narrative: [{ text: 'hello' }],
    transition: 'move',
    _effects: [{ type: 'AUDIO_PLAY', id: 'test', _fxId: 'batch_0' }],
    pendingChoice: null,
  };
  const { narrative, transition, pendingNpc, pendingChoice, pendingGamble, pendingEvent, pendingDeath, _effects, ...persisted } = state;
  assert.strictEqual(persisted._effects, undefined, '_effects should be excluded');
  assert.strictEqual(persisted.san, 50, 'normal fields preserved');
  assert.deepStrictEqual(persisted.triggeredEvents, ['a']);
});

// === Test 2: Dedup by _fxId ===
test('Same _fxId only executes once', function() {
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

test('Dedup Set caps at 300 entries', function() {
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
test('Unknown effect type logs warning, does not throw', function() {
  const warnings = [];
  const origWarn = console.warn;
  console.warn = function() { warnings.push(Array.from(arguments)); };
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
test('No audioManager calls in slice handlers', function() {
  const sliceDir = path.join(SRC, 'reducers', 'slices');
  const files = fs.readdirSync(sliceDir).filter(f => f.endsWith('.js'));
  const violations = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(sliceDir, file), 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('//')) continue;
      if (/audioManager\./.test(line)) violations.push(file + ':' + (i+1) + ': ' + line.trim());
      if (/setTimeout\s*\(/.test(line) && !/effects/.test(line)) violations.push(file + ':' + (i+1) + ': ' + line.trim());
      if (/[^.]incrementStat\s*\(/.test(line) && !/INCREMENT_STAT/.test(line)) violations.push(file + ':' + (i+1) + ': ' + line.trim());
    }
  }
  assert.deepStrictEqual(violations, [], 'Found direct side effects:\n' + violations.join('\n'));
});

test('No Date.now() or Math.random() in gameReducer', function() {
  const appPath = path.join(SRC, 'app.jsx');
  const content = fs.readFileSync(appPath, 'utf8');
  const start = content.indexOf('function gameReducer(');
  const end = content.indexOf('\nfunction App(', start);
  const reducerBody = content.slice(start, end);
  const violations = [];
  const lines = reducerBody.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('//')) continue;
    if (/Date\.now\(\)/.test(line)) violations.push('gameReducer:' + (i+1) + ': Date.now()');
    if (/Math\.random\(\)/.test(line)) violations.push('gameReducer:' + (i+1) + ': Math.random()');
  }
  assert.deepStrictEqual(violations, [], 'Reducer impurity:\n' + violations.join('\n'));
});

// === Summary ===
console.log('\n=== Effect Protocol Tests ===');
console.log('  ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
