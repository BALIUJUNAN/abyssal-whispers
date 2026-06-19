// src/systems/worldDecay.js - World decay and corruption advancement
// World actively deteriorates each day. Player actions accelerate decay.
// Player investigation patterns accelerate area-specific corruption.
// Creates the feeling that the world is collapsing around the player.

import { getSanStageFromGD } from '../reducers/sanReducer.js';

// =============================================
// SECTION 1: Daily Corruption Calculation
// =============================================

export function calculateDailyCorruption(state, ctx) {
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

  // P1-A: SSOT — SAN stage accelerates world decay
  var san = state.san || 0;
  var _slvl = getSanStageFromGD(san).level;
  if (_slvl >= 3) corruption += 3;      // explanation_loss+
  else if (_slvl >= 2) corruption += 1; // perception_shift+

  // Seal state acceleration
  var sealState = state.sealState || 'intact';
  if (sealState === 'critical') corruption += 5;
  else if (sealState === 'collapsing') corruption += 8;
  else if (sealState === 'weakening') corruption += 2;

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
export function updateAreaCorruption(state, ctx) {
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
export function getAreaCorruptionLevel(areaId, state) {
  if (!state._areaCorruption) return 0;
  return state._areaCorruption[areaId] || 0;
}

/**
 * Generate narrative text for area-specific corruption effects.
 * Called during EXPLORE when area corruption is high.
 */
export function getAreaCorruptionNarrative(areaId, state, rng) {
  var level = getAreaCorruptionLevel(areaId, state);
  if (level < 20) return null;
  var narratives = {
    20: ['你注意到这个区域的空气比上次来的时候更沉了。', '地面上的裂缝比你记忆中的更多了。'],
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
  var _rand = rng ? rng.next.bind(rng) : Math.random;
  return pool[Math.floor(_rand() * pool.length)];
}

// =============================================
// SECTION 3: World Decay Narratives
// =============================================

export var WORLD_DECAY_NARRATIVES = [
  // === Days 1-2: 初到 (new) ===
  {
    minDay: 1,
    maxDay: 1,
    minCorruption: 0,
    text: '你到达沃切斯特的第一天。雾从四面八方涌来，像是这个镇在呼吸。远处的钟声敲了一下。你不知道那是几点。',
  },
  {
    minDay: 2,
    maxDay: 2,
    minCorruption: 0,
    text: '第二天。你发现自己的脚印比昨天深了。不是因为地面变软了——是因为有什么东西在下面托着。',
  },
  {
    minDay: 2,
    maxDay: 3,
    minCorruption: 5,
    text: '镇上的狗都停止了吠叫。不是因为安静——是因为它们害怕发出声音。',
  },
  // === Days 3-6: 初期渗透 ===
  {
    minDay: 3,
    maxDay: 6,
    minCorruption: 0,
    text: '你注意到镇上的窗帘拉得更紧了。有些窗户用木板钉死了。',
  },
  {
    minDay: 3,
    maxDay: 5,
    minCorruption: 5,
    text: '邮差今天没有来。门口的信箱里有一封寄给上一个住客的信。邮戳是三个月前的。',
  },
  { minDay: 3, maxDay: 6, minCorruption: 10, text: '街角的路灯闪烁了两下，然后熄了。没有人去修。' },
  {
    minDay: 4,
    maxDay: 7,
    minCorruption: 8,
    text: '你路过的房子里有人在哭。声音很轻。你敲门的时候，哭声停了。没有人来开门。',
  },
  {
    minDay: 5,
    maxDay: 10,
    minCorruption: 15,
    text: '你听到远处传来玻璃碎裂的声音。方向是码头区。',
  },
  {
    minDay: 5,
    maxDay: 10,
    minCorruption: 20,
    text: '公告栏上多了一张新的告示。不是失踪人口——是禁止夜间外出的通知。没有署名。没有日期。',
  },
  // === Days 7-10: 第一次转折 ===
  {
    minDay: 7,
    maxDay: 14,
    minCorruption: 25,
    text: '教堂的钟声在凌晨两点响了。没有人觉得这不正常。',
  },
  {
    minDay: 7,
    maxDay: 14,
    minCorruption: 30,
    text: '你路过码头时，海水的颜色不太对。比昨天更深了。更像……某种东西的眼睛。',
  },
  {
    minDay: 8,
    maxDay: 10,
    minCorruption: 20,
    text: '教堂的钟又响了。这次是正午。没有人抬头看。好像他们已经习惯了不该习惯的事情。',
  },
  {
    minDay: 9,
    maxDay: 12,
    minCorruption: 25,
    text: '你安全屋周围的脚印比昨天多了。不是你的。你不知道它们什么时候出现的。',
  },
  {
    minDay: 10,
    maxDay: 18,
    minCorruption: 35,
    text: '杂货店关门了。门上贴着一张纸条："库存已空。"墨迹还没有干。',
  },
  {
    minDay: 10,
    maxDay: 18,
    minCorruption: 40,
    text: '你安全屋的墙壁上出现了水渍。不是漏水——更像是从里面渗出来的。摸上去是温的。',
  },
  // === Days 11-14: 缓慢下沉 ===
  {
    minDay: 11,
    maxDay: 15,
    minCorruption: 30,
    text: '你发现自己的影子在正午也会变长。太阳在头顶，但你的影子拉得很远。方向是海。',
  },
  {
    minDay: 12,
    maxDay: 16,
    minCorruption: 35,
    text: '码头多了一条船。系在栈桥上的缆绳是湿的。船上没有人。但船在轻微地摇晃。像有人在下面呼吸。',
  },
  {
    minDay: 13,
    maxDay: 17,
    minCorruption: 38,
    text: '你经过墓地的时候，发现一座墓碑被翻出来了。棺材是空的。土是新的。棺材里的东西不需要棺材。',
  },
  // === Days 14-18: 第二次转折 ===
  {
    minDay: 14,
    maxDay: 21,
    minCorruption: 45,
    text: '街上的人越来越少了。你不确定他们是搬走了，还是消失了。还是——从来就不存在。',
  },
  {
    minDay: 14,
    maxDay: 21,
    minCorruption: 50,
    text: '你听到了海浪声。但你在镇中心。离海有三英里。海浪声越来越近了。',
  },
  {
    minDay: 16,
    maxDay: 20,
    minCorruption: 42,
    text: '你的钥匙今天打不开安全屋的门。试了三次。第四次的时候，门自己开了。好像有什么东西在里面等你。',
  },
  {
    minDay: 17,
    maxDay: 22,
    minCorruption: 48,
    text: '灯塔的光今天换了颜色。不是白光——是某种介于紫色和黑色之间的颜色。你盯着看了很久才意识到自己在看它。',
  },
  {
    minDay: 18,
    maxDay: 25,
    minCorruption: 55,
    text: '路灯全部熄灭了。沃切斯特在月光下看起来像一座坟墓。你怀疑月光也是假的。',
  },
  {
    minDay: 18,
    maxDay: 25,
    minCorruption: 60,
    text: '你的影子比你慢了半步。你确定以前不是这样的。你试着跑——影子还是慢了半步。',
  },
  // === Days 19-21: 下沉加速 ===
  {
    minDay: 19,
    maxDay: 23,
    minCorruption: 52,
    text: '你在商店的橱窗里看到了自己的倒影。但倒影没有跟着你动。它只是看着你离开。',
  },
  // === Days 21-25: 不可逆 ===
  { minDay: 21, maxDay: 28, minCorruption: 65, text: '教堂的十字架倒了。没有人去扶起来。' },
  { minDay: 21, maxDay: 28, minCorruption: 70, text: '海平面在上升。码头的栈桥已经被淹没了。海水是温的。' },
  {
    minDay: 22,
    maxDay: 26,
    minCorruption: 68,
    text: '你发现一本不属于你的日记。笔迹和你一模一样。最后一页写着你明天的计划。和你今天的计划一样。',
  },
  {
    minDay: 23,
    maxDay: 27,
    minCorruption: 72,
    text: '镇上的钟不走了。但每小时整点，它还是响了一下。声音从钟楼内部传来。钟楼里面没有钟了。',
  },
  {
    minDay: 24,
    maxDay: 28,
    minCorruption: 75,
    text: '你经过一面镜子。镜子里没有你。镜子里是空的。但你知道镜子里应该有东西。你感到被什么东西从里面看着。',
  },
  // === Days 25-28: 终局 ===
  {
    minDay: 25,
    maxDay: 28,
    minCorruption: 75,
    text: '你看到天空中有东西在移动。不是云。也不是鸟。你不再抬头看了。你知道没有用。',
  },
  { minDay: 25, maxDay: 28, minCorruption: 80, text: '沃切斯特的地面在震动。不是地震——是呼吸。' },
  {
    minDay: 27,
    maxDay: 28,
    minCorruption: 85,
    text: '你听到了钟声。不是十三下。也不是十四下。你数不清了。每次你觉得自己数清了，就又响了一声。',
  },
  {
    minDay: 27,
    maxDay: 28,
    minCorruption: 90,
    text: '雾变成了红色。你已经不记得雾是什么颜色的了。你努力想——但白色的雾已经不在你的记忆里。',
  },
  {
    minDay: 28,
    maxDay: 28,
    minCorruption: 0,
    text: '最后一天。整个沃切斯特出奇的安静。好像整个世界都在屏住呼吸。等待什么。等待你。',
  },
];

// DESIGN_REFACTOR_NOTES.md: "Day 7后harbor_district自动增加深潜者相关模糊事件"
// Fuzzy references only — "海里的东西", "灰色身影", never "深潜者".
export var HARBOR_DEEP_ONE_WHISPERS = [
  { minDay: 7, maxDay: 14, minCorruption: 20, text: '你在码头看到了一组脚印。从海里走出来。脚印在栈桥中间消失了。' },
  { minDay: 7, maxDay: 14, minCorruption: 25, text: '码头的缆绳今天湿了。不是海水——是某种更粘稠的液体。你没有去碰它。' },
  { minDay: 7, maxDay: 14, minCorruption: 30, text: '你听到水面下有声音。不是鱼。是一种有节奏的敲击。像是有人在水下敲门。' },
  { minDay: 8, maxDay: 14, minCorruption: 22, text: '码头的一艘渔船里，桌上放着一碗还温着的汤。碗边有一副碗筷。两个人用的。' },
  { minDay: 9, maxDay: 16, minCorruption: 28, text: '海面上飘来一片红色的海藻。摸上去不是植物——是某种有弹性的组织。你洗手洗了很久。' },
  { minDay: 10, maxDay: 18, minCorruption: 35, text: '码头栈桥的木板上长了一层灰色的东西。不是苔藓。摸起来像是皮肤。它随着你的触碰收缩了一下。' },
  { minDay: 10, maxDay: 18, minCorruption: 40, text: '你看到远处的海面上有一个灰色的身影。它站在水面上。然后慢慢沉了下去。' },
  { minDay: 10, maxDay: 18, minCorruption: 45, text: '码头的鱼今天都不见了。海面很平静。平静得不正常。像是有什么东西在水下把一切都按住了。' },
  { minDay: 12, maxDay: 18, minCorruption: 32, text: '码头边的一根桩子上刻着日期。不是今天的。是你上次来这里的日期。你确定你上次没有在这里刻过什么。' },
  { minDay: 14, maxDay: 21, minCorruption: 50, text: '你在码头闻到了一种味道。不是鱼腥味。是更古老的。像是盐和时间的混合物。' },
  { minDay: 14, maxDay: 21, minCorruption: 55, text: '码头栈桥的尽头站着一个灰色的身影。你走近的时候，它转过身。它没有脸。只有一层薄膜。在动。' },
  { minDay: 16, maxDay: 22, minCorruption: 52, text: '海水退潮后，栈桥下面露出了不属于这个世界的石头。上面刻着螺旋。螺旋在缓慢地旋转——你确定那不是你的眼睛出了问题。' },
  { minDay: 18, maxDay: 28, minCorruption: 60, text: '海面开始发出声音。不是海浪——是呼吸。整个海面在缓慢地起伏。你站了很久才意识到自己在跟着它的节奏呼吸。' },
  { minDay: 20, maxDay: 26, minCorruption: 65, text: '码头上出现了一个标记。白色的粉笔画在木板上。是一个指向海底的箭头。箭头下面写着什么——但那些文字不是任何你知道的语言。' },
  { minDay: 21, maxDay: 28, minCorruption: 70, text: '码头的栈桥被淹没了。海水是温的。你看到水下有灯光。不是灯塔——是从更深的地方来的。灯光在移动。在观察。' },
];

export function getWorldDecayNarrative(day, corruption, state) {
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

/**
 * Get harbor-specific deep one whispers for Day 7+.
 * DESIGN_REFACTOR_NOTES.md: "harbor_district自动增加深潜者相关模糊事件"
 * @param {number} day
 * @param {number} corruption
 * @param {object} state
 * @returns {string|null}
 */
export function getHarborDeepOneWhisper(day, corruption, state) {
  if (day < 7) return null;
  var candidates = [];
  for (var i = 0; i < HARBOR_DEEP_ONE_WHISPERS.length; i++) {
    var n = HARBOR_DEEP_ONE_WHISPERS[i];
    if (day >= n.minDay && day <= n.maxDay && corruption >= n.minCorruption) {
      candidates.push(n.text);
    }
  }
  if (candidates.length === 0) return null;
  var idx = (day * 3 + Math.floor(corruption / 8) + (state.loopCount || 0)) % candidates.length;
  return candidates[idx];
}

// =============================================
// SECTION 4: Critical Day Events (Days 7/14/21)
// =============================================

// ═══════════════════════════════════════════════════════
// Narrative Month: SAN-aware day critical events
// Day 7/14/21/28 have 3 tiers: normal / corrupted / fractured
// ═══════════════════════════════════════════════════════

const DAY_7_VARIANTS = {
  normal: '第七天。\n\n教堂的钟声响了十四下。\n\n整个沃切斯特都安静了。连海浪都停了。\n\n然后——你听到了第十五声。不是从教堂传来的。是从你脚下传来的。',
  corrupted: '第七天。\n\n钟声响了。你数了——不是十四下。有些数字你数了两遍。有些你漏掉了。\n\n你确定是十四下吗？\n\n你脚下的地面在震动。也许只是你的心跳。',
  fractured: '第……天。\n\n钟声。钟声。钟声。\n\n你数了又数。十四？十三？十五？每一个数字都像一把钥匙，但打不开任何门。\n\n你的脚下传来声音。不——是你肚子里。有什么东西在数数。',
};

const DAY_14_VARIANTS = {
  normal: '第十四天。\n\n灯塔的光在午夜亮了。\n\n你知道灯塔已经废弃了三年。\n\n光扫过你的安全屋窗户时，你看到了窗玻璃上的倒影。不是你的倒影。是很多人的倒影。重叠在一起。他们都在看着你。',
  corrupted: '第十四天。\n\n灯塔。你记得灯塔不亮。但今晚它亮了。\n\n光扫过来的时候，你看到窗上有影子。很多影子。他们重叠在一起，像一叠旧照片。\n\n有一张脸你知道——但你记不起是谁的。',
  fractured: '第十四天。\n\n灯。灯灯灯灯。\n\n灯亮了。窗上有东西。不是影子——是记忆。叠在一起的记忆。\n\n你认出了其中一张脸。那是你。但那是去年的你。去年的你也在看着你。',
};

const DAY_21_VARIANTS = {
  normal: '第二十一天。\n\n封印发出了声音。\n\n不是裂开的声音。是呼吸的声音。\n\n整个沃切斯特都安静了。然后——第十五声钟响。\n\n你脚下的地面在震动。不是地震。是什么东西在醒过来。',
  corrupted: '第二十一天。\n\n封印在呼吸。你确定你听到了——吸气、呼气、吸气。像某种巨大的东西在睡觉。\n\n但它醒了。第十五声钟响的时候，你知道它醒了。\n\n地面在动。不——是地面下面的东西在动。',
  fractured: '第二十一天。\n\n呼——吸——\n\n你不是在听封印。是封印在听你。\n\n第十五声钟响的时候，你看到了它。不是在地面下面。是在你身体里面。它一直在你身体里面。',
};

const DAY_28_VARIANTS = {
  normal: '最后一天。\n\n你醒来的时候，窗外的雾不再是白色的了。\n\n它是红色的。像血。\n\n时间到了。',
  corrupted: '最后一天。\n\n雾红了。你盯着它看了很久。你不知道自己看了多久——也许是一分钟，也许是一年。\n\n时间到了。你不太确定"时间"是什么意思了。',
  fractured: '最后一天。\n\n雾。血。红。\n\n你醒了——还是你醒了？\n\n时间没有到。时间早就到了。时间一直在到。',
};

/**
 * Get day critical event text with SAN-aware variants.
 * For key days (7/14/21/28), returns text appropriate to player's SAN stage.
 * For other days, returns the base text.
 *
 * @param {number} day
 * @param {number} san - current SAN
 * @returns {{ text: string, sanCost: number, corruptionGain: number, isChapterEvent: boolean, tier: string }}
 */
export function getDayCriticalEventWithTier(day, san) {
  var _slvl = getSanStageFromGD(san).level;
  var variants = null;
  var sanCost, corruptionGain, isChapterEvent;

  switch (day) {
    case 7:
      variants = DAY_7_VARIANTS;
      sanCost = 3;
      corruptionGain = 5;
      isChapterEvent = true;
      break;
    case 14:
      variants = DAY_14_VARIANTS;
      sanCost = 5;
      corruptionGain = 8;
      isChapterEvent = true;
      break;
    case 21:
      variants = DAY_21_VARIANTS;
      sanCost = 8;
      corruptionGain = 10;
      isChapterEvent = true;
      break;
    case 28:
      variants = DAY_28_VARIANTS;
      sanCost = 0;
      corruptionGain = 0;
      isChapterEvent = true;
      break;
    default:
      var base = DAY_CRITICAL_EVENTS[day];
      if (!base) return null;
      return { text: base.text, sanCost: base.sanCost, corruptionGain: base.corruptionGain, isChapterEvent: !!base.isChapterEvent, tier: 'normal' };
  }

  if (!variants) return null;

  // Select tier based on SAN stage
  var tier = 'normal';
  var text = variants.normal;
  if (_slvl >= 5) {
    tier = 'fractured';
    text = variants.fractured;
  } else if (_slvl >= 3) {
    tier = 'corrupted';
    text = variants.corrupted;
  }

  return { text, sanCost, corruptionGain, isChapterEvent, tier };
}

var DAY_CRITICAL_EVENTS = {
  // ── Days 1-4: 初到 ──
  1: {
    text: '你到达沃切斯特的第一天。雾从四面八方涌来，像是这个镇在呼吸。\n\n远处的钟声敲了一下。你不知道那是几点。你也没有表。',
    sanCost: 0,
    corruptionGain: 1,
  },
  2: {
    text: '第二天。\n\n你发现自己的脚印比昨天深了。不是因为地面变软了——是因为有什么东西在下面托着。\n\n你没有再走那条路。但脚印的事你没有告诉任何人。',
    sanCost: 0,
    corruptionGain: 1,
  },
  3: {
    text: '第三天。\n\n你昨晚睡了很久。做了很多梦。但醒来后一个都不记得。\n\n枕头上有盐粒。你的窗户朝内陆。',
    sanCost: 1,
    corruptionGain: 2,
  },
  4: {
    text: '第四天。\n\n镇上的安静越来越重了。不是没有声音——是声音在消失。\n\n你叫了自己的名字。声音出去后，像被什么吸走了一半。',
    sanCost: 1,
    corruptionGain: 2,
  },
  // ── Day 5: 第一道裂缝 ──
  5: {
    text: '凌晨三点，你被一声巨响惊醒。教堂的钟楼裂开了一道缝。\n\n裂缝里漏出了光。不是日光——是某种粘稠的、缓慢流动的光。',
    sanCost: 1,
    corruptionGain: 3,
  },
  // ── Day 6: 前夕 ──
  6: {
    text: '第六天的傍晚，你看到教堂的方向亮了起来。不是电灯——是钟楼裂缝里漏出的那道光。\n\n它在脉动。像心跳。',
    sanCost: 1,
    corruptionGain: 3,
  },
  // ── Day 7: 第一章节 ──
  7: {
    text: '第七天。\n\n教堂的钟声响了十四下。\n\n整个沃切斯特都安静了。连海浪都停了。\n\n然后——你听到了第十五声。不是从教堂传来的。是从你脚下传来的。',
    sanCost: 3,
    corruptionGain: 5,
    isChapterEvent: true,
  },
  // ── Days 8-9: 余波 ──
  8: {
    text: '第八天。\n\n教堂的钟又响了。这次是正午。没有人抬头看。好像他们已经习惯了不该习惯的事情。',
    sanCost: 1,
    corruptionGain: 3,
  },
  9: {
    text: '第九天。\n\n你安全屋周围的脚印比昨天多了。不是你的。你不知道它们什么时候出现的——你出门的时候还没有。\n\n你今晚锁了三道锁。',
    sanCost: 1,
    corruptionGain: 3,
  },
  // ── Day 10: 中段 ──
  10: {
    text: '码头区传来尖叫声。你赶到时，只看到一滩海水和一只鞋。\n\n海水是温的。鞋是你的尺码。\n\n你低头看了一眼自己的脚。两只鞋都在。但左脚的鞋带松了。你确定你出门的时候系紧了。',
    sanCost: 2,
    corruptionGain: 5,
  },
  // ── Days 11-13: 缓慢下沉 ──
  11: {
    text: '第十一天。\n\n你发现自己的影子在正午也会变长。太阳在头顶，但你的影子拉得很远。方向是海。\n\n你换了个位置。影子还是指向海。',
    sanCost: 1,
    corruptionGain: 3,
  },
  12: {
    text: '第十二天。\n\n码头多了一条船。系在栈桥上的缆绳是湿的。船上没有人。\n\n但船在轻微地摇晃。像有人在下面呼吸。',
    sanCost: 1,
    corruptionGain: 3,
  },
  13: {
    text: '第十三天。\n\n你经过墓地的时候，发现一座墓碑被翻出来了。棺材是空的。土是新的。\n\n棺材里的东西不需要棺材。',
    sanCost: 2,
    corruptionGain: 4,
  },
  // ── Day 14: 第二章节 ──
  14: {
    text: '第十四天。\n\n灯塔的光在午夜亮了。\n\n你知道灯塔已经废弃了三年。\n\n光扫过你的安全屋窗户时，你看到了窗玻璃上的倒影。不是你的倒影。是很多人的倒影。重叠在一起。他们都在看着你。',
    sanCost: 5,
    corruptionGain: 8,
    isChapterEvent: true,
  },
  // ── Day 15: 镜像 ──
  15: {
    text: '你安全屋的镜子里出现了另一个人的倒影。\n那个人穿着你的衣服。\n但脸不是你的。\n\n你伸手去摸镜子。镜子是温的。倒影伸出了和你一样的手。你们的指尖碰在了一起。\n\n镜子碎了。但倒影还在。',
    sanCost: 3,
    corruptionGain: 5,
  },
  // ── Days 16-17: 加速 ──
  16: {
    text: '第十六天。\n\n你的钥匙今天打不开安全屋的门。试了三次。第四次的时候，门自己开了。\n\n好像有什么东西在里面等你。你确定你走的时候锁了门。',
    sanCost: 2,
    corruptionGain: 4,
  },
  17: {
    text: '第十七天。\n\n灯塔的光今天换了颜色。不是白光——是某种介于紫色和黑色之间的颜色。\n\n你盯着看了很久。才意识到自己在看它。不是你在看光——是光在看你。',
    sanCost: 2,
    corruptionGain: 4,
  },
  // ── Day 19: 前夕 ──
  19: {
    text: '第十九天。\n\n下午三点，天黑了。不是阴天——是有什么东西挡住了太阳。\n\n你抬头看了很久。直到眼睛疼。然后天又亮了。好像什么都没有发生过。',
    sanCost: 2,
    corruptionGain: 5,
  },
  // ── Day 20: 黑暗中 ──
  20: {
    text: '整个沃切斯特停电了。黑暗中，你听到了脚步声。\n不是一个人——是很多人。\n他们在向你走来。\n\n你点燃了一根蜡烛。蜡烛的光照出了房间里的轮廓。\n\n房间里不止你一个人。',
    sanCost: 4,
    corruptionGain: 8,
  },
  // ── Day 21: 第三章节 ──
  21: {
    text: '第二十一天。\n\n封印发出了声音。\n\n不是裂开的声音。是呼吸的声音。\n\n整个沃切斯特都安静了。然后——第十五声钟响。\n\n你脚下的地面在震动。不是地震。是什么东西在醒过来。',
    sanCost: 8,
    corruptionGain: 10,
    isChapterEvent: true,
  },
  // ── Days 22-24: 不可逆 ──
  22: {
    text: '第二十二天。\n\n你发现一本不属于你的日记。笔迹和你一模一样。\n\n最后一页写着你明天的计划。和你今天的计划一样。',
    sanCost: 3,
    corruptionGain: 6,
  },
  23: {
    text: '第二十三天。\n\n镇上的钟不走了。但每小时整点，它还是响了一下。\n\n声音从钟楼内部传来。钟楼里面没有钟了。你上去看过。',
    sanCost: 3,
    corruptionGain: 6,
  },
  24: {
    text: '第二十四天。\n\n你经过一面镜子。镜子里没有你。\n\n镜子里是空的。但你知道镜子里应该有东西。你感到被什么东西从里面看着。',
    sanCost: 4,
    corruptionGain: 7,
  },
  // ── Day 25: 笔记本 ──
  25: {
    text: '你醒来时，发现笔记本上多了一页。\n笔迹是你的。但内容是你明天才会写的东西。\n\n你读了第一行：\n\n"别相信你明天看到的自己。"',
    sanCost: 5,
    corruptionGain: 10,
  },
  // ── Day 26-27: 终局前夕 ──
  26: {
    text: '第二十六天。\n\n你从老教堂的方向闻到了味道。烧焦的味道。和海水的味道混在一起。\n\n教堂已经没有人了。但里面有光。',
    sanCost: 4,
    corruptionGain: 8,
  },
  27: {
    text: '第二十七天。\n\n雾变成了你可以看见的实体。不是雾——是某种悬浮在空气中的东西。在移动。在观察。\n\n你不再出门了。但你知道它在门外面等着。\n\n你还能听到钟声。但不是从钟楼传来的。是从雾里面传来的。',
    sanCost: 5,
    corruptionGain: 10,
  },
  // ── Day 28: 终局 ──
  28: {
    text: '最后一天。\n\n你醒来的时候，窗外的雾不再是白色的了。\n\n它是红色的。像血。\n\n时间到了。',
    sanCost: 0,
    corruptionGain: 0,
    isChapterEvent: true,
  },
};

export function getDayCriticalEvent(day) {
  return DAY_CRITICAL_EVENTS[day] || null;
}
