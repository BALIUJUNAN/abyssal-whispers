// src/systems/daily/foodSystem.js — Daily REST: food consumption, starvation damage, NPC trust decay
// Extracted from reducers/slices/dailySlice.js

import { applySanLoss } from '../../reducers/utils.js';
import { GAME_BALANCE } from '../../state/gameConstants.js';
import { getAreaInfo } from '../../engine/WorldTimeSystem.js';
import { getNpcTrust, setNpcTrust, applyDeathResolution } from '../../utils/appHelpers.js';
import { adjustStarvationDamage } from '../firstLoopBalance.js';

/**
 * Process food consumption, starvation damage, and NPC trust decay.
 * Returns true if player died from starvation or madness.
 */
export function _processFoodAndStarvation(s, c, ctx) {
  const restArea = getAreaInfo(s.currentArea, ctx);
  const foodMod = restArea?.resource_pressure?.food_consumption_modifier || 1.0;
  const foodConsume = Math.ceil(1 * foodMod);
  s.food = Math.max(0, (s.food ?? 0) - foodConsume);
  if (s.food <= 0) {
    s.starvationDays = (s.starvationDays || 0) + 1;
    const sd = s.starvationDays;
    if (sd === 1) {
      applySanLoss(s, 1);
      c.narr('system', '你腹中空空。胃部的抽搐让你难以集中注意力。', { isSpecial: true });
    } else if (sd === 2) {
      const dmg = adjustStarvationDamage(1, s);
      s.hp = Math.max(0, s.hp - dmg);
      c.narr('system', '饥饿在啃噬你的意志。你的手脚开始发软，动作变得迟缓。', { isSpecial: true });
    } else {
      const dmg = adjustStarvationDamage(2, s);
      s.hp = Math.max(0, s.hp - dmg);
      c.narr('system', '你的身体已经开始消耗自身。视线模糊，每一个动作都是折磨。', {
        isSpecial: true,
      });
    }
    var GD = ctx.GD;
    const npcs = GD.npcs || GD.module3_npcs || [];
    npcs.forEach((npc) => {
      if (
        getNpcTrust(s, npc.name) > 0 &&
        c.rng.next() < GAME_BALANCE.NPC_TRUST_DECAY_CHANCE
      )
        setNpcTrust(s, npc.name, Math.max(0, getNpcTrust(s, npc.name) - 1));
    });
  } else {
    s.starvationDays = 0;
  }
  if (s.hp <= 0 || s.san <= 0) {
    const deathType = s.hp <= 0 ? 'starvation' : 'madness';
    const deathText =
      s.hp <= 0
        ? '饥饿耗尽了你最后的体力。你倒在了沃切斯特的街道上，再也没有站起来。'
        : '你的精神再也无法承受。意识在低语中碎裂，你再也分不清现实与幻觉。';
    applyDeathResolution(
      s,
      {
        mode: s.hp <= 0 ? 'hp' : 'san',
        type: deathType,
        area: s.currentArea,
        day: s.day,
        loop: s.loopCount,
        sourceEventId: null,
        sourceEventName: '饥饿致死',
        finalText: deathText,
        residueFlag: 'death_echo_starvation',
      },
      c.narr,
      ctx
    );
    return true;
  }
  return false;
}
