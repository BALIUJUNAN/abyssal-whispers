// tests/test_save_security.mjs — Save import security tests (ADR-010)
// Tests validateSaveSchema, quarantineSave, and CONTINUE_GAME whitelist copy.
import { validateSaveSchema, quarantineSave, SAVE_FORMAT_SPEC, configureSaveManager } from '../src/engine/SaveManager.js';
import { getPersistedStateKeys } from '../src/reducers/saveMigration.js';

configureSaveManager({ persistedStateKeys: getPersistedStateKeys({}) });

let passed = 0, failed = 0;
function assert(name, cond) {
  if (cond) { passed++; console.log('  PASS ' + name); }
  else { failed++; console.error('  FAIL ' + name); }
}

// ── Helpers ──

function makeValidSave(overrides) {
  var base = {
    version: '1',
    timestamp: Date.now(),
    slotId: 'auto_1',
    meta: { day: 1, area: 'town_center', loopCount: 0, san: 60, hp: 10 },
    state: {
      stats: { STR: 50, CON: 50, DEX: 50, APP: 50, POW: 50, INT: 50, SIZ: 50, EDU: 50 },
      hp: 10, maxHp: 10, san: 60, maxSan: 60, luck: 50, mp: 0,
      skills: {}, archetype: null,
      inventory: [], clues: [],
      currentArea: 'town_center', visitedAreas: ['town_center'],
      npcTrust: {}, npcStates: {}, npcRelations: {}, sealState: 'sealed', weather: 'clear',
      safehouseCorruption: 0, currentSafehouse: 'main',
      day: 1, ap: 12, maxAp: 12, food: 3, money: 0, loopCount: 0, runSeed: 'test_seed',
      objectives: [], triggeredEvents: [], triggeredSilentEvents: [],
      eventLog: [], runMemory: [],
      behaviorTracking: {},
    },
  };
  if (overrides) {
    // Deep clone base before merging to avoid mutation across test cases
    var cloned = JSON.parse(JSON.stringify(base));
    deepMerge(cloned, overrides);
    return cloned;
  }
  return base;
}

// Persisted nested state must survive sanitization instead of being coerced to 0.
{
  var nested = makeValidSave({
    state: {
      behaviorTracking: {
        mercy_shown_count: 2,
        _npc_harm_tally: { npc_hilda: 1 },
        _dilemmaChoices: [{ id: 'probe', choice: 'help' }],
      },
    },
  });
  var nestedResult = validateSaveSchema(nested);
  assert('nested behavior state preserved', nestedResult.sanitized.state.behaviorTracking._npc_harm_tally.npc_hilda === 1);
  assert('nested behavior arrays preserved', nestedResult.sanitized.state.behaviorTracking._dilemmaChoices[0].choice === 'help');
}

function deepMerge(target, source) {
  for (var key in source) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      target[key] = target[key] || {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
}

function makeImportJson(slotOverrides) {
  var save = makeValidSave(slotOverrides);
  return JSON.stringify({ version: '1', slots: { auto_1: save } });
}

// ══════════════════════════════════════════════════
// 1. Valid save passes schema validation
// ══════════════════════════════════════════════════
console.log('=== 1. Valid save passes ===');
{
  var result = validateSaveSchema(makeValidSave());
  assert('valid: true', result.valid === true);
  assert('no errors', result.errors.length === 0);
  assert('has sanitized', result.sanitized && typeof result.sanitized === 'object');
  assert('sanitized has state', result.sanitized && result.sanitized.state);
}

// ══════════════════════════════════════════════════
// 2. Missing version/slots → quarantineSave rejects
// ══════════════════════════════════════════════════
console.log('=== 2. Missing fields ===');
{
  var r = quarantineSave(JSON.stringify({ state: {} }));
  assert('no version → reject', r.ok === false);
  assert('error message', r.error && r.error.indexOf('version') >= 0);
}

// ══════════════════════════════════════════════════
// 3. Bad JSON → quarantineSave rejects
// ══════════════════════════════════════════════════
console.log('=== 3. Bad JSON ===');
{
  var r = quarantineSave('{ invalid json }');
  assert('parse error → reject', r.ok === false);
  assert('error mentions parse', r.error && r.error.indexOf('解析') >= 0);
}

// ══════════════════════════════════════════════════
// 4. Dangerous value patterns → rejected
// ══════════════════════════════════════════════════
console.log('=== 4. Dangerous value patterns ===');
{
  var evil = makeValidSave({
    state: {
      eventLog: [{ text: '<script>alert(1)</script>', day: 1 }],
      runMemory: ['eval(userInput)'],
      stats: { STR: 50 },
    },
  });
  var result = validateSaveSchema(evil);
  assert('valid: false', result.valid === false);
  assert('detects dangerous pattern', result.errors.some(function (e) { return e.indexOf('dangerous') >= 0; }));
}

// ══════════════════════════════════════════════════
// 4b. Prototype pollution key → stripped by whitelist
// ══════════════════════════════════════════════════
console.log('=== 4b. Prototype pollution key whitelist ===');
{
  // In object literals, __proto__ sets the prototype (not an own property).
  // The real defense is the whitelist: only known keys are copied to sanitized output.
  // Test that unknown keys (including __proto__, constructor) are stripped.
  var save = makeValidSave({
    state: {
      __proto__: { polluted: true },
      evilField: 'hack_value',
      _privateData: 'should_be_gone',
      stats: { STR: 50 },
    },
  });
  var result = validateSaveSchema(save);
  assert('valid after stripping', result.valid === true);
  assert('has sanitized state', result.sanitized && result.sanitized.state);
  assert('evilField stripped', !result.sanitized.state.evilField);
  assert('_privateData stripped', !result.sanitized.state._privateData);
  assert('stats preserved', result.sanitized.state.stats && result.sanitized.state.stats.STR === 50);
}

// ══════════════════════════════════════════════════
// 5. Dangerous value patterns → rejected
// ══════════════════════════════════════════════════
console.log('=== 5. Dangerous value patterns ===');
{
  var evil = makeValidSave({
    state: {
      eventLog: [{ text: '<script>alert(1)</script>', day: 1 }],
      runMemory: ['eval(userInput)'],
    },
  });
  var result = validateSaveSchema(evil);
  assert('valid: false', result.valid === false);
  assert('detects script tag', result.errors.some(function (e) { return e.indexOf('dangerous') >= 0; }));
}

// ══════════════════════════════════════════════════
// 6. Type confusion → sanitized (types coerced)
// ══════════════════════════════════════════════════
console.log('=== 6. Type confusion ===');
{
  var evil = makeValidSave({
    state: {
      san: 'not_a_number',
      hp: [-1, 0],
      inventory: 'not_an_array',
      npcTrust: { 'npc_1': 'five' },
    },
  });
  var result = validateSaveSchema(evil);
  assert('sanitized: san coerced to 0', result.sanitized.state.san === 0);
  assert('sanitized: hp coerced to 0', result.sanitized.state.hp === 0);
  assert('sanitized: inventory coerced to []', Array.isArray(result.sanitized.state.inventory));
  assert('sanitized: npcTrust npc_1 coerced to 0', result.sanitized.state.npcTrust['npc_1'] === 0);
}

// ══════════════════════════════════════════════════
// 7. Arbitrary key injection → stripped in sanitized
// ══════════════════════════════════════════════════
console.log('=== 7. Key whitelist enforcement ===');
{
  var save = makeValidSave({
    state: {
      _difficultyMigrated: true,
      evilField: 'hack',
      _debug: 'leaked',
      stats: { STR: 50 },
    },
  });
  var result = validateSaveSchema(save);
  assert('valid after stripping', result.valid === true);
  assert('_difficultyMigrated stripped', !result.sanitized.state._difficultyMigrated);
  assert('evilField stripped', !result.sanitized.state.evilField);
  assert('_debug stripped', !result.sanitized.state._debug);
  assert('stats preserved', result.sanitized.state.stats && result.sanitized.state.stats.STR === 50);
}

// ══════════════════════════════════════════════════
// 8. Oversized arrays → truncated
// ══════════════════════════════════════════════════
console.log('=== 8. Array limits ===');
{
  var bigEventLog = [];
  for (var i = 0; i < 500; i++) bigEventLog.push({ text: 'event ' + i, day: i });
  var save = makeValidSave({ state: { eventLog: bigEventLog, stats: { STR: 50 } } });
  var result = validateSaveSchema(save);
  assert('valid', result.valid === true);
  assert('eventLog truncated to 200', result.sanitized.state.eventLog.length <= 200);
}

// ══════════════════════════════════════════════════
// 9. quarantineSave end-to-end
// ══════════════════════════════════════════════════
console.log('=== 9. quarantineSave end-to-end ===');
{
  // Valid
  var ok = quarantineSave(makeImportJson());
  assert('valid import → ok', ok.ok === true);
  assert('has data', ok.data && ok.data.auto_1);

  // Evil: unknown keys stripped, dangerous patterns in eventLog rejected
  var evil = makeImportJson({
    state: {
      eventLog: [{ text: '<script>alert(1)</script>', day: 1 }],
      stats: { STR: 50 },
    },
  });
  var bad = quarantineSave(evil);
  assert('evil content → reject', bad.ok === false);

  // Empty
  var empty = quarantineSave(JSON.stringify({}));
  assert('empty → reject', empty.ok === false);
}

// ══════════════════════════════════════════════════
// 10. Value range checks
// ══════════════════════════════════════════════════
console.log('=== 10. Value range checks ===');
{
  var save = makeValidSave({
    meta: { san: 999, hp: -5, day: 0, loopCount: -1 },
    state: { stats: { STR: 50 } },
  });
  var result = validateSaveSchema(save);
  assert('clamped in sanitized', result.sanitized.meta.san <= 100);
  assert('hp clamped ≥ 0', result.sanitized.meta.hp >= 0);
  assert('day clamped ≥ 1', result.sanitized.meta.day >= 1);
  assert('loopCount clamped ≥ 0', result.sanitized.meta.loopCount >= 0);
}

// ══════════════════════════════════════════════════
// 11. inventory item sanitization
// ══════════════════════════════════════════════════
console.log('=== 11. Inventory sanitization ===');
{
  var save = makeValidSave({
    state: {
      inventory: [
        { id: 'item_1', name: '正常物品', uses: 3 },
        { id: 42, name: 123, uses: 'bad' },
        'bare_string_item',
        { evil: 'field' },
      ],
      stats: { STR: 50 },
    },
  });
  var result = validateSaveSchema(save);
  assert('valid after item sanitization', result.valid === true);
  assert('item 0: id=item_1', result.sanitized.state.inventory[0].id === 'item_1');
  assert('item 0: name=正常物品', result.sanitized.state.inventory[0].name === '正常物品');
  assert('item 0: uses=3', result.sanitized.state.inventory[0].uses === 3);
  assert('item 1: id=42', result.sanitized.state.inventory[1].id === '42');
  assert('item 1: uses=1 (fallback)', result.sanitized.state.inventory[1].uses === 1);
  assert('bare string → item object', result.sanitized.state.inventory[2] && typeof result.sanitized.state.inventory[2].id === 'string');
}

// ══════════════════════════════════════════════════
// Summary
// ══════════════════════════════════════════════════
console.log('\n==================================================');
console.log('Total: ' + (passed + failed) + ' tests, ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) {
  console.log('SOME TESTS FAILED');
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED');
}
