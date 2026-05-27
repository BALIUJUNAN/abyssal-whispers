// src/reducers/extendedEvents.js - Extended event system for 800+ event pool
// Handles: trigger checking, event scheduling, budget control, cooldowns

import { getPhase } from './worldReducer.js';
import { clamp } from './utils.js';
import { shouldTriggerMissing600, createMissing600Event, MISSING_600_EVENT_ID } from '../data/events_missing_600.js';
import { checkOmens } from '../data/events_omens_600.js';

// =============================================
// SECTION 1: Extended Trigger Checking
// =============================================

/**
 * Extended trigger check. Supports all original fields plus new ones:
 * min_loop, max_loop, humanity_min/max, min_mythos, san_lte/gte,
 * hp_lte_ratio, food_lte, light_lte, safehouse_corruption_gte,
 * requires_last_death_type, requires_prev_area_death,
 * npc_trust_gte, npc_alive, npc_dead,
 * previous_endings, min_previous_endings_count,
 * once_per_run, once_ever, cooldown_days, max_per_day_category
 */
export function checkTriggerExtended(evt, state, ctx) {
  const t = evt.trigger;
  if (!t) return true;

  // --- Original checks (compatible with existing events) ---
  if (t.areas && t.areas.length > 0 && !t.areas.includes(state.currentArea)) return false;

  if (t.time_phase && t.time_phase.length > 0) {
    const phase = getPhase(state.ap, state.maxAp);
    if (!t.time_phase.includes(phase)) return false;
  }

  if (t.chapter && state.day <= 7 && t.chapter > 1) return false;

  if (t.requires && t.requires.length > 0) {
    for (const req of t.requires) {
      if (req.startsWith('san_below_')) {
        const threshold = parseInt(req.replace('san_below_', ''));
        if (state.san >= threshold) return false;
      } else if (req.startsWith('san_above_')) {
        const threshold = parseInt(req.replace('san_above_', ''));
        if (state.san < threshold) return false;
      } else if (!state.clues.includes(req) && !state.triggeredEvents.includes(req)) {
        return false;
      }
    }
  }

  if (t.forbidden_flags && t.forbidden_flags.length > 0) {
    for (const ff of t.forbidden_flags) {
      if (state.clues.includes(ff) || state.triggeredEvents.includes(ff)) return false;
    }
  }

  // --- New extended checks ---

  // Loop count bounds
  const loop = state.loopCount || 0;
  if (t.min_loop != null && loop < t.min_loop) return false;
  if (t.max_loop != null && loop > t.max_loop) return false;

  // Humanity bounds
  const humanity = state.humanityScore ?? 50;
  if (t.humanity_min != null && humanity < t.humanity_min) return false;
  if (t.humanity_max != null && humanity > t.humanity_max) return false;

  // Mythos minimum
  if (t.min_mythos != null && (state.mythosLevel || 0) < t.min_mythos) return false;

  // SAN bounds
  if (t.san_lte != null && state.san > t.san_lte) return false;
  if (t.san_gte != null && state.san < t.san_gte) return false;

  // HP ratio
  if (t.hp_lte_ratio != null) {
    const hpRatio = state.hp / (state.maxHp || 1);
    if (hpRatio > t.hp_lte_ratio) return false;
  }

  // Resource thresholds
  if (t.food_lte != null && (state.food || 0) > t.food_lte) return false;
  if (t.light_lte != null && (state.lightLevel || 0) > t.light_lte) return false;
  if (t.safehouse_corruption_gte != null && (state.safehouseCorruption || 0) < t.safehouse_corruption_gte) return false;

  // Death type requirement
  if (t.requires_last_death_type && state.lastDeathType !== t.requires_last_death_type) return false;

  // Death mode requirement (hp / san / hybrid)
  if (t.requires_last_death_mode) {
    const mode = state.lastDeathMode || (state.lastDeathType === 'physical' ? 'hp' : state.lastDeathType === 'mental' ? 'san' : null);
    if (mode !== t.requires_last_death_mode) return false;
  }

  // Previous area death
  if (t.requires_prev_area_death) {
    const prevDeaths = state.previousDeathsByArea || {};
    if (!prevDeaths[t.requires_prev_area_death]) return false;
  }

  // Required events (superset of original requires)
  if (t.requires_prev_event && t.requires_prev_event.length > 0) {
    for (const req of t.requires_prev_event) {
      if (!state.triggeredEvents.includes(req)) return false;
    }
  }

  // Required clues (explicit)
  if (t.requires_clues && t.requires_clues.length > 0) {
    for (const clue of t.requires_clues) {
      if (!state.clues.includes(clue)) return false;
    }
  }

  // Required items
  if (t.requires_items && t.requires_items.length > 0) {
    for (const item of t.requires_items) {
      if (!state.inventory.some(i => i.id === item || i.name === item)) return false;
    }
  }

  // Required flags (explicit)
  if (t.requires_flags && t.requires_flags.length > 0) {
    for (const flag of t.requires_flags) {
      if (!state.triggeredEvents.includes(flag) && !state.clues.includes(flag)) return false;
    }
  }

  // NPC trust requirements
  if (t.npc_trust_gte) {
    for (const [npcId, minTrust] of Object.entries(t.npc_trust_gte)) {
      if ((state.npcTrust[npcId] || 0) < minTrust) return false;
    }
  }

  // NPC alive/dead requirements
  if (t.npc_alive && t.npc_alive.length > 0) {
    for (const npcId of t.npc_alive) {
      if (state.npcStates[npcId]?.dead) return false;
    }
  }
  if (t.npc_dead && t.npc_dead.length > 0) {
    for (const npcId of t.npc_dead) {
      if (!state.npcStates[npcId]?.dead) return false;
    }
  }

  // Previous endings requirements
  if (t.previous_endings && t.previous_endings.length > 0) {
    const prevEndings = state.previousEndings || [];
    const hasEnding = t.previous_endings.some(e => prevEndings.includes(e));
    if (!hasEnding) return false;
  }
  if (t.min_previous_endings_count != null) {
    const prevEndings = state.previousEndings || [];
    if (prevEndings.length < t.min_previous_endings_count) return false;
  }

  // Weather requirement
  if (t.requires_weather && t.requires_weather.length > 0) {
    if (!t.requires_weather.includes(state.weather)) return false;
  }

  // Seal state requirement
  if (t.requires_seal_state && t.requires_seal_state.length > 0) {
    if (!t.requires_seal_state.includes(state.sealState)) return false;
  }

  // Once-per-run check
  if (t.once_per_run) {
    const runTriggered = state.runTriggeredExtendedEvents || [];
    if (runTriggered.includes(evt.id)) return false;
  }

  // Once-ever check
  if (t.once_ever) {
    const everTriggered = state.everTriggeredEvents || [];
    if (everTriggered.includes(evt.id)) return false;
  }

  // Cooldown days
  if (t.cooldown_days && t.cooldown_days > 0) {
    const cooldowns = state.eventCooldowns || {};
    const lastTriggered = cooldowns[evt.id];
    if (lastTriggered != null && (state.day - lastTriggered) < t.cooldown_days) return false;
  }

  // Category daily budget
  if (t.max_per_day_category) {
    const catCounts = state.categoryCountsToday || {};
    const cat = evt.type || 'unknown';
    if ((catCounts[cat] || 0) >= t.max_per_day_category) return false;
  }

  // Probability (final check)
  if (t.probability != null && t.probability < 1) {
    if (Math.random() > t.probability) return false;
  }

  return true;
}

// =============================================
// SECTION 2: Event Scheduler (selectEventV2)
// =============================================

// Category budget configuration
const EVENT_BUDGET = {
  loop_locked:          { maxPerDay: 2, minPerRun: 10, weight: 1.2 },
  humanity:             { maxPerDay: 2, minPerRun: 6,  weight: 1.0 },
  mythos:               { maxPerDay: 2, minPerRun: 6,  weight: 1.0 },
  resource_pressure:    { maxPerDay: 1, minPerRun: 5,  weight: 0.8 },
  npc_cross:            { maxPerDay: 1, minPerRun: 4,  weight: 0.7 },
  area_deep:            { maxPerDay: 2, minPerRun: 12, weight: 1.1 },
  ending_omen:          { maxPerDay: 1, minPerRun: 0,  weight: 0.6 },
  ending_aftermath:     { maxPerDay: 1, minPerRun: 0,  weight: 0.5 },
  silent:               { maxPerDay: 3, minPerRun: 0,  weight: 0.9, isAnchor: true },
  meta:                 { maxPerRun: 2,                 weight: 0.3 },
};

// Types considered "abnormal" for streak tracking
const ABNORMAL_TYPES = new Set([
  'loop_locked', 'mythos', 'resource_pressure', 'meta',
  // Also count original horror types
  '超自然遭遇', '怪物遭遇', '神秘事件'
]);

// Types that serve as anchors (break abnormal streaks)
const ANCHOR_TYPES = new Set([
  'silent', '正常事件', 'NPC互动', '氛围事件', '轻微异常'
]);

/**
 * Select an event using the V2 scheduler with budget and streak control.
 * @param {string} areaId - current area
 * @param {object} state - game state
 * @param {object} ctx - context with GD
 * @param {function} pick - random picker from array
 * @returns {object|null} selected event
 */
export function selectEventV2(areaId, state, ctx, pick) {
  const { GD } = ctx;
  const allEvents = GD.events || [];
  const areas = GD.areas || [];
  const area = areas.find(a => a.id === areaId);
  const loop = state.loopCount || 0;

  // Initialize tracking fields if missing
  if (!state.categoryCountsToday) state.categoryCountsToday = {};
  if (!state.categoryCountsRun) state.categoryCountsRun = {};
  if (!state.abnormalStreak) state.abnormalStreak = 0;
  if (!state.eventCooldowns) state.eventCooldowns = {};

  // Step 0: Omen check — light foreshadowing before event 600
  const omen = checkOmens(state);
  if (omen) {
    trackEvent(omen, state);
    return omen;
  }

  // Step 1: Virtual 600th event check (before all normal filtering)
  // shouldTriggerMissing600 guards on length===599 internally.
  const extendedEvents = GD._extendedEvents
    || (allEvents.length > (GD._deathEchoCount || 0)
      ? allEvents.slice(0, allEvents.length - (GD._deathEchoCount || 0))
      : allEvents);
  if (shouldTriggerMissing600(state, extendedEvents) && Math.random() < 0.35) {
    // Don't set missing_event_600_seen here — it's set by the player's choice effects
    const missing = createMissing600Event(state);
    trackEvent(missing, state);
    return missing;
  }

  // Step 2: Force anchor if abnormal streak >= 3
  if (state.abnormalStreak >= 3) {
    const anchorEvents = allEvents.filter(e => {
      const isAnchor = ANCHOR_TYPES.has(e.type) || e.normalcy_anchor;
      return isAnchor && checkTriggerExtended(e, state, ctx);
    });
    if (anchorEvents.length > 0) {
      const selected = pick(anchorEvents);
      trackEvent(selected, state);
      return selected;
    }
  }

  // Step 3: Get all eligible events for this area
  const eligible = allEvents.filter(e => {
    if (!e.trigger || !e.trigger.areas) return false;
    if (!e.trigger.areas.includes(areaId)) return false;
    return checkTriggerExtended(e, state, ctx);
  });

  if (eligible.length === 0) return null;

  // Step 4: Apply budget filtering
  const budgetFiltered = eligible.filter(e => {
    const cat = e.type || 'unknown';
    const budget = EVENT_BUDGET[cat];
    if (!budget) return true; // Unknown types pass through

    // Daily budget check
    if (budget.maxPerDay != null) {
      const todayCount = state.categoryCountsToday[cat] || 0;
      if (todayCount >= budget.maxPerDay) return false;
    }

    // Run budget for meta events (hard cap)
    if (cat === 'meta') {
      const runCount = state.categoryCountsRun['meta'] || 0;
      if (runCount >= (budget.maxPerRun || 2)) return false;
    }

    return true;
  });

  if (budgetFiltered.length === 0) {
    // Fallback: try original selectEvent logic
    return null;
  }

  // Step 5: Weight calculation
  const weighted = [];
  budgetFiltered.forEach(e => {
    const cat = e.type || 'unknown';
    const budget = EVENT_BUDGET[cat] || {};
    let weight = e.weight || budget.weight || 1.0;

    // Light level penalty
    const lightDiff = (area?.resource_pressure?.required_light_level || 0) - (state.lightLevel || 0);
    const lightPenalty = lightDiff > 0 ? Math.max(0.2, 1 - lightDiff * 0.3) : 1;
    weight *= lightPenalty;

    // Loop scaling: events closer to their min_loop get slightly higher weight
    if (e.trigger?.min_loop && loop >= e.trigger.min_loop) {
      const overshoot = loop - e.trigger.min_loop;
      weight *= Math.max(0.5, 1 - overshoot * 0.05);
    }

    // Resource pressure boost when resources are actually low
    if (cat === 'resource_pressure') {
      const isLowFood = (state.food || 0) <= 2;
      const isLowLight = (state.lightLevel || 0) <= 1;
      const isLowHP = state.hp / (state.maxHp || 1) <= 0.3;
      if (isLowFood || isLowLight || isLowHP) weight *= 1.5;
      else weight *= 0.3; // Reduce when resources are fine
    }

    // Ending omen boost when close to ending conditions
    if (cat === 'ending_omen') {
      const endings = GD.endings || [];
      const closeToEnding = endings.some(ed => {
        if (!ed.conditions) return false;
        const met = ed.conditions.filter(c => checkEndingConditionQuick(state, c)).length;
        return met / ed.conditions.length >= 0.6;
      });
      if (closeToEnding) weight *= 2.0;
      else weight *= 0.2;
    }

    // Tier multiplier
    if (e.tier === 'rare') weight *= 0.7;
    else if (e.tier === 'signature') weight *= 0.5;
    else if (e.tier === 'meta') weight *= 0.3;
    else if (e.tier === 'ending') weight *= 0.8;

    // Untriggered bonus
    if (!state.triggeredEvents.includes(e.id)) weight *= 1.5;

    // Push weighted copies
    const count = Math.max(1, Math.round(weight * 10));
    for (let i = 0; i < count; i++) weighted.push(e);
  });

  if (weighted.length === 0) return null;

  const selected = pick(weighted);
  trackEvent(selected, state);
  return selected;
}

/**
 * Track event execution for budget/streak management
 */
function trackEvent(evt, state) {
  const cat = evt.type || 'unknown';

  // Update category counts
  state.categoryCountsToday[cat] = (state.categoryCountsToday[cat] || 0) + 1;
  state.categoryCountsRun[cat] = (state.categoryCountsRun[cat] || 0) + 1;

  // Update abnormal streak
  if (ABNORMAL_TYPES.has(cat)) {
    state.abnormalStreak = (state.abnormalStreak || 0) + 1;
  } else {
    state.abnormalStreak = 0;
  }

  // Set cooldown
  if (evt.trigger?.cooldown_days && evt.trigger.cooldown_days > 0) {
    state.eventCooldowns[evt.id] = state.day;
  }

  // Track once-per-run
  if (evt.trigger?.once_per_run) {
    if (!state.runTriggeredExtendedEvents) state.runTriggeredExtendedEvents = [];
    state.runTriggeredExtendedEvents.push(evt.id);
  }

  // Track once-ever
  if (evt.trigger?.once_ever) {
    if (!state.everTriggeredEvents) state.everTriggeredEvents = [];
    if (!state.everTriggeredEvents.includes(evt.id)) {
      state.everTriggeredEvents.push(evt.id);
    }
  }
}

/**
 * Quick ending condition check (simplified, for weight calculation only)
 */
function checkEndingConditionQuick(state, cond) {
  switch (cond.type) {
    case 'san_below': return state.san < cond.value;
    case 'san_above': return state.san > cond.value;
    case 'san_lte': return state.san <= cond.value;
    case 'hp_below': return state.hp < cond.value;
    case 'hp_lte': return state.hp <= cond.value;
    case 'day_gte': return state.day >= cond.value;
    case 'in_area': return state.currentArea === cond.area_id;
    case 'has_item': return state.inventory.some(i => i.id === cond.item_id || i.name === cond.item_id);
    case 'has_clue': return state.clues.includes(cond.clue_id);
    case 'has_flag': return state.triggeredEvents.includes(cond.flag_id);
    case 'npc_trust_gte': return (state.npcTrust[cond.npc_id] || 0) >= cond.value;
    default: return false;
  }
}

/**
 * Reset daily category counts (call at start of new day / after REST)
 */
export function resetDailyCategoryCounts(state) {
  state.categoryCountsToday = {};
}

/**
 * Apply new effect types not covered by existing effectReducer
 * Returns true if handled, false if should fall through to existing system
 */
export function applyExtendedEffect(state, eff) {
  switch (eff.type) {
    case 'modify_humanity': {
      const amount = eff.amount || 0;
      state.humanityScore = clamp((state.humanityScore || 50) + amount, 0, 100);
      return true;
    }
    case 'modify_mythos': {
      state.mythosLevel = (state.mythosLevel || 0) + (eff.amount || 0);
      return true;
    }
    case 'modify_safehouse_corruption': {
      state.safehouseCorruption = Math.max(0, (state.safehouseCorruption || 0) + (eff.amount || 0));
      return true;
    }
    case 'add_run_memory': {
      if (!state.runMemory) state.runMemory = [];
      state.runMemory.push({
        day: state.day,
        type: eff.memory_type || 'extended',
        text: '第 ' + state.day + ' 天：' + (eff.text || '')
      });
      if (state.runMemory.length > 12) state.runMemory = state.runMemory.slice(-12);
      return true;
    }
    case 'unlock_area': {
      if (!state.unlockedAreas) state.unlockedAreas = [];
      if (!state.unlockedAreas.includes(eff.area_id)) state.unlockedAreas.push(eff.area_id);
      return true;
    }
    case 'unlock_ending_condition': {
      if (!state.unlockedEndingConditions) state.unlockedEndingConditions = [];
      if (!state.unlockedEndingConditions.includes(eff.condition_id)) {
        state.unlockedEndingConditions.push(eff.condition_id);
      }
      return true;
    }
    case 'trigger_followup_event': {
      if (!state.pendingFollowupEvents) state.pendingFollowupEvents = [];
      state.pendingFollowupEvents.push(eff.event_id);
      return true;
    }
    case 'set_last_death_hint': {
      state.lastDeathHint = eff.hint || '';
      return true;
    }
    case 'add_previous_ending_echo': {
      if (!state.endingEchoes) state.endingEchoes = [];
      state.endingEchoes.push(eff.ending_id);
      return true;
    }
    case 'set_flag': {
      // Alias for add_flag with extended tracking
      if (!state.triggeredEvents.includes(eff.flag_id)) {
        state.triggeredEvents.push(eff.flag_id);
      }
      if (!state.everTriggeredEvents) state.everTriggeredEvents = [];
      if (!state.everTriggeredEvents.includes(eff.flag_id)) {
        state.everTriggeredEvents.push(eff.flag_id);
      }
      return true;
    }
    default:
      return false; // Not handled, fall through
  }
}

/**
 * Build previous run summary for loop memory system.
 * Called during NEW_GAME before resetting state.
 */
export function buildPreviousRunSummary(state) {
  const deathType = state.hp <= 0 ? 'physical' : state.san <= 0 ? 'mental' : state.day > 28 ? 'time' : 'unknown';
  const highTrustNpcs = Object.entries(state.npcTrust || {})
    .filter(([, v]) => v >= 3)
    .map(([name]) => name);

  return {
    ending: state.ending?.id || state.ending?.name || null,
    endingType: state.ending?.type || null,
    deathType,
    deathArea: state.currentArea || null,
    day: state.day || 1,
    humanity: state.humanityScore || 50,
    mythos: state.mythosLevel || 0,
    highTrustNpcs,
    triggeredKeyEvents: (state.triggeredEvents || []).filter(id =>
      id.startsWith('evt_ch4_') || id.startsWith('evt_ch5_') || id.startsWith('ending_')
    ),
    cluesFound: (state.clues || []).length,
    areasVisited: [...(state.visitedAreas || [])],
    npcStates: JSON.parse(JSON.stringify(state.npcStates || {})),
    loop: state.loopCount || 0,
  };
}
