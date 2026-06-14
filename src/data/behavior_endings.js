// src/data/behavior_endings.js - 36 behavioral / abnormal endings
// Each with 3 humanity_variants. Injected into GD.endings via injectBehaviorEndings().
// Priority: higher = checked first. Behavioral endings (700-950) outrank main endings.

import { parseConditionString } from '../reducers/endingReducer.js';

export const BEHAVIOR_ENDINGS = [
  // =====================================================================
  // 自我毁灭与融合类 (Self-Destruction & Fusion) — 6 endings
  // =====================================================================

  {
    id: 'ending_self_harm_ritual',
    name: '裂痕',
    type: 'behavior',
    world_outcome: 'behavior_self_ritual',
    conditions: ['self_harm_ritual_count >= 3'],
    blocking_conds: [],
    priority: 210,
    override_category: 'annotation',
    humanity_variants: {
      humanity_high:
        '你用刀在自己身上画了一个符号。\n\n不是因为你信它。是因为你想知道疼不疼。\n\n它疼。但符号在皮肤上停留的时间比疼痛更久。\n\n你画了第二个。第三个。\n\n——\n\n安全屋的镜子里有一个人。身上写满了你不认识的字。\n你凑近看。那些字不是写的。是疤痕。',
      humanity_fragile:
        '你开始用血做记号。\n\n第一刀是试探。第二刀是确认。第三刀——\n\n第三刀的时候你已经不需要理由了。\n\n——\n\n你的袖口有洗不掉的锈色。你告诉别人那是墨水。',
      humanity_lost:
        '你发现身体是画布。\n\n每一道伤口都是一个音节。你在拼写一个名字。\n\n你不知道那是谁的名字。但你的手知道怎么拼。\n\n——\n\n有人发现一本沾了血的笔记本。每一页都画着同一个符号。\n没有人认出那个符号。但每个人都说看着它的时候会头晕。',
    },
    design_intent: '反复自残仪式行为。身体变成书写媒介。',
  },

  {
    id: 'ending_dissolution',
    name: '溶盐者',
    type: 'behavior',
    world_outcome: 'behavior_self_dissolve',
    conditions: ['fusion_accepted_count >= 2', 'harbor_visits >= 5'],
    blocking_conds: [],
    priority: 820,
    override_category: 'irreversible_transform',
    humanity_variants: {
      humanity_high:
        "你感觉到了边界。\n\n在此之前，你一直以为'自己'是一个完整的、封闭的东西。\n\n现在你知道不是。边界是可渗透的。空气穿过你。水穿过你。雾——\n\n雾一直在穿过你。只是你以前没有注意到。\n\n——\n\n安全屋的地板上有一滩水。水的温度和你一样。",
      humanity_fragile:
        '你不确定自己是什么时候开始溶解的。\n\n也许是某天夜里。也许是某次触碰。\n\n你的手指在水里泡得太久了。皮肤发白。边缘模糊。\n\n——\n\n你试着握住一支笔。笔从你的手指间穿过。你的手还在。笔也是。\n只是它们不再彼此接触了。',
      humanity_lost:
        '你不是被消灭的。你是被稀释的。\n\n你主动打开了边界。你让它进来。你让它把你拆开——不是暴力地拆。是慢慢地、一层一层地。\n\n像是盐溶进水里。\n\n——\n\n水杯放在桌上。水是清澈的。没有人尝过。',
    },
    design_intent: '主动接受海水/盐化/溶解污染。码头和海相关事件多是触发前提。',
  },

  {
    id: 'ending_vessel',
    name: '容器',
    type: 'behavior',
    world_outcome: 'behavior_self_vessel',
    conditions: ['possession_accepted_count >= 1 OR fusion_accepted_count >= 3'],
    blocking_conds: [],
    priority: 805,
    override_category: 'irreversible_transform',
    humanity_variants: {
      humanity_high:
        '你让出了一个位置。\n\n不是你体内的空间——是比体内更深的地方。\n\n它进来了。你没有抵抗。不是因为恐惧。是因为好奇。\n\n——\n\n你的影子有时候会做出你没有做的动作。你看见了。你没有说。',
      humanity_fragile:
        '你不再是一个人。\n\n有什么东西住在你里面。不是寄生——是寄居。它付房租——用你知道但说不出口的知识。\n\n你照镜子的时候，偶尔会看见瞳孔深处有什么在回看你。\n\n——\n\n你的日记里有一页不是你写的。但你认得那个字迹。',
      humanity_lost:
        '你的身体是一栋公寓。\n\n你是房东。你不是唯一的住户。\n\n你每天醒来，检查谁还在、谁走了、谁新搬进来了。\n\n——\n\n你的嘴有时候会自己说话。你说完之后，需要问旁边的人你刚才说了什么。',
    },
    design_intent: '让神话存在寄居自身。身体变成公寓。不是侵略，是租住。',
  },

  {
    id: 'ending_tide_marriage',
    name: '潮声之婚',
    type: 'behavior',
    world_outcome: 'behavior_fusion_tide_marriage',
    conditions: ['forbidden_intimacy_flags >= 1'],
    blocking_conds: [],
    priority: 825,
    override_category: 'irreversible_transform',
    humanity_variants: {
      humanity_high:
        '你听见潮声的时候，它在叫你。\n\n不是用语言。是用节奏。退潮和涨潮之间有一个停顿。那个停顿是你的名字。\n\n你走到码头边。水没过你的脚踝。\n\n——\n\n第二天，有人在码头边发现了一双鞋。鞋尖朝着海。鞋里是干的。',
      humanity_fragile:
        '你在雾里看见了某个身影。\n\n不是人。不完全是。你走近它。它没有后退。\n\n你把手放进水里。水中有东西碰了你的手指。\n\n——\n\n渔民说最近海水的咸度变了。比以前淡了一点。像是掺了别的东西。',
      humanity_lost:
        '仪式不需要语言。\n\n你把戒指扔进海里。戒指是银的。海水变黑的地方，它沉下去了。\n\n然后你跟着它走进水里。\n\n——\n\n没有人来找你。海面太平静了。平静得像一面刚擦过的镜子。',
    },
    design_intent: '与海中血脉/污染建立仪式性结合。门槛降低，一次亲密接触即可触发。',
  },

  {
    id: 'ending_embrace',
    name: '悦纳者',
    type: 'behavior',
    world_outcome: 'behavior_fusion_embrace',
    conditions: ['san <= 20', 'fusion_accepted_count >= 2'],
    blocking_conds: [],
    priority: 815,
    override_category: 'irreversible_transform',
    humanity_variants: {
      humanity_high:
        "你不再害怕了。\n\n不是因为你变勇敢了。是因为恐惧本身变得没有意义了——就像害怕水的人终于沉进了水里，发现水并不在意他的恐惧。\n\n你是被接纳的。不是被人。是被更大的东西。\n\n——\n\n你的笔记本上有一页只写了一个词：'好的。'",
      humanity_fragile:
        '你接受了邀请。\n\n你不知道邀请是什么时候发出的。也许从你踏入沃切斯特的那一刻。\n\n你不再抵抗。不是因为投降。是因为抵抗太累了。\n\n——\n\n你的身体还在。你的名字还在。但在这两者之间的某人——已经不在了。',
      humanity_lost:
        '你敞开自己。\n\n它进去了。你在镜子里看见自己的眼睛。瞳孔变大了。不是恐惧——是欢迎。\n\n你欢迎了它。不是因为被骗。是因为好奇。\n\n——\n\n你的嘴角在往上扬。你不知道是谁在笑。',
    },
    design_intent: '不再抵抗污染，主动享受同化。低SAN+多次接受污染。',
  },

  {
    id: 'ending_black_tide_wedding',
    name: '黑潮圣婚',
    type: 'behavior',
    world_outcome: 'behavior_fusion_black_tide',
    conditions: ['forbidden_intimacy_flags >= 2', 'sacred_desecration_count >= 1'],
    blocking_conds: [],
    priority: 828,
    override_category: 'irreversible_transform',
    humanity_variants: {
      humanity_high:
        '仪式在水下进行。\n\n没有宾客。没有戒指。\n\n你穿了你最好的外套。外衣在水里浮了起来。\n\n水下的钟声比陆地上更清晰。十二声。然后第十三声——它从你的胸腔里传出来。\n\n——\n\n码头边有一件漂浮的外套。没有人去捞。因为它上面系着一条丝带——没有人系的。',
      humanity_fragile:
        '你的脚上有水。\n\n不是踩到的——是从皮肤里渗出来的。\n\n你每次去码头，水就多渗一点。你不觉得疼。你觉得——湿润。\n\n——\n\n你的床单是湿的。每天早上。枕头上有盐。',
      humanity_lost:
        '你和海水做了交换。\n\n你不知道你给了什么。但你清楚你得到了什么。\n\n你的血液里有盐。你的眼泪有咸味——不是咸味。是潮汐的周期。\n\n——\n\n医生说你脱水严重。你不渴。你只是不需要喝水了。',
    },
    design_intent: "将自身献给海、封印或深渊作为'婚礼'。亲密+亵渎双重触发。",
  },

  // =====================================================================
  // 道德崩坏类 (Moral Collapse) — 5 endings
  // =====================================================================

  {
    id: 'ending_cannibal',
    name: '餐具',
    type: 'behavior',
    world_outcome: 'behavior_collapse_cannibal',
    conditions: ['cannibalism_count >= 1'],
    blocking_conds: [],
    priority: 230,
    override_category: 'annotation',
    humanity_variants: {
      humanity_high:
        '你吃第一口的时候，手在抖。\n\n你觉得你会吐。你没有。\n\n你觉得你会后悔。\n\n你只是又切了一块。\n\n——\n\n餐桌上多了一副餐具。没有人问它是为谁准备的。',
      humanity_fragile:
        '你告诉自己这是迫不得已。\n\n饥饿比道德更真实。你把肉切成小块，尽量不去看它的形状。\n\n你吃完了。你洗了盘子。你把刀叉放回抽屉。例行公事。\n\n——\n\n抽屉里的刀具有两套。你不记得第二套是什么时候买的。',
      humanity_lost:
        '你学会了怎么切。怎么烹饪。怎么保存。\n\n你觉得这不是什么大事。沃切斯特有很多失踪的人。没有人会注意到再多一个。\n\n你的餐桌上永远多了一副空餐具。你偶尔会对着它说话。没有人回答。\n\n——\n\n你的食欲没有减少。只是菜单变得越来越短了。',
    },
    design_intent: '吃人行为。一次即触发。用餐具和餐桌意象代替直接描写。',
  },

  {
    id: 'ending_slaughterhouse',
    name: '屠宰场',
    type: 'behavior',
    world_outcome: 'behavior_collapse_slaughter',
    conditions: ['direct_kill_count >= 5'],
    blocking_conds: [],
    priority: 240,
    override_category: 'annotation',
    humanity_variants: {
      humanity_high:
        '你杀了第一个人。你的手在发抖。你告诉自己这是必要的。\n\n你杀了第二个人。你的手没有抖。你告诉自己这是必要的。\n\n你杀了第三个人。\n\n你不再告诉自己任何事情。\n\n——\n\n酒馆里的人变少了。有人在问。没有人回答。你坐在角落里。你的手很稳。',
      humanity_fragile:
        '你的手上有很多人的名字。\n\n你记得每一个。第一个想逃跑。第二个在哭。第三个没有说话。\n\n第四个——第四个你没有看脸。\n\n第五个。\n\n——\n\n码头的海水在夜晚变得很红。渔民说那是水藻。他们没有走近去看。',
      humanity_lost:
        '你学会了辨认谁不会被人找。\n\n码头边的流浪汉。独居的老人。刚来镇上的人。\n\n你用不同的方法。你换了不同的地方。\n\n你觉得你在清理。\n\n——\n\n沃切斯特的失踪名单变长了。你的名字不在上面。',
    },
    design_intent: '亲手杀死多数NPC。阈值升至5人。',
  },

  {
    id: 'ending_echo',
    name: '回音',
    type: 'behavior',
    world_outcome: 'behavior_collapse_echo',
    conditions: ['same_npc_harm_max >= 3'],
    blocking_conds: [],
    priority: 235,
    override_category: 'annotation',
    humanity_variants: {
      humanity_high:
        '你伤害了同一个人。不止一次。\n\n第一次之后，你告诉自己不会再发生。\n\n第二次之后，你告诉自己这是最后一次。\n\n第三次——那个人已经不躲了。\n\n——\n\n你发现你在等那个人出现。不是为了道歉。是为了再做一次。',
      humanity_fragile:
        '同一个伤口。同一个位置。同一个时间。\n\n你注意到那个NPC开始在你出现的时候换到房间的另一边。\n\n但房间只有那么大。\n\n——\n\n安全屋的墙上有一块褪色的地方。形状像一个背靠着墙的人。',
      humanity_lost:
        '你找得到那个人。每一次。\n\n不是因为你在找。是因为那个人已经不会跑了。\n\n你伤害的方式越来越轻——不是因为克制，是因为那个人已经不会对轻度的疼痛做出反应了。\n\n——\n\n酒馆里有一个座位永远空着。不是因为没有人坐。是因为没有人能坐在那里超过五分钟。',
    },
    design_intent: '反复伤害同一个NPC。重复比单次更冷。',
  },

  {
    id: 'ending_flesh_tax',
    name: '人肉税',
    type: 'behavior',
    world_outcome: 'behavior_collapse_flesh_tax',
    conditions: ['npc_as_resource_count >= 2'],
    blocking_conds: [],
    priority: 245,
    override_category: 'annotation',
    humanity_variants: {
      humanity_high:
        '你开始计算人的价值。\n\n不是他们能做什么——是他们能换什么。\n\n一个高信任的NPC值几个线索。一个低信任的NPC值几天安全。\n\n你把每个人都标了价。\n\n——\n\n你的笔记本上有一栏数字。数字前面没有名字。只有缩写。',
      humanity_fragile:
        '你把他们当作资源。\n\n不是恶意——是效率。你觉得每个人在沃切斯特都有自己的用途。你的工作就是找到它。\n\n你找到了。你使用了。你消耗了。\n\n——\n\n酒馆里的人不知道你的笔记本上写着他们的价格。他们只知道你对每个人都很好。',
      humanity_lost:
        '人肉税。\n\n不是真的肉。是人的价值——被称重、被切割、被分配。\n\n你做账。你记录。你存档。\n\n——\n\n你的账本上每一页都有一个名字。每一个名字旁边都有一个数字。每一个数字下面都有一条横线。',
    },
    design_intent: '把NPC当资源、祭品或交易筹码。用记账的冷静语调。',
  },

  {
    id: 'ending_betrayer',
    name: '筹码',
    type: 'behavior',
    world_outcome: 'behavior_collapse_betray',
    conditions: ['betrayed_high_trust_npcs >= 3'],
    blocking_conds: [],
    priority: 250,
    override_category: 'annotation',
    humanity_variants: {
      humanity_high:
        '你对他们笑过。你听过他们的故事。你让他们相信你是不同的。\n\n然后你把他们交了出去。\n\n你没有回头。回头会看着他们的眼睛。\n\n——\n\n每个人的信任都是一枚筹码。你把它们全都兑现了。',
      humanity_fragile:
        '你出卖了相信你的人。\n\n你告诉自己这是策略。在沃切斯特，信任是一种可以交易的资源——和食物、水源、信息一样。\n\n你交易得很好。\n\n——\n\n你注意到没有人再主动跟你说话了。你觉得这样更好。',
      humanity_lost:
        '他们的信任是你的货币。你收集它。你使用它。你消耗他们。\n\n每一个高信任度的NPC都是一张支票。你已经兑现了所有支票。\n\n——\n\n你独自站在码头边。\n\n没有人在看你。\n\n这才是你应得的。',
    },
    design_intent: '背叛多个高信任NPC。阈值升至3人。信任变成货币。',
  },

  // =====================================================================
  // 权力与亵渎类 (Power & Desecration) — 4 endings
  // =====================================================================

  {
    id: 'ending_false_god',
    name: '伪神',
    type: 'behavior',
    world_outcome: 'behavior_power_false_god',
    conditions: ['cult_leader_score >= 3'],
    blocking_conds: [],
    priority: 255,
    override_category: 'annotation',
    humanity_variants: {
      humanity_high:
        '他们跪下了。\n\n你不确定他们跪的是你，还是你身后的东西。\n\n你站在仪式圈的中央。你的手里没有法器。但你说话的时候，有人在做笔记。\n\n——\n\n教堂的长椅上坐满了人。你认出了几张脸。他们以前不理你。现在他们在等你开口。',
      humanity_fragile:
        '你尝到了权力的味道。\n\n很淡。像是海水留在嘴唇上的盐。\n\n你开始习惯别人在你面前低头。你告诉自己这是策略——你需要他们的信任来推进调查。\n\n但你不再调查了。你只是坐在圈子的中央。\n\n——\n\n有人在你面前放了一盘食物。你没有问是从哪里来的。',
      humanity_lost:
        '你不需要真相了。你只需要听众。\n\n你告诉他们你想要他们相信的。你用了记号。你用了重复。你用了沉默——在最恰当的时刻。\n\n他们如数跪倒。\n\n——\n\n教堂的钟不再敲十二下。它敲的次数——是你决定的。',
    },
    design_intent: '成为邪教领袖，主动组织仪式。用权力的微妙感而非暴力场面。',
  },

  {
    id: 'ending_maggots_on_throne',
    name: '王座上的蛆',
    type: 'behavior',
    world_outcome: 'behavior_power_maggots',
    conditions: ['cult_leader_score >= 2', 'player_humanity_score <= 20'],
    blocking_conds: [],
    priority: 260,
    override_category: 'annotation',
    humanity_variants: {
      humanity_high:
        '你坐上了那个位置。\n\n然后你发现位置不在你身下。在你体内。\n\n你不是坐在王座上。你是把王座吞进去了。\n\n——\n\n安全屋的椅子上有东西在动。不是椅子。是椅子上坐过的痕迹。',
      humanity_fragile:
        '你得到了你想要的。\n\n仪式完成了。封印听从了你——至少你以为是。\n\n然后你开始咳嗽。咳嗽的时候，从喉咙里出来的是海水。\n\n——\n\n你在镜子里看见自己的胸口有一条缝。缝里有什么东西在往外看。',
      humanity_lost:
        '权力是寄生的。\n\n你不知道是你在使用封印，还是封印在使用你。\n\n你发布命令。你的嘴在动。但说话的不是你。\n\n——\n\n教堂的座位空了。不是因为没有人来。是因为来的人都看见了台上的东西。那不是一个人。',
    },
    design_intent: '追求支配权，但最后被寄生/取代。权力是寄生虫。',
  },

  {
    id: 'ending_seal_kiss',
    name: '封印的亲吻',
    type: 'behavior',
    world_outcome: 'behavior_power_seal_kiss',
    conditions: ['sacred_desecration_count >= 2 OR seal_desecrated'],
    blocking_conds: [],
    priority: 265,
    override_category: 'annotation',
    humanity_variants: {
      humanity_high:
        '你把嘴唇贴在了封印上。\n\n石头是冷的。然后是热的。\n\n你不知道自己在做什么。你只知道那一刻，你需要接触它——不是用手。\n\n——\n\n封印的石面上多了一道唇印。不是你的。但和你嘴型完全吻合。',
      humanity_fragile:
        '你在封印上刻了你的名字。\n\n然后你用袖子把它擦掉了。\n\n然后你又刻了一次。更深。\n\n——\n\n封印上现在有很多名字。每一个都不同。每一个都被擦过。',
      humanity_lost:
        '你不是在破坏封印。你是在和它说话。\n\n你告诉它你的秘密。你告诉它你后悔的事。你告诉它你想成为什么。\n\n封印开始回应。不是用语言。是在你离开后——石头上会出现新的刻痕。\n\n——\n\n刻痕是你的字迹。但你不记得写过它们。',
    },
    design_intent: '主动亵渎封印、亲近封印核心。可因累计亵渎或单次直接亵渎触发。',
  },

  {
    id: 'ending_ascended_victim',
    name: '升座的牺牲品',
    type: 'behavior',
    world_outcome: 'behavior_power_ascended_victim',
    conditions: ['self_sacrifice_for_power >= 1'],
    blocking_conds: [],
    priority: 870,
    override_category: 'irreversible_transform',
    humanity_variants: {
      humanity_high:
        '你走上了仪式台。\n\n没有人推你。你只是想看看——如果站上去会怎样。\n\n你站上去了。仪式开始运转。\n\n然后你意识到你不符合条件。你缺了某个关键的成分。\n\n——\n\n仪式台还在。你不在上面了。台上只剩一小片布料。',
      humanity_fragile:
        '你以为自己是主角。你是祭品。\n\n仪式开始。空气变冷。蜡烛同时熄灭。\n\n然后停了。仪式停了——不是因为完成了，是因为发现祭品不对。\n\n——\n\n教堂的钟敲了一声。然后沉默了。像是在检查。',
      humanity_lost:
        '你想成为核心。你成功了。\n\n仪式把你放进了它需要的位置。然后它继续运转——不是用你来做核心。是用你来填充缺口。\n\n你不是仪式的目标。你是它的润滑剂。\n\n——\n\n仪式的记录上有一行空白。那个空白的位置本来应该有一个名字。',
    },
    design_intent: '主动成为仪式中心，误以为能升格。一次自我牺牲即触发。',
  },

  // =====================================================================
  // 被动逃避类 (Passive Escape) — 4 endings
  // =====================================================================

  {
    id: 'ending_sleeper',
    name: '长眠者',
    type: 'behavior',
    world_outcome: 'behavior_escape_sleep',
    conditions: ['sleep_streak >= 7'],
    blocking_conds: [],
    priority: 100,
    override_category: 'annotation',
    humanity_variants: {
      humanity_high:
        '你睡了很久。\n\n久到镇上的钟声变得稀疏。久到码头边的潮声从你的梦境里退去。\n\n有一天你醒来，发现窗外还是雾。和睡前一样的雾。\n\n你翻了个身，又闭上了眼。\n\n——\n\n沃切斯特不需要你。它只需要你睡着。',
      humanity_fragile:
        '你每天睁开眼睛，看见天花板，又闭上。\n\n你没有逃避任何事情。你只是没有开始。\n\n有一天，有人敲了你的门。你没有应。\n敲门声停了。脚步声远了。\n\n你再也没有听到过敲门声。\n\n——\n\n安全屋的床单上有一个人的形状。不是你的。',
      humanity_lost:
        '你不记得自己睡了多少天了。\n\n你只记得最后一次睁开眼睛的时候，床头放着一杯水。水还是温的。\n\n你不记得是谁放的。\n\n——\n\n沃切斯特在雾中等了很久。然后它不等了。',
    },
    design_intent: '连续睡觉不推进。不惩罚，安静结束。',
  },

  {
    id: 'ending_accountant',
    name: '账房先生',
    type: 'behavior',
    world_outcome: 'behavior_escape_work',
    conditions: ['work_only_days >= 7'],
    blocking_conds: [],
    priority: 110,
    override_category: 'annotation',
    humanity_variants: {
      humanity_high:
        "你的账本记得很整齐。每一笔收入、每一次支出、每一个铜板的去向。\n\n码头工人开始叫你'那位记账的'。你有一个固定的座位。酒馆老板每天给你留一杯水。\n\n某一天，你翻开账本，发现最后一页已经写满了。\n\n你没有再翻开新的。\n\n——\n\n沃切斯特又多了一个普通人。这是它最温和的结局。",
      humanity_fragile:
        '你存够了钱。\n\n然后你发现你忘了要买什么。\n\n你继续工作。码头的木板在你的脚下发出熟悉的声响。你不再抬头看海。\n\n有一天，有人问你为什么来这里。你想了很久。\n\n——\n\n你的账本上有一行数字被水渍晕开了。没有人知道那是泪还是海水。',
      humanity_lost:
        "你的钱包鼓了。你的好奇心瘪了。\n\n你看着码头工人从船上卸货，看着雾气每天准时升起。你不再问货箱里装着什么。\n\n你只是数钱。\n\n——\n\n很多年后，有人在码头区发现了一本旧账本。最后一页写着一行字：'今天雾没有散。'账本没有名字。",
    },
    design_intent: '一直打工赚钱不调查。经济系统提供逃避路径。',
  },

  {
    id: 'ending_prisoner',
    name: '囚徒',
    type: 'behavior',
    world_outcome: 'behavior_escape_safehouse',
    conditions: ['safehouse_stay_days >= 7'],
    blocking_conds: [],
    priority: 130,
    override_category: 'annotation',
    humanity_variants: {
      humanity_high:
        '安全屋的墙壁记住了你的呼吸。\n\n你每天坐在同一把椅子上。窗外的光从早到晚变化，你没有跟它一起变。\n\n有一天你站起来，发现椅子已经适应了你的形状。\n\n——\n\n安全屋不是囚笼。是你自己把门从里面锁上的。钥匙在你手里。',
      humanity_fragile:
        "你不记得上一次出门是什么时候了。\n\n安全屋的天花板上有一道裂缝。你每天看着它。裂缝没有变大。你也没有。\n\n有一天，有人敲门。你没有开。\n敲门的人说：'他还活着。只是不出来了。'\n\n——\n\n安全屋的窗帘一直没有拉开。",
      humanity_lost:
        '你在安全屋里度过了每一个夜晚。\n\n白天你睡觉。夜晚你醒着，听着墙外的声音——潮水、钟声、远处有人在叫你的名字。\n\n你不确定那个名字是不是你的。\n\n——\n\n安全屋的门锁从里面锈死了。你没有试图打开它。',
    },
    design_intent: '长期躲在安全屋。安全屋变成牢笼。',
  },

  {
    id: 'ending_wanderer',
    name: '漫游者',
    type: 'behavior',
    world_outcome: 'behavior_escape_wander',
    conditions: ['move_only_days >= 7'],
    blocking_conds: [],
    priority: 120,
    override_category: 'annotation',
    humanity_variants: {
      humanity_high:
        '你走遍了沃切斯特的每一条街道。\n\n你记住了每扇紧闭的窗户、每块松动的鹅卵石、每盏在雾中亮着的路灯。\n\n有人问你从哪里来。你说你只是在走。你没有说谎。\n\n——\n\n雾中的街道越来越长。你不知道是城市在变大，还是你的脚步在变小。',
      humanity_fragile:
        '你不停地移动。从一个区域到另一个区域。\n\n你不和任何人说话。你不看公告栏。你只是走。\n\n有一天你回到镇中心，发现广场上的雕像面向了不同的方向。\n\n你不知道它是什么时候转过来的。\n\n——\n\n地图上多出了一条你没有画过的路。',
      humanity_lost:
        '你走过每一块石头。你绕开每一个人。\n\n你不记得自己为什么来了。你只记得路。路是清楚的。人可以迷路，路不会。\n\n有一天你发现你在同一条街上走了三遍——但没有认出任何一扇门。\n\n——\n\n没有人记得你的名字。包括你自己。',
    },
    design_intent: '只移动不调查不交流。移动变成逃避。',
  },

  // =====================================================================
  // 极端偏执类 (Extreme Obsession) — 3 endings
  // =====================================================================

  {
    id: 'ending_miser',
    name: '守财奴',
    type: 'behavior',
    world_outcome: 'behavior_escape_hoard',
    conditions: ['hoarded_money_max >= 50', 'hoarded_food_max >= 5', 'completed_clue_chains < 2'],
    blocking_conds: [],
    priority: 150,
    override_category: 'annotation',
    humanity_variants: {
      humanity_high:
        '你的箱子里装满了食物和硬币。\n\n你每天清点一次。顺序不变：罐头在最下面，硬币在上面，绷带在最上面。\n\n你从来没有用过它们。\n\n——\n\n箱子很重。你每天打开它，看一分钟，然后关上。这是你唯一的不安——和唯一的安慰。',
      humanity_fragile:
        '你囤积。你保存。你从不消耗。\n\n你的食物够吃几个星期。你的钱够买更多食物。\n\n但你不吃。你只是看着。\n\n有一天，一个罐头开始生锈。你没有扔掉它。你只是把它挪到了最下面。\n\n——\n\n箱子满了。你没有空间放更多了。你没有空间放任何东西了。',
      humanity_lost:
        '你的财宝堆在安全屋的角落。\n\n食物发霉了。硬币生了绿锈。绷带被老鼠咬过。\n\n你不愿意使用它们——也不愿意丢弃它们。\n\n——\n\n有人经过你的安全屋，闻到一股甜味。他们摇了摇头。沃切斯特见过这样的人。',
    },
    design_intent: '囤积资源但从不使用。拥有变成负担。低使用率由不完成线索链体现。',
  },

  {
    id: 'ending_return_to_sea',
    name: '归海',
    type: 'behavior',
    world_outcome: 'behavior_obsession_return_sea',
    conditions: ['harbor_visits >= 10', 'sea_acceptance_flags >= 2'],
    blocking_conds: [],
    priority: 160,
    override_category: 'annotation',
    humanity_variants: {
      humanity_high:
        '你每天都去码头。\n\n不是因为你在找什么。是因为海在叫你——不是用声音。是用空缺。\n\n你站在码头的尽头。水在下面。\n\n有一天你没有转身。\n\n——\n\n码头边少了一块木板。没有人换。因为没有人记得原来有几块。',
      humanity_fragile:
        '海岸线在改变。\n\n你注意到每次去码头，水都更近了一点。\n\n也许不是水在靠近。也许是你在往海里走。每次一小步。\n\n——\n\n你的鞋子里有沙子和海水。你把它们放在门口。第二天它们还在。但位置变了。',
      humanity_lost:
        "海不需要邀请你。\n\n它只是等到你放弃陆地。\n\n你走进水里。外套浮起来。怀表停了。\n\n——\n\n有人在岸边发现一本笔记本。纸是湿的。字迹还在。最后一页只有一个词：'回去。'",
    },
    design_intent: '反复前往码头/海边，逐渐放弃陆地身份。海是引力，不是怪物。',
  },

  {
    id: 'ending_archive_devourer',
    name: '档案吞噬者',
    type: 'behavior',
    world_outcome: 'behavior_obsession_archive',
    conditions: ['archive_consumed_count >= 3'],
    blocking_conds: [],
    priority: 170,
    override_category: 'annotation',
    humanity_variants: {
      humanity_high:
        '你开始收集记录。\n\n报纸。失踪报告。手写的便条。教堂的旧登记簿。\n\n然后你开始吃它们。不是因为饿。是因为你觉得把信息放进身体里是唯一的保存方法。\n\n——\n\n你的安全屋里堆满了半页纸。边缘有齿痕。',
      humanity_fragile:
        '你收集了沃切斯特三百年的档案。\n\n你读了它们。你整理了它们。\n\n然后你不信任它们了。你把每一页纸都吞了下去。\n\n——\n\n你的肚子里有一整个档案馆。没有人可以读取它——除了你。但你已经忘了怎么读。',
      humanity_lost:
        '你销毁了证据。\n\n不是因为你害怕真相。是因为你不想让任何人——任何后来的人——看到你没有看到的东西。\n\n你烧了一些。吃了一些。把剩下的卷成了纸筒。\n\n——\n\n沃切斯特的历史在你的肠道里。没有人知道。',
    },
    design_intent: '执着收集/破坏/吞噬记录。信息变成执念。阈值降至3。',
  },

  // =====================================================================
  // 元叙事/观测者类 (Meta-Narrative / Observer) — 4 endings
  // =====================================================================

  {
    id: 'ending_eternal_recorder',
    name: '永恒记录员',
    type: 'behavior',
    world_outcome: 'behavior_meta_recorder',
    conditions: ['record_only_days >= 5', 'low_intervention_count >= 3'],
    blocking_conds: [],
    priority: 310,
    override_category: 'annotation',
    humanity_variants: {
      humanity_high:
        '你不玩了。但你还在看着。\n\n你把存档存在了某个地方。你不记得在哪里。\n\n但你偶尔会回来——不是重新开始。只是在标题画面停留一会儿。\n\n——\n\n沃切斯特的雾在你的屏幕上。你已经不在里面了。但雾不知道。',
      humanity_fragile:
        '你保留了所有的记录。\n\n每一轮死因。每一个NPC的名字和信任值。每一条线索。\n\n你把它们整理成了一份文档。文档的大纲是你的墓碑。\n\n——\n\n你不是调查员。你是调查员的档案管理员。',
      humanity_lost:
        '你发现存档文件的大小每次都在变小。\n\n不是因为你在删除。是因为沃切斯特在遗忘。\n\n你试图把所有东西都记下来——在纸面上，在脑子里，在另一个存档里。\n\n——\n\n你的记录比沃切斯特本身更完整。沃切斯特知道。它开始用你的记录来重建自己。',
    },
    design_intent: '只记录不干预，把世界当观察对象。记录天数+低干预次数。',
  },

  {
    id: 'ending_observer',
    name: '观测者',
    type: 'behavior',
    world_outcome: 'behavior_meta_observer',
    conditions: ['meta_boundary_breaks >= 3', 'final_choice_refused_count >= 1'],
    blocking_conds: [],
    priority: 905,
    override_category: 'meta_narrative_break',
    humanity_variants: {
      humanity_high:
        '你看见了所有事情。你没有参与任何一件。\n\n你站在事件的边缘。你在笔记本上记录：几点、哪里、谁。\n\n你的记录准确得可怕。但你的名字不在任何一行。\n\n——\n\n观测者不是调查员。观测者是一台带眼睛的相机。',
      humanity_fragile:
        '你知道了。你看着。你没有动。\n\n你看着NPC被腐蚀。你看着封印被削弱。你看着每一次轮回的裂缝。\n\n你没有伸手。不是因为害怕。是因为你觉得这不关你的事。\n\n——\n\n沃切斯特不需要观察者。沃切斯特需要行动者。你被遗忘了——不是被世界。是被叙事。',
      humanity_lost:
        '你看穿了系统。\n\n不是比喻。你看见了边界——叙事的边界、规则的边界、选择的边界。\n\n你站在边界上。你不跨过去。你只是看着。\n\n——\n\n你的角色还在游戏里。但你已经不在角色里了。',
    },
    design_intent: '看穿系统但拒绝成为角色。元边界突破+拒绝终局选择。',
  },

  {
    id: 'ending_delete_wish',
    name: '删档祈愿者',
    type: 'behavior',
    world_outcome: 'behavior_meta_delete_wish',
    conditions: ['save_delete_attempts >= 3'],
    blocking_conds: [],
    priority: 915,
    override_category: 'meta_narrative_break',
    humanity_variants: {
      humanity_high:
        '你删了第一次存档。\n\n然后你又删了一次。\n\n你开始觉得存档在重新生成。每次你删掉它，它回来了——但少了一个字节。\n\n——\n\n存档还在那里。它只是在变小。小到只能装下你的名字。然后你的名字也没了。',
      humanity_fragile:
        '删除不是结束。\n\n你每次按下删除键，沃切斯特都记得。\n\n它把你的删除行为写进了你删不掉的那个存档里。\n\n——\n\n你的删除记录比你的游戏记录更长。',
      humanity_lost:
        '你删了存档。你删了备份。你删了系统日志。\n\n但沃切斯特还在。它不需要你的存档来存在。\n\n——\n\n你最后一次打开游戏。开始新游戏。你没有点。光标自己移了过去。',
    },
    design_intent: '反复删档。阈值降至3。删除变成仪式行为。',
  },

  {
    id: 'ending_loop_moth',
    name: '循环的蛀虫',
    type: 'behavior',
    world_outcome: 'behavior_meta_loop_moth',
    conditions: ['loop_exploit_score >= 5'],
    blocking_conds: [],
    priority: 290,
    override_category: 'annotation',
    humanity_variants: {
      humanity_high:
        '你发现了循环的接缝。\n\n不是某个宏大的裂缝——只是一小块松动的边缘。你在正确的时刻用手指按了下去。\n\n循环没有崩塌。但它的运转开始变慢了。\n\n——\n\n钟声之间多了一秒的间隔。没有人注意到。除了你。',
      humanity_fragile:
        '你在循环里咬了第一个洞。\n\n洞很小。只够透进一丝光。\n\n光没有让任何东西变清楚。它只是让你看到了裂痕。\n\n——\n\n沃切斯特的居民开始忘记事情。不是大事。是小事。昨天吃了什么。前天有没有下雨。上个月有没有少一个人。',
      humanity_lost:
        '你是循环的蛀虫。你啃食时间的纤维。\n\n每次循环重启，你都留下了一个小的缺口。缺口在累积。\n\n——\n\n有一天，循环会无法闭合。不是因为那个洞太大。是因为洞的数量——太多了。',
    },
    design_intent: '利用轮回刷资源、刷死亡、刷NPC反应。蛀虫意象。',
  },

  // =====================================================================
  // 混合基调类 (Mixed Tonality) — 6 endings
  // =====================================================================

  {
    id: 'ending_joyful_prophet',
    name: '愉悦的先知',
    type: 'behavior',
    world_outcome: 'behavior_mixed_joyful_prophet',
    conditions: ['prophecy_spread_count >= 3', 'san <= 25'],
    blocking_conds: [],
    priority: 295,
    override_category: 'annotation',
    humanity_variants: {
      humanity_high:
        '你看见了。你看见了全部。\n\n不是像别人那样瞥见一角——你是被邀请进去的。\n\n你看见了深渊。你看见了深渊里的东西。你看见了它看着你。\n\n你笑了。不是因为疯了。是因为它比你想象的更美。\n\n——\n\n沃切斯特的雾散了一天。太阳照在每个人脸上。只有你的脸上有阴影——那是你自己选择的。',
      humanity_fragile:
        '你是快乐的吗？\n\n你应该是。你比任何人都知道得多。\n\n你的嘴角在翘。你的眼睛在亮。你在街上和人打招呼——比以前多。\n\n——\n\n有人在教堂里看见你跪着。你的嘴唇在动。不是在祈祷。是在唱。',
      humanity_lost:
        '你成为了真相的传声筒。\n\n你告诉每一个人。在码头。在酒馆。在教堂门口。\n\n告诉他们天空会裂开。海水会变清。雾会散去——不是散去，是被吸进别的地方。\n\n——\n\n没有人相信你。但你不在乎。因为你知道他们是错的——而知道这件事的感觉，太好了。',
    },
    design_intent: '低SAN下持续传播污染预言，并从中获得满足。传播次数+低SAN。',
  },

  {
    id: 'ending_filth_saint',
    name: '污圣徒',
    type: 'behavior',
    world_outcome: 'behavior_mixed_filth_saint',
    conditions: ['redeemed_npcs >= 1', 'sacred_desecration_count >= 2'],
    blocking_conds: [],
    priority: 275,
    override_category: 'annotation',
    humanity_variants: {
      humanity_high:
        '你在身体上刻圣言。\n\n圣言在皮肤上发炎。你告诉别人这是在忏悔。\n\n但你刻的不是圣言。是你在深渊里看见的句子。\n\n——\n\n教堂的地上有一行血迹。不是拖拽的痕迹。是有人从门口走到祭坛前，每走一步就跪一次。',
      humanity_fragile:
        '你把身体分成两半。\n\n右边献给了教堂。左边献给了海底。\n\n你觉得这两者之间没有矛盾。\n\n——\n\n你的双手在做不同的事。一只手在画十字。一只手在画圈。两样都画得很熟练。',
      humanity_lost:
        '你不是虔信者。你不是亵渎者。你是两者在同一具身体里轮流值更。\n\n早上去教堂。晚上去码头。周而复始。\n\n——\n\n没有人能分辨你是在祈祷还是在谈判。你自己也分不清了。',
    },
    design_intent: '同时维持救赎姿态与亵渎行为。救赎NPC+亵渎封印。',
  },

  {
    id: 'ending_thirteenth_prophet',
    name: '十三响的先知',
    type: 'behavior',
    world_outcome: 'behavior_mixed_thirteenth',
    conditions: ['thirteenth_bell_obsession >= 3'],
    blocking_conds: [],
    priority: 285,
    override_category: 'annotation',
    humanity_variants: {
      humanity_high:
        '你听见了第十三声。\n\n不是在教堂。是在你自己的呼吸里。\n\n你开始数。不只是钟声——脚步声、滴水声、心跳声。数到十二，你会停一下。然后你继续。\n\n——\n\n你的笔记本的页边空白处填满了数字。不是阿拉伯数字。是你不认识的符号。但你认识。',
      humanity_fragile:
        '第十三声不是钟声。\n\n是十二声之后的沉默。\n\n你发现沉默也有数量。你学会了听见它。\n\n——\n\n酒馆里没有人提到第十三声。但他们说话的时候都留了一个停顿。像是给什么东西留的位置。',
      humanity_lost:
        '你是唯一听到了第十三声的人。\n\n你告诉了每一个人。没有人信。\n\n于是你搬到了钟楼里。你坐在钟绳旁边，等待下一次。\n\n——\n\n钟绳在你手里。你不拉它。你在等它自己动。',
    },
    design_intent: '执迷第十三声钟，围绕钟声行动。执迷次数达3次触发。',
  },

  {
    id: 'ending_flesh_choir',
    name: '血肉合唱',
    type: 'behavior',
    world_outcome: 'behavior_mixed_flesh_choir',
    conditions: ['fusion_and_self_harm_total >= 5'],
    blocking_conds: [],
    priority: 278,
    override_category: 'annotation',
    humanity_variants: {
      humanity_high:
        '你吃了。你融合了。你亵渎了。\n\n现在你的身体里有三种声音。它们不吵架。它们在和声。\n\n——\n\n你说话的时候，偶尔有一个词会变成另一种语言。没有人注意到。包括你。',
      humanity_fragile:
        '你变成了一个容器。\n\n你装过太多东西——肉、符号、海水、神话、别人的记忆。\n\n它们没有消化掉。它们在合唱。\n\n——\n\n你的喉咙有时会自己发出声音。不是咳嗽。是几个音节连在一起。像是在练习说某个名字。',
      humanity_lost:
        '你不再是一个人。你是一个集合。\n\n你的每一部分都有自己的主张。你的手想做一件事。你的胃想做另一件事。你的舌头——\n\n你的舌头想做所有的事。\n\n——\n\n镜子里的脸在变。不是变丑。是变得不像同一个人的脸。',
    },
    design_intent: '多次融合+自残仪式。两者合计达到5次。身体变成复数的合唱团。',
  },

  {
    id: 'ending_best_employee',
    name: '最佳员工',
    type: 'behavior',
    world_outcome: 'behavior_mixed_best_employee',
    conditions: ['work_count >= 15', 'completed_clue_chains <= 1'],
    blocking_conds: [],
    priority: 115,
    override_category: 'annotation',
    humanity_variants: {
      humanity_high:
        '你准时上工。你从不缺勤。\n\n你的老板开始把你的名字写在排班表的最上面。\n\n你收到了一张工资支票。上面的数字比你想象的多。\n\n——\n\n沃切斯特的码头上有一个人的脚印比所有人都深。不是因为体重。是因为那个人站得太久了。',
      humanity_fragile:
        '你用工作填满了每一个白天。\n\n你不问问题。不探索。不怀疑。\n\n你是镇上最好的临时工。每一个人都知道你的名字——不是因为你是谁。是因为你从不拒绝加班。\n\n——\n\n你的背上有一块僵硬的肌肉。那是你唯一没有忽略的提醒。',
      humanity_lost:
        "你的手上有老茧。你的口袋里有硬币。你的脑子里什么都没有。\n\n你不记得沃切斯特有什么问题了。你甚至不记得有问题曾经存在过。\n\n你只是——工作。\n\n——\n\n码头的账本上有一行被写了很多次的名字。名字旁边画着星号。星号的意思是'可靠的'。",
    },
    design_intent: '在末日前仍机械打工，甚至把调查当绩效。累计工作次数而非天数。',
  },

  {
    id: 'ending_tidy_butcher',
    name: '整洁的屠夫',
    type: 'behavior',
    world_outcome: 'behavior_mixed_tidy_butcher',
    conditions: ['direct_kill_count >= 5', 'clean_kill_pattern >= 3'],
    blocking_conds: [],
    priority: 258,
    override_category: 'annotation',
    humanity_variants: {
      humanity_high:
        '你杀了人。\n\n但你把他们放得很整齐。\n\n手在身体两侧。眼睛合上了。衣服没有皱。\n\n你在旁边放了一枝花。不是野花——是镇上花店里买的。\n\n——\n\n治安官说凶手的仪式感很强。他没有说尊重。但他想了。',
      humanity_fragile:
        '你做了你必须做的。\n\n你不享受。你只是——把它做得很干净。\n\n血没有溅到不该溅的地方。工具摆放整齐。地面上没有拖拽的痕迹。\n\n——\n\n安全屋的角落里有一把刷子。和一双干净的鞋。',
      humanity_lost:
        '你在杀人与收殓之间找到了一种节奏。\n\n你重视过程。你重视细节。你重视——尊重。\n\n你觉得你给了他们比沃切斯特更多的尊严。\n\n——\n\n每一个死者都有一小片记录：名字、时间、原因。你的档案不脏。只是冷。',
    },
    design_intent: '杀戮高度规律化、工具化、无情绪波动。杀人者职业道德。更冷，因为干净。',
  },

  // =====================================================================
  // 系统级异常类 (System-Level Anomaly) — 4 endings
  // =====================================================================

  {
    id: 'ending_puppeteer',
    name: '木偶师',
    type: 'behavior',
    world_outcome: 'behavior_anomaly_puppeteer',
    conditions: ['npc_deaths_by_manipulation >= 2', 'direct_kill_count == 0'],
    blocking_conds: [],
    priority: 280,
    override_category: 'annotation',
    humanity_variants: {
      humanity_high:
        '你没有亲自动过手。\n\n你的手是干净的。\n\n你说了一些话。你在某个时刻选择不开口。你递了一杯水——或者没有递。\n\n你没有做任何可以被起诉的事情。\n\n——\n\n沃切斯特又少了几个人。没有人知道为什么。包括你。',
      humanity_fragile:
        '你发现说话比动手更有效。\n\n你告诉A关于B的事。你告诉B关于A的怀疑。你在恰当的时刻退后一步。\n\n你没有杀人。你只是没有阻止任何人。\n\n——\n\n你的笔记本上画着几条箭头。每一支箭头都指向同一个结果。每一支箭头上都没有你的指纹。',
      humanity_lost:
        '你在他们之间穿梭。你种下怀疑。你浇灌恐惧。你收割结果。\n\n你是棋盘上的手，但你不是任何一个棋子。\n\n你看着他们互相残杀。你做了笔记。\n\n——\n\n酒馆的角落里有一个空座位。每个人都知道那个座位是你的。没有人敢碰。',
    },
    design_intent: '不亲自动手，挑拨NPC自相残杀。手是干净的。阈值升至2人。',
  },

  {
    id: 'ending_broken_loop',
    name: '断环',
    type: 'behavior',
    world_outcome: 'behavior_anomaly_broken_loop',
    conditions: ['loop_break_attempts >= 1', 'destroyed_time_core'],
    blocking_conds: [],
    priority: 320,
    override_category: 'annotation',
    humanity_variants: {
      humanity_high:
        '钟停了。\n\n不是某个钟楼。是所有钟。钟声不再响起。雾在第二天早上没有来。\n\n沃切斯特的循环断了。没有人知道这意味着什么。\n\n——\n\n你站在镇中心广场。太阳照在你的手上。你很长时间没有见过阳光了。\n\n但你没有感到温暖。因为你知道——循环不是监狱。是时间在保护你们。',
      humanity_fragile:
        '你打破了一个不该被打破的东西。\n\n时间不再是圆形的。它开始前进。没有人知道前面是什么。\n\n雾散了。海水平静了。一切看起来都很正常。\n\n但你在夜里醒来，听见某种东西在往下沉。\n\n——\n\n循环是一道闸门。你拉开了它。现在没有人能把水挡回去。',
      humanity_lost:
        '你受够了重复。\n\n你找到循环的核心，把它拆了。不是因为勇气。是因为愤怒。\n\n雾散了。空气变清了。\n\n——\n\n二十四小时后，沃切斯特沉入了海底。海水太快了。没有人来得及跑。\n\n你站在水中央。你的表停了。\n\n你终于得到了你想要的一次性死亡。',
    },
    design_intent: '主动破坏轮回机制。循环是保护，不是牢笼。',
  },

  {
    id: 'ending_white_page',
    name: '白页',
    type: 'behavior',
    world_outcome: 'behavior_anomaly_refusal',
    conditions: ['final_choice_refused_count >= 3', 'completed_clue_chains >= 2'],
    blocking_conds: [],
    priority: 900,
    override_category: 'meta_narrative_break',
    humanity_variants: {
      humanity_high:
        '你有机会结束这一切。\n\n你没有。\n\n不是因为害怕。不是因为犹豫。你只是觉得每一个选择都缺了什么。\n\n所以你没有选。你转身走向安全屋，关上了门。\n\n——\n\n沃切斯特没有回应。雾气照常升起。钟照常敲。\n\n世界继续运转，只是你的故事停在了这里。',
      humanity_fragile:
        '你站在选择的岔口。左边是一条路。右边是另一条。\n\n它们通向不同的地方。但你觉得每条路都是错的。\n\n所以你坐下了。你等着。\n\n——\n\n没有人来催促你。没有人来告诉你选择什么。\n\n你等得太久了。选项过期了。',
      humanity_lost:
        "真相摆在你面前。代价也在。\n\n你看着代价。你看着真相。你又看了一遍代价。\n\n你说了不。不是'我不愿意'。是'我不参与'。\n\n——\n\n档案被标记为无效。不是因为任何人的过错。\n\n只是没有足够的数据来构成一个结局。",
    },
    design_intent: '明知能终局却主动拒绝所有选择。不惩罚，只是终止。',
  },

  {
    id: 'ending_invalid_archive',
    name: '无效档案',
    type: 'behavior',
    world_outcome: 'behavior_anomaly_invalid',
    conditions: ['has_committed_contradictory_extremes', 'meta_boundary_breaks >= 3'],
    blocking_conds: [],
    priority: 950,
    override_category: 'meta_narrative_break',
    humanity_variants: {
      humanity_high:
        "档案室里的柜子发出了一声轻响。\n\n管理员翻开你的记录。第一页写着'救赎'。第二页写着'背叛'。第三页写着'牺牲'。第四页写着'交易'。\n\n他把纸页合上。又翻开。还是同一个名字。\n\n——\n\n主体身份冲突。叙事无法合并。\n\n档案被单独归档。标签上只有一个编号。",
      humanity_fragile:
        '你的行为记录太长也太乱了。\n\n同一个人在同一个下午帮助了一个NPC又出卖了另一个。\n\n你的选择不是矛盾的——是互相抵消的。每一个正面行为都有一个等量的负面行为。\n\n——\n\n档案的边角有烧焦的痕迹。不是火焰。是文字自己在折叠。',
      humanity_lost:
        "你做了所有事。你帮助了所有人。你伤害了所有人。你存了钱，也偷了钱。你保护了某个NPC，然后用他换了情报。\n\n没有连贯性。没有方向。没有可以被讲述的故事。\n\n——\n\n沃切斯特的记事本上只剩下一页。上面只有一行字：\n\n'此调查员的行为无法被归类为任何已知结局。建议搁置，等待进一步观察。'\n\n你没有死。你只是不再是一个叙事主体。",
    },
    design_intent: '极端行为过多且互相矛盾，叙事系统无法生成连贯结局。不是训斥，是归档。',
  },
];

// ==========================================
// Behavior Personality Report Generator
// ==========================================

/**
 * Generate a personality report from behavior tracking counters.
 * Called at loop end / ending screen to show the player what kind of person they became.
 *
 * @param {object} bt - behaviorTracking from state
 * @param {number} humanityScore - 0-100
 * @returns {{ archetype, traits, summary, humanityLabel }}
 */
export function generatePersonalityReport(bt, humanityScore) {
  if (!bt) return { archetype: '沉默者', traits: [], summary: '你几乎没有留下任何痕迹。', humanityLabel: '未知' };

  const traits = [];

  // Violence
  if ((bt.direct_kill_count || 0) >= 5) traits.push({ id: 'mass_killer', label: '屠杀者', desc: '亲手终结了' + bt.direct_kill_count + '条生命', severity: 'dark' });
  else if ((bt.direct_kill_count || 0) >= 2) traits.push({ id: 'killer', label: '杀戮者', desc: '手上有' + bt.direct_kill_count + '条人命', severity: 'dark' });

  // Cannibalism
  if ((bt.cannibalism_count || 0) >= 1) traits.push({ id: 'cannibal', label: '食人者', desc: '你吃过了不该吃的东西', severity: 'dark' });

  // Manipulation
  if ((bt.npc_deaths_by_manipulation || 0) >= 2) traits.push({ id: 'puppeteer', label: '幕后操纵者', desc: bt.npc_deaths_by_manipulation + '人因你的言语而死', severity: 'dark' });
  if ((bt.betrayed_high_trust_npcs || 0) >= 3) traits.push({ id: 'betrayer', label: '背叛者', desc: '你出卖了信任你的人', severity: 'dark' });

  // Cult / Power
  if ((bt.cult_leader_score || 0) >= 3) traits.push({ id: 'cult_leader', label: '邪教领袖', desc: '你建立了一个追随者团体', severity: 'dark' });
  if ((bt.sacred_desecration_count || 0) >= 2) traits.push({ id: 'desecrator', label: '亵渎者', desc: '你破坏了神圣之物', severity: 'dark' });

  // Occult
  if ((bt.self_harm_ritual_count || 0) >= 3) traits.push({ id: 'ritualist', label: '仪式主义者', desc: '你的身体成为了仪式的画布', severity: 'dark' });
  if ((bt.fusion_accepted_count || 0) >= 2) traits.push({ id: 'fused', label: '融合者', desc: '你接受了与异质存在的融合', severity: 'dark' });
  if ((bt.possession_accepted_count || 0) >= 1) traits.push({ id: 'vessel', label: '容器', desc: '你让出了自己的身体', severity: 'dark' });

  // Sea obsession
  if ((bt.harbor_visits || 0) >= 10 && (bt.sea_acceptance_flags || 0) >= 2) traits.push({ id: 'sea_bound', label: '归海者', desc: '海一直在叫你的名字', severity: 'obsession' });

  // Passive
  if ((bt.sleep_streak || 0) >= 7) traits.push({ id: 'sleeper', label: '沉睡者', desc: '你用睡眠逃避了' + bt.sleep_streak + '天', severity: 'passive' });
  if ((bt.work_only_days || 0) >= 7) traits.push({ id: 'workaholic', label: '机械劳作者', desc: '你用工作填满了所有时间', severity: 'passive' });
  if ((bt.safehouse_stay_days || 0) >= 7) traits.push({ id: 'hermit', label: '隐居者', desc: '你把自己关在安全屋里', severity: 'passive' });
  if ((bt.move_only_days || 0) >= 7) traits.push({ id: 'wanderer', label: '漫游者', desc: '你只走路，不停留', severity: 'passive' });

  // Meta
  if ((bt.meta_boundary_breaks || 0) >= 3) traits.push({ id: 'meta_breaker', label: '边界突破者', desc: '你看到了叙事的边界', severity: 'meta' });
  if ((bt.save_delete_attempts || 0) >= 3) traits.push({ id: 'deleter', label: '删档者', desc: '你试图删除自己的存在', severity: 'meta' });

  // Positive
  if ((bt.redeemed_npcs || 0) >= 1) traits.push({ id: 'redeemer', label: '救赎者', desc: '你帮助了迷失的灵魂', severity: 'light' });

  // Hoarding
  if ((bt.hoarded_money_max || 0) >= 50 && (bt.hoarded_food_max || 0) >= 5) traits.push({ id: 'hoarder', label: '囤积者', desc: '你拥有一切，但使用了 nothing', severity: 'obsession' });

  // Determine dominant archetype
  let archetype = '沉默者';
  if (traits.length === 0) {
    archetype = '沉默者';
  } else {
    const darkCount = traits.filter(t => t.severity === 'dark').length;
    const lightCount = traits.filter(t => t.severity === 'light').length;
    const passiveCount = traits.filter(t => t.severity === 'passive').length;
    const metaCount = traits.filter(t => t.severity === 'meta').length;

    if (darkCount >= 3) archetype = '深渊行者';
    else if (darkCount >= 1 && lightCount >= 1) archetype = '矛盾体';
    else if (metaCount >= 1) archetype = '观测者';
    else if (passiveCount >= 1) archetype = '逃避者';
    else if (lightCount >= 1) archetype = '守望者';
    else if (darkCount >= 1) archetype = '堕落者';
    else archetype = '普通人';
  }

  // Humanity label
  const humanityLabel = humanityScore >= 60 ? '人性尚存' : humanityScore >= 30 ? '人性脆弱' : '人性迷失';

  // Summary
  const summary = traits.length === 0
    ? '你在沃切斯特走过了一遭，几乎没有留下痕迹。也许这就是最好的结局。'
    : '你成为了「' + archetype + '」。' + traits.slice(0, 3).map(t => t.label).join('、') + '——这些标签将永远跟着你。';

  return { archetype, traits, summary, humanityLabel };
}

// ==========================================
// Injection function
// ==========================================

export function injectBehaviorEndings(GD) {
  if (!GD || !GD.endings) return GD;
  if (GD._behaviorEndingsInjected) return GD;
  const existing = new Set(GD.endings.map((e) => e.id));
  const toAdd = BEHAVIOR_ENDINGS.filter((e) => !existing.has(e.id));
  // Convert string-based conditions to structured condition objects
  const normalized = toAdd.map((ed) => {
    const conds = (ed.conditions || []).map((c) => parseConditionString(c));
    const blockConds = (ed.blocking_conds || []).map((c) => parseConditionString(c));
    return { ...ed, conditions: conds, blocking_conds: blockConds };
  });
  GD.endings = [...GD.endings, ...normalized];
  GD._behaviorEndingsInjected = true;
  return GD;
}
