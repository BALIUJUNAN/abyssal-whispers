// src/reducers/saveReducer.js - localStorage save/load

const SAVE_KEY = 'coc_game_save';
const SAVE_VERSION = '1.0.0';

export function saveGame(state) {
  try {
    const saveData = {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      state: JSON.parse(JSON.stringify(state))
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    return true;
  } catch (e) {
    console.error('Save failed:', e);
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const saveData = JSON.parse(raw);
    if (saveData.version !== SAVE_VERSION) {
      localStorage.removeItem(SAVE_KEY);
      return { incompatible: true };
    }
    return saveData.state;
  } catch (e) {
    console.error('Load failed:', e);
    localStorage.removeItem(SAVE_KEY);
    return null;
  }
}

export function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}

export function hasSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const saveData = JSON.parse(raw);
    return saveData.version === SAVE_VERSION;
  } catch { return false; }
}
