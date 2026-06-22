// src/data/distortionTemplates.js
//
// Shared distortion variant templates keyed by subtype.
// Events with generic distortion text reference these instead of
// duplicating identical blocks across 50+ event objects.
//
// Priority: event-local distortion_variants > subtype template

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

// ── 恶行反噬 (14 events; 第15个有专属 corruption_high，见事件本地) ──
export const TEMPLATE_BAD_CONSEQUENCE = {
  san_low:
    '后果在膨胀。\n' +
    '你过去的恶行像回旋镖一样回来了。\n' +
    '每一个被你伤害过的人都变成了阴影中的眼睛。\n' +
    '他们在看着你。不是仇恨——是失望。\n' +
    '那种失望比仇恨更让你不安。',

  loop_3_plus:
    '你又回到了同一个场景。\n' +
    '上次你选择了恶。这次呢？\n' +
    '循环在测试你——不是测试你是否记得，\n' +
    '而是测试你是否愿意改变。\n' +
    '但改变需要先承认错误。而承认错误比走同一条路更难。',
};

// ── 人性摇摆 — 前期 (7 events) ───────────────────────
export const TEMPLATE_TRIAL_EARLY = {
  san_low:
    '你的视线在模糊。那些征兆、符号、场景——在你眼前扭曲、重叠、分离。\n' +
    '你分不清这是真实发生的事还是你的大脑在自行填补空白。\n' +
    '你捏了一下手背。疼。至少这部分是真实的。',

  loop_3_plus:
    '这已经不是你第一次经历这个了。\n' +
    '你确定——你在之前的循环里见过这一幕。\n' +
    '但记忆的边缘在模糊。是第几次来着？你数不清了。\n' +
    '但你知道——它还会再来。',
};

// ── 人性摇摆 — 后期 (3 events) ───────────────────────
export const TEMPLATE_TRIAL_LATE = {
  san_low:
    '你的视线在模糊。那些征兆、符号、场景——在你眼前扭曲、重叠、分离。\n' +
    '你分不清这是真实发生的事还是你的大脑在自行填补空白。\n' +
    '你捏了一下手背。疼。至少这部分是真实的。',

  loop_3_plus:
    '又一个循环。\n' +
    '你站在同一个十字路口，面对同一个选择。\n' +
    '但你已经不记得上次选了哪条路。\n' +
    '也许这就是循环的目的——不是让你记住，\n' +
    '而是让你在遗忘中一遍遍证明自己。',
};

// ── 集体态度 (8 events) ──────────────────────────────
export const TEMPLATE_COLLECTIVE = {
  san_low:
    '你的视线在模糊。那些征兆、符号、场景——在你眼前扭曲、重叠、分离。\n' +
    '你分不清这是真实发生的事还是你的大脑在自行填补空白。\n' +
    '你捏了一下手背。疼。至少这部分是真实的。',

  loop_3_plus:
    '又一个循环。\n' +
    '你站在同一个十字路口，面对同一个选择。\n' +
    '但你已经不记得上次选了哪条路。\n' +
    '也许这就是循环的目的——不是让你记住，\n' +
    '而是让你在遗忘中一遍遍证明自己。',
};

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

// ── Master lookup: subtype → template ──────────────────
// Events set `subtype` field; this map resolves to the template.
// Override per-event via `distortion_template` field if needed.
export const DISTORTION_TEMPLATE_MAP = {
  good_return: TEMPLATE_GOOD_RETURN,
  bad_consequence: TEMPLATE_BAD_CONSEQUENCE,
  trial_early: TEMPLATE_TRIAL_EARLY,
  trial_late: TEMPLATE_TRIAL_LATE,
  collective: TEMPLATE_COLLECTIVE,
  special_trade: TEMPLATE_SPECIAL_TRADE,
};
