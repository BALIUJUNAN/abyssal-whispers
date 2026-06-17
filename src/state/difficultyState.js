// src/state/difficultyState.js - 难度状态管理
import { getDifficultyConfig, getProtectionMultiplier, getMaxSanLoss, getSafeZoneDays } from '../config/difficulty.js';

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
  const protection = getProtectionMultiplier(difficultyLevel);
  const maxSanLoss = getMaxSanLoss(difficultyLevel);
  const safeZoneDays = getSafeZoneDays(difficultyLevel);

  return {
    ...state,
    difficultyLevel,
    difficultyName: config.name,
    difficultyProtection: protection,
    difficultyMaxSanLoss: maxSanLoss,
    difficultySafeZoneDays: safeZoneDays,
    // 应用难度修正到SAN损失
    _difficultySanMultiplier: protection,
    _difficultyHpMultiplier: protection,
  };
}

export function applyDifficultyProtection(loss, day, state) {
  const protection = state.difficultyProtection || 1.0;
  const maxLoss = state.difficultyMaxSanLoss || 999;
  const safeZoneDays = state.difficultySafeZoneDays || 0;

  // 安全区期间减少损失
  if (day <= safeZoneDays) {
    loss = Math.max(1, Math.round(loss * 0.5));
  }

  // 应用难度保护
  loss = Math.max(1, Math.round(loss * protection));

  // 限制最大损失
  return Math.min(loss, maxLoss);
}

export function getDifficultyDisplayInfo(level) {
  const config = getDifficultyConfig(level);
  return {
    level,
    name: config.name,
    description: config.description,
    survival: config.survival,
    days: config.days,
    color: getDifficultyColor(level)
  };
}

function getDifficultyColor(level) {
  if (level <= 3) return '#4CAF50';
  if (level <= 9) return '#FF9800';
  if (level <= 15) return '#F44336';
  return '#9C27B0';
}
