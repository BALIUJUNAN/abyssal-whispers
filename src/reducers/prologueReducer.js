// src/reducers/prologueReducer.js - 前传状态管理
// 处理前传相关的reducer actions

import { PROLOGUE_EVENTS } from '../data/prologue_events.js';
import {
  applyPrologueChoice,
  calculateFearTuning,
  generateFearFlags,
  getNeutralTuning,
} from '../systems/fearProfile.js';

/**
 * 获取当前前传场景的事件数据
 * @param {string} sceneId - 场景ID (e.g. 'station')
 * @returns {object|null} PROLOGUE_EVENTS中的对应事件
 */
export function getPrologueEvent(sceneId) {
  const eventId = 'prologue_' + sceneId;
  return PROLOGUE_EVENTS.find((e) => e.id === eventId) || null;
}

/**
 * 获取前传场景ID列表（按顺序）
 */
export function getPrologueSceneOrder() {
  return ['station', 'inn', 'corridor', 'mirror', 'cry', 'notebook', 'dawn'];
}

/**
 * 获取下一个场景ID
 * @param {string} currentScene
 * @returns {string|null}
 */
export function getNextScene(currentScene) {
  const order = getPrologueSceneOrder();
  const idx = order.indexOf(currentScene);
  if (idx < 0 || idx >= order.length - 1) return null;
  return order[idx + 1];
}

/**
 * 初始化前传state
 */
export function initPrologueState() {
  return {
    completed: false,
    currentScene: 'station',
    fearProfile: {
      ocean: 0,
      body: 0,
      control: 0,
      isolation: 0,
      knowledge: 0,
      morality: 0,
    },
    copingProfile: {
      avoidant: 0,
      investigative: 0,
      social: 0,
      controlling: 0,
      sacrificial: 0,
      predatory: 0,
    },
    choicesMade: [],
    resultingFlags: [],
  };
}

/**
 * 处理前传选择 — 纯函数风格，返回 { state, narration, nextScene, completed }
 * 不修改传入的 state，而是返回一个新 state。
 *
 * @param {object} state    - 当前游戏 state（不会被修改）
 * @param {string} choiceId - 选择ID
 * @returns {{ state: object, narration: object[], nextScene: string|null, completed: boolean }}
 */
export function handlePrologueChoice(state, choiceId) {
  const prologue = state.prologue;
  if (!prologue || prologue.completed)
    return { state, narration: [], nextScene: null, completed: true };

  const currentEvent = getPrologueEvent(prologue.currentScene);
  if (!currentEvent) return { state, narration: [], nextScene: null, completed: true };

  const choice = currentEvent.choices.find((c) => c.id === choiceId);
  if (!choice) return { state, narration: [], nextScene: null, completed: false };

  // --- 开始构建新 state（不可变） ---
  let s = state;

  // 1) 应用恐惧倾向（返回新 prologue）
  let newPrologue = prologue;
  if (choice.fear) {
    newPrologue = applyPrologueChoice(prologue, choice.fear, choiceId);
  }

  // 2) 统一线索处理：从 effects.add_clue 读取
  //    add_clue 可以是 { id, name } 对象或纯字符串（向后兼容）
  const clueRaw = choice.effects && choice.effects.add_clue;
  const clueId = clueRaw && typeof clueRaw === 'object' ? clueRaw.id : clueRaw;
  const clueName = clueRaw && typeof clueRaw === 'object' ? clueRaw.name : clueRaw;
  if (clueId && !(s.clues || []).includes(clueId)) {
    s = { ...s, clues: [...s.clues, clueId] };
  }

  // 3) 应用SAN效果
  if (choice.effects && choice.effects.san) {
    s = { ...s, san: Math.max(0, Math.min(s.maxSan, s.san + choice.effects.san)) };
  }

  // 4) 将更新后的 prologue 挂回 state
  s = { ...s, prologue: newPrologue };

  // --- 构建叙述文本 ---
  const narration = [];

  // 显示选择结果文本
  if (choice.text) {
    narration.push({ type: 'event', text: choice.text });
  }

  // SAN变化提示
  if (choice.effects && choice.effects.san && choice.effects.san < 0) {
    narration.push({ type: 'system', text: 'SAN ' + choice.effects.san, isEffect: true });
  }

  // 线索记录提示（显示中文名，存储稳定ID）
  if (clueId) {
    narration.push({
      type: 'system',
      text: '【线索记录】' + (clueName || clueId),
      isSpecial: true,
    });
  }

  // AP消耗提示（如果有的话）
  if (choice.cost && choice.cost > 0) {
    narration.push({ type: 'system', text: '行动点 -' + choice.cost });
  }

  // --- 判断是否是最后一个场景的最终选择 ---
  if (choice.isFinal) {
    const tuning = calculateFearTuning(newPrologue);
    const flags = generateFearFlags(tuning);

    const completedPrologue = { ...newPrologue, resultingFlags: flags, completed: true };

    // 将flags加入triggeredEvents（隐藏标记）
    const newTriggered = [...s.triggeredEvents];
    for (const flag of flags) {
      if (!newTriggered.includes(flag)) newTriggered.push(flag);
    }

    s = {
      ...s,
      fearTuning: tuning,
      prologue: completedPrologue,
      triggeredEvents: newTriggered,
    };

    narration.push({ type: 'system', text: '档案已建立。', isSpecial: true });
    narration.push({ type: 'system', text: '有些记录会比你更早抵达沃切斯特。' });
    narration.push({ type: 'system', text: '你没有告诉任何人这一夜发生过什么。' });

    return { state: s, narration, nextScene: null, completed: true };
  }

  // --- 推进到下一个场景 ---
  const nextScene = getNextScene(newPrologue.currentScene);
  s = { ...s, prologue: { ...s.prologue, currentScene: nextScene } };

  // 如果有下一个场景，显示场景过渡提示
  if (nextScene) {
    const nextEvent = getPrologueEvent(nextScene);
    if (nextEvent) {
      narration.push({ type: 'system', text: '\n═══ ' + nextEvent.name + ' ═══' });
      if (nextEvent.tutorial_hint) {
        narration.push({ type: 'system', text: nextEvent.tutorial_hint, isSpecial: true });
      }
    }
  }

  return { state: s, narration, nextScene, completed: false };
}

/**
 * 处理跳过前传
 * @param {object} state - 游戏state
 */
export function handleSkipPrologue(state) {
  if (!state.prologue) state.prologue = initPrologueState();

  // Bugfix: 仅当尚无画像时才设置中性值。
  // 多周目场景下 NEW_GAME 已将上一轮 fearTuning 搬入新 state，
  // 如果此时用中性值覆盖，玩家前传的个性化画像就丢失了。
  if (!state.fearTuning) {
    state.fearTuning = getNeutralTuning();
  }
  state.prologue.completed = true;
  state.prologue.resultingFlags = [];

  return state;
}
