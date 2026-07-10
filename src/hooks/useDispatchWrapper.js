// src/hooks/useDispatchWrapper.js — Wraps getDispatch() with error tracking.
// Adds actionId, now timestamp, and _actionIndex meta to every dispatched action,
// then records the action + current state snapshot via errorTracker.

import { useCallback } from 'react';
import { getDispatch } from '../state/useGameStore.js';

export function useDispatchWrapper(errorTracker, stateRef) {
  return useCallback(function (action) {
    if (!action.meta) action.meta = {};
    if (!action.meta.actionId)
      action.meta.actionId = Date.now() + '_' + Math.random().toString(16).slice(2, 6);
    var currentState = stateRef.current;
    if (!action.meta.now) action.meta.now = Date.now();
    action.meta._actionIndex = (currentState._actionIndex || 0);
    errorTracker.record(action, currentState);
    getDispatch()(action);
  }, [errorTracker, stateRef]);
}
