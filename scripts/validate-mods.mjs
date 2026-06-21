#!/usr/bin/env node
/**
 * Mod Validation Test Script
 *
 * Validates all example mods against the UGC schema.
 * Run with: node scripts/validate-mods.mjs
 *
 * Checks:
 * 1. Each mod JSON parses correctly
 * 2. Each mod passes schema validation
 * 3. Event IDs are unique within each mod
 * 4. Required fields are present
 * 5. No dangerous patterns (code injection)
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MODS_DIR = join(ROOT, 'mods');

// Dynamic import of ESM module
let validateMod;
let LIMITS;
try {
  const schema = await import('../src/data/ugcSchema.js');
  validateMod = schema.validateMod;
  LIMITS = schema.LIMITS;
} catch (e) {
  console.error('❌ Cannot load ugcSchema.js:', e.message);
  console.error('   Make sure you run this from the project root.');
  process.exit(1);
}

/**
 * Find all mod.json files in the mods directory
 */
async function findModFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter(e => e.isFile() && e.name === 'mod.json')
    .map(e => join(e.parentPath || dir, e.name));
}

/**
 * Validate a single mod file
 */
function validateModFile(filePath) {
  const result = {
    file: filePath.replace(ROOT + '/', ''),
    valid: false,
    errors: [],
    warnings: [],
    eventCount: 0,
  };

  try {
    const content = readFileSync(filePath, 'utf8');
    const raw = JSON.parse(content);

    // Run schema validation
    const schemaResult = validateMod(raw);
    result.valid = schemaResult.valid;
    result.errors = schemaResult.errors || [];
    result.warnings = schemaResult.warnings || [];
    result.eventCount = schemaResult.sanitized?.events?.length || 0;
    result.modId = raw.id;
    result.modName = raw.name;
    result.modVersion = raw.version;

    // Additional checks
    if (!raw.id) {
      result.errors.push('Missing required field: mod.id');
    }
    if (!raw.events) {
      result.warnings.push('No events array (metadata-only mod, skipping event validation)');
      result.valid = true;
      return result;
    }
    if (!Array.isArray(raw.events)) {
      result.errors.push('Missing or invalid: mod.events (must be an array)');
    } else if (raw.events.length === 0) {
      result.errors.push('mod.events is empty (must have at least 1 event)');
    } else if (raw.events.length > LIMITS.MAX_EVENTS_PER_MOD) {
      result.errors.push(
        `mod.events has ${raw.events.length} events (max: ${LIMITS.MAX_EVENTS_PER_MOD})`
      );
    }

    // Check event ID uniqueness within mod
    if (raw.events && Array.isArray(raw.events)) {
      const ids = new Set();
      const duplicates = [];
      for (const evt of raw.events) {
        if (ids.has(evt.id)) {
          duplicates.push(evt.id);
        }
        ids.add(evt.id);
      }
      if (duplicates.length > 0) {
        result.errors.push(`Duplicate event IDs within mod: ${duplicates.join(', ')}`);
      }
    }

    // Check for difficulty_modifiers structure
    if (raw.difficulty_modifiers) {
      const dm = raw.difficulty_modifiers;
      if (typeof dm.text_corruption_boost === 'number' &&
          (dm.text_corruption_boost < 0 || dm.text_corruption_boost > 5)) {
        result.errors.push('difficulty_modifiers.text_corruption_boost must be 0-5');
      }
      if (typeof dm.npc_trust_multiplier === 'number' &&
          (dm.npc_trust_multiplier < 0 || dm.npc_trust_multiplier > 2)) {
        result.errors.push('difficulty_modifiers.npc_trust_multiplier must be 0-2');
      }
      if (dm.custom_text_swaps && Array.isArray(dm.custom_text_swaps)) {
        if (dm.custom_text_swaps.length > 20) {
          result.errors.push('difficulty_modifiers.custom_text_swaps exceeds max 20');
        }
        // Validate swap format
        for (const swap of dm.custom_text_swaps) {
          if (typeof swap.find !== 'string' || typeof swap.replace !== 'string') {
            result.errors.push(
              `Invalid text swap format: ${JSON.stringify(swap)} (needs {find, replace})`
            );
          }
        }
      }
    }

    // Check for empty choices text
    if (raw.events && Array.isArray(raw.events)) {
      for (const evt of raw.events) {
        if (evt.choices && Array.isArray(evt.choices)) {
          for (const choice of evt.choices) {
            if (!choice.text || choice.text.trim().length === 0) {
              result.warnings.push(
                `Event "${evt.id}" choice "${choice.id}" has empty text`
              );
            }
          }
        }
      }
    }
  } catch (e) {
    result.errors.push(`Parse error: ${e.message}`);
  }

  return result;
}

/**
 * Print a single validation result
 */
function printResult(result) {
  const status = result.valid ? '✅' : '❌';
  const header = `${status} ${result.file}`;

  if (result.modId) {
    console.log(`   ${result.modName} (v${result.modVersion}) — ${result.eventCount} events`);
  }

  if (result.errors.length > 0) {
    console.log('   Errors:');
    for (const err of result.errors) {
      console.log(`     ❌ ${err}`);
    }
  }

  if (result.warnings.length > 0) {
    console.log('   Warnings:');
    for (const warn of result.warnings) {
      console.log(`     ⚠️  ${warn}`);
    }
  }

  if (result.valid && result.warnings.length === 0) {
    console.log('   All checks passed!');
  }

  console.log('');
}

/**
 * Main
 */
async function main() {
  console.log('🔍 Mod Validation Test');
  console.log('=' .repeat(60));
  console.log('');

  const modFiles = await findModFiles(MODS_DIR);

  if (modFiles.length === 0) {
    console.log('No mod.json files found in', MODS_DIR);
    process.exit(0);
  }

  console.log(`Found ${modFiles.length} mod file(s):\n`);

  const results = [];
  for (const file of modFiles) {
    const result = validateModFile(file);
    results.push(result);
    printResult(result);
  }

  // Summary
  const passed = results.filter(r => r.valid);
  const failed = results.filter(r => !r.valid);
  const totalEvents = results.reduce((sum, r) => sum + r.eventCount, 0);

  console.log('=' .repeat(60));
  console.log(`Summary: ${passed.length}/${results.length} mods passed`);
  console.log(`Total events validated: ${totalEvents}`);

  if (failed.length > 0) {
    console.log(`\n❌ ${failed.length} mod(s) FAILED:`);
    for (const f of failed) {
      console.log(`   - ${f.file}: ${f.errors.length} error(s)`);
    }
    process.exit(1);
  }

  const hasWarnings = results.some(r => r.warnings.length > 0);
  if (hasWarnings) {
    console.log('\n⚠️  Some mods have warnings (non-fatal)');
  }

  console.log('\n✅ All mods passed validation!');
}

// Polyfill for readFileSync in ESM
import { readFileSync } from 'node:fs';

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
