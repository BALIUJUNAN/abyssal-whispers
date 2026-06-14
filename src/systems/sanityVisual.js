// src/systems/sanityVisual.js - SAN visual presentation system
// Centralizes ALL SAN -> visual/UI/CSS logic. No game-state mutations.
// Pure computations only; reads GD from window.GD (same as rest of codebase).
//
// Extracted from:
//   - sanReducer.js  (getSanStage presentation, getSanTextVariant, getSanSceneVariant)
//   - SanPollutionLayer.jsx  (getVisualForSan stage-finding duplicate)
//   - appHelpers.js  (getPerceptionLevels)
//   - app.jsx  (inline CSS class derivation)

import { clamp } from '../reducers/utils.js';

// --------------------------------------------
// Section 1: Shared stage lookup (SSOT for visuals)
// --------------------------------------------

/**
 * Find the san_stages array index for a given SAN value.
 * @param {number} san
 * @param {object[]} stages - GD.systems.sanity.san_stages
 * @returns {number} index into stages array, or -1 for empty
 */
export function findSanStageIndex(san, stages) {
  if (!stages || stages.length === 0) return -1;
  if (san <= 0) return stages.length;
  for (var i = 0; i < stages.length; i++) {
    if (san >= stages[i].range[0] && san <= stages[i].range[1]) return i;
  }
  return stages.length - 1;
}

// --------------------------------------------
// Section 2: Presentation layer for getSanStage
// --------------------------------------------

var COLOR_MAP = {
  stable: 'var(--san-high)',
  mild_erosion: 'var(--san-high)',
  perception_shift: 'var(--san-mid)',
  explanation_loss: 'var(--danger2)',
  reality_dissolution: 'var(--danger)',
  narrative_death: 'var(--danger2)',
  death: 'var(--danger2)',
};

var TEXT_MOD_MAP = {
  stable: '',
  mild_erosion: '',
  perception_shift: '你感到一阵轻微的不安。远处传来什么东西倒塌的声音。',
  explanation_loss: '你的注意力难以集中。某些声音听起来像在叫你的名字。角落里的阴影似乎在移动。',
  reality_dissolution: '你的手在发抖。你不确定脚下是地面还是深渊。有人在你耳边低语——不，是很多人的声音，重叠在一起。',
  narrative_death: '你的视野在融化，墙壁在呼吸。一切都不是你认识的样子。',
  death: '',
};

/**
 * Build presentation data for a SAN stage.
 * @param {object} stage - raw stage from GD.systems.sanity.san_stages
 * @returns {{ id, name, color, apMod, textMod, desc, special_effects, level, visual_tier, event_weight }}
 */
export function buildSanStagePresentation(stage) {
  return {
    id: stage.id,
    name: stage.name,
    color: COLOR_MAP[stage.id] || 'var(--san-high)',
    apMod: stage.ap_modifier || 0,
    textMod: TEXT_MOD_MAP[stage.id] || '',
    desc: stage.description || '',
    special_effects: stage.pollution_effects || [],
    level: stage.level || 0,
    visual_tier: stage.visual_tier || 'clean',
    event_weight: stage.event_weight || { buffer_boost: 1.0, horror_penalty: 1.0 },
  };
}

// --------------------------------------------
// Section 3: Text corruption (SAN-dependent)
// --------------------------------------------

/** @private Stage lookup via getCurrentSanStage (SSOT from utils.js) */
function _getStage(san, ctx) {
  try {
    var utils = require('../reducers/utils.js');
    return utils.getCurrentSanStage(san, ctx);
  } catch (e) {
    var GD = ctx.GD || (typeof window !== 'undefined' && window.GD) || {};
    var stages = (GD.systems && GD.systems.sanity && GD.systems.sanity.san_stages) || [];
    if (san <= 0) return { id: 'death', level: 6 };
    for (var i = 0; i < stages.length; i++) {
      if (san >= stages[i].range[0] && san <= stages[i].range[1]) return stages[i];
    }
    return stages[0] || { id: 'stable', level: 0 };
  }
}

function _pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Apply SAN-dependent text corruption to a narrative string.
 * Probability gradients, not hard switches - each call rolls independently.
 *
 * @param {string} baseText  - original narrative text
 * @param {number} san       - current SAN value
 * @param {function} pickFn  - pick(array) function (deterministic if seeded)
 * @param {object} ctx       - { GD }
 * @returns {string} possibly corrupted text
 */
export function getSanTextVariant(baseText, san, pickFn, ctx) {
  var stage = _getStage(san, ctx || { GD: {} });
  var textMod = TEXT_MOD_MAP[stage.id] || '';
  if (!textMod) return baseText;
  var level = stage.level || 0;
  // DESIGN_REFACTOR_NOTES.md: "降低中后期触发频率" — precise horror, not noise.
  // Each tier is deliberately rarer than the last. The player should feel unease,
  // not habituation. If every text is corrupted, nothing is corrupted.

  if (level >= 5) {
    // narrative_death: char-level corruption — still unsettling, but 60% → 35% append
    var charChance = Math.max(0.005, Math.min(0.03, (10 - san) * 0.003));
    var words = baseText.split('');
    var corrupted = words
      .map(function (c, i) {
        return Math.random() < charChance ? (pickFn || _pick)(['…', '·', '?', '□', c, c]) : c;
      })
      .join('');
    return corrupted + (Math.random() < 0.35 ? '\n\n—— ' + textMod : '');
  }
  if (level >= 4) {
    // reality_dissolution: 60% max → 25% max. Should feel like a crack, not a flood.
    var chance4 = Math.max(0.03, (25 - san) / 25 * 0.25);
    return baseText + (Math.random() < chance4 ? '\n\n' + textMod : '');
  }
  if (level >= 3) {
    // explanation_loss: 30% max → 12% max. A whisper, not a shout.
    var chance3 = Math.max(0.015, (40 - san) / 40 * 0.12);
    return baseText + (Math.random() < chance3 ? '\n\n—— 你眨了眨眼。' + textMod : '');
  }
  if (level >= 2) {
    // perception_shift: 8% max → 5% max. Barely perceptible.
    var chance2 = Math.max(0.01, (55 - san) / 55 * 0.05);
    if (Math.random() < chance2) {
      var whispers = ['……你确定吗？', '（远处有什么在动。）', '（你没有看错。）', '（不，你可能看错了。）'];
      return baseText + '\n\n' + whispers[Math.floor(Math.random() * whispers.length)];
    }
  }
  return baseText;
}

// --------------------------------------------
// Section 4: Scene variant lookup
// --------------------------------------------

/**
 * Get a SAN-level text variant for a specific scene key.
 * @param {string} sceneKey
 * @param {number} san
 * @param {object} ctx - { GD }
 * @returns {string|null}
 */
export function getSanSceneVariant(sceneKey, san, ctx) {
  var GD = ctx.GD;
  var variants =
    (GD.implementation_notes && GD.implementation_notes.san_text_variants && GD.implementation_notes.san_text_variants.variants)
      ? GD.implementation_notes.san_text_variants.variants[sceneKey]
      : null;
  if (!variants) return null;
  var stage = _getStage(san, ctx);
  var level = stage.level || 0;
  if (level >= 4) return variants.san_low || variants.normal_text;
  if (level >= 3) return variants.san_mid || variants.normal_text;
  if (level >= 2) return variants.subtle_wrong_text || variants.normal_text;
  return variants.san_high || variants.normal_text;
}

// --------------------------------------------
// Section 5: Canvas visual parameters (for SanPollutionLayer)
// --------------------------------------------

var _CLEAN_VIS = {
  saturation: 0, vignette: 0, scanline: 0, noise: 0,
  barrel_distortion: 0, chromatic_aberration: 0, rotation: 0,
  text_shadow: false, text_tremble: false, glow: false,
};

/**
 * Compute interpolated visual parameters for the canvas overlay.
 * Replaces the duplicate getVisualForSan previously in SanPollutionLayer.jsx.
 *
 * @param {number} san
 * @returns {{ sat, vig, scan, noise, barrel, chroma, rot, shadow, tremble, glow, level }}
 */
export function getVisualForSan(san) {
  var GD = (typeof window !== 'undefined' && window.GD) || {};
  var stages = (GD.systems && GD.systems.sanity && GD.systems.sanity.san_stages) || [];
  if (stages.length === 0) {
    return { sat: 0, vig: 0, scan: 0, noise: 0, barrel: 0, chroma: 0, rot: 0, shadow: false, tremble: false, glow: false, level: 0 };
  }
  var curIdx = findSanStageIndex(san, stages);
  if (curIdx < 0) curIdx = 0;
  if (curIdx >= stages.length) curIdx = stages.length - 1;
  var cur = stages[curIdx];
  var curVis = cur.visual || _CLEAN_VIS;
  var _stableMin = stages[0] && stages[0].range ? stages[0].range[0] : 75;
  if (curIdx >= stages.length - 1 || san >= _stableMin) {
    return {
      sat: curVis.saturation || 0, vig: curVis.vignette || 0,
      scan: curVis.scanline || 0, noise: curVis.noise || 0,
      barrel: curVis.barrel_distortion || 0, chroma: curVis.chromatic_aberration || 0,
      rot: curVis.rotation || 0, shadow: !!curVis.text_shadow,
      tremble: !!curVis.text_tremble, glow: !!curVis.glow, level: cur.level || 0,
    };
  }
  var rangeSize = cur.range[1] - cur.range[0];
  var blend = rangeSize > 0 ? Math.max(0, Math.min(1, (cur.range[1] - san) / rangeSize)) : 0;
  var next = stages[curIdx + 1];
  var nextVis = next.visual || _CLEAN_VIS;
  return {
    sat: _lerp(curVis.saturation || 0, nextVis.saturation || 0, blend),
    vig: _lerp(curVis.vignette || 0, nextVis.vignette || 0, blend),
    scan: _lerp(curVis.scanline || 0, nextVis.scanline || 0, blend),
    noise: _lerp(curVis.noise || 0, nextVis.noise || 0, blend),
    barrel: _lerp(curVis.barrel_distortion || 0, nextVis.barrel_distortion || 0, blend),
    chroma: _lerp(curVis.chromatic_aberration || 0, nextVis.chromatic_aberration || 0, blend),
    rot: _lerp(curVis.rotation || 0, nextVis.rotation || 0, blend),
    shadow: curVis.text_shadow || (blend > 0.5 && nextVis.text_shadow),
    tremble: curVis.text_tremble || (blend > 0.3 && nextVis.text_tremble),
    glow: curVis.glow || (blend > 0.5 && nextVis.glow),
    level: cur.level || 0,
  };
}

function _lerp(a, b, t) { return a + (b - a) * t; }

// --------------------------------------------
// Section 6: CSS class derivation (for app.jsx render)
// --------------------------------------------

/**
 * Derive all SAN-related CSS class fragments for the game root element.
 * @param {number} san
 * @param {boolean} allowVisualFX
 * @param {object} ctx - { GD }
 * @returns {{ vtClass: string, stageClass: string, sanClass: string, stage: object, level: number }}
 */
export function getSanStageClasses(san, allowVisualFX, ctx) {
  var stage = _getStage(san, ctx);
  var presentation = buildSanStagePresentation(stage);
  var level = presentation.level || 0;
  var vtClass = allowVisualFX && presentation.visual_tier && presentation.visual_tier !== 'clean'
    ? ' visual-' + presentation.visual_tier : '';
  var stageClass = allowVisualFX && level >= 1 ? ' san-stage-' + Math.min(level, 5) : '';
  var sanClass = '';
  if (allowVisualFX) {
    if (level >= 5) sanClass = ' san-fracture san-death';
    else if (level >= 4) sanClass = ' san-fracture';
    else if (level >= 3) sanClass = ' san-tremor';
  }
  return { vtClass: vtClass, stageClass: stageClass, sanClass: sanClass, stage: presentation, level: level };
}

// --------------------------------------------
// Section 7: Perception levels (visual/audio/input intensity)
// --------------------------------------------

/**
 * Compute perception distortion levels from game state.
 * @param {object} state
 * @returns {{ focus: number, edge: number, audio: number, input: number, text: number }}
 */
export function getPerceptionLevels(state) {
  var san = state.san || 0;
  var loop = state.loopCount || 0;
  var corr = state.safehouseCorruption || 0;
  var mythos = state.mythosLevel || 0;
  var focus = 0, edge = 0, audio = 0, input = 0, text = 0;
  var stage = _getStage(san, { GD: (typeof window !== 'undefined' && window.GD) || {} });
  if (stage.level >= 2) { focus++; text++; }
  if (mythos >= 10) { audio++; edge++; }
  if (loop >= 3) { text++; input++; }
  if (corr >= 50) { focus++; edge++; audio++; input++; text++; }
  if (['deep_catacombs', 'ruins_of_yith'].includes(state.currentArea)) {
    focus++; edge++; audio++; input++; text++;
  }
  return {
    focus: Math.min(focus, 3), edge: Math.min(edge, 3),
    audio: Math.min(audio, 4), input: Math.min(input, 4), text: Math.min(text, 4),
  };
}
