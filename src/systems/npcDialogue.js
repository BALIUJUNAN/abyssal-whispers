// src/systems/npcDialogue.js - Multi-version NPC dialogue system
// Phase 7: Each NPC has 4 dialogue variants based on corruption/loop state.
// Also handles NPC fatigue/boredom at high loops and loop inheritance costs.
// DESIGN_REFACTOR_NOTES.md: infection > 50 inserts ocean/body hallucination variants.

import { selectContextualLine } from '../data/npcContextualLines.js';
import { getSanStageFromGD } from '../reducers/sanReducer.js';
/**
 * Get a contextual greeting/line for an NPC based on full game state.
 * Combines: contextual lines (trust/time/san/loop/legacy) > corruption > infection > normal.
 * Call this to get a supplementary line shown alongside the trust_layer dialogue.
 *
 * @param {string} npcName - NPC display name
 * @param {object} state - game state
 * @returns {{ text: string, tags: string[] }|null}
 */
export function getContextualLine(npcName, state, rng) {
  // Priority 1: day-specific lines (key milestone days)
  if (state.day) {
    var dayLine = getDaySpecificLine(npcName, state.day);
    if (dayLine) return { text: dayLine, tags: ['day_milestone'] };
  }

  // Priority 2: weather-reactive lines
  if (state.weather) {
    var weatherLine = getWeatherLine(npcName, state.weather);
    if (weatherLine) return { text: weatherLine, tags: ['weather'] };
  }

  // Priority 3: contextual lines (trust/time/san/loop/legacy)
  var ctx = selectContextualLine(npcName, state, null, rng);
  if (ctx) return ctx;

  // Priority 4: corruption/infection lines (existing system)
  var variant = getNpcDialogueVariant(npcName, 0, state);
  if (variant === 'infection_hallucination') {
    var infLines = NPC_INFECTION_LINES[npcName];
    if (infLines && infLines.length > 0) {
      return { text: rng ? rng.pick(infLines) : infLines[0], tags: ['infection'] };
    }
  }
  if (variant === 'heavy_corruption' || variant === 'light_corruption') {
    var corLines = (NPC_CORRUPTION_LINES[npcName] || {})[variant === 'heavy_corruption' ? 'heavy' : 'light'];
    if (corLines && corLines.length > 0) {
      return { text: rng ? rng.pick(corLines) : corLines[0], tags: ['corruption'] };
    }
  }

  return null;
}

export function getDaySpecificLine(npcName, day) {
  var dayData = NPC_DAY_SPECIFIC_LINES[npcName];
  if (!dayData) return null;
  // Check exact day match first, then nearest lower key
  if (dayData[day]) return dayData[day];
  // Find the nearest milestone day <= current day
  var keys = Object.keys(dayData).map(Number).sort((a, b) => b - a);
  for (var i = 0; i < keys.length; i++) {
    if (keys[i] <= day) return dayData[keys[i]];
  }
  return null;
}

export function getWeatherLine(npcName, weather) {
  var weatherData = NPC_WEATHER_LINES[npcName];
  if (!weatherData || !weatherData[weather]) return null;
  return weatherData[weather];
}

/**
 * Get NPC observation line based on player's SAN level.
 * NPCs notice and comment on the player's deteriorating mental state.
 * Returns the highest-tier line the player qualifies for, or null.
 */
export function getSanLevelLine(npcName, san, rng) {
  var sanData = NPC_SAN_LEVEL_LINES[npcName];
  if (!sanData) return null;
  // SAN stages: mild_erosion [55-74] → t1, perception_shift [40-54] → t2,
  //   explanation_loss [25-39] → t3, reality_dissolution [10-24] → t4, narrative_death [1-9] → t5
  var applicableTier = null;
  if (san <= 10 && sanData[5]) applicableTier = 5;
  else if (san <= 25 && sanData[4]) applicableTier = 4;
  else if (san <= 39 && sanData[3]) applicableTier = 3;
  else if (san <= 54 && sanData[2]) applicableTier = 2;
  else if (san <= 74 && sanData[1]) applicableTier = 1;
  if (!applicableTier) return null;
  var lines = sanData[applicableTier];
  if (!lines || lines.length === 0) return null;
  return rng ? rng.pick(lines) : lines[0];
}

// === Multi-Version Dialogue Selector ===
// Priority: infection > loop_recognition > heavy_corruption > light_corruption > normal

export function getNpcDialogueVariant(npcName, trustLevel, state) {
  var corruption = state.safehouseCorruption || 0;
  var loop = state.loopCount || 0;
  var san = state.san || 60;
  var infection = state.infection || 0;

  // DESIGN_REFACTOR_NOTES.md: "感染>50时，特定NPC对话插入海浪/薄膜幻觉变体"
  if (infection >= 50) return 'infection_hallucination';

  // Determine which variant to use
  var variant = 'normal';
  // P1-A: SSOT — corruption variant uses stage.level
  var _slvl = getSanStageFromGD(san).level;
  if (loop >= 5 && corruption >= 30) variant = 'loop_recognition';
  else if (corruption >= 60 || _slvl >= 4) variant = 'heavy_corruption';   // reality_dissolution
  else if (corruption >= 30 || _slvl >= 3) variant = 'light_corruption';   // explanation_loss
  else if (loop >= 3) variant = 'loop_recognition';

  return variant;
}

// NPC-specific corruption dialogue lines (per trust level)
export var NPC_CORRUPTION_LINES = {
  '玛莎·格雷': {
    light: [
      '你今天看起来……不太一样。是灯光的关系吗？',
      '你的影子刚才动了一下。不是你动的。',
      '你身上有股海腥味。你今天去过码头吗？',
    ],
    heavy: [
      '（她盯着你看了很久。然后把一杯酒推到你面前。酒是黑色的。）',
      '你不是第一个从雾里走出来的人。但你是唯一一个还在走的。',
    ],
  },
  老费舍: {
    light: ['你的皮肤颜色不太对。像在水里泡过。', '你的眼睛……你今天照过镜子吗？'],
    heavy: [
      '（他没有说话。只是把你带到了码头尽头。指着水面。水面映出的不是你的脸。）',
      '你身上有深潜者的味道。不是坏的那种。也不是好的那种。',
    ],
  },
  '希尔达·莫里斯': {
    light: ['你看起来很疲惫。走廊里的画像今天都在看你。', '你走路的姿势变了。像是在水里走路。'],
    heavy: [
      '（她站在门口等你。你还没有敲门。）你知道地下室的秘密。不是你告诉我的——是你的影子告诉我的。',
      '你的眼睛里有东西在动。不是光。是别的什么。',
    ],
  },
  '伊莎贝拉·韦伯': {
    light: ['你的手在发抖。是冷吗？还是别的？', '教堂的蜡烛今天为你亮了三根。这不正常。'],
    heavy: [
      '（她跪在圣坛前。你进来的时候，十字架转了一个角度。）你已经被标记了。不是被神——是被这个地方。',
      '你听到了吗？钟声。不是十三下。是你的名字。',
    ],
  },
  '约书亚·布莱克': {
    light: ['你看起来像是几天没睡了。或者几天没活了。', '你的伤疤……我记得上次没有那道。'],
    heavy: [
      '（他把枪放在桌上。不是对着你。是给你。）你已经不是人了。但你还在假装。这很勇敢。',
      '你的眼睛在发光。不是反光。是发光。',
    ],
  },
  '伊莱亚斯·沃德': {
    light: [
      '你的认知模式出现了偏移。有趣。请坐下来让我观察一下。',
      '你的体温比上次低了2度。这在医学上是不正常的。',
    ],
    heavy: [
      '（他把你带到镜子前。镜子里的你穿着不同年代的衣服。）你已经不是单一时间线上的存在了。',
      '你的记忆中有重叠。不是遗忘——是覆盖。有人在重写你。',
    ],
  },
  '汤米·陈': {
    light: ['你今天拍的照片……你确定那是你拍的吗？', '你的照片里多了一个影子。不是你的。'],
    heavy: [
      '（他把相机递给你。屏幕上的照片是你——但不是现在的你。是很多个你。重叠在一起。）',
      '你已经不在我的取景框里了。你在取景框的另一边。',
    ],
  },
  '埃德加·洛夫克拉夫特': {
    light: [
      '你的故事越来越有意思了。但我不确定那是故事。',
      '你说话的时候，有些词会自己改变。你注意到了吗？',
    ],
    heavy: [
      '你不是在调查沃切斯特。沃切斯特在调查你。你就是最好的素材。',
      '你已经活过了不止一次。我能从你的叙述中读出来。每次的细节都不一样。',
    ],
  },
};

// === Infection Hallucination Lines (infection >= 50) ===
// DESIGN_REFACTOR_NOTES.md: "感染>50时，特定NPC对话插入海浪/薄膜幻觉变体"
// These replace normal dialogue when infection is high.
// Player hears ocean sounds, feels webbing between fingers, sees water where there is none.
// Fuzzy references only — "海里的东西", never "深潜者".

export var NPC_INFECTION_LINES = {
  '玛莎·格雷': [
    '她递给你一杯酒。你接过来的时候，手指间有一种粘腻的感觉。像是蹼。',
    '你坐下来的时候，椅子发出的声音像海浪拍岸。她看了你一眼。\n\n「你身上有海水的味道。」',
    '她把杯子放在你面前。杯里的液体在晃动。不是因为桌子不稳——是因为液体本身在动。',
  ],
  '老费舍': [
    '他看着你的手。看了很久。\n\n「你的指甲，」他说。没有说完。\n\n你低头看了一眼。指甲的颜色确实不太对。比昨天更灰了。',
    '他把一段旧缆绳递给你。你碰到缆绳的瞬间，听到了海浪声。不是回忆——是真实的海浪声。在酒馆里。',
    '他没有说话。只是把一杯淡水推到你面前。水面上映出了你的脸。你的脸上有鳞片。你再看的时候，没有了。',
  ],
  '希尔达·莫里斯': [
    '她打开门的时候，你闻到了海的味道。从庄园里面传出来的。\n\n「你最近是不是去过码头？」她问。你没有去过。',
    '走廊里的画像今天很安静。但画像里的人的手指——你数了一下——比你上次来的时候多了一根。',
    '她带你参观一楼。经过壁炉的时候，你看到壁炉里有水。很浅的一层。水面是平静的。\n\n她没有注意到。',
  ],
  '伊莎贝拉·韦伯': [
    '教堂里的蜡烛今天是蓝色的。不是火焰的颜色——是蜡烛本身。\n\n「海盐蜡烛，」她说。「最近的供货。」',
    '她跪在圣坛前。你注意到她的影子的形状不太对。影子的手臂太长了。\n\n你眨了眨眼。影子恢复正常了。',
    '十字架上的耶稣像今天看起来不太一样。你不确定是光线的问题还是——\n\n祂的手指间有薄膜。',
  ],
  '约书亚·布莱克': [
    '他站在灯塔楼梯上看着你。你爬楼梯的时候，每一级台阶都发出水滴的声音。但台阶是干的。',
    '他把望远镜递给你。你往码头方向看了一眼。\n\n海面上有一个黑点。不是船。不是浮标。它在移动。你把望远镜还给他。他没有问你看到了什么。',
    '他的枪放在桌上。枪管上有水珠。你伸手碰了一下。是咸的。',
  ],
  '伊莱亚斯·沃德': [
    '他把你带到检查台前。\n\n「你的皮肤今天有一种……光泽，」他说。他用听诊器听了一下你的背部。\n\n「你的肺音不太对。像是有水。」',
    '他翻开笔记本。指了指一张解剖图。\n\n「你注意到了吗？人类的手指之间有蹼的痕迹。退化后的残余。」\n\n他看了你一眼。你把手放进了口袋。',
    '「你的血液检测结果……」他停顿了一下。「含盐量偏高。不是饮食能解释的那种偏高。」',
  ],
  '汤米·陈': [
    '他给你看一张照片。照片里你在码头边。你的倒影在水面上。倒影的脸上有鳃。\n\n「光线问题，」他说。你们都知道不是。',
    '他把相机递给你。你接过来的时候，相机是湿的。\n\n「刚才拍了一张海景，」他说。「海水溅到了。」\n\n你没有听到任何海浪声。',
    '他翻出一叠照片。每一张里你的手指之间的距离都在变窄。最后一张——你的手指几乎连在了一起。',
  ],
  '埃德加·洛夫克拉夫特': [
    '「你的故事里最近出现了一个新的意象，」他说。翻了翻笔记本。「海。反复出现的海。你自己注意到了吗？」',
    '他放下笔。\n\n「你说话的时候，偶尔会发出一种声音。不是辅音——是一种低频的震动。像是鲸鱼的歌声。」',
    '他看着你。然后在笔记本上写了一行字，没有让你看。\n\n「你不需要知道。但你很快就会自己发现。」',
  ],
};

// === NPC Fatigue/Boredom at High Loops ===
// NPCs become less helpful or more fearful when the player keeps coming back.

export function getNpcFatigueEffect(npcName, loopCount, state) {
  if (loopCount < 3) return null;

  var trust = (state.npcTrust || {})[npcName] || 0;

  // High loop: NPCs become wary
  if (loopCount >= 8 && trust >= 3) {
    return {
      type: 'wariness',
      text: npcName + '看着你的眼神变了。不是恐惧——是某种更复杂的东西。是认命。',
      trustModifier: -1,
    };
  }

  // Medium loop: NPCs notice repetition
  if (loopCount >= 5) {
    var fatigueLines = {
      '玛莎·格雷': '你又来了。我开始觉得你不是客人——你是这间酒馆的一部分。',
      老费舍: '海会记住所有回来的人。你是回来次数最多的。',
      '希尔达·莫里斯': '走廊里的画像已经不为你变化了。它们习惯了你。',
      '伊莎贝拉·韦伯': '教堂的钟声不再为你响了。你已经是这里的一部分了。',
      '约书亚·布莱克': '你让我想起了困在战壕里的日子。不是恐惧——是重复。',
      '伊莱亚斯·沃德': '你的轮回次数已经超出了理论值。你不再是案例——你是现象。',
      '汤米·陈': '我的相机已经存了太多你的照片。每次都不一样。每次都是你。',
      '埃德加·洛夫克拉夫特':
        '你的故事已经写了太多遍。但每一次的结局都不一样。这本身就是最好的故事。',
    };
    return {
      type: 'recognition',
      text: fatigueLines[npcName] || npcName + '看着你，像是在确认什么。',
      trustModifier: 0,
    };
  }

  return null;
}

// === Day-Specific NPC Greetings ===
// Key days trigger unique NPC reactions. These are injected during TALK_NPC.
// NOT the same as corruption variants — these are atmospheric context lines.

export var NPC_DAY_SPECIFIC_LINES = {
  '玛莎·格雷': {
    1: '第一天。你看起来很紧张。喝一杯吧。这里的酒……至少还是酒。',
    7: '今天是第七天。你有没有觉得什么不一样了？不只是钟声。是空气。',
    14: '第十四天。你看起来比上周更累了。上周你来的时候还没这样。',
    21: '第二十一天。你还在。我不知道是该感到惊讶还是……别的什么。',
    28: '今天是最后一天了。无论发生什么——你活下来了。不是吗？',
  },
  老费舍: {
    1: '新面孔。海记得你。不是今天——是你以后会变成的样子。',
    7: '第七天了。你闻到了吗？海水味比昨天近了。',
    14: '灯塔亮了。你看到了吧？它已经三年没有亮过了。',
    21: '海底的东西醒着。我能感觉到。你也该能。',
    28: '最后一天。你知道的，码头在涨潮。今天过后，栈桥可能就没了。',
  },
  '希尔达·莫里斯': {
    1: '欢迎来到沃切斯特。这个镇的墙壁比你想象的薄。',
    7: '走廊里的画像今天一直在看你。比平时更用力。',
    14: '地下室的门今天锁不上了。我没有动锁。你自己注意。',
    21: '庄园的花园里开了一种花。不是这个季节的花。我查了——它不属于任何已知的植物分类。',
    28: '最后一天。我把窗帘拉上了。不是因为外面有什么——是因为里面有什么在往外看。',
  },
  '伊莎贝拉·韦伯': {
    1: '你看起来很困惑。这很正常。沃切斯特会让所有人困惑。',
    7: '教堂的钟……你听到了吗？十四下。每一次钟响，空气里的东西就更浓一点。',
    14: '灯塔的光……你不觉得那光有问题吗？它在移动。不是扫射——是在搜索。',
    21: '封印的声音……像呼吸。像有人在你的胸腔里呼吸。你感觉到了吗？',
    28: '最后一天。教堂的门今天开了。不是我去开的。但钥匙在我口袋里。我确定我昨天锁了门。',
  },
  '约书亚·布莱克': {
    1: '新来的。小心码头。晚上不要去。',
    7: '今天别去镇北边。有些东西……爬出来了。',
    14: '灯塔的光让我整晚没睡。它不像光。像某种东西在盯着这个镇。',
    21: '地下有声音。我能听到。从教堂的方向。你听不到吗？',
    28: '最后一天了。枪我擦过了。放在枕头底下。我不知道有没有用。但至少让我的手有事可做。',
  },
  '伊莱亚斯·沃德': {
    1: '新的样本。不，不是样本——是变量。我的理论需要一个观察对象。欢迎。',
    7: '第七天。钟声。我数了——十四下加上一个无法归类的频率。存在数学上不可能的声音。',
    14: '灯塔的光……用分光仪测量的话，它的波长不在可见光谱内。至少不完全在。',
    21: '封印的呼吸频率和人类的心跳不同步。差0.3次每分钟。但如果你仔细听——你会觉得它在和你的心跳同步。',
    28: '最后一天。我的笔记写完了。我留了一页空白——给你。如果你活下来的话。写点什么。我需要知道外面是什么。',
  },
  '汤米·陈': {
    1: '新面孔！我刚来的时候也和你一样——困惑， looking up at everything。',
    7: '今天拍的照片洗出来……边缘有奇怪的反光。不是镜头的问题。镜头是干净的。',
    14: '灯塔的光……我拍了。放大后……你确定那是光吗？',
    21: '你注意到没有，你照片里的背景和你记忆中不太一样了。有些建筑在照片里更旧了。更破旧了。',
    28: '最后一天了。我把相机交给你。里面有你这些天的照片。每一张都很真实。但你仔细看——有些照片里，你不在取景框里。但你知道你在场。',
  },
  '埃德加·洛夫克拉夫特': {
    1: '新的声音。每一个来到沃切斯特的人都是一个新的声音。有些声音被记住了。有些……被吃掉了。',
    7: '钟声。十四下。我数了。每一下都有不同的回响。像每一个回声都是独立存在的。在讲述自己的故事。',
    14: '灯塔的光。它有一种语法。你花足够长的时间看它，你会发现它在写什么。它在写这个镇的名字。但这个镇的名字不在任何地图上。',
    21: '封印在呼吸。你有没有注意到——当它呼气的时候，你也在呼气？同步了。你被同化了。不是身体——是节律。',
    28: '最后一天。我写完了。不——是它写完了。我只是一支笔。最后一页送给你。但看完之后，不要再翻。有些故事一旦读完，就再也回不去了。',
  },
};

// === Weather-Reactive NPC Dialogue ===
// NPCs comment on current weather conditions.

export var NPC_WEATHER_LINES = {
  '玛莎·格雷': {
    fog: '雾比昨天大了。你出门的时候小心点。雾里的沃切斯特……不是同一个地方。',
    rain: '雨大了。雾也大了。你今天最好别去码头。雾里的码头比任何时候都远。',
    storm: '暴风雨来了。酒馆的门在晃。不是风的问题。门从里面被推。',
    clear: '难得晴天。但沃切斯特的晴天也有问题。雾散了，但阴影还在。',
  },
  老费舍: {
    fog: '雾里什么都看不见。但海里能看见你。记住这一点。',
    rain: '雨水带着盐味。海在靠近。盐味越重——它离得越近。',
    storm: '暴风雨天的码头是最危险的。不——是暴风雨天的码头后面最危险。',
    clear: '晴天。但海面太安静了。比暴风雨还安静。这种安静有问题。',
  },
  '希尔达·莫里斯': {
    fog: '庄园在雾里看起来不一样了。有些窗户在雾里亮着灯。但今天没有人开过灯。',
    rain: '雨水从地下室渗上来了。不是普通的水——比普通的水更重。更冷。',
    storm: '庄园的老墙在暴风雨里会发出声音。像有人在隔壁说话。你知道隔壁没有人。',
    clear: '晴天。走廊的画像今天表情很平静。太平静了。像是它们在等什么。',
  },
  '伊莎贝拉·韦伯': {
    fog: '雾进入教堂了。蜡烛的火焰在雾里变成蓝色。这是不好的预兆。',
    rain: '雨水带着盐分。教堂的十字架今天锈得更快了。盐在腐蚀它。',
    storm: '暴风雨中教堂的钟自己响了。没有人碰它。钟绳断了三个小时了。',
    clear: '晴天。教堂里却弥漫着一层薄雾。门关着。窗户关着。雾从哪里进来的？',
  },
  '约书亚·布莱克': {
    fog: '雾里别走镇北边。雾里的东西……不是人的东西。我知道，因为我见过。',
    rain: '雨水把脚印冲掉了。但有些东西留下了痕迹。比脚印更深。',
    storm: '暴风雨里灯塔的光还在。暴风雨前我看了一眼。光在移动。不是机器能做的移动方式。',
    clear: '晴天。但镇北的阴影比别处长。长到你走过去的时候，感觉像走了一个小时。实际上只走了五分钟。',
  },
  '伊莱亚斯·沃德': {
    fog: '雾的密度有一个异常峰值。超出气象模型的预测范围。它在聚集。有意图地聚集。',
    rain: '雨水样本异常。pH值偏低。含盐量偏高。不是海水——但接近某种古老海水的化学特征。',
    storm: '暴风雨的电磁波频谱有一个规律性的脉冲。频率和教堂的钟声一致。不是巧合——是调谐。',
    clear: '晴天的大气折射率异常。远处的东西看起来比实际更近。沃切斯特在拉近距离。',
  },
  '汤米·陈': {
    fog: '雾太厚了，相机对不上焦。但你知道什么？我拍了几张。放大后……雾里有轮廓。在看我。',
    rain: '雨把地面打湿了。反光里有些东西不该在那里。我用袖子擦了擦镜头。不是镜头的问题。',
    storm: '暴风雨里我的相机在自动拍摄。我设置了延时。但我没有设成在暴风雨里拍。它自己拍的。',
    clear: '晴天。拍了一张教堂的照片。放大看钟楼。钟楼上面的天空……比别的地方暗。不是云的暗。是别的什么。',
  },
  '埃德加·洛夫克拉夫特': {
    fog: '雾有记忆。你走进去的时候，它会记住你。然后在你出来的时候……还给你一个不一样的版本。',
    rain: '雨水的声音在变化。不是雨声。是一种语言。一种你听不懂但你越来越能听懂的语言。',
    storm: '暴风雨的声音像一支交响乐。但不是人类作曲的。在暴风雨的最低频段，有一种旋律。它在循环。',
    clear: '晴天。但影子在颤抖。不是因为风——是因为它们的内容在变化。每一个影子都是未写完的故事。',
  },
};

// === SAN-Level NPC Observations ===
// NPCs notice and comment on the player's deteriorating mental state.

export var NPC_SAN_LEVEL_LINES = {
  '玛莎·格雷': {
    1: '你今天看起来……和平常不太一样。是雾的关系吗？',
    2: '你刚才点了两遍一样的酒。你没有注意到。',
    3: '你今天看起来……不太好。要坐一会儿吗？酒我请了。',
    4: '你的眼睛在飘。你在听什么声音吗？这里没有声音。只有酒瓶的声音。',
    5: '你不记得我是谁了吗？没关系。明天你也不会记得今天发生过什么。',
  },
  老费舍: {
    1: '你今天话比较少。海上的事不顺？',
    2: '你走路的时候好像……在看什么东西。但周围什么都没有。',
    3: '你看起来像是很久没睡了。海不会等你的。',
    4: '你在和什么人说话吗？我听到你在自言自语。',
    5: '你的眼神空了一秒。不是眨眼——是更深的什么东西。海在看着你。你也在看着海。',
  },
  '希尔达·莫里斯': {
    1: '你今天进门的时候犹豫了一下。是对这里不习惯了吗？',
    2: '走廊的画像……你今天看了它们两次。上一次你看了多久？',
    3: '你看起来很疲惫。走廊的画像今天比昨天更关注你。',
    4: '你刚才走的时候撞了墙。你没有注意到吗？墙没有动。是你走歪了。',
    5: '你今天的记忆……很薄。像是水写在纸上。我能从你的眼神里看出来。',
  },
  '伊莎贝拉·韦伯': {
    1: '你今天进教堂的时候……在门口站了很久。在等什么吗？',
    2: '你手上的伤口。你记得是怎么弄的吗？',
    3: '你的手在抖。教堂里的圣水可以帮你。不是治病——是让你清醒一会儿。',
    4: '你刚才问我同一个问题两次。两次我给了你不同的答案。你都没有注意到。',
    5: '你盯着十字架看了很久。你能看到它在动吗？不是光线的问题。它在呼吸。',
  },
  '约书亚·布莱克': {
    1: '你今天看起来比昨天警觉。发现了什么？',
    2: '你刚才检查了三次出口。你很紧张。',
    3: '你看起来像三天没睡了。还是三天没活了？',
    4: '你刚才在笑。没有人在说话。我不知道你在笑什么。但我不想知道。',
    5: '你认不出我了吗？没关系。你的世界里现在有很多你不认识的东西。',
  },
  '伊莱亚斯·沃德': {
    1: '你的步态参数有0.3秒的异常延迟。不是疲劳——是别的什么。',
    2: '你今天描述事件时，时间顺序出现了微小的错位。你自己注意到了吗？',
    3: '你的反应时间今天增加了0.8秒。认知偏差在扩大。需要记录。',
    4: '你在叙述中存在矛盾。你所说的和你的行为不符。这不是谎言——是你真的相信了两件矛盾的事。',
    5: '你的存在正在变得不可靠。不是因为你疯了——是因为你在被改写。由什么改写？我正在研究。',
  },
  '汤米·陈': {
    1: '你今天拍的照片……焦点有点飘。不是镜头的问题。是你的手在抖。',
    2: '你刚才看着空白的墙壁笑了。我不知道你在看什么。但我想知道。',
    3: '你今天拍的照片……你确定那些是你拍的吗？你手里拿相机的时候眼神是空的。',
    4: '你刚才在看一面没有镜子的墙。看了十秒钟。我不知道你在看什么。',
    5: '你的记忆中有断层。不是遗忘——是缺失。有些天从你的叙述里完全消失了。',
  },
  '埃德加·洛夫克拉夫特': {
    1: '你今天叙述的时候……用了一些词。那些词不在你昨天的词汇表里。',
    2: '你刚才描述了一个不存在的地方。你相信它是存在的。',
    3: '你的叙述出现了裂隙。不是谎言的裂隙——是现实的裂隙。你在叙述一些你没有经历的事。',
    4: '你今天的叙述和昨天的叙述矛盾了。不是细节的矛盾——是根本事件的矛盾。你记得你昨天在码头吗？你的叙述说你记得。但你昨天在这里。',
    5: '你不再是一个叙述者了。你是一个被叙述的东西。由这个镇，由这个时间，由某个比你更大的故事在叙述你。',
  },
};

// === Loop Inheritance: Benefits and Costs ===
// Enhanced initLoopState additions

/**
 * @deprecated Unused — loopReducer.js has inline trust decay. Kept for reference.
 */
export function getLoopInheritanceCost(loopCount) {
  return {
    sanCapReduction: loopCount >= 5 ? Math.min(20, (loopCount - 4) * 2) : 0,
    npcTrustDecay: loopCount >= 3 ? Math.floor(loopCount / 3) : 0,
    pollutionIncrease: 0.05,
  };
}

// === NPC Trust Decay from High Loops ===
// NPCs become less trusting when the player keeps returning.

/**
 * @deprecated Unused — loopReducer.js has inline trust decay at line 117-123. Kept for reference.
 */
export function applyLoopNpcTrustDecay(state, loopCount) {
  if (loopCount < 3) return;
  var decay = Math.floor(loopCount / 3);
  if (decay <= 0) return;

  var npcs = Object.keys(state.npcTrust || {});
  for (var i = 0; i < npcs.length; i++) {
    var name = npcs[i];
    var current = state.npcTrust[name] || 0;
    if (current > 0) {
      state.npcTrust[name] = Math.max(0, current - Math.min(decay, 2));
    }
  }
}

// ═══════════════════════════════════════════════════════
// Feature 2: Difficulty-based NPC behavior
// Higher difficulty = NPCs are more guarded, trust gains are reduced
// ═══════════════════════════════════════════════════════

/**
 * Get NPC trust gain multiplier based on difficulty.
 * Level 1-3: 1.0 (normal)
 * Level 4-9: 0.8
 * Level 10-15: 0.6
 * Level 16-21: 0.4
 */
export function getDifficultyNpcTrustMultiplier(difficultyLevel) {
  if (!difficultyLevel || difficultyLevel <= 3) return 1.0;
  if (difficultyLevel <= 9) return 0.8;
  if (difficultyLevel <= 15) return 0.6;
  return 0.4;
}

/**
 * Get NPC suspicion threshold modifier based on difficulty.
 * Higher difficulty = NPCs are more likely to refuse trust escalation.
 * Returns extra trust gate requirement (0-2).
 */
export function getDifficultyNpcSuspicion(difficultyLevel) {
  if (!difficultyLevel || difficultyLevel <= 6) return 0;
  if (difficultyLevel <= 12) return 1;
  return 2;
}
