// src/systems/sanConsequenceChain.js - SAN logical consequence layer
// SSOT for all level-based SAN consequences beyond visual/interaction effects.
// Called from systemSlice.after and npcSlice/exploreSlice as appropriate.
//
// Architecture:
//   - generateFakeOptions(evt, level, rng) -> mutates evt.choices to add fakes
//   - processFakeChoice(choice, s, c) -> applies hidden penalty when fake chosen
//   - getFakeTrustHint(npcName, level, rng) -> fake trust message generator
//   - getApStealParams(level) -> { chance, amount } for forced AP steal
//   - getNegativeEventWeightMultiplier(level) -> multiplier for horror events
//   - checkSanLegacy(prevState) -> cross-loop madness memory trigger

import { pick, getCurrentSanStage } from '../reducers/utils.js';

// ============================================================
// Fake Exploration Options (SAN level 4+: cognitive_fog+)
// ============================================================

var FAKE_OPTION_TEMPLATES = [
  {
    label: '仔细检查，可能有收获',
    fakeLabel: '仔细检查——那里好像有什么在等你',
    consequence: { type: 'food_penalty', amount: 2 },
    narr: '你把周围翻了一遍。没有找到任何有用的东西——但你注意到自己的食物袋少了一些。',
  },
  {
    label: '尝试快速搜刮',
    fakeLabel: '快速搜刮——时间不多，但也许值得',
    consequence: { type: 'money_penalty', amount: 3 },
    narr: '你匆忙中碰倒了一些东西。等你回过神来，口袋里的硬币少了几个。',
  },
  {
    label: '深入查看',
    fakeLabel: '深入——越深入越有可能找到答案',
    consequence: { type: 'ap_penalty', amount: 2 },
    narr: '你越走越深。当你意识到的时候，已经消耗了比预期更多的行动力。这里什么都没有。',
  },
  {
    label: '休息片刻恢复状态',
    fakeLabel: '短暂休整——恢复之后再继续',
    consequence: { type: 'ap_penalty', amount: 1 },
    narr: '你靠墙坐了下来。当你再次站起时，感到比坐下之前更累了。时间不会等你。',
  },
  {
    label: '带走一些有用的东西',
    fakeLabel: '拿走你能拿的——总会有用的',
    consequence: { type: 'hp_penalty', amount: 2 },
    narr: '你拿起一件东西——它比你想象的重。有什么东西咬了你。你把它扔了，但已经晚了。',
  },
];

/**
 * Inject fake options into an event's choices array.
 * Fake options look rewarding but apply hidden penalties.
 * Mutates evt.choices in place; adds _fake and _fakeConsequence flags.
 *
 * @param {object} evt - the explore event (may have .choices)
 * @param {number} level - SAN stage level (4+ triggers fakes)
 * @param {function} rng - seeded random generator
 */
export function generateFakeOptions(evt, level, rng) {
  if (!evt || !evt.choices || evt.choices.length === 0) return;
  if (level < 4) return;

  var _rand = rng ? rng.next.bind(rng) : Math.random;

  // Probability: level 4=25%, level 5=50%, level 6=70%
  var chance = level >= 6 ? 0.7 : level >= 5 ? 0.5 : 0.25;
  if (_rand() > chance) return;

  // Pick 1-2 fake option templates (level 6 = 2 fakes)
  var numFakes = level >= 6 ? 2 : 1;
  var shuffled = FAKE_OPTION_TEMPLATES.slice().sort(function () { return _rand() - 0.5; });
  var selected = shuffled.slice(0, numFakes);

  for (var i = 0; i < selected.length; i++) {
    var t = selected[i];
    evt.choices.push({
      id: 'fake_' + (evt.id || 'evt') + '_' + i,
      label: t.fakeLabel,
      _fake: true,
      _fakeConsequence: t.consequence,
      _fakeNarr: t.narr,
      _originalLabel: t.label,
    });
  }
}

/**
 * Apply hidden penalty when player selects a fake option.
 * Call in exploreSlice when handling GAMBLE_CHOICE or choice selection.
 *
 * @param {object} choice - the selected choice (may have _fake flag)
 * @param {object} s - game state
 * @param {object} c - reducer context
 * @returns {string|null} fake narrative text to display
 */
export function processFakeChoice(choice, s, c) {
  if (!choice || !choice._fake) return null;
  var cons = choice._fakeConsequence;
  var narr = choice._fakeNarr || '你做了选择。但结果不是你期望的那样。';

  switch (cons.type) {
    case 'food_penalty':
      s.food = Math.max(0, (s.food || 0) - cons.amount);
      c.narr('system', narr + ' 食物 -' + cons.amount, { isEffect: true });
      break;
    case 'money_penalty':
      s.money = Math.max(0, (s.money || 0) - cons.amount);
      c.narr('system', narr + ' 金钱 -' + cons.amount, { isEffect: true });
      break;
    case 'ap_penalty':
      s.ap = Math.max(0, (s.ap || 0) - cons.amount);
      c.narr('system', narr + ' AP -' + cons.amount, { isEffect: true });
      break;
    case 'hp_penalty':
      s.hp = Math.max(0, (s.hp || 0) - cons.amount);
      c.narr('system', narr + ' HP -' + cons.amount, { isEffect: true });
      break;
    case 'san_penalty': {
      var loss = cons.amount || 2;
      // Synchronous SAN loss (no async import)
      s.san = Math.max(0, (s.san || 0) - loss);
      c.narr('system', narr + ' SAN -' + loss, { isEffect: true });
      break;
    }
  }
  return narr;
}

// ============================================================
// Fake NPC Trust Hint (SAN level 5+: reality_dissolution+)
// ============================================================

var FAKE_TRUST_HINTS = [
  '{npc}看着你，眼神里多了一丝温度。「也许……我可以信任你。」',
  '{npc}微微点头。「你让我想起了一些……不那么糟糕的事情。」',
  '{npc}沉默了一会，然后说：「也许你可以帮上忙。」信任感在增长。',
  '{npc}的语气缓和了一些。「你知道的比我想象的多。这很好。」',
  '{npc}犹豫了一下，然后告诉你一个之前没有提过的细节。',
];

/**
 * Check if this NPC interaction should trigger a fake trust hint.
 * Level 5 (reality_dissolution): 40% chance
 * Level 6 (narrative_death): 80% chance
 */
export function shouldShowFakeTrustHint(level, rng) {
  if (level < 5) return false;
  var _rand = rng ? rng.next.bind(rng) : Math.random;
  return _rand() < (level >= 6 ? 0.8 : 0.4);
}

/**
 * Get a fake trust hint narrative for a given NPC.
 * Returns { text, fakeAmount } — text implies trust increased but it didn't.
 */
export function getFakeTrustHint(npcName, level, rng) {
  if (!shouldShowFakeTrustHint(level, rng)) return null;
  var template = pick(FAKE_TRUST_HINTS, rng);
  var fakeAmount = level >= 6 ? 2 : 1;
  return {
    text: template.replace('{npc}', npcName),
    fakeAmount: fakeAmount,
  };
}

// ============================================================
// Forced AP Steal (SAN level 5+: reality_dissolution+)
// ============================================================

var AP_STEAL_TEXTS = [
  '你好像忘了什么。不是记忆——是时间。',
  '你低头看了一眼表。指针跳了一格。你确定刚才没有那么久。',
  '你的脚步比你预期的慢了一些。不是疲劳——是空间本身变厚了。',
  '你做了那个动作。但代价比你想象的多了一点。',
  '你数了数今天的行动力。数字变了。不是你改的。',
];

export function getApStealParams(level) {
  if (level >= 6) return { chance: 0.6, amount: 2 };
  if (level >= 5) return { chance: 0.3, amount: 1 };
  return { chance: 0, amount: 0 };
}

/**
 * Attempt forced AP steal on an action.
 */
export function tryApSteal(s, c, level) {
  var params = getApStealParams(level);
  if (params.chance <= 0) return false;

  var _rand = c.rng ? c.rng.next.bind(c.rng) : Math.random;
  if (_rand() > params.chance) return false;

  s.ap = Math.max(0, (s.ap || 0) - params.amount);
  c.narr('system', pick(AP_STEAL_TEXTS, c.rng) + ' AP -' + params.amount, { isEffect: true });
  return true;
}

// ============================================================
// Negative Event Weight Boost (SAN level 4+: cognitive_fog+)
// ============================================================

export function getNegativeEventWeightMultiplier(level) {
  if (level >= 6) return 2.0;
  if (level >= 5) return 1.5;
  if (level >= 4) return 1.3;
  return 1.0;
}

export function getSafeEventWeightMultiplier(level) {
  if (level >= 6) return 0.5;
  if (level >= 5) return 0.7;
  if (level >= 4) return 0.8;
  return 1.0;
}

// ============================================================
// Cross-Loop Madness Memory Legacy
// ============================================================

var MADNESS_MEMORY_EVENTS = {
  1: [
    {
      id: 'madness_memory_1',
      name: '模糊的回响',
      text: '你睁开眼时，脑海中闪过一些不属于这个清晨的画面。不是你自己的记忆——至少不是这个你的。\n\n你看到自己在另一个时间线的安全屋里，看着同样的天花板。那个「你」看起来……更疲惫。\n\n你甩甩头。画面消失了。但那种感觉留下了。',
      effect: { san: -1 },
      tags: ['madness_memory', 'meta'],
    },
  ],
  2: [
    {
      id: 'madness_memory_2',
      name: '重复的结局',
      text: '你又做那个梦了。或者说是「记忆」。\n\n你清楚地记得上一次循环最后几天发生的事——不是模糊的感觉，是具体的画面。你记得自己做了什么选择，每个选择的后果。\n\n但你也知道——这一次，你可能会做出不同的选择。也可能不会。',
      effect: { san: -2 },
      tags: ['madness_memory', 'meta', 'loop_echo'],
    },
  ],
  3: [
    {
      id: 'madness_memory_3',
      name: '轮回的记忆',
      text: '这一次，你「记得」所有的事。\n\n不是碎片——是完整的链。上一次你是怎么死的。上上一次。每一次你做出不同选择后的结局。那些你没有走过的路，你也「记得」它们通向哪里。\n\n这不是天赋。这是诅咒。你在这座城市里死去太多次了，以至于现实本身开始记住你。\n\n但现在——你知道了。你带着知识回来了。\n\n问题是：知识够吗？',
      effect: { san: -3 },
      tags: ['madness_memory', 'meta', 'full_loop_memory'],
    },
  ],
};

export function getMadnessMemoryEvent(collapseCount) {
  if (collapseCount < 1) return null;
  var tier = collapseCount >= 5 ? 3 : collapseCount >= 3 ? 2 : 1;
  var events = MADNESS_MEMORY_EVENTS[tier];
  if (!events || events.length === 0) return null;
  return events[0];
}

export function checkSanLegacy(prevState) {
  if (!prevState) return { collapseCount: 0, madnessEvent: null };

  var collapses = 0;
  var history = prevState.endingHistory || [];
  for (var i = 0; i < history.length; i++) {
    var entry = history[i];
    if (entry.ending_name && (
      entry.ending_name.indexOf('精神') >= 0 ||
      entry.ending_name.indexOf('疯狂') >= 0 ||
      entry.ending_name.indexOf('心智') >= 0 ||
      entry.ending_name.indexOf('深渊') >= 0 ||
      entry.ending_name.indexOf('SAN') >= 0
    )) {
      collapses++;
    }
  }
  if (prevState.lastDeathType === 'mental' || prevState.lastDeathMode === 'san') {
    collapses = Math.max(collapses, 1);
  }

  return {
    collapseCount: collapses,
    madnessEvent: getMadnessMemoryEvent(collapses),
  };
}

// ============================================================
// Convenience: apply all after-hook SAN consequences
// ============================================================

/**
 * Apply SAN level-based consequences that run after every action.
 * Fake trust (NPC_RESPONSE) and fake choices (EXPLORE) are handled
 * in their respective slices before systemSlice.after runs.
 *
 * @param {object} s - game state
 * @param {object} c - reducer context
 * @param {string} actionType - the dispatched action type
 */
export function applySanConsequences(s, c, actionType, ctx) {
  var stage = getCurrentSanStage(s.san, {
    GD: ctx?.GD || {},
  });
  var level = stage.level;

  // Fake trust is handled in npcSlice, skip here
  if (actionType === 'NPC_RESPONSE') return;
  // Fake choice processing is handled in exploreSlice, skip here
  if (actionType === 'EXPLORE') return;

  // Forced AP steal for all other action types at level 5+
  if (level >= 5) {
    tryApSteal(s, c, level);
  }
}
