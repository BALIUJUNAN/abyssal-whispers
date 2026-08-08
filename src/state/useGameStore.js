// src/state/useGameStore.js — Zustand + Immer store (Step 3 complete)
//
// Architecture:
//   dispatch(action):
//     1. systemSlice.before  (cross-cutting: tracking, profiling, _apBefore)
//     2. Slice action         (via combineSlices dispatch map → handler mutates draft)
//     3. systemSlice.after    (cross-cutting: AP steal, AP audio, SAN consequences)
//     4. Persist effects to state._effects
//     5. flushEffectsBuffer   (side effects dispatched async via effectExecutor)
//
// Slice dispatch is data-driven: combineSlices builds a dispatch map from
// createSlice configs. Each slice handler mutates the immer draft in-place.
// The if/else-if router was replaced by the combineSlices dispatch map (v0.9.8).
// DevTools: opt-in via @xyflow/zustand-devtools (see import above).

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet, setAutoFreeze } from 'immer';
import { createSlice, combineSlices } from './combineSlices.js';
import { logAction } from '../engine/zustandDevTools.js';
import { flushEffectsBuffer, setEffectsDispatch } from '../runtime/effectExecutor.js';
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
import { GD as sharedGD } from './gameData.js';
import { errorTracker } from '../utils/errorTracker.js';
import { emit } from '../engine/eventBus.js';

// ═══════════════════════════════════════════════════════════════
//  Slice dispatch map — built once via combineSlices
// ═══════════════════════════════════════════════════════════════

function claimActions(handler, actionTypes) {
  var owned = new Set(actionTypes);
  return function (state, action, c, ctx) {
    if (!owned.has(action.type)) return false;
    handler(state, action, c, ctx);
    return true;
  };
}

function prepareAction(action, state) {
  if (!action || typeof action.type !== 'string' || !action.type) {
    var invalid = new Error('Dispatched action must have a non-empty string type');
    invalid.name = 'InvalidActionError';
    throw invalid;
  }
  var meta = { ...(action.meta || {}) };
  if (!meta.actionId) {
    meta.actionId = Date.now() + '_' + Math.random().toString(16).slice(2, 6);
  }
  if (!meta.now) meta.now = Date.now();
  if (meta._actionIndex == null) meta._actionIndex = state._actionIndex || 0;
  return { ...action, meta: meta };
}

function shouldRethrowDispatchError() {
  if (typeof window === 'undefined') return true;
  return !!(import.meta.env && import.meta.env.DEV);
}

function reportDispatchFailure(action, traceEntry, error) {
  var context = {
    actionType: action && action.type ? action.type : 'UNKNOWN',
    phase: error.phase || (error.name === 'UnhandledActionError' ? 'routing' : 'dispatch'),
    slice: error.slice || (error.name === 'UnhandledActionError' ? 'unowned' : 'unknown'),
  };
  errorTracker.complete(traceEntry, { ok: false, error: error, context: context });
  console.error('[dispatch] Action rolled back:', context, error);
  emit('POPUP_SHOW', {
    id: 'dispatch_error_' + Date.now(),
    type: 'error',
    icon: '⚠',
    title: '操作未完成',
    message: '本次操作执行失败，游戏状态未发生改变。',
    duration: 8000,
  });
}

var coreSlice = createSlice({
  name: 'core',
  handler: claimActions(handleCoreAction, [
    'START_GAME', 'SET_DIFFICULTY', 'SET_ARCHETYPE', 'ROLL_STATS',
    'SWITCH_SAFEHOUSE', 'GLITCH_PULSE', 'GLITCH_PULSE_CLEAR', 'RESIST_SAN_DRAIN',
  ]),
});
var adventureSlice = createSlice({
  name: 'adventure',
  handler: claimActions(handleAdventureAction, ['BEGIN_ADVENTURE']),
});
var loopSlice = createSlice({
  name: 'loop',
  handler: claimActions(handleLoopAction, ['NEW_GAME', 'CONTINUE_GAME', 'LOOP_SHOP_PURCHASE']),
});
var dailySlice = createSlice({
  name: 'daily',
  handler: claimActions(handleDailyAction, ['REST', 'WORK', 'BUY_FOOD']),
});
var exploreSlice = createSlice({
  name: 'explore',
  handler: claimActions(handleExploreAction, [
    'MOVE', 'EXPLORE', 'DO_SKILL_CHECK', 'START_COMBAT', 'COMBAT_ACTION', 'END_COMBAT',
  ]),
});
var npcSlice = createSlice({
  name: 'npc',
  handler: claimActions(handleNpcAction, ['TALK_NPC', 'NPC_RESPONSE']),
});
var darkSlice = createSlice({
  name: 'dark',
  handler: claimActions(handleDarkAction, [
    'SELF_HARM', 'SPREAD_PROPHECY', 'CONSUME_ARCHIVE',
    'SELF_SACRIFICE', 'DESECRATE', 'BREAK_SEAL',
  ]),
});
var uiSlice = createSlice({
  name: 'ui',
  handler: claimActions(handleUiAction, [
    'CHOICE_SELECT', 'DISMISS_PENDING', 'CLEAR_TRANSITION', 'AUDIO_MUTE_TOGGLE',
    'ACCESSIBILITY_TOGGLE', 'GAMBLE_CHOICE', 'START_PROLOGUE', 'PROLOGUE_CHOICE',
    'COMPLETE_PROLOGUE', 'DISMISS_GUIDE', 'SKIP_PROLOGUE', 'MARK_NOTEBOOK_OPENED',
    'SET_META_FIELD', 'DELAYED_NARRATE', 'BUY_FROM_SHOP', 'USE_ITEM', 'OPEN_SHOP',
    'CLOSE_SHOP', 'ADD_NARRATIVE', 'ADD_EVENT_LOG',
  ]),
});

var createRootReducer = combineSlices([
  coreSlice, adventureSlice, loopSlice, dailySlice,
  exploreSlice, npcSlice, darkSlice, uiSlice, systemSlice,
]);

// Game state keeps derived Set indexes for triggered events. Immer must know
// how to draft them before any Store action reads or mutates Set.prototype.
enableMapSet();

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
  _apLies: false, _apOffset: 0, _runtime: {}, _debug: {}, behaviorTracking: {},
};

// ═══════════════════════════════════════════════════════════════
//  Lightweight context builder
//  Replaces buildReducerCtx for per-slice actions.
//  Key difference: operates on immer draft directly (no produce wrapper).
// ═══════════════════════════════════════════════════════════════

function buildSliceCtx(draft, rng, corruptFn, actIdx) {
  var effects = [];
  if (!draft.behaviorTracking) draft.behaviorTracking = {};
  var _narrLocalSeq = 0;
  var narr = function (type, text, extra) {
    extra = extra || {};
    var entry = { id: (actIdx || 0) * 1000 + (++_narrLocalSeq), type: type, text: text };
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
        var state = get();
        var preparedAction;
        try {
          preparedAction = prepareAction(action, state);
        } catch (invalidActionError) {
          var invalidTrace = errorTracker.record(action || { type: 'INVALID_ACTION' }, state);
          reportDispatchFailure(action, invalidTrace, invalidActionError);
          if (shouldRethrowDispatchError()) throw invalidActionError;
          return { ok: false, error: invalidActionError };
        }

        // Recording lives at the Store boundary so map-mode and background
        // dispatches cannot bypass it.
        var traceEntry = errorTracker.record(preparedAction, state);
        logAction(preparedAction.type, preparedAction.payload);

        var GD = state._GD;
        var fearTuning = state.fearTuning || null;
        var corruptFn = fearTuning && fearTuning.primary
          ? function (text, layer) {
              return applyFearCorruption({ fearTuning: fearTuning }, text, layer, null);
            }
          : function (t) { return t; };

        var effectsToFlush = [];
        try {
          set(function (draft) {
            // Build RNG for this dispatch
            var runSeed = draft.runSeed || 'default';
            var actIdx = preparedAction.meta._actionIndex;
            var rng = createSeededRng(runSeed, actIdx);
            draft._actionIndex = actIdx + 1;

            // Build lightweight context (replaces buildReducerCtx — no module-level buffer)
            var ctx = { GD: GD };
            var c = buildSliceCtx(draft, rng, corruptFn, actIdx);

            // ── Dispatch via combineSlices root reducer ──
            // systemSlice.before / domain handler / systemSlice.after
            // are all managed by the combined reducer's before/after hooks.
            var rootReducer = createRootReducer({ GD: GD });
            var outcome = rootReducer(draft, preparedAction, c);
            if (!outcome.handled) {
              var unhandled = new Error('No reducer owns action "' + preparedAction.type + '"');
              unhandled.name = 'UnhandledActionError';
              unhandled.actionType = preparedAction.type;
              throw unhandled;
            }

            // ── Collect all effects ──
            var allEffects = c.effects ? c.effects.slice() : [];
            draft._effects = allEffects;
            effectsToFlush = allEffects;
          });
        } catch (dispatchError) {
          reportDispatchFailure(preparedAction, traceEntry, dispatchError);
          if (shouldRethrowDispatchError()) throw dispatchError;
          return { ok: false, error: dispatchError };
        }

        // Flush side effects after state update
        flushEffectsBuffer(effectsToFlush);
        errorTracker.complete(traceEntry, { ok: true });
        return { ok: true };
      },

      // ══════════════════════════════════════════════════════════
      //  seedState — initialize with real game data
      // ══════════════════════════════════════════════════════════

      seedState: function (gd) {
        // Keep module-level pure readers synchronized without allowing them to
        // import the Store back and create a reducer/store dependency cycle.
        if (gd !== sharedGD) {
          Object.keys(sharedGD).forEach(function (key) { delete sharedGD[key]; });
          Object.assign(sharedGD, gd || {});
        }
        var realInit = initialState(gd);
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
