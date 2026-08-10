// src/systems/npcSchedule.js — NPC autonomous movement system
//
// NPCs are not static. Each day, they may move to a different area based on:
//   - Corruption level (corrupted NPCs drift toward dangerous areas)
//   - Trust toward player (high trust → seek player's location)
//   - SAN state (low SAN → isolate in safe areas)
//   - Random drift (10% chance to move to adjacent area)
//   - Base schedule (day1-5 rotation as default)
//
// When two NPCs occupy the same area, their relationship changes:
//   - Positive affinity → both gain slight trust toward player
//   - Conflict → both lose slight trust toward player
//
// This system makes the world feel alive — NPCs have independent lives.

import { NPC_RELATIONSHIPS } from '../data/npcRelationshipWeb.js';
import { setNpcTrust, getNpcTrust, getNpcState } from '../utils/appHelpers.js';

// Area safety classification (for corruption/isolation movement)
var AREA_SAFETY = {
  town_center: 'safe',
  voxchester_manor: 'safe',
  whispering_forest: 'medium',
  harbor_district: 'medium',
  ruins_of_yith: 'medium',
  forbidden_grove: 'medium',
  catacombs_entrance: 'dangerous',
  deep_catacombs: 'dangerous',
  lighthouse: 'dangerous',
};

// Adjacent areas (for random drift movement)
var AREA_ADJACENCY = {
  town_center: ['harbor_district', 'whispering_forest', 'voxchester_manor'],
  harbor_district: ['town_center', 'lighthouse', 'catacombs_entrance'],
  whispering_forest: ['town_center', 'forbidden_grove', 'ruins_of_yith'],
  voxchester_manor: ['town_center', 'forbidden_grove'],
  catacombs_entrance: ['harbor_district', 'deep_catacombs'],
  ruins_of_yith: ['whispering_forest', 'forbidden_grove'],
  lighthouse: ['harbor_district'],
  forbidden_grove: ['whispering_forest', 'voxchester_manor', 'ruins_of_yith'],
  deep_catacombs: ['catacombs_entrance'],
};

/**
 * Compute daily NPC locations. Called at day start.
 * Mutates state.npcLocations.
 *
 * @param {object} state - mutable game state
 * @param {object} [GD] - game data (optional, uses global GD if not provided)
 */
export function computeDailyNpcLocations(state, GD, rng) {
  GD = GD || {};
  var _rand = rng ? rng.next.bind(rng) : Math.random;
  var npcs = GD.npcs || [];
  if (!state.npcLocations) state.npcLocations = {};

  // Get player's current area for trust-seek behavior
  var playerArea = state.currentArea || 'town_center';

  for (var i = 0; i < npcs.length; i++) {
    var npc = npcs[i];
    if (getNpcState(state, npc.name).dead) {
      // Dead NPCs don't move (body stays where it was)
      continue;
    }

    var ns = getNpcState(state, npc.name);
    var trust = getNpcTrust(state, npc.name);
    var baseLocation = _getScheduledLocation(npc, state.day);
    var finalLocation = baseLocation;

    // Movement rules (applied in priority order)
    // 1. Corruption override: corrupted NPCs gravitate to dangerous areas
    if (ns.corrupted && _rand() < 0.4) {
      var dangerAreas = Object.keys(AREA_SAFETY).filter(function (a) { return AREA_SAFETY[a] === 'dangerous'; });
      finalLocation = dangerAreas[Math.floor(_rand() * dangerAreas.length)];
    }
    // 2. Trust seek: high-trust NPCs may seek out the player
    else if (trust >= 3 && _rand() < 0.2) {
      finalLocation = playerArea;
    }
    // 3. Isolation: low-SAN NPCs move to safe areas
    else if (state.san < 30 && _rand() < 0.15) {
      var safeAreas = Object.keys(AREA_SAFETY).filter(function (a) { return AREA_SAFETY[a] === 'safe'; });
      finalLocation = safeAreas[Math.floor(_rand() * safeAreas.length)];
    }
    // 4. Random drift: 10% chance to move to adjacent area
    else if (_rand() < 0.1) {
      var adj = AREA_ADJACENCY[baseLocation] || [];
      if (adj.length > 0) {
        finalLocation = adj[Math.floor(_rand() * adj.length)];
      }
    }

    state.npcLocations[npc.name] = finalLocation;
  }
}

/**
 * Get NPCs currently at the given area.
 * Falls back to schedule-based lookup if npcLocations not yet computed.
 *
 * @param {object} state - game state
 * @param {string} areaId - area to check
 * @returns {Array} NPCs in that area
 */
export function getNpcLocations(state, areaId, GD) {
  var npcs = (GD?.npcs || GD?.module3_npcs || []);
  return npcs.filter(function (n) {
    if (getNpcState(state, n.name).dead) return false;
    var loc = state.npcLocations?.[n.name];
    if (!loc) {
      // Fallback: use schedule
      loc = _getScheduledLocation(n, state.day);
    }
    return loc === areaId;
  });
}

/**
 * Process NPC encounters: when two NPCs share an area, their relationship evolves.
 * Called after computeDailyNpcLocations.
 *
 * @param {object} state - mutable game state
 * @param {object} [c] - reducer context for narration
 */
export function processNpcEncounters(state, c, GD) {
  var npcs = (GD?.npcs || GD?.module3_npcs || []);
  var areaMap = {};
  for (var i = 0; i < npcs.length; i++) {
    var npc = npcs[i];
    if (getNpcState(state, npc.name).dead) continue;
    var loc = state.npcLocations?.[npc.name] || _getScheduledLocation(npc, state.day);
    if (!areaMap[loc]) areaMap[loc] = [];
    areaMap[loc].push(npc.name);
  }

  var encounters = [];
  for (var area in areaMap) {
    var here = areaMap[area];
    if (here.length < 2) continue;
    // Check all pairs
    for (var a = 0; a < here.length; a++) {
      for (var b = a + 1; b < here.length; b++) {
        var nameA = here[a];
        var nameB = here[b];
        var relKey = nameA + '-' + nameB;
        var relKeyRev = nameB + '-' + nameA;
        var rel = NPC_RELATIONSHIPS[relKey] || NPC_RELATIONSHIPS[relKeyRev];
        if (!rel) continue;
        if (rel.affinity >= 2) {
          // Friendly encounter: both gain slight trust toward player
          var trustBoost = Math.round(rel.moralWeight * 0.3);
          setNpcTrust(state, nameA, Math.min(5, getNpcTrust(state, nameA) + trustBoost));
          setNpcTrust(state, nameB, Math.min(5, getNpcTrust(state, nameB) + trustBoost));
          encounters.push({ area: area, npcs: [nameA, nameB], type: 'friendly', boost: trustBoost });
        } else if (rel.conflict) {
          // Conflict encounter: both lose slight trust
          var trustLoss = Math.round(rel.moralWeight * -0.2);
          setNpcTrust(state, nameA, Math.max(0, getNpcTrust(state, nameA) + trustLoss));
          setNpcTrust(state, nameB, Math.max(0, getNpcTrust(state, nameB) + trustLoss));
          encounters.push({ area: area, npcs: [nameA, nameB], type: 'conflict', loss: trustLoss });
        }
      }
    }
  }

  if (encounters.length > 0 && c && c.narr) {
    for (var j = 0; j < encounters.length; j++) {
      var enc = encounters[j];
      var areaName = _getAreaDisplayName(enc.area, GD);
      if (enc.type === 'friendly') {
        c.narr('system', enc.npcs[0] + '和' + enc.npcs[1] + '在' + areaName + '遇见了。他们交谈了片刻。');
      } else {
        c.narr('system', enc.npcs[0] + '和' + enc.npcs[1] + '在' + areaName + '发生了争执。');
      }
    }
  }
}

// ── Private helpers ──

function _getScheduledLocation(npc, day) {
  var schedule = npc.schedule || [];
  if (schedule.length === 0) return npc.location || 'town_center';
  var dayOfCycle = ((day - 1) % 5) + 1;
  var entry = schedule.find(function (s) { return s.startsWith('day' + dayOfCycle + ':'); });
  if (!entry) return npc.location || 'town_center';
  return entry.split(':')[1] || npc.location || 'town_center';
}

function _getAreaDisplayName(areaId, GD) {
  try {
    var areas = (GD?.areas || []);
    var area = areas.find(function (a) { return a.id === areaId; });
    return area ? area.name : areaId;
  } catch (e) {
    return areaId;
  }
}
