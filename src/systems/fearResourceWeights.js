// src/systems/fearResourceWeights.js - Fear-profile-driven resource generation
// SSOT for all fear-based resource weight modifications.
//
// Different fear profiles and coping styles produce different resource
// distributions: "survival fear" → more food, fewer SAN items;
// "knowledge fear" → more clues, less food, etc.
//
// Architecture:
//   getFearResourceWeights(fearTuning) → { food, medicine, clue, money, danger }
//   getFearResourceWeightModifier(evt, fearTuning) → number (weight multiplier)

import { FEAR_KEYS, COPING_KEYS, FEAR_LABELS, COPING_LABELS } from './fearProfile.js';

// ============================================================
// Fear → Resource Weight Mapping
// ============================================================
// Each fear type and coping style has preferences for resource types.
// Multipliers are relative to base rate (1.0 = neutral).

var FEAR_RESOURCE_PREFERENCES = {
  // Fear types
  ocean: {
    food: 0.8,       // 深海恐惧: 不关心食物，更关心感染/海洋
    medicine: 1.4,   // 更多药品（对抗感染）
    clue: 0.9,       // 知识被海洋的浩瀚淹没
    money: 0.9,      // 不太关心金钱
    danger: 1.2,     // 被海洋/水相关危险吸引
    description: '海洋的不可知让你囤积药品，食物只是维持生命的燃料',
  },
  body: {
    food: 0.7,       // 肉体恐怖: 身体 horror 影响食欲
    medicine: 1.5,   // 大量药品（对抗身体腐化/感染）
    clue: 0.8,       // 不想深入研究身体的变化
    money: 0.9,
    danger: 1.1,     // 被肉体恐怖事件吸引（无法移开视线）
    description: '你害怕自己的身体出问题，药品成了最重要的资源',
  },
  control: {
    food: 0.9,       // 控制恐惧: 基本生存需求被优先级降低
    medicine: 0.9,
    clue: 1.4,       // 知识=控制，拼命收集线索
    money: 1.1,      // 金钱=掌控经济的秩序
    danger: 1.0,     // 相对均衡
    description: '你需要知识来重获掌控，线索比食物更重要',
  },
  isolation: {
    food: 1.4,       // 孤立恐惧: 囤积食物（安全屋生存）
    medicine: 1.1,   // 储备药品以备不测
    clue: 0.8,       // 没人可以交流，线索用处减少
    money: 0.8,      // 与外界隔绝，金钱贬值
    danger: 0.9,     // 倾向回避危险
    description: '你躲在安全屋里，食物是你唯一能控制的东西',
  },
  knowledge: {
    food: 0.7,       // 知识成瘾: 忘了吃饭
    medicine: 0.9,
    clue: 1.5,       // 渴望更多禁忌知识
    money: 0.8,      // 知识比金钱重要
    danger: 1.2,     // 被禁忌知识吸引（即使危险）
    description: '知识的诱惑让你废寝忘食，线索是唯一的追求',
  },
  morality: {
    food: 1.2,       // 道德恐惧: 帮助他人获得食物（NPC 馈赠）
    medicine: 1.0,
    clue: 0.9,       // 不太主动调查（怕发现令人不安的真相）
    money: 0.8,      // 把钱分给了别人
    danger: 0.8,     // 回避高风险行为
    description: '你在善恶之间挣扎，食物来自你帮助过的人',
  },
};

var COPING_RESOURCE_PREFERENCES = {
  avoidant: {
    food: 1.3,       // 回避: 囤积食物，躲在安全屋
    medicine: 1.1,   // 储备医疗
    clue: 0.7,       // 不调查，不深入
    money: 0.9,
    danger: 0.7,     // 主动回避危险区域
    description: '你选择避开危险，食物和药品是你的防线',
  },
  investigative: {
    food: 0.7,       // 调查者: 调查时忘记吃饭
    medicine: 0.9,
    clue: 1.5,       // 拼命寻找线索
    money: 1.0,
    danger: 1.2,     // 主动深入危险区域
    description: '真相比生存更重要，线索是你的食粮',
  },
  social: {
    food: 1.3,       // 社交: NPC 馈赠食物
    medicine: 1.0,
    clue: 0.9,       // 线索来自对话而非调查
    money: 1.1,      // 社交带来经济机会
    danger: 0.8,     // 倾向于结伴而非独闯
    description: '人际关系是你的生存策略，食物来自信任',
  },
  controlling: {
    food: 1.2,       // 支配: 高效管理资源
    medicine: 1.1,
    clue: 1.1,       // 系统化收集线索
    money: 1.2,      // 经济掌控
    danger: 1.0,     // 精心策划的冒险
    description: '你试图控制一切，资源管理是你掌控世界的方式',
  },
  sacrificial: {
    food: 0.6,       // 牺牲: 把食物分给他人
    medicine: 0.8,   // 把药品让给更需要的人
    clue: 1.2,       // 牺牲行为解锁深层线索
    money: 0.7,      // 捐出金钱
    danger: 1.1,     // 愿意承担危险以保护他人
    description: '你为他人牺牲，资源总是流向别人',
  },
  predatory: {
    food: 1.4,       // 掠夺: 偷食物
    medicine: 1.1,   // 抢药品
    clue: 0.7,       // 不调查，直接抢
    money: 1.3,      // 掠夺金钱
    danger: 1.3,     // 主动攻击/利用
    description: '你从别人那里获取资源，效率很高但代价更大',
  },
};

// ============================================================
// Core API
// ============================================================

/**
 * Calculate combined resource weights from fear profile.
 * Blends primary fear (70%) + secondary fear (30%) + coping (20% additive).
 *
 * @param {{ primary: string|null, secondary: string|null, coping: string|null }} fearTuning
 * @returns {{ food: number, medicine: number, clue: number, money: number, danger: number, tags: string[] }}
 */
export function getFearResourceWeights(fearTuning) {
  if (!fearTuning || (!fearTuning.primary && !fearTuning.coping)) {
    return {
      food: 1.0, medicine: 1.0, clue: 1.0, money: 1.0, danger: 1.0,
      tags: [],
      description: '中性画像，无资源偏好',
    };
  }

  var weights = { food: 1.0, medicine: 1.0, clue: 1.0, money: 1.0, danger: 1.0 };
  var sources = [];

  // Primary fear (70% weight)
  if (fearTuning.primary && FEAR_RESOURCE_PREFERENCES[fearTuning.primary]) {
    var primaryPref = FEAR_RESOURCE_PREFERENCES[fearTuning.primary];
    for (var key in weights) {
      weights[key] = weights[key] * 0.7 + primaryPref[key] * 0.3;
    }
    sources.push(FEAR_LABELS[fearTuning.primary] || fearTuning.primary);
  }

  // Secondary fear (30% weight)
  if (fearTuning.secondary && FEAR_RESOURCE_PREFERENCES[fearTuning.secondary]) {
    var secondaryPref = FEAR_RESOURCE_PREFERENCES[fearTuning.secondary];
    for (var key in weights) {
      weights[key] = weights[key] * 0.7 + secondaryPref[key] * 0.3;
    }
    sources.push(FEAR_LABELS[fearTuning.secondary] || fearTuning.secondary);
  }

  // Coping style (20% additive boost to preferred resource)
  if (fearTuning.coping && COPING_RESOURCE_PREFERENCES[fearTuning.coping]) {
    var copingPref = COPING_RESOURCE_PREFERENCES[fearTuning.coping];
    for (var key in weights) {
      weights[key] = weights[key] * 0.8 + copingPref[key] * 0.2;
    }
    sources.push(COPING_LABELS[fearTuning.coping] || fearTuning.coping);
  }

  // Clamp to reasonable range [0.3, 2.0]
  for (var key in weights) {
    weights[key] = Math.max(0.3, Math.min(2.0, weights[key]));
  }

  // Generate descriptive tags for debugging/logging
  var tags = [];
  for (var key in weights) {
    if (weights[key] > 1.2) tags.push(key + '_heavy');
    else if (weights[key] < 0.8) tags.push(key + '_scarce');
  }

  var descriptions = [];
  if (fearTuning.primary && FEAR_RESOURCE_PREFERENCES[fearTuning.primary])
    descriptions.push(FEAR_RESOURCE_PREFERENCES[fearTuning.primary].description);
  if (fearTuning.coping && COPING_RESOURCE_PREFERENCES[fearTuning.coping])
    descriptions.push(COPING_RESOURCE_PREFERENCES[fearTuning.coping].description);

  return {
    ...weights,
    tags: tags,
    description: descriptions.join('；'),
    sources: sources,
    primary: fearTuning.primary,
    secondary: fearTuning.secondary,
    coping: fearTuning.coping,
  };
}

/**
 * Get weight modifier for a specific event based on fear profile.
 * Events that give food/medicine/clue/money get boosted or reduced
 * according to the player's fear-driven resource preferences.
 *
 * @param {object} evt - event object (has effects, tags, type)
 * @param {{ primary: string|null, secondary: string|null, coping: string|null }} fearTuning
 * @returns {number} weight multiplier (0.3 - 2.0)
 */
export function getFearResourceWeightModifier(evt, fearTuning) {
  if (!fearTuning || (!fearTuning.primary && !fearTuning.coping)) return 1.0;
  var weights = getFearResourceWeights(fearTuning);
  if (!evt || !evt.effects) return 1.0;

  var eff = evt.effects;
  var modifier = 1.0;

  // Map effect keys to resource types
  if (eff.food || eff.add_item?.name?.includes('食物') || eff.add_item?.name?.includes('药')) {
    // Food-related: blend food + medicine weights
    var foodWeight = weights.food;
    var medWeight = weights.medicine;
    modifier *= foodWeight * 0.7 + medWeight * 0.3;
  }
  if (eff.add_clue) {
    modifier *= weights.clue;
  }
  if (eff.money || eff.add_item?.name?.includes('钱') || eff.add_item?.name?.includes('币')) {
    modifier *= weights.money;
  }
  // Medicine items (identified by name pattern)
  if (eff.add_item && /药|med|治愈|止痛|消毒|绷带/.test(eff.add_item.name || '')) {
    modifier *= weights.medicine;
  }

  return Math.max(0.3, Math.min(2.0, modifier));
}

/**
 * Get a human-readable summary of the fear-driven resource profile.
 * For debug/logging purposes.
 *
 * @param {{ primary: string|null, secondary: string|null, coping: string|null }} fearTuning
 * @returns {{ summary: string, heavy: string[], scarce: string[] }}
 */
export function getFearResourceSummary(fearTuning) {
  var weights = getFearResourceWeights(fearTuning);
  var heavy = [];
  var scarce = [];
  var resourceNames = {
    food: '食物',
    medicine: '药品',
    clue: '线索',
    money: '金钱',
    danger: '危险事件',
  };

  for (var key in weights) {
    if (key === 'tags' || key === 'description' || key === 'sources' || key === 'primary' || key === 'secondary' || key === 'coping') continue;
    if (weights[key] >= 1.2) heavy.push(resourceNames[key] || key);
    else if (weights[key] <= 0.8) scarce.push(resourceNames[key] || key);
  }

  return {
    summary: weights.description,
    heavy: heavy,
    scarce: scarce,
    sources: weights.sources || [],
    weights: {
      food: Math.round(weights.food * 100) / 100,
      medicine: Math.round(weights.medicine * 100) / 100,
      clue: Math.round(weights.clue * 100) / 100,
      money: Math.round(weights.money * 100) / 100,
      danger: Math.round(weights.danger * 100) / 100,
    },
  };
}
