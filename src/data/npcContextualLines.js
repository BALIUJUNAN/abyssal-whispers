// src/data/npcContextualLines.js - Expanded NPC contextual dialogue
// 8 NPCs, ~170 lines. Support: trust, time, san, loop, items, area, death legacy

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
    { text: '（他看了看你。然后在笔记本上写了一行字，没有让你看。）', conditions: {trust_max: 1}, priority: 2, tags: ['silence'] },
    { text: '「你的档案里多了一条记录。死亡原因：……」他没有读完。「你不需要知道细节。」', conditions: {died_last_run: true}, priority: 6, tags: ['legacy'] },
    { text: '「你的血液检测结果……」他停顿了一下。「含盐量偏高。不是饮食能解释的那种偏高。」', conditions: {san_below: 45}, priority: 5, tags: ['san'] },
    { text: '「你手上的伤疤……你确定是今天才有的吗？它的愈合程度不对。」', conditions: {san_below: 35}, priority: 5, tags: ['san'] },
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
    { text: '（他看了你一眼。然后在笔记本上画了一条线。划掉了什么。）', conditions: {trust_max: 0}, priority: 2, tags: ['silence'] },
    { text: '「你回来了。」他翻了翻笔记本。「上次的故事……你没有读完。结局是——」他停住了。最后一页是空白的。不。有一滴血。', conditions: {died_last_run: true}, priority: 6, tags: ['legacy'] },
    { text: '「你说话的时候，有些词会自己改变。你注意到了吗？」', conditions: {san_below: 35}, priority: 5, tags: ['san'] },
    { text: '（他放下笔。）「你说话的时候，偶尔会发出一种声音。不是辅音——是一种低频的震动。像是鲸鱼的歌声。」', conditions: {san_below: 30}, priority: 5, tags: ['san'] },
  ],
};

// Total: 143 lines across 8 NPCs
