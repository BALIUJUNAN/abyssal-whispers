#!/usr/bin/env node
/**
 * scripts/lint-npc-consistency.mjs — NPC 对话一致性校验
 *
 * 检查 NPC 台词中是否存在前后矛盾、跨角色矛盾、设定崩坏。
 *
 * 校验维度:
 *   1. 时间线矛盾 — "没见过你" vs "上次见过你"；"没去过X" vs "在X..."
 *   2. 跨角色地点矛盾 — A 说 B 在某处 vs B 注册位置
 *   3. 状态自相矛盾 — 同一NPC同时说自己没事和受伤
 *   4. 数字矛盾 — 同一单位数字冲突（排除历史年份）
 *   5. 死后发言 — NPC 明确说自己已死但又有存活行为台词
 *
 * 用法: node scripts/lint-npc-consistency.mjs [--verbose] [--strict]
 */

import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, '..', 'src');
const VERBOSE = process.argv.includes('--verbose');
const STRICT  = process.argv.includes('--strict');

// ══════════════════════════════════════════════════════════════════
// ESM loader (Windows-safe, cached)
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
// NPC name resolution (Chinese ↔ ID)
// ══════════════════════════════════════════════════════════════════

function resolveName(registry, key) {
  if (registry.NPC_REGISTRY[key]) return registry.NPC_REGISTRY[key].name;
  if (registry.NPC_NAME_TO_ID[key]) {
    return registry.NPC_REGISTRY[registry.NPC_NAME_TO_ID[key]]?.name || key;
  }
  return key;
}

// ══════════════════════════════════════════════════════════════════
// Collect ALL NPC lines from every source
// ══════════════════════════════════════════════════════════════════

async function collectAllLines() {
  const registry = await load('./data/registry/npcRegistry.js');
  const byNpc = {};

  function add(name, text, source, ctx) {
    if (!text?.trim()) return;
    (byNpc[name] ||= []).push({ text: text.trim(), source, context: ctx || '' });
  }

  // Each entry: [module, export, textField, sourceLabel, contextFn]
  const sources = [
    ['./data/npcContextualLines.js', 'NPC_CONTEXTUAL_LINES', 'text', 'ctx',
      item => `tags:${(item.tags||[]).join(',')}`],
    ['./systems/npcDialogue.js', 'NPC_CORRUPTION_LINES', 'text', 'corrupt',
      (item, variant) => `variant:${variant}`],
    ['./systems/npcDialogue.js', 'NPC_INFECTION_LINES', 'text', 'infect', null],
    ['./utils/npcMemory.js', 'NPC_MEMORY_LINES', 'text', 'memory',
      (item, tier) => `tier:${tier}`],
    ['./systems/npcDialogue.js', 'NPC_DAY_SPECIFIC_LINES', 'text', 'day',
      (item, d) => `day:${d}`],
    ['./systems/npcDialogue.js', 'NPC_WEATHER_LINES', 'text', 'weather',
      (item, w) => `weather:${w}`],
    ['./systems/npcDialogue.js', 'NPC_SAN_LEVEL_LINES', 'text', 'san',
      (item, t) => `tier:${t}`],
  ];

  for (const [modPath, exportName, textField, srcLabel, ctxFn] of sources) {
    try {
      const mod = await load(modPath);
      const container = mod[exportName];
      if (!container) continue;
      for (const [npcKey, data] of Object.entries(container)) {
        const name = resolveName(registry, npcKey);
        // data can be: string | array of strings | array of objects | nested object
        const walk = (obj, subKey) => {
          if (typeof obj === 'string') {
            add(name, obj, srcLabel, ctxFn?.(null, subKey));
          } else if (Array.isArray(obj)) {
            for (const item of obj) {
              const text = typeof item === 'string' ? item : item[textField];
              if (text) add(name, text, srcLabel, ctxFn?.(item, subKey));
            }
          } else if (typeof obj === 'object' && obj !== null) {
            for (const [k, v] of Object.entries(obj)) walk(v, k);
          }
        };
        walk(data);
      }
    } catch { /* skip non-critical */ }
  }

  // game_base.json: trust layers + secrets
  const gameBase = readJson('data/game_base.json');
  if (gameBase?.npcs) {
    for (const entry of gameBase.npcs) {
      const name = entry.name || entry.id;
      for (const layer of (entry.trust_layers || [])) {
        if (layer.dialogue) add(name, layer.dialogue, 'game_base.trust', `L${layer.level}`);
      }
      for (const s of (entry.secrets || [])) {
        add(name, typeof s === 'string' ? s : JSON.stringify(s), 'game_base.secret', '');
      }
    }
  }

  // game_meta.json: loop text variants
  const gameMeta = readJson('data/game_meta.json');
  if (gameMeta?.loop_text_variants) {
    for (const [npcKey, variants] of Object.entries(gameMeta.loop_text_variants)) {
      const name = resolveName(registry, npcKey);
      for (const [loop, text] of Object.entries(variants)) {
        add(name, text, 'game_meta.loop', `loop:${loop}`);
      }
    }
  }

  return byNpc;
}

// ══════════════════════════════════════════════════════════════════
// NPC profiles (objective facts from game_base.json)
// ══════════════════════════════════════════════════════════════════

function buildProfiles() {
  const gameBase = readJson('data/game_base.json');
  const profiles = {};
  if (!gameBase?.npcs) return profiles;
  for (const entry of gameBase.npcs) {
    profiles[entry.name || entry.id] = {
      id: entry.id,
      name: entry.name,
      location: entry.location || 'unknown',
      role: entry.role || '',
    };
  }
  return profiles;
}

// ══════════════════════════════════════════════════════════════════
// Consistency rules
// ══════════════════════════════════════════════════════════════════

/** R1: Timeline contradictions within same NPC */
function checkTimeline(lines, name) {
  const issues = [];
  const pool = lines.map(l => l.text).join('\n');

  // A. Same sentence: "第一次...又/再次/回来"
  const m = pool.match(/第一次[^。]*?(?:又|再次|回来|再来|见过)[^。]*/);
  if (m) issues.push({ type: 'TIMELINE', npc: name, rule: '同一句声称"第一次"又"又来了"', evidence: m[0].slice(0, 80) });

  // B. "没见过你" vs "上次见过你"
  const neverMet = pool.match(/没(?:去)?[有见]?过[^。]*/);
  const metBefore = pool.match(/上次[^。]*?见[过]?你/);
  if (neverMet && metBefore) {
    issues.push({ type: 'TIMELINE', npc: name, rule: '"没见过你" vs "上次见过你"',
      evidence: `"${neverMet[0].slice(0,25)}" / "${metBefore[0].slice(0,25)}"` });
  }

  // C. "没去过X" vs "在X..."
  const locs = ['码头','教堂','墓穴','灯塔','庄园','图书馆','酒馆','森林','遗迹','地下室','安全屋','厨房'];
  for (const loc of locs) {
    const negRe = new RegExp(`(?:没(?:去)?[有见]?过|从[来未][^。]*?)[^。]*?${loc}[^。]*`);
    const posRe = new RegExp(`[^。]*${loc}[^。]*(?:去过|到过|在过|进去)[^。]*`);
    const neg = pool.match(negRe);
    const pos = pool.match(posRe);
    if (neg && pos) {
      issues.push({ type: 'TIMELINE', npc: name, rule: `声称"没去过${loc}"但同时在${loc}`,
        evidence: `"${neg[0].slice(0,30)}" / "${pos[0].slice(0,30)}"` });
    }
  }
  return issues;
}

/** R2: Cross-NPC location mismatch */
function checkLocation(lines, name, profiles, registry) {
  const issues = [];
  const npcReg = registry.NPC_REGISTRY || {};
  const nameToId = registry.NPC_NAME_TO_ID || {};
  const idToName = {};
  for (const [id, e] of Object.entries(npcReg)) idToName[e.name] = id;

  for (const line of lines) {
    const re = /([一-鿿]{2,6})[^。]*在([一-鿿]+(?:区|馆|店|屋|堂|院|室|楼|塔|洞|穴|场|桥|路|街|镇|城|码头|森林|墓穴|庄园|酒馆|教堂|灯塔|仓库|遗迹|安全屋))/g;
    let m, safety = 0;
    while ((m = re.exec(line.text)) !== null) {
      safety++;
      if (safety > 50) break; // Safety guard
      const mentioned = m[1];
      const place = m[2];
      const npcId = nameToId[mentioned] || idToName[mentioned];
      if (!npcId) continue;
      const profile = profiles[npcId];
      if (profile?.location && profile.location !== 'unknown' &&
          !place.includes(profile.location) && profile.location !== 'voxchester') {
        issues.push({ type: 'LOCATION', npc: name, mentioned, claimed: place,
          registered: profile.location, evidence: line.text.slice(0, 80), source: line.source });
      }
    }
  }
  return issues;
}

/** R3: Self-contradictory health/state claims */
function checkState(lines, name) {
  const issues = [];
  const fine = [], unwell = [];
  for (const l of lines) {
    for (const m of (l.text.match(/(?:没事|还好|挺好的|没问题|还不错)[^。]*/g) || [])) fine.push(m);
    for (const m of (l.text.match(/(?:不舒服|受伤了|受伤|痛|疼|病|发烧|难受|虚弱|疲惫|太累了)[^。]*/g) || [])) unwell.push(m);
  }
  if (fine.length && unwell.length) {
    issues.push({ type: 'STATE', npc: name, rule: '同时声称"没事"和"不舒服"',
      evidence: `"${fine[0].slice(0,25)}" / "${unwell[0].slice(0,25)}"` });
  }
  return issues;
}

/** R4: Numeric contradictions (same unit, different values) */
function checkNumeric(lines, name) {
  const issues = [];
  const units = {
    '年': [/(\d+)\s*年/, [1926, 1923, 1919, 1692, 1740, 1780]],
    '天': [/(\d+)\s*天/, []],
    '月': [/(\d+)\s*月/, []],
    '个': [/(\d+)\s*个/, []],
    '只': [/(\d+)\s*只/, []],
    '条': [/(\d+)\s*条/, []],
    '次': [/(\d+)\s*次/, []],
    '层': [/(\d+)\s*层/, []],
    '级': [/(\d+)\s*级/, []],
    '根': [/(\d+)\s*根/, []],
    '片': [/(\d+)\s*片/, []],
    '把': [/(\d+)\s*把/, []],
  };

  const pool = lines.map(l => l.text).join('\n');
  for (const [unit, [re, historical]] of Object.entries(units)) {
    const vals = new Set();
    // Use matchAll to iterate all matches without lastIndex issues
    const iter = pool.matchAll(new RegExp(re.source, re.flags + 'g'));
    for (const m of iter) {
      const v = +m[1];
      if (v > 0 && v < 200 && !historical.includes(v)) vals.add(v);
    }
    if (vals.size >= 2) {
      issues.push({ type: 'NUMERIC', npc: name, unit, values: [...vals].sort((a, b) => a - b),
        evidence: `"${unit}" 数字矛盾: ${[...vals].sort((a,b)=>a-b).join(' vs ')}` });
    }
  }
  return issues;
}

/** R5: Post-death dialogue — NPC explicitly claims death but has alive-behavior lines */
function checkDeathAlive(lines, name) {
  const issues = [];
  // Only flag if NPC THEMSELVES says they are dead/gone
  const selfDeath = lines.filter(l =>
    /(?:我死了|我不在了|我已经死|我的尸体|我再也[不来])/.test(l.text)
  );
  const aliveActions = lines.filter(l =>
    /(?:你好|来了|坐下|喝点什么|坐吧|请进|进来了|给你|递给你|擦着杯子|修补|我正在)/.test(l.text)
  );
  if (selfDeath.length && aliveActions.length) {
    issues.push({ type: 'DEATH_ALIVE', npc: name,
      evidence: `"${selfDeath[0].text.slice(0,40)}" vs "${aliveActions[0].text.slice(0,40)}"` });
  }
  return issues;
}

// ══════════════════════════════════════════════════════════════════
// Main
// ══════════════════════════════════════════════════════════════════

async function main() {
  console.log('\n🔍 NPC 对话一致性校验\n');

  const registry = await load('./data/registry/npcRegistry.js');
  const profiles = buildProfiles();
  console.log(`  档案: ${Object.keys(profiles).length} NPC  |  来源: game_base.json\n`);

  console.log('  收集台词...');
  const linesByNpc = await collectAllLines();
  const total = Object.values(linesByNpc).reduce((s, a) => s + a.length, 0);
  const npcCount = Object.keys(linesByNpc).length;
  console.log(`  ${total} 条台词，${npcCount} 个 NPC\n`);

  // Run checks
  const all = [];
  const names = Object.keys(linesByNpc).sort();

  for (const name of names) {
    const lines = linesByNpc[name];
    all.push(...checkTimeline(lines, name));
    all.push(...checkState(lines, name));
    all.push(...checkNumeric(lines, name));
    all.push(...checkDeathAlive(lines, name));
  }
  // Cross-NPC checks
  for (const name of names) {
    all.push(...checkLocation(linesByNpc[name], name, profiles, registry));
  }

  // ── Report ──
  const byType = {};
  for (const i of all) (byType[i.type] ||= []).push(i);

  const LABELS = {
    TIMELINE: '⏱️  时间线矛盾',
    LOCATION: '📍 跨角色地点矛盾',
    STATE: '🏥 状态自相矛盾',
    NUMERIC: '🔢 数字矛盾',
    DEATH_ALIVE: '💀 死后仍以存活身份发言',
  };

  console.log('═'.repeat(60));
  console.log('  校验结果');
  console.log('═'.repeat(60));

  if (all.length === 0) {
    console.log('\n  ✅ 未发现矛盾。NPC 对话一致性良好。\n');
    process.exit(0);
  }

  console.log(`\n  共 ${all.length} 个潜在矛盾:\n`);
  let idx = 0;
  for (const [type, items] of Object.entries(byType)) {
    const label = LABELS[type] || type;
    console.log(`  ${label} (${items.length})`);
    const show = VERBOSE ? items : items.slice(0, 5);
    for (const i of show) {
      console.log(`    ${++idx}. [${i.npc}] ${i.rule || i.type}`);
      if (VERBOSE && i.evidence) console.log(`       ${i.evidence}`);
    }
    if (items.length > 5 && !VERBOSE) console.log(`       ...还有 ${items.length - 5} 条`);
    console.log('');
  }

  console.log('  ── 按 NPC 汇总 ──');
  const byNpc = {};
  for (const i of all) byNpc[i.npc] = (byNpc[i.npc] || 0) + 1;
  for (const [n, c] of Object.entries(byNpc).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${c > 0 ? '⚠️' : '✅'} ${n}: ${c}`);
  }
  console.log('');

  const critical = all.some(i => i.type === 'TIMELINE' || i.type === 'NUMERIC');
  if (STRICT || critical) {
    console.log('  ❌ 未通过');
    if (critical) console.log('     (含时间线/数字硬矛盾 — 需人工判定)');
    process.exit(1);
  }
  console.log('  ✅ 通过 (仅低严重度问题)\n');
}

main().catch(e => { console.error('❌', e.message); process.exit(2); });
