// src/reducers/sanReducer.js - SAN loss processing, stages, madness

import { pick } from './utils.js';
import { getSealState } from './worldReducer.js';

export function getSanStage(san, ctx) {
  const { GD } = ctx;
  const stageEffects = GD.systems?.sanity?.stage_effects || [];
  // Text modifiers and colors per stage (preserved from original for UI display)
  const stageMeta = {
    '完全疯狂': { color: 'var(--danger2)', textMod: '你的视野在融化，墙壁在呼吸。一切都不是你认识的样子。' },
    '濒临疯狂': { color: 'var(--danger)', textMod: '你的手在发抖。你不确定脚下是地面还是深渊。有人在你耳边低语——不，是很多人的声音，重叠在一起。' },
    '动摇':    { color: 'var(--danger2)', textMod: '你的注意力难以集中。某些声音听起来像在叫你的名字。角落里的阴影似乎在移动。' },
    '不安':    { color: 'var(--san-mid)', textMod: '你感到一阵轻微的不安。远处传来什么东西倒塌的声音，但你不确定是不是真的。' },
    '理智':    { color: 'var(--san-high)', textMod: '' },
  };
  // Default fallback
  let matched = { name: '理智', ap_modifier: 0, special_effects: [], description: '' };
  for (const stage of stageEffects) {
    if (san >= stage.range[0] && san <= stage.range[1]) { matched = stage; break; }
  }
  const meta = stageMeta[matched.name] || stageMeta['理智'];
  return { id: matched.name, name: matched.name, color: meta.color, apMod: matched.ap_modifier, textMod: meta.textMod, desc: matched.description, special_effects: matched.special_effects || [] };
}

export function getSanTextVariant(baseText, san, pickFn, ctx) {
  const stage = getSanStage(san, ctx || { GD: {} });
  if (!stage.textMod) return baseText;
  if (stage.id === '完全疯狂') {
    const words = baseText.split('');
    const corrupted = words.map((c, i) => Math.random() < 0.03 ? (pickFn || pick)(['▓', '█', '■', '?', '...', '　']) : c).join('');
    return corrupted + '\n\n—— ' + stage.textMod;
  }
  if (stage.id === '濒临疯狂') {
    return baseText + (Math.random() < 0.4 ? '\n\n' + stage.textMod : '');
  }
  if (stage.id === '动摇') {
    return baseText + (Math.random() < 0.2 ? '\n\n—— 你眨了眨眼。' + stage.textMod : '');
  }
  return baseText;
}

export function getSanSceneVariant(sceneKey, san, ctx) {
  const { GD } = ctx;
  const variants = GD.implementation_notes?.san_text_variants?.variants?.[sceneKey];
  if (!variants) return null;
  if (san <= 30) return variants.san_low || variants.normal_text;
  if (san <= 50) return variants.san_mid || variants.normal_text;
  if (san <= 70) return variants.subtle_wrong_text || variants.normal_text;
  return variants.san_high || variants.normal_text;
}

export function processSanLoss(base, inv, weather, day, difficulty, ctx) {
  const { GD } = ctx;
  let loss = base;
  const prots = (GD.systems?.sanity?.item_protection || GD.module5_player?.item_san_protection || []);
  inv.forEach(item => {
    const p = prots.find(pr => pr.name === item);
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
