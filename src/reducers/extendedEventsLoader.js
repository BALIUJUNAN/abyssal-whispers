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
  const existingIds = new Set(GD.events.map(e => e.id));
  const newEvents = allNewEvents.filter(e => !existingIds.has(e.id));

  GD.events.push(...newEvents);

  // Store metadata
  GD._extendedEventsLoaded = true;
  GD._extendedEventCount = newEvents.length;
  GD._totalEventCount = GD.events.length;

  return GD;
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
  if (!state.lastDeathMode) state.lastDeathMode = null;        // "hp" | "san" | "hybrid"
  if (!state.previousDeathContext) state.previousDeathContext = null;

  return state;
}

/**
 * Save version for migration detection
 */
export const EXTENDED_SAVE_VERSION = '1.1.0';
