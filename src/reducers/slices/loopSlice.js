// src/reducers/slices/loopSlice.js — NEW_GAME / CONTINUE_GAME / LOOP_SHOP_PURCHASE handlers
// Extracted from coreSlice.js (was lines 333-408)
//
// Handles: NEW_GAME, CONTINUE_GAME, LOOP_SHOP_PURCHASE

import { rollDice, clamp } from '../utils.js';
import { GAME_BALANCE } from '../../state/gameConstants.js';
import { audio, hooks, fx } from '../../engine/commands.js';
import { resetVisualCorruption } from '../../systems/sanVisualCorruption.js';
import { initialState } from '../../state/initialState.js';
import { initLoopState } from '../loopReducer.js';
import { buildPreviousRunSummary } from '../extendedEvents.js';
import { ensureExtendedState } from '../extendedEventsLoader.js';
import { clearSave } from '../../engine/SaveManager.js';
import { rebuildTriggeredSet, rebuildSilentSet } from '../../utils/triggeredSet.js';
import { initSkills } from '../../utils/gameHelpers.js';
import { checkSanLegacy } from '../../systems/sanConsequenceChain.js';

export function handleLoopAction(s, action, c, ctx) {
  switch (action.type) {
    case 'NEW_GAME': {
      // Track refusal of final choice (player chose to loop again rather than accept ending)
      if (s.ending) c.bt.final_choice_refused_count = (c.bt.final_choice_refused_count || 0) + 1;
      // Achievement stats
      c.effects.push({ type: 'INCREMENT_STAT', key: 'total_runs' });
      // Reset early hooks so the thirteenth bell fires on the next BEGIN_ADVENTURE
      c.effects.push(hooks.reset());
      // Reset visual corruption state (surge/flash from previous run)
      resetVisualCorruption();
      if (s.hp <= 0 || s.san <= 0) c.effects.push({ type: 'INCREMENT_STAT', key: 'total_deaths' });
      // Level 13: clear any running glitch interval from previous run
      if (s._level13GlitchInterval) {
        clearInterval(s._level13GlitchInterval);
        s._level13GlitchInterval = null;
      }
      s._level13GlitchScheduled = false;
      // Build previous run summary before reset (extended events system)
      const prevSummary = buildPreviousRunSummary(s);
      // SAN legacy: save reference to previous state for madness memory injection in BEGIN_ADVENTURE
      s._prevRunStateForSanLegacy = s;
      const f = initialState();
      // 保留难度设置（循环不重置难度）
      f.difficulty = s.difficulty;
      f.difficultyLevel = s.difficultyLevel;
      // P0-L: 全部循环搬入逻辑已提取至 loopReducer.initLoopState()
      initLoopState(f, s, ctx, { prevSummary, rng: c.rng });
      clearSave();
      return f;
    }
    case 'CONTINUE_GAME': {
      // Copy saved state fields onto the Immer draft (mutate, don't replace)
      const saved = action.savedState;
      const oldDiffLevel = saved?.difficultyLevel;
      if (saved && typeof saved === 'object') {
        Object.keys(saved).forEach((k) => {
          s[k] = saved[k];
        });
      }
      s.screen = 'game';
      s.transition = null;
      s.narrative = [{ id: c.now(), type: 'system', text: '—— 你从存档中醒来。' }];
      ensureExtendedState(s);
      rebuildTriggeredSet(s);
      rebuildSilentSet(s);
      // 难度系统迁移提示：旧存档 difficultyLevel > 13 已自动 clamp
      if (s._difficultyMigrated && oldDiffLevel && oldDiffLevel > 13) {
        s.narrative.push({
          id: c.now() + '_diff_mig',
          type: 'system',
          text: '【系统】难度系统已重构为13级。你的难度设置（原Lv.' + oldDiffLevel + '）已自动调整至Lv.' + (s.difficultyLevel || 13) + '。',
          isSpecial: true,
        });
        delete s._difficultyMigrated;
      }
      return null;
    }
    case 'LOOP_SHOP_PURCHASE': {
      const itemId = action.itemId;
      const cost = action.cost || 0;
      if ((s.endingCoins || 0) < cost) return null;
      if (!s.purchasedShopItems) s.purchasedShopItems = [];
      if (s.purchasedShopItems.includes(itemId)) return null;
      s.endingCoins -= cost;
      s.purchasedShopItems.push(itemId);
      // Apply immediate effects
      const shopEffects = {
        shop_skill_points: function () { s._shopBonusSkillPoints = (s._shopBonusSkillPoints || 0) + 3; },
        shop_npc_trust: function () { s._shopNpcTrustBonus = (s._shopNpcTrustBonus || 0) + 2; },
        shop_resistance: function () { s._shopMythosResistance = (s._shopMythosResistance || 0) + 0.1; },
        shop_death_insurance: function () { s._shopDeathInsurance = true; },
        shop_san_cap_boost: function () { s._shopSanCapBoost = (s._shopSanCapBoost || 0) + 5; },
        shop_random_rare: function () { s._shopRandomRare = true; },
      };
      if (shopEffects[itemId]) shopEffects[itemId]();
      return null;
    }
    default:
      return null;
  }
}
