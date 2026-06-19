// src/systems/fearLens.js - 恐惧镜头系统
// 通过前传画像微调本体体验：事件权重、文本镜头、NPC回应、meta污染方向

/**
 * 恐惧类型 → 事件标签权重映射
 * primary: +20%~+30%, secondary: +8%~+15%, coping: +5%~+10%
 */
export const FEAR_TAG_MAP = {
  ocean: [
    'harbor_district',
    'lighthouse',
    'water',
    'drowning',
    'tide',
    'salt',
    'sea',
    'harbor_deep',
  ],
  body: ['fusion', 'wound', 'vessel', 'infection', 'flesh', 'mirror', 'possession'],
  control: ['meta', 'save', 'system', 'clock', 'map', 'locked_door', 'bell', 'thirteenth'],
  isolation: ['npc_missing', 'betrayal', 'empty_room', 'safehouse', 'alone', 'silent'],
  knowledge: ['mythos', 'book', 'forbidden', 'library', 'truth', 'clue', 'archive'],
  morality: ['humanity', 'food_choice', 'sacrifice', 'children', 'npc_help', 'redemption'],
};

export const COPING_TAG_MAP = {
  avoidant: ['safe', 'retreat', 'ignore', 'close_eyes'],
  investigative: ['clue', 'examine', 'search', 'investigate'],
  social: ['npc', 'talk', 'trust', 'ally'],
  controlling: ['lock', 'map', 'system', 'order'],
  sacrificial: ['sacrifice', 'give', 'share', 'endure'],
  predatory: ['attack', 'steal', 'exploit', 'manipulate'],
};

/**
 * 从事件对象中提取所有可匹配的关键词（不可变，不修改 event）。
 * 读取 tags / type / subtype / event_classification / trigger.areas。
 *
 * @param {object} event
 * @returns {string[]} 小写关键词数组
 */
export function extractEventKeywords(event) {
  const tags = event.tags || [];
  const type = event.type || event.event_classification || '';
  const subtype = event.subtype || '';
  const areas = (event.trigger && event.trigger.areas) || [];
  return [...tags, type, subtype, ...areas].map((s) => String(s).toLowerCase());
}

/**
 * 检查事件关键词是否匹配给定的 fear/coping 标签列表。
 *
 * @param {string[]} keywords  - extractEventKeywords 的输出
 * @param {string[]} tagList   - FEAR_TAG_MAP[key] 或 COPING_TAG_MAP[key]
 * @returns {boolean}
 */
export function keywordsMatchTagList(keywords, tagList) {
  return keywords.some((kw) => tagList.some((tag) => kw.includes(tag) || tag.includes(kw)));
}

/**
 * 根据前传画像计算事件的权重修正倍率。
 * 同时读取 tags / type / subtype / trigger.areas。
 *
 * @param {object} event - 事件对象
 * @param {object} state - 游戏state（含fearTuning）
 * @returns {number} 权重倍率（1.0 = 无变化）
 */
export function getFearEventWeightModifier(event, state) {
  const tuning = state.fearTuning;
  if (!tuning || (!tuning.primary && !tuning.coping)) return 1.0;

  const keywords = extractEventKeywords(event);
  if (keywords.length === 0) return 1.0;

  let modifier = 1.0;

  // Primary fear: +25%
  if (tuning.primary) {
    const primaryTags = FEAR_TAG_MAP[tuning.primary] || [];
    if (keywordsMatchTagList(keywords, primaryTags)) modifier += 0.25;
  }

  // Secondary fear: +12%
  if (tuning.secondary) {
    const secondaryTags = FEAR_TAG_MAP[tuning.secondary] || [];
    if (keywordsMatchTagList(keywords, secondaryTags)) modifier += 0.12;
  }

  // Coping style: +8%
  if (tuning.coping) {
    const copingTags = COPING_TAG_MAP[tuning.coping] || [];
    if (keywordsMatchTagList(keywords, copingTags)) modifier += 0.08;
  }

  return modifier;
}

/**
 * 恐惧镜头文本库
 * 在某些事件中追加1-2句倾向相关文本，不改变事件效果
 */
export const FEAR_LENSE_TEXTS = {
  ocean: [
    '你闻到一点盐味。这里离海并不近。',
    '窗玻璃上有一道水痕。外面没有下雨。',
    '你的鞋底是湿的。你不记得踩过水坑。',
    '远处传来一声汽笛。这个方向不应该有港口。',
    '空气里有一种潮湿的重量，像是海底的压强正在慢慢渗上来。',
  ],
  body: [
    '袖口贴着皮肤，像是下面多了一层不属于你的脉搏。',
    '你低头看了一眼自己的手。指甲比昨天长了一点。',
    '你吞咽的时候，喉咙里有一种异物感。不是食物。更像是一个字。',
    '你的影子在墙上，但影子的手指比你多一根。',
    '你弯腰的时候，脊椎发出了一声你没听过的声响。',
  ],
  control: [
    '你又数了一遍门锁。数字没有变。但你不放心。',
    '你下意识地把物品排成一列。它们本来就是整齐的。但你还是重新排了一遍。',
    '你看了一眼手表。秒针停了一拍，然后追上了它落下的那一秒。',
    '你的笔记本翻到了你没翻到的那一页。',
    '你把今天经过的路线在脑子里又走了一遍。没有错。但总觉得少拐了一个弯。',
  ],
  isolation: [
    '你下意识看向身后。没有人。',
    '走廊很安静。安静到你能听到自己的心跳。不是你的心跳。',
    '你数了一下房间里的人。只有你。但椅子有两把。',
    '门关着。你确认过了。但你还是又看了一眼。',
    '你听到脚步声。等你停下来听的时候，脚步声也停了。',
  ],
  knowledge: [
    '你知道自己不该继续读。但你的眼睛已经先读完了下一行。',
    '你翻笔记本的时候，有一页的内容你完全不记得写过。',
    '你的脑子里多了一个词。你不知道它是什么意思。但你知道它很重要。',
    '你路过一面墙，墙上的涂鸦里有一个符号。你认识它。你不应该认识它。',
    '你闭上眼睛的时候，眼皮后面出现了一行字。你睁开眼就忘了。但你知道它在那里。',
  ],
  morality: [
    '你想起昨夜那扇门后的声音。你当时没有开门。',
    '你路过一个垃圾桶。里面有一个完整的面包。你走过去了。然后你回来了。',
    '你的口袋里有三枚硬币。你不确定它们是你挣的还是你拿的。',
    '你听到有人在哭。你分辨不出方向。',
    '你看到自己的倒影。倒影的表情和你不一样。',
  ],
};

/**
 * 判断事件是否适合追加恐惧镜头文本。
 * 三重过滤：type/subtype 白名单 → fear-tag 匹配 → 概率。
 *
 * @param {object} event  - 事件对象
 * @param {object} tuning - { primary, secondary, coping }
 * @returns {boolean}
 */
export function isEligibleForFearLens(event, tuning) {
  // --- 第一层：type / subtype 白名单 ---
  const eligibleTypes = [
    'area_event',
    'mythos',
    'resource',
    'humanity',
    'meta',
    'silent',
    'prologue',
    'area_deep',
    'npc_cross',
    'loop_locked',
    '超自然遭遇',
    '环境异常',
    '线索',
    'NPC事件',
    'NPC互动',
    '调查',
    '轻微异常',
    '神秘事件',
  ];
  const eligibleSubtypes = [
    'tutorial_san',
    'tutorial_humanity',
    'tutorial_clue',
    'area_explore',
    'npc_interaction',
    'resource_pressure',
    'area_deep',
    'resource_pressure',
    'loop_locked',
    'npc_cross',
  ];

  const evtType = (event.type || event.event_classification || '').toLowerCase();
  const evtSubtype = (event.subtype || '').toLowerCase();

  const typeMatch = eligibleTypes.some((t) => evtType.includes(t.toLowerCase()));
  const subtypeMatch = eligibleSubtypes.some((st) => evtSubtype.includes(st.toLowerCase()));

  if (!typeMatch && !subtypeMatch) return false;

  // --- 第二层：事件 tags 与 tuning 的恐惧类型是否相关 ---
  // 即使 type 通过了白名单，如果事件内容和玩家的恐惧完全无关，也不追加
  const tags = event.tags || [];
  const areas = (event.trigger && event.trigger.areas) || [];
  const searchable = [...tags, ...areas, evtType, evtSubtype];

  const fearTagMap = {
    ocean: ['harbor', 'water', 'drowning', 'tide', 'salt', 'sea', 'lighthouse'],
    body: ['fusion', 'wound', 'vessel', 'infection', 'flesh', 'mirror', 'possession'],
    control: ['meta', 'save', 'system', 'clock', 'map', 'locked', 'bell'],
    isolation: ['npc_missing', 'betrayal', 'empty', 'safehouse', 'alone', 'silent'],
    knowledge: ['mythos', 'book', 'forbidden', 'library', 'truth', 'clue', 'archive'],
    morality: ['humanity', 'food', 'sacrifice', 'children', 'npc_help', 'redemption'],
  };

  const primaryTags = fearTagMap[tuning.primary] || [];
  // 如果事件没有任何与 primary fear 相关的关键词，跳过
  // 但 prologue 类型的事件始终通过（因为前传本身就是恐惧测试）
  if (evtType !== 'prologue' && tags.length > 0) {
    const hasMatch = searchable.some((s) => primaryTags.some((pt) => s.toLowerCase().includes(pt)));
    if (!hasMatch) return false;
  }

  return true;
}

/**
 * 应用恐惧镜头文本
 * 在事件文本后追加1句倾向相关文本
 * @param {object} event - 事件
 * @param {string} text - 原始文本
 * @param {object} state - 游戏state
 * @returns {string} 追加了镜头文本的文本
 */
export function applyFearLens(event, text, state, rng) {
  const tuning = state.fearTuning;
  if (!tuning || !tuning.primary) return text;

  // 类型过滤（硬性）
  if (!isEligibleForFearLens(event, tuning)) return text;
  var _rand = rng ? rng.next.bind(rng) : Math.random;

  // 概率触发（避免每次都出现）
  if (_rand() > 0.3) return text;

  const lensTexts = FEAR_LENSE_TEXTS[tuning.primary];
  if (!lensTexts || lensTexts.length === 0) return text;

  const lensText = lensTexts[Math.floor(_rand() * lensTexts.length)];

  return text + '\n\n' + lensText;
}

/**
 * NPC对前传画像的侧面回应
 * NPC不直接说"你害怕什么"，只观察玩家行为
 * @param {string} npcName - NPC名字
 * @param {object} state - 游戏state
 * @returns {string|null} NPC台词，或null（无回应）
 */
export function getFearNpcLine(npcName, state, rng) {
  const tuning = state.fearTuning;
  if (!tuning || !tuning.primary) return null;
  var _rand = rng ? rng.next.bind(rng) : Math.random;

  // 只在特定NPC上触发，且每次对话最多一次（10%概率）
  if (_rand() > 0.1) return null;

  const lines = {
    老费舍: {
      ocean: '你看海的时候，总是先避开水面。',
      body: '你走路的时候，左手一直握着右手的手腕。你自己没注意到吧。',
      control: '你每次进门之前都会停一下。在数什么？',
      isolation: '你总是一个人来码头。但你每次来都会先看看有没有别人。',
      knowledge: '你翻过那些旧航海日志了吧。你的眼神变了。',
      morality: '码头上那些流浪汉，你每次都绕着走。不是因为害怕——是因为不知道该不该帮。',
    },
    '汤米·陈': {
      ocean: '你拍的照片里，每一张都有水。你自己选的。',
      body: '你上次来店里，一直在摸自己的脖子。那里有什么？',
      control: '你在我店里待了四十分钟。你在数货架上的罐头。你以为我没注意到？',
      isolation: '你总是一个人。你有朋友吗？不是沃切斯特的人——是以前的。',
      knowledge: '你问的那些问题，不像是在调查。更像是在确认什么。',
      morality: '你上次走的时候，门口那个乞丐还在。你走了二十步又回来了。给了他什么？',
    },
    '玛莎·格雷': {
      ocean: '你每次看海都皱眉。不是讨厌。是怕。',
      body: '你照镜子的时间太长了。你以为我没注意到？',
      control: '你点酒的时候总要确认三遍。"是这个杯子？这个位置？"',
      isolation: '酒吧里有人的时候，你反而更安静。',
      knowledge: '你读那些旧报纸的速度太快了。不像是在找线索。像是在找自己。',
      morality: '你问过我"这个地方的人过得好不好"。没有人这样问过。',
    },
    '伊莱亚斯·沃德': {
      ocean: '你不是怕海。你是怕海下面的东西。准确地说——是怕海下面那个和你长得很像的东西。',
      body: '你照镜子的时候，看到的是自己还是别人？不要回答。我不想知道。',
      control: '你想要秩序。你想要每件事都有原因。但这个地方不是这样的。',
      isolation: '你选择独处不是因为喜欢安静。是因为你不确定别人是不是真的在那里。',
      knowledge: '你不是想活下来。你是想知道为什么会死。',
      morality: '你在犹豫。你一直在犹豫。这个镇上的每一个选择都像是道德测试。你已经发现了。',
    },
  };

  const npcLines = lines[npcName];
  if (!npcLines) return null;

  return npcLines[tuning.primary] || null;
}

/**
 * meta污染方向：根据前传画像决定UI污染的攻击方向
 * @param {object} state - 游戏state
 * @param {string} baseText - 原始系统文本
 * @param {number} layer - 腐败层级(0-4)
 * @returns {string} 可能被污染的文本
 */
export function applyFearCorruption(state, baseText, layer, rng) {
  const tuning = state.fearTuning;
  if (!tuning || !tuning.primary || layer <= 0) return baseText;
  var _rand = rng ? rng.next.bind(rng) : Math.random;
  if (_rand() > 0.2) return baseText; // 20%触发率

  const corruptions = {
    ocean: [
      '（潮声。不是这里应该有的潮声。）',
      '（你的存档里多了一行盐渍。）',
      '（地图边缘出现了你没画过的海岸线。）',
      '（港口日志上有一滴水。你没有打翻任何东西。）',
    ],
    body: [
      '（你的HP栏在跳动。不是数字在变——是栏位本身在呼吸。）',
      '（药品描述变了。你确定它写的是"碘酒"吗？再看一遍。）',
      '（你的SAN值旁边多了一个小点。那个点在移动。）',
      '（镜子。你房间里有一面镜子。你什么时候放的？）',
    ],
    control: [
      '（存档文件名多了一个字符。你没有输入那个字符。）',
      '（AP数值是12。你数了三遍。但屏幕上的12看起来不对。）',
      '（系统提示说"正常"。你检查了五遍。它还是说"正常"。）',
      '（你的存档时间比你的手表快了三秒。）',
    ],
    isolation: [
      '（NPC列表里多了一个名字。那个名字是你的。）',
      '（安全屋的门锁从里面锁上了。你没有锁它。）',
      '（对话记录里有一段你没说过的话。说话人是你。）',
      '（你的存档里只有你一个人的足迹。但应该有两个人。）',
    ],
    knowledge: [
      '（线索日志里有一条你没写过的线索。内容是一个问题："你确定你在读这段文字吗？"）',
      '（禁书的最后一页自动翻到了你正在看的这一页。）',
      '（图书馆的索引卡上出现了你的名字。借阅日期是明天。）',
      '（你的笔记本里多了一段注释。字迹是你的。但你没有写过。）',
    ],
    morality: [
      '（人性值在闪烁。数字没有变。但它的颜色在变。）',
      '（你看到三天前的选择记录。你记得当时选了A。但记录上写的是B。）',
      '（资源列表里多了一样东西。你不确定那是食物还是别的什么。）',
      '（系统回放了你第一天的某个选择。你没有要求它回放。）',
    ],
  };

  const pool = corruptions[tuning.primary];
  if (!pool || pool.length === 0) return baseText;

  return baseText + '\n' + pool[Math.floor(_rand() * pool.length)];
}
