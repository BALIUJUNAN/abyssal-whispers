// src/systems/audioIntrusion.js — Audio intrusion layer for perception corruption
// Implements the audio_intrusion_level (0-4) from GD.systems.perception_corruption.
// Level 0: normal ambient
// Level 1: subtle repetition / environmental shift
// Level 2: low-frequency drone + reversed audio
// Level 3: silence-before-key-events
// Level 4: non-source-position name whispers

import { getSanStageFromGD } from '../reducers/sanReducer.js';

/**
 * Calculate the current audio intrusion level based on game state.
 * @param {object} state - game state
 * @param {object} ctx - { GD }
 * @returns {number} level 0-4
 */
export function getAudioIntrusionLevel(state, ctx) {
  if (!ctx || !ctx.GD) return 0;
  var triggers = ctx.GD.systems?.perception_corruption?.trigger_sources || [];
  if (triggers.length === 0) return 0;

  var level = 0;
  var san = state.san || 60;
  var loopCount = state.loopCount || 0;
  var corruption = state.safehouseCorruption || 0;
  var mythos = state.mythosLevel || 0;
  var currentArea = state.currentArea || '';

  for (var i = 0; i < triggers.length; i++) {
    var t = triggers[i];
    var increment = 1;
    if (t.effect && typeof t.effect === 'string') {
      var match = t.effect.match(/audio_intrusion\+(\d)/);
      if (match) increment = parseInt(match[1]);
    }
    switch (t.source) {
      case 'low_san':
        if (san < 50) level += increment;
        break;
      case 'high_mythos':
        if (mythos >= 10) level += increment;
        break;
      case 'loop_count':
        if (loopCount >= 3) level += increment;
        break;
      case 'city_corruption':
        if (corruption >= 50) level += increment;
        break;
      case 'contaminated_item':
        if ((state.inventory || []).some(function (it) { return it.id === 'deep_sea_water'; })) {
          level += increment;
        }
        break;
      case 'reality_thin_area':
        if (currentArea === 'deep_catacombs' || currentArea === 'ruins_of_yith') {
          level += increment;
        }
        break;
    }
  }

  // Clamp: maximum level is 4
  return Math.min(4, Math.max(0, level));
}

/**
 * Apply audio intrusion effects.
 * @param {number} level - audio intrusion level (0-4)
 * @param {object} audioManager - AudioManager instance
 * @param {string} currentArea - current area id
 * @returns {{ silenceNext: boolean, volumeScale: number }} audio modifiers
 */
export function applyAudioIntrusion(level, audioManager, currentArea) {
  if (level <= 0) return { silenceNext: false, volumeScale: 1.0 };

  // Level 1: subtle environmental shift (slight volume reduction)
  if (level === 1) {
    return { silenceNext: false, volumeScale: 0.85 };
  }
  // Level 2: low-frequency drone overlay (slight volume reduction)
  if (level === 2) {
    return { silenceNext: false, volumeScale: 0.7 };
  }
  // Level 3: silence before key events
  if (level === 3) {
    return { silenceNext: true, volumeScale: 0.5 };
  }
  // Level 4: heavy distortion + name whispers
  return { silenceNext: false, volumeScale: 0.4 };
}

/**
 * Get the audio intrusion description for UI feedback.
 * @param {number} level
 * @returns {string}
 */
export function getAudioIntrusionDescription(level) {
  var descriptions = [
    '自然环境音',
    '你听到一些重复的声音……是回声，还是别的东西？',
    '低频嗡鸣渗入环境音。有些声音倒放了。',
    '你听到自己的名字。不是叫你——是在讨论你。',
    '声音来自不存在的地方。你捂住耳朵，但它从内部传来。',
  ];
  return descriptions[level] || descriptions[0];
}

/**
 * Check if key event should trigger audio silence (level 3+).
 * Call this before narrating a key event to apply silence-before-event effect.
 * @param {number} level
 * @param {object} audioManager - AudioManager instance
 * @returns {boolean} true if silence was triggered
 */
export function maybeSilenceBeforeKeyEvent(level, audioManager) {
  if (level < 3) return false;
  if (!audioManager) return false;
  try {
    // Level 3: silence for 1 second
    // Level 4: silence for 1.5 seconds
    var duration = level >= 4 ? 1500 : 1000;
    if (audioManager._ambientFadeOut) {
      audioManager._ambientFadeOut(duration);
    }
    // Schedule volume restoration after silence
    setTimeout(function () {
      try {
        if (audioManager._userVolumeScale) {
          audioManager._volumeScale = audioManager._userVolumeScale;
        }
      } catch (e) {}
    }, duration);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Check if a key event should have silence-before-effect (level 3+).
 * @param {number} level
 * @returns {boolean}
 */
export function shouldSilenceBeforeEvent(level) {
  return level >= 3;
}
