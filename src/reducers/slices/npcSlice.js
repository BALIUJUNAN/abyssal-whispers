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
import { NPC_THREAD_QUESTIONS } from '../../data/npcContextualLines.js';

// Domain logic (src/systems/npc/)
import { _executeTalkNpc } from '../../systems/npc/dialogueSystem.js';
import { _executeNpcResponse } from '../../systems/npc/npcResponseDispatcher.js';

// Re-export for backward compatibility
export { warnTrustDrop as _warnTrustDrop } from '../../systems/npcFeedback.js';

export function handleNpcAction(s, action, c, ctx) {
  switch (action.type) {
    case 'TALK_NPC': {
      return _executeTalkNpc(s, action, c, ctx);
    }
    case 'NPC_RESPONSE': {
      // Each branch owns its state mutations, counters and relationship ripple.
      // Post-processing here used handler-mutated pendingNpc and could apply the
      // same moral consequence twice (notably redeem and successful attack).
      return _executeNpcResponse(s, action, c, ctx);
    }
    default:
      return null;
  }
}
