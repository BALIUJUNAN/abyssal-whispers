// src/config/difficulty.js - 难度配置系统
// 21级难度，从Level 1(普通)到Level 21(v1原版)

export const DIFFICULTY_LEVELS = {
  1: { name: '普通', description: '标准难度，适合大多数玩家', survival: '25-35%', days: '20-22' },
  2: { name: '困难', description: '更具挑战性', survival: '15-20%', days: '17-19' },
  3: { name: '噩梦', description: '高难度挑战', survival: '8-12%', days: '14-16' },
  4: { name: '普通+', description: '比普通略难', survival: '20-25%', days: '19-21' },
  5: { name: '普通++', description: '普通难度上限', survival: '15-20%', days: '17-19' },
  6: { name: '挑战', description: '进入挑战区', survival: '12-15%', days: '16-18' },
  7: { name: '挑战+', description: '需要策略规划', survival: '10-12%', days: '15-17' },
  8: { name: '挑战++', description: '中等硬核', survival: '8-10%', days: '14-16' },
  9: { name: '硬核', description: '硬核玩家入门', survival: '6-8%', days: '13-15' },
  10: { name: '硬核+', description: '需要精打细算', survival: '5-6%', days: '12-14' },
  11: { name: '硬核++', description: '高难度开始', survival: '4-5%', days: '11-13' },
  12: { name: '专家', description: '专家级难度', survival: '3-4%', days: '10-12' },
  13: { name: '专家+', description: '需要深入了解机制', survival: '2-3%', days: '9-11' },
  14: { name: '专家++', description: '接近极限', survival: '2-3%', days: '9-10' },
  15: { name: '大师', description: '大师级挑战', survival: '2-3%', days: '8-10' },
  16: { name: '大师+', description: '极致挑战', survival: '2-3%', days: '8-10' },
  17: { name: '大师++', description: '接近v1难度', survival: '2-3%', days: '8-9' },
  18: { name: '传说', description: '传说级难度', survival: '2-3%', days: '8-9' },
  19: { name: '传说+', description: '超越极限', survival: '2-3%', days: '8-9' },
  20: { name: '传说++', description: '接近原版', survival: '2-3%', days: '8-9' },
  21: { name: 'v1原版', description: '原始v1难度，无任何保护', survival: '2-3%', days: '8-9' }
};

export function getDifficultyConfig(level) {
  return DIFFICULTY_LEVELS[level] || DIFFICULTY_LEVELS[1];
}

export function getProtectionMultiplier(level) {
  // Level 1: 0.35, Level 21: 1.0 (无保护)
  return Math.min(1.0, 0.35 + (level - 1) * 0.035);
}

export function getMaxSanLoss(level) {
  // Level 1: 3, Level 21: 999
  if (level >= 21) return 999;
  return Math.min(999, 3 + Math.floor((level - 1) * 0.5));
}

export function getSafeZoneDays(level) {
  // Level 1: 6天, Level 21: 0天
  if (level >= 21) return 0;
  return Math.max(0, 6 - Math.floor((level - 1) * 0.3));
}
