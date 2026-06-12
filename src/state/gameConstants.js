// src/state/gameConstants.js — Centralized balance constants (P2-11)
// Replaces magic numbers scattered across slice files and systems.
// All gameplay-tunable thresholds live here for single-point adjustment.
//
// BUNDLE ORDER: loaded after reducers/utils.js, before all slice files.

export var GAME_BALANCE = Object.freeze({

  // ── SAN thresholds ─────────────────────────────────────────────────
  LOW_SAN_STAT_THRESHOLD:    10,   // dailySlice: stat "low_san_days" when san <= this
  SAN_SCENE_VARIANT_GATE:    70,   // exploreSlice MOVE: SAN scene flavor when san < this
  SAN_LOSS_TRANSITION:        3,   // exploreSlice: transition='san-loss' when sanDmg >= this
  MADNESS_TRIGGER:            5,   // exploreSlice: roll madness when sanDmg >= this
  MEMORY_TRACK_THRESHOLD:     1,   // exploreSlice: addRunMemory when sanDmg >= this

  // ── Day / chapter thresholds ───────────────────────────────────────
  CHAPTER_1_DAY_LIMIT:       7,    // exploreSlice: chapter 1 cap applies when day <= this
  FOG_CLEAR_DAY:             8,    // dailySlice: fog clearing text on this exact day
  LOOP_TEXT_VARIANT_5:       5,    // coreSlice/npcSlice: loop_5_plus text variant
  LOOP_TEXT_VARIANT_3:       3,    // coreSlice: loop_3_plus text variant

  // ── Event probabilities ────────────────────────────────────────────
  NPC_TRUST_DECAY_CHANCE:   0.30,  // dailySlice: NPC trust decay on starvation
  LIGHT_CORRUPTION_CHANCE:  0.30,  // exploreSlice MOVE: light corruption text
  MICRO_EVENT_CHANCE:       0.35,  // exploreSlice MOVE: micro_event on area entry
  MISSING_600_CHANCE:       0.35,  // exploreSlice: Missing 600 virtual event
  SILENT_EVENT_ON_MOVE:     0.15,  // exploreSlice MOVE: silent event probability
  SAN_SCENE_VARIANT_CHANCE: 0.20,  // exploreSlice MOVE: SAN scene variant
  MOTIF_TEXT_CHANCE:        0.20,  // dailySlice: random motif flavor text
  MONSTER_MANIFEST_CHANCE:  0.10,  // exploreSlice: monster manifestation flavor
  SKILL_IMPROVE_CHANCE:     0.10,  // exploreSlice DO_SKILL_CHECK: skill improvement

  // ── World decay probabilities ──────────────────────────────────────
  WORLD_DECAY_CHANCE:       0.30,  // dailySlice: world decay narrative text

  // ── UI transition durations (ms) ───────────────────────────────────
  SAN_LOSS_FLASH_MS:       800,    // san-loss flash overlay duration
  TRANSITION_FADE_MS:      500,    // scene transition fade duration

});
