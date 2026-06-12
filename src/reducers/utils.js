// src/reducers/utils.js - Pure utility functions (no React dependency)
// These can be imported by both the reducer and tests.

export const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
export const d100 = () => rand(1, 100);
export const d3 = () => rand(1, 3);
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const pick = (arr) => arr[rand(0, arr.length - 1)];
export const rollDice = (dice) => {
  const m = dice.match(/(\d+)d(\d+)(?:\+(\d+))?/);
  if (!m) return 0;
  const [n, faces, bonus] = m.slice(1).map(Number);
  let t = bonus || 0;
  for (let i = 0; i < n; i++) t += rand(1, faces);
  return t;
};
export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * SSOT: Get the current SAN stage from the unified san_stages config in game_base.json.
 * ALL systems (PollutionManager, EventEngine, SanPollutionLayer, sanReducer, etc.)
 * MUST call this function instead of hardcoding SAN thresholds.
 *
 * Defined here in utils.js because it loads first in the bundle and has no dependencies.
 *
 * @param {number} san - current SAN value (0-100)
 * @param {object} ctx - { GD }
 * @returns {{ id, name, range, level, ap_modifier, description, visual_tier, event_weight, pollution_effects }}
 */
export function getCurrentSanStage(san, ctx) {
  const { GD } = ctx;
  const stages = GD.systems?.sanity?.san_stages || [];
  if (san <= 0) {
    return {
      id: 'death',
      name: '死亡',
      range: [0, 0],
      level: 6,
      ap_modifier: 0,
      description: '理智归零，触发死亡判定。',
      visual_tier: 'extreme',
      event_weight: { buffer_boost: 0, horror_penalty: 2.0 },
      pollution_effects: ['death'],
    };
  }
  for (const stage of stages) {
    if (san >= stage.range[0] && san <= stage.range[1]) return stage;
  }
  return (
    stages[0] || {
      id: 'stable',
      name: '理智',
      range: [75, 100],
      level: 0,
      ap_modifier: 0,
      description: '',
      visual_tier: 'clean',
      event_weight: { buffer_boost: 1.3, horror_penalty: 0.8 },
      pollution_effects: [],
    }
  );
}
