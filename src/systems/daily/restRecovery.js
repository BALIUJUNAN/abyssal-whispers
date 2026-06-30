// src/systems/daily/restRecovery.js — Daily REST: recovery, long-term effects cleanup, AP reset for new day
// Extracted from reducers/slices/dailySlice.js

import { clamp } from '../../reducers/utils.js';

/**
 * Process safehouse recovery, long-term effects, and AP reset for new day.
 */
export function _processRestRecovery(s, c, shStage, ctx) {
  var GD = ctx.GD;
  let sanRec = shStage.available_functions?.san_recovery || 0;
  if (s.currentSafehouse !== 'main') {
    const alts = GD.systems?.safehouse?.relocation_rules?.alternative_safehouses || [];
    const curAlt = alts.find((a) => a.name === s.currentSafehouse);
    if (curAlt?.functions?.san_restore) sanRec += curAlt.functions.san_restore;
  }
  // DESIGN_REFACTOR_NOTES.md: degraded safehouse reduces SAN recovery
  // Stage 3+ (不再完全安全): -1 SAN recovery
  // Stage 4+ (安全屋破裂): -2 SAN recovery
  if (shStage.stage >= 4 && sanRec > 0) {
    sanRec = Math.max(0, sanRec - 2);
    c.narr('system', '你试图休息。但墙壁在呼吸。你没有真正睡着。', { isSpecial: true });
  } else if (shStage.stage >= 3 && sanRec > 0) {
    sanRec = Math.max(0, sanRec - 1);
  }
  if ((s.food || 0) > 0) {
    if (sanRec !== 0) s.san = clamp(s.san + sanRec, 0, s.maxSan);
    s.hp = clamp(s.hp + 1, 0, s.maxHp);
  } else {
    c.narr('system', '没有食物，你无法从休息中恢复。', { isSpecial: true });
  }
  s.longTermEffects.forEach((l) => {
    if (l.daysRemaining > 0) l.daysRemaining--;
  });
  s.longTermEffects = s.longTermEffects.filter((l) => l.daysRemaining > 0);
  if (s.tempSkillBonus) {
    s.tempSkillBonus.days--;
    if (s.tempSkillBonus.days <= 0) s.tempSkillBonus = null;
  }
  s.harborRiskReduction = 0;
}
