// src/reducers/sanReducer.js - SAN loss processing, stages, madness
// SSOT: All SAN stage thresholds come from GD.systems.sanity.san_stages (game_base.json).
// Use getCurrentSanStage(san, ctx) to get the current stage for any SAN value.

import { pick } from './utils.js';
import { getSealState } from '../engine/WorldTimeSystem.js';

// getCurrentSanStage() is defined in utils.js (SSOT) — loaded before this file.

export function getSanStage(san, ctx) {
  const stage = getCurrentSanStage(san, ctx);
  // Backward-compatible UI colors
  const colorMap = {
    stable: 'var(--san-high)', mild_erosion: 'var(--san-high)',
    perception_shift: 'var(--san-mid)', explanation_loss: 'var(--danger2)',
    reality_dissolution: 'var(--danger)', narrative_death: 'var(--danger2)',
    death: 'var(--danger2)'
  };
  const textModMap = {
    stable: '', mild_erosion: '',
    perception_shift: '你感到一阵轻微的不安。远处传来什么东西倒塌的声音。',
    explanation_loss: '你的注意力难以集中。某些声音听起来像在叫你的名字。角落里的阴影似乎在移动。',
    reality_dissolution: '你的手在发抖。你不确定脚下是地面还是深渊。有人在你耳边低语——不，是很多人的声音，重叠在一起。',
    narrative_death: '你的视野在融化，墙壁在呼吸。一切都不是你认识的样子。',
    death: ''
  };
  return {
    id: stage.id, name: stage.name,
    color: colorMap[stage.id] || 'var(--san-high)',
    apMod: stage.ap_modifier || 0,
    textMod: textModMap[stage.id] || '',
    desc: stage.description || '',
    special_effects: stage.pollution_effects || [],
    level: stage.level || 0,
    visual_tier: stage.visual_tier || 'clean',
    event_weight: stage.event_weight || { buffer_boost: 1.0, horror_penalty: 1.0 }
  };
}

export function getSanTextVariant(baseText, san, pickFn, ctx) {
  const stage = getSanStage(san, ctx || { GD: {} });
  if (!stage.textMod) return baseText;
  // Use stage.level instead of hardcoded name checks
  if (stage.level >= 5) { // narrative_death
    const words = baseText.split('');
    const corrupted = words.map((c, i) => Math.random() < 0.03 ? (pickFn || pick)(['▓', '█', '■', '?', '...', '　']) : c).join('');
    return corrupted + '\n\n—— ' + stage.textMod;
  }
  if (stage.level >= 4) { // reality_dissolution
    return baseText + (Math.random() < 0.4 ? '\n\n' + stage.textMod : '');
  }
  if (stage.level >= 3) { // explanation_loss
    return baseText + (Math.random() < 0.2 ? '\n\n—— 你眨了眨眼。' + stage.textMod : '');
  }
  return baseText;
}

export function getSanSceneVariant(sceneKey, san, ctx) {
  const { GD } = ctx;
  const variants = GD.implementation_notes?.san_text_variants?.variants?.[sceneKey];
  if (!variants) return null;
  // Use stage level for variant selection
  const stage = getCurrentSanStage(san, ctx);
  if (stage.level >= 4) return variants.san_low || variants.normal_text;   // reality_dissolution
  if (stage.level >= 3) return variants.san_mid || variants.normal_text;   // explanation_loss
  if (stage.level >= 2) return variants.subtle_wrong_text || variants.normal_text; // perception_shift
  return variants.san_high || variants.normal_text;
}

export function processSanLoss(base, inv, weather, day, difficulty, ctx) {
  const { GD } = ctx;
  let loss = base;
  const prots = (GD.systems?.sanity?.item_protection || GD.module5_player?.item_san_protection || []);
  inv.forEach(item => {
    const p = prots.find(pr => pr.name === (item && item.name ? item.name : item));
    if (p) loss -= p.san_reduction;
  });
  if (weather === '血月') loss += 3;
  if (day) {
    const seal = getSealState(day, ctx);
    if (seal?.global_modifier?.san_loss_multiplier) loss *= seal.global_modifier.san_loss_multiplier;
  }
  if (difficulty) {
    const dl = GD.core_loop?.difficulty_levels?.[difficulty];
    if (dl) loss *= dl.san_loss_multiplier;
  }
  return Math.max(0, Math.round(loss));
}

export function rollMadness(ctx) {
  const { GD } = ctx;
  const table = GD.systems?.sanity?.temporary_madness_table || GD.module5_player?.temporary_madness_table;
  if (!table || !Array.isArray(table)) return { name: '幻觉', description: '你看到了不存在的东西。' };
  return pick(table);
}
