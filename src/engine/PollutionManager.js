// src/engine/PollutionManager.js - Logic-level SAN corruption
// ENGINE CONTRACT: Zero game-specific imports. Stage lookup is injected.
// Callers pass getStage(san) → { level, id, ... } as the second parameter.
// No window.GD fallback — the engine never reaches outside its contract.

// === Text Hallucination ===
// Activates at stage.level >= 2 (perception_shift)
export const HALLUCINATION_PAIRS = [
  ['灯光', '火光'],
  ['门', '裂缝'],
  ['声音', '低语'],
  ['海', '血'],
  ['雾', '眼'],
  ['人影', '它'],
  ['脚步', '心跳'],
  ['安全', '暂时'],
  ['正常', '熟悉'],
  ['记忆', '假设'],
  ['钟声', '呼吸'],
  ['墙壁', '皮肤'],
  ['窗户', '伤口'],
];

/**
 * Apply text hallucination — swap one word for its uncanny pair.
 * @param {string} text
 * @param {number} san
 * @param {function} [getStage] — injected stage lookup (optional)
 */
export function applyTextHallucination(text, san, getStage, rng) {
  if (!text) return text;
  var stage = getStage ? getStage(san) : { level: 0, id: 'stable' };
  if (stage.level < 2) return text;
  var _rand = rng ? rng.next.bind(rng) : Math.random;
  var chance = Math.max(0, 55 - san) / 200;
  if (_rand() > chance) return text;
  var pair = HALLUCINATION_PAIRS[Math.floor(_rand() * HALLUCINATION_PAIRS.length)];
  var idx = text.indexOf(pair[0]);
  if (idx < 0) return text;
  return text.slice(0, idx) + pair[1] + text.slice(idx + pair[0].length);
}

// === Fake Event Injection ===
// Activates at stage.level >= 5 (reality_dissolution, SAN 15-29)
export const FAKE_SYSTEM_MESSAGES = [
  '你记得这个地方。但你确定你没有来过。',
  '有人在你身后。你回头——没有人。但椅子的角度变了。',
  '你口袋里的笔记本翻到了一页你不记得写过的笔记。',
  '安全屋的门没有锁。你确定你锁了。',
  '你的影子比你慢了半秒。',
  '窗外有人在看着你。你走到窗前——只有雾。',
  '你听到了自己的名字。不是叫你——是在讨论你。',
  '你的手在发抖。不是因为冷。是因为你刚刚做了什么，但你不记得了。',
];

/**
 * Maybe generate a fake system message (reality_dissolution+).
 * @param {number} san
 * @param {number} loopCount
 * @param {function} [getStage] — injected stage lookup
 * @returns {string|null}
 */
export function maybeGetFakeMessage(san, loopCount, getStage, rng) {
  var stage = getStage ? getStage(san) : { level: 0, id: 'stable' };
  if (stage.level < 5) return null; // reality_dissolution+
  if (loopCount < 2 && stage.level < 6) return null; // narrative_death bypasses loop req
  var _rand = rng ? rng.next.bind(rng) : Math.random;
  var chance = 0.03 + ((29 - san) / 29) * 0.09;
  if (_rand() > chance) return null;
  return FAKE_SYSTEM_MESSAGES[Math.floor(_rand() * FAKE_SYSTEM_MESSAGES.length)];
}

// === Choice Delay Corruption ===
// Activates at stage.level >= 1 (mild_erosion)
/**
 * @param {number} san
 * @param {function} [getStage] — injected stage lookup
 * @returns {number} delay in ms
 */
export function getChoiceDelay(san, getStage) {
  var stage = getStage ? getStage(san) : { level: 0, id: 'stable' };
  if (stage.level < 1) return 0;
  return Math.floor(((75 - san) / 75) * 350);
}

// === False Memory Insertion ===
// Activates at stage.level >= 3 (explanation_loss, SAN 40-49) + loop >= 2
export const FALSE_MEMORIES = [
  '你记得第 {day} 天你去过码头。但你的笔记本上没有记录。',
  '有人在你耳边说了什么。你转过头——没有人。但你记得那句话。',
  '你的口袋里多了一张纸条。笔迹是你的。你不记得写过。',
  '安全屋的墙上有一道划痕。你确定昨天没有。你确定吗？',
  '你记得吃过早饭。但食物没有少。',
  '你的鞋是湿的。你不记得踩过水。',
  '笔记本的最后一页多了一行字。不是你的笔迹。但签名是你的名字。',
];

/**
 * Maybe insert a false memory narrative (explanation_loss+ + loop >= 2).
 * @param {function} narr
 * @param {number} san
 * @param {number} loopCount
 * @param {number} day
 * @param {function} [getStage] — injected stage lookup
 */
export function maybeInsertFalseMemory(narr, san, loopCount, day, getStage, rng) {
  var stage = getStage ? getStage(san) : { level: 0, id: 'stable' };
  if (stage.level < 3 || loopCount < 2) return;
  var _rand = rng ? rng.next.bind(rng) : Math.random;
  if (_rand() > 0.07) return;
  var text = FALSE_MEMORIES[Math.floor(_rand() * FALSE_MEMORIES.length)];
  text = text.replace('{day}', String(Math.max(1, day - 1)));
  narr('system', text, {
    isSpecial: true,
    madness: { name: '虚假记忆', description: '你不确定什么是真的。' },
  });
}

