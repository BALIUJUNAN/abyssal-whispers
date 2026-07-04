#!/usr/bin/env node
/**
 * check_build.cjs — 构建产物验证脚本（Vite single-file 构建）
 * 用法: node check_build.cjs [--dist]
 *   默认检查 dist/index.html（Vite 输出）
 *   --dist  额外检查 dist/ 目录结构（assets / audio）
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST_PATH = path.join(ROOT, 'dist');
const INDEX_PATH = path.join(DIST_PATH, 'index.html');
const checkDist = process.argv.includes('--dist');

const results = [];

function pass(label, detail) {
  results.push({ status: 'PASS', label, detail });
}
function fail(label, detail) {
  results.push({ status: 'FAIL', label, detail });
}

// ─ 1. dist/index.html 存在且大小 > 1MB ─────────────────────────────
const SIZE_MIN = 1 * 1024 * 1024;

if (!fs.existsSync(INDEX_PATH)) {
  fail('dist/index.html 存在性', '文件不存在');
} else {
  const size = fs.statSync(INDEX_PATH).size;
  if (size > SIZE_MIN) {
    pass('dist/index.html 大小', (size / 1024 / 1024).toFixed(2) + ' MB');
  } else {
    fail('dist/index.html 大小', '仅 ' + (size / 1024).toFixed(1) + ' KB，期望 > 1 MB');
  }
}

// ─ 2. 关键字检查（Vite single-file 输出） ───────────────────────────
const HTML = fs.readFileSync(INDEX_PATH, 'utf8');

const keywords = [
  ['ErrorBoundary', 'ErrorBoundary 组件'],
  ['createRoot', 'React 挂载点'],
  ['useGameStore', 'Zustand store'],
  ['useSan', 'SAN selector'],
  ['audioManager', '音频管理器'],
  ['initialState', '初始状态'],
  ['narrative', '叙事数组'],
  ['eventLog', '事件日志'],
  ['inventory', '物品栏'],
  ['clues', '线索系统'],
  ['safehouseCorruption', '安全屋腐化'],
  ['loopCount', '轮回计数'],
  ['madnessActive', '疯狂状态'],
  ['ending', '结局系统'],
  ['pendingEvent', '待处理事件'],
  ['transition', '场景转场'],
  ['glitchPulse', '故障脉冲'],
  ['stats_run', '运行统计'],
  ['accessibilityOptions', '无障碍选项'],
];

for (const [kw, label] of keywords) {
  const count = HTML.split(kw).length - 1;
  if (count >= 1) {
    pass('关键字 "' + kw + '"', '出现 ' + count + ' 次');
  } else {
    fail('关键字 "' + kw + '"', '未找到');
  }
}

// ─ 3. 无残留 import/export ──────────────────────────────────────────
let stripped = HTML;
stripped = stripped.replace(/\/\*[\s\S]*?\*\//g, '');
stripped = stripped.replace(/\/\/.*$/gm, '');
stripped = stripped.replace(/"([^"\\]|\\.)*"/g, '""');
stripped = stripped.replace(/'([^'\\]|\\.)*'/g, "''");
stripped = stripped.replace(/`([^`\\]|\\.)*`/g, '``');

const importMatch = stripped.match(/\bimport\s*[\s{]/);
const exportMatch = stripped.match(
  /\bexport\s*(?:default\s+|(?:const|let|var|function|class)\s+|\{)/
);

if (importMatch) {
  fail('import 残留', '发现: import ... (位置约 ' + importMatch.index + ')');
} else {
  pass('import 残留', '未发现');
}
if (exportMatch) {
  fail('export 残留', '发现: export ... (位置约 ' + exportMatch.index + ')');
} else {
  pass('export 残留', '未发现');
}

// ─ 4-7. dist/ 目录结构检查（--dist 启用） ───────────────────────────
if (!checkDist) {
  console.log('');
  console.log('='.repeat(60));
  console.log('  dist/ 检查已跳过（使用 --dist 参数启用）');
  console.log('='.repeat(60));
} else {
  // 4. dist/index.html 已在上面检查过，这里只检查目录结构
  const DIST_WEBP = path.join(DIST_PATH, 'webp');
  const DIST_WEBP_ENDING = path.join(DIST_PATH, 'webp_ending');
  const DIST_AUDIO = path.join(DIST_PATH, 'audio');
  const DIST_SRC = path.join(DIST_PATH, 'src');

  // 5. dist/webp/ 和 dist/audio/ 存在（Vite publicDir 输出到 dist/ 根）
  if (fs.existsSync(DIST_WEBP) && fs.statSync(DIST_WEBP).isDirectory()) {
    pass('dist/webp/', '目录存在');
  } else {
    fail('dist/webp/', '目录不存在');
  }
  if (fs.existsSync(DIST_AUDIO) && fs.statSync(DIST_AUDIO).isDirectory()) {
    pass('dist/audio/', '目录存在');
  } else {
    fail('dist/audio/', '目录不存在');
  }

  // 6. dist/src/ 不应存在
  if (fs.existsSync(DIST_SRC)) {
    fail('dist/src/ 不应存在', '发现 src/ 残留目录');
  } else {
    pass('dist/src/ 不应存在', '无残留');
  }

  // 7a. dist/webp/ 下 webp 文件数 >= 100（基础场景图）
  if (fs.existsSync(DIST_WEBP)) {
    const count = fs.readdirSync(DIST_WEBP).filter((f) => f.endsWith('.webp')).length;
    if (count >= 100) {
      pass('dist/webp/ 文件数', count + ' 个');
    } else {
      fail('dist/webp/ 文件数', '仅 ' + count + ' 个，期望 >= 100');
    }
  }

  // 7b. dist/webp_ending/ 下 webp 文件数 >= 50（结局 CG）
  if (fs.existsSync(DIST_WEBP_ENDING)) {
    const count = fs.readdirSync(DIST_WEBP_ENDING).filter((f) => f.endsWith('.webp')).length;
    if (count >= 50) {
      pass('dist/webp_ending/ 文件数', count + ' 个');
    } else {
      fail('dist/webp_ending/ 文件数', '仅 ' + count + ' 个，期望 >= 50');
    }
  }

  // 7c. dist/audio/ 音频文件数 >= 50
  if (fs.existsSync(DIST_AUDIO)) {
    const count = fs.readdirSync(DIST_AUDIO).filter((f) => /\.(wav|mp3|ogg|m4a)$/i.test(f)).length;
    if (count >= 50) {
      pass('dist/audio/ 音频文件数', count + ' 个');
    } else {
      fail('dist/audio/ 音频文件数', '仅 ' + count + ' 个，期望 >= 50');
    }
  }
}

// ─ 输出汇总 ────────────────────────────────────────────────────────
const passed = results.filter((r) => r.status === 'PASS').length;
const failed = results.filter((r) => r.status === 'FAIL').length;

console.log('');
console.log('='.repeat(60));
console.log('  构建产物验证结果');
console.log('='.repeat(60));

for (const r of results) {
  const icon = r.status === 'PASS' ? '✅' : '❌';
  const detail = r.detail ? ' — ' + r.detail : '';
  console.log('  ' + icon + ' ' + r.label + detail);
}

console.log('');
console.log('-'.repeat(60));
console.log('  PASS: ' + passed + '   FAIL: ' + failed + '   总计: ' + results.length);
console.log('-'.repeat(60));
console.log('');

if (failed > 0) {
  console.log('❌ BUILD CHECK FAILED');
  process.exit(1);
} else {
  console.log('✅ BUILD CHECK PASSED');
}
