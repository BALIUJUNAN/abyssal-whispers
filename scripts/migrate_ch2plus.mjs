#!/usr/bin/env node
/**
 * scripts/migrate_ch2plus.mjs — 将 game_ch2plus.json 事件迁移为 ESM extended 格式
 *
 * 用法: node scripts/migrate_ch2plus.mjs [--dry-run]
 *   --dry-run  只打印转换结果，不写文件
 *
 * 转换规则:
 *   sanity_damage → effects.san
 *   缺失 quality_tier → 'B'
 *   缺失 unreliable_narration_level → 0
 *   删除 original_condition, chapter_1_eligible, chapter_1_san_note
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');

// ══════════════════════════════════════════════════════════════════
// 1. 加载原始 JSON
// ══════════════════════════════════════════════════════════════════

const ch2Path = resolve(ROOT, 'src/data/game_ch2plus.json');
const ch2 = JSON.parse(readFileSync(ch2Path, 'utf-8'));
const rawEvents = ch2.events || [];

console.log(`\n📦 加载 game_ch2plus.json: ${rawEvents.length} 个事件\n`);

// ══════════════════════════════════════════════════════════════════
// 2. 分类映射（type → 目标文件）
// ══════════════════════════════════════════════════════════════════

const TYPE_TO_FILE = {
  // ch2plus events have Chinese type strings - all go to dedicated module
};

function getTargetFile(e) {
  // ch2plus events have Chinese type strings — use dedicated module
  return 'events_ch2plus.js';
}

// ══════════════════════════════════════════════════════════════════
// 3. 格式转换
// ══════════════════════════════════════════════════════════════════

function convertEvent(e) {
  const out = { ...e };

  // 3a. sanity_damage → effects.san
  if (out.sanity_damage !== undefined && out.sanity_damage !== null) {
    out.effects = { ...(out.effects || {}), san: out.sanity_damage };
    delete out.sanity_damage;
  }

  // 3b. 补充缺失字段
  if (!out.quality_tier) out.quality_tier = 'B';
  if (!out.unreliable_narration_level && out.unreliable_narration_level !== 0) {
    out.unreliable_narration_level = 0;
  }
  if (!out.tier) out.tier = 'normal';

  // 3c. 删除转换不需要的字段
  delete out.original_condition;
  delete out.chapter_1_eligible;
  delete out.chapter_1_san_note;

  // 3d. 确保 choices 是数组
  if (!out.choices) out.choices = [];

  // 3e. 确保 trigger 有 areas
  if (!out.trigger) out.trigger = { areas: ['voxchester'] };
  if (!out.trigger.areas) out.trigger.areas = ['voxchester'];

  return out;
}

const converted = rawEvents.map(convertEvent);

// ══════════════════════════════════════════════════════════════════
// 4. 按目标文件分组
// ══════════════════════════════════════════════════════════════════

const byFile = {};
for (const e of converted) {
  const file = getTargetFile(e);
  if (!byFile[file]) byFile[file] = [];
  byFile[file].push(e);
}

console.log('按目标文件分组:');
for (const [file, events] of Object.entries(byFile).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${file}: ${events.length} 个事件`);
}

// ══════════════════════════════════════════════════════════════════
// 5. 生成 JS 代码
// ══════════════════════════════════════════════════════════════════

function formatValue(v, indent) {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (typeof v === 'string') {
    // Escape backslashes and quotes
    const escaped = v.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return `'${escaped}'`;
  }
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]';
    const items = v.map(item => formatValue(item, indent + 2));
    return `[\n${items.map(i => `${' '.repeat(indent + 2)}${i}`).join(',\n')}\n${' '.repeat(indent)}]`;
  }
  if (typeof v === 'object') {
    const keys = Object.keys(v);
    if (keys.length === 0) return '{}';
    const pairs = keys.map(k => {
      const val = formatValue(v[k], indent + 2);
      return `${' '.repeat(indent + 2)}${k}: ${val}`;
    });
    return `{\n${pairs.join(',\n')}\n${' '.repeat(indent)}}`;
  }
  return JSON.stringify(v);
}

function generateModule(events, moduleName) {
  const lines = [];
  lines.push(`// Auto-generated from game_ch2plus.json by scripts/migrate_ch2plus.mjs`);
  lines.push(`// Module: ${moduleName}`);
  lines.push(`// Events: ${events.length}`);
  lines.push('');
  lines.push(`export const ${moduleName} = [`);
  lines.push('');

  for (const e of events) {
    lines.push(`  {`);
    const keys = Object.keys(e);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const v = formatValue(e[k], 2);
      const comma = i < keys.length - 1 ? ',' : '';
      lines.push(`    ${k}: ${v}${comma}`);
    }
    lines.push(`  },`);
    lines.push('');
  }

  lines.push('];');
  lines.push('');
  return lines.join('\n');
}

// ══════════════════════════════════════════════════════════════════
// 6. 输出
// ══════════════════════════════════════════════════════════════════

if (DRY_RUN) {
  console.log('\n=== DRY RUN — 前 3 个事件的转换预览 ===\n');
  for (const e of converted.slice(0, 3)) {
    console.log(JSON.stringify(e, null, 2).slice(0, 500));
    console.log('---');
  }
  console.log(`\n总计转换: ${converted.length} 个事件`);
  console.log('写入文件:');
  for (const file of Object.keys(byFile).sort()) {
    console.log(`  src/data/${file} (+${byFile[file].length})`);
  }
} else {
  // Write individual module files
  const SRC = resolve(ROOT, 'src/data');
  for (const [file, events] of Object.entries(byFile)) {
    const moduleName = file.replace('.js', '');
    const code = generateModule(events, moduleName);
    const outPath = resolve(SRC, file);
    writeFileSync(outPath, code, 'utf-8');
    console.log(`  ✅ ${file} (${events.length} events)`);
  }

  // Write index entry
  const indexPath = resolve(SRC, 'extended_events_index.js');
  console.log(`\n  需要手动将新增模块加入 extended_events_index.js`);

  console.log(`\n${'='.repeat(50)}`);
  console.log('迁移完成！');
  console.log(`${'='.repeat(50)}`);
}
