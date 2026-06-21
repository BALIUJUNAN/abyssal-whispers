// src/state/gameConstants.js — Centralized gameplay constants (P2-11)
// Single source of truth for all magic numbers in state initialization and slice handlers.
// New constants should be added here with a descriptive name and a comment explaining their purpose.

export var GAME_BALANCE = Object.freeze({
  // ── SAN thresholds ─────────────────────────────────────────────────
  LOW_SAN_STAT_THRESHOLD: 10, // dailySlice: stat "low_san_days" when san <= this
  SAN_SCENE_VARIANT_GATE: 70, // exploreSlice MOVE: SAN scene flavor when san < this
  SAN_LOSS_TRANSITION: 3, // exploreSlice: transition='san-loss' when sanDmg >= this
  MADNESS_TRIGGER: 5, // exploreSlice: roll madness when sanDmg >= this
  MEMORY_TRACK_THRESHOLD: 1, // exploreSlice: addRunMemory when sanDmg >= this

  // ── Day / chapter thresholds ───────────────────────────────────────
  CHAPTER_1_DAY_LIMIT: 7, // exploreSlice: chapter 1 cap applies when day <= this
  FOG_CLEAR_DAY: 8, // dailySlice: fog clearing text on this exact day
  LOOP_TEXT_VARIANT_5: 5, // coreSlice/npcSlice: loop_5_plus text variant
  LOOP_TEXT_VARIANT_3: 3, // coreSlice: loop_3_plus text variant

  // ── Event probabilities ────────────────────────────────────────────
  NPC_TRUST_DECAY_CHANCE: 0.3, // dailySlice: NPC trust decay on starvation
  LIGHT_CORRUPTION_CHANCE: 0.3, // exploreSlice MOVE: light corruption text
  MICRO_EVENT_CHANCE: 0.35, // exploreSlice MOVE: micro_event on area entry
  MISSING_600_CHANCE: 0.35, // exploreSlice: Missing 600 virtual event
  SILENT_EVENT_ON_MOVE: 0.15, // exploreSlice MOVE: silent event probability
  SAN_SCENE_VARIANT_CHANCE: 0.2, // exploreSlice MOVE: SAN scene variant
  MOTIF_TEXT_CHANCE: 0.2, // dailySlice: random motif flavor text
  MONSTER_MANIFEST_CHANCE: 0.1, // exploreSlice: monster manifestation flavor
  SKILL_IMPROVE_CHANCE: 0.1, // exploreSlice DO_SKILL_CHECK: skill improvement

  // ── World decay probabilities ──────────────────────────────────────
  WORLD_DECAY_CHANCE: 0.3, // dailySlice: world decay narrative text

  // ── UI transition durations (ms) ───────────────────────────────────
  SAN_LOSS_FLASH_MS: 800, // san-loss flash overlay duration
  TRANSITION_FADE_MS: 500, // scene transition fade duration
});

// ── Starting state constants (replaces magic numbers in initialState.js) ──

export var STARTING_STATE = Object.freeze({
  DAY: 1,
  AP: 12,
  MAX_AP: 12,
  FOOD: 3,
  MAX_FOOD: 5,
  LIGHT_LEVEL: 2,
  MAX_INFECTION: 10,
  MAX_FATIGUE: 10,
  MONEY: 0,
  SAN: 60,
  MAX_SAN: 60,
  HP: 11,
  MAX_HP: 11,
  LUCK: 50,
  MP: 12,
  HUMANITY: 50,
  LOOP_COUNT: 0,
  DIFFICULTY_LEVEL: 1,
  CURRENT_AREA: 'town_center',
  CURRENT_SAFEHOUSE: 'main',
  WEATHER: '阴天',
  SEAL_STATE: 'intact',
  CURRENT_CHAPTER: 'chapter_1',
});

// ── Stat defaults (ROLL_STATS fallback) ──

export var STAT_DEFAULTS = Object.freeze({
  STR: 50,
  CON: 55,
  DEX: 55,
  APP: 50,
  POW: 60,
  INT: 65,
  SIZ: 60,
  EDU: 70,
});

export var STAT_NAMES = Object.freeze(['STR', 'CON', 'DEX', 'APP', 'POW', 'INT', 'SIZ', 'EDU']);

// ── Shop item bonuses (LOOP_SHOP_PURCHASE) ──

export var SHOP_BONUSES = Object.freeze({
  SKILL_POINTS: 3,
  NPC_TRUST: 2,
  MYTHOS_RESISTANCE: 0.1,
  SAN_CAP_BOOST: 5,
});

// ── Glitch pulse bounds ──

export var GLITCH_PULSE_MIN = 1;
export var GLITCH_PULSE_MAX = 10;
export var GLITCH_PULSE_DEFAULT = 5;

// ── Starting items ID map ──

export var STARTING_ITEM_ID_MAP = Object.freeze({
  '手电筒': 'flashlight',
  '笔记本和笔': 'notebook',
  '急救包': 'first_aid_kit',
  '怀表': 'pocket_watch',
});
