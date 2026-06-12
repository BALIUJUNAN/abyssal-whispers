// src/reducers/npcReducer.js - NPC trigger-based corruption
// §1: NPC relationship web + post-death legacy system

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
  state.npcStates[npc.name] = {
    ...state.npcStates[npc.name],
    corrupted: true,
    corruptionSource: trigger.id,
  };
  narr('system', trigger.description, { isSpecial: true });
  if (trigger.dialogue_after) {
    narr('system', npc.name + '："' + trigger.dialogue_after + '"');
  }
  if (trigger.humanity_cost) {
    state.humanityScore = Math.max(0, (state.humanityScore ?? 50) + trigger.humanity_cost);
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

// ═══════════════════════════════════════════════════════════
// §1.2: NPC Relationship Web (关系网变量)
// ═══════════════════════════════════════════════════════════

/**
 * Set or update a relationship between two NPCs.
 * @param {object} state - game state
 * @param {string} npcA - first NPC name
 * @param {string} npcB - second NPC name
 * @param {string} relation - 'ally' | 'enemy' | 'relative' | 'neutral'
 * @param {number} strength - relationship strength (0-10)
 */
export function setNpcRelation(state, npcA, npcB, relation, strength) {
  if (!state.npcRelations) state.npcRelations = {};
  const key = [npcA, npcB].sort().join('|||');
  state.npcRelations[key] = { relation, strength, updatedDay: state.day || 1 };
}

/**
 * Get the relationship between two NPCs.
 * @returns {{ relation: string, strength: number } | null}
 */
export function getNpcRelation(state, npcA, npcB) {
  if (!state.npcRelations) return null;
  const key = [npcA, npcB].sort().join('|||');
  return state.npcRelations[key] || null;
}

/**
 * Get all NPCs related to a given NPC.
 * @returns {Array<{npc: string, relation: string, strength: number}>}
 */
export function getNpcConnections(state, npcName) {
  if (!state.npcRelations) return [];
  const connections = [];
  for (const [key, rel] of Object.entries(state.npcRelations)) {
    const [a, b] = key.split('|||');
    if (a === npcName) connections.push({ npc: b, ...rel });
    else if (b === npcName) connections.push({ npc: a, ...rel });
  }
  return connections;
}

// ═══════════════════════════════════════════════════════════
// §1.2: Post-Death Legacy (死后遗产)
// ═══════════════════════════════════════════════════════════

/**
 * When an NPC dies, register their legacy for the player to inherit.
 * @param {object} state - game state
 * @param {string} npcName - dead NPC name
 * @param {object} legacy - { items: [], knowledge: [], quest: string }
 */
export function registerNpcLegacy(state, npcName, legacy) {
  if (!state.npcStates) state.npcStates = {};
  state.npcStates[npcName] = {
    ...state.npcStates[npcName],
    dead: true,
    legacy: legacy,
    legacyClaimed: false,
  };
}

/**
 * Check if a dead NPC's legacy is available for claiming.
 * @returns {object|null} legacy object or null
 */
export function getAvailableLegacy(state, npcName) {
  const npcState = state.npcStates?.[npcName];
  if (!npcState || !npcState.dead || npcState.legacyClaimed) return null;
  return npcState.legacy || null;
}

/**
 * Claim a dead NPC's legacy (items, knowledge, quest trigger).
 * @returns {object} { items: [], knowledge: [], questTriggered: string|null }
 */
export function claimNpcLegacy(state, npcName, narr) {
  const npcState = state.npcStates?.[npcName];
  if (!npcState || !npcState.dead || npcState.legacyClaimed)
    return { items: [], knowledge: [], questTriggered: null };

  const legacy = npcState.legacy || {};
  npcState.legacyClaimed = true;

  // Add items to inventory
  const items = legacy.items || [];
  for (const item of items) {
    if (!state.inventory) state.inventory = [];
    state.inventory.push(item);
  }

  // Add knowledge
  const knowledge = legacy.knowledge || [];
  for (const k of knowledge) {
    if (!state.retainedKnowledge) state.retainedKnowledge = [];
    if (!state.retainedKnowledge.includes(k)) state.retainedKnowledge.push(k);
  }

  // Trigger quest
  const questTrigger = legacy.quest || null;
  if (questTrigger && !state.triggeredEvents.includes(questTrigger)) {
    state.triggeredEvents.push(questTrigger);
  }

  if (narr) {
    narr('system', '你翻开了' + npcName + '留下的遗物。有些东西可以继承。', { isSpecial: true });
  }

  return { items, knowledge, questTriggered: questTrigger };
}
