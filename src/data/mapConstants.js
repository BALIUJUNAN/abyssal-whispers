// src/data/mapConstants.js - Map layout data (extracted from appHelpers.js)

// === MAP_LAYOUT ===
export const MAP_LAYOUT = {
  town_center: { x: 48, y: 30, label: '镇中心' },
  voxchester_manor: { x: 72, y: 22, label: '庄园' },
  harbor_district: { x: 32, y: 52, label: '码头' },
  lighthouse: { x: 14, y: 72, label: '灯塔' },
  catacombs_entrance: { x: 58, y: 58, label: '墓穴入口' },
  deep_catacombs: { x: 62, y: 78, label: '深层墓穴' },
  whispering_forest: { x: 82, y: 54, label: '低语森林' },
  forbidden_grove: { x: 88, y: 76, label: '禁忌林地' },
  ruins_of_yith: { x: 48, y: 90, label: '伊斯遗迹' },
};
// === MAP_EDGES ===
export const MAP_EDGES = [
  ['town_center', 'voxchester_manor'],
  ['town_center', 'harbor_district'],
  ['harbor_district', 'lighthouse'],
  ['town_center', 'catacombs_entrance'],
  ['catacombs_entrance', 'deep_catacombs'],
  ['town_center', 'whispering_forest'],
  ['whispering_forest', 'forbidden_grove'],
  ['deep_catacombs', 'ruins_of_yith'],
  // 以下 2 条为 connected_areas 中存在但此前遗漏的边
  ['voxchester_manor', 'catacombs_entrance'],
  ['whispering_forest', 'ruins_of_yith'],
];
// === MAP_ZONES ===
export const MAP_ZONES = [
  { label: '镇 区', x: 42, y: 16, areas: ['town_center', 'voxchester_manor'] },
  { label: '海 岸', x: 16, y: 42, areas: ['harbor_district', 'lighthouse'] },
  { label: '地 下', x: 52, y: 68, areas: ['catacombs_entrance', 'deep_catacombs'] },
  { label: '森 林', x: 78, y: 42, areas: ['whispering_forest', 'forbidden_grove'] },
  { label: '遗 迹', x: 40, y: 84, areas: ['ruins_of_yith'] },
];
