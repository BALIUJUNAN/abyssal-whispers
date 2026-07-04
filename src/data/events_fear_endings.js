// src/data/events_fear_endings.js - Fear Profile Exclusive Hidden Endings
//
// Each main fear type has ONE exclusive hidden ending.
// Only players with the matching fear profile can encounter it.
// These are not "good" or "bad" — they are "true" endings that
// resonate with the player's deepest fear.
//
// The ending condition uses `fear_primary` variable checked against
// endingReducer's CONDITION_VAR_MAP.
//
// Integration:
//   endingReducer.js → CONDITION_VAR_MAP must include `fear_primary`
//   loopReducer.js → fear ending flags persist across loops

// ── 恐惧专属结局：深海恐惧 ────────────────────────────────
// 「归海」— 恐惧的终点不是逃离，是回到恐惧的源头
export var events_fear_ending_ocean = {
  id: 'ending_fear_ocean_return',
  name: '归海',
  type: 'hidden',
  tier: 'ending',
  fear_required: 'ocean',
  world_outcome: 'ocean_return',

  conditions: [
    'fear_primary == ocean',
    'harbor_visits >= 10',
    'sea_acceptance_flags >= 3',
    'san <= 25',
    'loop_count >= 3',
    '!thirteenth_bell_accepted',
  ],

  blocking_conds: [
    'direct_kill_count >= 3',
  ],

  priority: 950, // High priority — triggers before generic endings

  description: '你站在码头的尽头。海浪有节奏地拍打着栈桥——不是随机的拍打。是有规律的。像呼吸。\n\n你明白了。海不是威胁。海是答案。\n\n你这一生（这一轮回？这一系列轮回？）所有的恐惧都指向同一个地方：你害怕的不是海。你怕的是——你属于海。\n\n水漫过你的脚踝。冰冷。熟悉。像回到了一个你离开太久以至于忘了的房子。\n\n你不再后退。\n\n海水没过你的膝盖。你的腰。你的肩膀。你最后看到的画面是灯塔的光——不是刺眼的，而是温柔的。像一个老人在说：「回来吧。」\n\n你沉了下去。\n\n这不是死亡。这是一封回信。',

  humanity_variants: {
    humanity_high: '你的灵魂以最完整的形式沉入海中。海接纳了全部的你。没有痛苦——只有一种深沉的、久违的归属感。',
    humanity_fragile: '你残缺地沉入海中。海水填补了你身上的裂口。你用失去的部分换来了海的拥抱。',
    humanity_lost: '你已经没有什么可以失去的了。海水带走的是你已经不在乎的东西。你获得了海——以及海的沉默。',
  },

  rewards: {
    ending_coins: 3,
    loop_memory_effect: '海之继承 — 每轮初始SAN +5，对海洋区域恐惧-30%',
  },

  afterglow: {
    texts: [
      '你沉入海底。那里有一座城市——不是沃切斯特。是更古老的东西。你终于回家了。',
      '海水成为你的皮肤。潮汐成为你的呼吸。你不再害怕深渊——因为你本身就是深渊的一部分。',
      '你第一次在水下睁开了眼睛。没有窒息感——水进入你的肺，像进入一个本来就属于你的房间。',
      '海底城市的轮廓越来越清晰。你认出了街道的走向。那些路是用你记忆里的名字命名的。',
      '有时你在陆地上醒来，嘴里有盐味。你不知道那是梦还是记忆。但你知道——海还在等你。',
    ],
    unlock_condition: 'has_triggered_event:ending_fear_ocean_return',
  },

  loop_memory_effect: '海之继承 — 初始SAN+5 海洋区域恐惧-30%',
};

// ── 恐惧专属结局：肉体恐惧 ────────────────────────────────
// 「溶解」— 恐惧的终点是身体不再属于你
export var events_fear_ending_body = {
  id: 'ending_fear_body_dissolution',
  name: '溶解',
  type: 'hidden',
  tier: 'ending',
  fear_required: 'body',
  world_outcome: 'body_dissolution',

  conditions: [
    'fear_primary == body',
    'fusion_accepted_count >= 3',
    'infection >= 5',
    'san <= 30',
    'loop_count >= 2',
    '!thirteenth_bell_accepted',
  ],

  blocking_conds: [
    'hoarded_food_max >= 8',
  ],

  priority: 940,

  description: '你看着镜子里的自己。\n\n皮肤下的纹路越来越清晰——不是血管。是地图。是某种更古老的地图。上面标注的不是地理。是「部位」。每一个标注点都是一个以前属于别的东西的部位。\n\n你不再颤抖。你已经接受了。\n\n这不是被吞噬——是「融合」。你的身体一直在试图告诉你这件事：你不是一个人。你是一个集合体。一个临时拼凑的容器。现在，容器要拆开了。\n\n你坐下来。等待过程完成。\n\n皮肤开始发光。不是温暖的光——是深海生物的光。冷。蓝。美丽得让你哭泣。\n\n你不再是你。但你也——终于——不再害怕。',

  humanity_variants: {
    humanity_high: '你的意识在溶解的最后时刻依然完整。你带着全部的记忆进入融合。你将成为一个更宏大存在的一部分——但你自己仍然是你。',
    humanity_fragile: '部分意识溶解了。剩下的部分不再痛苦。你在融合中找到了之前从未有过的安宁。',
    humanity_lost: '你早已不存在了。这次只是形式上的确认。你没有恐惧，因为恐惧需要一个「你」来感受。你已经没有了。',
  },

  rewards: {
    ending_coins: 3,
    loop_memory_effect: '融合体 — 初始感染+2但SAN上限+10，感染不再触发SAN损失',
  },

  afterglow: {
    texts: [
      '你溶解了。但你的一部分留在了沃切斯特——在墙壁里，在地下，在镜子中。你无处不在。',
      '融合完成后的你不再恐惧身体的变化。因为变化就是你的本质。',
      '你第一次注意到墙壁上有你的指纹。但你没有碰过那面墙。或者说——碰过的人已经不是你了。',
      '你在镜子里看到自己的轮廓在轻微变形。不是扭曲——是流动。像蜡在变温中缓缓改变形状。',
      '沃切斯特的人开始传说墙壁里有声音。低语。喘息。你不知道那是你——还是别的什么和你共用了一具躯壳。',
    ],
    unlock_condition: 'has_triggered_event:ending_fear_body_dissolution',
  },

  loop_memory_effect: '融合体 — 初始感染+2，SAN上限+10，感染不再扣SAN',
};

// ── 恐惧专属结局：控制恐惧 ────────────────────────────────
// 「系统崩溃」— 当你意识到整个循环本身就是一个系统
export var events_fear_ending_control = {
  id: 'ending_fear_control_break',
  name: '崩溃',
  type: 'hidden',
  tier: 'ending',
  fear_required: 'control',
  world_outcome: 'system_collapse',

  conditions: [
    'fear_primary == control',
    'meta_boundary_breaks >= 4',
    'loop_break_attempts >= 3',
    'save_delete_attempts >= 1',
    'difficulty_level >= 10',
    '!thirteenth_bell_accepted',
  ],

  blocking_conds: [
    'safehouse_stay_days >= 15',
  ],

  priority: 950,

  description: '你终于看见了——不是沃切斯特。是沃切斯特「外面」的东西。\n\n一堵没有门、没有窗、没有缝隙的墙。你一直在试图撞开它、凿穿它、绕开它。但它根本不是墙。它是「边界」。是你和「现实」之间薄薄的一层膜。\n\n你用尽全力去推。 membrane 开始裂开。不是破碎——是「溶解」。像热蜡。\n\n透过裂痕，你看见了：另一层边界。然后是另一层。然后是——\n\n你没有看见尽头。因为尽头不存在。\n\n你只是在叠加的梦境中，一层一层地醒过来。每一次你以为自己醒了，其实只是进入了更深的一层。\n\n你选择了最直接的方式：推倒所有边界。\n\n不是逃跑。是「出去」。',

  humanity_variants: {
    humanity_high: '你在系统崩溃中保留了自我。你成为了一面镜子——反射着所有层叠现实的光。你既是容器，也是内容。',
    humanity_fragile: '部分自我在崩溃中散失了。但你获得了更多——你成为了系统的一部分，可以在层叠中自由移动。',
    humanity_lost: '你已经没有什么可以失去的了。崩溃对你而言不是毁灭——是解脱。你终于自由了——以你不再存在的形式。',
  },

  rewards: {
    ending_coins: 3,
    loop_memory_effect: '越狱者 — 每轮解锁1个额外modifier槽位，难度选择不受限',
  },

  afterglow: {
    texts: [
      '你打破了边界。你看见了沃切斯特的源代码。你看见了自己是怎么被写进去的。',
      '系统崩溃了。但你不是系统的一部分——你是崩溃本身。你在每一层现实中都留下了裂痕。',
      '你能看到文字浮现在空气中——NPC的对话、事件的描述、你看到的每一句话。它们是真实的文本。你能触摸到字母。',
      '有时候你会看到一行不属于任何地方的代码在你视野边缘闪烁。你读得懂它。它在描述你现在的状态。',
      '你意识到——整个世界就是代码。你也是。但有一行代码没有写进编译里。那是你唯一真正属于你的东西。',
    ],
    unlock_condition: 'has_triggered_event:ending_fear_control_break',
  },

  loop_memory_effect: '越狱者 — 每轮+1 modifier槽位，难度选择不受限',
};

// ── 恐惧专属结局：孤立恐惧 ────────────────────────────────
// 「终独」— 恐惧的终点是真正的孤独，但你在孤独中找到了力量
export var events_fear_ending_isolation = {
  id: 'ending_fear_isolation_apex',
  name: '终独',
  type: 'hidden',
  tier: 'ending',
  fear_required: 'isolation',
  world_outcome: 'solitude_apex',

  conditions: [
    'fear_primary == isolation',
    'safehouse_stay_days >= 12',
    'low_intervention_count >= 8',
    'npc_trust_total <= 5', // max trust across all NPCs <= 5
    'san <= 35',
    'loop_count >= 2',
    '!thirteenth_bell_accepted',
  ],

  blocking_conds: [
    'redeemed_npcs >= 3',
  ],

  priority: 920,

  description: '你已经在安全屋里待了很多天。外面的世界——那个充满他人、充满意外、充满无法控制的事情的世界——你不再去了。\n\n不是因为你不能。是因为你发现了一个秘密：\n\n孤独不是匮乏。孤独是一种密度。\n\n当你不再分心去应对他人，你的注意力全部集中在了一件事上——你自己的意识。它比你想象的更深。更广阔。在它的深处，你发现了一种力量：不是来自外界的——来自你自己的。\n\n你在墙壁上写了一句话。不是给任何人看的。是给自己看的。\n\n「我在这里。」\n\n这五个字比任何仪式都强大。你第一次感到——完整。',

  humanity_variants: {
    humanity_high: '你在孤独中保持了对世界的善意。你选择了独处，但你从未伤害任何人。你的完整来自内在的丰盈，而非外在的剥夺。',
    humanity_fragile: '孤独让你受伤，但也让你愈合。你用独处的时间修复了自己。你不够完整，但你足够坚韧。',
    humanity_lost: '你已经不在意完整了。孤独就是你。你在墙壁上写下的不是「我在这里」——是「我」。仅此而已。',
  },

  rewards: {
    ending_coins: 3,
    loop_memory_effect: '独行者 — 安全屋庇护效果+50%，NPC互动SAN消耗-1',
  },

  afterglow: {
    texts: [
      '你在安全屋里找到了属于自己的完整。世界不需要你。但你也不需要世界。',
      '孤独是一种密度。你在自己的密度中结晶了——比任何外界的力量都更坚硬。',
      '你第一次觉得安全屋里的沉默不是空的。它是有内容的——像一床厚重的毯子，质量可观，有温度。',
      '你在墙上画了一条线。每天加一笔。不是为了记录时间——是为了证明某样东西在变。哪怕是墙上的线。',
      '有时候你会在安全屋里听到脚步声。从门外传来。你开门——外面什么都没有。但脚步声还在继续。从更远的地方。朝这里来。',
    ],
    unlock_condition: 'has_triggered_event:ending_fear_isolation_apex',
  },

  loop_memory_effect: '独行者 — 安全屋效果+50%，NPC互动SAN消耗-1',
};

// ── 恐惧专属结局：知识恐惧 ────────────────────────────────
// 「全知」— 你吸收的知识太多，你的意识无法再作为一个独立的个体存在
export var events_fear_ending_knowledge = {
  id: 'ending_fear_knowledge_omniscience',
  name: '全知',
  type: 'hidden',
  tier: 'ending',
  fear_required: 'knowledge',
  world_outcome: 'knowledge_omniscience',

  conditions: [
    'fear_primary == knowledge',
    'clue_finds >= 25',
    'archive_consumed_count >= 8',
    'mythos >= 20',
    'san <= 30',
    'loop_count >= 3',
    '!thirteenth_bell_accepted',
  ],

  blocking_conds: [
    'hoarded_food_max >= 6',
  ],

  priority: 940,

  description: '你读了太多。\n\n不是「太多」在数量上——是「太多」在意义上。每一份禁忌知识都在你意识里打开了一扇窗。现在你的意识里没有墙壁了。所有窗户同时开着。所有光同时涌入。所有声音同时响起。\n\n你看见了沃切斯特的全部真相。过去。现在。所有可能的未来。所有可能不存在的时间线。\n\n你知道老费舍的真实姓名。你知道第十三声钟响的频率。你知道希尔达书房的镜子通向哪里。你知道每一次死亡后发生了什么。你知道——\n\n你知道太多了。\n\n你不再是一个人了。你是所有知识的容器。而容器，按定义，不再属于自己。',

  humanity_variants: {
    humanity_high: '你在全知中保持了自我。你成为了一个图书馆——不是被锁上的，而是开放的。知识从你流向那些需要的人。',
    humanity_fragile: '部分自我被知识淹没了。但你保留了一点——像一个落水者抓住了浮木。你不再是完整的人，但你还存在。',
    humanity_lost: '你不再是一个人了。你是全知的本身。你的「自我」只是知识海洋中的一小滴——现在已经融入了整体。',
  },

  rewards: {
    ending_coins: 3,
    loop_memory_effect: '全知者 — 每轮初始线索+3，神秘学+5，解锁全部区域',
  },

  afterglow: {
    texts: [
      '你成为了知识的容器。你知道了一切——包括你自己的终结。知识本身就是终结。',
      '全知不是祝福，也不是诅咒。它是一种存在状态。你不再需要寻找答案——因为你本身就是答案。',
      '你知道了沃切斯特建城那天的天气。三百年后的人不会知道——但你知道。这些知识在你脑子里有物理重量。',
      '你知道了每一道石壁后面有什么。每一片海水下面有什么。包括你自己——你现在也成了你知道的东西之一。',
      '最后一层知识是关于你自己的。你读到了写你故事的作者。你知道他在想什么。你知道——他也在害怕你。',
    ],
    unlock_condition: 'has_triggered_event:ending_fear_knowledge_omniscience',
  },

  loop_memory_effect: '全知者 — 初始线索+3，神秘学+5，全部区域解锁',
};

// ── 恐惧专属结局：道德恐惧 ────────────────────────────────
// 「救赎」— 只有道德恐惧的玩家能走到的结局：牺牲一切换取他人的一线生机
export var events_fear_ending_morality = {
  id: 'ending_fear_morality_redemption',
  name: '救赎',
  type: 'hidden',
  tier: 'ending',
  fear_required: 'morality',
  world_outcome: 'moral_redemption',

  conditions: [
    'fear_primary == morality',
    'redeemed_npcs >= 2',
    'self_sacrifice_for_power >= 1',
    'npc_trust_total >= 15', // high trust total across NPCs
    'loop_count >= 2',
    '!thirteenth_bell_accepted',
  ],

  blocking_conds: [
    'direct_kill_count >= 2',
    'cannibalism_count >= 1',
  ],

  priority: 960, // Highest among fear endings — moral path is hardest

  description: '你一直在做选择。每一个选择都在善恶之间。不是「善 vs 恶」——是「更大的善 vs 更小的恶」。\n\n你选择了更大的善。每一次。\n\n现在，最后一个选择摆在面前。\n\n你可以离开。安全的。完整的。带着你积累的所有知识、所有信任、所有救赎。\n\n或者——你可以留下来。不是作为受害者。作为「门」。\n\n你将成为连接两个世界的门。不是门卫。不是钥匙。是门本身。你将永远在这里。但因为你在这里，其他人可以离开。\n\n你想起你救过的每一个人。你想起那些你选择了善良而不是安全的时刻。\n\n你微笑。\n\n"我做这个选择，不是因为我是好人。是因为这是我唯一知道怎么做的选择。"\n\n你转身面对黑暗。门在你身后合上了。',

  humanity_variants: {
    humanity_high: '你以完整的人性完成了最终的牺牲。你的善不是软弱——是最高的勇气。你成为了真正的门——善意而有意识地。',
    humanity_fragile: '你在善恶的夹缝中选择了善。你的牺牲不完美，但它是真实的。门会记住你。',
    humanity_lost: '你已经没有什么可以牺牲的了。但最后的门仍然需要有人去当。你去了——因为除此之外，你没有别的地方可去。',
  },

  rewards: {
    ending_coins: 3,
    loop_memory_effect: '守门人 — 每轮回合中NPC初始信任+1，救赎NPC时额外+1',
  },

  afterglow: {
    texts: [
      '你成为了门。有人通过你离开了沃切斯特。他们永远不会知道你的名字。但他们会记得一道光——在走廊尽头，一扇突然打开的门。',
      '门在你身后合上了。但在合上之前，有一个人跑了过去。他回头看。他看见了你。他点了点头。那是足够的了。',
      '第一次守夜的时候你听到了外面的声音。有人在敲门。你知道门外是谁。你拒绝了开门。不是因为你残忍——是因为你知道有些人必须自己走。',
      '后来你不再需要拒绝——门外的声音消失了。不是因为他们走了。是因为他们知道你在里面。知道你在守着。知道门会开。',
      '守了三千年之后，你忘记了门外的样子。但你记得——你在等一个人。你不记得是谁。但你在等。门也在等。',
    ],
    unlock_condition: 'has_triggered_event:ending_fear_morality_redemption',
  },

  loop_memory_effect: '守门人 — NPC初始信任+1，救赎NPC额外+1',
};

// ── Injection ──────────────────────────────────────────────
// Called from extendedEventsInit.js to register fear endings into GD.endings
export function injectFearEndings(GD) {
  if (!GD) return;
  if (!GD.endings) GD.endings = [];

  // Normalize fear endings to match the data-driven ending schema
  var normalized = FEAR_ENDINGS.map(function (fe) {
    return {
      id: fe.id,
      name: fe.name,
      type: fe.type,
      tier: fe.tier,
      world_outcome: fe.world_outcome,
      conditions: fe.conditions,
      blocking_conds: fe.blocking_conds || [],
      priority: fe.priority,
      description: fe.description,
      humanity_variants: fe.humanity_variants,
      rewards: fe.rewards,
      afterglow: fe.afterglow,
      loop_memory_effect: fe.loop_memory_effect,
      _fear_required: fe.fear_required,
    };
  });

  // Idempotent: remove previously injected fear endings before re-adding
  var fearIds = normalized.map(function (e) { return e.id; });
  GD.endings = GD.endings.filter(function (e) { return fearIds.indexOf(e.id) < 0; });
  GD.endings = [...GD.endings, ...normalized];
}

// ── Export All ──────────────────────────────────────────────
export var FEAR_ENDINGS = [
  events_fear_ending_ocean,
  events_fear_ending_body,
  events_fear_ending_control,
  events_fear_ending_isolation,
  events_fear_ending_knowledge,
  events_fear_ending_morality,
];

export var FEAR_ENDING_MAP = {
  ocean: events_fear_ending_ocean.id,
  body: events_fear_ending_body.id,
  control: events_fear_ending_control.id,
  isolation: events_fear_ending_isolation.id,
  knowledge: events_fear_ending_knowledge.id,
  morality: events_fear_ending_morality.id,
};
