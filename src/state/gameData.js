// src/state/gameData.js — mutable GD holder
//
// main.jsx shallow-copies all GD properties onto this object after initExtendedEvents().
// This provides module-level GD access for files that cannot receive ctx via props
// (e.g., GameLayout.jsx, GamePanels.jsx module-level init).
//
// New code should prefer ctx.GD or state._GD over this module.
export const GD = {};
