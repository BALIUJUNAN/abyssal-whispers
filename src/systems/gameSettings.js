// src/systems/gameSettings.js — Game settings with persistence
// Font size, flicker control, visual pollution intensity, volume categories.

const GAME_SETTINGS_KEY = 'abyssal_whispers_settings';

export const DEFAULT_SETTINGS = {
  // Display
  fontSize: 16,            // px, range 12-24
  lineHeight: 1.6,         // em, range 1.2-2.0
  fontFamily: 'serif',     // 'serif' | 'sans' | 'monospace'

  // Accessibility
  flickerControl: true,    // reduce flicker
  reduceMotion: false,     // reduce animations
  highContrast: false,     // high contrast mode

  // Visual pollution
  visualPollution: 1.0,    // 0.0=off, 0.5=reduced, 1.0=normal, 1.5=enhanced
  screenShake: true,       // screen shake effect
  textCorruption: true,    // text corruption effect
  vignetteIntensity: 1.0,  // vignette intensity (0-2)

  // Audio
  masterVolume: 0.8,       // master volume (0-1)
  musicVolume: 0.6,        // music volume (0-1)
  sfxVolume: 0.8,          // SFX volume (0-1)
  ambientVolume: 0.5,      // ambient volume (0-1)
  voiceVolume: 0.7,        // voice volume (0-1)
  muteAll: false,          // mute all

  // Gameplay
  autoSave: true,          // auto save
  showGuideHints: true,    // show guide hints
  skipSeenText: false,     // skip seen text
  confirmActions: false,   // confirm critical actions

  // LLM Enhancement (optional, requires API key)
  llmEnabled: false,       // enable LLM narrative enhancement
  llmDeathSummary: true,   // LLM-enhanced death summary
  llmNpcDialogue: true,    // LLM-enhanced NPC dialogue
  llmMetaCorruption: true, // LLM-generated meta corruption events
  llmEventText: false,     // LLM-enhanced event descriptions (heavier)
};

/**
 * Load settings from localStorage, merged with defaults.
 * @returns {object} settings
 */
export function loadSettings() {
  try {
    const stored = localStorage.getItem(GAME_SETTINGS_KEY);
    if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch (e) {}
  return { ...DEFAULT_SETTINGS };
}

/**
 * Save settings to localStorage.
 */
export function saveSettings(settings) {
  try {
    localStorage.setItem(GAME_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {}
}

/**
 * Update a single setting and persist.
 * @returns {object} updated settings
 */
export function updateSetting(current, key, value) {
  const updated = { ...current, [key]: value };
  saveSettings(updated);
  return updated;
}

/**
 * Validate and clamp a setting value.
 * @returns {{ valid: boolean, clamped: * }}
 */
export function validateSetting(key, value) {
  const validators = {
    fontSize: (v) => Math.max(12, Math.min(24, Math.round(v))),
    lineHeight: (v) => Math.max(1.2, Math.min(2.0, v)),
    visualPollution: (v) => Math.max(0, Math.min(2, v)),
    vignetteIntensity: (v) => Math.max(0, Math.min(2, v)),
    masterVolume: (v) => Math.max(0, Math.min(1, v)),
    musicVolume: (v) => Math.max(0, Math.min(1, v)),
    sfxVolume: (v) => Math.max(0, Math.min(1, v)),
    ambientVolume: (v) => Math.max(0, Math.min(1, v)),
    voiceVolume: (v) => Math.max(0, Math.min(1, v)),
  };
  const validator = validators[key];
  if (validator) return { valid: true, clamped: validator(value) };
  // Boolean settings pass through directly
  if (typeof value === 'boolean') return { valid: true, clamped: value };
  return { valid: true, clamped: value };
}

/**
 * Apply settings to CSS custom properties on document root.
 */
export function applySettingsToDOM(settings) {
  const root = document.documentElement;
  if (!root) return;
  root.style.setProperty('--font-size', settings.fontSize + 'px');
  root.style.setProperty('--line-height', settings.lineHeight);
  root.style.setProperty('--font-family',
    settings.fontFamily === 'sans' ? 'system-ui, sans-serif'
    : settings.fontFamily === 'monospace' ? 'monospace'
    : 'Georgia, serif');
  root.style.setProperty('--vignette-intensity', settings.vignetteIntensity);
  root.classList.toggle('reduce-motion', settings.reduceMotion);
  root.classList.toggle('high-contrast', settings.highContrast);
  root.classList.toggle('no-flicker', settings.flickerControl);
}
