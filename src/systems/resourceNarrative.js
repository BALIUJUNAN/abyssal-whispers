// src/systems/resourceNarrative.js - Resource-narrative binding system
// Phase 6: Each resource directly affects narrative text and event availability.

function getResourceTextCorruptionChance(state) {
  var chance = 0;
  var food = state.food || 0;
  var light = state.lightLevel || 0;
  var infection = state.infection || 0;
  var fatigue = state.fatigue || 0;
  if (food === 0) chance += 0.15; else if (food === 1) chance += 0.05;
  if (light === 0) chance += 0.20; else if (light === 1) chance += 0.08;
  if (infection >= 7) chance += 0.25; else if (infection >= 4) chance += 0.12; else if (infection >= 2) chance += 0.03;
  if (fatigue >= 8) chance += 0.18; else if (fatigue >= 5) chance += 0.06;
  return Math.min(0.5, chance);
}

function getResourceNarrative(state) {
  var texts = [];
  var food = state.food || 0;
  var light = state.lightLevel || 0;
  var infection = state.infection || 0;
  var fatigue = state.fatigue || 0;
  if (food === 0) texts.push('你的胀在叫。不是饥饿——是某种更古老的呼唤。');
  if (light === 0) texts.push('黑暗中，文字开始自己移动。你不确定你读到的是不是写在纸上的。');
  if (infection >= 7) texts.push('你的皮肤下面有东西在移动。不是血管。是别的什么。');
  else if (infection >= 4) texts.push('你听到海浪声。但你在镇中心。海浪声在你的骨头里。');
  if (fatigue >= 8) texts.push('你试图集中注意力。但思绪像雾一样散开了。');
  else if (fatigue >= 5) texts.push('你的眼皮很重。有些字你看不清了。');
  if (texts.length === 0) return null;
  return texts[Math.floor(Math.random() * texts.length)];
}

function applyResourceTextCorruption(text, state) {
  if (!text) return text;
  var chance = getResourceTextCorruptionChance(state);
  if (chance <= 0 || Math.random() > chance) return text;
  var light = state.lightLevel || 0;
  var infection = state.infection || 0;
  var fatigue = state.fatigue || 0;
  if (light === 0 && Math.random() < 0.5) {
    var chars = text.split('');
    for (var i = 0; i < chars.length; i++) {
      if (Math.random() < 0.06) chars[i] = '■';
    }
    return chars.join('');
  }
  if (infection >= 4 && Math.random() < 0.3) {
    var suffixes = ['\n（你听到海浪声。但这里没有海。）', '\n（你的皮肤在发痒。）', '\n（盐的味道。你没有吃盐。）'];
    return text + suffixes[Math.floor(Math.random() * suffixes.length)];
  }
  if (fatigue >= 8 && Math.random() < 0.3) {
    var cut = Math.floor(text.length * (0.6 + Math.random() * 0.3));
    return text.slice(0, cut) + '……你想不起来了。';
  }
  return text;
}

function processDailyResources(state) {
  var actions = state._dayActions || [];
  state.fatigue = Math.min(state.maxFatigue || 10, (state.fatigue || 0) + actions.length);
  var corr = state.safehouseCorruption || 0;
  var fatigueRec = corr < 20 ? 4 : corr < 40 ? 3 : corr < 60 ? 2 : 1;
  state.fatigue = Math.max(0, state.fatigue - fatigueRec);
  var corruptedNpcs = Object.values(state.npcStates || {}).filter(function(ns) { return ns.corrupted && !ns.dead; }).length;
  if (corruptedNpcs > 0 && Math.random() < 0.15 * corruptedNpcs) {
    state.infection = Math.min(state.maxInfection || 10, (state.infection || 0) + 1);
  }
  var dangerousAreas = ['deep_catacombs', 'ruins_of_yith', 'forbidden_grove'];
  if (dangerousAreas.indexOf(state.currentArea) >= 0) {
    state.infection = Math.min(state.maxInfection || 10, (state.infection || 0) + 1);
  }
  var flashlight = (state.inventory || []).find(function(i) { return i.name === '手电筒' || i.id === 'flashlight'; });
  if (flashlight) state.lightLevel = flashlight.uses > 0 ? 2 : 0;
}

var SAFEHOUSE_VISUAL_STAGES = [
  { stage: 0, corruption: [0, 15], name: '庇护所', description: '温暖、干燥、安全。至少现在是。', sound: 'rest_generic', recovery: 2 },
  { stage: 1, corruption: [16, 35], name: '临时住所', description: '墙角有水渍。窗帘在没有风的时候动了一下。', sound: 'safehouse_breath', recovery: 1 },
  { stage: 2, corruption: [36, 55], name: '可疑空间', description: '你不确定门是不是你关的。镜子里的你眨眼的频率不太对。', sound: 'safehouse_breath', recovery: 0 },
  { stage: 3, corruption: [56, 75], name: '不可靠空间', description: '安全屋不再安全。墙壁在呼吸。地板在记忆你的脚步。', sound: 'safehouse_not_safe', recovery: -1 },
  { stage: 4, corruption: [76, 100], name: '深渊的延伸', description: '这里不是你的安全屋。这里从来都不是。你只是被允许待在这里。暂时。', sound: 'safehouse_not_safe', recovery: -3 },
];

function getSafehouseVisualStage(corruption) {
  for (var i = SAFEHOUSE_VISUAL_STAGES.length - 1; i >= 0; i--) {
    var s = SAFEHOUSE_VISUAL_STAGES[i];
    if (corruption >= s.corruption[0] && corruption <= s.corruption[1]) return s;
  }
  return SAFEHOUSE_VISUAL_STAGES[0];
}
