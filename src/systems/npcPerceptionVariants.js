// src/systems/npcPerceptionVariants.js — NPC perception variants based on SAN stage
// Reads GD.systems.subjective_reality.npc_perception_variants and returns
// SAN-influenced perception text for NPC descriptions.

import { getSanStageFromGD } from '../reducers/sanReducer.js';
import { resolveNpcId } from '../data/registry/npcRegistry.js';

/**
 * Get the NPC perception variant text based on current SAN stage.
 *
 * @param {string} npcName - NPC display name (Chinese) or registry id
 * @param {object} state - game state
 * @param {object} ctx - { GD }
 * @returns {{ text: string, tier: string }|null} variant text and tier (high_san/mid_san/low_san), or null if no variant defined
 */
export function getNpcPerceptionVariant(npcName, state, ctx) {
  if (!npcName || !ctx || !ctx.GD) return null;
  var variants = ctx.GD.systems?.subjective_reality?.npc_perception_variants;
  if (!variants) return null;

  // Resolve Chinese name → registry id (e.g. "希尔达·莫里斯" → "hilda_morris")
  var resolvedId = resolveNpcId(npcName);
  var variantData = variants[resolvedId] || variants[npcName];
  if (!variantData) return null;

  // Determine SAN stage
  var san = state?.san || 60;
  var stage = getSanStageFromGD(san);
  var tier = stage.level >= 5 ? 'low_san' : stage.level >= 3 ? 'mid_san' : 'high_san';

  var text = variantData[tier];
  if (!text) {
    // Fallback: try all tiers in order
    text = variantData.high_san || variantData.mid_san || variantData.low_san;
    tier = text === variantData.high_san ? 'high_san' : text === variantData.mid_san ? 'mid_san' : 'low_san';
  }
  if (!text) return null;

  return { text: text, tier: tier };
}

/**
 * Check if any NPC perception variants are defined in GD.
 * @param {object} ctx - { GD }
 * @returns {boolean}
 */
export function hasNpcPerceptionVariants(ctx) {
  if (!ctx || !ctx.GD) return false;
  var variants = ctx.GD.systems?.subjective_reality?.npc_perception_variants;
  if (!variants) return false;
  return Object.keys(variants).length > 0;
}
