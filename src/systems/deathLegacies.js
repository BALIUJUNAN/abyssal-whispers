// src/systems/deathLegacies.js - 死亡遗产系统
//
// 每个死亡归因类别对应不同的遗产效果。
// 遗产在 initLoopState 中带上，在 BEGIN_ADVENTURE 中消费。
//
// 遗产效果:
//   认知崩塌 (SAN崩溃):
//     → maxSan -5，但开局多 1 件理智道具（从理智道具池随机抽取）
//   被消食 (饥饿/感染):
//     → food +2，但 maxAp -1
//   成为事件 (事件死亡):
//     → 同类事件触发概率降低（通过 loopEchoFlags 标记实现）
//   被献祭 (NPC背叛):
//     → 所有 NPC 初始信任 -1，但获得"识人"特质
//   不抵抗 (自杀):
//     → pollution -0.1（世界对你温柔了一点），但 humanityScore -5

import { makeRand } from '../reducers/utils.js';

// =============================================
// Legacy definitions
// =============================================

export var DEATH_LEGACY_DEFS = {
  // ── 认知崩塌: SAN上限削弱 + 开局理智道具 ──
  cognitive_collapse: {
    key: 'cognitive_collapse',
    label: '认知崩塌遗产',
    hint: '你的理智结构永久性地变薄了。但你带上了防护。',
    effects: [
      { type: 'max_san_reduction', value: -5 },
      { type: 'start_with_sanity_item' },
    ],
  },

  // ── 被消食: 食物补偿 + AP上限削弱 ──
  consumed_by_city: {
    key: 'consumed_by_city',
    label: '被消食遗产',
    hint: '沃切斯特教会了你留食物。但也限制了你的行动范围。',
    effects: [
      { type: 'start_food_bonus', value: 2 },
      { type: 'max_ap_reduction', value: -1 },
    ],
  },

  // ── 成为事件: 同类事件概率降低 ──
  became_the_event: {
    key: 'became_the_event',
    label: '成为事件遗产',
    hint: '你记住了。世界在你身上留下了"警告"。',
    effects: [
      { type: 'event_resistance', category: 'event' },
    ],
  },

  // ── 被献祭: NPC信任降低 + 识人特质 ──
  sacrificed_by_city: {
    key: 'sacrificed_by_city',
    label: '被献祭遗产',
    hint: '你不再轻易信任。但你知道谁值得怀疑。',
    effects: [
      { type: 'npc_trust_penalty', value: -1 },
      { type: 'grant_trait', traitId: 'trait_keen_eye', traitName: '识人' },
    ],
  },

  // ── 不抵抗: 污染减轻 + 人性削弱 ──
  surrendered_to_world: {
    key: 'surrendered_to_world',
    label: '不抵抗遗产',
    hint: '你放手了。世界对你温柔了一点。但你已经不再完整。',
    effects: [
      { type: 'pollution_reduction', value: 0.1 },
      { type: 'humanity_cost', value: -5 },
    ],
  },
};

// =============================================
// Legacy state helpers
// =============================================

/**
 * Get the legacy definition for a death attribution category.
 * @param {string} category - attribution category key
 * @returns {object|null} legacy definition
 */
export function getLegacyForCategory(category) {
  return DEATH_LEGACY_DEFS[category] || null;
}

/**
 * Apply a death legacy to the game state.
 * Called during BEGIN_ADVENTURE when active legacies exist.
 *
 * @param {object} s      - mutable game state (draft)
 * @param {object} legacy - legacy definition from DEATH_LEGACY_DEFS
 * @param {function} narr - narrative pusher
 * @param {object} [ctx]  - { GD }
 * @param {object|null} [rng] - seeded RNG
 */
export function applyDeathLegacy(s, legacy, narr, ctx, rng) {
  var GD = ctx?.GD || (typeof window !== 'undefined' && window.GD) || {};
  var _rand = makeRand(rng);

  if (!legacy || !legacy.effects) return;

  for (var i = 0; i < legacy.effects.length; i++) {
    var eff = legacy.effects[i];

    switch (eff.type) {
      // ── max_san_reduction ──
      case 'max_san_reduction': {
        s.maxSan = Math.max(10, (s.maxSan || 60) + eff.value);
        s.san = Math.min(s.san, s.maxSan);
        narr(
          'system',
          '你感到某种结构性的变化——你的精神承受上限下降了。'
            + eff.value + '。'
            + '但你也感受到了一些防护正在你周围形成。'
        );
        break;
      }

      // ── start_food_bonus ──
      case 'start_food_bonus': {
        s.food = Math.min(s.maxFood || 5, (s.food || 0) + eff.value);
        narr(
          'system',
          '沃切斯特在你的口袋里留了些食物。' + eff.value + '份。'
            + '但这也意味着你的身体已经适应了更少的需求——行动范围缩小了。'
        );
        break;
      }

      // ── max_ap_reduction ──
      case 'max_ap_reduction': {
        s.maxAp = Math.max(1, (s.maxAp || 12) + eff.value);
        s.ap = Math.min(s.ap, s.maxAp);
        break;
      }

      // ── event_resistance ──
      case 'event_resistance': {
        // Store resistance flag in state for EventEngine to check
        if (!s._eventResistance) s._eventResistance = {};
        s._eventResistance[eff.category] = (s._eventResistance[eff.category] || 0) + 1;
        narr(
          'system',
          '你在某些事件上看到了规律。同类事件似乎不再那么频繁地出现了。'
            + '你记住了教训。'
        );
        break;
      }

      // ── npc_trust_penalty ──
      case 'npc_trust_penalty': {
        var npcIds = Object.keys(s.npcTrust || {});
        for (var j = 0; j < npcIds.length; j++) {
          var nid = npcIds[j];
          s.npcTrust[nid] = Math.max(0, (s.npcTrust[nid] || 0) + eff.value);
        }
        narr(
          'system',
          '沃切斯特让一些人开始用不同的眼光看你。' + eff.value + '。'
            + '但你注意到了一些以前没注意到的东西——\n'
            + '某些人看向你时的犹豫。某些话题被刻意绕开。'
        );
        break;
      }

      // ── grant_trait ──
      case 'grant_trait': {
        if (!s.traits) s.traits = [];
        var alreadyHas = s.traits.some(function (t) { return t.id === eff.traitId; });
        if (!alreadyHas) {
          s.traits.push({ id: eff.traitId, name: eff.traitName });
          narr(
            'system',
            '你获得了一个特质：' + eff.traitName + '。\n'
              + '你不再需要理由去怀疑。你的直觉就是理由。'
          );
        }
        break;
      }

      // ── pollution_reduction ──
      case 'pollution_reduction': {
        s.pollution = Math.max(0, (s.pollution || 0) + eff.value);
        narr(
          'system',
          '你感到世界对你的态度……软化了一点。'
            + '污染程度有所降低。'
            + '像世界允许了你的放手——并给了你一份小礼物。'
        );
        break;
      }

      // ── humanity_cost ──
      case 'humanity_cost': {
        s.humanityScore = Math.max(0, (s.humanityScore || 30) + eff.value);
        narr(
          'system',
          '你感到自己的一部分已经不再回来了。'
            + '但这并不让你悲伤。\n'
            + '只是让你——更轻了。'
        );
        break;
      }
    }
  }
}

// =============================================
// Death fragment generation (legacy narrative)
// =============================================

var FRAGMENT_TYPES = {
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

var FRAGMENT_META = {
  max_fragments: 12,
  decay_per_loop: 1,
  assembly_threshold: 5,
};

/**
 * Generate 1-2 death fragments and add to state.
 * Fragments carry narrative across loops as legacy items.
 *
 * @param {object} state     - mutable game state
 * @param {object} deathCtx  - death context from resolveDeath
 * @param {object|null} rng  - seeded RNG
 */
export function generateDeathFragments(state, deathCtx, rng) {
  var _rand = makeRand(rng);
  var fragments = state.deathFragments || [];
  var typeKey = deathCtx.mode === 'hp' ? 'hp_death' :
                deathCtx.mode === 'san' ? 'san_death' : 'hybrid_death';
  var typeData = FRAGMENT_TYPES[typeKey];
  if (!typeData) return fragments;

  var pool = typeData.fragments;
  var count = 1 + Math.floor(_rand() * 2);
  for (var i = 0; i < count && fragments.length < FRAGMENT_META.max_fragments; i++) {
    var text = pool[Math.floor(_rand() * pool.length)];
    fragments.push({
      text: text,
      type: typeKey,
      day: deathCtx.day,
      loop: deathCtx.loop,
      area: deathCtx.area,
      assembled: false,
    });
  }
  state.deathFragments = fragments;
  return fragments;
}

/**
 * Check if enough unassembled fragments exist to assemble a "death truth".
 * @param {object} state
 * @returns {object|null} assembly result
 */
export function checkDeathTruthAssembly(state) {
  var fragments = state.deathFragments || [];
  var unassembled = fragments.filter(function (f) { return !f.assembled; });
  if (unassembled.length >= FRAGMENT_META.assembly_threshold) {
    return {
      assembled: true,
      clue_id: 'clue_death_nature',
      fragments_used: FRAGMENT_META.assembly_threshold,
    };
  }
  return null;
}

/**
 * Apply fragment decay (called during loop transition).
 * Removes 1 fragment per loop.
 * @param {object} state
 */
export function decayDeathFragments(state) {
  var fragments = state.deathFragments || [];
  if (fragments.length > FRAGMENT_META.decay_per_loop) {
    // Remove the oldest unassembled fragments first
    fragments = fragments.filter(function (f) { return f.assembled; }).concat(
      fragments.filter(function (f) { return !f.assembled; })
    );
    var toRemove = Math.min(FRAGMENT_META.decay_per_loop, fragments.length);
    fragments = fragments.slice(toRemove);
  }
  state.deathFragments = fragments;
  return fragments;
}
