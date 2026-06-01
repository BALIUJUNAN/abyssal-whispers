// src/systems/worldDecay.js - World decay and corruption advancement
// World actively deteriorates each day. Player actions accelerate decay.
// Player investigation patterns accelerate area-specific corruption.
// Creates the feeling that the world is collapsing around the player.

// =============================================
// SECTION 1: Daily Corruption Calculation
// =============================================

function calculateDailyCorruption(state, ctx) {
  var GD = ctx.GD;
  var corruption = 0;

  // Base: world actively decays every day (+2)
  corruption += 2;

  // Player behavior acceleration
  var bt = state.behaviorTracking || {};
  if (bt.direct_kill_count > 0) corruption += bt.direct_kill_count;
  if (bt.cannibalism_count > 0) corruption += bt.cannibalism_count * 2;
  if (bt.self_harm_ritual_count > 0) corruption += 1;
  if (bt.sacred_desecration_count > 0) corruption += bt.sacred_desecration_count * 2;
  if (bt.loop_break_attempts > 0) corruption += bt.loop_break_attempts * 3;

  // SAN acceleration: low SAN speeds up world decay
  var san = state.san || 0;
  if (san < 30) corruption += 3;
  else if (san < 50) corruption += 1;

  // Seal state acceleration
  var sealState = state.sealState || "intact";
  if (sealState === "critical") corruption += 5;
  else if (sealState === "collapsing") corruption += 8;
  else if (sealState === "weakening") corruption += 2;

  // Loop count: each loop makes the world slightly more broken
  corruption += Math.floor((state.loopCount || 0) * 0.5);

  // Player investigation intensity: more actions per day = faster decay
  var todayActions = (state._dayActions || []).length;
  if (todayActions >= 8) corruption += 2;
  else if (todayActions >= 5) corruption += 1;

  return corruption;
}

// =============================================
// SECTION 2: Area-Specific Corruption Tracking
// =============================================

/**
 * Track player's area investigation patterns and accelerate corruption
 * in heavily-investigated areas. Makes the world "push back" against investigation.
 *
 * Called during REST. Updates state._areaCorruption map.
 */
function updateAreaCorruption(state, ctx) {
  if (!state._areaCorruption) state._areaCorruption = {};
  var todayActions = state._dayActions || [];
  var todayAreas = {};

  // Count actions per area today
  for (var i = 0; i < todayActions.length; i++) {
    var a = todayActions[i];
    if (a === 'EXPLORE' || a === 'MOVE') {
      var area = state.currentArea || 'unknown';
      todayAreas[area] = (todayAreas[area] || 0) + 1;
    }
  }

  // For each area the player investigated heavily, increase its corruption
  for (var areaId in todayAreas) {
    var intensity = todayAreas[areaId];
    if (intensity >= 2) {
      var gain = intensity >= 4 ? 3 : intensity >= 3 ? 2 : 1;
      state._areaCorruption[areaId] = Math.min(100, (state._areaCorruption[areaId] || 0) + gain);
    }
  }

  // Natural decay: areas not visited slowly recover (world heals when not observed)
  var visited = state.visitedAreas || [];
  for (var areaId2 in state._areaCorruption) {
    if (todayAreas[areaId2] == null && state._areaCorruption[areaId2] > 0) {
      state._areaCorruption[areaId2] = Math.max(0, state._areaCorruption[areaId2] - 0.5);
    }
  }
}

/**
 * Get area-specific corruption level for event weight modification.
 * @param {string} areaId
 * @param {object} state
 * @returns {number} 0-100
 */
function getAreaCorruptionLevel(areaId, state) {
  if (!state._areaCorruption) return 0;
  return state._areaCorruption[areaId] || 0;
}

/**
 * Generate narrative text for area-specific corruption effects.
 * Called during EXPLORE when area corruption is high.
 */
function getAreaCorruptionNarrative(areaId, state) {
  var level = getAreaCorruptionLevel(areaId, state);
  if (level < 20) return null;
  var narratives = {
    20: [
      '你注意到这个区域的空气比上次来的时候更沉了。',
      '地面上的裂缝比你记忆中的更多了。',
    ],
    40: [
      '你听到了不属于这个地方的声音。很轻。像是呼吸。',
      '你转身的时候，身后的景象和你刚才看到的不太一样。',
    ],
    60: [
      '这个区域在抗拒你的存在。每走一步，地面都在微微震动。',
      '你看到了不应该在这里的东西。你决定不去确认那是不是真的。',
    ],
    80: [
      '你感觉这个区域在看着你。不是某个人——是整个区域。',
      '你的影子在这里比在其他地方更黑。更实。更像一个独立的存在。',
    ],
  };
  var threshold = level >= 80 ? 80 : level >= 60 ? 60 : level >= 40 ? 40 : 20;
  var pool = narratives[threshold];
  if (!pool || pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

// =============================================
// SECTION 3: World Decay Narratives
// =============================================

var WORLD_DECAY_NARRATIVES = [
  { minDay: 3, maxDay: 6, minCorruption: 0, text: "你注意到镇上的窗帘拉得更紧了。有些窗户用木板钉死了。" },
  { minDay: 3, maxDay: 6, minCorruption: 10, text: "街角的路灯闪烁了两下，然后熄了。没有人去修。" },
  { minDay: 5, maxDay: 10, minCorruption: 15, text: "你听到远处传来玻璃碎裂的声音。方向是码头区。" },
  { minDay: 5, maxDay: 10, minCorruption: 20, text: "公告栏上多了一张新的告示。不是失踪人口——是禁止夜间外出的通知。" },
  { minDay: 7, maxDay: 14, minCorruption: 25, text: "教堂的钟声在凌晨两点响了。没有人觉得这不正常。" },
  { minDay: 7, maxDay: 14, minCorruption: 30, text: "你路过码头时，海水的颜色不太对。比昨天更深了。" },
  { minDay: 10, maxDay: 18, minCorruption: 35, text: "杂货店关门了。门上贴着一张纸条：\"库存已空。\"" },
  { minDay: 10, maxDay: 18, minCorruption: 40, text: "你安全屋的墙壁上出现了水渍。不是漏水——更像是从里面渗出来的。" },
  { minDay: 14, maxDay: 21, minCorruption: 45, text: "街上的人越来越少了。你不确定他们是搬走了，还是消失了。" },
  { minDay: 14, maxDay: 21, minCorruption: 50, text: "你听到了海浪声。但你在镇中心。离海有三英里。" },
  { minDay: 18, maxDay: 25, minCorruption: 55, text: "路灯全部熄灭了。沃切斯特在月光下看起来像一座坟墓。" },
  { minDay: 18, maxDay: 25, minCorruption: 60, text: "你的影子比你慢了半步。你确定以前不是这样的。" },
  { minDay: 21, maxDay: 28, minCorruption: 65, text: "教堂的十字架倒了。没有人去扶起来。" },
  { minDay: 21, maxDay: 28, minCorruption: 70, text: "海平面在上升。码头的栈桥已经被淹没了。" },
  { minDay: 25, maxDay: 28, minCorruption: 75, text: "你看到天空中有东西在移动。不是云。也不是鸟。" },
  { minDay: 25, maxDay: 28, minCorruption: 80, text: "沃切斯特的地面在震动。不是地震——是呼吸。" },
  { minDay: 27, maxDay: 28, minCorruption: 85, text: "你听到了钟声。不是十三下。也不是十四下。你数不清了。" },
  { minDay: 27, maxDay: 28, minCorruption: 90, text: "雾变成了红色。你已经不记得雾是什么颜色的了。" },
];

function getWorldDecayNarrative(day, corruption, state) {
  var candidates = [];
  for (var i = 0; i < WORLD_DECAY_NARRATIVES.length; i++) {
    var n = WORLD_DECAY_NARRATIVES[i];
    if (day >= n.minDay && day <= n.maxDay && corruption >= n.minCorruption) {
      candidates.push(n.text);
    }
  }
  if (candidates.length === 0) return null;
  var idx = (day * 7 + Math.floor(corruption / 10)) % candidates.length;
  return candidates[idx];
}

// =============================================
// SECTION 4: Critical Day Events (Days 7/14/21)
// =============================================

var DAY_CRITICAL_EVENTS = {
  5: { text: "凌晨三点，你被一声巨响惊醒。教堂的钟楼裂开了一道缝。\n\n裂缝里漏出了光。不是日光——是某种粘稠的、缓慢流动的光。", sanCost: 1, corruptionGain: 3 },
  7: { text: "第七天。\n\n教堂的钟声响了十四下。\n\n整个沃切斯特都安静了。连海浪都停了。\n\n然后——你听到了第十五声。不是从教堂传来的。是从你脚下传来的。", sanCost: 3, corruptionGain: 5, isChapterEvent: true },
  10: { text: "码头区传来尖叫声。你赶到时，只看到一滩海水和一只鞋。\n\n海水是温的。鞋是你的尺码。\n\n你低头看了一眼自己的脚。两只鞋都在。但左脚的鞋带松了。你确定你出门的时候系紧了。", sanCost: 2, corruptionGain: 5 },
  14: { text: "第十四天。\n\n灯塔的光在午夜亮了。\n\n你知道灯塔已经废弃了三年。\n\n光扫过你的安全屋窗户时，你看到了窗玻璃上的倒影。不是你的倒影。是很多人的倒影。重叠在一起。他们都在看着你。", sanCost: 5, corruptionGain: 8, isChapterEvent: true },
  15: { text: "你安全屋的镜子里出现了另一个人的倒影。\n那个人穿着你的衣服。\n但脸不是你的。\n\n你伸手去摸镜子。镜子是温的。倒影伸出了和你一样的手。你们的指尖碰在了一起。\n\n镜子碎了。但倒影还在。", sanCost: 3, corruptionGain: 5 },
  20: { text: "整个沃切斯特停电了。黑暗中，你听到了脚步声。\n不是一个人——是很多人。\n他们在向你走来。\n\n你点燃了一根蜡烛。蜡烛的光照出了房间里的轮廓。\n\n房间里不止你一个人。", sanCost: 4, corruptionGain: 8 },
  21: { text: "第二十一天。\n\n封印发出了声音。\n\n不是裂开的声音。是呼吸的声音。\n\n整个沃切斯特都安静了。然后——第十五声钟响。\n\n你脚下的地面在震动。不是地震。是什么东西在醒过来。", sanCost: 8, corruptionGain: 10, isChapterEvent: true },
  25: { text: "你醒来时，发现笔记本上多了一页。\n笔迹是你的。但内容是你明天才会写的东西。\n\n你读了第一行：\n\n\"别相信你明天看到的自己。\"", sanCost: 5, corruptionGain: 10 },
  28: { text: "最后一天。\n\n你醒来的时候，窗外的雾不再是白色的了。\n\n它是红色的。像血。\n\n时间到了。", sanCost: 0, corruptionGain: 0, isChapterEvent: true },
};

function getDayCriticalEvent(day) {
  return DAY_CRITICAL_EVENTS[day] || null;
}
