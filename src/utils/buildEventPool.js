// src/utils/buildEventPool.js — UGC Merge Engine
// Combines base game events with enabled UGC mod events.
//
// Architecture contract:
//   - This function produces a single flat array of event objects.
//   - selectEventV2 (Layer 2) receives this array and works unchanged.
//   - Base game events always win on ID conflict.
//   - UGC events are tagged with source='ugc' for the rendering layer.

import { getEnabledMods } from '../reducers/ugcReducer.js';
import { findIdConflicts, prefixEventIds } from '../data/ugcSchema.js';

/**
 * Build the complete event pool: base game + enabled UGC mods.
 *
 * @param {object} GD - the global game data object (contains GD.events as base pool)
 * @param {object[]} [ugcMods] - optional explicit mod array; if omitted, reads from localStorage
 * @returns {{ events: object[], ugcCount: number, conflicts: string[] }}
 */
export function buildEventPool(GD, ugcMods) {
  const baseEvents = GD.events || [];
  const baseIdSet = new Set(baseEvents.map(e => e.id));

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
    const modEvents = mod.events.map(e => ({ ...e }));

    // Find conflicts with base game
    const conflicts = findIdConflicts(modEvents, baseEvents.map(id => ({ id: id.id || id })));
    if (conflicts.length > 0) {
      // Auto-prefix conflicting IDs
      prefixEventIds(modEvents, mod.id);
      allConflicts.push(...conflicts.map(c => `${mod.id}: ${c} → ${mod.id}__${c}`));
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
    events:    merged,
    ugcCount:  uniqueUgcEvents.length,
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

  if (ugcCount > 0) {
    // UGC events merged into GD.events
  }

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
  const baseIdSet = new Set((GD.events || []).map(e => e.id));
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
    conflicts,
    types,
  };
}
