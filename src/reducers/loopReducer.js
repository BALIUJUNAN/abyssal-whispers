// src/reducers/loopReducer.js - Multi-loop pollution system
// Each death/restart increments loop count; pollution affects map names and event text.
//
// P0-L: Loop initialization logic extracted from NEW_GAME action in app.jsx.
//       initLoopState() centralizes all loop carry-over and mutation logic.

import { makeRand } from './utils.js';

import { pick, clamp } from './utils.js';
import { setCorruptionFlag } from './npcReducer.js';
import { rebuildTriggeredSet, rebuildSilentSet } from '../utils/triggeredSet.js';
import { getDifficultySpecial } from '../config/difficulty.js';
import { computeReincarnationDiff } from '../systems/reincarnationDiff.js';
import { transferLoopEchoes } from './npcReducer.js';
import { getLegacyForCategory } from '../systems/deathLegacies.js';
import { detectPlayerTraces } from '../systems/playerTraces.js';
import { decayDeathFragments } from '../systems/deathLegacies.js';
import {
  changeNpcTrustByRef,
  getNpcStateByRef,
  mergeNpcStateByRef,
  setNpcTrustByRef,
} from '../utils/npcStateAccess.js';

// Parse loop_memory_effect text and apply mechanical bonuses.
// Maps narrative descriptions to game-state changes.
function applyLoopMemoryEffects(f, s, ctx, rng) {
  var GD = ctx.GD;
  var effect = s.ending?.loop_memory_effect;
  if (!effect || typeof effect !== 'string') return;

  var _rand = makeRand(rng);

  // Pattern: "NPC名字 trust+X" or "所有NPC trust+X" → boost that NPC's trust
  var npcTrustMatch = effect.match(/([一-鿿·NPC\s]+?)\s*信任\+(\d+)/g);
  if (npcTrustMatch) {
    npcTrustMatch.forEach(function (m) {
      var nameMatch = m.match(/([一-鿿·\sNPC]+)/);
      var valMatch = m.match(/\+(\d+)/);
      if (nameMatch && valMatch) {
        var npcName = nameMatch[1].trim();
        var boost = parseInt(valMatch[1], 10);
        // Handle "所有NPC" → boost all core NPCs
        if (npcName === '所有NPC' || npcName === '所有 npc') {
          (GD.npcs || []).filter(function (n) { return n.chapter_1_availability === 'core'; }).forEach(function (npc) {
            changeNpcTrustByRef(f, npc.name, boost);
          });
        } else {
          // Find matching NPC in GD
          var npc = (GD.npcs || []).find(function (n) { return n.name === npcName; });
          if (npc) {
            changeNpcTrustByRef(f, npc.name, boost);
          }
        }
      }
    });
  }

  // Pattern: "NPC名字 腐化-X" → reduce that NPC's corruption
  var npcCorruptMatch = effect.match(/([一-鿿·]+)\s*腐化-(\d+)/);
  if (npcCorruptMatch) {
    var npcName2 = npcCorruptMatch[1];
    var corruptReduction = parseInt(npcCorruptMatch[2], 10);
    var npc2 = (GD.npcs || []).find(function (n) { return n.name === npcName2; });
    if (npc2 && f.npcStates) {
      var ns = getNpcStateByRef(f, npc2.name);
      mergeNpcStateByRef(f, npc2.name, {
        corruption: Math.max(0, (ns.corruption || 0) - corruptReduction),
      });
    }
  }

  // Pattern: "SAN上限-X" or "maxSan-X" → reduce maxSan
  var sanCapMatch = effect.match(/SAN上限[-–](\d+)|maxSan[-–](\d+)/);
  if (sanCapMatch) {
    var reduction = parseInt(sanCapMatch[1] || sanCapMatch[2], 10);
    f.maxSan = Math.max(20, (f.maxSan || 60) - reduction);
    f.san = Math.min(f.san, f.maxSan);
  }

  // Pattern: "SAN+X" → boost current SAN
  var sanBoostMatch = effect.match(/SAN\+(\d+)/);
  if (sanBoostMatch) {
    var sanBoost = parseInt(sanBoostMatch[1], 10);
    f.san = Math.min(f.maxSan, (f.san || 60) + sanBoost);
  }

  // Pattern: "全属性+5" → boost all core stats
  var allStatMatch = effect.match(/全属性\+(\d+)/);
  if (allStatMatch) {
    var statBoost = parseInt(allStatMatch[1], 10);
    ['str', 'con', 'siz', 'dex', 'app', 'int', 'pow', 'edu'].forEach(function (stat) {
      if (f.stats && f.stats[stat] != null) {
        f.stats[stat] = (f.stats[stat] || 0) + statBoost;
      }
    });
  }

  // Pattern: "神秘学+X" or "mythos+X" → boost mythos
  var mythosMatch = effect.match(/神秘学\+(\d+)|mythos\+(\d+)/);
  if (mythosMatch) {
    var mythosBoost = parseInt(mythosMatch[1] || mythosMatch[2], 10);
    f.mythosLevel = (f.mythosLevel || 0) + mythosBoost;
  }

  // Pattern: "boat key" or "船只钥匙" → add starting item
  if (effect.includes('boat key') || effect.includes('船只钥匙') || effect.includes('escape key')) {
    var hasKey = f.inventory.some(function (i) { return i.id === 'escape_boat_key'; });
    if (!hasKey) {
      f.inventory.push({ id: 'escape_boat_key', name: '船只钥匙', type: 'key_item' });
    }
  }

  // Pattern: "可以选择堕落者起始角色" → unlock fallen archetype
  if (effect.includes('堕落者') || effect.includes('Fallen One')) {
    f._availableArchetypes = f._availableArchetypes || [];
    if (!f._availableArchetypes.includes('fallen')) {
      f._availableArchetypes.push('fallen');
    }
  }

  // Pattern: "下一轮为最终轮回" → set final loop flag
  if (effect.includes('最终轮回')) {
    f._isFinalLoop = true;
  }

  // Pattern: "携带全部轮回记忆" → boost knowledge carryover
  if (effect.includes('全部轮回记忆') || effect.includes('完整记忆')) {
    f._fullMemoryCarryover = true;
  }

  // Pattern: "初始腐化-X" → reduce starting corruption
  var corruptionMatch = effect.match(/初始腐化[-–](\d+)/);
  if (corruptionMatch) {
    f.safehouseCorruption = Math.max(0, (f.safehouseCorruption || 0) - parseInt(corruptionMatch[1], 10));
  }
}

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
export function getPollutionText(text, pollution, rng) {
  var _rand = makeRand(rng);
  if (pollution <= 0 || _rand() >= pollution * 0.15) return text;
  return text + '\n\n' + pick(POLLUTION_SUFFIXES, rng);
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
  var rng = options?.rng || null;

  // ── 1) 运行统计 ──
  f.stats_run.deaths = s.stats_run.deaths + (s.hp <= 0 || s.san <= 0 ? 1 : 0);
  f.stats_run.runs = s.stats_run.runs + 1;
  f.lastDeathType = s.hp <= 0 ? 'physical' : s.san <= 0 ? 'mental' : null;
  // SAN崩溃计数跨循环搬入
  f.sanityCollapseCount = (s.sanityCollapseCount || 0);
  // loopSlice installs a plain SAN-legacy snapshot after this function returns.
  // Never retain the mutable/Immer source state here.
  f._prevRunStateForSanLegacy = null;

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

  // Apply loop shop SAN cap boost (永久+5, max 70)
  if (f._shopSanCapBoost > 0) {
    f.maxSan = Math.min(70, (f.maxSan || 60) + f._shopSanCapBoost);
    f.san = Math.min(f.san, f.maxSan);
  }

  // Level 13 (十三钟响): SAN loss inheritance — carry 10% of lost SAN to next loop
  if (f.loopCount > 1) {
    var l13Special = getDifficultySpecial(s.difficultyLevel);
    if (l13Special?.san_inheritance_rate) {
      var prevMaxSan = s.maxSan || 60;
      var prevCurrentSan = s.san || 0;
      var sanLost = Math.max(0, prevMaxSan - prevCurrentSan);
      var inherited = Math.round(sanLost * l13Special.san_inheritance_rate);
      var cap = l13Special.san_inheritance_cap || 20;
      var actualInheritance = Math.min(inherited, cap);
      if (actualInheritance > 0) {
        f.maxSan = Math.max(10, (f.maxSan || 60) - actualInheritance);
        f.san = Math.min(f.san, f.maxSan);
        var inheritanceMessages = [
          '你感到自己的灵魂比上次薄了一些。有些记忆……不，不是记忆。是更本质的东西。',
          '你醒来时，觉得身上少了什么。不是物品，不是记忆。是一种更深的重量。',
        ];
        if (f._showInheritanceMessage !== false && f.loopCount <= inheritanceMessages.length + 1) {
          f._inheritanceNarrative = inheritanceMessages[Math.min(f.loopCount - 2, inheritanceMessages.length - 1)];
        }
      }
    }
  }

  // Pollution increases with each loop (§2.2: replaces SAN penalty at high loops)
  var pollutionRate = f.loopCount >= 6 ? 0.08 : 0.05;
  f.pollution = Math.min(1, (f.pollution || 0) + pollutionRate * f.loopCount);
  // NPC trust: high trust (4+) partially persists, low trust decays
  if (f.loopCount >= 3) {
    var trustDecay = Math.min(2, Math.floor(f.loopCount / 3));
    var npcNames = Object.keys(f.npcTrust || {});
    for (var _ni = 0; _ni < npcNames.length; _ni++) {
      var _cur = f.npcTrust[npcNames[_ni]] || 0;
      if (_cur >= 4) {
        // High trust: persist 50-70% (decreases slightly per loop)
        var persistRate = Math.max(0.4, 0.7 - (f.loopCount - 3) * 0.05);
        f.npcTrust[npcNames[_ni]] = Math.max(3, Math.round(_cur * persistRate));
      } else if (_cur > 0) {
        // Low trust: decays normally
        f.npcTrust[npcNames[_ni]] = Math.max(0, _cur - trustDecay);
      }
    }
  }

  // ── 2.5) 玩家行为的回声 — 上一轮NPC死亡的余响（仅持续一轮）
  // 原则：不说破。不提到NPC名字。只是一句淡淡的感受。
  transferLoopEchoes(s, f);

  // ── 3) 技能保留（按轮回数缩放） ──
  if (f.loopCount > 1) {
    // Loop 1: 30%, Loop 2: 40%, Loop 3: 50%, Loop 4+: 60%
    var retainRate = f.loopCount <= 2 ? 0.3 : f.loopCount <= 3 ? 0.4 : f.loopCount <= 4 ? 0.5 : 0.6;
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
    f._shopSanCapBoost = (s._shopSanCapBoost || 0) + 5;
  }
  if (f.purchasedShopItems.includes('shop_death_insurance')) {
    f._shopDeathInsurance = true;
    // Death insurance: retain one key item from previous run
    var prevInventory = s.inventory || [];
    if (prevInventory.length > 0) {
      // Prefer items with 'key' or 'clue' in their id, otherwise take the first
      var keepItem = prevInventory.find(function (i) {
        return i.id && (i.id.includes('key') || i.id.includes('clue') || i.id.includes('artifact'));
      }) || prevInventory[0];
      if (keepItem && !f.inventory.some(function (i) { return i.id === keepItem.id; })) {
        f.inventory.push(keepItem);
        f._deathInsuranceItem = keepItem.name || keepItem.id;
      }
    }
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
    'clue_finds',
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
      const target = pick(coreNpcs, rng);
      setNpcTrustByRef(f, target.name, 1);
    }
  }

  // ── 11) 轮回记忆效应（来自上一轮结局的 loop_memory_effect） ──
  applyLoopMemoryEffects(f, s, ctx, rng);

  // ── 11b) 封印知识持久化 ──
  // What the player learned about the seal persists across loops
  f._sealKnowledge = { ...(s._sealKnowledge || {}) };
  // Track which rituals were attempted (success or failure)
  if (s.triggeredEvents) {
    s.triggeredEvents.forEach(function (evtId) {
      if (evtId.startsWith('seal_ritual_') || evtId.startsWith('seal_attempt_')) {
        f._sealKnowledge.attemptedRituals = f._sealKnowledge.attemptedRituals || [];
        if (!f._sealKnowledge.attemptedRituals.includes(evtId)) {
          f._sealKnowledge.attemptedRituals.push(evtId);
        }
      }
      // Track NPC involvement in seal rituals
      if (evtId.includes('hilda') && evtId.includes('seal')) {
        f._sealKnowledge.hildaInvolved = true;
      }
      if (evtId.includes('fisher') && evtId.includes('seal')) {
        f._sealKnowledge.fisherInvolved = true;
      }
      if (evtId.includes('isabella') && evtId.includes('seal')) {
        f._sealKnowledge.isabellaInvolved = true;
      }
    });
  }
  // Seal knowledge unlocks special dialogue/events in new loop
  if (f._sealKnowledge.attemptedRituals && f._sealKnowledge.attemptedRituals.length > 0) {
    f.retainedKnowledge.push('knowledge_seal_attempted');
  }
  if (f._sealKnowledge.hildaInvolved) {
    f.retainedKnowledge.push('knowledge_seal_hilda');
  }
  if (f._sealKnowledge.fisherInvolved) {
    f.retainedKnowledge.push('knowledge_seal_fisher');
  }
  if (f._sealKnowledge.isabellaInvolved) {
    f.retainedKnowledge.push('knowledge_seal_isabella');
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
  // ending trigger count for progressive afterglow unlock
  f.endingTriggerCounts = { ...(s.endingTriggerCounts || {}) };
  if (s.ending?.id) {
    f.endingTriggerCounts[s.ending.id] = (f.endingTriggerCounts[s.ending.id] || 0) + 1;
  }

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

  // ── 12b) triggeredEvents / triggeredSilentEvents 上限（防止长玩膨胀）
  f.triggeredEvents = [...(s.triggeredEvents || [])];
  if (f.triggeredEvents.length > 1000) f.triggeredEvents = f.triggeredEvents.slice(-1000);
  f.triggeredSilentEvents = [...(s.triggeredSilentEvents || [])];
  if (f.triggeredSilentEvents.length > 500) f.triggeredSilentEvents = f.triggeredSilentEvents.slice(-500);

  // ── 13) 死亡上下文搬入 ──
  f.previousDeathContext = s.deathContext || null;
  f.lastDeathType = s.deathContext?.type || s.lastDeathType || null;
  f.lastDeathMode = s.deathContext?.mode || s.lastDeathMode || null;
  if (s.deathContext?.residueFlag) {
    f.loopEchoFlags = [...f.loopEchoFlags, s.deathContext.residueFlag];
  }

  // ── 13b) 死亡遗产搬入 ──
  // Generate legacy from last death attribution category
  if (s.deathContext?.attributionCategory) {
    var legacyDef = getLegacyForCategory(s.deathContext.attributionCategory);
    if (legacyDef) {
      f.deathLegacies = [...(f.deathLegacies || []), legacyDef];
    }
    // Also carry the attribution narrative for display
    f.deathAttributionNarrative = s.deathContext.attributionNarrative || null;
  }
  // Carry forward any unconsumed legacies
  if (s.deathLegacies && s.deathLegacies.length > 0) {
    f.deathLegacies = [...(f.deathLegacies || []), ...s.deathLegacies];
  }

  // ── 13c) 死亡碎片搬入（含衰减） ──
  decayDeathFragments(f);

  // ── 13d) Meta事件标记搬入 ──
  f.metaEventFlags = { ...(s.metaEventFlags || {}) };

  // ── 13e) 死亡计数Meta事件标记搬入 ──
  if (s._pendingDeathCountMeta) {
    f._pendingDeathCountMeta = s._pendingDeathCountMeta;
  }

  // ── 14) 矛盾极端检测 ──
  if ((s.humanityScore ?? 30) >= 30 && (sBT.direct_kill_count || 0) >= 3) {
    setCorruptionFlag(f, 'has_committed_contradictory_extremes');
  }

  // ── 15) 文本重复追踪（跨轮持久化） ──
  f.seenEventTexts = { ...(s.seenEventTexts || {}) };

  // ── 15b) 重建 triggeredEvents 并行 Set（O(1) 查询，防止长玩 O(n) 退化） ──
  rebuildTriggeredSet(f);
  rebuildSilentSet(f);

  // ── 16) 轮回差异提示 ──
  f.reincarnationDiff = computeReincarnationDiff(s, f, ctx);

  // ── 17) 玩家痕迹检测（P2-6） ──
  // Carry forward existing traces + auto-detect new ones from this loop's actions
  f.playerTraces = [...(s.playerTraces || [])];
  var newTraces = detectPlayerTraces(f);
  for (var ti = 0; ti < newTraces.length; ti++) {
    var nt = newTraces[ti];
    // Avoid duplicates
    if (!f.playerTraces.some(function (t) { return t.traceId === nt.traceId; })) {
      f.playerTraces.push(nt);
    }
  }
  if (f.playerTraces.length > 30) {
    f.playerTraces = f.playerTraces.slice(-30);
  }

  return f;
}
