// src/state/initialState.js — 游戏初始状态定义
// P1-B: Split into semantic sub-functions for clarity and testability.
// Each section annotates fields as [persisted] / [runtime] / [derived].
//
// PUBLIC API:  export const initialState = () => ({ ... })
// INTERNAL:    createCharacterState, createWorldState, createProgressState,
//              createResourceState, createRuntimeState, createBehaviorTrackingState,
//              createPersistenceState
//
// SaveManager's toPersistedState (saveMigration.js) handles the actual
// persisted/runtime split at save time. These annotations are for documentation.

import { ensureExtendedState } from '../reducers/extendedEventsLoader.js';
import { generateRunSeed } from '../utils/seededRng.js';
import { STARTING_STATE, STAT_DEFAULTS, STAT_NAMES, STARTING_ITEM_ID_MAP } from './gameConstants.js';

/**
 * Character attributes — stats, HP, SAN, skills, inventory.
 * Mostly [persisted]. maxHp is [derived] from CON+SIZ but cached for performance.
 */
function createCharacterState() {
  return {
    stats: { ...STAT_DEFAULTS },
    hp: STARTING_STATE.HP,
    maxHp: STARTING_STATE.MAX_HP,
    san: STARTING_STATE.SAN,
    maxSan: STARTING_STATE.MAX_SAN,
    luck: STARTING_STATE.LUCK,
    mp: STARTING_STATE.MP,
    skills: {},
    archetype: null,
    tempSkillBonus: null,
    inventory: (GD.systems?.player?.starting_items?.starting_items || []).map((item) => {
      return { id: STARTING_ITEM_ID_MAP[item.name] || item.name, name: item.name, uses: item.uses };
    }),
    clues: [],
    difficulty: 'normal',
    difficultyLevel: STARTING_STATE.DIFFICULTY_LEVEL,
  };
}

/**
 * World state — area, NPCs, seals, weather, knowledge.
 * All [persisted] except areaNameCache ([runtime] optimization cache).
 */
function createWorldState() {
  return {
    currentArea: STARTING_STATE.CURRENT_AREA,
    visitedAreas: [STARTING_STATE.CURRENT_AREA],
    npcTrust: {},
    npcStates: {},
    npcRelations: {},
    factionStanding: {},          // faction_id → -10..+10
    npcLocations: {},             // npcName → areaId (daily autonomous position)
    npcThreads: {},               // npcName_depth → { depth, resolved }
    _dailyNpcTalks: {},           // npcName → day number (resets each day)
    _pendingDelayedEffects: [],   // scheduled moral dilemma delayed effects
    sealState: STARTING_STATE.SEAL_STATE,
    weather: STARTING_STATE.WEATHER,
    safehouseCorruption: 0,
    currentSafehouse: STARTING_STATE.CURRENT_SAFEHOUSE,
    harborRiskReduction: 0,
    areaNameCache: {},
    retainedKnowledge: [],
    lastVisitedDates: {},
    lastDeathType: null,
    mythosLevel: 0,
    currentChapter: STARTING_STATE.CURRENT_CHAPTER,
    humanityScore: STARTING_STATE.HUMANITY,
    discoveredConclusions: [],
    activeBlessings: [],
    pollution: 0,
    loopEchoes: { deadNpcAreas: [] },
  };
}

/**
 * Progress state — day, objectives, triggered events, event chains.
 * All [persisted].
 */
function createProgressState() {
  return {
    day: STARTING_STATE.DAY,
    ap: STARTING_STATE.AP,
    maxAp: STARTING_STATE.MAX_AP,
    objectives: [],
    completedChains: [],
    triggeredEvents: [],
    triggeredSilentEvents: [],
    _triggeredSet: null,
    _silentSet: null,
    seenEventTexts: {},
    longTermEffects: [],
    madnessActive: null,
    sanityCollapseCount: 0,
    ch1IntroComplete: false,
    deathLegacies: [],
    deathFragments: [],
    metaEventFlags: {},
    stats_run: {
      deaths: 0,
      runs: 1,
      checks_passed: 0,
      checks_failed: 0,
      days_best: 0,
      max_san_loss_single: 0,
      total_san_loss: 0,
      deepest_area_danger: 0,
    },
  };
}

/**
 * Resource state — food, light, infection, fatigue.
 * All [persisted].
 */
function createResourceState() {
  return {
    food: STARTING_STATE.FOOD,
    maxFood: STARTING_STATE.MAX_FOOD,
    lightLevel: STARTING_STATE.LIGHT_LEVEL,
    starvationDays: 0,
    infection: 0,
    maxInfection: STARTING_STATE.MAX_INFECTION,
    fatigue: 0,
    maxFatigue: STARTING_STATE.MAX_FATIGUE,
    money: STARTING_STATE.MONEY,
  };
}

/**
 * Runtime UI state — narrative, modals, toasts, accessibility.
 * NOT persisted (rebuilt on load). Stripped by toPersistedState.
 */
function createRuntimeState() {
  return {
    screen: 'title',                // [runtime]
    narrative: [],                  // [runtime] — stripped on save
    eventLog: [],                   // [runtime] — capped at 200 on save
    pendingEvent: null,             // [runtime]
    pendingNpc: null,               // [runtime]
    pendingGamble: null,            // [runtime]
    pendingChoice: null,            // [runtime]
    ending: null,                   // [runtime] — triggers save-on-ending
    transition: null,               // [runtime]
    prologue: null,                 // [runtime]
    fearTuning: null,               // [runtime]
    audioMuted: false,              // [runtime]
    tutorialSeen: {},               // [runtime]
    guideSeen: false,               // [runtime]
    accessibilityOptions: {         // [runtime]
      visual_distortion: true,
      flicker_control: true,
      pseudo_error_style: 'immersive',
    },
    glitchPulse: 0,                 // [runtime] — canvas distortion intensity (0=off, 1-10=strength)
    // Daily tracking (rebuilt each day)
    _dayActions: [],                // [runtime]
    _dayStartArea: null,            // [runtime]
    _lastAreaBeforeRest: null,      // [runtime]
    _dayStartSan: null,             // [runtime]
    _dayStartHp: null,              // [runtime]
    _dayStartClueCount: null,       // [runtime]
    _dailyTrustGains: {},           // [runtime]
    _visualPollution: 50,           // [runtime]
    _actionHistory: [],             // [runtime] — rolling behavior profile
    _todayEventTypes: [],           // [runtime]
    _recentEventIds: [],            // [runtime]
    _actionIndex: 0,                // [runtime] — incremented per dispatch for deterministic RNG
    // AP pollution: SAN/loop-dependent AP deception
    _apLies: false,                 // [runtime] — true when displayed AP ≠ real AP
    _apOffset: 0,                   // [runtime] — display = real + offset (player sees more than real)
    _bellPressure: 0,               // [persisted] — days since player investigated the thirteen bells
    eventCooldowns: {},             // [persisted]
    combat: null,                   // [runtime] — active combat state (null when not in combat)
  };
}

/**
 * Behavior tracking — detailed counters for behavior-dependent endings.
 * All [persisted] — drives ending resolution across loops.
 * v0.9.0: Added moral choice tracking (mercy, selfless actions, promises, etc.)
 */
function createBehaviorTrackingState() {
  return {
    behaviorTracking: {
      direct_kill_count: 0,
      cannibalism_count: 0,
      clean_kill_pattern: 0,
      npc_deaths_by_manipulation: 0,
      cult_leader_score: 0,
      self_harm_ritual_count: 0,
      fusion_accepted_count: 0,
      possession_accepted_count: 0,
      forbidden_intimacy_flags: 0,
      sacred_desecration_count: 0,
      same_npc_harm_max: 0,
      _npc_harm_tally: {},
      npc_as_resource_count: 0,
      betrayed_high_trust_npcs: 0,
      self_sacrifice_for_power: 0,
      fusion_and_self_harm_total: 0,
      harbor_visits: 0,
      sea_acceptance_flags: 0,
      sleep_streak: 0,
      work_only_days: 0,
      safehouse_stay_days: 0,
      move_only_days: 0,
      record_only_days: 0,
      low_intervention_count: 0,
      work_count: 0,
      hoarded_money_max: 0,
      hoarded_food_max: 0,
      archive_consumed_count: 0,
      prophecy_spread_count: 0,
      redeemed_npcs: 0,
      thirteenth_bell_obsession: 0,
      meta_boundary_breaks: 0,
      final_choice_refused_count: 0,
      save_delete_attempts: 0,
      loop_exploit_score: 0,
      loop_break_attempts: 0,
      clue_finds: 0,
      // v0.9.0: Moral choice tracking (hidden from player)
      mercy_shown_count: 0,
      selfless_actions: 0,
      promises_kept: 0,
      truths_told: 0,
      npc_saved_from_danger: 0,
      donated_money_total: 0,
      refused_bribes: 0,
      accepted_bribes: 0,
      warned_npcs_count: 0,
      // Moral dilemma tracking
      _dilemmaChoices: [],
      _dilemmaUsageCount: {},
      _scheduledEffects: [],
      _carriedMoralWeight: 0,
    },
  };
}

/**
 * Loop / persistence state — loop count, ending coins, shop items.
 * All [persisted] — survives across reincarnation loops.
 */
function createPersistenceState() {
  return {
    loopCount: 0,                   // [persisted]
    endingCoins: 0,                 // [persisted]
    loopShopTier: 0,                // [persisted]
    purchasedShopItems: [],         // [persisted]
    runMemory: [],                  // [persisted] — max 12 entries
    runSeed: generateRunSeed(),     // [persisted] — deterministic RNG seed for this run
  };
}

/**
 * Public API: create the full initial game state.
 * Merges all sub-state sections and applies extended state defaults.
 */
export const initialState = () => {
  const base = {
    ...createCharacterState(),
    ...createWorldState(),
    ...createProgressState(),
    ...createResourceState(),
    ...createRuntimeState(),
    ...createBehaviorTrackingState(),
    ...createPersistenceState(),
  };
  return ensureExtendedState(base);
};
