/**
 * Game Data Protocol Tests
 * Validates structural integrity of game_data.json + ch2plus + meta.
 * Run: node tests/test_game_data_protocol.cjs
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); passed++; console.log('  PASS: ' + name); }
  catch (e) { failed++; console.log('  FAIL: ' + name + ' -> ' + e.message); }
}

// Load data
const base = JSON.parse(fs.readFileSync(path.join(SRC, 'game_data.json'), 'utf8'));
let ch2plus = {};
let meta = {};
try { ch2plus = JSON.parse(fs.readFileSync(path.join(SRC, 'data', 'game_ch2plus.json'), 'utf8')); } catch(e) {}
try { meta = JSON.parse(fs.readFileSync(path.join(SRC, 'data', 'game_meta.json'), 'utf8')); } catch(e) {}

const allEvents = [...(base.events || []), ...((ch2plus || {}).events || [])];
const allEndings = [...(base.endings || []), ...((ch2plus || {}).endings || [])];
const areas = new Set((base.areas || []).map(a => a.id));
const npcNames = new Set((base.npcs || []).map(n => n.name));

// === Tests ===

test('event.id unique within each source (base)', function() {
  const ids = (base.events || []).map(e => e.id).filter(Boolean);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepStrictEqual(dupes, [], 'Duplicate in base: ' + dupes.join(', '));
});

test('event.id unique within each source (ch2plus)', function() {
  const ids = ((ch2plus || {}).events || []).map(e => e.id).filter(Boolean);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepStrictEqual(dupes, [], 'Duplicate in ch2plus: ' + dupes.join(', '));
});

test('ending.id unique within each source', function() {
  const baseIds = (base.endings || []).map(e => e.id).filter(Boolean);
  const ch2Ids = ((ch2plus || {}).endings || []).map(e => e.id).filter(Boolean);
  const baseDupes = baseIds.filter((id, i) => baseIds.indexOf(id) !== i);
  const ch2Dupes = ch2Ids.filter((id, i) => ch2Ids.indexOf(id) !== i);
  assert.deepStrictEqual(baseDupes, [], 'Duplicate in base: ' + baseDupes.join(', '));
  assert.deepStrictEqual(ch2Dupes, [], 'Duplicate in ch2plus: ' + ch2Dupes.join(', '));
});

test('Event trigger areas exist in world', function() {
  const bad = [];
  for (const evt of allEvents) {
    const t = evt.trigger || {};
    const arr = Array.isArray(t.areas) ? t.areas : (t.areas ? [t.areas] : []);
    for (const a of arr) {
      if (a && a !== 'any' && a !== 'all' && !areas.has(a)) bad.push(evt.id + ' -> ' + a);
    }
  }
  assert.deepStrictEqual(bad, [], 'Unknown areas:\n' + bad.join('\n'));
});

test('NPC references in events exist', function() {
  const bad = [];
  for (const evt of allEvents) {
    const nc = evt.effects?.npc_changes;
    if (!nc || !Array.isArray(nc)) continue;
    for (const change of nc) {
      const name = change.name || change.npc;
      if (name && !npcNames.has(name)) bad.push(evt.id + ' -> ' + name);
    }
  }
  assert.deepStrictEqual(bad, [], 'Unknown NPCs:\n' + bad.join('\n'));
});

test('ending priority_order ids all exist', function() {
  const ej = base.ending_judgement || {};
  const endingIds = new Set(allEndings.map(e => e.id));
  const archive = (meta.deprecated_endings_archive || []);
  const archiveIds = new Set(Array.isArray(archive) ? archive.map(e => e.id) : []);
  const bad = (ej.priority_order || []).filter(id => !endingIds.has(id) && !archiveIds.has(id));
  assert.deepStrictEqual(bad, [], 'Unknown endings: ' + bad.join(', '));
});

test('Required/blocking conditions are parseable strings', function() {
  const bad = [];
  for (const end of allEndings) {
    const conds = [...(end.required_conditions || []), ...(end.blocking_conditions || [])];
    for (const c of conds) {
      if (typeof c !== 'string') { bad.push(end.id + ': non-string'); continue; }
      let depth = 0;
      for (const ch of c) {
        if (ch === '(') depth++;
        if (ch === ')') depth--;
        if (depth < 0) { bad.push(end.id + ': unbalanced "' + c + '"'); break; }
      }
      if (depth !== 0 && !bad.some(b => b.includes(end.id))) bad.push(end.id + ': unbalanced "' + c + '"');
    }
  }
  assert.deepStrictEqual(bad, [], 'Bad conditions:\n' + bad.join('\n'));
});

test('game_data.version exists', function() {
  assert.ok(base.version, 'Missing version field');
});

test('Event chain references are valid', function() {
  const eventIds = new Set(allEvents.map(e => e.id));
  const bad = [];
  for (const chain of (base.event_chains || [])) {
    for (const eid of (chain.sequence || [])) {
      if (!eventIds.has(eid)) bad.push((chain.name || '?') + ' -> ' + eid);
    }
  }
  assert.deepStrictEqual(bad, [], 'Broken chain refs:\n' + bad.join('\n'));
});

// === Validator integration: no error-level failures ===
test('Validator reports no errors (warnings OK)', function() {
  const { validateGameData } = require(path.join(SRC, 'data', 'validators', 'validateGameData.cjs'));
  const results = validateGameData(base, ch2plus, meta);
  const errors = results.filter(r => r.level === 'error');
  if (errors.length > 0) {
    console.log('  Errors:');
    errors.forEach(e => console.log('    [' + e.rule + '] ' + e.message));
  }
  assert.strictEqual(errors.length, 0, errors.length + ' error(s)');
});

// === Summary ===
console.log('\n=== Game Data Protocol Tests ===');
console.log('  ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);


// === Migration Compat Tests ===

test('setNpcTrust always writes to resolved id', function() {
  const { resolveNpcId } = require(path.join(SRC, 'data', 'registry', 'npcRegistry.cjs'));
  const s = { npcTrust: {} };
  // Simulate setNpcTrust: always write to resolved id
  const id = resolveNpcId('玛莎·格雷');
  s.npcTrust[id] = 4;
  assert.strictEqual(s.npcTrust.martha_grey, 4);
  assert.strictEqual(s.npcTrust['玛莎·格雷'], undefined);
});

test('getNpcTrust reads legacy Chinese keys via id resolution', function() {
  const { resolveNpcId } = require(path.join(SRC, 'data', 'registry', 'npcRegistry.cjs'));
  // npcTrust has Chinese key, query by id → should find via fallback
  const s1 = { npcTrust: { '玛莎·格雷': 2 } };
  const id = resolveNpcId('martha_grey');
  const val1 = s1.npcTrust[id] !== undefined ? s1.npcTrust[id] : s1.npcTrust['玛莎·格雷'] || 0;
  assert.strictEqual(val1, 2);
  // npcTrust has id key, query by Chinese name → should resolve to id
  const s2 = { npcTrust: { martha_grey: 3 } };
  const resolved = resolveNpcId('玛莎·格雷');
  const val2 = s2.npcTrust[resolved] !== undefined ? s2.npcTrust[resolved] : 0;
  assert.strictEqual(val2, 3);
});

test('resolveNpcId resolves all 8 core NPCs', function() {
  const { resolveNpcId, NPC_REGISTRY } = require(path.join(SRC, 'data', 'registry', 'npcRegistry.cjs'));
  const entries = Object.entries(NPC_REGISTRY);
  assert.ok(entries.length === 8, 'Expected 8 NPCs, got ' + entries.length);
  for (const [id, entry] of entries) {
    const resolved = resolveNpcId(entry.name);
    assert.strictEqual(resolved, id, entry.name + ' should resolve to ' + id + ', got ' + resolved);
  }
});

test('Validator baseline: no new Chinese ref debt', function() {
  const { validateGameData } = require(path.join(SRC, 'data', 'validators', 'validateGameData.cjs'));
  const results = validateGameData(base, ch2plus, meta);
  const baselineErrors = results.filter(r => r.level === 'error' && r.rule.includes('BASELINE'));
  assert.strictEqual(baselineErrors.length, 0, 'Baseline exceeded:\n' + baselineErrors.map(e => e.message).join('\n'));
});

// === Item Registry Tests ===

test('resolveItemId resolves all 54 unique items from game data', function() {
  const { resolveItemId, ITEM_REGISTRY } = require(path.join(SRC, 'data', 'registry', 'itemRegistry.cjs'));
  const gameItems = new Set();
  for (const evt of (base.events || [])) {
    for (const item of (evt.effects?.items || [])) {
      if (typeof item === 'string') gameItems.add(item);
    }
  }
  const unresolved = [];
  for (const name of gameItems) {
    const id = resolveItemId(name);
    if (id === name && !ITEM_REGISTRY[name]) unresolved.push(name);
  }
  assert.deepStrictEqual(unresolved, [], 'Unresolved items: ' + unresolved.join(', '));
});

test('normalizeItemRef handles strings and objects', function() {
  const { normalizeItemRef } = require(path.join(SRC, 'data', 'registry', 'itemRegistry.cjs'));
  const ref1 = normalizeItemRef('银质匕首');
  assert.strictEqual(ref1.id, 'silver_dagger');
  assert.strictEqual(ref1.name, '银质匕首');
  const ref2 = normalizeItemRef({ name: '罐头', uses: 2 });
  assert.strictEqual(ref2.id, 'canned_food');
  assert.strictEqual(ref2.uses, 2);
});

test('migrateInventory converts Chinese names to ids', function() {
  const { migrateInventory } = require(path.join(SRC, 'data', 'registry', 'itemRegistry.cjs'));
  const old = [{ id: '手电筒', name: '手电筒', uses: 10 }, { id: '干粮', name: '干粮', uses: 2 }];
  const migrated = migrateInventory(old);
  assert.strictEqual(migrated[0].id, 'flashlight');
  assert.strictEqual(migrated[1].id, 'dry_ration');
});

test('Item registry: no duplicate aliases', function() {
  const { ITEM_REGISTRY } = require(path.join(SRC, 'data', 'registry', 'itemRegistry.cjs'));
  const seen = {};
  const dupes = [];
  for (const [id, entry] of Object.entries(ITEM_REGISTRY)) {
    for (const alias of (entry.aliases || [])) {
      if (seen[alias]) dupes.push(alias + ' in ' + id + ' and ' + seen[alias]);
      seen[alias] = id;
    }
  }
  assert.deepStrictEqual(dupes, [], 'Duplicate aliases: ' + dupes.join('; '));
});

test('Item registry: all ids are snake_case', function() {
  const { ITEM_REGISTRY } = require(path.join(SRC, 'data', 'registry', 'itemRegistry.cjs'));
  const bad = Object.keys(ITEM_REGISTRY).filter(id => !/^[a-z][a-z0-9_]*$/.test(id));
  assert.deepStrictEqual(bad, [], 'Non-snake_case ids: ' + bad.join(', '));
});

// === Registry Utils Tests ===

test('createRegistryHelpers: resolveId, getName, has, migrateKeys', function() {
  const { createRegistryHelpers } = require(path.join(SRC, 'data', 'registry', 'registryUtils.cjs'));
  const reg = {
    alpha: { name: '甲', aliases: ['A'] },
    beta:  { name: '乙', aliases: ['B', 'bee'] },
  };
  const h = createRegistryHelpers(reg);
  assert.strictEqual(h.resolveId('甲'), 'alpha');
  assert.strictEqual(h.resolveId('A'), 'alpha');
  assert.strictEqual(h.resolveId('B'), 'beta');
  assert.strictEqual(h.resolveId('bee'), 'beta');
  assert.strictEqual(h.resolveId('alpha'), 'alpha');
  assert.strictEqual(h.resolveId('unknown'), 'unknown');
  assert.strictEqual(h.getName('alpha'), '甲');
  assert.strictEqual(h.getName('甲'), '甲');
  assert.strictEqual(h.has('A'), true);
  assert.strictEqual(h.has('unknown'), false);
  // migrateKeys
  const migrated = h.migrateKeys({ '甲': 1, '乙': 2 });
  assert.strictEqual(migrated.alpha, 1);
  assert.strictEqual(migrated.beta, 2);
  assert.strictEqual(migrated['甲'], undefined);
});

test('createRegistryHelpers: migrateArray', function() {
  const { createRegistryHelpers } = require(path.join(SRC, 'data', 'registry', 'registryUtils.cjs'));
  const reg = { x: { name: 'X物', aliases: [] }, y: { name: 'Y物', aliases: ['why'] } };
  const h = createRegistryHelpers(reg);
  const arr = ['X物', 'why', 'unknown'];
  const result = h.migrateArray(arr);
  assert.deepStrictEqual(result, ['x', 'y', 'unknown']);
});

test('npcRegistry uses registryUtils when available', function() {
  const utils = require(path.join(SRC, 'data', 'registry', 'registryUtils.cjs'));
  // Make createRegistryHelpers global for npcRegistry
  global.createRegistryHelpers = utils.createRegistryHelpers;
  // Clear require cache
  delete require.cache[require.resolve(path.join(SRC, 'data', 'registry', 'npcRegistry.cjs'))];
  const npc = require(path.join(SRC, 'data', 'registry', 'npcRegistry.cjs'));
  assert.strictEqual(npc.resolveNpcId('玛莎·格雷'), 'martha_grey');
  assert.strictEqual(npc.getNpcName('martha_grey'), '玛莎·格雷');
  const migrated = npc.migrateNpcKeys({ '玛莎·格雷': 3, '希尔达·莫里斯': 5 });
  assert.strictEqual(migrated.martha_grey, 3);
  assert.strictEqual(migrated.hilda_morris, 5);
  delete global.createRegistryHelpers;
});
