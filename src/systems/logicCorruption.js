// src/systems/logicCorruption.js - Logic-level SAN corruption
// Phase 3: Low SAN corrupts event selection, choice timing, and memory.
// These effects make the game itself feel unreliable at low sanity.

// === Text Hallucination ===
// Substitutes keywords in event descriptions to create cognitive dissonance.
export const HALLUCINATION_PAIRS = [
  ['灯光', '火光'], ['门', '裂缝'], ['声音', '低语'],
  ['海', '血'], ['雾', '眼'], ['人影', '它'], ['脚步', '心跳'],
  ['安全', '暂时'], ['正常', '熟悉'], ['记忆', '假设'],
  ['钟声', '呼吸'], ['墙壁', '皮肤'], ['窗户', '伤口'],
];

/**
 * Apply text hallucination to an event description.
 * Only activates at SAN < 40. Probability scales with SAN.
 *
 * @param {string} text - original event description
 * @param {number} san  - current SAN value
 * @returns {string} possibly corrupted text
 */
export function applyTextHallucination(text, san) {
  if (san >= 40 || !text) return text;
  const chance = (40 - san) / 200; // 0-20% at SAN 0
  if (Math.random() > chance) return text;

  // Pick one random hallucination pair
  const pair = HALLUCINATION_PAIRS[Math.floor(Math.random() * HALLUCINATION_PAIRS.length)];
  // Only replace first occurrence to keep it subtle
  const idx = text.indexOf(pair[0]);
  if (idx < 0) return text;
  return text.slice(0, idx) + pair[1] + text.slice(idx + pair[0].length);
}

// === Fake Event Injection ===
// At very low SAN, inject phantom narrative entries that the player didn't trigger.
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
 * Check if a fake system message should be injected into the narrative.
 * Returns null if no fake message, or the message string.
 *
 * @param {number} san      - current SAN value
 * @param {number} loopCount - current loop count
 * @returns {string|null} fake message or null
 */
export function maybeGetFakeMessage(san, loopCount) {
  if (san >= 25) return null;
  if (loopCount < 2 && san >= 15) return null;

  // Probability: 3% at SAN 24, up to 12% at SAN 0
  const chance = 0.03 + (25 - san) / 25 * 0.09;
  if (Math.random() > chance) return null;

  return FAKE_SYSTEM_MESSAGES[Math.floor(Math.random() * FAKE_SYSTEM_MESSAGES.length)];
}

// === Choice Delay Corruption ===
// At low SAN, button clicks have a micro-delay, creating unease.

/**
 * Get the delay in ms before a choice takes effect.
 * Returns 0 at SAN >= 60, up to 350ms at SAN 0.
 *
 * @param {number} san - current SAN value
 * @returns {number} delay in ms
 */
export function getChoiceDelay(san) {
  if (san >= 60) return 0;
  return Math.floor((60 - san) / 60 * 350);
}

// === False Memory Insertion ===
// At low SAN + high loop, insert memories that may or may not be real.
export const FALSE_MEMORIES = [
  '你记得第 {day} 天你去过码头。但你的笔记本上没有记录。',
  '有人在你耳边说了什么。你转过头——没有人。但你记得那句话。你只是想不起来是什么。',
  '你的口袋里多了一张纸条。笔迹是你的。你不记得写过。',
  '安全屋的墙上有一道划痕。你确定昨天没有。你确定吗？',
  '你记得吃过早饭。但食物没有少。',
  '你的鞋是湿的。你不记得踩过水。',
  '笔记本的最后一页多了一行字。不是你的笔迹。但签名是你的名字。',
];

/**
 * Check if a false memory should be inserted into the narrative.
 * Uses the narr() function to add the memory directly.
 *
 * @param {Function} narr      - narrative push function
 * @param {number} san         - current SAN value
 * @param {number} loopCount   - current loop count
 * @param {number} day         - current day
 */
export function maybeInsertFalseMemory(narr, san, loopCount, day) {
  if (san >= 30 || loopCount < 2) return;
  if (Math.random() > 0.07) return; // 7% chance

  let text = FALSE_MEMORIES[Math.floor(Math.random() * FALSE_MEMORIES.length)];
  text = text.replace('{day}', String(Math.max(1, day - 1)));

  narr('system', text, {
    isSpecial: true,
    madness: { name: '虚假记忆', description: '你不确定什么是真的。' }
  });
}

// === Event Weight Corruption ===
// At low SAN, subtly distort event weights to favor fear-relevant events.

/**
 * Apply SAN-based weight corruption to event candidates.
 * Does NOT modify the original array; returns a new array with adjusted weights.
 *
 * @param {Array} candidates - array of {event, weight} objects
 * @param {number} san       - current SAN value
 * @returns {Array} new array with adjusted weights
 */
export function corruptEventWeights(candidates, san) {
  if (san >= 40 || !candidates || candidates.length === 0) return candidates;

  return candidates.map(item => {
    let w = item.weight || 1;
    const evt = item.event || item;
    const type = evt.type || evt.event_classification || '';

    // At low SAN, horror events get boosted, normal events get suppressed
    if (san < 20) {
      if (['超自然遭遇', '怪物遭遇', 'mythos', 'meta'].includes(type)) w *= 1.8;
      if (['正常事件', 'NPC对话', '氛围事件'].includes(type)) w *= 0.4;
    } else if (san < 35) {
      if (['超自然遭遇', '怪物遭遇', 'mythos'].includes(type)) w *= 1.3;
      if (['正常事件', '氛围事件'].includes(type)) w *= 0.7;
    }

    // Random jitter at very low SAN (the world becomes unpredictable)
    if (san < 15) {
      w *= 0.5 + Math.random() * 1.5; // 50%-150% random multiplier
    }

    return { ...item, weight: Math.max(0.01, w) };
  });
}
