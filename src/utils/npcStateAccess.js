// src/utils/npcStateAccess.js - Canonical reads for migrated NPC-keyed state.
//
// Runtime state converges on stable registry IDs, while authored content and
// older saves can still reference localized display names. Keep that
// compatibility at the state boundary instead of duplicating fallback logic in
// every event/system consumer.

import { getNpcName, resolveNpcId } from '../data/registry/npcRegistry.js';

function getNpcKeys(npcRef) {
  var stableId = resolveNpcId(npcRef);
  var displayName = getNpcName(stableId);
  return [stableId, npcRef, displayName].filter(function (key, index, keys) {
    return key && keys.indexOf(key) === index;
  });
}

function getNpcMapValue(map, npcRef, fallback) {
  if (!map || !npcRef) return fallback;

  var keys = getNpcKeys(npcRef);

  for (var i = 0; i < keys.length; i += 1) {
    var key = keys[i];
    if (key && map[key] !== undefined) return map[key];
  }
  return fallback;
}

function removeLegacyNpcKeys(map, npcRef, stableId) {
  var keys = getNpcKeys(npcRef);
  for (var i = 0; i < keys.length; i += 1) {
    if (keys[i] !== stableId && Object.prototype.hasOwnProperty.call(map, keys[i])) {
      delete map[keys[i]];
    }
  }
}

export function getCanonicalNpcId(npcRef) {
  return resolveNpcId(npcRef);
}

export function getNpcTrustByRef(state, npcRef) {
  var value = Number(getNpcMapValue(state?.npcTrust, npcRef, 0));
  return Number.isFinite(value) ? value : 0;
}

export function getNpcStateByRef(state, npcRef) {
  return getNpcMapValue(state?.npcStates, npcRef, {}) || {};
}

export function isNpcTrustLockedByRef(state, npcRef) {
  return Boolean(getNpcMapValue(state?._npcTrustLocked, npcRef, false));
}

export function setNpcTrustByRef(state, npcRef, value) {
  if (!state.npcTrust) state.npcTrust = {};
  var stableId = getCanonicalNpcId(npcRef);
  var numericValue = Number(value);
  if (!Number.isFinite(numericValue)) numericValue = 0;
  state.npcTrust[stableId] = Math.max(0, Math.min(5, numericValue));
  removeLegacyNpcKeys(state.npcTrust, npcRef, stableId);
  return state.npcTrust[stableId];
}

export function changeNpcTrustByRef(state, npcRef, amount) {
  var delta = Number(amount);
  if (!Number.isFinite(delta)) delta = 0;
  return setNpcTrustByRef(state, npcRef, getNpcTrustByRef(state, npcRef) + delta);
}

export function setNpcStateByRef(state, npcRef, value) {
  if (!state.npcStates) state.npcStates = {};
  var stableId = getCanonicalNpcId(npcRef);
  state.npcStates[stableId] = value || {};
  removeLegacyNpcKeys(state.npcStates, npcRef, stableId);
  return state.npcStates[stableId];
}

export function mergeNpcStateByRef(state, npcRef, patch) {
  return setNpcStateByRef(state, npcRef, {
    ...getNpcStateByRef(state, npcRef),
    ...(patch || {}),
  });
}
