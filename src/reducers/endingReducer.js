// src/reducers/endingReducer.js - Ending condition checking (data-driven)

// Map behavior ending condition variable names to state field accessors
export const CONDITION_VAR_MAP = {
  // Behavior counters
  direct_kill_count: (s) => s.behaviorTracking.direct_kill_count || 0,
  cannibalism_count: (s) => s.behaviorTracking.cannibalism_count || 0,
  clean_kill_pattern: (s) => s.behaviorTracking.clean_kill_pattern || 0,
  npc_deaths_by_manipulation: (s) => s.behaviorTracking.npc_deaths_by_manipulation || 0,
  self_harm_ritual_count: (s) => s.behaviorTracking.self_harm_ritual_count || 0,
  fusion_accepted_count: (s) => s.behaviorTracking.fusion_accepted_count || 0,
  possession_accepted_count: (s) => s.behaviorTracking.possession_accepted_count || 0,
  forbidden_intimacy_flags: (s) => s.behaviorTracking.forbidden_intimacy_flags || 0,
  sacred_desecration_count: (s) => s.behaviorTracking.sacred_desecration_count || 0,
  same_npc_harm_max: (s) => s.behaviorTracking.same_npc_harm_max || 0,
  npc_as_resource_count: (s) => s.behaviorTracking.npc_as_resource_count || 0,
  betrayed_high_trust_npcs: (s) => s.behaviorTracking.betrayed_high_trust_npcs || 0,
  cult_leader_score: (s) => s.behaviorTracking.cult_leader_score || 0,
  self_sacrifice_for_power: (s) => s.behaviorTracking.self_sacrifice_for_power || 0,
  sleep_streak: (s) => s.behaviorTracking.sleep_streak || 0,
  work_only_days: (s) => s.behaviorTracking.work_only_days || 0,
  safehouse_stay_days: (s) => s.behaviorTracking.safehouse_stay_days || 0,
  move_only_days: (s) => s.behaviorTracking.move_only_days || 0,
  hoarded_money_max: (s) => s.behaviorTracking.hoarded_money_max || 0,
  hoarded_food_max: (s) => s.behaviorTracking.hoarded_food_max || 0,
  archive_consumed_count: (s) => s.behaviorTracking.archive_consumed_count || 0,
  record_only_days: (s) => s.behaviorTracking.record_only_days || 0,
  low_intervention_count: (s) => s.behaviorTracking.low_intervention_count || 0,
  meta_boundary_breaks: (s) => s.behaviorTracking.meta_boundary_breaks || 0,
  final_choice_refused_count: (s) => s.behaviorTracking.final_choice_refused_count || 0,
  save_delete_attempts: (s) => s.behaviorTracking.save_delete_attempts || 0,
  loop_exploit_score: (s) => s.behaviorTracking.loop_exploit_score || 0,
  prophecy_spread_count: (s) => s.behaviorTracking.prophecy_spread_count || 0,
  redeemed_npcs: (s) => s.behaviorTracking.redeemed_npcs || 0,
  thirteenth_bell_obsession: (s) => s.behaviorTracking.thirteenth_bell_obsession || 0,
  fusion_and_self_harm_total: (s) =>
    (s.behaviorTracking.fusion_accepted_count || 0) +
    (s.behaviorTracking.self_harm_ritual_count || 0),
  work_count: (s) => s.behaviorTracking.work_count || 0,
  loop_break_attempts: (s) => s.behaviorTracking.loop_break_attempts || 0,
  harbor_visits: (s) => (s.visitedAreas || []).filter((a) => a === 'harbor_district').length,
  sea_acceptance_flags: (s) => s.behaviorTracking.sea_acceptance_flags || 0,
  // Core stats
  san: (s) => s.san,
  player_san: (s) => s.san,
  hp: (s) => s.hp || 0,
  player_hp: (s) => s.hp || 0,
  day: (s) => s.day || 1,
  player_humanity_score: (s) => s.humanityScore ?? 50,
  // NPC trust (main ending variables)
  hilda_trust: (s) => (s.npcTrust || {})['希尔达·莫里斯'] || 0,
  old_fisher_trust: (s) => (s.npcTrust || {})['老费舍'] || 0,
  isabella_trust: (s) => (s.npcTrust || {})['伊莎贝拉·韦伯'] || 0,
  elias_trust: (s) => (s.npcTrust || {})['伊莱亚斯·沃德'] || 0,
  joshua_trust: (s) => (s.npcTrust || {})['约书亚·布莱克'] || 0,
  martha_trust: (s) => (s.npcTrust || {})['玛莎·格雷'] || 0,
  tommy_trust: (s) => (s.npcTrust || {})['汤米·陈'] || 0,
  // Mythos / loop / seal
  cthulhu_mythos: (s) => s.mythosLevel || 0,
  mythos_level: (s) => s.mythosLevel || 0,
  loop_count: (s) => s.loopCount || 0,
  pollution: (s) => Math.round((s.pollution || 0) * 100),
  city_corruption: (s) => s.safehouseCorruption || 0,
  safehouse_corruption: (s) => s.safehouseCorruption || 0,
  seal_status: (s) => s.sealState || 'intact',
  // NPC agency (for Hilda/Fisher choice endings)
  hilda_agency: (s) => s.hilda_agency || 0,
  old_fisher_agency: (s) => s.old_fisher_agency || 0,
  old_fisher_corruption: (s) => s.old_fisher_corruption || 0,
  isabella_agency: (s) => s.isabella_agency || 0,
  // Counts
  completed_clue_chains: (s) => (s.completedChains || []).length,
  visited_areas_count: (s) => (s.visitedAreas || []).length,
  triggered_events_count: (s) => (s.triggeredEvents || []).length,
  clues_count: (s) => (s.clues || []).length,
};

export function parseConditionString(condStr) {
  // AND support: split on " AND " (must come before OR to avoid partial matches)
  if (condStr.includes(' AND ')) {
    const parts = condStr.split(' AND ');
    return { type: 'and_group', conditions: parts.map((p) => parseConditionString(p.trim())) };
  }
  // OR support
  if (condStr.includes(' OR ')) {
    const parts = condStr.split(' OR ');
    return { type: 'or_group', conditions: parts.map((p) => parseConditionString(p.trim())) };
  }
  // NOT flag: "!flag_name"
  if (condStr.startsWith('!') && !condStr.match(/[><=]/)) {
    return { type: 'not_flag', flag_id: condStr.slice(1).trim() };
  }
  // No operator → treat as flag check
  if (!condStr.match(/[><=!]/)) {
    return { type: 'has_flag', flag_id: condStr.trim() };
  }
  let match;
  // != support (numeric and string)
  if ((match = condStr.match(/^(\S+)\s*!=\s*(\d+)$/))) {
    const varName = match[1],
      value = parseInt(match[2]);
    return { type: 'counter_neq', varName, value };
  }
  if ((match = condStr.match(/^(\S+)\s*!=\s*(\S+)$/))) {
    const varName = match[1],
      value = match[2];
    return { type: 'counter_neq_str', varName, value };
  }
  if ((match = condStr.match(/^(\S+)\s*>=\s*(\d+)$/))) {
    const varName = match[1],
      value = parseInt(match[2]);
    return { type: 'counter_gte', varName, value };
  }
  if ((match = condStr.match(/^(\S+)\s*>\s*(\d+)$/))) {
    const varName = match[1],
      value = parseInt(match[2]);
    if (varName === 'player_san' || varName === 'san') return { type: 'san_above', value };
    return { type: 'counter_gte', varName, value: value + 1 };
  }
  if ((match = condStr.match(/^(\S+)\s*<=\s*(\d+)$/))) {
    const varName = match[1],
      value = parseInt(match[2]);
    if (varName === 'san' || varName === 'player_san') return { type: 'san_lte', value };
    if (varName === 'player_humanity_score')
      return { type: 'counter_lte', varName: 'humanityScore', value };
    return { type: 'counter_lte', varName, value };
  }
  if ((match = condStr.match(/^(\S+)\s*<\s*(\d+)$/))) {
    const varName = match[1],
      value = parseInt(match[2]);
    if (varName === 'san' || varName === 'player_san') return { type: 'san_below', value };
    return { type: 'counter_lte', varName, value: value - 1 };
  }
  if ((match = condStr.match(/^(\S+)\s*==\s*(\d+)$/))) {
    const varName = match[1],
      value = parseInt(match[2]);
    return { type: 'counter_eq', varName, value };
  }
  return { type: 'always_true' };
}

export function checkSingleCondition(state, cond) {
  if (!cond || typeof cond !== 'object') return false;
  switch (cond.type) {
    case 'san_below':
      return state.san < cond.value;
    case 'san_above':
      return state.san > cond.value;
    case 'san_equals':
      return state.san === cond.value;
    case 'san_lte':
      return state.san <= cond.value;
    case 'hp_below':
      return state.hp < cond.value;
    case 'hp_equals':
      return state.hp === cond.value;
    case 'hp_lte':
      return state.hp <= cond.value;
    case 'day_gte':
      return state.day >= cond.value;
    case 'day_lte':
      return state.day <= cond.value;
    case 'in_area':
      return state.currentArea === cond.area_id;
    case 'has_item':
      return state.inventory.some((i) => i.id === cond.item_id || i.name === cond.item_id);
    case 'has_clue':
      return hasClueId(state.clues, cond.clue_id);
    case 'has_flag':
      return !!(state.triggeredEvents && state.triggeredEvents.includes(cond.flag_id));
    case 'not_flag':
      return !(state.triggeredEvents && state.triggeredEvents.includes(cond.flag_id));
    case 'npc_trust_gte':
      return (state.npcTrust[cond.npc_id] || 0) >= cond.value;
    case 'skill_gte':
      return (state.skills[cond.skill_name] || 0) >= cond.value;
    case 'items_count':
      return state.inventory.length >= cond.value;
    case 'counter_gte': {
      const fn = CONDITION_VAR_MAP[cond.varName];
      return fn ? fn(state) >= cond.value : false;
    }
    case 'counter_lte': {
      const fn = CONDITION_VAR_MAP[cond.varName];
      return fn ? fn(state) <= cond.value : false;
    }
    case 'counter_eq': {
      const fn = CONDITION_VAR_MAP[cond.varName];
      return fn ? fn(state) === cond.value : false;
    }
    case 'counter_neq': {
      const fn = CONDITION_VAR_MAP[cond.varName];
      return fn ? fn(state) !== cond.value : false;
    }
    case 'counter_neq_str': {
      const fn = CONDITION_VAR_MAP[cond.varName];
      return fn ? String(fn(state)) !== String(cond.value) : false;
    }
    case 'or_group':
      return cond.conditions.some((c) => checkSingleCondition(state, c));
    case 'and_group':
      return cond.conditions.every((c) => checkSingleCondition(state, c));
    case 'all':
      return (cond.conditions || []).every((c) => checkSingleCondition(state, c));
    case 'any':
      return (cond.conditions || []).some((c) => checkSingleCondition(state, c));
    case 'not':
      return !checkSingleCondition(state, cond.condition);
    case 'always_true':
      return false;
    default:
      return false;
  }
}

export function checkEndingDataDriven(state, ctx) {
  const { GD } = ctx;
  const endings = GD.endings || [];
  const priorityOrder = GD.ending_judgement?.priority_order || [];
  const rewrittenEndings = GD.implementation_notes?.ending_text_rewrite?.endings || {};
  const endingV2 = GD.implementation_notes?.ending_system_v2;
  const humanityScore = state.humanityScore ?? 50;
  const humanityTier =
    humanityScore >= 60
      ? 'humanity_high'
      : humanityScore >= 30
        ? 'humanity_fragile'
        : 'humanity_lost';

  const resolveDescription = (ed) => {
    const rewrite = rewrittenEndings[ed.id];
    let desc = ed.description;
    if (ed.humanity_variants) {
      desc =
        ed.humanity_variants[humanityTier] ||
        ed.humanity_variants.humanity_fragile ||
        ed.description;
    } else if (rewrite) {
      if (humanityTier === 'humanity_high' && rewrite.high_humanity_text)
        desc = rewrite.high_humanity_text;
      else if (humanityTier === 'humanity_lost' && rewrite.low_humanity_text)
        desc = rewrite.low_humanity_text;
      else desc = rewrite.high_humanity_text || ed.description;
    }
    return desc;
  };

  const matched = [];
  for (const ed of endings) {
    const rawConds = ed.conditions || ed.required_conditions || [];
    const rawBlocks = ed.blocking_conds || ed.blocking_conditions || [];
    if (!rawConds || rawConds.length === 0) continue;
    const condField = rawConds.map((x) => (typeof x === 'string' ? parseConditionString(x) : x));
    const blockField = rawBlocks.map((x) => (typeof x === 'string' ? parseConditionString(x) : x));
    const allMet = condField.every((cond) => checkSingleCondition(state, cond));
    const blocked = blockField.length > 0 && blockField.some((cond) => checkSingleCondition(state, cond));
    if (allMet && !blocked) {
      matched.push({
        id: ed.id,
        name: ed.name,
        type: ed.type || 'neutral',
        description: resolveDescription(ed),
        rewards: ed.rewards,
        humanityTier,
        priority: ed.priority || 0,
        override_category: ed.override_category || 'main',
      });
    }
  }
  if (matched.length === 0) return null;

  // Separate into override-capable endings and annotation-only endings
  const overrideEndings = matched.filter((e) => e.override_category !== 'annotation');
  const annotationEndings = matched.filter((e) => e.override_category === 'annotation');

  // Select the winner from override-capable endings
  let winner = null;
  if (overrideEndings.length === 1) {
    winner = overrideEndings[0];
  } else if (overrideEndings.length > 1) {
    const sorted = [...overrideEndings].sort((a, b) => (b.priority || 0) - (a.priority || 0));
    // Check priority_order for explicit ordering
    for (const pid of priorityOrder) {
      const found = sorted.find((e) => e.id === pid);
      if (found) {
        winner = found;
        break;
      }
    }
    if (!winner) winner = sorted[0];
  }

  // If no override ending won, check if there's a main ending in the list
  if (!winner) {
    const mainEndings = matched.filter(
      (e) => !e.type || e.type === 'neutral' || e.type === 'good' || e.type === 'bad'
    );
    if (mainEndings.length > 0) {
      const sorted = [...mainEndings].sort((a, b) => (b.priority || 0) - (a.priority || 0));
      for (const pid of priorityOrder) {
        const found = sorted.find((e) => e.id === pid);
        if (found) {
          winner = found;
          break;
        }
      }
      if (!winner) winner = sorted[0];
    }
  }

  if (!winner) return null;

  // Attach annotation endings as behaviorAnnotations
  if (annotationEndings.length > 0) {
    winner.behaviorAnnotations = annotationEndings;
  }
  return winner;
}

export function checkEndingLegacy(state, ctx) {
  const { GD } = ctx;
  const legacyEndings = GD.module7_endings || [];
  const deprecatedEndings = GD.deprecated_endings_archive?.old_endings || [];
  const allLegacy = [...legacyEndings, ...deprecatedEndings];
  if (state.san <= 0 && state.currentArea === 'deep_catacombs')
    return (
      allLegacy.find((e) => e.id === 'ending_abyss_consumed') ||
      allLegacy.find((e) => e.id === 'ending_bad_consumed')
    );
  if (state.san <= 0)
    return (
      allLegacy.find((e) => e.id === 'ending_neutral_madness') || {
        name: '疯狂',
        type: 'bad',
        description: '你的理智彻底崩塌。',
      }
    );
  if (state.day >= 28)
    return (
      allLegacy.find((e) => e.id === 'ending_heretical_dawn') ||
      allLegacy.find((e) => e.id === 'ending_bad_ritual') || {
        name: '时间耗尽',
        type: 'bad',
        description: '封印崩溃。',
      }
    );
  return null;
}

export function checkEnding(state, ctx) {
  return checkEndingDataDriven(state, ctx) || checkEndingLegacy(state, ctx) || null;
}

// ═══════════════════════════════════════════════════════════
// §5.3: 结局余韵系统 (Afterglow)
// ═══════════════════════════════════════════════════════════

/**
 * Check if an ending's afterglow condition is met.
 * @param {object} ending - ending object with afterglow field
 * @param {object} state - game state
 * @returns {boolean}
 */
export function checkAfterglowUnlock(ending, state) {
  if (!ending || !ending.afterglow) return false;
  const cond = ending.afterglow.unlock_condition;
  if (!cond) return true;

  if (cond.startsWith('has_triggered_event:')) {
    const eventId = cond.split(':')[1];
    return (
      (state.everTriggeredEvents || []).includes(eventId) ||
      (state.triggeredEvents || []).includes(eventId)
    );
  }
  if (cond.startsWith('has_item:')) {
    const itemId = cond.split(':')[1];
    return (state.inventory || []).some((item) => item.id === itemId);
  }
  if (cond.startsWith('previous_ending_count:')) {
    const min = parseInt(cond.split(':')[1], 10);
    return (state.previousEndings || []).length >= min;
  }
  return false;
}

/**
 * Get unlocked afterglow texts for a specific ending.
 * @param {object} ending - ending object
 * @param {object} state - game state
 * @returns {string[]} unlocked texts (may be empty)
 */
export function getAfterglowTexts(ending, state) {
  if (!ending || !ending.afterglow) return [];
  if (!checkAfterglowUnlock(ending, state)) return [];
  return ending.afterglow.texts || [];
}

/**
 * Get all endings with their afterglow status for the "轮回记录" UI.
 * @param {object[]} allEndings - all ending objects
 * @param {object} state - game state
 * @returns {Array<{ending: object, achieved: boolean, afterglowUnlocked: boolean, afterglowTexts: string[]}>}
 */
export function getEndingRecord(allEndings, state) {
  const achieved = new Set(state.previousEndings || []);
  return (allEndings || []).map((ending) => ({
    ending,
    achieved: achieved.has(ending.id),
    afterglowUnlocked: achieved.has(ending.id) && checkAfterglowUnlock(ending, state),
    afterglowTexts: achieved.has(ending.id) ? getAfterglowTexts(ending, state) : [],
  }));
}
