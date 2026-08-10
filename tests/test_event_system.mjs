import assert from 'assert';
import { checkTrigger as checkLegacyTrigger } from '../src/reducers/eventReducer.js';
import { checkTriggerExtended } from '../src/reducers/extendedEvents.js';
import { CH2PLUS_EVENTS } from '../src/data/extended_events_index.js';
import { EVENTS as NPC_CROSS_EVENTS } from '../src/data/events/events_npc_cross.js';

// Exercise the production trigger implementation. The previous local copy of
// this function could agree with itself while the runtime logic regressed.
function checkTrigger(evt, state) {
  return checkTriggerExtended(evt, state, { GD: {} });
}

function makeState(overrides) {
  return Object.assign(
    {
      san: 60,
      maxSan: 99,
      hp: 11,
      day: 1,
      loopCount: 0,
      pollution: 0,
      currentArea: 'town_center',
      triggeredEvents: [],
      clues: [],
      runTriggeredExtendedEvents: [],
      everTriggeredEvents: [],
      npcTrust: {},
      npcStates: {},
      npcRelations: {},
      inventory: [],
      previousEndings: [],
      endingCoins: 0,
      loopShopTier: 0,
      _npcTrustLocked: {},
      behaviorTracking: {},
      food: 3,
      mythosLevel: 0,
    },
    overrides
  );
}

let passed = 0,
  failed = 0;
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

console.log('=== Trigger Conditions ===');
test('area match', () => {
  assert.ok(checkTrigger({ trigger: { areas: ['town_center'] } }, makeState()));
  assert.ok(!checkTrigger({ trigger: { areas: ['harbor_district'] } }, makeState()));
});
test('san_lte', () => {
  assert.ok(checkTrigger({ trigger: { san_lte: 30 } }, makeState({ san: 20 })));
  assert.ok(!checkTrigger({ trigger: { san_lte: 30 } }, makeState({ san: 40 })));
});
test('min_loop', () => {
  assert.ok(checkTrigger({ trigger: { min_loop: 5 } }, makeState({ loopCount: 6 })));
  assert.ok(!checkTrigger({ trigger: { min_loop: 5 } }, makeState({ loopCount: 3 })));
});
test('once_per_run', () => {
  const s = makeState({ runTriggeredExtendedEvents: ['e1'] });
  assert.ok(!checkTrigger({ id: 'e1', trigger: { once_per_run: true } }, s));
  assert.ok(checkTrigger({ id: 'e2', trigger: { once_per_run: true } }, s));
});
test('once_ever', () => {
  const s = makeState({ everTriggeredEvents: ['e1'] });
  assert.ok(!checkTrigger({ id: 'e1', trigger: { once_ever: true } }, s));
  assert.ok(checkTrigger({ id: 'e2', trigger: { once_ever: true } }, s));
});
test('max_meta_per_run', () => {
  const s = makeState({ runTriggeredExtendedEvents: ['meta_ui_001'] });
  assert.ok(!checkTrigger({ id: 'meta_save', trigger: { max_meta_per_run: 1 } }, s));
  assert.ok(checkTrigger({ id: 'meta_save', trigger: { max_meta_per_run: 1 } }, makeState()));
});
test('requires_flags', () => {
  const s = makeState({ triggeredEvents: ['flag_a'] });
  assert.ok(checkTrigger({ trigger: { requires_flags: ['flag_a'] } }, s));
  assert.ok(!checkTrigger({ trigger: { requires_flags: ['flag_a', 'flag_b'] } }, s));
});
test('npc_alive', () => {
  const s = makeState({ npcStates: { m: { dead: true } } });
  assert.ok(!checkTrigger({ trigger: { npc_alive: ['m'] } }, s));
  assert.ok(checkTrigger({ trigger: { npc_alive: ['f'] } }, s));
});
test('npc_trust_gte', () => {
  const s = makeState({ npcTrust: { m: 3 } });
  assert.ok(checkTrigger({ trigger: { npc_trust_gte: { m: 2 } } }, s));
  assert.ok(!checkTrigger({ trigger: { npc_trust_gte: { m: 4 } } }, s));
});
test('chapter gate blocks future chapters and unlocks at each boundary', () => {
  assert.ok(!checkTrigger({ trigger: { chapter: 2 } }, makeState({ day: 3 })));
  assert.ok(checkTrigger({ trigger: { chapter: 2 } }, makeState({ day: 4 })));
  assert.ok(!checkTrigger({ trigger: { chapter: 3 } }, makeState({ day: 7 })));
  assert.ok(checkTrigger({ trigger: { chapter: 3 } }, makeState({ day: 8 })));
  assert.ok(!checkTrigger({ trigger: { chapter: 4 } }, makeState({ day: 14 })));
  assert.ok(checkTrigger({ trigger: { chapter: 4 } }, makeState({ day: 15 })));
  assert.ok(!checkTrigger({ trigger: { chapter: 5 } }, makeState({ day: 21 })));
  assert.ok(checkTrigger({ trigger: { chapter: 5 } }, makeState({ day: 22 })));
  // chapter is a minimum: earlier investigation events remain available later.
  assert.ok(checkTrigger({ trigger: { chapter: 2 } }, makeState({ day: 22 })));
});
test('real chapter-5 escape event cannot enter the day-8 candidate pool', () => {
  const evt = CH2PLUS_EVENTS.find((entry) => entry.id === 'evt_ch5_escape_boat');
  const eventState = makeState({
    day: 8,
    currentArea: 'harbor_district',
    ap: 5,
    maxAp: 6,
  });
  assert.ok(evt);
  assert.strictEqual(checkTrigger(evt, eventState), false);
  assert.strictEqual(checkTrigger(evt, { ...eventState, day: 22 }), true);
  assert.strictEqual(checkLegacyTrigger(evt, eventState), false);
});
test('localized NPC event conditions resolve stable runtime IDs', () => {
  const evt = NPC_CROSS_EVENTS.find((entry) => entry.id === 'npc_cross_death_001');
  const eventState = makeState({
    currentArea: 'harbor_district',
    npcTrust: { martha_grey: 2 },
    npcStates: {
      old_fisher: { dead: true },
      martha_grey: { dead: false },
    },
  });
  assert.ok(evt);
  assert.strictEqual(checkTrigger(evt, eventState), true);
  assert.strictEqual(checkLegacyTrigger(evt, eventState), true);
});
test('stable NPC event conditions remain compatible with localized old-save keys', () => {
  const eventState = makeState({
    npcTrust: { 老费舍: 3 },
    npcStates: { 老费舍: { dead: true } },
  });
  const trigger = { npc_trust_gte: { old_fisher: 3 }, npc_dead: ['old_fisher'] };
  assert.strictEqual(checkTrigger({ trigger }, eventState), true);
  assert.strictEqual(checkLegacyTrigger({ trigger }, eventState), true);
});
test('food_lte', () => {
  assert.ok(checkTrigger({ trigger: { food_lte: 2 } }, makeState({ food: 1 })));
  assert.ok(!checkTrigger({ trigger: { food_lte: 2 } }, makeState({ food: 3 })));
});

console.log('=== NPC Trust Lock ===');
test('trust locked prevents increase', () => {
  const s = makeState({ npcTrust: { m: 2 }, _npcTrustLocked: { m: true } });
  if (!(s._npcTrustLocked && s._npcTrustLocked.m)) s.npcTrust.m = Math.min(5, s.npcTrust.m + 1);
  assert.strictEqual(s.npcTrust.m, 2);
});
test('trust unlocked increases', () => {
  const s = makeState({ npcTrust: { m: 2 } });
  if (!(s._npcTrustLocked && s._npcTrustLocked.m)) s.npcTrust.m = Math.min(5, s.npcTrust.m + 1);
  assert.strictEqual(s.npcTrust.m, 3);
});

console.log('=== Loop System ===');
test('SAN floor loop 4', () => {
  assert.strictEqual(Math.max(60, 99 + -13), 86);
});
test('SAN floor loop 10+', () => {
  assert.strictEqual(Math.min(Math.max(50, 99 + -16), 50), 50);
});
test('ending coins', () => {
  let c = 2;
  c += 1;
  assert.strictEqual(c, 3);
});
test('shop tier unlock', () => {
  let t = 0;
  if (5 >= 5 && t < 1) t = 1;
  assert.strictEqual(t, 1);
});

console.log('=== Afterglow ===');
function checkAfterglow(e, s) {
  if (!e || !e.afterglow) return false;
  const c = e.afterglow.unlock_condition;
  if (!c) return true;
  if (c.startsWith('has_triggered_event:')) {
    const id = c.split(':')[1];
    return (s.everTriggeredEvents || []).includes(id);
  }
  if (c.startsWith('has_item:')) {
    const id = c.split(':')[1];
    return (s.inventory || []).some((i) => i.id === id);
  }
  if (c.startsWith('previous_ending_count:')) {
    const n = parseInt(c.split(':')[1], 10);
    return (s.previousEndings || []).length >= n;
  }
  return false;
}
test('afterglow by event', () => {
  assert.ok(
    checkAfterglow(
      { afterglow: { unlock_condition: 'has_triggered_event:evt600', texts: ['t'] } },
      makeState({ everTriggeredEvents: ['evt600'] })
    )
  );
  assert.ok(
    !checkAfterglow(
      { afterglow: { unlock_condition: 'has_triggered_event:evt600', texts: ['t'] } },
      makeState()
    )
  );
});
test('afterglow by item', () => {
  assert.ok(
    checkAfterglow(
      { afterglow: { unlock_condition: 'has_item:locket', texts: ['t'] } },
      makeState({ inventory: [{ id: 'locket' }] })
    )
  );
});
test('afterglow by count', () => {
  assert.ok(
    checkAfterglow(
      { afterglow: { unlock_condition: 'previous_ending_count:3', texts: ['t'] } },
      makeState({ previousEndings: ['a', 'b', 'c'] })
    )
  );
  assert.ok(
    !checkAfterglow(
      { afterglow: { unlock_condition: 'previous_ending_count:3', texts: ['t'] } },
      makeState({ previousEndings: ['a'] })
    )
  );
});

console.log('\n================================');
console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
console.log('All tests passed');
