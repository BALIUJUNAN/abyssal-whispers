// src/reducers/sanReducer.js - SAN loss processing, stages, madness
// SSOT: All SAN stage thresholds come from GD.systems.sanity.san_stages (game_base.json).
// Use getCurrentSanStage(san, ctx) to get the current stage for any SAN value.
//
// Presentation functions (getSanStage colors/text, getSanTextVariant char corruption,
// getSanSceneVariant, getVisualForSan, getPerceptionLevels) have moved to
// src/systems/sanityVisual.js. Backward-compatible re-exports provided below.

import { pick, getCurrentSanStage, makeRand } from './utils.js';
import { getSealState } from '../engine/WorldTimeSystem.js';
import { GD as sharedGD } from '../state/gameData.js';
import {
  buildSanStagePresentation,
  getSanTextVariant,
  getSanSceneVariant,
} from '../systems/sanityVisual.js';

// Re-export presentation functions for backward compatibility
// All existing callers that import from sanReducer.js continue to work unchanged.
export { getSanTextVariant, getSanSceneVariant };

/**
 * Backward-compatible wrapper: get full stage presentation data.
 * Delegates to buildSanStagePresentation(sanityVisual) + getCurrentSanStage(utils).
 */
export function getSanStage(san, ctx) {
  const stage = getCurrentSanStage(san, ctx);
  return buildSanStagePresentation(stage);
}

/**
 * Convenience wrapper: getSanStage from the shared read-only GD holder.
 * For utility/system files that don't receive ctx as a parameter.
 * @param {number} san
 * @returns {{ id, name, level, visual_tier, ... }}
 */
export function getSanStageFromGD(san) {
  return getSanStage(san, { GD: sharedGD });
}

export function processSanLoss(base, inv, weather, day, difficulty, ctx) {
  const { GD } = ctx;
  let loss = base;
  const prots = GD.systems?.sanity?.item_protection || GD.module5_player?.item_san_protection || [];
  inv.forEach((item) => {
    const p = prots.find((pr) => pr.name === (item && item.name ? item.name : item));
    if (p) loss -= p.san_reduction;
  });
  if (weather === '血月') loss += 3;
  if (day) {
    const seal = getSealState(day, ctx);
    if (seal?.global_modifier?.san_loss_multiplier)
      loss *= seal.global_modifier.san_loss_multiplier;
  }
  if (difficulty) {
    const dl = GD.core_loop?.difficulty_levels?.[difficulty];
    if (dl) loss *= dl.san_loss_multiplier;
  }
  return Math.max(0, Math.round(loss));
}

export function rollMadness(ctx, rng) {
  const { GD } = ctx;
  const table =
    GD.systems?.sanity?.temporary_madness_table || GD.module5_player?.temporary_madness_table;
  if (!table || !Array.isArray(table))
    return { name: '幻觉', description: '你看到了不存在的东西。' };
  return pick(table, rng);
}
