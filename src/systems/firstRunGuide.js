// src/systems/firstRunGuide.js — Narrative-style contextual hints
// Functionally = guidance. Expressively = atmosphere.
// Never breaks the fourth wall. Never uses tutorial language.

const GUIDE_STEPS = [
  {
    id: 'welcome',
    condition: (s) => s.loopCount === 0 && s.day === 1 && (s.clues || []).length === 0,
    message: '雾很浓。你不知道自己为什么在这里。也许找个人问问会好一些。',
    priority: 10,
  },
  {
    id: 'first_talk',
    condition: (s) => s.loopCount === 0 && Object.keys(s.npcTrust || {}).length >= 1 && (s.clues || []).length === 0,
    message: '那个人看你的眼神有些奇怪。不是敌意——更像是在确认什么。也许再谈谈。',
    priority: 9,
  },
  {
    id: 'first_clue',
    condition: (s) => (s.clues || []).length >= 1 && (s.clues || []).length < 3 && s.day <= 5,
    message: '笔记本上多了一行字。你不确定是自己写的还是它自己出现的。还有更多要看的地方。',
    priority: 8,
  },
  {
    id: 'explore_more',
    condition: (s) => (s.visitedAreas || []).length <= 2 && s.day >= 3,
    message: '你一直在同一个地方打转。沃切斯特的街道不止这一条——虽然你不太确定它们通向哪里。',
    priority: 7,
  },
  {
    id: 'low_san_warning',
    condition: (s) => s.san < 30 && s.san > 0,
    message: '你的手在发抖。墙壁上的裂缝在移动。你需要找个安全的地方待一会儿。',
    priority: 15,
  },
  {
    id: 'low_food_warning',
    condition: (s) => (s.food || 0) <= 1 && s.day >= 3,
    message: '你的胃在叫。不是饥饿——是一种空洞。恐惧在空腹时会变得具体。',
    priority: 14,
  },
  {
    id: 'clue_chain',
    condition: (s) => (s.clues || []).length >= 3 && (s.discoveredConclusions || []).length === 0,
    message: '笔记本里的几句话开始互相呼应。你还没有把它们连起来——但它们已经在等你了。',
    priority: 10,
  },
  {
    id: 'rest_reminder',
    condition: (s) => s.ap <= 2 && s.day >= 2,
    message: '你的身体在提醒你：今天已经够了。沃切斯特明天还在。你不确定自己是否还在。',
    priority: 5,
  },
];

/**
 * Get the current guide step for the player.
 * Returns the highest-priority matching step, or null if no guidance needed.
 * @param {object} state - game state
 * @param {object} ctx   - { GD }
 * @returns {object|null} { id, message, priority }
 */
export function getGuideStep(state, ctx) {
  // Only show guides in first 2 loops and before day 15
  if (state.loopCount > 1 || state.day > 15) return null;
  // Don't show if player is dead
  if (state.hp <= 0 || state.san <= 0) return null;
  // Don't show if ending is set
  if (state.ending) return null;

  const matching = GUIDE_STEPS
    .filter(step => step.condition(state))
    .sort((a, b) => b.priority - a.priority);

  return matching[0] || null;
}

/**
 * Check if the player has completed enough to dismiss the guide system entirely.
 */
export function isGuideComplete(state) {
  return (state.clues || []).length >= 3
    && Object.keys(state.npcTrust || {}).filter(k => (state.npcTrust[k] || 0) >= 2).length >= 2
    && (state.visitedAreas || []).length >= 4;
}
