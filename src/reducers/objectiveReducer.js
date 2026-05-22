// src/reducers/objectiveReducer.js - Objective generation and completion

export function genObjectives(day, ctx) {
  const vs = ctx?.GD?.vertical_slice;
  if (day === 1) {
    const goals = vs?.playable_goals || [];
    return [
      { id: 'talk_2npc', text: '与NPC交谈（0/2）', done: false, icon: '💬' },
      { id: 'explore_area', text: '探索一个区域', done: false, icon: '🔍' },
      { id: 'visit_harbor', text: '前往码头区', done: false, icon: '⚓' },
      ...(goals.length > 0 ? [{ id: 'initial_clues', text: '获得初始线索', done: false, icon: '📋' }] : [])
    ];
  }
  if (day <= 7) return [
    { id: 'clues_3', text: '收集3条线索', done: false, icon: '📋' },
    { id: 'trust_2', text: '与某NPC信任≥2', done: false, icon: '🤝' }
  ];
  return [{ id: 'survive', text: '活过第' + day + '天', done: false, icon: '⏰' }];
}

export function checkObjCompletion(objs, s) {
  return objs.map(o => {
    if (o.done) return o;
    if (o.id === 'talk_2npc' && Object.keys(s.npcTrust).length >= 2) return { ...o, done: true };
    if (o.id === 'explore_area' && s.triggeredEvents.length >= 1) return { ...o, done: true };
    if (o.id === 'visit_harbor' && s.visitedAreas.includes('harbor_district')) return { ...o, done: true };
    if (o.id === 'initial_clues' && s.clues.length >= 1) return { ...o, done: true };
    if (o.id === 'clues_3' && s.clues.length >= 3) return { ...o, done: true };
    if (o.id === 'trust_2' && Object.values(s.npcTrust).some(v => v >= 2)) return { ...o, done: true };
    return o;
  });
}
