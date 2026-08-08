// src/systems/textVariants.js — Control text repetition across loops
// Readability always comes before flair.
// P1-A: SAN thresholds use getSanStageFromGD (SSOT)
// Feature 1: Difficulty-based text adjustments (第八轮深化)
import { getSanStageFromGD } from '../reducers/sanReducer.js';

// ═══════════════════════════════════════════════════════
// Feature 4: Mod difficulty hooks — custom text swaps registry
// ═══════════════════════════════════════════════════════

var _customTextSwaps = [];

/**
 * Register custom text swaps from mods (called by mod loader at startup).
 * @param {Array<[string, string]>} swaps - array of [from, to] pairs
 */
export function registerModTextSwaps(swaps) {
  if (Array.isArray(swaps)) {
    _customTextSwaps.push(...swaps);
  }
}

/**
 * Clear mod text swaps (called when mods are unloaded).
 */
export function clearModTextSwaps() {
  _customTextSwaps = [];
}

const DIFFICULTY_TEXT_SWAPS = [
  ['也许', '也许吧'], ['可能', '说不定'], ['似乎', '好像'],
  ['好像', '也许'], ['一些', '些许'], ['东西', '存在'],
  ['地方', '位置'], ['感觉', '确信'], ['注意', '记住'],
];

/**
 * Get text modification settings based on difficulty level.
 * @param {number} difficultyLevel - 1-13
 * @returns {{ corruptionBoost: number, hintSuppression: number, vocabShift: boolean }}
 */
export function getDifficultyTextSettings(difficultyLevel) {
  if (!difficultyLevel || difficultyLevel <= 3) return { corruptionBoost: 1.0, hintSuppression: 0, vocabShift: false };
  if (difficultyLevel <= 6) return { corruptionBoost: 1.2, hintSuppression: 0.10, vocabShift: false };
  if (difficultyLevel <= 9) return { corruptionBoost: 1.5, hintSuppression: 0.25, vocabShift: false };
  return { corruptionBoost: 2.0, hintSuppression: 0.40, vocabShift: true };
}

/**
 * Merge base difficulty text settings with mod overrides (Feature 4).
 * @param {number} difficultyLevel
 * @param {{ textCorruptionBoost?: number }} modModifiers - from getModDifficultyModifiers()
 * @returns {{ corruptionBoost: number, hintSuppression: number, vocabShift: boolean }}
 */
export function getMergedTextSettings(difficultyLevel, modModifiers) {
  const base = getDifficultyTextSettings(difficultyLevel);
  if (!modModifiers) return base;
  return {
    corruptionBoost: base.corruptionBoost * (modModifiers.textCorruptionBoost || 1),
    hintSuppression: base.hintSuppression,
    vocabShift: base.vocabShift || modModifiers.textCorruptionBoost > 1,
  };
}

/**
 * Apply difficulty-based vocabulary shift — replaces neutral words with more ambiguous ones.
 * Only triggers at difficulty >= 10. Also applies mod-registered swaps.
 */
function _applyVocabShift(text, difficultyLevel) {
  if (!text || difficultyLevel < 10) return text;
  var result = text;
  // Base difficulty swaps
  for (const [from, to] of DIFFICULTY_TEXT_SWAPS) {
    if (result.includes(from)) {
      result = result.replace(from, to);
      break;
    }
  }
  // Feature 4: Apply mod custom swaps (after base swap)
  if (_customTextSwaps.length > 0) {
    for (const [from, to] of _customTextSwaps) {
      if (result.includes(from)) {
        result = result.replace(from, to);
        break;
      }
    }
  }
  return result;
}
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
 * @param {number} [difficultyLevel] - 1-13, optional difficulty modifier
 * @returns {{ text, action, tier }} action: 'show' | 'variant' | 'skip'
 */
export function getTrackedText(textId, baseText, pollution, loopCount, seenMap, difficultyLevel, rng) {
  const settings = getDifficultyTextSettings(difficultyLevel);
  const seen = seenMap[textId] || 0;
  seenMap[textId] = seen + 1;

  // Difficulty hint suppression: raise pollution threshold for variant tiers
  const tier2PollutionReq = Math.max(0.2, settings.hintSuppression + 0.2);
  const tier3PollutionReq = Math.max(0.15, settings.hintSuppression + 0.15);

  // Tier 1: first time — always show full text (with optional vocab shift)
  if (seen === 0) return { text: _applyVocabShift(baseText, difficultyLevel), action: 'show', tier: 1 };

  // Tier 2: second time — subtle looping hint (suppressed at high difficulty)
  if (seen === 1 && pollution >= tier2PollutionReq) {
    return { text: _applyVocabShift(_applySubtleShift(baseText), difficultyLevel), action: 'variant', tier: 2 };
  }

  // Tier 3: third time — readable corruption (boosted at high difficulty)
  if (seen === 2 && pollution >= tier3PollutionReq) {
    var corrText = _applyReadableCorruption(baseText, pollution * settings.corruptionBoost, rng);
    return { text: _applyVocabShift(corrText, difficultyLevel), action: 'variant', tier: 3 };
  }

  // Tier 4: fourth+ time — skip with summary (suppressed at high difficulty: lower threshold)
  if (seen >= 3) {
    if (settings.hintSuppression >= 0.35 && seen === 3 && pollution < 0.3) {
      // At difficulty >= 10 (夜钟+), even seen=3 may still show
      return { text: _applyReadableCorruption(baseText, pollution * settings.corruptionBoost * 0.5, rng), action: 'variant', tier: 3 };
    }
    return { text: _buildSummary(baseText), action: 'skip', tier: 4 };
  }

  // Fallback: show text (difficulty suppressed the variant)
  return { text: _applyVocabShift(baseText, difficultyLevel), action: 'show', tier: 1 };
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

function _applyReadableCorruption(text, pollution, rng) {
  if (!text) return text;
  const chars = text.split('');
  // Cap corruption at 3% — readability is sacred
  const rate = Math.min(0.03, pollution * 0.04);
  let corrupted = 0;
  const maxCorrupted = Math.max(1, Math.floor(chars.length * rate));
  var _rand = rng ? rng.next.bind(rng) : Math.random;
  const result = chars.map(c => {
    if (corrupted >= maxCorrupted) return c;
    if (_rand() < rate && c !== ' ' && c !== '\n' && c !== '，' && c !== '。') {
      corrupted++;
      // Prefer subtle marks over block characters
      return pickRandom(['…', '·', c, c], rng); // 50% chance keep original
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

function pickRandom(arr, rng) {
  var _rand = rng ? rng.next.bind(rng) : Math.random;
  return arr[Math.floor(_rand() * arr.length)];
}

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
export function maybeInjectPhantomLog(logArray, san, loopCount, rng) {
  if (!logArray || logArray.length === 0) return;
  // Only trigger at low SAN or high loop — never in normal play
  // P1-A: SSOT — explanation_loss (level >= 3) or loop >= 2
  if (getSanStageFromGD(san).level < 3 && loopCount < 2) return;
  var _rand = rng ? rng.next.bind(rng) : Math.random;
  const chance = Math.min(0.005, (60 - san) * 0.0001 + loopCount * 0.001);
  if (_rand() >= chance) return;
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
    text: phantomTexts[Math.floor(_rand() * phantomTexts.length)],
    _phantom: true,
    _phantomExpiry: Date.now() + 8000 + Math.floor(_rand() * 4000),
  });
}

/**
 * NPC name typo: NPC name occasionally renders with one character wrong.
 * Probability: 0.3% per render. Resolves on next render.
 * Example: "玛莎" → "玛纱" → "玛莎"
 */
export function maybeCorruptNpcName(name, san, loopCount, rng) {
  if (!name || name.length < 2) return name;
  // P1-A: SSOT — perception_shift (level >= 2) or loop >= 3
  if (getSanStageFromGD(san).level < 2 && loopCount < 3) return name;
  const chance = Math.min(0.003, (70 - san) * 0.00005 + loopCount * 0.0005);
  var _rand = rng ? rng.next.bind(rng) : Math.random;
  if (_rand() >= chance) return name;
  // Swap one character with a visually similar one
  const charSwaps = {
    '莎': '纱', '玛': '码', '希': '稀', '达': '这', '伊': '尹',
    '贝': '见', '韦': '违', '约': '药', '书': '昼', '亚': '业',
    '莱': '菜', '斯': '期', '德': '得', '莫': '漠', '里': '理',
    '费': '贵', '舍': '含', '格': '洛', '雷': '雪',
  };
  const chars = name.split('');
  for (let i = 0; i < chars.length; i++) {
    if (charSwaps[chars[i]] && _rand() < 0.5) {
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
export function maybeInjectPhantomNarrative(narrArray, san, rng) {
  // P1-A: SSOT — explanation_loss (level >= 3)
  if (getSanStageFromGD(san).level < 3) return;
  var _rand = rng ? rng.next.bind(rng) : Math.random;
  if (_rand() >= 0.003) return;
  const phantomLines = [
    '你刚才说了什么？',
    '——不，你没有说话。',
    '有人在看着你。',
    '（这不是你写的。）',
    '你确定你在这里吗？',
  ];
  narrArray.push({
    id: Date.now() + _rand(),
    type: 'system',
    text: phantomLines[Math.floor(_rand() * phantomLines.length)],
    _phantom: true,
    _phantomExpiry: Date.now() + 5000 + Math.floor(_rand() * 3000),
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
export function applyMythosAliases(text, currentChapter, mythosLevel, ctx, opts, rng) {
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
      var _rand = rng ? rng.next.bind(rng) : Math.random;
      for (let i = 1; i < parts.length; i++) {
        if (_rand() < slipChance) {
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

// ═══════════════════════════════════════════════════════
// Area Name Distortion (moved from engine/WorldTimeSystem.js)
// Game-specific logic — belongs in systems/, not engine/.
// ═══════════════════════════════════════════════════════

export var AREA_DISTORTIONS = {
  town_center: ['沃切斯特镇中?', '沃切斯特镇■心', '???斯特镇中心', '沃切斯特镇', '镇中心广场'],
  harbor_district: ['雾港码头■', '雾港?头区', '雾港码头区', '港■码头区', '码头'],
  lighthouse: ['灯塔?', '灯塔回廊', '???塔', '灯塔', '灰烬灯塔'],
  voxchester_manor: ['沃切斯特■园', '庄园?', '???斯特庄园', '庄园', '沃切斯特庄园'],
  catacombs_entrance: ['墓穴■口', '墓穴入?', '???穴入口', '墓穴', '深渊之门'],
  whispering_forest: ['低语森■', '低语?林', '???语森林', '森林', '低语森林'],
  ruins_of_yith: ['伊斯遗■', '伊斯?迹', '???遗迹', '遗迹', '伊斯遗迹'],
  forbidden_grove: ['禁忌之■', '禁忌?林', '???之林', '禁忌之林', '禁忌之林'],
  deep_catacombs: ['深渊墓■', '深渊?穴', '???墓穴', '深渊墓穴', '深渊墓穴'],
};

/**
 * Get a distorted area name based on SAN/light/infection state.
 * Moved from engine/WorldTimeSystem.js — this is game-specific presentation logic.
 *
 * @param {object} area - area object with .id and .name
 * @param {object} state - game state
 * @param {object|null} rng - optional seeded RNG
 * @returns {string} distorted or original name
 */
export function getDistortedName(area, state, rng) {
  if (!area) return '???';
  if (state.areaNameCache && state.areaNameCache[area.id]) return state.areaNameCache[area.id];

  var san = state.san || 0;
  var pollution = state.pollution || 0;
  var light = state.lightLevel || 0;
  var infection = state.infection || 0;
  var stage = getSanStageFromGD(san);
  var chanceByLevel = { 6: 1.0, 5: 0.85, 4: 0.7, 3: 0.4, 2: 0.2, 1: 0.08, 0: 0 };
  var distortChance = chanceByLevel[stage.level] || 0;

  distortChance += pollution * 0.5;
  if (light <= 1) distortChance += 0.15;
  if (infection >= 50) distortChance += 0.1;

  var lastVisit = state.lastVisitedDates?.[area.id] || state.day;
  var daysSince = (state.day || 1) - lastVisit;
  var fadeThreshold = Math.max(2, 5 - Math.floor((state.loopCount || 0) * 0.5));
  if (daysSince > fadeThreshold) distortChance += (daysSince - fadeThreshold) * 0.1;

  distortChance = Math.min(1, distortChance);
  var _rand = rng ? rng.next.bind(rng) : Math.random;
  if (_rand() >= distortChance) return area.name;

  var alts = AREA_DISTORTIONS[area.id];
  if (!alts) return area.name;

  var idx;
  if (stage.level >= 6) idx = 0;                            // narrative_death: always most distorted
  else if (stage.level >= 5) idx = _rand() < 0.6 ? 0 : 1;  // reality_dissolution
  else if (stage.level >= 4) idx = _rand() < 0.4 ? 1 : 2;  // cognitive_fog: milder
  else if (stage.level >= 3) idx = _rand() < 0.5 ? 1 : 2;  // explanation_loss
  else if (stage.level >= 2) idx = _rand() < 0.5 ? 3 : 1;  // perception_shift
  else idx = 3;                                                    // stable/mild: normal

  return alts[idx] || area.name;
}

// ═══════════════════════════════════════════════════════
// Level 13 (十三钟响): Reality distortion text effects
// ═══════════════════════════════════════════════════════

/**
 * Apply level 13 reality distortion to event text.
 * 15% chance of distortion: character substitution, word swap, append corruption, doubling.
 * CJK-safe — only replaces common CJK characters.
 *
 * @param {string} text
 * @param {number} difficultyLevel
 * @param {function} [rng]
 * @returns {string}
 */
export function applyLevel13RealityDistortion(text, difficultyLevel, rng) {
  if (difficultyLevel !== 13) return text;
  if (!text || text.length < 2) return text;
  var _rand = rng ? rng.next.bind(rng) : Math.random;
  if (_rand() >= 0.15) return text;

  var distortions = [
    function(t) { return t.replace(/的/g, 'の').replace(/了/g, 'ㄟ'); },
    function(t) { return t.replace('安全屋', '安qué屋').replace('钟声', '钟█声'); },
    function(t) { return t + '\n\n……等一下。你刚才看到的是这样吗？'; },
    function(t) {
      var result = '';
      for (var i = 0; i < t.length; i++) {
        result += i % 7 === 0 ? t[i] + t[i] : t[i];
      }
      return result;
    },
  ];
  return distortions[Math.floor(_rand() * distortions.length)](text);
}
