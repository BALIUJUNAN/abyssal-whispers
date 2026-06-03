// src/reducers/extendedEvents.js - Extended event system for 800+ event pool
// Handles: trigger checking, event scheduling, budget control, cooldowns
//
// P0-1: Event scheduling refactored into pure/commit split:
//   getEligibleEvents  — read-only candidate filtering
//   chooseWeightedEvent — read-only weighted random selection
//   commitSelectedEvent — writes cooldown/count/tracking state (only for final pick)
// P0-2: trigger.probability moved from checkTriggerExtended hard filter to weight modifier

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
      } else if (!hasClueId(state.clues, req) && !state.triggeredEvents.includes(req)) {
        return false;
      }
    }
  }

  if (t.forbidden_flags && t.forbidden_flags.length > 0) {
    for (const ff of t.forbidden_flags) {
      if (hasClueId(state.clues, ff) || state.triggeredEvents.includes(ff)) return false;
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
      if (!hasClueId(state.clues, clue)) return false;
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
      if (!state.triggeredEvents.includes(flag) && !hasClueId(state.clues, flag)) return false;
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

  // §3.4: Max meta events per run (heavy meta gate)
  if (t.max_meta_per_run) {
    const runTriggered = state.runTriggeredExtendedEvents || [];
    const metaThisRun = runTriggered.filter(id => id.startsWith('meta_'));
    if (metaThisRun.length >= t.max_meta_per_run) return false;
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

  // P0-2: Probability check REMOVED from trigger filtering.
  // trigger.probability is now a weight modifier applied in getEventWeight().
  // This makes checkTriggerExtended deterministic for a given (event, state) pair,
  // enabling stable candidate pools for fearTuning, caching, and debug replay.

  return true;
}

// =============================================
// SECTION 2: Event Scheduler (pure/commit split)
// =============================================
//
// P0-1 Architecture:
//   getEligibleEvents(areaId, state, ctx)       → read-only candidate array
//   getEventWeight(event, areaId, state, ctx)    → read-only weight number
//   chooseWeightedEvent(candidates, areaId, state, ctx, pick) → read-only event pick
//   commitSelectedEvent(evt, state)              → writes cooldown/count/tracking
//   selectEventV2(areaId, state, ctx, pick)      → legacy wrapper, calls all three
//
// The fearTuning loop in app.jsx should call getEligibleEvents + chooseWeightedEvent
// for candidate peeking, then call commitSelectedEvent only on the final pick.

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
 * PURE: Get all eligible events for the current area and state.
 * Does NOT modify state. Safe to call multiple times for candidate peeking.
 *
 * P0-1: This is the read-only candidate filter.
 * P0-2: trigger.probability is no longer a hard filter here.
 *
 * @param {string} areaId
 * @param {object} state
 * @param {object} ctx
 * @returns {object[]} eligible events (may be empty)
 */
export function getEligibleEvents(areaId, state, ctx) {
  const { GD } = ctx;
  const allEvents = GD.events || [];

  // Step 1: Area + trigger check (deterministic — no Math.random)
  const eligible = allEvents.filter(e => {
    if (!e.trigger || !e.trigger.areas) return false;
    if (!e.trigger.areas.includes(areaId)) return false;
    return checkTriggerExtended(e, state, ctx);
  });

  if (eligible.length === 0) return [];

  // Step 2: Budget filtering (read-only against state)
  return eligible.filter(e => {
    const cat = e.type || 'unknown';
    const budget = EVENT_BUDGET[cat];
    if (!budget) return true;

    if (budget.maxPerDay != null) {
      const todayCount = (state.categoryCountsToday || {})[cat] || 0;
      if (todayCount >= budget.maxPerDay) return false;
    }

    if (cat === 'meta') {
      const runCount = (state.categoryCountsRun || {})['meta'] || 0;
      if (runCount >= (budget.maxPerRun || 2)) return false;
    }

    return true;
  });
}

/**
 * PURE: Calculate the selection weight for a single event.
 * Incorporates trigger.probability as a weight multiplier (P0-2).
 *
 * @param {object} evt - event object
 * @param {string} areaId - current area
 * @param {object} state - game state
 * @param {object} ctx - context with GD
 * @returns {number} weight >= 0
 */
export function getEventWeight(evt, areaId, state, ctx) {
  const { GD } = ctx;
  const cat = evt.type || 'unknown';
  const budget = EVENT_BUDGET[cat] || {};
  const areas = GD.areas || [];
  const area = areas.find(a => a.id === areaId);
  const loop = state.loopCount || 0;

  let weight = evt.weight || budget.weight || 1.0;

  // P0-2: trigger.probability as weight modifier (was hard filter, now soft)
  if (evt.trigger?.probability != null && evt.trigger.probability < 1) {
    weight *= evt.trigger.probability;
  }

  // Light level penalty
  const lightDiff = (area?.resource_pressure?.required_light_level || 0) - (state.lightLevel || 0);
  const lightPenalty = lightDiff > 0 ? Math.max(0.2, 1 - lightDiff * 0.3) : 1;
  weight *= lightPenalty;

  // Loop scaling
  if (evt.trigger?.min_loop && loop >= evt.trigger.min_loop) {
    const overshoot = loop - evt.trigger.min_loop;
    weight *= Math.max(0.5, 1 - overshoot * 0.05);
  }

  // Resource pressure boost
  if (cat === 'resource_pressure') {
    const isLowFood = (state.food || 0) <= 2;
    const isLowLight = (state.lightLevel || 0) <= 1;
    const isLowHP = state.hp / (state.maxHp || 1) <= 0.3;
    if (isLowFood || isLowLight || isLowHP) weight *= 1.5;
    else weight *= 0.3;
  }

  // Ending omen boost
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
  if (evt.tier === 'rare') weight *= 0.7;
  else if (evt.tier === 'signature') weight *= 0.5;
  else if (evt.tier === 'meta') weight *= 0.3;
  else if (evt.tier === 'ending') weight *= 0.8;

  // Untriggered bonus
  if (!(state.triggeredEvents || []).includes(evt.id)) weight *= 1.5;

  // Phase 4: Cooldown decay — recently triggered events have reduced weight
  // getCooldownDecayFactor is defined in eventSystemV2.js (bundled before this file)
  if (typeof getCooldownDecayFactor === 'function') {
    weight *= getCooldownDecayFactor(evt.id, state);
  }

  // Phase 4: Behavior profile weight — player archetype affects event selection
  // getBehaviorWeightMultiplier is defined in eventSystemV2.js
  if (typeof getBehaviorWeightMultiplier === 'function') {
    weight *= getBehaviorWeightMultiplier(evt, state);
  }

  // Phase 5: fearProfile alignment — events matching player's fear get boosted
  if (typeof getFearProfileMultiplier === 'function') {
    weight *= getFearProfileMultiplier(evt, state);
  }

  // Phase 5: SAN-scaled weight — lower SAN boosts horror, higher SAN boosts buffer
  if (typeof getSanWeightMultiplier === 'function') {
    weight *= getSanWeightMultiplier(evt, state);
  }

  // Phase 5: Area corruption multiplier
  if (typeof getAreaCorruptionMultiplier === 'function') {
    weight *= getAreaCorruptionMultiplier(evt, state);
  }

  // Phase 6: Resource-bound weight modifier (light/infection/fatigue/food)
  if (typeof getResourceEventWeightModifier === 'function') {
    weight *= getResourceEventWeightModifier(evt, state);
  }

  return Math.max(0, weight);
}

/**
 * PURE: Choose a weighted-random event from candidates.
 * Does NOT modify state. Safe for fearTuning peek loops.
 *
 * Phase 1 optimization: Pre-computed cumulative weights + binary search.
 *   Old: O(n·w) — built array of w*10 references per event, then pick()
 *   New: O(n) build + O(log n) pick via cumulative sum + binary search
 *
 * @param {object[]} candidates - pre-filtered eligible events
 * @param {string} areaId
 * @param {object} state
 * @param {object} ctx
 * @param {function} pick - random picker (unused in optimized path, kept for API compat)
 * @returns {object|null} selected event
 */
export function chooseWeightedEvent(candidates, areaId, state, ctx, pick) {
  if (!candidates || candidates.length === 0) return null;
  const n = candidates.length;

  // Edge case: single candidate
  if (n === 1) return candidates[0];

  // Build cumulative weight array — O(n)
  // Phase 5: Apply buffer enforcement to adjust weights
  const cumWeights = new Float64Array(n);
  let total = 0;
  for (let i = 0; i < n; i++) {
    let w = getEventWeight(candidates[i], areaId, state, ctx);
    // Buffer enforcement: if today's event mix is off-target, adjust weight
    if (typeof applyBufferEnforcement === 'function') {
      const adjusted = applyBufferEnforcement([{ event: candidates[i], weight: w }], state);
      if (adjusted.length > 0) w = adjusted[0].weight;
    }
    total += Math.max(0, w);
    cumWeights[i] = total;
  }

  if (total <= 0) return null;

  // Roll and binary search — O(log n)
  const roll = Math.random() * total;
  let lo = 0, hi = n - 1;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (cumWeights[mid] < roll) lo = mid + 1;
    else hi = mid;
  }
  return candidates[lo];
}

/**
 * COMMIT: Record event execution for budget/streak/cooldown management.
 * Call this ONLY when an event is actually triggered (not for candidate peeking).
 *
 * P0-1: Extracted from old trackEvent. Only called after final event selection.
 *
 * @param {object} evt - the triggered event
 * @param {object} state - game state (will be mutated)
 */
export function commitSelectedEvent(evt, state) {
  const cat = evt.type || 'unknown';

  // Update category counts
  if (!state.categoryCountsToday) state.categoryCountsToday = {};
  if (!state.categoryCountsRun) state.categoryCountsRun = {};
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
    if (!state.eventCooldowns) state.eventCooldowns = {};
    state.eventCooldowns[evt.id] = state.day;
  }

  // Phase 5: Record freshness cooldown for all events (not just those with cooldown_days)
  if (typeof recordEventCooldown === 'function') {
    recordEventCooldown(state, evt.id);
  }

  // Phase 5: Track today's event mix for buffer enforcement
  if (!state._todayEventTypes) state._todayEventTypes = [];
  state._todayEventTypes.push({ id: evt.id, isBuffer: !!evt.normalcy_anchor, type: evt.type || '' });

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
 * COMPOSITE: Full event selection pipeline (legacy-compatible wrapper).
 * Calls getEligibleEvents → chooseWeightedEvent → commitSelectedEvent.
 *
 * @param {string} areaId
 * @param {object} state
 * @param {object} ctx
 * @param {function} pick
 * @returns {object|null} selected event (state is mutated via commitSelectedEvent)
 */
export function selectEventV2(areaId, state, ctx, pick) {
  const { GD } = ctx;
  const allEvents = GD.events || [];

  // Ensure tracking fields exist
  if (!state.categoryCountsToday) state.categoryCountsToday = {};
  if (!state.categoryCountsRun) state.categoryCountsRun = {};
  if (!state.abnormalStreak) state.abnormalStreak = 0;
  if (!state.eventCooldowns) state.eventCooldowns = {};

  // Step 0: Omen check — light foreshadowing before event 600
  const omen = checkOmens(state);
  if (omen) {
    commitSelectedEvent(omen, state);
    return omen;
  }

  // Step 1: Virtual 600th event check (before all normal filtering)
  const extendedEvents = GD._extendedEvents
    || (allEvents.length > (GD._deathEchoCount || 0)
      ? allEvents.slice(0, allEvents.length - (GD._deathEchoCount || 0))
      : allEvents);
  if (shouldTriggerMissing600(state, extendedEvents) && Math.random() < 0.35) {
    const missing = createMissing600Event(state);
    commitSelectedEvent(missing, state);
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
      commitSelectedEvent(selected, state);
      return selected;
    }
  }

  // Step 3: Pure eligible + weighted selection
  const candidates = getEligibleEvents(areaId, state, ctx);
  if (candidates.length === 0) return null;

  const selected = chooseWeightedEvent(candidates, areaId, state, ctx, pick);
  if (!selected) return null;

  commitSelectedEvent(selected, state);
  return selected;
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
    case 'has_clue': return hasClueId(state.clues, cond.clue_id);
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
      state.humanityScore = clamp((state.humanityScore ?? 50) + amount, 0, 100);
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
    humanity: state.humanityScore ?? 50,
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
