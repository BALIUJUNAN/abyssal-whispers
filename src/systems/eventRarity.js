// src/systems/eventRarity.js - Event Rarity System
//
// Rarity tiers:
//   common    70%  — standard events, always available
//   uncommon  25%  — slightly special, visible flavor hints
//   secret     4%  — hidden, no UI hint, only specific conditions reveal them
//   legendary  1%  — no hint at all, requires very specific behavior + SAN + loop combo
//
// Integration points:
//   getEventRarityWeight(evt)            → weight multiplier for selection
//   checkLegendaryTrigger(evt, state)    → whether legendary conditions are met
//   getRarityDisplayName(rarity)         → human-readable (for debug/diagnostic)
//   getRarityColor(rarity)               → CSS color class
//
// Legendary trigger conditions (ALL must be met):
//   1. Difficulty >= 10
//   2. Specific behavior combo (tracked in behaviorTracking)
//   3. SAN in specific range
//   4. Specific loop count range
//   5. Event-specific additional conditions (evt.trigger.legendary_requires)

import { getCurrentSanStage } from '../reducers/utils.js';
import { hasClueId } from '../utils/clueNameMap.js';

// ============================================================
// Rarity Definitions
// ============================================================

var RARITY_TIERS = {
  common: {
    id: 'common',
    weight_mult: 1.0,
    display_weight: 70,
    label: '普通',
    color: '#9ca3af',      // gray-400
    description: '日常事件，随时可能发生',
    hint_chance: 0,        // never hints at rarity
    requires_discovery: false,
  },
  uncommon: {
    id: 'uncommon',
    weight_mult: 0.7,      // slightly less frequent
    display_weight: 25,
    label: '罕见',
    color: '#60a5fa',      // blue-400
    description: '不寻常的事件，需要留意',
    hint_chance: 0.05,     // 5% chance of subtle flavor hint
    requires_discovery: false,
  },
  secret: {
    id: 'secret',
    weight_mult: 0.35,     // much rarer
    display_weight: 4,
    label: '隐秘',
    color: '#a78bfa',      // violet-400
    description: '只有特定条件满足时才可能触发',
    hint_chance: 0,        // no hint
    requires_discovery: true,
  },
  legendary: {
    id: 'legendary',
    weight_mult: 0.12,     // extremely rare
    display_weight: 1,
    label: '传说',
    color: '#f59e0b',      // amber-500
    description: '只有特定行为组合 + SAN + 周目才能触发，全程无提示',
    hint_chance: 0,        // NEVER hints — player must discover organically
    requires_discovery: true,
  },
};

// ============================================================
// Core API
// ============================================================

/**
 * Get weight multiplier for an event based on its rarity tier.
 * If event has no rarity field, defaults to 'common'.
 *
 * @param {object} evt - event object (may have evt.rarity field)
 * @returns {number} weight multiplier (0.12 to 1.0)
 */
export function getEventRarityWeight(evt) {
  if (!evt || !evt.rarity) return 1.0;
  var tier = RARITY_TIERS[evt.rarity];
  if (!tier) return 1.0;
  return tier.weight_mult;
}

/**
 * Check if a legendary event's hidden trigger conditions are met.
 * ALL conditions must be satisfied:
 *   1. Difficulty >= 10
 *   2. Behavior combo (from evt.trigger.legendary_requires.behavior)
 *   3. SAN in range (from evt.trigger.legendary_requires.san)
 *   4. Loop count in range (from evt.trigger.legendary_requires.loop)
 *   5. Event-specific extra conditions
 *
 * @param {object} evt - event object with legendary trigger config
 * @param {object} state - game state
 * @returns {boolean} true if all legendary conditions are met
 */
export function checkLegendaryTrigger(evt, state) {
  if (!evt || evt.rarity !== 'legendary') return false;
  var req = evt.trigger?.legendary_requires;
  if (!req) return false;

  // Condition 1: Difficulty
  if (req.min_difficulty != null && (state.difficultyLevel || 0) < req.min_difficulty) return false;

  // Condition 2: Behavior combo
  if (req.behavior) {
    if (!checkBehaviorCombo(req.behavior, state)) return false;
  }

  // Condition 3: SAN range
  if (req.san != null) {
    var san = state.san || 0;
    if (req.san.gte != null && san < req.san.gte) return false;
    if (req.san.lte != null && san > req.san.lte) return false;
    if (req.san.gt != null && san <= req.san.gt) return false;
    if (req.san.lt != null && san >= req.san.lt) return false;
  }

  // Condition 4: Loop count
  if (req.loop != null) {
    var loop = state.loopCount || 0;
    if (req.loop.min != null && loop < req.loop.min) return false;
    if (req.loop.max != null && loop > req.loop.max) return false;
  }

  // Condition 5: Extra conditions (AND logic)
  if (req.extra) {
    for (var i = 0; i < req.extra.length; i++) {
      if (!checkExtraCondition(req.extra[i], state)) return false;
    }
  }

  return true;
}

/**
 * Check if a secret event's discovery conditions are met.
 * Simpler than legendary — just needs key conditions aligned.
 *
 * @param {object} evt - event object
 * @param {object} state - game state
 * @returns {boolean}
 */
export function checkSecretTrigger(evt, state) {
  if (!evt || evt.rarity !== 'secret') return false;
  var req = evt.trigger?.secret_requires;
  if (!req) return false;

  if (req.min_difficulty != null && (state.difficultyLevel || 0) < req.min_difficulty) return false;
  if (req.san != null) {
    var san = state.san || 0;
    if (req.san.gte != null && san < req.san.gte) return false;
    if (req.san.lte != null && san > req.san.lte) return false;
  }
  if (req.loop != null && (state.loopCount || 0) < req.loop) return false;
  if (req.flags) {
    for (var f = 0; f < req.flags.length; f++) {
      if (!(state.triggeredEvents || []).some(function (e) { return e === req.flags[f]; })) return false;
    }
  }
  if (req.clues) {
    for (var c = 0; c < req.clues.length; c++) {
      if (!hasClueId(state.clues || [], req.clues[c])) return false;
    }
  }
  return true;
}

/**
 * Get display metadata for a rarity tier.
 * Used for debug panels and diagnostic output.
 *
 * @param {string} rarity - rarity tier id
 * @returns {{ label, color, description, weight_mult }}
 */
export function getRarityInfo(rarity) {
  return RARITY_TIERS[rarity] || RARITY_TIERS.common;
}

/**
 * Get a subtle narrative hint that a rare event might be near.
 * Only used for uncommon events — secret/legendary NEVER hint.
 *
 * @param {string} rarity - rarity tier id
 * @param {function} [rng] - seeded random
 * @returns {string|null} hint text or null
 */
export function getRarityHint(rarity, rng) {
  var tier = RARITY_TIERS[rarity];
  if (!tier || tier.hint_chance === 0) return null;

  var _rand = rng ? rng.next.bind(rng) : Math.random;
  if (_rand() > tier.hint_chance) return null;

  var HINTS = {
    uncommon: [
      '你隐约觉得有什么不一样。街上的光线似乎……扭曲了一下。',
      '空气中的味道变了。不是腐烂，也不是海风。是某种你不熟悉的东西。',
      '你注意到一件事：周围安静得不对劲。不是没有声音——是声音在躲避什么。',
    ],
  };

  var hints = HINTS[rarity];
  if (!hints || hints.length === 0) return null;
  return hints[Math.floor(_rand() * hints.length)];
}

// ============================================================
// Internal Helpers
// ============================================================

/**
 * Check behavior combo conditions for legendary triggers.
 * Supports operators: >=, >, <=, <, ==, !=, in
 * Supports AND (all must match) and OR (any must match).
 */
function checkBehaviorCombo(behavior, state) {
  if (!behavior || !behavior.rules) return false;

  if (behavior.operator === 'OR') {
    // Any rule must match
    for (var i = 0; i < behavior.rules.length; i++) {
      if (checkBehaviorRule(behavior.rules[i], state)) return true;
    }
    return false;
  }

  // Default AND: all rules must match
  for (var j = 0; j < behavior.rules.length; j++) {
    if (!checkBehaviorRule(behavior.rules[j], state)) return false;
  }
  return true;
}

function checkBehaviorRule(rule, state) {
  var bt = state.behaviorTracking || {};
  var value = bt[rule.field] || 0;

  switch (rule.op) {
    case '>=':  return value >= (rule.value || 0);
    case '>':   return value > (rule.value || 0);
    case '<=':  return value <= (rule.value || 0);
    case '<':   return value < (rule.value || 0);
    case '==':  return value === (rule.value || 0);
    case '!=':  return value !== (rule.value || 0);
    case 'in':  return (rule.value || []).indexOf(value) >= 0;
    default:    return false;
  }
}

/**
 * Check extra conditions for legendary events.
 * Supports: flag, no_flag, clue, area_visited, item, npc_alive, npc_dead
 */
function checkExtraCondition(cond, state) {
  switch (cond.type) {
    case 'flag':
      return (state.triggeredEvents || []).indexOf(cond.id) >= 0 ||
             (state.flags || []).indexOf(cond.id) >= 0;
    case 'no_flag':
      return (state.triggeredEvents || []).indexOf(cond.id) < 0 &&
             (state.flags || []).indexOf(cond.id) < 0;
    case 'clue':
      return hasClueId(state.clues || [], cond.id);
    case 'area_visited':
      return (state.visitedAreas || []).indexOf(cond.id) >= 0;
    case 'item':
      return (state.inventory || []).some(function (i) { return i.id === cond.id || i.name === cond.id; });
    case 'npc_alive':
      var npcs = state.npcStates || {};
      return Object.values(npcs).some(function (ns) { return ns.name === cond.id && !ns.dead; });
    case 'npc_dead':
      var deadNpcs = state.npcStates || {};
      return Object.values(deadNpcs).some(function (ns) { return ns.name === cond.id && ns.dead; });
    default:
      return false;
  }
}
