// src/systems/npc/manipulationBranches.js — Incite, exploit, betray branches
// Extracted from npcSlice.js NPC_RESPONSE case.

import { rand, applySanLoss } from '../../reducers/utils.js';
import { getNpcTrust, setNpcTrust, setNpcState, modHumanity, addRunMemory } from '../../utils/appHelpers.js';
import { propagateTrustChange, propagateFactionStanding } from '../../systems/npcRelationshipSystem.js';
import { warnTrustDrop } from '../../systems/npcFeedback.js';

export function _executeIncite(s, npc, trust, ns, c, ctx) {
  if (s.ap < 2) {
    c.narr('system', '行动点不足（需要2AP）。');
    s.pendingNpc = null;
    return;
  }
  s.ap -= 2;
  const socialSkill = s.skills['话术'] || s.skills['心理学'] || 25;
  const roll = rand(1, 100, c.rng);
  if (roll <= socialSkill) {
    c.bt.npc_deaths_by_manipulation = (c.bt.npc_deaths_by_manipulation || 0) + 1;
    setNpcState(s, npc.name, { ...ns, dead: true, manipulatedDeath: true });
    const sanLoss = rand(3, 8, c.rng);
    applySanLoss(s, sanLoss);
    modHumanity(s, -15, '操纵导致' + npc.name + '的死亡', c.rng);
    addRunMemory(s, '你说了一些话。' + npc.name + '走向了危险。', 'death');
    c.narr(
      'system',
      '【陷害】掷骰 ' +
        roll +
        ' / 话术' +
        socialSkill +
        ' —— 成功。' +
        npc.name +
        '对你深信不疑，走向了你指出的"线索"。几天后，人们在码头发现了尸体。SAN -' +
        sanLoss,
      { isSpecial: true }
    );
  } else {
    c.narr(
      'system',
      '【陷害】掷骰 ' +
        roll +
        ' / 话术' +
        socialSkill +
        ' —— 失败。' +
        npc.name +
        '看穿了你的意图。'
    );
    setNpcTrust(s, npc.name, Math.max(0, getNpcTrust(s, npc.name) - 1));
    propagateTrustChange(npc.name, -1, s, c); propagateFactionStanding(npc.name, -1, s);
  }
  s.pendingNpc = null;
}

export function _executeExploitNpc(s, npc, c) {
  if (s.ap < 1) {
    c.narr('system', '行动点不足。');
    s.pendingNpc = null;
    return;
  }
  s.ap -= 1;
  c.bt.npc_as_resource_count = (c.bt.npc_as_resource_count || 0) + 1;
  setNpcTrust(s, npc.name, Math.max(0, getNpcTrust(s, npc.name) - 2));
  propagateTrustChange(npc.name, -2, s, c); propagateFactionStanding(npc.name, -2, s);
  const gain = rand(2, 6, c.rng);
  s.money = (s.money || 0) + gain;
  modHumanity(s, -12, '把' + npc.name + '当作资源利用', c.rng);
  addRunMemory(s, '你利用了' + npc.name + '。效率很高。', 'npc');
  c.narr(
    'system',
    '你利用了' + npc.name + '的信任。金钱 +' + gain + '。对方的眼神里多了一丝怀疑。'
  );
  s.pendingNpc = null;
}

export function _executeBetrayNpc(s, npc, trust, ns, c) {
  if (s.ap < 1) {
    c.narr('system', '行动点不足。');
    s.pendingNpc = null;
    return;
  }
  s.ap -= 1;
  c.bt.betrayed_high_trust_npcs = (c.bt.betrayed_high_trust_npcs || 0) + 1;
  { const _old = getNpcTrust(s, npc.name); setNpcTrust(s, npc.name, 0); warnTrustDrop(c, npc.name, _old, 0);
    propagateTrustChange(npc.name, -_old, s, c); propagateFactionStanding(npc.name, -_old, s); }
  if (!c.bt._npc_harm_tally) c.bt._npc_harm_tally = {};
  c.bt._npc_harm_tally[npc.name] = (c.bt._npc_harm_tally[npc.name] || 0) + 1;
  c.bt.same_npc_harm_max = Math.max(
    c.bt.same_npc_harm_max || 0,
    c.bt._npc_harm_tally[npc.name]
  );
  modHumanity(s, -20, '背叛了高度信任的' + npc.name, c.rng);
  addRunMemory(s, '你背叛了' + npc.name + '。信任是一种货币。你把它兑现了。', 'npc');
  c.narr(
    'system',
    '你把' + npc.name + '的秘密告诉了不该告诉的人。信任归零。你得到了一些东西——但不是钱。',
    { isSpecial: true }
  );
  s.pendingNpc = null;
}
