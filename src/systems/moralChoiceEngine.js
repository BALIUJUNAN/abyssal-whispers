// src/systems/moralChoiceEngine.js — Moral Choice Engine
// Integrates NPC relationship web, fear moral modifiers, and implicit endings.
// This is the SINGLE entry point for all moral choice processing.
//
// Flow:
//   Player makes NPC choice → npcSlice calls moralChoiceEngine
//   → propagateReputation (affects connected NPCs)
//   → getFactionImpact (affects faction standing)
//   → recordDilemmaChoice (tracks for endings)
//   → getMoralPressureEvents (generates atmospheric events)
//   → emit('MORAL_EVENT', ...) (triggers narrative side effects)

import { propagateReputation, getFactionImpact, computeMoralScore, getMoralTier } from '../data/npcRelationshipWeb.js';
import { calculateDilemmaIntensity, applyCopingFraming, getMoralPressureEvents, selectMoralDilemma } from './fearMoralModifier.js';
import { getShadowNarrativeFlavor, computeShadowScores, getEndingEntropy } from './implicitEndingSystem.js';

// ═══════════════════════════════════════════════════════════════
// SECTION 1: NPC Choice Processing
// ═══════════════════════════════════════════════════════════════

/**
 * Process an NPC interaction choice through the moral system.
 * Called by npcSlice when player makes any NPC choice.
 *
 * @param {object} state - game state (will be mutated)
 * @param {string} npcId - NPC being interacted with
 * @param {string} actionType - 'redeem', 'betray', 'exploit', 'attack', 'intimacy', 'preach', 'mercy', 'warn'
 * @param {object} GD - game data
 * @returns {{ reputationRipples: Array, factionChanges: object, moralScoreDelta: number }}
 */
export function processNpcMoralChoice(state, npcId, actionType, GD) {
  var bt = state.behaviorTracking || {};
  var trustDelta = 0;
  var moralDelta = 0;

  // Calculate trust change
  switch (actionType) {
    case 'redeem':
      trustDelta = 3;
      moralDelta = 10;
      bt.redeemed_npcs = (bt.redeemed_npcs || 0) + 1;
      break;
    case 'betray':
      trustDelta = -4;
      moralDelta = -15;
      var trust = (state.npcTrust || {})[npcId] || 0;
      if (trust >= 3) bt.betrayed_high_trust_npcs = (bt.betrayed_high_trust_npcs || 0) + 1;
      break;
    case 'exploit':
      trustDelta = -2;
      moralDelta = -8;
      bt.npc_as_resource_count = (bt.npc_as_resource_count || 0) + 1;
      break;
    case 'attack':
      trustDelta = -5;
      moralDelta = -10;
      bt.direct_kill_count = (bt.direct_kill_count || 0) + 1;
      break;
    case 'intimacy':
      trustDelta = 1;
      moralDelta = -2;
      bt.forbidden_intimacy_flags = (bt.forbidden_intimacy_flags || 0) + 1;
      break;
    case 'preach':
      trustDelta = -1;
      moralDelta = -5;
      bt.cult_leader_score = (bt.cult_leader_score || 0) + 1;
      break;
    case 'mercy':
      trustDelta = 2;
      moralDelta = 8;
      bt.mercy_shown_count = (bt.mercy_shown_count || 0) + 1;
      break;
    case 'warn':
      trustDelta = 1;
      moralDelta = 5;
      bt.warned_npcs_count = (bt.warned_npcs_count || 0) + 1;
      break;
    case 'incite':
      trustDelta = -3;
      moralDelta = -12;
      break;
    default:
      trustDelta = 0;
      moralDelta = 0;
  }

  // Apply trust change
  if (trustDelta !== 0) {
    var currentTrust = (state.npcTrust || {})[npcId] || 0;
    state.npcTrust = state.npcTrust || {};
    state.npcTrust[npcId] = Math.max(0, Math.min(5, currentTrust + trustDelta));
  }

  // Propagate reputation through network
  var ripples = propagateReputation(npcId, trustDelta, state);

  // Apply faction impact
  var factionImpact = getFactionImpact(npcId,
    actionType === 'redeem' || actionType === 'mercy' || actionType === 'warn' ? 'help'
    : actionType === 'betray' || actionType === 'attack' || actionType === 'incite' ? 'harm'
    : actionType === 'exploit' ? 'exploit'
    : 'help'
  );

  // Apply ripple trust changes to state
  for (var i = 0; i < ripples.ripples.length; i++) {
    var ripple = ripples.ripples[i];
    if (ripple.isDirect) continue; // already applied
    if (ripple.delta === 0) continue;
    state.npcTrust = state.npcTrust || {};
    var rt = (state.npcTrust[ripple.npc] || 0);
    state.npcTrust[ripple.npc] = Math.max(0, Math.min(5, rt + ripple.delta));
  }

  // Emit moral event for narrative system
  if (typeof emit !== 'undefined') {
    emit('MORAL_CHOICE_MADE', {
      npc: npcId,
      action: actionType,
      trustDelta: trustDelta,
      moralDelta: moralDelta,
      ripples: ripples.ripples.filter(function (r) { return !r.isDirect; }),
      day: state.day,
    });
  }

  return {
    reputationRipples: ripples.ripples,
    factionChanges: factionImpact.factionChanges,
    moralScoreDelta: moralDelta,
  };
}

// ═══════════════════════════════════════════════════════════════
// SECTION 2: Dilemma Injection into Event System
// ═══════════════════════════════════════════════════════════════

/**
 * Check if a moral dilemma should be injected into the current event pool.
 * Called during event selection to potentially replace/augment a normal event.
 *
 * @param {object} state
 * @param {object} GD
 * @returns {object|null} dilemma event data
 */
export function injectMoralDilemma(state, GD) {
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
  var rng = state._rng || Math;
  if (rng.next ? rng.next() : Math.random() > chance) return null;

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
// SECTION 3: Narrative Integration
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
// SECTION 4: Initialization
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
