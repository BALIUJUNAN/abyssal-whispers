// data/ending_missing_600.js
// 隐藏结局：第六百个事件（ending_player_becomes_event）
// 由 missing_event_600 虚拟事件的第三个选项解锁。

export const ENDING_PLAYER_BECOMES_EVENT = {
  id: "ending_player_becomes_event",
  name: "第六百个事件",
  type: "hidden",
  world_outcome: "player_becomes_event",
  cost_bearer: "player",
  conditions: [
    { type: "has_flag", flag_id: "ending_player_becomes_event" },
  ],
  blocking_conditions: [],
  npc_requirements: {},
  resource_requirements: {},
  humanity_variants: {
    humanity_high:
      "你写下了自己的名字。\n\n" +
      "笔记本的页面开始发光。你感到自己正在变轻——不是失重，而是变得不那么真实。\n\n" +
      "你的手指穿过了纸面。你的呼吸变成了墨水的气味。\n\n" +
      "你不再是沃切斯特的调查员。\n" +
      "你是沃切斯特的第600个事件。\n\n" +
      "你的笔记本翻到了新的一页。上面写着你的名字、你的出生日期、你的死亡方式——\n" +
      "以及一行你从未写过的字：\n\n" +
      "「第六百个事件。类型：meta。触发条件：当玩家走到足够远的时候。」\n\n" +
      "你合上了笔记本。\n" +
      "你已经是故事的一部分了。",
    humanity_fragile:
      "你写下了自己的名字。\n\n" +
      "笔迹和页面上原有的字迹完全一致。\n\n" +
      "你感到自己的记忆在变薄。你的过去正在被重写。\n\n" +
      "你不再是调查员。你是一个条目。一个数据点。一个事件。\n\n" +
      "笔记本的封底写着：「第六百个事件：玩家成为事件本身。触发条件：当人性不足以区分自我和叙事时。」\n\n" +
      "你读了两遍。第二遍的时候，你不再确定这些字是你写的。",
    humanity_lost:
      "你写下了自己的名字。\n\n" +
      "名字从纸面上消失了。\n\n" +
      "你看了看自己的手。手也在消失。\n\n" +
      "你变成了文字。你变成了代码。你变成了一个 `id` 字段和一段 `description` 字符串。\n\n" +
      "笔记本自动翻到了最后一页。上面只有一行字：\n\n" +
      "「第六百个事件。状态：已触发。备注：玩家已不存在。」\n\n" +
      "你试图尖叫。但你的声音也被写进了 description 里。",
  },
  loop_memory_effect:
    "你记得自己变成了一段文字。你记得笔记本的最后一页。你记得——你是第600个事件。\n" +
    "但这不可能。事件不会记得自己是事件。\n" +
    "除非——事件选择了记住。",
  design_intent:
    "这是最稀有的隐藏结局。只有当玩家走到 599 个事件的尽头、" +
    "满足所有极终局条件、并在虚拟第600个事件中选择'写下自己的名字'时触发。" +
    "它打破第四面墙，但不是以喜剧的方式——而是以一种存在主义恐怖的方式。" +
    "玩家不再是观察者，而是被观察的对象。",
};

/**
 * 将此结局注入 GD.endings（在 initExtendedEvents 时调用）。
 */
export function injectMissingEnding(GD) {
  if (!GD.endings) GD.endings = [];
  const exists = GD.endings.some(e => e.id === ENDING_PLAYER_BECOMES_EVENT.id);
  if (!exists) {
    GD.endings.push(ENDING_PLAYER_BECOMES_EVENT);
  }

  // 注入优先级（最高）
  if (GD.ending_judgement && GD.ending_judgement.priority_order) {
    if (!GD.ending_judgement.priority_order.includes(ENDING_PLAYER_BECOMES_EVENT.id)) {
      GD.ending_judgement.priority_order.unshift(ENDING_PLAYER_BECOMES_EVENT.id);
    }
  }
}
