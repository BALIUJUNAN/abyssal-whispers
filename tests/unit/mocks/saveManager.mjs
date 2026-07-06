// tests/unit/mocks/saveManager.mjs — No-op SaveManager for unit tests
// Overrides src/engine/SaveManager.js exports to prevent localStorage/save side effects

export function saveGame(state) {
  // no-op in unit tests
}

export function loadFromSlot(slotId) {
  return null;
}

export function saveToSlot(slotId, data) {
  // no-op
}

export function autoSave(state) {
  // no-op
}

export function getSaveSlots() {
  return [];
}

export function deleteSave(slotId) {
  // no-op
}

export function hasSaveData(slotId) {
  return false;
}
