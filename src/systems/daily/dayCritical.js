// src/systems/daily/dayCritical.js — Daily REST: critical day events, world decay, harbor whispers
// Extracted from reducers/slices/dailySlice.js

import { applySanLoss } from '../../reducers/utils.js';
import { GAME_BALANCE } from '../../state/gameConstants.js';
import { getDayCriticalEvent } from '../worldDecay.js';
import { triggerDayCriticalSurge, triggerSanLossFlash } from '../sanVisualCorruption.js';
import { getSanFloor } from '../firstLoopBalance.js';
import { getWorldDecayNarrative, getHarborDeepOneWhisper } from '../worldDecay.js';
import { addRunMemory } from '../../utils/appHelpers.js';
import { syncTriggeredSet } from '../../utils/triggeredSet.js';

/**
 * Process day-specific critical events and world decay atmosphere.
 */
export function _processDayCriticalAndDecay(s, c, ctx) {
  {
    const dayCrit = getDayCriticalEvent(s.day);
    if (dayCrit && !s.triggeredEvents.includes('day_crit_' + s.day)) {
      const eventId = 'day_crit_' + s.day;
      s.triggeredEvents.push(eventId);
      syncTriggeredSet(s, eventId);
      // Narrative Month: Trigger visual surge for critical days
      if (
        s.day === 7 ||
        s.day === 14 ||
        s.day === 21 ||
        s.day === 28 ||
        s.day === 5 ||
        s.day === 15 ||
        s.day === 20 ||
        s.day === 25
      ) {
        triggerDayCriticalSurge(s.day, s.san);
      }
      c.narr('event', dayCrit.text, {
        eventTitle: '第 ' + s.day + ' 天',
        eventType: 'milestone',
        isSpecial: true,
      });
      if (dayCrit.sanCost > 0) {
        applySanLoss(s, dayCrit.sanCost);
        // Narrative Month: Screen flash proportional to SAN loss
        triggerSanLossFlash(dayCrit.sanCost);
        c.narr('system', 'SAN -' + dayCrit.sanCost, { isEffect: true });
      }
      if (dayCrit.corruptionGain > 0)
        s.safehouseCorruption = Math.min(
          100,
          (s.safehouseCorruption || 0) + dayCrit.corruptionGain
        );
      addRunMemory(s, dayCrit.text.split('\\n')[0], 'world_decay');
    }
  }
  // Loop 2-3 graduated protection: enforce SAN floor
  var sanFloor = getSanFloor(s);
  if (sanFloor > 0 && s.san < sanFloor) {
    s.san = sanFloor;
  }
  if (c.rng.next() < GAME_BALANCE.WORLD_DECAY_CHANCE) {
    const decayText = getWorldDecayNarrative(s.day, s.safehouseCorruption || 0, s);
    if (decayText) c.narr('system', decayText);
  }
  // DESIGN_REFACTOR_NOTES.md: "Day 7后harbor_district自动增加深潜者相关模糊事件"
  // 30% chance of harbor whisper when player rested near harbor, Day 7+
  if (s.day >= 7 && c.rng.next() < 0.3) {
    var lastArea = s._dayStartArea || s.currentArea || '';
    if (lastArea === 'harbor_district' || lastArea === 'town_center') {
      var harborWhisper = getHarborDeepOneWhisper(s.day, s.safehouseCorruption || 0, s);
      if (harborWhisper) c.narr('system', harborWhisper);
    }
  }
}
