// src/systems/firstLoopBalance.js — Reduce first loop random death
// Applies protection mechanisms to prevent frustrating early deaths.

const PROTECTION_CONFIG = {
  maxSanLossFirstLoop: 5,
  sanFloorFirstLoop: 10,
  safeDayCount: 3,
  starvationMultiplier: 0.5,
  monsterChanceMultiplier: 0.3,
};

export function isFirstLoopProtected(state) {
  return (state.loopCount || 0) === 0;
}

export function isInSafeWindow(state) {
  return (state.loopCount || 0) === 0 && (state.day || 1) <= PROTECTION_CONFIG.safeDayCount;
}

export function adjustSanLossForFirstLoop(rawLoss, state) {
  if (!isFirstLoopProtected(state)) return rawLoss;
  return Math.min(rawLoss, PROTECTION_CONFIG.maxSanLossFirstLoop);
}

export function adjustStarvationDamage(rawDamage, state) {
  if (!isFirstLoopProtected(state)) return rawDamage;
  return Math.max(1, Math.round(rawDamage * PROTECTION_CONFIG.starvationMultiplier));
}

export function shouldBlockLethalEvent(event, state) {
  if (!isInSafeWindow(state)) return false;
  if ((event?.sanity_damage || 0) > 8) return true;
  const tags = event?.tags || [];
  const deathTags = ['instant_death', 'lethal', 'critical_failure'];
  return tags.some(t => deathTags.includes(t));
}

export function adjustMonsterChance(rawChance, state) {
  if (!isFirstLoopProtected(state)) return rawChance;
  return rawChance * PROTECTION_CONFIG.monsterChanceMultiplier;
}
