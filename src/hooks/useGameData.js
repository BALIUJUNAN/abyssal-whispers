// src/hooks/useGameData.js — Provides the complete game state to the app shell.
// Screen components and modals consume a broad, evolving set of state fields, so
// this boundary must not maintain a hand-written projection that can silently
// omit newly added fields.

import { useMemo, useRef } from 'react';
import { getDispatch, useGameStore } from '../state/useGameStore.js';
import { useSanStageClasses } from '../state/selectors.js';

export function useGameData() {
  var storeState = useGameStore();
  var sanStage = useSanStageClasses(true);
  var game = useMemo(function () {
    return { ...storeState, sanStage: sanStage };
  }, [storeState, sanStage]);

  // Preserve stateRef pattern used by dispatch wrapper
  var stateRef = useRef(game);
  stateRef.current = game;

  return { game: game, stateRef: stateRef, getDispatch: getDispatch };
}
