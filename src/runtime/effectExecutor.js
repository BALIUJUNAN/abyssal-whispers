// src/runtime/effectExecutor.js — Post-reducer side effect execution
// Executes effects collected during the reducer run. Deduplicates by _fxId.
// Effect handlers are dispatched by type via EFFECT_HANDLERS map.

import { audioManager } from '../managers/AudioManager.js';
import { saveGame } from '../engine/SaveManager.js';
import { incrementStat } from '../reducers/achievementReducer.js';

export var EFFECT_HANDLERS = {
  AUDIO_PLAY: function (fx) {
    audioManager.playEffect(fx.id);
  },
  AUDIO_SKILL: function (fx) {
    audioManager.playSkillEffect(fx.id);
  },
  AUDIO_AMBIENT: function (fx) {
    audioManager.playAreaAmbient(fx.area, fx.phase);
  },
  AUDIO_SAN_LOSS: function (fx) {
    audioManager.playSanLoss(fx.amount);
  },
  AUDIO_UI: function (fx) {
    audioManager.playUI(fx.id);
  },
  AUDIO_SET_MUTED: function (fx) {
    audioManager.setMuted(fx.muted);
  },
  AUDIO_SUDDEN_MUTED: function (fx) {
    audioManager.suddenMuted = fx.value;
  },
  SAVE_GAME: function (fx) {
    saveGame(fx.state);
  },
  INCREMENT_STAT: function (fx) {
    try {
      incrementStat(fx.key);
    } catch (e) {}
  },
  NARRATE_DELAYED: function (fx, dispatch) {
    setTimeout(function () {
      try {
        dispatch({
          type: 'DELAYED_NARRATE',
          narrType: fx.narrType || 'system',
          text: fx.text,
          extra: fx.extra || {},
        });
      } catch (e) {}
    }, fx.delay || 3000);
  },
  BELL_ENTRANCE: function (fx, dispatch) {
    // Thirteenth bell entrance hook — see systems/earlyHooks.js
    // Use dynamic import() for ESM compatibility (require() is CJS-only)
    try {
      import('../systems/earlyHooks.js').then(function (earlyHooks) {
        earlyHooks.fireBellEntrance(dispatch);
      }).catch(function () {
        try { audioManager.playEffect('bell_entrance'); } catch (e2) {}
      });
    } catch (e) {
      try { audioManager.playEffect('bell_entrance'); } catch (e2) {}
    }
  },
  RESET_EARLY_HOOKS: function () {
    try {
      import('../systems/earlyHooks.js').then(function (earlyHooks) {
        earlyHooks.resetEarlyHooks();
      }).catch(function () {});
    } catch (e) {}
  },
};

var _executedFxIds = new Set();
var _FX_DEDUP_CAP = 300;

export function runPostReducerEffects(effects, dispatch) {
  if (!effects || effects.length === 0) return;
  for (var i = 0; i < effects.length; i++) {
    var fx = effects[i];
    // Dedup: skip if this exact effect was already executed
    if (fx._fxId && _executedFxIds.has(fx._fxId)) continue;
    if (fx._fxId) {
      _executedFxIds.add(fx._fxId);
      if (_executedFxIds.size > _FX_DEDUP_CAP) {
        var first = _executedFxIds.values().next().value;
        _executedFxIds.delete(first);
      }
    }
    var handler = EFFECT_HANDLERS[fx.type];
    if (!handler) {
      console.warn('[Effect] Unknown effect type:', fx.type, fx);
      continue;
    }
    handler(fx, dispatch);
  }
}

// ── Effects Dispatch Target (migrated from gameReducer.js) ──
// gameReducer.js was a 41-line shell that dynamically imported this module
// to avoid circular deps. After merging, flushEffectsBuffer calls
// runPostReducerEffects directly (same module, no import needed).

var _effectsDispatch = null;
export function setEffectsDispatch(dispatch) { _effectsDispatch = dispatch; }

export function flushEffectsBuffer(effects) {
  if (!effects || effects.length === 0) return;
  if (typeof _effectsDispatch === 'function') {
    runPostReducerEffects(effects, _effectsDispatch);
  }
}
