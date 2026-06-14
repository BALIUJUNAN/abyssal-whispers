// src/reducers/loopReducer.js - Multi-loop pollution system
// Each death/restart increments loop count; pollution affects map names and event text.
//
// P0-L: Loop initialization logic extracted from NEW_GAME action in app.jsx.
//       initLoopState() centralizes all loop carry-over and mutation logic.

import { pick, clamp } from './utils.js';
import { setCorruptionFlag } from './npcReducer.js';
import { computeReincarnationDiff } from '../systems/reincarnationDiff.js';

/**
 * Get the loop count effects for a given loop number.
 */
export function getLoopEffect(loopCount, ctx) {
  const { GD } = ctx;
  const effects = GD.systems?.loop?.loop_count_effects || {};
  const key = loopCount <= 5 ? 'loop_' + loopCount : 'loop_6_plus';
  return effects[key] || { san_cap_reduction: 0, pollution_intensity: 0 };
}

// Pollution text fragments that get mixed into descriptions
export const POLLUTION_SUFFIXES = [
  '你总觉得有什么东西在看着你。',
  '远处传来一声低语，但你听不清内容。',
  '你的影子似乎比你慢了半拍。',
  '空气中有股咸腥味。',
  '你恍惚间听到有人叫你的名字。',
  '墙角的阴影蠕动了一下。',
  '你的记忆中有一段不属于这里的画面。',
  '某个声音在你脑海中回荡。',
];

// Text quality: forbidden words from design_intent.text_style
// Avoid direct horror cliches in procedurally generated text
export const FORBIDDEN_WORDS = [
  '不可名状',
  '疯狂',
  '恐怖',
  '诡异',
  '扭曲',
  '令人毛骨悚然',
  '骇人听闻',
  '极度恐惧',
];

/**
 * Check if text contains forbidden words (design quality check).
 * Returns list of found forbidden words, or empty array if clean.
 */
export function checkTextQuality(text) {
  return FORBIDDEN_WORDS.filter((w) => text.includes(w));
}

/**
 * Potentially add pollution text to event descriptions.
 * Returns modified text if pollution triggers, otherwise original.
 */
export function getPollutionText(text, pollution) {
  if (pollution <= 0 || Math.random() >= pollution * 0.15) return text;
  return text + '\n\n' + pick(POLLUTION_SUFFIXES);
}

// ═══════════════════════════════════════════════════════════
// P0-L: Loop Initialization (extracted from NEW_GAME in app.jsx)
// ═══════════════════════════════════════════════════════════

/**
 * 初始化新轮回的全部状态。
 * 从旧 state（s）中搬运转回持久字段到新 state（f）。
 *
 * @param {object} f        - 新 state（initialState() 的返回值，已预填默认值）
 * @param {object} s        - 旧 state（即将被丢弃）
 * @param {object} ctx      - { GD }
 * @param {object} options  - { prevSummary } buildPreviousRunSummary 的结果
 * @returns {object} f      - 完成搬运转入后的新 state
 */
export function initLoopState(f, s, ctx, options = {}) {
  const { GD } = ctx;
  const { prevSummary } = options;

  // ── 1) 运行统计 ──
  f.stats_run.deaths = s.stats_run.deaths + (s.hp <= 0 || s.san <= 0 ? 1 : 0);
  f.stats_run.runs = s.stats_run.runs + 1;
  f.lastDeathType = s.hp <= 0 ? 'physical' : s.san <= 0 ? 'mental' : null;

  // ── 2) 循环计数 & 环境效果 ──
  f.loopCount = (s.loopCount || 0) + 1;
  const loopKey = f.loopCount <= 5 ? 'loop_' + f.loopCount : 'loop_6_plus';
  const loopEffect = GD.systems?.loop?.loop_count_effects?.[loopKey];
  if (loopEffect) {
    f.maxSan = Math.max(10, 99 + (loopEffect.san_cap_reduction || 0));
    f.san = Math.min(f.san, f.maxSan);
    f.pollution = loopEffect.pollution_intensity || 0;
  }

  // Phase 7: Loop inheritance costs — knowledge comes with a price
  // §2.2 rebalance: SAN floor = 60 for loops 4-5, fixed 50 at loop 10+
  // Loops 2-3: -5/loop (same as before)
  // Loops 4-5: -3/loop, floor 60
  // Loops 6-9: no further SAN reduction, pollution replaces penalty
  // Loop 10+: SAN cap fixed at 50
  if (f.loopCount >= 10) {
    f.maxSan = Math.max(50, f.maxSan);
    f.maxSan = Math.min(f.maxSan, 50); // pin to 50
  } else if (f.loopCount >= 6) {
    // No additional SAN cap reduction — pollution takes over
    f.maxSan = Math.max(60, f.maxSan);
  } else if (f.loopCount >= 4) {
    // Floor at 60
    f.maxSan = Math.max(60, f.maxSan);
  }
  f.san = Math.min(f.san, f.maxSan);
  // Pollution increases with each loop (§2.2: replaces SAN penalty at high loops)
  var pollutionRate = f.loopCount >= 6 ? 0.08 : 0.05;
  f.pollution = Math.min(1, (f.pollution || 0) + pollutionRate * f.loopCount);
  // NPC trust decay: NPCs become wary of returning players
  if (f.loopCount >= 3) {
    var trustDecay = Math.min(2, Math.floor(f.loopCount / 3));
    var npcNames = Object.keys(f.npcTrust || {});
    for (var _ni = 0; _ni < npcNames.length; _ni++) {
      var _cur = f.npcTrust[npcNames[_ni]] || 0;
      if (_cur > 0) f.npcTrust[npcNames[_ni]] = Math.max(0, _cur - trustDecay);
    }
  }

  // ── 3) 技能保留（30%） ──
  if (f.loopCount > 1) {
    const retainRate = 0.3;
    Object.entries(s.skills).forEach(([k, v]) => {
      if (v > 0) f.skills[k] = Math.max(f.skills[k] || 0, Math.floor(v * retainRate));
    });
  }

  // ── 4) 污染规则 ──
  if (f.pollution > 0) {
    const rules = GD.systems?.loop?.pollution_rules || [];
    rules.forEach((rule) => {
      if (rule.cumulative && rule.id === 'pollution_san_cap') {
        // §2.2: pollution SAN cap respects loop-based floor
        var sanFloor = f.loopCount >= 10 ? 50 : f.loopCount >= 4 ? 60 : 20;
        f.maxSan = Math.max(sanFloor, f.maxSan - 5);
        f.san = Math.min(f.san, f.maxSan);
      }
    });
  }

  // ── 5) 恩赐系统 ──
  const blessings = GD.systems?.loop?.loop_blessings || {};
  const bKey = f.loopCount <= 5 ? 'loop_' + f.loopCount : 'loop_6_plus';
  const blessing = blessings[bKey];
  if (blessing) {
    f.activeBlessings = [...(s.activeBlessings || []), bKey];
  }

  // ── 6) 知识 & 结论保留 ──
  f.retainedKnowledge = [...(s.retainedKnowledge || [])];
  f.discoveredConclusions = [...(s.discoveredConclusions || [])];
  f.humanityScore = s.humanityScore ?? 50;

  // ── 6b) 结局代币 & 轮回商店（§2.4） ──
  f.endingCoins = s.endingCoins || 0;
  // Earn 1 coin per ending reached
  if (s.ending?.id) {
    f.endingCoins = (f.endingCoins || 0) + 1;
  }
  // Loop shop tier carry-over (unlock at loop 5+)
  f.loopShopTier = s.loopShopTier || 0;
  if (f.loopCount >= 5 && f.loopShopTier < 1) f.loopShopTier = 1;
  if (f.loopCount >= 7 && f.loopShopTier < 2) f.loopShopTier = 2;
  // Purchased shop items persist across loops (permanent upgrades)
  f.purchasedShopItems = [...(s.purchasedShopItems || [])];
  // Apply purchased shop effects to new loop state
  if (f.purchasedShopItems.includes('shop_skill_points')) {
    f._shopBonusSkillPoints = 3;
  }
  if (f.purchasedShopItems.includes('shop_san_cap_boost')) {
    f.maxSan = Math.min(70, (f.maxSan || 60) + 5);
  }
  if (f.purchasedShopItems.includes('shop_death_insurance')) {
    f._shopDeathInsurance = true;
  }
  if (f.purchasedShopItems.includes('shop_resistance')) {
    f._shopMythosResistance = 0.1;
  }
  if (f.purchasedShopItems.includes('shop_npc_trust')) {
    f._shopNpcTrustBonus = 2;
  }

  // ── 7) 行为结局计数器全量搬入（behaviorTracking 嵌套结构） ──
  const sBT = s.behaviorTracking || {};
  const fBT = f.behaviorTracking || (f.behaviorTracking = {});
  const BEHAVIOR_COUNTERS = [
    'direct_kill_count',
    'cannibalism_count',
    'clean_kill_pattern',
    'npc_deaths_by_manipulation',
    'cult_leader_score',
    'self_harm_ritual_count',
    'fusion_accepted_count',
    'possession_accepted_count',
    'forbidden_intimacy_flags',
    'sacred_desecration_count',
    'same_npc_harm_max',
    'npc_as_resource_count',
    'betrayed_high_trust_npcs',
    'self_sacrifice_for_power',
    'fusion_and_self_harm_total',
    'harbor_visits',
    'sea_acceptance_flags',
    'work_only_days',
    'safehouse_stay_days',
    'move_only_days',
    'record_only_days',
    'low_intervention_count',
    'work_count',
    'hoarded_money_max',
    'hoarded_food_max',
    'archive_consumed_count',
    'prophecy_spread_count',
    'redeemed_npcs',
    'thirteenth_bell_obsession',
    'meta_boundary_breaks',
    'final_choice_refused_count',
    'save_delete_attempts',
    'loop_exploit_score',
    'loop_break_attempts',
  ];
  for (const key of BEHAVIOR_COUNTERS) {
    fBT[key] = sBT[key] || 0;
  }
  f.money = s.money || 0; // 核心资源，不属于 behaviorTracking
  fBT._npc_harm_tally = { ...(sBT._npc_harm_tally || {}) };
  fBT.sleep_streak = 0; // 重置每日追踪

  // ── 8) 循环行为标记 ──
  if ((sBT.sacred_desecration_count || 0) > 0 || s.triggeredEvents.includes('seal_desecrated')) {
    fBT.loop_break_attempts = (sBT.loop_break_attempts || 0) + 1;
  }
  fBT.save_delete_attempts = sBT.save_delete_attempts || 0;
  if (s.retainedKnowledge.length > 5) fBT.loop_exploit_score = (sBT.loop_exploit_score || 0) + 1;

  // ── 9) 前传恐惧画像跨循环保留 ──
  f.prologue = s.prologue || null;
  f.fearTuning = s.fearTuning || null;

  // ── 10) 神秘学衰减 ──
  f.mythosLevel = Math.max(0, (s.mythosLevel || 0) - 2);

  // ── 10b) NPC关系网跨循环保留（§1.2） ──
  f.npcRelations = { ...(s.npcRelations || {}) };
  // §3.3: NPC trust lock 跨循环保留
  f._npcTrustLocked = { ...(s._npcTrustLocked || {}) };

  // ── 11) NPC 信任回响（知识效应） ──
  if (f.retainedKnowledge.includes('knowledge_npc_trust_shadow')) {
    const coreNpcs = (GD.npcs || []).filter((n) => n.chapter_1_availability === 'core');
    if (coreNpcs.length > 0) {
      const target = pick(coreNpcs);
      f.npcTrust[target.name] = 1;
    }
  }

  // ── 12) 历史记录搬入（带截断上限） ──
  f.previousRunSummary = prevSummary || null;
  f.previousDeathsByArea = { ...(s.previousDeathsByArea || {}) };
  if (s.currentArea && (s.hp <= 0 || s.san <= 0)) {
    f.previousDeathsByArea[s.currentArea] = (f.previousDeathsByArea[s.currentArea] || 0) + 1;
  }
  f.previousEndings = [...(s.previousEndings || [])];
  if (s.ending?.id && !f.previousEndings.includes(s.ending.id)) {
    f.previousEndings.push(s.ending.id);
  }
  if (f.previousEndings.length > 50) f.previousEndings = f.previousEndings.slice(-50);

  f.endingHistory = [
    ...(s.endingHistory || []),
    {
      ending_id: s.ending?.id || null,
      ending_name: s.ending?.name || null,
      loop: s.loopCount || 0,
      day: s.day || 1,
      humanity: s.humanityScore ?? 50,
    },
  ];
  if (f.endingHistory.length > 50) f.endingHistory = f.endingHistory.slice(-50);

  f.loopEchoFlags = [...(s.loopEchoFlags || [])];
  if (f.loopEchoFlags.length > 200) f.loopEchoFlags = f.loopEchoFlags.slice(-200);

  f.worldCorrectionFlags = [...(s.worldCorrectionFlags || [])];
  if (f.worldCorrectionFlags.length > 200)
    f.worldCorrectionFlags = f.worldCorrectionFlags.slice(-200);

  f.everTriggeredEvents = [...(s.everTriggeredEvents || [])];
  if (f.everTriggeredEvents.length > 2000)
    f.everTriggeredEvents = f.everTriggeredEvents.slice(-2000);

  // ── 13) 死亡上下文搬入 ──
  f.previousDeathContext = s.deathContext || null;
  f.lastDeathType = s.deathContext?.type || s.lastDeathType || null;
  f.lastDeathMode = s.deathContext?.mode || s.lastDeathMode || null;
  if (s.deathContext?.residueFlag) {
    f.loopEchoFlags = [...f.loopEchoFlags, s.deathContext.residueFlag];
  }

  // ── 14) 矛盾极端检测 ──
  if ((s.humanityScore ?? 30) >= 30 && (s.direct_kill_count || 0) >= 3) {
    setCorruptionFlag(f, 'has_committed_contradictory_extremes');
  }

  // ── 15) 文本重复追踪（跨轮持久化） ──
  f.seenEventTexts = { ...(s.seenEventTexts || {}) };

  // ── 16) 轮回差异提示 ──
  f.reincarnationDiff = computeReincarnationDiff(s, f, ctx);

  return f;
}
