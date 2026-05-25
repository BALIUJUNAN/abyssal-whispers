// data/lint_extended_events.js — Minimal lint script for extended events
// Checks: 599 count, unique IDs, event-600 isolation, death-echo isolation,
//         required fields present on all events.
// Run: node src/data/lint_extended_events.js

import { ALL_EXTENDED_EVENTS as allExtended } from './extended_events_index.js';

const REQUIRED_FIELDS = ['id', 'name', 'type', 'trigger', 'description'];

let errors = 0;
let warnings = 0;

function fail(msg) { errors++; console.error('  FAIL:', msg); }
function warn(msg) { warnings++; console.warn('  WARN:', msg); }
function pass(msg) { console.log('  PASS:', msg); }

// 1. Count === 599
console.log('\n== Pool Integrity ==');
if (allExtended.length === 599) {
  pass(`Event count: 599`);
} else {
  fail(`Event count: ${allExtended.length} (expected 599)`);
}

// 2. Unique IDs
const ids = allExtended.map(e => e.id);
const uniqueIds = new Set(ids);
if (uniqueIds.size === ids.length) {
  pass(`All ${ids.length} IDs unique`);
} else {
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  fail(`Duplicate IDs: ${[...new Set(dupes)].join(', ')}`);
}

// 3. missing_event_600 NOT in pool
if (!ids.includes('missing_event_600')) {
  pass('missing_event_600 NOT in pool');
} else {
  fail('missing_event_600 IS in pool (should be virtual)');
}

// 4. death_echo NOT in pool
const deathEchoInPool = ids.filter(id => id.startsWith('death_echo_'));
if (deathEchoInPool.length === 0) {
  pass('No death_echo_ events in pool');
} else {
  fail(`death_echo_ events in pool: ${deathEchoInPool.join(', ')}`);
}

// 5. Required fields
console.log('\n== Required Fields ==');
const missing = allExtended.filter(e => {
  return REQUIRED_FIELDS.some(f => !e[f]);
});
if (missing.length === 0) {
  pass('All events have id/name/type/trigger/description');
} else {
  for (const e of missing) {
    const missingFields = REQUIRED_FIELDS.filter(f => !e[f]);
    fail(`${e.id || 'UNKNOWN'}: missing ${missingFields.join(', ')}`);
  }
}

// 6. trigger.areas present
console.log('\n== Trigger Structure ==');
const noAreas = allExtended.filter(e => !e.trigger?.areas || e.trigger.areas.length === 0);
if (noAreas.length === 0) {
  pass('All events have trigger.areas');
} else {
  for (const e of noAreas) {
    warn(`${e.id}: trigger.areas is empty or missing`);
  }
}

// Summary
console.log(`\n${'='.repeat(40)}`);
console.log(`Lint complete: ${errors} errors, ${warnings} warnings`);
if (errors > 0) {
  process.exit(1);
} else {
  console.log('All checks passed.\n');
}
