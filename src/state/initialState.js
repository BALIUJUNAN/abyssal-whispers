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

/**
 * Character attributes — stats, HP, SAN, skills, inventory.
 * Mostly [persisted]. maxHp is [derived] from CON+SIZ but cached for performance.
 */
function createCharacterState() {
  return {
    stats: { STR: 50, CON: 55, DEX: 55, APP: 50, POW: 60, INT: 65, SIZ: 60, EDU: 70 },
    hp: 11,                         // [persisted]
    maxHp: 11,                      // [derived] — cached from (CON+SIZ)/10
    san: 60,                        // [persisted]
    maxSan: 60,                     // [persisted]
    luck: 50,                       // [persisted]
    mp: 12,                         // [persisted]
    skills: {},                     // [persisted]
    archetype: null,                // [persisted]
    tempSkillBonus: null,           // [runtime]
    inventory: (GD.systems?.player?.starting_items?.starting_items || []).map((item) => {
      const idMap = {
        手电筒: 'flashlight',
        笔记本和笔: 'notebook',
        急救包: 'first_aid_kit',
        怀表: 'pocket_watch',
      };
      return { id: idMap[item.name] || item.name, name: item.name, uses: item.uses };
    }),
    clues: [],                      // [persisted]
    difficulty: 'normal',           // [persisted] 向后兼容字符串key
    difficultyLevel: 1,             // [persisted] 21级难度 1-21
  };
}

/**
 * World state — area, NPCs, seals, weather, knowledge.
 * All [persisted] except areaNameCache ([runtime] optimization cache).
 */
function createWorldState() {
  return {
    currentArea: 'town_center',     // [persisted]
    visitedAreas: ['town_center'],  // [persisted]
    npcTrust: {},                   // [persisted]
    npcStates: {},                  // [persisted]
    npcRelations: {},               // [persisted]
    sealState: 'intact',            // [persisted]
    weather: '阴天',                // [persisted]
    safehouseCorruption: 0,         // [persisted]
    currentSafehouse: 'main',       // [persisted]
    harborRiskReduction: 0,         // [persisted]
    areaNameCache: {},              // [runtime] — rebuilt on load
    retainedKnowledge: [],          // [persisted]
    lastVisitedDates: {},           // [persisted]
    lastDeathType: null,            // [persisted]
    mythosLevel: 0,                 // [persisted]
    currentChapter: 'chapter_1',    // [persisted]
    humanityScore: 50,              // [persisted]
    discoveredConclusions: [],      // [persisted]
    activeBlessings: [],            // [persisted]
    pollution: 0,                   // [persisted]
  };
}

/**
 * Progress state — day, objectives, triggered events, event chains.
 * All [persisted].
 */
function createProgressState() {
  return {
    day: 1,                         // [persisted]
    ap: 12,                         // [persisted]
    maxAp: 12,                      // [persisted]
    objectives: [],                 // [persisted]
    completedChains: [],            // [persisted]
    triggeredEvents: [],            // [persisted]
    triggeredSilentEvents: [],      // [persisted]
    seenEventTexts: {},             // [persisted]
    longTermEffects: [],            // [persisted]
    madnessActive: null,            // [persisted]
    ch1IntroComplete: false,        // [persisted]
    stats_run: {                    // [persisted]
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
    food: 3,                        // [persisted]
    maxFood: 5,                     // [persisted]
    lightLevel: 2,                  // [persisted]
    starvationDays: 0,              // [persisted]
    infection: 0,                   // [persisted]
    maxInfection: 10,               // [persisted]
    fatigue: 0,                     // [persisted]
    maxFatigue: 10,                 // [persisted]
    money: 0,                       // [persisted]
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
  };
}

/**
 * Behavior tracking — detailed counters for behavior-dependent endings.
 * All [persisted] — drives ending resolution across loops.
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
