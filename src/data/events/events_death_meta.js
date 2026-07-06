// src/data/events_death_meta.js - Death Meta Events
//
// Enhanced death echo events that carry narrative fragments across loops.
// Unlike standard death echoes (events_death_echo.js), these events:
//   1. Carry "death fragments" — narrative pieces that persist in state.deathFragments
//   2. Offer choices that affect the next loop's starting conditions
//   3. Include meta-commentary on the loop system itself
//   4. Reference specific previous deaths by type and area
//
// Integration:
//   - Registered via extendedEventsInit.js (supplementary pool pattern)
//   - Filtered by requires_last_death_type / requires_last_death_mode
//   - deathFragments array persists across loops (loopReducer carryover)

// ── Death Meta: 死亡碎片系统 ──────────────────────────────
// 每次死亡产生"碎片"——叙事片段，可以在后续轮回中拼凑

export var DEATH_FRAGMENT_TYPES = {
  hp_death: {
    label: '肉体终结碎片',
    fragments: [
      '你倒下时最后看见的画面是——天花板。不同的天花板。每一次都不同。',
      '疼痛在最后一刻消失了。你以为是麻木。后来才知道是「移交」。',
      '你最后听见的是自己的心跳。越来越慢。然后不是心跳了——是钟声。',
    ],
  },
  san_death: {
    label: '理智崩塌碎片',
    fragments: [
      '你的记忆开始从两端消失。最近的先走，然后是——你甚至不记得你正在忘记什么。',
      '最后一刻你意识到一件可怕的事：你已经疯了很久了。疯到无法意识到你疯了。',
      '你看见了自己的脸。在镜子里。在墙上。在地板上。每一个都在微笑。但你的嘴角是下垂的。',
    ],
  },
  hybrid_death: {
    label: '双重终结碎片',
    fragments: [
      '你同时失去了两个自己。身体的你和精神的你。它们在最后一刻对视了一眼。然后各自走向了不同的黑暗。',
      '两个终结同时发生。你的身体倒下的同时，你的意识也在某处崩塌。你不知道哪个先发生的。',
      '你分裂了。一极是肉体的疼痛。一极是意识的瓦解。中间——什么也没有。',
    ],
  },
};

export var DEATH_FRAGMENT_META = {
  max_fragments: 12,           // max fragments carried across loops
  fragment_decay_per_loop: 1,  // fragments lost per loop transition
  assembly_threshold: 5,      // fragments needed to assemble a "death truth"
  assembly_reward: 'clue_death_nature', // clue unlocked when threshold met
};

/**
 * Generate death fragments from a death context.
 * Call this in applyDeathResolution() to add fragments to state.
 */
export function generateDeathFragments(deathContext, state) {
  var fragments = state.deathFragments || [];
  var typeKey = deathContext.mode === 'hp' ? 'hp_death' :
                deathContext.mode === 'san' ? 'san_death' : 'hybrid_death';
  var typeData = DEATH_FRAGMENT_TYPES[typeKey];
  if (!typeData) return fragments;

  // Add 1-2 random fragments from the death type
  var pool = typeData.fragments;
  var count = 1 + Math.floor(Math.random() * 2); // 1-2 fragments
  for (var i = 0; i < count && fragments.length < DEATH_FRAGMENT_META.max_fragments; i++) {
    var text = pool[Math.floor(Math.random() * pool.length)];
    fragments.push({
      text: text,
      type: typeKey,
      day: deathContext.day,
      loop: deathContext.loop,
      area: deathContext.area,
      timestamp: Date.now(),
      assembled: false,
    });
  }

  state.deathFragments = fragments;
  return fragments;
}

/**
 * Check if enough fragments are assembled to unlock a death truth clue.
 */
export function checkDeathTruthAssembly(state) {
  var fragments = state.deathFragments || [];
  var unassembled = fragments.filter(function (f) { return !f.assembled; });
  if (unassembled.length >= DEATH_FRAGMENT_META.assembly_threshold) {
    return {
      assembled: true,
      clue_id: DEATH_FRAGMENT_META.assembly_reward,
      fragments_used: DEATH_FRAGMENT_META.assembly_threshold,
    };
  }
  return null;
}

// ── Death Meta Events ──────────────────────────────────────

// Event: 你口袋里有不属于你的东西
// Triggers when player has death fragments from previous loops
export var events_death_meta_fragments = [
  {
    id: 'death_meta_fragment_echo',
    name: '碎片共振',
    type: 'death_echo',
    rarity: 'uncommon',
    weight: 0.8,
    tags: ['death_echo', 'meta', 'loop', 'fragment'],
    event_classification: '死亡回响',

    trigger: {
      areas: ['town_center', 'harbor_district'],
      probability: 0.3,
      once_per_run: false,
      min_loop: 2,
      requires_flags: ['death_echo_triggered_any'], // any death echo flag
      max_per_run: 2,
    },

    description: function (state) {
      var fragments = state.deathFragments || [];
      if (fragments.length === 0) return null;
      var recent = fragments[fragments.length - 1];
      return '口袋里的碎片在振动。你掏出来看——是一段不属于这个世界的记忆。\n\n"' + recent.text + '"\n\n碎片在你手中闪烁了一下，然后消失了。但它留下的感觉还在——像一段你无法播放的录音。';
    },

    effects: {
      san: -1,
      add_flag: 'death_fragment_echoed',
      add_run_memory: { text: '你触碰到了一段死亡的碎片。你的口袋里现在更空了——但你的脑子里更满了。' },
    },

    choices: [
      {
        label: '试图抓住碎片',
        text: '你试图抓住消失的碎片。你的手指穿过了它。像试图抓住雾。',
        effects: {
          san: -1,
          add_flag: 'tried_grasp_fragment',
        },
      },
      {
        label: '让它走',
        text: '你让它消失了。有些事情不属于这里——包括你口袋里的东西。',
        effects: {},
      },
    ],

    echo_overlay: '口袋里有时会有不属于你的东西——从上一个轮回掉出来的碎片。',
  },
];

// Event: 上一次的你留下的信息
// Only triggers after specific death types and loops
export var events_death_meta_letter = [
  {
    id: 'death_meta_previous_self_letter',
    name: '上一个你留下的信',
    type: 'death_echo',
    rarity: 'secret',
    weight: 0.5,
    tags: ['death_echo', 'meta', 'loop', 'letter', 'narrative'],
    event_classification: '死亡回响',

    trigger: {
      areas: ['town_center', 'safehouse'],
      probability: 0.2,
      once_per_run: true,
      min_loop: 3,
      requires_flags: ['death_echo_triggered_any'],
      secret_requires: {
        min_difficulty: 8,
        loop: 3,
        san: { gte: 15, lte: 45 },
      },
    },

    description: '你在安全屋的抽屉里发现了一封信。\n\n信纸很旧——比你在这个轮回里能接触到的任何纸都旧。墨迹已经开始晕染。但字迹清晰。\n\n"如果你读到这封信——\n\n那么我又失败了。\n\n这不是你的错。也不是我的错。是循环的错。钟声的错。那座城的错。\n\n但你可以做两件事我没有做到的：\n\n1. 不要独自面对它。找一个你信任的人。即使是伊莎贝拉——她在害怕，但她在。\n2. 记住：死亡不是终点。但我没有走到终点。我停在了半路。不要学我。\n\n—— 上一个你"\n\n信的末尾有一行几乎看不见的铅笔字：\n\n"P.S. 那个钟声——第十三声——它不是在叫醒祂。它是在叫醒你。别信它。"',

    choices: [
      {
        label: '保存信',
        text: '你把信折好，放进背包。这是上一个你留给你的唯一东西。',
        effects: {
          add_item: { id: 'letter_from_previous_self', name: '上一轮回的信', uses: 1 },
          add_clue: 'clue_loop_nature',
          add_flag: 'received_letter_previous_self',
          san: -1,
        },
      },
      {
        label: '烧掉它',
        text: '你用火柴点燃了信。纸卷曲、变黑、化为灰烬。你知道自己做了什么——你消灭了一个来自过去的信号。',
        effects: {
          add_flag: 'burned_letter_previous_self',
          san: -2,
          add_run_memory: { text: '你烧掉了上一个你的信。现在你永远不知道他/她经历了什么。' },
        },
      },
    ],

    echo_overlay: '安全屋里有时会出现不属于你的东西——来自上一个你的痕迹。',
  },
];

// Event: NPC的遗言回响
// Triggers when a specific NPC died in previous loop
export var events_death_meta_npc_farewell = [
  {
    id: 'death_meta_npc_farewell_echo',
    name: '回响的遗言',
    type: 'death_echo',
    rarity: 'secret',
    weight: 0.4,
    tags: ['death_echo', 'npc', 'meta', 'loop', 'farewell'],
    event_classification: '死亡回响',

    trigger: {
      areas: ['town_center', 'harbor_district', 'voxchester_manor'],
      probability: 0.15,
      once_per_run: true,
      min_loop: 2,
      requires_prev_area_death: 'town_center', // triggers in area where NPC died
      secret_requires: {
        loop: 2,
        san: { gte: 10, lte: 50 },
      },
    },

    description: function (state) {
      var deadAreas = state.loopEchoes?.deadNpcAreas || [];
      var currentArea = state.currentArea;
      var hasDeathHere = deadAreas.indexOf(currentArea) >= 0;
      if (!hasDeathHere) return null;

      // Pick a random dead NPC associated with this area
      var npcLines = {
        '老费舍': '雾中的声音说："钓线断了。我还在等它回来。"',
        '玛莎·格雷': '空气中有面包的香味。但面包店里没有人。',
        '伊莎贝拉·韦伯': '教堂的钟声响了一下。没有人敲。',
        '伊莱亚斯·沃德': '你走过市政厅时，听到有人在咳嗽。咳嗽声是伊莱亚斯的。',
        '希尔达·莫里斯': '莫里斯庄园的窗帘拉上了。之前它们是开着的。',
        '汤米·陈': '码头上有半杯没喝完的茶。还在冒热气。',
        '约书亚·布莱克': '码头仓库的门半开着。里面有一张被压皱的信纸。',
      };

      var npcNames = Object.keys(npcLines);
      var npcName = npcNames[Math.floor(Math.random() * npcNames.length)];
      return npcLines[npcName] + '\n\n你停了一步。不是因为你听见了什么——是因为你知道那个声音不会再回应你了。';
    },

    effects: {
      san: -2,
      add_flag: 'heard_npc_farewell_echo',
      add_run_memory: { text: '你听见了一个死去的NPC的声音。不是鬼魂。是回声。是他们在另一个时间线的最后一句话。' },
    },

    choices: [
      {
        label: '回应',
        text: '你对着空无一人的地方说了一句话。不是对NPC说的——是对上一个你。',
        effects: {
          san: -1,
          add_flag: 'responded_to_npc_echo',
        },
      },
      {
        label: '沉默',
        text: '你什么也没说。有些告别不需要回应。',
        effects: {
          add_flag: 'silent_npc_farewell',
        },
      },
    ],

    echo_overlay: 'NPC的遗言在这个世界上留下了回响。你有时会在他们去世的地方听见。',
  },
];

// Event: 死亡的真相碎片
// High-level meta event that reveals a piece of the loop's nature
export var events_death_meta_truth = [
  {
    id: 'death_meta_truth_fragment',
    name: '死亡的另一面',
    type: 'meta',
    rarity: 'secret',
    weight: 0.3,
    tags: ['meta', 'death', 'loop', 'truth', 'ending'],
    event_classification: 'Meta',

    trigger: {
      areas: ['town_center', 'deep_catacombs', 'ruins_of_yith'],
      probability: 0.1,
      once_per_run: true,
      min_loop: 4,
      requires_last_death_type: 'any',
      secret_requires: {
        loop: 4,
        san: { lte: 35 },
      },
    },

    description: function (state) {
      var fragments = state.deathFragments || [];
      var count = fragments.length;
      var msg = '你站在一个边界上。不是生与死的边界——是「知道」与「不知道」的边界。\n\n';
      if (count >= 5) {
        msg += '你口袋里的碎片开始共振。它们自己排列成了图案。不是文字——是理解。\n\n';
        msg += '你明白了：死亡不是结束。是「过渡」。是循环的一个阶段。而你的碎片——你每次死亡留下的记忆碎片——正在拼凑一个更大的真相。\n\n';
        msg += '那个真相有一个名字。你已经在梦里听过它。';
      } else if (count >= 3) {
        msg += '你口袋里的碎片在振动。它们似乎在尝试沟通。\n\n';
        msg += '你还差一些。还需要几次死亡。几次终结。然后——你就会看见。';
      } else {
        msg += '你感觉到身后有什么东西在看着你。\n\n';
        msg += '"你死了太少了，"那个声音说，"再死几次。你就会明白。"';
      }
      return msg;
    },

    effects: function (state) {
      var fragments = state.deathFragments || [];
      var effects = { san: -2 };
      if (fragments.length >= 5) {
        effects.add_clue = 'clue_death_nature';
        effects.add_flag = 'death_truth_assembled';
      }
      return effects;
    },

    dynamic_effects: true,

    choices: [
      {
        label: '追问',
        text: '"你是谁？"你问。\n\n雾笑了。"我是上一个还活着的时候的你。"',
        effects: {
          san: -2,
          add_flag: 'met_death_self',
        },
      },
      {
        label: '转身',
        text: '你转身离开。真相可以等。你还需要先活几次。',
        effects: {
          add_flag: 'deferred_death_truth',
        },
      },
    ],

    echo_overlay: '死亡不是终点。你知道这一点了——因为你口袋里装着证明。',
  },
];

// ── Export ──────────────────────────────────────────────────
export var events_death_meta = [
  ...events_death_meta_fragments,
  ...events_death_meta_letter,
  ...events_death_meta_npc_farewell,
  ...events_death_meta_truth,
];

export function getDeathMetaEvents() {
  return events_death_meta;
}

export function getDeathFragmentsMeta() {
  return {
    types: DEATH_FRAGMENT_TYPES,
    config: DEATH_FRAGMENT_META,
  };
}
