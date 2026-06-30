// src/main.jsx — Vite entry point (primary dev entry)
//
// In development, Vite serves ESM modules with HMR.
// In production, vite-plugin-singlefile inlines all JS/CSS/JSON into a single HTML.
//
// Architecture:
//   1. Import game data JSON (Vite bundles these into the JS bundle at build time)
//   2. Import compatibility shim (globalThis bridge for modules not yet migrated to ESM)
//   3. Import app.jsx (which initializes GD, renders <App />)

import React from 'react';
import ReactDOM from 'react-dom/client';
import { produce } from 'immer';

// Install React/ReactDOM/produce as globals for app.jsx and component files
// that still reference them via globalThis (through vite-compat-shim)
window.React = React;
window.ReactDOM = ReactDOM;
window.produce = produce;

// Static JSON imports — Vite bundles these into the JS bundle at build time.
// vite-plugin-singlefile then inlines the entire bundle into the HTML.
import gameBase from '../game_base.json';
import gameCh2plus from '../game_ch2plus.json';
import gameMeta from '../game_meta.json';

function mergeGameData() {
  const merged = { ...gameBase };
  merged.events = [...(gameBase.events || []), ...(gameCh2plus.events || [])];
  if (gameCh2plus.endings) merged.endings = gameCh2plus.endings;
  if (gameCh2plus.ending_judgement) merged.ending_judgement = gameCh2plus.ending_judgement;
  if (gameMeta.implementation_notes) merged.implementation_notes = gameMeta.implementation_notes;
  if (gameMeta.deprecated_endings_archive)
    merged.deprecated_endings_archive = gameMeta.deprecated_endings_archive;

  return merged;
}

// Bootstrap: data → shim → app
try {
  // Import compatibility shim (sets up legacy globals on globalThis)
  await import('./vite-compat-shim.jsx');

  // Merge game data (synchronous — all JSON is statically imported)
  const GD = mergeGameData();
  window.__GAME_DATA__ = GD;
  window.GD = GD;
  console.log('[Vite] Game data loaded:', GD.events?.length, 'events');

  // Mark ch2plus and meta chapters as loaded so lazy fetch in app.jsx is a no-op
  const { markChapterLoaded } = await import('./reducers/extendedEventsLoader.js');
  markChapterLoaded('ch2plus');
  markChapterLoaded('meta');

  // Initialize extended events BEFORE seeding game store.
  // Immer auto-freezes GD in dev mode, so modifications must happen before set().
  const { initExtendedEvents } = await import('./reducers/extendedEventsInit.js');
  initExtendedEvents(GD);
  console.log('[Vite] Extended events initialized');

  // Seed game store with GD BEFORE React renders (avoids set() during passive effects)
  const { seedGameStore } = await import('./state/useGameStore.js');
  seedGameStore(GD);
  console.log('[Vite] Game store seeded');

  // Import app.jsx — triggers module-level init (GD, ReactDOM.createRoot, etc.)
  await import('./app.jsx');
} catch (err) {
  console.error('[Vite] Bootstrap failed:', err);
  document.getElementById('root').innerHTML =
    '<div style="padding:2rem;color:#f55;font-family:monospace">' +
    '<h2>Vite Bootstrap Error</h2>' +
    '<pre>' +
    (err.stack || err.message) +
    '</pre></div>';
}
