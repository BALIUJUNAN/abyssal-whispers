// src/systems/npc/npcResponseDispatcher.js — NPC_RESPONSE dispatcher + _warnTrustDrop
// Extracted from npcSlice.js NPC_RESPONSE case.

import { getNpcTrust } from '../../utils/appHelpers.js';
import { getTrustTierInfo } from '../../systems/npcFeedback.js';
import { getDifficultyNpcTrustMultiplier, getDifficultyNpcSuspicion } from '../../systems/npcDialogue.js';
import { checkTrustGate } from '../../utils/trustGates.js';
import { getSanStageFromGD } from '../../reducers/sanReducer.js';
import { getFakeTrustHint } from '../../systems/sanConsequenceChain.js';
import { _executeTrustUp, _executeGetItem, _executeRedeem, _executeSilence, _executeShareFood, _executeLeave, _executeIntimacy, _executePreach } from './socialBranches.js';
import { _executeAttack, _executePostKillHide, _executePostKillCannibal, _executePostKillLeave } from './combatBranches.js';
import { _executeIncite, _executeExploitNpc, _executeBetrayNpc } from './manipulationBranches.js';
import { _executeProbeThread } from './probeThreadSystem.js';

/** Light trust-drop warning — only narrates, no audio. Used for significant drops. */
export function _warnTrustDrop(c, npcName, oldVal, newVal) {
  var oldTier = getTrustTierInfo(oldVal);
  var newTier = getTrustTierInfo(newVal);
  if (oldTier.id !== newTier.id) {
    c.narr('system', npcName + '对你的态度变成了「' + newTier.label + '」。', { isEffect: true });
  }
}

export function _executeNpcResponse(s, action, c, ctx) {
  if (!s.pendingNpc) return null;
  var npc = s.pendingNpc.npc;
  var trust = getNpcTrust(s, npc.name);
  var choice = action.choice;
  var ns = getNpcState(s, npc.name);
  // Feature 2: Difficulty NPC modifier
  var _trustMult = getDifficultyNpcTrustMultiplier(s.difficultyLevel);
  var _suspicion = getDifficultyNpcSuspicion(s.difficultyLevel);

  if (choice === 'trust_up') {
    _executeTrustUp(s, npc, trust, ns, c, ctx);
  } else if (choice === 'get_item') {
    _executeGetItem(s, npc, trust, c);
  } else if (choice === 'redeem') {
    _executeRedeem(s, npc, trust, c, ctx);
  } else if (choice === 'silence') {
    _executeSilence(s, c);
  } else if (choice === 'share_food') {
    _executeShareFood(s, npc, trust, c, ctx);
  } else if (choice === 'leave') {
    _executeLeave(s, c);
  } else if (choice === 'attack') {
    _executeAttack(s, npc, trust, ns, c, ctx);
  } else if (choice === 'post_kill_hide') {
    _executePostKillHide(s, npc, c);
  } else if (choice === 'post_kill_cannibal') {
    _executePostKillCannibal(s, npc, c);
  } else if (choice === 'post_kill_leave') {
    _executePostKillLeave(s, npc, c);
  } else if (choice === 'incite') {
    _executeIncite(s, npc, trust, ns, c, ctx);
  } else if (choice === 'exploit_npc') {
    _executeExploitNpc(s, npc, c);
  } else if (choice === 'betray_npc') {
    _executeBetrayNpc(s, npc, trust, ns, c);
  } else if (choice === 'intimacy') {
    _executeIntimacy(s, npc, c);
  } else if (choice === 'preach') {
    _executePreach(s, npc, trust, ns, c, ctx);
  } else if (choice && choice.startsWith('probe_')) {
    _executeProbeThread(s, npc, trust, choice, c, ctx);
  }

  return null;
}
