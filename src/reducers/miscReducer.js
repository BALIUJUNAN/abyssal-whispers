// src/reducers/miscReducer.js - Merged: safehouseReducer + itemReducer + settingsReducer

import { rand, makeRand } from './utils.js';
import { getSealState } from '../engine/WorldTimeSystem.js';
import { getSanStageFromGD } from './sanReducer.js';
import { applyEffects } from './effectReducer.js';

// === Safehouse Degradation (was safehouseReducer.js) ===

// src/reducers/safehouseReducer.js - Safehouse degradation

// === Light Source System ===
// Reads the 4-level light configuration from game_base.json and applies effects.

/**
 * Get the light level effects for the current lightLevel.
 * Returns an object with text_reliability, false_option_detection, hidden_clue_detection,
 * map_corruption_resist, san_distortion_increase, monster_encounter_multiplier.
 *
 * @param {number} lightLevel - current light level (0-3)
 * @param {object} ctx - { GD }
 * @returns {object} effects with name and all modifiers
 */
export function getLightLevelEffects(lightLevel, ctx) {
  var GD = ctx.GD;
  var lightConfig = GD.systems?.resource_pressure?.light || GD.module2_areas?.light;
  if (!lightConfig || !lightConfig.light_levels) {
    return { name: '未知', text_reliability: 0, false_option_detection: 0.5, hidden_clue_detection: 0, monster_encounter_multiplier: 1, san_distortion_increase: 0, map_corruption_resist: 0 };
  }
  var levelKey = String(Math.max(0, Math.min(3, lightLevel)));
  var levelData = lightConfig.light_levels[levelKey];
  if (!levelData || !levelData.effects) {
    return { name: '未知', text_reliability: 0, false_option_detection: 0.5, hidden_clue_detection: 0, monster_encounter_multiplier: 1, san_distortion_increase: 0, map_corruption_resist: 0 };
  }
  return { name: levelData.name, ...levelData.effects };
}

/**
 * Apply light source text corruption to event text.
 * Low light levels cause text to become unreliable (characters replaced, words shifted).
 *
 * @param {string} text - event description
 * @param {number} lightLevel - current light level (0-3)
 * @param {object} ctx - { GD }
 * @returns {string} corrupted text
 */
export function applyLightTextCorruption(text, lightLevel, ctx, rng) {
  if (!text || lightLevel >= 2) return text; // Stable+ light = no corruption
  var effects = getLightLevelEffects(lightLevel, ctx);
  var reliability = effects.text_reliability || 0;
  if (reliability >= 0) return text; // No corruption needed

  var _rand = makeRand(rng);
  // Corruption chance based on negative reliability
  var corruptChance = Math.abs(reliability);
  if (_rand() >= corruptChance) return text;

  var chars = text.split('');
  var corrupted = 0;
  var maxCorrupt = Math.max(1, Math.floor(chars.length * 0.02));
  var result = chars.map(function(ch) {
    if (corrupted >= maxCorrupt) return ch;
    if (_rand() < 0.03 && ch !== ' ' && ch !== '\n' && ch !== '，' && ch !== '。') {
      corrupted++;
      var replacements = ['…', '·', '?', '□', ch]; // 50% keep original
      return replacements[Math.floor(_rand() * replacements.length)];
    }
    return ch;
  });
  return result.join('');
}

/**
 * Check if a false option should be revealed (player can detect it).
 * Higher light = higher detection chance.
 *
 * @param {number} lightLevel - current light level (0-3)
 * @param {object} ctx - { GD }
 * @returns {boolean} true if player can detect false options
 */
export function canDetectFalseOption(lightLevel, ctx, rng) {
  var effects = getLightLevelEffects(lightLevel, ctx);
  var _rand = makeRand(rng);
  return _rand() < (effects.false_option_detection || 0);
}

export function getSafehouseStage(corruption, ctx) {
  const { GD } = ctx;
  const stages = GD.systems?.safehouse?.degradation_stages || [];
  for (let i = stages.length - 1; i >= 0; i--) {
    const r = stages[i].corruption_range;
    if (corruption >= r[0] && corruption <= r[1]) return stages[i];
  }
  return (
    stages[0] || {
      stage: 1,
      name: '安宁',
      is_safe: true,
      corruption_range: [0, 15],
      available_functions: { san_recovery: 2, fatigue_recovery: 30 },
    }
  );
}

export function processSafehouseNight(state, ctx, rng) {
  let corruption = state.safehouseCorruption || 0;
  const sealState = getSealState(state.day, ctx);
  let accel = sealState?.global_modifier?.npc_corruption_rate || 0.05;
  let baseGain = Math.round(accel * 10 + rand(0, 3, rng));
  // Degradation triggers
  // P1-A: SSOT — explanation_loss (level >= 3) boosts corruption rate
  if (getSanStageFromGD(state.san).level >= 3) baseGain = Math.round(baseGain * 1.3);
  if (state.npcStates['玛莎·格雷']?.corrupted) baseGain = Math.round(baseGain * 1.5); // Martha corrupted: +50%
  // DESIGN_REFACTOR_NOTES.md: "每轮回+2天腐蚀进度（loop 3后生效）"
  // After loop 3, the safehouse starts to remember. The walls know you've been here before.
  if ((state.loopCount || 0) >= 3) {
    baseGain += 2;
  }
  corruption += baseGain;
  const corruptedCount = Object.values(state.npcStates).filter(
    (ns) => ns.corrupted && !ns.dead
  ).length;
  corruption += corruptedCount;
  return Math.min(100, corruption);
}

// === Item Usage Logic (was itemReducer.js) ===

// src/reducers/itemReducer.js - Item usage logic (data-driven)

export function getItemDef(itemId, ctx) {
  const { GD } = ctx;
  const items = GD.items || [];
  return items.find((i) => i.id === itemId);
}

export function useItemByDef(state, item, narr, ctx) {
  const def = getItemDef(item.id, ctx);
  if (!def) return false;

  if (def.use_text_ref === 'clue_count') {
    narr('system', '你翻看笔记本，记录了' + state.clues.length + '条线索。');
    return false;
  }
  if (def.use_text_ref === 'show_day') {
    narr('system', '指针不规则地转动——有时倒转。现在是第' + state.day + '天。');
    return false;
  }

  if (def.effects && def.effects.length > 0) {
    applyEffects(state, def.effects, { source: 'item_use', item_id: item.id });
    const effectDesc = def.effects
      .map((e) => {
        if (e.type === 'modify_stat') return `${e.target} ${e.amount > 0 ? '+' : ''}${e.amount}`;
        if (e.type === 'modify_resource')
          return `${e.resource} ${e.amount > 0 ? '+' : ''}${e.amount}`;
        if (e.type === 'add_item') return `获得 ${e.name || e.item_id}`;
        if (e.type === 'add_clue') return `获得线索`;
        if (e.type === 'add_flag') return `标记 ${e.flag_id}`;
        return e.type;
      })
      .join(', ');
    narr('system', '使用 ' + item.name + '，' + effectDesc);
  } else if (def.use_text) {
    narr('system', def.use_text);
  }

  return !!def.consume_on_use;
}

// === Settings Persistence (was settingsReducer.js) ===

// src/reducers/settingsReducer.js - 持久化设置管理

export const SETTINGS_KEY = 'coc_game_settings';
export const SETTINGS_VERSION = '1.1.0';

export const DEFAULT_SETTINGS = {
  // Audio (legacy fields kept for compat)
  volume: 80,
  ambientVolume: 80,
  effectVolume: 80,
  uiVolume: 80,
  // Audio (granular)
  masterVolume: 80,
  musicVolume: 60,
  sfxVolume: 80,
  voiceVolume: 70,
  muteAll: false,
  // Display
  narrativeFontSize: 'medium',
  fontSize: 16,
  lineHeight: 1.6,
  fontFamily: 'serif',
  // Accessibility
  visualDistortion: true,
  suddenSounds: true,
  flickerEffect: true,
  reduceMotion: false,
  highContrast: false,
  // Visual pollution
  visualPollution: 50,
  interactionPollution: 50,
  metaPollution: 50,
  lightPollutionMode: false,
  screenShake: true,
  textCorruption: true,
  vignetteIntensity: 1.0,
  // Gameplay
  autoSave: true,
  showGuideHints: true,
  skipSeenText: false,
  confirmActions: false,
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
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        version: SETTINGS_VERSION,
        settings,
      })
    );
  } catch (e) {
    console.error('Save settings failed:', e);
  }
}
