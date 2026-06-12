#!/usr/bin/env node
/**
 * scripts/lint_san_mutations.cjs
 * Static lint: forbid direct SAN mutations in reducers/slices.
 * Allowed pattern: applySanLoss(s, amount) from utils.js
 * Whitelist: coreSlice.js (initialization), utils.js (the helper itself)
 *
 * Run: node scripts/lint_san_mutations.cjs
 * Exit code 0 = clean, 1 = violations found
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src', 'reducers');

const SCAN_DIRS = [SRC, path.join(SRC, 'slices')];

// Whitelist: files allowed to mutate SAN directly
const WHITELIST = new Set([
  'coreSlice.js',   // SAN initialization from stats
  'utils.js',       // applySanLoss helper definition
]);

// Forbidden regex: s.san = clamp(s.san - ...) or state.san = clamp(state.san - ...)
const RE_S = /s\.san\s*=\s*clamp\(s\.san\s*-/;
const RE_STATE = /state\.san\s*=\s*clamp\(state\.san\s*-/;
const RE_MAX0 = /s\.san\s*=\s*Math\.max\(0,\s*\(s\.san\s*\|\|\s*0\)\s*-\s*\d+\)/;

let errors = 0;
let checked = 0;

function scanFile(filePath) {
  const rel = path.relative(ROOT, filePath);
  const basename = path.basename(filePath);
  if (WHITELIST.has(basename)) return;

  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('//')) continue;
    if (line.includes('function applySanLoss')) continue;

    if (RE_S.test(line)) {
      errors++;
      console.error('  FAIL: ' + rel + ':' + (i + 1) + ' -- ' + line.trim());
      console.error('        Use applySanLoss(s, amount) from utils.js');
    }
    if (RE_STATE.test(line)) {
      errors++;
      console.error('  FAIL: ' + rel + ':' + (i + 1) + ' -- ' + line.trim());
      console.error('        Use applySanLoss(state, amount) from utils.js');
    }
    if (RE_MAX0.test(line)) {
      errors++;
      console.error('  FAIL: ' + rel + ':' + (i + 1) + ' -- ' + line.trim());
      console.error('        Use applySanLoss(s, amount) from utils.js');
    }
  }
  checked++;
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.js')) scanFile(full);
  }
}

console.log('== SAN Mutation Lint ==');
console.log('  Scanning: ' + SCAN_DIRS.map(d => path.relative(ROOT, d)).join(', '));
console.log('  Whitelist: ' + [...WHITELIST].join(', '));
console.log('');

for (const dir of SCAN_DIRS) {
  if (fs.existsSync(dir)) walk(dir);
}

console.log('');
console.log('  Checked ' + checked + ' files');
if (errors > 0) {
  console.error('\n  ❌ ' + errors + ' violation(s) found');
  process.exit(1);
} else {
  console.log('  ✅ No direct SAN mutations found (all use applySanLoss)');
  process.exit(0);
}
