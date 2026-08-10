// src/utils/triggeredSet.js — O(1) triggeredEvents 查询辅助
//
// triggeredEvents 是持久化数组（上限 1000），但 includes() 是 O(n) 扫描。
// 本模块提供并行 Set 结构，使存在性查询从 O(n) → O(1)。
//
// 用法：
//   1. rebuildTriggeredSet(state) — 从数组重建 Set（load/init 时调用一次）
//   2. syncTriggeredSet(state, id) — push 新事件后同步到 Set
//   3. hasTriggered(state, id) — O(1) 存在性查询

/**
 * 从 state.triggeredEvents 数组重建 _triggeredSet。
 * 在 loadGame / NEW_GAME / CONTINUE_GAME 后调用一次。
 * @param {object} state - 游戏状态
 * @returns {object} state（原地修改）
 */
export function rebuildTriggeredSet(state) {
  if (!state || !Array.isArray(state.triggeredEvents)) {
    state._triggeredSet = null;
    return state;
  }
  state._triggeredSet = new Set(state.triggeredEvents);
  return state;
}

/**
 * 新事件 push 后同步到 Set。
 * @param {object} state - 游戏状态
 * @param {string} id - 事件 ID
 * @returns {object} state（原地修改）
 */
export function syncTriggeredSet(state, id) {
  if (!state) return state;
  if (!state._triggeredSet) rebuildTriggeredSet(state);
  if (state._triggeredSet) state._triggeredSet.add(id);
  return state;
}

/**
 * O(1) 存在性查询。
 * 如果 _triggeredSet 可用（load/init 后已重建），走 Set.has；
 * 否则 fallback 到 array.includes（如刚 NEW_GAME 尚未 rebuild 的场景）。
 * @param {object} state - 游戏状态
 * @param {string} id - 事件 ID
 * @returns {boolean}
 */
export function hasTriggered(state, id) {
  if (!state || !id) return false;
  if (state._triggeredSet) return state._triggeredSet.has(id);
  const arr = state.triggeredEvents;
  return arr ? arr.includes(id) : false;
}

/**
 * 重建 triggeredSilentEvents 的并行 Set（同构）。
 * @param {object} state
 * @returns {object}
 */
export function rebuildSilentSet(state) {
  if (!state || !Array.isArray(state.triggeredSilentEvents)) {
    state._silentSet = null;
    return state;
  }
  state._silentSet = new Set(state.triggeredSilentEvents);
  return state;
}

/**
 * Append-time synchronization for triggeredSilentEvents.
 * Mirrors syncTriggeredSet so an already-built Set never hides new entries.
 */
export function syncSilentSet(state, id) {
  if (!state) return state;
  if (!state._silentSet) rebuildSilentSet(state);
  if (state._silentSet) state._silentSet.add(id);
  return state;
}

/**
 * O(1) 沉默事件查询。
 */
export function hasSilentTriggered(state, id) {
  if (!state || !id) return false;
  if (state._silentSet) return state._silentSet.has(id);
  const arr = state.triggeredSilentEvents;
  return arr ? arr.includes(id) : false;
}
