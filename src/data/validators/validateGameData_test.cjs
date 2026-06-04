// src/data/validators/validateGameData.js
// Build-time / test-time validator for game data integrity.
// Run: node src/data/validators/validateGameData.js
// Returns array of { level: 'error'|'warn', rule: string, message: string, context?: string }

function validateGameData(base, ch2plus, meta) {
  const errors = [];
  const warn = (rule, msg, ctx) => errors.push({ level: 'warn', rule, message: msg, context: ctx });
  const error = (rule, msg, ctx) => errors.push({ level: 'error', rule, message: msg, context: ctx });

  const events = [...(base.events || []), ...((ch2plus || {}).events || [])];
  const endings = [...(base.endings || []), ...((ch2plus || {}).endings || [])];
  const npcs = base.npcs || [];
  const areas = base.areas || [];
  const areaIds = new Set(areas.map(a => a.id));
  const npcNames = new Set(npcs.map(n => n.name));
  const eventIds = new Set();
  const endingIds = new Set();

  // Known valid effect keys (from effectReducer + legacy)
  const VALID_EFFECT_KEYS = new Set([
    'HP', 'hp', 'san', 'food', 'mythos', 'humanity',
    'add_flag', 'add_clue', 'add_item', 'npc_trust',
    'safehouseCorruption', 'add_run_memory',
    'unlock_ending_condition', 'death_hint',
    'items', 'npc_changes', 'fatigue',
    'harbor_night_risk_reduction', 'investigation_bonus',
    '_meta_effect',
  ]);

  // ── Rule 1: event.id uniqueness ──
  // Check within each source (base/ch2plus) for true duplicates.
  // Cross-source overlaps are expected (split JSON) — warn only.
  (function() {
    const baseIds = new Set();
    for (const evt of (base.events || [])) {
      if (!evt.id) { error('E01', 'Event missing id in base', JSON.stringify(evt).slice(0, 80)); continue; }
      if (baseIds.has(evt.id)) { error('E01', 'Duplicate event id in base: ' + evt.id); }
      baseIds.add(evt.id); eventIds.add(evt.id);
    }
    for (const evt of ((ch2plus || {}).events || [])) {
      if (!evt.id) { error('E01', 'Event missing id in ch2plus', JSON.stringify(evt).slice(0, 80)); continue; }
      if (baseIds.has(evt.id)) { warn('E01', 'Event id overlaps base: ' + evt.id + ' (expected in split JSON)'); }
      eventIds.add(evt.id);
    }
  })();

  // ── Rule 2: ending.id uniqueness ──
  (function() {
    const baseIds = new Set();
    for (const end of (base.endings || [])) {
      if (!end.id) { error('E02', 'Ending missing id in base', JSON.stringify(end).slice(0, 80)); continue; }
      if (baseIds.has(end.id)) { error('E02', 'Duplicate ending id in base: ' + end.id); }
      baseIds.add(end.id); endingIds.add(end.id);
    }
    for (const end of ((ch2plus || {}).endings || [])) {
      if (!end.id) { error('E02', 'Ending missing id in ch2plus', JSON.stringify(end).slice(0, 80)); continue; }
      if (baseIds.has(end.id)) { warn('E02', 'Ending id overlaps base: ' + end.id + ' (expected in split JSON)'); }
      endingIds.add(end.id);
    }
  })();

  // ── Rule 3: event.effects keys are recognized ──
  for (const evt of events) {
    const eff = evt.effects;
    if (!eff || typeof eff !== 'object') continue;
    for (const key of Object.keys(eff)) {
      if (!VALID_EFFECT_KEYS.has(key)) {
        warn('E03', 'Unknown effect key "' + key + '" in event ' + evt.id, evt.id);
      }
    }
  }

  // ── Rule 4: event trigger areas exist in world ──
  for (const evt of events) {
    const trigger = evt.trigger || {};
    const triggerAreas = trigger.areas || [];
    const arr = Array.isArray(triggerAreas) ? triggerAreas : [triggerAreas];
    for (const a of arr) {
      if (a && a !== 'any' && a !== 'all' && !areaIds.has(a)) {
        error('E04', 'Event ' + evt.id + ' references unknown area: ' + a, evt.id);
      }
    }
  }

  // ── Rule 5: NPC references in events exist ──
  for (const evt of events) {
    const npcChanges = evt.effects?.npc_changes;
    if (!npcChanges || !Array.isArray(npcChanges)) continue;
    for (const nc of npcChanges) {
      const name = nc.name || nc.npc;
      if (name && !npcNames.has(name)) {
        warn('E05', 'Event ' + evt.id + ' references unknown NPC: ' + name, evt.id);
      }
    }
  }

  // ── Rule 6: ending priority_order ids exist ──
  const ej = base.ending_judgement || (ch2plus || {}).ending_judgement || {};
  const priorityOrder = ej.priority_order || [];
  for (const eid of priorityOrder) {
    if (!endingIds.has(eid)) {
      // Check deprecated archive too
      const archive = (meta || {}).deprecated_endings_archive || [];
      const inArchive = Array.isArray(archive) && archive.some(e => e.id === eid);
      if (!inArchive) {
        error('E06', 'priority_order references unknown ending: ' + eid, eid);
      }
    }
  }

  // ── Rule 7: ending required_conditions are parseable ──
  for (const end of endings) {
    const conditions = [...(end.required_conditions || []), ...(end.blocking_conditions || [])];
    for (const cond of conditions) {
      if (typeof cond !== 'string') { error('E07', 'Non-string condition in ' + end.id, end.id); continue; }
      // Check for balanced parentheses
      let depth = 0;
      for (const ch of cond) {
        if (ch === '(') depth++;
        if (ch === ')') depth--;
        if (depth < 0) { error('E07', 'Unbalanced parens in ' + end.id + ': ' + cond, end.id); break; }
      }
      if (depth !== 0) error('E07', 'Unbalanced parens in ' + end.id + ': ' + cond, end.id);
      // Check for empty conditions
      if (cond.trim().length === 0) error('E07', 'Empty condition in ' + end.id, end.id);
    }
  }

  // ── Rule 8: clue chain references ──
  const clueChains = base.clue_chains || [];
  const clueIds = new Set();
  for (const chain of clueChains) {
    for (const clue of chain.clues || []) {
      if (clue.id) clueIds.add(clue.id);
    }
  }

  // ── Rule 9: game version exists ──
  if (!base.version) {
    warn('E09', 'game_data.json missing version field');
  }

  // ── Rule 10: event_chains sequence references valid events ──
  const chains = base.event_chains || [];
  for (const chain of chains) {
    for (const eid of (chain.sequence || [])) {
      if (!eventIds.has(eid)) {
        warn('E10', 'Event chain "' + (chain.name || '?') + '" references unknown event: ' + eid);
      }
    }
  }

  // ── Migration Guardrails (E11-E14) ──
  // Historical debt allowed up to baseline. New debt = error.

  // Baselines (snapshot of current debt — bump when intentional additions are made)
  const BASELINES = {
    E11_chinese_npc_refs: 22,   // Chinese NPC names in event effects
    E12_chinese_item_refs: 106, // Chinese item names in effects.items
    E13_chinese_npc_conds: 8,   // Chinese NPC names in ending conditions
  };

  // Rule 11: Chinese NPC names as logic keys in events
  const npcNameList = npcs.map(n => n.name);
  let e11Count = 0;
  for (const evt of events) {
    const nc = evt.effects?.npc_changes || [];
    for (const c of nc) {
      const name = c.name || c.npc;
      if (name && npcNameList.includes(name)) {
        e11Count++;
        if (e11Count <= 3) warn('E11', 'NPC by Chinese name: ' + evt.id + ' -> ' + name, evt.id);
      }
    }
  }
  if (e11Count > BASELINES.E11_chinese_npc_refs) {
    error('E11_BASELINE', 'Chinese NPC refs ' + e11Count + ' exceeds baseline ' + BASELINES.E11_chinese_npc_refs + '. New references must use stable IDs.');
  } else if (e11Count > 0) {
    warn('E11', 'Chinese NPC refs: ' + e11Count + '/' + BASELINES.E11_chinese_npc_refs + ' (within baseline, migrate when ready)');
  }

  // Rule 12: Chinese item names in effects.items
  let e12Count = 0;
  for (const evt of events) {
    const items = evt.effects?.items || [];
    for (const item of items) {
      if (typeof item === 'string' && /[一-鿿]/.test(item)) e12Count++;
    }
  }
  if (e12Count > BASELINES.E12_chinese_item_refs) {
    error('E12_BASELINE', 'Chinese item refs ' + e12Count + ' exceeds baseline ' + BASELINES.E12_chinese_item_refs + '. New references must use stable IDs.');
  } else if (e12Count > 0) {
    warn('E12', 'Chinese item refs: ' + e12Count + '/' + BASELINES.E12_chinese_item_refs + ' (within baseline)');
  }

  // Rule 13: Chinese NPC names in ending conditions
  let e13Count = 0;
  for (const end of endings) {
    const allConds = [
      ...(end.required_conditions || []),
      ...(end.blocking_conditions || []),
      JSON.stringify(end.npc_requirements || {}),
    ].join(' ');
    for (const name of npcNameList) {
      if (allConds.includes(name)) e13Count++;
    }
  }
  if (e13Count > BASELINES.E13_chinese_npc_conds) {
    error('E13_BASELINE', 'Chinese NPC ending conds ' + e13Count + ' exceeds baseline ' + BASELINES.E13_chinese_npc_conds);
  } else if (e13Count > 0) {
    warn('E13', 'Chinese NPC ending conds: ' + e13Count + '/' + BASELINES.E13_chinese_npc_conds + ' (within baseline)');
  }

  // Rule 14: Strict — unknown NPC references in events must fail (not passthrough)
  // Runtime allows unknown passthrough; validator does NOT.
  for (const evt of events) {
    const nc = evt.effects?.npc_changes || [];
    for (const c of nc) {
      const name = c.name || c.npc;
      if (name && !npcNameList.includes(name)) {
        // Not a known Chinese name — check if it looks like a valid id
        if (/[一-鿿]/.test(name)) {
          error('E14', 'Unknown Chinese NPC reference in ' + evt.id + ': ' + name + ' (not in npcRegistry)', evt.id);
        }
      }
    }
  }

  // ── Item Registry Guardrails (E15-E19) ──

  // Load item registry if available
  var itemRegistry = null;
  try { itemRegistry = require('./itemRegistry.js'); } catch(e) {}
  if (!itemRegistry) try { itemRegistry = require('../registry/itemRegistry.cjs'); } catch(e) {}

  if (itemRegistry && itemRegistry.ITEM_REGISTRY) {
    var knownItemNames = new Set(Object.values(itemRegistry.ITEM_REGISTRY).map(function(e) { return e.name; }));
    var knownItemIds = new Set(Object.keys(itemRegistry.ITEM_REGISTRY));

    // Rule 15: Unknown item references in events
    for (const evt of events) {
      const items = evt.effects?.items || [];
      for (const item of items) {
        if (typeof item === 'string') {
          var resolved = itemRegistry.resolveItemId(item);
          if (resolved === item && /[一-鿿]/.test(item) && !knownItemNames.has(item)) {
            error('E15', 'Unknown item reference in ' + evt.id + ': ' + item, evt.id);
          }
        }
      }
    }

    // Rule 16: Duplicate item aliases
    var aliasMap = {};
    for (var id in itemRegistry.ITEM_REGISTRY) {
      var entry = itemRegistry.ITEM_REGISTRY[id];
      for (var ai = 0; ai < (entry.aliases || []).length; ai++) {
        var alias = entry.aliases[ai];
        if (aliasMap[alias]) error('E16', 'Duplicate item alias: "' + alias + '" in ' + id + ' and ' + aliasMap[alias]);
        aliasMap[alias] = id;
      }
    }

    // Rule 17: Item id naming (must be snake_case)
    for (var iid in itemRegistry.ITEM_REGISTRY) {
      if (!/^[a-z][a-z0-9_]*$/.test(iid)) {
        warn('E17', 'Item id not snake_case: ' + iid);
      }
    }

    // Rule 18: Item type must be valid
    var VALID_ITEM_TYPES = new Set(['food', 'light', 'tool', 'healing', 'key', 'clue', 'weapon', 'ritual', 'misc']);
    for (var tid in itemRegistry.ITEM_REGISTRY) {
      var t = itemRegistry.ITEM_REGISTRY[tid].type;
      if (t && !VALID_ITEM_TYPES.has(t)) {
        warn('E18', 'Invalid item type in ' + tid + ': ' + t);
      }
    }
  }

  return errors;
}

// Export for CJS (tests) and browser (build-time)
module.exports = { validateGameData };
