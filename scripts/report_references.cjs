const fs = require('fs');
const path = require('path');
const SRC = path.join(__dirname, '..', 'src');
const DATA = path.join(SRC, 'data');
const base = JSON.parse(fs.readFileSync(path.join(DATA, 'game_base.json'), 'utf8'));
let ch2plus = {};
let meta = {};
try {
  ch2plus = JSON.parse(fs.readFileSync(path.join(DATA, 'game_ch2plus.json'), 'utf8'));
} catch (e) {}
try {
  meta = JSON.parse(fs.readFileSync(path.join(DATA, 'game_meta.json'), 'utf8'));
} catch (e) {}
const allEvents = [...(base.events || []), ...(ch2plus.events || [])];
const allEndings = [...(base.endings || []), ...(ch2plus.endings || [])];
const npcs = base.npcs || [];
const areas = base.areas || [];

// NPC refs
console.log('\n=== NPC REFERENCE MAP ===');
const npcNames = npcs.map((n) => n.name);
const npcRefs = {};
for (const name of npcNames) npcRefs[name] = { events: [], effects: [], endings: [] };
for (const evt of allEvents) {
  const text = JSON.stringify(evt);
  for (const name of npcNames) {
    if (text.includes(name)) npcRefs[name].events.push(evt.id);
  }
  const nc = evt.effects?.npc_changes;
  if (Array.isArray(nc)) {
    for (const c of nc) {
      const n = c.name || c.npc;
      if (n && npcRefs[n]) npcRefs[n].effects.push(evt.id);
    }
  }
}
for (const end of allEndings) {
  const text = JSON.stringify(end);
  for (const name of npcNames) {
    if (text.includes(name)) npcRefs[name].endings.push(end.id);
  }
}
for (const [name, refs] of Object.entries(npcRefs)) {
  console.log(
    name +
      ': events=' +
      refs.events.length +
      ' effects=' +
      refs.effects.length +
      ' endings=' +
      refs.endings.length
  );
}

// Area refs
console.log('\n=== AREA REFERENCE MAP ===');
const areaIds = areas.map((a) => a.id);
for (const id of areaIds) {
  let count = 0;
  for (const evt of allEvents) {
    const t = evt.trigger || {};
    const arr = Array.isArray(t.areas) ? t.areas : t.areas ? [t.areas] : [];
    if (arr.includes(id)) count++;
  }
  console.log(id + ': ' + count + ' trigger refs');
}

// Chinese name as logic key
console.log('\n=== CHINESE NAME LOGIC KEYS ===');
let nameAsKeyCount = 0;
for (const evt of allEvents) {
  const nc = evt.effects?.npc_changes || [];
  for (const c of nc) {
    const n = c.name || c.npc;
    if (n && npcNames.includes(n)) {
      nameAsKeyCount++;
    }
  }
  const trigger = evt.trigger || {};
  const cond = typeof trigger.condition === 'string' ? trigger.condition : '';
  for (const name of npcNames) {
    if (cond.includes(name + 'trust') || cond.includes(name + 'Trust')) {
      nameAsKeyCount++;
    }
  }
}
console.log('Total Chinese name as logic key: ' + nameAsKeyCount);
console.log('npcTrust keys (save dependency): ' + npcNames.join(', '));

// Clue refs
console.log('\n=== CLUE REFERENCE MAP ===');
const clueRefs = {};
for (const evt of allEvents) {
  const text = JSON.stringify(evt.effects || {});
  const matches = text.match(/clue_[a-z0-9_]+/g) || [];
  for (const m of matches) {
    if (!clueRefs[m]) clueRefs[m] = 0;
    clueRefs[m]++;
  }
}
console.log('Unique clue IDs: ' + Object.keys(clueRefs).length);
for (const [id, count] of Object.entries(clueRefs).slice(0, 8)) {
  console.log('  ' + id + ': ' + count + ' refs');
}

// Asset refs
console.log('\n=== ASSET REFERENCE MAP ===');
const portraitContent = fs.readFileSync(path.join(SRC, 'portraitMap.js'), 'utf8');
const webpRefs = portraitContent.match(/'[^']+\.webp'/g) || [];
console.log('Total webp assets in portraitMap: ' + webpRefs.length);
const npcWithPortraits = npcNames.filter((n) => portraitContent.includes("'" + n + "'"));
console.log('NPCs with portraits: ' + npcWithPortraits.length + '/' + npcNames.length);

// Summary
console.log('\n=== MIGRATION IMPACT SUMMARY ===');
console.log('NPCs: ' + npcNames.length);
console.log('Events: ' + allEvents.length);
console.log('Endings: ' + allEndings.length);
console.log('Areas: ' + areaIds.length);
console.log('Clue IDs: ' + Object.keys(clueRefs).length);
console.log('Webp assets: ' + webpRefs.length);
console.log('Chinese name logic refs: ' + nameAsKeyCount);

// === DEBT TREND vs BASELINES ===
console.log('');
console.log('=== DEBT TREND vs BASELINES ===');
var baselines = {};
try {
  baselines = JSON.parse(
    fs.readFileSync(path.join(SRC, '..', 'scripts', 'validators', 'baselines.json'), 'utf8')
  );
} catch (e) {}
var npcBase = baselines.chineseNpcRefs || 0;
var itemBase = baselines.chineseItemRefs || 0;
var npcDelta = nameAsKeyCount - npcBase;
var itemCount = 0;
for (var _ei = 0; _ei < allEvents.length; _ei++) {
  var _items =
    allEvents[_ei].effects && allEvents[_ei].effects.items ? allEvents[_ei].effects.items : [];
  for (var _ii = 0; _ii < _items.length; _ii++) {
    if (typeof _items[_ii] === 'string' && /[一-鿿]/.test(_items[_ii])) itemCount++;
  }
}
var itemDelta = itemCount - itemBase;
console.log(
  '  Chinese NPC refs:   ' +
    nameAsKeyCount +
    ' / baseline ' +
    npcBase +
    (npcDelta > 0
      ? ' UP' + npcDelta + ' NEW DEBT'
      : npcDelta < 0
        ? ' DOWN' + Math.abs(npcDelta)
        : ' (at baseline)')
);
console.log(
  '  Chinese item refs:  ' +
    itemCount +
    ' / baseline ' +
    itemBase +
    (itemDelta > 0
      ? ' UP' + itemDelta + ' NEW DEBT'
      : itemDelta < 0
        ? ' DOWN' + Math.abs(itemDelta)
        : ' (at baseline)')
);
if (npcDelta > 0 || itemDelta > 0) {
  console.log('');
  console.log('  [!] NEW DEBT DETECTED - update baselines.json or fix references');
  process.exit(1);
}
