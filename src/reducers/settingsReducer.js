// src/reducers/settingsReducer.js - 持久化设置管理

const SETTINGS_KEY = 'coc_game_settings';
const SETTINGS_VERSION = '1.0.0';

const DEFAULT_SETTINGS = {
  volume: 80,
  narrativeFontSize: 'medium',
  visualDistortion: true,
  suddenSounds: true,
  flickerEffect: true
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const data = JSON.parse(raw);
    if (data.version !== SETTINGS_VERSION) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...data.settings };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      version: SETTINGS_VERSION,
      settings
    }));
  } catch (e) {
    console.error('Save settings failed:', e);
  }
}
