// src/reducers/gameReducer.js — Effect buffer (legacy, Step 3 cleanup)
//
// Exports:
//   flushEffectsBuffer  — reads state._effects, dispatches via effectExecutor
//   setEffectsDispatch  — wires the effect dispatch target
//   getEffectsBuffer    — reads module-level _pendingEffects (legacy)
//   clearEffectsBuffer  — resets module-level _pendingEffects (legacy)
//
// createGameReducer was removed in Zustand Step 3 migration.
// All 6 domain slices route directly via useGameStore.dispatch.

// ── Effects Buffer ──
var _pendingEffects = [];

export function getEffectsBuffer() { return _pendingEffects; }
export function clearEffectsBuffer() { _pendingEffects = []; }

var _effectsDispatch = null;
export function setEffectsDispatch(dispatch) { _effectsDispatch = dispatch; }

export function flushEffectsBuffer(effects) {
  // Prefer the explicit effect batch from useGameStore.dispatch.
  // Falls back to module-level _pendingEffects for legacy callers.
  var batch = effects && effects.length > 0 ? effects : _pendingEffects;
  if (!batch || batch.length === 0) return;
  _pendingEffects = [];
  import('../runtime/effectExecutor.js')
    .then(function (mod) {
      if (mod && typeof mod.runPostReducerEffects === 'function' && typeof _effectsDispatch === 'function') {
        mod.runPostReducerEffects(batch, _effectsDispatch);
      }
    })
    .catch(function () { /* effectExecutor not yet available */ });
}

// ── Slice composition (removed in Step 3) ──
// createGameReducer was the double-produce bridge. All 6 domain slices migrated.
// This file retains only the effect buffer (flushEffectsBuffer, setEffectsDispatch).
// The slice composition code (combineSlices + rootReducer + createGameReducer factory)
// is removed — slices now route directly via useGameStore.dispatch → handleXAction(draft, action, c, ctx).
