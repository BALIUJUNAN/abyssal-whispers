// scripts/benchmark/suites/loopInit.cjs
// Measures initLoopState performance — the core loop transition logic.
// Uses a lightweight mock to avoid full store dependency.

var path = require('path');
var SRC = path.join(__dirname, '..', '..', '..', 'src');

// We can't import loopReducer directly (it imports many modules with ESM).
// Instead, we benchmark the core algorithmic pattern:
// state field copying + filtering + array slicing — the actual work initLoopState does.

// ── Simulated initLoopState workload ──

function simulateLoopInit(prevState, loopCount) {
  // Mirrors the actual initLoopState work:
  // 1. Counter increments
  // 2. Array field copies with cap
  // 3. Object field spreads
  // 4. Conditional clamping

  var f = {};

  // Progress state
  f.day = 1;
  f.ap = 12;
  f.maxAp = 12;
  f.stats_run = {
    deaths: prevState.stats_run.deaths + 1,
    runs: prevState.stats_run.runs + 1,
    checks_passed: prevState.stats_run.checks_passed,
    checks_failed: prevState.stats_run.checks_failed,
    days_best: prevState.stats_run.days_best,
    max_san_loss_single: prevState.stats_run.max_san_loss_single,
    total_san_loss: prevState.stats_run.total_san_loss,
    deepest_area_danger: prevState.stats_run.deepest_area_danger,
  };

  // Loop state
  f.loopCount = loopCount;
  f.maxSan = Math.max(50, 99 - loopCount * 2);
  f.san = Math.min(prevState.san, f.maxSan);
  f.pollution = prevState.pollution + 0.05;

  // NPC trust: persist with decay
  var trustKeys = Object.keys(prevState.npcTrust || {});
  f.npcTrust = {};
  for (var i = 0; i < trustKeys.length; i++) {
    var k = trustKeys[i];
    f.npcTrust[k] = Math.max(0, Math.floor((prevState.npcTrust[k] || 0) * 0.85));
  }

  // Knowledge & conclusions: full carryover
  f.clues = prevState.clues ? prevState.clues.slice(-200) : [];
  f.discoveredConclusions = prevState.discoveredConclusions || [];

  // Behavior tracking: full carryover
  f.behaviorTracking = {};
  var btKeys = Object.keys(prevState.behaviorTracking || {});
  for (var j = 0; j < btKeys.length; j++) {
    f.behaviorTracking[btKeys[j]] = prevState.behaviorTracking[btKeys[j]];
  }

  // Ending history: cap at 50
  f.endingHistory = (prevState.endingHistory || []).slice(-50);

  // Triggered events: cap at 1000
  f.triggeredEvents = (prevState.triggeredEvents || []).slice(-1000);

  // Death context
  f.previousDeathContext = prevState.deathContext || null;
  f.lastDeathType = prevState.deathContext?.type || prevState.lastDeathType || null;

  // Run memory: cap at 12
  f.runMemory = (prevState.runMemory || []).slice(-12);

  return f;
}

// ── State fixtures ──

function makeState(loopIdx) {
  var bt = {};
  for (var i = 0; i < 40; i++) bt['counter_' + i] = Math.random();
  return {
    stats_run: { deaths: loopIdx, runs: loopIdx, checks_passed: 0, checks_failed: 0, days_best: 0, max_san_loss_single: 0, total_san_loss: 0, deepest_area_danger: 0 },
    san: 50 + Math.random() * 20,
    pollution: loopIdx * 0.05,
    npcTrust: { '玛莎·格雷': 3, '老费舍': 2, '伊莎贝拉·韦伯': 4, '希尔达·莫里斯': 1, '伊莱亚斯·沃德': 2, '汤米·陈': 3 },
    clues: Array.from({ length: 30 }, function (_, i) { return 'clue_' + i; }),
    discoveredConclusions: ['conclusion_1', 'conclusion_2'],
    behaviorTracking: bt,
    endingHistory: Array.from({ length: 10 }, function (_, i) { return { loop: i }; }),
    triggeredEvents: Array.from({ length: 500 }, function (_, i) { return 'evt_' + i; }),
    deathContext: { type: 'madness', mode: 'san' },
    lastDeathType: 'madness',
    runMemory: Array.from({ length: 8 }, function (_, i) { return 'memory_' + i; }),
  };
}

// ── Benchmark ──

function makePrevState() { return makeState(5); }

function initLoopBench() {
  var prev = makePrevState();
  return simulateLoopInit(prev, 6);
}

function initLoopHighLoop() {
  var prev = makeState(25);
  return simulateLoopInit(prev, 26);
}

// ── Export ──

module.exports = {
  name: 'loop-init',
  run: function () {
    return {
      'initLoopState (loop 5→6, 30 clues, 6 NPC, 40 BT)': initLoopBench,
      'initLoopState (loop 25→26, large state)': initLoopHighLoop,
    };
  },
};
