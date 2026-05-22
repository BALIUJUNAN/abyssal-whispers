// src/reducers/npcReducer.js - NPC trigger-based corruption

/**
 * Check if any NPC corruption triggers are satisfied.
 * Returns list of {npc, trigger} pairs ready to fire.
 */
export function checkNPCCorruption(state, ctx) {
  const { GD } = ctx;
  const npcs = GD.npcs || [];
  const triggered = [];
  for (const npc of npcs) {
    if (state.npcStates[npc.name]?.corrupted) continue;
    if (state.npcStates[npc.name]?.dead) continue;
    const triggers = npc.corruption_triggers || [];
    for (const t of triggers) {
      if (state.triggeredEvents.includes(t.trigger)) {
        triggered.push({ npc, trigger: t });
        break; // One trigger per NPC per check
      }
    }
  }
  return triggered;
}

/**
 * Apply NPC corruption from a trigger.
 */
export function applyNPCCorruption(state, npc, trigger, narr) {
  state.npcStates[npc.name] = { ...state.npcStates[npc.name], corrupted: true, corruptionSource: trigger.id };
  narr('system', trigger.description, { isSpecial: true });
  if (trigger.dialogue_after) {
    narr('system', npc.name + '："' + trigger.dialogue_after + '"');
  }
  if (trigger.humanity_cost) {
    state.humanityScore = Math.max(0, (state.humanityScore || 50) + trigger.humanity_cost);
  }
}

/**
 * Mark a corruption trigger flag (called from NPC_RESPONSE or other actions).
 */
export function setCorruptionFlag(state, triggerId) {
  if (!state.triggeredEvents.includes(triggerId)) {
    state.triggeredEvents.push(triggerId);
  }
}
