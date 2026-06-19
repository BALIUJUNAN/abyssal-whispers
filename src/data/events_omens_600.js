// data/events_omens_600.js
// 虚拟预兆事件 —— 第600事件的轻预兆，运行时生成，不入事件池。
// 当玩家接近终局条件但尚未完全满足时，这些事件先行显现。

export const OMEN_600_EVENT_IDS = [
  'omen_600_notebook_page',
  'omen_600_event_log',
  'omen_600_npc_whisper',
];

export const OMENS = [
  {
    id: 'omen_600_notebook_page',
    name: '笔记本的页码',
    type: 'meta',
    subtype: 'omen_600',
    weight: 1,
    tier: 'meta',
    tags: ['meta', 'omen', 'missing_600'],
    trigger: { areas: ['town_center'], probability: 1, once_ever: true },
    description:
      '你翻开笔记本，想查一条之前的记录。\n\n' +
      '翻到一半的时候，页码——右下角那个小小的数字——跳了一下。\n\n' +
      '599 变成了 600。\n\n' +
      '只持续了不到一秒，又变回了 599。\n\n' +
      '你盯着那一页看了很久。页面上什么都没有。\n' +
      '但你记得那个数字。',
    effects: { san: -1 },
    event_classification: '超自然遭遇',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'omen_600_event_log',
    name: '事件的计数',
    type: 'meta',
    subtype: 'omen_600',
    weight: 1,
    tier: 'meta',
    tags: ['meta', 'omen', 'missing_600'],
    trigger: { areas: ['town_center'], probability: 1, once_ever: true },
    description:
      '你检查了事件日志。\n\n' +
      '已经记录了 599 件事。\n\n' +
      '你往下翻，想看看还有没有更多。\n' +
      '最后一行写着：『第 599 条 / ？』\n\n' +
      '你盯着那个问号。\n' +
      '它不在 UI 里。它像是一个还没写完的句子——\n' +
      '或者一个还没发生的事件。',
    effects: { san: -1 },
    event_classification: '超自然遭遇',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'omen_600_npc_whisper',
    name: '路人的低语',
    type: 'meta',
    subtype: 'omen_600',
    weight: 1,
    tier: 'meta',
    tags: ['meta', 'omen', 'missing_600'],
    trigger: { areas: ['town_center'], probability: 1, once_ever: true },
    description:
      '你经过街角的时候，一个老人抬起头看着你。\n\n' +
      '他看了看你手里的笔记本，又看了看你的脸。\n\n' +
      '『你快被记下来了。』他说。\n\n' +
      '『什么？』\n\n' +
      '他没有回答。他低下头，继续看着地面，像刚才什么都没发生过。\n\n' +
      '你站在原地等了一会儿。他没有再抬头。',
    effects: { san: -1 },
    event_classification: '超自然遭遇',
    normalcy_anchor: false,
    choices: [],
  },
];

/**
 * Check if any omen should trigger.
 * Conditions: loop >= 8, mythos >= 20, previousEndings >= 3, not already seen.
 * @param {object} state
 * @returns {object|null} omen event or null
 */
export function checkOmens(state, rng) {
  var _rand = rng ? rng.next.bind(rng) : Math.random;
  const loop = state.loopCount || 0;
  const mythos = state.mythosLevel || 0;
  const endings = (state.previousEndings || []).length;
  const triggered = state.triggeredEvents || [];

  if (loop < 8 || mythos < 20 || endings < 3) return null;

  // Find first omen not yet triggered
  const available = OMENS.filter((o) => !triggered.includes(o.id));
  if (available.length === 0) return null;

  // 15% chance per eligible explore to show an omen
  if (_rand() > 0.15) return null;

  return available[0]; // return oldest unseen omen first
}

export default OMENS;
