// src/systems/daily/nightEffects.js — Daily REST: NPC corruption, silent events, resources, meta corruption
// Extracted from reducers/slices/dailySlice.js

import { applySanLoss } from '../../reducers/utils.js';
import { getSanStageFromGD } from '../../reducers/sanReducer.js';
import { checkNPCCorruption, applyNPCCorruption } from '../../reducers/npcReducer.js';
import { getSealState } from '../../engine/WorldTimeSystem.js';
import {
  getNpcState,
  setNpcState,
  addRunMemory,
  checkSilentEvent,
  checkBreakWallEvent,
} from '../../utils/appHelpers.js';
import { processDailyResources, getResourceNarrative } from '../resourceNarrative.js';
import { maybeGetFakeMessage, maybeInsertFalseMemory } from '../../engine/PollutionManager.js';
import { applyMetaCorruption } from '../metaCorruption.js';

/**
 * Process NPC corruption triggers and seal-state accelerated corruption.
 */
export function _processNpcCorruption(s, c, ctx) {
  var GD = ctx.GD;
  const corruptionTriggers = checkNPCCorruption(s, ctx);
  for (const { npc, trigger } of corruptionTriggers) {
    applyNPCCorruption(s, npc, trigger, c.narr);
    addRunMemory(s, npc.name + '被腐蚀了——' + (trigger.id || '未知原因'), 'npc');
  }
  const sm = getSealState(s.day, ctx).global_modifier;
  const sealRate = (sm?.npc_corruption_rate || 0.05) * 0.3;
  (GD.npcs || GD.module3_npcs || []).forEach((npc) => {
    if (getNpcState(s, npc.name).dead || getNpcState(s, npc.name).corrupted) return;
    if ((c.rng ? c.rng.next() : Math.random()) < sealRate)
      setNpcState(s, npc.name, {
        ...getNpcState(s, npc.name),
        corrupted: true,
        corruptionSource: 'seal_decay',
      });
  });
}

/**
 * Process safehouse silent events, SAN break-wall, daily resources, corruption effects.
 */
export function _processNightEffects(s, c, ctx) {
  var GD = ctx.GD;
  checkSilentEvent(s, c.narr, 'safehouse', GD);
  {
    const bwfx = checkBreakWallEvent(s, c.narr, GD, c.rng);
    if (bwfx) c.effects.push(...bwfx);
  }
  processDailyResources(s, c.rng, ctx);
  {
    const resNarr = getResourceNarrative(s, c.rng);
    if (resNarr) c.narr('system', resNarr, { isSpecial: true });
  }
  {
    const fakeMsg = maybeGetFakeMessage(s.san, s.loopCount, getSanStageFromGD, c.rng);
    if (fakeMsg)
      c.narr('system', fakeMsg, {
        isSpecial: true,
        madness: { name: '幻觉', description: '你看到了不存在的东西。' },
      });
  }
  maybeInsertFalseMemory(c.narr, s.san, s.loopCount, s.day, getSanStageFromGD, c.rng);
  applyMetaCorruption(s, c, s._visualPollution);
}
