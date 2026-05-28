// src/reducers/saveReducer.js - 多槽位存档系统

const SAVE_VERSION = '1.1.0';
const SAVE_PREFIX = 'coc_save_';
const AUTO_SLOTS = ['auto_1', 'auto_2', 'auto_3'];
const MANUAL_SLOTS = ['manual_1', 'manual_2', 'manual_3'];

function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

function saveToSlot(slotId, state) {
  try {
    const saveData = {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      slotId,
      meta: {
        day: state.day || 1,
        area: state.currentArea || '',
        loopCount: state.loopCount || 0,
        san: state.san || 0,
        hp: state.hp || 0
      },
      state: deepClone(state)
    };
    localStorage.setItem(SAVE_PREFIX + slotId, JSON.stringify(saveData));
    return true;
  } catch (e) {
    console.error('Save to slot ' + slotId + ' failed:', e);
    return false;
  }
}

function loadFromSlot(slotId) {
  try {
    const raw = localStorage.getItem(SAVE_PREFIX + slotId);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.version !== SAVE_VERSION) {
      localStorage.removeItem(SAVE_PREFIX + slotId);
      return { incompatible: true };
    }
    return data;
  } catch (e) {
    console.error('Load from slot ' + slotId + ' failed:', e);
    localStorage.removeItem(SAVE_PREFIX + slotId);
    return null;
  }
}

function deleteSlot(slotId) {
  localStorage.removeItem(SAVE_PREFIX + slotId);
}

function getSlotMeta(slotId) {
  try {
    const raw = localStorage.getItem(SAVE_PREFIX + slotId);
    if (!raw) return { slotId, exists: false };
    const data = JSON.parse(raw);
    return { slotId, exists: true, timestamp: data.timestamp, meta: data.meta, version: data.version };
  } catch {
    return { slotId, exists: false };
  }
}

export function getAllSlots() {
  return [...AUTO_SLOTS, ...MANUAL_SLOTS].map(getSlotMeta);
}

export function autoSave(state) {
  // Rotate: auto_2 -> auto_3, auto_1 -> auto_2, new -> auto_1
  for (let i = AUTO_SLOTS.length - 1; i > 0; i--) {
    const prev = loadFromSlot(AUTO_SLOTS[i - 1]);
    if (prev && prev.state) saveToSlot(AUTO_SLOTS[i], prev.state);
  }
  saveToSlot('auto_1', state);
}

export function manualSave(slotId, state) {
  return saveToSlot(slotId, state);
}

export function loadSlot(slotId) {
  const data = loadFromSlot(slotId);
  if (!data || data.incompatible) return data;
  return data.state;
}

export function deleteSlotById(slotId) {
  deleteSlot(slotId);
}

// Backward compatibility
export function saveGame(state) { autoSave(state); }
export function loadGame() {
  const data = loadFromSlot('auto_1');
  if (!data || data.incompatible) return data;
  return data.state;
}
export function clearSave() {
  [...AUTO_SLOTS, ...MANUAL_SLOTS].forEach(deleteSlot);
  localStorage.removeItem('coc_game_save'); // old key
}
export function hasSave() {
  return [...AUTO_SLOTS, ...MANUAL_SLOTS].some(sid => getSlotMeta(sid).exists);
}

// Migrate old single-slot save
export function migrateOldSave() {
  try {
    const old = localStorage.getItem('coc_game_save');
    if (old) {
      const data = JSON.parse(old);
      if (data.version === SAVE_VERSION && data.state) {
        saveToSlot('auto_1', data.state);
      }
      localStorage.removeItem('coc_game_save');
    }
  } catch (e) {}
}
