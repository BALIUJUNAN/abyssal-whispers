// src/systems/explore/textRenderingPipeline.js — Composable text transformation pipeline.
// Extracted from exploreSlice.js Phase 3 (lines 304-375).
//
// Pipeline stages (applied in order):
//   1. applyDescriptionVariants    — loopCount-based description_variants
//   2. applyEchoOverlay            — cross-loop NPC death area overlay
//   3. getDistortionVariant        — SAN-thresholded distortion text
//   4. applyQualityTier            — quality_tier truncation (S/A full, B normal, C truncate)
//   5. applyUnreliableNarration    — SAN/pollution text corruption (gated by unreliable_narration_level)
//   6. applyFearLens               — fear-profile word substitution
//   7. applyTextHallucination      — SAN-stage character corruption
//   8. applyLightTextCorruption    — low-light visual distortion
//   9. applyResourceTextCorruption — resource-state flavor
//  10. applyTextVariantTracking    — cross-loop persistent text (seenEventTexts)
//  11. applyMythosAliases          — chapter-appropriate mythos name substitution
//  12. applyLevel13RealityDistortion — Lv13 reality distortion
//  13. applyTextFragmentation      — SAN-driven word crossing/vanishing/reordering
//
// Each stage is independently callable. renderEventText() composes the full pipeline.

import { getDistortionVariant } from '../../engine/EventEngine.js';
import { applyQualityTier } from '../../systems/explore/eventConsequenceSystem.js';
import { getSanTextVariant } from '../../reducers/sanReducer.js';
import { getPollutionText } from '../../reducers/loopReducer.js';
import { getSanStageFromGD } from '../../reducers/sanReducer.js';
import { applyFearLens } from '../../systems/fearLens.js';
import { applyTextHallucination } from '../../engine/PollutionManager.js';
import { applyLightTextCorruption } from '../../reducers/miscReducer.js';
import { applyResourceTextCorruption } from '../../systems/resourceNarrative.js';
import { getTrackedText } from '../../systems/textVariants.js';
import { applyMythosAliases, maybeInjectPhantomNarrative } from '../../systems/textVariants.js';
import { applyLevel13RealityDistortion } from '../../systems/textVariants.js';
import { applyTextFragmentation } from '../../systems/textFragmentation.js';

// ── Individual pipeline stages ─────────────────────────────────────

export function applyDescriptionVariants(evt, s) {
  if (!evt.description_variants) return evt;
  var loop = (s.loopCount || 0) + 1;
  var dv = evt.description_variants;
  if (loop <= 1) {
    // no change
  } else if (loop <= 3) {
    evt.description = dv.visit_2_3 || evt.description;
  } else if (loop <= 6) {
    evt.description = dv.visit_4_6 || dv.visit_2_3 || evt.description;
  } else {
    evt.description = dv.visit_7_plus || dv.visit_4_6 || evt.description;
  }
  return evt;
}

export function applyEchoOverlay(evt, s) {
  if (!evt.echo_overlay || !s.loopEchoes || !s.loopEchoes.deadNpcAreas) return evt;
  var currentArea = s.currentArea || '';
  if (s.loopEchoes.deadNpcAreas.indexOf(currentArea) >= 0) {
    evt.description = evt.description + '\n\n' + evt.echo_overlay;
  }
  return evt;
}

export function applyUnreliableNarration(text, unrelLevel, san, pollution, rng) {
  if (unrelLevel >= 2) {
    return getPollutionText(getSanTextVariant(text, san, pick, null, rng), pollution || 0, rng);
  } else if (unrelLevel === 1) {
    return getPollutionText(text, pollution || 0, rng);
  }
  // level 0: completely clean text
  return text;
}

export function applyTextVariantTracking(evtId, text, pollution, loopCount, seenTexts, difficultyLevel, rng) {
  var result = getTrackedText(evtId, text, pollution || 0, loopCount || 0, seenTexts, difficultyLevel, rng);
  return result.action !== 'skip' ? result.text : text;
}

// ── Composable pipeline ─────────────────────────────────────────────

/**
 * Render event text through the full transformation pipeline.
 * Mutates evt.description for description_variants and echo_overlay.
 *
 * @param {object} evt - event object (mutated for variants)
 * @param {object} s - game state
 * @param {object} ctx - { GD }
 * @param {object} c - reducer context { narr, effects, rng, ... }
 * @returns {string} rendered event text
 */
export function renderEventText(evt, s, ctx, c) {
  // Pre-processing: mutate evt.description for loop-conditioned variants
  applyDescriptionVariants(evt, s);
  applyEchoOverlay(evt, s);

  // Core pipeline
  var text = getDistortionVariant(evt, s, c.rng) || evt.description;
  text = applyQualityTier(text, evt, s);

  var unrelLevel = evt.unreliable_narration_level || 0;
  if (unrelLevel >= 2) {
    text = getPollutionText(getSanTextVariant(text, s.san, pick, ctx, c.rng), s.pollution || 0, c.rng);
  } else if (unrelLevel === 1) {
    text = getPollutionText(text, s.pollution || 0, c.rng);
  }

  if (s.fearTuning && s.fearTuning.primary) text = applyFearLens(evt, text, s, c.rng);
  text = applyTextHallucination(text, s.san, getSanStageFromGD, c.rng);
  text = applyLightTextCorruption(text, s.lightLevel || 0, ctx, c.rng);
  text = applyResourceTextCorruption(text, s, c.rng);

  if (!s.seenEventTexts) s.seenEventTexts = {};
  text = applyTextVariantTracking(evt.id, text, s.pollution || 0, s.loopCount || 0, s.seenEventTexts, s.difficultyLevel, c.rng);

  text = applyMythosAliases(text, s.currentChapter || 'chapter_1', s.mythosLevel || 0, ctx, undefined, c.rng);
  text = applyLevel13RealityDistortion(text, s.difficultyLevel, c.rng);

  var isCriticalEvent = evt.tier === 'signature' || evt.tier === 'ending' || evt.once_per_run;
  text = applyTextFragmentation(text, s.san, c.rng, {
    isCritical: isCriticalEvent,
    maxSeverity: s.difficultyLevel >= 13 ? 6 : 5,
    loopCount: s.loopCount || 0,
    difficultyLevel: s.difficultyLevel,
  }, ctx);

  return text;
}

/**
 * Narrate the rendered event text with full metadata.
 * Extracted from exploreSlice.js Phase 3 narration block (lines 364-375).
 *
 * @param {object} evt - event object
 * @param {string} evtText - rendered text
 * @param {object} s - game state
 * @param {object} c - reducer context
 */
export function narrateEvent(evt, evtText, s, c) {
  c.narr('event', evtText, {
    eventTitle: evt.name,
    eventType: evt.type || evt.event_classification,
    imageSrc:
      getEventImage(evt.id) ||
      getAreaSceneImage(s.currentArea, {
        ...c.view,
        visits: (s.visitedAreas || []).filter(function (a) { return a === s.currentArea; }).length,
      }),
    imageAlt: evt.name,
    _ugcAuthor: evt._ugcAuthor || null,
  });
}

// Helper used by applyUnreliableNarration
function pick(arr, rng) {
  if (!arr || arr.length === 0) return undefined;
  if (rng && rng.intBetween) return arr[rng.intBetween(0, arr.length - 1)];
  return arr[Math.floor(Math.random() * arr.length)];
}
