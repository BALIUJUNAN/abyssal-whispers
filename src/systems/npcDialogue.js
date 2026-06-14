// src/systems/npcDialogue.js - Multi-version NPC dialogue system
// Phase 7: Each NPC has 4 dialogue variants based on corruption/loop state.
// Also handles NPC fatigue/boredom at high loops and loop inheritance costs.
// DESIGN_REFACTOR_NOTES.md: infection > 50 inserts ocean/body hallucination variants.

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

// === Loop Inheritance: Benefits and Costs ===
// Enhanced initLoopState additions

export function getLoopInheritanceCost(loopCount) {
  return {
    // SAN max permanent decrease: -2 per loop after loop 5
    sanCapReduction: loopCount >= 5 ? Math.min(20, (loopCount - 4) * 2) : 0,
    // NPC trust decay: -1 per 3 loops
    npcTrustDecay: loopCount >= 3 ? Math.floor(loopCount / 3) : 0,
    // Pollution increase: +5% per loop
    pollutionIncrease: 0.05,
  };
}

// === NPC Trust Decay from High Loops ===
// NPCs become less trusting when the player keeps returning.

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
