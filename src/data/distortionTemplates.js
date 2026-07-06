// src/data/distortionTemplates.js
//
// Shared distortion variant templates keyed by template name.
// Events reference these via `distortion_template: '<key>'` field;
// EventEngine.injectDistortionTemplates() copies template variants
// into each event's distortion_variants at init time.
//
// Active templates: 5 (good_return, bad_consequence, trial, collective, special_trade)
// Covering 54 humanity events with 0 inline duplication.

// ── 善行回报 (15 events) ──────────────────────────────
export const TEMPLATE_GOOD_RETURN = {
  san_low:
    '善意在扭曲。\n' +
    '你分不清这份善意是来自他人的真心，还是来自你SAN降低后的臆想。\n' +
    '也许他们从来没有对你微笑。也许那只是你疲惫的大脑制造的幻觉。\n' +
    '但你感受到了温暖。这就够了。或者……这本身就是问题所在。',

  loop_3_plus:
    '你记得上一次也是类似的情景。\n' +
    '同一个NPC、同一份善意、同一句温暖的话。\n' +
    '但结局不一样。上次你选择了另一条路。\n' +
    '现在你又站在了同一个路口。\n' +
    '善意是循环里为数不多的锚点——但锚点也会移位。',

  false_memory:
    '你记得收到过这份善意——但也许是在另一个循环里。\n' +
    '这个NPC在另一个时间线里对你说过同样的话。\n' +
    '你分不清这份善意属于当前的时间线，还是属于某个你已遗忘的过去。\n' +
    '但无论如何，你选择相信它。',
};

// ── 恶行反噬 (15 events) ──────────────────────────────
export const TEMPLATE_BAD_CONSEQUENCE = {
  san_low:
    '后果在膨胀。\n' +
    '你过去的恶行像回旋镖一样回来了。\n' +
    '每一个被你伤害过的人都变成了阴影中的眼睛。\n' +
    '他们在看着你。不是仇恨——是失望。\n' +
    '那种失望比仇恨更让你不安。',

  corruption_high:
    '环境在呼应你的恶。\n' +
    '墙壁上的污渍更深了。空气中有一种铁锈和灰烬的味道。\n' +
    '你经过的地方，阴影似乎变得更浓。\n' +
    '不是光线变暗了——是你在把光带走。\n' +
    '你留下的只有暗色的痕迹。',

  loop_3_plus:
    '你又回到了同一个场景。\n' +
    '上次你选择了恶。这次呢？\n' +
    '循环在测试你——不是测试你是否记得，\n' +
    '而是测试你是否愿意改变。\n' +
    '但改变需要先承认错误。而承认错误比走同一条路更难。',
};

// ── 人性摇摆 — trial_early + trial_late 合并为 TEMPLATE_TRIAL ──
export const TEMPLATE_TRIAL = {
  san_low:
    '你的视线在模糊。那些征兆、符号、场景——在你眼前扭曲、重叠、分离。\n' +
    '你分不清这是真实发生的事还是你的大脑在自行填补空白。\n' +
    '你捏了一下手背。疼。至少这部分是真实的。',

  san_mid:
    '你注意到了一些以前没有注意到的细节。\n' +
    '空气中的气味变了。墙壁上的纹理似乎在缓慢脉动。\n' +
    '你觉得它们在有节奏地跳动——像某种巨大的器官。',

  loop_3_plus:
    '又一个循环。\n' +
    '你站在同一个十字路口，面对同一个选择。\n' +
    '但你已经不记得上次选了哪条路。\n' +
    '也许这就是循环的目的——不是让你记住，\n' +
    '而是让你在遗忘中一遍遍证明自己。',
};

// ── 集体态度 (8 events) — 同 TEMPLATE_TRIAL ──
// DISTORTION_TEMPLATE_MAP.collective 指向 TEMPLATE_TRIAL。

// ── 特殊交易 (6 events) ──────────────────────────────
export const TEMPLATE_SPECIAL_TRADE = {
  san_low:
    '交易正在进行。但你不知道交易的双方是谁。\n' +
    '你觉得自己是买家，也觉得自己是商品。\n' +
    '签契约的手在发抖——你不知道那是对方的手还是你的手。\n' +
    '墨迹还没干。但你已经签了。',

  loop_3_plus:
    '又一个循环。\n' +
    '你站在同一个十字路口，面对同一个选择。\n' +
    '但你已经不记得上次选了哪条路。\n' +
    '也许这就是循环的目的——不是让你记住，\n' +
    '而是让你在遗忘中一遍遍证明自己。',

  corruption_high:
    '空气中弥漫着一种陌生的气味。\n' +
    '墙壁的颜色似乎比记忆中更深了。角落里有东西在蠕动。\n' +
    '你翻了个身。床垫发出的声音不像弹簧——更像某种软体生物的呼吸。',
};

// ── Master lookup ──────────────────────────────────────
// Events set `distortion_template` field; this map resolves to the template.
// Override per-event via local distortion_variants if needed.
export const DISTORTION_TEMPLATE_MAP = {
  good_return: TEMPLATE_GOOD_RETURN,
  bad_consequence: TEMPLATE_BAD_CONSEQUENCE,
  trial: TEMPLATE_TRIAL,
  collective: TEMPLATE_TRIAL,
  special_trade: TEMPLATE_SPECIAL_TRADE,
};
