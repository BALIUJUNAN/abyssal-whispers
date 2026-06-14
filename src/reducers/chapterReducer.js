// src/reducers/chapterReducer.js - Chapter progression, mythos visibility
// DESIGN_REFACTOR_NOTES.md: Chapter 1 (Day 1-3) = thirteen bells mystery only.
// Chapter 2 (Day 4-7) = deepening investigation. Chapter 3+ = full reveal.

/** Fallback chapter configs when game_base.json doesn't define them. */
var _CHAPTER_DEFAULTS = {
  chapter_1: { key: 'chapter_1', mythos_cap: 1, name: '十三声钟响', day_range: [1, 3],
    description: '你只知道自己听到了十三声钟。教堂、码头——两条路，一个谜。',
    allowed_aliases: { deep_one: '海里的东西', yith: '不属于这个时代的建筑', nyarlathotep: '戴面具的神' },
  },
  chapter_2: { key: 'chapter_2', mythos_cap: 3, name: '深入调查', day_range: [4, 7],
    description: '更多区域开放了。真相的轮廓开始显现。',
  },
  chapter_3: { key: 'chapter_3', mythos_cap: 5, name: '揭示', day_range: [8, 14] },
  chapter_4: { key: 'chapter_4', mythos_cap: 8, name: '全面开放', day_range: [15, 21] },
  chapter_5: { key: 'chapter_5', mythos_cap: 10, name: '终局', day_range: [22, 28] },
};

export function getChapterForDay(day, ctx) {
  const { GD } = ctx;
  const chapters = GD.implementation_notes?.chapters?.chapters || {};
  if (day >= 22) return { key: 'chapter_5', ..._CHAPTER_DEFAULTS.chapter_5, ...chapters.chapter_5 };
  if (day >= 15) return { key: 'chapter_4', ..._CHAPTER_DEFAULTS.chapter_4, ...chapters.chapter_4 };
  if (day >= 8) return { key: 'chapter_3', ..._CHAPTER_DEFAULTS.chapter_3, ...chapters.chapter_3 };
  if (day >= 4) return { key: 'chapter_2', ..._CHAPTER_DEFAULTS.chapter_2, ...chapters.chapter_2 };
  return { key: 'chapter_1', ..._CHAPTER_DEFAULTS.chapter_1, ...chapters.chapter_1 };
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

/** Default chapter transition narratives (fallback when game_base.json has none). */
var _TRANSITION_DEFAULTS = {
  'chapter_1->chapter_2': {
    event_text: '你以为自己只是来调查一起失踪案。但今晚的钟声响了十四下。\n\n你还不知道这意味着什么。但你的笔记本在发抖——不是你的手在抖。是笔记本自己。',
    san_cost: -1, mythos_gain: 1,
  },
};

export function checkChapterTransition(oldDay, newDay, ctx) {
  const { GD } = ctx;
  const oldCh = getChapterForDay(oldDay, ctx);
  const newCh = getChapterForDay(newDay, ctx);
  if (oldCh.key === newCh.key) return null;
  const transitions = GD.implementation_notes?.chapters?.chapter_transition_events || [];
  const t = transitions.find((tr) => tr.from === oldCh.key && tr.to === newCh.key);
  var key = oldCh.key + '->' + newCh.key;
  return t || _TRANSITION_DEFAULTS[key] || { event_text: '你感到某些东西发生了变化。', san_cost: 0, mythos_gain: 0 };
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
    if (r <= 0) {
      stage = s;
      break;
    }
  }
  // Early days prefer absence/trace
  if (day <= 7 && (stage === 'full_presence' || stage === 'partial_presence')) {
    stage = Math.random() < 0.7 ? 'trace' : 'absence';
  }
  // Full presence only in late game
  if (stage === 'full_presence' && day < 15) stage = 'partial_presence';
  return {
    stage,
    manifestation: manifestations[Math.floor(Math.random() * manifestations.length)],
  };
}
