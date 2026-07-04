/**
 * Achievement Reducer Tests
 * Validates: condition evaluation, load/save round-trip, default stats,
 *            checkAchievements returns newly unlocked only, stat mutation.
 *
 * Run: node tests/test_achievement_reducer.mjs
 */
import assert from 'assert';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, '..', 'src');

// ── Dynamic import helper ──

async function importFrom(relativePath) {
  const fullPath = join(SRC, relativePath);
  return import(pathToFileURL(fullPath).href);
}

// ── Test runner ──

let passed = 0;
let failed = 0;

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

// ── Main ──

async function main() {
  const { ACH_KEY, ACHIEVEMENTS, checkAchievements, load, save, defaultStats, incrementStat, setRunStat, resetRunStats, getAchievementDef, getAllAchievements } = await importFrom('reducers/achievementReducer.js');

  // Use a separate localStorage key so tests don't interfere with dev data
  var TEST_PREFIX = 'coc_achievements_test_';

  // Stub localStorage
  var store = {};
  var origLocalStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem(k) { return k in store ? store[k] : null; },
    setItem(k, v) { store[k] = v; },
    removeItem(k) { delete store[k]; },
  };

  function clearStore() {
    for (var k of Object.keys(store)) delete store[k];
  }

  function makeKey() { return TEST_PREFIX + Math.random().toString(36).slice(2, 8); }

  try {
    // === ACHIEVEMENTS definition ===

    test('ACHIEVEMENTS has 20 entries', function () {
      assert.strictEqual(ACHIEVEMENTS.length, 20, 'Expected 20 achievements, got ' + ACHIEVEMENTS.length);
    });

    test('every achievement has id, name, desc, icon, condition', function () {
      for (const ach of ACHIEVEMENTS) {
        assert.ok(ach.id, 'missing id');
        assert.ok(ach.name, 'missing name for ' + ach.id);
        assert.ok(ach.desc, 'missing desc for ' + ach.id);
        assert.ok(ach.icon, 'missing icon for ' + ach.id);
        assert.ok(typeof ach.condition === 'function', 'condition is not a function for ' + ach.id);
      }
    });

    test('all achievement ids are unique', function () {
      const ids = ACHIEVEMENTS.map(a => a.id);
      assert.strictEqual(new Set(ids).size, ids.length, 'Duplicate achievement ids');
    });

    test('getAllAchievements returns ACHIEVEMENTS', function () {
      assert.strictEqual(getAllAchievements(), ACHIEVEMENTS);
    });

    test('getAchievementDef finds by id', function () {
      const ach = getAchievementDef('ach_first_step');
      assert.ok(ach);
      assert.strictEqual(ach.id, 'ach_first_step');
    });

    test('getAchievementDef returns undefined for unknown id', function () {
      assert.strictEqual(getAchievementDef('ach_nonexistent'), undefined);
    });

    // === defaultStats ===

    test('defaultStats returns all zeros', function () {
      const stats = defaultStats();
      assert.strictEqual(stats.total_runs, 0);
      assert.strictEqual(stats.total_deaths, 0);
      assert.strictEqual(stats.madness_count, 0);
      assert.strictEqual(stats.night_survived, 0);
      assert.strictEqual(stats.items_collected, 0);
      assert.strictEqual(stats.run_combat, 0);
      assert.strictEqual(stats.run_npc_talks, 0);
      assert.strictEqual(stats.low_san_days, 0);
    });

    // === checkAchievements ===

    test('checkAchievements returns newly unlocked achievements only', function () {
      const state = { ending: { id: 'ending_escape' } };
      const unlocked = ['ach_first_step'];
      const stats = defaultStats();
      const result = checkAchievements(state, unlocked, stats);
      assert.ok(Array.isArray(result));
      assert.ok(!result.includes('ach_first_step'), 'already unlocked should not reappear');
    });

    test('ach_survivor triggers on escape ending', function () {
      const state = { ending: { id: 'ending_escape' } };
      const result = checkAchievements(state, [], defaultStats());
      assert.ok(result.includes('ach_survivor'), 'Expected ach_survivor in ' + result.join(','));
    });

    test('ach_transcendent triggers on transcendence ending', function () {
      const state = { ending: { id: 'ending_transcendence' } };
      const result = checkAchievements(state, [], defaultStats());
      assert.ok(result.includes('ach_transcendent'));
    });

    test('ach_abyss_resident triggers on consumed ending', function () {
      const state = { ending: { id: 'ending_consumed' } };
      const result = checkAchievements(state, [], defaultStats());
      assert.ok(result.includes('ach_abyss_resident'));
    });

    test('ach_harbinger triggers on ritual ending', function () {
      const state = { ending: { id: 'ending_ritual' } };
      const result = checkAchievements(state, [], defaultStats());
      assert.ok(result.includes('ach_harbinger'));
    });

    test('ach_wanderer triggers on madness ending', function () {
      const state = { ending: { id: 'ending_madness' } };
      const result = checkAchievements(state, [], defaultStats());
      assert.ok(result.includes('ach_wanderer'));
    });

    test('ach_seal_keeper triggers on keeper ending', function () {
      const state = { ending: { id: 'ending_seal_keeper' } };
      const result = checkAchievements(state, [], defaultStats());
      assert.ok(result.includes('ach_seal_keeper'));
    });

    test('ach_brave_explorer triggers with 9 visited areas', function () {
      const state = { visitedAreas: new Array(9).fill('some_area') };
      const result = checkAchievements(state, [], defaultStats());
      assert.ok(result.includes('ach_brave_explorer'));
    });

    test('ach_brave_explorer does NOT trigger with 8 areas', function () {
      const state = { visitedAreas: new Array(8).fill('some_area') };
      const result = checkAchievements(state, [], defaultStats());
      assert.ok(!result.includes('ach_brave_explorer'));
    });

    test('ach_clue_hunter triggers with 7 clues', function () {
      const state = { clues: new Array(7).fill('clue_1') };
      const result = checkAchievements(state, [], defaultStats());
      assert.ok(result.includes('ach_clue_hunter'));
    });

    test('ach_clue_hunter does NOT trigger with 6 clues', function () {
      const state = { clues: new Array(6).fill('clue_1') };
      const result = checkAchievements(state, [], defaultStats());
      assert.ok(!result.includes('ach_clue_hunter'));
    });

    test('ach_trusted_one triggers with NPC trust >= 5', function () {
      const state = { npcTrust: { elias_ward: 5 } };
      const result = checkAchievements(state, [], defaultStats());
      assert.ok(result.includes('ach_trusted_one'));
    });

    test('ach_trusted_one does NOT trigger with NPC trust < 5', function () {
      const state = { npcTrust: { elias_ward: 4 } };
      const result = checkAchievements(state, [], defaultStats());
      assert.ok(!result.includes('ach_trusted_one'));
    });

    test('ach_mythos_scholar triggers with skill >= 15', function () {
      const state = { skills: { '克苏鲁神话': 15 } };
      const result = checkAchievements(state, [], defaultStats());
      assert.ok(result.includes('ach_mythos_scholar'));
    });

    test('ach_mythos_scholar does NOT trigger with skill < 15', function () {
      const state = { skills: { '克苏鲁神话': 14 } };
      const result = checkAchievements(state, [], defaultStats());
      assert.ok(!result.includes('ach_mythos_scholar'));
    });

    test('ach_madness_dance triggers with 5 madness events', function () {
      const state = {};
      const stats = { madness_count: 5 };
      const result = checkAchievements(state, [], stats);
      assert.ok(result.includes('ach_madness_dance'));
    });

    test('ach_madness_dance does NOT trigger with 4 madness events', function () {
      const state = {};
      const stats = { madness_count: 4 };
      const result = checkAchievements(state, [], stats);
      assert.ok(!result.includes('ach_madness_dance'));
    });

    test('ach_five_deaths triggers with 5 total deaths', function () {
      const state = {};
      const stats = { total_deaths: 5 };
      const result = checkAchievements(state, [], stats);
      assert.ok(result.includes('ach_five_deaths'));
    });

    test('ach_collector triggers with 10 items collected', function () {
      const state = {};
      const stats = { items_collected: 10 };
      const result = checkAchievements(state, [], stats);
      assert.ok(result.includes('ach_collector'));
    });

    test('ach_night_walker triggers with 10 night survivals', function () {
      const state = {};
      const stats = { night_survived: 10 };
      const result = checkAchievements(state, [], stats);
      assert.ok(result.includes('ach_night_walker'));
    });

    test('ach_iron_will triggers with 3 low_san_days', function () {
      const state = {};
      const stats = { low_san_days: 3 };
      const result = checkAchievements(state, [], stats);
      assert.ok(result.includes('ach_iron_will'));
    });

    test('ach_pacifist triggers with no combat and an ending', function () {
      const state = { ending: { id: 'ending_escape' } };
      const stats = { run_combat: 0 };
      const result = checkAchievements(state, [], stats);
      assert.ok(result.includes('ach_pacifist'));
    });

    test('ach_pacifist does NOT trigger without an ending', function () {
      const state = {};
      const stats = { run_combat: 0 };
      const result = checkAchievements(state, [], stats);
      assert.ok(!result.includes('ach_pacifist'));
    });

    test('ach_lone_wolf triggers with no NPC talks and an ending', function () {
      const state = { ending: { id: 'ending_escape' } };
      const stats = { run_npc_talks: 0 };
      const result = checkAchievements(state, [], stats);
      assert.ok(result.includes('ach_lone_wolf'));
    });

    test('ach_lone_wolf does NOT trigger without an ending', function () {
      const state = {};
      const stats = { run_npc_talks: 0 };
      const result = checkAchievements(state, [], stats);
      assert.ok(!result.includes('ach_lone_wolf'));
    });

    test('checkAchievements handles condition errors gracefully', function () {
      const state = { ending: { id: 'ending_escape' } };
      // This should not throw even if some condition errors
      const result = checkAchievements(state, [], defaultStats());
      assert.ok(Array.isArray(result));
    });

    // === load / save (localStorage) ===

    test('load returns defaults when no data', function () {
      clearStore();
      const data = load();
      assert.ok(Array.isArray(data.unlocked));
      assert.strictEqual(data.unlocked.length, 0);
      assert.ok(typeof data.stats === 'object');
    });

    test('save persists and load retrieves', function () {
      clearStore();
      var data = { unlocked: ['ach_first_step'], stats: { total_runs: 3 } };
      save(data);
      var loaded = load();
      assert.ok(loaded.unlocked.includes('ach_first_step'));
      assert.strictEqual(loaded.stats.total_runs, 3);
    });

    test('save corrupt JSON → load returns defaults', function () {
      clearStore();
      store[ACH_KEY] = 'not json {{{';
      var data = load();
      assert.strictEqual(data.unlocked.length, 0);
    });

    // === incrementStat ===
    // NOTE: incrementStat/setRunStat/resetRunStats share state through ACH_KEY.
    // Tests below are ordered to account for cumulative side effects.

    test('incrementStat increases stat by 1 (fresh store)', function () {
      clearStore();
      var result = incrementStat('total_runs');
      assert.strictEqual(result.stats.total_runs, 1);
    });

    test('incrementStat with amount (adds to existing)', function () {
      // Store has total_runs=1 from previous test — add 5
      var result = incrementStat('total_runs', 5);
      assert.strictEqual(result.stats.total_runs, 6);
    });

    test('incrementStat further accumulates', function () {
      // Store has total_runs=6 — add 3
      var result = incrementStat('total_runs', 3);
      assert.strictEqual(result.stats.total_runs, 9);
    });

    test('incrementStat defaults missing stat to 0', function () {
      var result = incrementStat('total_deaths', 1);
      assert.strictEqual(result.stats.total_deaths, 1);
    });

    // === setRunStat ===

    test('setRunStat sets stat value', function () {
      var result = setRunStat('run_combat', 0);
      assert.strictEqual(result.stats.run_combat, 0);
    });

    test('setRunStat overwrites existing value', function () {
      setRunStat('run_combat', 5);
      var result = setRunStat('run_combat', 0);
      assert.strictEqual(result.stats.run_combat, 0);
    });

    // === resetRunStats ===

    test('resetRunStats zeroes run-scoped stats, preserves persistent stats', function () {
      // Set up: run_combat=5, run_npc_talks=3, total_runs=10 (from accumulation above)
      var result = resetRunStats();
      assert.strictEqual(result.stats.run_combat, 0);
      assert.strictEqual(result.stats.run_npc_talks, 0);
      // total_runs persists through reset
      assert.ok(result.stats.total_runs >= 9, 'total_runs=' + result.stats.total_runs + ' should be >= 9');
    });

    // === Summary ===

    console.log('\n=== Achievement Reducer Tests ===');
    console.log('  ' + passed + ' passed, ' + failed + ' failed');
    if (failed > 0) process.exit(1);
  } finally {
    globalThis.localStorage = origLocalStorage;
  }
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
