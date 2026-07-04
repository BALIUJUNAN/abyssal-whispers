// src/systems/explore/eventSelectionSystem.js — Phase 1: Event selection pipeline
// Extracted from exploreSlice.js (P1-9 decomposition).
// Handles extended event pipeline, omen/600 fallback, rarity hints.

import { pick } from '../../reducers/utils.js';
import { GAME_BALANCE } from '../../state/gameConstants.js';
import {
  getEligibleEvents,
  chooseWeightedEvent,
  commitSelectedEvent,
  getEventWeight,
} from '../../reducers/extendedEvents.js';
import { shouldTriggerMissing600, createMissing600Event } from '../../data/events_missing_600.js';
import { checkOmens } from '../../data/events_omens_600.js';
import { getFearEventWeightModifier } from '../../systems/fearLens.js';
import { getRarityHint } from '../../systems/eventRarity.js';
import { shouldBlockLethalEvent } from '../../systems/firstLoopBalance.js';
import { selectEvent } from '../../reducers/eventReducer.js';

/** Phase 1: Select an explore event via extended pipeline + omen/600 fallback.
 *  Milestone + progress guard handled inline by caller (needs c.narr).
 *  Returns { evt, alreadyCommitted }. */
export function _selectExploreEvent(s, ctx, GD, c) {
  // Extended event selection pipeline
  let evt = null;
  let alreadyCommitted = false;
  if (GD._extendedEventsLoaded) {
    const rawCandidates = getEligibleEvents(s.currentArea, s, ctx);
    // First-loop protection: filter out lethal events during safe window
    const candidates = rawCandidates.filter(ev => !shouldBlockLethalEvent(ev, s));
    if (candidates.length > 0) {
      if (s.fearTuning && s.fearTuning.primary) {
        const fearScored = candidates
          .map(function (ev) {
            return {
              evt: ev,
              weight: getEventWeight(ev, s.currentArea, s, ctx) * getFearEventWeightModifier(ev, s),
            };
          })
          .filter(function (x) {
            return x.weight > 0;
          });
        if (fearScored.length > 0) {
          const totalW = fearScored.reduce(function (a, b) {
            return a + b.weight;
          }, 0);
          let roll = (c.rng ? c.rng.next() : Math.random()) * totalW;
          for (const item of fearScored) {
            roll -= item.weight;
            if (roll <= 0) {
              evt = item.evt;
              break;
            }
          }
          if (!evt) evt = fearScored[fearScored.length - 1].evt;
        }
      }
      if (!evt) evt = chooseWeightedEvent(candidates, s.currentArea, s, ctx, pick, c.rng);
    }
    // Special events that bypass normal pool
    if (!evt) {
      const allEvts = GD.events || [];
      const omen = checkOmens(s, c.rng);
      if (omen) {
        evt = omen;
        commitSelectedEvent(omen, s);
        alreadyCommitted = true;
      } else {
        const extEvts =
          GD._extendedEvents ||
          (allEvts.length > (GD._deathEchoCount || 0)
            ? allEvts.slice(0, allEvts.length - (GD._deathEchoCount || 0))
            : allEvts);
        if (
          shouldTriggerMissing600(s, extEvts) &&
          (c.rng ? c.rng.next() : Math.random()) < GAME_BALANCE.MISSING_600_CHANCE
        ) {
          evt = createMissing600Event(s);
          commitSelectedEvent(evt, s);
          alreadyCommitted = true;
        }
      }
    }
    if (evt && !alreadyCommitted) commitSelectedEvent(evt, s);

    // ── Rarity hint: subtle flavor text for uncommon events ──
    // Legendary/Secret events NEVER produce hints (by design).
    if (evt && evt.rarity && ['uncommon'].indexOf(evt.rarity) >= 0) {
      var hint = getRarityHint(evt.rarity, c.rng);
      if (hint) c.narr('system', hint, { isSpecial: true });
    }
  } else {
    evt = selectEvent(s.currentArea, s, ctx, pick, c.rng);
  }
  return { evt: evt, alreadyCommitted: alreadyCommitted };
}
