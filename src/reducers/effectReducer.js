// src/reducers/effectReducer.js - Unified effect application system
// All game effects (items, events, NPCs, areas, endings) go through applyEffects().

import { clamp, rollDice } from './utils.js';

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
        if (!state.clues.includes(eff.clue_id)) state.clues.push(eff.clue_id);
        break;
      }
      case 'add_flag': {
        if (!state.triggeredEvents.includes(eff.flag_id)) state.triggeredEvents.push(eff.flag_id);
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
        state.eventLog.push({ day: state.day, text: eff.text || '' });
        break;
      }
      default:
        break;
    }
  }
}

/**
 * Adapter: converts legacy {HP: 3, SAN: -2} event effect format to applyEffects calls.
 */
export function applyLegacyEffects(state, eff) {
  if (!eff) return;
  if (eff.HP) applyEffects(state, [{ type: 'modify_stat', target: 'HP', amount: eff.HP }]);
  if (eff.san) applyEffects(state, [{ type: 'modify_stat', target: 'SAN', amount: eff.san }]);
  if (eff.food) state._foodDelta = (state._foodDelta || 0) + eff.food;
}
