// src/state/combineSlices.js — Slice composition framework
// Supports two slice styles:
//   A) Legacy: { name, handler } — single switch/case function (current style)
//   B) Declarative: { name, reducers, before, after, ownedFields } — createSlice output
//
// Dispatch phases (in order):
//   1. beforeDispatch  hooks  — cross-cutting pre-processing
//   2. Domain handlers        — first-match-wins (legacy) or all-run (declarative)
//   3. afterDispatch   hooks  — cross-cutting post-processing
//
// All phases run inside the same Immer produce() draft.

// ─── Type aliases (JSDoc, for future TS migration) ───
// @typedef {Object} SliceConfig
// @property {string}   [name='anonymous']    — slice identifier (for logging, ownership)
// @property {string[]} [ownedFields=[]]      — state keys this slice owns
// @property {Object}   [initialState={}]     — initial values for owned fields
// @property {Object}   [reducers]            — declarative reducers: { ACTION_TYPE: fn }
// @property {Function} [before]              — (s, action, c, ctx) => void, runs pre-dispatch
// @property {Function} [after]               — (s, action, c, ctx) => void, runs post-dispatch
// @property {Function} [handler]             — legacy switch/case handler fn
//
// @typedef {Object} SliceReducer
// @property {string}   slice  — slice name (for logging)
// @property {Function} fn     — reducer function (s, action, c, ctx) => s|truthy
//
// @typedef {Function} BeforeHook  — (s, action, c, ctx) => void
// @typedef {Function} AfterHook   — (s, action, c, ctx) => void

/**
 * Create a declarative slice config compatible with combineSlices().
 *
 * @param {SliceConfig} config
 * @returns {SliceConfig} slice config object
 */
export function createSlice(config) {
  var handlers = {};
  var reducerNames = [];

  if (config.reducers) {
    for (var key in config.reducers) {
      if (config.reducers.hasOwnProperty(key)) {
        handlers[key] = config.reducers[key];
        reducerNames.push(key);
      }
    }
  }

  return {
    name: config.name || 'anonymous',
    ownedFields: config.ownedFields || [],
    initialState: config.initialState || {},
    handlers: handlers,
    reducerNames: reducerNames,
    before: config.before || null,
    after: config.after || null,
    handler: config.handler || null,
  };
}

/**
 * Error raised when a reducer phase fails. The metadata is kept on the error
 * so production reports can identify the exact action, phase, and slice.
 */
export class SliceDispatchError extends Error {
  constructor(phase, slice, actionType, cause) {
    var causeMessage = cause && cause.message ? cause.message : String(cause);
    super(
      '[dispatch:' + actionType + '] ' + phase + ' failed in slice "' + slice + '": ' + causeMessage
    );
    this.name = 'SliceDispatchError';
    this.phase = phase;
    this.slice = slice;
    this.actionType = actionType;
    this.cause = cause;
    if (cause && cause.stack) this.causeStack = cause.stack;
  }
}

function throwDispatchError(error, phase, slice, action) {
  if (error instanceof SliceDispatchError) throw error;
  throw new SliceDispatchError(phase, slice, action && action.type ? action.type : 'UNKNOWN', error);
}

/**
 * Compose multiple slice configs into a root reducer factory.
 *
 * Each slice contributes:
 *   - initial state fields (merged, later slices override earlier on conflict)
 *   - action handlers (by action.type, or legacy switch/case)
 *   - before/after hooks (run around domain handlers)
 *
 * Returns a factory that binds context once and produces a reducer returning
 * { state, handled }. Errors propagate so the caller's Immer transaction can roll back.
 *
 * @param {SliceConfig[]} slices
 * @returns {Function} factory: (ctx) => (state, action, c) => { state, handled }
 */
export function combineSlices(slices) {
  var dispatchMap = {};
  var initialParts = [];
  var beforeHooks = [];
  var afterHooks = [];

  for (var i = 0; i < slices.length; i++) {
    var slice = slices[i];

    if (slice.initialState && Object.keys(slice.initialState).length > 0) {
      initialParts.push(slice.initialState);
    }

    if (slice.handler) {
      dispatchMap._legacy = dispatchMap._legacy || [];
      dispatchMap._legacy.push({ slice: slice.name, fn: slice.handler });
    }

    if (slice.handlers) {
      for (var j = 0; j < slice.reducerNames.length; j++) {
        var name = slice.reducerNames[j];
        dispatchMap[name] = dispatchMap[name] || [];
        dispatchMap[name].push({ slice: slice.name, fn: slice.handlers[name] });
      }
    }

    if (slice.before) beforeHooks.push({ slice: slice.name, fn: slice.before });
    if (slice.after) afterHooks.push({ slice: slice.name, fn: slice.after });
  }

  var mergedInit = {};
  for (var k = 0; k < initialParts.length; k++) {
    var part = initialParts[k];
    for (var key in part) {
      if (part.hasOwnProperty(key)) mergedInit[key] = part[key];
    }
  }

  // ── Debug logging ──
  // Controlled by __SLICE_DEBUG__ global flag (set in dev builds only).

  var _debug = typeof globalThis !== 'undefined' && globalThis.__SLICE_DEBUG__;

  function _logHook(phase, sliceName, actionType) {
    if (!_debug) return;
    console.log(
      '[slice] ' + phase + ' | ' + sliceName + ' | ' + actionType
    );
  }

  function _runHook(hooks, phase, state, action, c, ctx) {
    for (var i = 0; i < hooks.length; i++) {
      try {
        var entry = hooks[i];
        entry.fn(state, action, c, ctx);
        if (_debug) _logHook(phase, entry.slice, action.type);
      } catch (e) {
        // Hooks contain gameplay mutations, not optional telemetry. Continuing
        // would commit a partially-applied action, so abort the transaction.
        throwDispatchError(e, phase, hooks[i].slice, action);
      }
    }
  }

  return function createRootReducer(ctx) {
    var GD = ctx.GD;

    return function rootReducer(state, action, c) {
      // ── Initialize state with slice defaults if empty ──
      // Mutates state in-place (Immer draft safe) to fill missing fields.
      if (state && typeof state === 'object') {
        var initKeys = Object.keys(mergedInit);
        for (var k = 0; k < initKeys.length; k++) {
          if (!(initKeys[k] in state)) {
            state[initKeys[k]] = mergedInit[initKeys[k]];
          }
        }
      }

      // ── Phase 1: beforeDispatch hooks ──
      _runHook(beforeHooks, 'before', state, action, c, ctx);

      // ── Phase 2: Domain handlers ──
      var handled = false;

      // 2a. Declarative reducers (exact action.type match, all run)
      var dHandlers = dispatchMap[action.type];
      if (dHandlers && dHandlers.length > 0) {
        handled = true;
        for (var h = 0; h < dHandlers.length; h++) {
          try {
            var entry = dHandlers[h];
            entry.fn(state, action, c, ctx);
          } catch (e) {
            throwDispatchError(e, 'reducer', dHandlers[h].slice, action);
          }
        }
      }

      // 2b. Legacy handlers (first-match-wins)
      if (!handled && dispatchMap._legacy) {
        for (var l = 0; l < dispatchMap._legacy.length; l++) {
          try {
            var legacyEntry = dispatchMap._legacy[l];
            if (legacyEntry.fn(state, action, c, ctx)) {
              handled = true;
              break;
            }
          } catch (e) {
            throwDispatchError(e, 'reducer', dispatchMap._legacy[l].slice, action);
          }
        }
      }

      // ── Phase 3: afterDispatch hooks ──
      _runHook(afterHooks, 'after', state, action, c, ctx);

      return { state: state, handled: handled };
    };
  };
}

// ── Ownership helpers ──

/**
 * Mutate an owned field and report whether the value changed.
 * Use this inside slice reducers to ensure cross-slice listeners can detect changes.
 *
 * @param {Object}   state    — Immer draft
 * @param {string}   field    — state key
 * @param {*}        newValue — new value to assign
 * @param {string}   source   — slice name (for future event emission)
 * @returns {boolean} true if the value changed
 */
export function ownedFieldChange(state, field, newValue, source) {
  var oldValue = state[field];
  state[field] = newValue;
  return oldValue !== newValue;
}

/**
 * Build a map of owned fields → owning slice name.
 * Useful for documentation, static analysis, and future automated enforcement.
 *
 * @param {SliceConfig[]} slices
 * @returns {Object} { fieldName: sliceName, ... }
 */
export function getOwnedFields(slices) {
  var fields = {};
  for (var i = 0; i < slices.length; i++) {
    var owned = slices[i].ownedFields;
    if (owned) {
      for (var j = 0; j < owned.length; j++) {
        fields[owned[j]] = slices[i].name;
      }
    }
  }
  return fields;
}
