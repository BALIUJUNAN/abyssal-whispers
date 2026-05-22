// src/reducers/loopReducer.js - Multi-loop pollution system
// Each death/restart increments loop count; pollution affects map names and event text.

import { pick } from './utils.js';

/**
 * Get the loop count effects for a given loop number.
 */
export function getLoopEffect(loopCount, ctx) {
  const { GD } = ctx;
  const effects = GD.systems?.loop?.loop_count_effects || {};
  const key = loopCount <= 5 ? 'loop_' + loopCount : 'loop_6_plus';
  return effects[key] || { san_cap_reduction: 0, pollution_intensity: 0 };
}

// Pollution text fragments that get mixed into descriptions
const POLLUTION_SUFFIXES = [
  '你总觉得有什么东西在看着你。',
  '远处传来一声低语，但你听不清内容。',
  '你的影子似乎比你慢了半拍。',
  '空气中有股咸腥味。',
  '你恍惚间听到有人叫你的名字。',
  '墙角的阴影蠕动了一下。',
  '你的记忆中有一段不属于这里的画面。',
  '某个声音在你脑海中回荡。',
];

// Text quality: forbidden words from design_intent.text_style
// Avoid direct horror cliches in procedurally generated text
const FORBIDDEN_WORDS = ['不可名状', '疯狂', '恐怖', '诡异', '扭曲', '令人毛骨悚然', '骇人听闻', '极度恐惧'];

/**
 * Check if text contains forbidden words (design quality check).
 * Returns list of found forbidden words, or empty array if clean.
 */
export function checkTextQuality(text) {
  return FORBIDDEN_WORDS.filter(w => text.includes(w));
}

/**
 * Potentially add pollution text to event descriptions.
 * Returns modified text if pollution triggers, otherwise original.
 */
export function getPollutionText(text, pollution) {
  if (pollution <= 0 || Math.random() >= pollution * 0.15) return text;
  return text + '\n\n' + pick(POLLUTION_SUFFIXES);
}
