// data/test_missing_600.js
// 测试用例：虚拟第600个事件机制
// 运行：node src/data/test_missing_600.js

import { ALL_EXTENDED_EVENTS as allExtended } from './extended_events_index.js';
import {
  MISSING_600_EVENT_ID,
  shouldTriggerMissing600,
  createMissing600Event,
} from './events_missing_600.js';
import { ENDING_PLAYER_BECOMES_EVENT, injectMissingEnding } from './ending_missing_600.js';

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${name}`);
  } else {
    failed++;
    console.log(`  FAIL: ${name}`);
  }
}

// =============================================
// Test Suite 1: Event Pool Integrity
// =============================================
console.log('\n=== Test Suite 1: Event Pool Integrity ===');

assert(
  allExtended.length === 599,
  `allExtendedEvents.length === 599 (actual: ${allExtended.length})`
);

assert(
  !allExtended.some(e => e.id === MISSING_600_EVENT_ID),
  'missing_event_600 is NOT in the event array'
);

const ids = allExtended.map(e => e.id);
const uniqueIds = new Set(ids);
assert(
  uniqueIds.size === ids.length,
  `All ${ids.length} event IDs are unique`
);

// =============================================
// Test Suite 2: shouldTriggerMissing600 - Positive
// =============================================
console.log('\n=== Test Suite 2: shouldTriggerMissing600 (positive) ===');

function makeState(overrides = {}) {
  return {
    loopCount: 10,
    mythosLevel: 25,
    san: 5,
    hp: 5, maxHp: 11,
    food: 3, lightLevel: 2,
    safehouseCorruption: 0,
    humanityScore: 50,
    day: 20, ap: 12, maxAp: 12,
    previousEndings: ['ending_seal_player_keeper', 'ending_escape_by_sea', 'ending_abyss_consumed', 'ending_heretical_dawn', 'ending_transcendence'],
    endingHistory: [],
    triggeredEvents: ['meta_ui_001'],
    triggeredSilentEvents: [],
    npcTrust: {},
    npcStates: {},
    clues: [],
    inventory: [],
    currentArea: 'town_center',
    weather: '阴天',
    sealState: 'intact',
    ...overrides,
  };
}

assert(
  shouldTriggerMissing600(makeState(), allExtended) === true,
  'All conditions met -> returns true'
);

assert(
  shouldTriggerMissing600(makeState({ triggeredEvents: ['meta_ui_001', 'missing_event_600_seen'] }), allExtended) === false,
  'Already seen -> returns false'
);

// Endgame content trigger paths: each type should independently satisfy condition 6
assert(
  shouldTriggerMissing600(makeState({ triggeredEvents: ['loop_endpoint_001'] }), allExtended) === true,
  'loop_endpoint event satisfies endgame content check'
);

assert(
  shouldTriggerMissing600(makeState({ triggeredEvents: ['clue_endpoint_yith_final'] }), allExtended) === true,
  'clue_endpoint_yith_final satisfies endgame content check'
);

assert(
  shouldTriggerMissing600(makeState({ triggeredEvents: ['ending_transcendence_available'] }), allExtended) === true,
  'ending_transcendence_available satisfies endgame content check'
);

assert(
  shouldTriggerMissing600(makeState({ triggeredEvents: ['ending_loop_truth_available'] }), allExtended) === true,
  'ending_loop_truth_available satisfies endgame content check'
);

assert(
  shouldTriggerMissing600(makeState({ triggeredEvents: ['clue_mythos_final_revelation'] }), allExtended) === true,
  'clue_mythos_final_revelation satisfies endgame content check'
);

assert(
  shouldTriggerMissing600(makeState({ triggeredEvents: ['meta_system_003'] }), allExtended) === true,
  'meta_system event satisfies endgame content check'
);

// endingHistory-based ending count (not just previousEndings)
assert(
  shouldTriggerMissing600(makeState({
    previousEndings: ['a', 'b'],
    endingHistory: [
      { ending_id: 'c' }, { ending_id: 'd' }, { ending_id: 'e' },
    ],
  }), allExtended) === true,
  'endings from endingHistory count toward 5-ending threshold'
);

// =============================================
// Test Suite 3: shouldTriggerMissing600 - Negative
// =============================================
console.log('\n=== Test Suite 3: shouldTriggerMissing600 (negative) ===');

assert(
  shouldTriggerMissing600(makeState({ loopCount: 9 }), allExtended) === false,
  'loopCount=9 -> false'
);

assert(
  shouldTriggerMissing600(makeState({ mythosLevel: 24 }), allExtended) === false,
  'mythosLevel=24 -> false'
);

assert(
  shouldTriggerMissing600(makeState({ san: 11 }), allExtended) === false,
  'san=11 -> false'
);

assert(
  shouldTriggerMissing600(makeState({ previousEndings: ['a', 'b', 'c'] }), allExtended) === false,
  'Only 3 endings -> false'
);

assert(
  shouldTriggerMissing600(makeState({ triggeredEvents: ['evt_harbor_shadow'] }), allExtended) === false,
  'No meta/endpoint/transcendence content -> false'
);

assert(
  shouldTriggerMissing600(makeState(), [...allExtended, { id: 'extra_event' }]) === false,
  'Pool length !== 599 -> false'
);

assert(
  shouldTriggerMissing600(makeState(), []) === false,
  'Empty pool -> false'
);

assert(
  shouldTriggerMissing600(makeState(), null) === false,
  'Null pool -> false'
);

// =============================================
// Test Suite 4: createMissing600Event
// =============================================
console.log('\n=== Test Suite 4: createMissing600Event ===');

const state = makeState();
const evt = createMissing600Event(state);

assert(
  evt.id === MISSING_600_EVENT_ID,
  `Event ID is ${MISSING_600_EVENT_ID}`
);

assert(
  evt.name === '第600个事件',
  'Event name is "第600个事件"'
);

assert(
  evt.type === 'meta' && evt.subtype === 'missing_600',
  'Type=meta, subtype=missing_600'
);

assert(
  evt.tier === 'meta',
  'Tier is meta'
);

assert(
  evt.choices && evt.choices.length === 3,
  `Has 3 choices (actual: ${evt.choices?.length})`
);

assert(
  evt.choices[0].label === '继续阅读' &&
  evt.choices[1].label === '合上笔记本' &&
  evt.choices[2].label === '写下自己的名字',
  'Choice labels are correct'
);

assert(
  evt.choices[0].effects.unlock_ending_condition === 'ending_loop_termination_true',
  'Choice 0 unlocks ending_loop_termination_true'
);

assert(
  evt.choices[1].effects.unlock_ending_condition === 'ending_world_refuses_completion',
  'Choice 1 unlocks ending_world_refuses_completion'
);

assert(
  evt.choices[2].effects.unlock_ending_condition === 'ending_player_becomes_event',
  'Choice 2 unlocks ending_player_becomes_event'
);

assert(
  evt.trigger.once_ever === true,
  'Trigger has once_ever: true'
);

assert(
  evt.effects.san < 0 && evt.effects.mythos > 0,
  'Base effects: SAN loss, mythos gain'
);

// =============================================
// Test Suite 5: Ending Definition
// =============================================
console.log('\n=== Test Suite 5: Hidden Ending ===');

assert(
  ENDING_PLAYER_BECOMES_EVENT.id === 'ending_player_becomes_event',
  'Ending ID is correct'
);

assert(
  ENDING_PLAYER_BECOMES_EVENT.name === '第六百个事件',
  'Ending name is "第六百个事件"'
);

assert(
  ENDING_PLAYER_BECOMES_EVENT.type === 'hidden',
  'Ending type is hidden'
);

assert(
  ENDING_PLAYER_BECOMES_EVENT.conditions.length === 1 &&
  ENDING_PLAYER_BECOMES_EVENT.conditions[0].type === 'has_flag',
  'Ending condition: has_flag'
);

assert(
  ENDING_PLAYER_BECOMES_EVENT.humanity_variants.humanity_high.includes('第600个事件'),
  'Humanity high variant contains title'
);

assert(
  ENDING_PLAYER_BECOMES_EVENT.humanity_variants.humanity_lost.includes('变成了文字'),
  'Humanity lost variant contains key phrase'
);

// =============================================
// Test Suite 6: Ending Injection
// =============================================
console.log('\n=== Test Suite 6: Ending Injection ===');

const mockGD = {
  endings: [{ id: 'ending_seal_player_keeper' }],
  ending_judgement: { priority_order: ['ending_seal_player_keeper'] },
};

injectMissingEnding(mockGD);

assert(
  mockGD.endings.some(e => e.id === 'ending_player_becomes_event'),
  'Ending injected into GD.endings'
);

assert(
  mockGD.ending_judgement.priority_order[0] === 'ending_player_becomes_event',
  'Ending added at highest priority'
);

// Double injection is idempotent
injectMissingEnding(mockGD);
assert(
  mockGD.endings.filter(e => e.id === 'ending_player_becomes_event').length === 1,
  'Double injection is idempotent'
);

// =============================================
// Test Suite 7: selectEventV2 Integration
// =============================================
console.log('\n=== Test Suite 7: selectEventV2 Integration ===');

import { selectEventV2 } from '../reducers/extendedEvents.js';

assert(
  typeof selectEventV2 === 'function',
  'selectEventV2 is exported and callable'
);

// Build a mock GD with 599 events (the real extended events) + area + systems
const mockGD2 = {
  events: [...allExtended],
  _extendedEvents: [...allExtended],
  _extendedEventsLoaded: true,
  _extendedEventCount: 599,
  areas: [{ id: 'town_center', connected_areas: [], resource_pressure: { required_light_level: 0 } }],
  world: { horror_density_control: { per_area: {} } },
  systems: { sanity: { sanity_gamble: { enabled: false } } },
  core_loop: { difficulty_levels: { normal: { skill_check_bonus: 0 } } },
};

// Deterministic pick: always returns first element
const pickFirst = arr => arr[0];

// State that satisfies all missing_600 conditions
// Include omen IDs so they don't fire before event 600 in tests
const readyState = makeState({
  ap: 12, maxAp: 12, day: 20,
  triggeredEvents: ['loop_endpoint_001', 'omen_600_notebook_page', 'omen_600_event_log', 'omen_600_npc_whisper'],
  triggeredSilentEvents: [],
});

// Run selectEventV2 many times with Math.random rigged to always pass the 35% gate
let missing600Returned = 0;
const origRandom = Math.random;
for (let i = 0; i < 50; i++) {
  Math.random = () => 0.01; // always < 0.35
  // Clone state to avoid mutation side effects
  const s = { ...readyState, categoryCountsToday: {}, categoryCountsRun: {}, abnormalStreak: 0, eventCooldowns: {}, triggeredEvents: [...readyState.triggeredEvents] };
  const result = selectEventV2('town_center', s, { GD: mockGD2 }, pickFirst);
  if (result && result.id === MISSING_600_EVENT_ID) missing600Returned++;
}
Math.random = origRandom;

assert(
  missing600Returned > 0,
  `selectEventV2 returns missing_event_600 when conditions met (${missing600Returned}/50)`
);

// Now verify it does NOT return missing_600 when conditions are NOT met
let notMissing = 0;
for (let i = 0; i < 20; i++) {
  Math.random = () => 0.01;
  const unreadyState = makeState({
    loopCount: 1, // too low
    ap: 12, maxAp: 12, day: 5,
    triggeredEvents: ['evt_harbor_shadow'],
    triggeredSilentEvents: [],
  });
  const s2 = { ...unreadyState, categoryCountsToday: {}, categoryCountsRun: {}, abnormalStreak: 0, eventCooldowns: {}, triggeredEvents: [...unreadyState.triggeredEvents] };
  const result = selectEventV2('town_center', s2, { GD: mockGD2 }, pickFirst);
  if (result && result.id === MISSING_600_EVENT_ID) notMissing++;
}
Math.random = origRandom;

assert(
  notMissing === 0,
  `selectEventV2 does NOT return missing_event_600 when conditions unmet (${notMissing}/20 leaked)`
);

// =============================================
// Test Suite 8: Event Not in Any events_*.js File
// =============================================
console.log('\n=== Test Suite 8: Event Isolation ===');

import { events as loop_events } from './events_loop.js';
import { events as humanity_events } from './events_humanity.js';
import { events as mythos_events } from './events_mythos.js';
import { events as resource_events } from './events_resource.js';
import { events as npc_events } from './events_npc_cross.js';
import { events as area_events } from './events_area_deep.js';
import { events as ending_events } from './events_ending.js';
import { events as silent_events } from './events_silent.js';
import { events as meta_events } from './events_meta.js';

const all_files = [
  ...loop_events, ...humanity_events, ...mythos_events,
  ...resource_events, ...npc_events, ...area_events,
  ...ending_events, ...silent_events, ...meta_events,
];

assert(
  !all_files.some(e => e.id === MISSING_600_EVENT_ID),
  'missing_event_600 is NOT in any events_*.js file'
);

assert(
  all_files.length === 599,
  `Total across all files is 599 (actual: ${all_files.length})`
);

// =============================================
// Test Suite 9: Death System
// =============================================
console.log('\n=== Test Suite 9: Death System ===');

import { resolveDeath, inferDeathType, getDeathTypeLabel } from '../reducers/deathSystem.js';
import { events as deathEchoEvents } from './events_death_echo.js';

// resolveDeath returns null when alive
assert(
  resolveDeath(makeState({ hp: 5, san: 5 })) === null,
  'resolveDeath returns null when alive'
);

// HP death
const hpDeath = resolveDeath(makeState({ hp: 0, san: 10 }));
assert(hpDeath !== null, 'HP=0 triggers death');
assert(hpDeath.mode === 'hp', 'HP death mode is "hp"');
assert(typeof hpDeath.type === 'string' && hpDeath.type.length > 0, 'HP death has a type');
assert(hpDeath.finalText.length > 100, 'HP death has substantial text');
assert(hpDeath.residueFlag === `death_echo_${hpDeath.type}`, 'residueFlag matches type');

// SAN death
const sanDeath = resolveDeath(makeState({ hp: 5, san: 0 }));
assert(sanDeath !== null, 'SAN=0 triggers death');
assert(sanDeath.mode === 'san', 'SAN death mode is "san"');
assert(sanDeath.finalText.length > 100, 'SAN death has substantial text');

// Hybrid death
const hybridDeath = resolveDeath(makeState({ hp: 0, san: 0 }));
assert(hybridDeath !== null, 'HP=0 && SAN=0 triggers death');
assert(hybridDeath.mode === 'hybrid', 'Hybrid death mode is "hybrid"');
assert(hybridDeath.type === 'body_and_self_lost', 'Hybrid death type is body_and_self_lost');
assert(hybridDeath.finalText.includes('身心俱灭'), 'Hybrid death text includes title');

// death_hint on event effects overrides inference
const hintText = inferDeathType(
  makeState({ currentArea: 'town_center' }),
  { tags: [], effects: { death_hint: 'drowning' } },
  null, 'hp'
);
assert(hintText === 'drowning', 'death_hint on event effects overrides type inference');

// Tag-based inference
assert(
  inferDeathType(makeState({ currentArea: 'harbor_district' }), { tags: ['water'] }, null, 'hp') === 'drowning',
  'water tag -> drowning'
);
assert(
  inferDeathType(makeState({}), { tags: ['meta'] }, null, 'san') === 'identity_erasure',
  'meta tag -> identity_erasure'
);
assert(
  inferDeathType(makeState({ loopCount: 8, san: 5, mythosLevel: 0 }), { tags: [] }, null, 'san') === 'loop_collapse',
  'high loop + low san + low mythos -> loop_collapse'
);

// Death echo events exist and are well-formed
assert(deathEchoEvents.length >= 17, `Death echo events: ${deathEchoEvents.length}`);
assert(
  deathEchoEvents.every(e => e.id.startsWith('death_echo_')),
  'All death echo event IDs start with death_echo_'
);
assert(
  deathEchoEvents.every(e => e.trigger?.requires_last_death_type || e.trigger?.requires_last_death_mode),
  'All death echo events have requires_last_death_type or requires_last_death_mode'
);

// getDeathTypeLabel
assert(getDeathTypeLabel('drowning') === '溺水', 'getDeathTypeLabel("drowning") = 溺水');
assert(getDeathTypeLabel('madness') === '疯狂', 'getDeathTypeLabel("madness") = 疯狂');
assert(getDeathTypeLabel('body_and_self_lost') === '身心俱灭', 'getDeathTypeLabel("body_and_self_lost") = 身心俱灭');

// Death echo events are NOT in the 599 pool
assert(
  !allExtended.some(e => e.id.startsWith('death_echo_')),
  'Death echo events are NOT in the 599 extended pool'
);

// =============================================
// Summary
// =============================================
console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed === 0) {
  console.log('ALL TESTS PASSED');
} else {
  console.log(`${failed} TESTS FAILED`);
  process.exit(1);
}
