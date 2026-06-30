// src/state/useGameStore.js — Zustand + Immer store (Step 3 complete)
//
// Architecture:
//   dispatch(action):
//     1. systemSlice.before  (cross-cutting: tracking, profiling, _apBefore)
//     2. Slice action        (mutates draft directly — single produce via immer middleware)
//     3. systemSlice.after   (cross-cutting: AP steal, AP audio, SAN consequences)
//     4. Persist effects to state._effects
//     5. flushEffectsBuffer  (side effects dispatched async via effectExecutor)
//
// All 6 domain slices migrated: uiSlice, dailySlice, exploreSlice, npcSlice, darkSlice, coreSlice
// Each handler mutates draft in-place, collects effects via c.effects (buildSliceCtx closure).
// createGameReducer bridge removed — single produce path only.
// DevTools: opt-in via @xyflow/zustand-devtools (see import above).

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { setAutoFreeze } from 'immer';
import { logAction } from '../engine/zustandDevTools.js';
import { flushEffectsBuffer, setEffectsDispatch } from '../reducers/gameReducer.js';
import { STARTING_STATE, STAT_DEFAULTS } from './gameConstants.js';
import { systemSlice } from '../reducers/slices/systemSlice.js';
import { handleUiAction } from '../reducers/slices/uiSlice.js';
import { handleDailyAction } from '../reducers/slices/dailySlice.js';
import { handleExploreAction } from '../reducers/slices/exploreSlice.js';
import { handleNpcAction } from '../reducers/slices/npcSlice.js';
import { handleDarkAction } from '../reducers/slices/darkSlice.js';
import { handleCoreAction } from '../reducers/slices/coreSlice.js';
import { handleAdventureAction } from '../reducers/slices/adventureSlice.js';
import { handleLoopAction } from '../reducers/slices/loopSlice.js';
import { applyFearCorruption } from '../systems/fearLens.js';
import { applyTextPollution } from '../systems/textPollution.js';
import { initialState } from './initialState.js';
import { createSeededRng } from '../utils/seededRng.js';
import { getPhase } from '../engine/WorldTimeSystem.js';
import { loadSettings } from '../reducers/miscReducer.js';

// Disable Immer auto-freeze in dev mode. Auto-freeze recursively freezes all
// state objects, which triggers forceStoreRerender inside React's passive effects
// phase when Zustand notifies subscribers of the frozen state update.
setAutoFreeze(false);

// ═══════════════════════════════════════════════════════════════
//  Placeholder state (pre-seed, before GD loads)
// ═══════════════════════════════════════════════════════════════

var PLACEHOLDER = {
  day: STARTING_STATE.DAY, ap: 0, maxAp: STARTING_STATE.MAX_AP,
  san: STARTING_STATE.SAN, maxSan: STARTING_STATE.MAX_SAN,
  hp: 0, maxHp: STARTING_STATE.MAX_HP,
  luck: STARTING_STATE.LUCK, mp: STARTING_STATE.MP,
  money: STARTING_STATE.MONEY, food: 0, pollution: 0, safehouseCorruption: 0,
  currentArea: '', visitedAreas: [], inventory: [], clues: [], skills: {},
  stats: { ...STAT_DEFAULTS },
  npcTrust: {}, npcStates: {}, npcRelations: {}, sealState: STARTING_STATE.SEAL_STATE,
  weather: STARTING_STATE.WEATHER, currentSafehouse: STARTING_STATE.CURRENT_SAFEHOUSE,
  currentChapter: STARTING_STATE.CURRENT_CHAPTER,
  humanityScore: STARTING_STATE.HUMANITY, archetype: null, loopCount: 0,
  difficulty: 'normal', difficultyLevel: STARTING_STATE.DIFFICULTY_LEVEL,
  objectives: [], completedChains: [], triggeredEvents: [], triggeredSilentEvents: [],
  seenEventTexts: {}, longTermEffects: [], madnessActive: null,
  narrative: [], eventLog: [], _dayActions: [], _actionIndex: 0, _effects: [],
  _apLies: false, _apOffset: 0, _runtime: {}, _debug: {},
};

// ═══════════════════════════════════════════════════════════════
//  Lightweight context builder
//  Replaces buildReducerCtx for per-slice actions.
//  Key difference: operates on immer draft directly (no produce wrapper).
// ═══════════════════════════════════════════════════════════════

function buildSliceCtx(draft, rng, corruptFn) {
  var effects = [];
  var narr = function (type, text, extra) {
    extra = extra || {};
    var entry = { id: Date.now() + Math.random(), type: type, text: text };
    for (var k in extra) entry[k] = extra[k];
    // Apply fear corruption to system/event narration
    if (corruptFn && (type === 'system' || type === 'event') && !extra.isSpecial && !extra.isEffect && !extra.madness) {
      var corrupted = corruptFn(text, 1);
      if (corrupted !== text) entry._originalText = text;
      entry.text = corrupted;
    }
    // Apply text pollution (SAN-driven character/word corruption)
    if (!extra.isSpecial && !extra.isEffect && !extra.madness) {
      var polluted = applyTextPollution(entry.text, draft.san, draft.loopCount, rng);
      if (polluted !== entry.text) entry._originalText = entry._originalText || entry.text;
      entry.text = polluted;
    }
    draft.narrative.push(entry);
    if (draft.narrative.length > 250) {
      draft.narrative = draft.narrative.slice(-250);
    }
  };
  var log = function (text) {
    draft.eventLog.push({ day: draft.day, text: text });
  };
  return {
    narr: narr,
    log: log,
    effects: effects,
    bt: draft.behaviorTracking,
    rng: rng,
    now: function () { return Date.now(); },
    pick: rng ? rng.pick : function (arr) { return arr[Math.floor(Math.random() * arr.length)]; },
    view: {
      phase: getPhase(draft.ap, draft.maxAp),
      visits: 0,
      pollution: draft.pollution || 0,
      san: draft.san,
      hp: draft.hp,
      maxHp: draft.maxHp,
      loopCount: draft.loopCount || 0,
      madnessActive: !!draft.madnessActive,
    },
  };
}

// ═══════════════════════════════════════════════════════════════
//  Store
// ═══════════════════════════════════════════════════════════════

export var useGameStore = create(
  immer(function (set, get) {
    return {
        // State
        ...PLACEHOLDER,

        // ══════════════════════════════════════════════════════════
        //  dispatch — unified entry point (replaces old function)
        //
        //  Flow per action:
        //    1. systemSlice.before  (tracking, profiling, _apBefore)
        //    2. Route to migrated slice action (single produce via immer)
      //    3. systemSlice.after   (SAN consequences, AP steal, audio)
      //    4. Persist effects to state._effects
      //    5. flushEffectsBuffer (async dispatch to effectExecutor)
      // ══════════════════════════════════════════════════════════

      dispatch: function (action) {
        // DevTools: log action type for inspection (non-intrusive)
        logAction(action.type, action.payload);

        var state = get();
        var GD = state._GD;
        var fearTuning = state.fearTuning || null;
        var corruptFn = fearTuning && fearTuning.primary
          ? function (text, layer) {
              return applyFearCorruption({ fearTuning: fearTuning }, text, layer, null);
            }
          : function (t) { return t; };

        var effectsToFlush = [];
        set(function (draft) {
          // Build RNG for this dispatch
          var runSeed = draft.runSeed || 'default';
          var actIdx = action.meta && action.meta._actionIndex != null
            ? action.meta._actionIndex
            : draft._actionIndex || 0;
          var rng = createSeededRng(runSeed, actIdx);
          draft._actionIndex = actIdx + 1;

          // Build lightweight context (replaces buildReducerCtx — no module-level buffer)
          var ctx = { GD: GD };
          var c = buildSliceCtx(draft, rng, corruptFn);

          // systemSlice.before runs for ALL actions
          systemSlice.before && systemSlice.before(draft, action, c, ctx);

          // ── Route to migrated slice actions (draft mutation, no double produce) ──
          var actionType = action.type;

          // dailySlice: REST, WORK, BUY_FOOD
          if (actionType === 'REST' || actionType === 'WORK' || actionType === 'BUY_FOOD') {
            handleDailyAction(draft, action, c, ctx);
          }
          // exploreSlice: MOVE, EXPLORE, DO_SKILL_CHECK
          else if (actionType === 'MOVE' || actionType === 'EXPLORE' || actionType === 'DO_SKILL_CHECK') {
            handleExploreAction(draft, action, c, ctx);
          }
          // npcSlice: TALK_NPC, NPC_RESPONSE
          else if (actionType === 'TALK_NPC' || actionType === 'NPC_RESPONSE') {
            handleNpcAction(draft, action, c, ctx);
          }
          // darkSlice: SELF_HARM, SPREAD_PROPHECY, CONSUME_ARCHIVE, SELF_SACRIFICE, DESECRATE, BREAK_SEAL
          else if (actionType === 'SELF_HARM' || actionType === 'SPREAD_PROPHECY'
            || actionType === 'CONSUME_ARCHIVE' || actionType === 'SELF_SACRIFICE'
            || actionType === 'DESECRATE' || actionType === 'BREAK_SEAL') {
            handleDarkAction(draft, action, c, ctx);
          }
          // coreSlice: START_GAME, SET_DIFFICULTY, SET_ARCHETYPE, ROLL_STATS, SWITCH_SAFEHOUSE, GLITCH_PULSE, RESIST_SAN_DRAIN
          else if (actionType === 'START_GAME' || actionType === 'SET_DIFFICULTY'
            || actionType === 'SET_ARCHETYPE' || actionType === 'ROLL_STATS'
            || actionType === 'SWITCH_SAFEHOUSE' || actionType === 'GLITCH_PULSE'
            || actionType === 'GLITCH_PULSE_CLEAR' || actionType === 'RESIST_SAN_DRAIN') {
            handleCoreAction(draft, action, c, ctx);
          }
          // adventureSlice: BEGIN_ADVENTURE
          else if (actionType === 'BEGIN_ADVENTURE') {
            handleAdventureAction(draft, action, c, ctx);
          }
          // loopSlice: NEW_GAME, CONTINUE_GAME, LOOP_SHOP_PURCHASE
          else if (actionType === 'NEW_GAME' || actionType === 'CONTINUE_GAME'
            || actionType === 'LOOP_SHOP_PURCHASE') {
            handleLoopAction(draft, action, c, ctx);
          }
          // uiSlice: CHOICE_SELECT, DISMISS_PENDING, CLEAR_TRANSITION, AUDIO_MUTE_TOGGLE, etc.
          else if (actionType === 'CHOICE_SELECT'
            || actionType === 'DISMISS_PENDING'
            || actionType === 'CLEAR_TRANSITION'
            || actionType === 'AUDIO_MUTE_TOGGLE'
            || actionType === 'ACCESSIBILITY_TOGGLE'
            || actionType === 'GAMBLE_CHOICE'
            || actionType === 'START_PROLOGUE'
            || actionType === 'PROLOGUE_CHOICE'
            || actionType === 'COMPLETE_PROLOGUE'
            || actionType === 'DISMISS_GUIDE'
            || actionType === 'SKIP_PROLOGUE'
            || actionType === 'MARK_NOTEBOOK_OPENED'
            || actionType === 'SET_META_FIELD'
            || actionType === 'DELAYED_NARRATE'
            || actionType === 'USE_ITEM'
          ) {
            handleUiAction(draft, action, c, ctx);
          }
          // Unhandled action types are silently ignored (all domain actions covered above)

          // ── systemSlice.after (cross-cutting post-dispatch) ──
          // Runs for ALL actions, including non-migrated slices
          systemSlice.after && systemSlice.after(draft, action, c, ctx);

          // ── Collect all effects ──
          var allEffects = c.effects ? c.effects.slice() : [];
          draft._effects = allEffects;
          effectsToFlush = allEffects;
        });

        // Flush side effects after state update
        flushEffectsBuffer(effectsToFlush);
      },

      // ══════════════════════════════════════════════════════════
      //  seedState — initialize with real game data
      // ══════════════════════════════════════════════════════════

      seedState: function (gd) {
        var realInit = initialState();
        var settings = loadSettings();
        set(function (draft) {
          for (var key in realInit) {
            if (realInit.hasOwnProperty(key)) draft[key] = realInit[key];
          }
          draft._GD = gd;
          // Sync UI settings → game state (was in a separate useEffect, now folded into initial seed)
          draft.accessibilityOptions = {
            visual_distortion: settings.visualDistortion !== false,
            flicker_control: settings.flickerEffect !== false,
            sudden_sounds: settings.suddenSounds !== false ? 'on' : 'off',
          };
          draft._visualPollution = settings.visualPollution ?? 50;
          draft._interactionPollution = settings.interactionPollution ?? 50;
          draft._metaPollution = settings.metaPollution ?? 50;
          if (settings.lightPollutionMode) {
            draft._visualPollution = 10;
            draft._interactionPollution = 5;
            draft._metaPollution = 25;
          }
        });
      },
    };
  })
);

// ═══════════════════════════════════════════════════════════════
//  Public API (unchanged)
// ═══════════════════════════════════════════════════════════════

export function getRawState() {
  return useGameStore.getState();
}

export function getDispatch() {
  return useGameStore.getState().dispatch;
}

export function seedGameStore(gd) {
  useGameStore.getState().seedState(gd);
  // Wire up effects dispatch: flushEffectsBuffer → store.dispatch
  setEffectsDispatch(useGameStore.getState().dispatch);
}

// ── Legacy selector hooks (backward compat) ──

export function useSan(sel) {
  return useGameStore(sel || function (s) { return s.san != null ? s.san : 60; });
}
export function useHp(sel) {
  return useGameStore(sel || function (s) { return s.hp != null ? s.hp : 0; });
}
export function useAp(sel) {
  return useGameStore(sel || function (s) { return s.ap != null ? s.ap : 0; });
}
export function useDay(sel) {
  return useGameStore(sel || function (s) { return s.day != null ? s.day : 1; });
}
export function useInventory(sel) {
  return useGameStore(sel || function (s) { return s.inventory || []; });
}
export function useFood(sel) {
  return useGameStore(sel || function (s) { return s.food != null ? s.food : 0; });
}
export function useMoney(sel) {
  return useGameStore(sel || function (s) { return s.money != null ? s.money : 0; });
}
export function useCurrentArea(sel) {
  return useGameStore(sel || function (s) { return s.currentArea || ''; });
}
export function useScreen(sel) {
  return useGameStore(sel || function (s) { return s.screen || 'title'; });
}
export function useLoopCount(sel) {
  return useGameStore(sel || function (s) { return s.loopCount != null ? s.loopCount : 0; });
}
export function usePollution(sel) {
  return useGameStore(sel || function (s) { return s.pollution != null ? s.pollution : 0; });
}
export function useCorruption(sel) {
  return useGameStore(sel || function (s) { return s.safehouseCorruption != null ? s.safehouseCorruption : 0; });
}

export function useGameSelector(selector) {
  return useGameStore(selector);
}
