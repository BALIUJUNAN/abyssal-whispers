#!/usr/bin/env node
'use strict';

// Deterministic gameplay RNG guard.
// UI animation randomness lives outside these roots. Any direct Math.random()
// call in game logic must carry a nearby `rng-exempt:` rationale.

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const LOGIC_ROOTS = [
  'src/reducers',
  'src/systems',
  'src/engine',
  'src/data',
  'src/state',
  'src/utils',
];

function walk(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(?:js|jsx)$/.test(entry.name)) files.push(full);
  }
}

function stripBlockComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, function (comment) {
    return comment.replace(/[^\n]/g, ' ');
  });
}

function lineNumber(source, index) {
  return source.slice(0, index).split('\n').length;
}

function nearbyHasExemption(lines, line) {
  const start = Math.max(0, line - 4);
  return lines.slice(start, line).some(function (text) {
    return text.indexOf('rng-exempt:') >= 0;
  });
}

function callHasTopLevelComma(source, openParenIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = openParenIndex; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '(') depth += 1;
    else if (char === ')') {
      depth -= 1;
      if (depth === 0) return false;
    } else if (char === ',' && depth === 1) {
      return true;
    }
  }
  return false;
}

const files = [];
for (const relativeRoot of LOGIC_ROOTS) walk(path.join(ROOT, relativeRoot), files);

const violations = [];
for (const file of files) {
  const relative = path.relative(ROOT, file).replace(/\\/g, '/');
  const original = fs.readFileSync(file, 'utf8');
  const withoutBlocks = stripBlockComments(original);
  const code = withoutBlocks.replace(/(^|\s)\/\/.*$/gm, '$1');
  const lines = original.split('\n');

  for (const match of code.matchAll(/Math\.random\s*\(/g)) {
    const line = lineNumber(code, match.index);
    if (!nearbyHasExemption(lines, line)) {
      violations.push(relative + ':' + line + ' direct Math.random() without rng-exempt rationale');
    }
  }

  for (const match of code.matchAll(
    /(?:c\.rng|c\s*&&\s*c\.rng)[^\n]{0,100}\?[^\n]{0,160}Math\.random/g
  )) {
    const line = lineNumber(code, match.index);
    violations.push(relative + ':' + line + ' reducer context may downgrade c.rng to Math.random');
  }

  for (const match of code.matchAll(/\b_rand\s*\(\s*[^)\n]*,/g)) {
    const line = lineNumber(code, match.index);
    violations.push(
      relative +
        ':' +
        line +
        ' makeRand result is zero-argument; integer range arguments are ignored'
    );
  }

  // reducers/utils.pick falls back to Math.random when its RNG argument is
  // omitted. Catch the indirect leak as well as direct Math.random calls.
  for (const match of code.matchAll(/(^|[^\w$.])pick\s*\(/gm)) {
    const pickOffset = match[0].lastIndexOf('pick');
    const callIndex = match.index + pickOffset;
    const openParenIndex = code.indexOf('(', callIndex);
    const line = lineNumber(code, callIndex);
    const lineText = lines[line - 1] || '';
    if (/^\s*(?:function\s+)?pick\s*\([^)]*\)\s*\{/.test(lineText)) continue;
    if (!callHasTopLevelComma(code, openParenIndex) && !nearbyHasExemption(lines, line)) {
      violations.push(relative + ':' + line + ' pick(...) omits RNG and falls back to Math.random');
    }
  }

  for (const match of code.matchAll(/generateDeathFragments\s*\([^,\n]+,[^,\n]+,\s*null\s*\)/g)) {
    const line = lineNumber(code, match.index);
    violations.push(relative + ':' + line + ' death fragment generation must receive reducer RNG');
  }
}

if (violations.length > 0) {
  console.error('RNG leak guard failed (' + violations.length + '):');
  for (const violation of violations) console.error('  - ' + violation);
  process.exit(1);
}

console.log('RNG leak guard passed (' + files.length + ' gameplay files scanned).');
