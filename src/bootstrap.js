// src/bootstrap.js — One-time module-level initialization
// Import this once (from app.jsx) to activate all startup side effects.
// DO NOT import from components or hooks — this file must remain side-effect-only.

import { configureSaveManager, enforceSaveFormatFreeze } from './engine/SaveManager.js';
import { SAVE_VERSION, migrateSaveData, toPersistedState } from './reducers/saveMigration.js';
import { setDispatch } from './runtime/eventSideEffects.js';
import { getDispatch } from './state/useGameStore.js';
import { initExtendedEvents } from './reducers/extendedEventsInit.js';
import { createErrorTracker } from './utils/errorTracker.js';
import { GD as sharedGD } from './state/gameData.js';

// ── Engine DI: inject save migration into SaveManager ──
configureSaveManager({ SAVE_VERSION, migrateSaveData, toPersistedState });

// ── Save format freeze enforcement ──
enforceSaveFormatFreeze();

// ── Event side effects: wire the dispatch reference ──
setDispatch(getDispatch());

// ── Extended events init (mutates sharedGD in place) ──
// initExtendedEvents is idempotent (guarded by GD._extendedEventsLoaded),
// so main.jsx's later call is a no-op.
export const GD = initExtendedEvents(sharedGD);

// ── Error tracker singleton ──
export const errorTracker = createErrorTracker();
