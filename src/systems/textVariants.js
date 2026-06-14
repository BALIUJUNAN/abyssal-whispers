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

// ═══════════════════════════════════════════════════════
// "Suspected Bug" System — 1% controlled chaos
// These functions introduce tiny anomalies that look like bugs
// but are completely intentional. Player never knows if it's
// a real bug, a game mechanic, or their own madness.
//
// TRIGGER PROBABILITY: always < 1%. Never affects game flow.
// ═══════════════════════════════════════════════════════

/**
 * Phantom log entry: event log occasionally shows a line the player never saw.
 * Phantom entries carry a `_phantomExpiry` timestamp — render code should skip
 * them once expired. No setTimeout (Immer state is frozen after reducer).
 */
export function maybeInjectPhantomLog(logArray, san, loopCount) {
  if (!logArray || logArray.length === 0) return;
  // Only trigger at low SAN or high loop — never in normal play
  if (san > 40 && loopCount < 2) return;
  const chance = Math.min(0.005, (60 - san) * 0.0001 + loopCount * 0.001);
  if (Math.random() >= chance) return;
  const phantomTexts = [
    '你走进了一个你不记得存在的房间。',
    '有人在你身后关上了门。',
    '你在笔记本上写下了一行你不认识的字。',
    '钟声多响了一下。',
    '你的影子朝错误的方向移动了。',
    '你听到有人叫了你的名字——但不是你在这里用的名字。',
  ];
  logArray.push({
    day: logArray[logArray.length - 1]?.day || 1,
    text: phantomTexts[Math.floor(Math.random() * phantomTexts.length)],
    _phantom: true,
    _phantomExpiry: Date.now() + 8000 + Math.floor(Math.random() * 4000),
  });
}

/**
 * NPC name typo: NPC name occasionally renders with one character wrong.
 * Probability: 0.3% per render. Resolves on next render.
 * Example: "玛莎" → "玛纱" → "玛莎"
 */
export function maybeCorruptNpcName(name, san, loopCount) {
  if (!name || name.length < 2) return name;
  if (san > 50 && loopCount < 3) return name;
  const chance = Math.min(0.003, (70 - san) * 0.00005 + loopCount * 0.0005);
  if (Math.random() >= chance) return name;
  // Swap one character with a visually similar one
  const charSwaps = {
    '莎': '纱', '玛': '码', '希': '稀', '达': '这', '伊': '尹',
    '贝': '见', '韦': '违', '约': '药', '书': '昼', '亚': '业',
    '莱': '菜', '斯': '期', '德': '得', '莫': '漠', '里': '理',
    '费': '贵', '舍': '含', '格': '洛', '雷': '雪',
  };
  const chars = name.split('');
  for (let i = 0; i < chars.length; i++) {
    if (charSwaps[chars[i]] && Math.random() < 0.5) {
      const result = [...chars];
      result[i] = charSwaps[chars[i]];
      return result.join('');
    }
  }
  return name;
}

/**
 * Narrative phantom line: narrative stream occasionally shows a line
 * that vanishes after its expiry timestamp. Render code should skip
 * expired phantom entries. No setTimeout (Immer state is frozen after reducer).
 * Probability: 0.3% per narrative push at low SAN.
 */
export function maybeInjectPhantomNarrative(narrArray, san) {
  if (san > 30) return;
  if (Math.random() >= 0.003) return;
  const phantomLines = [
    '你刚才说了什么？',
    '——不，你没有说话。',
    '有人在看着你。',
    '（这不是你写的。）',
    '你确定你在这里吗？',
  ];
  narrArray.push({
    id: Date.now() + Math.random(),
    type: 'system',
    text: phantomLines[Math.floor(Math.random() * phantomLines.length)],
    _phantom: true,
    _phantomExpiry: Date.now() + 5000 + Math.floor(Math.random() * 3000),
  });
}

/**
 * Check if a narrative/log entry is an expired phantom.
 * Call during render to filter out stale phantom entries.
 */
export function isPhantomExpired(entry) {
  return entry._phantom && entry._phantomExpiry && Date.now() > entry._phantomExpiry;
}

// ═══════════════════════════════════════════════════════
// Mythos Name Alias System — 分章节专名替换
// Replaces true mythos names with chapter-appropriate aliases.
// ═══════════════════════════════════════════════════════

// Canonical name → text patterns to search for
const MYTHOS_TRUE_NAMES = [
  { key: 'deep_ones', patterns: ['深潜者'] },
  { key: 'shoggoth', patterns: ['修格斯'] },
  { key: 'nyarlathotep', patterns: ['奈亚拉托提普'] },
  { key: 'cthulhu', patterns: ['克苏鲁'] },
  { key: 'yog_sothoth', patterns: ['尤格-索托斯', '尤格索托斯'] },
];

/**
 * Replace mythos true names in text with chapter-appropriate aliases.
 * Respects mythos_name_control rules from game_base.json.
 *
 * PHILOSOPHY (克苏鲁混乱感): Names don't switch collectively at chapter boundaries.
 * Instead, each NPC/text individually rolls to "slip" a true name, with probability
 * increasing gradually. Higher trust NPCs slip more. The player discovers the shift
 * through repetition, not through a global toggle.
 *
 * @param {string} text        - event description text
 * @param {string} currentChapter - e.g. 'chapter_1', 'chapter_3'
 * @param {number} mythosLevel - player's mythos knowledge level
 * @param {object} ctx         - { GD }
 * @param {object} [opts]      - { npcTrust?: number, isNpcDialogue?: boolean }
 * @returns {string} text with aliases applied
 */
export function applyMythosAliases(text, currentChapter, mythosLevel, ctx, opts) {
  if (!text) return text;
  const { GD } = ctx;
  const aliases = GD.systems?.mythos?.mythos_name_control?.name_aliases
    || GD.implementation_notes?.mythos_name_control?.name_aliases;
  if (!aliases) return text;

  const chNum = parseInt((currentChapter || 'chapter_1').replace('chapter_', '')) || 1;
  const trust = (opts && opts.npcTrust) || 0;

  // Probability of "slipping" the true name — gradual, never 0% or 100%
  // Ch1: 0% slip (alias always used)
  // Ch2: 0-5% slip (trust 5 NPCs might mutter)
  // Ch3: 5-30% slip (knowledge leaks through)
  // Ch4: 20-60% slip (most people know)
  // Ch5: 70-95% slip (but never 100% — some people still use old names)
  let slipChance = 0;
  if (chNum >= 5) slipChance = 0.70 + Math.min(0.25, mythosLevel * 0.01 + trust * 0.03);
  else if (chNum >= 4) slipChance = 0.20 + Math.min(0.40, mythosLevel * 0.02 + trust * 0.05);
  else if (chNum >= 3) slipChance = 0.05 + Math.min(0.25, mythosLevel * 0.015 + trust * 0.04);
  else if (chNum >= 2) slipChance = Math.min(0.05, trust * 0.01);

  let result = text;
  for (const entry of MYTHOS_TRUE_NAMES) {
    const aliasMap = aliases[entry.key];
    if (!aliasMap) continue;

    // Get the "safe" alias for current chapter
    let safeAlias;
    if (chNum >= 4) safeAlias = aliasMap['chapter_4_plus'] || aliasMap['chapter_3'];
    else if (chNum >= 3) safeAlias = aliasMap['chapter_3'];
    else if (chNum >= 2) safeAlias = aliasMap['chapter_2'];
    else safeAlias = aliasMap['chapter_1'];
    if (!safeAlias) continue;

    for (const pattern of entry.patterns) {
      if (safeAlias === pattern) continue; // Already the true name
      // Each occurrence individually rolls
      const parts = result.split(pattern);
      if (parts.length <= 1) continue;
      const rebuilt = [parts[0]];
      for (let i = 1; i < parts.length; i++) {
        if (Math.random() < slipChance) {
          // Slip: use true name, then immediately "correct" with a hesitation
          rebuilt.push(pattern + '——不对，是' + safeAlias + parts[i]);
        } else {
          rebuilt.push(safeAlias + parts[i]);
        }
      }
      result = rebuilt.join('');
    }
  }
  return result;
}
