// src/utils/gameHelpers.js — 游戏逻辑工具函数（从 app.jsx 提取）

import { hasClueId, resolveClueName } from './clueNameMap.js';
import { hasTriggered, syncTriggeredSet } from './triggeredSet.js';
import { isEvidenceSatisfied } from '../reducers/conclusionReducer.js';
import { isChapterUnlocked } from '../reducers/chapterReducer.js';
import {
  changeNpcTrustByRef,
  getNpcStateByRef,
} from './npcStateAccess.js';

// ESM module: GD 通过 ctx 参数传入，不依赖全局变量

export function initSkills(ctx) {
  const GD = ctx?.GD || {};
  const base = {};
  (GD.systems?.player?.skills || GD.module5_player?.skills || []).forEach((s) => {
    let v = s.base;
    if (typeof v === 'string') v = 50;
    base[s.name] = v;
  });
  return base;
}

export function getNpcsHere(state, ctx) {
  const GD = ctx?.GD || {};
  const npcs = GD.npcs || GD.module3_npcs || [];
  return npcs.filter((n) => {
    if (getNpcStateByRef(state, n.name).dead) return false;
    const d = ((state.day - 1) % 5) + 1;
    const sch = (n.schedule || []).find((x) => x.startsWith('day' + d));
    return sch && (sch.split(':')[1] || '').trim() === state.currentArea;
  });
}

export function applyChainCompletionEffects(state, effects, narr) {
  if (!effects || !Array.isArray(effects)) return;
  for (const eff of effects) {
    switch (eff.type) {
      case 'add_flag':
        if (eff.flag_id && !hasTriggered(state, eff.flag_id)) {
          state.triggeredEvents.push(eff.flag_id);
          syncTriggeredSet(state, eff.flag_id);
        }
        break;
      case 'modify_npc_trust':
        if (eff.npc_id) {
          changeNpcTrustByRef(state, eff.npc_id, eff.amount || 0);
        }
        break;
      case 'unlock_area':
        if (eff.area_id && !state.visitedAreas.includes(eff.area_id))
          state.visitedAreas.push(eff.area_id);
        break;
      case 'unlock_final_option':
      case 'unlock_ritual_step':
        if (eff.option_id && !hasTriggered(state, eff.option_id)) {
          state.triggeredEvents.push(eff.option_id);
          syncTriggeredSet(state, eff.option_id);
        }
        if (eff.step_id && !hasTriggered(state, eff.step_id)) {
          state.triggeredEvents.push(eff.step_id);
          syncTriggeredSet(state, eff.step_id);
        }
        break;
      case 'modify_npc_agency':
        if (eff.npc_id) {
          const key = eff.npc_id + '_agency';
          state[key] = (state[key] || 0) + (eff.amount || 0);
        }
        break;
      case 'unlock_conclusion':
        if (eff.conclusion_id && !state.discoveredConclusions.includes(eff.conclusion_id))
          state.discoveredConclusions.push(eff.conclusion_id);
        break;
      case 'set_variable':
        if (eff.variable) state[eff.variable] = eff.value;
        break;
    }
  }
}

export function checkChainCompletion(state, narr, ctx) {
  const GD = ctx?.GD || {};
  const chains = GD.clue_chains || [];
  for (const chain of chains) {
    const chainClues = chain.clues || [];
    for (const clue of chainClues) {
      if (hasClueId(state.clues || [], clue.id)) continue;
      if (clue.source && isEvidenceSatisfied({ source: clue.source }, state)) {
        state.clues.push({ id: clue.id, name: clue.name });
        narr('system', '【线索链：' + chain.name + '】发现线索「' + clue.name + '」', {
          isSpecial: true,
        });
      }
    }
    if (state.completedChains.includes(chain.id)) continue;
    const allFound =
      chainClues.length > 0 && chainClues.every((c) => hasClueId(state.clues || [], c.id));
    if (allFound) {
      state.completedChains.push(chain.id);
      narr(
        'system',
        '【线索链完成】' + chain.name + ' —— ' + (chain.chain_reward || '线索已全部收集'),
        { isSpecial: true }
      );
      const effects = chain.completion_effects;
      if (effects && Array.isArray(effects) && effects.length > 0) {
        applyChainCompletionEffects(state, effects, narr);
      }
    }
  }
  const eventChains = GD.event_chains || [];
  for (const chain of eventChains) {
    if (state.completedChains.includes(chain.id)) continue;
    const seq = chain.sequence || [];
    const allTriggered = seq.length > 0 && seq.every((eid) => hasTriggered(state, eid));
    if (allTriggered) {
      state.completedChains.push(chain.id);
      narr(
        'system',
        '【事件链完成】' + chain.name + ' —— ' + (chain.chain_reward || '事件链已完结'),
        { isSpecial: true }
      );
      const effects = chain.completion_effects;
      if (effects && Array.isArray(effects) && effects.length > 0) {
        applyChainCompletionEffects(state, effects, narr);
      }
    }
  }
}

export function getSanVariant(san) {
  // P1-A: SSOT — variant derived from stage.level
  const stage = getSanStageFromGD(san);
  if (stage.level >= 3) return 'abyssal'; // explanation_loss
  if (stage.level >= 2) return 'paranoid'; // perception_shift
  if (stage.level >= 1) return 'anxious'; // mild_erosion
  return 'normal'; // stable
}

// P1-A: SAN thresholds derive from getSanStageFromGD (SSOT)
import { getSanStageFromGD } from '../reducers/sanReducer.js';
import { getDistortedName } from '../systems/textVariants.js';

export function getCorruptionLevel(san, loopCount) {
  // SSOT: stage.level maps to corruption levels
  // Loop count bonuses preserved as additive (not part of san_stages)
  const stage = getSanStageFromGD(san);
  const sanCorr = stage.level >= 5 ? 3 : stage.level >= 3 ? 2 : stage.level >= 1 ? 1 : 0;
  const loopBonus = loopCount >= 5 ? 1 : 0;
  return Math.min(3, sanCorr + loopBonus);
}

export function getOptionText(key, san, ctx) {
  const GD = ctx?.GD || {};
  const variants = GD.systems?.subjective_reality?.option_variants?.[key];
  if (!variants) return null;
  return variants[getSanVariant(san)] || variants.normal || null;
}

export function isAreaUnlocked(area, state) {
  if (!area) return false;
  const day = state.day || 1;
  // chapter_1_role only describes the area's first-chapter presentation.
  // The authoritative chapter gate decides when rumor/locked areas become
  // traversable later in the run.
  if (!area.chapter_unlock && area.chapter_1_role === 'locked') return false;
  if (!isChapterUnlocked(area.chapter_unlock, day)) return false;
  if (area.unlock_clue && !hasClueId(state.clues || [], area.unlock_clue)) return false;
  return true;
}

export function getAreaDisplayName(area, state, rng) {
  return getDistortedName(area, state, rng);
}
