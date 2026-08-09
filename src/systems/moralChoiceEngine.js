// src/systems/moralChoiceEngine.js — moral dilemmas, delayed effects and atmosphere.
// Direct NPC choices are settled once by their domain branch modules.

import { computeMoralScore, getMoralTier } from '../data/npcRelationshipWeb.js';
import { calculateDilemmaIntensity, applyCopingFraming, getFearMoralProfile, getMoralPressureEvents, selectMoralDilemma } from './fearMoralModifier.js';
import { getShadowNarrativeFlavor, getEndingEntropy } from './implicitEndingSystem.js';
import { makeRand } from '../reducers/utils.js';

// ═══════════════════════════════════════════════════════════════
// SECTION 1: Dilemma Injection into Event System
// ═══════════════════════════════════════════════════════════════

/**
 * Check if a moral dilemma should be injected into the current event pool.
 * Called during event selection to potentially replace/augment a normal event.
 *
 * @param {object} state
 * @param {object} GD
 * @returns {object|null} dilemma event data
 */
export function injectMoralDilemma(state, GD, rng) {
  var fear = state.fearTuning || {};
  var primary = fear.primary || 'knowledge';

  // Morality fear players get dilemmas 2x more often
  var chance = primary === 'morality' ? 0.25 : 0.12;

  // Coping style modifier
  var coping = fear.coping || 'investigative';
  var copingChanceMod = {
    avoidant: 0.8,
    investigative: 1.0,
    social: 1.2,
    controlling: 1.1,
    sacrificial: 1.4,
    predatory: 0.7,
  };
  chance *= (copingChanceMod[coping] || 1.0);

  // Check moral score — players in moral conflict get more dilemmas
  var moralScore = computeMoralScore(state);
  if (moralScore >= 20 || moralScore <= -20) {
    chance *= 1.3; // 30% more likely when morally engaged
  }

  // Roll
  var _rand = makeRand(rng || state._rng);
  if (_rand() > chance) return null;

  // Select dilemma
  return selectMoralDilemma(state, GD);
}

/**
 * Resolve a moral dilemma choice's delayed effects.
 * Called during day processing.
 *
 * @param {object} state
 * @param {object} GD
 */
export function resolveDelayedMoralEffects(state, GD) {
  var scheduled = state._scheduledEffects || [];
  var currentDay = state.day || 1;
  var remaining = [];
  var effects = [];

  for (var i = 0; i < scheduled.length; i++) {
    var se = scheduled[i];
    if (se.type !== 'delayed_moral') {
      remaining.push(se);
      continue;
    }
    if (currentDay >= se.triggerDay) {
      effects.push(se);
      // Don't add to remaining — consume it
    } else {
      remaining.push(se);
    }
  }

  state._scheduledEffects = remaining;
  return effects;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 2: Narrative Integration
// ═══════════════════════════════════════════════════════════════

/**
 * Get narrative flavor text based on current moral state and fear profile.
 * Used by the narrative system to add atmospheric moral weight.
 *
 * @param {object} state
 * @returns {{ shadowFlavor: string|null, moralTier: string, pressureEvents: Array }}
 */
export function getMoralNarrativeAtmosphere(state) {
  var bt = state.behaviorTracking || {};
  var fear = state.fearTuning || {};
  var primary = fear.primary || 'knowledge';

  // Shadow score flavor (from implicit ending system)
  var shadowFlavor = getShadowNarrativeFlavor(bt);

  // Moral tier
  var moralScore = computeMoralScore(state);
  var moralTier = getMoralTier(moralScore);

  // Moral pressure events
  var pressureEvents = getMoralPressureEvents(state);

  return {
    shadowFlavor: shadowFlavor.flavor,
    shadowAxis: shadowFlavor.axis,
    shadowIntensity: shadowFlavor.intensity,
    moralScore: moralScore,
    moralTier: moralTier.tier,
    moralDescription: moralTier.description,
    pressureEvents: pressureEvents,
    fearLabel: getFearMoralProfile(primary).label,
  };
}

/**
 * Get the "moral dissonance" level — how contradictory the player's
 * behavior patterns are. High dissonance = more intense narrative pressure.
 *
 * @param {object} state
 * @returns {number} 0-1 dissonance level
 */
export function getMoralDissonance(state) {
  var bt = state.behaviorTracking || {};
  var entropy = getEndingEntropy(bt);
  return Math.min(1, entropy.contradictionLevel * 0.25);
}

// ═══════════════════════════════════════════════════════════════
// SECTION 3: Initialization
// ═══════════════════════════════════════════════════════════════

/**
 * Initialize moral choice tracking in state.
 * Call once during NEW_GAME.
 *
 * @param {object} state
 */
export function initMoralChoiceState(state) {
  state._dilemmaChoices = [];
  state._scheduledEffects = [];
  state._dilemmaUsageCount = {};
  state._npcRelationshipMemory = {};
}

/**
 * Reset moral choice state for new loop.
 *
 * @param {object} state
 * @param {object} prevState - previous loop's state
 */
export function resetMoralChoiceState(state, prevState) {
  // Carry over some moral memory across loops
  state._dilemmaChoices = [];
  state._scheduledEffects = [];

  // Keep moral score trend (not exact value — memory fades)
  var prevMoral = prevState ? computeMoralScore(prevState) : 0;
  state._carriedMoralWeight = prevMoral; // influences starting moral score
}
