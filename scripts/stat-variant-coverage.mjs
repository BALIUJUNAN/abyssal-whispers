#!/usr/bin/env node
/**
 * scripts/stat-variant-coverage.mjs — 事件文本变体覆盖率统计
 *
 * 统计每个事件有多少个 SAN/轮回/信任变体，列出"只有一个版本"的高优先级事件。
 *
 * 变体类型:
 *   distortion_variants — 结构化变体 (san_low/san_mid/corruption_*\/fear_*\/loop_*)
 *   distortion_text     — 单一污染文本 (JSON events legacy)
 *   false_memory        — 虚假记忆文本
 *   unreliable_narration_level > 0 — 支持变体渲染（即使未显式定义）
 *
 * 优先级 = quality_tier 'A' 或 tier 'rare'/'signature'
 *
 * 用法:
 *   node scripts/stat-variant-coverage.mjs
 *   node scripts/stat-variant-coverage.mjs --verbose
 *   node scripts/stat-variant-coverage.mjs --export csv
 */

import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, '..', 'src');

const VERBOSE = process.argv.includes('--verbose');
const EXPORT_CSV = process.argv.includes('--export');

// ══════════════════════════════════════════════════════════════════
// ESM loader
// ══════════════════════════════════════════════════════════════════

const _cache = new Map();
async function load(relative) {
  if (_cache.has(relative)) return _cache.get(relative);
  const mod = await import(pathToFileURL(resolve(SRC, relative)).href);
  _cache.set(relative, mod);
  return mod;
}

function readJson(relative) {
  const p = resolve(SRC, relative);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf-8'));
}

// ══════════════════════════════════════════════════════════════════
// Load all events from all sources
// ══════════════════════════════════════════════════════════════════

async function loadAllEvents() {
  const events = [];

  // 1a. Extended events (JS modules)
  try {
    const idx = await load('./data/extended_events_index.js');
    const ext = idx.ALL_EXTENDED_EVENTS || [];
    events.push(...ext.map(e => ({ ...e, _source: 'extended' })));
  } catch (e) {
    console.warn('WARN: extended_events_index.js:', e.message);
  }

  // 1b. Ch2+ events
  try {
    const idx = await load('./data/extended_events_index.js');
    const ch2 = idx.CH2PLUS_EVENTS || [];
    events.push(...ch2.map(e => ({ ...e, _source: 'ch2plus' })));
  } catch (e) { /* optional */ }

  // 2a. game_base.json events
  try {
    const base = readJson('data/game_base.json');
    const evts = (base?.events || []).filter(e => e.id && e.description);
    events.push(...evts.map(e => ({ ...e, _source: 'game_base' })));
  } catch (e) {
    console.warn('WARN: game_base.json:', e.message);
  }

  // 2b. game_ch2plus.json events
  try {
    const ch2 = readJson('data/game_ch2plus.json');
    const evts = (ch2?.events || []).filter(e => e.id && e.description);
    events.push(...evts.map(e => ({ ...e, _source: 'game_ch2plus_json' })));
  } catch (e) { /* optional */ }

  // Deduplicate by id+source
  const seen = new Set();
  return events.filter(e => {
    const key = `${e._source}:${e.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ══════════════════════════════════════════════════════════════════
// Variant analysis
// ══════════════════════════════════════════════════════════════════

function analyzeVariants(event) {
  const d = event.distortion_variants || {};
  const variantKeys = Object.keys(d).filter(k =>
    k !== 'description' && typeof d[k] === 'string' && d[k].trim()
  );

  const hasDistortionText = !!event.distortion_text?.trim();
  const hasFalseMemory = !!event.false_memory?.trim();
  const unrelLevel = event.unreliable_narration_level || 0;
  const hasUnreliable = unrelLevel > 0;

  // Total variant count
  const variantCount = variantKeys.length + (hasDistortionText ? 1 : 0) + (hasFalseMemory ? 1 : 0);

  // Variant types breakdown
  const types = {
    san: variantKeys.filter(k => k.startsWith('san_')).length,
    corruption: variantKeys.filter(k => k.startsWith('corruption_')).length,
    fear: variantKeys.filter(k => k.startsWith('fear_')).length,
    loop: variantKeys.filter(k => k.startsWith('loop_')).length,
    distortion_text: hasDistortionText ? 1 : 0,
    false_memory: hasFalseMemory ? 1 : 0,
    unreliable_level: unrelLevel,
  };

  // Is this a "single version" event? (no variants at all)
  const isSingleVersion = variantCount === 0 && !hasUnreliable;

  // Is this high priority?
  const isHighPriority =
    event.quality_tier === 'A' ||
    event.tier === 'rare' ||
    event.tier === 'signature' ||
    event.tier === 'meta';

  // Priority score for sorting (higher = more important to add variants)
  let priorityScore = 0;
  if (event.quality_tier === 'A') priorityScore += 100;
  if (event.quality_tier === 'S') priorityScore += 200;
  if (event.tier === 'signature') priorityScore += 50;
  if (event.tier === 'rare') priorityScore += 30;
  if (event.tier === 'meta') priorityScore += 80;
  if (event.event_classification === '超自然遭遇') priorityScore += 20;
  if (event.event_classification === 'horror') priorityScore += 20;
  if (event.type?.includes('mythos')) priorityScore += 15;
  if (event.type?.includes('ending')) priorityScore += 15;

  return {
    id: event.id,
    name: event.name || '(unnamed)',
    type: event.type || '',
    tier: event.tier || 'normal',
    quality_tier: event.quality_tier || 'B',
    source: event._source,
    variantCount,
    variantKeys,
    hasDistortionText,
    hasFalseMemory,
    unrelLevel,
    isSingleVersion,
    isHighPriority,
    priorityScore,
    types,
  };
}

// ══════════════════════════════════════════════════════════════════
// Report
// ══════════════════════════════════════════════════════════════════

function printBar(value, max, width = 20) {
  const filled = Math.round((value / max) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function generateReport(results) {
  const total = results.length;
  const withVariants = results.filter(r => r.variantCount > 0);
  const singleVersion = results.filter(r => r.isSingleVersion);
  const highPriSingle = results.filter(r => r.isSingleVersion && r.isHighPriority);
  const highPriWithVars = results.filter(r => !r.isSingleVersion && r.isHighPriority);

  // Variant count distribution
  const dist = {};
  for (const r of results) {
    const key = r.variantCount === 0 ? '0' : r.variantCount <= 2 ? '1-2' : r.variantCount <= 5 ? '3-5' : '6+';
    dist[key] = (dist[key] || 0) + 1;
  }

  // Average variants per event
  const avgVariants = results.reduce((s, r) => s + r.variantCount, 0) / total;

  // By source
  const bySource = {};
  for (const r of results) {
    if (!bySource[r.source]) bySource[r.source] = { total: 0, single: 0, avg: 0 };
    bySource[r.source].total++;
    bySource[r.source].single += r.isSingleVersion ? 1 : 0;
    bySource[r.source].avg += r.variantCount;
  }
  for (const s of Object.values(bySource)) s.avg = (s.avg / s.total).toFixed(1);

  // By quality tier
  const byTier = {};
  for (const r of results) {
    const t = r.quality_tier;
    if (!byTier[t]) byTier[t] = { total: 0, single: 0 };
    byTier[t].total++;
    byTier[t].single += r.isSingleVersion ? 1 : 0;
  }

  const lines = [];

  lines.push('');
  lines.push('╔══════════════════════════════════════════════════════════════╗');
  lines.push('║          事件文本变体覆盖率统计 (Variant Coverage)        ║');
  lines.push('╚══════════════════════════════════════════════════════════════╝');
  lines.push('');

  // Overview
  lines.push('  ── 总览 ──');
  lines.push(`  事件总数:     ${total}`);
  lines.push(`  有变体:       ${withVariants.length} (${(withVariants.length/total*100).toFixed(1)}%)`);
  lines.push(`  单一版本:     ${singleVersion.length} (${(singleVersion.length/total*100).toFixed(1)}%)`);
  lines.push(`  平均变体数:   ${avgVariants.toFixed(1)}`);
  lines.push('');

  // Distribution
  lines.push('  ── 变体数量分布 ──');
  const maxDist = Math.max(...Object.values(dist));
  for (const [k, v] of [['0','无'],['1-2','少'],['3-5','中'],['6+','多']].reverse()) {
    const count = dist[k] || 0;
    const bar = printBar(count, maxDist);
    lines.push(`    ${k.padEnd(4)} ${bar} ${count.toString().padStart(4)} 条`);
  }
  lines.push('');

  // By source
  lines.push('  ── 按来源 ──');
  for (const [src, s] of Object.entries(bySource).sort((a, b) => b[1].total - a[1].total)) {
    lines.push(`    ${src.padEnd(20)} 总计:${s.total.toString().padStart(3)}  单一:${s.single.toString().padStart(3)}  均变体:${s.avg}`);
  }
  lines.push('');

  // By quality tier
  lines.push('  ── 按品质等级 ──');
  for (const tier of ['S', 'A', 'B', 'C', 'D']) {
    const info = byTier[tier];
    if (!info) continue;
    const pct = ((info.single / info.total) * 100).toFixed(0);
    lines.push(`    Tier ${tier}: 总计 ${info.total}  单一版本 ${info.single} (${pct}%)`);
  }
  lines.push('');

  // Variant type breakdown
  lines.push('  ── 变体类型分布 ──');
  const typeStats = {};
  for (const r of results) {
    for (const [k, v] of Object.entries(r.types)) {
      if (v > 0) typeStats[k] = (typeStats[k] || 0) + 1;
    }
  }
  const typeLabels = {
    san: 'SAN 阶段变体',
    corruption: '腐化变体',
    fear: '恐惧类型变体',
    loop: '轮回变体',
    distortion_text: 'distortion_text',
    false_memory: 'false_memory',
    unreliable_level: 'unreliable_narration_level>0',
  };
  const maxType = Math.max(...Object.values(typeStats), 1);
  for (const [k, v] of Object.entries(typeStats).sort((a, b) => b[1] - a[1])) {
    const bar = printBar(v, maxType);
    lines.push(`    ${(typeLabels[k]||k).padEnd(20)} ${bar} ${v} 事件`);
  }
  lines.push('');

  // HIGH PRIORITY: Single-version events that need variants
  lines.push('  ════════════════════════════════════════════════════════════');
  lines.push(`  🔴 高优先级单一版本事件 (${highPriSingle.length} 条)`);
  lines.push('  这些事件品质高但无任何变体，优先补全。');
  lines.push('  ════════════════════════════════════════════════════════════');
  lines.push('');

  if (highPriSingle.length === 0) {
    lines.push('  ✅ 所有高优先级事件都已有变体！');
  } else {
    const sorted = [...highPriSingle].sort((a, b) => b.priorityScore - a.priorityScore);
    for (const r of sorted) {
      const tierMark = { S: '🔴', A: '🟠', B: '🟡', C: '⚪' }[r.quality_tier] || '?';
      lines.push(`    ${tierMark} [${r.quality_tier}] ${r.id}`);
      lines.push(`       名称: ${r.name}`);
      lines.push(`       类型: ${r.type}  tier: ${r.tier}  来源: ${r.source}`);
      lines.push(`       优先级分: ${r.priorityScore}  (品质${r.quality_tier} + ${r.tier})`);
      lines.push('');
    }
  }

  // All single-version events (non-high-priority)
  const lowPriSingle = singleVersion.filter(r => !r.isHighPriority);
  if (lowPriSingle.length > 0 && VERBOSE) {
    lines.push(`  ── 低优先级单一版本事件 (${lowPriSingle.length} 条) ──`);
    const sorted = [...lowPriSingle].sort((a, b) => b.priorityScore - a.priorityScore);
    for (const r of sorted.slice(0, 20)) {
      lines.push(`    ⚪ [${r.quality_tier}] ${r.id}  ${r.type}  ${r.name}`);
    }
    if (lowPriSingle.length > 20) lines.push(`    ...还有 ${lowPriSingle.length - 20} 条`);
    lines.push('');
  }

  // Events with few variants but high priority
  const fewVarsHighPri = results.filter(r => !r.isSingleVersion && r.isHighPriority && r.variantCount <= 2);
  if (fewVarsHighPri.length > 0) {
    lines.push(`  ── 高优先级但变体偏少 (≤2) (${fewVarsHighPri.length} 条) ──`);
    const sorted = [...fewVarsHighPri].sort((a, b) => b.priorityScore - a.priorityScore);
    for (const r of sorted.slice(0, 10)) {
      const tierMark = { S: '🟠', A: '🟡' }[r.quality_tier] || '⚪';
      lines.push(`    ${tierMark} [${r.quality_tier}] ${r.id}  变体:${r.variantCount}  ${r.name}`);
    }
    if (fewVarsHighPri.length > 10) lines.push(`    ...还有 ${fewVarsHighPri.length - 10} 条`);
    lines.push('');
  }

  // CSV export
  if (EXPORT_CSV) {
    lines.push('');
    lines.push('  ── CSV 数据 ──');
    lines.push('id,name,type,tier,quality_tier,source,variant_count,has_distortion_text,has_false_memory,unrel_level,is_single,is_high_pri,priority_score');
    for (const r of results) {
      lines.push([
        r.id, r.name, r.type, r.tier, r.quality_tier, r.source,
        r.variantCount, r.hasDistortionText ? 1 : 0, r.hasFalseMemory ? 1 : 0,
        r.unrelLevel, r.isSingleVersion ? 1 : 0, r.isHighPriority ? 1 : 0, r.priorityScore
      ].join(','));
    }
  }

  lines.push('');
  return lines.join('\n');
}

// ══════════════════════════════════════════════════════════════════
// Main
// ══════════════════════════════════════════════════════════════════

async function main() {
  console.log('\n📊 事件文本变体覆盖率统计\n');

  console.log('  加载事件数据...');
  const events = await loadAllEvents();
  console.log(`  已加载 ${events.length} 个事件\n`);

  console.log('  分析变体覆盖...');
  const results = events.map(analyzeVariants);

  const report = generateReport(results);
  console.log(report);

  // Summary stats
  const singleVersion = results.filter(r => r.isSingleVersion);
  const highPriSingle = results.filter(r => r.isSingleVersion && r.isHighPriority);

  if (highPriSingle.length > 0) {
    console.log(`  ❌ ${highPriSingle.length} 个高优先级事件缺少变体，建议优先补全`);
    process.exit(1);
  } else if (singleVersion.length > 0) {
    console.log(`  ⚠️  ${singleVersion.length} 个单一版本事件（均为低优先级，暂不阻塞）`);
    process.exit(0);
  } else {
    console.log('  ✅ 所有事件都有变体覆盖');
    process.exit(0);
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(2); });
