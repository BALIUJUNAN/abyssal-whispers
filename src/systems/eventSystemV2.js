// src/systems/eventSystemV2.js - Three-layer event selection system
// Phase 4: Milestone events + behavior-weighted selection + cooldown decay

var CHAPTER_MILESTONES = {
  7: { eventId: 'evt_ch1_milestone', name: '第十四声钟响', sanCost: 3, corruptionGain: 5,
    text: '教堂的钟声响了。\n不是十三下。\n十四下。\n\n整个沃切斯特都安静了。连海浪都停了。' },
  14: { eventId: 'evt_ch2_milestone', name: '灯塔的光', sanCost: 5, corruptionGain: 8,
    text: '灯塔的光在午夜亮了。\n\n你知道灯塔已经废弃了三年。\n\n光扫过你的安全屋窗户时，你看到了窗玻璃上的倒影。\n不是你的倒影。\n是很多人的倒影。重叠在一起。' },
  21: { eventId: 'evt_ch3_milestone', name: '封印的呼吸', sanCost: 8, corruptionGain: 10,
    text: '封印发出了声音。\n\n不是裂开的声音。\n是呼吸的声音。\n\n整个沃切斯特都安静了。\n然后——第十五声钟响。' },
  28: { eventId: 'evt_final_day', name: '最后的早晨', sanCost: 0, corruptionGain: 0,
    text: '你醒来的时候，窗外的雾不再是白色的了。\n\n它是红色的。\n像血。\n\n时间到了。' },
};

function checkChapterMilestone(day, state) {
  var milestone = CHAPTER_MILESTONES[day];
  if (!milestone) return null;
  if ((state.triggeredEvents || []).includes(milestone.eventId)) return null;
  return milestone;
}

function createMilestoneEvent(milestone) {
  return { id: milestone.eventId, name: milestone.name, description: milestone.text,
    type: "milestone", event_classification: "milestone", tier: "signature",
    sanity_damage: milestone.sanCost, trigger: { areas: null },
    _isMilestone: true, _corruptionGain: milestone.corruptionGain };
}

function getPlayerBehaviorProfile(bt) {
  if (!bt) return { violent: 0, explorer: 0, social: 0, passive: 0, occultist: 0 };
  return {
    violent: Math.min(5, (bt.direct_kill_count||0) + (bt.cannibalism_count||0)*2 + (bt.npc_deaths_by_manipulation||0)),
    explorer: Math.min(5, (bt.meta_boundary_breaks||0) + (bt.harbor_visits||0)),
    social: Math.min(5, (bt.redeemed_npcs||0) + (bt.cult_leader_score||0)),
    passive: Math.min(5, (bt.low_intervention_count||0) + (bt.sleep_streak||0)),
    occultist: Math.min(5, (bt.self_harm_ritual_count||0) + (bt.fusion_accepted_count||0) + (bt.possession_accepted_count||0) + (bt.sacred_desecration_count||0))
  };
}

function getDominantArchetype(profile) {
  var max = 0, dominant = "balanced";
  for (var key in profile) { if (profile[key] > max) { max = profile[key]; dominant = key; } }
  return dominant;
}

var COOLDOWN_DECAY_TABLE = [
  { daysSince: 0, factor: 0.05 }, { daysSince: 1, factor: 0.25 },
  { daysSince: 2, factor: 0.55 }, { daysSince: 3, factor: 0.80 },
  { daysSince: 4, factor: 1.00 }
];

function getCooldownDecayFactor(eventId, state) {
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

var ARCHETYPE_EVENT_BOOST = {
  violent: { boost: ["超自然遭遇","怪物遭遇","meta"], penalty: ["正常事件","氛围事件"], bf: 1.4, pf: 0.6 },
  explorer: { boost: ["area_deep","clue","mythos"], penalty: ["正常事件"], bf: 1.3, pf: 0.7 },
  social: { boost: ["npc_cross","humanity"], penalty: ["meta"], bf: 1.4, pf: 0.7 },
  passive: { boost: ["silent","氛围事件","正常事件"], penalty: ["超自然遭遇","怪物遭遇"], bf: 1.5, pf: 0.5 },
  occultist: { boost: ["mythos","loop_locked","meta"], penalty: ["正常事件","NPC对话"], bf: 1.5, pf: 0.5 }
};

function getBehaviorWeightMultiplier(evt, state) {
  var bt = state.behaviorTracking;
  if (!bt) return 1.0;
  var profile = getPlayerBehaviorProfile(bt);
  var archetype = getDominantArchetype(profile);
  if (archetype === "balanced") return 1.0;
  var config = ARCHETYPE_EVENT_BOOST[archetype];
  if (!config) return 1.0;
  var type = evt.type || evt.event_classification || "";
  if (config.boost.indexOf(type) >= 0) return config.bf;
  if (config.penalty.indexOf(type) >= 0) return config.pf;
  return 1.0;
}

function getDistortionVariant(evt, state) {
  if (!evt || !evt.distortion_variants) return null;
  var v = evt.distortion_variants, san = state.san || 60, loop = state.loopCount || 0;
  if (loop >= 8 && v.loop_8_plus && Math.random() < 0.4) return v.loop_8_plus;
  if (loop >= 3 && v.loop_3_plus && Math.random() < 0.3) return v.loop_3_plus;
  if (san <= 20 && v.san_low && Math.random() < 0.5) return v.san_low;
  if (san <= 40 && v.san_mid && Math.random() < 0.3) return v.san_mid;
  if (san <= 60 && v.san_high && Math.random() < 0.15) return v.san_high;
  return null;
}

function applyFirstWeekFilter(candidates, day) {
  if (day > 10 || !candidates || candidates.length === 0) return candidates;
  return candidates.map(function(evt) {
    var w = 1.0;
    if (evt.trigger && (evt.trigger.chapter === 1 || evt.trigger.chapter <= 1)) w *= 1.5;
    var type = evt.type || evt.event_classification || "";
    if (["正常事件","NPC对话","轻微异常"].indexOf(type) >= 0) w *= 1.3;
    if (type === "silent" && day <= 3) w *= 0.5;
    if (evt.normalcy_anchor) w *= 1.2;
    return { event: evt, weight: w };
  });
}