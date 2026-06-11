// src/systems/resourceNarrative.js - Resource-narrative binding system
// Each resource directly affects narrative text, event availability, and event pool weights.
// Low light → descriptions become unreliable. High infection → corruption events weighted up.
// High fatigue → truncated/fragmented text. No food → desperation events.
//
// BUNDLE-SCOPE DEPENDENCY (build.py REDUCER_FILES):
//   Uses GD (global from app.jsx) and getAreaInfo (from worldReducer.js, loaded before this file).
//   processDailyResources reads area.infection_risk from GD.areas at runtime.

// =============================================
// SECTION 1: Resource Text Corruption
// =============================================

export function getResourceTextCorruptionChance(state) {
  var chance = 0;
  var food = state.food || 0;
  var light = state.lightLevel || 0;
  var infection = state.infection || 0;
  var fatigue = state.fatigue || 0;
  if (food === 0) chance += 0.15; else if (food === 1) chance += 0.05;
  if (light === 0) chance += 0.25; else if (light === 1) chance += 0.10;
  if (infection >= 7) chance += 0.30; else if (infection >= 4) chance += 0.15; else if (infection >= 2) chance += 0.05;
  if (fatigue >= 8) chance += 0.20; else if (fatigue >= 5) chance += 0.08;
  return Math.min(0.6, chance);
}

export function getResourceNarrative(state) {
  var texts = [];
  var food = state.food || 0;
  var light = state.lightLevel || 0;
  var infection = state.infection || 0;
  var fatigue = state.fatigue || 0;
  if (food === 0) texts.push('你的胃在叫。不是饥饿——是某种更古老的呼唤。');
  if (light === 0) texts.push('黑暗中，文字开始自己移动。你不确定你读到的是不是写在纸上的。');
  if (infection >= 7) texts.push('你的皮肤下面有东西在移动。不是血管。是别的什么。');
  else if (infection >= 4) texts.push('你听到海浪声。但你在镇中心。海浪声在你的骨头里。');
  if (fatigue >= 8) texts.push('你试图集中注意力。但思绪像雾一样散开了。');
  else if (fatigue >= 5) texts.push('你的眼皮很重。有些字你看不清了。');
  if (texts.length === 0) return null;
  return texts[Math.floor(Math.random() * texts.length)];
}

/**
 * Apply resource-based text corruption to event descriptions.
 * Low light: characters replaced with blocks (unreliable perception).
 * High infection: hallucinated suffixes appended (sensory intrusion).
 * High fatigue: text truncated (memory failure).
 * No food: desperation insertions.
 */
export function applyResourceTextCorruption(text, state) {
  if (!text) return text;
  var chance = getResourceTextCorruptionChance(state);
  if (chance <= 0 || Math.random() > chance) return text;
  var light = state.lightLevel || 0;
  var infection = state.infection || 0;
  var fatigue = state.fatigue || 0;
  var food = state.food || 0;
  // Light = 0: characters become unreadable blocks
  if (light === 0 && Math.random() < 0.5) {
    var chars = text.split('');
    for (var i = 0; i < chars.length; i++) {
      if (Math.random() < 0.08) chars[i] = '■';
    }
    return chars.join('');
  }
  // Light = 1: occasional word replacement (unreliable perception)
  if (light === 1 && Math.random() < 0.3) {
    var unreliablePairs = [['看到了','以为你看到了'],['听到了','可能是'],['确定','不确定'],['真实','模糊'],['存在','似乎']];
    var t = text;
    var pair = unreliablePairs[Math.floor(Math.random() * unreliablePairs.length)];
    if (t.includes(pair[0])) t = t.replace(pair[0], pair[1]);
    return t;
  }
  // Infection >= 4: sensory intrusion
  if (infection >= 4 && Math.random() < 0.35) {
    var suffixes = [
      '\n（你听到海浪声。但这里没有海。）',
      '\n（你的皮肤在发痒。不是蚊子。是别的什么。）',
      '\n（盐的味道。你没有吃盐。）',
      '\n（你的手指甲下面有沙子。你今天没有碰过沙子。）',
    ];
    if (infection >= 7) suffixes.push('\n（你低头看了一眼。你的影子比你矮了一截。）');
    return text + suffixes[Math.floor(Math.random() * suffixes.length)];
  }
  // Fatigue >= 8: memory failure — text gets truncated
  if (fatigue >= 8 && Math.random() < 0.35) {
    var cut = Math.floor(text.length * (0.5 + Math.random() * 0.3));
    return text.slice(0, cut) + '……你想不起来了。';
  }
  // No food: desperation perception
  if (food === 0 && Math.random() < 0.2) {
    return text + '\n（你的胃在叫。声音比你预想的大。）';
  }
  return text;
}

// =============================================
// SECTION 2: Resource-Bound Event Weight Modifier
// =============================================

/**
 * Compute weight multiplier for an event based on current resource state.
 * Low light → unreliable/perception events boosted, reliable events reduced.
 * High infection → corruption/infection events boosted.
 * High fatigue → passive/silent events boosted, active events reduced.
 * No food → resource/desperation events boosted.
 *
 * @param {object} evt - event object
 * @param {object} state - game state
 * @returns {number} weight multiplier (0.3 - 2.0)
 */
export function getResourceEventWeightModifier(evt, state) {
  var w = 1.0;
  var light = state.lightLevel || 0;
  var infection = state.infection || 0;
  var fatigue = state.fatigue || 0;
  var food = state.food || 0;
  var tags = evt.tags || [];
  var type = evt.type || evt.event_classification || '';

  // Low light: perception events up, reliable events down
  if (light === 0) {
    if (tags.indexOf('perception') >= 0 || tags.indexOf('unreliable') >= 0 || type === '轻微异常') w *= 1.8;
    if (tags.indexOf('reliable') >= 0 || type === '正常事件') w *= 0.5;
    // Darkness-specific events
    if (tags.indexOf('darkness') >= 0) w *= 2.0;
  } else if (light === 1) {
    if (tags.indexOf('perception') >= 0 || type === '轻微异常') w *= 1.3;
  }

  // High infection: corruption events up, normal events down
  if (infection >= 7) {
    if (tags.indexOf('infection') >= 0 || tags.indexOf('body') >= 0 || tags.indexOf('flesh') >= 0) w *= 2.0;
    if (type === '怪物遭遇' || type === '超自然遭遇') w *= 1.4;
    if (type === '正常事件') w *= 0.5;
  } else if (infection >= 4) {
    if (tags.indexOf('infection') >= 0 || tags.indexOf('body') >= 0) w *= 1.5;
    if (type === '怪物遭遇') w *= 1.2;
  }

  // High fatigue: passive events up, demanding events down
  if (fatigue >= 8) {
    if (tags.indexOf('silent') >= 0 || type === '氛围事件') w *= 1.6;
    if (tags.indexOf('demanding') >= 0 || tags.indexOf('combat') >= 0) w *= 0.5;
  } else if (fatigue >= 5) {
    if (tags.indexOf('silent') >= 0) w *= 1.3;
  }

  // No food: desperation and resource events up
  if (food === 0) {
    if (tags.indexOf('resource') >= 0 || tags.indexOf('food') >= 0 || type === 'resource_pressure') w *= 1.8;
    if (tags.indexOf('desperation') >= 0) w *= 1.5;
  }

  return w;
}

// =============================================
// SECTION 3: Daily Resource Processing
// =============================================

export function processDailyResources(state) {
  // Declare food BEFORE use to avoid var-hoisting shadowing the starvation check
  var food = state.food || 0;
  var actions = state._dayActions || [];
  state.fatigue = Math.min(state.maxFatigue || 10, (state.fatigue || 0) + actions.length);
  var corr = state.safehouseCorruption || 0;
  var fatigueRec = corr < 20 ? 4 : corr < 40 ? 3 : corr < 60 ? 2 : 1;
  state.fatigue = Math.max(0, state.fatigue - fatigueRec);
  var corruptedNpcs = Object.values(state.npcStates || {}).filter(function(ns) { return ns.corrupted && !ns.dead; }).length;
  if (corruptedNpcs > 0 && Math.random() < 0.15 * corruptedNpcs) {
    state.infection = Math.min(state.maxInfection || 10, (state.infection || 0) + 1);
  }
  // Dangerous area infection: driven by area.infection_risk flag (from game data),
  // falls back to danger_level >= 5 for backward compatibility.
  // NOTE: lighthouse (level 5) has infection_risk=false in game data — narrative exclusion.
  var areaData = typeof getAreaInfo === 'function' ? getAreaInfo(state.currentArea, { GD: GD }) : null;
  var isInfectious = areaData ? !!areaData.infection_risk : ['deep_catacombs', 'ruins_of_yith', 'forbidden_grove'].indexOf(state.currentArea) >= 0;
  if (isInfectious) {
    state.infection = Math.min(state.maxInfection || 10, (state.infection || 0) + 1);
  }
  // Light degradation: flashlight uses consumed over time
  var flashlight = (state.inventory || []).find(function(i) { return i.name === '手电筒' || i.id === 'flashlight'; });
  if (flashlight) state.lightLevel = flashlight.uses > 0 ? 2 : 0;
  // Starvation tracking: uses same `starvationDays` key as _processFoodAndStarvation
  if (food === 0) {
    state.starvationDays = (state.starvationDays || 0) + 1;
  } else {
    state.starvationDays = 0;
  }
}

// =============================================
// SECTION 4: Safehouse 5-Stage Degradation System
// =============================================

export var SAFEHOUSE_STAGES = [
  {
    stage: 0, corruption: [0, 15], name: '庇护所',
    description: '温暖、干燥、安全。壁炉里的火还在燃烧。至少现在是。',
    sound: 'rest_generic', recovery: 2, eventChance: 0,
    atmosphere: '酒馆的木头发出温暖的嘎吱声。窗外的雾暂时被关在了外面。'
  },
  {
    stage: 1, corruption: [16, 35], name: '临时住所',
    description: '墙角有水渍。窗帘在没有风的时候动了一下。地板上的灰尘里有你没留过的脚印。',
    sound: 'safehouse_breath', recovery: 1, eventChance: 0.08,
    atmosphere: '你听到了滴水声。不是水龙头——是从墙壁里面传出来的。'
  },
  {
    stage: 2, corruption: [36, 55], name: '可疑空间',
    description: '你不确定门是不是你关的。镜子里的你眨眼的频率不太对。家具的位置和你记忆中的不完全一致。',
    sound: 'safehouse_breath', recovery: 0, eventChance: 0.15,
    atmosphere: '你醒来的时候，床单上有盐的结晶。你的枕头是湿的。但你没有哭。'
  },
  {
    stage: 3, corruption: [56, 75], name: '不可靠空间',
    description: '安全屋不再安全。墙壁在呼吸。地板在记忆你的脚步。你关上门的时候，门从另一边推了一下。',
    sound: 'safehouse_not_safe', recovery: -1, eventChance: 0.25,
    atmosphere: '你在半夜醒来。你的笔记本翻到了你不记得写的那一页。字迹是你的。但墨水还没有干。'
  },
  {
    stage: 4, corruption: [76, 100], name: '深渊的延伸',
    description: '这里不是你的安全屋。这里从来都不是。你只是被允许待在这里。暂时。',
    sound: 'safehouse_not_safe', recovery: -3, eventChance: 0.40,
    atmosphere: '你闭上眼睛的时候，感觉有人在你耳边呼吸。你睁开眼睛，空气是冷的。但你的脖子后面是热的。'
  },
];

export var SAFEHOUSE_POLLUTION_EVENTS = [
  // Stage 1-2 events (mild unease)
  { minStage: 1, maxStage: 2, text: '你听到楼下的地板嘎吱了一声。你一个人住。', sanCost: 0 },
  { minStage: 1, maxStage: 3, text: '你的笔记本翻到了一页你没有写的笔记。字迹模仿得很像。但不是你的。', sanCost: 1 },
  { minStage: 1, maxStage: 2, text: '窗外有人在看你。你拉开窗帘——没有人。但窗玻璃上有手印。从外面。', sanCost: 0 },
  { minStage: 2, maxStage: 3, text: '你醒来的时候，安全屋的门是开着的。你确定你关了。', sanCost: 1 },
  { minStage: 2, maxStage: 4, text: '镜子里的你微笑了。你没有。', sanCost: 2 },
  // Stage 3-4 events (active hostility)
  { minStage: 3, maxStage: 4, text: '你的食物少了一份。不是因为你吃了。是因为有什么东西帮你吃了。', sanCost: 1 },
  { minStage: 3, maxStage: 4, text: '你安全屋的墙壁上出现了文字。不是油漆——更像是从墙壁内部渗出来的。', sanCost: 2 },
  { minStage: 3, maxStage: 4, text: '你在半夜听到有人在用你的声音说话。说的是你明天要说的话。', sanCost: 2 },
  { minStage: 4, maxStage: 4, text: '你醒来的时候，发现自己站在门口。门是开的。你的脚是湿的。你不记得走过路。', sanCost: 3 },
  { minStage: 4, maxStage: 4, text: '安全屋的灯灭了。不是灯泡坏了。是黑暗自己走了进来。', sanCost: 3 },
  { minStage: 4, maxStage: 4, text: '你看到自己的影子在墙上移动。但你没有动。影子在看着你。', sanCost: 2 },
];

/**
 * Get safehouse visual stage based on corruption level.
 */
export function getSafehouseVisualStage(corruption) {
  for (var i = SAFEHOUSE_STAGES.length - 1; i >= 0; i--) {
    var s = SAFEHOUSE_STAGES[i];
    if (corruption >= s.corruption[0] && corruption <= s.corruption[1]) return s;
  }
  return SAFEHOUSE_STAGES[0];
}

/**
 * Get a safehouse pollution event for the current stage.
 * Returns null if no event triggers (based on stage eventChance).
 * @param {number} stage - safehouse stage (0-4)
 * @param {number} eventChanceOverride - override chance (optional)
 * @returns {object|null} pollution event or null
 */
export function getSafehousePollutionEvent(stage, eventChanceOverride) {
  var stageData = SAFEHOUSE_STAGES[Math.min(stage, SAFEHOUSE_STAGES.length - 1)];
  var chance = eventChanceOverride != null ? eventChanceOverride : stageData.eventChance;
  if (Math.random() >= chance) return null;
  var eligible = SAFEHOUSE_POLLUTION_EVENTS.filter(function(e) { return stage >= e.minStage && stage <= e.maxStage; });
  if (eligible.length === 0) return null;
  return eligible[Math.floor(Math.random() * eligible.length)];
}
