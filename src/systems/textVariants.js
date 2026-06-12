// src/systems/textVariants.js — Control text repetition across loops
// Readability always comes before flair.
//
// Tier 1 (seen=0):  Normal text. Always show.
// Tier 2 (seen=1):  Subtle hint of looping — one word shifts, a familiar unease.
// Tier 3 (seen=2):  Noticeable corruption — but still readable.
// Tier 4 (seen>=3): Allow skip. Show a one-line summary instead.

/**
 * Track seen texts and decide whether to show variant or skip.
 * @param {string} textId     - unique text identifier
 * @param {string} baseText   - original text
 * @param {number} pollution  - current pollution (0-1)
 * @param {number} loopCount  - current loop count
 * @param {object} seenMap    - { textId: timesSeen } mutable tracking map
 * @returns {{ text, action, tier }} action: 'show' | 'variant' | 'skip'
 */
export function getTrackedText(textId, baseText, pollution, loopCount, seenMap) {
  const seen = seenMap[textId] || 0;
  seenMap[textId] = seen + 1;

  // Tier 1: first time — always show full text
  if (seen === 0) return { text: baseText, action: 'show', tier: 1 };

  // Tier 2: second time — subtle looping hint (only if pollution present)
  if (seen === 1 && pollution >= 0.2) {
    return { text: _applySubtleShift(baseText), action: 'variant', tier: 2 };
  }

  // Tier 3: third time — readable corruption (requires some pollution)
  if (seen === 2 && pollution >= 0.15) {
    return { text: _applyReadableCorruption(baseText, pollution), action: 'variant', tier: 3 };
  }

  // Tier 4: fourth+ time — skip with summary
  if (seen >= 3) {
    return { text: _buildSummary(baseText), action: 'skip', tier: 4 };
  }

  return { text: baseText, action: 'show', tier: 1 };
}

// ═══════════════════════════════════════════════════════
// Tier 2: Subtle shift — one detail changes
// "你走进了码头区。海风带着盐味。" → "你走进了码头区。海风带着铁锈味。"
// ═══════════════════════════════════════════════════════

const SUBTLE_SWAPS = [
  ['盐味', '铁锈味'], ['温暖', '潮湿'], ['安静', '太安静了'],
  ['熟悉', '似曾相识'], ['远处', '很近的地方'], ['阳光', '灰白的光'],
  ['正常', '不太对'], ['新的', '旧的'], ['第一次', '又一次'],
  ['海风', '风'], ['灯亮着', '灯在闪'], ['有人', '好像有人'],
];

function _applySubtleShift(text) {
  if (!text) return text;
  // Pick one swap that matches
  for (const [from, to] of SUBTLE_SWAPS) {
    if (text.includes(from)) {
      return text.replace(from, to);
    }
  }
  // Fallback: append a faint echo
  if (text.length > 10) {
    const lastSentence = text.split(/[。！？]/).filter(Boolean).pop() || '';
    if (lastSentence.length > 3) {
      return text + '\n（' + lastSentence.trim().slice(0, 6) + '……？）';
    }
  }
  return text;
}

// ═══════════════════════════════════════════════════════
// Tier 3: Readable corruption — still understandable
// Replaces a few characters, adds atmospheric markers.
// Never replaces more than 3% of characters. Never blocks readability.
// ═══════════════════════════════════════════════════════

function _applyReadableCorruption(text, pollution) {
  if (!text) return text;
  const chars = text.split('');
  // Cap corruption at 3% — readability is sacred
  const rate = Math.min(0.03, pollution * 0.04);
  let corrupted = 0;
  const maxCorrupted = Math.max(1, Math.floor(chars.length * rate));
  const result = chars.map(c => {
    if (corrupted >= maxCorrupted) return c;
    if (Math.random() < rate && c !== ' ' && c !== '\n' && c !== '，' && c !== '。') {
      corrupted++;
      // Prefer subtle marks over block characters
      return pickRandom(['…', '·', c, c]); // 50% chance keep original
    }
    return c;
  });
  return result.join('');
}

// ═══════════════════════════════════════════════════════
// Tier 4: Skip with summary — one line, atmospheric
// ═══════════════════════════════════════════════════════

function _buildSummary(text) {
  if (!text) return '……';
  // Extract first sentence or first 15 chars
  const firstSentence = text.split(/[。！？\n]/)[0] || text;
  if (firstSentence.length <= 20) return firstSentence + '。你记得这些。';
  return firstSentence.slice(0, 15) + '……你以前来过这里。';
}

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/**
 * Create a new seen-text tracking map.
 */
export function createSeenTextMap() { return {}; }
