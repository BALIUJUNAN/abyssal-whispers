// src/reducers/deathSystem.js - Death context resolution, typing, and text generation
// Provides resolveDeath / inferDeathType / getDeathText for unified death handling.

// =============================================
// Death type catalog
// =============================================

// HP death types (body dies)
const HP_DEATH_TYPES = {
  drowning:      { label: '溺水',   tags: ['water', 'harbor'] },
  bleeding:      { label: '失血',   tags: ['combat', 'wound'] },
  infection:     { label: '感染',   tags: ['infection', 'no_medicine'] },
  starvation:    { label: '饥饿',   tags: ['food'] },
  falling:       { label: '坠落',   tags: ['fall', 'lighthouse', 'catacombs'] },
  darkness_taken:{ label: '黑暗吞噬', tags: ['darkness'] },
  physical:      { label: '肉体消亡', tags: [] },
};

// SAN death types (self dies)
const SAN_DEATH_TYPES = {
  madness:           { label: '疯狂',     tags: [] },
  possession:        { label: '附身',     tags: ['possession'] },
  identity_erasure:  { label: '身份抹除', tags: ['meta'] },
  mythos_absorption: { label: '神话吞噬', tags: ['mythos'] },
  loop_collapse:     { label: '循环崩塌', tags: ['loop'] },
  becomes_event:     { label: '成为事件', tags: ['missing_600'] },
  mental:            { label: '理智崩塌', tags: [] },
};

// Hybrid (both HP and SAN zero)
const HYBRID_DEATH_TYPES = {
  body_and_self_lost: { label: '身心俱灭', tags: ['hybrid'] },
};

const ALL_DEATH_TYPES = { ...HP_DEATH_TYPES, ...SAN_DEATH_TYPES, ...HYBRID_DEATH_TYPES };

// =============================================
// Core: resolveDeath
// =============================================

/**
 * Resolve death context from current state.
 * Returns null if player is alive.
 * @param {object} state - game state
 * @param {object|null} sourceEvent - the event that caused death
 * @param {object|null} sourceChoice - the choice within the event (if any)
 * @returns {object|null} death context
 */
export function resolveDeath(state, sourceEvent = null, sourceChoice = null) {
  const hpDead = state.hp <= 0;
  const sanDead = state.san <= 0;
  if (!hpDead && !sanDead) return null;

  let mode = 'hp';
  if (sanDead && !hpDead) mode = 'san';
  if (sanDead && hpDead) mode = 'hybrid';

  const type = inferDeathType(state, sourceEvent, sourceChoice, mode);

  const result = {
    mode,
    type,
    area: state.currentArea || null,
    day: state.day || 1,
    loop: state.loopCount || 0,
    sourceEventId: sourceEvent?.id || null,
    sourceEventName: sourceEvent?.name || null,
    finalText: getDeathText(mode, type, state, sourceEvent),
    residueFlag: `death_echo_${type}`,
    lastDeathType: type,
    lastDeathMode: mode,
  };
  return result;
}

// =============================================
// inferDeathType
// =============================================

/**
 * Infer the specific death type from context.
 * Priority: death_hint on effects > tags > area/resource heuristics > default.
 */
export function inferDeathType(state, event, choice, mode) {
  // 1. Explicit death_hint on effects (highest priority)
  if (event?.effects?.death_hint && ALL_DEATH_TYPES[event.effects.death_hint]) {
    return event.effects.death_hint;
  }
  if (choice?.effects?.death_hint && ALL_DEATH_TYPES[choice.effects.death_hint]) {
    return choice.effects.death_hint;
  }

  const tags = [
    ...(event?.tags || []),
    ...(choice?.tags || []),
  ];

  // 2. SAN death typing
  if (mode === 'san') {
    if (tags.includes('missing_600')) return 'becomes_event';
    if (tags.includes('meta')) return 'identity_erasure';
    if (tags.includes('mythos') || (state.mythosLevel || 0) >= 20) return 'mythos_absorption';
    if (tags.includes('possession')) return 'possession';
    if ((state.loopCount || 0) >= 8 && (state.san || 0) <= 10) return 'loop_collapse';
    return 'madness';
  }

  // 3. Hybrid
  if (mode === 'hybrid') return 'body_and_self_lost';

  // 4. HP death typing
  if (tags.includes('water') || (state.currentArea === 'harbor_district' && !tags.includes('combat'))) return 'drowning';
  if (tags.includes('infection')) return 'infection';
  if (tags.includes('food') || (state.food != null && state.food <= 0)) return 'starvation';
  if (tags.includes('darkness') || (state.lightLevel != null && state.lightLevel <= 0)) return 'darkness_taken';
  if (tags.includes('fall') || state.currentArea === 'lighthouse') return 'falling';
  if (tags.includes('combat')) return 'bleeding';

  // 5. Area-based defaults (no tag matched, but area gives context)
  const area = state.currentArea || '';
  if (area === 'harbor_district') return 'drowning';
  if (area === 'lighthouse') return 'falling';
  if (area === 'deep_catacombs' || area === 'catacombs_entrance') return 'darkness_taken';
  if (area === 'whispering_forest' || area === 'forbidden_grove') return 'bleeding';
  if (area === 'voxchester_manor') return 'infection';
  if (area === 'ruins_of_yith') return 'darkness_taken';

  return 'physical';
}

// =============================================
// getDeathText - Four-part death narrative
// =============================================

/**
 * Generate the four-part death text.
 * Part 1: Title (你死于…)
 * Part 2: Last moment
 * Part 3: How the world handles your death
 * Part 4: What you left behind / next-loop pollution hint
 */
export function getDeathText(mode, type, state, sourceEvent) {
  const area = state.currentArea || '某处';
  const day = state.day || 1;
  const loop = state.loopCount || 0;

  // ---- HP death texts ----
  const hpTexts = {
    drowning: {
      title: '你死于溺水。',
      lastMoment:
        '你最后记得的是水。\n\n' +
        '不是冰冷，而是重量。\n\n' +
        '它从你的袖口、领口、口鼻灌进去。你想抓住码头边缘，但木板离你越来越远。\n\n' +
        '有人在岸上喊你的名字。\n\n' +
        '声音很熟悉。\n\n' +
        '像你自己。',
      worldHandles:
        '第二天，渔民在潮沟里找到一只怀表。表壳里全是盐。他们把它放在失物招领的箱子里。没有人来认领。',
      residue:
        '下一周目，码头会记得这件事。\n水面上会漂着一件外套。颜色、尺寸、袖口磨损的位置都和你身上的一样。\n你不会把它捞起来。\n你知道口袋里有什么。',
    },
    bleeding: {
      title: '你死于失血。',
      lastMoment:
        '伤口不疼了。\n\n' +
        '这是最糟的部分——当疼痛停止的时候，你知道已经太晚了。\n\n' +
        '你低头看着自己的手。手指在发白。\n\n' +
        '你试图站起来。膝盖没有响应。\n\n' +
        '你最后看到的是天花板上的裂缝。裂缝的形状像一条河。',
      worldHandles:
        '第二天，有人在你倒下的地方放了一束花。花是白色的。到了晚上就枯了。',
      residue:
        '下一周目，你的衣袖上会有一块洗不掉的深色印记。\n不是血。但你知道它是什么。',
    },
    infection: {
      title: '你死于感染。',
      lastMoment:
        '伤口已经不疼了。变成了一种持续的、低沉的热度。\n\n' +
        '你的视线开始模糊。你知道这是发烧。\n\n' +
        '你试图叫人。声音从喉咙里出来的时候，已经不像你的了。\n\n' +
        '你最后想到的是——你本可以用那瓶药的。',
      worldHandles:
        '安全屋的床单上留下了一片汗渍。形状像一只手。没有人去洗它。',
      residue:
        '下一周目，安全屋的床单上会有旧汗渍。\n你不会在意。\n但你的身体会记得那种热度。',
    },
    starvation: {
      title: '你死于饥饿。',
      lastMoment:
        '你已经不觉得饿了。\n\n' +
        '这才是最危险的信号。\n\n' +
        '你的身体在消耗自己。你能感觉到——不是疼痛，而是一种空洞。从胃开始，向四肢蔓延。\n\n' +
        '你最后看到的是一张空桌子。桌上有划痕。像是有人用指甲在上面写字。',
      worldHandles:
        '安全屋的餐桌上永远少了一副餐具。没有人记得原来有几副。',
      residue:
        '下一周目，你的餐桌上会多出一副没有人用的餐具。\n你会觉得这很正常。\n直到你数了数椅子。',
    },
    falling: {
      title: '你死于坠落。',
      lastMoment:
        '你听到风声。\n\n' +
        '不是外面的风——是你自己下坠时切割空气的声音。\n\n' +
        '你试图抓住什么。手指划过石壁，指甲断了两根。\n\n' +
        '你最后想到的是——坠落比你想象的要安静。',
      worldHandles:
        '竖井底部的石头上多了一道裂痕。形状像一个人。',
      residue:
        '下一周目，你会在某个高处听到骨头落地的声音。\n不是真的。\n但你的膝盖会发软。',
    },
    darkness_taken: {
      title: '你被黑暗吞噬。',
      lastMoment:
        '灯灭了。\n\n' +
        '你摸了摸口袋。火柴没了。\n\n' +
        '黑暗不是安静的。它有声音——低沉的、持续的、像是呼吸。\n\n' +
        '你感到有什么东西在你身边。不是敌人。更像是——等待。\n\n' +
        '你最后看到的是——\n\n' +
        '不。你什么都没看到。',
      worldHandles:
        '你的安全屋多了一盏没有人点燃的灯。灯油是满的。但火柴盒是空的。',
      residue:
        '下一周目，你醒来时嘴里会有石灰粉的味道。\n你会以为是做梦。\n但你的指甲缝里确实有白色的粉末。',
    },
    physical: {
      title: '你死了。',
      lastMoment:
        '你的身体停止了运作。\n\n' +
        '不是某个特定的原因。只是——磨损。累积的伤害、疲惫、和沃切斯特的重量。\n\n' +
        '你最后想到的是一个你本可以做但没有做的选择。',
      worldHandles:
        '有人在你倒下的地方做了一个标记。标记后来被雾冲掉了。',
      residue:
        '下一周目，你会在某个地方看到一个模糊的标记。\n你不会认出它。\n但你的身体会停下来。',
    },
  };

  // ---- SAN death texts ----
  const sanTexts = {
    madness: {
      title: '你疯了。',
      lastMoment:
        '你没有倒下。\n\n' +
        '这才是最糟的部分。\n\n' +
        '你继续站着，继续呼吸，继续看着沃切斯特的街道。街灯亮着。海风吹过来。有人从你身边经过，礼貌地点头。\n\n' +
        '你想回应。\n\n' +
        '但你想不起自己的名字。',
      worldHandles:
        '笔记本从你手里滑落。最后一页自己翻开。\n上面写着："该角色已失去观察资格。"',
      residue:
        '下一周目，笔记本上会出现不属于你的涂鸦。\n你不会记得写过它们。\n但笔迹确实是你的。',
    },
    possession: {
      title: '你被替换了。',
      lastMoment:
        '你没有失去意识。\n\n' +
        '你只是——退后了一步。\n\n' +
        '你的身体还在动。你的手还在翻书页。你的嘴还在说话。\n\n' +
        '但操作的人不是你。\n\n' +
        '你站在自己身体的后面，看着它继续生活。\n\n' +
        '它回头看了你一眼。\n\n' +
        '表情很平静。\n\n' +
        '像是在说——终于轮到我了。',
      worldHandles:
        '第二天，玛莎说你来过酒吧。你坐在角落里，一直写字。\n她问你写了什么。\n你写的是事件编号。',
      residue:
        '下一周目，NPC会说你昨晚来过。\n但你没有那段记忆。\n你的手会记得某些你没做过的动作。',
    },
    identity_erasure: {
      title: '你没有死。',
      lastMoment:
        '你的身体还在街上站着。\n你的手还握着笔记本。\n你的眼睛还看着这个世界。\n\n' +
        '只是从这一刻开始，看的人不再是你。\n\n' +
        '你想尖叫。但你的声音也被写进了 description 里。',
      worldHandles:
        '存档名短暂变成了空白。\n然后恢复了。\n但文件大小少了一个字节。',
      residue:
        '下一周目，你的名字会在某些地方消失。\nNPC会叫你"调查员"而不是你的名字。\n你不会注意到。\n直到你翻到笔记本的扉页。',
    },
    mythos_absorption: {
      title: '你知道得太多了。',
      lastMoment:
        '文字开始从书页上浮起来。\n\n' +
        '不是幻觉——是真的浮起来。字母、笔画、标点，像是被什么东西从纸面上拉了出来。\n\n' +
        '它们围着你旋转。你试图读它们。你确实读了。\n\n' +
        '你读懂了。\n\n' +
        '这才是最可怕的部分。',
      worldHandles:
        '你翻开的那本书自动合上了。书页的边缘烧焦了一小块。\n没有人再去碰它。',
      residue:
        '下一周目，你能读懂不该读懂的文字。\n但这不是礼物。\n文字也会读懂你。',
    },
    loop_collapse: {
      title: '循环崩塌了。',
      lastMoment:
        '世界少了一段你记得存在的路。\n\n' +
        '你站在路口。左边通向码头。右边通向森林。\n\n' +
        '但中间——\n\n' +
        '中间应该还有一条路。你走过很多次。你记得路边的那棵树。\n\n' +
        '路不见了。树也不见了。\n\n' +
        '你试图回忆那条路通向哪里。你的大脑拒绝了。\n\n' +
        '不是想不起来。是不允许想。',
      worldHandles:
        '沃切斯特的面积比昨天小了一点。\n没有人注意到。\n因为记忆也被一起删除了。',
      residue:
        '下一周目，地图上会少一条你记得存在的路。\n你不会质疑它。\n循环会帮你处理好一切。',
    },
    becomes_event: {
      title: '你成为了第600个事件。',
      lastMoment:
        '你写下了自己的名字。\n\n' +
        '名字从纸面上消失了。\n\n' +
        '你看了看自己的手。手也在消失。\n\n' +
        '你变成了文字。你变成了代码。你变成了一个 id 字段和一段 description 字符串。',
      worldHandles:
        '笔记本自动翻到了最后一页。上面只有一行字：\n"第六百个事件。状态：已触发。备注：玩家已不存在。"',
      residue:
        '下一周目，事件池里会多出一个不属于任何文件的事件。\n触发条件是：当玩家走到足够远的时候。\n事件的内容是——你的名字。',
    },
    mental: {
      title: '你的理智崩塌了。',
      lastMoment:
        '你试图抓住一个念头。任何念头。\n\n' +
        '但你的思绪像是握在手里的沙子。越用力，流失得越快。\n\n' +
        '你最后想到的是——\n\n' +
        '你忘了你要想什么。',
      worldHandles:
        '你的笔记本掉在了地上。没有人捡起它。\n风翻了几页。然后停了。',
      residue:
        '下一周目，你会在某个时刻突然忘记自己在做什么。\n只有几秒钟。\n但那几秒钟里，你不是你。',
    },
  };

  // ---- Hybrid death texts ----
  const hybridTexts = {
    body_and_self_lost: {
      title: '你死于身心俱灭。',
      lastMoment:
        '你的身体先倒下。\n\n' +
        '你的意识晚了一步。\n\n' +
        '它站在原地，看着你的尸体，像看着一件脱下来的外套。\n\n' +
        '然后它也开始下沉。\n\n' +
        '不是坠落——是溶解。像墨水滴进水里。\n\n' +
        '你最后看到的是自己的脸。表情很平静。\n\n' +
        '像是终于可以休息了。',
      worldHandles:
        '第二天，有人在你倒下的地方发现了两样东西：一只怀表和一本笔记本。\n怀表停了。笔记本的最后一页是空白的。\n没有人把它们放在一起。',
      residue:
        '下一周目，你会同时感到饥渴和空虚。\n身体想要食物。意识想要意义。\n两者都不会得到满足。',
    },
  };

  const textMap = mode === 'hp' ? hpTexts : mode === 'san' ? sanTexts : hybridTexts;
  const text = textMap[type] || textMap.physical || textMap.mental || textMap.body_and_self_lost || {
    title: '你死了。',
    lastMoment: '你的故事在这里中断了。',
    worldHandles: '世界继续运转。',
    residue: '下一周目，你会感到一阵莫名的熟悉。',
  };

  return [
    text.title,
    '',
    text.lastMoment,
    '',
    '——',
    '',
    text.worldHandles,
    '',
    '——',
    '',
    text.residue,
  ].join('\n');
}

// =============================================
// Label accessor (for UI)
// =============================================

export function getDeathTypeLabel(type) {
  return ALL_DEATH_TYPES[type]?.label || type || '未知';
}
