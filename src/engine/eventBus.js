// src/engine/eventBus.js — Typed event bus for cross-slice communication
// WHY: exploreSlice and dailySlice both mutate s.safehouseCorruption, s.san, etc.
// This creates implicit coupling. The event bus provides explicit, typed channels.
//
// NOT XState. Not a state machine. Just a pub/sub bus with type safety.
// 30 lines. Zero dependencies. Works with Immer + useReducer.
//
// Usage:
//   import { on, emit } from '../engine/eventBus.js';
//   // In exploreSlice:
//   emit('SAN_CHANGED', { amount: -3, source: 'event', eventId: 'evt_bell' });
//   // In dailySlice (listener registered once):
//   const unsub = on('SAN_CHANGED', ({ amount, source }) => { ... });
//   // Cleanup:
//   unsub();

var _listeners = {};
var _history = []; // ring buffer for debugging
var _HISTORY_CAP = 50;

/**
 * Subscribe to a typed event.
 * @param {string} event - event name (e.g. 'SAN_CHANGED', 'AREA_ENTERED')
 * @param {function} handler - (payload) => void
 * @returns {function} unsubscribe function
 */
export function on(event, handler) {
  if (!_listeners[event]) _listeners[event] = [];
  _listeners[event].push(handler);
  return function unsub() {
    _listeners[event] = (_listeners[event] || []).filter(function (h) { return h !== handler; });
  };
}

/**
 * Emit a typed event to all subscribers.
 * @param {string} event - event name
 * @param {object} payload - event data
 */
export function emit(event, payload) {
  _history.push({ event: event, payload: payload, t: Date.now() });
  if (_history.length > _HISTORY_CAP) _history.shift();
  var handlers = _listeners[event];
  if (!handlers) return;
  for (var i = 0; i < handlers.length; i++) {
    try { handlers[i](payload); } catch (e) { console.warn('[EventBus]', event, e); }
  }
}

/**
 * Get recent event history (for debugging / DevPanel).
 * @returns {Array<{event, payload, t}>}
 */
export function getEventHistory() {
  return _history.slice();
}

/**
 * Clear all listeners (for tests / NEW_GAME).
 */
export function clearEventBus() {
  _listeners = {};
  _history = [];
}

// === Standard event types (documented contracts) ===
// SAN_CHANGED       { amount, source, eventId? }
// AREA_ENTERED      { areaId, fromArea }
// DAY_ADVANCED      { oldDay, newDay }
// NPC_TRUST_CHANGED { npcName, oldTrust, newTrust }
// CORRUPTION_CHANGED { amount, source }
// RESOURCE_LOW      { resource: 'food'|'light'|'infection', value }
// CHAPTER_CHANGED   { from, to }
