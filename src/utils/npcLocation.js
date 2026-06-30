// src/utils/npcLocation.js — NPC location lookup
//
// Uses autonomous NPC positions from state.npcLocations (computed daily by npcSchedule.js).
// Falls back to schedule-based lookup if npcLocations not yet computed.

export function getNpcsHere(state) {
  var npcs = GD.npcs || GD.module3_npcs || [];
  return npcs.filter(function (n) {
    if (state.npcStates[n.name]?.dead) return false;
    var loc = state.npcLocations?.[n.name];
    if (!loc) {
      // Fallback: compute from schedule
      var schedule = n.schedule || [];
      if (schedule.length === 0) return (n.location || 'town_center') === state.currentArea;
      var dayOfCycle = ((state.day - 1) % 5) + 1;
      var entry = schedule.find(function (s) { return s.startsWith('day' + dayOfCycle + ':'); });
      loc = entry ? entry.split(':')[1] : (n.location || 'town_center');
    }
    return loc === state.currentArea;
  });
}
