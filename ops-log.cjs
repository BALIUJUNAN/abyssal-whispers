#!/usr/bin/env node
/**
 * ops-log.cjs — 操作日志工具
 * 
 * 用法:
 *   node ops-log.cjs record "描述文字"     # 记录一条操作
 *   node ops-log.cjs list [--n 20]          # 查看最近 N 条（默认 20）
 *   node ops-log.cjs search "关键词"       # 搜索包含关键词的记录
 *   node ops-log.cjs export              # 导出为 Markdown 格式
 *   node ops-log.cjs stats               # 统计信息
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const LOG_FILE = path.join(__dirname, '.ops-log.json');
const MAX_ENTRIES = 2000;

function load() {
  try {
    if (fs.existsSync(LOG_FILE)) return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
    return { entries: [] };
  } catch { return { entries: [] }; }
}

function save(data) {
  // 保留最近 MAX_ENTRIES 条
  if (data.entries.length > MAX_ENTRIES) {
    data.entries = data.entries.slice(-MAX_ENTRIES);
    data.truncated = true;
    data.truncatedAt = new Date().toISOString();
  } else {
    data.truncated = false;
  }
  fs.writeFileSync(LOG_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function record(message) {
  const data = load();
  const entry = {
    ts: new Date().toISOString(),
    msg: message,
    git: null,
    build: null,
    files: null
  };
  
  // 尝试获取 git 信息
  try {
    const { execSync } = require('child_process');
    try {
      entry.git = execSync('git rev-parse --short HEAD', { encoding: 'utf8', stdio: 'pipe' }).stdout.trim();
    } catch(e) { /* no git */ }
    
    // 获取当前修改的文件列表
    try {
      const diff = execSync('git status -s --short', { encoding: 'utf8', stdio: 'pipe' }).stdout.trim();
      if (diff) entry.files = diff.split('\n').filter(Boolean);
    } catch(e) { /* ignore */ }
    
    // 获取最近的 commit message
    try {
      entry.lastCommit = execSync('git log -1 --pretty=format:"%s (%h)"', { encoding: 'utf8', stdio: 'pipe' }).stdout.trim();
    } catch(e) { /* ignore */ }
  } catch(e) { /* child_process not available */ }
  
  // 尝试获取 build 产物信息
  try {
    const indexPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(indexPath)) {
      const stat = fs.statSync(indexPath);
      entry.build = {
        size: stat.size,
        sizeKB: Math.round(stat.size / 1024) + 'KB',
        modified: stat.mtime.toISOString()
      };
    }
  } catch(e) { /* ignore */ }
  
  data.entries.push(entry);
  save(data);
  console.log(`✅ [#${data.entries.length}] ${entry.ts}  ${message}`);
  return entry;
}

function list(options = {}) {
  const data = load();
  const n = options.n || 20;
  const entries = data.entries.slice(-n).reverse();
  
  if (entries.length === 0) {
    console.log('(空 - 无操作记录)');
    return;
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log(`  操作日志 — 最近 ${entries.length} 条 (共 ${data.entries.length} 条)`);
  console.log('='.repeat(70) + '\n');
  
  entries.forEach((e, i) => {
    const idx = data.entries.length - i;
    const time = e.ts.replace('T', ' ').substring(0, 19);
    let line = `  #${String(idx).padStart(4)}  ${time}`;
    if (e.git) line += ` [${e.git}]`;
    console.log(line);
    console.log(`         ${e.msg}`);
    if (e.build) console.log(`         📦 build: ${e.build.sizeKB}`);
    if (e.files && e.files.length > 0 && e.files.length <= 10) {
      console.log(`         📝 文件: ${e.files.join(', ')}`);
    } else if (e.files && e.files.length > 10) {
      console.log(`         📝 文件: ${e.files.length} 个已修改`);
    }
    console.log('');
  });
  
  if (data.truncated) {
    console.log(`  ⚠️ 日志已截断至最近 ${MAX_ENTRIES} 条 (原始更多)`);
    console.log(`  截断时间: ${data.truncatedAt}`);
  }
}

function search(keyword) {
  const data = load();
  const kw = keyword.toLowerCase();
  const hits = data.entries.filter(e => 
    e.msg.toLowerCase().includes(kw) || 
    (e.files && e.files.some(f => f.toLowerCase().includes(kw)))
  );
  
  console.log(`\n搜索 "${keyword}" — 匹配 ${hits.length}/${data.entries.length} 条:\n`);
  
  hits.forEach((e, i) => {
    const idx = data.entries.indexOf(e) + 1;
    const time = e.ts.replace('T', ' ').substring(0, 19);
    console.log(`  #${idx}  ${time}  ${e.msg}`);
  });
  
  if (hits.length === 0) console.log('  (无匹配)');
}

function exportMd() {
  const data = load();
  const lines = [
    '# 操作日志',
    '',
    `> 自动生成的操作记录 — 共 ${data.entries.length} 条`,
    `> 最后更新: ${new Date().toISOString()}`,
    '',
    '| # | 时间 | 操作 | Git | Build |',
    '|---|------|------|-----|-------|',
  ];
  
  data.entries.forEach((e, i) => {
    const time = e.ts.replace('T', ' ').substring(0, 19).replace(/-/g, '');
    const git = e.git || '-';
    const build = e.build ? e.build.sizeKB : '-';
    lines.push(`| ${i + 1} | ${time} | ${e.msg} | ${git} | ${build} |`);
  });
  
  if (data.truncated) {
    lines.push('', `> ⚠️ 已截断至最近 ${MAX_ENTRIES} 条`);
  }
  
  const mdPath = path.join(__dirname, 'OPS_LOG.md');
  fs.writeFileSync(mdPath, lines.join('\n'), 'utf8');
  console.log(`✅ 已导出到 OPS_LOG.md (${lines.length} 行)`);
}

function stats() {
  const data = load();
  console.log('\n' + '='.repeat(50));
  console.log('  统计信息');
  console.log('='.repeat(50) + '\n');
  console.log(`  总记录数:    ${data.entries.length}`);
  
  if (data.entries.length > 0) {
    const first = data.entries[0].ts;
    const last = data.entries[data.entries.length - 1].ts;
    console.log(`  首次记录:   ${first}`);
    console.log(`  最近记录:   ${last}`);
    
    // 按消息前缀统计
    const prefixes = {};
    data.entries.forEach(e => {
      const p = e.msg.split(':')[0] || e.msg.split(' ')[0];
      prefixes[p] = (prefixes[p] || 0) + 1;
    });
    const sorted = Object.entries(prefixes).sort((a, b) => b[1] - a[1]);
    console.log(`\n  操作类型分布:`);
    sorted.slice(0, 10).forEach(([k, v]) => {
      console.log(`    ${String(v).padStart(4)}  ${k}`);
    });
  }
  
  if (data.truncated) {
    console.log(`\n  ⚠️ 日志曾发生截断`);
  }
}

// CLI
const args = process.argv.slice(2);
const cmd = args[0];

if (!cmd || cmd === 'list') {
  const n = args[1] ? parseInt(args[1]) : undefined;
  list(n ? { n } : {});
} else if (cmd === 'record') {
  const msg = args.slice(1).join(' ');
  if (!msg) {
    console.error('用法: node ops-log.cjs record "操作描述"');
    process.exit(1);
  }
  record(msg);
} else if (cmd === 'search') {
  const kw = args[1];
  if (!kw) {
    console.error('用法: node ops-log.cjs search "关键词"');
    process.exit(1);
  }
  search(kw);
} else if (cmd === 'export') {
  exportMd();
} else if (cmd === 'stats') {
  stats();
} else if (cmd === '--help' || cmd === '-h') {
  console.log(`
操作日志工具

用法:
  node ops-log.cjs record "描述文字"     记录一条操作
  node ops-log.cjs list [--n 20]          查看最近 N 条
  node ops-log.cjs search "关键词"       搜索记录
  node ops-log.cjs export              导出为 Markdown
  node ops-log.cjs stats               统计信息
  
日志文件: .ops-log.json（项目根目录，不提交到 git）
  `);
} else {
  console.error(`未知命令: ${cmd}. 用 --help 查看帮助`);
  process.exit(1);
}
