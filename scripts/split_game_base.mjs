// scripts/split_game_base.mjs — Split game_base.json into domain files
// Reads src/data/game_base.json and writes individual files to src/data/game_base/

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');
const INPUT = join(SRC, 'data', 'game_base.json');
const OUTPUT_DIR = join(SRC, 'data', 'game_base');

async function main() {
  const raw = await readFile(INPUT, 'utf-8');
  const data = JSON.parse(raw);

  await mkdir(OUTPUT_DIR, { recursive: true });

  // ── Split plan ──────────────────────────────────────────────
  // design_intent.json   → design_intent + version + game_title + language
  // balance.json         → core_loop + world (balance-related keys)
  // systems.json         → systems
  // narrative.json       → areas + npcs + events + items + event_chains + clue_chains
  // shops.json           → shops
  // vertical_slice.json  → vertical_slice

  const files = {
    design_intent: {
      ...data.design_intent,
      _meta: {
        version: data.version,
        game_title: data.game_title,
        language: data.language,
      }
    },
    balance: {
      core_loop: data.core_loop,
      world: data.world,
    },
    systems: data.systems,
    narrative: {
      areas: data.areas,
      npcs: data.npcs,
      events: data.events,
      items: data.items,
      event_chains: data.event_chains,
      clue_chains: data.clue_chains,
    },
    shops: data.shops,
    vertical_slice: data.vertical_slice,
  };

  // Write individual JSON files
  for (const [name, content] of Object.entries(files)) {
    const path = join(OUTPUT_DIR, `${name}.json`);
    await writeFile(path, JSON.stringify(content, null, 2) + '\n', 'utf-8');
    const size = JSON.stringify(content).length;
    console.log(`  ${name}.json — ${size.toLocaleString()} chars`);
  }

  // Write index.js — aggregates all JSON files into one object
  const indexJs = `// src/data/game_base/index.js — Aggregated game data (was game_base.json)
// Split from single 8410-line file into domain-specific modules.
// Import this instead of '../data/game_base.json'.

import designIntent from './design_intent.json';
import balance from './balance.json';
import systems from './systems.json';
import narrative from './narrative.json';
import shops from './shops.json';
import verticalSlice from './vertical_slice.json';

var GD = {
  // Meta
  version: designIntent._meta.version,
  game_title: designIntent._meta.game_title,
  language: designIntent._meta.language,

  // Design
  design_intent: designIntent,

  // Balance & World
  core_loop: balance.core_loop,
  world: balance.world,

  // Systems
  systems: systems,

  // Narrative
  areas: narrative.areas,
  npcs: narrative.npcs,
  events: narrative.events,
  items: narrative.items,
  event_chains: narrative.event_chains,
  clue_chains: narrative.clue_chains,

  // Shops
  shops: shops,

  // Vertical slice
  vertical_slice: verticalSlice,
};

export default GD;
`;

  await writeFile(join(OUTPUT_DIR, 'index.js'), indexJs, 'utf-8');
  console.log('\n  index.js — aggregator written');

  // Summary
  const totalSize = Object.values(files).reduce((sum, f) => sum + JSON.stringify(f).length, 0);
  console.log(`\nDone: ${Object.keys(files).length} files, ${totalSize.toLocaleString()} total chars`);
  console.log('Next: update src/main.jsx import path from ../game_base.json to ../data/game_base/index.js');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
