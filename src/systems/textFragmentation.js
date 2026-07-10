// src/systems/textFragmentation.js - SAN-driven text fragmentation system
// ENHANCED v2: richer corruption techniques for psychological unease
//
// DESIGN PHILOSOPHY:
//   Never explicitly tell the player "you are going mad."
//   Instead, the text itself becomes unreliable — words disappear,
//   cross out, reorder, echo, reset. The player reads and feels
//   something is wrong, but the game never says "you're hallucinating."
//
// HOW IT WORKS:
//   High SAN → text is intact. Maybe one word crossed out, barely noticeable.
//   Medium SAN → words missing, sentences that trail off, crossed-out corrections.
//   Low SAN → significant word loss, sentence fragments, scrambled phrases,
//              characters that look almost right but aren't.
//   Critical SAN → near-breakdown — only fragments remain, barely coherent.
//
// TECHNIQUES (applied in order of severity):
//   1. Word crossing: 这̶个̶词̶被̶划̶掉̶  (combining long stroke overlay)
//   2. Word deletion: "The [missing] was here"
//   3. Sentence truncation: "And then—" (trailing off)
//   4. Phrase scrambling: short phrase word order shuffled
//   5. Punctuation decay: commas disappear, periods become dashes
//   6. Character substitution: 莎→纱 (visually similar CJK chars)
//   7. Ghost echo: "门。门。门。" (haunting repetitions)
//   8. Mid-sentence reset: "你打开——你打开了门。" (disorienting resets)
//   9. Breathing gap: "你  ……  打开了" (hesitation spacing)
//
// INTEGRATION:
//   Called from exploreSlice.js (event text) and NPCDialog.jsx (NPC dialogue).
//   Should be one of the LAST steps in the corruption pipeline,
//   applied after all other text modifications.

import { getCurrentSanStage } from '../reducers/utils.js';

// ============================================================
// Fragmentation tier definitions (SAN stage based)
// ============================================================

var FRAGMENTATION_TIERS = [
  {
    // Level 0-1: Stable / Mild erosion — text is intact
    name: 'stable',
    minLevel: 0, maxLevel: 1,
    maxWordsToRemove: 0,
    crossOutChance: 0,
    scrambleChance: 0,
    truncateChance: 0,
    punctuationDecay: 0,
    substituteChance: 0,      // NEW: character substitution
    echoChance: 0,            // NEW: ghost text echo
    resetChance: 0,           // NEW: mid-sentence reset
    gapChance: 0,             // NEW: breathing gap
    minWordsForScramble: 0,
    preserveFirst: 2,
    preserveLast: 2,
    maxCrossOutRatio: 0,
    description: '文本完整',
  },
  {
    // Level 2: Perception shift — occasional crossed-out word, very subtle
    name: 'mild',
    minLevel: 2, maxLevel: 2,
    maxWordsToRemove: 0,
    crossOutChance: 0.06,
    scrambleChance: 0,
    truncateChance: 0,
    punctuationDecay: 0.02,
    substituteChance: 0,
    echoChance: 0,
    resetChance: 0,
    gapChance: 0.04,          // NEW: occasional hesitation
    minWordsForScramble: 0,
    preserveFirst: 2,
    preserveLast: 2,
    maxCrossOutRatio: 0.08,
    description: '偶有划痕',
  },
  {
    // Level 3: Explanation loss — some words crossed out, 1 word may vanish
    name: 'moderate',
    minLevel: 3, maxLevel: 3,
    maxWordsToRemove: 1,
    crossOutChance: 0.12,
    scrambleChance: 0.02,
    truncateChance: 0.03,
    punctuationDecay: 0.05,
    substituteChance: 0.03,   // NEW: rare character substitution
    echoChance: 0.02,         // NEW: rare ghost echo
    resetChance: 0,
    gapChance: 0.08,
    minWordsForScramble: 4,
    preserveFirst: 2,
    preserveLast: 2,
    maxCrossOutRatio: 0.15,
    description: '有词消失',
  },
  {
    // Level 4: Cognitive fog — words missing, sentences break
    name: 'heavy',
    minLevel: 4, maxLevel: 4,
    maxWordsToRemove: 2,
    crossOutChance: 0.20,
    scrambleChance: 0.05,
    truncateChance: 0.06,
    punctuationDecay: 0.10,
    substituteChance: 0.06,
    echoChance: 0.04,
    resetChance: 0.02,        // NEW: occasional mid-sentence reset
    gapChance: 0.12,
    minWordsForScramble: 3,
    preserveFirst: 1,
    preserveLast: 1,
    maxCrossOutRatio: 0.25,
    description: '句子破碎',
  },
  {
    // Level 5: Reality dissolution — severe fragmentation
    name: 'severe',
    minLevel: 5, maxLevel: 5,
    maxWordsToRemove: 3,
    crossOutChance: 0.30,
    scrambleChance: 0.08,
    truncateChance: 0.10,
    punctuationDecay: 0.15,
    substituteChance: 0.12,
    echoChance: 0.06,
    resetChance: 0.04,
    gapChance: 0.18,
    minWordsForScramble: 3,
    preserveFirst: 1,
    preserveLast: 1,
    maxCrossOutRatio: 0.35,
    description: '严重残缺',
  },
  {
    // Level 6: Narrative death — near-complete breakdown
    name: 'critical',
    minLevel: 6, maxLevel: 6,
    maxWordsToRemove: 5,
    crossOutChance: 0.40,
    scrambleChance: 0.12,
    truncateChance: 0.15,
    punctuationDecay: 0.20,
    substituteChance: 0.20,
    echoChance: 0.10,
    resetChance: 0.06,
    gapChance: 0.25,
    minWordsForScramble: 2,
    preserveFirst: 0,
    preserveLast: 0,
    maxCrossOutRatio: 0.50,
    description: '濒临崩溃',
  },
];

// ============================================================
// Core API
// ============================================================

/**
 * Apply SAN-driven text fragmentation to event/narrative text.
 * This is the SSOT entry point — all fragmentation logic flows from here.
 *
 * DESIGN RULES:
 *   1. Never add text that says "you're going mad" or "this isn't real"
 *   2. Fragmentation should feel like the text itself is unreliable
 *   3. Critical story beats (once_per_run events, endings) get milder treatment
 *   4. The player should feel unease, not be told they're unstable
 *   5. Each loop, the same text degrades further — the world remembers
 *
 * @param {string} text - the event description text
 * @param {number} san - current SAN value
 * @param {function} [rng] - seeded random
 * @param {object} [opts] - options
 * @param {boolean} [opts.isCritical=false] - true for story-critical events (milder corruption)
 * @param {number} [opts.maxSeverity=6] - cap corruption at this SAN level (0-6)
 * @param {number} [opts.loopCount=0] - loop count for progressive degradation
 * @param {number} [opts.difficultyLevel=1] - difficulty level modifier
 * @returns {string} fragmented text
 */
export function applyTextFragmentation(text, san, rng, opts, ctx) {
  if (!text || typeof text !== 'string') return text;
  if (text.length < 10) return text; // too short to fragment meaningfully

  var _rand = rng ? rng.next.bind(rng) : Math.random;
  var options = opts || {};
  var isCritical = options.isCritical || false;
  var maxSeverity = options.maxSeverity != null ? options.maxSeverity : 6;
  var loopCount = options.loopCount || 0;
  var difficultyLevel = options.difficultyLevel || 1;

  // Get SAN stage
  var GD = (ctx && ctx.GD) || {};
  var stage = getCurrentSanStage(san, { GD: GD });
  var level = stage.level || 0;

  // Clamp level
  if (level > maxSeverity) level = maxSeverity;

  // Find matching tier
  var tier = FRAGMENTATION_TIERS.filter(function (t) {
    return level >= t.minLevel && level <= t.maxLevel;
  })[0] || FRAGMENTATION_TIERS[0];

  // Critical events get one tier milder treatment
  if (isCritical) {
    var milderTierIdx = Math.max(0, FRAGMENTATION_TIERS.indexOf(tier) - 1);
    tier = FRAGMENTATION_TIERS[milderTierIdx] || tier;
  }

  // Loop-aware severity boost: each loop makes text degrade further
  // Loop 1: baseline, Loop 3: +30%, Loop 5: +50%, Loop 10+: capped at +50%
  var loopBoost = 1 + Math.min(0.5, loopCount * 0.1);

  // Difficulty boost: high difficulty increases corruption
  var diffBoost = difficultyLevel >= 10 ? 1.3 : difficultyLevel >= 7 ? 1.15 : 1.0;

  // Combined boost
  var totalBoost = loopBoost * diffBoost;

  // Apply boost to tier parameters (scale probabilities, not fixed counts)
  var boostedTier = boostTier(tier, totalBoost);

  // If no fragmentation at this tier, return text unchanged
  if (boostedTier.maxWordsToRemove === 0 && boostedTier.crossOutChance === 0
    && boostedTier.substituteChance === 0 && boostedTier.echoChance === 0
    && boostedTier.resetChance === 0) {
    return text;
  }

  // Split text into sentences for per-sentence processing
  var sentences = splitSentences(text);
  var result = [];

  for (var si = 0; si < sentences.length; si++) {
    var sentence = sentences[si].trim();
    if (sentence.length === 0) {
      result.push(sentence);
      continue;
    }

    var words = splitWords(sentence);

    // Skip very short sentences (preserve emotional impact)
    if (words.length <= 3 && boostedTier.maxWordsToRemove > 0) {
      // Only apply truncation/reset to short sentences, not removal
      if (_rand() < boostedTier.truncateChance && words.length >= 2) {
        result.push(words.slice(0, Math.max(1, words.length - 1)).join('') + '—');
      } else if (_rand() < boostedTier.resetChance) {
        result.push(midSentenceReset(words.slice(0, Math.max(1, words.length - 1)), _rand));
      } else {
        result.push(sentence);
      }
      continue;
    }

    var processed = processSentence(words, boostedTier, _rand, isCritical);
    result.push(processed);
  }

  return joinSentences(result, boostedTier, _rand);
}

/**
 * Boost tier parameters by a multiplier (for loop/difficulty scaling).
 * Scales probabilities, caps fixed counts at tier maximums.
 */
function boostTier(tier, multiplier) {
  var boosted = {};
  for (var key in tier) {
    if (key === 'name' || key === 'minLevel' || key === 'maxLevel' || key === 'description') {
      boosted[key] = tier[key];
    } else if (key === 'maxWordsToRemove' || key === 'minWordsForScramble'
      || key === 'preserveFirst' || key === 'preserveLast') {
      // Fixed counts: scale up but respect reasonable caps
      boosted[key] = Math.min(tier[key] + Math.floor(tier[key] * (multiplier - 1)), tier[key] * 2);
    } else {
      // Probabilities: scale directly, cap at 1.0
      boosted[key] = Math.min(1.0, tier[key] * multiplier);
    }
  }
  return boosted;
}

/**
 * Check if text should be fragmented at current SAN level.
 * Used for conditional display logic (e.g., showing a warning indicator).
 *
 * @param {number} san - current SAN
 * @returns {{ level: number, name: string, shouldFragment: boolean, severity: string }}
 */
export function getFragmentationState(san, ctx) {
  var GD = (ctx && ctx.GD) || {};
  var stage = getCurrentSanStage(san, { GD: GD });
  var level = stage.level || 0;
  var tier = FRAGMENTATION_TIERS.filter(function (t) {
    return level >= t.minLevel && level <= t.maxLevel;
  })[0] || FRAGMENTATION_TIERS[0];

  return {
    level: level,
    name: tier.name,
    description: tier.description,
    shouldFragment: tier.maxWordsToRemove > 0 || tier.crossOutChance > 0
      || tier.substituteChance > 0 || tier.echoChance > 0,
    severity: level <= 1 ? 'none' : level <= 3 ? 'mild' : level <= 5 ? 'severe' : 'critical',
  };
}

// ============================================================
// Sentence Processing
// ============================================================

/**
 * Process a single sentence: apply all corruption techniques in severity order.
 */
function processSentence(words, tier, _rand, isCritical) {
  if (words.length <= 2) return words.join('');

  var wordCount = words.length;
  var preserveFirst = isCritical ? Math.max(1, tier.preserveFirst) : tier.preserveFirst;
  var preserveLast = isCritical ? Math.max(1, tier.preserveLast) : tier.preserveLast;

  // Track which word indices have been modified (to avoid double-processing)
  var modified = new Array(wordCount).fill(false);
  var result = words.slice();

  // Step 1: Character substitution (visually similar CJK chars)
  // Applies before crossing — a substituted character might still get crossed out
  if (tier.substituteChance > 0) {
    substituteCharacters(result, modified, tier.substituteChance, preserveFirst, preserveLast, _rand);
  }

  // Step 2: Cross out words (̶w̶o̶r̶d̶)
  var crossOutCount = calculateActionCount(tier.crossOutChance, wordCount - preserveFirst - preserveLast, _rand);
  crossOutCount = Math.min(crossOutCount, Math.floor(wordCount * tier.maxCrossOutRatio));
  crossOutWords(result, modified, crossOutCount, preserveFirst, preserveLast, _rand);

  // Step 3: Remove words (delete entirely)
  if (tier.maxWordsToRemove > 0) {
    var removeCount = Math.min(
      tier.maxWordsToRemove,
      Math.floor(_rand() * (tier.maxWordsToRemove + 1))
    );
    removeWords(result, modified, removeCount, preserveFirst, preserveLast, _rand);
  }

  // Step 4: Scramble short phrases (only for longer sentences)
  if (tier.scrambleChance > 0 && wordCount >= tier.minWordsForScramble && _rand() < tier.scrambleChance) {
    scramblePhrase(result, preserveFirst, preserveLast, _rand);
  }

  // Step 5: Punctuation decay
  if (tier.punctuationDecay > 0 && _rand() < tier.punctuationDecay) {
    decayPunctuation(result, _rand);
  }

  // Step 6: Ghost echo — haunting repetitions (only for longer sentences)
  if (tier.echoChance > 0 && wordCount >= 5 && _rand() < tier.echoChance) {
    injectGhostEcho(result, _rand);
  }

  // Step 7: Mid-sentence reset — disorienting cutoff and restart
  if (tier.resetChance > 0 && wordCount >= 4 && _rand() < tier.resetChance) {
    midSentenceReset(result, _rand);
  }

  // Step 8: Breathing gap — hesitation spacing (applied at join time)
  // Marked via a sentinel; actual insertion happens in joinSentences

  return result.join('');
}

// ============================================================
// Fragmentation Techniques
// ============================================================

// --- Existing techniques (unchanged behavior) ---

/**
 * Cross out words using Unicode combining long stroke overlay (̶).
 * Rendered as strikethrough in most environments.
 * Example: "这个̶词̶被̶划̶掉̶"
 */
function crossOutWords(words, modified, count, preserveFirst, preserveLast, _rand) {
  var candidates = [];
  for (var i = preserveFirst; i < words.length - preserveLast; i++) {
    if (!modified[i] && words[i].length > 1) candidates.push(i);
  }

  var shuffled = shuffleArray(candidates, _rand);
  var toCross = Math.min(count, shuffled.length);

  for (var j = 0; j < toCross; j++) {
    var idx = shuffled[j];
    words[idx] = applyStrikethrough(words[idx]);
    modified[idx] = true;
  }
}

/**
 * Apply strikethrough to a word using combining long stroke overlay.
 * "被划掉" → "被̶划̶掉̶"
 */
function applyStrikethrough(word) {
  // Filter out already-corrupted words
  if (word.indexOf('̶') >= 0) return word;

  var result = '';
  for (var c = 0; c < word.length; c++) {
    // Don't apply combining mark to existing combining characters
    var code = word.charCodeAt(c);
    if (code >= 0x0300 && code <= 0x036F) {
      result += word[c];
      continue;
    }
    result += word[c] + '̶'; // COMBINING LONG STROKE OVERLAY
  }
  return result;
}

/**
 * Remove words entirely (replace with empty string, collapse space).
 */
function removeWords(words, modified, count, preserveFirst, preserveLast, _rand) {
  var candidates = [];
  for (var i = preserveFirst; i < words.length - preserveLast; i++) {
    if (!modified[i]) candidates.push(i);
  }

  var shuffled = shuffleArray(candidates, _rand);
  var toRemove = Math.min(count, shuffled.length);

  for (var j = 0; j < toRemove; j++) {
    words[shuffled[j]] = '';
    modified[shuffled[j]] = true;
  }
}

/**
 * Scramble the word order of a short phrase within the sentence.
 * Only scrambles 2-4 adjacent words to keep it subtle.
 */
function scramblePhrase(words, preserveFirst, preserveLast, _rand) {
  var start = preserveFirst + Math.floor(_rand() * Math.max(1, words.length - preserveFirst - preserveLast - 2));
  var length = 2 + Math.floor(_rand() * 2); // 2-3 words
  var end = Math.min(start + length, words.length - preserveLast);

  if (end - start < 2) return; // need at least 2 words to scramble

  var phrase = words.slice(start, end);
  // Fisher-Yates shuffle for the phrase
  for (var i = phrase.length - 1; i > 0; i--) {
    var j = Math.floor(_rand() * (i + 1));
    var temp = phrase[i];
    phrase[i] = phrase[j];
    phrase[j] = temp;
  }

  for (var k = 0; k < phrase.length; k++) {
    words[start + k] = phrase[k];
  }
}

/**
 * Decay punctuation: remove some commas, replace periods with dashes.
 */
function decayPunctuation(words, _rand) {
  for (var i = 0; i < words.length; i++) {
    var w = words[i];
    if (!w) continue;

    // Remove commas (30% chance each)
    if (w.indexOf('，') >= 0 && _rand() < 0.3) {
      words[i] = w.replace(/，/g, '');
    }
    // Replace periods with dashes (20% chance)
    if (w.indexOf('。') >= 0 && _rand() < 0.2) {
      words[i] = w.replace(/。/g, '—');
    }
    // Remove question marks (15% chance)
    if (w.indexOf('？') >= 0 && _rand() < 0.15) {
      words[i] = w.replace(/？/g, '。');
    }
  }
}

// --- NEW techniques (enhanced v2) ---

/**
 * Visual similarity map for CJK characters.
 * Pairs of characters that look nearly identical but are different glyphs.
 * Creates the "uncanny valley" effect — text looks almost right, but something is off.
 */
var CJK_SIMILAR_MAP = {
  // Near-identical glyphs
  '莎': '纱', '玛': '码', '希': '稀', '达': '这',
  '伊': '尹', '贝': '见', '韦': '违', '约': '药',
  '书': '昼', '亚': '业', '莱': '菜', '斯': '期',
  '德': '得', '莫': '漠', '里': '理', '费': '贵',
  '舍': '含', '格': '洛', '雷': '雪',
  // Subtle variants
  '沉': '沈', '户': '戸', '加': '咖',
  '田': '由', '未': '末', '土': '士',
  '日': '曰', '人': '入', '千': '干',
  '玉': '主', '竟': '章', '茶': '荼',
  // Block variants (visual degradation)
  '的': '□', '了': 'ㄟ', '在': '茬',
  '是': '昰', '和': '呝', '不': '□',
};

/**
 * Substitute CJK characters with visually similar ones.
 * Creates the "uncanny valley" — text looks almost right but subtly wrong.
 * Example: "玛莎" → "码纱" (barely perceptible, but unsettling)
 *
 * @param {string[]} words - word array (mutated in place)
 * @param {boolean[]} modified - tracking array
 * @param {number} chance - substitution probability per eligible word
 * @param {number} preserveFirst - words to skip at start
 * @param {number} preserveLast - words to skip at end
 * @param {function} _rand - random function
 */
function substituteCharacters(words, modified, chance, preserveFirst, preserveLast, _rand) {
  for (var i = preserveFirst; i < words.length - preserveLast; i++) {
    if (modified[i]) continue;
    var word = words[i];
    // Only substitute words with CJK content (skip pure punctuation/latin)
    if (!hasCJKContent(word)) continue;

    if (_rand() < chance) {
      var substituted = applyCharSubstitution(word, _rand);
      if (substituted !== word) {
        words[i] = substituted;
        modified[i] = true;
      }
    }
  }
}

/**
 * Apply character substitution to a single word.
 * Replaces one CJK character with a visually similar one.
 */
function applyCharSubstitution(word, _rand) {
  var chars = word.split('');
  // Find eligible CJK characters that have a substitution
  var eligible = [];
  for (var c = 0; c < chars.length; c++) {
    var code = chars[c].charCodeAt(0);
    // Only CJK Unified Ideographs and Extension A
    if ((code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3400 && code <= 0x4DBF)) {
      if (CJK_SIMILAR_MAP[chars[c]]) eligible.push(c);
    }
  }
  if (eligible.length === 0) return word;

  // Pick 1-2 characters to substitute
  var count = eligible.length >= 3 ? (1 + Math.floor(_rand() * 2)) : 1;
  var shuffled = shuffleArray(eligible, _rand);
  var toSub = Math.min(count, shuffled.length);

  for (var s = 0; s < toSub; s++) {
    var idx = shuffled[s];
    chars[idx] = CJK_SIMILAR_MAP[chars[idx]];
  }
  return chars.join('');
}

/**
 * Check if a word contains CJK content characters (not just punctuation).
 */
function hasCJKContent(word) {
  for (var i = 0; i < word.length; i++) {
    var code = word.charCodeAt(i);
    if ((code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3400 && code <= 0x4DBF)) {
      return true;
    }
  }
  return false;
}

/**
 * Inject ghost echo — a word or phrase repeated hauntingly.
 * "你打开了门。" → "你打开了门。门。门。"
 * Creates the feeling that the text is looping, stuck, watching.
 *
 * @param {string[]} words - word array (mutated in place)
 * @param {function} _rand - random function
 */
function injectGhostEcho(words, _rand) {
  // Find CJK words to echo (skip first/last to preserve anchors)
  var startIdx = 1;
  var endIdx = words.length - 1;
  if (endIdx - startIdx < 2) return;

  // Pick a content word to echo (prefer 1-2 CJK character words)
  var candidates = [];
  for (var i = startIdx; i < endIdx; i++) {
    var w = words[i];
    if (!w || w === '') continue;
    // Prefer short CJK words (1-3 chars) — they echo more hauntingly
    if (hasCJKContent(w) && w.length <= 4 && !isPunctuationOnly(w)) {
      candidates.push(i);
    }
  }
  if (candidates.length === 0) return;

  // Pick 1-2 words to echo
  var echoCount = candidates.length >= 3 ? (1 + Math.floor(_rand() * 2)) : 1;
  var shuffled = shuffleArray(candidates, _rand);
  var toEcho = Math.min(echoCount, shuffled.length);

  for (var e = 0; e < toEcho; e++) {
    var idx = shuffled[e];
    var echoWord = words[idx];
    // Build echo: 2-4 repetitions
    var reps = 2 + Math.floor(_rand() * 3); // 2-4
    var echoStr = '';
    for (var r = 1; r < reps; r++) {
      echoStr += '。' + echoWord;
    }
    // Insert echo after the word's punctuation (or at end of word)
    words[idx] = echoWord + echoStr;
  }
}

/**
 * Mid-sentence reset — text cuts off mid-thought and restarts.
 * "你打开门，发现——你打开了门。"
 * Creates the disorienting feeling of losing and regaining coherence.
 *
 * @param {string[]} words - word array (mutated in place)
 * @param {function} _rand - random function
 */
function midSentenceReset(words, _rand) {
  if (words.length < 4) return;

  // Find a reset point (skip first word, prefer mid-sentence)
  var minReset = Math.max(1, Math.floor(words.length * 0.2));
  var maxReset = Math.min(words.length - 2, Math.floor(words.length * 0.6));
  if (maxReset <= minReset) return;

  var resetPoint = minReset + Math.floor(_rand() * (maxReset - minReset));

  // Find the start of a phrase to restart from (look back 1-3 words)
  var restartStart = Math.max(0, resetPoint - 1 - Math.floor(_rand() * 2));

  // Build reset: truncate at resetPoint, then restart from restartStart
  var before = words.slice(0, resetPoint);
  var after = words.slice(restartStart);

  // If the restart creates a meaningful phrase, use it
  if (after.length >= 2) {
    // Insert reset marker and the restart
    var newWords = before.concat(['——'], after);
    // Replace words array content
    words.length = 0;
    for (var i = 0; i < newWords.length; i++) {
      words.push(newWords[i]);
    }
  }
}

/**
 * Inject breathing gaps — hesitation spacing and ellipsis.
 * "你打开了门。" → "你 …… 打开了门。"
 * Creates the feeling of reading through fog, each word requiring effort.
 *
 * Note: This is applied during joinSentences, not during word processing.
 * Words are marked with a sentinel property for gap insertion.
 *
 * @param {string[]} words - word array (mutated with gap markers)
 * @param {number} chance - gap probability
 * @param {function} _rand - random function
 * @returns {number} number of gaps injected (for tracking)
 */
function injectBreathingGaps(words, chance, _rand) {
  var gapCount = 0;
  // Insert gaps after ~20% of words (skip first/last)
  var startIdx = 1;
  var endIdx = words.length - 1;

  for (var i = startIdx; i < endIdx; i++) {
    if (!words[i] || words[i] === '') continue;
    if (_rand() < chance * 0.3) { // Scale: base chance * 0.3 per-word
      // Mark for gap insertion: append a sentinel
      words[i] = words[i] + '\x00GAP\x00';
      gapCount++;
    }
  }
  return gapCount;
}

/**
 * Check if a word is only punctuation/spacing.
 */
function isPunctuationOnly(word) {
  return /^[\s，。！？…—\-、；：""''（）【】《》…·\x00GAP\x00]*$/.test(word);
}

// ============================================================
// Text Splitting Utilities
// ============================================================

/**
 * Split text into sentences, preserving Chinese and English punctuation.
 */
function splitSentences(text) {
  // Split on Chinese/English sentence boundaries
  return text.split(/([。！？…\n]+)/).filter(function (s) { return s; });
}

/**
 * Split a sentence into words (Chinese: per-character words, English: space-separated).
 * Returns array of "word units" — each unit is either a CJK character sequence
 * or an English word/token.
 */
function splitWords(sentence) {
  // Strategy: split on whitespace first, then further split CJK runs
  var tokens = sentence.split(/\s+/).filter(function (t) { return t; });
  var words = [];

  for (var t = 0; t < tokens.length; t++) {
    var token = tokens[t];
    // Check if token contains CJK characters
    var hasCJK = /[一-鿿㐀-䶿]/.test(token);

    if (hasCJK) {
      // Split CJK text into individual characters as "words"
      // But group punctuation with preceding character
      var cjkChars = token.split('');
      var currentWord = '';

      for (var c = 0; c < cjkChars.length; c++) {
        var ch = cjkChars[c];
        var code = ch.charCodeAt(0);

        // CJK Unified Ideographs
        if (code >= 0x4E00 && code <= 0x9FFF) {
          if (currentWord) words.push(currentWord);
          currentWord = ch;
        }
        // CJK Extension A
        else if (code >= 0x3400 && code <= 0x4DBF) {
          if (currentWord) words.push(currentWord);
          currentWord = ch;
        }
        // CJK punctuation (keep attached to preceding word)
        else if (isCjkPunctuation(code)) {
          currentWord += ch;
        }
        // Latin/number (start new word)
        else {
          if (currentWord) words.push(currentWord);
          words.push(ch);
          currentWord = '';
        }
      }
      if (currentWord) words.push(currentWord);
    } else {
      // English/Latin token — treat as single word unit
      // But split if it contains punctuation
      var subTokens = token.match(/[a-zA-Z0-9]+|[^\w\s]/g) || [token];
      for (var st = 0; st < subTokens.length; st++) {
        words.push(subTokens[st]);
      }
    }
  }

  return words.filter(function (w) { return w.length > 0; });
}

/**
 * Check if a Unicode code point is CJK punctuation.
 */
function isCjkPunctuation(code) {
  return (
    (code >= 0x3000 && code <= 0x303F) || // CJK Symbols and Punctuation
    (code >= 0xFF00 && code <= 0xFFEF)    // Fullwidth Forms
  );
}

// ============================================================
// Text Joining (enhanced with breathing gap support)
// ============================================================

/**
 * Join processed word array back into text, handling spacing and gap markers.
 */
function joinSentences(sentenceArrays, tier, _rand) {
  var result = [];
  for (var si = 0; si < sentenceArrays.length; si++) {
    var words = sentenceArrays[si];
    var joined = '';
    var needsGapPass = tier.gapChance > 0;

    // First pass: build the text and inject breathing gaps
    var gapMarked = [];
    for (var w = 0; w < words.length; w++) {
      if (words[w] === '') continue;

      var word = words[w];
      var prevWord = w > 0 ? words[w - 1] : '';

      // Determine spacing
      if (needsSpaceBefore(prevWord, word)) {
        // Inject breathing gap at marked positions
        if (word.indexOf('\x00GAP\x00') >= 0) {
          word = word.replace('\x00GAP\x00', '');
          joined += '  ……  '; // Double space + ellipsis = breathing gap
        } else {
          joined += ' ';
        }
      }
      joined += word;
    }

    result.push(joined);
  }

  return result.join('');
}

function needsSpaceBefore(prev, curr) {
  if (!prev) return false;
  // No space before CJK punctuation
  if (isCjkPunctuation(curr.charCodeAt(0))) return false;
  // No space after CJK punctuation
  if (prev && isCjkPunctuation(prev.charCodeAt(prev.length - 1))) return false;
  // Space between Latin words
  var prevIsLatin = /[a-zA-Z0-9]/.test(prev.charAt(prev.length - 1));
  var currIsLatin = /[a-zA-Z0-9]/.test(curr.charAt(0));
  if (prevIsLatin && currIsLatin) return true;
  // No space between CJK chars
  return false;
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Calculate how many actions to take based on chance and available targets.
 */
function calculateActionCount(chance, available, _rand) {
  if (available <= 0 || chance <= 0) return 0;
  var count = 0;
  for (var i = 0; i < available; i++) {
    if (_rand() < chance) count++;
  }
  return count;
}

/**
 * Fisher-Yates shuffle (returns new array, doesn't modify input).
 */
function shuffleArray(arr, _rand) {
  var result = arr.slice();
  for (var i = result.length - 1; i > 0; i--) {
    var j = Math.floor(_rand() * (i + 1));
    var temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}
