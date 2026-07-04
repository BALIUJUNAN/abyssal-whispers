// src/systems/npc/combatBranches.js — Combat & violence outcome branches
// Extracted from npcSlice.js NPC_RESPONSE case.

import { rand, applySanLoss } from '../../reducers/utils.js';
import { getNpcTrust, setNpcTrust, modHumanity, addRunMemory } from '../../utils/appHelpers.js';
import { propagateTrustChange, propagateFactionStanding } from '../../systems/npcRelationshipSystem.js';
import { getNpcsHere } from '../../utils/npcLocation.js';
import { _warnTrustDrop } from './npcResponseDispatcher.js';

export function _executeAttack(s, npc, trust, ns, c, ctx) {
  if (s.ap < 2) {
    c.narr('system', '行动点不足（需要2AP）。');
    s.pendingNpc = null;
    return;
  }
  s.ap -= 2;
  c.effects.push({ type: 'INCREMENT_STAT', key: 'run_combat' });
  const fightSkill = s.skills['格斗'] || s.skills['潜行'] || 20;
  const npcDiff = npc.chapter_1_role === 'core' ? 55 : 40;
  const roll = rand(1, 100, c.rng);
  const success = roll <= fightSkill && roll <= npcDiff;
  if (success) {
    c.bt.direct_kill_count = (c.bt.direct_kill_count || 0) + 1;
    setNpcState(s, npc.name, { ...ns, dead: true, killedByPlayer: true });
    const sanLoss = rand(4, 12, c.rng);
    applySanLoss(s, sanLoss);
    modHumanity(s, -20, '亲手杀害了' + npc.name, c.rng);
    addRunMemory(s, '你杀了' + npc.name + '。', 'death');
    c.narr(
      'system',
      '【攻击】掷骰 ' +
        roll +
        ' / 格斗' +
        fightSkill +
        ' —— 成功！' +
        npc.name +
        '倒下了。SAN -' +
        sanLoss,
      { isSpecial: true }
    );
    s.pendingNpc = { ...s.pendingNpc, postKill: true };
  } else {
    const dmg = rand(2, 8, c.rng);
    s.hp = Math.max(0, s.hp - dmg);
    { const _old = getNpcTrust(s, npc.name); setNpcTrust(s, npc.name, Math.max(0, _old - 2)); _warnTrustDrop(c, npc.name, _old, Math.max(0, _old - 2));
      propagateTrustChange(npc.name, -2, s, c); propagateFactionStanding(npc.name, -2, s); }
    c.narr(
      'system',
      '【攻击】掷骰 ' +
        roll +
        ' / 格斗' +
        fightSkill +
        ' —— 失败！' +
        npc.name +
        '激烈反抗。HP -' +
        dmg
    );
    if ((c.rng ? c.rng.next() : Math.random()) < 0.5) {
      setNpcState(s, npc.name, { ...ns, fled: true });
      c.narr('system', npc.name + '惊恐地逃走了。你可能再也找不到他了。');
    }
    s.pendingNpc = null;
  }
}

export function _executePostKillHide(s, npc, c) {
  c.bt.clean_kill_pattern = (c.bt.clean_kill_pattern || 0) + 1;
  if (s.ap >= 1) {
    s.ap -= 1;
    c.narr('system', '你花了一些时间处理现场。痕迹被抹去了。');
  } else {
    c.narr('system', '你没有时间仔细处理，但你尽力隐藏了能隐藏的一切。');
  }
  applySanLoss(s, 2);
  modHumanity(s, -5, '冷静地隐藏了' + npc.name + '的尸体', c.rng);
  s.pendingNpc = null;
}

export function _executePostKillCannibal(s, npc, c) {
  c.bt.cannibalism_count = (c.bt.cannibalism_count || 0) + 1;
  s.food = Math.min(s.maxFood, (s.food || 0) + 2);
  s.starvationDays = 0; // 饥饿解除
  const sanLoss = rand(8, 20, c.rng);
  applySanLoss(s, sanLoss);
  modHumanity(s, -30, '食用了' + npc.name + '的肉体', c.rng);
  addRunMemory(s, '你吃了' + npc.name + '。饥饿比道德更真实。', 'death');
  c.narr('system', '你做了无法挽回的事。食物+2。某种东西在你体内扎了根。SAN -' + sanLoss, {
    isSpecial: true,
  });
  s.pendingNpc = null;
}

export function _executePostKillLeave(s, npc, c) {
  s.pendingNpc = null;
  const witnesses = getNpcsHere(s).filter((n2) => n2.name !== npc.name);
  if (witnesses.length > 0) {
    c.narr('system', witnesses[0].name + '看到了刚才发生的事。TA 的眼神里充满了恐惧。');
  }
}
