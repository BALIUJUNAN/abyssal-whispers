#!/usr/bin/env node
import assert from 'assert';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { initialState } from '../src/state/initialState.js';
import { applyEffects, applyLegacyEffects } from '../src/reducers/effectReducer.js';
import { getResourceFraudState } from '../src/systems/resourceFraud.js';
import { applyUgcToGD } from '../src/utils/buildEventPool.js';
import { emit } from '../src/engine/eventBus.js';
import { handleCoreAction } from '../src/reducers/slices/coreSlice.js';
import { handleNpcAction } from '../src/reducers/slices/npcSlice.js';
import { getCoverageReport } from '../src/data/registry/eventRegistry.js';
import {
  getInProgressConclusions,
  isEvidenceSatisfied,
} from '../src/reducers/conclusionReducer.js';

var passed = 0;
var failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log('  PASS ' + name);
  } catch (error) {
    failed++;
    console.error('  FAIL ' + name + ': ' + error.message);
  }
}

console.log('=== Regression coverage ===');

await test('low SAN resource fraud works without an implicit GD global', function () {
  var fraud = getResourceFraudState(10);
  assert.strictEqual(fraud.active, true);
  assert.strictEqual(fraud.level, 6);
  assert.strictEqual(fraud.realMult, 0.5);
});

await test('legacy effects never mutate shared event definitions', function () {
  var effectDefinition = {
    food: 4,
    add_item: { item_id: 'shared_item', name: 'Shared item' },
  };
  var original = structuredClone(effectDefinition);
  var state = { san: 10, inventory: [], clues: [] };
  var rng = { next: function () { return 0.99; } };

  applyLegacyEffects(state, effectDefinition, rng);

  assert.deepStrictEqual(effectDefinition, original);
  assert.strictEqual(state.food, 2);
  assert.strictEqual(state._foodDelta, 0);
  assert.strictEqual(state.inventory.length, 0);
});

await test('dice effects consume the reducer RNG', function () {
  var state = { hp: 1, maxHp: 20, san: 60, maxSan: 100, stats: {} };
  var rng = { intBetween: function () { return 4; } };
  applyEffects(state, { type: 'modify_stat', target: 'HP', amount_dice: '2d6' }, { rng: rng });
  assert.strictEqual(state.hp, 9);
});

await test('every slice action case is registered exactly once', function () {
  var here = dirname(fileURLToPath(import.meta.url));
  var sourceRoot = join(here, '..', 'src');
  var storeSource = readFileSync(join(sourceRoot, 'state', 'useGameStore.js'), 'utf8');
  var registrySource = storeSource.slice(
    storeSource.indexOf('var coreSlice'),
    storeSource.indexOf('var createRootReducer')
  );
  var registered = Array.from(registrySource.matchAll(/['\"]([A-Z][A-Z0-9_]+)['\"]/g), function (m) {
    return m[1];
  });
  var duplicates = registered.filter(function (action, index) {
    return registered.indexOf(action) !== index;
  });
  assert.deepStrictEqual(duplicates, []);

  var sliceDir = join(sourceRoot, 'reducers', 'slices');
  var actionCases = [];
  for (const file of readdirSync(sliceDir).filter(function (name) { return name.endsWith('Slice.js'); })) {
    var source = readFileSync(join(sliceDir, file), 'utf8');
    for (const match of source.matchAll(/case\s+['\"]([A-Z][A-Z0-9_]+)['\"]/g)) {
      actionCases.push(match[1]);
    }
  }
  var missing = Array.from(new Set(actionCases.filter(function (action) {
    return !registered.includes(action);
  })));
  assert.deepStrictEqual(missing, []);
});

await test('initialState receives GD explicitly', function () {
  var GD = {
    systems: {
      player: {
        starting_items: {
          starting_items: [{ name: '测试物品', uses: 2 }],
        },
      },
    },
  };
  var state = initialState(GD);
  assert.strictEqual(state.inventory.length, 1);
  assert.strictEqual(state.inventory[0].name, '测试物品');
  assert.strictEqual(state.inventory[0].uses, 2);
  assert.doesNotThrow(function () { initialState(); });
});

await test('NEW_GAME replaces state through the real Zustand dispatch path', async function () {
  var storage = new Map();
  globalThis.localStorage = {
    getItem: function (key) { return storage.has(key) ? storage.get(key) : null; },
    setItem: function (key, value) { storage.set(key, String(value)); },
    removeItem: function (key) { storage.delete(key); },
    clear: function () { storage.clear(); },
  };
  globalThis.window = { localStorage: globalThis.localStorage };

  var here = dirname(fileURLToPath(import.meta.url));
  var GD = JSON.parse(readFileSync(join(here, '..', 'src', 'data', 'game_base.json'), 'utf8'));
  var storeModule = await import('../src/state/useGameStore.js');
  var store = storeModule.useGameStore;
  store.getState().seedState(GD);
  store.setState({
    day: 9,
    ap: 1,
    food: 5,
    money: 77,
    loopCount: 2,
    hp: 0,
    screen: 'ending',
    ending: { id: 'probe' },
    difficultyLevel: 3,
    difficulty: 'nightmare',
  });

  store.getState().dispatch({ type: 'NEW_GAME' });
  var after = store.getState();
  assert.strictEqual(after.day, 1);
  assert.strictEqual(after.loopCount, 3);
  assert.notStrictEqual(after.hp, 0);
  assert.strictEqual(after.ending, null);
  assert.strictEqual(after.difficultyLevel, 3);
  assert.strictEqual(after._GD, GD);
  assert.strictEqual(typeof after.dispatch, 'function');
  assert.strictEqual(typeof after.seedState, 'function');
});

await test('manual save and CONTINUE_GAME preserve the complete persisted state', async function () {
  var here = dirname(fileURLToPath(import.meta.url));
  var GD = JSON.parse(readFileSync(join(here, '..', 'src', 'data', 'game_base.json'), 'utf8'));
  var Save = await import('../src/engine/SaveManager.js');
  var Migration = await import('../src/reducers/saveMigration.js');
  var store = (await import('../src/state/useGameStore.js')).useGameStore;
  Save.configureSaveManager({
    SAVE_VERSION: Migration.SAVE_VERSION,
    migrateSaveData: Migration.migrateSaveData,
    toPersistedState: Migration.toPersistedState,
    persistedStateKeys: Migration.getPersistedStateKeys(GD),
  });

  store.getState().seedState(GD);
  store.setState({
    screen: 'game',
    day: 9,
    ap: 1,
    food: 5,
    money: 77,
    loopCount: 4,
    runSeed: 'round_trip_seed',
    hp: 3,
    san: 22,
    currentArea: 'town_square',
    npcStates: { probe_npc: { dead: true } },
    objectives: [{ id: 'probe', complete: true }],
    triggeredEvents: ['probe_event'],
  });

  assert.strictEqual(Save.manualSave('manual_1', store.getState()), true);
  var raw = JSON.parse(globalThis.localStorage.getItem('coc_save_manual_1'));
  assert.strictEqual(Object.prototype.hasOwnProperty.call(raw.state, '_GD'), false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(raw.state, 'dispatch'), false);

  var loaded = Save.loadSlot('manual_1');
  store.getState().seedState(GD);
  store.getState().dispatch({ type: 'CONTINUE_GAME', savedState: loaded });
  var after = store.getState();
  assert.strictEqual(after.day, 9);
  assert.strictEqual(after.ap, 1);
  assert.strictEqual(after.food, 5);
  assert.strictEqual(after.money, 77);
  assert.strictEqual(after.loopCount, 4);
  assert.strictEqual(after.runSeed, 'round_trip_seed');
  assert.deepStrictEqual(after.npcStates, { probe_npc: { dead: true } });
  assert.deepStrictEqual(after.objectives, [{ id: 'probe', complete: true }]);
  assert.deepStrictEqual(after.triggeredEvents, ['probe_event']);
});

await test('real Store exploration can read and mutate triggered-event Sets', async function () {
  var here = dirname(fileURLToPath(import.meta.url));
  var GD = JSON.parse(readFileSync(join(here, '..', 'src', 'data', 'game_base.json'), 'utf8'));
  var store = (await import('../src/state/useGameStore.js')).useGameStore;
  store.getState().seedState(GD);
  store.setState({
    screen: 'game',
    currentArea: 'town_center',
    ap: 12,
    _triggeredSet: new Set(),
    _silentSet: new Set(),
  });
  var beforeAp = store.getState().ap;
  var warnings = [];
  var oldWarn = console.warn;
  console.warn = function () { warnings.push(Array.from(arguments).join(' ')); };
  try {
    store.getState().dispatch({ type: 'EXPLORE' });
  } finally {
    console.warn = oldWarn;
  }
  assert.strictEqual(store.getState().ap < beforeAp, true);
  assert.strictEqual(warnings.some(function (message) { return message.indexOf("plugin for 'MapSet'") >= 0; }), false);
});

await test('one unlocked alternative safehouse is visible in map mode', async function () {
  var here = dirname(fileURLToPath(import.meta.url));
  var GD = JSON.parse(readFileSync(join(here, '..', 'src', 'data', 'game_base.json'), 'utf8'));
  var helpers = await import('../src/utils/appHelpers.js');
  var hotspots = await import('../src/data/townHotspots.js');
  var state = initialState(GD);
  state._GD = GD;
  state.npcTrust = { '伊莱亚斯·沃德': 3, '希尔达·莫里斯': 0 };

  var available = helpers.getAvailableSafehouses(state, { GD: GD });
  assert.strictEqual(available.length, 1);
  assert.strictEqual(available[0].name, '教授的研究室');
  var visible = hotspots.getVisibleHotspots(state, { GD: GD });
  assert.strictEqual(visible.some(function (entry) { return entry.id === 'safehouse_alt'; }), true);
});

await test('legacy npc_changes apply trust and state changes', function () {
  var state = {
    san: 60,
    loopCount: 0,
    npcTrust: {},
    npcStates: {},
    metaEventFlags: {},
    inventory: [],
    clues: [],
    triggeredEvents: [],
    behaviorTracking: {},
  };

  applyLegacyEffects(state, {
    npc_changes: [
      '希尔达·莫里斯_trust+1',
      '约书亚·布莱克_memory_trigger',
      { npc: '玛莎·格雷', trust_change: 2, corruption_flag: 'martha_exposed' },
      { name: '伊莱亚斯·沃德', state: 'dead' },
    ],
  });

  assert.strictEqual(state.npcTrust['希尔达·莫里斯'], 1);
  assert.strictEqual(state.npcTrust['玛莎·格雷'], 2);
  assert.strictEqual(state.npcStates['约书亚·布莱克'].memoryTriggered, true);
  assert.strictEqual(state.npcStates['伊莱亚斯·沃德'].dead, true);
  assert.strictEqual(state.npcStates['玛莎·格雷'].corruptionFlags.martha_exposed, true);
  assert.strictEqual(state.metaEventFlags.martha_exposed, true);
});

await test('applyUgcToGD accepts an explicit empty mod list', function () {
  var GD = { events: [], npcs: [], items: [], areas: [], endings: [], systems: {} };
  var result = applyUgcToGD(GD, []);
  assert.deepStrictEqual(result, { added: 0, conflicts: [] });
  assert.strictEqual(GD._ugcEventCount, 0);
});

await test('rolling STR=50 still marks character stats as rolled', function () {
  var state = { stats: {}, skills: {} };
  var c = {
    rng: {
      intBetween: function () { return 5; },
    },
  };
  var ctx = {
    GD: {
      systems: {
        player: {
          default_template: {
            base_stats: {
              STR: { dice: '2d6', multiplier: 5 },
            },
          },
          archetypes: [],
        },
      },
    },
  };

  handleCoreAction(state, { type: 'ROLL_STATS' }, c, ctx);
  assert.strictEqual(state.stats.STR, 50);
  assert.strictEqual(state.statsRolled, true);
});

await test('NPC redemption applies trust, faction and behavior changes exactly once', function () {
  var npc = { name: '希尔达·莫里斯' };
  var state = {
    day: 1,
    san: 70,
    humanityScore: 50,
    narrative: [],
    runMemory: [],
    npcTrust: { hilda_morris: 2 },
    npcStates: { hilda_morris: { corrupted: true } },
    factionStanding: {},
    behaviorTracking: { redeemed_npcs: 0 },
    pendingNpc: { npc: npc, trust: 2, layer: null },
  };
  var rng = {
    next: function () { return 0.1; },
    intBetween: function (min) { return min; },
  };
  var c = {
    rng: rng,
    bt: state.behaviorTracking,
    effects: [],
    narr: function () {},
  };
  var ctx = {
    GD: {
      implementation_notes: {
        npc_redemption: {
          characters: {
            hilda_morris: { redemption_text: 'redemption' },
          },
        },
      },
    },
  };

  handleNpcAction(state, { type: 'NPC_RESPONSE', choice: 'redeem' }, c, ctx);

  assert.strictEqual(state.behaviorTracking.redeemed_npcs, 1);
  assert.strictEqual(state.npcTrust.hilda_morris, 5);
  assert.strictEqual(state.npcStates.hilda_morris.redeemed, true);
  assert.strictEqual(state.factionStanding.seal_keeper, 2);
});

await test('successful NPC attack records one kill and one relationship loss', function () {
  var npc = { name: '希尔达·莫里斯', chapter_1_role: 'core' };
  var state = {
    day: 1,
    ap: 3,
    hp: 20,
    san: 70,
    humanityScore: 50,
    skills: { 格斗: 100 },
    narrative: [],
    runMemory: [],
    npcTrust: { hilda_morris: 4 },
    npcStates: { hilda_morris: {} },
    factionStanding: {},
    behaviorTracking: { direct_kill_count: 0 },
    pendingNpc: { npc: npc, trust: 4, layer: null },
  };
  var rng = {
    next: function () { return 0.1; },
    intBetween: function (min) { return min; },
  };
  var c = {
    rng: rng,
    bt: state.behaviorTracking,
    effects: [],
    narr: function () {},
  };

  handleNpcAction(state, { type: 'NPC_RESPONSE', choice: 'attack' }, c, { GD: {} });

  assert.strictEqual(state.behaviorTracking.direct_kill_count, 1);
  assert.strictEqual(state.npcTrust.hilda_morris, 0);
  assert.strictEqual(state.npcStates.hilda_morris.dead, true);
  assert.strictEqual(state.factionStanding.seal_keeper, -3);
  assert.strictEqual(state.pendingNpc.postKill, true);
});

await test('runtime, desktop and title screen share the package version', function () {
  var here = dirname(fileURLToPath(import.meta.url));
  var root = join(here, '..');
  var packageVersion = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
  var tauriVersion = JSON.parse(readFileSync(join(root, 'src-tauri', 'tauri.conf.json'), 'utf8')).version;
  var cargoSource = readFileSync(join(root, 'src-tauri', 'Cargo.toml'), 'utf8');
  var titleSource = readFileSync(join(root, 'src', 'components', 'TitleScreen.jsx'), 'utf8');

  assert.strictEqual(tauriVersion, packageVersion);
  assert.strictEqual(cargoSource.match(/^version = "([^"]+)"/m)?.[1], packageVersion);
  assert.match(titleSource, /v\{packageJson\.version\}/);
});

await test('NPC response dispatch has no swallowed legacy moral post-processing', function () {
  var here = dirname(fileURLToPath(import.meta.url));
  var source = readFileSync(join(here, '..', 'src', 'reducers', 'slices', 'npcSlice.js'), 'utf8');
  assert.doesNotMatch(source, /processNpcMoralChoice/);
  assert.doesNotMatch(source, /catch\s*\([^)]*\)\s*\{\s*\}/);
});

await test('event coverage thresholds ignore contextual non-map scopes', function () {
  var events = [
    {
      id: 'context-only',
      _raw: { trigger: { areas: ['safehouse'] } },
      tier: 'normal',
      type: 'ambient',
      _category: 'test',
    },
    {
      id: 'world-area',
      _raw: { trigger: { areas: ['town_center'] } },
      tier: 'normal',
      type: 'ambient',
      _category: 'test',
    },
  ];
  var report = getCoverageReport(events, {
    areas: [{ id: 'town_center', name: 'Town center' }],
  });

  assert.strictEqual(report.byArea.safehouse.isCanonical, false);
  assert.deepStrictEqual(report.underServed.map(function (entry) { return entry.area; }), ['town_center']);
});

await test('conclusion progress uses evidence_pool and normalized NPC trust keys', function () {
  var state = {
    clues: [],
    triggeredEvents: [],
    npcTrust: { martha_grey: 4 },
    discoveredConclusions: [],
  };
  var trustEvidence = { source: '玛莎·格雷 trust>=4', description: 'trust evidence' };
  assert.strictEqual(isEvidenceSatisfied(trustEvidence, state), true);

  var GD = {
    systems: {
      clue_conclusion: {
        conclusions: [
          {
            id: 'harbor-truth',
            name: 'Harbor truth',
            required_evidence_count: 2,
            evidence_pool: [
              trustEvidence,
              { source: 'evt_harbor_log', description: 'event evidence' },
            ],
          },
        ],
      },
    },
  };
  var progress = getInProgressConclusions(state, { GD: GD });
  assert.strictEqual(progress.length, 1);
  assert.strictEqual(progress[0].satisfiedEvidence.length, 1);
  assert.strictEqual(progress[0].requiredEvidenceCount, 2);
});

await test('screen shake removes the normalized class', async function () {
  var classes = new Set();
  var root = {
    classList: {
      add: function (name) { classes.add(name); },
      remove: function (name) { classes.delete(name); },
    },
  };
  globalThis.document = {
    getElementById: function () { return root; },
    documentElement: root,
    querySelector: function () { return null; },
  };

  var sideEffects = await import('../src/runtime/eventSideEffects.js');
  emit('SCREEN_SHAKE', { intensity: 5, duration: 1 });
  assert.strictEqual(classes.has('screen-shake-3'), true);
  await new Promise(function (resolve) { setTimeout(resolve, 10); });
  assert.strictEqual(classes.has('screen-shake-3'), false);
  sideEffects.cleanupSideEffects();
  delete globalThis.document;
});

console.log('');
console.log('  ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
console.log('  ALL REGRESSION TESTS PASSED');
