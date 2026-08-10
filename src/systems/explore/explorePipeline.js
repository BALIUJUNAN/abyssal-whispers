// src/systems/explore/explorePipeline.js — EXPLORE action orchestrator.
// Extracted from exploreSlice.js (lines 216-521).
// Composes 6 phases: milestone → progress guard → selection → rendering → consequences → post-processing.

import {
  checkChapterMilestone,
  createMilestoneEvent,
  getDistortionVariant,
} from '../../engine/EventEngine.js';
import { syncTriggeredSet } from '../../utils/triggeredSet.js';
import { adjustSanLossForLoop23 } from '../../systems/firstLoopBalance.js';
import {
  getForcedProgressGuard,
  executeForcedProgressGuard,
} from '../../reducers/objectiveReducer.js';
import { checkTrigger } from '../../reducers/eventReducer.js';
import { hasTriggered } from '../../utils/triggeredSet.js';
import { _selectExploreEvent } from './eventSelectionSystem.js';
import { applyQualityTier, _postExploreProcessing } from './eventConsequenceSystem.js';
import { applyMetaEffect } from './eventConsequenceSystem.js';
import { applyLegacyEffects } from '../../reducers/effectReducer.js';
import { getSanStageFromGD, processSanLoss, rollMadness } from '../../reducers/sanReducer.js';
import { applySanLoss } from '../../reducers/utils.js';
import {
  doSkillCheck,
  getGambleOptions,
  processNormalAnchorEvent,
} from '../../reducers/eventReducer.js';
import { _applyMadnessEffects } from './madnessEffectSystem.js';
import { resolveDeath } from '../../reducers/deathSystem.js';
import { generateFakeOptions } from '../../systems/sanConsequenceChain.js';
import {
  addRunMemory,
  applyDeathResolution,
  narrApInsufficient,
  checkSilentEvent,
} from '../../utils/appHelpers.js';
import { EARLY_WHISPERS } from '../../systems/earlyHooks.js';
import { getPollutionText } from '../../reducers/loopReducer.js';
import { applyFearLens } from '../../systems/fearLens.js';
import { applyTextHallucination } from '../../engine/PollutionManager.js';
import { GAME_BALANCE } from '../../state/gameConstants.js';
import { getEventImage, getAreaSceneImage } from '../../portraitMap.js';
import { renderEventText, narrateEvent } from './textRenderingPipeline.js';
import { pick } from '../../reducers/utils.js';
import { getPhase } from '../../engine/WorldTimeSystem.js';
import { maybeInjectPhantomNarrative } from '../../systems/textVariants.js';

// ── Phase 1: Chapter milestone ─────────────────────────────────────

function handleMilestonePhase(s, ctx, c, GD) {
  var _milestone = checkChapterMilestone(s.day, s);
  if (!_milestone) return null;
  var _milestoneEvt = createMilestoneEvent(_milestone);
  s.triggeredEvents.push(_milestoneEvt.id);
  syncTriggeredSet(s, _milestoneEvt.id);
  c.narr('event', _milestoneEvt.description, {
    eventTitle: _milestoneEvt.name,
    eventType: 'milestone',
    isSpecial: true,
  });
  if (_milestoneEvt.sanity_damage > 0) {
    var _adjDmg = adjustSanLossForLoop23(_milestoneEvt.sanity_damage, s);
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
  return null;
}

// ── Phase 2a: Progress guard ────────────────────────────────────────

function handleProgressGuard(s, ctx, c, GD) {
  var _guard = getForcedProgressGuard(s, ctx, c.rng);
  if (!_guard) return null;
  executeForcedProgressGuard(_guard, s, c.narr);
  return null;
}

// ── Phase 2: Event selection + fallback chain ──────────────────────

function handleEventSelection(s, ctx, c, GD) {
  var _sel = _selectExploreEvent(s, ctx, GD, c);
  var evt = _sel.evt;
  var _alreadyCommitted = _sel.alreadyCommitted;

  // No-event fallback chain
  if (!evt) {
    c.narr('system', '四周平静，暂时没有发现异常。');
    var chains = GD.event_chains || GD.module4_event_extensions?.event_chains || [];
    for (var ci = 0; ci < chains.length; ci++) {
      var ch = chains[ci];
      for (var ei = 0; ei < ch.sequence.length; ei++) {
        var eid = ch.sequence[ei];
        var fe =
          GD.events &&
          GD.events.find(function (e) {
            return e.id === eid;
          });
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
                visits: (s.visitedAreas || []).filter(function (a) {
                  return a === s.currentArea;
                }).length,
              }),
            imageAlt: fe.name,
          });
          return null;
        }
      }
    }
    return null;
  }

  // Commit event (SSOT guard)
  if (!hasTriggered(s, evt.id)) {
    s.triggeredEvents.push(evt.id);
    syncTriggeredSet(s, evt.id);
  }
  return evt;
}

// ── Phase 3: Event rendering ───────────────────────────────────────

function handleEventRendering(evt, s, ctx, c) {
  // Event definitions belong to shared GD. Low-SAN fake choices are runtime
  // state, so clone the event and its choice list before injecting them.
  var runtimeEvt = {
    ...evt,
    choices: Array.isArray(evt.choices) ? evt.choices.map(function (choice) { return { ...choice }; }) : evt.choices,
  };
  var evtText = renderEventText(runtimeEvt, s, ctx, c);
  narrateEvent(runtimeEvt, evtText, s, c);

  // Meta effects
  if (runtimeEvt.effects && runtimeEvt.effects._meta_effect)
    applyMetaEffect(runtimeEvt.effects._meta_effect, s, runtimeEvt, c);

  // SAN consequence chain: inject fake options at level 4+
  {
    var _sanLevel = getSanStageFromGD(s.san).level || 0;
    if (_sanLevel >= 4) {
      generateFakeOptions(runtimeEvt, _sanLevel, c.rng);
    }
  }

  // Choices / gamble early exits
  if (runtimeEvt.choices && runtimeEvt.choices.length > 0) {
    applyLegacyEffects(s, runtimeEvt.effects, c.rng);
    s.pendingChoice = { evt: runtimeEvt, choices: runtimeEvt.choices };
    return 'choice';
  }
  var gambleOpts = getGambleOptions(runtimeEvt, s, ctx, c.rng);
  if (gambleOpts) {
    s.pendingGamble = { evt: runtimeEvt, options: gambleOpts, apSpent: 2 };
    c.narr('system', '你感到某种冲动——是就此收手，还是更深入地探究？', { isSpecial: true });
    return 'gamble';
  }

  return 'continue';
}

// ── Phase 4: SAN damage, madness, death ────────────────────────────

function handleConsequences(evt, s, ctx, c, GD) {
  // Anchor / normal event processing
  var anchorResult = processNormalAnchorEvent(evt, s);
  if (anchorResult.sanGain > 0) {
    applySanLoss(s, -anchorResult.sanGain);
    c.narr('san-recovery', anchorResult.text);
  } else if (anchorResult.text) {
    c.narr('system', anchorResult.text, { isSpecial: true });
  }

  // SAN damage calculation
  // Chapter events still store SAN loss in the legacy `effects.san` field,
  // while newer events use `sanity_damage`.  Normalize both protocols here
  // so legacy events do not silently skip their declared skill checks.
  var legacySan = evt.effects && typeof evt.effects.san === 'number' ? evt.effects.san : 0;
  var usesLegacySan = evt.sanity_damage == null && legacySan < 0;
  var sanDmg = Math.abs(evt.sanity_damage != null ? evt.sanity_damage : Math.min(0, legacySan));
  if (sanDmg > 0) {
    var isChapter1 = s.day <= GAME_BALANCE.CHAPTER_1_DAY_LIMIT;
    var isMidnight = getPhase(s.ap, s.maxAp) === 'midnight';
    var ch1Cap = Math.abs(
      GD.systems && GD.systems.sanity && GD.systems.sanity.san_loss_scale
        ? GD.systems.sanity.san_loss_scale.chapter_1_cap
        : 5
    );
    if (isChapter1 && sanDmg > ch1Cap && !isMidnight) {
      sanDmg = ch1Cap;
      c.narr('system', '（你的直觉告诉你现在不应该深入探究。也许深夜再来会不同。）');
    }
    sanDmg = processSanLoss(
      sanDmg,
      s.inventory.map(function (i) {
        return i.name;
      }),
      s.weather,
      s.day,
      s.difficulty,
      ctx
    );
    sanDmg = adjustSanLossForLoop23(sanDmg, s);
    if (s._shopMythosResistance > 0) {
      var isMythosEvent =
        evt.type === 'mythos' ||
        evt.event_classification === '神秘事件' ||
        (evt.tags && evt.tags.indexOf('mythos') >= 0);
      if (isMythosEvent) {
        sanDmg = Math.max(1, Math.round(sanDmg * (1 - s._shopMythosResistance)));
      }
    }
    if (sanDmg > 0) {
      if (evt.skill_check) {
        c.effects.push({ type: 'AUDIO_SKILL', id: 'roll' });
        var check = doSkillCheck(
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
          var successFlag = evt.id + '_skill_success';
          if (!hasTriggered(s, successFlag)) {
            s.triggeredEvents.push(successFlag);
            syncTriggeredSet(s, successFlag);
          }
          if (evt.skill_check.success) {
            if (evt.skill_check.success.text)
              c.narr('system', evt.skill_check.success.text, { isSpecial: true });
            applyLegacyEffects(s, evt.skill_check.success.effects, c.rng);
          }
        } else {
          c.effects.push({ type: 'AUDIO_SKILL', id: check.isCritFail ? 'critical_fail' : 'fail' });
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
          var failureFlag = evt.id + '_skill_failure';
          if (!hasTriggered(s, failureFlag)) {
            s.triggeredEvents.push(failureFlag);
            syncTriggeredSet(s, failureFlag);
          }
          var failureResult = check.isCritFail
            ? evt.skill_check.critical_failure
            : evt.skill_check.failure;
          if (failureResult) {
            if (failureResult.text) c.narr('system', failureResult.text, { isSpecial: true });
            applyLegacyEffects(s, failureResult.effects, c.rng);
          }
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

  // Legacy effects
  // The normalized legacy SAN loss was already applied above.  Remove only
  // that field before forwarding the remaining event effects.
  if (usesLegacySan) {
    var remainingEffects = { ...evt.effects };
    delete remainingEffects.san;
    applyLegacyEffects(s, remainingEffects, c.rng);
  } else {
    applyLegacyEffects(s, evt.effects, c.rng);
  }

  // Madness
  if (sanDmg >= GAME_BALANCE.MADNESS_TRIGGER) {
    var mad = rollMadness(ctx, c.rng);
    s.madnessActive = mad;
    c.effects.push({ type: 'INCREMENT_STAT', key: 'madness_count' });
    c.narr('madness', '【临时疯狂：' + mad.name + '】' + mad.description, { madness: mad });
    addRunMemory(s, '经历了临时疯狂——' + mad.name, 'madness');
    c.effects.push(
      { type: 'AUDIO_PLAY', id: 'madness' },
      { type: 'AUDIO_PLAY', id: 'madness_loop' }
    );
    _applyMadnessEffects(mad, s, c, ctx);
  }

  // Death resolution
  {
    var deathCtx = resolveDeath(s, evt, null, c.rng);
    if (deathCtx) {
      if (deathCtx.mode === 'san' || deathCtx.mode === 'hybrid')
        s.sanityCollapseCount = (s.sanityCollapseCount || 0) + 1;
      applyDeathResolution(s, deathCtx, c.narr, ctx, c.rng);
    }
  }
}

// ── Phase 5: Post-event processing ─────────────────────────────────

function handlePostProcessing(evt, s, c, GD) {
  _postExploreProcessing(evt, s, c, GD);

  // Chapter 1 early whisper: 20% chance on Days 1-3, first loop only
  if (s.day <= 3 && s.loopCount <= 0 && c.rng.next() < 0.2) {
    var whispers = EARLY_WHISPERS[s.currentArea];
    if (whispers && whispers.length > 0) {
      c.narr('system', pick(whispers, c.rng), { isSpecial: true });
    }
  }
  // "Suspected bug" — phantom narrative line (0.3% at low SAN)
  maybeInjectPhantomNarrative(s.narrative, s.san, c.rng);
}

// ── Main EXPLORE handler ───────────────────────────────────────────

export function handleExplore(s, action, c, ctx) {
  if (!s) return null;
  var GD = ctx.GD;

  var _apCost = 2 * (s._madnessApMultiplier || 1);
  if (s.ap < _apCost) {
    narrApInsufficient(s, c.narr, _apCost);
    return null;
  }
  s.ap -= _apCost;
  c.effects.push({ type: 'AUDIO_PLAY', id: 'investigate_search' });
  if (s.ap <= 2 && s.ap > 0) {
    c.effects.push({ type: 'AUDIO_PLAY', id: 'ui_error' });
  } else if (s.ap <= 0) {
    c.effects.push({ type: 'AUDIO_PLAY', id: 'ui_click_forbidden' });
  }
  if (s.ap <= 3 && s.ap > 0) {
    try {
      var _phase = getPhase(s.ap, s.maxAp);
      c.effects.push({ type: 'AUDIO_AMBIENT', area: s.currentArea, phase: _phase });
    } catch (e) {}
  }

  // Phase 1: Milestone (inline — needs c.narr + state mutation)
  handleMilestonePhase(s, ctx, c, GD);
  // Phase 2a: Progress guard
  handleProgressGuard(s, ctx, c, GD);
  // Phase 2b: Event selection + fallback (may return null = no event)
  var evt = handleEventSelection(s, ctx, c, GD);
  if (!evt) return null;

  // Phase 3: Rendering (may return 'choice' or 'gamble' = early exit)
  var renderResult = handleEventRendering(evt, s, ctx, c);
  if (renderResult === 'choice' || renderResult === 'gamble') return null;

  // Phase 4: Consequences (SAN, madness, death)
  handleConsequences(evt, s, ctx, c, GD);
  // Phase 5: Post-processing
  handlePostProcessing(evt, s, c, GD);

  return null;
}
