// src/reducers/achievementReducer.js - 成就系统

export const ACH_KEY = 'coc_achievements';
export const ACH_VERSION = '1.0.0';

export const ACHIEVEMENTS = [
  {
    id: 'ach_first_step',
    name: '初入深渊',
    desc: '开始第一次调查',
    icon: '🔦',
    condition: (s, st) => st.total_runs >= 1,
  },
  {
    id: 'ach_brave_explorer',
    name: '无畏探索者',
    desc: '在一轮中探索全部9个区域',
    icon: '🗺️',
    condition: (s) => (s.visitedAreas || []).length >= 9,
  },
  {
    id: 'ach_seal_keeper',
    name: '封印守护者',
    desc: '修复封印',
    icon: '🔮',
    condition: (s) => s.ending?.id?.includes('keeper') || s.ending?.id?.includes('seal'),
  },
  {
    id: 'ach_survivor',
    name: '生还者',
    desc: '成功逃离沃切斯特',
    icon: '⛵',
    condition: (s) => s.ending?.id?.includes('escape'),
  },
  {
    id: 'ach_transcendent',
    name: '时间之外的存在',
    desc: '达成隐藏超越结局',
    icon: '✨',
    condition: (s) => s.ending?.id?.includes('transcendence'),
  },
  {
    id: 'ach_eternal_guardian',
    name: '永恒的守望',
    desc: '达成隐藏牺牲结局',
    icon: '🛡️',
    condition: (s) => s.ending?.id?.includes('sacrifice'),
  },
  {
    id: 'ach_abyss_resident',
    name: '深渊的居民',
    desc: '被深渊吞噬',
    icon: '🌊',
    condition: (s) => s.ending?.id?.includes('consumed'),
  },
  {
    id: 'ach_harbinger',
    name: '末日的使者',
    desc: '完成邪教仪式',
    icon: '🌑',
    condition: (s) => s.ending?.id?.includes('ritual'),
  },
  {
    id: 'ach_wanderer',
    name: '徘徊者',
    desc: '在疯狂中迷失',
    icon: '🌀',
    condition: (s) => s.ending?.id?.includes('madness'),
  },
  {
    id: 'ach_madness_dance',
    name: '疯狂之舞',
    desc: '累计经历5次临时疯狂',
    icon: '💃',
    condition: (s, st) => st.madness_count >= 5,
  },
  {
    id: 'ach_clue_hunter',
    name: '真相猎人',
    desc: '在一轮中收集7条以上线索',
    icon: '🔍',
    condition: (s) => (s.clues || []).length >= 7,
  },
  {
    id: 'ach_trusted_one',
    name: '值得信赖',
    desc: '与任一NPC达到最高信任',
    icon: '🤝',
    condition: (s) => Math.max(0, ...Object.values(s.npcTrust || {})) >= 5,
  },
  {
    id: 'ach_night_walker',
    name: '暗夜行者',
    desc: '累计在深夜存活10天',
    icon: '🌙',
    condition: (s, st) => st.night_survived >= 10,
  },
  {
    id: 'ach_mythos_scholar',
    name: '禁忌学者',
    desc: '克苏鲁神话知识达到15',
    icon: '📖',
    condition: (s) => (s.skills?.['克苏鲁神话'] || 0) >= 15,
  },
  {
    id: 'ach_iron_will',
    name: '钢铁意志',
    desc: 'SAN值≤10持续3天',
    icon: '⚡',
    condition: (s, st) => st.low_san_days >= 3,
  },
  {
    id: 'ach_speed_run',
    name: '与时间赛跑',
    desc: '7天内完成封印修复',
    icon: '⏱️',
    condition: (s) => s.ending?.id?.includes('keeper') && (s.day || 99) <= 7,
  },
  {
    id: 'ach_pacifist',
    name: '和平主义者',
    desc: '一轮中不进行任何战斗',
    icon: '☮️',
    condition: (s, st) => st.run_combat === 0 && s.ending,
  },
  {
    id: 'ach_lone_wolf',
    name: '独行侠',
    desc: '不与任何NPC交谈并达成结局',
    icon: '🐺',
    condition: (s, st) => st.run_npc_talks === 0 && s.ending,
  },
  {
    id: 'ach_five_deaths',
    name: '不屈的灵魂',
    desc: '累计死亡5次',
    icon: '💀',
    condition: (s, st) => st.total_deaths >= 5,
  },
  {
    id: 'ach_collector',
    name: '收藏家',
    desc: '累计收集10件物品',
    icon: '📦',
    condition: (s, st) => st.items_collected >= 10,
  },
];

export function load() {
  try {
    const raw = localStorage.getItem(ACH_KEY);
    if (!raw) return { unlocked: [], stats: defaultStats() };
    const data = JSON.parse(raw);
    return { unlocked: data.unlocked || [], stats: { ...defaultStats(), ...data.stats } };
  } catch {
    return { unlocked: [], stats: defaultStats() };
  }
}

export function save(data) {
  try {
    localStorage.setItem(ACH_KEY, JSON.stringify({ version: ACH_VERSION, ...data }));
  } catch (e) {}
}

export function defaultStats() {
  return {
    total_runs: 0,
    total_deaths: 0,
    madness_count: 0,
    night_survived: 0,
    items_collected: 0,
    run_combat: 0,
    run_npc_talks: 0,
    low_san_days: 0,
  };
}

export function loadAchievements() {
  return load();
}
export function saveAchievements(data) {
  save(data);
}

export function checkAchievements(state, currentUnlocked, stats) {
  const newlyUnlocked = [];
  for (const ach of ACHIEVEMENTS) {
    if (currentUnlocked.includes(ach.id)) continue;
    try {
      if (ach.condition(state, stats)) newlyUnlocked.push(ach.id);
    } catch (e) {}
  }
  return newlyUnlocked;
}

export function getAchievementDef(id) {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

export function getAllAchievements() {
  return ACHIEVEMENTS;
}

export function incrementStat(statKey, amount) {
  const data = load();
  data.stats[statKey] = (data.stats[statKey] || 0) + (amount || 1);
  save(data);
  return data;
}

export function setRunStat(statKey, value) {
  const data = load();
  data.stats[statKey] = value;
  save(data);
  return data;
}

export function resetRunStats() {
  const data = load();
  data.stats.run_combat = 0;
  data.stats.run_npc_talks = 0;
  save(data);
  return data;
}
