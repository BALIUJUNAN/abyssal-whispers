// src/utils/clueNameMap.js — 线索 ID → 可读名称映射（惰性求值版）
let _cache = null;
function getClueNameMap() {
  if (_cache) return _cache;
  const m = {};
  (GD.clue_chains || []).forEach(ch => {
    (ch.clues || []).forEach(c => { if (c.id && c.name) m[c.id] = c.name; });
  });
  if (typeof PROLOGUE_EVENTS !== 'undefined' && PROLOGUE_EVENTS) {
    PROLOGUE_EVENTS.forEach(e => {
      (e.choices || []).forEach(ch => {
        const ac = ch.effects && ch.effects.add_clue;
        if (ac && typeof ac === 'object' && ac.id && ac.name) m[ac.id] = ac.name;
      });
    });
  }
  (GD.events || []).forEach(e => {
    const ac = e.effects && e.effects.add_clue;
    if (ac && typeof ac === 'object' && ac.id && ac.name) m[ac.id] = ac.name;
  });
  _cache = m;
  return m;
}

function resolveClueName(id) {
  return getClueNameMap()[id] || id.replace(/^clue_/, '').replace(/_/g, ' ');
}

export { getClueNameMap, resolveClueName };
