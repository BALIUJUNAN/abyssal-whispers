// src/systems/eventSystemV2.js - Enhanced three-layer event selection system
// Milestone events + behavior-weighted selection + freshness decay + buffer enforcement
// + distortion variants + behavioral profiling memory

// =============================================
// SECTION 1: Chapter Milestones (Layer 1 — Forced)
// =============================================

export var CHAPTER_MILESTONES = {
  3: {
    eventId: 'evt_day3_first_contact',
    name: '第一次接触',
    sanCost: 2,
    corruptionGain: 3,
    text: '你醒来的时候，笔记本上多了一行字。\n不是你的笔迹。\n\n"第三天。你还在看。"\n\n你检查了门锁。锁是从里面开的。',
  },
  7: {
    eventId: 'evt_ch1_milestone',
    name: '第十四声钟响',
    sanCost: 3,
    corruptionGain: 5,
    text: '教堂的钟声响了。\n不是十三下。\n十四下。\n\n整个沃切斯特都安静了。连海浪都停了。',
  },
  10: {
    eventId: 'evt_day10_threshold',
    name: '雾中的轮廓',
    sanCost: 4,
    corruptionGain: 6,
    text: '第十天的雾比以往任何时候都浓。\n\n你在雾中看到了人影。不是一个人——是很多人。\n他们站在那里，面朝你的方向。\n\n你数了一下。\n正好是你在沃切斯特见过的人数。',
  },
  14: {
    eventId: 'evt_ch2_milestone',
    name: '灯塔的光',
    sanCost: 5,
    corruptionGain: 8,
    text: '灯塔的光在午夜亮了。\n\n你知道灯塔已经废弃了三年。\n\n光扫过你的安全屋窗户时，你看到了窗玻璃上的倒影。\n不是你的倒影。\n是很多人的倒影。重叠在一起。',
  },
  21: {
    eventId: 'evt_ch3_milestone',
    name: '封印的呼吸',
    sanCost: 8,
    corruptionGain: 10,
    text: '封印发出了声音。\n\n不是裂开的声音。\n是呼吸的声音。\n\n整个沃切斯特都安静了。\n然后——第十五声钟响。',
  },
  28: {
    eventId: 'evt_final_day',
    name: '最后的早晨',
    sanCost: 0,
    corruptionGain: 0,
    text: '你醒来的时候，窗外的雾不再是白色的了。\n\n它是红色的。\n像血。\n\n时间到了。',
  },
};

// Additional forced narrative hooks for specific progression states
export var FORCED_NARRATIVE_HOOKS = [
  {
    id: 'hook_first_clue',
    condition: function (s) {
      return (s.clues || []).length === 1 && !s.triggeredEvents.includes('hook_first_clue');
    },
    text: '你把第一条线索写在笔记本上。墨水干得很慢——比平时慢。仿佛纸在抗拒被记录。',
    sanCost: 0,
  },
  {
    id: 'hook_first_npc_trust3',
    condition: function (s) {
      return (
        Object.values(s.npcTrust || {}).some(function (t) {
          return t >= 3;
        }) && !s.triggeredEvents.includes('hook_first_npc_trust3')
      );
    },
    text: '有人开始信任你了。你不确定这是好事还是坏事。在沃切斯特，信任是一种负担。',
    sanCost: 0,
  },
  {
    id: 'hook_3_areas',
    condition: function (s) {
      return (s.visitedAreas || []).length >= 3 && !s.triggeredEvents.includes('hook_3_areas');
    },
    text: '你已经走过了三个区域。你开始在脑中画地图。但每次你画完，第二天都会多出一条你没见过的路。',
    sanCost: 0,
  },
  {
    id: 'hook_san_40',
    condition: function (s) {
      return s.san <= 40 && s.san > 30 && !s.triggeredEvents.includes('hook_san_40');
    },
    text: '你的手在发抖。不是因为冷。是因为你开始看到一些不应该在那里的东西。',
    sanCost: 0,
  },
  {
    id: 'hook_san_20',
    condition: function (s) {
      return s.san <= 20 && !s.triggeredEvents.includes('hook_san_20');
    },
    text: '你听到了自己的心跳。不——那不是心跳。是敲门声。从你的胸腔里面传出来的。',
    sanCost: 1,
  },
];

export function checkChapterMilestone(day, state) {
  var milestone = CHAPTER_MILESTONES[day];
  if (!milestone) return null;
  if ((state.triggeredEvents || []).includes(milestone.eventId)) return null;
  return milestone;
}

export function checkForcedNarrativeHook(state) {
  for (var i = 0; i < FORCED_NARRATIVE_HOOKS.length; i++) {
    var hook = FORCED_NARRATIVE_HOOKS[i];
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

/**
 * Track player's recent action history and build a rolling behavior profile.
 * Called once per action dispatch (in gameReducer pre-processing).
 * Stores last 20 actions in state._actionHistory.
 */
export function recordActionHistory(state, actionType) {
  if (!state._actionHistory) state._actionHistory = [];
  state._actionHistory.push({ type: actionType, day: state.day || 1 });
  if (state._actionHistory.length > 20) state._actionHistory = state._actionHistory.slice(-20);
}

/**
 * Compute granular behavior scores from action history + behaviorTracking.
 * Returns scores 0-10 for each dimension.
 */
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
    investigator: Math.min(10, Math.floor((bt.checks_passed || 0) / 2) + (bt.clue_finds || 0 || 0)),
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

/**
 * Compute recent action tendencies from _actionHistory (last 10 actions).
 * Returns { exploreRate, talkRate, moveRate, restRate, darkRate }.
 */
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
      [
        'SELF_HARM',
        'SPREAD_PROPHECY',
        'CONSUME_ARCHIVE',
        'SELF_SACRIFICE',
        'DESECRATE',
        'BREAK_SEAL',
        'ATTACK',
      ].indexOf(t) >= 0
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

/**
 * Track which events were seen recently to reduce repeat probability.
 * Called from commitSelectedEvent.
 */
export function recordEventCooldown(state, eventId) {
  if (!state.eventCooldowns) state.eventCooldowns = {};
  state.eventCooldowns[eventId] = state.day || 1;
  // Also track in _recentEventIds for quick lookup
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

/**
 * fearProfile weight: events matching player's fear tags get boosted.
 */
export function getFearProfileMultiplier(evt, state) {
  if (!state.fearTuning || !state.fearTuning.primary) return 1.0;
  var ftm = _getFearTags();
  var fearTags = ftm[state.fearTuning.primary];
  if (!fearTags) return 1.0;
  var evtTags = extractEventKeywords(evt);
  var match = false;
  for (var i = 0; i < fearTags.length; i++) {
    if (evtTags.indexOf(fearTags[i]) >= 0) {
      match = true;
      break;
    }
  }
  if (match) return 1.3;
  // Secondary fear
  if (state.fearTuning.secondary) {
    var secTags = ftm[state.fearTuning.secondary];
    if (secTags) {
      for (var j = 0; j < secTags.length; j++) {
        if (evtTags.indexOf(secTags[j]) >= 0) return 1.15;
      }
    }
  }
  return 1.0;
}

/**
 * SAN-scaled weight: lower SAN boosts horror, higher SAN boosts buffer.
 * SSOT: thresholds aligned with 6 san_stages from game_base.json.
 *   stable [75,100] / mild [55,74] / perception [40,54] / explanation [25,39] / reality [10,24] / narrative [1,9]
 */
export function getSanWeightMultiplier(evt, state) {
  var san = state.san || 60;
  var isBuffer = evt.normalcy_anchor || false;

  // Use stage-based event_weight if available (SSOT from game_base.json san_stages)
  // getSanStage is defined in sanReducer.js; use typeof guard for bundle ordering
  if (typeof getSanStage === 'function') {
    try {
      var stage = getSanStage(san, { GD: typeof GD !== 'undefined' ? GD : {} });
      if (stage && stage.event_weight) {
        var ew = stage.event_weight;
        return isBuffer ? (ew.buffer_boost || 1.0) : (ew.horror_penalty || 1.0);
      }
    } catch (e) { /* fallback to hardcoded */ }
  }

  // Fallback: hardcoded stage multipliers
  if (isBuffer) {
    if (san <= 9) return 0.4; // narrative_death
    if (san <= 24) return 0.6; // reality_dissolution
    if (san <= 39) return 0.7; // explanation_loss
    if (san <= 54) return 0.8; // perception_shift
    if (san >= 75) return 1.3; // stable
    return 1.0; // mild_erosion
  } else {
    if (san <= 9) return 1.8; // narrative_death
    if (san <= 24) return 1.3; // reality_dissolution
    if (san <= 39) return 1.3; // explanation_loss
    if (san <= 54) return 1.15; // perception_shift
    if (san >= 75) return 0.8; // stable
    return 1.0; // mild_erosion
  }
}

/**
 * Area corruption multiplier: corrupted areas boost horror events.
 */
export function getAreaCorruptionMultiplier(evt, state) {
  var corr = state.safehouseCorruption || 0;
  var isBuffer = evt.normalcy_anchor || false;
  if (corr >= 60 && !isBuffer) return 1.3;
  if (corr >= 40 && !isBuffer) return 1.15;
  if (corr < 20 && isBuffer) return 1.2;
  return 1.0;
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

/**
 * Count buffer vs horror events triggered today.
 */
export function getTodayEventMix(state) {
  var today = state.day || 1;
  var triggered = state.triggeredEvents || [];
  var buffer = 0,
    horror = 0;
  // Check _todayEventTypes if available
  var todayTypes = state._todayEventTypes || [];
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

/**
 * Adjust candidate weights to enforce buffer ratio.
 * If buffer ratio is below target, boost buffer events. If above, boost horror.
 */
export function applyBufferEnforcement(candidates, state) {
  var day = state.day || 1;
  var target = getBufferTarget(day);
  var mix = getTodayEventMix(state);
  if (mix.total < 2) return candidates; // Not enough data yet

  return candidates.map(function (item) {
    var evt = item.event || item;
    var w = typeof item.weight === 'number' ? item.weight : 1.0;
    var isBuffer = evt.normalcy_anchor || false;
    if (mix.ratio < target.target - target.tolerance) {
      // Too few buffer events — boost buffer, reduce horror
      if (isBuffer) w *= 1.6;
      else w *= 0.7;
    } else if (mix.ratio > target.target + target.tolerance) {
      // Too many buffer events — boost horror, reduce buffer
      if (isBuffer) w *= 0.6;
      else w *= 1.3;
    }
    return { event: evt, weight: w };
  });
}

// =============================================
// SECTION 6: Distortion Variants
// =============================================

/**
 * Select the appropriate distortion variant text based on state.
 * Checks: loop count, SAN level, fearProfile, area corruption.
 * Returns variant text string or null (use original description).
 */
export function getDistortionVariant(evt, state) {
  if (!evt || !evt.distortion_variants) return null;
  var v = evt.distortion_variants;
  var san = state.san || 60;
  var loop = state.loopCount || 0;
  var corr = state.safehouseCorruption || 0;
  var fear = state.fearTuning ? state.fearTuning.primary : null;

  // Priority: fearProfile-specific > loop > san_low > san_mid > corruption
  if (fear && v['fear_' + fear] && Math.random() < 0.45) return v['fear_' + fear];
  if (loop >= 8 && v.loop_8_plus && Math.random() < 0.4) return v.loop_8_plus;
  if (loop >= 3 && v.loop_3_plus && Math.random() < 0.3) return v.loop_3_plus;
  if (san <= 20 && v.san_low && Math.random() < 0.5) return v.san_low;
  if (san <= 40 && v.san_mid && Math.random() < 0.35) return v.san_mid;
  if (san <= 60 && v.san_high && Math.random() < 0.15) return v.san_high;
  if (corr >= 50 && v.corruption_high && Math.random() < 0.25) return v.corruption_high;
  return null;
}

// =============================================
// SECTION 7: First-week filter (legacy compat)
// =============================================

export function applyFirstWeekFilter(candidates, day) {
  if (day > 10 || !candidates || candidates.length === 0) return candidates;
  return candidates.map(function (evt) {
    var w = 1.0;
    if (evt.trigger && (evt.trigger.chapter === 1 || evt.trigger.chapter <= 1)) w *= 1.5;
    var type = evt.type || evt.event_classification || '';
    if (['正常事件', 'NPC对话', '轻微异常'].indexOf(type) >= 0) w *= 1.3;
    if (type === 'silent' && day <= 3) w *= 0.5;
    if (evt.normalcy_anchor) w *= 1.2;
    return { event: evt, weight: w };
  });
}

// SECTION 8: Combined Weight Pipeline — REMOVED (dead code)
// computeEventWeight and enhanceEventCandidates were never called.
// The active weight system is getEventWeight() in extendedEvents.js.

// Fear tag map: fallback defined inline to avoid var hoisting issues with fearLens.js.
// The real FEAR_TAG_MAP from fearLens.js takes precedence at runtime via global scope.
export function _getFearTags() {
  if (typeof window !== 'undefined' && window.FEAR_TAG_MAP) return window.FEAR_TAG_MAP;
  return {
    ocean: [
      'harbor_district',
      'lighthouse',
      'water',
      'drowning',
      'tide',
      'salt',
      'sea',
      'harbor_deep',
    ],
    body: ['fusion', 'wound', 'vessel', 'infection', 'flesh', 'mirror', 'possession'],
    control: ['meta', 'save', 'system', 'clock', 'map', 'locked_door', 'bell', 'thirteenth'],
    isolation: ['npc_missing', 'betrayal', 'empty_room', 'safehouse', 'alone', 'silent'],
    knowledge: ['mythos', 'book', 'forbidden', 'library', 'truth', 'clue', 'archive'],
    morality: ['humanity', 'food_choice', 'sacrifice', 'children', 'npc_help', 'redemption'],
  };
}
