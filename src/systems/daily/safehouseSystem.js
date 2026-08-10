// src/systems/daily/safehouseSystem.js — Daily REST: safehouse degradation, world decay, area corruption
// Extracted from reducers/slices/dailySlice.js

import { applySanLoss } from '../../reducers/utils.js';
import { getSafehouseStage, processSafehouseNight } from '../../reducers/miscReducer.js';
import { calculateDailyCorruption, updateAreaCorruption } from '../worldDecay.js';
import { getSafehouseVisualStage, getSafehousePollutionEvent } from '../resourceNarrative.js';

/**
 * Process safehouse degradation, world decay, area corruption, and safehouse visual stage.
 */
export function _processSafehouseAndWorldDecay(s, c, ctx) {
  s.safehouseCorruption = processSafehouseNight(s, ctx, c.rng);
  {
    const dailyCorr = calculateDailyCorruption(s, ctx);
    s.safehouseCorruption = Math.min(100, (s.safehouseCorruption || 0) + dailyCorr);
    s.pollution = Math.min(1, (s.pollution || 0) + dailyCorr * 0.003);
  }
  updateAreaCorruption(s, ctx);
  const visStage = getSafehouseVisualStage(s.safehouseCorruption || 0);
  const shStage = getSafehouseStage(s.safehouseCorruption, ctx);
  c.effects.push({ type: 'AUDIO_PLAY', id: visStage.sound });
  if (visStage.atmosphere && c.rng.next() < 0.5)
    c.narr('system', visStage.atmosphere, { isSpecial: true });
  {
    const pollutionEvt = getSafehousePollutionEvent(visStage.stage, null, c.rng);
    if (pollutionEvt) {
      c.narr('system', '【安全屋】' + pollutionEvt.text, { isSpecial: true });
      if (pollutionEvt.sanCost > 0) {
        applySanLoss(s, pollutionEvt.sanCost);
        c.narr('system', 'SAN -' + pollutionEvt.sanCost, { isEffect: true });
      }
    }
  }
  {
    const prevStage = s._prevSafehouseStage || 0;
    if (visStage.stage > prevStage && visStage.stage >= 2)
      c.narr('system', '【' + visStage.name + '】' + visStage.description, { isSpecial: true });
    s._prevSafehouseStage = visStage.stage;
  }
  return shStage;
}
