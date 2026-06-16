// src/reducers/extendedEventsInit.js - Initialize extended events at app startup
// Call this once after GD is loaded, before the first render

import { mergeExtendedEvents } from './extendedEventsLoader.js';
import { EXTENDED_EVENT_MODULES, EXTENDED_EVENT_STATS } from '../data/extended_events_index.js';
import { injectMissingEnding } from '../data/ending_missing_600.js';
import { injectBehaviorEndings } from '../data/behavior_endings.js';
import { applyUgcToGD } from '../utils/buildEventPool.js';
import { getSanStageFromGD } from './sanReducer.js';

/**
 * Initialize the extended event system.
 * Merges all 599 new events into GD.events.
 * Injects the hidden ending for missing_event_600.
 * Merges enabled UGC mods into the event pool.
 * Call this once at app startup (after game data is set).
 *
 * @param {object} GD - the global game data object
 * @returns {object} GD with extended events merged in
 */
export function initExtendedEvents(GD) {
  if (GD._extendedEventsLoaded) return GD;

  // Store base event count BEFORE merging extended events (for getEventStats)
  GD._baseEventCount = (GD.events || []).length;

  mergeExtendedEvents(GD, EXTENDED_EVENT_MODULES);
  const coreExtendedCount = GD._extendedEventCount; // 599

  // Merge supplementary event pools (death_echo + supplement) via getter functions.
  // Cannot use ESM import aliases here: build.py strips imports, and multiple files
  // export `var events` causing variable shadowing in the concatenated bundle.
  // Getter functions (getDeathEchoEvents / getSupplementEvents) are unique names.
  const _supplementary = [
    { getter: getDeathEchoEvents, key: '_deathEchoCount' },
    { getter: getSupplementEvents, key: '_supplementEventCount' },
  ];
  for (const { getter, key } of _supplementary) {
    try {
      const pool = getter();
      if (pool && pool.length > 0) {
        const existingIds = new Set(GD.events.map((e) => e.id));
        const newEvents = pool.filter((e) => !existingIds.has(e.id));
        GD.events.push(...newEvents);
        GD[key] = newEvents.length;
      }
    } catch (e) {
      /* non-fatal: supplementary events are optional */
    }
  }

  // Restore _extendedEventCount to 599 (supplementary events are not counted)
  GD._extendedEventCount = coreExtendedCount;

  // Inject hidden ending for missing_event_600
  injectMissingEnding(GD);

  // Inject behavior endings into GD.endings
  injectBehaviorEndings(GD);

  // UGC Layer: Merge enabled UGC mods into the event pool
  // This is a no-op if no mods are installed.
  // selectEventV2 requires zero changes — it receives the larger GD.events array.
  try {
    applyUgcToGD(GD);
  } catch (e) {
    console.warn('[ExtendedEvents] UGC merge failed (non-fatal):', e);
  }

  return GD;
}

/**
 * Get event statistics for UI display.
 * Includes missing_600 awareness.
 *
 * @param {object} GD - game data
 * @param {object} state - current game state
 * @returns {object} stats for display
 */
export function getEventStats(GD, state) {
  const events = GD.events || [];
  const extendedCount = GD._extendedEventCount || 0;
  const hasSeen600 = (state?.triggeredEvents || []).includes('missing_event_600_seen');

  const byType = {};
  const byTier = {};
  const byArea = {};

  for (const evt of events) {
    const type = evt.type || 'unknown';
    byType[type] = (byType[type] || 0) + 1;
    const tier = evt.tier || 'normal';
    byTier[tier] = (byTier[tier] || 0) + 1;
    const areas = evt.trigger?.areas || [];
    for (const area of areas) {
      byArea[area] = (byArea[area] || 0) + 1;
    }
  }

  // 检查是否满足部分终局条件（用于显示 599/600）
  const loop = state?.loopCount || 0;
  const mythos = state?.mythosLevel || 0;
  const san = state?.san || 60;
  const endingsCount = new Set([
    ...(state?.previousEndings || []),
    ...(state?.endingHistory || []).map((e) => e.ending_id).filter(Boolean),
  ]).size;

  // P1-A: SSOT — partial unlock at explanation_loss (level >= 3)
  const meetsPartial = loop >= 5 && mythos >= 15 && getSanStageFromGD(san).level >= 3 && endingsCount >= 3;

  // 构建 UI 显示文本
  let displayCount = '599';
  let displayExtra = null;

  if (hasSeen600) {
    displayCount = '599';
    displayExtra = '第600项：无';
  } else if (meetsPartial) {
    displayCount = '599 / 600';
  }

  return {
    total: events.length,
    original: GD._baseEventCount || 20,
    extended: extendedCount,
    byType,
    byTier,
    byArea,
    missing600: {
      displayCount,
      displayExtra,
      meetsPartial,
      hasSeen: hasSeen600,
    },
  };
}
