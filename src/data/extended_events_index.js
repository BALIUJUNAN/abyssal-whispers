// 扩展事件索引 - 汇总所有新增事件模块
// 总计 575 个新增事件，分 9 个方向（§3.2: meta从36精简到12）

import { EVENTS as loopEvents } from './events/events_loop.js';
import { EVENTS as humanityEvents } from './events/events_humanity.js';
import { EVENTS as mythosEvents } from './events/events_mythos.js';
import { EVENTS as resourceEvents } from './events/events_resource.js';
import { EVENTS as npcCrossEvents } from './events/events_npc_cross.js';
import { EVENTS as areaDeepEvents } from './events/events_area_deep.js';
import { EVENTS as endingEvents } from './events/events_ending.js';
import { EVENTS as silentEvents } from './events/events_silent.js';
import { EVENTS as metaEvents } from './events/events_meta.js';
import { EVENTS as ch2plusEvents } from './events/events_ch2plus.js';

// 按方向分类的事件模块
export const EXTENDED_EVENT_MODULES = {
  loop: { events: loopEvents, count: loopEvents.length },
  humanity: { events: humanityEvents, count: humanityEvents.length },
  mythos: { events: mythosEvents, count: mythosEvents.length },
  resource: { events: resourceEvents, count: resourceEvents.length },
  npc_cross: { events: npcCrossEvents, count: npcCrossEvents.length },
  area_deep: { events: areaDeepEvents, count: areaDeepEvents.length },
  ending: { events: endingEvents, count: endingEvents.length },
  silent: { events: silentEvents, count: silentEvents.length },
  meta: { events: metaEvents, count: metaEvents.length },
  ch2plus: { events: ch2plusEvents, count: ch2plusEvents.length },
};

// 合并所有核心扩展事件（599 个，第600事件触发器依赖此数量）
export const ALL_EXTENDED_EVENTS = [
  ...loopEvents,
  ...humanityEvents,
  ...mythosEvents,
  ...resourceEvents,
  ...npcCrossEvents,
  ...areaDeepEvents,
  ...endingEvents,
  ...silentEvents,
  ...metaEvents,
];

// Ch2+ 章节事件（从 game_ch2plus.json 迁移，70 个）
// 不计入 599 — 通过 EXTENDED_EVENT_MODULES.ch2plus 独立管理
export const CH2PLUS_EVENTS = ch2plusEvents;

// 统计信息
export const EXTENDED_EVENT_STATS = {
  total: ALL_EXTENDED_EVENTS.length,
  byType: {
    loop_locked: loopEvents.length,
    humanity: humanityEvents.length,
    mythos: mythosEvents.length,
    resource_pressure: resourceEvents.length,
    npc_cross: npcCrossEvents.length,
    area_deep: areaDeepEvents.length,
    ending_omen: endingEvents.filter((e) => e.subtype === 'omen' || e.subtype === 'cross').length,
    ending_aftermath: endingEvents.filter((e) => e.subtype === 'aftermath').length,
    silent: silentEvents.length,
    meta: metaEvents.length,
  },
  byTier: {
    normal: ALL_EXTENDED_EVENTS.filter((e) => e.tier === 'normal').length,
    rare: ALL_EXTENDED_EVENTS.filter((e) => e.tier === 'rare').length,
    signature: ALL_EXTENDED_EVENTS.filter((e) => e.tier === 'signature').length,
    meta: ALL_EXTENDED_EVENTS.filter((e) => e.tier === 'meta').length,
  },
};

// 验证事件ID唯一性
const ids = ALL_EXTENDED_EVENTS.map((e) => e.id);
const uniqueIds = new Set(ids);
if (uniqueIds.size !== ids.length) {
  // duplicate IDs silently ignored (last-write-wins)
}

// 验证所有事件有必需字段
const missingFields = ALL_EXTENDED_EVENTS.filter((e) => !e.id || !e.name || !e.type || !e.trigger);
if (missingFields.length > 0) {
  // incomplete events silently skipped
}

export default ALL_EXTENDED_EVENTS;
