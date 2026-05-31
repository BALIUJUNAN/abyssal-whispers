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
  // Register clue IDs from extended events (events_loop, events_mythos, events_area_deep, etc.)
  // These use plain string add_clue values; derive display name from event name.
  const extModules = typeof EXTENDED_EVENT_MODULES !== 'undefined' && EXTENDED_EVENT_MODULES;
  if (extModules) {
    Object.values(extModules).forEach(mod => {
      (mod.events || []).forEach(e => {
        const ac = e.effects && e.effects.add_clue;
        if (typeof ac === 'string' && !m[ac]) m[ac] = e.name;
      });
    });
  }
  _cache = m;
  return m;
}

function resolveClueName(id) {
  if (id && typeof id === 'object') return id.name || id.id || '';
  return getClueNameMap()[id] || id.replace(/^clue_/, '').replace(/_/g, ' ');
}

/** Check if a clue (by id) exists in a clues array (handles both string and {id,name} entries) */
function hasClueId(clues, id) {
  return (clues || []).some(c => (typeof c === 'string' ? c : c && c.id) === id);
}

export { getClueNameMap, resolveClueName, hasClueId };
