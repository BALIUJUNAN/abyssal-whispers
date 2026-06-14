// src/main.jsx — Vite entry point (primary dev entry)
//
// In production, build.py generates the single-file index.html.
// In development, this file bootstraps the game via Vite + ESM.
//
// Architecture:
//   1. Load & merge split game data JSON (same logic as build.py)
//   2. Import compatibility shim (globalThis bridge for modules not yet migrated to ESM)
//   3. Import app.jsx (which initializes GD, renders <App />)
//
// P2-1: This is now the PRIMARY Vite entry. The old placeholder page has been removed.

import React from 'react';
import ReactDOM from 'react-dom/client';
import { produce } from 'immer';

// Install React/ReactDOM/produce as globals for app.jsx and component files
// that still reference them via globalThis (through vite-compat-shim)
window.React = React;
window.ReactDOM = ReactDOM;
window.produce = produce;

// Load and merge split game data (mirrors build.py logic)
async function loadGameData() {
  const [base, ch2plus, meta] = await Promise.all([
    fetch('/game_base.json').then((r) => r.json()),
    fetch('/game_ch2plus.json')
      .then((r) => r.json())
      .catch(() => ({})),
    fetch('/game_meta.json')
      .then((r) => r.json())
      .catch(() => ({})),
  ]);

  const merged = { ...base };
  merged.events = [...(base.events || []), ...(ch2plus.events || [])];
  if (ch2plus.endings) merged.endings = ch2plus.endings;
  if (ch2plus.ending_judgement) merged.ending_judgement = ch2plus.ending_judgement;
  if (meta.implementation_notes) merged.implementation_notes = meta.implementation_notes;
  if (meta.deprecated_endings_archive)
    merged.deprecated_endings_archive = meta.deprecated_endings_archive;

  return merged;
}

// Bootstrap: load data → shim → app
try {
  // Import compatibility shim (sets up legacy globals on globalThis)
  await import('./vite-compat-shim.jsx');

  // Load and merge game data
  const GD = await loadGameData();
  window.__GAME_DATA__ = GD;
  window.GD = GD;
  console.log('[Vite] Game data loaded:', GD.events?.length, 'events');

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
