// src/config/difficulty.js — 难度配置系统（13级）
// 唯一数据源: difficultyLevels.json
// 本模块仅做 JSON 导入 + 便捷访问函数，不维护任何公式/副本
//
// ESM JSON import 兼容性处理:
//   - Node.js ESM: 使用动态 import + assert { type: 'json' }
//   - Vite bundler: 静态 import 由 Vite 原生处理

import { DIFFICULTY_LEVELS_RAW } from './difficultyLevels.js';

// 将 JSON 的 string-keyed 对象转为 number-keyed，方便按 level 查找
export const DIFFICULTY_LEVELS = Object.fromEntries(
  Object.entries(DIFFICULTY_LEVELS_RAW).map(([k, v]) => [Number(k), v])
);

export function getDifficultyConfig(level) {
  return DIFFICULTY_LEVELS[level] || DIFFICULTY_LEVELS[1];
}

/**
 * 根据当前 day 返回该难度下的阶段保护倍率。
 * JSON 的 san_protection / hp_protection 是分阶段对象，
 * 这里把 day 映射到对应阶段，取该阶段的保护值。
 */
export function getPhaseProtection(level, day) {
  const cfg = getDifficultyConfig(level);
  const prot = cfg.san_protection || cfg.hp_protection || {};
  const phaseMap = [
    { range: [1, 3],   key: 'day_1_3' },
    { range: [4, 7],   key: 'day_4_7' },
    { range: [8, 14],  key: 'day_8_14' },
    { range: [15, 21], key: 'day_15_21' },
    { range: [22, 28], key: 'day_22_28' },
  ];
  for (const phase of phaseMap) {
    if (day >= phase.range[0] && day <= phase.range[1]) {
      return prot[phase.key] ?? 1.0;
    }
  }
  return 1.0;
}

export function getMaxSanLoss(level) {
  // Level 13 (十三钟响): 无限制
  if (level >= 13) return 999;
  return Math.min(999, Math.round(3 + (level - 1) * 0.5));
}

export function getSafeZoneDays(level) {
  const cfg = getDifficultyConfig(level);
  return cfg.safe_zone_restriction ?? 0;
}

// ── 新增维度 getters（7 个难度维度） ──

export function getStartingFood(level) {
  return getDifficultyConfig(level).starting_food ?? 3;
}

export function getStartingAp(level) {
  return getDifficultyConfig(level).starting_ap ?? 12;
}

export function getWorkIncomeMin(level) {
  return getDifficultyConfig(level).work_income_min ?? 3;
}

export function getFoodPrice(level) {
  return getDifficultyConfig(level).food_price ?? 3;
}

export function getNegativeEventWeight(level) {
  return getDifficultyConfig(level).negative_event_weight ?? 1.0;
}

export function getEscapeReduction(level) {
  return getDifficultyConfig(level).escape_reduction ?? 0;
}

export function getUnlockedModifiers(level) {
  return getDifficultyConfig(level).unlocks ?? [];
}

export function getDifficultyPhase(level) {
  return getDifficultyConfig(level).phase ?? 1;
}

export function getDifficultyPhaseLabel(level) {
  return getDifficultyConfig(level).phase_label ?? '';
}

export function getDifficultySpecial(level) {
  return getDifficultyConfig(level).special ?? null;
}
