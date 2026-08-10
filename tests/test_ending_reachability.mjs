/**
 * tests/test_ending_reachability.mjs
 * Real ending-condition, clue-chain and final-choice integration tests.
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  CONDITION_VAR_MAP,
  checkEndingDataDriven,
  checkSingleCondition,
  parseConditionString,
} from '../src/reducers/endingReducer.js';
import { injectBehaviorEndings } from '../src/data/behavior_endings.js';
import { FEAR_ENDINGS, injectFearEndings } from '../src/data/events/events_fear_endings.js';
import { ENDING_EVENT_CHOICES, injectEndingChoices } from '../src/data/endingChoiceAdapters.js';
import { applyLegacyEffects } from '../src/reducers/effectReducer.js';
import { ENDING_FLAG_RESOLVERS } from '../src/systems/endingStateResolver.js';
import { checkChainCompletion } from '../src/utils/gameHelpers.js';
import { hasTriggered, rebuildTriggeredSet } from '../src/utils/triggeredSet.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const baseData = JSON.parse(fs.readFileSync(path.join(ROOT, 'game_base.json'), 'utf8'));
const chapterData = JSON.parse(fs.readFileSync(path.join(ROOT, 'game_ch2plus.json'), 'utf8'));

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  PASS: ' + name);
  } catch (error) {
    failed++;
    console.log('  FAIL: ' + name + ' -> ' + (error.message || String(error)).split('\n')[0]);
  }
}

function makeState(overrides) {
  var defaults = {
    day: 20,
    hp: 10,
    maxHp: 10,
    san: 60,
    maxSan: 99,
    currentArea: 'town_center',
    visitedAreas: ['town_center'],
    clues: [],
    completedChains: [],
    discoveredConclusions: [],
    inventory: [],
    npcTrust: {},
    npcStates: {},
    skills: {},
    triggeredEvents: [],
    unlockedEndingConditions: [],
    everTriggeredEvents: [],
    retainedKnowledge: [],
    fearTuning: null,
    mythosLevel: 0,
    humanityScore: 50,
    infection: 0,
    loopCount: 0,
    pollution: 0,
    safehouseCorruption: 0,
    sealState: 'intact',
    difficultyLevel: 1,
    behaviorTracking: {},
    _sealKnowledge: {},
  };
  var state = {
    ...defaults,
    ...(overrides || {}),
    behaviorTracking: {
      ...defaults.behaviorTracking,
      ...((overrides && overrides.behaviorTracking) || {}),
    },
  };
  rebuildTriggeredSet(state);
  return state;
}

function assertEndingReachable(endingId, state) {
  assert.ok(
    chapterData.endings.some(function (entry) {
      return entry.id === endingId;
    }),
    'missing ending definition: ' + endingId
  );
  // Use the complete main-ending list so an earlier broad condition cannot
  // silently make a later ending unreachable through ordering.
  var result = checkEndingDataDriven(state, { GD: { endings: chapterData.endings } });
  assert.ok(result, endingId + ' should match its gameplay-produced state');
  assert.strictEqual(result.id, endingId);
}

function collectLeaves(condition) {
  if (!condition || typeof condition !== 'object') return [];
  if (condition.type === 'and_group' || condition.type === 'or_group') {
    return condition.conditions.flatMap(collectLeaves);
  }
  return [condition];
}

console.log('=== Ending Reachability Tests ===');

test('condition parser supports string equality and rejects unknown variables', function () {
  var ocean = makeState({ fearTuning: { primary: 'ocean' } });
  assert.strictEqual(
    checkSingleCondition(ocean, parseConditionString('fear_primary == ocean')),
    true
  );
  assert.strictEqual(
    checkSingleCondition(ocean, parseConditionString('fear_primary == body')),
    false
  );
  assert.strictEqual(
    checkSingleCondition(ocean, parseConditionString('unknown_counter == value')),
    false
  );
});

test('condition parser preserves AND-before-OR precedence', function () {
  var state = makeState({ san: 0, completedChains: ['chain_a', 'chain_b'] });
  var condition = parseConditionString(
    'player_san <= 0 OR player_san_very_low AND clue_chains_insufficient OR mythos_high_humanity_low'
  );
  assert.strictEqual(checkSingleCondition(state, condition), true);
});

test('all registered ending strings use supported grammar and variables', function () {
  var GD = { endings: [...(baseData.endings || []), ...(chapterData.endings || [])] };
  injectBehaviorEndings(GD);
  injectFearEndings(GD);
  var errors = [];
  for (const ending of GD.endings) {
    var strings = [
      ...(ending.conditions || ending.required_conditions || []),
      ...(ending.blocking_conds || ending.blocking_conditions || []),
    ].filter(function (entry) {
      return typeof entry === 'string';
    });
    for (const source of strings) {
      var leaves = collectLeaves(parseConditionString(source));
      for (const leaf of leaves) {
        if (leaf.type === 'always_true') errors.push(ending.id + ': unsupported "' + source + '"');
        if (leaf.varName && !CONDITION_VAR_MAP[leaf.varName]) {
          errors.push(ending.id + ': unknown variable ' + leaf.varName);
        }
      }
    }
  }
  assert.deepStrictEqual(errors, []);
});

test('every semantic main-ending flag has a resolver or final-choice producer', function () {
  var producedFlags = new Set();
  for (const choices of Object.values(ENDING_EVENT_CHOICES)) {
    for (const choice of choices) {
      var flags = choice.effects && choice.effects.add_flag;
      if (!Array.isArray(flags)) flags = flags ? [flags] : [];
      flags.forEach(function (flag) {
        producedFlags.add(flag);
      });
    }
  }

  var missing = [];
  for (const ending of chapterData.endings) {
    for (const source of ending.required_conditions || []) {
      for (const leaf of collectLeaves(parseConditionString(source))) {
        if (
          leaf.type === 'has_flag' &&
          !ENDING_FLAG_RESOLVERS[leaf.flag_id] &&
          !producedFlags.has(leaf.flag_id)
        ) {
          missing.push(ending.id + ': ' + leaf.flag_id);
        }
      }
    }
  }
  assert.deepStrictEqual(missing, []);
});

const MAIN_ENDING_STATES = {
  ending_seal_player_keeper: makeState({
    san: 65,
    completedChains: ['chain_harbor', 'chain_morris'],
    npcTrust: { old_fisher: 5 },
    npcStates: { hilda_morris: { redeemed: true } },
    triggeredEvents: ['has_complete_seal_ritual', 'player_chose_self_sacrifice_in_final'],
  }),
  ending_seal_hilda_choice: makeState({
    completedChains: ['chain_morris'],
    npcTrust: { hilda_morris: 5 },
    npcStates: { hilda_morris: { redeemed: true } },
    triggeredEvents: ['player_told_full_truth_to_hilda'],
  }),
  ending_seal_old_fisher_blood: makeState({
    completedChains: ['chain_harbor'],
    discoveredConclusions: ['conclusion_fisher_key_blood'],
    npcTrust: { old_fisher: 5 },
  }),
  ending_isabella_twelfth_bell: makeState({
    completedChains: ['chain_heretical'],
    discoveredConclusions: ['conclusion_bell_ritual_link'],
    npcStates: { isabella_weber: { redeemed: true } },
    triggeredEvents: ['nyarlathotep_deception_proven'],
  }),
  ending_escape_by_sea: makeState({
    san: 45,
    safehouseCorruption: 20,
    npcTrust: { old_fisher: 3 },
    inventory: [{ id: 'clue_item_0', name: '潮汐时刻表', uses: 1 }],
    triggeredEvents: ['evt_ch5_escape_boat_route_confirmed'],
  }),
  ending_evidence_escape: makeState({
    sealState: 'critical',
    npcTrust: { elias_ward: 4 },
    triggeredEvents: [
      'evt_ch1_tommy_photo',
      'evt_ch5_escape_boat_route_confirmed',
      'player_left_city',
    ],
  }),
  ending_heretical_dawn: makeState({
    sealState: 'broken',
    triggeredEvents: ['player_joined_isabella_ritual'],
  }),
  ending_abyss_consumed: makeState({
    currentArea: 'deep_catacombs',
    sealState: 'critical',
    san: 0,
    completedChains: ['chain_a', 'chain_b'],
  }),
  ending_transcendence: makeState({
    san: 65,
    mythosLevel: 20,
    completedChains: ['chain_yith_knowledge'],
    inventory: [{ id: 'clue_item_21', name: '时间碎片', uses: 1 }],
    triggeredEvents: ['evt_geometry_trap_skill_success'],
  }),
  ending_loop_truth: makeState({
    loopCount: 5,
    pollution: 0.2,
    completedChains: ['chain_harbor', 'chain_morris'],
    _sealKnowledge: { attemptedRituals: ['evt_seal_ritual'], hildaInvolved: true },
  }),
};

for (const [endingId, state] of Object.entries(MAIN_ENDING_STATES)) {
  test('main ending reachable: ' + endingId, function () {
    assertEndingReachable(endingId, state);
  });
}

const FEAR_ENDING_STATES = {
  ocean: makeState({
    fearTuning: { primary: 'ocean' },
    visitedAreas: new Array(10).fill('harbor_district'),
    san: 25,
    loopCount: 3,
    behaviorTracking: { sea_acceptance_flags: 3, direct_kill_count: 0 },
  }),
  body: makeState({
    fearTuning: { primary: 'body' },
    infection: 5,
    san: 30,
    loopCount: 2,
    behaviorTracking: { fusion_accepted_count: 3, hoarded_food_max: 0 },
  }),
  control: makeState({
    fearTuning: { primary: 'control' },
    difficultyLevel: 10,
    behaviorTracking: {
      meta_boundary_breaks: 4,
      loop_break_attempts: 3,
      save_delete_attempts: 1,
      safehouse_stay_days: 0,
    },
  }),
  isolation: makeState({
    fearTuning: { primary: 'isolation' },
    san: 35,
    loopCount: 2,
    npcTrust: { martha_grey: 2 },
    behaviorTracking: { safehouse_stay_days: 12, low_intervention_count: 8, redeemed_npcs: 0 },
  }),
  knowledge: makeState({
    fearTuning: { primary: 'knowledge' },
    san: 30,
    loopCount: 3,
    mythosLevel: 20,
    behaviorTracking: { clue_finds: 25, archive_consumed_count: 8, hoarded_food_max: 0 },
  }),
  morality: makeState({
    fearTuning: { primary: 'morality' },
    loopCount: 2,
    npcTrust: { hilda_morris: 5, old_fisher: 5, martha_grey: 5 },
    behaviorTracking: {
      redeemed_npcs: 2,
      self_sacrifice_for_power: 1,
      direct_kill_count: 0,
      cannibalism_count: 0,
    },
  }),
};

for (const fearEnding of FEAR_ENDINGS) {
  test('fear ending reachable: ' + fearEnding.id, function () {
    var GD = { endings: [] };
    injectFearEndings(GD);
    var result = checkEndingDataDriven(FEAR_ENDING_STATES[fearEnding.fear_required], { GD: GD });
    assert.ok(result, fearEnding.id + ' should be reachable');
    assert.strictEqual(result.id, fearEnding.id);
  });
}

test('real clue chains resolve events, stable NPC ids, items and composite sources', function () {
  var state = makeState({
    triggeredEvents: [
      'evt_missing_poster',
      'evt_fisherman_warning',
      'evt_warehouse_key',
      'evt_lighthouse_light',
      'evt_underwater_temple',
      'evt_portrait_watch',
      'evt_basement_depth',
      'evt_library_secret',
      'evt_seal_ritual',
      'evt_strange_clock',
      'evt_church_bell',
      'evt_beggar_clue',
      'evt_ch2_church_basement',
    ],
    npcTrust: {
      martha_grey: 1,
      old_fisher: 5,
      joshua_black: 3,
      hilda_morris: 5,
      elias_ward: 5,
      isabella_weber: 5,
    },
  });
  applyLegacyEffects(state, {
    items: ['封印仪式记录（关键线索）', '古树种子', '扭曲的圣经页'],
  });
  checkChainCompletion(state, function () {}, { GD: { clue_chains: baseData.clue_chains } });

  assert.deepStrictEqual([...state.completedChains].sort(), [
    'chain_harbor',
    'chain_heretical',
    'chain_morris',
  ]);
  assert.strictEqual(hasTriggered(state, 'chain_harbor_completed'), true);
  assert.strictEqual(hasTriggered(state, 'chain_morris_completed'), true);
  assert.strictEqual(hasTriggered(state, 'chain_heretical_completed'), true);
  assert.ok(
    state.inventory.some(function (item) {
      return item.name === '古树种子';
    })
  );
});

test('chapter-five ending choices are injected once and produce canonical flags', function () {
  var GD = { events: JSON.parse(JSON.stringify(chapterData.events)) };
  injectEndingChoices(GD);
  injectEndingChoices(GD);
  var expected = [
    'evt_ch5_final_ritual_begin',
    'evt_ch5_fisher_answer',
    'evt_ch5_escape_boat',
    'evt_ch5_nyarlathotep_offer',
  ];
  for (const eventId of expected) {
    var event = GD.events.find(function (entry) {
      return entry.id === eventId;
    });
    assert.ok(event && event.choices.length >= 2, eventId + ' should expose player decisions');
  }

  var state = makeState();
  var finalEvent = GD.events.find(function (entry) {
    return entry.id === 'evt_ch5_final_ritual_begin';
  });
  applyLegacyEffects(state, finalEvent.choices[0].effects);
  assert.strictEqual(hasTriggered(state, 'has_complete_seal_ritual'), true);
  assert.strictEqual(hasTriggered(state, 'player_chose_self_sacrifice_in_final'), true);
});

console.log('');
console.log('=== Ending Reachability Tests ===');
console.log('  ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
