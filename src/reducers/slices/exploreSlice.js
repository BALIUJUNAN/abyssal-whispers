// src/reducers/slices/exploreSlice.js — Thin dispatcher for MOVE / EXPLORE / DO_SKILL_CHECK / COMBAT
// Domain logic lives in src/systems/explore/ (moveSystem, explorePipeline, skillCheckSystem,
// eventConsequenceSystem, madnessEffectSystem) and src/systems/combatSystem.js.

import { handleMove } from '../../systems/explore/moveSystem.js';
import { handleExplore } from '../../systems/explore/explorePipeline.js';
import { handleSkillCheck } from '../../systems/explore/skillCheckSystem.js';
import {
  initCombat, executeCombatAction, processMonsterTurn, isCombatActive, getCombatActions
} from '../../systems/combatSystem.js';

export function handleExploreAction(s, action, c, ctx) {
  var GD = ctx.GD;
  switch (action.type) {
    case 'MOVE':            return handleMove(s, action, c, ctx);
    case 'EXPLORE':         return handleExplore(s, action, c, ctx);
    case 'DO_SKILL_CHECK':  return handleSkillCheck(s, action, c, ctx);
    case 'START_COMBAT': {
      var combatState = initCombat(action.creatureType, action.stage, s);
      if (combatState) {
        s.combat = combatState;
        s._combatActionCount = (s._combatActionCount || 0) + 1;
        c.narr('system', '【战斗】' + combatState.creatureName + '出现了！', { isSpecial: true });
        c.effects.push({ type: 'AUDIO_PLAY', id: 'combat_start' });
      }
      return null;
    }
    case 'COMBAT_ACTION': {
      if (!s.combat || !s.combat.active) return null;
      var updated = executeCombatAction(s.combat, action.actionType, { itemId: action.itemId }, s, c, ctx);
      s.combat = updated;
      if (!updated.active) return null;
      var monsterResult = processMonsterTurn(updated, s, c, ctx);
      s.combat = monsterResult;
      if (s.hp <= 0) {
        c.effects.push({ type: 'TRIGGER_DEATH', deathType: 'combat' });
      }
      return null;
    }
    case 'END_COMBAT': {
      s.combat = null;
      return null;
    }
    default:                return null;
  }
}
