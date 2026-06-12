#!/usr/bin/env node
/**
 * check_build.cjs — 构建产物验证脚本
 * 用法: node check_build.cjs [--dist]
 *   默认只检查 index.html（对应 python build.py 输出）
 *   --dist  额外检查 dist/ 目录结构（对应部署产物）
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const INDEX_PATH = path.join(ROOT, 'index.html');
const DIST_PATH = path.join(ROOT, 'dist');
const checkDist = process.argv.includes('--dist');

const results = [];

function pass(label, detail) {
  results.push({ status: 'PASS', label, detail });
}
function fail(label, detail) {
  results.push({ status: 'FAIL', label, detail });
}

// ─ 1. index.html 存在且大小 > 1MB ─────────────────────────────────
const SIZE_MIN = 1 * 1024 * 1024;

if (!fs.existsSync(INDEX_PATH)) {
  fail('index.html 存在性', '文件不存在');
} else {
  const size = fs.statSync(INDEX_PATH).size;
  if (size > SIZE_MIN) {
    pass('index.html 大小', (size / 1024 / 1024).toFixed(2) + ' MB');
  } else {
    fail('index.html 大小', '仅 ' + (size / 1024).toFixed(1) + ' KB，期望 > 1 MB');
  }
}

// ─ 2. 关键字检查 ───────────────────────────────────────────────────
const HTML = fs.readFileSync(INDEX_PATH, 'utf8');

const keywords = [
  ['const GD=', 'GD 初始化'],
  ['ErrorBoundary', 'ErrorBoundary 组件'],
  ['ReactDOM.createRoot', 'React 挂载点'],
  ['getClueNameMap', '线索名映射 (getClueNameMap)'],
  ['audioManager', '音频管理器'],
  ['initialState', '初始状态'],
  ['gameReducer', '主 reducer'],
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
//    先去除注释和字符串内容，避免误报
let stripped = HTML;
// 去除多行注释
stripped = stripped.replace(/\/\*[\s\S]*?\*\//g, '');
// 去除单行注释
stripped = stripped.replace(/\/\/.*$/gm, '');
// 去除双引号字符串（保留引号本身）
stripped = stripped.replace(/"([^"\\]|\\.)*"/g, '""');
// 去除单引号字符串
stripped = stripped.replace(/'([^'\\]|\\.)*'/g, "''");
// 去除模板字符串
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

// ─ 4-7. dist/ 目录结构检查（可选） ─────────────────────────────────
if (!checkDist) {
  console.log('');
  console.log('='.repeat(60));
  console.log('  dist/ 检查已跳过（使用 --dist 参数启用）');
  console.log('='.repeat(60));
} else {
  const DIST_INDEX = path.join(DIST_PATH, 'index.html');
  const DIST_ASSETS = path.join(DIST_PATH, 'assets');
  const DIST_AUDIO = path.join(DIST_PATH, 'audio');
  const DIST_SRC = path.join(DIST_PATH, 'src');

  // 4. dist/index.html 存在
  if (fs.existsSync(DIST_INDEX)) {
    pass('dist/index.html', '存在');
  } else {
    fail('dist/index.html', '不存在');
  }

  // 5. dist/assets/ 和 dist/audio/ 存在
  if (fs.existsSync(DIST_ASSETS) && fs.statSync(DIST_ASSETS).isDirectory()) {
    pass('dist/assets/', '目录存在');
  } else {
    fail('dist/assets/', '目录不存在');
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

  // 7a. dist/assets/webp/ 下 webp 文件数 >= 200
  const webpDir = path.join(DIST_ASSETS, 'webp');
  if (fs.existsSync(webpDir)) {
    const count = fs.readdirSync(webpDir).filter((f) => f.endsWith('.webp')).length;
    if (count >= 200) {
      pass('dist/assets/webp/ 文件数', count + ' 个');
    } else {
      fail('dist/assets/webp/ 文件数', '仅 ' + count + ' 个，期望 >= 200');
    }
  } else {
    fail('dist/assets/webp/', '目录不存在');
  }

  // 7b. dist/audio/ 音频文件数 >= 50
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
