// src/systems/resourceFraud.js - SAN-driven resource perception distortion
// SSOT for all resource "display vs reality" mechanics.
//
// Core concept: at low SAN, the player SEES inflated resource counts
// but GETS reduced actual gains. The gap widens with SAN degradation.
//
// Architecture:
//   getResourceFraudState(san, rng) → { displayMult, realMult, active, tier }
//   applyResourceFraud(gains, san, rng) → modified gains object
//   getDisplayedResource(resourceType, actualCount, san) → inflated/deflated display count
//   getFraudNarrative(tier, rng) → subtle hint message

import { pick, getCurrentSanStage } from '../reducers/utils.js';

// ============================================================
// Fraud tier definitions
// ============================================================

var FRAUD_TIERS = [
  {
    // Level 0-2: no fraud
    minLevel: 0, maxLevel: 2,
    displayMult: 1.0,
    realMult: 1.0,
    description: '感知清晰，资源数量如实反映',
  },
  {
    // Level 3: mild inflation — you see slightly more than there is
    minLevel: 3, maxLevel: 3,
    displayMult: 1.15,
    realMult: 1.0,
    description: '轻微感知偏差，资源显示略多于实际',
  },
  {
    // Level 4: moderate fraud — significant gap between display and reality
    minLevel: 4, maxLevel: 4,
    displayMult: 1.25,
    realMult: 0.85,
    description: '认知迷雾，资源显示虚高25%，实际获取打折15%',
  },
  {
    // Level 5: severe fraud — dangerous gap
    minLevel: 5, maxLevel: 5,
    displayMult: 1.40,
    realMult: 0.70,
    description: '现实溶解，资源显示虚高40%，实际获取打折30%',
  },
  {
    // Level 6: total fraud — barely anything is real
    minLevel: 6, maxLevel: 6,
    displayMult: 1.60,
    realMult: 0.50,
    description: '叙事死亡，资源显示虚高60%，实际获取减半',
  },
];

// ============================================================
// Resource types affected by fraud
// ============================================================

var FRAUD_AFFECTED_TYPES = ['food', 'medicine', 'clue', 'money', 'item'];

// ============================================================
// Fraud narrative hints — subtle, never explicit
// ============================================================

var FRAUD_HINTS = {
  3: [
    '你数了数口袋里的东西。好像比刚才多了点。……你确定吗？',
    '你打开食物袋。看起来比你想象的满。也许是光线的原因。',
  ],
  4: [
    '你看着手里的东西。数量似乎对不上。但你太累了，不想再数一遍。',
    '你隐约觉得哪里不对劲——但你说不上来。也许是雾的关系。',
  ],
  5: [
    '你数了三次。每次结果都不一样。你决定相信第一次的数字。',
    '你的记忆和眼前的东西在打架。你选择相信你的记忆——但你的记忆也在骗你。',
  ],
  6: [
    '你看着食物袋。你知道里面没有那么多。但你的手在颤抖，数不清。\n也许……也许它本来就是满的。',
    '数字在跳动。不是你的眼睛——是数字本身在变。你放下袋子。它自己安静了。',
  ],
};

// ============================================================
// Core API
// ============================================================

/**
 * Get the current resource fraud state based on SAN level.
 * This is the SSOT entry point — all fraud logic flows from here.
 *
 * @param {number} san - current SAN value
 * @param {function} [rng] - seeded random (optional, for future probabilistic variants)
 * @returns {{ displayMult: number, realMult: number, active: boolean, tier: number, description: string }}
 */
export function getResourceFraudState(san, rng, gd) {
  var stage = getCurrentSanStage(san, { GD: gd || {} });
  var level = stage.level || 0;

  for (var i = 0; i < FRAUD_TIERS.length; i++) {
    var tier = FRAUD_TIERS[i];
    if (level >= tier.minLevel && level <= tier.maxLevel) {
      return {
        displayMult: tier.displayMult,
        realMult: tier.realMult,
        active: tier.displayMult !== 1.0 || tier.realMult !== 1.0,
        tier: i,
        level: level,
        description: tier.description,
      };
    }
  }
  // Fallback: no fraud
  return { displayMult: 1.0, realMult: 1.0, active: false, tier: 0, level: level, description: '' };
}

/**
 * Apply resource fraud to a gains object.
 * Modifies food/item/clue/money quantities by the real multiplier.
 * Does NOT modify consumption (eating food, using items).
 *
 * @param {object} gains - { food: 2, add_item: {...}, add_clue: '...', money: 5 }
 * @param {number} san - current SAN
 * @param {function} [rng] - seeded random
 * @returns {object} modified gains with fraud applied
 */
export function applyResourceFraud(gains, san, rng) {
  if (!gains) return gains;
  var fraud = getResourceFraudState(san, rng, {});
  if (!fraud.active || fraud.realMult >= 1.0) return gains;

  var modified = { ...gains };
  var _rand = rng ? rng.next.bind(rng) : Math.random;

  // Apply real multiplier to additive resource gains
  if (modified.food) {
    var realFood = Math.max(0, Math.floor(modified.food * fraud.realMult));
    if (realFood < modified.food) {
      modified.food = realFood;
      // Occasionally show a hint
      if (_rand() < 0.15) modified._fraudHint = pickFraudHint(fraud.level, _rand);
    }
  }
  if (modified.money) {
    modified.money = Math.max(0, Math.floor(modified.money * fraud.realMult));
  }
  // Items (medicine etc.) — either give or don't, no partial
  if (modified.add_item && _rand() > fraud.realMult) {
    delete modified.add_item;
    if (_rand() < 0.2) modified._fraudHint = pickFraudHint(fraud.level, _rand);
  }
  // Clues — partial chance
  if (modified.add_clue) {
    var clues = Array.isArray(modified.add_clue) ? modified.add_clue : [modified.add_clue];
    var realClues = [];
    for (var c = 0; c < clues.length; c++) {
      if (_rand() <= fraud.realMult) realClues.push(clues[c]);
    }
    if (realClues.length < clues.length && _rand() < 0.1) {
      modified._fraudHint = pickFraudHint(fraud.level, _rand);
    }
    modified.add_clue = realClues.length === 1 ? realClues[0] : realClues;
    if (modified.add_clue.length === 0) delete modified.add_clue;
  }

  return modified;
}

/**
 * Get the "displayed" count for a resource type.
 * Use this when rendering resource counts to the player.
 *
 * @param {string} resourceType - 'food', 'medicine', 'clue', 'money'
 * @param {number} actualCount - the real count
 * @param {number} san - current SAN
 * @returns {number} inflated or accurate count for display
 */
export function getDisplayedResource(resourceType, actualCount, san) {
  var fraud = getResourceFraudState(san, null, {});
  if (!fraud.active) return actualCount;

  // Only inflate "positive" resources (what player has gained)
  // Never inflate consumption or losses
  var displayCount = Math.ceil(actualCount * fraud.displayMult);
  return Math.max(actualCount, displayCount); // Never show LESS than actual
}

/**
 * Get a subtle narrative hint that the fraud is happening.
 * Never explicit — just enough to make the player uneasy.
 *
 * @param {number} sanLevel - SAN stage level
 * @param {function} [rng] - seeded random
 * @returns {string|null} hint text or null
 */
export function getFraudNarrative(sanLevel, rng) {
  if (sanLevel < 3) return null;
  var _rand = rng ? rng.next.bind(rng) : Math.random;
  var hints = FRAUD_HINTS[sanLevel];
  if (!hints || hints.length === 0) return null;
  return hints[Math.floor(_rand() * hints.length)];
}

// ============================================================
// Internal helpers
// ============================================================

function pickFraudHint(level, rng) {
  var hints = FRAUD_HINTS[level];
  if (!hints || hints.length === 0) return null;
  var _rand = rng ? rng.next.bind(rng) : Math.random;
  return hints[Math.floor(_rand() * hints.length)];
}

/**
 * Check if a resource type is affected by fraud.
 * Consumption (food loss, item usage) is NOT affected.
 */
export function isResourceFraudAffected(resourceType) {
  return FRAUD_AFFECTED_TYPES.indexOf(resourceType) >= 0;
}
