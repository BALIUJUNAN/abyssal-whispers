// src/reducers/worldReducer.js - World, seal state, weather, phase logic

export function getPhase(ap, maxAp) {
  const ratio = (maxAp && maxAp > 0) ? ap / maxAp : 0;
  if (ratio > 0.66) return 'morning';
  if (ratio > 0.33) return 'afternoon';
  if (ratio > 0) return 'evening';
  return 'midnight';
}

export function getSealState(day, ctx) {
  const { GD } = ctx;
  const states = GD.world?.seal_state_machine || GD.module8_time_schedule?.seal_state_machine?.states || [];
  const list = Array.isArray(states) ? states : (states.states || []);
  for (let i = list.length - 1; i >= 0; i--) if (day >= list[i].trigger_day) return list[i];
  return list[0] || { id: 'intact', name: '封印完整' };
}

export function getSealStateId(day, ctx) {
  return getSealState(day, ctx).id;
}

export function getWeather(pick) {
  const ws = [{ name: '晴天', w: 3 }, { name: '阴天', w: 4 }, { name: '雨天', w: 2 }, { name: '大雾', w: 2 }, { name: '血月', w: 1 }];
  let r = Math.random() * ws.reduce((s, x) => s + x.w, 0);
  for (const w of ws) { r -= w.w; if (r <= 0) return w; }
  return ws[0];
}

export function getAreaInfo(areaId, ctx) {
  const { GD } = ctx;
  const areas = GD.areas || GD.module2_areas || [];
  return areas.find(a => a.id === areaId);
}

export function getConnectedAreas(areaId, ctx) {
  const cur = getAreaInfo(areaId, ctx);
  return cur?.connected_areas || [];
}

// Distorted alternate names per area (for cognitive pollution)
const AREA_DISTORTIONS = {
  town_center: ['沃切斯特镇中?','沃切斯特镇■心','???斯特镇中心','沃切斯特镇','镇中心广场'],
  harbor_district: ['雾港码头■','雾港?头区','雾港码头区','港■码头区','码头'],
  lighthouse: ['灯塔?','灯塔回廊','???塔','灯塔','灰烬灯塔'],
  voxchester_manor: ['沃切斯特■园','庄园?','???斯特庄园','庄园','沃切斯特庄园'],
  catacombs_entrance: ['墓穴■口','墓穴入?','???穴入口','墓穴','深渊之门'],
  whispering_forest: ['低语森■','低语?林','???语森林','森林','低语森林'],
  ruins_of_yith: ['伊斯遗■','伊斯?迹','???遗迹','遗迹','伊斯遗迹'],
  forbidden_grove: ['禁忌之■','禁忌?林','???之林','禁忌之林','禁忌之林'],
  deep_catacombs: ['深渊墓■','深渊?穴','???墓穴','深渊墓穴','深渊墓穴']
};

export function getDistortedName(area, state) {
  if (!area) return '???';
  // Check cache first
  if (state.areaNameCache && state.areaNameCache[area.id]) return state.areaNameCache[area.id];

  const san = state.san || 0;
  const pollution = state.pollution || 0;
  let distortChance = 0;

  if (san <= 0) distortChance = 1.0;
  else if (san <= 19) distortChance = 0.7;
  else if (san <= 39) distortChance = 0.4;
  else if (san <= 59) distortChance = 0.2;
  else if (san <= 79) distortChance = 0.08;

  // Pollution adds to distortion chance
  distortChance += pollution * 0.5;

  // Memory decay: areas not visited recently fade
  const lastVisit = state.lastVisitedDates?.[area.id] || state.day;
  const daysSince = (state.day || 1) - lastVisit;
  const fadeThreshold = Math.max(2, 5 - Math.floor((state.loopCount || 0) * 0.5));
  if (daysSince > fadeThreshold) {
    distortChance += (daysSince - fadeThreshold) * 0.1;
  }

  distortChance = Math.min(1, distortChance);

  if (Math.random() >= distortChance) return area.name;

  // Pick a distorted name
  const alts = AREA_DISTORTIONS[area.id];
  if (!alts) return area.name;

  let idx;
  if (san <= 0) idx = 0; // most garbled
  else if (san <= 19) idx = Math.random() < 0.6 ? 0 : 1;
  else if (san <= 39) idx = Math.random() < 0.5 ? 1 : 2;
  else if (san <= 59) idx = Math.random() < 0.5 ? 3 : 1;
  else idx = 3; // mild: slightly wrong

  const distorted = alts[idx] || area.name;
  return distorted;
}
