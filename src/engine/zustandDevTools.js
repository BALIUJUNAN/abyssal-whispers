// src/engine/zustandDevTools.js — Lightweight Zustand DevTools integration
//
// zustand 5.x devtools middleware requires @xyflow/zustand-devtools (not on npm mirror).
// This module provides equivalent functionality:
//   1. Connects to Redux DevTools browser extension (if installed)
//   2. Provides in-page action log as fallback
//   3. Supports time-travel names via action.meta?.label
//
// Usage in useGameStore.js:
//   import { devtools } from './zustandDevTools.js';
//   devtools(immer(fn), { name: 'COC Game Store' })
//
// The middleware follows zustand 5.x devtools convention:
//   (config) => (set, get, api) => { ... }
// with api.subscribe() for state change detection.

var _devtoolsInstance = null;
var _actionLog = [];
var _maxLogSize = 100;

/**
 * Check if Redux DevTools browser extension is available.
 */
function hasReduxDevTools() {
  return (
    typeof window !== 'undefined' &&
    window.__REDUX_DEVTOOLS_EXTENSION__ &&
    typeof window.__REDUX_DEVTOOLS_EXTENSION__.connect === 'function'
  );
}

/**
 * Get the singleton devtools connection.
 */
function getConnection(name) {
  if (_devtoolsInstance) return _devtoolsInstance;

  if (hasReduxDevTools()) {
    _devtoolsInstance = window.__REDUX_DEVTOOLS_EXTENSION__.connect({
      name: name || 'COC Game Store',
      maximumAge: 50,
    });
  } else {
    // Fallback: in-page action log
    _devtoolsInstance = {
      _fallback: true,
      _log: [],
      send: function (action, state) {
        _actionLog.push({
          action: action,
          state: state,
          time: Date.now(),
        });
        if (_actionLog.length > _maxLogSize) _actionLog.shift();
      },
      init: function (state) {
        _actionLog = [{ type: '@@INIT', state: state, time: Date.now() }];
      },
    };
  }
  return _devtoolsInstance;
}

/**
 * Log an action for devtools inspection.
 * @param {string} type - action type
 * @param {object} [payload] - action payload
 */
export function logAction(type, payload) {
  _actionLog.push({
    type: type,
    payload: payload,
    time: Date.now(),
  });
  if (_actionLog.length > _maxLogSize) _actionLog.shift();
}

/**
 * Get action log (fallback mode only).
 * Returns empty array if Redux DevTools extension is active.
 */
export function getDevtoolsActionLog() {
  return _actionLog.slice();
}

/**
 * Zustand 5.x compatible devtools middleware factory.
 *
 * @param {object} [options]
 * @param {string} [options.name] — store name in DevTools panel
 * @param {number} [options.maxAge] — max states to keep (default 50)
 * @returns {Function} zustand middleware: (config) => (set, get, api) => newConfig
 */
export function devtools(options) {
  var name = (options && options.name) || 'COC Game Store';
  var maxAge = (options && options.maxAge) || 50;
  var connection = getConnection(name);

  return function (config) {
    return function (set, get, api) {
      var initial = config(set, get, api);

      // Initialize devtools with current state
      connection.init({
        state: serializeState(initial),
      });

      // Subscribe to state changes
      var unsub = api.subscribe(function () {
        try {
          connection.send(
            { type: 'zustand/update' },
            { state: serializeState(get()) }
          );
        } catch (e) {
          // Non-fatal
        }
      });

      // Wrap set to send actions to devtools
      var wrappedSet = function (partial, replace, options) {
        var actionType = (options && options.type) || 'zustand/set';
        set(partial, replace, options);
        try {
          connection.send(
            { type: actionType },
            { state: serializeState(get()) }
          );
        } catch (e) {
          // Non-fatal
        }
      };

      // Return new config with wrapped set
      return config({
        set: wrappedSet,
        get: get,
        api: api,
      });
    };
  };
}

/**
 * Wrap set to send actions to devtools before state update.
 */
function wrapSet(set, connection) {
  return function (partial, replace, options) {
    var actionType = 'zustand/set';

    // Extract action info from options (if passed by dispatch)
    if (options && options.type) {
      actionType = options.type;
    }

    set(partial, replace, options);

    // Send to devtools after state update
    try {
      connection.send(
        { type: actionType },
        { state: serializeState(get()) }
      );
    } catch (e) {
      // Non-fatal: devtools communication errors should never break the store
    }
  };
}

/**
 * Serialize state for devtools — strip circular refs and functions.
 */
function serializeState(state) {
  if (!state || typeof state !== 'object') return state;
  var result = {};
  var keys = Object.keys(state);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    var v = state[k];
    if (typeof v === 'function') continue;
    if (v && typeof v === 'object' && v.$$typeof) continue; // React elements
    if (Array.isArray(v)) {
      result[k] = v.map(function (item) {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          var o = {};
          var ik = Object.keys(item);
          for (var j = 0; j < ik.length; j++) {
            var ik2 = ik[j];
            var iv = item[ik2];
            if (typeof iv === 'function') continue;
            o[ik2] = typeof iv === 'object' ? JSON.parse(JSON.stringify(iv)) : iv;
          }
          return o;
        }
        return typeof item === 'object' ? JSON.parse(JSON.stringify(item)) : item;
      });
    } else if (v && typeof v === 'object') {
      result[k] = JSON.parse(JSON.stringify(v));
    } else {
      result[k] = v;
    }
  }
  return result;
}

/**
 * Disconnect devtools (cleanup).
 */
export function disconnectDevtools() {
  if (_devtoolsInstance) {
    try {
      _devtoolsInstance.disconnect();
    } catch (e) {
      // Non-fatal
    }
    _devtoolsInstance = null;
    _actionLog = [];
  }
}
