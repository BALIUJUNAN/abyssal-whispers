// src/hooks/useDispatchWrapper.js — Wraps getDispatch() with error tracking.
// Compatibility hook for callers that still receive dispatch from App.
// Metadata, tracing, rollback reporting, and error handling now live at the
// Store boundary so direct map-mode/background dispatches get identical safety.

import { useCallback } from 'react';
import { getDispatch } from '../state/useGameStore.js';

export function useDispatchWrapper(errorTracker, stateRef) {
  return useCallback(function (action) {
    return getDispatch()(action);
  }, []);
}
