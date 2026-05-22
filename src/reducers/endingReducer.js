// src/reducers/endingReducer.js - Ending condition checking (data-driven)

function checkSingleCondition(state, cond) {
  switch (cond.type) {
    case 'san_below': return state.san < cond.value;
    case 'san_above': return state.san > cond.value;
    case 'san_equals': return state.san === cond.value;
    case 'san_lte': return state.san <= cond.value;
    case 'hp_below': return state.hp < cond.value;
    case 'hp_equals': return state.hp === cond.value;
    case 'hp_lte': return state.hp <= cond.value;
    case 'day_gte': return state.day >= cond.value;
    case 'day_lte': return state.day <= cond.value;
    case 'in_area': return state.currentArea === cond.area_id;
    case 'has_item': return state.inventory.some(i => i.id === cond.item_id || i.name === cond.item_id);
    case 'has_clue': return state.clues.includes(cond.clue_id);
    case 'has_flag': return state.triggeredEvents.includes(cond.flag_id);
    case 'npc_trust_gte': return (state.npcTrust[cond.npc_id] || 0) >= cond.value;
    case 'skill_gte': return (state.skills[cond.skill_name] || 0) >= cond.value;
    case 'items_count': return state.inventory.length >= cond.value;
    default: return true;
  }
}

export function checkEndingDataDriven(state, ctx) {
  const { GD } = ctx;
  const endings = GD.endings || [];
  const priorityOrder = GD.ending_judgement?.priority_order || [];
  const rewrittenEndings = GD.implementation_notes?.ending_text_rewrite?.endings || {};
  const endingV2 = GD.implementation_notes?.ending_system_v2;
  const humanityScore = state.humanityScore ?? 50;
  const humanityTier = humanityScore >= 60 ? 'humanity_high' : humanityScore >= 30 ? 'humanity_fragile' : 'humanity_lost';
  const matched = [];
  for (const ed of endings) {
    if (!ed.conditions || ed.conditions.length === 0) continue;
    const allMet = ed.conditions.every(c => checkSingleCondition(state, c));
    if (allMet) {
      const rewrite = rewrittenEndings[ed.id];
      // Select description based on humanity tier (ending_system_v2 layer 3)
      let desc = ed.description;
      if (rewrite) {
        if (humanityTier === 'humanity_high' && rewrite.high_humanity_text) desc = rewrite.high_humanity_text;
        else if (humanityTier === 'humanity_lost' && rewrite.low_humanity_text) desc = rewrite.low_humanity_text;
        else desc = rewrite.high_humanity_text || ed.description;
      }
      matched.push({
        id: ed.id,
        name: ed.name,
        type: ed.type || 'neutral',
        description: desc,
        rewards: ed.rewards,
        humanityTier
      });
    }
  }
  if (matched.length === 0) return null;
  if (matched.length === 1) return matched[0];
  // Use priority order to select best ending
  for (const pid of priorityOrder) {
    const found = matched.find(e => e.id === pid);
    if (found) return found;
  }
  return matched[0];
}

export function checkEndingLegacy(state, ctx) {
  const { GD } = ctx;
  // Try new endings first, then deprecated archive, then module7
  const legacyEndings = GD.module7_endings || [];
  const deprecatedEndings = GD.deprecated_endings_archive?.old_endings || [];
  const allLegacy = [...legacyEndings, ...deprecatedEndings];
  if (state.san <= 0 && state.currentArea === 'deep_catacombs')
    return allLegacy.find(e => e.id === 'ending_abyss_consumed') || allLegacy.find(e => e.id === 'ending_bad_consumed');
  if (state.san <= 0)
    return allLegacy.find(e => e.id === 'ending_neutral_madness') || { name: '疯狂', type: 'bad', description: '你的理智彻底崩塌。' };
  if (state.day >= 28)
    return allLegacy.find(e => e.id === 'ending_heretical_dawn') || allLegacy.find(e => e.id === 'ending_bad_ritual') || { name: '时间耗尽', type: 'bad', description: '封印崩溃。' };
  return null;
}

export function checkEnding(state, ctx) {
  return checkEndingDataDriven(state, ctx) || checkEndingLegacy(state, ctx) || null;
}
