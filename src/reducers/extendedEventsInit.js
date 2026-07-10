// src/reducers/extendedEventsInit.js - Initialize extended events at app startup
// Call this once after GD is loaded, before the first render

import { mergeExtendedEvents } from './extendedEventsLoader.js';
import { EXTENDED_EVENT_MODULES, EXTENDED_EVENT_STATS, CH2PLUS_EVENTS } from '../data/extended_events_index.js';
import { hasTriggered } from '../utils/triggeredSet.js';
import { injectMissingEnding } from '../data/ending_missing_600.js';
import { injectBehaviorEndings } from '../data/behavior_endings.js';
import { injectFearEndings } from '../data/events/events_fear_endings.js';
import { events_legendary } from '../data/events/events_legendary.js';
import { applyUgcToGD } from '../utils/buildEventPool.js';
import { getSanStageFromGD } from './sanReducer.js';
import { getDeathEchoEvents } from '../data/events/events_death_echo.js';
import { getSupplementEvents } from '../data/events/events_supplement.js';
import { CHAPTER_MILESTONES, FORCED_NARRATIVE_HOOKS } from '../data/milestones.js';
import { getDeathMetaEvents } from '../data/events/events_death_meta.js';
import { generateDeathFragments, checkDeathTruthAssembly } from '../data/events/events_death_meta.js';
import { getEventRarityWeight, checkLegendaryTrigger, checkSecretTrigger, getRarityHint } from '../systems/eventRarity.js';
import { injectDistortionTemplates } from '../engine/EventEngine.js';
import { DISTORTION_TEMPLATE_MAP } from '../data/distortionTemplates.js';

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

  // Merge Ch2+ events (from events_ch2plus.js, migrated from game_ch2plus.json)
  // These are NOT counted in the 599 — they're supplementary chapter 2+ content.
  if (CH2PLUS_EVENTS && CH2PLUS_EVENTS.length > 0) {
    const existingIds = new Set(GD.events.map((e) => e.id));
    const newCh2plus = CH2PLUS_EVENTS.filter((e) => !existingIds.has(e.id));
    GD.events.push(...newCh2plus);
    GD._ch2plusEventCount = newCh2plus.length;
  }

  // Merge supplementary event pools (death_echo + supplement + death_meta)
  const _supplementary = [
    { getter: getDeathEchoEvents, key: '_deathEchoCount' },
    { getter: getSupplementEvents, key: '_supplementEventCount' },
    { getter: getDeathMetaEvents, key: '_deathMetaEventCount' },
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

  // Inject fear profile exclusive endings into GD.endings
  injectFearEndings(GD);

  // Inject shared distortion text templates for events without local variants
  // (removes ~23 duplicate distortion_variants blocks from events_humanity.js)
  injectDistortionTemplates(GD, DISTORTION_TEMPLATE_MAP);

  // Merge legendary events into GD.events (rarity: legendary)
  // These are gated by checkLegendaryTrigger() in eventRarity.js,
  // so they only appear when hidden conditions are met.
  if (events_legendary && events_legendary.length > 0) {
    const existingIds = new Set(GD.events.map((e) => e.id));
    const newLegendary = events_legendary.filter((e) => !existingIds.has(e.id));
    GD.events.push(...newLegendary);
    GD._legendaryEventCount = newLegendary.length;
  }

  // UGC Layer: Merge enabled UGC mods into the event pool
  // This is a no-op if no mods are installed.
  // selectEventV2 requires zero changes — it receives the larger GD.events array.
  try {
    applyUgcToGD(GD);
  } catch (e) {
    console.warn('[ExtendedEvents] UGC merge failed (non-fatal):', e);
  }

  // Inject chapter milestones and forced narrative hooks into GD
  // so checkChapterMilestone() and checkForcedNarrativeHook() can find them
  // on the shared GD object (gameData.js).
  GD._milestones = CHAPTER_MILESTONES;
  GD._hooks = FORCED_NARRATIVE_HOOKS;

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
  const hasSeen600 = hasTriggered(state, 'missing_event_600_seen');

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
