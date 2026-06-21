// src/state/difficultyState.js - 难度状态管理
import {
  getDifficultyConfig,
  getPhaseProtection,
  getMaxSanLoss,
  getSafeZoneDays,
  getStartingFood,
  getStartingAp,
  getWorkIncomeMin,
  getFoodPrice,
  getNegativeEventWeight,
  getEscapeReduction,
  getUnlockedModifiers,
  getDifficultyPhase,
  getDifficultyPhaseLabel,
  getDifficultySpecial,
} from '../config/difficulty.js';

const DIFFICULTY_STORAGE_KEY = 'coc_difficulty_level';

export function getSavedDifficulty() {
  try {
    const saved = localStorage.getItem(DIFFICULTY_STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 1;
  } catch {
    return 1;
  }
}

export function saveDifficulty(level) {
  try {
    localStorage.setItem(DIFFICULTY_STORAGE_KEY, level.toString());
  } catch (e) {
    console.error('Failed to save difficulty:', e);
  }
}

export function applyDifficultyToState(state, difficultyLevel) {
  const config = getDifficultyConfig(difficultyLevel);
  const maxSanLoss = getMaxSanLoss(difficultyLevel);
  const safeZoneDays = getSafeZoneDays(difficultyLevel);

  return {
    ...state,
    difficultyLevel,
    difficultyName: config.name,
    difficultyConfig: config,
    difficultyMaxSanLoss: maxSanLoss,
    difficultySafeZoneDays: safeZoneDays,
    // 新增维度字段
    difficultyStartingFood: getStartingFood(difficultyLevel),
    difficultyStartingAp: getStartingAp(difficultyLevel),
    difficultyWorkIncomeMin: getWorkIncomeMin(difficultyLevel),
    difficultyFoodPrice: getFoodPrice(difficultyLevel),
    difficultyNegativeEventWeight: getNegativeEventWeight(difficultyLevel),
    difficultyEscapeReduction: getEscapeReduction(difficultyLevel),
    difficultyPhase: getDifficultyPhase(difficultyLevel),
    difficultyPhaseLabel: getDifficultyPhaseLabel(difficultyLevel),
    difficultyUnlockedModifiers: getUnlockedModifiers(difficultyLevel),
    difficultySpecial: getDifficultySpecial(difficultyLevel),
  };
}

/**
 * 应用难度保护到伤害/损失值。
 * 使用 getPhaseProtection 按 day 查阶段保护倍率，
 * 安全区额外减半，最终限制在 difficultyMaxSanLoss 内。
 */
export function applyDifficultyProtection(loss, day, state) {
  const maxLoss = state.difficultyMaxSanLoss || 999;
  const safeZoneDays = state.difficultySafeZoneDays || 0;
  const level = state.difficultyLevel || 1;

  if (day <= safeZoneDays) {
    loss = Math.max(1, Math.round(loss * 0.5));
  }

  if (day > safeZoneDays) {
    const phaseProt = getPhaseProtection(level, day);
    loss = Math.max(1, Math.round(loss * phaseProt));
  }

  return Math.min(loss, maxLoss);
}

export function getDifficultyDisplayInfo(level) {
  const config = getDifficultyConfig(level);
  return {
    level,
    name: config.name,
    description: config.description,
    survival: config.expected_survival,
    days: config.expected_days,
    color: getDifficultyColor(level),
  };
}

function getDifficultyColor(level) {
  if (level <= 3) return '#4CAF50';
  if (level <= 6) return '#66BB6A';
  if (level <= 9) return '#FF9800';
  if (level <= 12) return '#F44336';
  return '#1A1A2E';
}
