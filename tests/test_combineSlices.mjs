// tests/test_combineSlices.cjs — combineSlices framework unit tests
//
// Run: node tests/test_combineSlices.cjs
// Covers: createSlice, combineSlices, ownedFieldChange, getOwnedFields,
//         legacy handlers, before/after hooks, fail-fast errors, Immer rollback.

import { fileURLToPath } from 'url';
import path from 'path';
import { produce } from 'immer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { createSlice, combineSlices, ownedFieldChange, getOwnedFields }
  from '../src/state/combineSlices.js';
import { useGameStore } from '../src/state/useGameStore.js';
import { errorTracker } from '../src/utils/errorTracker.js';

// ═══════════════════════════════════════════════════════════════
// Test harness
// ═══════════════════════════════════════════════════════════════

var passed = 0;
var failed = 0;
var errors = [];

function assert(cond, msg) {
  if (cond) {
    passed++;
  } else {
    failed++;
    errors.push(msg || 'assertion failed');
  }
}

function assertEqual(actual, expected, msg) {
  if (actual === expected) {
    passed++;
  } else {
    failed++;
    errors.push((msg || '') + ' expected=' + JSON.stringify(expected) + ' actual=' + JSON.stringify(actual));
  }
}

function assertDeepEqual(actual, expected, msg) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed++;
  } else {
    failed++;
    errors.push((msg || 'deepEqual failed') + '\n  expected=' + JSON.stringify(expected) + '\n  actual=' + JSON.stringify(actual));
  }
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

/** Produce a simple immer draft for testing (no zustand needed). */
function produceDraft(initial) {
  // Minimal immer-like draft: deep clone + mutation tracking
  return JSON.parse(JSON.stringify(initial));
}

function createTestCtx() {
  return {
    GD: {
      events: [],
      npcs: [],
      systems: { player: { archetypes: [] } },
    },
  };
}

function createTestC() {
  return {
    narr: function () {},
    effects: [],
    bt: {},
    rng: null,
    pick: function (arr) { return arr[Math.floor(Math.random() * arr.length)]; },
    now: Date.now,
  };
}

// ═══════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════

console.log('\n══════════════════════════════════════════');
console.log(' combineSlices Framework Unit Tests');
console.log('══════════════════════════════════════════\n');

// ── 1. createSlice ────────────────────────────────────────

console.log('── 1. createSlice ──');

// 1a. Basic config
var slice1 = createSlice({
  name: 'counter',
  ownedFields: ['count', 'step'],
  initialState: { count: 0, step: 1 },
  reducers: {
    INCREMENT: function (state, action) {
      state.count += (action.payload?.step || state.step);
    },
    RESET: function (state) {
      state.count = 0;
    },
  },
});

assert(slice1.name === 'counter', '1a: slice name');
assert(slice1.ownedFields.length === 2, '1a: owned fields count');
assert(slice1.initialState.count === 0, '1a: initial state');
assert(typeof slice1.handlers.INCREMENT === 'function', '1a: handler function');
assert(typeof slice1.handlers.RESET === 'function', '1a: handler function');

// 1b. Default name
var sliceDefault = createSlice({ reducers: {} });
assert(sliceDefault.name === 'anonymous', '1b: default name');

// 1c. Empty config
var sliceEmpty = createSlice({});
assert(sliceEmpty.name === 'anonymous', '1c: empty name');
assert(sliceEmpty.ownedFields.length === 0, '1c: empty ownedFields');
assert(sliceEmpty.initialState !== undefined, '1c: has initialState');

// 1d. with before/after/handler
var sliceFull = createSlice({
  name: 'full',
  before: function () {},
  after: function () {},
  handler: function () { return true; },
});
assert(typeof sliceFull.before === 'function', '1d: before hook');
assert(typeof sliceFull.after === 'function', '1d: after hook');
assert(typeof sliceFull.handler === 'function', '1d: legacy handler');

// 1e. reducerNames tracking
assert(slice1.reducerNames.length === 2, '1e: reducerNames count');
assert(slice1.reducerNames.indexOf('INCREMENT') >= 0, '1e: INCREMENT in names');
assert(slice1.reducerNames.indexOf('RESET') >= 0, '1e: RESET in names');

// ── 2. combineSlices — declarative reducers ──────────────

console.log('── 2. combineSlices declarative ──');

var counterSlice = createSlice({
  name: 'counter',
  ownedFields: ['count'],
  initialState: { count: 0 },
  reducers: {
    INCREMENT: function (state) { state.count++; },
    DECREMENT: function (state) { state.count--; },
    SET: function (state, action) { state.count = action.payload; },
  },
});

var rootFactory = combineSlices([counterSlice]);
assert(typeof rootFactory === 'function', '2a: factory is function');

var ctx = createTestCtx();
var rootReducer = rootFactory(ctx);
assert(typeof rootReducer === 'function', '2b: rootReducer is function');

// 2c. Dispatch INCREMENT
var state2 = { count: 0 };
var handledResult = rootReducer(state2, { type: 'INCREMENT' }, createTestC());
assertEqual(state2.count, 1, '2c: INCREMENT');
assertEqual(handledResult.handled, true, '2c: declarative action reports handled');

// 2d. Dispatch SET
rootReducer(state2, { type: 'SET', payload: 42 }, createTestC());
assertEqual(state2.count, 42, '2d: SET');

// 2e. Dispatch DECREMENT
rootReducer(state2, { type: 'DECREMENT' }, createTestC());
assertEqual(state2.count, 41, '2e: DECREMENT');

// 2f. Unhandled action — no change
var unknownResult = rootReducer(state2, { type: 'UNKNOWN' }, createTestC());
assertEqual(state2.count, 41, '2f: UNKNOWN no-op');
assertEqual(unknownResult.handled, false, '2f: UNKNOWN reports unhandled');

// ── 3. combineSlices — multiple slices ───────────────────

console.log('── 3. multiple slices ──');

var userSlice = createSlice({
  name: 'user',
  ownedFields: ['name'],
  initialState: { name: 'anonymous' },
  reducers: {
    SET_NAME: function (state, action) { state.name = action.payload; },
  },
});

var settingsSlice = createSlice({
  name: 'settings',
  ownedFields: ['theme'],
  initialState: { theme: 'dark' },
  reducers: {
    SET_THEME: function (state, action) { state.theme = action.payload; },
  },
});

var multiFactory = combineSlices([counterSlice, userSlice, settingsSlice]);
var multiReducer = multiFactory(ctx);

var state3 = { count: 0, name: 'anonymous', theme: 'dark' };
multiReducer(state3, { type: 'INCREMENT' }, createTestC());
multiReducer(state3, { type: 'SET_NAME', payload: '调查员' }, createTestC());
multiReducer(state3, { type: 'SET_THEME', payload: 'light' }, createTestC());

assertEqual(state3.count, 1, '3a: counter');
assertEqual(state3.name, '调查员', '3b: user');
assertEqual(state3.theme, 'light', '3c: settings');

// ── 4. ownedFields — initial state merge ─────────────────

console.log('── 4. ownedFields initial state ──');

var fieldFactory = combineSlices([
  createSlice({
    name: 'a',
    ownedFields: ['x'],
    initialState: { x: 1 },
  }),
  createSlice({
    name: 'b',
    ownedFields: ['y'],
    initialState: { y: 2 },
  }),
]);

var fieldReducer = fieldFactory(ctx);
var state4 = {};
fieldReducer(state4, { type: '@@INIT' }, createTestC());
assertEqual(state4.x, 1, '4a: x from slice a');
assertEqual(state4.y, 2, '4b: y from slice b');

// Later slice overrides earlier on conflict
var overrideFactory = combineSlices([
  createSlice({ name: 'first', ownedFields: ['v'], initialState: { v: 1 } }),
  createSlice({ name: 'second', ownedFields: ['v'], initialState: { v: 2 } }),
]);
var overrideReducer = overrideFactory(ctx);
var state4b = {};
overrideReducer(state4b, { type: '@@INIT' }, createTestC());
assertEqual(state4b.v, 2, '4c: later slice overrides');

// ── 5. legacy handlers ───────────────────────────────────

console.log('── 5. legacy handlers ──');

var legacySlice = createSlice({
  name: 'legacy',
  handler: function (state, action, c, ctx) {
    if (action.type === 'LEGACY_ACTION') {
      state.legacyRan = true;
      return true; // handled
    }
    return null;
  },
});

var mixedFactory = combineSlices([counterSlice, legacySlice]);
var mixedReducer = mixedFactory(ctx);

// 5a. Declarative INCREMENT still works
var state5a = { count: 0, legacyRan: false };
mixedReducer(state5a, { type: 'INCREMENT' }, createTestC());
assertEqual(state5a.count, 1, '5a: declarative still works');

// 5b. Legacy handler
var state5b = { count: 0, legacyRan: false };
mixedReducer(state5b, { type: 'LEGACY_ACTION' }, createTestC());
assertEqual(state5b.legacyRan, true, '5b: legacy handler');

// 5c. Legacy handler returns true = first-match-wins
var state5c = { count: 99, legacyRan: false };
mixedReducer(state5c, { type: 'LEGACY_ACTION' }, createTestC());
assertEqual(state5c.count, 99, '5c: legacy wins over declarative');

// 5d. Unknown action on legacy-only slice
var legacyOnlyFactory = combineSlices([legacySlice]);
var legacyOnlyReducer = legacyOnlyFactory(ctx);
var state5d = { legacyRan: false };
legacyOnlyReducer(state5d, { type: 'UNKNOWN' }, createTestC());
assertEqual(state5d.legacyRan, false, '5d: unknown no-op');

// ── 6. before/after hooks ────────────────────────────────

console.log('── 6. before/after hooks ──');

var hookLog = [];

var hookSlice = createSlice({
  name: 'hooked',
  before: function (state, action) {
    hookLog.push({ phase: 'before', action: action.type, count: state.count });
  },
  after: function (state, action) {
    hookLog.push({ phase: 'after', action: action.type, count: state.count });
  },
  reducers: {
    BUMP: function (state) { state.count = (state.count || 0) + 1; },
  },
});

var hookFactory = combineSlices([hookSlice]);
var hookReducer = hookFactory(ctx);

var state6 = { count: 0 };
hookLog.length = 0;
hookReducer(state6, { type: 'BUMP' }, createTestC());

assertEqual(state6.count, 1, '6a: reducer ran');
assertEqual(hookLog.length, 2, '6b: two hook calls');
assertEqual(hookLog[0].phase, 'before', '6c: before first');
assertEqual(hookLog[1].phase, 'after', '6d: after second');

// Hooks receive state (mutation visible in after)
assertEqual(hookLog[1].count, 1, '6e: after sees mutated state');

// ── 7. hook errors fail fast ─────────────────────────────

console.log('── 7. hook errors fail fast ──');

var errorHookSlice = createSlice({
  name: 'errorHook',
  before: function (state) {
    state.beforeTouched = true;
    throw new Error('before hook error');
  },
  reducers: {
    SAFE: function (state) { state.safe = true; },
  },
});

var errorFactory = combineSlices([errorHookSlice, counterSlice]);
var errorReducer = errorFactory(ctx);

var state7 = { safe: false, count: 0 };
var hookError = null;
try {
  produce(state7, function (draft) {
    errorReducer(draft, { type: 'SAFE' }, createTestC());
  });
} catch (e) {
  hookError = e;
}
assert(!!hookError, '7a: before hook error propagates');
assertEqual(hookError?.phase, 'before', '7b: before phase recorded');
assertEqual(hookError?.slice, 'errorHook', '7c: hook slice recorded');
assertEqual(hookError?.actionType, 'SAFE', '7d: hook action recorded');
assertDeepEqual(state7, { safe: false, count: 0 }, '7e: Immer rolls back before-hook mutation');

// ── 8. before/after hooks with ctx ───────────────────────

console.log('── 8. hooks with ctx ──');

var ctxAwareSlice = createSlice({
  name: 'ctxAware',
  before: function (state, action, c, ctx) {
    state._beforeRan = true;
    state._ctxGd = !!ctx?.GD;
  },
  after: function (state, action, c, ctx) {
    state._afterRan = true;
  },
  reducers: {
    DO: function (state) { state.done = true; },
  },
});

var ctxFactory = combineSlices([ctxAwareSlice]);
var ctxReducer = ctxFactory(createTestCtx());

var state8 = { done: false };
ctxReducer(state8, { type: 'DO' }, createTestC());
assertEqual(state8._beforeRan, true, '8a: before ran');
assertEqual(state8._afterRan, true, '8b: after ran');
assertEqual(state8._ctxGd, true, '8c: ctx.GD visible');
assertEqual(state8.done, true, '8d: reducer ran');

// ── 9. ownedFieldChange ──────────────────────────────────

console.log('── 9. ownedFieldChange ──');

var testState9 = { hp: 10, san: 60 };
var changed = ownedFieldChange(testState9, 'hp', 5, 'combat');
assertEqual(changed, true, '9a: reports change');
assertEqual(testState9.hp, 5, '9b: value updated');

// No change when same value
var noChange = ownedFieldChange(testState9, 'hp', 5, 'combat');
assertEqual(noChange, false, '9c: no false positive');

// New field
testState9.newField = 0;
var added = ownedFieldChange(testState9, 'newField', 1, 'test');
assertEqual(added, true, '9d: new field counts as change');

// ── 10. getOwnedFields ───────────────────────────────────

console.log('── 10. getOwnedFields ──');

var ownedSlice1 = createSlice({
  name: 'sliceA',
  ownedFields: ['fieldA', 'fieldB'],
});

var ownedSlice2 = createSlice({
  name: 'sliceB',
  ownedFields: ['fieldC'],
});

var ownedMap = getOwnedFields([ownedSlice1, ownedSlice2]);
assertEqual(ownedMap.fieldA, 'sliceA', '10a: fieldA owner');
assertEqual(ownedMap.fieldB, 'sliceA', '10b: fieldB owner');
assertEqual(ownedMap.fieldC, 'sliceB', '10c: fieldC owner');

// No ownedFields
var noFieldSlice = createSlice({ name: 'empty' });
var noMap = getOwnedFields([noFieldSlice]);
assertDeepEqual(noMap, {}, '10d: empty slice');

// ── 11. Reducer errors fail fast and roll back ────────────

console.log('── 11. reducer errors fail fast ──');

var afterRan = false;

var badSlice = createSlice({
  name: 'bad',
  reducers: {
    CRASH: function (state) {
      state.partialMutation = true;
      throw new Error('reducer crash');
    },
  },
});

var safeSlice = createSlice({
  name: 'safe',
  after: function () { afterRan = true; },
  reducers: {
    SAFE_ACTION: function (state) { state.safe = true; },
  },
});

var safeFactory = combineSlices([badSlice, safeSlice]);
var safeReducer = safeFactory(ctx);

var state11 = { safe: false };
var reducerError = null;
try {
  produce(state11, function (draft) {
    safeReducer(draft, { type: 'CRASH' }, createTestC());
  });
} catch (e) {
  reducerError = e;
}
assert(!!reducerError, '11a: reducer error propagates');
assertEqual(reducerError?.phase, 'reducer', '11b: reducer phase recorded');
assertEqual(reducerError?.slice, 'bad', '11c: reducer slice recorded');
assertEqual(reducerError?.actionType, 'CRASH', '11d: reducer action recorded');
assertDeepEqual(state11, { safe: false }, '11e: Immer rolls back reducer mutation');
assertEqual(afterRan, false, '11f: after hook does not run after reducer failure');

// Safe action after bad slice still works
try {
  state11 = produce(state11, function (draft) {
    safeReducer(draft, { type: 'SAFE_ACTION' }, createTestC());
  });
  assertEqual(state11.safe, true, '11g: safe action works after failed action');
} catch (e) {
  failed++;
  errors.push('11g: ' + e.message);
}

// Production slices currently use claimed legacy handlers, so their failure
// path must carry the same metadata and rollback guarantee.
var legacyCrashSlice = createSlice({
  name: 'legacyCrash',
  handler: function (state, action) {
    if (action.type !== 'LEGACY_CRASH') return false;
    state.partialLegacyMutation = true;
    throw new Error('legacy reducer crash');
  },
});
var legacyCrashReducer = combineSlices([legacyCrashSlice])(ctx);
var legacyBase = { stable: true };
var legacyError = null;
try {
  produce(legacyBase, function (draft) {
    legacyCrashReducer(draft, { type: 'LEGACY_CRASH' }, createTestC());
  });
} catch (e) {
  legacyError = e;
}
assertEqual(legacyError?.phase, 'reducer', '11h: legacy reducer phase recorded');
assertEqual(legacyError?.slice, 'legacyCrash', '11i: legacy reducer slice recorded');
assertDeepEqual(legacyBase, { stable: true }, '11j: Immer rolls back legacy mutation');

var afterCrashSlice = createSlice({
  name: 'afterCrash',
  reducers: {
    AFTER_CRASH: function (state) { state.domainMutation = true; },
  },
  after: function (state) {
    state.afterMutation = true;
    throw new Error('after hook crash');
  },
});
var afterCrashReducer = combineSlices([afterCrashSlice])(ctx);
var afterBase = { stable: true };
var afterError = null;
try {
  produce(afterBase, function (draft) {
    afterCrashReducer(draft, { type: 'AFTER_CRASH' }, createTestC());
  });
} catch (e) {
  afterError = e;
}
assertEqual(afterError?.phase, 'after', '11k: after-hook phase recorded');
assertEqual(afterError?.slice, 'afterCrash', '11l: after-hook slice recorded');
assertDeepEqual(afterBase, { stable: true }, '11m: Immer rolls back domain and after mutations');

// ── 12. Legacy handler with ctx ──────────────────────────

console.log('── 12. legacy handler with ctx ──');

var ctxLegacySlice = createSlice({
  name: 'ctxLegacy',
  handler: function (state, action, c, ctx) {
    state.ctxAvailable = !!ctx?.GD;
    state.cAvailable = !!c?.effects;
    return true;
  },
});

var ctxLegacyFactory = combineSlices([ctxLegacySlice]);
var ctxLegacyReducer = ctxLegacyFactory(createTestCtx());

var state12 = { ctxAvailable: false, cAvailable: false };
ctxLegacyReducer(state12, { type: 'ANY' }, createTestC());
assertEqual(state12.ctxAvailable, true, '12a: ctx available');
assertEqual(state12.cAvailable, true, '12b: c available');

// ── 13. Empty combineSlices ──────────────────────────────

console.log('── 13. empty combineSlices ──');

var emptyFactory = combineSlices([]);
var emptyReducer = emptyFactory(ctx);
var state13 = { x: 1 };
emptyReducer(state13, { type: 'ANY' }, createTestC());
assertEqual(state13.x, 1, '13: empty slices no-op');

// Store boundary: an unowned action must abort the Immer transaction and be
// attached to the shared error report instead of becoming a silent no-op.
console.log('── 14. Store dispatch rollback ──');

var storeBefore = useGameStore.getState();
var indexBefore = storeBefore._actionIndex;
var dayActionsBefore = JSON.stringify(storeBefore._dayActions || []);
var trackingBefore = JSON.stringify(storeBefore.behaviorTracking || {});
var storeError = null;
var originalConsoleError = console.error;
console.error = function () {};
try {
  useGameStore.getState().dispatch({ type: '__UNOWNED_TEST_ACTION__' });
} catch (e) {
  storeError = e;
} finally {
  console.error = originalConsoleError;
}
var storeAfter = useGameStore.getState();
assertEqual(storeError?.name, 'UnhandledActionError', '14a: unowned Store action throws in tests');
assertEqual(storeAfter, storeBefore, '14b: Zustand state reference unchanged after rollback');
assertEqual(storeAfter._actionIndex, indexBefore, '14c: action index rolls back');
assertEqual(JSON.stringify(storeAfter._dayActions || []), dayActionsBefore, '14d: before-hook changes roll back');
assertEqual(JSON.stringify(storeAfter.behaviorTracking || {}), trackingBefore, '14e: profiling changes roll back');
var trackerReport = errorTracker.toJSON();
var failedStep = trackerReport.recentSteps
  .slice()
  .reverse()
  .find(function (entry) { return entry.type === '__UNOWNED_TEST_ACTION__'; });
assertEqual(failedStep?.outcome, 'failed', '14f: failed dispatch is recorded');
assertEqual(failedStep?.errorContext?.phase, 'routing', '14g: failure report records routing phase');

// ═══════════════════════════════════════════════════════════════
// Results (compatible with run_all.cjs parsing)
// ═══════════════════════════════════════════════════════════════

console.log('\n══════════════════════════════════════════');
console.log(' Results');
console.log('══════════════════════════════════════════');
console.log('  ' + passed + ' passed, ' + failed + ' failed');
console.log('');

if (failed > 0) {
  console.log('Failures:');
  errors.forEach(function (e, i) {
    console.log('  [' + (i + 1) + '] ' + e);
  });
  console.log('');
  process.exit(1);
}

// JSON output for CI / regression detection
process.stdout.write(
  JSON.stringify({
    timestamp: new Date().toISOString(),
    passed: passed,
    failed: failed,
    errors: errors,
  }, null, 2) + '\n'
);
