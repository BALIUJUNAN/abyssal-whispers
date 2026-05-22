// src/reducers/safehouseReducer.js - Safehouse degradation

import { rand } from './utils.js';
import { getSealState } from './worldReducer.js';

export function getSafehouseStage(corruption, ctx) {
  const { GD } = ctx;
  const stages = GD.systems?.safehouse?.degradation_stages || [];
  for (let i = stages.length - 1; i >= 0; i--) {
    const r = stages[i].corruption_range;
    if (corruption >= r[0] && corruption <= r[1]) return stages[i];
  }
  return stages[0] || { stage: 1, name: '安宁', is_safe: true, corruption_range: [0, 15], available_functions: { san_recovery: 2, fatigue_recovery: 30 } };
}

export function processSafehouseNight(state, ctx) {
  let corruption = state.safehouseCorruption || 0;
  const sealState = getSealState(state.day, ctx);
  let accel = sealState?.global_modifier?.npc_corruption_rate || 0.05;
  let baseGain = Math.round(accel * 10 + rand(0, 3));
  // Degradation triggers
  if (state.san < 30) baseGain = Math.round(baseGain * 1.3); // SAN<30: +30% speed
  if (state.npcStates['玛莎·格雷']?.corrupted) baseGain = Math.round(baseGain * 1.5); // Martha corrupted: +50%
  corruption += baseGain;
  const corruptedCount = Object.values(state.npcStates).filter(ns => ns.corrupted && !ns.dead).length;
  corruption += corruptedCount;
  return Math.min(100, corruption);
}
