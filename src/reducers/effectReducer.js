// src/reducers/effectReducer.js - Unified effect application system
// All game effects (items, events, NPCs, areas, endings) go through applyEffects().

import { clamp, rollDice } from './utils.js';
import { applyExtendedEffect } from './extendedEvents.js';
import { incrementStat } from './achievementReducer.js';

/**
 * Apply a list of effects to game state.
 * @param {Object} state - mutable game state clone
 * @param {Array|Object} effects - effect or array of effects
 * @param {Object} context - { source: 'item_use'|'event'|'npc'|'ending', item_id?, npc_id? }
 */
export function applyEffects(state, effects, context) {
  if (!effects) return;
  const effectList = Array.isArray(effects) ? effects : [effects];
  for (const eff of effectList) {
    switch (eff.type) {
      case 'modify_stat': {
        const target = eff.target;
        const amount = eff.amount_dice ? rollDice(eff.amount_dice) : (eff.amount || 0);
        if (target === 'HP') state.hp = clamp(state.hp + amount, 0, state.maxHp);
        else if (target === 'SAN') state.san = clamp(state.san + amount, 0, state.maxSan);
        else if (state.stats[target] !== undefined) state.stats[target] = clamp(state.stats[target] + amount, 0, 999);
        break;
      }
      case 'modify_resource': {
        const res = eff.resource || 'food';
        if (res === 'food') {
          state.food = Math.min(state.maxFood || 5, (state.food || 0) + (eff.amount || 0));
          if (state.food > 0) state.starvationDays = 0; // 饥饿解除
        } else if (res === 'light') {
          state.lightLevel = Math.max(0, Math.min(3, (state.lightLevel || 0) + (eff.amount || 0)));
        } else {
          const key = '_resource_' + res;
          state[key] = (state[key] || 0) + (eff.amount || 0);
        }
        break;
      }
      case 'add_item': {
        const existing = state.inventory.find(i => i.id === eff.item_id);
        if (existing && existing.uses > 0) {
          existing.uses += (eff.amount || 1);
        } else {
          state.inventory.push({ id: eff.item_id, name: eff.name || eff.item_id, uses: eff.uses || 1 });
        }
        try{incrementStat('items_collected');}catch(e){}
        try{if(typeof audioManager!=='undefined')audioManager.playEffect('item_gain');}catch(e){}
        break;
      }
      case 'remove_item': {
        const idx = state.inventory.findIndex(i => i.id === eff.item_id || i.name === eff.item_id);
        if (idx >= 0) {
          if (eff.amount && state.inventory[idx].uses > 0) {
            state.inventory[idx].uses -= eff.amount;
            if (state.inventory[idx].uses <= 0) state.inventory.splice(idx, 1);
          } else {
            state.inventory.splice(idx, 1);
          }
        }
        break;
      }
      case 'add_clue': {
        const _clueExists = state.clues.some(c => (typeof c === 'string' ? c : c.id) === eff.clue_id);
        if (!_clueExists) {
          const _resolved = typeof resolveClueName === 'function' ? resolveClueName(eff.clue_id) : null;
          state.clues.push(_resolved && _resolved !== eff.clue_id ? { id: eff.clue_id, name: _resolved } : eff.clue_id);
          try{if(typeof audioManager!=='undefined')audioManager.playEffect('clue_found');}catch(e){}
        }
        break;
      }
      case 'add_flag': {
        const flags = Array.isArray(eff.flag_id) ? eff.flag_id : [eff.flag_id];
        for (const flag of flags) {
          if (flag && !state.triggeredEvents.includes(flag)) {
            state.triggeredEvents.push(flag);
          }
        }
        break;
      }
      case 'modify_npc_trust': {
        const npcId = eff.npc_id;
        state.npcTrust[npcId] = Math.min(5, Math.max(0, (state.npcTrust[npcId] || 0) + (eff.amount || 1)));
        break;
      }
      case 'modify_npc_corruption': {
        const npcId2 = eff.npc_id;
        state.npcStates[npcId2] = { ...state.npcStates[npcId2], corrupted: eff.corrupted !== undefined ? eff.corrupted : true };
        break;
      }
      case 'add_log': {
        if (!state.eventLog) state.eventLog = [];
        state.eventLog.push({ day: state.day, text: eff.text || '' });
        break;
      }
      default: {
        // Try extended effect handler
        if (!applyExtendedEffect(state, eff)) {
          // Unknown effect type, ignore
        }
        break;
      }
    }
  }
}

/**
 * Adapter: converts legacy {HP: 3, SAN: -2, food: 1, add_clue: "..."} event effect format.
 * Also handles extended event formats: npc_trust, safehouseCorruption, add_item, add_run_memory.
 */
export function applyLegacyEffects(state, eff) {
  if (!eff) return;
  // HP / SAN (both casings)
  if (eff.HP) applyEffects(state, [{ type: 'modify_stat', target: 'HP', amount: eff.HP }]);
  if (eff.hp) applyEffects(state, [{ type: 'modify_stat', target: 'HP', amount: eff.hp }]);
  if (eff.san) applyEffects(state, [{ type: 'modify_stat', target: 'SAN', amount: eff.san }]);
  // Food
  if (eff.food) state._foodDelta = (state._foodDelta || 0) + eff.food;
  // Mythos
  if (eff.mythos != null) applyExtendedEffect(state, { type: 'modify_mythos', amount: eff.mythos });
  // Humanity
  if (eff.humanity != null) applyExtendedEffect(state, { type: 'modify_humanity', amount: eff.humanity });
  // Flags
  if (eff.add_flag) {
    const flags = Array.isArray(eff.add_flag) ? eff.add_flag : [eff.add_flag];
    for (const fid of flags) {
      applyEffects(state, { type: 'add_flag', flag_id: fid });
    }
  }
  // Clues (string or array)
  if (eff.add_clue) {
    const clues = Array.isArray(eff.add_clue) ? eff.add_clue : [eff.add_clue];
    for (const cid of clues) {
      if (typeof cid === 'string') {
        if (!state.clues.some(c => (typeof c === 'string' ? c : c.id) === cid)) {
          const resolved = typeof resolveClueName === 'function' ? resolveClueName(cid) : cid;
          state.clues.push(resolved && resolved !== cid ? { id: cid, name: resolved } : cid);
        }
      } else if (cid && cid.id) {
        if (!state.clues.some(c => (typeof c === 'string' ? c : c.id) === cid.id)) state.clues.push(cid);
      }
    }
  }
  // Items
  if (eff.add_item) {
    applyEffects(state, [{ type: 'add_item', ...eff.add_item }]);
  }
  // NPC trust: { "NPC名": amount }
  if (eff.npc_trust) {
    for (const [npcId, amount] of Object.entries(eff.npc_trust)) {
      state.npcTrust[npcId] = Math.min(5, Math.max(0, (state.npcTrust[npcId] || 0) + amount));
    }
  }
  // Safehouse corruption
  if (eff.safehouseCorruption) {
    state.safehouseCorruption = Math.max(0, (state.safehouseCorruption || 0) + eff.safehouseCorruption);
  }
  // Run memory
  if (eff.add_run_memory) {
    applyExtendedEffect(state, { type: 'add_run_memory', ...eff.add_run_memory });
  }
  // Ending condition unlock
  if (eff.unlock_ending_condition) {
    applyExtendedEffect(state, { type: 'unlock_ending_condition', condition_id: eff.unlock_ending_condition });
  }
  // Death hint
  if (eff.death_hint) {
    applyExtendedEffect(state, { type: 'set_last_death_hint', hint: eff.death_hint });
  }
}
