// src/state/gameStore.js — Legacy facade (delegates to useGameStore.js)
// DEPRECATED: Use useGameStore.js directly. Exists for:
//   - vite-compat-shim.jsx (globalThis assignment)
//   - DevPanel.jsx (getGameState via globalThis)

import { getRawState, getDispatch } from './useGameStore.js';

export function getGameState() {
  return getRawState();
}

export function getGameDispatch() {
  return getDispatch();
}
