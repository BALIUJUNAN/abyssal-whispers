// src/state/selectors.js — Fine-grained Zustand selectors
// Each selector subscribes to only the state slice a component needs.
// This prevents global state changes from triggering re-renders in unrelated components.
//
// Usage:
//   import { useSanVisual, useNpcTrust, useEventLog } from '../state/selectors.js';
//   const sanVisual = useSanVisual(); // re-renders ONLY when SAN changes
//   const trust = useNpcTrust('old_lady'); // re-renders ONLY when this NPC's trust changes

import { useGameStore } from './useGameStore.js';
import { getVisualForSan, getSanStageClasses, getPerceptionLevels } from '../systems/sanityVisual.js';
import { getNpcTrust, getDisplayedAp, getAvailableSafehouses } from '../utils/appHelpers.js';

// ── shallowEqual helper ──
// Zustand's default equality is Object.is (reference equality).
// For arrays/objects, we need shallow comparison to avoid re-renders
// when the parent creates a new array reference with the same contents.

function shallowEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (a == null || b == null) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i++) {
    if (a[keysA[i]] !== b[keysB[i]]) return false;
  }
  return true;
}

// ── useGameSelector with shallow equality ──

export function useShallowSelector(selector, equalityFn) {
  return useGameStore(selector, equalityFn || shallowEqual);
}

// ── SAN / Visual selectors ──

/** Raw SAN value. Re-renders on any SAN change. */
export function useSan() {
  return useGameStore(function (s) { return s.san; });
}

/** Visual parameters for current SAN (cached per SAN value). */
export function useSanVisual() {
  return useGameStore(function (s) { return getVisualForSan(s.san); });
}

/** CSS class fragments for SAN stage (vtClass, stageClass, sanClass, level). */
export function useSanStageClasses(allowVisualFX) {
  return useGameStore(function (s) {
    return getSanStageClasses(s.san, allowVisualFX, { GD: s._GD || {} });
  });
}

/** Perception distortion levels (focus, edge, audio, input, text). */
export function usePerceptionLevels() {
  return useGameStore(function (s) { return getPerceptionLevels(s); });
}

/** Just the SAN level number (0-6). */
export function useSanLevel() {
  return useGameStore(function (s) {
    const v = getVisualForSan(s.san);
    return v.level;
  });
}

// ── Character selectors ──

export function useHp() {
  return useGameStore(function (s) { return { hp: s.hp, maxHp: s.maxHp }; }, shallowEqual);
}

export function useAp() {
  return useGameStore(function (s) { return { ap: s.ap, maxAp: s.maxAp }; }, shallowEqual);
}

export function useInventory() {
  return useGameStore(function (s) { return s.inventory || []; });
}

export function useClues() {
  return useGameStore(function (s) { return s.clues || []; });
}

export function useSkills() {
  return useGameStore(function (s) { return s.skills || {}; });
}

// ── World selectors ──

/** Current area ID only. */
export function useCurrentArea() {
  return useGameStore(function (s) { return s.currentArea; });
}

/** Visited areas count (for map progress indicator). */
export function useVisitedCount() {
  return useGameStore(function (s) { return (s.visitedAreas || []).length; });
}

/** Weather string. */
export function useWeather() {
  return useGameStore(function (s) { return s.weather; });
}

/** Safehouse corruption (0-100). */
export function useSafehouseCorruption() {
  return useGameStore(function (s) { return s.safehouseCorruption; });
}

/** Seal state string. */
export function useSealState() {
  return useGameStore(function (s) { return s.sealState; });
}

/** Mythos level (0-100). */
export function useMythosLevel() {
  return useGameStore(function (s) { return s.mythosLevel; });
}

// ── NPC selectors (per-NPC to minimize re-renders) ──

/**
 * Trust level for a specific NPC.
 * Re-renders ONLY when this NPC's trust changes.
 *
 * @param {string} npcId - NPC identifier (ID, not display name)
 * @returns {number} trust level 0-5
 */
export function useNpcTrust(npcId) {
  return useGameStore(function (s) {
    return getNpcTrust(s, npcId);
  });
}

/**
 * Trust levels for all NPCs.
 * Use this only when you need to render a list of all NPCs.
 * For single-NPC display, use useNpcTrust(npcId) instead.
 */
export function useAllNpcTrust() {
  return useGameStore(function (s) { return s.npcTrust || {}; });
}

/**
 * NPC state for a specific NPC.
 * @param {string} npcId
 * @returns {object|null}
 */
export function useNpcState(npcId) {
  return useGameStore(function (s) {
    return (s.npcStates || {})[npcId] || null;
  });
}

// ── Event / Narrative selectors ──

/** Full event log array. */
export function useEventLog() {
  return useGameStore(function (s) { return s.eventLog || []; });
}

/** Event log length only (for badge counters). */
export function useEventLogLength() {
  return useGameStore(function (s) { return (s.eventLog || []).length; });
}

/** Last N entries from event log (shallow slice). */
export function useRecentEventLog(n) {
  const count = n || 10;
  return useGameStore(function (s) {
    return (s.eventLog || []).slice(-count);
  });
}

/** Current narrative text array. */
export function useNarrative() {
  return useGameStore(function (s) { return s.narrative || []; });
}

/** Narrative text only (for display components). */
export function useNarrativeText() {
  return useGameStore(function (s) {
    return (s.narrative || []).map(function (n) { return n.text; }).join('\n');
  });
}

// ── Progress selectors ──

/** Current day number. */
export function useDay() {
  return useGameStore(function (s) { return s.day || 1; });
}

/** Loop count (0 = first loop). */
export function useLoopCount() {
  return useGameStore(function (s) { return s.loopCount || 0; });
}

/** Current chapter ID. */
export function useCurrentChapter() {
  return useGameStore(function (s) { return s.currentChapter; });
}

/** Objectives array. */
export function useObjectives() {
  return useGameStore(function (s) { return s.objectives || []; });
}

/** Triggered events set (as array). */
export function useTriggeredEvents() {
  return useGameStore(function (s) { return s.triggeredEvents || []; });
}

// ── Resource selectors ──

export function useFood() {
  return useGameStore(function (s) { return s.food; });
}

export function useMoney() {
  return useGameStore(function (s) { return s.money; });
}

export function usePollution() {
  return useGameStore(function (s) { return s.pollution; });
}

export function useHumanityScore() {
  return useGameStore(function (s) { return s.humanityScore; });
}

// ── UI state selectors (from uiStore) ──

export function useUiState(selector) {
  const { useUiStore } = require('./uiStore.js');
  if (selector) return useUiStore(selector);
  return useUiStore();
}

/** A specific modal open state, e.g. useUiModal('notebookOpen'). */
export function useUiModal(modalKey) {
  const { useUiStore } = require('./uiStore.js');
  return useUiStore(function (s) { return s[modalKey]; });
}

// ── Derived selectors (computed, memoized via useMemo in component) ──

/**
 * Check if a specific event was triggered.
 * Returns boolean — no re-render unless triggeredEvents reference changes.
 */
export function useEventTriggered(eventId) {
  return useGameStore(function (s) {
    return (s.triggeredEvents || []).indexOf(eventId) >= 0;
  });
}

/**
 * Active long-term effects count.
 */
export function useLongTermEffectsCount() {
  return useGameStore(function (s) { return (s.longTermEffects || []).length; });
}

/**
 * Check if madness is active.
 */
export function useMadnessActive() {
  return useGameStore(function (s) { return s.madnessActive; });
}

// ── Batch selector (for components needing multiple slices) ──
// Use sparingly — prefer individual selectors for maximum granularity.

export function useGameHeaderData() {
  return useGameStore(function (s) {
    return {
      day: s.day,
      ap: s.ap,
      maxAp: s.maxAp,
      san: s.san,
      hp: s.hp,
      maxHp: s.maxHp,
      food: s.food,
      money: s.money,
      loopCount: s.loopCount,
      currentArea: s.currentArea,
    };
  }, shallowEqual);
}

export function useLeftPanelData() {
  return useGameStore(function (s) {
    return {
      sealState: s.sealState,
      safehouseCorruption: s.safehouseCorruption,
      currentSafehouse: s.currentSafehouse,
      pollution: s.pollution,
      weather: s.weather,
      san: s.san,
      loopCount: s.loopCount,
    };
  }, shallowEqual);
}

// ── Combined selectors (minimize re-renders for high-frequency components) ──

/** Fields App needs for game-screen render (replaces useAppState full-state subscription). */
export function useAppGameData() {
  return useGameStore(function (s) {
    return {
      screen: s.screen,
      day: s.day,
      san: s.san,
      hp: s.hp,
      maxHp: s.maxHp,
      ap: s.ap,
      maxAp: s.maxAp,
      loopCount: s.loopCount,
      currentArea: s.currentArea,
      safehouseCorruption: s.safehouseCorruption,
      pollution: s.pollution,
      money: s.money,
      food: s.food,
      inventory: s.inventory,
      clues: s.clues,
      narrative: s.narrative,
      eventLog: s.eventLog,
      pendingEvent: s.pendingEvent,
      pendingNpc: s.pendingNpc,
      pendingGamble: s.pendingGamble,
      pendingChoice: s.pendingChoice,
      transition: s.transition,
      madnessActive: s.madnessActive,
      ending: s.ending,
      endingCoins: s.endingCoins,
      loopShopTier: s.loopShopTier,
      visitedAreas: s.visitedAreas,
      sealState: s.sealState,
      weather: s.weather,
      currentSafehouse: s.currentSafehouse,
      _level13GlitchScheduled: s._level13GlitchScheduled,
      glitchPulse: s.glitchPulse,
      stats_run: s.stats_run,
      accessibilityOptions: s.accessibilityOptions,
    };
  }, shallowEqual);
}

/** Fields GameLayout uses for effects + rendering (town_map + classic). */
export function useGameLayoutData() {
  return useGameStore(function (s) {
    return {
      screen: s.screen,
      day: s.day,
      loopCount: s.loopCount,
      currentArea: s.currentArea,
      ap: s.ap,
      maxAp: s.maxAp,
      san: s.san,
      audioMuted: s.audioMuted,
      deathContext: s.deathContext,
      _level13GlitchScheduled: s._level13GlitchScheduled,
      tutorialSeen: s.tutorialSeen,
      currentSafehouse: s.currentSafehouse,
    };
  }, shallowEqual);
}

/** Fields CenterPanel reads for rendering (narrative + actions). */
export function useCenterPanelData() {
  return useGameStore(function (s) {
    return {
      ap: s.ap,
      maxAp: s.maxAp,
      san: s.san,
      hp: s.hp,
      maxHp: s.maxHp,
      food: s.food,
      money: s.money,
      currentArea: s.currentArea,
      day: s.day,
      loopCount: s.loopCount,
      inventory: s.inventory,
      clues: s.clues,
      narrative: s.narrative,
      eventLog: s.eventLog,
      pendingEvent: s.pendingEvent,
      pendingNpc: s.pendingNpc,
      pendingGamble: s.pendingGamble,
      pendingChoice: s.pendingChoice,
      transition: s.transition,
      madnessActive: s.madnessActive,
      ending: s.ending,
      skills: s.skills,
      pollution: s.pollution,
      safehouseCorruption: s.safehouseCorruption,
      currentSafehouse: s.currentSafehouse,
      objectives: s.objectives,
      longTermEffects: s.longTermEffects,
    };
  }, shallowEqual);
}

/** Fields LeftPanel reads for rendering. */
export function useLeftPanelDataFull() {
  return useGameStore(function (s) {
    return {
      san: s.san,
      hp: s.hp,
      maxHp: s.maxHp,
      pollution: s.pollution,
      loopCount: s.loopCount,
      madnessActive: s.madnessActive,
      sealState: s.sealState,
      safehouseCorruption: s.safehouseCorruption,
      currentSafehouse: s.currentSafehouse,
      weather: s.weather,
      food: s.food,
      money: s.money,
      inventory: s.inventory,
      clues: s.clues,
      skills: s.skills,
      stats: s.stats,
      objectives: s.objectives,
      longTermEffects: s.longTermEffects,
      currentArea: s.currentArea,
    };
  }, shallowEqual);
}

