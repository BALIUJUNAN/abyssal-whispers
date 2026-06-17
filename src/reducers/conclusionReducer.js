// src/reducers/conclusionReducer.js - Evidence-based conclusion deduction

import { makeRand } from './utils.js';
import { hasClueId } from '../utils/clueNameMap.js';

/**
 * Check if a single evidence source is satisfied by current state.
 */
export function isEvidenceSatisfied(ev, state) {
  // Direct event trigger
  if (ev.source && state.triggeredEvents.includes(ev.source)) return true;
  // NPC trust requirement: "玛莎·格雷 trust>=4"
  const trustMatch = ev.source && ev.source.match(/^(.+?)\s+trust>=(\d+)$/);
  if (trustMatch) {
    const npcName = trustMatch[1];
    const needed = parseInt(trustMatch[2]);
    return (state.npcTrust[npcName] || 0) >= needed;
  }
  // Clue-based
  if (ev.source && hasClueId(state.clues, ev.source)) return true;
  return false;
}

/**
 * Check all conclusions against current state.
 * Returns newly discovered conclusions (not yet in discoveredConclusions).
 */
export function checkConclusions(state, ctx) {
  const { GD } = ctx;
  const conclusionSystem = GD.systems?.clue_conclusion;
  if (!conclusionSystem) return [];
  const conclusions = conclusionSystem.conclusions || [];
  const discovered = state.discoveredConclusions || [];
  const newlyFound = [];

  for (const conc of conclusions) {
    if (discovered.includes(conc.id)) continue;
    if (
      conc.chapter_unlock &&
      state.day <
        (conc.chapter_unlock <= 1
          ? 1
          : conc.chapter_unlock <= 2
            ? 4
            : conc.chapter_unlock <= 3
              ? 8
              : 15)
    )
      continue;
    const satisfied = (conc.evidence_pool || []).filter((ev) => isEvidenceSatisfied(ev, state));
    const needed = conc.required_evidence_count || 2;
    if (satisfied.length >= needed) {
      newlyFound.push({
        id: conc.id,
        name: conc.name,
        evidence: satisfied.map((e) => e.description),
        unlocks: conc.unlocks || [],
      });
    }
  }
  return newlyFound;
}

/**
 * Check if any false interpretation triggers based on state.
 */
export function checkFalseInterpretations(state, ctx, rng) {
  const { GD } = ctx;
  const conclusionSystem = GD.systems?.clue_conclusion;
  if (!conclusionSystem) return [];
  const conclusions = conclusionSystem.conclusions || [];
  const results = [];
  var _rand = makeRand(rng);
  for (const conc of conclusions) {
    if ((state.discoveredConclusions || []).includes(conc.id)) continue;
    for (const fi of conc.false_interpretations || []) {
      // If player has some evidence but not enough, and made a wrong assumption
      const satisfied = (conc.evidence_pool || []).filter((ev) => isEvidenceSatisfied(ev, state));
      if (satisfied.length > 0 && satisfied.length < (conc.required_evidence_count || 2)) {
        // 10% chance per explore to trigger false interpretation warning
        if (_rand() < 0.1) {
          results.push({
            conclusion: conc.name,
            interpretation: fi.interpretation,
            consequence: fi.consequence,
          });
        }
      }
    }
  }
  return results;
}
