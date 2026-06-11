// src/engine/PollutionManager.js - Logic-level SAN corruption (SSOT)
// All SAN thresholds come from getCurrentSanStage() (defined in utils.js).
// Uses stage.level instead of hardcoded numbers.

// === Text Hallucination ===
// Activates at stage.level >= 2 (perception_shift, SAN 40-54)
export const HALLUCINATION_PAIRS = [
  ['灯光', '火光'], ['门', '裂缝'], ['声音', '低语'],
  ['海', '血'], ['雾', '眼'], ['人影', '它'], ['脚步', '心跳'],
  ['安全', '暂时'], ['正常', '熟悉'], ['记忆', '假设'],
  ['钟声', '呼吸'], ['墙壁', '皮肤'], ['窗户', '伤口'],
];

export function applyTextHallucination(text, san) {
  if (!text) return text;
  // SSOT: use stage level (need GD context for getCurrentSanStage)
  // Fallback: simple threshold for when ctx is unavailable
  if (san >= 55) return text;
  const chance = Math.max(0, (55 - san)) / 200;
  if (Math.random() > chance) return text;
  const pair = HALLUCINATION_PAIRS[Math.floor(Math.random() * HALLUCINATION_PAIRS.length)];
  const idx = text.indexOf(pair[0]);
  if (idx < 0) return text;
  return text.slice(0, idx) + pair[1] + text.slice(idx + pair[0].length);
}

// === Fake Event Injection ===
// Activates at stage.level >= 4 (reality_dissolution, SAN 10-24)
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

export function maybeGetFakeMessage(san, loopCount) {
  // SSOT: level >= 4 means SAN <= 24
  if (san > 24) return null;
  if (loopCount < 2 && san >= 10) return null;
  const chance = 0.03 + (24 - san) / 24 * 0.09;
  if (Math.random() > chance) return null;
  return FAKE_SYSTEM_MESSAGES[Math.floor(Math.random() * FAKE_SYSTEM_MESSAGES.length)];
}

// === Choice Delay Corruption ===
// Activates at stage.level >= 1 (mild_erosion, SAN 55-74)
export function getChoiceDelay(san) {
  if (san >= 75) return 0;
  return Math.floor((75 - san) / 75 * 350);
}

// === False Memory Insertion ===
// Activates at stage.level >= 3 (explanation_loss, SAN 25-39) + loop >= 2
export const FALSE_MEMORIES = [
  '你记得第 {day} 天你去过码头。但你的笔记本上没有记录。',
  '有人在你耳边说了什么。你转过头——没有人。但你记得那句话。',
  '你的口袋里多了一张纸条。笔迹是你的。你不记得写过。',
  '安全屋的墙上有一道划痕。你确定昨天没有。你确定吗？',
  '你记得吃过早饭。但食物没有少。',
  '你的鞋是湿的。你不记得踩过水。',
  '笔记本的最后一页多了一行字。不是你的笔迹。但签名是你的名字。',
];

export function maybeInsertFalseMemory(narr, san, loopCount, day) {
  // SSOT: level >= 3 means SAN <= 39
  if (san > 39 || loopCount < 2) return;
  if (Math.random() > 0.07) return;
  let text = FALSE_MEMORIES[Math.floor(Math.random() * FALSE_MEMORIES.length)];
  text = text.replace('{day}', String(Math.max(1, day - 1)));
  narr('system', text, { isSpecial: true, madness: { name: '虚假记忆', description: '你不确定什么是真的。' } });
}

// === Event Weight Corruption ===
// Activates at stage.level >= 2 (perception_shift, SAN 40-54)
export function corruptEventWeights(candidates, san) {
  if (san >= 55 || !candidates || candidates.length === 0) return candidates;
  return candidates.map(function(item) {
    let w = item.weight || 1;
    const evt = item.event || item;
    const type = evt.type || evt.event_classification || '';
    // SSOT: level 5 (narrative_death, SAN 1-9) — extreme corruption
    if (san <= 9) {
      if (['超自然遭遇', '怪物遭遇', 'mythos', 'meta'].includes(type)) w *= 1.8;
      if (['正常事件', 'NPC对话', '氛围事件'].includes(type)) w *= 0.4;
      w *= 0.5 + Math.random() * 1.5; // jitter
    }
    // SSOT: level 3-4 (explanation_loss/reality_dissolution, SAN 10-39)
    else if (san <= 39) {
      if (['超自然遭遇', '怪物遭遇', 'mythos'].includes(type)) w *= 1.3;
      if (['正常事件', '氛围事件'].includes(type)) w *= 0.7;
    }
    return { ...item, weight: Math.max(0.01, w) };
  });
}
