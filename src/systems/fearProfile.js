// src/systems/fearProfile.js - 前传恐惧画像系统
// 计算玩家的恐惧倾向和应对方式，生成隐藏flags

export const FEAR_KEYS = ['ocean', 'body', 'control', 'isolation', 'knowledge', 'morality'];
export const COPING_KEYS = ['avoidant', 'investigative', 'social', 'controlling', 'sacrificial', 'predatory'];

/**
 * 不可变地将前传选择的恐惧倾向应用到 prologue 对象。
 * 返回全新的 prologue，不修改传入引用。
 *
 * @param {object} prologue - state.prologue（不会被修改）
 * @param {object} fear     - { ocean: +1, investigative: +1, ... }
 * @param {string} choiceId - 选择ID
 * @returns {object} 新的 prologue 对象
 */
export function applyPrologueChoice(prologue, fear, choiceId) {
  if (!prologue) return prologue;
  if (!fear || typeof fear !== 'object') return prologue;

  // 构建新的 fearProfile
  const oldFp = prologue.fearProfile || {};
  const newFp = { ...oldFp };
  for (const key of FEAR_KEYS) {
    if (fear[key]) newFp[key] = (oldFp[key] || 0) + fear[key];
  }

  // 构建新的 copingProfile
  const oldCp = prologue.copingProfile || {};
  const newCp = { ...oldCp };
  for (const key of COPING_KEYS) {
    if (fear[key]) newCp[key] = (oldCp[key] || 0) + fear[key];
  }

  // 返回新对象，保持原引用不变
  return {
    ...prologue,
    fearProfile: newFp,
    copingProfile: newCp,
    choicesMade: [...prologue.choicesMade, choiceId]
  };
}

/**
 * 根据prologue的fearProfile和copingProfile计算最终画像
 * @param {object} prologue - state.prologue
 * @returns {{ primary: string|null, secondary: string|null, coping: string|null }}
 */
export function calculateFearTuning(prologue) {
  if (!prologue) return { primary: null, secondary: null, coping: null };

  const fp = prologue.fearProfile || {};
  const cp = prologue.copingProfile || {};

  // 找出fearProfile中最高的两个
  const fearEntries = Object.entries(fp)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  const primary = fearEntries.length > 0 ? fearEntries[0][0] : null;
  const secondary = fearEntries.length > 1 ? fearEntries[1][0] : null;

  // 找出copingProfile中最高的
  const copingEntries = Object.entries(cp)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  const coping = copingEntries.length > 0 ? copingEntries[0][0] : null;

  return { primary, secondary, coping };
}

/**
 * 根据fearTuning生成隐藏flags
 * @param {{ primary: string|null, secondary: string|null, coping: string|null }} tuning
 * @returns {string[]} flags数组
 */
export function generateFearFlags(tuning) {
  const flags = [];
  if (tuning.primary) flags.push('fear_' + tuning.primary + '_primary');
  if (tuning.secondary) flags.push('fear_' + tuning.secondary + '_secondary');
  if (tuning.coping) flags.push('coping_' + tuning.coping);
  return flags;
}

/**
 * 生成跳过前传的中性画像
 * @returns {{ primary: null, secondary: null, coping: null }}
 */
export function getNeutralTuning() {
  return { primary: null, secondary: null, coping: null };
}

/**
 * 获取恐惧类型的中文描述（仅用于内部参考，不在UI显示）
 */
export const FEAR_LABELS = {
  ocean: '深海',
  body: '肉体',
  control: '控制',
  isolation: '孤立',
  knowledge: '知识',
  morality: '道德'
};

export const COPING_LABELS = {
  avoidant: '回避',
  investigative: '调查',
  social: '社交',
  controlling: '支配',
  sacrificial: '牺牲',
  predatory: '掠夺'
};