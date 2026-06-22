/**
 * 玩家痕迹系统 — 上一轮的行为在下一轮的环境中留下痕迹
 *
 * 数据来源：
 *   1. CHOICE_SELECT 中有破坏/攻击性质的选项 → 通过 effect 中的 add_flag 标记
 *   2. NPC 死亡（previousDeathsByArea 已有）→ 自动生成痕迹
 *   3. 结局选择（endingHistory）→ 自动生成痕迹
 *   4. behaviorTracking 中的特殊计数器 → 自动生成痕迹
 *   5. 标志位软连锁（has_flag）→ 手动触发的行为痕迹
 *
 * 痕迹存储：state.playerTraces[]（跨轮回保留，上限 30 条）
 * 展示方式：在区域描述末尾追加一条"可调查细节"风格的痕迹文本
 */

import { hasTriggered, syncTriggeredSet } from '../utils/triggeredSet.js';

// ── 痕迹 → 区域绑定表 ──────────────────────────────────
// 定义每个痕迹在哪些区域可以被发现
export var TRACE_AREA_BINDINGS = {
  // NPC 死亡痕迹
  'npc_death_manor': ['voxchester_manor', 'town_center'],
  'npc_death_church': ['church', 'town_center'],
  'npc_death_harbor': ['harbor_district', 'lighthouse'],
  'npc_death_forest': ['forbidden_grove', 'town_center'],
  'npc_death_catacombs': ['catacombs_entrance', 'deep_catacombs'],

  // 行为痕迹
  'betrayal_npc': ['town_center', 'tavern'],
  'killing_spree': ['town_center', 'harbor_district'],
  'desecration': ['church', 'catacombs_entrance'],
  'theft': ['manor_interior', 'tavern'],
  'cannibalism': ['forbidden_grove', 'deep_catacombs'],

  // 结局痕迹
  'ending_escape': ['harbor_district', 'lighthouse'],
  'ending_seal': ['church', 'catacombs_entrance'],
  'ending_consumed': ['deep_catacombs', 'ruins_of_yith'],
  'ending_transcend': ['ruins_of_yith', 'lighthouse'],

  // ── P2 试点：行为痕迹（软连锁 flag 触发）──
  'trace_broken_window_church': ['church'],
  'trace_dropped_item_harbor': ['harbor_district'],
  'trace_sat_chair_manor': ['voxchester_manor'],
};

// ── 痕迹描述文本池 ──────────────────────────────────────
// 每个痕迹类型有 2-3 条描述，随 loop 递增解锁更多
export var TRACE_DESCRIPTIONS = {
  'npc_death_manor': {
    text: [
      '庄园的走廊里有一道新的划痕。在扶手的最上端。深度不太对——不像是手指能留下的。',
      '你上次来的时候，走廊尽头的画像还在。现在它不在了。墙上有拆除的痕迹。没有人提起这件事。',
      '庄园的某个房间里，一把椅子倒了。椅子下面有一道刻痕。刻痕的形状像是一个名字。',
    ],
    areas: ['voxchester_manor', 'town_center'],
  },
  'npc_death_church': {
    text: [
      '教堂的长椅上有一道新的压痕。不是平时的使用痕迹——是有人长时间坐在同一个位置，不起来。',
      '教堂的蜡烛架上少了一个烛台。不是因为坏了。是因为有人——或者什么东西——把它拿走了。',
      '你注意到教堂地面的石板缝隙里有干燥的血迹。已经清理过了。但石板本身的颜色还没有褪。',
    ],
    areas: ['church', 'town_center'],
  },
  'npc_death_harbor': {
    text: [
      '码头的地板上有拖痕。从水面延伸到最近的缆绳桩。痕迹已经干了，但形状很清楚——是一个人，被拖上来的。',
      '码头上少了一条船。不是被开走的——系船的缆绳断了。断口整齐。像被人用刀切断的。',
      '你在码头边的石头缝里发现了一枚纽扣。不属于任何你还记得的衣物。也许是新来的什么人留下的。',
    ],
    areas: ['harbor_district', 'lighthouse'],
  },
  'npc_death_forest': {
    text: [
      '森林的地面上有一圈被踩平的草。范围不大——像是有人在这里站了很久，来回踱步。',
      '一棵树的树干上有一个凹痕。形状像拳头。但凹痕的深度……不像人能砸出来的。',
      '你在森林里发现了一件不属于你的物品。是一件外套。袖口上有盐渍。来自海边。但森林里没有海。',
    ],
    areas: ['forbidden_grove', 'town_center'],
  },
  'npc_death_catacombs': {
    text: [
      '墓穴入口的石阶上有一道新的磨损。比其他的磨损更深。在靠墙的那一侧——有人在扶墙的时候用力过猛。',
      '石壁上的划痕多了几道。方向和角度……和你上次死的时候留下的完全一致。不是巧合。',
    ],
    areas: ['catacombs_entrance', 'deep_catacombs'],
  },

  // 行为痕迹
  'betrayal_npc': {
    text: [
      '酒馆的角落里，老板擦杯子的时候停顿了一下。像是在等什么人说话。但吧台前只有你一个客人。',
      '你路过镇中心的公告栏。有一张告示被撕掉了一角。撕痕很新。告示的内容你已经不记得了。',
      '镇上有人看着你。目光不是好奇——是警惕。像在提防一个他们已经知道名字的人。',
    ],
    areas: ['town_center', 'tavern'],
  },
  'killing_spree': {
    text: [
      '镇上的狗今天没有叫。不是安静——是害怕。它们在看见你之前就躲起来了。',
      '街道上的孩子今天没有在玩。他们的父母把他们叫回了家。你经过的时候，有一扇窗户被轻轻关上了。',
      '你注意到自己走过的地方，鸟飞走了。不是因为你的动作——是因为你的气息。它们知道。',
    ],
    areas: ['town_center', 'harbor_district', 'forbidden_grove'],
  },
  'desecration': {
    text: [
      '教堂的十字架偏了一点。偏了大概两指宽。不像风能吹动的幅度。',
      '教堂地板上的跪垫有一处凹陷。不是自然磨损——是有人用膝盖反复压同一个位置。用力很重。',
      '圣坛上的蜡烛少了一支。不是因为烧完了——烛芯还在。是被人拔走的。拔断的烛芯还在蜡台上。',
    ],
    areas: ['church', 'catacombs_entrance'],
  },
  'theft': {
    text: [
      '庄园书房的书架上有几本书的位置不一样了。不是被翻乱的——是被拿走了。空位很明显。',
      '你在口袋里摸到一样不属于你的东西。一枚铜币。来自庄园。你确定自己没有拿过。',
    ],
    areas: ['manor_interior', 'tavern'],
  },
  'cannibalism': {
    text: [
      '你在森林里捡到了一块骨头。不是动物的——太短了。是人手的指骨。已经风干了。',
      '你做了一个梦。梦里你在吃什么东西。味道很咸。你醒了。嘴里有盐味。窗外是森林。不是海边。',
    ],
    areas: ['forbidden_grove', 'deep_catacombs'],
  },

  // 结局痕迹
  'ending_escape': {
    text: [
      '码头的地面上有一道新的划痕。像是沉重的行李箱的轮子压出来的。方向——朝海边。',
      '你在码头发现了一张被揉皱的船票。日期是昨天。目的地已经模糊了。但你认得出出发港的印章。是沃切斯特的。',
    ],
    areas: ['harbor_district', 'lighthouse'],
  },
  'ending_seal': {
    text: [
      '教堂的地面上有一个螺旋形的图案。不是画上去的——是石板的颜色不一样。像是被什么东西灼烧过。',
      '你在教堂的告解室里发现了一张纸条。上面写着「门已经关了。但还有一扇。」字迹你很熟悉。是你自己的。',
    ],
    areas: ['church', 'catacombs_entrance'],
  },
  'ending_consumed': {
    text: [
      '深水的水面比上次更暗了。不是颜色——是反光。水面不再反射你的脸。它在反射别的东西。',
      '你在墓穴深处听到了一种声音。从水底传来的。不是回声。是一种有节奏的低频震动。像呼吸。',
    ],
    areas: ['deep_catacombs', 'ruins_of_yith'],
  },
  'ending_transcend': {
    text: [
      '遗迹墙壁上的几何图案比上次多了一道。不是雕刻上去的——像是从墙里浮出来的。光线从图案边缘折射出来。',
      '你在遗迹里走的时候，发现脚下的石板有微微的震动。不是地震——是某种巨大的东西在极深的地底移动。',
    ],
    areas: ['ruins_of_yith', 'lighthouse'],
  },

  // ── P2 试点：行为痕迹描述 ──
  'trace_broken_window_church': {
    text: [
      '教堂的一扇窗户碎了。玻璃碎片还在地上。碎片的分布方式……不是从外面打破的。是从里面。有人在里面把窗户砸碎了。',
      '教堂的地上有玻璃碎片。你用脚拨了拨。碎片的边缘很整齐——不是被石头砸的。是被什么东西从内部击穿的。你看到了窗框上的划痕。方向和玻璃飞溅的方向相反。',
    ],
    areas: ['church'],
  },
  'trace_dropped_item_harbor': {
    text: [
      '你在码头的地面上看到了一样东西。半埋在沙子里。是一枚戒指。大小和你的差不多。你把它捡了起来。沙子从戒指的缝隙里流出来。里面好像有什么东西在动。',
      '码头的缆绳桩上系着一条绳索。绳索的末端垂在水里。你拉了一下。很沉。不是水——是别的东西在下面拉着。绳索的另一端系着什么——你不知道。',
    ],
    areas: ['harbor_district'],
  },
  'trace_sat_chair_manor': {
    text: [
      '庄园走廊里的一把椅子被搬动了。位置和原来不一样了——稍微偏了一点。偏的方向是你上次坐的方向。椅子下面的地毯有压痕。只有一个人坐过。',
      '你经过庄园书房的时候，注意到书架最上面一层有一本书的位置不一样了。你记得上次来的时候，那本书是倒着的。现在它是正的了。有人在这里坐了很久，在翻那本书。',
    ],
    areas: ['voxchester_manor'],
  },
  // ── P2 扩展：更多行为痕迹 ──
  'trace_forest_whisper': {
    text: [
      '森林里的风声变了。不是风——是有人在低语。声音很轻，像从很远的地方传来。你停下脚步的时候，声音也停了。但你隐约记得上次来的时候，它不是这样的。',
      '森林里的一棵树上刻着一个螺旋符号。你不记得自己刻过。但刀痕还很新——就在你上次来之后不久。',
    ],
    areas: ['forbidden_grove', 'whispering_forest'],
  },
  'trace_tavern_drunk': {
    text: [
      '酒馆的角落里有一摊没有擦干净的水渍。形状像一只杯子被放在桌上很久后留下的。桌上刻着一个名字的缩写。你不知道是谁刻的。但你知道不是玛莎——她不会这么做。',
      '你注意到酒馆的地板缝隙里有一枚铜币。不是玛莎的——她的铜币从来不会掉在地上。有人在这里坐了很久，反复在手里翻转这枚硬币。',
    ],
    areas: ['town_center'],
  },
  'trace_catacombs_ritual': {
    text: [
      '墓穴入口的石阶上有一圈用白色粉笔画出的符号。不是古代的——是新的。但白色已经泛黄了。像是画了有一段时间了。你记得上次来的时候……地上没有这个。',
      '墓穴深处的水潭边有一朵花。已经枯萎了。不是野生的——是被人放在那里的。什么人会在墓穴里放花？你上次来的时候这朵花还没有。',
    ],
    areas: ['catacombs_entrance', 'deep_catacombs'],
  },
  'trace_lighthouse_signal': {
    text: [
      '灯塔的灯今天没有亮。不是故障——是有人把它关了。开关上有新鲜的指纹。灯室的桌子上有一张纸条，上面画着一组数字。看起来像某种信号的时间间隔。',
      '灯塔底下的门半开着。你上次来的时候它是锁着的。门边的泥地上有一串脚印，从灯塔延伸到海边。脚印的方向是——朝海里。不是从海里来的。',
    ],
    areas: ['lighthouse', 'harbor_district'],
  },
  'trace_manor_diary': {
    text: [
      '庄园书房的书桌上有一本摊开的日记。最后一页写着：「他们又来了。和上次一样。但这次不一样了。」笔迹你很熟悉。是你自己的。但你确定自己没有写过这行字。',
      '庄园地下室的门上贴了一张便条：「不要下去。它知道你会来。」字迹不是希尔达的。但你上次来的时候，这张便条还不在门上。',
    ],
    areas: ['voxchester_manor'],
  },
  'trace_grove_offering': {
    text: [
      '禁忌森林的空地上有一堆小石头。不是自然堆成的——是被人精心排列的。排列方式像某种符号。你在森林里继续走的时候，发现每隔一段距离就有这样一堆石头。它们指向同一个方向。',
      '森林深处的一棵老树上系着一条红色的布条。布条已经褪色了。但系结的方式……你很熟悉。你上次来的时候没有这条布条。但你知道这种结法——是你系的。',
    ],
    areas: ['forbidden_grove'],
  },
};

// ── 自动痕迹生成规则 ──────────────────────────────────
// 根据 state 自动检测可生成的痕迹（无需手动 record）
var AUTO_TRACE_RULES = [
  {
    traceId: 'npc_death_manor',
    check: function (s) { return (s.previousDeathsByArea?.voxchester_manor || 0) > 0; },
  },
  {
    traceId: 'npc_death_church',
    check: function (s) { return (s.previousDeathsByArea?.church || 0) > 0; },
  },
  {
    traceId: 'npc_death_harbor',
    check: function (s) { return (s.previousDeathsByArea?.harbor_district || 0) > 0; },
  },
  {
    traceId: 'npc_death_forest',
    check: function (s) { return (s.previousDeathsByArea?.forbidden_grove || 0) > 0; },
  },
  {
    traceId: 'npc_death_catacombs',
    check: function (s) {
      return (s.previousDeathsByArea?.catacombs_entrance || 0) > 0
        || (s.previousDeathsByArea?.deep_catacombs || 0) > 0;
    },
  },
  {
    traceId: 'betrayal_npc',
    check: function (s) { return (s.behaviorTracking?.npc_deaths_by_manipulation || 0) > 0; },
  },
  {
    traceId: 'killing_spree',
    check: function (s) { return (s.behaviorTracking?.direct_kill_count || 0) >= 3; },
  },
  {
    traceId: 'desecration',
    check: function (s) { return (s.behaviorTracking?.sacred_desecration_count || 0) > 0; },
  },
  {
    traceId: 'theft',
    check: function (s) { return (s.behaviorTracking?.hoarded_money_max || 0) >= 5; },
  },
  {
    traceId: 'cannibalism',
    check: function (s) { return (s.behaviorTracking?.cannibalism_count || 0) > 0; },
  },

  // ── P2 试点：标志位软连锁痕迹（由 CHOICE add_flag 触发）──
  {
    traceId: 'trace_broken_window_church',
    check: function (s) { return hasTriggered(s, 'trace_broken_window_church'); },
  },
  {
    traceId: 'trace_dropped_item_harbor',
    check: function (s) { return hasTriggered(s, 'trace_dropped_item_harbor'); },
  },
  {
    traceId: 'trace_sat_chair_manor',
    check: function (s) { return hasTriggered(s, 'trace_sat_chair_manor'); },
  },
  // ── P2 扩展：更多标志位软连锁痕迹 ──
  {
    traceId: 'trace_forest_whisper',
    check: function (s) { return hasTriggered(s, 'trace_forest_whisper'); },
  },
  {
    traceId: 'trace_tavern_drunk',
    check: function (s) { return hasTriggered(s, 'trace_tavern_drunk'); },
  },
  {
    traceId: 'trace_catacombs_ritual',
    check: function (s) { return hasTriggered(s, 'trace_catacombs_ritual'); },
  },
  {
    traceId: 'trace_lighthouse_signal',
    check: function (s) { return hasTriggered(s, 'trace_lighthouse_signal'); },
  },
  {
    traceId: 'trace_manor_diary',
    check: function (s) { return hasTriggered(s, 'trace_manor_diary'); },
  },
  {
    traceId: 'trace_grove_offering',
    check: function (s) { return hasTriggered(s, 'trace_grove_offering'); },
  },
];

/**
 * 从 state 自动检测并生成所有符合条件的痕迹
 * 在 loop 开始时（initLoopState）调用
 * @param {object} state - 游戏状态
 * @returns {Array} 新生成的痕迹列表
 */
export function detectPlayerTraces(state) {
  if (!state) return [];
  var newTraces = [];
  var existingTraceIds = new Set((state.playerTraces || []).map(function (t) { return t.traceId; }));

  for (var i = 0; i < AUTO_TRACE_RULES.length; i++) {
    var rule = AUTO_TRACE_RULES[i];
    if (rule.check(state) && !existingTraceIds.has(rule.traceId)) {
      var descData = TRACE_DESCRIPTIONS[rule.traceId];
      if (!descData) continue;
      // Pick first description (additional descriptions unlocked by loop count)
      var trace = {
        traceId: rule.traceId,
        areas: descData.areas,
        textIndex: 0,
        discoveredLoop: state.loopCount || 1,
        day: state.day || 1,
      };
      newTraces.push(trace);
    }
  }

  // Also check endings
  var endingTraces = {
    'ending_fear_ocean_return': 'ending_escape',
    'ending_escape_by_sea': 'ending_escape',
    'ending_seal_player_keeper': 'ending_seal',
    'ending_seal_hilda_choice': 'ending_seal',
    'ending_seal_old_fisher_blood': 'ending_seal',
    'ending_fear_body_dissolution': 'ending_consumed',
    'ending_abyss_consumed': 'ending_consumed',
    'ending_transcendence': 'ending_transcend',
    'ending_loop_truth': 'ending_transcend',
  };

  var prevEndings = state.previousEndings || [];
  for (var j = 0; j < prevEndings.length; j++) {
    var eid = prevEndings[j];
    var traceId = endingTraces[eid];
    if (traceId && !existingTraceIds.has(traceId)) {
      var descData = TRACE_DESCRIPTIONS[traceId];
      if (!descData) continue;
      newTraces.push({
        traceId: traceId,
        areas: descData.areas,
        textIndex: 0,
        discoveredLoop: state.loopCount || 1,
        day: state.day || 1,
      });
    }
  }

  return newTraces;
}

/**
 * 获取指定区域的玩家痕迹描述
 * @param {string} areaId - 区域 ID
 * @param {object} state - 游戏状态
 * @returns {string|null} 痕迹描述文本
 */
export function getAreaPlayerTrace(areaId, state) {
  if (!state || !state.playerTraces) return null;
  var traces = state.playerTraces.filter(function (t) {
    return t.areas && t.areas.indexOf(areaId) >= 0;
  });
  if (traces.length === 0) return null;

  // Pick the most recently discovered trace for this area
  var trace = traces[traces.length - 1];
  var descData = TRACE_DESCRIPTIONS[trace.traceId];
  if (!descData) return null;

  var texts = descData.text;
  var idx = Math.min(trace.textIndex || 0, texts.length - 1);
  return texts[idx];
}

/**
 * 为指定区域生成痕迹文本（用于区域描述附加）
 * @param {string} areaId - 区域 ID
 * @param {object} state - 游戏状态
 * @returns {string|null}
 */
export function getPlayerTraceNarrative(areaId, state) {
  var trace = getAreaPlayerTrace(areaId, state);
  if (!trace) return null;
  return '你上次来过之后，这里留下了一些痕迹。\n' + trace;
}

/**
 * 手动记录一个玩家痕迹（供 CHOICE_SELECT 等场景调用）
 * @param {object} state - 游戏状态（mutable）
 * @param {string} traceId - 痕迹 ID
 * @param {string} areaId - 痕迹所在区域
 * @param {object} [extra] - 额外信息
 */
export function recordPlayerTrace(state, traceId, areaId, extra) {
  if (!state) return;
  if (!state.playerTraces) state.playerTraces = [];

  // Check if already recorded
  var exists = state.playerTraces.some(function (t) { return t.traceId === traceId; });
  if (exists) return;

  var descData = TRACE_DESCRIPTIONS[traceId];
  if (!descData) return;

  state.playerTraces.push({
    traceId: traceId,
    areas: descData.areas.indexOf(areaId) >= 0 ? descData.areas : [areaId],
    textIndex: 0,
    discoveredLoop: state.loopCount || 1,
    day: state.day || 1,
  });

  // Also register as a triggered event (flag) so hasTriggered can detect it
  if (state.triggeredEvents && state.triggeredEvents.indexOf(traceId) < 0) {
    state.triggeredEvents.push(traceId);
    syncTriggeredSet(state, traceId);
  }

  // Cap at 30 entries
  if (state.playerTraces.length > 30) {
    state.playerTraces = state.playerTraces.slice(-30);
  }
}

/**
 * 获取所有可用的痕迹类型列表（用于调试/UI）
 */
export function getAvailableTraceTypes() {
  return Object.keys(TRACE_DESCRIPTIONS).map(function (key) {
    return {
      id: key,
      textCount: TRACE_DESCRIPTIONS[key].text.length,
      areas: TRACE_DESCRIPTIONS[key].areas,
    };
  });
}
