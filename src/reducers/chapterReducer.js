// src/reducers/chapterReducer.js - Chapter progression, mythos visibility

export function getChapterForDay(day, ctx) {
  const { GD } = ctx;
  const chapters = GD.implementation_notes?.chapters?.chapters || {};
  if (day >= 22) return { key: 'chapter_5', ...chapters.chapter_5 };
  if (day >= 15) return { key: 'chapter_4', ...chapters.chapter_4 };
  if (day >= 8) return { key: 'chapter_3', ...chapters.chapter_3 };
  if (day >= 4) return { key: 'chapter_2', ...chapters.chapter_2 };
  return { key: 'chapter_1', ...chapters.chapter_1 };
}

export function getMythosCap(day, ctx) {
  const ch = getChapterForDay(day, ctx);
  return ch.mythos_cap ?? 1;
}

export function getChapterAlias(entityKey, day, ctx) {
  const ch = getChapterForDay(day, ctx);
  const aliases = ch.allowed_aliases;
  if (!aliases || aliases === '无限制') return null;
  return aliases[entityKey] || null;
}

export function checkChapterTransition(oldDay, newDay, ctx) {
  const { GD } = ctx;
  const oldCh = getChapterForDay(oldDay, ctx);
  const newCh = getChapterForDay(newDay, ctx);
  if (oldCh.key === newCh.key) return null;
  const transitions = GD.implementation_notes?.chapters?.chapter_transition_events || [];
  const t = transitions.find(tr => tr.from === oldCh.key && tr.to === newCh.key);
  return t || { event_text: '你感到某些东西发生了变化。', san_cost: 0, mythos_gain: 0 };
}

export function getMotifFlavorText(motifType, corruptionLevel, ctx) {
  const { GD } = ctx;
  const motifs = GD.systems?.motifs?.motifs;
  if (!motifs) return null;
  const motif = motifs[motifType];
  if (!motif) return null;
  const examples = motif.narrative_examples;
  if (!examples || examples.length === 0) return null;
  if (corruptionLevel < 20 && Math.random() > 0.3) return null;
  if (corruptionLevel < 50 && Math.random() > 0.5) return null;
  return examples[Math.floor(Math.random() * examples.length)];
}

export function getMonsterManifestation(creatureType, day, ctx) {
  const { GD } = ctx;
  const rules = GD.implementation_notes?.monster_presence?.creature_rules;
  if (!rules || !rules[creatureType]) return null;
  const creature = rules[creatureType];
  const dist = creature.stage_distribution || {};
  const manifestations = creature.preferred_manifestations || [];
  if (manifestations.length === 0) return null;
  // Weighted stage selection
  let r = Math.random();
  let stage = 'absence';
  for (const [s, w] of Object.entries(dist)) {
    r -= w;
    if (r <= 0) { stage = s; break; }
  }
  // Early days prefer absence/trace
  if (day <= 7 && (stage === 'full_presence' || stage === 'partial_presence')) {
    stage = Math.random() < 0.7 ? 'trace' : 'absence';
  }
  // Full presence only in late game
  if (stage === 'full_presence' && day < 15) stage = 'partial_presence';
  return { stage, manifestation: manifestations[Math.floor(Math.random() * manifestations.length)] };
}
