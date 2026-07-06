// src/systems/inputResistance.js — Input resistance layer for perception corruption
// Implements the input_resistance_level (0-4) from GD.systems.perception_corruption.
// Level 0: normal operation
// Level 1: button slight delay (30ms)
// Level 2: button sinking visual feedback (when leaving water areas)
// Level 3: closing abnormal log delayed response
// Level 4: ritual climax confirmation button muffled sound

import { getSanStageFromGD } from '../reducers/sanReducer.js';

/**
 * Calculate the current input resistance level based on game state.
 * @param {object} state - game state
 * @param {object} ctx - { GD }
 * @returns {number} level 0-4
 */
export function getInputResistanceLevel(state, ctx) {
  if (!ctx || !ctx.GD) return 0;
  var triggers = ctx.GD.systems?.perception_corruption?.trigger_sources || [];
  if (triggers.length === 0) return 0;

  var level = 0;
  var san = state.san || 60;
  var loopCount = state.loopCount || 0;
  var corruption = state.safehouseCorruption || 0;
  var currentArea = state.currentArea || '';
  var stage = getSanStageFromGD(san);

  // Base level from SAN stage (perception_shift+ = level 1, explanation_loss+ = level 2)
  if (stage.level >= 2) level = 1; // perception_shift (SAN 50-59)
  if (stage.level >= 3) level = 2; // explanation_loss (SAN 40-49)
  if (stage.level >= 4) level = 3; // cognitive_fog (SAN 30-39)
  if (stage.level >= 5) level = 4; // reality_dissolution (SAN 15-29)

  // Additional increments from triggers
  for (var i = 0; i < triggers.length; i++) {
    var t = triggers[i];
    var increment = 1;
    if (t.effect && typeof t.effect === 'string') {
      var match = t.effect.match(/input_resistance\+(\d)/);
      if (match) increment = parseInt(match[1]);
    }
    switch (t.source) {
      case 'loop_count':
        if (loopCount >= 3) level += increment;
        break;
      case 'city_corruption':
        if (corruption >= 50) level += increment;
        break;
      case 'reality_thin_area':
        if (currentArea === 'deep_catacombs' || currentArea === 'ruins_of_yith') {
          level += increment;
        }
        break;
    }
  }

  return Math.min(4, Math.max(0, level));
}

/**
 * Get the button delay in ms for a given input resistance level.
 * @param {number} level
 * @returns {number} delay in ms
 */
export function getButtonDelay(level) {
  switch (level) {
    case 1: return 30;
    case 2: return 80;
    case 3: return 150;
    case 4: return 250;
    default: return 0;
  }
}

/**
 * Check if the current action should have enhanced input resistance.
 * Scene-aware: certain actions get extra resistance at certain levels.
 * @param {number} level
 * @param {string} actionType - 'move', 'close_log', 'confirm', 'general'
 * @returns {{ delay: number, sink: boolean }} resistance parameters
 */
export function getInputResistanceForAction(level, actionType) {
  var delay = getButtonDelay(level);
  var sink = false;

  // Level 2: "leaving water area" → button sinking
  if (level >= 2 && actionType === 'leave_water') {
    delay = Math.max(delay, 80);
    sink = true;
  }
  // Level 3: "closing abnormal log" → extra delay
  if (level >= 3 && actionType === 'close_log') {
    delay = Math.max(delay, 150);
  }
  // Level 4: "ritual climax confirmation" → muffled sound + heavy delay
  if (level >= 4 && actionType === 'ritual_confirm') {
    delay = Math.max(delay, 250);
  }

  return { delay: delay, sink: sink };
}

/**
 * Get input resistance description for UI feedback.
 * @param {number} level
 * @returns {string}
 */
export function getInputResistanceDescription(level) {
  var descriptions = [
    '操作正常',
    '按钮响应轻微迟滞',
    '离开水边时按钮有下沉感',
    '关闭异常日志时延迟响应',
    '仪式高潮中确认音效沉闷',
  ];
  return descriptions[level] || descriptions[0];
}

/**
 * Check if input resistance should add CSS class to buttons.
 * @param {number} level
 * @returns {string|null} CSS class suffix or null
 */
export function getInputResistanceClass(level) {
  if (level <= 0) return null;
  if (level <= 2) return 'input-resist-light';
  if (level <= 3) return 'input-resist-medium';
  return 'input-resist-heavy';
}
