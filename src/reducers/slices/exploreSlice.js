// src/reducers/slices/exploreSlice.js — Thin dispatcher for MOVE / EXPLORE / DO_SKILL_CHECK
// Domain logic lives in src/systems/explore/ (eventSelectionSystem, eventConsequenceSystem, madnessEffectSystem).

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
import { hasTriggered, syncTriggeredSet } from '../../utils/triggeredSet.js';
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
import { adjustSanLossForLoop23, getSanFloor, shouldBlockLethalEvent, adjustMonsterChance } from '../../systems/firstLoopBalance.js';
import { getTrackedText, createSeenTextMap, applyMythosAliases, maybeInjectPhantomNarrative, applyLevel13RealityDistortion } from '../../systems/textVariants.js';
import { getLightLevelEffects, applyLightTextCorruption } from '../miscReducer.js';
import { getAreaDescriptionVariant } from '../../data/areaDescriptionVariants.js';
import { getInvestigationDetail } from '../../data/areaInvestigationDetails.js';
import { getPlayerTraceNarrative } from '../../systems/playerTraces.js';
import { checkChainCompletion, isAreaUnlocked, getAreaDisplayName } from '../../utils/gameHelpers.js';
import { hasClueId, resolveClueName } from '../../utils/clueNameMap.js';
import { getEventImage } from '../../portraitMap.js';
import { getAreaCorruptionNarrative } from '../../systems/worldDecay.js';
import { applyResourceTextCorruption } from '../../systems/resourceNarrative.js';
import { getForcedProgressGuard, executeForcedProgressGuard } from '../objectiveReducer.js';
import { checkChapterMilestone, createMilestoneEvent, getDistortionVariant } from '../../engine/EventEngine.js';
import { generateFakeOptions, processFakeChoice, getNegativeEventWeightMultiplier, getSafeEventWeightMultiplier } from '../../systems/sanConsequenceChain.js';
import { getRarityHint } from '../../systems/eventRarity.js';
import { applyTextFragmentation } from '../../systems/textFragmentation.js';

// Domain logic (src/systems/explore/)
import { _selectExploreEvent } from '../../systems/explore/eventSelectionSystem.js';
import { applyMetaEffect, applyQualityTier, _postExploreProcessing } from '../../systems/explore/eventConsequenceSystem.js';
import { _applyMadnessEffects } from '../../systems/explore/madnessEffectSystem.js';

// Re-export helpers used by other reducers
export { _selectExploreEvent } from '../../systems/explore/eventSelectionSystem.js';
export { applyMetaEffect, applyQualityTier, _postExploreProcessing } from '../../systems/explore/eventConsequenceSystem.js';

export function handleExploreAction(s, action, c, ctx) {
  var GD = ctx.GD;
  switch (action.type) {
    case 'MOVE': {
      if (s.ap < 1) {
        narrApInsufficient(s, c.narr, 1);
        return null;
      }
      const target = action.areaId;
      const cur = getAreaInfo(s.currentArea, ctx);
      if (!cur || !cur.connected_areas.includes(target)) {
        c.narr('system', '无法到达该区域。');
        return null;
      }
      const targetArea = getAreaInfo(target, ctx);
      if (!targetArea) {
        c.narr('system', '未知区域。');
        return null;
      }
      if (!isAreaUnlocked(targetArea, s)) {
        c.narr('system', '你还没有找到通往' + targetArea.name + '的路径。也许需要更多线索。');
        return null;
      }
      s.ap -= action.cost || 1;
      // AP 消耗音效反馈
      if (s.ap <= 2 && s.ap > 0) {
        c.effects.push({ type: 'AUDIO_PLAY', id: 'ui_error' });        // AP 紧张：轻微警告音
      } else if (s.ap <= 0) {
        c.effects.push({ type: 'AUDIO_PLAY', id: 'ui_click_forbidden' }); // AP 耗尽：沉重提示音
      }
      var _fromArea = s.currentArea;
      s.currentArea = target;
      if (!s.visitedAreas.includes(target)) s.visitedAreas.push(target);
      // NOTE: loop_area_visits removed — description_variants now keyed to loopCount, not per-visit
      // (per-visit causes same-loop text churn; loopCount gives cross-loop déjà vu)
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
      let desc = getSanTextVariant(targetArea.description, s.san, pick, ctx, c.rng);
      // DESIGN_REFACTOR_NOTES.md: "光源<30%时，town_center描述轻度污染"
      desc = applyLightTextCorruption(desc, s.lightLevel || 0, ctx, c.rng);
      // Visit-level description variants: progressive déjà vu (visit 2+)
      var visitCount = (s.visitedAreas || []).filter(function(a) { return a === target; }).length;
      if (visitCount >= 2) {
        var tier = visitCount <= 3 ? 'visit_2_3' : visitCount <= 6 ? 'visit_4_6' : 'visit_7_plus';
        var variant = getAreaDescriptionVariant(target, tier);
        if (variant) {
          var cleanVariant = variant.replace(/\\n/g, '\n');
          desc = desc + '\n\n' + cleanVariant;
        }
      }
      // Mythos name alias for area descriptions
      desc = applyMythosAliases(desc, s.currentChapter || 'chapter_1', s.mythosLevel || 0, ctx);
      // Text Fragmentation for area descriptions (SAN-driven)
      desc = applyTextFragmentation(desc, s.san, c.rng, { isCritical: false });
      // Investigation detail: loop/SAN/death-conditioned ambient observation
      var invDetail = getInvestigationDetail(target, s, c.rng);
      if (invDetail) {
        desc = desc + '\n\n' + invDetail;
      }
      // Player trace: last loop's actions leave marks in the environment (P2-6)
      var traceNarr = getPlayerTraceNarrative(target, s);
      if (traceNarr) {
        desc = desc + '\n\n' + traceNarr;
      }
      // Layout variants: weighted random selection based on game state
      if (targetArea.layout_variants && targetArea.layout_variants.length > 0) {
        const phase = getPhase(s.ap, s.maxAp);
        const isNight = phase === 'midnight' || phase === 'evening';
        const isRainy = s.weather === '雨天' || s.weather === '大雾';
        var visitCount2 = (s.visitedAreas || []).filter((a) => a === target).length;
        const eligible = targetArea.layout_variants.filter((v) => {
          if (v.id.endsWith('_dark') && !isNight) return false;
          if (v.id.endsWith('_flooded') && !isRainy) return false;
          if (v.id.endsWith('_wrecked') && visitCount2 < 2) return false;
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
      desc = applyResourceTextCorruption(desc, s, c.rng);
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
        const meText = getSanTextVariant(me.description, s.san, pick, ctx, c.rng);
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
      const areaNarr = getAreaCorruptionNarrative(target, s, c.rng);
      if (areaNarr) c.narr('system', areaNarr, { isSpecial: true });
      s.objectives = checkObjCompletion(s.objectives, s);
      s.transition = 'move';
      c.log('前往' + displayName);
      if (!s.tutorialSeen.first_move) s.tutorialSeen = { ...s.tutorialSeen, first_move: true };
      return null;
    }
    case 'EXPLORE': {
      const _apCost = 2 * (s._madnessApMultiplier || 1);
      if (s.ap < _apCost) {
        narrApInsufficient(s, c.narr, _apCost);
        return null;
      }
      s.ap -= _apCost;
      // AP 消耗音效反馈（探索后AP紧张时提醒）
      if (s.ap <= 2 && s.ap > 0) {
        c.effects.push({ type: 'AUDIO_PLAY', id: 'ui_error' });
      } else if (s.ap <= 0) {
        c.effects.push({ type: 'AUDIO_PLAY', id: 'ui_click_forbidden' });
      }
      // AP 紧张时切换背景音乐到夜间氛围（营造紧迫感）
      if (s.ap <= 3 && s.ap > 0) {
        try {
          var _phase = getPhase(s.ap, s.maxAp);
          c.effects.push({ type: 'AUDIO_AMBIENT', area: s.currentArea, phase: _phase });
        } catch (e) {}
      }
      // Phase 1: Chapter milestone (highest priority, inline — needs c.narr)
      {
        const _milestone = checkChapterMilestone(s.day, s);
        if (_milestone) {
          const _milestoneEvt = createMilestoneEvent(_milestone);
          s.triggeredEvents.push(_milestoneEvt.id);
          syncTriggeredSet(s, _milestoneEvt.id);
          c.narr('event', _milestoneEvt.description, {
            eventTitle: _milestoneEvt.name,
            eventType: 'milestone',
            isSpecial: true,
          });
          if (_milestoneEvt.sanity_damage > 0) {
            const _adjDmg = adjustSanLossForLoop23(_milestoneEvt.sanity_damage, s);
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
      const _guard = getForcedProgressGuard(s, ctx, c.rng);
      if (_guard) executeForcedProgressGuard(_guard, s, c.narr);
      // Phase 2: Event selection via pure pipeline (delegated)
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
            if (fe && !hasTriggered(s, eid) && checkTrigger(fe, s)) {
              c.narr('system', '【保底推进】你注意到一些之前忽略的细节。', { isSpecial: true });
              s.triggeredEvents.push(eid);
              syncTriggeredSet(s, eid);
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
              return null;
            }
          }
        }
        return null;
      }
      // SSOT guard: commitSelectedEvent writes triggeredEvents; skip if already done
      if (!hasTriggered(s, evt.id)) {
        s.triggeredEvents.push(evt.id);
        syncTriggeredSet(s, evt.id);
      }
      // Environment narrative: description_variants keyed to loopCount (cross-loop déjà vu)
      // 同一轮回内文字不变，新轮回才升级 — 避免同轮回多次往返导致精分
      if (evt.description_variants) {
        var _loop = (s.loopCount || 0) + 1; // 1-indexed: loopCount=0 means first loop
        var _dv = evt.description_variants;
        if (_loop <= 1) {
          // Loop 1: original description (no change)
        } else if (_loop <= 3) {
          evt.description = _dv.visit_2_3 || evt.description;
        } else if (_loop <= 6) {
          evt.description = _dv.visit_4_6 || _dv.visit_2_3 || evt.description;
        } else {
          evt.description = _dv.visit_7_plus || _dv.visit_4_6 || evt.description;
        }
      }
      // Player action echo: if an NPC died in previous loop, their area has a faint overlay
      // 原则：不说破。不提到NPC名字。只是一句淡淡的感受。让玩家自己毛。
      if (evt.echo_overlay && s.loopEchoes && s.loopEchoes.deadNpcAreas) {
        var _currentArea = s.currentArea || '';
        if (s.loopEchoes.deadNpcAreas.indexOf(_currentArea) >= 0) {
          evt.description = evt.description + '\n\n' + evt.echo_overlay;
        }
      }
      // Phase 3: Event rendering + effects (inline — has early returns)
      let evtText = getDistortionVariant(evt, s, c.rng) || evt.description;
      evtText = applyQualityTier(evtText, evt, s);
      // DESIGN_REFACTOR_NOTES.md: text corruption gated by unreliable_narration_level.
      // Events with level 0-1 skip SAN text corruption entirely (normal actions stay clean).
      // Only events with level 2+ get the full getSanTextVariant treatment.
      var unrelLevel = evt.unreliable_narration_level || 0;
      if (unrelLevel >= 2) {
        evtText = getPollutionText(getSanTextVariant(evtText, s.san, pick, ctx, c.rng), s.pollution || 0, c.rng);
      } else if (unrelLevel === 1) {
        // Light corruption only: pollution text but no SAN-based char mutation
        evtText = getPollutionText(evtText, s.pollution || 0, c.rng);
      }
      // else: level 0 = completely clean text
      if (s.fearTuning && s.fearTuning.primary) evtText = applyFearLens(evt, evtText, s, c.rng);
      evtText = applyTextHallucination(evtText, s.san, getSanStageFromGD, c.rng);
      // Light source text corruption: low light causes unreliable text
      evtText = applyLightTextCorruption(evtText, s.lightLevel || 0, ctx, c.rng);
      evtText = applyResourceTextCorruption(evtText, s, c.rng);
      // Text variant tracking: cross-loop persistent (renamed from _seenTexts)
      if (!s.seenEventTexts) s.seenEventTexts = {};
      const _tvResult = getTrackedText(evt.id, evtText, s.pollution || 0, s.loopCount || 0, s.seenEventTexts, s.difficultyLevel);
      if (_tvResult.action !== 'skip') evtText = _tvResult.text;
      // Mythos name alias: replace true names with chapter-appropriate aliases
      evtText = applyMythosAliases(evtText, s.currentChapter || 'chapter_1', s.mythosLevel || 0, ctx);
      // Level 13 (十三钟响): reality distortion text effects
      evtText = applyLevel13RealityDistortion(evtText, s.difficultyLevel, c.rng);
      // ── Text Fragmentation (SAN-driven) ──────────────────
      // High SAN = intact text. Low SAN = words cross out, vanish, reorder.
      // Critical events (signature/ending/once_per_run) get milder treatment.
      var isCriticalEvent = evt.tier === 'signature' || evt.tier === 'ending' || evt.once_per_run;
      evtText = applyTextFragmentation(evtText, s.san, c.rng, {
        isCritical: isCriticalEvent,
        maxSeverity: s.difficultyLevel >= 13 ? 6 : 5, // Lv13 allows full severity
        loopCount: s.loopCount || 0,        // progressive degradation each loop
        difficultyLevel: s.difficultyLevel,  // high difficulty boosts corruption
      });
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
      // SAN consequence chain: inject fake options at level 4+
      {
        var _sanLevel = getSanStageFromGD(s.san).level || 0;
        if (_sanLevel >= 4) {
          generateFakeOptions(evt, _sanLevel, c.rng);
        }
      }
      // Choices / gamble early exits
      if (evt.choices && evt.choices.length > 0) {
        applyLegacyEffects(s, evt.effects, c.rng);
        s.pendingChoice = { evt, choices: evt.choices };
        return null;
      }
      const gambleOpts = getGambleOptions(evt, s, ctx, c.rng);
      if (gambleOpts) {
        s.pendingGamble = { evt, options: gambleOpts, apSpent: 2 };
        c.narr('system', '你感到某种冲动——是就此收手，还是更深入地探究？', { isSpecial: true });
        return null;
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
        sanDmg = adjustSanLossForLoop23(sanDmg, s);
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
              ctx,
              c.rng
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
      applyLegacyEffects(s, evt.effects, c.rng);
      if (sanDmg >= GAME_BALANCE.MADNESS_TRIGGER) {
        const mad = rollMadness(ctx, c.rng);
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
        if (deathCtx) {
          // Count SAN collapse for cross-loop madness memory legacy
          if (deathCtx.mode === 'san' || deathCtx.mode === 'hybrid')
            s.sanityCollapseCount = (s.sanityCollapseCount || 0) + 1;
          applyDeathResolution(s, deathCtx, c.narr, ctx);
        }
      }
      // Phase 4: Post-event processing (delegated)
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
      maybeInjectPhantomNarrative(s.narrative, s.san, c.rng);
      return null;
    }
    case 'DO_SKILL_CHECK': {
      if (!s.pendingEvent || s.pendingEvent.rolled) return null;
      const evt = s.pendingEvent;
      const sc = evt.effects?.skill_check;
      if (!sc) {
        s.pendingEvent = { ...evt, rolled: true, result: 'no_check' };
        return null;
      }
      c.effects.push({ type: 'AUDIO_SKILL', id: 'roll' });
      const result = doSkillCheck(sc.skill, sc.threshold || 50, s, s.difficulty, ctx, c.rng);
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
      return null;
    }
    default:
      return null;
  }
}
