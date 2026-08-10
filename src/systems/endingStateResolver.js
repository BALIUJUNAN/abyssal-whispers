// src/systems/endingStateResolver.js - Bridge ending vocabulary to live game state.
//
// Main-ending data predates the current event/clue/NPC state model and uses
// semantic condition names (for example `harbor_chain_completed`).  Keep that
// narrative vocabulary in data, but resolve it here against the canonical
// runtime fields instead of requiring dozens of duplicate shadow flags.

import { hasClueId } from '../utils/clueNameMap.js';
import { hasTriggered } from '../utils/triggeredSet.js';
import { NPC_REGISTRY, getNpcName, resolveNpcId } from '../data/registry/npcRegistry.js';

function behaviorValue(state, key) {
  return (state.behaviorTracking && state.behaviorTracking[key]) || 0;
}

function hasDirectFlag(state, flagId) {
  return (
    hasTriggered(state, flagId) ||
    (state.unlockedEndingConditions || []).includes(flagId) ||
    (state.everTriggeredEvents || []).includes(flagId) ||
    (state.retainedKnowledge || []).includes(flagId)
  );
}

function hasAnyDirectFlag(state, ids) {
  return ids.some(function (id) {
    return hasDirectFlag(state, id);
  });
}

function hasAnyClue(state, ids) {
  return ids.some(function (id) {
    return hasClueId(state.clues || [], id);
  });
}

function hasInventoryEntry(state, ids) {
  return (state.inventory || []).some(function (item) {
    var itemId = typeof item === 'string' ? item : item.id;
    var itemName = typeof item === 'string' ? item : item.name;
    return ids.includes(itemId) || ids.includes(itemName);
  });
}

function hasCompletedChain(state, ids) {
  return ids.some(function (id) {
    return (state.completedChains || []).includes(id) || hasDirectFlag(state, id + '_completed');
  });
}

function hasConclusion(state, ids) {
  return ids.some(function (id) {
    return (state.discoveredConclusions || []).includes(id);
  });
}

function getNpcMapValue(map, npcId, fallback) {
  if (!map) return fallback;
  var stableId = resolveNpcId(npcId);
  var displayName = getNpcName(stableId);
  if (map[stableId] !== undefined) return map[stableId];
  if (map[displayName] !== undefined) return map[displayName];
  if (map[npcId] !== undefined) return map[npcId];
  return fallback;
}

export function getNpcTrustForEnding(state, npcId) {
  return Number(getNpcMapValue(state.npcTrust, npcId, 0)) || 0;
}

export function getNpcStateForEnding(state, npcId) {
  return getNpcMapValue(state.npcStates, npcId, {}) || {};
}

export function getNpcAgencyForEnding(state, npcId, legacyField) {
  if (typeof state[legacyField] === 'number') return state[legacyField];
  var stableId = resolveNpcId(npcId);
  var displayName = getNpcName(stableId);
  if (typeof state[stableId + '_agency'] === 'number') return state[stableId + '_agency'];
  if (typeof state[displayName + '_agency'] === 'number') return state[displayName + '_agency'];
  var npcState = getNpcStateForEnding(state, npcId);
  if (typeof npcState.agency === 'number') return npcState.agency;
  // Redemption is the existing gameplay action that explicitly restores an
  // NPC's autonomy.  Treat it as full agency for the choice-ending gate.
  if (npcState.redeemed) return 100;
  return getNpcTrustForEnding(state, npcId) * 10;
}

function npcIsDead(state, npcId) {
  return !!getNpcStateForEnding(state, npcId).dead;
}

function totalRedeemedNpcs(state) {
  // Count identities rather than raw map values because migrated saves can
  // temporarily contain both a localized key and its stable id.
  var stateCount = Object.keys(NPC_REGISTRY).filter(function (npcId) {
    return !!getNpcStateForEnding(state, npcId).redeemed;
  }).length;
  return Math.max(stateCount, behaviorValue(state, 'redeemed_npcs'));
}

function hasCompleteSealKnowledge(state) {
  var hasBlueprint =
    hasAnyDirectFlag(state, ['has_seal_ritual_blueprint']) ||
    hasAnyClue(state, ['clue_m_5', 'clue_m_6', 'seal_ritual_record']);
  var hasMaterial =
    hasAnyDirectFlag(state, ['has_seal_ritual_material_location']) ||
    hasConclusion(state, ['conclusion_fisher_key_blood']);
  var inspectedRitual = hasAnyDirectFlag(state, ['evt_seal_ritual', 'evt_ch5_final_ritual_begin']);
  return hasBlueprint && hasMaterial && inspectedRitual;
}

function didNotForceSacrifice(state) {
  return !hasAnyDirectFlag(state, [
    'player_forced_hilda_binding',
    'player_forced_blood_extraction',
    'player_forces_npc_sacrifice',
    'player_uses_npc_as_tool',
  ]);
}

/**
 * Semantic main-ending flags backed by real state producers.
 * Directly produced flags always win; these resolvers are compatibility
 * bridges for the older ending vocabulary in game_ch2plus.json.
 */
export var ENDING_FLAG_RESOLVERS = {
  has_complete_seal_ritual: hasCompleteSealKnowledge,
  has_key_blood: function (state) {
    return (
      hasConclusion(state, ['conclusion_fisher_key_blood']) ||
      hasAnyClue(state, ['clue_npc_cross_seal_key_blood', 'clue_3_2']) ||
      (hasCompletedChain(state, ['chain_harbor']) && getNpcTrustForEnding(state, 'old_fisher') >= 5)
    );
  },
  has_alternative_seal: function (state) {
    return (
      hasAnyClue(state, ['clue_m_6']) ||
      ((hasAnyDirectFlag(state, ['has_ancient_tree_seed']) ||
        hasInventoryEntry(state, ['ancient_tree_seed', '古树种子'])) &&
        hasAnyDirectFlag(state, ['has_seal_ritual_blueprint']))
    );
  },
  at_least_one_npc_redeemed: function (state) {
    return totalRedeemedNpcs(state) >= 1;
  },
  player_did_not_force_hilda_or_fisher_sacrifice: didNotForceSacrifice,
  player_did_not_manipulate_hilda_sacrifice: function (state) {
    return (
      didNotForceSacrifice(state) &&
      !hasAnyDirectFlag(state, ['player_withheld_key_information', 'player_hides_critical_truth'])
    );
  },
  player_did_not_massacre_hybrids: function (state) {
    return (
      !hasAnyDirectFlag(state, ['player_massacred_hybrids']) &&
      behaviorValue(state, 'direct_kill_count') < 3
    );
  },
  player_did_not_join_ritual: function (state) {
    return !hasAnyDirectFlag(state, [
      'player_joined_isabella_ritual',
      'player_joined_ritual',
      'player_joined_heretical_ritual',
    ]);
  },
  player_did_not_kill_isabella: function (state) {
    return (
      !npcIsDead(state, 'isabella_weber') &&
      !hasAnyDirectFlag(state, ['player_killed_isabella_without_investigation'])
    );
  },
  morris_family_chain_completed: function (state) {
    return hasCompletedChain(state, ['chain_morris', 'chain_manor_secrets']);
  },
  harbor_chain_completed: function (state) {
    return hasCompletedChain(state, ['chain_harbor', 'chain_harbor_investigation']);
  },
  heretical_chain_completed: function (state) {
    return hasCompletedChain(state, ['chain_heretical', 'chain_city_conspiracy']);
  },
  yith_chain_completed: function (state) {
    return hasCompletedChain(state, ['chain_yith_knowledge']);
  },
  player_understood_hybrid_truth: function (state) {
    return (
      hasConclusion(state, ['conclusion_fisher_key_blood']) ||
      hasAnyClue(state, ['clue_npc_cross_seal_key_blood', 'clue_3_2'])
    );
  },
  morning_star_truth_exposed: function (state) {
    return (
      hasConclusion(state, ['conclusion_bell_ritual_link']) ||
      hasAnyDirectFlag(state, ['has_morningstar_intel']) ||
      hasAnyClue(state, ['clue_area_morning_star'])
    );
  },
  has_escape_boat_route: function (state) {
    return (
      hasAnyDirectFlag(state, ['evt_ch5_escape_boat_route_confirmed']) ||
      hasInventoryEntry(state, ['escape_boat', 'escape_boat_key'])
    );
  },
  has_tide_timetable: function (state) {
    return (
      hasInventoryEntry(state, ['tide_timetable', '潮汐时刻表']) ||
      hasAnyClue(state, ['clue_1_2']) ||
      hasAnyDirectFlag(state, ['evt_fisherman_warning'])
    );
  },
  tommy_photo_chain_completed: function (state) {
    return (
      hasAnyDirectFlag(state, ['evt_ch1_tommy_photo']) ||
      hasAnyClue(state, ['clue_humanity_tommy_photo', 'clue_npc_cross_tommy_photos_legacy']) ||
      hasInventoryEntry(state, ['tommy_photo', 'tommy_photos'])
    );
  },
  elias_research_notes_collected: function (state) {
    return (
      hasAnyClue(state, ['clue_elias_seal_diagram', 'clue_npc_cross_full_truth']) ||
      hasInventoryEntry(state, ['elias_notes']) ||
      getNpcTrustForEnding(state, 'elias_ward') >= 4
    );
  },
  seal_not_restored: function (state) {
    return state.sealState !== 'restored' && !hasAnyDirectFlag(state, ['seal_restored']);
  },
  seal_restored: function (state) {
    return state.sealState === 'restored';
  },
  player_in_deep_catacombs: function (state) {
    return state.currentArea === 'deep_catacombs';
  },
  player_san_very_low: function (state) {
    return (state.san || 0) <= 10;
  },
  clue_chains_insufficient: function (state) {
    return (state.completedChains || []).length < 2;
  },
  mythos_high_humanity_low: function (state) {
    return (state.mythosLevel || 0) >= 20 && (state.humanityScore ?? 50) < 30;
  },
  has_time_fragment: function (state) {
    return (
      hasAnyDirectFlag(state, ['has_time_shard', 'transcendence_ending_unlocked']) ||
      hasAnyClue(state, ['has_time_shard']) ||
      hasInventoryEntry(state, ['time_fragment', 'time_shard', '时间碎片'])
    );
  },
  math_check_passed: function (state) {
    return hasAnyDirectFlag(state, [
      'evt_geometry_trap_skill_success',
      'evt_ancient_machine_skill_success',
      'evt_dimensional_rift_skill_success',
    ]);
  },
  occult_check_passed: function (state) {
    return hasAnyDirectFlag(state, [
      'evt_yithian_echo_skill_success',
      'evt_ch5_yog_gate_skill_success',
    ]);
  },
  multiple_npc_deja_vu_triggered: function (state) {
    var memories = Object.values(state.npcStates || {}).filter(function (npcState) {
      return npcState && npcState.memoryTriggered;
    }).length;
    return memories >= 2 || (state.loopCount || 0) >= 5;
  },
  discovered_loop_pollutes_world: function (state) {
    return (
      (state.pollution || 0) > 0 ||
      hasAnyDirectFlag(state, ['knowledge_loop_pollution', 'loop_pollution'])
    );
  },
  discovered_loop_is_seal_mechanism: function (state) {
    var sealKnowledge = state._sealKnowledge || {};
    return (
      Object.keys(sealKnowledge).length >= 2 ||
      hasAnyDirectFlag(state, ['knowledge_seal_attempted', 'knowledge_loop_seal_mechanism'])
    );
  },
};

export function hasEndingFlag(state, flagId) {
  if (hasDirectFlag(state, flagId)) return true;
  var resolver = ENDING_FLAG_RESOLVERS[flagId];
  return resolver ? !!resolver(state) : false;
}
