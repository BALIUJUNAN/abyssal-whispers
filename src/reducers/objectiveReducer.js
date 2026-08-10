// src/reducers/objectiveReducer.js - Objective generation and completion

import { applySanLoss, makeRand } from './utils.js';
import { hasClueId, resolveClueName } from '../utils/clueNameMap.js';
import { hasTriggered, syncTriggeredSet } from '../utils/triggeredSet.js';

export function genObjectives(day, ctx) {
  const vs = ctx?.GD?.vertical_slice;
  if (day === 1) {
    const goals = vs?.playable_goals || [];
    return [
      { id: 'talk_2npc', text: '与NPC交谈（0/2）', done: false, icon: '💬' },
      { id: 'explore_area', text: '探索一个区域', done: false, icon: '🔍' },
      { id: 'visit_harbor', text: '前往码头区', done: false, icon: '⚓' },
      ...(goals.length > 0
        ? [{ id: 'initial_clues', text: '获得初始线索', done: false, icon: '📋' }]
        : []),
    ];
  }
  if (day <= 7)
    return [
      { id: 'clues_3', text: '收集3条线索', done: false, icon: '📋' },
      { id: 'trust_2', text: '与某NPC信任≥2', done: false, icon: '🤝' },
    ];
  return [{ id: 'survive', text: '活过第' + day + '天', done: false, icon: '⏰' }];
}

export function checkObjCompletion(objs, s) {
  return objs.map((o) => {
    if (o.done) return o;
    if (o.id === 'talk_2npc' && Object.keys(s.npcTrust).length >= 2) return { ...o, done: true };
    if (o.id === 'explore_area' && s.triggeredEvents.length >= 1) return { ...o, done: true };
    if (o.id === 'visit_harbor' && s.visitedAreas.includes('harbor_district'))
      return { ...o, done: true };
    if (o.id === 'initial_clues' && s.clues.length >= 1) return { ...o, done: true };
    if (o.id === 'clues_3' && s.clues.length >= 3) return { ...o, done: true };
    if (o.id === 'trust_2' && Object.values(s.npcTrust).some((v) => v >= 2))
      return { ...o, done: true };
    return o;
  });
}

// === Critical Progress Guards (extracted from appHelpers.js) ===
// P0-3: Prevent players from getting permanently stuck on clue chains.

export const CRITICAL_PROGRESS_GUARDS = [
  {
    id: 'guard_harbor_chain',
    deadlineDay: 6,
    requiredClues: ['clue_1_1', 'clue_1_2', 'clue_1_3'],
    chainId: 'chain_harbor',
    minCluesNeeded: 1,
    fallbackArea: 'harbor_district',
    fallbackNarrative:
      '你在码头边徘徊，注意到一张被海浪冲上岸的纸片。上面的字迹已经被海水模糊，但你依稀能辨认出几个数字和一个名字。',
    fallbackClueHint: 'clue_1_1',
    guardFlag: 'guard_harbor_chain_fired',
  },
  {
    id: 'guard_lighthouse_signal',
    deadlineDay: 10,
    requiredClues: ['clue_2_1', 'clue_2_2'],
    chainId: 'chain_lighthouse',
    minCluesNeeded: 1,
    fallbackArea: 'lighthouse',
    fallbackNarrative:
      '你安全屋的窗户突然发出一阵震动。远处灯塔的光在浓雾中划出一道异常的轨迹——三短、三长、三短。你把这个图案记了下来。',
    fallbackClueHint: 'clue_2_1',
    guardFlag: 'guard_lighthouse_signal_fired',
  },
  {
    id: 'guard_morris_chain',
    deadlineDay: 8,
    requiredClues: ['clue_m_1', 'clue_m_2', 'clue_m_3'],
    chainId: 'chain_morris',
    minCluesNeeded: 1,
    fallbackArea: 'voxchester_manor',
    fallbackNarrative:
      '你翻阅旧笔记时，一张泛黄的便签从笔记本里滑落。上面是莫里斯家族的族谱碎片——至少给你指了一个方向。',
    fallbackClueHint: 'clue_m_1',
    guardFlag: 'guard_morris_chain_fired',
  },
  {
    id: 'guard_heretical_chain',
    deadlineDay: 7,
    requiredClues: ['clue_h_1', 'clue_h_2', 'clue_h_3'],
    chainId: 'chain_heretical',
    minCluesNeeded: 1,
    fallbackArea: 'town_center',
    fallbackNarrative:
      '教堂的钟声在凌晨三点响起。不是十三声——只有三声。你记下了钟声的节奏，它似乎在传达某种信息。',
    fallbackClueHint: 'clue_h_1',
    guardFlag: 'guard_heretical_chain_fired',
  },
];

export function getForcedProgressGuard(state, ctx, rng) {
  const day = state.day || 1;
  const clues = state.clues || [];
  const triggered = state.triggeredEvents || [];
  var _rand = makeRand(rng);
  for (const guard of CRITICAL_PROGRESS_GUARDS) {
    if (triggered.includes(guard.guardFlag)) continue;
    if ((state.completedChains || []).includes(guard.chainId)) continue;
    const foundCount = guard.requiredClues.filter((x) => hasClueId(clues, x)).length;
    if (foundCount >= guard.minCluesNeeded) continue;
    const daysUntilDeadline = guard.deadlineDay - day;
    if (daysUntilDeadline > 2) continue;
    // A deadline is a guarantee, not the final chance to make progress. Once
    // reached or overdue, the guard fires deterministically on the next explore.
    const fireProbability = daysUntilDeadline <= 0 ? 1 : daysUntilDeadline === 1 ? 0.6 : 0.3;
    if (_rand() >= fireProbability) continue;
    return guard;
  }
  return null;
}

export function executeForcedProgressGuard(guard, state, narr) {
  if (!hasTriggered(state, guard.guardFlag)) {
    state.triggeredEvents.push(guard.guardFlag);
    syncTriggeredSet(state, guard.guardFlag);
  }
  narr('system', guard.fallbackNarrative, { isSpecial: true });
  const missingClues = guard.requiredClues.filter((x) => !hasClueId(state.clues, x));
  if (missingClues.length > 0) {
    const hintClue = guard.fallbackClueHint || missingClues[0];
    if (!hasClueId(state.clues, hintClue)) {
      state.clues.push({ id: hintClue, name: resolveClueName(hintClue) || hintClue });
      narr('system', '（你将这条信息记录在了笔记本上。）', { isSpecial: true });
    }
  }
  applySanLoss(state, 1);
  narr('system', 'SAN -1', { isEffect: true });
}
