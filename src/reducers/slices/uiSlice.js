// src/reducers/slices/uiSlice.js - Extracted from gameReducer
// CHOICE_SELECT, DISMISS_PENDING, CLEAR_TRANSITION, AUDIO_MUTE_TOGGLE, ACCESSIBILITY_TOGGLE, GAMBLE_CHOICE, START_PROLOGUE, PROLOGUE_CHOICE, COMPLETE_PROLOGUE, DISMISS_GUIDE, SKIP_PROLOGUE

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
import { addRunMemory } from '../../utils/appHelpers.js';

export function handleUiAction(s, action, c) {
  switch (action.type) {
    case 'CHOICE_SELECT': {
      const pc = s.pendingChoice;
      if (!pc) return s;
      const choiceIdx = action.choiceIdx;
      const choice = pc.choices[choiceIdx];
      if (!choice) {
        s.pendingChoice = null;
        return s;
      }
      s.pendingChoice = null;
      c.narr('system', choice.text, { isSpecial: true });
      applyLegacyEffects(s, choice.effects);
      // Death check after choice effects (unified via applyDeathResolution)
      {
        const deathCtx = resolveDeath(s, pc.evt, choice);
        if (deathCtx) applyDeathResolution(s, deathCtx, c.narr);
      }
      s.objectives = checkObjCompletion(s.objectives, s);
      c.log('选择：' + choice.label);
      return s;
    }
    case 'DISMISS_PENDING':
      s.pendingEvent = null;
      s.pendingNpc = null;
      s.pendingGamble = null;
      s.pendingChoice = null;
      s.objectives = checkObjCompletion(s.objectives, s);
      return s;
    case 'CLEAR_TRANSITION':
      s.transition = null;
      return s;
    case 'AUDIO_MUTE_TOGGLE':
      s.audioMuted = !s.audioMuted;
      c.effects.push({ type: 'AUDIO_SET_MUTED', muted: s.audioMuted });
      return s;
    case 'ACCESSIBILITY_TOGGLE': {
      const key = action.key;
      if (!s.accessibilityOptions) s.accessibilityOptions = {};
      if (key === 'visual_distortion') {
        // Normalize: accept boolean or legacy string ('medium'/'off'), store as boolean
        const cur = s.accessibilityOptions.visual_distortion;
        const curBool = typeof cur === 'boolean' ? cur : cur !== 'off';
        const val = typeof action.value === 'boolean' ? action.value : !curBool;
        s.accessibilityOptions = { ...s.accessibilityOptions, visual_distortion: val };
      } else if (key === 'flicker_control') {
        const cur = s.accessibilityOptions.flicker_control;
        const curBool = typeof cur === 'boolean' ? cur : cur !== 'off';
        const val = typeof action.value === 'boolean' ? action.value : !curBool;
        s.accessibilityOptions = { ...s.accessibilityOptions, flicker_control: val };
      } else if (key === 'sudden_sounds') {
        const cur = s.accessibilityOptions.sudden_sounds;
        s.accessibilityOptions = {
          ...s.accessibilityOptions,
          sudden_sounds: cur === 'off' ? 'on' : 'off',
        };
        c.effects.push({
          type: 'AUDIO_SUDDEN_MUTED',
          value: s.accessibilityOptions.sudden_sounds === 'off',
        });
      }
      return s;
    }
    case 'GAMBLE_CHOICE': {
      const g = s.pendingGamble;
      if (!g) return s;
      const choiceId = action.choiceId;
      const opt = g.options.find((o) => o.id === choiceId);
      if (!opt) {
        s.pendingGamble = null;
        return s;
      }
      s.pendingGamble = null;
      const evt = g.evt;
      if (choiceId === 'safe') {
        // Safe: normal SAN damage flow
        c.narr('system', opt.text);
        let sanDmg = Math.abs(evt.sanity_damage || 0);
        if (sanDmg > 0) {
          sanDmg = processSanLoss(
            sanDmg,
            s.inventory.map((i) => i.name),
            s.weather,
            s.day,
            s.difficulty,
            ctx
          );
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
                c.narr('system', '【技能检定：' + check.skillName + '】成功！SAN损失减半。');
                s.stats_run.checks_passed++;
              } else {
                c.effects.push({
                  type: 'AUDIO_SKILL',
                  id: check.isCritFail ? 'critical_fail' : 'fail',
                });
                c.narr('system', '【技能检定：' + check.skillName + '】失败！');
                s.stats_run.checks_failed++;
              }
            }
            applySanLoss(s, sanDmg, { trackStats: true });
            c.narr('system', 'SAN -' + sanDmg, { isEffect: true });
            if (sanDmg >= 1) {
              c.effects.push({ type: 'AUDIO_SAN_LOSS', amount: sanDmg });
              s.transition = 'san-loss';
            }
          }
        }
      } else if (choiceId === 'deep_investigate') {
        // Deep investigate: roll 1d6 SAN loss, then check for reward
        const sanRoll = rand(1, 6);
        c.narr('system', opt.text);
        applySanLoss(s, sanRoll, { trackStats: true });
        c.narr('system', 'SAN -' + sanRoll, { isEffect: true });
        if (sanRoll >= 1) {
          c.effects.push({ type: 'AUDIO_SAN_LOSS', amount: sanRoll });
          s.transition = 'san-loss';
        }
        // Independent reward check
        const reward = opt.reward || {};
        const r = Math.random();
        if (r < reward.clue_chance) {
          // Clue found — causal feedback
          const availableClues = (GD.clue_chains || [])
            .flatMap((x) => c.clues || [])
            .filter((x) => !hasClueId(s.clues, c.id));
          if (availableClues.length > 0) {
            const found = pick(availableClues);
            s.clues.push({ id: found.id, name: found.name || found.id });
            c.effects.push({ type: 'AUDIO_PLAY', id: 'clue_found' });
            if (!s.tutorialSeen.first_clue && s.clues.length === 1)
              s.tutorialSeen = { ...s.tutorialSeen, first_clue: true };
            c.narr('system', reward.text_on_success + ' 线索：' + (found.name || found.id), {
              isSpecial: true,
            });
          } else {
            c.narr('system', reward.text_on_success, { isSpecial: true });
          }
          c.narr('system', '这是你继续观察才发现的东西。如果刚才选择了收手，你永远不会知道。', {
            isSpecial: true,
          });
          addRunMemory(
            s,
            '你选择继续观察，而不是移开视线。发现了「' +
              (availableClues.length > 0 ? availableClues[0]?.name || '未知' : '线索') +
              '」。',
            'choice'
          );
        } else if (r < reward.clue_chance + reward.san_gain_chance) {
          // SAN recovery — no special causal text (neutral outcome)
          const gain = rand(1, 3);
          applySanLoss(s, -gain);
          c.narr('san-recovery', '你在混乱中找到了某种秩序。SAN +' + gain);
          c.narr('system', '它只学会了你的呼吸频率。', { isSpecial: true });
        } else if (r < reward.clue_chance + reward.san_gain_chance + reward.madness_risk) {
          // Madness — causal feedback: you've been noticed
          const mad = rollMadness(ctx);
          s.madnessActive = mad;
          c.narr('madness', '【临时疯狂：' + mad.name + '】' + mad.description, { madness: mad });
          c.narr('system', reward.text_on_madness, { isSpecial: true });
          c.narr('system', '被某种东西记住了。', { isSpecial: true });
          addRunMemory(s, '深入探究时被某种东西记住了——' + mad.name, 'madness');
          c.effects.push(
            { type: 'AUDIO_PLAY', id: 'madness' },
            { type: 'AUDIO_PLAY', id: 'madness_loop' }
          );
        } else {
          // No special outcome — default causal feedback
          c.narr('system', '它只学会了你的呼吸频率。', { isSpecial: true });
        }
        // Also apply base event SAN damage
        let baseSanDmg = Math.abs(evt.sanity_damage || 0);
        if (baseSanDmg > 0) {
          baseSanDmg = processSanLoss(
            baseSanDmg,
            s.inventory.map((i) => i.name),
            s.weather,
            s.day,
            s.difficulty,
            ctx
          );
          if (baseSanDmg > 0) {
            applySanLoss(s, baseSanDmg, { audio: true, effects: c.effects });
            c.narr('system', 'SAN -' + baseSanDmg, { isEffect: true });
          }
        }
      }
      // Apply event effects BEFORE death check
      applyLegacyEffects(s, evt.effects);
      // Post-gamble: check death (unified via applyDeathResolution)
      {
        const deathCtx = resolveDeath(s, evt, null);
        if (deathCtx) applyDeathResolution(s, deathCtx, c.narr);
      }
      s.objectives = checkObjCompletion(s.objectives, s);
      c.log('探索(赌博)：' + evt.name);
      return s;
    }
    case 'START_PROLOGUE': {
      s.screen = 'prologue';
      s.prologue = initPrologueState();
      s.fearTuning = null;
      // 前传初始状态：SAN满，AP重置
      s.san = s.maxSan;
      s.ap = s.maxAp;
      s.clues = [];
      s.narrative = [
        {
          id: Date.now(),
          type: 'system',
          text: '这不是沃切斯特的第一份档案。',
          isSpecial: true,
        },
      ];
      return s;
    }
    case 'PROLOGUE_CHOICE': {
      if (!s.prologue || s.prologue.completed) return s;
      const currentEvent = getPrologueEvent(s.prologue.currentScene);
      if (!currentEvent) return s;
      const pChoice = currentEvent.choices.find((x) => c.id === action.choiceId);
      if (!pChoice) return s;
      // AP消耗（前传中简化）
      if (pChoice.cost && pChoice.cost > 0) {
        s.ap = Math.max(0, s.ap - pChoice.cost);
      }
      // handlePrologueChoice 现在返回 { state, narration, nextScene, completed }
      const result = handlePrologueChoice(s, action.choiceId);
      // 用返回的新 state 替换 s（不可变）
      s = result.state;
      // 添加叙述文本
      for (const block of result.narration) {
        c.narr(block.type, block.text, { isEffect: block.isEffect, isSpecial: block.isSpecial });
      }
      // 如果完成前传，恢复初始状态用于角色创建
      if (result.completed) {
        s.san = s.maxSan;
        s.ap = s.maxAp;
      }
      return s;
    }
    case 'COMPLETE_PROLOGUE': {
      // 前传完成，显示生存指南（首次）或直接进入角色创建
      s.screen = s.guideSeen ? 'creation' : 'guide';
      s.skills = initSkills();
      // 保留前传结果
      s.prologue.completed = true;
      return s;
    }
    case 'DISMISS_GUIDE': {
      s.guideSeen = true;
      s.screen = 'creation';
      return s;
    }
    case 'SKIP_PROLOGUE': {
      handleSkipPrologue(s);
      s.screen = s.guideSeen ? 'creation' : 'guide';
      s.skills = initSkills();
      return s;
    }
    case 'SET_META_FIELD': {
      s[action.field] = action.value;
      return s;
    }
    case 'DELAYED_NARRATE': {
      c.narr(action.narrType || 'system', action.text, action.extra || {});
      return s;
    }
    default:
      return null;
  }
}
