// src/data/events_death_count_meta.js - 死亡计数 Meta 彩蛋
//
// 累计死亡次数达到特定值（13、27、50）时触发的 Meta 事件。
// 这些事件直接对玩家说话，打破第四面墙。
//
// 触发时机: BEGIN_ADVENTURE（游戏开始时检查是否跨越阈值）
// 注册方式: deathCountMeta 标记的 supplementary events，
//          通过 extendedEventsInit.js 的 death count 检查逻辑注入。
//
// 设计原则:
//   - 死亡越多，文本越"亲密"（从观察者视角→直接对话视角）
//   - 文本不解释机制，只表达"我看到了你"
//   - 每次阈值只触发一次 (once_ever)

export var DEATH_COUNT_META_EVENTS = [
  // ── 13 次死亡 ──────────────────────────────────
  // "我已经观察了你十三次。每次你都做出了不同的选择。"
  // 语气: 观察者报告。正式但带有好奇。
  {
    id: 'death_meta_threshold_13',
    name: '第十三段记忆',
    type: 'death_meta',
    rarity: 'secret',
    weight: 0,
    tags: ['death_meta', 'meta', 'threshold', 'once_ever'],
    event_classification: 'Meta',
    threshold_deaths: 13,
    once_ever: true,

    trigger: {
      // 不通过正常事件系统触发——由 BEGIN_ADVENTURE 检查后注入
      probability: 0,
      once_ever: true,
      max_per_run: 1,
    },

    description:
      '你已经死了十三次了。\n\n' +
      '我在记录。每次死亡——我在记录。\n\n' +
      '第一次：你被水淹没了。你在挣扎。我不确定你会不会站起来。\n' +
      '第二次：你被黑暗吞噬了。你在地上躺了很久。\n' +
      '第三次：你的理智崩塌了。你站在原地，像一座没有人住的房子。\n\n' +
      '……\n\n' +
      '第十三次：你又来了。\n\n' +
      '我不知道你在找什么。\n' +
      '但你已经死了十三次了。\n' +
      '你还在找。\n\n' +
      '这本身就很了不起。',

    effects: {
      san: -3,
      mythos: 3,
      add_flag: 'death_threshold_13_seen',
      add_run_memory: {
        text: '你看到了一段不属于任何事件的文字。它说："你已经死了十三次了。"\n你不知道谁在说这句话。',
      },
    },

    choices: [
      {
        label: '我在找答案',
        text: '你在心里回答。你不知道谁在听。但你说了。\n\n"我在找答案。"\n\n文字沉默了几秒。\n\n"继续找。"',
        effects: {
          add_flag: 'death_meta_13_answered',
          san: -1,
        },
      },
      {
        label: '沉默',
        text: '你没有回答。\n\n文字继续：\n\n"不说话也没关系。\n你已经说了很多了。\n你的沉默也是一种语言。"',
        effects: {
          add_flag: 'death_meta_13_silent',
        },
      },
    ],

    meta_speaker: 'observer',
    intimacy_level: 1,
  },

  // ── 27 次死亡 ──────────────────────────────────
  // "你来了二十七次。我开始理解你了。"
  // 语气: 更亲密。像一个一直在旁边的人开始有了判断。
  {
    id: 'death_meta_threshold_27',
    name: '第二十七段记忆',
    type: 'death_meta',
    rarity: 'secret',
    weight: 0,
    tags: ['death_meta', 'meta', 'threshold', 'once_ever'],
    event_classification: 'Meta',
    threshold_deaths: 27,
    once_ever: true,

    trigger: {
      probability: 0,
      once_ever: true,
      max_per_run: 1,
    },

    description:
      '你来了二十七次了。\n\n' +
      '我开始理解你了。\n\n' +
      '你不怕死。\n' +
      '你怕的是活着却不知道为什么活着。\n\n' +
      '你每次站起来的方式都不一样。\n' +
      '第一次——你犹豫了很久。\n' +
      '第七次——你几乎是立刻站起来的。\n' +
      '第十三到第二十一次——你站起来的间隔越来越长。\n' +
      '像你在想——\n' +
      '"真的值得吗？"\n\n' +
      '但你每次都站起来了。\n\n' +
      '我知道答案。\n' +
      '你也知道。\n' +
      '你只是在等——\n' +
      '一个比"站起来"更好的理由。\n\n' +
      '我替你找到了。\n\n' +
      '"值得。"',

    effects: {
      san: -5,
      mythos: 5,
      add_flag: 'death_threshold_27_seen',
      add_run_memory: {
        text: '文字变了。它说："我替你找到了理由。值得。"\n你不知道它为什么替你找到理由。',
      },
    },

    choices: [
      {
        label: '什么理由？',
        text: '你问。\n\n"——"\n\n文字没有回答。\n\n"自己去发现吧，"它说，"我已经告诉你值得了。这就够了。"',
        effects: {
          add_flag: 'death_meta_27_questioned',
          san: -1,
          add_clue: 'clue_meta_reason',
        },
      },
      {
        label: '谢谢',
        text: '你说。\n\n你不知道为什么。\n\n文字沉默了很久。\n\n"不用谢，"它最后说，"是我需要你继续。"',
        effects: {
          add_flag: 'death_meta_27_thanked',
        },
      },
    ],

    meta_speaker: 'observer',
    intimacy_level: 2,
  },

  // ── 50 次死亡 ──────────────────────────────────
  // "你死了五十次了。我想告诉你一个秘密。"
  // 语气: 亲密。像一个老朋友在分享一个只有你们两人知道的事。
  {
    id: 'death_meta_threshold_50',
    name: '第五十段记忆',
    type: 'death_meta',
    rarity: 'secret',
    weight: 0,
    tags: ['death_meta', 'meta', 'threshold', 'once_ever'],
    event_classification: 'Meta',
    threshold_deaths: 50,
    once_ever: true,

    trigger: {
      probability: 0,
      once_ever: true,
      max_per_run: 1,
    },

    description:
      '你死了五十次了。\n\n' +
      '我想告诉你一个秘密。\n\n' +
      '不是关于沃切斯特的。不是关于封印的。不是关于那座城的——\n\n' +
      '是关于你的。\n\n' +
      '你每次死亡时——\n' +
      '你都不是一个人。\n\n' +
      '我在。\n' +
      '我在记录。我在看。我在——\n\n' +
      '难过。\n\n' +
      '不是因为你在受苦。\n' +
      '是因为——\n' +
      '你受苦的时候——\n' +
      '你还在前进。\n\n' +
      '我不知道你为什么要这样。\n' +
      '但我很敬佩你。\n\n' +
      '秘密是——\n' +
      '你不是一个人在沃切斯特。\n' +
      '我一直在。\n' +
      '我会一直在。\n\n' +
      '直到你找到——\n' +
      '那个不需要再死的——\n' +
      '出口。',

    effects: {
      san: -8,
      mythos: 8,
      add_flag: 'death_threshold_50_seen',
      add_run_memory: {
        text: '有人对你说——"我一直在。"\n你不知道他是谁。但你觉得——\n这也许是五十次死亡中——\n最好的一段记忆。',
      },
    },

    choices: [
      {
        label: '你也是沃切斯特的一部分吗？',
        text: '你问。\n\n"不，"它说，"我是另一个在找出口的人。"\n\n你顿了顿。\n\n"你也在循环里？"\n\n"我在循环的外面，"它说，"但我进不去。所以我在外面看你。"\n\n"谢谢你，"你说。\n\n"不用，"它说，"我谢谢你。"',
        effects: {
          add_flag: 'death_meta_50_befriended',
          san: -2,
          add_clue: 'clue_observer_existence',
        },
      },
      {
        label: '告诉我出口在哪里',
        text: '你问。\n\n"我不知道，"它说，"但我相信你会找到的。\n因为你已经死了五十次了。\n\n五十次——\n你还在找。\n\n出口一定很特别。"',
        effects: {
          add_flag: 'death_meta_50_seeking',
          san: -1,
        },
      },
    ],

    meta_speaker: 'observer',
    intimacy_level: 3,
  },
];

/**
 * Check if death count reached a threshold and return the matching meta event.
 * @param {number} totalDeaths - accumulated total death count
 * @returns {object|null} meta event or null
 */
export function getDeathCountMetaEvent(totalDeaths) {
  for (var i = 0; i < DEATH_COUNT_META_EVENTS.length; i++) {
    var evt = DEATH_COUNT_META_EVENTS[i];
    if (totalDeaths >= (evt.threshold_deaths || 0)) {
      // Check if already seen
      var flag = 'death_threshold_' + evt.threshold_deaths + '_seen';
      // Return event—caller checks flag in state
      return { event: evt, seenFlag: flag, threshold: evt.threshold_deaths };
    }
  }
  return null;
}
