#!/usr/bin/env node

import assert from 'node:assert/strict';

import {
  auditAreaReachability,
  buildRunMatrix,
  collectPlayerFacingStrings,
  parseAuditArgs,
  stableSerialize,
  validateRuntimeState,
} from '../scripts/playability/audit-core.mjs';
import { initialState } from '../src/state/initialState.js';
import { applyLegacyEffects } from '../src/reducers/effectReducer.js';
import { createSeededRng } from '../src/utils/seededRng.js';
import { checkSilentEvent } from '../src/utils/appHelpers.js';
import { getAvailableNpcThreads } from '../src/systems/npc/probeThreadSystem.js';
import { NPC_THREAD_QUESTIONS } from '../src/data/npcContextualLines.js';
import { getDistortedName } from '../src/systems/textVariants.js';
import { resolveDeath } from '../src/reducers/deathSystem.js';

var passed = 0;
var failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log('  PASS ' + name);
  } catch (error) {
    failed += 1;
    console.log('  FAIL ' + name + ': ' + error.message);
  }
}

test('CLI parser applies release defaults and explicit overrides', function () {
  var config = parseAuditArgs([
    '--mode',
    'release',
    '--runs=7',
    '--max-actions',
    '99',
    '--seed',
    'probe',
  ]);
  assert.equal(config.mode, 'release');
  assert.equal(config.runs, 7);
  assert.equal(config.maxActions, 99);
  assert.equal(config.seed, 'probe');
  assert.equal(config.requireLateGame, true);
});

test('run matrix is deterministic and spans profiles/difficulties', function () {
  var config = parseAuditArgs(['--runs', '8', '--seed', 'matrix']);
  var first = buildRunMatrix(config);
  var second = buildRunMatrix(config);
  assert.deepEqual(first, second);
  assert.equal(
    new Set(
      first.map(function (row) {
        return row.profile;
      })
    ).size,
    4
  );
  assert.deepEqual(
    first.slice(0, 4).map(function (row) {
      return row.difficulty;
    }),
    [1, 4, 8, 13]
  );
});

test('stable serializer ignores object insertion order', function () {
  assert.equal(stableSerialize({ b: 2, a: 1 }), stableSerialize({ a: 1, b: 2 }));
});

test('runtime invariant catches resource underflow', function () {
  var GD = { areas: [{ id: 'town_center', connected_areas: [] }] };
  var state = initialState(GD);
  state.food = -1;
  var failures = validateRuntimeState(state, GD);
  assert.ok(
    failures.some(function (failure) {
      return failure.code === 'STATE_RANGE' && failure.field === 'food';
    })
  );
});

test('area audit detects a one-way topology edge', function () {
  var GD = {
    areas: [
      { id: 'town_center', name: 'Town', connected_areas: ['harbor'], chapter_unlock: 'chapter_1' },
      { id: 'harbor', name: 'Harbor', connected_areas: [], chapter_unlock: 'chapter_1' },
    ],
    events: [],
    clue_chains: [],
  };
  var result = auditAreaReachability(GD);
  assert.ok(
    result.failures.some(function (failure) {
      return failure.code === 'AREA_EDGE_ONE_WAY';
    })
  );
});

test('player-facing collector preserves the source field kind', function () {
  var result = collectPlayerFacingStrings({
    events: [
      { name: '一个足够长的事件标题', description: '这是一段足够长的事件正文，用来验证收集器。' },
    ],
  });
  assert.ok(
    result.rows.some(function (row) {
      return row.key === 'name';
    })
  );
  assert.ok(
    result.rows.some(function (row) {
      return row.key === 'description';
    })
  );
});

test('legacy resource effects clamp and apply their declared item cost', function () {
  var state = {
    san: 80,
    food: 1,
    maxFood: 5,
    starvationDays: 0,
    lightLevel: 1,
    harborRiskReduction: 0,
    tempSkillBonus: null,
    inventory: [{ id: 'flashlight', name: '手电筒', uses: 1 }],
    clues: [],
    stats: {},
  };
  var warnings = [];
  var oldWarn = console.warn;
  console.warn = function () {
    warnings.push(Array.from(arguments).join(' '));
  };
  try {
    applyLegacyEffects(
      state,
      {
        food: -3,
        light: 2,
        harbor_night_risk_reduction: 0.1,
        investigation_bonus: 2,
        remove_item: { item_id: 'flashlight' },
      },
      createSeededRng('legacy-effects', 0)
    );
  } finally {
    console.warn = oldWarn;
  }
  assert.equal(state.food, 0);
  assert.equal(state.lightLevel, 3);
  assert.equal(state.harborRiskReduction, 0.1);
  assert.deepEqual(state.tempSkillBonus, { skill: '侦查', bonus: 2, days: 1 });
  assert.equal(state.inventory.length, 0);
  assert.deepEqual(warnings, []);
});

test('silent events use seeded choice and synchronize their Set index', function () {
  var GD = {
    implementation_notes: {
      silent_events: {
        event_pool: [
          { id: 'silent_a', location: 'safehouse', repeat_behavior: 'only_once', text: 'A' },
          { id: 'silent_b', location: 'safehouse', repeat_behavior: 'only_once', text: 'B' },
        ],
      },
    },
  };
  function makeState() {
    return {
      day: 3,
      san: 60,
      maxSan: 99,
      safehouseCorruption: 0,
      triggeredSilentEvents: [],
      _silentSet: new Set(),
    };
  }
  var first = makeState();
  var second = makeState();
  checkSilentEvent(first, function () {}, 'safehouse', GD, createSeededRng('silent', 2));
  checkSilentEvent(second, function () {}, 'safehouse', GD, createSeededRng('silent', 2));
  assert.deepEqual(first.triggeredSilentEvents, second.triggeredSilentEvents);
  assert.equal(first._silentSet.has(first.triggeredSilentEvents[0]), true);
});

test('NPC follow-up candidates disappear after resolution', function () {
  var npcName = Object.keys(NPC_THREAD_QUESTIONS)[0];
  var authored = NPC_THREAD_QUESTIONS[npcName];
  assert.ok(authored.length > 0);
  assert.ok(getAvailableNpcThreads(npcName, 5, {}).length > 0);
  var states = {};
  authored.forEach(function (thread) {
    states[npcName + '_' + thread.id] = { depth: 3, resolved: true };
  });
  assert.deepEqual(getAvailableNpcThreads(npcName, 5, states), []);
});

test('area display fallback is stable across UI renders', function () {
  var area = { id: 'town_center', name: '沃切斯特镇中心' };
  var state = {
    runSeed: 'area-display-test',
    day: 12,
    san: 1,
    pollution: 1,
    lightLevel: 0,
    infection: 100,
    loopCount: 2,
    lastVisitedDates: {},
    areaNameCache: {},
  };
  assert.equal(getDistortedName(area, state), getDistortedName(area, state));
});

test('death attribution is deterministic when reducer RNG is supplied', function () {
  var state = {
    hp: 0,
    san: 40,
    food: 0,
    currentArea: 'harbor_district',
    day: 6,
    loopCount: 0,
    behaviorTracking: {},
    triggeredEvents: [],
    clues: [],
  };
  var first = resolveDeath(
    state,
    { id: 'probe', name: 'Probe', tags: ['water'] },
    null,
    createSeededRng('death', 9)
  );
  var second = resolveDeath(
    state,
    { id: 'probe', name: 'Probe', tags: ['water'] },
    null,
    createSeededRng('death', 9)
  );
  assert.deepEqual(first, second);
});

console.log('');
console.log(passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
