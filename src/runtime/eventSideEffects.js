// src/runtime/eventSideEffects.js — Side effect handlers registered on the event bus
// This is the SINGLE integration point between the pure eventBus and the UI layer.
// Import this file ONCE (e.g. in app.jsx) to activate all side effect handlers.
//
// Architecture:
//   Reducers/Slices → emit(event, payload) → eventBus → this file's handlers → UI side effects

import { emit, on, clearEventBus } from '../engine/eventBus.js';
import { audioManager } from '../managers/AudioManager.js';
import { addUiToast, removeUiToast, notifySave } from '../state/uiStore.js';
import { triggerSanLossFlash, triggerDayCriticalSurge } from '../systems/sanVisualCorruption.js';

// dispatch is injected by app.jsx bootstrap — avoids circular import (useGameStore → effectExecutor → ...)
var _dispatch = null;

export function setDispatch(fn) { _dispatch = fn; }

// ── Keep references to unsub functions for cleanup ──
const _unsubs = [];

function register(event, handler) {
  const unsub = on(event, handler);
  _unsubs.push(unsub);
  return unsub;
}

// ── Handler: NARRATIVE_APPEND ──
// payload: { text, type?, priority? }
// Effect: dispatch ADD_NARRATIVE to game state (via getDispatch)

register('NARRATIVE_APPEND', function (payload) {
  if (!_dispatch) return;
  _dispatch({
    type: 'ADD_NARRATIVE',
    entry: {
      text: payload.text,
      type: payload.type || 'normal',
      priority: payload.priority || 0,
      day: payload.day,
    },
  });
});

// ── Handler: EVENT_LOG_APPEND ──
// payload: { text, day, type? }
// Effect: dispatch ADD_EVENT_LOG

register('EVENT_LOG_APPEND', function (payload) {
  if (!_dispatch) return;
  _dispatch({
    type: 'ADD_EVENT_LOG',
    entry: {
      text: payload.text,
      day: payload.day || 1,
      type: payload.type || 'event',
      timestamp: Date.now(),
    },
  });
});

// ── Handler: AUDIO_PLAY ──
// payload: { name, volume?, loop?, fadeIn? }
// Effect: play sound via audioManager

register('AUDIO_PLAY', function (payload) {
  if (!audioManager) return;
  try {
    if (payload.loop) {
      audioManager.playAmbient(payload.name, payload.volume);
    } else {
      audioManager.playEffect(payload.name, payload.volume);
    }
  } catch (e) {
    // Audio may fail silently in some environments
  }
});

// ── Handler: AUDIO_STOP ──
// payload: { name? } — if name provided, stop that specific sound; else stop all effects

register('AUDIO_STOP', function (payload) {
  if (!audioManager) return;
  try {
    if (payload && payload.name) {
      audioManager.stopEffect(payload.name);
    } else {
      audioManager.stopAllEffects();
    }
  } catch (e) { /* silent */ }
});

// ── Handler: AMBIENT_SWITCH ──
// payload: { name, volume?, fadeMs? }
// Effect: crossfade ambient track

register('AMBIENT_SWITCH', function (payload) {
  if (!audioManager) return;
  try {
    audioManager.switchAmbient(payload.name, payload.volume, payload.fadeMs);
  } catch (e) { /* silent */ }
});

// ── Handler: POPUP_SHOW ──
// payload: { id, message, duration?, type? }
// Effect: show a toast notification

register('POPUP_SHOW', function (payload) {
  if (!addUiToast) return;
  addUiToast({
    id: payload.id || 'toast_' + Date.now(),
    type: payload.type || 'info',
    def: {
      icon: payload.icon || 'ℹ️',
      name: payload.title || payload.message || '',
      desc: payload.message || '',
    },
    duration: payload.duration || 4000,
  });
});

// ── Handler: POPUP_HIDE ──
// payload: { id }
// Effect: hide a specific toast

register('POPUP_HIDE', function (payload) {
  if (!removeUiToast || !payload.id) return;
  removeUiToast(payload.id);
});

// ── Handler: SCREEN_SHAKE ──
// payload: { intensity?, duration? }
// Effect: add CSS class to game root to trigger shake animation

register('SCREEN_SHAKE', function (payload) {
  const root = document.getElementById('app') || document.documentElement;
  if (!root) return;
  const intensity = payload.intensity || 1;
  const duration = payload.duration || 300;
  root.classList.add('screen-shake-' + Math.min(3, intensity));
  setTimeout(function () {
    root.classList.remove('screen-shake-' + intensity);
  }, duration);
});

// ── Handler: SAN_LOSS_FLASH ──
// payload: { amount }
// Effect: trigger the red flash in SanPollutionLayer via sanVisualCorruption

register('SAN_LOSS_FLASH', function (payload) {
  if (triggerSanLossFlash) {
    triggerSanLossFlash(payload.amount || 3);
  }
});

// ── Handler: DAY_SURGE ──
// payload: { day, san }
// Effect: trigger critical day surge in sanVisualCorruption

register('DAY_SURGE', function (payload) {
  if (triggerDayCriticalSurge) {
    triggerDayCriticalSurge(payload.day, payload.san);
  }
});

// ── Handler: ABYSS_POPUP ──
// payload: { message, showResist?, onResist? }
// Effect: show the meta horror popup (handled by AbyssPopup component listening to eventBus)

register('ABYSS_POPUP', function (payload) {
  // AbyssPopup component listens for this event directly
  emit('ABYSS_POPUP_SHOW', {
    message: payload.message,
    showResist: payload.showResist || false,
    onSanDrain: payload.onSanDrain,
  });
});

// ── Handler: TOAST_SHOW (legacy alias for POPUP_SHOW) ──
register('TOAST_SHOW', function (payload) {
  emit('POPUP_SHOW', payload);
});

// ── Handler: SAVE_INDICATOR ──
// payload: { message, type? }
// Effect: brief save flash + toast

register('SAVE_INDICATOR', function (payload) {
  if (notifySave) {
    notifySave(payload.message, payload.type);
  }
  // Also flash the save indicator element
  const el = document.querySelector('.save-indicator');
  if (el) {
    el.classList.add('save-flash');
    setTimeout(function () { el.classList.remove('save-flash'); }, 600);
  }
});

// ── Cleanup ──
// Call this on NEW_GAME or full reset to prevent stale handlers

export function cleanupSideEffects() {
  _unsubs.forEach(function (unsub) { unsub(); });
  _unsubs.length = 0;
}
