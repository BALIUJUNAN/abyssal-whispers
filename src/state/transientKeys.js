// src/state/transientKeys.js — Single source of truth for runtime-only state keys.
// These keys are NEVER persisted to save files, exports, or localStorage.
// All save paths (toPersistedState, exportSave, manualSave) must use this list.

export var TRANSIENT_STATE_KEYS = [
  '_GD', // injected game-data context; never duplicate the full database in saves
  '_effects', // post-reducer side effect queue
  '_lastAction', // debug: last dispatched action
  '_runtime', // runtime metadata
  '_debug', // debug-only fields
  '_actionHistory', // rolling behavior profile (rebuilt each session)
  '_actionIndex', // deterministic action cursor (rebuilt for the active session)
  '_triggeredSet', // derived from triggeredEvents after load
  '_silentSet', // derived from triggeredSilentEvents after load
  'areaNameCache', // derived display-name cache
  'glitchPulse', // short-lived canvas animation state
  '_pendingDeathCountMeta', // death count meta event (consumed in BEGIN_ADVENTURE)
];

// Strip all transient keys from a state object. Returns a new object.
function stripTransient(state) {
  if (!state) return state;
  var clean = {};
  var keys = Object.keys(state);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (TRANSIENT_STATE_KEYS.indexOf(k) === -1) clean[k] = state[k];
  }
  return clean;
}
