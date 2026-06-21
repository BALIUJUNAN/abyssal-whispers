// src/utils/buildEventPool.js — UGC Merge Engine
// Combines base game events with enabled UGC mod events.
//
// Architecture contract:
//   - This function produces a single flat array of event objects.
//   - selectEventV2 (Layer 2) receives this array and works unchanged.
//   - Base game events always win on ID conflict.
//   - UGC events are tagged with source='ugc' for the rendering layer.

import { getEnabledMods } from '../reducers/ugcReducer.js';
import {
  findIdConflicts, prefixEventIds,
  findNpcConflicts, prefixNpcIds,
  findItemConflicts, prefixItemIds,
  findAreaConflicts, prefixAreaIds,
  findEndingConflicts, prefixEndingIds,
} from '../data/ugcSchema.js';
import { registerModTextSwaps, clearModTextSwaps } from '../systems/textVariants.js';

/**
 * Build the complete event pool: base game + enabled UGC mods.
 *
 * @param {object} GD - the global game data object (contains GD.events as base pool)
 * @param {object[]} [ugcMods] - optional explicit mod array; if omitted, reads from localStorage
 * @returns {{ events: object[], ugcCount: number, conflicts: string[] }}
 */
export function buildEventPool(GD, ugcMods) {
  const baseEvents = GD.events || [];
  const baseIdSet = new Set(baseEvents.map((e) => e.id));

  // Load mods from storage if not provided
  const mods = ugcMods || getEnabledMods();

  if (mods.length === 0) {
    return { events: baseEvents, ugcCount: 0, conflicts: [] };
  }

  const allUgcEvents = [];
  const allConflicts = [];

  for (const mod of mods) {
    if (!mod.events || !Array.isArray(mod.events)) continue;
    if (mod.enabled === false) continue;

    // Clone events to avoid mutating stored data
    const modEvents = mod.events.map((e) => ({ ...e }));

    // Find conflicts with base game
    const conflicts = findIdConflicts(
      modEvents,
      baseEvents.map((id) => ({ id: id.id || id }))
    );
    if (conflicts.length > 0) {
      // Auto-prefix conflicting IDs
      prefixEventIds(modEvents, mod.id);
      allConflicts.push(...conflicts.map((c) => `${mod.id}: ${c} → ${mod.id}__${c}`));
    }

    // Tag all events from this mod
    for (const evt of modEvents) {
      if (!evt.source) evt.source = 'ugc';
      if (!evt._ugcModId) evt._ugcModId = mod.id;
      if (!evt._ugcAuthor) evt._ugcAuthor = mod.author;
    }

    allUgcEvents.push(...modEvents);
  }

  // Deduplicate within UGC pool (in case two mods have same ID after prefixing)
  const seenUgcIds = new Set();
  const uniqueUgcEvents = [];
  for (const evt of allUgcEvents) {
    if (seenUgcIds.has(evt.id)) {
      allConflicts.push(`duplicate UGC event ID: ${evt.id} (skipped)`);
      continue;
    }
    seenUgcIds.add(evt.id);
    uniqueUgcEvents.push(evt);
  }

  // Final pool: base game first (wins on conflict), then UGC
  const merged = [...baseEvents, ...uniqueUgcEvents];

  return {
    events: merged,
    ugcCount: uniqueUgcEvents.length,
    conflicts: allConflicts,
  };
}

/**
 * Apply UGC events to the live GD object.
 * Call this after initExtendedEvents() during app startup.
 *
 * @param {object} GD - the global game data object
 * @returns {{ added: number, conflicts: string[] }}
 */
export function applyUgcToGD(GD) {
  const { events, ugcCount, conflicts } = buildEventPool(GD);

  // Replace GD.events with the merged pool
  GD.events = events;
  GD._ugcEventCount = ugcCount;
  GD._ugcConflicts = conflicts;

  // Wire up mod difficulty modifiers
  const mods = getEnabledMods();
  const diffLevel = GD.systems?.difficulty?.current_level || GD.difficultyLevel || 1;
  var totalCorruptionBoost = 1.0;
  var totalNpcTrustMult = 1.0;
  var allSwaps = [];

  for (const mod of mods) {
    const dm = mod.difficulty_modifiers;
    if (!dm) continue;
    if (diffLevel < (dm.min_difficulty || 1)) continue;
    if (diffLevel > (dm.max_difficulty || 21)) continue;
    if (typeof dm.text_corruption_boost === 'number') {
      totalCorruptionBoost *= dm.text_corruption_boost;
    }
    if (typeof dm.npc_trust_multiplier === 'number') {
      totalNpcTrustMult *= dm.npc_trust_multiplier;
    }
    if (Array.isArray(dm.custom_text_swaps)) {
      allSwaps.push(...dm.custom_text_swaps.slice(0, 20));
    }
  }

  // Apply to GD for runtime access
  GD._modDifficultyModifiers = {
    textCorruptionBoost: Math.min(5, totalCorruptionBoost),
    npcTrustMultiplier: Math.max(0, Math.min(2, totalNpcTrustMult)),
    customSwaps: allSwaps.slice(0, 50),
  };

  // Register text swaps with the text variant system
  if (allSwaps.length > 0) {
    registerModTextSwaps(allSwaps);
  }

  if (ugcCount > 0) {
    // UGC events merged into GD.events + difficulty modifiers applied
  }

  // Merge extended entity types from enabled mods
  var modsForMerge = ugcMods || getEnabledMods();
  mergeNpcs(GD, modsForMerge);
  mergeItems(GD, modsForMerge);
  mergeAreas(GD, modsForMerge);
  mergeEndings(GD, modsForMerge);

  return { added: ugcCount, conflicts };
}

/**
 * Get a preview of what a mod would add (without installing).
 * Useful for the import UI's "preview" step.
 *
 * @param {object} rawMod - the raw mod object
 * @param {object} GD - game data for conflict checking
 * @returns {{ eventCount: number, conflicts: string[], types: object }}
 */
export function previewMod(rawMod, GD) {
  const baseIdSet = new Set((GD.events || []).map((e) => e.id));
  const events = rawMod.events || [];
  const conflicts = [];
  const types = {};

  for (const evt of events) {
    if (baseIdSet.has(evt.id)) {
      conflicts.push(evt.id);
    }
    const t = evt.type || 'unknown';
    types[t] = (types[t] || 0) + 1;
  }

  return {
    eventCount: events.length,
    npcCount: (rawMod.npcs || []).length,
    itemCount: (rawMod.items || []).length,
    areaCount: (rawMod.areas || []).length,
    endingCount: (rawMod.endings || []).length,
    conflicts: conflicts,
    types: types,
  };
}

// ── Entity Merge Functions ──

/**
 * Merge mod NPCs into GD.npcs. Also injects into window.NPC_REGISTRY for runtime resolution.
 */
export function mergeNpcs(GD, ugcMods) {
  var base = GD.npcs || [];
  var baseIds = {};
  base.forEach(function (n) { baseIds[n.id] = true; });
  var allUgc = [];
  var conflicts = [];
  ugcMods.forEach(function (mod) {
    if (!mod.npcs || !Array.isArray(mod.npcs) || mod.enabled === false) return;
    var cloned = mod.npcs.map(function (n) {
      var o = {};
      for (var k in n) o[k] = n[k];
      o._ugcModId = mod.id;
      o._ugcAuthor = mod.author;
      return o;
    });
    var c = findNpcConflicts(cloned, base);
    if (c.length) {
      prefixNpcIds(cloned, mod.id);
      c.forEach(function (id) {
        conflicts.push(mod.id + ': ' + id + ' -> ' + mod.id + '__' + id);
      });
    }
    allUgc.push.apply(allUgc, cloned);
  });
  var seen = {};
  var unique = [];
  allUgc.forEach(function (n) {
    if (seen[n.id]) {
      conflicts.push('duplicate UGC npc ID: ' + n.id);
      return;
    }
    seen[n.id] = true;
    unique.push(n);
  });
  GD.npcs = base.concat(unique);
  GD._ugcNpcCount = unique.length;
  GD._ugcNpcConflicts = conflicts;
  // Sync into NPC_REGISTRY for portrait resolution
  unique.forEach(function (n) {
    if (!window.NPC_REGISTRY) window.NPC_REGISTRY = {};
    window.NPC_REGISTRY[n.id] = {
      name: n.name,
      aliases: n.aliases || [],
      portrait: n.portrait_hint ? { normal: n.portrait_hint } : {},
    };
  });
  return { added: unique.length, conflicts: conflicts };
}

/**
 * Merge mod items into GD.items. Also injects into window.ITEM_REGISTRY.
 */
export function mergeItems(GD, ugcMods) {
  var base = GD.items || [];
  var baseIds = {};
  base.forEach(function (i) { baseIds[i.id] = true; });
  var allUgc = [];
  var conflicts = [];
  ugcMods.forEach(function (mod) {
    if (!mod.items || !Array.isArray(mod.items) || mod.enabled === false) return;
    var cloned = mod.items.map(function (i) {
      var o = {};
      for (var k in i) o[k] = i[k];
      o._ugcModId = mod.id;
      o._ugcAuthor = mod.author;
      return o;
    });
    var c = findItemConflicts(cloned, base);
    if (c.length) {
      prefixItemIds(cloned, mod.id);
      c.forEach(function (id) {
        conflicts.push(mod.id + ': ' + id + ' -> ' + mod.id + '__' + id);
      });
    }
    allUgc.push.apply(allUgc, cloned);
  });
  var seen = {};
  var unique = [];
  allUgc.forEach(function (it) {
    if (seen[it.id]) {
      conflicts.push('duplicate UGC item ID: ' + it.id);
      return;
    }
    seen[it.id] = true;
    unique.push(it);
  });
  GD.items = base.concat(unique);
  GD._ugcItemCount = unique.length;
  GD._ugcItemConflicts = conflicts;
  // Sync into ITEM_REGISTRY
  unique.forEach(function (it) {
    if (!window.ITEM_REGISTRY) window.ITEM_REGISTRY = {};
    window.ITEM_REGISTRY[it.id] = {
      name: it.name,
      aliases: [],
      type: it.type || 'tool',
      stackable: it.type === 'consumable' || it.type === 'food',
    };
  });
  return { added: unique.length, conflicts: conflicts };
}

/**
 * Merge mod areas into GD.areas. Handles GD.module2_areas fallback.
 * Also injects into window.AREA_REGISTRY.
 */
export function mergeAreas(GD, ugcMods) {
  var base = GD.areas || GD.module2_areas || [];
  var baseIds = {};
  base.forEach(function (a) { baseIds[a.id] = true; });
  var allUgc = [];
  var conflicts = [];
  ugcMods.forEach(function (mod) {
    if (!mod.areas || !Array.isArray(mod.areas) || mod.enabled === false) return;
    var cloned = mod.areas.map(function (a) {
      var o = {};
      for (var k in a) o[k] = a[k];
      o._ugcModId = mod.id;
      o._ugcAuthor = mod.author;
      return o;
    });
    var c = findAreaConflicts(cloned, base);
    if (c.length) {
      prefixAreaIds(cloned, mod.id);
      c.forEach(function (id) {
        conflicts.push(mod.id + ': ' + id + ' -> ' + mod.id + '__' + id);
      });
    }
    allUgc.push.apply(allUgc, cloned);
  });
  var seen = {};
  var unique = [];
  allUgc.forEach(function (a) {
    if (seen[a.id]) {
      conflicts.push('duplicate UGC area ID: ' + a.id);
      return;
    }
    seen[a.id] = true;
    unique.push(a);
  });
  GD.areas = base.concat(unique);
  GD._ugcAreaCount = unique.length;
  GD._ugcAreaConflicts = conflicts;
  // Sync into AREA_REGISTRY
  unique.forEach(function (a) {
    if (!window.AREA_REGISTRY) window.AREA_REGISTRY = {};
    window.AREA_REGISTRY[a.id] = { name: a.name, aliases: [] };
  });
  return { added: unique.length, conflicts: conflicts };
}

/**
 * Merge mod endings into GD.endings.
 */
export function mergeEndings(GD, ugcMods) {
  if (!GD.endings) GD.endings = [];
  var baseIds = {};
  GD.endings.forEach(function (e) { baseIds[e.id] = true; });
  var allUgc = [];
  var conflicts = [];
  ugcMods.forEach(function (mod) {
    if (!mod.endings || !Array.isArray(mod.endings) || mod.enabled === false) return;
    var cloned = mod.endings.map(function (e) {
      var o = {};
      for (var k in e) o[k] = e[k];
      o._ugcModId = mod.id;
      o._ugcAuthor = mod.author;
      return o;
    });
    var c = findEndingConflicts(cloned, GD.endings);
    if (c.length) {
      prefixEndingIds(cloned, mod.id);
      c.forEach(function (id) {
        conflicts.push(mod.id + ': ' + id + ' -> ' + mod.id + '__' + id);
      });
    }
    allUgc.push.apply(allUgc, cloned);
  });
  var seen = {};
  var unique = [];
  allUgc.forEach(function (e) {
    if (seen[e.id]) {
      conflicts.push('duplicate UGC ending ID: ' + e.id);
      return;
    }
    seen[e.id] = true;
    unique.push(e);
  });
  GD.endings = GD.endings.concat(unique);
  GD._ugcEndingCount = unique.length;
  GD._ugcEndingConflicts = conflicts;
  return { added: unique.length, conflicts: conflicts };
}
