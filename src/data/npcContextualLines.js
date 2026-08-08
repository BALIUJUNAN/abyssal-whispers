// src/data/npcContextualLines.js - Expanded NPC contextual dialogue
// 8 NPCs, ~170 lines. Support: trust, time, san, loop, items, area, death legacy

import { getPhase } from '../engine/WorldTimeSystem.js';

export function selectContextualLine(npcName, state, opts) {
  var pool = NPC_CONTEXTUAL_LINES[npcName];
  if (!pool || pool.length === 0) return null;
  var time = (opts && opts.time) || "day";
  try { if (typeof getPhase === "function") time = getPhase(state.ap || 12, state.maxAp || 12); } catch(e) {}
  var trust = (state.npcTrust || {})[npcName] || 0;
  var san = state.san || 60;
  var loop = state.loopCount || 0;
  var diedLast = !!(state.lastDeathType || state.deathContext);
  var visitedAreas = state.visitedAreas || [];
  var inventory = state.inventory || [];
  var invIds = inventory.map(function(i) { return i.id || i.name || ""; });
  // 上轮死亡区域：来自 loopReducer 传递的 previousDeathsByArea（上一轮回累积）
  var prevDeathsByArea = state.previousDeathsByArea || {};
  // 上轮死亡类型：来自 deathContext / lastDeathType
  var prevDeathType = state.lastDeathType || state.deathContext?.type || null;
  var seen = (state._seenContextualLines || {})[npcName] || [];
  var candidates = pool.filter(function(line) {
    var c = line.conditions || {};
    if (c.trust_min != null && trust < c.trust_min) return false;
    if (c.trust_max != null && trust > c.trust_max) return false;
    if (c.san_below != null && san >= c.san_below) return false;
    if (c.san_above != null && san <= c.san_above) return false;
    if (c.loop_min != null && loop < c.loop_min) return false;
    if (c.loop_max != null && loop > c.loop_max) return false;
    if (c.time && c.time !== time) return false;
    if (c.died_last_run && !diedLast) return false;
    if (c.visited_area && visitedAreas.indexOf(c.visited_area) < 0) return false;
    if (c.has_item && invIds.indexOf(c.has_item) < 0) return false;
    // 上轮死亡区域条件（数组，任一匹配即通过）
    if (c.death_area && Array.isArray(c.death_area)) {
      var hasDeathInArea = c.death_area.some(function(a) { return (prevDeathsByArea[a] || 0) > 0; });
      if (!hasDeathInArea) return false;
    }
    // 上轮死亡类型条件（字符串精确匹配）
    if (c.prev_death_type && prevDeathType !== c.prev_death_type) return false;
    return true;
  });
  if (candidates.length === 0) return null;
  var unseen = candidates.filter(function(l) { return seen.indexOf(l.text) < 0; });
  var pool2 = unseen.length > 0 ? unseen : candidates;
  var maxP = 0;
  for (var i = 0; i < pool2.length; i++) { if ((pool2[i].priority || 0) > maxP) maxP = pool2[i].priority || 0; }
  var topTier = pool2.filter(function(l) { return (l.priority || 0) === maxP; });
  var pick = topTier[Math.floor(Math.random() * topTier.length)];
  if (!state._seenContextualLines) state._seenContextualLines = {};
  if (!state._seenContextualLines[npcName]) state._seenContextualLines[npcName] = [];
  if (state._seenContextualLines[npcName].indexOf(pick.text) < 0) state._seenContextualLines[npcName].push(pick.text);
  return pick;
}

export var NPC_CONTEXTUAL_LINES = {
  '老费舍': [
    { text: '（他没有抬头。手里的渔网在修补。）', conditions: {}, priority: 1, tags: ['greeting'] },
    { text: '雾来了。今天不适合出海。', conditions: {time: 'morning'}, priority: 2, tags: ['greeting'] },
    { text: '码头的灯还没灭。说明潮水还没退。', conditions: {time: 'night'}, priority: 2, tags: ['greeting'] },
    { text: '（他看了你一眼，然后继续补网。）', conditions: {trust_max: 1}, priority: 3, tags: ['greeting'] },
    { text: '坐吧。茶是凉的。', conditions: {trust_min: 2}, priority: 3, tags: ['greeting'] },
    { text: '你来了。正好，帮我把那捆缆绳搬到码头那头。', conditions: {trust_min: 3}, priority: 3, tags: ['greeting'] },
    { text: '（他把一杯热茶推到你面前。没有说话。但杯子是你上次用的那个。）', conditions: {trust_min: 4}, priority: 4, tags: ['greeting'] },
    { text: '今天的浪不太对。从东边来的。正常的浪不从东边来。', conditions: {}, priority: 1, tags: ['lore'] },
    { text: '码头下面有东西。不是鱼。鱼不会在夜里发光。', conditions: {time: 'night'}, priority: 2, tags: ['lore'] },
    { text: '1919年那场大雾之后，灯塔就不对了。不是灯的问题。是灯塔本身。', conditions: {trust_min: 2}, priority: 3, tags: ['lore'] },
    { text: '你听过海底的声音吗？不是海浪。是另一种。像呼吸。很慢的呼吸。', conditions: {trust_min: 3}, priority: 3, tags: ['lore'] },
    { text: '（他指着远处的海面。）你看到那个黑点了吗？它每天都在。每天都在同一个位置。', conditions: {trust_min: 3}, priority: 4, tags: ['lore'] },
    { text: '你的衣服是干的。说明你没去过码头。你来这里不是为了钓鱼。', conditions: {trust_min: 1}, priority: 2, tags: ['reaction'] },
    { text: '你带了灯。好。那些地方没有灯不行。', conditions: {has_item: 'flashlight'}, priority: 3, tags: ['reaction'] },
    { text: '（他闻了闻空气。）你去过墓穴。那种味道，洗不掉。', conditions: {visited_area: 'catacombs_entrance'}, priority: 4, tags: ['reaction'] },
    { text: '你的手在抖。不是冷的。', conditions: {san_below: 50}, priority: 4, tags: ['san'] },
    { text: '你的眼睛……你今天照过镜子吗？', conditions: {san_below: 40}, priority: 5, tags: ['san'] },
    { text: '（他没有说话。只是把你带到了码头尽头。指着水面。水面映出的不是你的脸。）', conditions: {san_below: 30}, priority: 6, tags: ['san'] },
    { text: '你又来了。', conditions: {loop_min: 2}, priority: 5, tags: ['loop'] },
    { text: '海会记住所有回来的人。你是回来次数最多的。', conditions: {loop_min: 5}, priority: 6, tags: ['loop'] },
    { text: '你记住了。上次你死在灯塔下面。（停顿）烟斗里的烟，还是老样子。', conditions: {loop_min: 3, trust_min: 4}, priority: 7, tags: ['loop'] },
    // ── 轮回记忆台词 P0：锚链台词（min_loop ≥ 2 + 信任 ≥ 2 + 上轮死于水域）──
    { text: '（他把一段锚链放在桌上。锚链上的锈迹和你上次沾到的一模一样。）你回来了。锚还记得你。', conditions: {loop_min: 2, trust_min: 2, death_area: ['harbor_district', 'lighthouse']}, priority: 8, tags: ['loop', 'memory', 'legacy'] },
    { text: '你……又来了。还是说，我又看见你了？', conditions: {loop_min: 2, san_below: 40}, priority: 7, tags: ['loop', 'san'] },
    { text: '（他转过身去。码头的木板在脚下吱呀作响。）', conditions: {trust_max: 0}, priority: 2, tags: ['silence'] },
    { text: '别问了。', conditions: {trust_min: 1, trust_max: 2}, priority: 2, tags: ['silence'] },
    { text: '（他看了你很久。然后把烟斗里的灰磕掉。）有些事不能说。不是不想。是不能。', conditions: {trust_min: 3}, priority: 3, tags: ['silence'] },
    { text: '（他看着码头的木板。木板上有新的划痕。像是有人被拖过。）你上次来的时候……算了。', conditions: {died_last_run: true}, priority: 6, tags: ['legacy'] },
    { text: '码头下面的水变红了几天。然后又清了。你不知道为什么。我知道。', conditions: {died_last_run: true, trust_min: 3}, priority: 7, tags: ['legacy'] },
    { text: '今天的风向不对。从西北来的。那种风会把海底的东西吹上来。', conditions: {time: 'afternoon'}, priority: 2, tags: ['lore'] },
    { text: '你身上有海水的味道。你今天去过码头？不。那不是码头的海水味道。', conditions: {san_below: 45}, priority: 4, tags: ['reaction'] },
    { text: '（他把一段旧缆绳递给你。缆绳上有盐渍。）这是1919年沉船上的。留着。', conditions: {trust_min: 4}, priority: 4, tags: ['lore'] },
  ],
  '约书亚·布莱克': [
    { text: '（他靠在灯塔的墙上。手插在口袋里。没有看你。）', conditions: {}, priority: 1, tags: ['greeting'] },
    { text: '你来干什么？灯塔不对外开放。', conditions: {trust_max: 1}, priority: 2, tags: ['greeting'] },
    { text: '楼梯在那边。小心第十三级。那级台阶的响声不对。', conditions: {trust_min: 2}, priority: 3, tags: ['greeting'] },
    { text: '（他把望远镜递给你。）你看看海面。', conditions: {trust_min: 3}, priority: 4, tags: ['greeting'] },
    { text: '灯塔的灯每天灭一次。不是故障。是灯塔在休息。你听过建筑休息吗？', conditions: {trust_min: 2}, priority: 3, tags: ['lore'] },
    { text: '我在海军的时候见过一次。海面上的光。不是灯塔。是从水下上来的。那次之后我就退伍了。', conditions: {trust_min: 3}, priority: 4, tags: ['lore'] },
    { text: '码头下面有管道。通向庄园地下室。通向教堂。通向很多地方。但最重要的那条——通向海底。', conditions: {trust_min: 4}, priority: 5, tags: ['lore'] },
    { text: '（他把一张折叠的海图递给你。上面用红笔画了一条线。从码头到海面上一个标记。）你不需要知道那是什么。但你需要知道它在那里。', conditions: {trust_min: 5}, priority: 5, tags: ['lore'] },
    { text: '你看起来像是几天没睡了。或者几天没活了。', conditions: {san_below: 50}, priority: 4, tags: ['san'] },
    { text: '（他把枪放在桌上。不是对着你。是给你。）你已经不是人了。但你还在假装。这很勇敢。', conditions: {san_below: 30}, priority: 6, tags: ['san'] },
    { text: '你让我想起了困在战壕里的日子。不是恐惧——是重复。', conditions: {loop_min: 5}, priority: 6, tags: ['loop'] },
    { text: '你又来了。你上次是从楼梯上摔下去的。这次小心点。', conditions: {loop_min: 3, trust_min: 2}, priority: 6, tags: ['loop'] },
    { text: '（他转过身。灯塔的光在他背后旋转。）', conditions: {trust_max: 0}, priority: 2, tags: ['silence'] },
    { text: '（他看着灯塔的楼梯扶手。扶手上有抓痕。）你上次掉下去的时候，抓了扶手。痕迹还在。', conditions: {died_last_run: true}, priority: 6, tags: ['legacy'] },
    { text: '你的眼睛在发光。不是反光。是发光。', conditions: {san_below: 35}, priority: 5, tags: ['san'] },
    { text: '灯塔今天闪了十三次。正常只会闪十二次。多出来的那一次……我没看到是什么。', conditions: {time: 'night'}, priority: 3, tags: ['lore'] },
    { text: '（他把望远镜递给你。镜头里，海面上有一个光点。不是灯塔。不是船。它在动。）你有没有看到那个？', conditions: {loop_min: 3, trust_min: 4}, priority: 7, tags: ['loop', 'lore'] },
    { text: '（他看着你。很久。）你每次回来都比上次更不像人。我 noticed 了。不是讽刺——是陈述。', conditions: {loop_min: 5, trust_min: 3}, priority: 8, tags: ['loop', 'memory'] },
  ],
  '希尔达·莫里斯': [
    { text: '门开着。进来吧。走廊里的画像今天很安静。', conditions: {}, priority: 1, tags: ['greeting'] },
    { text: '你来得正好。茶刚泡好。走廊尽头左转。', conditions: {time: 'afternoon'}, priority: 2, tags: ['greeting'] },
    { text: '（她站在门口。身后的走廊里，画像上的眼睛似乎在跟着你移动。）', conditions: {time: 'night'}, priority: 3, tags: ['greeting'] },
    { text: '请坐。今天庄园的暖气不太稳定。地下室的管道又在响了。', conditions: {trust_min: 2}, priority: 3, tags: ['greeting'] },
    { text: '你来了。你一个人来的？好。有些话不能让第三个人听到。', conditions: {trust_min: 4}, priority: 4, tags: ['greeting'] },
    { text: '这座庄园建于1780年。建在一座更老的建筑上面。那座建筑的地基……你不会想知道。', conditions: {trust_min: 2}, priority: 3, tags: ['lore'] },
    { text: '地下室的门我从来不锁。不是因为没有秘密。是因为锁不住。', conditions: {trust_min: 3}, priority: 4, tags: ['lore'] },
    { text: '走廊里的画像不是装饰。它们是……记录。每一张脸都曾经住在这座庄园里。', conditions: {trust_min: 3}, priority: 3, tags: ['lore'] },
    { text: '你有没有注意到？画像里的人的手指数量不太一样。有的多了一根。有的少了一根。', conditions: {trust_min: 4}, priority: 4, tags: ['lore'] },
    { text: '（她压低声音。）地下室下面还有东西。不是房间。是……通道。通往码头方向。', conditions: {trust_min: 5}, priority: 5, tags: ['lore'] },
    { text: '你的鞋上有泥。是墓穴那边的土。那种土是黑的。', conditions: {visited_area: 'catacombs_entrance'}, priority: 4, tags: ['reaction'] },
    { text: '你看起来很疲惫。走廊里的画像今天都在看你。', conditions: {san_below: 40}, priority: 5, tags: ['san'] },
    { text: '你走路的姿势变了。像是在水里走路。', conditions: {san_below: 30}, priority: 6, tags: ['san'] },
    { text: '（她站在门口等你。你还没有敲门。）你知道地下室的秘密。不是你告诉我的——是你的影子告诉我的。', conditions: {san_below: 25}, priority: 7, tags: ['san'] },
    { text: '你又来了。走廊里的画像已经认得你了。', conditions: {loop_min: 2}, priority: 5, tags: ['loop'] },
    { text: '走廊里的画像已经不为你变化了。它们习惯了你。', conditions: {loop_min: 5}, priority: 6, tags: ['loop'] },
    { text: '（她看着你。）你上次来的时候，地下室的门是开的。这次也是。', conditions: {loop_min: 3, trust_min: 3}, priority: 7, tags: ['loop'] },
    // ── 轮回记忆台词 P0：死亡方式台词（min_loop ≥ 2 + 信任 ≥ 2 + 死于庄园/墓穴区域）──
    { text: '（她没有看你的脸。目光落在你左手的旧疤上。）上次你从这里出去的时候，这个疤还没有。你在地下室摔了一跤。石头很滑。', conditions: {loop_min: 2, trust_min: 2, death_area: ['voxchester_manor', 'deep_catacombs']}, priority: 8, tags: ['loop', 'memory', 'legacy'] },
    { text: '（她没有开门。你听到走廊里有脚步声。但不是朝门口来的。）', conditions: {trust_max: 0}, priority: 2, tags: ['silence'] },
    { text: '（她看着你。目光停在你的左手上。你上次死的时候，左手先着地。）你的手……还疼吗？', conditions: {died_last_run: true}, priority: 6, tags: ['legacy'] },
    { text: '庄园的画像今天多了一个人。那个人穿着你的衣服。', conditions: {san_below: 35}, priority: 5, tags: ['san'] },
    { text: '地下室的门今天开了一条缝。我没有动过它。', conditions: {trust_min: 2}, priority: 3, tags: ['lore'] },
  ],
  '玛莎·格雷': [
    { text: '喝点什么？别站着。', conditions: {}, priority: 1, tags: ['greeting'] },
    { text: '早啊。昨晚码头那边吵得要命。', conditions: {time: 'morning'}, priority: 2, tags: ['greeting'] },
    { text: '酒吧打烊了。不过你看起来需要一杯。', conditions: {time: 'night'}, priority: 2, tags: ['greeting'] },
    { text: '你又来了。坐吧，老位置。', conditions: {trust_min: 3}, priority: 3, tags: ['greeting'] },
    { text: '（她把你常喝的那杯推过来。你没点。她知道。）', conditions: {trust_min: 4}, priority: 4, tags: ['greeting'] },
    { text: '码头上周来了一条船。船上的人没下船。船自己又开走了。', conditions: {trust_min: 1}, priority: 2, tags: ['lore'] },
    { text: '灯塔的灯每天灭一次。时间不固定。但每次灭的时候，码头下面都会传来声音。', conditions: {trust_min: 2}, priority: 3, tags: ['lore'] },
    { text: '这镇子上的人分两种：知道的和不想知道的。你是哪种？', conditions: {trust_min: 2}, priority: 3, tags: ['lore'] },
    { text: '约书亚以前不是这样的。他当兵回来之后就变了。你去灯塔的时候注意他的手。', conditions: {trust_min: 3}, priority: 4, tags: ['lore'] },
    { text: '（她擦着杯子。）酒馆地下室有一扇门。门后面是码头的排水管道。', conditions: {trust_min: 4}, priority: 5, tags: ['lore'] },
    { text: '你身上有海水的味道。你今天去过码头？', conditions: {visited_area: 'harbor_district'}, priority: 3, tags: ['reaction'] },
    { text: '你的影子刚才动了一下。不是你动的。', conditions: {san_below: 40}, priority: 5, tags: ['san'] },
    { text: '（她把一杯酒推到你面前。酒是黑色的。她没有注意到酒的颜色。）', conditions: {san_below: 30}, priority: 6, tags: ['san'] },
    { text: '你又来了。我开始觉得你不是客人——你是这间酒馆的一部分。', conditions: {loop_min: 2}, priority: 5, tags: ['loop'] },
    { text: '（她看着你。手里的杯子没有放下。）你每次来都点一样的东西。但你的表情不一样。', conditions: {loop_min: 3, trust_min: 3}, priority: 6, tags: ['loop'] },
    { text: '（她背对着你擦杯子。没有回头。）', conditions: {trust_max: 0}, priority: 2, tags: ['silence'] },
    { text: '（她看着你坐下。）你上次来的时候，坐的是那个位置。那个位置现在是空的。一直是空的。', conditions: {died_last_run: true}, priority: 6, tags: ['legacy'] },
    { text: '今天的啤酒不太对。有一股海水的味道。不是正常的那种。', conditions: {}, priority: 1, tags: ['lore'] },
    { text: '又来了？坐吧。你那个位置没人敢坐。他们说你坐过的凳子会自己冒水。', conditions: {trust_min: 1}, priority: 2, tags: ['greeting'] },
    { text: '码头上周来了一条船。船上的人没下船。船自己开走了。我赌五十块钱那艘船现在正在海底跟1919年的沉船打牌。', conditions: {trust_min: 2}, priority: 3, tags: ['lore'] },
    { text: '别碰角落那杯啤酒。已经放了一周了。比我在灯塔底下捡到那个东西的存放时间还短。', conditions: {trust_min: 3}, priority: 4, tags: ['lore'] },
    { text: '你上次来的时候点了什么来着？……算了。我也忘了。今天喝什么？', conditions: {loop_min: 2}, priority: 5, tags: ['loop'] },
    { text: '（她擦杯子的手停了一下。她看见了什么——不是在你身上，是在你身后。然后她恢复了动作。）你身后那杯酒……不是我给你倒的。', conditions: {loop_min: 5, trust_min: 3}, priority: 7, tags: ['loop', 'lore'] },
    { text: '（她把酒馆的门关上了一点。声音压得很低。）我在这吧台后面待了十二年。见过很多人来来去去。但你不一样。你不是来喝酒的。你是来告别的。', conditions: {loop_min: 3, trust_min: 4}, priority: 7, tags: ['loop', 'lore'] },
  ],
  '伊莱亚斯·沃德': [
    { text: '他抬起头，手指还夹着一支没点燃的烟斗。镜片后面的目光快速扫过你的脸，又垂回去。「你好。新来的？」', conditions: {}, priority: 1, tags: ['greeting'] },
    { text: '「图书馆在三街区往北。」他没有抬头。', conditions: {trust_max: 0}, priority: 2, tags: ['greeting'] },
    { text: '「请坐。你来对了时间。」他翻开一本笔记。', conditions: {trust_min: 2}, priority: 3, tags: ['greeting'] },
    { text: '（他把门反锁了。窗帘也拉上。）「有些话不能在白天说。」', conditions: {trust_min: 3, time: 'night'}, priority: 4, tags: ['greeting'] },
    { text: '「1692年建城。建城文献上写的是晨星指引了我们的道路。你知道晨星是什么吗？」', conditions: {trust_min: 1}, priority: 2, tags: ['lore'] },
    { text: '「密斯卡托尼克大学的档案室里有一份文件。关于沃切斯特的。那份文件现在在地下三层。进不去。」', conditions: {trust_min: 2}, priority: 3, tags: ['lore'] },
    { text: '「每隔十七天，退潮到最低点的时候，码头东侧的水下会出现光。不是水面反射。是从海底透上来的。」', conditions: {trust_min: 3}, priority: 4, tags: ['lore'] },
    { text: '「封印不是人为的。或者说，不是现代人做的。它在那里已经很久了。比这座城市还久。」', conditions: {trust_min: 4}, priority: 5, tags: ['lore'] },
    { text: '「你的认知模式出现了偏移。有趣。请坐下来让我观察一下。」', conditions: {san_below: 50}, priority: 4, tags: ['san'] },
    { text: '「你的体温比上次低了2度。这在医学上是不正常的。」', conditions: {san_below: 40}, priority: 5, tags: ['san'] },
    { text: '「你的轮回次数已经超出了理论值。你不再是案例——你是现象。」', conditions: {loop_min: 5}, priority: 6, tags: ['loop'] },
    { text: '（他看着你。翻了翻笔记本。）「你上次来的时候，坐的是那把椅子。椅子上的磨损痕迹和你的坐姿吻合。」', conditions: {loop_min: 3, trust_min: 3}, priority: 7, tags: ['loop'] },
    // ── 轮回记忆台词 P0：体温台词（min_loop ≥ 2 + 信任 ≥ 3）──
    { text: '「你的体温比上次低了2.7度。误差超出测量仪的量程。」他把温度计放回口袋。「这不是疾病。这是衰减。」', conditions: {loop_min: 2, trust_min: 3, san_below: 50}, priority: 8, tags: ['loop', 'memory', 'san'] },
    { text: '（他看了看你。然后在笔记本上写了一行字，没有让你看。）', conditions: {trust_max: 1}, priority: 2, tags: ['silence'] },
    { text: '「你的档案里多了一条记录。死亡原因：……」他没有读完。「你不需要知道细节。」', conditions: {died_last_run: true}, priority: 6, tags: ['legacy'] },
    { text: '「你的血液检测结果……」他停顿了一下。「含盐量偏高。不是饮食能解释的那种偏高。」', conditions: {san_below: 45}, priority: 5, tags: ['san'] },
    { text: '「你手上的伤疤……你确定是今天才有的吗？它的愈合程度不对。」', conditions: {san_below: 35}, priority: 5, tags: ['san'] },
    // ── 伊莱亚斯语言指纹：学术观察体 ──
    { text: '（他翻到笔记本前一页。上面有一组数据。）「你的行为模式出现了系统性偏移。这不是记忆衰退——是某种外部写入。每次轮回，你的选择在收敛。」', conditions: {loop_min: 5, trust_min: 4}, priority: 8, tags: ['loop', 'memory', 'lore'] },
  ],
  '伊莎贝拉·韦伯': [
    { text: '「愿主保佑你。你来祈祷吗？」', conditions: {}, priority: 1, tags: ['greeting'] },
    { text: '教堂的门一直开着。无论是白天还是夜晚。', conditions: {time: 'night'}, priority: 2, tags: ['greeting'] },
    { text: '「你来过很多次了。坐吧。」', conditions: {trust_min: 3}, priority: 3, tags: ['greeting'] },
    { text: '「教堂建于1740年。地基下埋着第一批定居者的遗骸。」', conditions: {trust_min: 1}, priority: 2, tags: ['lore'] },
    { text: '「你有没有注意到？十字架的影子每天都在变化。不是太阳的位置——是十字架本身。」', conditions: {trust_min: 3}, priority: 4, tags: ['lore'] },
    { text: '「地下室的门后面……不是墓穴。是更古老的东西。我第一次看到的时候，跪了很久。」', conditions: {trust_min: 4}, priority: 5, tags: ['lore'] },
    { text: '「你的手在发抖。是冷吗？还是别的？」', conditions: {san_below: 50}, priority: 4, tags: ['san'] },
    { text: '「教堂的蜡烛今天为你亮了三根。这不正常。」', conditions: {san_below: 40}, priority: 5, tags: ['san'] },
    { text: '（她跪在圣坛前。你进来的时候，十字架转了一个角度。）你已经被标记了。不是被神——是被这个地方。', conditions: {san_below: 25}, priority: 7, tags: ['san'] },
    { text: '「教堂的钟声不再为你响了。你已经是这里的一部分了。」', conditions: {loop_min: 5}, priority: 6, tags: ['loop'] },
    { text: '（她看着你。目光里有怜悯。）「你上次来的时候，也是坐在这排椅子上。椅子记得你。」', conditions: {loop_min: 3, trust_min: 3}, priority: 7, tags: ['loop'] },
    { text: '（她低头祈祷。没有看你。）', conditions: {trust_max: 0}, priority: 2, tags: ['silence'] },
    { text: '「你上次来教堂的时候……我记得。那天的蜡烛灭了三根。」她没有说为什么。', conditions: {died_last_run: true}, priority: 6, tags: ['legacy'] },
    { text: '「你听到了吗？钟声。不是十三下。是你的名字。」', conditions: {san_below: 30}, priority: 6, tags: ['san'] },
    { text: '教堂的地板今天是温的。不是暖气。是从下面传上来的。', conditions: {time: 'night'}, priority: 3, tags: ['lore'] },
    // ── 伊莎贝拉语言指纹：宗教见证者 ──
    { text: '「你走过圣坛的时候，蜡烛没有晃动。但没有风。」她看着你。「它们认识你。不需要风来引燃。」', conditions: {loop_min: 3, trust_min: 3}, priority: 8, tags: ['loop', 'memory', 'san'] },
  ],
  '汤米·陈': [
    { text: '（他正在擦相机。抬头看了你一眼。）你对摄影感兴趣吗？', conditions: {}, priority: 1, tags: ['greeting'] },
    { text: '今天的光线很适合拍照。码头那边的雾——你看过那种雾吗？', conditions: {time: 'morning'}, priority: 2, tags: ['greeting'] },
    { text: '你来了。（他翻了翻相机。）你看看这个。', conditions: {trust_min: 3}, priority: 3, tags: ['greeting'] },
    { text: '我的相机拍到了一些东西。不是光线问题。你可以看看。', conditions: {trust_min: 1}, priority: 2, tags: ['lore'] },
    { text: '码头的水面每天傍晚都会出现波纹。没有风的时候也有。不是船。船的波纹是V形的。这个是圆的。', conditions: {trust_min: 2}, priority: 3, tags: ['lore'] },
    { text: '我拍了一张教堂地下室的照片。照片洗出来之后，上面多了一个影子。不是我的。不是任何人的。', conditions: {trust_min: 3}, priority: 4, tags: ['lore'] },
    { text: '（他把一叠照片递给你。）你看。每张照片里都有一个共同的东西。那个螺旋符号。', conditions: {trust_min: 4}, priority: 5, tags: ['lore'] },
    { text: '你今天拍的照片……你确定那是你拍的吗？', conditions: {san_below: 40}, priority: 5, tags: ['san'] },
    { text: '（他把相机递给你。屏幕上的照片是你——但不是现在的你。是很多个你。重叠在一起。）', conditions: {san_below: 30}, priority: 6, tags: ['san'] },
    { text: '我的相机已经存了太多你的照片。每次都不一样。每次都是你。', conditions: {loop_min: 5}, priority: 6, tags: ['loop'] },
    // ── 汤米语言指纹：摄影即见证 ──
    { text: '（他调整了一下焦距，对着你按了快门。没有闪光灯。）「你知道吗？有些东西只有相机能看到。人眼会自动过滤掉。」', conditions: {loop_min: 3, trust_min: 3}, priority: 8, tags: ['loop', 'memory', 'san'] },
    { text: '（他看了看你。然后继续擦镜头。没有说话。）', conditions: {trust_max: 0}, priority: 2, tags: ['silence'] },
    { text: '（他翻了翻相机。停在一张照片上。照片里是你——但你倒在地上。）这张……我什么时候拍的？', conditions: {died_last_run: true}, priority: 6, tags: ['legacy'] },
    { text: '你的照片里多了一个影子。不是你的。', conditions: {san_below: 35}, priority: 5, tags: ['san'] },
  ],
  '埃德加·洛夫克拉夫特': [
    { text: '（他坐在角落里。笔记本翻开着。笔尖上有墨渍。）', conditions: {}, priority: 1, tags: ['greeting'] },
    { text: '你来了。我正在写一个故事。关于一个不断回来的人。', conditions: {trust_min: 2}, priority: 3, tags: ['greeting'] },
    { text: '（他没有抬头。）你坐吧。我需要一个读者。', conditions: {trust_min: 3}, priority: 3, tags: ['greeting'] },
    { text: '你知道吗？最好的恐怖故事不是编出来的。是观察出来的。', conditions: {trust_min: 1}, priority: 2, tags: ['lore'] },
    { text: '我写过一个故事：一个人来到一座海边小镇，发现镇上的每个人都在假装正常。后来我发现那不是故事。', conditions: {trust_min: 2}, priority: 3, tags: ['lore'] },
    { text: '沃切斯特的故事不需要虚构。你只需要把看到的写下来。但问题是——你写下来之后，故事会自己变化。', conditions: {trust_min: 3}, priority: 4, tags: ['lore'] },
    { text: '（他翻开笔记本的最后一页。空白的。）这一页是我留给结局的。但结局每次都不一样。', conditions: {trust_min: 4}, priority: 5, tags: ['lore'] },
    { text: '你的故事越来越有意思了。但我不确定那是故事。', conditions: {san_below: 40}, priority: 5, tags: ['san'] },
    { text: '你不是在调查沃切斯特。沃切斯特在调查你。你就是最好的素材。', conditions: {san_below: 30}, priority: 6, tags: ['san'] },
    { text: '你的故事已经写了太多遍。但每一次的结局都不一样。这本身就是最好的故事。', conditions: {loop_min: 5}, priority: 6, tags: ['loop'] },
    // ── 埃德加语言指纹：元叙事观察者 ──
    { text: '（他合上笔记本。没有看封底。）「有趣。这本书的作者——不是写故事的人。是读故事的人。你每读一遍，结局就变一次。」', conditions: {loop_min: 3, trust_min: 3}, priority: 8, tags: ['loop', 'memory', 'lore'] },
    { text: '（他看了你一眼。然后在笔记本上画了一条线。划掉了什么。）', conditions: {trust_max: 0}, priority: 2, tags: ['silence'] },
    { text: '「你回来了。」他翻了翻笔记本。「上次的故事……你没有读完。结局是——」他停住了。最后一页是空白的。不。有一滴血。', conditions: {died_last_run: true}, priority: 6, tags: ['legacy'] },
    { text: '「你说话的时候，有些词会自己改变。你注意到了吗？」', conditions: {san_below: 35}, priority: 5, tags: ['san'] },
    { text: '（他放下笔。）「你说话的时候，偶尔会发出一种声音。不是辅音——是一种低频的震动。像是鲸鱼的歌声。」', conditions: {san_below: 30}, priority: 5, tags: ['san'] },
  ],
};

// NPC_THREAD_QUESTIONS — Dialogue tree system (depth 0→1→2→3 with branching)
// Each thread is a progressive questioning chain with optional branching at depth2.
// Branching: at depth2, player chooses a direction → different depth3 outcome.
// State: npcThreads["NPC_threadId"] = { depth, branch, flags, resolved }
export var NPC_THREAD_QUESTIONS = {
  '老费舍': [
    {
      id: 'fisher_lighthouse',
      label: '关于灯塔 keeper 的事',
      trustReq: 2,
      depth1: {
        text: '（他手上的动作停了一下。）灯灭了三天。他去修灯，然后没有回来。不是第一次。但这次……海面上有东西。不只是浪。',
      },
      depth2: {
        trustReq: 3,
        text: '（他左右看了看，压低声音。）最后见他那天，他说听到了"下面有人在叫他"。灯塔下面只有岩石。没有路。',
        choices: [
          { text: '追问"下面"是什么', branch: 'below', trustReq: 3 },
          { text: '问他 lighthouse keeper 的名字', branch: 'name', trustReq: 3 },
        ],
      },
      branches: {
        below: {
          depth3: {
            text: '（他摇头。）我不知道。但他那天的日记里写了一个词——反复写。"Kthulhu"。不是英语。不是任何我能认出的语言。但他写得很熟练。像在练习。',
            clue: 'clue_lighthouse_kthulhu',
            trustGain: 1,
            flags: ['fisher_knows_name'],
          },
        },
        name: {
          depth3: {
            text: '（他沉默了很久。）名字……我忘了。不，不是忘了。是我不能说。说了之后，我就真的看不见他了。',
            clue: 'clue_lighthouse_keepersecret',
            trustGain: 1,
            flags: ['fisher_hides_name'],
          },
        },
      },
      depth3: {
        trustReq: 4,
        text: '（沉默了很久。他从网兜底层摸出一张皱巴巴的纸片。）这是他的。我在灯塔脚下捡到的。上面的符号……我不认识。但你的表情说明你认识。',
        clue: 'clue_lighthouse_note',
        trustGain: 1,
      },
    },
    {
      id: 'fisher_son',
      label: '你儿子的事',
      trustReq: 3,
      depth1: {
        text: '（脸色变了。）不要提他。他已经不在这个镇上了。去了什么地方——没有地址，没有回信。我最后一次见他，他说他要"去更靠近水的地方"。',
      },
      depth2: {
        trustReq: 4,
        text: '（他的手在抖。）有时候我在码头能闻到他的味道。不是烟——是海水的味道。但他从来没有出海。',
      },
      depth3: {
        text: '（他把补好的渔网放在一边，从口袋里掏出一块石头——上面有类似指纹的纹路，但纹路走向不对。）他在海边捡到这个。说"能听到声音"。我想他现在能听到很多声音。',
        clue: 'clue_fisher_son_stone',
        trustGain: 1,
      },
    },
  ],

  '伊莱亚斯·沃德': [
    {
      id: 'elias_seal',
      label: '你研究的封印到底是什么？',
      trustReq: 2,
      depth1: {
        text: '封印不是锁。是阀门。它控制的不是什么东西出不来——是控制什么东西不能进来。或者说……进来多少。',
      },
      depth2: {
        trustReq: 3,
        text: '我的理论是：每次"第十三声钟响"，不是钟在响。是另一侧在敲门。封印把门从这边顶住——但顶门的东西在消耗。',
        choices: [
          { text: '问"另一侧"是什么', branch: 'other_side', trustReq: 3 },
          { text: '问封印的"消耗"从何而来', branch: 'cost', trustReq: 3 },
        ],
      },
      branches: {
        other_side: {
          depth3: {
            text: '（他合上笔记本，看了你很久。）"另一侧"不是一个地方。是一种意识。群体意识。集体想象。当足够多的人相信同一个故事时，故事就有了重量。第十三声钟响时——故事醒了。',
            clue: 'clue_seal_other_side',
            trustGain: 1,
            flags: ['elias_theory_collective'],
          },
        },
        cost: {
          depth3: {
            text: '（他苦笑。）我祖母的日记。她的祖母的日记。封印的维护者每一代都在减少。不是死亡——是"遗忘"。维护封印需要记忆。用自己的记忆加固封印。每一代，维护者就忘记更多。我祖母忘记了她的名字。我母亲忘记了她的孩子。我现在……（他停顿）……我正在忘记为什么而来。',
            clue: 'clue_seal_cost_memory',
            trustGain: 1,
            flags: ['elias_forgetting'],
          },
        },
      },
      depth3: {
        trustReq: 4,
        text: '（他递给你一张手绘的结构图，角落有一个你从未见过的符号。）莫里斯家族的血液能重新激活封印的关键节点。这就是希尔达重要的原因——不是因为她"了解"封印。是因为她是封印的一部分。',
        clue: 'clue_elias_seal_diagram',
        trustGain: 1,
      },
    },
  ],

  '希尔达·莫里斯': [
    {
      id: 'hilda_bloodline',
      label: '你的家族……',
      trustReq: 2,
      depth1: {
        text: '（她的表情变了——不是惊讶，是某种你无法命状的释然。）你终于问了。我一直在等有人问。我祖母告诉我：莫里斯家的血不是用来流的。是用来写的。',
      },
      depth2: {
        trustReq: 3,
        text: '每个莫里斯女嗣出生时手腕上都有一个胎记。形状和封印的符号完全一致。我们不是封印的守护者。我们是封印的钥匙。',
        choices: [
          { text: '问"钥匙"的具体含义', branch: 'key_meaning', trustReq: 3 },
          { text: '问她的胎记现在怎样', branch: 'mark_now', trustReq: 3 },
        ],
      },
      branches: {
        key_meaning: {
          depth3: {
            text: '（她沉默了很久。）钥匙不是开锁的。是"被锁的"。封印需要一个人格作为锚点——一个持续存在的、有意识的人格来维持封印的结构。我是锚点。我的血在维持封印。我的记忆在加固封印。每一次重绘，我就失去一点自己。',
            clue: 'clue_hilda_anchor',
            trustGain: 1,
            flags: ['hilda_is_anchor'],
          },
        },
        mark_now: {
          depth3: {
            text: '（她挽起袖子。你看见了一个发光的、脉动的符号，像活的一样。）它在生长。每次封印波动，它就扩大一点。伊莱亚斯说我的血液能重绘封印——但重绘需要"消耗"标记的一部分。我不知道重绘完那天，我还会不会记得我是谁。',
            clue: 'clue_hilda_seal_mark',
            trustGain: 1,
            flags: ['hilda_mark_growing'],
          },
        },
      },
      depth3: {
        trustReq: 4,
        text: '（她把袖子拉下来，动作很轻。）伊莱亚斯需要我的血。但不是现在。再等几天。我想……我想再记住一些东西。',
        clue: 'clue_hilda_delay',
        trustGain: 1,
      },
    },
  ],

  '伊莎贝拉·韦伯': [
    {
      id: 'isabella_church',
      label: '教堂地下室……',
      trustReq: 2,
      depth1: {
        text: '（她停顿了很久。）教堂下面有东西。不是老鼠，不是积水。是声音。一种……有节奏的、宏大的声音。只有我在值班的深夜能听到。',
      },
      depth2: {
        trustReq: 3,
        text: '地下室的墙上有雕刻。不是哥特式——比那古老得多。我对比过伊莱亚斯教授图纸上的符号。完全一致。同一个封印。教堂和灯塔下面封印的是同一个东西。',
        choices: [
          { text: '问那个"声音"具体是什么', branch: 'sound', trustReq: 3 },
          { text: '问她是否见过其他人下去', branch: 'others', trustReq: 3 },
        ],
      },
      branches: {
        sound: {
          depth3: {
            text: '（她皱眉。）不是语言。是……震动。一种通过骨头传播的低频。我有时候在教堂里站着不动的时候能感觉到——脚底在震。不是风，不是地铁。是下面有什么东西在"呼吸"。',
            clue: 'clue_church_frequency',
            trustGain: 1,
            flags: ['isabella_feels_vibration'],
          },
        },
        others: {
          depth3: {
            text: '（她摇头，但犹豫了一下。）有一个夜班保安。他说他见过"穿灰色衣服的人"在地下室走动。但人事记录里没有这个人。上周……他不来了。我打他电话，是空号。',
            clue: 'clue_church_security',
            trustGain: 1,
            flags: ['isabella_security_missing'],
          },
        },
      },
      depth3: {
        trustReq: 4,
        text: '（她给你看了一张手抄的段落，墨水颜色深浅不一，像是断断续续写了很多次。）"当守门人忘记自己是谁时，门将从内部打开。"——我越来越怀疑，"守门人"不是指封印的维护者。是指封印本身。',
        clue: 'clue_isabella_church_text',
        trustGain: 1,
      },
    },
  ],

  '约书亚·布莱克': [
    {
      id: 'joshua_mission',
      label: '你的任务是什么？',
      trustReq: 2,
      depth1: {
        text: '（他看了你一眼，确认四周无人。）镇上有军事遗留资产。不能落入任何一方手中——军方、教会、深海相关方。我的工作是确保它们保持……不可用状态。',
      },
      depth2: {
        trustReq: 3,
        text: '灯塔下面有一个 bunker。军方 1958 年建的。里面有通讯设备——仍然能发出信号。我最近截获了一段加密通讯。发件地址……是灯塔 keeper 的名字。他已经三天没有上来过了。',
        clue: 'clue_joshua_bunker',
        choices: [
          { text: '问 bunker 里具体有什么', branch: 'bunker_contents', trustReq: 3 },
          { text: '问军方为什么建在灯塔下', branch: 'why_lighthouse', trustReq: 3 },
        ],
      },
      branches: {
        bunker_contents: {
          depth3: {
            text: '（他压低声音。）1958 年的档案里写了三个字："收容物"。没有更多解释。但 bunker 的电路图上有一个房间标注为"样本库"。样本。复数。军方在这里收容过……某种东西。不止一个。',
            clue: 'clue_bunker_samples',
            trustGain: 1,
            flags: ['joshua_knows_samples'],
          },
        },
        why_lighthouse: {
          depth3: {
            text: '（他冷笑。）灯塔的位置不是随机的。它建在封印的一个节点上。军方 1950 年代就知道下面有东西。他们建 bunker 不是为了"研究"——是为了"压制"。他们在封印上盖了一层混凝土。',
            clue: 'clue_bunker_seal',
            trustGain: 1,
            flags: ['joshua_knows_seal'],
          },
        },
      },
      depth3: {
        trustReq: 4,
        text: '（他递给你一把钥匙。） bunker 的备用钥匙。我守不住这个秘密太久了。但记住——一旦你下去，军方会有反应。他们不需要人来保护资产。他们只需要确保没有人知道。',
        trustGain: 1,
      },
    },
  ],

  '汤米·陈': [
    {
      id: 'tommy_supply',
      label: '你最近进的货……',
      trustReq: 2,
      depth1: {
        text: '（他压低声音。）有一批货是从海上漂过来的。包装上有奇怪的符号。我已经没有胆子再进了——但港口那边的"批发商"还在卖。',
      },
      depth2: {
        trustReq: 3,
        text: '漂过来的东西不只是货物。有盐。不是海盐——结晶形态不对。而且每包下面都压着一片碎贝壳。不是沃切斯特海滩的贝壳。是深海的。',
        choices: [
          { text: '问"批发商"是谁', branch: 'supplier', trustReq: 3 },
          { text: '问那个符号像什么', branch: 'symbol', trustReq: 3 },
        ],
      },
      branches: {
        supplier: {
          depth3: {
            text: '（他摇头。）我不知道他的名字。但他每次来都戴着一顶黑色的礼帽，帽檐压得很低。他的车上有一个瓶子——里面装着蓝色的液体。我见过一次他倒了一点在手上……然后他的手开始发光。不是反射。是自己在亮。',
            clue: 'clue_supplier_glow',
            trustGain: 1,
            flags: ['tommy_sees_supplier'],
          },
        },
        symbol: {
          depth3: {
            text: '（他画了一个圈，里面有一条波浪线。）这个。我在每个漂来的包裹上都见过。后来我在教堂的地下室也见过——刻在石头上。我不知道它是什么意思，但每次看到它，我的指甲下面就开始发痒。',
            clue: 'clue_supplier_symbol',
            trustGain: 1,
            flags: ['tommy_symbol_on_nails'],
          },
        },
      },
      depth3: {
        trustReq: 4,
        text: '（他给你看了一张从包裹里掉出来的纸片，上面只有一个词，用墨水写的，已经褪色了。）"醒"。批发商说这是"祝福"。我越来越不确定了。',
        trustGain: 1,
      },
    },
  ],

  '埃德加·洛夫克拉夫特': [
    {
      id: 'lovecraft_notebook',
      label: '你笔记本上写了什么？',
      trustReq: 2,
      depth1: {
        text: '（他合上本子，看了你三秒。）不是写出来的。是记录下来的。这座城市在每个细节上都在偏离它的本来面目。我在记"偏差"。',
      },
      depth2: {
        trustReq: 3,
        text: '昨天我在市政厅的记录里查到一个名字——"J. 沃德"。1904 年的市政文件。但伊莱亚斯·沃德今年才来的。除非……（他翻到某一页）这不是第一次有人姓沃德。上一次是 1847 年。同一个签名笔迹。',
        clue: 'clue_lovecraft_ward_name',
        choices: [
          { text: '问"偏差"的具体例子', branch: 'deviation', trustReq: 3 },
          { text: '问他怎么知道笔迹是同一个人的', branch: 'handwriting', trustReq: 3 },
        ],
      },
      branches: {
        deviation: {
          depth3: {
            text: '（他翻到某一页，指着一段文字。）"市政厅门前有一棵橡树。"——我上周去看。那里没有树。但市政厅 1904 年的照片里，树在那里。而且照片的阴影方向……和太阳的实际方向相反。不是拍摄角度问题。是方向本身。',
            clue: 'clue_deviation_oak',
            trustGain: 1,
            flags: ['lovecraft_deviation_oak'],
          },
        },
        handwriting: {
          depth3: {
            text: '（他递给你一张放大镜。）1847 年的签名和今年的签名。你看——笔画的角度完全一致。不是"相似"。是完全一致。误差在 0.01 度以内。人手写不出这种东西。这是……复制。',
            clue: 'clue_deviation_handwriting',
            trustGain: 1,
            flags: ['lovecraft_copy_signature'],
          },
        },
      },
      depth3: {
        trustReq: 4,
        text: '（他把笔记本翻到最后一页。一片空白。）有时候文字会自己消失。不是被擦掉——是被"重写"了。我昨天记录了完整的事件序列。今天早上再看——变成了别的东西。我怀疑记录本身也在被侵蚀。',
        trustGain: 1,
      },
    },
  ],
};

// Total: 7 NPCs × 1-2 threads × 3 depth levels
