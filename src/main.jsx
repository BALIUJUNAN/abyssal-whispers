// src/main.jsx - Vite entry point (dev mode)
// In production, build.py generates the single-file index.html.
// This file is only used by Vite dev server for HMR.

import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';

// Game data: loaded from JSON files
// In dev mode, fetch from server; in prod, already inlined by build.py
let GD = null;

async function initGame() {
  // Load base game data
  const base = await fetch('/game_base.json').then((r) => r.json());
  const ch2plus = await fetch('/game_ch2plus.json')
    .then((r) => r.json())
    .catch(() => ({}));
  const meta = await fetch('/game_meta.json')
    .then((r) => r.json())
    .catch(() => ({}));

  // Merge
  GD = { ...base };
  GD.events = [...(base.events || []), ...(ch2plus.events || [])];
  if (ch2plus.endings) GD.endings = ch2plus.endings;
  if (ch2plus.ending_judgement) GD.ending_judgement = ch2plus.ending_judgement;
  if (meta.implementation_notes) GD.implementation_notes = meta.implementation_notes;
  if (meta.deprecated_endings_archive)
    GD.deprecated_endings_archive = meta.deprecated_endings_archive;

  // Make GD available globally (for gradual migration from flat bundle)
  window.__GAME_DATA__ = GD;
  window.GD = GD;

  // Dynamically import app (which references GD globally)
  // For now, use the existing build.py output served statically
  // TODO: gradually convert app.jsx to use ES module imports
  console.log('[Vite Dev] Game data loaded:', GD.events?.length, 'events');

  // Render a placeholder until full migration
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    React.createElement(
      'div',
      { style: { padding: '2rem', color: '#f0e6d3', fontFamily: 'serif' } },
      React.createElement('h1', null, '深渊低语 — Vite 开发模式'),
      React.createElement('p', null, '游戏数据已加载: ' + (GD.events?.length || 0) + ' 个事件'),
      React.createElement('p', null, '当前阶段: ES 模块渐进迁移中'),
      React.createElement(
        'p',
        null,
        React.createElement('a', { href: '/', style: { color: '#7eb8da' } }, '→ 返回单文件版本')
      )
    )
  );
}

initGame().catch((err) => {
  console.error('[Vite Dev] Failed to initialize:', err);
  document.getElementById('root').innerHTML =
    '<div style=\"padding:2rem;color:red\">加载失败: ' + err.message + '</div>';
});
