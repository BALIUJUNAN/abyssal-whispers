// src/reducers/extendedEventsLoader.js - Load and merge extended event data

/**
 * Load all extended event JSON files and merge into GD.events.
 * Call this once at app initialization.
 *
 * @param {object} GD - game_data object (will be mutated)
 * @param {object} extendedModules - { loop, humanity, mythos, resource, npc, area, ending, silent, meta }
 */
export function mergeExtendedEvents(GD, extendedModules) {
  if (!GD.events) GD.events = [];

  const allNewEvents = [];

  for (const [key, mod] of Object.entries(extendedModules)) {
    if (mod && mod.events && Array.isArray(mod.events)) {
      allNewEvents.push(...mod.events);
    }
  }

  // Deduplicate by ID
  const existingIds = new Set(GD.events.map((e) => e.id));
  const newEvents = allNewEvents.filter((e) => !existingIds.has(e.id));

  GD.events.push(...newEvents);

  // Store metadata — _extendedEvents must contain ONLY actual events (with trigger),
  // not item definitions or other non-event entries embedded in event files.
  // shouldTriggerMissing600() checks _extendedEvents.length >= EXTENDED_POOL_TARGET.
  GD._extendedEventsLoaded = true;
  GD._extendedEvents = newEvents.filter((e) => e.trigger);
  GD._extendedEventCount = GD._extendedEvents.length;
  GD._totalEventCount = GD.events.length;

  return GD;
}

// ============================================================
// Phase 1: Lazy Chapter Loading
// ============================================================
// When serving via HTTP (not Tauri single-file), split JSON files
// are available alongside index.html.  On REST (day advance), the
// game pre-fetches the next chapter's data so events are ready
// before the player reaches that chapter.
//
// In single-file mode (Tauri / build.py default), all data is
// already merged at build time — these fetches are skipped.

/** @type {Set<string>} chapters already loaded or merged */
const _loadedChapters = new Set(['ch1']); // ch1 always in base

/** @type {Map<string, Promise>} in-flight fetch dedup */
const _pendingFetches = new Map();

/**
 * Merge a raw JSON object (from a split chapter file) into the live GD.
 * Deduplicates by event ID.  Safe to call multiple times.
 *
 * @param {object} GD       - live game data object (mutated)
 * @param {object} chapterData - parsed JSON from a chapter file
 * @param {string} chapterKey  - e.g. 'ch2', 'ch3', 'meta'
 * @returns {number} number of newly added events
 */
export function mergeChapterDataIntoGD(GD, chapterData, chapterKey) {
  if (!chapterData) return 0;

  let added = 0;
  const existingIds = new Set((GD.events || []).map((e) => e.id));

  // Merge events
  if (chapterData.events && Array.isArray(chapterData.events)) {
    const newEvents = chapterData.events.filter((e) => !existingIds.has(e.id));
    if (newEvents.length > 0) {
      GD.events.push(...newEvents);
      added += newEvents.length;
    }
  }

  // Merge endings
  if (chapterData.endings && Array.isArray(chapterData.endings)) {
    if (!GD.endings) GD.endings = [];
    const existingEndingIds = new Set(GD.endings.map((e) => e.id));
    for (const ending of chapterData.endings) {
      if (!existingEndingIds.has(ending.id)) GD.endings.push(ending);
    }
  }

  // Merge ending_judgement
  if (chapterData.ending_judgement) {
    GD.ending_judgement = { ...(GD.ending_judgement || {}), ...chapterData.ending_judgement };
  }

  // Merge implementation_notes
  if (chapterData.implementation_notes) {
    GD.implementation_notes = {
      ...(GD.implementation_notes || {}),
      ...chapterData.implementation_notes,
    };
  }

  _loadedChapters.add(chapterKey);

  if (added > 0) {
    GD._totalEventCount = (GD.events || []).length;
  }

  return added;
}

/**
 * Lazily load a chapter's JSON file and merge into GD.
 * Deduplicates: if already loaded or fetch in-flight, returns immediately.
 *
 * @param {object} GD         - live game data object
 * @param {string} chapterKey - 'ch2' | 'ch3' | 'ch4' | 'ch5' | 'meta'
 * @param {string} url        - URL to fetch (e.g. 'game_ch2plus.json')
 * @returns {Promise<number>}  number of newly added events (0 if already loaded)
 */
export async function loadChapterData(GD, chapterKey, url) {
  // Already loaded?
  if (_loadedChapters.has(chapterKey)) return 0;

  // Already in-flight? Dedup.
  if (_pendingFetches.has(chapterKey)) return _pendingFetches.get(chapterKey);

  const promise = (async () => {
    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        console.warn(`[LazyLoad] Failed to fetch ${url}: ${resp.status}`);
        return 0;
      }
      const data = await resp.json();
      const added = mergeChapterDataIntoGD(GD, data, chapterKey);
      if (added > 0) {
        console.log(
          `[LazyLoad] ${chapterKey}: merged ${added} events (total: ${GD._totalEventCount})`
        );
      }
      return added;
    } catch (e) {
      // Network error or parse error — not fatal, game continues with existing events
      console.warn(`[LazyLoad] ${chapterKey} fetch error (non-fatal):`, e.message);
      return 0;
    } finally {
      _pendingFetches.delete(chapterKey);
    }
  })();

  _pendingFetches.set(chapterKey, promise);
  return promise;
}

/**
 * Check if a chapter's data is already loaded.
 * @param {string} chapterKey
 * @returns {boolean}
 */
export function isChapterLoaded(chapterKey) {
  return _loadedChapters.has(chapterKey);
}

/**
 * Mark a chapter as loaded without fetching.
 * Use when data is merged at build time (static JSON import).
 * @param {string} chapterKey
 */
export function markChapterLoaded(chapterKey) {
  _loadedChapters.add(chapterKey);
}

/**
 * Get the set of loaded chapters (for debug / UI display).
 * @returns {string[]}
 */
export function getLoadedChapters() {
  return [..._loadedChapters];
}

/**
 * Initialize extended state fields that don't exist yet (backward-compatible).
 * Call this in initialState() and on CONTINUE_GAME.
 */
export function ensureExtendedState(state) {
  // Previous run memory (persists across loops)
  if (!state.previousRunSummary) state.previousRunSummary = null;
  if (!state.previousDeathsByArea) state.previousDeathsByArea = {};
  if (!state.previousEndings) state.previousEndings = [];
  if (!state.endingHistory) state.endingHistory = [];
  if (!state.loopEchoFlags) state.loopEchoFlags = [];
  if (!state.worldCorrectionFlags) state.worldCorrectionFlags = [];
  if (!state.playerTraces) state.playerTraces = [];

  // Current run tracking
  if (!state.eventCooldowns) state.eventCooldowns = {};
  if (!state.categoryCountsToday) state.categoryCountsToday = {};
  if (!state.categoryCountsRun) state.categoryCountsRun = {};
  if (!state.abnormalStreak) state.abnormalStreak = 0;
  if (!state.runTriggeredExtendedEvents) state.runTriggeredExtendedEvents = [];
  if (!state.everTriggeredEvents) state.everTriggeredEvents = [];
  if (!state.pendingFollowupEvents) state.pendingFollowupEvents = [];
  if (!state.unlockedAreas) state.unlockedAreas = [];
  if (!state.unlockedEndingConditions) state.unlockedEndingConditions = [];
  if (!state.endingEchoes) state.endingEchoes = [];
  if (!state.lastDeathHint) state.lastDeathHint = null;

  // Death context system
  if (!state.deathContext) state.deathContext = null;
  if (!state.lastDeathMode) state.lastDeathMode = null; // "hp" | "san" | "hybrid"
  if (!state.previousDeathContext) state.previousDeathContext = null;

  // Prologue system (fear tuning persists across loops)
  if (!state.prologue) state.prologue = null;
  if (!state.fearTuning) state.fearTuning = null;

  return state;
}

/**
 * Save version for migration detection
 */
export const EXTENDED_SAVE_VERSION = '1.1.0';
