// src/reducers/saveReducer.js - 多槽位存档系统
//
// P0-4: Migration mechanism for version-incompatible saves (no more auto-delete)
// P0-5: toPersistedState filters runtime UI fields before saving

import { SAVE_VERSION, migrateSaveData, toPersistedState } from './saveMigration.js';

const SAVE_PREFIX = 'coc_save_';
const AUTO_SLOTS = ['auto_1', 'auto_2', 'auto_3'];
const MANUAL_SLOTS = ['manual_1', 'manual_2', 'manual_3'];

/**
 * Save state to a slot. Uses toPersistedState to strip runtime fields (P0-5).
 */
function saveToSlot(slotId, state) {
  try {
    const persistedState = toPersistedState(state);
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
      state: persistedState
    };
    localStorage.setItem(SAVE_PREFIX + slotId, JSON.stringify(saveData));
    return true;
  } catch (e) {
    console.error('Save to slot ' + slotId + ' failed:', e);
    return false;
  }
}

/**
 * Load from slot. P0-4: attempts migration instead of deleting on version mismatch.
 */
function loadFromSlot(slotId) {
  try {
    const raw = localStorage.getItem(SAVE_PREFIX + slotId);
    if (!raw) return null;
    const data = JSON.parse(raw);

    // Version matches — return as-is
    if (data.version === SAVE_VERSION) {
      return data;
    }

    // P0-4: Version mismatch — attempt migration instead of deleting
    console.info('[Save] Slot ' + slotId + ' version mismatch (got ' + data.version + ', expected ' + SAVE_VERSION + '). Attempting migration...');
    const migrated = migrateSaveData(data, slotId);
    if (migrated) {
      // Persist the migrated save back to localStorage
      localStorage.setItem(SAVE_PREFIX + slotId, JSON.stringify(migrated));
      console.info('[Save] Slot ' + slotId + ' migrated successfully.');
      return migrated;
    }

    // Migration failed — only now do we consider it incompatible
    // But we DON'T delete it — keep it for potential future recovery
    console.warn('[Save] Slot ' + slotId + ' could not be migrated. Data preserved for recovery.');
    return { incompatible: true };
  } catch (e) {
    console.error('Load from slot ' + slotId + ' failed:', e);
    // Only remove genuinely corrupt data (JSON parse failure)
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

/**
 * Migrate old single-slot save. P0-4: attempts migration for any version.
 */
export function migrateOldSave() {
  try {
    const old = localStorage.getItem('coc_game_save');
    if (old) {
      const data = JSON.parse(old);
      // P0-4: Accept any version, attempt migration
      const migrated = migrateSaveData(data, 'auto_1');
      if (migrated && migrated.state) {
        saveToSlot('auto_1', migrated.state);
        console.info('[Save] Old single-slot save migrated successfully.');
      }
      localStorage.removeItem('coc_game_save');
    }
  } catch (e) {}
}

// 导出全部存档为 JSON 文件
export function exportSave() {
  try {
    const slots = {};
    [...AUTO_SLOTS, ...MANUAL_SLOTS].forEach(sid => {
      const raw = localStorage.getItem(SAVE_PREFIX + sid);
      if (raw) slots[sid] = JSON.parse(raw);
    });
    const exportData = { version: SAVE_VERSION, save_time: new Date().toISOString(), slots };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'savegame.json'; a.click();
    URL.revokeObjectURL(url);
    return true;
  } catch (e) { console.error('Export save failed:', e); return false; }
}

/**
 * 导入存档 JSON 文件. P0-4: attempts migration for each slot.
 */
export function importSave(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (!data.version || !data.slots) return { ok: false, error: '存档格式不兼容' };
    Object.entries(data.slots).forEach(([sid, slotData]) => {
      if ([...AUTO_SLOTS, ...MANUAL_SLOTS].includes(sid) && slotData) {
        // P0-4: Attempt migration on import too
        const migrated = migrateSaveData(slotData, sid);
        if (migrated && migrated.state) {
          localStorage.setItem(SAVE_PREFIX + sid, JSON.stringify(migrated));
        } else if (slotData.state) {
          // Fallback: save as-is if migration module not available
          localStorage.setItem(SAVE_PREFIX + sid, JSON.stringify(slotData));
        }
      }
    });
    return { ok: true };
  } catch (e) { return { ok: false, error: '存档格式不兼容' }; }
}
