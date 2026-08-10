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
import { createSeededRng } from '../src/utils/seededRng.js';
import { getSanTextVariant } from '../src/systems/sanityVisual.js';
import { pick } from '../src/reducers/utils.js';
import { getSanLevelLine } from '../src/systems/npcDialogue.js';
import { getDeathMetaEvents } from '../src/data/events/events_death_meta.js';
import { renderEventText } from '../src/systems/explore/textRenderingPipeline.js';
import { generateDeathFragments } from '../src/systems/deathLegacies.js';
import { AUDIO_PATHS, WEATHER_AMBIENT_MAP } from '../src/managers/AudioManager.js';
import { initCombat, executeCombatAction } from '../src/systems/combatSystem.js';
import { isAreaUnlocked } from '../src/utils/gameHelpers.js';
import { applyTextFragmentation } from '../src/systems/textFragmentation.js';
import { getNpcsHere } from '../src/utils/npcLocation.js';
import { handleUiAction } from '../src/reducers/slices/uiSlice.js';
import { getForcedProgressGuard } from '../src/reducers/objectiveReducer.js';
import { checkEndingLegacy } from '../src/reducers/endingReducer.js';
import { checkTrustGate } from '../src/utils/trustGates.js';

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

await test('area chapter gates unlock every authored region on its configured chapter', function () {
  var area = function (chapter, role) {
    return { chapter_unlock: chapter, chapter_1_role: role || 'rumor_only' };
  };
  assert.strictEqual(isAreaUnlocked(area('chapter_2'), { day: 3, clues: [] }), false);
  assert.strictEqual(isAreaUnlocked(area('chapter_2'), { day: 4, clues: [] }), true);
  assert.strictEqual(isAreaUnlocked(area('chapter_3'), { day: 7, clues: [] }), false);
  assert.strictEqual(isAreaUnlocked(area('chapter_3'), { day: 8, clues: [] }), true);
  assert.strictEqual(isAreaUnlocked(area('chapter_4', 'locked'), { day: 14, clues: [] }), false);
  assert.strictEqual(isAreaUnlocked(area('chapter_4', 'locked'), { day: 15, clues: [] }), true);
});

await test('low SAN fragmentation keeps short reset sentences type-safe', function () {
  var values = [0.5, 0, 0.5, 0, 0.5, 0, 0.5, 0];
  var index = 0;
  var rng = {
    next: function () {
      var value = values[index % values.length];
      index += 1;
      return value;
    },
  };
  var rendered = applyTextFragmentation('你来。门开。雾起。钟响。', 0, rng, {}, { GD: {} });
  assert.strictEqual(typeof rendered, 'string');
  assert.strictEqual(rendered.includes('undefined'), false);
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

await test('NPC dialogue selection is deterministic and recorded inside TALK_NPC', function () {
  var here = dirname(fileURLToPath(import.meta.url));
  var GD = JSON.parse(readFileSync(join(here, '..', 'src', 'data', 'game_base.json'), 'utf8'));
  var state = initialState(GD);
  state._GD = GD;
  state.ap = 12;
  state.weather = null;
  var npc = GD.npcs.find(function (entry) { return entry.name === '老费舍'; });
  var rng = createSeededRng('npc-dialogue-regression', 4);
  var c = {
    rng: rng,
    effects: [],
    bt: state.behaviorTracking,
    narr: function () {},
    log: function () {},
  };

  handleNpcAction(state, { type: 'TALK_NPC', npc: npc }, c, { GD: GD });

  assert.strictEqual(typeof state.pendingNpc.contextualLine.text, 'string');
  assert.strictEqual(
    state._seenContextualLines['老费舍'].includes(state.pendingNpc.contextualLine.text),
    true
  );
  assert.strictEqual(
    typeof getSanLevelLine('老费舍', 5, createSeededRng('npc-san-line', 1)),
    'string'
  );
});

await test('SAN text corruption uses the supplied RNG for character picks', function () {
  var ctx = {
    GD: {
      systems: {
        sanity: { san_stages: [{ id: 'narrative_death', range: [0, 10], level: 6 }] },
      },
    },
  };
  var oldRandom = Math.random;
  try {
    Math.random = function () { return 0; };
    var first = getSanTextVariant(
      '字'.repeat(2000), 5, pick, ctx, createSeededRng('san-text-regression', 7)
    );
    Math.random = function () { return 0.99; };
    var second = getSanTextVariant(
      '字'.repeat(2000), 5, pick, ctx, createSeededRng('san-text-regression', 7)
    );
    assert.strictEqual(first, second);
  } finally {
    Math.random = oldRandom;
  }
});

await test('dynamic death-meta descriptions resolve to text before rendering', function () {
  var evt = getDeathMetaEvents().find(function (entry) {
    return entry.id === 'death_meta_fragment_echo';
  });
  var state = {
    loopCount: 2,
    loopEchoes: { deadNpcAreas: [] },
    deathFragments: [{ text: '测试碎片' }],
    currentArea: 'town_center',
    san: 60,
    pollution: 0,
    fearTuning: null,
    lightLevel: 3,
    infection: 0,
    fatigue: 0,
    food: 10,
    seenEventTexts: {},
    difficultyLevel: 1,
    currentChapter: 'chapter_1',
    mythosLevel: 0,
  };
  var ctx = {
    GD: {
      systems: { sanity: { san_stages: [{ id: 'stable', range: [0, 100], level: 0 }] } },
    },
  };
  var rendered = renderEventText(
    { ...evt }, state, ctx, { rng: createSeededRng('death-meta-regression', 1) }
  );
  assert.strictEqual(typeof rendered, 'string');
  assert.strictEqual(rendered.includes('测试碎片'), true);
});

await test('death fragments are reproducible with the same reducer RNG', function () {
  var deathCtx = { mode: 'san', day: 9, loop: 2, area: 'harbor_district' };
  var firstState = { deathFragments: [] };
  var secondState = { deathFragments: [] };
  generateDeathFragments(firstState, deathCtx, createSeededRng('death-fragment-regression', 3));
  generateDeathFragments(secondState, deathCtx, createSeededRng('death-fragment-regression', 3));
  assert.deepStrictEqual(firstState.deathFragments, secondState.deathFragments);
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

await test('presentation-only dispatch does not advance the gameplay RNG cursor', async function () {
  var here = dirname(fileURLToPath(import.meta.url));
  var GD = JSON.parse(readFileSync(join(here, '..', 'src', 'data', 'game_base.json'), 'utf8'));
  var store = (await import('../src/state/useGameStore.js')).useGameStore;
  store.getState().seedState(GD);
  store.setState({ _actionIndex: 11, san: 99, glitchPulse: 0 });

  store.getState().dispatch({
    type: 'GLITCH_PULSE',
    strength: 4,
    meta: { consumeGameplayRng: false },
  });

  assert.strictEqual(store.getState().glitchPulse, 4);
  assert.strictEqual(store.getState()._actionIndex, 11);
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

  assert.strictEqual(state.npcTrust.hilda_morris, 1);
  assert.strictEqual(state.npcTrust.martha_grey, 2);
  assert.strictEqual(state.npcStates.joshua_black.memoryTriggered, true);
  assert.strictEqual(state.npcStates.elias_ward.dead, true);
  assert.strictEqual(state.npcStates.martha_grey.corruptionFlags.martha_exposed, true);
  assert.strictEqual(state.npcTrust['希尔达·莫里斯'], undefined);
  assert.strictEqual(state.metaEventFlags.martha_exposed, true);
});

await test('localized NPC effects update canonical trust instead of creating shadow keys', function () {
  var state = {
    san: 60,
    loopCount: 0,
    npcTrust: { martha_grey: 2 },
    npcStates: {},
    inventory: [],
    clues: [],
    triggeredEvents: [],
    behaviorTracking: {},
  };
  applyLegacyEffects(state, { npc_trust: { '玛莎·格雷': 1 } });
  applyEffects(state, { type: 'modify_npc_trust', npc_id: '玛莎·格雷', amount: 1 });
  assert.strictEqual(state.npcTrust.martha_grey, 4);
  assert.strictEqual(state.npcTrust['玛莎·格雷'], undefined);
});

await test('canonical death state hides NPCs authored with localized names', function () {
  var state = {
    day: 1,
    currentArea: 'harbor_district',
    npcStates: { old_fisher: { dead: true } },
    npcLocations: { '老费舍': 'harbor_district' },
  };
  var npcs = getNpcsHere(state, {
    GD: { npcs: [{ name: '老费舍', location: 'harbor_district', schedule: [] }] },
  });
  assert.deepStrictEqual(npcs, []);
});

await test('choice resolution runs the complete explore post-processing phase', function () {
  var here = dirname(fileURLToPath(import.meta.url));
  var GD = JSON.parse(readFileSync(join(here, '..', 'src', 'data', 'game_base.json'), 'utf8'));
  var state = initialState(GD);
  var logs = [];
  var evt = { id: 'test_choice_post', name: '选择后处理', tags: [] };
  state.pendingChoice = {
    evt: evt,
    choices: [{ label: '确认', text: '你作出了选择。', effects: {} }],
  };
  var c = {
    narr: function () {},
    log: function (message) { logs.push(message); },
    effects: [],
    bt: state.behaviorTracking,
    rng: createSeededRng('choice-post'),
  };
  handleUiAction(state, { type: 'CHOICE_SELECT', choiceIdx: 0 }, c, { GD: GD });
  assert.strictEqual(state.tutorialSeen.first_explore, true);
  assert.strictEqual(logs.includes('探索：选择后处理'), true);
});

await test('gamble resolution runs the complete explore post-processing phase', function () {
  var here = dirname(fileURLToPath(import.meta.url));
  var GD = JSON.parse(readFileSync(join(here, '..', 'src', 'data', 'game_base.json'), 'utf8'));
  var state = initialState(GD);
  var logs = [];
  var evt = { id: 'test_gamble_post', name: '赌博后处理', sanity_damage: 0, effects: {}, tags: [] };
  state.pendingGamble = {
    evt: evt,
    options: [{ id: 'safe', text: '你及时收手。' }],
  };
  var c = {
    narr: function () {},
    log: function (message) { logs.push(message); },
    effects: [],
    bt: state.behaviorTracking,
    rng: createSeededRng('gamble-post'),
  };
  handleUiAction(state, { type: 'GAMBLE_CHOICE', choiceId: 'safe' }, c, { GD: GD });
  assert.strictEqual(state.tutorialSeen.first_explore, true);
  assert.strictEqual(logs.includes('探索：赌博后处理'), true);
});

await test('overdue critical progress guards cannot expire permanently', function () {
  var state = {
    day: 11,
    clues: [],
    completedChains: [],
    triggeredEvents: [
      'guard_harbor_chain_fired',
      'guard_morris_chain_fired',
      'guard_heretical_chain_fired',
    ],
  };
  var rng = { next: function () { return 0.999999; } };
  var guard = getForcedProgressGuard(state, { GD: {} }, rng);
  assert.strictEqual(guard.id, 'guard_lighthouse_signal');
});

await test('day 28 remains playable before the unresolved time-limit ending', function () {
  var GD = {
    module7_endings: [
      { id: 'ending_bad_ritual', name: '异端的胜利', type: 'bad', description: '封印破碎。' },
    ],
  };
  var base = { san: 60, currentArea: 'town_center' };
  assert.strictEqual(checkEndingLegacy({ ...base, day: 28 }, { GD: GD }), null);
  assert.strictEqual(checkEndingLegacy({ ...base, day: 29 }, { GD: GD }).id, 'ending_bad_ritual');
});

await test('max-trust gates do not require the clue chain they are needed to complete', function () {
  var base = {
    day: 15,
    clues: [],
    visitedAreas: ['voxchester_manor'],
    completedChains: [],
    discoveredConclusions: [],
    behaviorTracking: {},
  };
  assert.ok(checkTrustGate(5, base, '希尔达·莫里斯'));
  assert.strictEqual(
    checkTrustGate(5, { ...base, clues: [{ id: 'clue_m_1' }, { id: 'clue_m_2' }] }, '希尔达·莫里斯'),
    null
  );
  assert.ok(checkTrustGate(5, base, '伊莎贝拉·韦伯'));
  assert.strictEqual(
    checkTrustGate(5, { ...base, clues: [{ id: 'clue_h_1' }, { id: 'clue_h_2' }] }, '伊莎贝拉·韦伯'),
    null
  );
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

await test('non-verbal release audio pack is fully registered', function () {
  var requiredIds = [
    'combat_start', 'combat_attack', 'combat_hit', 'combat_miss',
    'combat_player_hurt', 'combat_monster_attack', 'combat_flee',
    'combat_victory', 'combat_item', 'combat_communicate',
    'ending_good', 'ending_bad', 'ending_hidden', 'ending_neutral',
    'weather_rain', 'weather_fog', 'weather_blood_moon',
    'safehouse_rest', 'safehouse_unsettled', 'safehouse_corrupt',
    'travel_footsteps', 'investigate_search', 'ritual_progress', 'ritual_complete',
  ];
  for (var i = 0; i < requiredIds.length; i += 1) {
    assert.match(AUDIO_PATHS[requiredIds[i]] || '', /^audio\/.+\.wav$/);
  }
  assert.strictEqual(WEATHER_AMBIENT_MAP['雨天'], 'weather_rain');
  assert.strictEqual(WEATHER_AMBIENT_MAP['大雾'], 'weather_fog');
  assert.strictEqual(WEATHER_AMBIENT_MAP['血月'], 'weather_blood_moon');
});

await test('successful combat attack emits attack, hit and victory audio', function () {
  var state = {
    difficulty: 'normal',
    skills: { 格斗: 100 },
    inventory: [],
    hp: 20,
    maxHp: 20,
    san: 70,
    maxSan: 99,
  };
  var combat = initCombat('deep_ones', 'trace', state);
  var effects = [];
  var c = {
    rng: {
      next: function () { return 0.1; },
      intBetween: function (min) { return min; },
    },
    effects: effects,
    bt: {},
    narr: function () {},
  };
  var result = executeCombatAction(combat, 'attack', {}, state, c, { GD: {} });
  var ids = effects.map(function (effect) { return effect.id; });
  assert.strictEqual(result.monsterDefeated, true);
  assert.deepStrictEqual(ids, ['combat_attack', 'combat_hit', 'combat_victory']);
});

console.log('');
console.log('  ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
console.log('  ALL REGRESSION TESTS PASSED');
