// src/reducers/slices/npcSlice.js — Thin dispatcher for TALK_NPC / NPC_RESPONSE
// Domain logic lives in src/systems/npc/ (dialogueSystem, npcResponseDispatcher, combat/manipulation/social/probe branches).

import { rand, d3, clamp, pick, applySanLoss } from '../utils.js';
import { GAME_BALANCE } from '../../state/gameConstants.js';
import { processSanLoss, getSanTextVariant, getSanStageFromGD } from '../sanReducer.js';
import { checkObjCompletion } from '../objectiveReducer.js';
import { setCorruptionFlag } from '../npcReducer.js';
import { getFearNpcLine } from '../../systems/fearLens.js';
import { addRunMemory, getNpcTrust, setNpcTrust, modHumanity, getNpcState, setNpcState, narrApInsufficient } from '../../utils/appHelpers.js';
import { computeNpcFeedback, getTrustTierInfo } from '../../systems/npcFeedback.js';
import { getNpcDialogueVariant, NPC_CORRUPTION_LINES, getNpcFatigueEffect, getDifficultyNpcTrustMultiplier, getDifficultyNpcSuspicion, getDaySpecificLine, getWeatherLine, getSanLevelLine } from '../../systems/npcDialogue.js';
import { handleNpcMemoryTier } from '../../utils/npcMemory.js';
import { checkTrustGate } from '../../utils/trustGates.js';
import { getNpcsHere } from '../../utils/npcLocation.js';
import { hasClueId, resolveClueName } from '../../utils/clueNameMap.js';
import { getFakeTrustHint, shouldShowFakeTrustHint } from '../../systems/sanConsequenceChain.js';
// v0.9.0: Moral choice engine — reputation propagation + moral tracking
import { processNpcMoralChoice } from '../../systems/moralChoiceEngine.js';
import { propagateTrustChange, propagateFactionStanding } from '../../systems/npcRelationshipSystem.js';
import { NPC_THREAD_QUESTIONS } from '../../data/npcContextualLines.js';

// Domain logic (src/systems/npc/)
import { _executeTalkNpc } from '../../systems/npc/dialogueSystem.js';
import { _executeNpcResponse } from '../../systems/npc/npcResponseDispatcher.js';

// Re-export for backward compatibility
export { _warnTrustDrop } from '../../systems/npc/npcResponseDispatcher.js';

export function handleNpcAction(s, action, c, ctx) {
  var GD = ctx.GD;
  switch (action.type) {
    case 'TALK_NPC': {
      return _executeTalkNpc(s, action, c, ctx);
    }
    case 'NPC_RESPONSE': {
      var result = _executeNpcResponse(s, action, c, ctx);
      // v0.9.0: Moral choice engine integration
      // Reputation propagation through NPC relationship network + moral tracking
      if (s.pendingNpc && action.choice && action.choice !== 'leave') {
        try {
          var npc = s.pendingNpc.npc;
          processNpcMoralChoice(s, npc.name, action.choice, ctx);
          // Silent propagation — no narrative feedback, the effects just happen
          // This is intentional: the player feels consequences without being told "X happened because you did Y"
        } catch (e) {
          // Moral choice engine is optional — if it fails, the base game continues
        }
      }
      return result;
    }
    default:
      return null;
  }
}
