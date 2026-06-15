// src/reducers/slices/exploreSlice.js - Extracted from gameReducer
// MOVE, EXPLORE, DO_SKILL_CHECK
//
// ctx (bundle-scope context with GD) is passed as 4th param to handleExploreAction.
// Sub-functions within EXPLORE use ctx via closure from the handler scope.
//
// TODO: EXPLORE case is ~210 lines with 5-6 nesting levels.
// Consider splitting into sub-phase functions:
//   _selectEvent(s, ctx, c)    → candidate filtering + weighted selection
//   _applyEventEffects(s, c)   → SAN damage, skill checks, madness
//   _postEventProcessing(s, c) → chain progress, conclusions, endings

import { rand, clamp, pick, applySanLoss } from '../utils.js';
import { GAME_BALANCE } from '../../state/gameConstants.js';
import { getPhase, getAreaInfo } from '../../engine/WorldTimeSystem.js';
import {
  getSanStageFromGD,
  getSanSceneVariant,
  getSanTextVariant,
  processSanLoss,
  rollMadness,
} from '../sanReducer.js';
import {
  checkTrigger,
  doSkillCheck,
  getGambleOptions,
  processNormalAnchorEvent,
  selectEvent,
} from '../eventReducer.js';
import { applyLegacyEffects } from '../effectReducer.js';
import { EARLY_WHISPERS } from '../../systems/earlyHooks.js';
import { emit } from '../../engine/eventBus.js';
import { checkObjCompletion } from '../objectiveReducer.js';
import { getPollutionText } from '../loopReducer.js';
import { getMonsterManifestation } from '../chapterReducer.js';
import { checkConclusions, checkFalseInterpretations } from '../conclusionReducer.js';
import { resolveDeath } from '../deathSystem.js';
import {
  selectEventV2,
  getEligibleEvents,
  chooseWeightedEvent,
  commitSelectedEvent,
  getEventWeight,
} from '../extendedEvents.js';
import { shouldTriggerMissing600, createMissing600Event } from '../../data/events_missing_600.js';
import { checkOmens } from '../../data/events_omens_600.js';
import { applyFearLens, getFearEventWeightModifier } from '../../systems/fearLens.js';
import { applyTextHallucination } from '../../engine/PollutionManager.js';
import { addRunMemory, setNpcTrust, getNpcState, setNpcState, checkWrongInference, applyDeathResolution, checkSilentEvent, narrApInsufficient } from '../../utils/appHelpers.js';
import { adjustSanLossForFirstLoop, shouldBlockLethalEvent } from '../../systems/firstLoopBalance.js';
import { getTrackedText, createSeenTextMap, applyMythosAliases, maybeInjectPhantomNarrative } from '../../systems/textVariants.js';
import { getLightLevelEffects, applyLightTextCorruption } from '../miscReducer.js';
import { checkChainCompletion, isAreaUnlocked, getAreaDisplayName } from '../../utils/gameHelpers.js';
import { hasClueId, resolveClueName } from '../../utils/clueNameMap.js';
import { getEventImage } from '../../portraitMap.js';
import { getAreaCorruptionNarrative } from '../../systems/worldDecay.js';
import { applyResourceTextCorruption } from '../../systems/resourceNarrative.js';
import { getForcedProgressGuard, executeForcedProgressGuard } from '../objectiveReducer.js';
import { checkChapterMilestone, createMilestoneEvent, getDistortionVariant } from '../../engine/EventEngine.js';

// TODO: checkSilentEvent is defined in app.jsx — avoid circular import.
// It remains a global for now; will be extracted to a utility in a future PR.

// §3.3: Meta event real consequences
export function applyMetaEffect(effectType, state, evt, c) {
  if (!effectType) return;
  switch (effectType) {
    case 'overwrite_save_slot':
      // §3.3: "虚假的存档" — 标记存档槽被覆盖
      state._metaSaveOverwritten = true;
      c.narr('system', '存档已更新为最新版本。你可能失去了什么。', { isSpecial: true });
      break;
    case 'npc_trust_lock_random':
    case 'npc_trust_lock_and_achievement':
      // §3.3: NPC信任锁定为0 + 解锁成就
      var trustNpcs = Object.entries(state.npcTrust || {}).filter(function (kv) {
        return kv[1] >= 3;
      });
      if (trustNpcs.length > 0) {
        var target = c.pick(trustNpcs);
        setNpcTrust(state, target[0], 0);
        state._npcTrustLocked = state._npcTrustLocked || {};
        state._npcTrustLocked[target[0]] = true;
        c.narr(
          'system',
          target[0] + '突然说了一串你听不懂的话。然后沉默了。你感到——有什么东西断裂了。',
          { isSpecial: true }
        );
      }
      if (effectType === 'npc_trust_lock_and_achievement') {
        state._achievements = state._achievements || [];
        if (!state._achievements.includes('achievement_fourth_wall')) {
          state._achievements.push('achievement_fourth_wall');
          c.narr('system', '【成就解锁】打破第四面墙', { isSpecial: true });
        }
      }
      break;
    case 'npc_permanent_disappear':
      // §3.3: "作者的提示" — 随机NPC永久失踪
      var aliveNpcs = Object.entries(state.npcStates || {}).filter(function (kv) {
        return !kv[1].dead;
      });
      if (aliveNpcs.length > 0) {
        var victim = c.pick(aliveNpcs);
        setNpcState(state, victim[0], {
          ...getNpcState(state, victim[0]),
          dead: true,
          disappearance: 'meta_vanish',
        });
        c.narr(
          'system',
          victim[0] + '失踪了。没有人记得他/她是什么时候消失的。好像从来没有存在过。',
          { isSpecial: true }
        );
      }
      break;
    case 'delete_dialogue_branch':
      // §3.3: "选择的消失" — 删除一个未选择的对话分支
      state._deletedBranches = state._deletedBranches || [];
      state._deletedBranches.push({ day: state.day, source: evt.id });
      c.narr('system', '你感到——某种可能性消失了。一条你没有走过的路，现在永远走不了了。', {
        isSpecial: true,
      });
      break;
  }
}

// P1: Quality tier dynamic truncation
// Tier S: full display (no change)
// Tier A: full display (no change)
// Tier B: normal display
// Tier C: first trigger = truncate to 2 sentences; subsequent = generic replacement
var _QT_GENERIC_REPLACEMENT = '你又有一种熟悉的感觉，但你想不起细节了。沃切斯特的日常就是这样。';
export function applyQualityTier(text, evt, state) {
  var qt = evt.quality_tier;
  if (!qt || qt === 'S' || qt === 'A' || qt === 'B') return text;
  // Tier C: check trigger count
  if (qt === 'C') {
    var triggered = state.triggeredEvents || [];
    var count = 0;
    for (var i = 0; i < triggered.length; i++) {
      if (triggered[i] === evt.id) count++;
    }
    if (count >= 2) return _QT_GENERIC_REPLACEMENT;
    // First trigger: truncate to first 2 sentences
    var sentences = text.split(/[。\n]/);
    var result = [];
    for (var j = 0; j < sentences.length && result.length < 2; j++) {
      var s = sentences[j].trim();
      if (s.length > 0) result.push(s);
    }
    return result.join('。') + '。';
  }
  return text;
}

// ── EXPLORE sub-functions (P1-9: decomposed from 213-line case) ─────

/** Phase 1: Select an explore event via extended pipeline + omen/600 fallback.
 *  Milestone + progress guard handled inline by caller (needs c.narr).
 *  Returns { evt, alreadyCommitted }. */
export function _selectExploreEvent(s, ctx, GD, c) {
  // Extended event selection pipeline
  let evt = null;
  let alreadyCommitted = false;
  if (GD._extendedEventsLoaded) {
    const rawCandidates = getEligibleEvents(s.currentArea, s, ctx);
    // First-loop protection: filter out lethal events during safe window
    const candidates = rawCandidates.filter(ev => !shouldBlockLethalEvent(ev, s));
    if (candidates.length > 0) {
      if (s.fearTuning && s.fearTuning.primary) {
        const fearScored = candidates
          .map(function (ev) {
            return {
              evt: ev,
              weight: getEventWeight(ev, s.currentArea, s, ctx) * getFearEventWeightModifier(ev, s),
            };
          })
          .filter(function (x) {
            return x.weight > 0;
          });
        if (fearScored.length > 0) {
          const totalW = fearScored.reduce(function (a, b) {
            return a + b.weight;
          }, 0);
          let roll = (c.rng ? c.rng.next() : Math.random()) * totalW;
          for (const item of fearScored) {
            roll -= item.weight;
            if (roll <= 0) {
              evt = item.evt;
              break;
            }
          }
          if (!evt) evt = fearScored[fearScored.length - 1].evt;
        }
      }
      if (!evt) evt = chooseWeightedEvent(candidates, s.currentArea, s, ctx, pick);
    }
    // Special events that bypass normal pool
    if (!evt) {
      const allEvts = GD.events || [];
      const omen = checkOmens(s);
      if (omen) {
        evt = omen;
        commitSelectedEvent(omen, s);
        alreadyCommitted = true;
      } else {
        const extEvts =
          GD._extendedEvents ||
          (allEvts.length > (GD._deathEchoCount || 0)
            ? allEvts.slice(0, allEvts.length - (GD._deathEchoCount || 0))
            : allEvts);
        if (
          shouldTriggerMissing600(s, extEvts) &&
          (c.rng ? c.rng.next() : Math.random()) < GAME_BALANCE.MISSING_600_CHANCE
        ) {
          evt = createMissing600Event(s);
          commitSelectedEvent(evt, s);
          alreadyCommitted = true;
        }
      }
    }
    if (evt && !alreadyCommitted) commitSelectedEvent(evt, s);
  } else {
    evt = selectEvent(s.currentArea, s, ctx, pick);
  }
  return { evt: evt, alreadyCommitted: alreadyCommitted };
}

/** Phase 4: Post-event processing — objectives, chains, conclusions, monsters, tracking. */
export function _postExploreProcessing(evt, s, c, GD) {
  s.objectives = checkObjCompletion(s.objectives, s);
  // Event chain progress
  const chains = GD.event_chains || [];
  for (const ch of chains) {
    const seq = ch.sequence || [];
    const idx = seq.indexOf(evt.id);
    if (idx >= 0) {
      const progress = seq.filter(function (eid) {
        return s.triggeredEvents.includes(eid);
      }).length;
      if (idx < seq.length - 1)
        c.narr('system', '【事件链：' + ch.name + '】进度 ' + progress + '/' + seq.length, {
          isSpecial: true,
        });
    }
  }
  // Area corruption narrative
  if (typeof getAreaCorruptionNarrative === 'function') {
    const areaNarr = getAreaCorruptionNarrative(s.currentArea, s);
    if (areaNarr) c.narr('system', areaNarr, { isSpecial: true });
  }
  checkChainCompletion(s, c.narr);
  checkWrongInference(s, c.narr);
  // Conclusions
  const newConclusions = checkConclusions(s, ctx);
  for (const conc of newConclusions) {
    s.discoveredConclusions.push(conc.id);
    c.narr('system', '【结论达成】' + conc.name, { isSpecial: true });
    c.effects.push({ type: 'AUDIO_PLAY', id: 'clue_found' });
    conc.evidence.forEach(function (e) {
      c.narr('system', '  · ' + e);
    });
    conc.unlocks.forEach(function (u) {
      if (!hasClueId(s.clues, u)) {
        const _rn = resolveClueName(u);
        s.clues.push(_rn && _rn !== u ? { id: u, name: _rn } : u);
      }
    });
  }
  // False interpretations
  const falseInts = checkFalseInterpretations(s, ctx);
  for (const fi of falseInts)
    c.narr(
      'system',
      '【注意】你隐约觉得"' + fi.interpretation + '"这个想法不太对劲。' + (fi.consequence || ''),
      { isSpecial: true }
    );
  // Monster manifestation
  if ((c.rng ? c.rng.next() : Math.random()) < GAME_BALANCE.MONSTER_MANIFEST_CHANCE) {
    const creature = pick(['deep_ones', 'night_gaunts', 'shoggoth'], c.rng);
    const manifest = getMonsterManifestation(creature, s.day, ctx);
    if (manifest) {
      const stageNames = {
        absence: '异常',
        trace: '痕迹',
        influence: '影响',
        partial_presence: '阴影',
        full_presence: '出现',
      };
      c.narr(
        'system',
        '【' + (stageNames[manifest.stage] || '异常') + '】' + manifest.manifestation
      );
    }
  }
  // Behavior tracking
  if (evt.tags) {
    if (evt.tags.includes('fusion')) {
      c.bt.fusion_accepted_count = (c.bt.fusion_accepted_count || 0) + 1;
      c.bt.fusion_and_self_harm_total = (c.bt.fusion_and_self_harm_total || 0) + 1;
    }
    if (evt.tags.includes('possession'))
      c.bt.possession_accepted_count = (c.bt.possession_accepted_count || 0) + 1;
    if (evt.tags.includes('bell') || evt.tags.includes('thirteenth'))
      c.bt.thirteenth_bell_obsession = (c.bt.thirteenth_bell_obsession || 0) + 1;
    if (evt.tags.includes('meta') || evt.tags.includes('loop'))
      c.bt.meta_boundary_breaks = (c.bt.meta_boundary_breaks || 0) + 1;
    if (evt.tags.includes('sea') || evt.tags.includes('tide') || evt.tags.includes('harbor_deep'))
      c.bt.sea_acceptance_flags = (c.bt.sea_acceptance_flags || 0) + 1;
  }
  if (evt.event_classification === '超自然遭遇' || evt.event_classification === '怪物遭遇')
    c.bt.meta_boundary_breaks = (c.bt.meta_boundary_breaks || 0) + 1;
  c.log('探索：' + evt.name);
  if (!s.tutorialSeen.first_explore) s.tutorialSeen = { ...s.tutorialSeen, first_explore: true };
}

/**
 * Apply mechanical effects from temporary_madness_table.
 * Maps madness name to in-game consequences.
 */
function _applyMadnessEffects(mad, s, c, ctx) {
  var name = mad.name || '';
  // Panic flee: lose all remaining AP
  if (name === '恐慌逃跑') {
    s.ap = 0;
    c.narr('system', '你无法控制自己的双腿。剩余行动力耗尽。', { isEffect: true });
  }
  // Hysteria: extra SAN loss
  else if (name === '歇斯底里') {
    var extraSan = rand(1, 3, c.rng);
    applySanLoss(s, extraSan);
    c.narr('system', '你无法停止大笑/大哭。SAN -' + extraSan, { isEffect: true });
  }
  // Paranoia: NPC trust -1 for all known NPCs
  else if (name === '偏执妄想') {
    var npcs = Object.keys(s.npcTrust || {});
    for (var i = 0; i < npcs.length; i++) {
      if ((s.npcTrust[npcs[i]] || 0) > 0) {
        s.npcTrust[npcs[i]] = Math.max(0, s.npcTrust[npcs[i]] - 1);
      }
    }
    if (npcs.length > 0) c.narr('system', '你开始怀疑每一个人。所有NPC信任 -1。', { isEffect: true });
  }
  // Violence: HP loss to self
  else if (name === '暴力发作') {
    s.hp = Math.max(0, s.hp - 3);
    c.narr('system', '你失控了。HP -3。', { isEffect: true });
  }
  // Hallucination: extra SAN loss
  else if (name === '幻觉侵袭') {
    var hallSan = rand(1, 4, c.rng);
    applySanLoss(s, hallSan);
    c.narr('system', '幻觉吞没了你。SAN -' + hallSan, { isEffect: true });
  }
  // Amnesia: lose recent clues (narrative only, don't actually remove)
  else if (name === '失忆症') {
    c.narr('system', '你想不起来了……最近获得的线索变得模糊。（侦查检定 -10）', { isEffect: true });
    s._madnessSkillPenalty = { skill: '侦查', penalty: -10 };
  }
  // Catatonia: narrative only (AP already consumed by the event)
  else if (name === '僵直症') {
    c.narr('system', '你蜷缩在地上，无法动弹。闪避 -50。', { isEffect: true });
    s._madnessSkillPenalty = { skill: '闪避', penalty: -50 };
  }
  // Compulsion: AP cost doubled (flag for next actions)
  else if (name === '强迫行为') {
    c.narr('system', '你开始反复数数。接下来的行动消耗翻倍。', { isEffect: true });
    s._madnessApMultiplier = 2;
  }
  // Phantom pain: all checks -15
  else if (name === '幻痛') {
    c.narr('system', '剧烈的疼痛袭来——但你身上没有伤口。所有检定 -15。', { isEffect: true });
    s._madnessGlobalCheckPenalty = -15;
  }
  // Brief possession: mythos gain + extra SAN loss
  else if (name === '短暂附身') {
    var mythosGain = rand(1, 3, c.rng);
    var possSan = rand(1, 6, c.rng);
    s.mythosLevel = (s.mythosLevel || 0) + mythosGain;
    applySanLoss(s, possSan);
    c.narr('system', '你的嘴说出了不属于你的话。克苏鲁神话 +' + mythosGain + '，SAN -' + possSan, { isEffect: true });
    c.bt.possession_accepted_count = (c.bt.possession_accepted_count || 0) + 1;
  }
}

export function handleExploreAction(s, action, c, ctx) {
  switch (action.type) {
    case 'MOVE': {
      if (s.ap < 1) {
        narrApInsufficient(s, c.narr, 1);
        return s;
      }
      const target = action.areaId;
      const cur = getAreaInfo(s.currentArea, ctx);
      if (!cur || !cur.connected_areas.includes(target)) {
        c.narr('system', '无法到达该区域。');
        return s;
      }
      const targetArea = getAreaInfo(target, ctx);
      if (!targetArea) {
        c.narr('system', '未知区域。');
        return s;
      }
      if (!isAreaUnlocked(targetArea, s)) {
        c.narr('system', '你还没有找到通往' + targetArea.name + '的路径。也许需要更多线索。');
        return s;
      }
      s.ap -= action.cost || 1;
      var _fromArea = s.currentArea;
      s.currentArea = target;
      if (!s.visitedAreas.includes(target)) s.visitedAreas.push(target);
      // eventBus: notify listeners of area change
      try { emit('AREA_ENTERED', { areaId: target, fromArea: _fromArea }); } catch (e) {}
      if (target === 'harbor_district') {
        c.bt.harbor_visits = (c.bt.harbor_visits || 0) + 1;
        c.effects.push({ type: 'AUDIO_PLAY', id: 'harbor_water_omen' });
      }
      if (target === 'lighthouse')
        c.effects.push({ type: 'AUDIO_PLAY', id: 'lighthouse_lens_crack' });
      if (target === 'catacombs_entrance' || target === 'deep_catacombs')
        c.effects.push({ type: 'AUDIO_PLAY', id: 'catacombs_stone' });
      if (targetArea.danger_level > (s.stats_run.deepest_area_danger || 0))
        s.stats_run.deepest_area_danger = targetArea.danger_level;
      if (!s.lastVisitedDates) s.lastVisitedDates = {};
      s.lastVisitedDates = { ...s.lastVisitedDates, [target]: s.day };
      const displayName = getAreaDisplayName(targetArea, s);
      c.narr('system', '你前往了' + displayName + '。');
      // Light level affects text corruption (P2-1)
      const lightCorrPenalty =
        (s.lightLevel || 0) < (targetArea?.resource_pressure?.required_light_level || 0) ? 2 : 1;
      let desc = getSanTextVariant(targetArea.description, s.san, pick, ctx);
      // DESIGN_REFACTOR_NOTES.md: "光源<30%时，town_center描述轻度污染"
      desc = applyLightTextCorruption(desc, s.lightLevel || 0, ctx);
      // Mythos name alias for area descriptions
      desc = applyMythosAliases(desc, s.currentChapter || 'chapter_1', s.mythosLevel || 0, ctx);
      // Layout variants: weighted random selection based on game state
      if (targetArea.layout_variants && targetArea.layout_variants.length > 0) {
        const phase = getPhase(s.ap, s.maxAp);
        const isNight = phase === 'midnight' || phase === 'evening';
        const isRainy = s.weather === '雨天' || s.weather === '大雾';
        const visitCount = (s.visitedAreas || []).filter((a) => a === target).length;
        const eligible = targetArea.layout_variants.filter((v) => {
          if (v.id.endsWith('_dark') && !isNight) return false;
          if (v.id.endsWith('_flooded') && !isRainy) return false;
          if (v.id.endsWith('_wrecked') && visitCount < 2) return false;
          return true;
        });
        if (eligible.length > 0) {
          const totalW = eligible.reduce((t, v) => t + (v.weight || 1), 0);
          let r = (c.rng ? c.rng.next() : Math.random()) * totalW;
          let chosen = eligible[0];
          for (const v of eligible) {
            r -= v.weight || 1;
            if (r <= 0) {
              chosen = v;
              break;
            }
          }
          if (chosen.description) desc += '\n\n' + chosen.description;
        }
      }
      if (lightCorrPenalty > 1 && (c.rng ? c.rng.next() : Math.random()) < GAME_BALANCE.LIGHT_CORRUPTION_CHANCE)
        desc += '\n\n光线不足。你不确定自己看到的是不是真的。';
      // Phase 6: Resource-based text corruption on area descriptions
      desc = applyResourceTextCorruption(desc, s);
      // Area CSS class for atmospheric effects
      var areaCssClass = 'area-scene-' + target;
      c.narr('location', desc, {
        locationName: displayName,
        imageSrc: getAreaSceneImage(target, {
          ...c.view,
          visits: (s.visitedAreas || []).filter((a) => a === target).length,
        }),
        imageAlt: displayName,
        _areaClass: areaCssClass,
      });
      // Switch ambient to match new area
      try {
        const phase = getPhase(s.ap, s.maxAp);
        c.effects.push({ type: 'AUDIO_AMBIENT', area: target, phase: phase });
      } catch (e) {}
      if (
        targetArea.micro_events &&
        targetArea.micro_events.length > 0 &&
        (c.rng ? c.rng.next() : Math.random()) < GAME_BALANCE.MICRO_EVENT_CHANCE
      ) {
        const me = pick(targetArea.micro_events, c.rng);
        const meText = getSanTextVariant(me.description, s.san, pick, ctx);
        c.narr('system', meText, { type: '微事件' });
        if (me.effect)
          Object.entries(me.effect).forEach(([k, v]) => {
            if (k === 'SAN') applySanLoss(s, -v);
            if (k === 'HP') s.hp = clamp(s.hp + v, 0, s.maxHp);
          });
      }
      // Silent events: 15% chance on move
      if ((c.rng ? c.rng.next() : Math.random()) < GAME_BALANCE.SILENT_EVENT_ON_MOVE) checkSilentEvent(s, c.narr, target, GD);
      // SAN scene variants: location-based flavor text
      const sceneKeyMap = {
        harbor_district: 'harbor_water',
        voxchester_manor: 'hilda_portrait',
        catacombs_entrance: 'catacombs_entrance_text',
      };
      const sceneKey = sceneKeyMap[target];
      if (
        sceneKey &&
        s.san < GAME_BALANCE.SAN_SCENE_VARIANT_GATE &&
        (c.rng ? c.rng.next() : Math.random()) < GAME_BALANCE.SAN_SCENE_VARIANT_CHANCE
      ) {
        const sceneText = getSanSceneVariant(sceneKey, s.san, ctx);
        if (sceneText) c.narr('system', sceneText);
      }
      // Phase 6: Area corruption narrative on arrival
      if (typeof getAreaCorruptionNarrative === 'function') {
        const areaNarr = getAreaCorruptionNarrative(target, s);
        if (areaNarr) c.narr('system', areaNarr, { isSpecial: true });
      }
      s.objectives = checkObjCompletion(s.objectives, s);
      s.transition = 'move';
      c.log('前往' + displayName);
      if (!s.tutorialSeen.first_move) s.tutorialSeen = { ...s.tutorialSeen, first_move: true };
      return s;
    }
    case 'EXPLORE': {
      const _apCost = 2 * (s._madnessApMultiplier || 1);
      if (s.ap < _apCost) {
        narrApInsufficient(s, c.narr, _apCost);
        return s;
      }
      s.ap -= _apCost;
      // Phase 1: Chapter milestone (highest priority, inline — needs c.narr)
      {
        const _milestone = checkChapterMilestone(s.day, s);
        if (_milestone) {
          const _milestoneEvt = createMilestoneEvent(_milestone);
          s.triggeredEvents.push(_milestoneEvt.id);
          c.narr('event', _milestoneEvt.description, {
            eventTitle: _milestoneEvt.name,
            eventType: 'milestone',
            isSpecial: true,
          });
          if (_milestoneEvt.sanity_damage > 0) {
            const _adjDmg = adjustSanLossForFirstLoop(_milestoneEvt.sanity_damage, s);
            applySanLoss(s, _adjDmg);
            c.narr('system', 'SAN -' + _adjDmg, { isEffect: true });
          }
          if (_milestoneEvt._corruptionGain > 0) {
            s.safehouseCorruption = Math.min(
              100,
              (s.safehouseCorruption || 0) + _milestoneEvt._corruptionGain
            );
          }
          addRunMemory(s, _milestoneEvt.name, 'milestone');
        }
      }
      // Progress guard (clue nudge)
      const _guard = getForcedProgressGuard(s, ctx);
      if (_guard) executeForcedProgressGuard(_guard, s, c.narr);
      // Phase 2: Event selection via pure pipeline (extracted)
      const _sel = _selectExploreEvent(s, ctx, GD, c);
      let evt = _sel.evt;
      const _alreadyCommitted = _sel.alreadyCommitted;
      // No-event fallback chain (inline — needs c.narr + early return)
      if (!evt) {
        c.narr('system', '四周平静，暂时没有发现异常。');
        const chains = GD.event_chains || GD.module4_event_extensions?.event_chains || [];
        for (const ch of chains) {
          for (const eid of ch.sequence) {
            const fe =
              GD.events?.find((e) => e.id === eid) || GD.module4_events?.find((e) => e.id === eid);
            if (fe && !s.triggeredEvents.includes(eid) && checkTrigger(fe, s)) {
              c.narr('system', '【保底推进】你注意到一些之前忽略的细节。', { isSpecial: true });
              s.triggeredEvents.push(eid);
              var feText = applyQualityTier(fe.description, fe, s);
              c.narr('event', feText, {
                eventTitle: fe.name,
                eventType: fe.type || fe.event_classification,
                imageSrc:
                  getEventImage(fe.id) ||
                  getAreaSceneImage(s.currentArea, {
                    ...c.view,
                    visits: (s.visitedAreas || []).filter((a) => a === s.currentArea).length,
                  }),
                imageAlt: fe.name,
              });
              return s;
            }
          }
        }
        return s;
      }
      // SSOT guard: commitSelectedEvent writes triggeredEvents; skip if already done
      if (!s.triggeredEvents.includes(evt.id)) s.triggeredEvents.push(evt.id);
      // Phase 3: Event rendering + effects (inline — has early returns)
      let evtText = getDistortionVariant(evt, s) || evt.description;
      evtText = applyQualityTier(evtText, evt, s);
      // DESIGN_REFACTOR_NOTES.md: text corruption gated by unreliable_narration_level.
      // Events with level 0-1 skip SAN text corruption entirely (normal actions stay clean).
      // Only events with level 2+ get the full getSanTextVariant treatment.
      var unrelLevel = evt.unreliable_narration_level || 0;
      if (unrelLevel >= 2) {
        evtText = getPollutionText(getSanTextVariant(evtText, s.san, pick, ctx), s.pollution || 0);
      } else if (unrelLevel === 1) {
        // Light corruption only: pollution text but no SAN-based char mutation
        evtText = getPollutionText(evtText, s.pollution || 0);
      }
      // else: level 0 = completely clean text
      if (s.fearTuning && s.fearTuning.primary) evtText = applyFearLens(evt, evtText, s);
      evtText = applyTextHallucination(evtText, s.san, getSanStageFromGD);
      // Light source text corruption: low light causes unreliable text
      evtText = applyLightTextCorruption(evtText, s.lightLevel || 0, ctx);
      evtText = applyResourceTextCorruption(evtText, s);
      // Text variant tracking: cross-loop persistent (renamed from _seenTexts)
      if (!s.seenEventTexts) s.seenEventTexts = {};
      const _tvResult = getTrackedText(evt.id, evtText, s.pollution || 0, s.loopCount || 0, s.seenEventTexts);
      if (_tvResult.action !== 'skip') evtText = _tvResult.text;
      // Mythos name alias: replace true names with chapter-appropriate aliases
      evtText = applyMythosAliases(evtText, s.currentChapter || 'chapter_1', s.mythosLevel || 0, ctx);
      c.narr('event', evtText, {
        eventTitle: evt.name,
        eventType: evt.type || evt.event_classification,
        imageSrc:
          getEventImage(evt.id) ||
          getAreaSceneImage(s.currentArea, {
            ...c.view,
            visits: (s.visitedAreas || []).filter((a) => a === s.currentArea).length,
          }),
        imageAlt: evt.name,
        _ugcAuthor: evt._ugcAuthor || null,
      });
      if (evt.effects && evt.effects._meta_effect)
        applyMetaEffect(evt.effects._meta_effect, s, evt, c);
      // Choices / gamble early exits
      if (evt.choices && evt.choices.length > 0) {
        applyLegacyEffects(s, evt.effects);
        s.pendingChoice = { evt, choices: evt.choices };
        return s;
      }
      const gambleOpts = getGambleOptions(evt, s, ctx);
      if (gambleOpts) {
        s.pendingGamble = { evt, options: gambleOpts, apSpent: 2 };
        c.narr('system', '你感到某种冲动——是就此收手，还是更深入地探究？', { isSpecial: true });
        return s;
      }
      // Anchor + SAN damage + skill check + madness + death
      const anchorResult = processNormalAnchorEvent(evt, s);
      if (anchorResult.sanGain > 0) {
        applySanLoss(s, -anchorResult.sanGain);
        c.narr('san-recovery', anchorResult.text);
      } else if (anchorResult.text) c.narr('system', anchorResult.text, { isSpecial: true });
      let sanDmg = Math.abs(evt.sanity_damage || 0);
      if (sanDmg > 0) {
        const isChapter1 = s.day <= GAME_BALANCE.CHAPTER_1_DAY_LIMIT;
        const isMidnight = getPhase(s.ap, s.maxAp) === 'midnight';
        const ch1Cap = Math.abs(GD.systems?.sanity?.san_loss_scale?.chapter_1_cap || 5);
        if (isChapter1 && sanDmg > ch1Cap && !isMidnight) {
          sanDmg = ch1Cap;
          c.narr('system', '（你的直觉告诉你现在不应该深入探究。也许深夜再来会不同。）');
        }
        sanDmg = processSanLoss(
          sanDmg,
          s.inventory.map((i) => i.name),
          s.weather,
          s.day,
          s.difficulty,
          ctx
        );
        sanDmg = adjustSanLossForFirstLoop(sanDmg, s);
        // Loop shop mythos resistance: reduce mythos-type SAN damage
        if (s._shopMythosResistance > 0) {
          const isMythosEvent = (evt.type === 'mythos' || evt.event_classification === '神秘事件'
            || (evt.tags && evt.tags.includes('mythos')));
          if (isMythosEvent) {
            sanDmg = Math.max(1, Math.round(sanDmg * (1 - s._shopMythosResistance)));
          }
        }
        if (sanDmg > 0) {
          if (evt.skill_check) {
            c.effects.push({ type: 'AUDIO_SKILL', id: 'roll' });
            const check = doSkillCheck(
              evt.skill_check.skill,
              evt.skill_check.threshold || 50,
              s,
              s.difficulty,
              ctx
            );
            if (check.success) {
              c.effects.push({ type: 'AUDIO_SKILL', id: 'success' });
              sanDmg = Math.max(1, Math.round(sanDmg * 0.5));
              c.narr(
                'system',
                '【技能检定：' +
                  check.skillName +
                  '】掷骰 ' +
                  check.roll +
                  ' / 技能' +
                  check.playerSkill +
                  ' —— 成功！SAN损失减半。'
              );
              s.stats_run.checks_passed++;
            } else {
              c.effects.push({
                type: 'AUDIO_SKILL',
                id: check.isCritFail ? 'critical_fail' : 'fail',
              });
              c.narr(
                'system',
                '【技能检定：' +
                  check.skillName +
                  '】掷骰 ' +
                  check.roll +
                  ' / 技能' +
                  check.playerSkill +
                  ' —— 失败！'
              );
              s.stats_run.checks_failed++;
            }
          }
          applySanLoss(s, sanDmg, { trackStats: true, audio: true, effects: c.effects });
          c.narr('system', 'SAN -' + sanDmg, { isEffect: true });
          if (sanDmg >= GAME_BALANCE.SAN_LOSS_TRANSITION) s.transition = 'san-loss';
          if (sanDmg >= GAME_BALANCE.MEMORY_TRACK_THRESHOLD) {
            addRunMemory(
              s,
              '在' + (s.currentArea || '某处') + '遭遇了什么——SAN -' + sanDmg,
              'san_loss'
            );
            c.effects.push({ type: 'AUDIO_SAN_LOSS', amount: sanDmg });
          }
        }
      }
      applyLegacyEffects(s, evt.effects);
      if (sanDmg >= GAME_BALANCE.MADNESS_TRIGGER) {
        const mad = rollMadness(ctx);
        s.madnessActive = mad;
        c.effects.push({ type: 'INCREMENT_STAT', key: 'madness_count' });
        c.narr('madness', '【临时疯狂：' + mad.name + '】' + mad.description, { madness: mad });
        addRunMemory(s, '经历了临时疯狂——' + mad.name, 'madness');
        c.effects.push(
          { type: 'AUDIO_PLAY', id: 'madness' },
          { type: 'AUDIO_PLAY', id: 'madness_loop' }
        );
        // Apply mechanical effects from temporary_madness_table
        _applyMadnessEffects(mad, s, c, ctx);
      }
      {
        const deathCtx = resolveDeath(s, evt, null);
        if (deathCtx) applyDeathResolution(s, deathCtx, c.narr);
      }
      // Phase 4: Post-event processing (extracted)
      _postExploreProcessing(evt, s, c, GD);
      // Chapter 1 early whisper: 20% chance on Days 1-3, first loop only
      // Atmospheric — no AP cost, no game effect, pure unease.
      if (s.day <= 3 && s.loopCount <= 0 && (c.rng ? c.rng.next() : Math.random()) < 0.2) {
        var whispers = EARLY_WHISPERS[s.currentArea];
        if (whispers && whispers.length > 0) {
          c.narr('system', pick(whispers, c.rng), { isSpecial: true });
        }
      }
      // "Suspected bug" — phantom narrative line (0.3% at low SAN)
      maybeInjectPhantomNarrative(s.narrative, s.san);
      return s;
    }
    case 'DO_SKILL_CHECK': {
      if (!s.pendingEvent || s.pendingEvent.rolled) return s;
      const evt = s.pendingEvent;
      const sc = evt.effects?.skill_check;
      if (!sc) {
        s.pendingEvent = { ...evt, rolled: true, result: 'no_check' };
        return s;
      }
      c.effects.push({ type: 'AUDIO_SKILL', id: 'roll' });
      const result = doSkillCheck(sc.skill, sc.threshold || 50, s, s.difficulty, ctx);
      s.pendingEvent = {
        ...evt,
        rolled: true,
        result: result.success ? 'success' : 'failure',
        roll: result.roll,
        playerSkill: result.playerSkill,
        threshold: result.threshold,
      };
      if (result.success) {
        c.effects.push({ type: 'AUDIO_SKILL', id: 'success' });
        s.stats_run.checks_passed++;
        c.narr(
          'system',
          '【技能检定：' +
            result.skillName +
            '】掷骰 ' +
            result.roll +
            ' / 技能' +
            result.playerSkill +
            ' / 难度' +
            result.threshold +
            ' —— 成功！'
        );
        c.narr('system', sc.success?.text || sc.success || '检定成功。');
        if ((c.rng ? c.rng.next() : Math.random()) < GAME_BALANCE.SKILL_IMPROVE_CHANCE)
          s.skills[result.skillName] = (s.skills[result.skillName] || 0) + rand(1, 3, c.rng);
      } else {
        c.effects.push({ type: 'AUDIO_SKILL', id: result.isCritFail ? 'critical_fail' : 'fail' });
        s.stats_run.checks_failed++;
        c.narr(
          'system',
          '【技能检定：' +
            result.skillName +
            '】掷骰 ' +
            result.roll +
            ' / 技能' +
            result.playerSkill +
            ' / 难度' +
            result.threshold +
            ' —— 失败！' +
            (result.isCritFail ? '（大失败！）' : '')
        );
        c.narr('system', sc.failure?.text || sc.failure || '检定失败。');
      }
      return s;
    }
    default:
      return null;
  }
}
