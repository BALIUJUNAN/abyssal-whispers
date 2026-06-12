/**
 * Smoke Tests — Player flow integration tests.
 * These test the reducer logic via direct dispatch.
 * In Node.js: runs if gameReducer is globally accessible after bundle load.
 * In browser: can be loaded as a <script> tag after the game bundle.
 *
 * Run: node tests/test_smoke_flows.cjs
 */
(function (global) {
  'use strict';

  var passed = 0,
    failed = 0;
  function test(name, fn) {
    try {
      fn();
      passed++;
      global.console.log('  PASS: ' + name);
    } catch (e) {
      failed++;
      global.console.log('  FAIL: ' + name + ' -> ' + (e.message || e).split('\n')[0]);
    }
  }

  // Try to get gameReducer from various sources
  var gr = global.gameReducer;
  if (typeof gr !== 'function') {
    global.console.log('  SKIP: gameReducer not available in current environment');
    global.console.log('  INFO: Smoke tests require the game bundle to be loaded first.');
    global.console.log('  INFO: Run in browser or after a full build that exposes gameReducer.');
    global.console.log('\n=== Smoke Flow Tests ===');
    global.console.log('  0 passed, 0 failed (skipped)');
    return;
  }

  function makeState(overrides) {
    return Object.assign(
      {
        screen: 'title',
        san: 60,
        maxSan: 99,
        hp: 11,
        maxHp: 11,
        day: 1,
        loopCount: 0,
        pollution: 0,
        food: 3,
        maxFood: 5,
        money: 5,
        ap: 6,
        maxAp: 6,
        currentArea: 'town_center',
        visitedAreas: ['town_center'],
        triggeredEvents: [],
        npcTrust: {},
        npcStates: {},
        inventory: [],
        clues: [],
        skills: {},
        objectives: [],
        narrative: [],
        eventLog: [],
        stats: { STR: 50, CON: 55, DEX: 55, POW: 60, INT: 65, SIZ: 60, EDU: 70, APP: 50 },
        behaviorTracking: {},
        stats_run: {},
        longTermEffects: [],
        difficulty: 'normal',
        weather: '阴天',
        sealState: 'intact',
        currentSafehouse: 'main',
        safehouseCorruption: 0,
        tutorialSeen: {},
        _dayActions: [],
        _actionHistory: [],
        _effects: [],
      },
      overrides
    );
  }

  test('smoke: START_GAME -> prologue', function () {
    var next = gr(makeState(), { type: 'START_GAME' });
    if (next.screen !== 'prologue') throw new Error('Expected prologue, got ' + next.screen);
  });

  test('smoke: ROLL_STATS -> valid stats', function () {
    var next = gr(makeState({ screen: 'creation' }), { type: 'ROLL_STATS' });
    if (!next.stats || !next.stats.STR) throw new Error('Missing stats');
    if (next.hp <= 0) throw new Error('Invalid hp');
  });

  test('smoke: CONTINUE_GAME -> restores', function () {
    var saved = makeState({ day: 5, san: 42, currentArea: 'harbor_district' });
    var next = gr(makeState(), { type: 'CONTINUE_GAME', savedState: saved });
    if (next.screen !== 'game') throw new Error('Expected game, got ' + next.screen);
    if (next.day !== 5) throw new Error('Expected day 5, got ' + next.day);
  });

  test('smoke: NEW_GAME -> resets', function () {
    var s = makeState({ day: 10, san: 0, loopCount: 2, ending: { name: 'test' } });
    var next = gr(s, { type: 'NEW_GAME' });
    if (next.day !== 1) throw new Error('Expected day 1, got ' + next.day);
  });

  test('smoke: TALK_NPC -> pendingNpc set', function () {
    var s = makeState({ screen: 'game', ap: 3 });
    var next = gr(s, { type: 'TALK_NPC', npc: { name: 'test', trust_layers: [] } });
    if (!next.pendingNpc) throw new Error('pendingNpc not set');
  });

  test('smoke: MOVE -> area change', function () {
    var s = makeState({
      screen: 'game',
      ap: 3,
      currentArea: 'town_center',
      visitedAreas: ['town_center'],
      clues: [{ id: 'c1', name: 'test' }],
    });
    var next = gr(s, { type: 'MOVE', areaId: 'harbor_district', cost: 1 });
    if (next.currentArea !== 'harbor_district')
      throw new Error('Expected harbor_district, got ' + next.currentArea);
  });

  global.console.log('\n=== Smoke Flow Tests ===');
  global.console.log('  ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0 && typeof process !== 'undefined') process.exit(1);
})(
  typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : global
);
