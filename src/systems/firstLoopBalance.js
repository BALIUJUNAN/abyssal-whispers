// src/systems/firstLoopBalance.js — Reduce first loop random death
// Applies protection mechanisms to prevent frustrating early deaths.
// Phase 3: Added loop 2-3 graduated protection bridge.

const PROTECTION_CONFIG = {
  maxSanLossFirstLoop: 5,
  sanFloorFirstLoop: 10,
  safeDayCount: 3,
  starvationMultiplier: 0.5,
  monsterChanceMultiplier: 0.3,
};

// Loop 2-3 graduated protection (bridge between first-loop protection and full brutality)
const GRADUATED_CONFIG = {
  loop2: {
    maxSanLoss: 7,        // Slightly higher than first loop's 5
    sanFloor: 15,         // Low but not death-inducing
    safeDayCount: 2,      // First 2 days protected
    starvationMult: 0.7,  // 30% reduction (vs 50% first loop)
    monsterMult: 0.5,     // 50% reduction (vs 70% first loop)
    lethalBlock: true,    // Still block instant-death events
  },
  loop3: {
    maxSanLoss: 9,        // Getting closer to normal
    sanFloor: 10,         // Back to first loop floor
    safeDayCount: 1,      // Only day 1 protected
    starvationMult: 0.85, // 15% reduction
    monsterMult: 0.7,     // 30% reduction
    lethalBlock: false,   // No longer blocks lethal events
  },
};

export function isFirstLoopProtected(state) {
  return (state.loopCount || 0) === 0;
}

export function isInSafeWindow(state) {
  return (state.loopCount || 0) === 0 && (state.day || 1) <= PROTECTION_CONFIG.safeDayCount;
}

export function adjustSanLossForLoop23(rawLoss, state) {
  var loop = state.loopCount || 0;
  // Loop 0 = first loop (original adjustSanLossForFirstLoop behavior)
  if (loop === 0) return Math.min(rawLoss, PROTECTION_CONFIG.maxSanLossFirstLoop);
  if (loop === 1) return Math.min(rawLoss, GRADUATED_CONFIG.loop2.maxSanLoss);
  if (loop === 2) return Math.min(rawLoss, GRADUATED_CONFIG.loop3.maxSanLoss);
  return rawLoss;
}

export function getSanFloor(state) {
  var loop = state.loopCount || 0;
  if (loop === 0) return PROTECTION_CONFIG.sanFloorFirstLoop;
  if (loop === 1) return GRADUATED_CONFIG.loop2.sanFloor;
  if (loop === 2) return GRADUATED_CONFIG.loop3.sanFloor;
  return 0; // No floor for loop 3+
}

export function adjustStarvationDamage(rawDamage, state) {
  if (isFirstLoopProtected(state)) {
    return Math.max(1, Math.round(rawDamage * PROTECTION_CONFIG.starvationMultiplier));
  }
  var loop = state.loopCount || 0;
  if (loop === 1) {
    return Math.max(1, Math.round(rawDamage * GRADUATED_CONFIG.loop2.starvationMult));
  }
  if (loop === 2) {
    return Math.max(1, Math.round(rawDamage * GRADUATED_CONFIG.loop3.starvationMult));
  }
  return rawDamage;
}

export function adjustMonsterChance(rawChance, state) {
  if (isFirstLoopProtected(state)) {
    return rawChance * PROTECTION_CONFIG.monsterChanceMultiplier;
  }
  var loop = state.loopCount || 0;
  if (loop === 1) {
    return rawChance * GRADUATED_CONFIG.loop2.monsterMult;
  }
  if (loop === 2) {
    return rawChance * GRADUATED_CONFIG.loop3.monsterMult;
  }
  return rawChance;
}

export { PROTECTION_CONFIG, GRADUATED_CONFIG };
export function shouldBlockLethalEvent(event, state) {
  // Safe window (first loop, days 1-3): block ALL events to give player breathing room
  if (isInSafeWindow(state)) return true;
  // Loop 2 still blocks instant-death events (but not loop 3)
  if ((state.loopCount || 0) === 1 && event) {
    var tags = event.tags || [];
    var deathTags = ['instant_death', 'lethal', 'critical_failure'];
    return tags.some(function (t) { return deathTags.includes(t); });
  }
  return false;
}
