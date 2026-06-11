// src/main.vite.jsx — Vite entry point (experimental)
// Sets up legacy globals that app.jsx depends on, then renders the real game.
//
// This is the "Vite compatibility mode" bridge:
//   1. Install React/ReactDOM as npm packages (global for app.jsx)
//   2. Fetch and merge split game data JSON (same logic as build.py)
//   3. Import compatibility shim (makes bundled-module globals available)
//   4. Dynamically import app.jsx (which runs at module level)
//
// Status: EXPERIMENTAL — not yet feature-complete. build.py remains the
// production build system. See docs/maintenance-audit-baseline.md.

import React from 'react';
import ReactDOM from 'react-dom/client';
import { produce } from 'immer';

// ── Step 1: Legacy globals that app.jsx uses without importing ──
window.React = React;
window.ReactDOM = ReactDOM;
window.produce = produce;

// ── Step 2: Load and merge split game data (mirrors build.py logic) ──
async function loadGameData() {
  const [base, ch2plus, meta] = await Promise.all([
    fetch('/game_base.json').then(r => r.json()),
    fetch('/game_ch2plus.json').then(r => r.json()).catch(() => ({})),
    fetch('/game_meta.json').then(r => r.json()).catch(() => ({})),
  ]);

  const merged = { ...base };
  merged.events = [...(base.events || []), ...(ch2plus.events || [])];
  if (ch2plus.endings) merged.endings = ch2plus.endings;
  if (ch2plus.ending_judgement) merged.ending_judgement = ch2plus.ending_judgement;
  if (meta.implementation_notes) merged.implementation_notes = meta.implementation_notes;
  if (meta.deprecated_endings_archive) merged.deprecated_endings_archive = meta.deprecated_endings_archive;

  return merged;
}

// ── Step 3: Main bootstrap ──
async function main() {
  // Import compatibility shim first (sets up all legacy globals)
  await import('./vite-compat-shim.jsx');

  // Load game data
  const GD = await loadGameData();
  window.__GAME_DATA__ = GD;
  window.GD = GD;

  // Import app.jsx — this triggers module-level initialization
  // (const GD = initExtendedEvents(__GAME_DATA__), ReactDOM.createRoot, etc.)
  await import('./app.jsx');
}

main().catch(err => {
  console.error('[Vite] Bootstrap failed:', err);
  document.getElementById('root').innerHTML =
    '<div style="padding:2rem;color:#f55;font-family:monospace">' +
    '<h2>Vite Bootstrap Error</h2>' +
    '<pre>' + (err.stack || err.message) + '</pre></div>';
});
