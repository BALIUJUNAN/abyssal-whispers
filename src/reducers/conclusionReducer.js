// src/reducers/conclusionReducer.js - Evidence-based conclusion deduction

import { makeRand } from './utils.js';
import { hasClueId } from '../utils/clueNameMap.js';
import { hasTriggered } from '../utils/triggeredSet.js';
import { resolveNpcId } from '../data/registry/npcRegistry.js';
import { resolveItemId } from '../data/registry/itemRegistry.js';

// A few authored clue sources are narrative labels rather than runtime ids.
// Keep those labels readable in data and bridge them to their real producers
// at this single protocol boundary.
export var EVIDENCE_SOURCE_ALIASES = {
  封印仪式残页: ['evt_seal_ritual', '封印仪式记录（关键线索）'],
  禁书: ['evt_church_bell', '扭曲的圣经页'],
  教堂地下室调查: ['evt_ch2_church_basement'],
};

/**
 * Check if a single evidence source is satisfied by current state.
 */
export function isEvidenceSatisfied(ev, state) {
  const source = ev && typeof ev.source === 'string' ? ev.source.trim() : '';
  if (!source) return false;

  // Clue-chain data uses "A + B" for conjunctions. Resolve every component
  // through this same adapter so events, clues, items and trust gates compose.
  if (source.includes('+')) {
    return source.split(/\s*\+\s*/).every(function (part) {
      return isEvidenceSatisfied({ source: part.trim() }, state);
    });
  }

  // Direct event trigger
  if (hasTriggered(state, source)) return true;
  // Accept both protocols found in data: "玛莎·格雷 trust>=4" and
  // "玛莎·格雷信任≥4".
  const trustMatch = source.match(/^(.+?)\s*(?:trust|信任)\s*(?:>=|≥)\s*(\d+)$/i);
  if (trustMatch) {
    const npcName = trustMatch[1].trim();
    const needed = parseInt(trustMatch[2]);
    const trust = state.npcTrust || {};
    const npcId = resolveNpcId(npcName);
    return (trust[npcName] ?? trust[npcId] ?? 0) >= needed;
  }
  const aliases = EVIDENCE_SOURCE_ALIASES[source];
  if (aliases) {
    return aliases.some(function (candidate) {
      return isEvidenceSatisfied({ source: candidate }, state);
    });
  }
  // Clue-based
  if (hasClueId(state.clues || [], source)) return true;
  // Older sources use localized item names; newer ones use stable ids.
  const resolvedItemId = resolveItemId(source);
  if (
    (state.inventory || []).some(function (item) {
      if (typeof item === 'string') return item === source || item === resolvedItemId;
      return item && (item.id === source || item.id === resolvedItemId || item.name === source);
    })
  )
    return true;
  return false;
}

/**
 * Return undiscovered conclusions for which the player has partial evidence.
 * UI surfaces must reuse this function instead of maintaining their own copy
 * of the evidence schema.
 */
export function getInProgressConclusions(state, ctx) {
  const GD = ctx && ctx.GD;
  const conclusions = GD?.systems?.clue_conclusion?.conclusions || [];
  const discovered = state.discoveredConclusions || [];

  return conclusions
    .filter((conc) => !discovered.includes(conc.id))
    .map((conc) => {
      const satisfiedEvidence = (conc.evidence_pool || []).filter((ev) =>
        isEvidenceSatisfied(ev, state)
      );
      const requiredEvidenceCount = conc.required_evidence_count || 2;
      return {
        ...conc,
        satisfiedEvidence,
        requiredEvidenceCount,
      };
    })
    .filter(
      (conc) =>
        conc.satisfiedEvidence.length > 0 &&
        conc.satisfiedEvidence.length < conc.requiredEvidenceCount
    );
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
