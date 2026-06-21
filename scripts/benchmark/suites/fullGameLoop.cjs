// scripts/benchmark/suites/fullGameLoop.cjs
// Stress test: simulate 1000 dispatches with realistic action mix.
// Measures overall game loop throughput (state transitions per second).

var path = require('path');
var SRC = path.join(__dirname, '..', '..', '..', 'src');

var combineSlices = require(path.join(SRC, 'engine', 'combineSlices.js'));
var gameConstants = require(path.join(SRC, 'state', 'gameConstants.js'));

// ── Build realistic slice set ──

var ACTION_TYPES = [
  'REST', 'WORK', 'BUY_FOOD',
  'MOVE', 'EXPLORE', 'DO_SKILL_CHECK',
  'TALK_NPC', 'NPC_RESPONSE',
  'CHOICE_SELECT', 'DISMISS_PENDING',
  'GAMBLE_CHOICE', 'USE_ITEM',
  'RESIST_SAN_DRAIN', 'GLITCH_PULSE',
];

var slice = combineSlices.createSlice({
  name: 'stress',
  ownedFields: ['ap', 'san', 'food', 'hp', 'day'],
  initialState: { ap: 12, san: 60, food: 3, hp: 11, day: 1 },
  reducers: {
    REST: function (state) { state.ap = state.maxAp; state.san = Math.min(99, state.san + 5); state.day++; },
    WORK: function (state) { state.ap -= 3; state.money = (state.money || 0) + 10; },
    BUY_FOOD: function (state) { state.ap -= 1; state.food += 2; state.money -= 5; },
    MOVE: function (state) { state.ap -= 2; },
    EXPLORE: function (state) { state.ap -= 3; state.san -= 2; },
    DO_SKILL_CHECK: function (state) { state.ap -= 1; },
    TALK_NPC: function (state) { state.ap -= 1; },
    NPC_RESPONSE: function (state) { state.ap -= 1; },
    CHOICE_SELECT: function (state) { state.ap -= 1; },
    GAMBLE_CHOICE: function (state) { state.ap -= 1; state.money += Math.random() > 0.5 ? 20 : -10; },
    USE_ITEM: function (state) { state.ap -= 1; },
    RESIST_SAN_DRAIN: function (state) { state.san -= 1; },
    GLITCH_PULSE: function (state) { state.glitchPulse = 5; },
  },
});

var factory = combineSlices.combineSlices([slice]);
var ctx = { GD: {} };
var reducer = factory(ctx);

// ── State fixture ──

var stressState = {
  ap: 12, san: 60, food: 3, hp: 11, day: 1,
  maxAp: 12, maxSan: 99, money: 20,
  maxHp: 11, inventory: [], clues: [],
  stats: {}, skills: {}, npcTrust: {},
  narrative: [], eventLog: [],
};

// ── Realistic dispatch pattern ──

function dispatchRandom() {
  var actionType = ACTION_TYPES[Math.floor(Math.random() * ACTION_TYPES.length)];
  var payload = Math.random() > 0.7 ? { amount: Math.floor(Math.random() * 5) } : undefined;
  reducer(stressState, { type: actionType, payload: payload }, { effects: [] });
}

// ── Constrained state (clamp values to prevent overflow in long runs) ──

function dispatchConstrained() {
  var idx = Math.floor(Math.random() * 5);
  var actions = ['REST', 'MOVE', 'EXPLORE', 'TALK_NPC', 'CHOICE_SELECT'];
  reducer(stressState, { type: actions[idx] }, { effects: [] });
  // Clamp to prevent overflow
  if (stressState.san > 99) stressState.san = 99;
  if (stressState.san < 0) stressState.san = 0;
  if (stressState.ap > 12) stressState.ap = 12;
  if (stressState.ap < 0) stressState.ap = 0;
  if (stressState.food > 20) stressState.food = 20;
}

// ── Export ──

module.exports = {
  name: 'full-game-loop',
  run: function () {
    return {
      '1000 dispatches (random actions)': function () {
        for (var i = 0; i < 1000; i++) dispatchRandom();
      },
      '1000 constrained dispatches': function () {
        for (var i = 0; i < 1000; i++) dispatchConstrained();
      },
    };
  },
};
