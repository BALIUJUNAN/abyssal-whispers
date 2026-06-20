// src/state/useGameStore.js — Zustand + Immer bridge store
// Single source of truth for game state.
//
// Architecture:
//   - State lives in Zustand with immer middleware
//   - dispatch(action) runs createGameReducer → patches draft → flushEffects
//   - Components subscribe via useGameStore(s => s.san)
//   - Non-hook code uses getRawState() / getDispatch()
//
// Bridge (Step 1): slice handlers unchanged, all existing tests pass as-is.

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { createGameReducer, flushEffectsBuffer, setEffectsDispatch } from '../engine/gameReducer.js';
import { applyFearCorruption } from '../systems/fearLens.js';
import { initialState } from './initialState.js';

// ── Placeholder state ──
// Real state seeded by seedState() after GD is available.
// Prevents undefined on first render.

var PLACEHOLDER = {
  day: 1, ap: 0, maxAp: 12, san: 60, maxSan: 60, hp: 10, maxHp: 10,
  luck: 50, mp: 0, money: 0, food: 0, pollution: 0, safehouseCorruption: 0,
  currentArea: '', visitedAreas: [], inventory: [], clues: [], skills: {},
  stats: { STR: 50, CON: 50, DEX: 50, APP: 50, POW: 50, INT: 50, SIZ: 50, EDU: 50 },
  npcTrust: {}, npcStates: {}, npcRelations: {}, sealState: 'intact',
  weather: '阴天', currentSafehouse: 'main', currentChapter: 'chapter_1',
  humanityScore: 50, archetype: null, loopCount: 0, difficulty: 'normal', difficultyLevel: 1,
  objectives: [], completedChains: [], triggeredEvents: [], triggeredSilentEvents: [],
  seenEventTexts: {}, longTermEffects: [], madnessActive: null,
  narrative: [], eventLog: [], _dayActions: [], _actionIndex: 0, _effects: [],
  _apLies: false, _apOffset: 0, _runtime: {}, _debug: {},
};

// ── Store ──

export var useGameStore = create(
  immer(function (set, get) {
    return {
      // State (seeded by seedState; placeholders for first render)
      ...PLACEHOLDER,

      dispatch: function (action) {
        var state = get();
        var ctx = { GD: state._GD };
        var fearTuning = state.fearTuning || null;
        var corruptFn = fearTuning && fearTuning.primary
          ? function (text, layer) {
              var r = applyFearCorruption({ fearTuning: fearTuning }, text, layer, null);
              return r !== text ? r : text;
            }
          : function (t) { return t; };

        // 1. Run reducer: state → newState (produce), side effects → _pendingEffects
        var reducer = createGameReducer(ctx, corruptFn, null);
        var newState = reducer(state, action);

        // 2. Patch Zustand draft with new state (top-level keys only)
        set(function (draft) {
          for (var key in newState) {
            if (newState.hasOwnProperty(key)) draft[key] = newState[key];
          }
        });

        // 3. Flush side effects (same timing as old useLayoutEffect flush)
        flushEffectsBuffer();
      },

      seedState: function (gd) {
        var realInit = initialState();
        set(function (draft) {
          for (var key in realInit) {
            if (realInit.hasOwnProperty(key)) draft[key] = realInit[key];
          }
          draft._GD = gd;
        });
      },
    };
  })
);

// ── Public API ──

export function getRawState() {
  return useGameStore.getState();
}

export function getDispatch() {
  return useGameStore.getState().dispatch;
}

export function seedGameStore(gd, dispatch) {
  useGameStore.getState().seedState(gd);
  setEffectsDispatch(dispatch);
}

// ── Legacy selector hooks (backward compat) ──
// Mirrors state/gameStore.js API. Components should migrate to
//   useGameStore(s => s.san)   directly.

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

// ── useGameSelector (backward compat) ──
// Defined here instead of re-exporting from gameStore.js to avoid circular dep.
export function useGameSelector(selector) {
  return useGameStore(selector);
}
