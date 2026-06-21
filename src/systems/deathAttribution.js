// src/systems/deathAttribution.js - 死亡归因叙事选择器
//
// 调用 chain:
//   selectDeathNarrative(mode, type, state, sourceEvent, rng)
//     → classifyDeathAttribution(deathCtx, state)
//     → pick pool[NARRATIVE_POOLS[category]]
//     → return variant (4-part narrative object)
//
// 集成点: src/reducers/deathSystem.js resolveDeath()
//   resolveDeath() 在构建 deathCtx 时调用本模块，
//   将选中的叙事存入 deathCtx.attributionNarrative。

import { NARRATIVE_POOLS, classifyDeathAttribution } from '../data/deathAttributionNarratives.js';
import { makeRand } from '../reducers/utils.js';

// =============================================
// RNG-based variant selector
// =============================================

/**
 * Select a death attribution narrative variant.
 * Uses deterministic RNG if provided.
 *
 * @param {string} mode          - 'hp' | 'san' | 'hybrid'
 * @param {string} type          - death type key (e.g. 'starvation', 'madness')
 * @param {object} state         - game state (needed for attribution classifier)
 * @param {object|null} sourceEvent - triggering event (optional)
 * @param {object|null} rng        - seeded RNG instance
 * @returns {object|null} attribution narrative object, or null if no pool found
 */
export function selectDeathNarrative(mode, type, state, sourceEvent, rng) {
  var _rand = makeRand(rng);

  // Build a minimal deathCtx for the classifier
  var deathCtx = {
    mode,
    type,
    sourceEventId: sourceEvent?.id || null,
  };

  var category = classifyDeathAttribution(deathCtx, state);
  var pool = NARRATIVE_POOLS[category];
  if (!pool || pool.length === 0) return null;

  var variant = pool[Math.floor(_rand() * pool.length)];
  return {
    category,
    categoryLabel: getCategoryLabel(category),
    ...variant,
  };
}

/**
 * Get human-readable label for a category key.
 */
function getCategoryLabel(category) {
  var labels = {
    cognitive_collapse: '认知崩塌',
    consumed_by_city: '被消食',
    became_the_event: '成为事件',
    sacrificed_by_city: '被献祭',
    surrendered_to_world: '不抵抗',
  };
  return labels[category] || category;
}
