#!/usr/bin/env node
// scripts/mod_preview.cjs — Preview a UGC mod's events in readable format.
// Usage: node scripts/mod_preview.cjs <path-to-mod.json>

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node scripts/mod_preview.cjs <mod.json>');
  process.exit(1);
}

const filePath = path.resolve(args[0]);
if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  process.exit(1);
}

const mod = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

console.log('');
console.log(`  ${mod.name || '(unnamed)'}`);
if (mod.author) console.log(`  by ${mod.author}`);
if (mod.version) console.log(`  v${mod.version}`);
if (mod.description) console.log(`  ${mod.description}`);
console.log(`  ${'—'.repeat(40)}`);

if (!Array.isArray(mod.events) || mod.events.length === 0) {
  console.log('  (no events)');
  console.log('');
  process.exit(0);
}

mod.events.forEach((evt, i) => {
  console.log('');
  console.log(`  Event ${i + 1}: ${evt.name || evt.id || '(unnamed)'}`);
  console.log(`    ID: ${evt.id || '?'}`);
  if (evt.type) console.log(`    Type: ${evt.type}`);
  if (evt.trigger) {
    const t = evt.trigger;
    const parts = [];
    if (t.areas) parts.push(`areas: ${t.areas.join(', ')}`);
    if (t.probability != null) parts.push(`prob: ${t.probability}`);
    if (t.once_per_run) parts.push('once/run');
    if (t.once_ever) parts.push('once/ever');
    if (t.min_loop != null) parts.push(`loop≥${t.min_loop}`);
    if (t.min_day != null) parts.push(`day≥${t.min_day}`);
    if (t.requires_flags) parts.push(`flags: ${t.requires_flags.join(', ')}`);
    if (parts.length > 0) console.log(`    Trigger: ${parts.join(' | ')}`);
  }

  // Description preview (first 120 chars)
  if (evt.description) {
    const preview =
      evt.description.length > 120 ? evt.description.substring(0, 120) + '...' : evt.description;
    console.log(`    "${preview.replace(/\n/g, ' ')}"`);
  }

  // Effects summary
  if (evt.effects && Object.keys(evt.effects).length > 0) {
    const fx = Object.entries(evt.effects)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    console.log(`    Effects: { ${fx} }`);
  }

  // Choices
  if (evt.choices && evt.choices.length > 0) {
    console.log(`    Choices (${evt.choices.length}):`);
    evt.choices.forEach((c, ci) => {
      const label = c.text || c.label || c.id || `choice ${ci + 1}`;
      const preview = label.length > 60 ? label.substring(0, 60) + '...' : label;
      console.log(`      ${ci + 1}. ${preview}`);
    });
  }
});

console.log('');
console.log(`  Total: ${mod.events.length} event(s)`);
console.log('');
