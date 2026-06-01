// src/systems/worldDecay.js - World decay and corruption advancement
// Phase 5: World actively deteriorates each day. Player actions accelerate decay.
// Creates the feeling that the world is collapsing around the player.

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

  return corruption;
}

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
  // Pick one randomly, but use a deterministic seed based on day for consistency
  var idx = (day * 7 + Math.floor(corruption / 10)) % candidates.length;
  return candidates[idx];
}

var DAY_CRITICAL_EVENTS = {
  5: { text: "凌晨三点，你被一声巨响惊醒。教堂的钟楼裂开了一道缝。", sanCost: 1, corruptionGain: 3 },
  10: { text: "码头区传来尖叫声。你赶到时，只看到一滩海水和一只鞋。\n海水是温的。", sanCost: 2, corruptionGain: 5 },
  15: { text: "你安全屋的镜子里出现了另一个人的倒影。\n那个人穿着你的衣服。\n但脸不是你的。", sanCost: 3, corruptionGain: 5 },
  20: { text: "整个沃切斯特停电了。黑暗中，你听到了脚步声。\n不是一个人——是很多人。\n他们在向你走来。", sanCost: 4, corruptionGain: 8 },
  25: { text: "你醒来时，发现笔记本上多了一页。\n笔迹是你的。但内容是你明天才会写的东西。", sanCost: 5, corruptionGain: 10 },
};

function getDayCriticalEvent(day) {
  return DAY_CRITICAL_EVENTS[day] || null;
}
