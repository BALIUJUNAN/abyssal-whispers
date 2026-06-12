#!/usr/bin/env node
// scripts/mod_pack.cjs — Pack a mod directory into a single JSON file.
// Usage: node scripts/mod_pack.cjs <mod-directory> [output.json]
//
// Expected structure:
//   my-mod/
//     mod.json          — mod metadata (id, name, author, version, description)
//     events/           — individual event JSON files (auto-merged into events[])
//
// Output: single JSON file with all events merged.

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node scripts/mod_pack.cjs <mod-directory> [output.json]');
  console.log('');
  console.log('Expected directory structure:');
  console.log('  my-mod/');
  console.log('    mod.json        — mod metadata');
  console.log('    events/         — event JSON files (one per file)');
  process.exit(1);
}

const modDir = path.resolve(args[0]);
if (!fs.existsSync(modDir) || !fs.statSync(modDir).isDirectory()) {
  console.error('Not a directory:', modDir);
  process.exit(1);
}

// Load mod.json
const modJsonPath = path.join(modDir, 'mod.json');
if (!fs.existsSync(modJsonPath)) {
  console.error('Missing mod.json in', modDir);
  process.exit(1);
}

const mod = JSON.parse(fs.readFileSync(modJsonPath, 'utf-8'));

// Collect events from events/ directory
const eventsDir = path.join(modDir, 'events');
if (fs.existsSync(eventsDir) && fs.statSync(eventsDir).isDirectory()) {
  const files = fs
    .readdirSync(eventsDir)
    .filter((f) => f.endsWith('.json'))
    .sort();
  const events = [];
  for (const file of files) {
    const evt = JSON.parse(fs.readFileSync(path.join(eventsDir, file), 'utf-8'));
    if (Array.isArray(evt)) {
      events.push(...evt);
    } else {
      events.push(evt);
    }
  }
  mod.events = events;
  console.log(`  Packed ${events.length} event(s) from ${files.length} file(s)`);
} else if (!mod.events) {
  mod.events = [];
  console.log('  No events/ directory and no events in mod.json');
}

// Output
const outPath = args[1] ? path.resolve(args[1]) : path.join(path.dirname(modDir), mod.id + '.json');

fs.writeFileSync(outPath, JSON.stringify(mod, null, 2), 'utf-8');
console.log(`  Output: ${outPath}`);
console.log(`  Size: ${fs.statSync(outPath).size} bytes`);
