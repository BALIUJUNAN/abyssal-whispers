// src/data/milestones.js — Chapter milestones and forced narrative hooks
// GAME DATA — moved from engine/EventEngine.js (engine must not contain game content).
// The engine reads these via parameter injection; it never imports this file directly.

/**
 * Chapter milestones: forced narrative events on specific days.
 * Key = day number, value = milestone definition.
 */
export var CHAPTER_MILESTONES = {
  3: {
    eventId: 'evt_day3_first_contact',
    name: '第一次接触',
    sanCost: 2,
    corruptionGain: 3,
    text: '你醒来的时候，笔记本上多了一行字。\n不是你的笔迹。\n\n"第三天。你还在看。"\n\n你检查了门锁。锁是从里面开的。',
  },
  7: {
    eventId: 'evt_ch1_milestone',
    name: '第十四声钟响',
    sanCost: 3,
    corruptionGain: 5,
    text: '教堂的钟声响了。\n不是十三下。\n十四下。\n\n整个沃切斯特都安静了。连海浪都停了。',
  },
  10: {
    eventId: 'evt_day10_threshold',
    name: '雾中的轮廓',
    sanCost: 4,
    corruptionGain: 6,
    text: '第十天的雾比以往任何时候都浓。\n\n你在雾中看到了人影。不是一个人——是很多人。\n他们站在那里，面朝你的方向。\n\n你数了一下。\n正好是你在沃切斯特见过的人数。',
  },
  14: {
    eventId: 'evt_ch2_milestone',
    name: '灯塔的光',
    sanCost: 5,
    corruptionGain: 8,
    text: '灯塔的光在午夜亮了。\n\n你知道灯塔已经废弃了三年。\n\n光扫过你的安全屋窗户时，你看到了窗玻璃上的倒影。\n不是你的倒影。\n是很多人的倒影。重叠在一起。',
  },
  21: {
    eventId: 'evt_ch3_milestone',
    name: '封印的呼吸',
    sanCost: 8,
    corruptionGain: 10,
    text: '封印发出了声音。\n\n不是裂开的声音。\n是呼吸的声音。\n\n整个沃切斯特都安静了。\n然后——第十五声钟响。',
  },
  28: {
    eventId: 'evt_final_day',
    name: '最后的早晨',
    sanCost: 0,
    corruptionGain: 0,
    text: '你醒来的时候，窗外的雾不再是白色的了。\n\n它是红色的。\n像血。\n\n时间到了。',
  },
};

/**
 * Forced narrative hooks: triggered by game state conditions.
 * Each hook has an `id`, a `condition(state)` function, and narrative text.
 */
export var FORCED_NARRATIVE_HOOKS = [
  {
    id: 'hook_first_clue',
    condition: function (s) {
      return (s.clues || []).length === 1 && !s.triggeredEvents.includes('hook_first_clue');
    },
    text: '你把第一条线索写在笔记本上。墨水干得很慢——比平时慢。仿佛纸在抗拒被记录。',
    sanCost: 0,
  },
  {
    id: 'hook_first_npc_trust3',
    condition: function (s) {
      return (
        Object.values(s.npcTrust || {}).some(function (t) { return t >= 3; }) &&
        !s.triggeredEvents.includes('hook_first_npc_trust3')
      );
    },
    text: '有人开始信任你了。你不确定这是好事还是坏事。在沃切斯特，信任是一种负担。',
    sanCost: 0,
  },
  {
    id: 'hook_3_areas',
    condition: function (s) {
      return (s.visitedAreas || []).length >= 3 && !s.triggeredEvents.includes('hook_3_areas');
    },
    text: '你已经走过了三个区域。你开始在脑中画地图。但每次你画完，第二天都会多出一条你没见过的路。',
    sanCost: 0,
  },
  {
    id: 'hook_san_40',
    condition: function (s) {
      return s.san <= 40 && s.san > 30 && !s.triggeredEvents.includes('hook_san_40');
    },
    text: '你的手在发抖。不是因为冷。是因为你开始看到一些不应该在那里的东西。',
    sanCost: 0,
  },
  {
    id: 'hook_san_20',
    condition: function (s) {
      return s.san <= 20 && !s.triggeredEvents.includes('hook_san_20');
    },
    text: '你听到了自己的心跳。不——那不是心跳。是敲门声。从你的胸腔里面传出来的。',
    sanCost: 1,
  },
];
