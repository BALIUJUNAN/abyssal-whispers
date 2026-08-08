// src/reducers/slices/uiSlice.js — Zustand-native action handlers
// Migrated from gameReducer bridge (Step 1 of Zustand migration).
//
// Signature: (draft, action, c, ctx) => null | object
//   draft    — immer proxy (mutate in place, do NOT return new state)
//   action   — { type, ...payload }
//   c        — { narr, log, effects, bt, rng } (reducer context, close over draft)
//   ctx      — { GD } (game data)
//
// Handlers mutate draft directly. Return null = handled.
// Effects collected in c.effects, flushed after set() by dispatch router.

import { rand, clamp, pick, applySanLoss } from '../utils.js';
import { processSanLoss, rollMadness } from '../sanReducer.js';
import { doSkillCheck } from '../eventReducer.js';
import { applyLegacyEffects } from '../effectReducer.js';
import { checkObjCompletion } from '../objectiveReducer.js';
import { resolveDeath } from '../deathSystem.js';
import {
  initPrologueState,
  handlePrologueChoice,
  handleSkipPrologue,
  getPrologueEvent,
} from '../prologueReducer.js';
import { addRunMemory, applyDeathResolution } from '../../utils/appHelpers.js';
import { getItemDef, useItemByDef, buyFromShop } from '../miscReducer.js';
import { hasClueId } from '../../utils/clueNameMap.js';
import { initSkills } from '../../utils/gameHelpers.js';
import { processFakeChoice } from '../../systems/sanConsequenceChain.js';

export function handleUiAction(draft, action, c, ctx) {
  var GD = ctx.GD;

  switch (action.type) {
    case 'ADD_NARRATIVE': {
      var narrativeEntry = action.entry || {};
      if (narrativeEntry.text) {
        var narrativeExtra = { ...narrativeEntry };
        delete narrativeExtra.text;
        delete narrativeExtra.type;
        c.narr(narrativeEntry.type || 'normal', narrativeEntry.text, narrativeExtra);
      }
      return null;
    }
    case 'ADD_EVENT_LOG': {
      var logEntry = action.entry || {};
      if (logEntry.text) {
        draft.eventLog.push({
          day: logEntry.day || draft.day,
          text: logEntry.text,
          type: logEntry.type || 'event',
          timestamp: logEntry.timestamp || c.now(),
        });
        if (draft.eventLog.length > 200) draft.eventLog = draft.eventLog.slice(-200);
      }
      return null;
    }
    case 'CHOICE_SELECT': {
      var pc = draft.pendingChoice;
      if (!pc) return null;
      var choiceIdx = action.choiceIdx;
      var choice = pc.choices[choiceIdx];
      if (!choice) {
        draft.pendingChoice = null;
        draft.objectives = checkObjCompletion(draft.objectives, draft);
        return null;
      }
      draft.pendingChoice = null;
      // SAN consequence: check if this is a fake option and apply hidden penalty
      var fakeResult = processFakeChoice(choice, draft, c);
      if (fakeResult) {
        c.narr('system', fakeResult, { isSpecial: true });
        c.log('选择了虚假选项：' + (choice._originalLabel || choice.label));
      } else {
        c.narr('system', choice.text, { isSpecial: true });
        applyLegacyEffects(draft, choice.effects, c.rng);
      }
      // Death check after choice effects (unified via applyDeathResolution)
      {
        var deathCtx = resolveDeath(draft, pc.evt, choice);
        if (deathCtx) applyDeathResolution(draft, deathCtx, c.narr, ctx);
      }
      draft.objectives = checkObjCompletion(draft.objectives, draft);
      c.log('选择：' + choice.label);
      return null;
    }
    case 'DISMISS_PENDING':
      draft.pendingEvent = null;
      draft.pendingNpc = null;
      draft.pendingGamble = null;
      draft.pendingChoice = null;
      draft.objectives = checkObjCompletion(draft.objectives, draft);
      return null;
    case 'CLEAR_TRANSITION':
      draft.transition = null;
      return null;
    case 'AUDIO_MUTE_TOGGLE':
      draft.audioMuted = !draft.audioMuted;
      c.effects.push({ type: 'AUDIO_SET_MUTED', muted: draft.audioMuted });
      return null;
    case 'ACCESSIBILITY_TOGGLE': {
      var key = action.key;
      if (!draft.accessibilityOptions) draft.accessibilityOptions = {};
      if (key === 'visual_distortion') {
        var cur = draft.accessibilityOptions.visual_distortion;
        var curBool = typeof cur === 'boolean' ? cur : cur !== 'off';
        var val = typeof action.value === 'boolean' ? action.value : !curBool;
        draft.accessibilityOptions = { ...draft.accessibilityOptions, visual_distortion: val };
      } else if (key === 'flicker_control') {
        var cur2 = draft.accessibilityOptions.flicker_control;
        var curBool2 = typeof cur2 === 'boolean' ? cur2 : cur2 !== 'off';
        var val2 = typeof action.value === 'boolean' ? action.value : !curBool2;
        draft.accessibilityOptions = { ...draft.accessibilityOptions, flicker_control: val2 };
      } else if (key === 'sudden_sounds') {
        var cur3 = draft.accessibilityOptions.sudden_sounds;
        draft.accessibilityOptions = {
          ...draft.accessibilityOptions,
          sudden_sounds: cur3 === 'off' ? 'on' : 'off',
        };
        c.effects.push({
          type: 'AUDIO_SUDDEN_MUTED',
          value: draft.accessibilityOptions.sudden_sounds === 'off',
        });
      }
      return null;
    }
    case 'GAMBLE_CHOICE': {
      var g = draft.pendingGamble;
      if (!g) return null;
      var choiceId = action.choiceId;
      var opt = g.options.find(function (o) { return o.id === choiceId; });
      if (!opt) {
        draft.pendingGamble = null;
        return null;
      }
      draft.pendingGamble = null;
      var evt = g.evt;
      if (choiceId === 'safe') {
        // Safe: normal SAN damage flow
        c.narr('system', opt.text);
        var sanDmg = Math.abs(evt.sanity_damage || 0);
        if (sanDmg > 0) {
          sanDmg = processSanLoss(
            sanDmg,
            draft.inventory.map(function (i) { return i.name; }),
            draft.weather,
            draft.day,
            draft.difficulty,
            ctx
          );
          if (sanDmg > 0) {
            if (evt.skill_check) {
              c.effects.push({ type: 'AUDIO_SKILL', id: 'roll' });
              var check = doSkillCheck(
                evt.skill_check.skill,
                evt.skill_check.threshold || 50,
                draft,
                draft.difficulty,
                ctx,
                c.rng
              );
              if (check.success) {
                c.effects.push({ type: 'AUDIO_SKILL', id: 'success' });
                sanDmg = Math.max(1, Math.round(sanDmg * 0.5));
                c.narr('system', '【技能检定：' + check.skillName + '】成功！SAN损失减半。');
                draft.stats_run.checks_passed++;
              } else {
                c.effects.push({
                  type: 'AUDIO_SKILL',
                  id: check.isCritFail ? 'critical_fail' : 'fail',
                });
                c.narr('system', '【技能检定：' + check.skillName + '】失败！');
                draft.stats_run.checks_failed++;
              }
            }
            applySanLoss(draft, sanDmg, { trackStats: true });
            c.narr('system', 'SAN -' + sanDmg, { isEffect: true });
            if (sanDmg >= 1) {
              c.effects.push({ type: 'AUDIO_SAN_LOSS', amount: sanDmg });
              draft.transition = 'san-loss';
            }
          }
        }
      } else if (choiceId === 'deep_investigate') {
        // Deep investigate: roll 1d6 SAN loss, then check for reward
        var sanRoll = rand(1, 6, c.rng);
        c.narr('system', opt.text);
        applySanLoss(draft, sanRoll, { trackStats: true });
        c.narr('system', 'SAN -' + sanRoll, { isEffect: true });
        if (sanRoll >= 1) {
          c.effects.push({ type: 'AUDIO_SAN_LOSS', amount: sanRoll });
          draft.transition = 'san-loss';
        }
        // Independent reward check
        var reward = opt.reward || {};
        var r = c.rng.next();
        if (r < reward.clue_chance) {
          // Clue found — causal feedback
          var _GD = GD;
          var availableClues = (_GD.clue_chains || [])
            .flatMap(function (x) { return x.clues || []; })
            .filter(function (x) { return !hasClueId(draft.clues, x.id); });
          if (availableClues.length > 0) {
            var found = pick(availableClues, c.rng);
            draft.clues.push({ id: found.id, name: found.name || found.id });
            c.effects.push({ type: 'AUDIO_PLAY', id: 'clue_found' });
            if (!draft.tutorialSeen.first_clue && draft.clues.length === 1)
              draft.tutorialSeen = { ...draft.tutorialSeen, first_clue: true };
            c.narr('system', reward.text_on_success + ' 线索：' + (found.name || found.id), {
              isSpecial: true,
            });
            addRunMemory(
              draft,
              '你选择继续观察，而不是移开视线。发现了「' + (found.name || found.id) + '」。',
              'choice'
            );
          } else {
            c.narr('system', reward.text_on_success, { isSpecial: true });
          }
          c.narr('system', '这是你继续观察才发现的东西。如果刚才选择了收手，你永远不会知道。', {
            isSpecial: true,
          });
        } else if (r < reward.clue_chance + reward.san_gain_chance) {
          // SAN recovery — neutral outcome
          var gain = rand(1, 3, c.rng);
          applySanLoss(draft, -gain);
          c.narr('san-recovery', '你在混乱中找到了某种秩序。SAN +' + gain);
          c.narr('system', '它只学会了你的呼吸频率。', { isSpecial: true });
        } else if (r < reward.clue_chance + reward.san_gain_chance + reward.madness_risk) {
          // Madness — causal feedback: you've been noticed
          var mad = rollMadness(ctx, c.rng);
          draft.madnessActive = mad;
          c.narr('madness', '【临时疯狂：' + mad.name + '】' + mad.description, { madness: mad });
          c.narr('system', reward.text_on_madness, { isSpecial: true });
          c.narr('system', '被某种东西记住了。', { isSpecial: true });
          addRunMemory(draft, '深入探究时被某种东西记住了——' + mad.name, 'madness');
          c.effects.push(
            { type: 'AUDIO_PLAY', id: 'madness' },
            { type: 'AUDIO_PLAY', id: 'madness_loop' }
          );
        } else {
          c.narr('system', '它只学会了你的呼吸频率。', { isSpecial: true });
        }
        // Also apply base event SAN damage
        var baseSanDmg = Math.abs(evt.sanity_damage || 0);
        if (baseSanDmg > 0) {
          baseSanDmg = processSanLoss(
            baseSanDmg,
            draft.inventory.map(function (i) { return i.name; }),
            draft.weather,
            draft.day,
            draft.difficulty,
            ctx
          );
          if (baseSanDmg > 0) {
            applySanLoss(draft, baseSanDmg, { audio: true, effects: c.effects });
            c.narr('system', 'SAN -' + baseSanDmg, { isEffect: true });
          }
        }
      }
      // Apply event effects BEFORE death check
      applyLegacyEffects(draft, evt.effects, c.rng);
      // Post-gamble: check death (unified via applyDeathResolution)
      {
        var deathCtx = resolveDeath(draft, evt, null);
        if (deathCtx) applyDeathResolution(draft, deathCtx, c.narr, ctx);
      }
      draft.objectives = checkObjCompletion(draft.objectives, draft);
      c.log('探索(赌博)：' + evt.name);
      return null;
    }
    case 'START_PROLOGUE': {
      draft.screen = 'prologue';
      draft.prologue = initPrologueState();
      draft.fearTuning = null;
      // 前传初始状态：SAN满，AP重置
      draft.san = draft.maxSan;
      draft.ap = draft.maxAp;
      draft.clues = [];
      draft.narrative = [
        {
          id: c.now(),
          type: 'system',
          text: '这不是沃切斯特的第一份档案。',
          isSpecial: true,
        },
      ];
      return null;
    }
    case 'PROLOGUE_CHOICE': {
      if (!draft.prologue || draft.prologue.completed) return null;
      var currentEvent = getPrologueEvent(draft.prologue.currentScene);
      if (!currentEvent) return null;
      var pChoice = currentEvent.choices.find(function (x) { return x.id === action.choiceId; });
      if (!pChoice) return null;

      // 调用纯函数获取结果（不修改 draft）
      var result = handlePrologueChoice(draft, action.choiceId);

      // 将结果写回 draft（Immer mutation 模式，不 return 新对象）
      if (result.state.prologue) {
        Object.assign(draft.prologue, result.state.prologue);
      }
      if (result.state.fearTuning) {
        draft.fearTuning = result.state.fearTuning;
      }
      if (result.state.triggeredEvents) {
        draft.triggeredEvents = result.state.triggeredEvents;
      }
      if (result.state.clues) {
        draft.clues = result.state.clues;
      }
      if (result.state.san !== undefined) {
        draft.san = result.state.san;
      }
      if (pChoice.cost && pChoice.cost > 0) {
        draft.ap = Math.max(0, draft.ap - pChoice.cost);
      }

      // 添加叙述文本
      for (var bi = 0; bi < result.narration.length; bi++) {
        var block = result.narration[bi];
        c.narr(block.type, block.text, { isEffect: block.isEffect, isSpecial: block.isSpecial });
      }

      // 如果完成前传，恢复初始状态用于角色创建
      if (result.completed) {
        draft.san = draft.maxSan;
        draft.ap = draft.maxAp;
      }
      return null;
    }
    case 'COMPLETE_PROLOGUE': {
      // 前传完成，显示生存指南（首次）或直接进入角色创建
      draft.screen = draft.guideSeen ? 'creation' : 'guide';
      draft.skills = initSkills(ctx);
      draft.prologue.completed = true;
      return null;
    }
    case 'DISMISS_GUIDE': {
      draft.guideSeen = true;
      draft.screen = 'creation';
      return null;
    }
    case 'SKIP_PROLOGUE': {
      handleSkipPrologue(draft);
      draft.screen = draft.guideSeen ? 'creation' : 'guide';
      draft.skills = initSkills(ctx);
      return null;
    }
    case 'MARK_NOTEBOOK_OPENED': {
      draft.tutorialSeen = { ...(draft.tutorialSeen || {}), notebook_opened: true };
      return null;
    }
    case 'SET_META_FIELD': {
      draft[action.field] = action.value;
      return null;
    }
    case 'DELAYED_NARRATE': {
      c.narr(action.narrType || 'system', action.text, action.extra || {});
      return null;
    }
    case 'BUY_FROM_SHOP': {
      buyFromShop(draft, action.shopId, action.itemId, c.narr, ctx);
      c.effects.push({ type: 'AUDIO_PLAY', id: 'item_gain' });
      draft.objectives = checkObjCompletion(draft.objectives, draft);
      return null;
    }
    case 'USE_ITEM': {
      var item = action.item;
      if (!item) return null;
      var idx = draft.inventory.findIndex(function (i) { return i.id === item.id || i.name === item.name; });
      if (idx < 0) return null;
      var def = getItemDef(item.id, ctx);
      if (!def) return null;
      // Apply item effects
      var consumed = useItemByDef(draft, item, c.narr, ctx, c.rng);
      c.effects.push({ type: 'AUDIO_PLAY', id: 'item_use' });
      // Consume item if flagged
      if (consumed) {
        if (draft.inventory[idx].uses > 1) {
          draft.inventory[idx].uses -= 1;
        } else {
          draft.inventory.splice(idx, 1);
        }
      }
      draft.objectives = checkObjCompletion(draft.objectives, draft);
      return null;
    }
    case 'OPEN_SHOP': {
      draft.activeShop = action.shopId || null;
      return null;
    }
    case 'CLOSE_SHOP': {
      draft.activeShop = null;
      return null;
    }
    default:
      return null; // not handled by uiSlice
  }
}
