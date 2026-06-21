// src/engine/EventEngine.ts — Pure event selection engine (TypeScript)
// ENGINE CONTRACT: Zero game-specific imports. Milestones injected via data.

// ── Minimal type definitions ──
// These represent the subset of game state used by this module.

// Global game data interface (injected via window.__GAME_DATA__)
interface GameDataGlobal {
  _milestones?: Record<string, Milestone>;
  _hooks?: NarrativeHook[];
  [key: string]: unknown;
}

declare global {
  // Extend Window to include GD injected at runtime
  // eslint-disable-next-line no-var
  var GD: GameDataGlobal | undefined;
}

/** Behavior tracking counters (partial — only fields used here) */
interface BehaviorTracking {
  direct_kill_count: number;
  cannibalism_count: number;
  npc_deaths_by_manipulation: number;
  redeemed_npcs: number;
  cult_leader_score: number;
  self_harm_ritual_count: number;
  fusion_accepted_count: number;
  possession_accepted_count: number;
  sacred_desecration_count: number;
  harbor_visits: number;
  meta_boundary_breaks: number;
  sleep_streak: number;
  low_intervention_count: number;
  days_best: number;
  work_count: number;
  hoarded_money_max: number;
  hoarded_food_max: number;
  archive_consumed_count: number;
  prophecy_spread_count: number;
  thirteenth_bell_obsession: number;
  clue_finds: number;
  [key: string]: number | undefined;
}

/** Partial game state — only fields accessed by EventEngine */
interface GameState {
  day: number;
  san: number;
  loopCount: number;
  safehouseCorruption: number;
  fearTuning: { primary: string; secondary?: string } | null;
  triggeredEvents: string[];
  eventCooldowns: Record<string, number>;
  _actionHistory: Array<{ type: string; day: number }>;
  _todayEventTypes: Array<{ isBuffer: boolean }>;
  _recentEventIds: string[];
  behaviorTracking: BehaviorTracking;
  hour?: number;
  [key: string]: unknown;
}

/** Event object — minimal shape used by weight functions */
interface GameEvent {
  id: string;
  type: string;
  event_classification: string;
  normalcy_anchor?: boolean;
  distortion_variants?: Record<string, string>;
  [key: string]: unknown;
}

/** Weighted event candidate */
interface WeightedCandidate {
  event: GameEvent;
  weight: number;
}

/** Milestone data (injected via GD._milestones) */
interface Milestone {
  eventId: string;
  name: string;
  text: string;
  sanCost: number;
  corruptionGain: number;
  [key: string]: unknown;
}

/** Forced narrative hook */
interface NarrativeHook {
  condition: (state: GameState) => boolean;
  [key: string]: unknown;
}

/** Archetype boost/penalty config */
interface ArchetypeConfig {
  boost: string[];
  penalty: string[];
  bf: number;
  pf: number;
}

// =============================================
// SECTION 1: Milestones & Forced Hooks
// =============================================

export function checkChapterMilestone(day: number, state: GameState, milestones?: Record<string, Milestone>): Milestone | null {
  const ms = milestones || GD?._milestones || {};
  const milestone = ms[day];
  if (!milestone) return null;
  if ((state.triggeredEvents || []).includes(milestone.eventId)) return null;
  return milestone;
}

export function checkForcedNarrativeHook(state: GameState, hooks?: NarrativeHook[]): NarrativeHook | null {
  const hookList = hooks || GD?._hooks || [];
  for (let i = 0; i < hookList.length; i++) {
    const hook = hookList[i];
    if (hook.condition(state)) return hook;
  }
  return null;
}

export function createMilestoneEvent(milestone: Milestone): GameEvent {
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

export function recordActionHistory(state: GameState, actionType: string): void {
  if (!state._actionHistory) (state as unknown as { _actionHistory: Array<{ type: string; day: number }> })._actionHistory = [];
  state._actionHistory.push({ type: actionType, day: state.day || 1 });
  if (state._actionHistory.length > 20) state._actionHistory = state._actionHistory.slice(-20);
}

export interface BehaviorProfile {
  violent: number;
  explorer: number;
  social: number;
  passive: number;
  occultist: number;
  investigator: number;
  survivor: number;
}

export function getPlayerBehaviorProfile(bt: BehaviorTracking | undefined): BehaviorProfile {
  if (!bt) {
    return { violent: 0, explorer: 0, social: 0, passive: 0, occultist: 0, investigator: 0, survivor: 0 };
  }
  return {
    violent: Math.min(10, (bt.direct_kill_count || 0) * 2 + (bt.cannibalism_count || 0) * 3 + (bt.npc_deaths_by_manipulation || 0) * 2),
    explorer: Math.min(10, (bt.harbor_visits || 0) + (bt.meta_boundary_breaks || 0) * 2 + Math.floor((bt.areas_explored || 0) / 2)),
    social: Math.min(10, (bt.redeemed_npcs || 0) * 2 + (bt.cult_leader_score || 0)),
    passive: Math.min(10, (bt.low_intervention_count || 0) + (bt.sleep_streak || 0) * 2),
    occultist: Math.min(10, (bt.self_harm_ritual_count || 0) * 2 + (bt.fusion_accepted_count || 0) * 2 + (bt.possession_accepted_count || 0) * 3 + (bt.sacred_desecration_count || 0) * 2),
    investigator: Math.min(10, Math.floor((bt.checks_passed || 0) / 2) + (bt.clue_finds || 0)),
    survivor: Math.min(10, (bt.days_best || 0) + (bt.low_san_days || 0)),
  };
}

export function getDominantArchetype(profile: BehaviorProfile): string {
  let max = 0;
  let dominant = 'balanced';
  // Use Object.entries to iterate known keys, avoiding Record<string, number> cast
  const entries: [string, number][] = [
    ['violent', profile.violent],
    ['explorer', profile.explorer],
    ['social', profile.social],
    ['passive', profile.passive],
    ['occultist', profile.occultist],
    ['investigator', profile.investigator],
    ['survivor', profile.survivor],
  ];
  for (const [key, val] of entries) {
    if (val > max) {
      max = val;
      dominant = key;
    }
  }
  return dominant;
}

export interface ActionTendencies {
  exploreRate: number;
  talkRate: number;
  moveRate: number;
  restRate: number;
  darkRate: number;
}

export function getRecentActionTendencies(state: GameState): ActionTendencies {
  const hist = (state._actionHistory || []).slice(-10);
  if (hist.length === 0)
    return { exploreRate: 0.3, talkRate: 0.2, moveRate: 0.2, restRate: 0.2, darkRate: 0.1 };
  const counts: Record<string, number> = { explore: 0, talk: 0, move: 0, rest: 0, dark: 0, total: hist.length };
  for (let i = 0; i < hist.length; i++) {
    const t = hist[i].type;
    if (t === 'EXPLORE' || t === 'DO_SKILL_CHECK') counts.explore++;
    else if (t === 'TALK_NPC' || t === 'NPC_RESPONSE') counts.talk++;
    else if (t === 'MOVE') counts.move++;
    else if (t === 'REST') counts.rest++;
    else if (['SELF_HARM', 'SPREAD_PROPHECY', 'CONSUME_ARCHIVE', 'SELF_SACRIFICE', 'DESECRATE', 'ATTACK'].indexOf(t) >= 0) counts.dark++;
  }
  const n = counts.total;
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

export const COOLDOWN_DECAY_TABLE: { daysSince: number; factor: number }[] = [
  { daysSince: 0, factor: 0.02 },
  { daysSince: 1, factor: 0.15 },
  { daysSince: 2, factor: 0.4 },
  { daysSince: 3, factor: 0.7 },
  { daysSince: 5, factor: 1.0 },
];

export function getCooldownDecayFactor(eventId: string, state: GameState): number {
  const cooldowns = state.eventCooldowns;
  if (!cooldowns) return 1.0;
  const lastDay = cooldowns[eventId];
  if (lastDay == null) return 1.0;
  const daysSince = (state.day || 1) - lastDay;
  if (daysSince < 0) return 1.0;
  for (let i = COOLDOWN_DECAY_TABLE.length - 1; i >= 0; i--) {
    if (daysSince >= COOLDOWN_DECAY_TABLE[i].daysSince) return COOLDOWN_DECAY_TABLE[i].factor;
  }
  return 1.0;
}

export function recordEventCooldown(state: GameState, eventId: string): void {
  if (!state.eventCooldowns) (state as unknown as { eventCooldowns: Record<string, number> }).eventCooldowns = {};
  state.eventCooldowns[eventId] = state.day || 1;
  if (!state._recentEventIds) (state as unknown as { _recentEventIds: string[] })._recentEventIds = [];
  state._recentEventIds.push(eventId);
  if (state._recentEventIds.length > 30) state._recentEventIds = state._recentEventIds.slice(-30);
}

// =============================================
// SECTION 4: Weight Multipliers (Layer 2 — Weighted)
// =============================================

export const ARCHETYPE_EVENT_BOOST: Record<string, ArchetypeConfig> = {
  violent: { boost: ['超自然遭遇', '怪物遭遇', 'meta'], penalty: ['正常事件', '氛围事件'], bf: 1.4, pf: 0.6 },
  explorer: { boost: ['area_deep', 'clue', 'mythos'], penalty: ['正常事件'], bf: 1.3, pf: 0.7 },
  social: { boost: ['npc_cross', 'humanity'], penalty: ['meta'], bf: 1.4, pf: 0.7 },
  passive: { boost: ['silent', '氛围事件', '正常事件'], penalty: ['超自然遭遇', '怪物遭遇'], bf: 1.5, pf: 0.5 },
  occultist: { boost: ['mythos', 'loop_locked', 'meta'], penalty: ['正常事件', 'NPC对话'], bf: 1.5, pf: 0.5 },
  investigator: { boost: ['clue', 'area_deep', 'investigation'], penalty: ['silent'], bf: 1.4, pf: 0.6 },
  survivor: { boost: ['resource', 'silent', '氛围事件'], penalty: ['怪物遭遇'], bf: 1.3, pf: 0.7 },
};

export function getBehaviorWeightMultiplier(evt: GameEvent, state: GameState): number {
  const bt = state.behaviorTracking;
  if (!bt) return 1.0;
  const profile = getPlayerBehaviorProfile(bt);
  const archetype = getDominantArchetype(profile);
  if (archetype === 'balanced') return 1.0;
  const config = ARCHETYPE_EVENT_BOOST[archetype];
  if (!config) return 1.0;
  const type = evt.type || evt.event_classification || '';
  if (config.boost.indexOf(type) >= 0) return config.bf;
  if (config.penalty.indexOf(type) >= 0) return config.pf;
  return 1.0;
}

const DEFAULT_FEAR_TAGS: Record<string, string[]> = {
  ocean: ['harbor_district', 'lighthouse', 'water', 'drowning', 'tide', 'salt', 'sea', 'harbor_deep'],
  body: ['fusion', 'wound', 'vessel', 'infection', 'flesh', 'mirror', 'possession'],
  control: ['meta', 'save', 'system', 'clock', 'map', 'locked_door', 'bell', 'thirteenth'],
  isolation: ['npc_missing', 'betrayal', 'empty_room', 'safehouse', 'alone', 'silent'],
  knowledge: ['mythos', 'book', 'forbidden', 'library', 'truth', 'clue', 'archive'],
  morality: ['humanity', 'food_choice', 'sacrifice', 'children', 'npc_help', 'redemption'],
};

function _getFearTags(): Record<string, string[]> {
  if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).FEAR_TAG_MAP) {
    return (window as unknown as Record<string, Record<string, string[]>>).FEAR_TAG_MAP as Record<string, string[]>;
  }
  return DEFAULT_FEAR_TAGS;
}

function extractEventKeywords(evt: GameEvent): string[] {
  const keywords: string[] = [];
  const text = (evt.id + ' ' + (evt.description || '')).toLowerCase();
  const tags = _getFearTags();
  for (const tag in tags) {
    for (const kw of tags[tag]) {
      if (text.indexOf(kw) >= 0) keywords.push(kw);
    }
  }
  return keywords;
}

export function getFearProfileMultiplier(evt: GameEvent, state: GameState): number {
  if (!state.fearTuning || !state.fearTuning.primary) return 1.0;
  const ftm = _getFearTags();
  const fearTags = ftm[state.fearTuning.primary];
  if (!fearTags) return 1.0;
  const evtTags = extractEventKeywords(evt);
  let match = false;
  for (let i = 0; i < fearTags.length; i++) {
    if (evtTags.indexOf(fearTags[i]) >= 0) { match = true; break; }
  }
  if (match) return 1.3;
  if (state.fearTuning.secondary) {
    const secTags = ftm[state.fearTuning.secondary];
    if (secTags) {
      for (let j = 0; j < secTags.length; j++) {
        if (evtTags.indexOf(secTags[j]) >= 0) return 1.15;
      }
    }
  }
  return 1.0;
}

// =============================================
// SECTION 5: Buffer Enforcement (35-40% early game)
// =============================================

export const BUFFER_RATIO_TABLE: { maxDay: number; target: number; tolerance: number }[] = [
  { maxDay: 3, target: 0.4, tolerance: 0.08 },
  { maxDay: 7, target: 0.38, tolerance: 0.08 },
  { maxDay: 14, target: 0.3, tolerance: 0.1 },
  { maxDay: 21, target: 0.22, tolerance: 0.1 },
  { maxDay: 99, target: 0.15, tolerance: 0.1 },
];

export function getTodayEventMix(state: GameState): { buffer: number; horror: number; total: number; ratio: number } {
  const today = state.day || 1;
  const triggered = state.triggeredEvents || [];
  let buffer = 0, horror = 0;
  const todayTypes = state._todayEventTypes || [];
  for (let i = 0; i < todayTypes.length; i++) {
    if (todayTypes[i].isBuffer) buffer++;
    else horror++;
  }
  const total = buffer + horror;
  return { buffer, horror, total, ratio: total > 0 ? buffer / total : 0.5 };
}

export function getBufferTarget(day: number): { maxDay: number; target: number; tolerance: number } {
  for (let i = 0; i < BUFFER_RATIO_TABLE.length; i++) {
    if (day <= BUFFER_RATIO_TABLE[i].maxDay) return BUFFER_RATIO_TABLE[i];
  }
  return BUFFER_RATIO_TABLE[BUFFER_RATIO_TABLE.length - 1];
}

export function applyBufferEnforcement(candidates: WeightedCandidate[], state: GameState): WeightedCandidate[] {
  const day = state.day || 1;
  const target = getBufferTarget(day);
  const mix = getTodayEventMix(state);
  if (mix.total < 2) return candidates;
  return candidates.map((item) => {
    const evt = item.event || (item as unknown as GameEvent);
    let w = typeof item.weight === 'number' ? item.weight : 1.0;
    const isBuffer = !!(evt as GameEvent).normalcy_anchor;
    if (mix.ratio < target.target - target.tolerance) {
      if (isBuffer) w *= 1.6; else w *= 0.7;
    } else if (mix.ratio > target.target + target.tolerance) {
      if (isBuffer) w *= 0.6; else w *= 1.3;
    }
    return { event: evt as GameEvent, weight: w };
  });
}

// =============================================
// SECTION 6: Distortion Variants
// =============================================

export function getDistortionVariant(evt: GameEvent, state: GameState, rng?: (() => number) | null): string | null {
  if (!evt || !evt.distortion_variants) return null;
  const v = evt.distortion_variants;
  const san = state.san || 60;
  const loop = state.loopCount || 0;
  const corr = state.safehouseCorruption || 0;
  const fear = state.fearTuning ? state.fearTuning.primary : null;
  const _rand = typeof rng === 'function' ? rng : Math.random;

  if (fear && v['fear_' + fear] && _rand() < 0.45) return v['fear_' + fear];
  if (loop >= 8 && v.loop_8_plus && _rand() < 0.4) return v.loop_8_plus;
  if (loop >= 3 && v.loop_3_plus && _rand() < 0.3) return v.loop_3_plus;
  if (san <= 20 && v.san_low && _rand() < 0.5) return v.san_low;
  if (san <= 40 && v.san_mid && _rand() < 0.35) return v.san_mid;
  if (san <= 60 && v.san_high && _rand() < 0.15) return v.san_high;
  if (corr >= 50 && v.corruption_high && _rand() < 0.25) return v.corruption_high;
  return null;
}

// =============================================
// SECTION 7: First-week filter (legacy compat)
// =============================================

export function applyFirstWeekFilter(candidates: WeightedCandidate[], day: number): WeightedCandidate[] {
  if (day > 10 || !candidates || candidates.length === 0) return candidates;
  return candidates.map((item) => {
    const evt = item.event || (item as unknown as GameEvent);
    let w = 1.0;
    if (evt.trigger && ((evt.trigger as Record<string, number>).chapter === 1 || (evt.trigger as Record<string, number>).chapter <= 1)) w *= 1.5;
    const type = evt.type || evt.event_classification || '';
    if (['正常事件', 'NPC对话', '轻微异常'].indexOf(type) >= 0) w *= 1.3;
    if (type === 'silent' && day <= 3) w *= 0.5;
    if (evt.normalcy_anchor) w *= 1.2;
    return { event: evt as GameEvent, weight: w };
  });
}

// =============================================
// SECTION 8: Day-of-Cycle Weight Multiplier
// =============================================

export function getDayCycleWeightMultiplier(evt: GameEvent, state: GameState): number {
  const day = state.day || 1;
  const cat = evt.type || evt.event_classification || '';
  const isHorror = ['超自然遭遇', '怪物遭遇', 'mythos', 'meta', 'loop_locked', '神秘事件', '氛围事件', 'silent'].indexOf(cat) >= 0;
  const isNormal = ['正常事件', 'NPC对话'].indexOf(cat) >= 0;

  if (day === 7 || day === 14 || day === 21) {
    if (isHorror) return 1.4;
    if (isNormal) return 0.8;
    return 1.1;
  }
  if (day === 28) {
    if (isHorror) return 1.6;
    if (isNormal) return 0.7;
    return 1.0;
  }
  if (day === 5 || day === 15 || day === 20 || day === 25) {
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

export function getTimeOfDayWeightMultiplier(evt: GameEvent, state: GameState): number {
  const hour = state.hour;
  if (hour == null) return 1.0;

  const cat = evt.type || evt.event_classification || '';
  const isHorror = ['超自然遭遇', '怪物遭遇', 'mythos', 'meta', 'loop_locked', '神秘事件', 'silent'].indexOf(cat) >= 0;
  const isNormal = ['正常事件', 'NPC对话', '氛围事件'].indexOf(cat) >= 0;
  const isBuffer = !!(evt as GameEvent).normalcy_anchor;
  const isMidnight = hour >= 22 || hour <= 4;
  const isLateNight = (hour >= 20 && hour < 22) || (hour > 4 && hour <= 6);
  const isDaytime = hour >= 8 && hour < 18;

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
