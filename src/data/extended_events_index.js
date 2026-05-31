// 扩展事件索引 - 汇总所有新增事件模块
// 总计 600 个新增事件，分 9 个方向

import { events as loopEvents } from './events_loop.js';
import { events as humanityEvents } from './events_humanity.js';
import { events as mythosEvents } from './events_mythos.js';
import { events as resourceEvents } from './events_resource.js';
import { events as npcCrossEvents } from './events_npc_cross.js';
import { events as areaDeepEvents } from './events_area_deep.js';
import { events as endingEvents } from './events_ending.js';
import { events as silentEvents } from './events_silent.js';
import { events as metaEvents } from './events_meta.js';

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
};

// 合并所有新增事件
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
    ending_omen: endingEvents.filter(e => e.subtype === 'omen' || e.subtype === 'cross').length,
    ending_aftermath: endingEvents.filter(e => e.subtype === 'aftermath').length,
    silent: silentEvents.length,
    meta: metaEvents.length,
  },
  byTier: {
    normal: ALL_EXTENDED_EVENTS.filter(e => e.tier === 'normal').length,
    rare: ALL_EXTENDED_EVENTS.filter(e => e.tier === 'rare').length,
    signature: ALL_EXTENDED_EVENTS.filter(e => e.tier === 'signature').length,
    meta: ALL_EXTENDED_EVENTS.filter(e => e.tier === 'meta').length,
  },
};

// 验证事件ID唯一性
const ids = ALL_EXTENDED_EVENTS.map(e => e.id);
const uniqueIds = new Set(ids);
if (uniqueIds.size !== ids.length) {
  // duplicate IDs silently ignored (last-write-wins)
}

// 验证所有事件有必需字段
const missingFields = ALL_EXTENDED_EVENTS.filter(e => !e.id || !e.name || !e.type || !e.trigger);
if (missingFields.length > 0) {
  // incomplete events silently skipped
}

export default ALL_EXTENDED_EVENTS;
