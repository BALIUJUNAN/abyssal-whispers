// src/systems/npcRelationshipSystem.js — NPC relationship propagation
//
// Actives the dormant data in npcRelationshipWeb.js:
//   NPC_RELATIONSHIPS — bidirectional affinity/knowledge/conflict/moralWeight
//   MORAL_DILEMMAS    — moral choice scenarios with hidden costs & delayed effects
//   FACTIONS          — seal_keeper / deep_one / military / cultist
//
// When a player's action changes NPC A's trust, the change ripples through
// A's relationship network via propagateTrustChange().
// Moral dilemma choices schedule delayed effects that fire on future days.

import { NPC_RELATIONSHIPS, FACTIONS, MORAL_DILEMMAS } from '../data/npcRelationshipWeb.js';
import { setNpcTrust, getNpcTrust } from '../utils/appHelpers.js';
import { modHumanity } from '../utils/appHelpers.js';
import { addRunMemory } from '../utils/appHelpers.js';

// ════════════════════════════════════════
// Section 1: Trust propagation
// ════════════════════════════════════════

/**
 * Propagate a trust change from one NPC through the relationship web.
 * Each connected NPC receives a scaled delta based on:
 *   affinity (-5..+5): how much they like the changed NPC
 *   moralWeight (1.0..3.0): how sensitive the relationship is
 *
 * Formula: propagation = round(delta * affinity * moralWeight / 10)
 *
 * @param {string} changedNpc - the NPC whose trust changed
 * @param {number} delta - the trust change (+1, -2, etc.)
 * @param {object} state - mutable game state
 * @param {object} [c] - reducer context (for narr/log)
 */
export function propagateTrustChange(changedNpc, delta, state, c) {
  if (delta === 0) return;
  var propagated = [];
  for (const [key, rel] of Object.entries(NPC_RELATIONSHIPS)) {
    var otherNpc = null;
    if (key.startsWith(changedNpc + '-')) {
      otherNpc = key.slice(changedNpc.length + 1);
    } else if (key.endsWith('-' + changedNpc)) {
      otherNpc = key.slice(0, key.length - changedNpc.length - 1);
    }
    if (!otherNpc) continue;
    var propagation = Math.round(delta * rel.affinity * rel.moralWeight / 10);
    if (propagation === 0) continue;
    var oldTrust = getNpcTrust(state, otherNpc);
    setNpcTrust(state, otherNpc, oldTrust + propagation);
    propagated.push({ npc: otherNpc, delta: propagation, oldTrust: oldTrust });
  }
  if (propagated.length > 0 && c && c.narr) {
    var lines = propagated.map(function (p) {
      return p.npc + '（' + p.oldTrust + '→' + getNpcTrust(state, p.npc) + '）';
    });
    c.narr('system', '关系涟漪：' + lines.join('、'));
  }
}

// ════════════════════════════════════════
// Section 2: Faction standing
// ════════════════════════════════════════

// Build NPC → faction lookup from FACTIONS
var NPC_FACTION_MAP = {};
for (const [factionId, faction] of Object.entries(FACTIONS)) {
  if (faction.members) {
    faction.members.forEach(function (name) {
      NPC_FACTION_MAP[name] = factionId;
    });
  }
}

/**
 * Update faction standing based on an NPC trust change.
 * Called alongside propagateTrustChange.
 *
 * @param {string} npcName - the NPC whose trust changed
 * @param {number} delta - the trust change
 * @param {object} state - mutable game state
 */
export function propagateFactionStanding(npcName, delta, state) {
  var factionId = NPC_FACTION_MAP[npcName];
  if (!factionId) return;
  if (!state.factionStanding) state.factionStanding = {};
  var current = state.factionStanding[factionId] || 0;
  // Faction standing: -10..+10, scaled by delta and moralWeight
  var faction = FACTIONS[factionId];
  var memberCount = faction.members ? faction.members.length : 1;
  var standingDelta = Math.round(delta * 2 / memberCount);
  state.factionStanding[factionId] = Math.max(-10, Math.min(10, current + standingDelta));
}

// ════════════════════════════════════════
// Section 3: Delayed moral effects
// ════════════════════════════════════════

/**
 * Schedule a delayed moral effect from a dilemma choice.
 * The effect will be checked and applied on the target day.
 *
 * @param {object} state - mutable game state
 * @param {string} effectType - type of delayed effect
 * @param {number} dueDay - the day number when the effect fires
 * @param {object} effectData - the effect payload
 */
export function scheduleDelayedEffect(state, effectType, dueDay, effectData) {
  if (!state._pendingDelayedEffects) state._pendingDelayedEffects = [];
  state._pendingDelayedEffects.push({
    type: effectType,
    dueDay: dueDay,
    data: effectData,
    fired: false,
  });
}

/**
 * Check and fire any delayed effects that are due today.
 * Call from dayAdvance after day increment.
 *
 * @param {object} state - mutable game state
 * @param {number} currentDay - the current day number
 * @param {object} [c] - reducer context
 * @returns {boolean} true if any effects fired
 */
export function processDelayedEffects(state, currentDay, c) {
  if (!state._pendingDelayedEffects) return false;
  var fired = false;
  var remaining = [];
  for (var i = 0; i < state._pendingDelayedEffects.length; i++) {
    var eff = state._pendingDelayedEffects[i];
    if (eff.fired) continue;
    if (currentDay >= eff.dueDay) {
      _applyDelayedEffect(state, eff, c);
      eff.fired = true;
      fired = true;
    } else {
      remaining.push(eff);
    }
  }
  state._pendingDelayedEffects = remaining;
  return fired;
}

function _applyDelayedEffect(state, eff, c) {
  var data = eff.data;
  switch (eff.type) {
    case 'npc_trust_delta': {
      var npcName = data.npc;
      var penalty = data.npcPenalty || 0;
      if (npcName && penalty !== 0) {
        var old = getNpcTrust(state, npcName);
        setNpcTrust(state, npcName, old + penalty);
        if (c && c.narr) {
          c.narr('system', npcName + '对你的态度似乎变了。（' + old + '→' + getNpcTrust(state, npcName) + '）');
        }
      }
      break;
    }
    case 'npc_discovery': {
      // NPC discovers player's deception (e.g., fake sample)
      var dNpc = data.npc;
      if (dNpc && data.discoveryPenalty) {
        var dOld = getNpcTrust(state, dNpc);
        setNpcTrust(state, dNpc, Math.max(0, dOld + data.discoveryPenalty));
        if (c && c.narr) {
          c.narr('system', dNpc + '发现了真相。');
        }
      }
      break;
    }
    case 'martha_corruption_trigger': {
      // Delayed corruption trigger from helping Elias with deep one sample
      if (data.npc === '玛莎·格雷') {
        var ns = getNpcState(state, '玛莎·格雷');
        if (!ns.corrupted) {
          setNpcState(state, '玛莎·格雷', Object.assign({}, ns, { corruptionTriggered: true }));
          if (c && c.narr) {
            c.narr('system', '你注意到玛莎最近有些不对劲。她的皮肤上出现了奇怪的斑纹……');
          }
        }
      }
      break;
    }
    case 'elias_desperation': {
      // Elias becomes desperate if player refuses him
      if (data.npc === '伊莱亚斯·沃德') {
        var eNs = getNpcState(state, '伊莱亚斯·沃德');
        if (!eNs.desperate) {
          setNpcState(state, '伊莱亚斯·沃德', Object.assign({}, eNs, { desperate: true }));
          if (c && c.narr) {
            c.narr('system', '伊莱亚斯看起来比上次更加焦躁了。他开始独自一人待在实验室里。');
          }
        }
      }
      break;
    }
    default:
      break;
  }
}

// ════════════════════════════════════════
// Section 4: Moral dilemma integration
// ════════════════════════════════════════

/**
 * Process a moral dilemma choice. Schedules immediate trust changes
 * and any delayed effects defined in the dilemma data.
 *
 * @param {string} dilemmaId - key in MORAL_DILEMMAS
 * @param {string} choiceId - the chosen option
 * @param {object} state - mutable game state
 * @param {object} c - reducer context
 * @returns {object|null} immediate narrative text or null
 */
export function processMoralDilemmaChoice(dilemmaId, choiceId, state, c) {
  var dilemma = MORAL_DILEMMAS[dilemmaId];
  if (!dilemma) return null;
  var choice = dilemma.choices.find(function (ch) { return ch.id === choiceId; });
  if (!choice) return null;

  // Immediate effects
  if (choice.immediateEffect && c && c.narr) {
    c.narr('system', choice.immediateEffect);
  }

  // Immediate hidden cost
  if (choice.hiddenCost) {
    var hc = choice.hiddenCost;
    if (hc.npc && hc.npcPenalty) {
      var old = getNpcTrust(state, hc.npc);
      setNpcTrust(state, hc.npc, Math.max(0, old + hc.npcPenalty));
      propagateTrustChange(hc.npc, hc.npcPenalty, state, c);
      propagateFactionStanding(hc.npc, hc.npcPenalty, state);
    }
    if (hc.delayedEffect && hc.delayDays) {
      var targetDay = (state.day || 1) + hc.delayDays;
      scheduleDelayedEffect(state, hc.delayedEffect, targetDay, hc);
    }
  }

  // Immediate hidden benefit
  if (choice.hiddenBenefit) {
    var hb = choice.hiddenBenefit;
    if (hb.npc && hb.npcBenefit) {
      var bOld = getNpcTrust(state, hb.npc);
      setNpcTrust(state, hb.npc, Math.min(5, bOld + hb.npcBenefit));
      propagateTrustChange(hb.npc, hb.npcBenefit, state, c);
      propagateFactionStanding(hb.npc, hb.npcBenefit, state);
    }
  }

  // Behavior counter
  if (choice.behaviorCounter) {
    state.behaviorTracking = state.behaviorTracking || {};
    state.behaviorTracking[choice.behaviorCounter] = (state.behaviorTracking[choice.behaviorCounter] || 0) + 1;
  }

  // Discovery chance (for deception choices)
  if (choice.hiddenCost && choice.hiddenCost.discoveryChance && choice.hiddenCost.discoveryDelay) {
    var discoveryRoll = (c && c.rng ? c.rng.next() : Math.random());
    if (discoveryRoll < choice.hiddenCost.discoveryChance) {
      var discDay = (state.day || 1) + choice.hiddenCost.discoveryDelay;
      scheduleDelayedEffect(state, 'npc_discovery', discDay, {
        npc: choice.hiddenCost.npc,
        discoveryPenalty: choice.hiddenCost.npcPenalty * 2, // harsher when discovered
      });
    }
  }

  return choice.immediateEffect || null;
}
