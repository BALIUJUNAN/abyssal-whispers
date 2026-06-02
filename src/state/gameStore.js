// src/state/gameStore.js - Game State Store (Zustand-like pattern)
// This is the "useGameStore" half of the dual-store architecture.
// Currently wraps useReducer via a bridge pattern; can be migrated
// to full Zustand in a future iteration.
//
// Architecture:
//   - useUiStore  (state/uiStore.js)  — modals, toasts, settings, temp UI
//   - useGameStore (state/gameStore.js) — game state bridge (day, san, hp, etc.)
//
// The bridge pattern exposes game state selectors that React components
// can use without prop-drilling the full state object.

var _gameStateRef = { current: null };
var _gameDispatchRef = { current: null };
var _gameListeners = new Set();

/**
 * Initialize the game store bridge. Call once in App() after useReducer.
 * @param {object} state - current game state
 * @param {function} dispatch - reducer dispatch function
 */
function initGameStore(state, dispatch) {
  _gameStateRef.current = state;
  _gameDispatchRef.current = dispatch;
}

/**
 * Update the game store state reference. Call in useEffect or render.
 * @param {object} state - latest game state
 */
function updateGameStore(state) {
  var prev = _gameStateRef.current;
  _gameStateRef.current = state;
  // Notify listeners if state reference changed
  if (prev !== state) {
    _gameListeners.forEach(function(fn) { try { fn(); } catch(e) {} });
  }
}

/**
 * Get current game state (non-reactive, for use outside render).
 * @returns {object} current game state
 */
function getGameState() {
  return _gameStateRef.current;
}

/**
 * Get game dispatch function.
 * @returns {function} dispatch
 */
function getGameDispatch() {
  return _gameDispatchRef.current;
}

/**
 * Subscribe to game state changes.
 * @param {function} listener - callback on state change
 * @returns {function} unsubscribe function
 */
function subscribeGameStore(listener) {
  _gameListeners.add(listener);
  return function() { _gameListeners.delete(listener); };
}

// === Selector Hooks ===
// These can be used by components to subscribe to specific state slices.

function useGameSelector(selector) {
  var sel = selector || function(s) { return s; };
  return React.useSyncExternalStore(
    subscribeGameStore,
    function() { return sel(_gameStateRef.current); },
    function() { return sel(_gameStateRef.current); }
  );
}

// Common selectors for convenience
function useSan() { return useGameSelector(function(s) { return s ? s.san : 60; }); }
function useHp() { return useGameSelector(function(s) { return s ? s.hp : 0; }); }
function useDay() { return useGameSelector(function(s) { return s ? s.day : 1; }); }
function useAp() { return useGameSelector(function(s) { return s ? s.ap : 0; }); }
function useCurrentArea() { return useGameSelector(function(s) { return s ? s.currentArea : ''; }); }
function useScreen() { return useGameSelector(function(s) { return s ? s.screen : 'title'; }); }
function useLoopCount() { return useGameSelector(function(s) { return s ? s.loopCount : 0; }); }
function usePollution() { return useGameSelector(function(s) { return s ? (s.pollution || 0) : 0; }); }
function useCorruption() { return useGameSelector(function(s) { return s ? (s.safehouseCorruption || 0) : 0; }); }
function useFood() { return useGameSelector(function(s) { return s ? (s.food || 0) : 0; }); }
function useMoney() { return useGameSelector(function(s) { return s ? (s.money || 0) : 0; }); }

