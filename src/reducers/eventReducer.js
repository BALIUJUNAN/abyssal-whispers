// src/reducers/eventReducer.js - Event selection, skill checks, triggers

import { d100, makeRand } from './utils.js';
import { getPhase } from '../engine/WorldTimeSystem.js';
import { checkTriggerExtended, selectEventV2 } from './extendedEvents.js';
import { hasClueId } from '../utils/clueNameMap.js';
import { hasTriggered } from '../utils/triggeredSet.js';
import { isChapterUnlocked } from './chapterReducer.js';
import { getNpcStateByRef, getNpcTrustByRef } from '../utils/npcStateAccess.js';

export function checkTrigger(evt, state) {
  const t = evt.trigger;
  if (!t) return true;
  if (t.areas && t.areas.length > 0 && !t.areas.includes(state.currentArea)) return false;
  if (t.time_phase && t.time_phase.length > 0) {
    const phase = getPhase(state.ap, state.maxAp);
    if (!t.time_phase.includes(phase)) return false;
  }
  if (!isChapterUnlocked(t.chapter, state.day)) return false;

  // ── 资源条件（food_lte / money_lte / starvation_day_gte）──
  if (t.food_lte !== undefined && (state.food || 0) > t.food_lte) return false;
  if (t.money_lte !== undefined && (state.money || 0) > t.money_lte) return false;
  if (t.starvation_day_gte !== undefined && (state.starvationDays || 0) < t.starvation_day_gte) return false;

  // ── NPC 条件（npc_alive / npc_trust_gte）──
  if (t.npc_alive && t.npc_alive.length > 0) {
    for (const npcName of t.npc_alive) {
      if (getNpcStateByRef(state, npcName).dead) return false;
    }
  }
  if (t.npc_dead && t.npc_dead.length > 0) {
    for (const npcName of t.npc_dead) {
      if (!getNpcStateByRef(state, npcName).dead) return false;
    }
  }
  if (t.npc_trust_gte) {
    for (const [npcName, minTrust] of Object.entries(t.npc_trust_gte)) {
      if (getNpcTrustByRef(state, npcName) < minTrust) return false;
    }
  }

  // ── 旗帜条件（requires_flags）──
  if (t.requires_flags && t.requires_flags.length > 0) {
    for (const flag of t.requires_flags) {
      if (!hasTriggered(state, flag)) return false;
    }
  }

  if (t.requires && t.requires.length > 0) {
    for (const req of t.requires) {
      if (req.startsWith('san_below_')) {
        const threshold = parseInt(req.replace('san_below_', ''));
        if (state.san >= threshold) return false;
      } else if (req.startsWith('san_above_')) {
        const threshold = parseInt(req.replace('san_above_', ''));
        if (state.san < threshold) return false;
      } else if (!hasClueId(state.clues, req) && !hasTriggered(state, req)) {
        return false;
      }
    }
  }
  if (t.forbidden_flags && t.forbidden_flags.length > 0) {
    for (const ff of t.forbidden_flags) {
      if (hasClueId(state.clues, ff) || hasTriggered(state, ff)) return false;
    }
  }
  return true;
}

// Re-export extended trigger check for use by other modules

/** @deprecated Use selectEventV2() instead. Retained as fallback when GD._extendedEventsLoaded is false. */
export function selectEvent(areaId, state, ctx, pick, rng) {
  const { GD } = ctx;
  const allEvents = GD.events || [];
  const areas = GD.areas || [];
  const area = areas.find((a) => a.id === areaId);
  const pool = area?.events_pool;

  let areaEvents;
  if (pool && pool.length > 0) {
    // Prioritize area's curated event pool
    areaEvents = pool
      .map((id) => allEvents.find((e) => e.id === id))
      .filter((e) => e && checkTrigger(e, state));
  } else {
    areaEvents = allEvents.filter((e) => {
      if (!e.trigger || !e.trigger.areas) return false;
      return e.trigger.areas.includes(areaId) && checkTrigger(e, state);
    });
  }

  if (areaEvents.length === 0) return null;

  // Light level penalty: insufficient light increases danger
  const lightDiff = (area?.resource_pressure?.required_light_level || 0) - (state.lightLevel || 0);
  const lightPenalty = lightDiff > 0 ? Math.max(0.2, 1 - lightDiff * 0.3) : 1;

  // Horror density control: per-area abnormal event cap
  const abnormalTypes = ['超自然遭遇', '怪物遭遇', '神秘事件'];
  const hdc = GD.world?.horror_density_control?.per_area?.[areaId];
  const abnormalCap = hdc?.abnormal_ratio_max || 1;

  // Vertical slice event distribution: adjust weights by chapter pacing
  const vs = GD.vertical_slice?.event_distribution;
  const isChapter1 = (state.day || 1) <= 7;
  const normalRatio = isChapter1 && vs ? (parseFloat(vs.normal_ratio) || 40) / 100 : 0;

  const weighted = [];
  areaEvents.forEach((e) => {
    const evtType = e.event_classification || e.type;
    const isAbnormal = abnormalTypes.includes(evtType);
    const isNormal = ['正常事件', 'NPC对话', '轻微异常'].includes(evtType);
    let prob = e.trigger?.probability || 0.5;
    if (isAbnormal && abnormalCap < 1) prob *= abnormalCap;
    // Chapter 1: boost normal events to maintain 40% ratio
    if (isChapter1 && isNormal && normalRatio > 0) prob *= 1.5;
    // Chapter 1: reduce horror events to maintain 5% cap
    if (isChapter1 && (evtType === '超自然遭遇' || evtType === '怪物遭遇')) prob *= 0.5;
    const count = Math.max(1, Math.round(prob * 10 * lightPenalty));
    for (let i = 0; i < count; i++) weighted.push(e);
  });
  const untriggered = weighted.filter((e) => !hasTriggered(state, e.id));
  const _rand = makeRand(rng);
  const selected = untriggered.length > 0 && _rand() < 0.6 ? untriggered : weighted;
  return pick(selected, rng);
}

export function doSkillCheck(skillName, threshold, state, difficulty, ctx, rng) {
  const { GD } = ctx;
  const tempBonus =
    state.tempSkillBonus && state.tempSkillBonus.skill === skillName
      ? state.tempSkillBonus.bonus
      : 0;
  // Starvation penalty: Day2=-5, Day3+=-10
  const starvePenalty = state.starvationDays >= 3 ? -10 : state.starvationDays === 2 ? -5 : 0;
  // Madness penalties: specific skill penalty + global check penalty
  const madnessSkillPenalty = (state._madnessSkillPenalty && state._madnessSkillPenalty.skill === skillName)
    ? state._madnessSkillPenalty.penalty : 0;
  const madnessGlobalPenalty = state._madnessGlobalCheckPenalty || 0;
  const playerSkill = (state.skills[skillName] || 0) + tempBonus + starvePenalty + madnessSkillPenalty + madnessGlobalPenalty;
  const roll = d100(rng);
  const dl = GD.core_loop?.difficulty_levels?.[difficulty] || {};
  const diffBonus = dl.skill_check_bonus || 0;
  const effectiveThreshold = Math.max(1, threshold + diffBonus);
  const isCritFail = roll >= 96;
  const success = roll <= playerSkill && roll <= effectiveThreshold && !isCritFail;
  return { roll, playerSkill, threshold: effectiveThreshold, success, isCritFail, skillName };
}

// SAN赌博机制：返回可用赌博选项
export function getGambleOptions(evt, state, ctx, rng) {
  const { GD } = ctx;
  const gamble = GD.systems?.sanity?.sanity_gamble;
  if (!gamble || !gamble.enabled) return null;
  // Only trigger on events with SAN damage
  if (!evt.sanity_damage || evt.sanity_damage === 0) return null;
  var _rand = makeRand(rng);
  if (_rand() >= (gamble.trigger_probability || 0.25)) return null;
  return gamble.options || [];
}

export function processNormalAnchorEvent(evt, state) {
  if (!evt.normalcy_anchor) return { sanGain: 0, text: '' };
  let sanGain = 0;
  let text = '';
  if (evt.id === 'evt_ch1_martha_polish') {
    sanGain = 1;
    text = '与玛莎闲聊让你暂时忘记了恐惧。SAN +1';
  } else if (evt.id === 'evt_ch1_church_organ') {
    sanGain = 1;
    text = '风琴声让你的心绪平静了下来。SAN +1';
  } else if (evt.id === 'evt_ch1_fisher_mending') {
    text = '老费舍的建议让你对码头的夜晚有所准备。当晚码头事件风险降低。';
  } else if (evt.id === 'evt_ch1_tommy_photo') {
    text = '汤米的照片提供了侦查线索。侦查检定临时+2。';
  } else if (evt.id === 'evt_ch1_cat_stare') {
    text = '那只猫让你紧绷的神经放松了一些。疲劳 -1。';
  } else {
    sanGain = 0;
  }
  return { sanGain, text };
}
