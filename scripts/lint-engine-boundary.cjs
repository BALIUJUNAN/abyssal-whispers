#!/usr/bin/env node
/**
 * scripts/lint-engine-boundary.cjs — Enforce src/engine/ boundary rules.
 *
 * Rule: src/engine/ must NEVER import from:
 *   - ../reducers/*.js (except ../reducers/utils.js)
 *   - ../reducers/slices/*.js
 *   - ../systems/*.js
 *   - ../data/*.js or ../data/*.json
 *   - ../components/*.jsx
 *   - ../state/*.js
 *   - ../managers/*.js
 *
 * Usage: node scripts/lint-engine-boundary.cjs
 * Exit: 0 = clean, 1 = violations found
 */

const fs = require('fs');
const path = require('path');

const ENGINE_DIR = path.resolve(__dirname, '../src/engine');

// Allowed imports from outside engine/
const ALLOWED = [
  '../reducers/utils.js',  // pure math (clamp, pick, rand)
];

// Forbidden import patterns
const FORBIDDEN_PATTERNS = [
  { pattern: /from\s+['"]\.\.\/reducers\/(?!utils\.js)/, label: 'reducers/ (except utils.js)' },
  { pattern: /from\s+['"]\.\.\/reducers\/slices\//, label: 'reducers/slices/' },
  { pattern: /from\s+['"]\.\.\/systems\//, label: 'systems/' },
  { pattern: /from\s+['"]\.\.\/data\//, label: 'data/' },
  { pattern: /from\s+['"]\.\.\/components\//, label: 'components/' },
  { pattern: /from\s+['"]\.\.\/state\//, label: 'state/' },
  { pattern: /from\s+['"]\.\.\/managers\//, label: 'managers/' },
];

let violations = 0;

const files = fs.readdirSync(ENGINE_DIR).filter(f => f.endsWith('.js') && f !== 'ENGINE_CONTRACT.md');

for (const file of files) {
  const filePath = path.join(ENGINE_DIR, file);
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;

    for (const rule of FORBIDDEN_PATTERNS) {
      if (rule.pattern.test(line)) {
        // Check if it's in the allowed list
        const isAllowed = ALLOWED.some(a => line.includes(a));
        if (!isAllowed) {
          console.log(`  ❌ ${file}:${i + 1} — imports from ${rule.label}`);
          console.log(`     ${line.trim()}`);
          violations++;
        }
      }
    }
  }
}

if (violations === 0) {
  console.log('  ✅ src/engine/ boundary clean — zero violations');
  process.exit(0);
} else {
  console.log(`\n  ❌ ${violations} boundary violation(s) found`);
  console.log('  See src/engine/ENGINE_CONTRACT.md for rules');
  process.exit(1);
}
