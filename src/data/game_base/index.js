// src/data/game_base/index.js — Aggregated game data (split from game_base.json)
//
// IMPORTANT: game_base.json is the canonical source of truth (scripts, schemas, tools).
// This file imports the split domain files and re-merges them for game code consumption.
// When editing game data, edit game_base.json directly and re-run scripts/split_game_base.mjs.
//
// Import this instead of '../data/game_base.json' in game code (src/**/*.js[x]).

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
