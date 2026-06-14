#!/usr/bin/env node
/**
 * scripts/validate-data.cjs — Validate game data against Zod schemas.
 * Usage: node scripts/validate-data.cjs [--fix] [--verbose]
 *
 * Checks:
 *   - game_base.json events, npcs, areas, items
 *   - All extended event JS files (src/data/events_*.js)
 *   - Reports schema violations with field-level detail
 *
 * Exit code: 0 = all valid, 1 = violations found, 2 = load error
 */

const fs = require('fs');
const path = require('path');

async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose');

  // Dynamic import for ESM Zod schemas
  let schemas;
  try {
    schemas = await import('../src/data/schemas/index.js');
  } catch (e) {
    console.error('Failed to load schemas:', e.message);
    process.exit(2);
  }

  let totalValid = 0, totalInvalid = 0, totalErrors = [];

  // ── Validate game_base.json ──
  console.log('\n=== Validating game_base.json ===');
  try {
    const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/game_base.json'), 'utf8'));
    const result = schemas.validateGameData(data);

    for (const [type, res] of Object.entries(result)) {
      const icon = res.invalid === 0 ? '✅' : '❌';
      console.log(`  ${icon} ${type}: ${res.valid} valid, ${res.invalid} invalid`);
      if (res.invalid > 0 && verbose) {
        res.errors.forEach(e => {
          console.log(`    - ${e.id}: ${e.issues.map(i => i.path.join('.') + ': ' + i.message).join('; ')}`);
        });
      }
      totalValid += res.valid;
      totalInvalid += res.invalid;
      totalErrors.push(...res.errors);
    }
  } catch (e) {
    console.error('  Failed to load game_base.json:', e.message);
    process.exit(2);
  }

  // ── Validate extended event JS files ──
  console.log('\n=== Validating extended events ===');
  const dataDir = path.resolve(__dirname, '../src/data');
  const eventFiles = fs.readdirSync(dataDir)
    .filter(f => f.startsWith('events_') && f.endsWith('.js') && !f.includes('test_'));

  for (const file of eventFiles) {
    try {
      // Windows: convert to file:// URL for ESM dynamic import
      const filePath = path.join(dataDir, file);
      const fileUrl = 'file:///' + filePath.replace(/\\/g, '/');
      const mod = await import(fileUrl);
      const events = mod.events || mod.default || mod.EVENTS || [];
      if (!Array.isArray(events) || events.length === 0) {
        console.log(`  ⚠ ${file}: no events found (export name?)`);
        continue;
      }
      const result = schemas.validateAllEvents(events);
      const icon = result.invalid === 0 ? '✅' : '❌';
      console.log(`  ${icon} ${file}: ${result.valid} valid, ${result.invalid} invalid`);
      if (result.invalid > 0 && verbose) {
        result.errors.slice(0, 5).forEach(e => {
          console.log(`    - ${e.id}: ${e.issues.map(i => i.path.join('.') + ': ' + i.message).join('; ')}`);
        });
        if (result.errors.length > 5) console.log(`    ... and ${result.errors.length - 5} more`);
      }
      totalValid += result.valid;
      totalInvalid += result.invalid;
      totalErrors.push(...result.errors);
    } catch (e) {
      console.log(`  ⚠ ${file}: load error — ${e.message.slice(0, 80)}`);
    }
  }

  // ── Summary ──
  console.log('\n=== Summary ===');
  console.log(`  Total: ${totalValid} valid, ${totalInvalid} invalid`);
  if (totalInvalid > 0) {
    console.log(`  ❌ ${totalInvalid} schema violations found`);
    if (!verbose) console.log('  Run with --verbose to see details');
    process.exit(1);
  } else {
    console.log('  ✅ All data passes schema validation');
    process.exit(0);
  }
}

main().catch(e => { console.error(e); process.exit(2); });
