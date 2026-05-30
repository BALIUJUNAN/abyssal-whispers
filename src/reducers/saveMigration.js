// src/reducers/saveMigration.js - Save data migration & persistence filtering
// Separated from saveReducer.js to avoid circular dependencies.
//
// P0-4: Migration mechanism for version-incompatible saves
// P0-5: State filtering for persisted saves (exclude runtime UI fields)

/**
 * Save version — bump when save format changes.
 * Must match SAVE_VERSION in saveReducer.js.
 */
export const SAVE_VERSION = '1.2.0';

/**
 * Minimal extended state defaults (subset of ensureExtendedState).
 * Used during migration when ensureExtendedState is not available
 * (e.g., in Node.js test environments).
 * 
 * This is intentionally kept lightweight — the full ensureExtendedState
 * from extendedEventsLoader.js is still called in CONTINUE_GAME as a
 * second safety net.
 */
function ensureMinimalExtendedState(state) {
  if (!state.previousRunSummary) state.previousRunSummary = null;
  if (!state.previousDeathsByArea) state.previousDeathsByArea = {};
  if (!state.previousEndings) state.previousEndings = [];
  if (!state.endingHistory) state.endingHistory = [];
  if (!state.loopEchoFlags) state.loopEchoFlags = [];
  if (!state.worldCorrectionFlags) state.worldCorrectionFlags = [];
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
  if (!state.deathContext) state.deathContext = null;
  if (!state.lastDeathMode) state.lastDeathMode = null;
  if (!state.previousDeathContext) state.previousDeathContext = null;
  if (!state.prologue) state.prologue = null;
  if (!state.fearTuning) state.fearTuning = null;
  return state;
}

/**
 * Build a save meta object from game state.
 * Used when migrating old saves that lack a meta field.
 */
export function buildSaveMeta(state) {
  return {
    day: state.day || 1,
    area: state.currentArea || '',
    loopCount: state.loopCount || 0,
    san: state.san || 0,
    hp: state.hp || 0
  };
}

/**
 * Migrate save data from any older version to current version.
 *
 * P0-4: Instead of deleting incompatible saves, we attempt to migrate them.
 * Returns the migrated save data, or null if the save is unrecoverable.
 *
 * @param {object} data - raw save data from localStorage
 * @param {string} slotId - the slot ID
 * @returns {object|null} migrated save data, or null if unrecoverable
 */
export function migrateSaveData(data, slotId) {
  if (!data) return null;

  // Handle both wrapped ({ version, state }) and unwrapped (raw state) formats
  let state = data.state || data;
  if (!state || typeof state !== 'object') return null;

  // Check for obviously corrupt data (not an object, or missing critical fields)
  // We're lenient: only reject if there's no way to reconstruct
  if (typeof state.day !== 'number' && typeof state.screen !== 'string') {
    return null;
  }

  // Apply minimal extended state defaults for backward compatibility
  state = ensureMinimalExtendedState(state);

  // Migrate flat behavior tracking counters into behaviorTracking object (v1.2.0)
  if (!state.behaviorTracking) {
    const BT_KEYS = [
      'direct_kill_count', 'cannibalism_count', 'clean_kill_pattern',
      'npc_deaths_by_manipulation', 'cult_leader_score',
      'self_harm_ritual_count', 'fusion_accepted_count', 'possession_accepted_count',
      'forbidden_intimacy_flags', 'sacred_desecration_count', 'same_npc_harm_max',
      '_npc_harm_tally', 'npc_as_resource_count', 'betrayed_high_trust_npcs',
      'self_sacrifice_for_power', 'fusion_and_self_harm_total', 'harbor_visits',
      'sea_acceptance_flags', 'sleep_streak', 'work_only_days', 'safehouse_stay_days',
      'move_only_days', 'record_only_days', 'low_intervention_count', 'work_count',
      'hoarded_money_max', 'hoarded_food_max', 'archive_consumed_count',
      'prophecy_spread_count', 'redeemed_npcs', 'thirteenth_bell_obsession',
      'meta_boundary_breaks', 'final_choice_refused_count', 'save_delete_attempts',
      'loop_exploit_score', 'loop_break_attempts',
    ];
    const bt = {};
    for (const key of BT_KEYS) {
      if (state[key] !== undefined) {
        bt[key] = state[key];
        delete state[key];
      }
    }
    state.behaviorTracking = bt;
  }

  // Build the migrated save object
  return {
    version: SAVE_VERSION,
    timestamp: data.timestamp || Date.now(),
    slotId: data.slotId || slotId,
    meta: data.meta || buildSaveMeta(state),
    state
  };
}

/**
 * Filter state for persistence: remove runtime UI fields that shouldn't be saved.
 *
 * P0-5: Prevents save bloat from narrative array and avoids restoring
 * half-open UI states (pending choices, transitions, etc.).
 *
 * @param {object} state - full game state
 * @returns {object} filtered state safe for persistence
 */
export function toPersistedState(state) {
  const {
    narrative,
    transition,
    pendingNpc,
    pendingChoice,
    pendingGamble,
    pendingEvent,
    pendingDeath,
    ...persisted
  } = state;

  // Cap eventLog too (same rationale as narrative)
  if (persisted.eventLog && persisted.eventLog.length > 200) {
    persisted.eventLog = persisted.eventLog.slice(-200);
  }

  return persisted;
}
