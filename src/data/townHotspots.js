// src/data/townHotspots.js — 暗黑地牢风格城镇地图热点定义
// 每个 hotspot 对应地图上的一个可交互区域，点击后弹出对应功能面板。
//
// 坐标系：百分比（相对于地图原图尺寸），与 MAP_LAYOUT 保持一致。
// 类型：'area' | 'npc_spot' | 'building' | 'action'
//
// 设计参考：Darkest Dungeon 的 Hamlet 地图 — 每个建筑/区域是一个锚点，
// 点击后弹出该地点的功能界面（而非切换屏幕）。

import { isAreaUnlocked } from '../utils/gameHelpers.js';
import { getAvailableSafehouses } from '../utils/appHelpers.js';
import { getConnectedAreas } from '../engine/WorldTimeSystem.js';

export const TOWN_HOTSPOTS = [
  // ─── 核心区域（9个） ────────────────────────────────────────
  {
    id: 'town_center',
    type: 'area',
    label: '沃切斯特镇中心',
    shortLabel: '镇中心',
    icon: '🏛',
    x: 48,
    y: 30, // 与 MAP_LAYOUT 一致
    radius: 5, // 点击热区半径(%)
    description: '石板路、公告栏、紧闭的窗户。',
    areaId: 'town_center',
    unlocked: true, // 始终解锁
    glowColor: '#b8963a', // 金色光晕（安全区）
    unlockHint: null,
    // 可在该区域执行的行动分类
    actions: ['explore', 'talk', 'buy_food', 'work'],
  },
  {
    id: 'voxchester_manor',
    type: 'area',
    label: '莫里斯庄园',
    shortLabel: '庄园',
    icon: '🏚',
    x: 72,
    y: 22,
    radius: 4.5,
    description: '维多利亚式庄园，肖像画中的人好像在看你。',
    areaId: 'voxchester_manor',
    unlocked: true,
    glowColor: '#8b6914',
    unlockHint: null,
    actions: ['explore', 'talk'],
  },
  {
    id: 'harbor_district',
    type: 'area',
    label: '沃切斯特码头',
    shortLabel: '码头',
    icon: '⚓',
    x: 32,
    y: 52,
    radius: 4.5,
    description: '海风裹着盐味和另一种说不清的气味。',
    areaId: 'harbor_district',
    unlocked: true,
    glowColor: '#3a7eb8',
    unlockHint: null,
    actions: ['explore', 'talk', 'work'],
  },
  {
    id: 'lighthouse',
    type: 'area',
    label: '灯塔',
    shortLabel: '灯塔',
    icon: '🗼',
    x: 14,
    y: 72,
    radius: 4,
    description: '灯塔已经很久没亮了。但每到午夜，有人说它自己会亮。',
    areaId: 'lighthouse',
    unlocked: false,
    glowColor: '#5a9e6e',
    unlockHint: '需要先前往码头或墓穴入口',
    unlockCondition: (state) =>
      state.visitedAreas.includes('harbor_district') ||
      state.visitedAreas.includes('catacombs_entrance'),
    actions: ['explore'],
  },
  {
    id: 'catacombs_entrance',
    type: 'area',
    label: '墓穴入口',
    shortLabel: '墓穴',
    icon: '⚰',
    x: 58,
    y: 58,
    radius: 4,
    description: '石阶向下延伸，空气变得又冷又潮。',
    areaId: 'catacombs_entrance',
    unlocked: true,
    glowColor: '#6a5a8a',
    unlockHint: null,
    actions: ['explore'],
  },
  {
    id: 'deep_catacombs',
    type: 'area',
    label: '深层墓穴',
    shortLabel: '深层',
    icon: '🕯',
    x: 62,
    y: 78,
    radius: 3.5,
    description: '空气几乎凝固。墙壁上刻满了看不懂的符文。',
    areaId: 'deep_catacombs',
    unlocked: false,
    glowColor: '#4a3a6a',
    unlockHint: '需要先探索墓穴入口',
    unlockCondition: (state) => state.visitedAreas.includes('catacombs_entrance'),
    actions: ['explore'],
  },
  {
    id: 'whispering_forest',
    type: 'area',
    label: '低语森林',
    shortLabel: '森林',
    icon: '🌲',
    x: 82,
    y: 54,
    radius: 4.5,
    description: '树干之间的风声不像风声。更像是……低语。',
    areaId: 'whispering_forest',
    unlocked: true,
    glowColor: '#2a6a3a',
    unlockHint: null,
    actions: ['explore'],
  },
  {
    id: 'forbidden_grove',
    type: 'area',
    label: '禁忌林地',
    shortLabel: '禁忌林',
    icon: '🌑',
    x: 88,
    y: 76,
    radius: 3.5,
    description: '石碑上的字你不想读。但你已经读了。',
    areaId: 'forbidden_grove',
    unlocked: false,
    glowColor: '#1a3a2a',
    unlockHint: '需要先探索低语森林',
    unlockCondition: (state) => state.visitedAreas.includes('whispering_forest'),
    actions: ['explore'],
  },
  {
    id: 'ruins_of_yith',
    type: 'area',
    label: '伊斯遗迹',
    shortLabel: '遗迹',
    icon: '🔮',
    x: 48,
    y: 90,
    radius: 3.5,
    description: '这里的时间不是线性的。你确定现在是现在吗？',
    areaId: 'ruins_of_yith',
    unlocked: false,
    glowColor: '#6a1a6a',
    unlockHint: '需要线索或深入墓穴/森林',
    unlockCondition: (state) =>
      state.visitedAreas.includes('deep_catacombs') ||
      state.visitedAreas.includes('forbidden_grove'),
    actions: ['explore'],
  },

  // ─── 功能性建筑/地点（非探索区域） ────────────────────────
  {
    id: 'tavern',
    type: 'building',
    label: '沉锚酒馆',
    shortLabel: '酒馆',
    icon: '🍺',
    x: 42,
    y: 24, // 镇中心附近
    radius: 3,
    description: '你的安全屋。酒保看你的表情好像你已经来过很多次了。',
    glowColor: '#b8963a',
    actions: ['rest', 'safehouse_info'],
    // 只在镇中心时显示
    visibleWhen: (state) => state.currentArea === 'town_center',
  },
  {
    id: 'grocery',
    type: 'building',
    label: '杂货店',
    shortLabel: '杂货',
    icon: '🛒',
    x: 54,
    y: 26,
    radius: 3,
    description: '货架上的东西不多，但够用。如果你有金钱的话。',
    glowColor: '#8a7a3a',
    actions: ['buy_food'],
    visibleWhen: (state) => state.currentArea === 'town_center',
  },
  {
    id: 'safehouse_alt',
    type: 'building',
    label: '替代安全屋',
    shortLabel: '避风港',
    icon: '🏠',
    x: 26,
    y: 44,
    radius: 3,
    description: '如果酒馆不再安全，这里也许可以。',
    glowColor: '#5a8a5a',
    actions: ['switch_safehouse'],
    visibleWhen: (state, ctx) => {
      const shs = getAvailableSafehouses(state, ctx);
      return shs.length > 0;
    },
  },
];

// ─── 连接关系（复用 MAP_EDGES） ──────────────────────────────
// 直接使用 mapConstants.js 的 MAP_EDGES，无需重复定义

// ─── 热点查找工具 ────────────────────────────────────────────
export function getHotspotById(id) {
  return TOWN_HOTSPOTS.find((h) => h.id === id) || null;
}

export function getVisibleHotspots(state, ctx) {
  return TOWN_HOTSPOTS.filter((h) => {
    // 区域热点：始终显示（但可能灰显/锁定）
    if (h.type === 'area') return true;
    // 建筑热点：根据 visibleWhen 条件判断
    if (h.visibleWhen) return h.visibleWhen(state, ctx);
    return true;
  });
}

export function isHotspotUnlocked(hotspot, state, ctx) {
  const GD = ctx?.GD || {};
  if (hotspot.unlocked === true) return true;
  if (hotspot.unlocked === false) {
    // 使用 areaRegistry 的解锁逻辑
    const areaDef = (GD.areas || GD.module2_areas || []).find((a) => a.id === hotspot.areaId);
    if (areaDef && typeof isAreaUnlocked === 'function') return isAreaUnlocked(areaDef, state);
    if (hotspot.unlockCondition) return hotspot.unlockCondition(state);
    return false;
  }
  return true;
}

export function getHotspotState(hotspot, state, ctx) {
  if (hotspot.type !== 'area') return 'available';
  if (state.currentArea === hotspot.areaId) return 'current';
  if (!isHotspotUnlocked(hotspot, state, ctx)) return 'locked';
  const conn =
    ctx && typeof getConnectedAreas === 'function' ? getConnectedAreas(state.currentArea, ctx) : [];
  if (conn.includes(hotspot.areaId)) return 'reachable';
  if (state.visitedAreas.includes(hotspot.areaId)) return 'visited';
  return 'known';
}
