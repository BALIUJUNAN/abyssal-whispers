// src/engine/WorldTimeSystem.js — Pure time/phase/seal/weather engine
// ENGINE CONTRACT: Zero game-specific imports. Reads GD via ctx only.
// getDistortedName moved to src/systems/textVariants.js (game-specific presentation logic).

/**
 * Get time phase from AP ratio.
 * @param {number} ap
 * @param {number} maxAp
 * @returns {'morning'|'afternoon'|'evening'|'midnight'}
 */
export function getPhase(ap, maxAp) {
  var ratio = maxAp && maxAp > 0 ? ap / maxAp : 0;
  if (ratio > 0.66) return 'morning';
  if (ratio > 0.33) return 'afternoon';
  if (ratio > 0) return 'evening';
  return 'midnight';
}

/**
 * Get seal state object for a given day.
 * @param {number} day
 * @param {object} ctx - { GD }
 * @returns {object} seal state
 */
export function getSealState(day, ctx) {
  var GD = ctx.GD;
  var states =
    GD.world?.seal_state_machine || GD.module8_time_schedule?.seal_state_machine?.states || [];
  var list = Array.isArray(states) ? states : states.states || [];
  for (var i = list.length - 1; i >= 0; i--) if (day >= list[i].trigger_day) return list[i];
  return list[0] || { id: 'intact', name: '封印完整' };
}

export function getSealStateId(day, ctx) {
  return getSealState(day, ctx).id;
}

/**
 * Get random weather for a new day.
 * @param {function} pick - pick(array) function
 * @returns {{ name: string, w: number }}
 */
export function getWeather(pick) {
  var ws = [
    { name: '晴天', w: 3 },
    { name: '阴天', w: 4 },
    { name: '雨天', w: 2 },
    { name: '大雾', w: 2 },
    { name: '血月', w: 1 },
  ];
  var r = Math.random() * ws.reduce(function (s, x) { return s + x.w; }, 0);
  for (var i = 0; i < ws.length; i++) {
    r -= ws[i].w;
    if (r <= 0) return ws[i];
  }
  return ws[0];
}

/**
 * Get area info from GD.
 * @param {string} areaId
 * @param {object} ctx - { GD }
 * @returns {object|undefined}
 */
export function getAreaInfo(areaId, ctx) {
  var GD = ctx.GD;
  var areas = GD.areas || GD.module2_areas || [];
  for (var i = 0; i < areas.length; i++) {
    if (areas[i].id === areaId) return areas[i];
  }
  return undefined;
}

/**
 * Get connected area IDs for a given area.
 * @param {string} areaId
 * @param {object} ctx - { GD }
 * @returns {string[]}
 */
export function getConnectedAreas(areaId, ctx) {
  var cur = getAreaInfo(areaId, ctx);
  return cur?.connected_areas || [];
}

// getDistortedName and AREA_DISTORTIONS moved to src/systems/textVariants.js.
// Callers: import { getDistortedName } from '../systems/textVariants.js';
