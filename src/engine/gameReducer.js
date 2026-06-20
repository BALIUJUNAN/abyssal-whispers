// src/engine/gameReducer.js — Game Reducer (extracted from app.jsx)
// Uses combineSlices to compose domain slice handlers declaratively.
//
// Architecture:
//   produce(state, draft => {
//     build context (c = buildReducerCtx)
//     boundRoot(draft, action, c)       ← combineSlices output
//       → systemSlice.before  (tracking, profiling, hoarding)
//       → domain handler      (first-match-wins)
//       → systemSlice.after   (AP steal, AP audio)
//     tag effects
//     _pendingEffects = c.effects
//   })
//
// gameReducer.js is a pure dispatch entry — no business logic here.

import { produce } from 'immer';
import { buildReducerCtx } from '../utils/appHelpers.js';
import { createSeededRng } from '../utils/seededRng.js';
import { systemSlice } from '../reducers/slices/systemSlice.js';
import { combineSlices } from './combineSlices.js';
import { handleCoreAction } from '../reducers/slices/coreSlice.js';
import { handleExploreAction } from '../reducers/slices/exploreSlice.js';
import { handleNpcAction } from '../reducers/slices/npcSlice.js';
import { handleDailyAction } from '../reducers/slices/dailySlice.js';
import { handleDarkAction } from '../reducers/slices/darkSlice.js';
import { handleUiAction } from '../reducers/slices/uiSlice.js';

// ── Effects Buffer ──
var _pendingEffects = [];

export function getEffectsBuffer() { return _pendingEffects; }
export function clearEffectsBuffer() { _pendingEffects = []; }

var _effectsDispatch = null;
export function setEffectsDispatch(dispatch) { _effectsDispatch = dispatch; }

export function flushEffectsBuffer() {
  if (_pendingEffects.length === 0) return;
  var effects = _pendingEffects;
  _pendingEffects = [];
  import('../runtime/effectExecutor.js')
    .then(function (mod) {
      if (mod && typeof mod.runPostReducerEffects === 'function' && typeof _effectsDispatch === 'function') {
        mod.runPostReducerEffects(effects, _effectsDispatch);
      }
    })
    .catch(function () { /* effectExecutor not yet available */ });
}

// ── Slice composition ──
// systemSlice provides before/after hooks for cross-cutting concerns.
// Domain slices use legacy handler style (no createSlice wrapper needed yet).

var rootReducer = combineSlices([
  systemSlice,   // before: tracking/profiling/hoarding; after: AP steal + audio
  { name: 'core',    handler: handleCoreAction },
  { name: 'explore', handler: handleExploreAction },
  { name: 'npc',     handler: handleNpcAction },
  { name: 'daily',   handler: handleDailyAction },
  { name: 'dark',    handler: handleDarkAction },
  { name: 'ui',      handler: handleUiAction },
]);

// ── Factory ──

export function createGameReducer(ctx, corruptFn, errTrack) {
  var boundRoot = rootReducer(ctx);

  return function gameReducer(state, action) {
    _pendingEffects = [];
    return produce(state, function (s) {
      // Seeded RNG
      var _runSeed = s.runSeed || 'default';
      var _actIdx =
        action.meta && action.meta._actionIndex != null
          ? action.meta._actionIndex
          : s._actionIndex || 0;
      var _rng = createSeededRng(_runSeed, _actIdx);
      var c = buildReducerCtx(
        s,
        { rng: _rng, now: action.meta && action.meta.now },
        corruptFn
      );
      // Increment action index for next dispatch
      s._actionIndex = _actIdx + 1;

      // Dispatch through combined slices
      //   systemSlice.before: tracking, profiling, hoarding
      //   domain handler:     first-match-wins
      //   systemSlice.after:  AP steal, AP audio
      boundRoot(s, action, c);

      // Effect tagging (deterministic from action.meta.actionId)
      if (c.effects.length > 0) {
        var batchId = action.meta && action.meta.actionId ? action.meta.actionId : 'anon';
        for (var i = 0; i < c.effects.length; i++) c.effects[i]._fxId = batchId + '_' + i;
      }
      _pendingEffects = c.effects;
    });
  };
}
