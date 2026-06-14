// src/engine/commands.js — Typed command builders for the effect system
//
// WHY: 49 c.effects.push({ type: 'AUDIO_PLAY', id: '...' }) calls are scattered
// across reducers with no type safety. A typo in `type` or `id` is a silent bug.
//
// WHAT: Factory functions that return valid command objects. Reducers call these
// instead of constructing raw objects. The executor doesn't change — it already
// reads `fx.type` and dispatches to EFFECT_HANDLERS.
//
// Usage:
//   import { audio, narrate, stat, glitch } from '../engine/commands.js';
//   c.effects.push(audio.play('bell_entrance'));
//   c.effects.push(audio.ambient('town_center', 'morning'));
//   c.effects.push(narrate.delayed(3000, 'system', '远处传来一声钟响。'));
//   c.effects.push(glitch.pulse(6));

// === Audio Commands ===
export var audio = {
  play: function (id) { return { type: 'AUDIO_PLAY', id: id }; },
  skill: function (result) { return { type: 'AUDIO_SKILL', id: result }; },
  ambient: function (area, phase) { return { type: 'AUDIO_AMBIENT', area: area, phase: phase }; },
  sanLoss: function (amount) { return { type: 'AUDIO_SAN_LOSS', amount: amount }; },
  ui: function (id) { return { type: 'AUDIO_UI', id: id }; },
  setMuted: function (muted) { return { type: 'AUDIO_SET_MUTED', muted: muted }; },
  suddenMuted: function (value) { return { type: 'AUDIO_SUDDEN_MUTED', value: value }; },
};

// === Narrative Commands ===
export var narrate = {
  delayed: function (delay, narrType, text, extra) {
    return { type: 'NARRATE_DELAYED', delay: delay, narrType: narrType || 'system', text: text, extra: extra || {} };
  },
};

// === Stat Commands ===
export var stat = {
  increment: function (key) { return { type: 'INCREMENT_STAT', key: key }; },
};

// === Save Commands ===
export var save = {
  game: function (state) { return { type: 'SAVE_GAME', state: state }; },
};

// === Visual Effect Commands ===
export var glitch = {
  pulse: function (strength) { return { type: 'GLITCH_PULSE', strength: strength || 5 }; },
  clear: function () { return { type: 'GLITCH_PULSE_CLEAR' }; },
};

// === Early Hooks Commands ===
export var hooks = {
  bellEntrance: function () { return { type: 'BELL_ENTRANCE' }; },
  reset: function () { return { type: 'RESET_EARLY_HOOKS' }; },
};

// === SAN Resist Command ===
export var resist = {
  sanDrain: function (amount) { return { type: 'RESIST_SAN_DRAIN', amount: amount || 1 }; },
};

// === Type-safe push helper (optional — for reducers that want it) ===
// Usage: fx(c.effects, audio.play('bell'), stat.increment('deaths'))
export function fx(effects) {
  for (var i = 1; i < arguments.length; i++) {
    if (arguments[i]) effects.push(arguments[i]);
  }
}
