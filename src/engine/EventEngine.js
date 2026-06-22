// src/engine/EventEngine.js — Pure event selection engine (canonical runtime source)
// ENGINE CONTRACT: Zero game-specific imports. Milestones injected via data.

/**
 * Check if a chapter milestone should fire for the given day.
 * @param {number} day
 * @param {object} state - game state
 * @param {object} [milestones] - CHAPTER_MILESTONES data (injected)
 * @returns {object|null} milestone or null
 */
export function checkChapterMilestone(day, state, milestones) {
  var ms = milestones || {};
  var milestone = ms[day];
  if (!milestone) return null;
  if ((state.triggeredEvents || []).includes(milestone.eventId)) return null;
  return milestone;
}

/**
 * Check forced narrative hooks against current state.
 * @param {object} state
 * @param {Array} [hooks] - FORCED_NARRATIVE_HOOKS data (injected)
 * @returns {object|null} hook or null
 */
export function checkForcedNarrativeHook(state, hooks) {
  var hookList = hooks || [];
  for (var i = 0; i < hookList.length; i++) {
    var hook = hookList[i];
    if (hook.condition(state)) return hook;
  }
  return null;
}

export function createMilestoneEvent(milestone) {
  return {
    id: milestone.eventId,
    name: milestone.name,
    description: milestone.text,
    type: 'milestone',
    event_classification: 'milestone',
    tier: 'signature',
    sanity_damage: milestone.sanCost,
    trigger: { areas: null },
    _isMilestone: true,
    _corruptionGain: milestone.corruptionGain,
  };
}

// =============================================
// SECTION 2: Behavioral Profiling Memory
// =============================================

export function recordActionHistory(state, actionType) {
  if (!state._actionHistory) state._actionHistory = [];
  state._actionHistory.push({ type: actionType, day: state.day || 1 });
  if (state._actionHistory.length > 20) state._actionHistory = state._actionHistory.slice(-20);
}

export function getPlayerBehaviorProfile(bt) {
  if (!bt)
    return {
      violent: 0,
      explorer: 0,
      social: 0,
      passive: 0,
      occultist: 0,
      investigator: 0,
      survivor: 0,
    };
  return {
    violent: Math.min(
      10,
      (bt.direct_kill_count || 0) * 2 +
        (bt.cannibalism_count || 0) * 3 +
        (bt.npc_deaths_by_manipulation || 0) * 2
    ),
    explorer: Math.min(
      10,
      (bt.harbor_visits || 0) +
        (bt.meta_boundary_breaks || 0) * 2 +
        Math.floor((bt.areas_explored || 0) / 2)
    ),
    social: Math.min(10, (bt.redeemed_npcs || 0) * 2 + (bt.cult_leader_score || 0)),
    passive: Math.min(10, (bt.low_intervention_count || 0) + (bt.sleep_streak || 0) * 2),
    occultist: Math.min(
      10,
      (bt.self_harm_ritual_count || 0) * 2 +
        (bt.fusion_accepted_count || 0) * 2 +
        (bt.possession_accepted_count || 0) * 3 +
        (bt.sacred_desecration_count || 0) * 2
    ),
    investigator: Math.min(10, Math.floor((bt.checks_passed || 0) / 2) + (bt.clue_finds || 0)),
    survivor: Math.min(10, (bt.days_best || 0) + (bt.low_san_days || 0)),
  };
}

export function getDominantArchetype(profile) {
  var max = 0,
    dominant = 'balanced';
  for (var key in profile) {
    if (profile[key] > max) {
      max = profile[key];
      dominant = key;
    }
  }
  return dominant;
}

export function getRecentActionTendencies(state) {
  var hist = (state._actionHistory || []).slice(-10);
  if (hist.length === 0)
    return { exploreRate: 0.3, talkRate: 0.2, moveRate: 0.2, restRate: 0.2, darkRate: 0.1 };
  var counts = { explore: 0, talk: 0, move: 0, rest: 0, dark: 0, total: hist.length };
  for (var i = 0; i < hist.length; i++) {
    var t = hist[i].type;
    if (t === 'EXPLORE' || t === 'DO_SKILL_CHECK') counts.explore++;
    else if (t === 'TALK_NPC' || t === 'NPC_RESPONSE') counts.talk++;
    else if (t === 'MOVE') counts.move++;
    else if (t === 'REST') counts.rest++;
    else if (
      ['SELF_HARM', 'SPREAD_PROPHECY', 'CONSUME_ARCHIVE', 'SELF_SACRIFICE', 'DESECRATE', 'ATTACK'].indexOf(t) >= 0
    )
      counts.dark++;
  }
  var n = counts.total;
  return {
    exploreRate: counts.explore / n,
    talkRate: counts.talk / n,
    moveRate: counts.move / n,
    restRate: counts.rest / n,
    darkRate: counts.dark / n,
  };
}

// =============================================
// SECTION 3: Freshness Decay (Layer 3 — Anti-repetition)
// =============================================

export var COOLDOWN_DECAY_TABLE = [
  { daysSince: 0, factor: 0.02 },
  { daysSince: 1, factor: 0.15 },
  { daysSince: 2, factor: 0.4 },
  { daysSince: 3, factor: 0.7 },
  { daysSince: 5, factor: 1.0 },
];

export function getCooldownDecayFactor(eventId, state) {
  var cooldowns = state.eventCooldowns;
  if (!cooldowns) return 1.0;
  var lastDay = cooldowns[eventId];
  if (lastDay == null) return 1.0;
  var daysSince = (state.day || 1) - lastDay;
  if (daysSince < 0) return 1.0;
  for (var i = COOLDOWN_DECAY_TABLE.length - 1; i >= 0; i--) {
    if (daysSince >= COOLDOWN_DECAY_TABLE[i].daysSince) return COOLDOWN_DECAY_TABLE[i].factor;
  }
  return 1.0;
}

export function recordEventCooldown(state, eventId) {
  if (!state.eventCooldowns) state.eventCooldowns = {};
  state.eventCooldowns[eventId] = state.day || 1;
  if (!state._recentEventIds) state._recentEventIds = [];
  state._recentEventIds.push(eventId);
  if (state._recentEventIds.length > 30) state._recentEventIds = state._recentEventIds.slice(-30);
}

// =============================================
// SECTION 4: Weight Multipliers (Layer 2 — Weighted)
// =============================================

export var ARCHETYPE_EVENT_BOOST = {
  violent: {
    boost: ['超自然遭遇', '怪物遭遇', 'meta'],
    penalty: ['正常事件', '氛围事件'],
    bf: 1.4,
    pf: 0.6,
  },
  explorer: { boost: ['area_deep', 'clue', 'mythos'], penalty: ['正常事件'], bf: 1.3, pf: 0.7 },
  social: { boost: ['npc_cross', 'humanity'], penalty: ['meta'], bf: 1.4, pf: 0.7 },
  passive: {
    boost: ['silent', '氛围事件', '正常事件'],
    penalty: ['超自然遭遇', '怪物遭遇'],
    bf: 1.5,
    pf: 0.5,
  },
  occultist: {
    boost: ['mythos', 'loop_locked', 'meta'],
    penalty: ['正常事件', 'NPC对话'],
    bf: 1.5,
    pf: 0.5,
  },
  investigator: {
    boost: ['clue', 'area_deep', 'investigation'],
    penalty: ['silent'],
    bf: 1.4,
    pf: 0.6,
  },
  survivor: { boost: ['resource', 'silent', '氛围事件'], penalty: ['怪物遭遇'], bf: 1.3, pf: 0.7 },
};

export function getBehaviorWeightMultiplier(evt, state) {
  var bt = state.behaviorTracking;
  if (!bt) return 1.0;
  var profile = getPlayerBehaviorProfile(bt);
  var archetype = getDominantArchetype(profile);
  if (archetype === 'balanced') return 1.0;
  var config = ARCHETYPE_EVENT_BOOST[archetype];
  if (!config) return 1.0;
  var type = evt.type || evt.event_classification || '';
  if (config.boost.indexOf(type) >= 0) return config.bf;
  if (config.penalty.indexOf(type) >= 0) return config.pf;
  return 1.0;
}

export function getFearProfileMultiplier(evt, state, fearTagsMap) {
  if (!state.fearTuning || !state.fearTuning.primary) return 1.0;
  var fearTags = fearTagsMap || {};
  var primary = state.fearTuning.primary;
  var fearTagList = fearTags[primary];
  if (!fearTagList) return 1.0;
  var evtTags = extractEventKeywords(evt, fearTags);
  var match = false;
  for (var i = 0; i < fearTagList.length; i++) {
    if (evtTags.indexOf(fearTagList[i]) >= 0) { match = true; break; }
  }
  if (match) return 1.3;
  if (state.fearTuning.secondary) {
    var secTags = fearTags[state.fearTuning.secondary];
    if (secTags) {
      for (var j = 0; j < secTags.length; j++) {
        if (evtTags.indexOf(secTags[j]) >= 0) return 1.15;
      }
    }
  }
  return 1.0;
}

function extractEventKeywords(evt, fearTags) {
  var keywords = [];
  var text = (evt.id + ' ' + (evt.description || '')).toLowerCase();
  for (var tag in fearTags) {
    var tagList = fearTags[tag];
    for (var k = 0; k < tagList.length; k++) {
      if (text.indexOf(tagList[k]) >= 0) keywords.push(tagList[k]);
    }
  }
  return keywords;
}

// =============================================
// SECTION 5: Buffer Enforcement (35-40% early game)
// =============================================

export var BUFFER_RATIO_TABLE = [
  { maxDay: 3, target: 0.4, tolerance: 0.08 },
  { maxDay: 7, target: 0.38, tolerance: 0.08 },
  { maxDay: 14, target: 0.3, tolerance: 0.1 },
  { maxDay: 21, target: 0.22, tolerance: 0.1 },
  { maxDay: 99, target: 0.15, tolerance: 0.1 },
];

export function getTodayEventMix(state) {
  var today = state.day || 1;
  var todayTypes = state._todayEventTypes || [];
  var buffer = 0,
    horror = 0;
  for (var i = 0; i < todayTypes.length; i++) {
    if (todayTypes[i].isBuffer) buffer++;
    else horror++;
  }
  var total = buffer + horror;
  return { buffer: buffer, horror: horror, total: total, ratio: total > 0 ? buffer / total : 0.5 };
}

export function getBufferTarget(day) {
  for (var i = 0; i < BUFFER_RATIO_TABLE.length; i++) {
    if (day <= BUFFER_RATIO_TABLE[i].maxDay) return BUFFER_RATIO_TABLE[i];
  }
  return BUFFER_RATIO_TABLE[BUFFER_RATIO_TABLE.length - 1];
}

export function applyBufferEnforcement(candidates, state) {
  var day = state.day || 1;
  var target = getBufferTarget(day);
  var mix = getTodayEventMix(state);
  if (mix.total < 2) return candidates;
  return candidates.map(function (item) {
    var evt = item.event || item;
    var w = typeof item.weight === 'number' ? item.weight : 1.0;
    var isBuffer = !!(evt.normalcy_anchor);
    if (mix.ratio < target.target - target.tolerance) {
      if (isBuffer) w *= 1.6;
      else w *= 0.7;
    } else if (mix.ratio > target.target + target.tolerance) {
      if (isBuffer) w *= 0.6;
      else w *= 1.3;
    }
    return { event: evt, weight: w };
  });
}

// =============================================
// SECTION 6: Distortion Variants
// =============================================

export function getDistortionVariant(evt, state, rng) {
  if (!evt || !evt.distortion_variants) return null;
  var v = evt.distortion_variants;
  var san = state.san || 60;
  var loop = state.loopCount || 0;
  var corr = state.safehouseCorruption || 0;
  var fear = state.fearTuning ? state.fearTuning.primary : null;
  var _rand = rng ? rng.next.bind(rng) : Math.random;

  if (fear && v['fear_' + fear] && _rand() < 0.45) return v['fear_' + fear];
  if (loop >= 8 && v.loop_8_plus && _rand() < 0.4) return v.loop_8_plus;
  if (loop >= 3 && v.loop_3_plus && _rand() < 0.3) return v.loop_3_plus;
  if (san <= 20 && v.san_low && _rand() < 0.5) return v.san_low;
  if (san <= 40 && v.san_mid && _rand() < 0.35) return v.san_mid;
  if (san <= 60 && v.san_high && _rand() < 0.15) return v.san_high;
  if (corr >= 50 && v.corruption_high && _rand() < 0.25) return v.corruption_high;
  return null;
}

// ── Distortion Template Injection ──────────────────────
// Shared distortion text for humanity events, keyed by subtype.
// Events without local distortion_variants get them injected from templates.
// Events with unique keys (corruption_high, san_mid) keep local variants.
//
// Call this from initExtendedEvents() after GD.events is fully assembled.

import { DISTORTION_TEMPLATE_MAP } from '../data/distortionTemplates.js';

export function injectDistortionTemplates(GD) {
  if (!GD || !GD.events) return;
  var events = GD.events;
  var injected = 0;

  for (var i = 0; i < events.length; i++) {
    var evt = events[i];
    if (!evt.subtype) continue;

    // Skip if event already has local distortion_variants (e.g. trial with san_mid)
    if (evt.distortion_variants && Object.keys(evt.distortion_variants).length > 0) continue;

    // Resolve template: explicit distortion_template field > subtype name
    var templateKey = evt.distortion_template || evt.subtype;
    var template = DISTORTION_TEMPLATE_MAP[templateKey];
    if (!template) continue;

    // Inject template variants as local distortion_variants
    evt.distortion_variants = Object.assign({}, template);
    injected++;
  }

  if (injected > 0) {
    console.log('[EventEngine] Injected distortion templates for ' + injected + ' events');
  }
}

// =============================================
// SECTION 7: First-week filter (legacy compat)
// =============================================

export function applyFirstWeekFilter(candidates, day) {
  if (day > 10 || !candidates || candidates.length === 0) return candidates;
  return candidates.map(function (item) {
    var evt = item.event || item;
    var w = 1.0;
    if (evt.trigger && (evt.trigger.chapter === 1 || evt.trigger.chapter <= 1)) w *= 1.5;
    var type = evt.type || evt.event_classification || '';
    if (['正常事件', 'NPC对话', '轻微异常'].indexOf(type) >= 0) w *= 1.3;
    if (type === 'silent' && day <= 3) w *= 0.5;
    if (evt.normalcy_anchor) w *= 1.2;
    return { event: evt, weight: w };
  });
}

// =============================================
// SECTION 8: Day-of-Cycle Weight Multiplier
// =============================================

export function getDayCycleWeightMultiplier(evt, state) {
  var day = state.day || 1;
  var cat = evt.type || evt.event_classification || '';
  var isHorror = ['超自然遭遇', '怪物遭遇', 'mythos', 'meta', 'loop_locked', '神秘事件', '氛围事件', 'silent'].indexOf(cat) >= 0;
  var isNormal = ['正常事件', 'NPC对话'].indexOf(cat) >= 0;
  // 微恐怖事件：关键日 ×1.5（比普通氛围事件的 1.4/1.6 更高）
  var isMicroHorror = cat === 'micro_horror';

  if (day === 7 || day === 14 || day === 21) {
    if (isMicroHorror) return 1.5;
    if (isHorror) return 1.4;
    if (isNormal) return 0.8;
    return 1.1;
  }
  if (day === 28) {
    if (isMicroHorror) return 1.5;
    if (isHorror) return 1.6;
    if (isNormal) return 0.7;
    return 1.0;
  }
  if (day === 5 || day === 15 || day === 20 || day === 25) {
    if (isMicroHorror) return 1.2;
    if (isHorror) return 1.2;
    if (isNormal) return 0.9;
    return 1.05;
  }
  if (day <= 3 && isHorror) return 0.85;
  return 1.0;
}

// =============================================
// SECTION 9: Time-of-Day Weight Multiplier
// =============================================

export function getTimeOfDayWeightMultiplier(evt, state) {
  var hour = state.hour;
  if (hour == null) return 1.0;

  var cat = evt.type || evt.event_classification || '';
  var isHorror = ['超自然遭遇', '怪物遭遇', 'mythos', 'meta', 'loop_locked', '神秘事件', 'silent'].indexOf(cat) >= 0;
  var isNormal = ['正常事件', 'NPC对话', '氛围事件'].indexOf(cat) >= 0;
  var isBuffer = !!(evt.normalcy_anchor);
  var isMidnight = hour >= 22 || hour <= 4;
  var isLateNight = (hour >= 20 && hour < 22) || (hour > 4 && hour <= 6);
  var isDaytime = hour >= 8 && hour < 18;

  if (isMidnight) {
    if (isHorror) return 1.4;
    if (isNormal || isBuffer) return 0.6;
    return 1.0;
  }
  if (isLateNight) {
    if (isHorror) return 1.2;
    if (isNormal) return 0.85;
    return 1.0;
  }
  if (isDaytime && isBuffer) return 1.15;
  return 1.0;
}
