// scripts/benchmark/suites/reducerThroughput.cjs
// Measures raw dispatch throughput of the Zustand store.
//
// Benchmarks:
//   1. Simple SET action (field mutation)
//   2. Complex action (multi-field update + effects)
//   3. Unhandled action (no-op routing)

// Setup src path
var path = require('path');
var SRC = path.join(__dirname, '..', '..', '..', 'src');

// We can't easily import the full store (depends on React/Vite),
// so we benchmark the combineSlices rootReducer directly
// with mock state — this isolates slice handler throughput.

var combineSlices = require(path.join(SRC, 'state', 'combineSlices.js'));
var gameConstants = require(path.join(SRC, 'state', 'gameConstants.js'));

// ── Slice stubs (minimal handlers for throughput measurement) ──

function makeCounterSlice() {
  return combineSlices.createSlice({
    name: 'bench_counter',
    ownedFields: ['count'],
    initialState: { count: 0 },
    reducers: {
      INCREMENT: function (state) { state.count++; },
      ADD: function (state, action) { state.count += (action.payload || 1); },
    },
  });
}

function makeStateSlice() {
  return combineSlices.createSlice({
    name: 'bench_state',
    ownedFields: ['san', 'ap', 'food'],
    initialState: { san: 60, ap: 12, food: 3 },
    reducers: {
      MODIFY_SAN: function (state, action) { state.san += (action.payload || 0); },
      MODIFY_AP: function (state, action) { state.ap = Math.max(0, state.ap + (action.payload || 0)); },
      MODIFY_FOOD: function (state, action) { state.food += (action.payload || 0); },
    },
  });
}

// ── Build root reducer ──

var counterSlice = makeCounterSlice();
var stateSlice = makeStateSlice();
var rootFactory = combineSlices.combineSlices([counterSlice, stateSlice]);

function makeCtx() {
  return { GD: { events: [], npcs: [], systems: {} } };
}

var rootReducer = rootFactory(makeCtx());

// ── Benchmark actions ──

var simpleState = { count: 0, san: 60, ap: 12, food: 3 };
var complexState = { count: 0, san: 60, ap: 12, food: 3 };

function simpleAction() {
  rootReducer(simpleState, { type: 'INCREMENT' }, {});
}

function complexAction() {
  rootReducer(complexState, { type: 'MODIFY_SAN', payload: -1 }, {});
  rootReducer(complexState, { type: 'MODIFY_AP', payload: -1 }, {});
}

function noopAction() {
  rootReducer(simpleState, { type: 'UNKNOWN_ACTION_TYPE_XYZ' }, {});
}

// ── Export ──

module.exports = {
  name: 'reducer-throughput',
  run: function () {
    return {
      'simple SET (INCREMENT)': simpleAction,
      'complex multi-field (SAN+AP)': complexAction,
      'unhandled action (no-op)': noopAction,
    };
  },
};
