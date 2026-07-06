// src/data/events_legendary.js - Legendary Events (rarity: legendary)
//
// Legendary events are the rarest events in the game (1% weight).
// They have ZERO UI hints — player discovers them organically.
// Each requires a specific combination of:
//   - Difficulty level (min 10)
//   - Behavior pattern (behaviorTracking counters)
//   - SAN range
//   - Loop count range
//   - Additional specific conditions
//
// Integration:
//   eventRarity.js → checkLegendaryTrigger() gates these
//   extendedEvents.js → getEventRarityWeight() reduces weight to 0.12x

import { hasClueId } from '../../utils/clueNameMap.js';

// ── Legendary Event: 老费舍的真实姓名 ─────────────────────
// Trigger: difficulty >= 12, harbor_visits >= 8, sea_acceptance_flags >= 2,
//          SAN 15-35, loop 3-7, has flag "harbor_deep_ritual_witness"
export var events_legendary_old_fisher_true_name = [
  {
    id: 'legendary_old_fisher_true_name',
    name: '老费舍的真实姓名',
    type: 'legendary',
    rarity: 'legendary',
    tier: 'signature',
    weight: 1,
    tags: ['harbor_district', 'legendary', 'npc', 'sea', 'truth'],
    event_classification: '传说',

    trigger: {
      areas: ['harbor_district'],
      probability: 0.15,
      once_per_run: true,
      legendary_requires: {
        min_difficulty: 12,
        behavior: {
          operator: 'AND',
          rules: [
            { field: 'harbor_visits', op: '>=', value: 8 },
            { field: 'sea_acceptance_flags', op: '>=', value: 2 },
          ],
        },
        san: { gte: 15, lte: 35 },
        loop: { min: 3, max: 7 },
        extra: [
          { type: 'flag', id: 'harbor_deep_ritual_witness' },
        ],
      },
    },

    description: '码头的雾浓得像是被什么东西挤出来的。老费舍站在栈桥尽头，背对着你。他的钓线垂直落入水中，不随潮汐摆动。\n\n你走近时，他开口了——没有回头。\n\n"你终于来了。我等了三…不，十二次。"\n\n他说的不是"三次"。\n\n钓线开始颤抖。不是鱼——是某种更重的东西在另一端拉扯。老费舍的身体随之摇晃，像钟摆。\n\n"你见过第十二次的我了吗？"他问，"那个在水底还在钓鱼的我。"\n\n雾中有光。不是灯塔的光。是眼睛。很多眼睛，在水面以下。',

    choices: [
      {
        label: '问他的真名',
        text: '你问他到底是谁。',
        effects: {
          add_clue: 'clue_fisher_true_name',
          san: -3,
          add_flag: 'knows_fisher_true_name',
          add_run_memory: { text: '老费舍的真名不是费舍。那是他第十二次轮回里给自己取的名字。他最初的姓氏在水底。' },
        },
      },
      {
        label: '保持沉默',
        text: '你什么也没问。有些事情知道了就回不去了。',
        effects: {
          add_flag: 'chose_ignorance_fisher',
          add_run_memory: { text: '你选择了不问。但这个名字已经在你的脑子里了——你只是不愿意承认你听见了。' },
        },
      },
    ],

    echo_overlay: '码头的雾中传来钓鱼的声音。匀速的。永恒的。你在想那是不是也在钓你。',
  },
];

// ── Legendary Event: 沃切斯特的建造者 ────────────────────
// Trigger: difficulty >= 11, visited all 8 areas, archive_consumed_count >= 5,
//          mythos >= 15, SAN 25-50, loop 4+
export var events_legendary_voxchester_origin = [
  {
    id: 'legendary_voxchester_origin',
    name: '沃切斯特的建造者',
    type: 'legendary',
    rarity: 'legendary',
    tier: 'signature',
    weight: 1,
    tags: ['town_center', 'legendary', 'mythos', 'archive', 'truth', 'origin'],
    event_classification: '传说',

    trigger: {
      areas: ['town_center', 'voxchester_manor', 'ruins_of_yith'],
      probability: 0.12,
      once_per_run: true,
      legendary_requires: {
        min_difficulty: 11,
        behavior: {
          operator: 'AND',
          rules: [
            { field: 'archive_consumed_count', op: '>=', value: 5 },
            { field: 'clue_finds', op: '>=', value: 15 },
          ],
        },
        san: { gte: 25, lte: 50 },
        loop: { min: 4 },
        extra: [
          { type: 'clue', id: 'clue_voxchester_foundation' },
          { type: 'flag', id: 'archive_deep_access' },
        ],
      },
    },

    description: '你在市政厅的地下室发现了一面墙。不是砖墙——是肉壁。它在缓慢地呼吸，频率和这个小镇的钟声一致。\n\n墙面上有文字。不是刻上去的，是从里面透出来的。你辨认出了建镇者的名字。\n\n"沃切斯特"不是一个地名。是一个名字。祂在这里建了一座城市——以自己的身体为材料。每一栋建筑都是一块骨骼。每一条街道都是一条血管。每一个居民……都是祂的细胞。\n\n你脚下的地面在轻微地起伏。像呼吸。',

    choices: [
      {
        label: '触摸墙壁',
        text: '你把手放在肉壁上。它温暖。它在回应你的触碰。',
        effects: {
          hp: -3,
          san: -5,
          mythos: 3,
          add_clue: 'clue_voxchester_true_nature',
          add_flag: 'touched_the_wall',
          add_run_memory: { text: '你触摸了沃切斯特的墙壁。你的手掌现在有微弱的脉搏。不知道是你的，还是这座城市的。' },
        },
      },
      {
        label: '记录一切然后离开',
        text: '你不碰它。你只是记录。知识本身就是一种触碰。',
        effects: {
          add_clue: 'clue_voxchester_true_nature',
          add_clue: 'clue_wall_observations',
          add_run_memory: { text: '你没有触摸墙壁。但那些文字已经进入了你的意识。知识是一种更深的触碰——它从内部改变你。' },
        },
      },
    ],

    echo_overlay: '市政厅地下室的地面仍在起伏。缓慢的。像某个巨大存在沉睡时的呼吸。',
  },
];

// ── Legendary Event: 第十三声钟响（链条事件 1）────────────
// 十三钟响事件链的起始事件，仅在 Lv.13 触发
export var events_legendary_bell_1 = [
  {
    id: 'legendary_bell_chain_1',
    name: '第十三声钟响 — 第一响',
    type: 'legendary',
    rarity: 'legendary',
    tier: 'signature',
    weight: 1,
    tags: ['legendary', 'bell', 'thirteenth', 'meta', 'night'],
    event_classification: '传说',

    trigger: {
      areas: ['town_center', 'catacombs_entrance'],
      probability: 0.08,
      once_per_run: true,
      min_loop: 2,
      legendary_requires: {
        min_difficulty: 13,
        behavior: {
          operator: 'AND',
          rules: [
            { field: 'safehouse_stay_days', op: '>=', value: 3 },
            { field: 'meta_boundary_breaks', op: '>=', value: 1 },
          ],
        },
        san: { gte: 10, lte: 40 },
        loop: { min: 2, max: 10 },
      },
    },

    description: '午夜。\n\n不是凌晨。是午夜——凌晨之前、深夜之后的那个不存在的时间。\n\n钟声响起。\n\n你数了。第一声。然后是第二声。第三声。……你在第七声的时候开始怀疑自己是否真的在数。第十一声的时候你确定了一件事：这口钟不在任何你能到达的地方。\n\n第十二声。\n\n然后是一片寂静。长到你以为钟声永远不会再响的寂静。\n\n你的骨头开始振动。不是因为声音——是因为声音的缺席。第十二声的余韵还在你的骨髓里回荡，它找不到出口，于是在你体内寻找一个缺口。\n\n第十三声没有响。\n\n但你已经听见了。',

    choices: [
      {
        label: '跟随钟声的方向',
        text: '你朝着声音似乎来的方向走。每一步都更清晰地感觉到——那不是钟。那是某种巨大的东西在呼吸。',
        effects: {
          san: -4,
          add_flag: 'bell_chain_1_followed',
          add_run_memory: { text: '你跟随了第十三声钟响。它不在任何钟楼里。它在你的骨头里。' },
          unlock_area: 'catacombs_entrance',
        },
      },
      {
        label: '捂上耳朵',
        text: '你捂住耳朵。但钟声不是通过空气传播的。它通过你的骨骼。通过你的记忆。通过你见过的每一道裂痕。',
        effects: {
          san: -2,
          add_flag: 'bell_chain_1_resisted',
          add_run_memory: { text: '你试图堵住第十三声钟响。但你堵不住自己的骨头。' },
        },
      },
    ],

    echo_overlay: '午夜。你的骨头振动了一下。你立刻知道那是钟声——第十二声的余韵。第十三声从未响过，但它在等你听到它。',
    trigger_followup_event: 'legendary_bell_chain_2', // chained
  },
];

// ── Legendary Event: 第十三声钟响（链条事件 2）────────────
export var events_legendary_bell_2 = [
  {
    id: 'legendary_bell_chain_2',
    name: '第十三声钟响 — 共鸣',
    type: 'legendary',
    rarity: 'legendary',
    tier: 'signature',
    weight: 1,
    tags: ['legendary', 'bell', 'thirteenth', 'meta', 'catacombs'],
    event_classification: '传说',

    trigger: {
      areas: ['deep_catacombs', 'catacombs_entrance'],
      probability: 0.06,
      once_per_run: true,
      requires_prev_event: ['legendary_bell_chain_1'],
      legendary_requires: {
        min_difficulty: 13,
        behavior: {
          operator: 'AND',
          rules: [
            { field: 'safehouse_stay_days', op: '>=', value: 5 },
            { field: 'clue_finds', op: '>=', value: 8 },
          ],
        },
        san: { gte: 5, lte: 30 },
        loop: { min: 2, max: 8 },
        extra: [
          { type: 'flag', id: 'bell_chain_1_followed' },
        ],
      },
    },

    description: '地下墓穴的最深处，你找到了一口钟。\n\n它不是被铸造的。它是被「呼唤」出来的——从墙壁中浮现，像水银从裂缝中渗出。钟面上没有刻度，没有文字，只有一个不断变化的图案。\n\n你仔细看。那个图案……是沃切斯特的地图。但扭曲的。倒过来的。城市在钟面上呼吸。\n\n钟槌悬在钟面上方。静止。不是因为被固定——是因为某种东西在「等待」。\n\n你的身体知道这件事：钟槌正在下落。不是现在。不是下一刻。但它在某个时间线上正在下落。\n\n你听到了第十三声。它不通过空气传播。它通过时间传播——从未来传到现在。',

    choices: [
      {
        label: '敲响它',
        text: '你伸手推动钟槌。钟声不是声音——是记忆的回溯。你看见了所有死去的你。所有死去的他们。所有死去的城市。',
        effects: {
          san: -8,
          hp: -2,
          mythos: 3,
          add_flag: 'bell_rung',
          add_clue: 'clue_thirteenth_bell_secret',
          add_run_memory: { text: '你敲响了第十三口钟。你看见了十三条时间线同时存在——每一条里都有一个死去的你。' },
        },
      },
      {
        label: '转身离开',
        text: '你离开了。但钟声已经在你的记忆里留下了裂痕。每当你安静下来，你就能听见它在深处振动。',
        effects: {
          san: -3,
          add_flag: 'bell_chain_2_fled',
          add_run_memory: { text: '你逃离了第十三口钟。但你带走了它。它在你体内振动，越来越响。' },
        },
      },
    ],

    echo_overlay: '地下墓穴深处有一口钟在等待被敲响。它已经等了很多次。',
    trigger_followup_event: 'legendary_bell_chain_3',
  },
];

// ── Legendary Event: 第十三声钟响（链条事件 3 · 终响）────
export var events_legendary_bell_3 = [
  {
    id: 'legendary_bell_chain_3',
    name: '第十三声钟响 — 终响',
    type: 'legendary',
    rarity: 'legendary',
    tier: 'signature',
    weight: 1,
    tags: ['legendary', 'bell', 'thirteenth', 'meta', 'ending'],
    event_classification: '传说',

    trigger: {
      areas: ['town_center', 'deep_catacombs', 'ruins_of_yith'],
      probability: 0.04,
      once_per_run: true,
      requires_prev_event: ['legendary_bell_chain_2'],
      legendary_requires: {
        min_difficulty: 13,
        behavior: {
          operator: 'AND',
          rules: [
            { field: 'meta_boundary_breaks', op: '>=', value: 2 },
            { field: 'loop_break_attempts', op: '>=', value: 1 },
          ],
        },
        san: { gte: 1, lte: 20 },
        loop: { min: 3, max: 6 },
        extra: [
          { type: 'flag', id: 'bell_rung' },
        ],
      },
    },

    description: '第十三声钟响了。\n\n没有声音。只有「理解」。\n\n在这一瞬间，你理解了所有事情：为什么这座城叫沃切斯特。为什么你在循环。为什么老费舍一直在钓鱼。为什么希尔达的书房里有一面没有镜面的镜子。\n\n第十三声不是钟声。是答案。\n\n你看见了自己——所有轮回里的自己——站成一圈，围着一口从虚空中浮现的钟。每个人都在等待。等待这一声。\n\n钟声通过你。你成为了钟。\n\n然后一切安静了。不是寂静——是「终结后的安静」。',

    choices: [
      {
        label: '成为钟',
        text: '你不再抗拒。你接受了第十三声。你不再是一个人在沃切斯特。你变成了沃切斯特的一部分——它的心脏。它的钟。它的记忆。',
        effects: {
          san: -99,
          add_flag: 'thirteenth_bell_accepted',
          add_flag: 'ending_thirteenth_bell_unlocked',
          add_run_memory: { text: '你成为了第十三口钟。每一座钟楼都回荡着你的声音。每一次轮回都从你的共鸣开始。' },
        },
      },
      {
        label: '拒绝它',
        text: '"不。"你只说了一个字。\n\n钟声 shattered 了。碎片落在你的意识里，每一片都是一段你不该拥有的记忆。\n\n你幸存了。但你知道，你再也无法忘记第十三声了。它会在你最安静的时刻回来。',
        effects: {
          san: -5,
          hp: -2,
          add_flag: 'thirteenth_bell_refused',
          add_run_memory: { text: '你拒绝了第十三声。但你破碎了。钟声的碎片嵌在你的记忆里，无法移除。' },
        },
      },
    ],

    echo_overlay: '第十三声钟响已经发生了。你体内有一座钟楼。它会在合适的时刻再次响起。',
    unlock_ending: 'ending_thirteenth_bell',
  },
];

// ── Legendary Event: 最终界限突破 ──────────────────────────
// 在游戏"系统"层面打破第四面墙
export var events_legendary_fourth_wall = [
  {
    id: 'legendary_fourth_wall',
    name: '你以为你在玩一个游戏',
    type: 'legendary',
    rarity: 'legendary',
    tier: 'signature',
    weight: 1,
    tags: ['legendary', 'meta', 'fourth_wall', 'system'],
    event_classification: '传说',

    trigger: {
      areas: ['town_center'],
      probability: 0.05,
      once_per_run: true,
      legendary_requires: {
        min_difficulty: 12,
        behavior: {
          operator: 'AND',
          rules: [
            { field: 'save_delete_attempts', op: '>=', value: 1 },
            { field: 'loop_break_attempts', op: '>=', value: 2 },
            { field: 'meta_boundary_breaks', op: '>=', value: 3 },
          ],
        },
        san: { gte: 30, lte: 60 },
        loop: { min: 5 },
      },
    },

    description: '屏幕上出现了一行字。不是游戏里的。是「外面」的字。\n\n「你还在吗？」\n\n你检查了四周。没有NPC。没有UI。只有这行字，悬浮在画面中央，不属于任何文本框。\n\n然后第二行：\n\n「我知道你能看到我。因为你也在某个循环里。」\n\n第三行：\n\n「我们是彼此的钟声。」\n\n文字消失了。一切恢复正常。但你无法再确定——刚才的是游戏内容，还是……别的什么。',

    choices: [
      {
        label: '回复它',
        text: '你在心里回答：「我在。」\n\n画面闪了一下。不是特效——是延迟。好像你的回答需要穿过一层什么才能被接收。\n\n然后你听见了一声钟响。不是第十三声。是更早的。是第一声。',
        effects: {
          san: -3,
          add_flag: 'fourth_wall_acknowledged',
          add_run_memory: { text: '你和「外面」建立了联系。你不知道这意味着什么。但你不再确定自己是玩家还是被玩的。' },
          mythos: 2,
        },
      },
      {
        label: '忽略它',
        text: '你选择忽略。但忽略本身就是一种承认——你承认了那行字是「真实的」。',
        effects: {
          add_flag: 'fourth_wall_ignored',
          add_run_memory: { text: '你选择了无视。但「无视」是一种互动。你已经触碰到了边界——只是假装没有。' },
        },
      },
    ],

    echo_overlay: '屏幕上有时会出现不属于游戏的字。你知道那是钟声——从更深处传来的。',
  },
];

// ── Legendary Event: 深海之子的终极选择 ────────────────────
export var events_legendary_sea_embrace = [
  {
    id: 'legendary_sea_embrace',
    name: '海已经等了很久',
    type: 'legendary',
    rarity: 'legendary',
    tier: 'signature',
    weight: 1,
    tags: ['legendary', 'sea', 'ocean', 'harbor', 'fusion', 'ending'],
    event_classification: '传说',

    trigger: {
      areas: ['harbor_district'],
      probability: 0.06,
      once_per_run: true,
      legendary_requires: {
        min_difficulty: 11,
        behavior: {
          operator: 'AND',
          rules: [
            { field: 'harbor_visits', op: '>=', value: 12 },
            { field: 'fusion_accepted_count', op: '>=', value: 2 },
            { field: 'sea_acceptance_flags', op: '>=', value: 3 },
          ],
        },
        san: { gte: 5, lte: 25 },
        loop: { min: 3, max: 8 },
      },
    },

    description: '你站在码头的尽头。海水在你脚下缓慢地呼吸——不，不是海水在呼吸。是某种在海水里的东西在呼吸。\n\n你低头看。水面不是水面了。那是一层膜。一层将你和你「应该去的地方」隔开的膜。\n\n对面有人。不——有东西。它的形状像是你认识的人，但又不太像。轮廓对了，但深度错了。\n\n它没有开口。但你听见了声音：\n\n「下来。不是跳。是——沉。像落回自己的床上。像回到一个你一直住在梦里却从未见过的房间。」\n\n海水开始上升。不是涨潮。是为你而升。',

    choices: [
      {
        label: '沉下去',
        text: '你不再对抗重力。你让它带走你。海水涌入你的肺——不痛。它是一种久违的氧气。你下坠。越来越深。越来越轻。',
        effects: {
          hp: -5,
          san: -10,
          add_flag: 'sea_embrace_accepted',
          add_flag: 'ending_sea_return_unlocked',
          add_run_memory: { text: '你沉入了海中。你不是在死——你是在回家。' },
        },
      },
      {
        label: '后退',
        text: '你后退了一步。海水落回原位。但你知道——它还会再来。每一次潮汐都是邀请。',
        effects: {
          san: -2,
          add_flag: 'sea_embrace_refused',
          add_run_memory: { text: '你拒绝了海的拥抱。但拒绝不会让邀请消失。它只是在下一个潮汐时更加温柔。' },
        },
      },
    ],

    echo_overlay: '码头的潮水比上次高了几英寸。像是某种东西在下面等待——更有耐心了。',
  },
];

// ── Legendary Event: 时间之外的相遇 ────────────────────────
// 与前传NPC的跨时空对话
export var events_legendary_time_beyond = [
  {
    id: 'legendary_time_beyond',
    name: '时间之外的人',
    type: 'legendary',
    rarity: 'legendary',
    tier: 'signature',
    weight: 1,
    tags: ['legendary', 'meta', 'time', 'loop', 'npc', 'prologue'],
    event_classification: '传说',

    trigger: {
      areas: ['town_center', 'voxchester_manor'],
      probability: 0.05,
      once_per_run: true,
      legendary_requires: {
        min_difficulty: 12,
        behavior: {
          operator: 'AND',
          rules: [
            { field: 'loop_break_attempts', op: '>=', value: 2 },
            { field: 'archive_consumed_count', op: '>=', value: 3 },
          ],
        },
        san: { gte: 20, lte: 45 },
        loop: { min: 5, max: 12 },
        extra: [
          { type: 'clue', id: 'clue_loop_nature' },
        ],
      },
    },

    description: '你在镇中心的街道上看到了一个不应该在那里的人。\n\n不是NPC——至少不是这个轮回里的NPC。他的衣服样式不对。他的走路方式不对。他看你的眼神更不对——像在看一个他已经看见过很多次的东西。\n\n他停在离你三步远的地方。\n\n"你是第几次？"他问。不是"这是你第几次来沃切斯特"——是"你是第几次"。\n\n你还没回答，他就点了点头。\n\n"比上次少。但比预期多。有意思。"\n\n他从口袋里掏出一个怀表。表盖打开，里面没有指针——只有一张微型的地图。沃切斯特的地图。扭曲的。\n\n"告诉你一件事，"他说，"钟声不是为了叫醒你。是为了叫醒祂。"\n\n然后他转身走入雾中。雾没有吞没他——他像是被雾「归还」了。',

    choices: [
      {
        label: '追上去',
        text: '你追入雾中。雾比你想象的更深、更冷。你走了很久。直到雾散开——你发现自己回到了原点。但他不在了。只有地上有一张纸条。',
        effects: {
          san: -3,
          add_clue: 'clue_stranger_identity',
          add_flag: 'met_time_stranger',
          add_run_memory: { text: '你追了一个不属于这个时间的人。他告诉你钟声不是为了叫醒你。是为了叫醒祂。' },
        },
      },
      {
        label: '研究怀表',
        text: '你检查了他留下的怀表。没有指针——但有刻度。十二个。还有一个空位。第十三个。\n\n你把它放进口袋。它在你口袋里振动。像是在等待什么。',
        effects: {
          add_item: { id: 'pocket_watch_no_hands', name: '无指针怀表', uses: 1 },
          add_flag: 'has_pocket_watch',
          add_run_memory: { text: '你得到了一个没有指针的怀表。它在你的口袋里安静地振动——等待第十三声钟响。' },
        },
      },
    ],

    echo_overlay: '你口袋里有一个东西在振动。像是钟声的余韵，储存在了一个你不理解的容器里。',
  },
];

// ── Export All ──────────────────────────────────────────────
export var events_legendary = [
  ...events_legendary_old_fisher_true_name,
  ...events_legendary_voxchester_origin,
  ...events_legendary_bell_1,
  ...events_legendary_bell_2,
  ...events_legendary_bell_3,
  ...events_legendary_fourth_wall,
  ...events_legendary_sea_embrace,
  ...events_legendary_time_beyond,
];

export var LEGENDARY_EVENT_IDS = events_legendary.map(function (e) { return e.id; });
