#!/usr/bin/env node
/**
 * scripts/lint-narrative-quality.mjs — 叙事质量抽检脚本
 *
 * 随机抽取 N 个事件，按风格指南逐项打分。
 * 评分维度：禁用词、感官细节、冷静叙述、意象密度、句式、对话比例等。
 *
 * 风格指南来源: src/data/game_base.json § design_intent.text_style
 *
 * 用法:
 *   node scripts/lint-narrative-quality.mjs               # 默认抽 50 个
 *   node scripts/lint-narrative-quality.mjs --count 100   # 自定义样本量
 *   node scripts/lint-narrative-quality.mjs --seed 42     # 固定随机种子（复现）
 *   node scripts/lint-narrative-quality.mjs --verbose     # 逐条输出详情
 *   node scripts/lint-narrative-quality.mjs --fail-on forbidden  # 发现禁用词即失败
 *
 * 退出码:
 *   0 — 全部通过
 *   1 — 发现禁用词 / 平均分低于阈值
 *   2 — 数据加载失败
 */

// ══════════════════════════════════════════════════════════════════
// 1. 配置（风格指南直接映射）
// ══════════════════════════════════════════════════════════════════

const FORBIDDEN_WORDS = [
  // 纯标签化恐怖词（没有感官支撑的抽象恐怖形容词）
  '不可名状', '令人毛骨悚然', '骇人听闻', '极度恐惧',
  // 注意：以下词汇在克苏鲁语境下是 legitimate 描述，不禁止：
  //   '扭曲' — SAN 畸变的核心机制词（san_low variant 专用）
  //   '疯狂' — madnessActive 机制词
  //   '诡异' — 克苏鲁氛围标准描述词
  //   '恐怖' — 低 SAN 时 narrate 恐惧感是合理的
];

const EXCLAMATION_THRESHOLD = 2;     // 允许的感叹号数量
const SENTENCE_LENGTH_LIMIT = 30;    // 关键句最大字符数
const DIALOGUE_RATIO_LIMIT = 0.70;   // 对话占比上限
const IMAGERY_DENSITY_LIMIT = 2;     // 每200字符最大意象数
const ABSTRACT_RATIO_LIMIT = 0.25;   // 抽象词占比上限
const MIN_SCORE_TO_PASS = 55;        // 单条事件最低及格分
const AVG_SCORE_TO_PASS = 60;        // 平均分及格线

const SCORE_WEIGHTS = {
  forbidden:  35,   // 禁用词（硬性规则，权重最高）
  sensory:    20,   // 感官细节
  calm:       15,   // 无感叹号
  dialogue:   10,   // 无对话堆砌
  abstract:   10,   // 无抽象判断
  length:     10,   // 句式控制
};

// ══════════════════════════════════════════════════════════════════
// 2. 命令行参数
// ══════════════════════════════════════════════════════════════════

const VERBOSE       = process.argv.includes('--verbose');
const FAIL_ON_BAN   = process.argv.includes('--fail-on-forbidden');
const SHOW_ALL      = process.argv.includes('--all');

function getArgInt(name, def) {
  const idx = process.argv.indexOf('--' + name);
  if (idx === -1) return def;
  const v = parseInt(process.argv[idx + 1], 10);
  return isNaN(v) ? def : v;
}

const SAMPLE_SIZE = getArgInt('count', 50);
const SEED        = getArgInt('seed', Date.now());

// ══════════════════════════════════════════════════════════════════
// 3. 数据加载
// ══════════════════════════════════════════════════════════════════

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SRC  = resolve(ROOT, 'src');

/** Mulberry32  PRNG — 支持 --seed 复现 */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates shuffle (in-place) */
function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function loadAllEvents() {
  let events = [];

  // 3a. 扩展事件（599个，ESM）
  try {
    const idx = await import(pathToFileURL(resolve(SRC, 'data/extended_events_index.js')).href);
    const ext = idx.ALL_EXTENDED_EVENTS || [];
    events.push(...ext.map(e => ({ ...e, _source: 'extended' })));
  } catch (err) {
    console.error('无法加载扩展事件索引:', err.message);
  }

  // 3b. game_base.json 中的事件
  try {
    const fs = await import('node:fs/promises');
    const baseRaw = await fs.readFile(resolve(SRC, 'data/game_base.json'), 'utf-8');
    const base = JSON.parse(baseRaw);
    const evts = (base.events || []).filter(e => e.id && e.description);
    events.push(...evts.map(e => ({ ...e, _source: 'game_base' })));
  } catch (err) {
    console.error('无法加载 game_base.json:', err.message);
  }

  // 3c. game_ch2plus.json 中的事件
  try {
    const fs = await import('node:fs/promises');
    const ch2Raw = await fs.readFile(resolve(SRC, 'data/game_ch2plus.json'), 'utf-8');
    const ch2 = JSON.parse(ch2Raw);
    const evts = (ch2.events || []).filter(e => e.id && e.description);
    events.push(...evts.map(e => ({ ...e, _source: 'game_ch2plus' })));
  } catch (err) {
    // ch2plus 可能不存在于所有版本，仅警告
    if (VERBOSE) console.warn('跳过 game_ch2plus.json:', err.message);
  }

  // 3d. 去重（按 id + source）
  const seen = new Set();
  events = events.filter(e => {
    const key = `${e._source}:${e.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return events;
}

// ══════════════════════════════════════════════════════════════════
// 4. 质量检查（纯函数，可独立测试）
// ══════════════════════════════════════════════════════════════════

/**
 * 收集所有文本（description + choice text/label）
 */
function collectTexts(event) {
  const parts = [event.description];
  if (Array.isArray(event.choices)) {
    for (const c of event.choices) {
      if (c.text)  parts.push(c.text);
      if (c.label) parts.push(c.label);
    }
  }
  return parts.join('\n');
}

/**
 * 检测完整事件文本中的违规词
 */
function checkForbiddenWords(event) {
  const text = collectTexts(event);
  const hits = [];
  for (const w of FORBIDDEN_WORDS) {
    if (text.includes(w)) {
      hits.push(w);
    }
  }
  return hits;
}

/**
 * 计算感叹号密度
 */
function countExclamations(text) {
  return (text.match(/[！!]/g) || []).length;
}

/**
 * 检测是否以对话为主
 * 对话标记：中文引号「」『』"" 或混合成段对话
 */
function isDialogueHeavy(text) {
  const cn = text.length;
  if (cn < 20) return false;
  // 匹配各种引号包裹的内容
  const quoted = (text.match(/[「『""]([^」』""]{4,})[」』""]/g) || []);
  let quotedLen = 0;
  for (const q of quoted) quotedLen += q.length;
  return (quotedLen / cn) > DIALOGUE_RATIO_LIMIT;
}

/**
 * 检测抽象判断词密度
 */
function countAbstractWords(text) {
  const absRe = /(可怕|惊人|异常|神秘莫测|难以言喻|无法形容|深不可测|非同寻常|异乎寻常|难以置信|闻所未闻|前所未有|毛骨悚然)/g;
  return (text.match(absRe) || []).length;
}

/**
 * 检测意象堆砌：每 200 字符中的强意象名词数量
 */
function countImageryStack(text) {
  const imageryRe = /(阴影|触手|眼睛|蠕动|滴落|低语|尖叫|腐化|变异|蠕动|蜷缩|裂缝|漩涡|粘液|苔藓|骨骸)/g;
  const count = (text.match(imageryRe) || []).length;
  return Math.ceil(count / (text.length / 200));
}

/**
 * 检测关键句长度（以句号/问号/感叹号/省略号分割后的最长句）
 */
function maxSentenceLen(text) {
  const sentences = text.split(/[。？！…\.\!\?]+/).filter(s => s.trim().length > 5);
  if (sentences.length === 0) return 0;
  return Math.max(...sentences.map(s => s.trim().length));
}

/**
 * 检测感官细节：是否包含触觉/听觉/嗅觉/味觉/视觉的具体描写
 */
function hasSensoryDetail(text) {
  const sensoryRe = /(冷|暖|热|湿|干|滑|粗糙|柔软|坚硬|尖锐|钝|气味|臭味|腥味|霉味|焦味|腐烂|铁锈|滴|落|渗|溅|飞|撞|砸|裂|剥|刮|擦|触|碰|声音|回响|低语|嗡|吱|嘎|咚|嗒|呜咽|嘶|盐|血|锈|泥|灰|雾|冰|火|光|暗)/;
  return (text.match(sensoryRe) || []).length >= 2;
}

/**
 * 将事件文本按句子拆分，统计内容性句子 vs 动作性句子
 */
function splitContentSentences(text) {
  const raw = text.split(/[。？！…\.\!\?]+/).map(s => s.trim()).filter(Boolean);
  // 内容性：非纯动作开头的句子
  const contentRe = /^[你他她它那这其这]|^[这那]|^[你的他的]|^[那里]|^[手中]|^[眼前]/;
  return raw.filter(s => contentRe.test(s) || s.length > 8);
}

// ══════════════════════════════════════════════════════════════════
// 5. 评分引擎
// ══════════════════════════════════════════════════════════════════

function scoreEvent(event) {
  const text = collectTexts(event);
  const cn   = [...text].filter(c => /[一-鿿]/.test(c)).length;
  if (cn < 10) {
    // 事件文本太短，不足以评估
    return { total: 100, breakdown: {}, flags: ['TOO_SHORT'], textLength: cn };
  }

  const breakdown = {};
  const flags     = [];

  // --- 禁用词（硬性规则：出现即扣完该维度分数）---
  const forbiddenHits = checkForbiddenWords(event);
  if (forbiddenHits.length > 0) {
    breakdown.forbidden = 0;
    flags.push(`FORBIDDEN_WORDS: ${[...new Set(forbiddenHits)].join(', ')}`);
  } else {
    breakdown.forbidden = SCORE_WEIGHTS.forbidden;
  }

  // --- 感官细节 ---
  if (hasSensoryDetail(text)) {
    breakdown.sensory = SCORE_WEIGHTS.sensory;
  } else {
    breakdown.sensory = 0;
    flags.push('NO_SENSORY_DETAIL');
  }

  // --- 感叹号 ---
  const excCount = countExclamations(text);
  if (excCount <= EXCLAMATION_THRESHOLD) {
    breakdown.calm = SCORE_WEIGHTS.calm;
  } else {
    const deduction = Math.min(SCORE_WEIGHTS.calm, (excCount - EXCLAMATION_THRESHOLD) * 3);
    breakdown.calm = Math.max(0, SCORE_WEIGHTS.calm - deduction);
    flags.push(`EXCLAMATION_OVERUSE: ${excCount}个`);
  }

  // --- 对话堆砌 ---
  if (!isDialogueHeavy(text)) {
    breakdown.dialogue = SCORE_WEIGHTS.dialogue;
  } else {
    breakdown.dialogue = 0;
    flags.push('DIALOGUE_HEAVY');
  }

  // --- 抽象判断 ---
  const abstractCount = countAbstractWords(text);
  if (abstractCount === 0) {
    breakdown.abstract = SCORE_WEIGHTS.abstract;
  } else {
    const ratio = abstractCount / (cn / 100);
    if (ratio <= ABSTRACT_RATIO_LIMIT) {
      breakdown.abstract = SCORE_WEIGHTS.abstract;
    } else {
      breakdown.abstract = Math.max(0, SCORE_WEIGHTS.abstract - 4);
      flags.push(`ABSTRACT_WORDS: ${abstractCount}个`);
    }
  }

  // --- 句式控制 ---
  const maxLen = maxSentenceLen(text);
  if (maxLen <= SENTENCE_LENGTH_LIMIT) {
    breakdown.length = SCORE_WEIGHTS.length;
  } else {
    const over = maxLen - SENTENCE_LENGTH_LIMIT;
    const deduction = Math.min(SCORE_WEIGHTS.length, Math.ceil(over / 5) * 2);
    breakdown.length = Math.max(0, SCORE_WEIGHTS.length - deduction);
    flags.push(`LONG_SENTENCE: ${maxLen}字`);
  }

  // --- 意象密度（奖励项，不扣分）---
  const imageryScore = Math.max(0, 5 - countImageryStack(text));
  breakdown.imagery_bonus = imageryScore; // 最多 +5

  const total = Object.values(breakdown).reduce((s, v) => s + v, 0);

  return {
    total,
    breakdown,
    flags,
    textLength: cn,
    sentenceCount: text.split(/[。？！…\.\!\?]+/).filter(Boolean).length,
    exclamationCount: excCount,
    forbiddenHits: [...new Set(forbiddenHits)],
    maxSentenceLen: maxLen,
  };
}

// ══════════════════════════════════════════════════════════════════
// 6. 报告生成
// ══════════════════════════════════════════════════════════════════

function grade(score) {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  return 'D';
}

function gradeColor(g) {
  const map = { S: '\x1b[35m', A: '\x1b[32m', B: '\x1b[36m', C: '\x1b[33m', D: '\x1b[31m' };
  return map[g] || '';
}
const RESET = '\x1b[0m';

function flagLabel(flag) {
  const map = {
    FORBIDDEN_WORDS:  '🚫 禁用词',
    NO_SENSORY_DETAIL:'⚠️  缺感官细节',
    EXCLAMATION_OVERUSE: '⚠️  感叹号过多',
    DIALOGUE_HEAVY:   '⚠️  对话堆砌',
    ABSTRACT_WORDS:   '⚠️  抽象判断词',
    LONG_SENTENCE:    '⚠️  长句',
    TOO_SHORT:        'ℹ️  文本过短',
  };
  return map[flag] || flag;
}

function generateReport(sample, results) {
  const scores = results.map(r => r.score);
  const avg   = scores.reduce((a, b) => a + b, 0) / scores.length;
  const min   = Math.min(...scores);
  const max   = Math.max(...scores);
  const bannedCount = results.filter(r => r.result.flags.some(f => f.startsWith('FORBIDDEN_WORDS'))).length;
  const failingCount = results.filter(r => r.score < MIN_SCORE_TO_PASS).length;

  // 维度均分
  const dimAvg = {};
  for (const dim of Object.keys(SCORE_WEIGHTS)) {
    const vals = results.map(r => r.result.breakdown[dim] ?? 0);
    dimAvg[dim] = vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  const lines = [];

  lines.push('');
  lines.push('╔══════════════════════════════════════════════════════════════╗');
  lines.push('║           叙事质量抽检报告 (Narrative Quality Spot-Check)  ║');
  lines.push('╚══════════════════════════════════════════════════════════════╝');
  lines.push('');
  lines.push(`  总事件数:     ${sample.totalCount}`);
  lines.push(`  抽检样本:     ${sample.size}`);
  lines.push(`  随机种子:     ${sample.seed}`);
  lines.push(`  抽检来源:     ${sample.sources.join(', ')}`);
  lines.push('');

  // 摘要
  lines.push('  ── 摘要 ──');
  lines.push(`  平均分: ${avg.toFixed(1)} / 100   (及格线: ${AVG_SCORE_TO_PASS})`);
  lines.push(`  最高分: ${max}   最低分: ${min}`);
  lines.push(`  不及格: ${failingCount} 条   含禁用词: ${bannedCount} 条`);
  lines.push('');

  // 维度均分
  lines.push('  ── 维度均分 ──');
  const dimLabels = {
    forbidden: '禁用词(35)', sensory: '感官细节(20)', calm: '冷静叙述(15)',
    dialogue: '对话控制(10)', abstract: '抽象判断(10)', length: '句式控制(10)',
  };
  for (const [key, label] of Object.entries(dimLabels)) {
    const maxV = SCORE_WEIGHTS[key] || 5;
    const pct  = ((dimAvg[key] / maxV) * 100).toFixed(0);
    const bar  = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
    lines.push(`    ${label.padEnd(18)} ${bar} ${pct}%`);
  }
  lines.push('');

  // 问题分类统计
  lines.push('  ── 问题分布 ──');
  const flagCounts = {};
  for (const r of results) {
    for (const f of r.result.flags) {
      flagCounts[f] = (flagCounts[f] || 0) + 1;
    }
  }
  const sortedFlags = Object.entries(flagCounts).sort((a, b) => b[1] - a[1]);
  if (sortedFlags.length === 0) {
    lines.push('    ✅ 未发现问题');
  } else {
    for (const [flag, count] of sortedFlags) {
      lines.push(`    ${flagLabel(flag).padEnd(16)} ${count} 条`);
    }
  }
  lines.push('');

  // 逐条结果（50 条以内全部展示）
  lines.push('  ── 抽检明细 ──');
  for (const r of results) {
      const g = grade(r.score);
      const color = gradeColor(g);
      const flagStr = r.result.flags.length > 0
        ? ` [${r.result.flags.map(f => flagLabel(f)).join(', ')}]`
        : '';
      const truncDesc = r.event.description.slice(0, 40).replace(/\n/g, ' ') + '…';
      lines.push(`    ${color}${g}${RESET} ${r.score.toString().padStart(3)} ${r.event.id.padEnd(30)} ${truncDesc}${flagStr}`);
    }
    lines.push('');

  // 质量等级分布
  const tierDist = {};
  for (const r of results) {
    const g = grade(r.score);
    tierDist[g] = (tierDist[g] || 0) + 1;
  }
  lines.push('  ── 抽检质量等级 ──');
  for (const g of ['S', 'A', 'B', 'C', 'D']) {
    if (tierDist[g]) {
      const c = gradeColor(g);
      lines.push(`    ${c}${g}${RESET}: ${tierDist[g].toString().padStart(3)} 条`);
    }
  }
  lines.push('');

  // 结论
  const passed = bannedCount === 0 && avg >= AVG_SCORE_TO_PASS;
  if (passed) {
    lines.push('  ✅ 抽检通过');
  } else {
    lines.push('  ❌ 抽检未通过');
    if (bannedCount > 0) {
      lines.push(`     • ${bannedCount} 条事件含禁用词（硬性违规）`);
    }
    if (avg < AVG_SCORE_TO_PASS) {
      lines.push(`     • 平均分 ${avg.toFixed(1)} 低于及格线 ${AVG_SCORE_TO_PASS}`);
    }
  }
  lines.push('');
  lines.push('  提示: 用 --verbose 查看完整明细, --count N 调整样本量, --seed N 固定随机种子');
  lines.push('');

  return {
    avg,
    min,
    max,
    failingCount,
    bannedCount,
    passed,
    lines: lines.join('\n'),
  };
}

// ══════════════════════════════════════════════════════════════════
// 7. 主流程
// ══════════════════════════════════════════════════════════════════

async function main() {
  console.log(`\n📖 叙事质量抽检 — 加载事件数据...`);

  const events = await loadAllEvents();
  if (events.length === 0) {
    console.error('❌ 未加载到任何事件，请检查数据路径');
    process.exit(2);
  }

  console.log(`   已加载 ${events.length} 个事件`);

  // 抽样（Fisher-Yates shuffle + 取前 N）
  const rng = mulberry32(SEED);
  const shuffled = shuffle(events, rng);
  const sample = shuffled.slice(0, Math.min(SAMPLE_SIZE, shuffled.length));

  // 按来源统计
  const sources = [...new Set(sample.map(e => e._source))];

  console.log(`   抽检 ${sample.length} 条（种子: ${SEED}）\n`);

  // 逐条评分
  const results = sample.map(event => {
    const result = scoreEvent(event);
    return { event, score: result.total, result };
  });

  // 生成报告
  const sampleInfo = {
    totalCount: events.length,
    size: sample.length,
    seed: SEED,
    sources,
  };

  const report = generateReport(sampleInfo, results);
  console.log(report.lines);

  // 退出码
  if (!report.passed) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch(err => {
  console.error('❌ 脚本执行失败:', err);
  process.exit(2);
});
