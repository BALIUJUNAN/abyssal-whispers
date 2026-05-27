// src/reducers/endingReducer.js - Ending condition checking (data-driven)

// Map behavior ending condition variable names to state field accessors
const CONDITION_VAR_MAP = {
  direct_kill_count: s=>s.direct_kill_count||0,
  cannibalism_count: s=>s.cannibalism_count||0,
  clean_kill_pattern: s=>s.clean_kill_pattern||0,
  npc_deaths_by_manipulation: s=>s.npc_deaths_by_manipulation||0,
  self_harm_ritual_count: s=>s.self_harm_ritual_count||0,
  fusion_accepted_count: s=>s.fusion_accepted_count||0,
  possession_accepted_count: s=>s.possession_accepted_count||0,
  forbidden_intimacy_flags: s=>s.forbidden_intimacy_flags||0,
  sacred_desecration_count: s=>s.sacred_desecration_count||0,
  same_npc_harm_max: s=>s.same_npc_harm_max||0,
  npc_as_resource_count: s=>s.npc_as_resource_count||0,
  betrayed_high_trust_npcs: s=>s.betrayed_high_trust_npcs||0,
  cult_leader_score: s=>s.cult_leader_score||0,
  self_sacrifice_for_power: s=>s.self_sacrifice_for_power||0,
  sleep_streak: s=>s.sleep_streak||0,
  work_only_days: s=>s.work_only_days||0,
  safehouse_stay_days: s=>s.safehouse_stay_days||0,
  move_only_days: s=>s.move_only_days||0,
  hoarded_money_max: s=>s.hoarded_money_max||0,
  hoarded_food_max: s=>s.hoarded_food_max||0,
  completed_clue_chains: s=>(s.completedChains||[]).length,
  archive_consumed_count: s=>s.archive_consumed_count||0,
  record_only_days: s=>s.record_only_days||0,
  low_intervention_count: s=>s.low_intervention_count||0,
  meta_boundary_breaks: s=>s.meta_boundary_breaks||0,
  final_choice_refused_count: s=>s.final_choice_refused_count||0,
  save_delete_attempts: s=>s.save_delete_attempts||0,
  loop_exploit_score: s=>s.loop_exploit_score||0,
  prophecy_spread_count: s=>s.prophecy_spread_count||0,
  redeemed_npcs: s=>s.redeemed_npcs||0,
  thirteenth_bell_obsession: s=>s.thirteenth_bell_obsession||0,
  fusion_and_self_harm_total: s=>(s.fusion_accepted_count||0)+(s.self_harm_ritual_count||0),
  work_count: s=>s.work_count||0,
  loop_break_attempts: s=>s.loop_break_attempts||0,
  harbor_visits: s=>(s.visitedAreas||[]).filter(a=>a==='harbor_district').length,
  sea_acceptance_flags: s=>s.sea_acceptance_flags||0,
  san: s=>s.san,
  player_san: s=>s.san,
  player_humanity_score: s=>s.humanityScore||50,
};

export function parseConditionString(condStr) {
  if(condStr.includes(' OR ')){
    const parts=condStr.split(' OR ');
    return {type:'or_group',conditions:parts.map(p=>parseConditionString(p.trim()))};
  }
  if(!condStr.match(/[><=]/)){
    return {type:'has_flag',flag_id:condStr.trim()};
  }
  let match;
  if((match=condStr.match(/^(\S+)\s*>=\s*(\d+)$/))){
    const varName=match[1],value=parseInt(match[2]);
    return {type:'counter_gte',varName,value};
  }
  if((match=condStr.match(/^(\S+)\s*>\s*(\d+)$/))){
    const varName=match[1],value=parseInt(match[2]);
    if(varName==='player_san'||varName==='san')return {type:'san_above',value};
    return {type:'counter_gte',varName,value:value+1};
  }
  if((match=condStr.match(/^(\S+)\s*<=\s*(\d+)$/))){
    const varName=match[1],value=parseInt(match[2]);
    if(varName==='san'||varName==='player_san')return {type:'san_lte',value};
    if(varName==='player_humanity_score')return {type:'counter_lte',varName:'humanityScore',value};
    return {type:'counter_lte',varName,value};
  }
  if((match=condStr.match(/^(\S+)\s*<\s*(\d+)$/))){
    const varName=match[1],value=parseInt(match[2]);
    if(varName==='san'||varName==='player_san')return {type:'san_below',value};
    return {type:'counter_lte',varName,value:value-1};
  }
  if((match=condStr.match(/^(\S+)\s*==\s*(\d+)$/))){
    const varName=match[1],value=parseInt(match[2]);
    return {type:'counter_eq',varName,value};
  }
  return {type:'always_true'};
}

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
    case 'has_flag': return !!(state.triggeredEvents&&state.triggeredEvents.includes(cond.flag_id));
    case 'npc_trust_gte': return (state.npcTrust[cond.npc_id] || 0) >= cond.value;
    case 'skill_gte': return (state.skills[cond.skill_name] || 0) >= cond.value;
    case 'items_count': return state.inventory.length >= cond.value;
    case 'counter_gte': {
      const fn=CONDITION_VAR_MAP[cond.varName];
      return fn?fn(state)>=cond.value:false;
    }
    case 'counter_lte': {
      const fn=CONDITION_VAR_MAP[cond.varName];
      return fn?fn(state)<=cond.value:false;
    }
    case 'counter_eq': {
      const fn=CONDITION_VAR_MAP[cond.varName];
      return fn?fn(state)===cond.value:false;
    }
    case 'or_group': return cond.conditions.some(c=>checkSingleCondition(state,c));
    case 'always_true': return true;
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
    // Support both field names: conditions / required_conditions, blocking_conds / blocking_conditions
    const rawConds = ed.conditions || ed.required_conditions || [];
    const rawBlocks = ed.blocking_conds || ed.blocking_conditions || [];
    if (!rawConds || rawConds.length === 0) continue;
    // Parse string conditions into structured objects if needed
    const condField = rawConds.map(c => typeof c === 'string' ? parseConditionString(c) : c);
    const blockField = rawBlocks.map(c => typeof c === 'string' ? parseConditionString(c) : c);
    const allMet = condField.every(c => checkSingleCondition(state, c));
    const blocked = blockField.length > 0 && blockField.some(c => checkSingleCondition(state, c));
    if (allMet&&!blocked) {
      const rewrite = rewrittenEndings[ed.id];
      let desc = ed.description;
      if (ed.humanity_variants) {
        desc = ed.humanity_variants[humanityTier] || ed.humanity_variants.humanity_fragile || ed.description;
      } else if (rewrite) {
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
  const sorted=[...matched].sort((a,b)=>{
    const ea=endings.find(e=>e.id===a.id);const eb=endings.find(e=>e.id===b.id);
    return (eb?.priority||0)-(ea?.priority||0);
  });
  for (const pid of priorityOrder) {
    const found = sorted.find(e => e.id === pid);
    if (found) return found;
  }
  return sorted[0];
}

export function checkEndingLegacy(state, ctx) {
  const { GD } = ctx;
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
