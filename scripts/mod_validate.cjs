#!/usr/bin/env node
// scripts/mod_validate.cjs — Validate a UGC mod JSON file against the schema.
// Usage: node scripts/mod_validate.cjs <path-to-mod.json>

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node scripts/mod_validate.cjs <mod.json>');
  console.log('       Validates a UGC mod file against the game schema.');
  process.exit(1);
}

const filePath = path.resolve(args[0]);
if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  process.exit(1);
}

const raw = fs.readFileSync(filePath, 'utf-8');
let mod;
try {
  mod = JSON.parse(raw);
} catch (e) {
  console.error('Invalid JSON:', e.message);
  process.exit(1);
}

// Inline validation (mirrors ugcSchema.js validateMod logic)
const errors = [];

// Required fields
if (!mod.id || typeof mod.id !== 'string') errors.push('Missing or invalid "id" (string)');
if (!mod.name || typeof mod.name !== 'string') errors.push('Missing or invalid "name" (string)');
if (!Array.isArray(mod.events)) errors.push('Missing "events" array');

// ID format
if (mod.id && !/^[a-zA-Z0-9_\-]+$/.test(mod.id)) {
  errors.push('id must be alphanumeric/underscore/hyphen only');
}

// Events validation
if (Array.isArray(mod.events)) {
  if (mod.events.length === 0) {
    errors.push('events array is empty (mod has no events)');
  }
  if (mod.events.length > 30) {
    errors.push(`Too many events: ${mod.events.length} (max 30)`);
  }
  mod.events.forEach((evt, i) => {
    const prefix = `events[${i}]`;
    if (!evt.id) errors.push(`${prefix}: missing "id"`);
    if (!evt.name) errors.push(`${prefix}: missing "name"`);
    if (!evt.description) errors.push(`${prefix}: missing "description"`);
    if (evt.choices && !Array.isArray(evt.choices)) {
      errors.push(`${prefix}: "choices" must be an array`);
    }
    if (evt.choices && evt.choices.length > 6) {
      errors.push(`${prefix}: too many choices (${evt.choices.length}, max 6)`);
    }
  });
}

// Report
if (errors.length > 0) {
  console.log(`\n  FAIL: ${filePath}\n`);
  errors.forEach((e) => console.log(`    - ${e}`));
  console.log(`\n  ${errors.length} error(s) found.\n`);
  process.exit(1);
} else {
  const evtCount = mod.events ? mod.events.length : 0;
  const choiceCount = mod.events
    ? mod.events.reduce((n, e) => n + (e.choices ? e.choices.length : 0), 0)
    : 0;
  console.log(`\n  PASS: ${mod.name} (${mod.id})`);
  console.log(`  Events: ${evtCount}  Choices: ${choiceCount}`);
  if (mod.author) console.log(`  Author: ${mod.author}`);
  if (mod.version) console.log(`  Version: ${mod.version}`);
  console.log('');
  process.exit(0);
}
