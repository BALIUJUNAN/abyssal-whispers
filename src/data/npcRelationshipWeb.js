// src/data/npcRelationshipWeb.js — NPC Relationship Network
// Defines the web of relationships between NPCs in沃切斯特.
// When the player helps/harms one NPC, the effects ripple through the network.
// There are NO perfect choices — every action has a moral cost.
//
// Architecture:
//   npcRelations — bidirectional relationship map (who knows whom, how well)
//   moralDilemmas — specific choice scenarios where helping A hurts B
//   reputationPropagation — trust changes ripple through shared connections
//   factionAlignment — NPCs belong to factions; actions affect faction standing

// ═══════════════════════════════════════════════════════════════
// SECTION 1: Faction Definitions
// ═══════════════════════════════════════════════════════════════

export var FACTIONS = {
  seal_keeper: {
    id: 'seal_keeper',
    name: '封印守护者',
    description: '致力于维护或修复古老封印的组织',
    color: '#4a9eff',
    members: ['伊莱亚斯·沃德', '希尔达·莫里斯', '伊莎贝拉·韦伯'],
    goals: ['seal_restored', 'ancient_knowledge_preserved'],
    conflicts: ['deep_one', 'cultist'],
  },
  deep_one: {
    id: 'deep_one',
    name: '深潜者血脉',
    description: '被海洋污染影响的混血人类及其后代',
    color: '#2d8a6e',
    members: ['老费舍', '玛莎·格雷'],
    goals: ['fusion_accepted', 'seal_broken'],
    conflicts: ['seal_keeper'],
  },
  town_civilian: {
    id: 'town_civilian',
    name: '普通镇民',
    description: '不知情或选择无视真相的城镇居民',
    color: '#8a8a8a',
    members: ['汤米·陈'],
    goals: ['normal_life', 'town_safe'],
    conflicts: [],
  },
  military: {
    id: 'military',
    name: '军方残余',
    description: '了解部分真相的军事人员',
    color: '#6b5b3a',
    members: ['约书亚·布莱克'],
    goals: ['lighthouse_secured', 'containment'],
    conflicts: ['deep_one', 'cultist'],
  },
  cultist: {
    id: 'cultist',
    name: '晨星会',
    description: '崇拜古神的秘密教团',
    color: '#8b0000',
    members: ['伊莎贝拉·韦伯'], // hidden affiliation
    goals: ['seal_broken', 'ritual_completed'],
    conflicts: ['seal_keeper', 'military'],
  },
};

// ═══════════════════════════════════════════════════════════════
// SECTION 2: NPC Relationship Graph
// ═══════════════════════════════════════════════════════════════
// Each relationship has:
//   affinity: -5 to +5 (how much they like each other)
//   knowledge: boolean (does A know B?)
//   secretShared: string[] (shared secrets between A and B)
//   conflict: string|null (source of tension between A and B)
//   moralWeight: number (how much the player's action toward A affects B)

export var NPC_RELATIONSHIPS = {
  // 伊莱亚斯 ↔ 玛莎
  '伊莱亚斯·沃德-玛莎·格雷': {
    affinity: 2,
    knowledge: true,
    secretShared: ['seal_location'],
    conflict: null,
    moralWeight: 1.5,
    note: '互相尊重但保持距离。伊莱亚斯知道玛莎的丈夫是深潜者混血，但没有揭发。',
  },

  // 伊莱亚斯 ↔ 希尔达
  '伊莱亚斯·沃德-希尔达·莫里斯': {
    affinity: 3,
    knowledge: true,
    secretShared: ['seal_ritual', 'morris_bloodline'],
    conflict: null,
    moralWeight: 2.0,
    note: '学术合作者。希尔达的家族是封印的关键，伊莱亚斯是唯一理解封印原理的外人。',
  },

  // 伊莱亚斯 ↔ 伊莎贝拉
  '伊莱亚斯·沃德-伊莎贝拉·韦伯': {
    affinity: -2,
    knowledge: true,
    secretShared: [],
    conflict: '伊莎贝拉是晨星会成员，伊莱亚斯在研究如何阻止晨星会',
    moralWeight: 1.0,
    note: '表面礼貌，实质对立。伊莱亚斯不知道伊莎贝拉的真实身份。',
  },

  // 玛莎 ↔ 老费舍
  '玛莎·格雷-老费舍': {
    affinity: 4,
    knowledge: true,
    secretShared: ['deep_one_transformation', 'harbor_secrets'],
    conflict: null,
    moralWeight: 2.5,
    note: '夫妻关系（虽然名义上丈夫失踪）。玛莎不知道费舍的完整计划。',
  },

  // 玛莎 ↔ 伊莎贝拉
  '玛莎·格雷-伊莎贝拉·韦伯': {
    affinity: 1,
    knowledge: true,
    secretShared: [],
    conflict: null,
    moralWeight: 0.5,
    note: '点头之交。玛莎对教堂的事不关心。',
  },

  // 老费舍 ↔ 伊莎贝拉
  '老费舍-伊莎贝拉·韦伯': {
    affinity: 3,
    knowledge: true,
    secretShared: ['seal_ritual', 'cult_plan'],
    conflict: null,
    moralWeight: 2.0,
    note: '晨星会内部合作。费舍提供海洋/混血知识，伊莎贝拉提供封印知识。',
  },

  // 伊莎贝拉 ↔ 希尔达
  '伊莎贝拉·韦伯-希尔达·莫里斯': {
    affinity: -3,
    knowledge: true,
    secretShared: [],
    conflict: '伊莎贝拉需要希尔达的血液完成封印破坏仪式',
    moralWeight: 3.0,
    note: '最危险的冲突。伊莎贝拉表面关心希尔达，实际在利用她。',
  },

  // 伊莱亚斯 ↔ 约书亚
  '伊莱亚斯·沃德-约书亚·布莱克': {
    affinity: 0,
    knowledge: false,
    secretShared: [],
    conflict: null,
    moralWeight: 0.3,
    note: '几乎没有交集。约书亚不知道伊莱亚斯的存在。',
  },

  // 汤米 ↔ 玛莎
  '汤米·陈-玛莎·格雷': {
    affinity: 2,
    knowledge: true,
    secretShared: ['harbor_trade'],
    conflict: null,
    moralWeight: 0.8,
    note: '商业关系。玛莎从汤米那里买 supplies，汤米从玛莎获取码头情报。',
  },

  // 汤米 ↔ 伊莱亚斯
  '汤米·陈-伊莱亚斯·沃德': {
    affinity: 1,
    knowledge: true,
    secretShared: [],
    conflict: null,
    moralWeight: 0.5,
    note: '普通顾客关系。伊莱亚斯在汤米店里买胶卷。',
  },

  // 约书亚 ↔ 老费舍
  '约书亚·布莱克-老费舍': {
    affinity: -1,
    knowledge: false,
    secretShared: [],
    conflict: null,
    moralWeight: 0.2,
    note: '约书亚在码头见过费舍，但没有深入交流。',
  },
};

// ═══════════════════════════════════════════════════════════════
// SECTION 3: Moral Dilemma Definitions
// ═══════════════════════════════════════════════════════════════
// Each dilemma presents a choice where helping one NPC harms another.
// The player is NOT told the full consequences upfront.
// Some consequences are delayed — they manifest later.

export var MORAL_DILEMMAS = {
  // Dilemma 1: 伊莱亚斯的研究 vs 玛莎的安全
  dilemma_elias_research: {
    id: 'dilemma_elias_research',
    name: '知识的代价',
    description: '伊莱亚斯要求你带回一份深海样本进行分析。但玛莎警告过你，接触深海物品会加速深潜者混血的变异。',
    // NOT exposed to player: helping Elias accelerates Martha's transformation
    choices: [
      {
        id: 'bring_sample',
        label: '把样本带给伊莱亚斯',
        shortLabel: '交给教授',
        immediateEffect: '伊莱亚斯信任+1，获得关键线索',
        hiddenCost: {
          faction: 'deep_one',
          factionPenalty: 2,
          npc: '玛莎·格雷',
          npcPenalty: -1,
          delayedEffect: 'martha_corruption_trigger',
          delayDays: 3,
        },
        behaviorCounter: null, // no direct counter — cost is indirect
      },
      {
        id: 'refuse_sample',
        label: '拒绝伊莱亚斯',
        shortLabel: '拒绝教授',
        immediateEffect: '伊莱亚斯信任-1',
        hiddenCost: {
          npc: '伊莱亚斯·沃德',
          npcPenalty: -2,
          delayedEffect: 'elias_desperation',
          delayDays: 5,
        },
        hiddenBenefit: {
          npc: '玛莎·格雷',
          npcBenefit: +1, // Martha appreciates the protection
        },
      },
      {
        id: 'deceive_both',
        label: '伪造样本交给伊莱亚斯，把真样本处理掉',
        shortLabel: '两边瞒',
        immediateEffect: '双方信任不变',
        hiddenCost: {
          npc: '伊莱亚斯·沃德',
          npcPenalty: -1, // if discovered later
          discoveryChance: 0.3,
          discoveryDelay: 7,
        },
      },
    ],
    triggerConditions: {
      minTrust: { '伊莱亚斯·沃德': 2, '玛莎·格雷': 2 },
      minDay: 5,
      maxUses: 2, // only triggers twice per run
    },
    fearModifier: {
      morality: { intensity: 1.5, extraChoices: ['confess_to_martha'] },
      knowledge: { intensity: 1.3 },
      isolation: { intensity: 0.8 },
    },
  },

  // Dilemma 2: 希尔达的牺牲 vs 封印修复
  dilemma_hilda_sacrifice: {
    id: 'dilemma_hilda_sacrifice',
    name: '血统的代价',
    description: '修复封印需要莫里斯家族的血脉。希尔达知道这一点，并主动提出牺牲自己。但伊莱亚斯声称可能有替代方案——只是需要更多时间，而时间可能不够。',
    choices: [
      {
        id: 'accept_sacrifice',
        label: '接受希尔达的牺牲',
        shortLabel: '接受牺牲',
        immediateEffect: '封印开始修复',
        hiddenCost: {
          npc: '希尔达·莫里斯',
          npcPenalty: -5, // death
          faction: 'seal_keeper',
          factionPenalty: -3,
        },
      },
      {
        id: 'pursue_alternative',
        label: '追求替代方案',
        shortLabel: '寻找替代',
        immediateEffect: '封印继续恶化',
        hiddenCost: {
          global: 'seal_deterioration',
          sealDmg: 15,
          delayedEffect: 'seal_crisis',
          delayDays: 7,
        },
        hiddenBenefit: {
          npc: '希尔达·莫里斯',
          npcBenefit: +2,
          npc: '伊莱亚斯·沃德',
          npcBenefit: +1,
        },
      },
      {
        id: 'force_hilda_choice',
        label: '让希尔达自己决定',
        shortLabel: '让她选',
        immediateEffect: '希尔达做出自己的选择',
        hiddenCost: {
          npc: '伊莱亚斯·沃德',
          npcPenalty: -1, // disappointed you didn't choose
          npc: '希尔达·莫里斯',
          npcPenalty: -1, // feels abandoned
        },
      },
    ],
    triggerConditions: {
      minTrust: { '伊莱亚斯·沃德': 3, '希尔达·莫里斯': 2 },
      minDay: 15,
      maxUses: 1,
    },
    fearModifier: {
      morality: { intensity: 2.0, extraChoices: ['find_third_option'] },
      body: { intensity: 1.5 },
      isolation: { intensity: 1.2 },
    },
  },

  // Dilemma 3: 费舍的秘密 vs 玛莎的幸福
  dilemma_fisher_secret: {
    id: 'dilemma_fisher_secret',
    name: '深海的秘密',
    description: '你发现了老费舍的真实身份和他与海底祭祀的关系。玛莎对此毫不知情。告诉她真相可能摧毁她最后的精神支柱，但隐瞒也可能导致更大的灾难。',
    choices: [
      {
        id: 'tell_martha',
        label: '告诉玛莎真相',
        shortLabel: '告诉她',
        immediateEffect: '玛莎SAN大幅下降',
        hiddenCost: {
          npc: '玛莎·格雷',
          npcPenalty: -3, // sanity + trust hit
          delayedEffect: 'martha_breakdown',
          delayDays: 2,
        },
        hiddenBenefit: {
          faction: 'deep_one',
          factionPenalty: -2, // Fisher appreciates honesty? Actually Fisher would be angry
          npc: '老费舍',
          npcPenalty: -3, // Fisher angry you exposed him
        },
      },
      {
        id: 'keep_secret',
        label: '保守秘密',
        shortLabel: '保守秘密',
        immediateEffect: '玛莎保持现状',
        hiddenCost: {
          morality_score: -5, // internal moral weight (not exposed)
          delayedEffect: 'secret_burden',
          delayDays: 10,
        },
        hiddenBenefit: {
          npc: '玛莎·格雷',
          npcBenefit: +1,
          npc: '老费舍',
          npcBenefit: +2,
        },
      },
      {
        id: 'manipulate_both',
        label: '利用这个秘密控制双方',
        shortLabel: '利用秘密',
        immediateEffect: '获得双方 leverage',
        hiddenCost: {
          npc: '玛莎·格雷',
          npcPenalty: -2,
          npc: '老费舍',
          npcPenalty: -2,
          behaviorCounter: 'betrayed_high_trust_npcs',
          behaviorIncrement: 2,
        },
      },
    ],
    triggerConditions: {
      minTrust: { '玛莎·格雷': 3, '老费舍': 2 },
      requiresKnowledge: 'fisher_true_identity',
      minDay: 8,
      maxUses: 1,
    },
    fearModifier: {
      morality: { intensity: 1.8 },
      ocean: { intensity: 1.5 },
      isolation: { intensity: 1.3 },
    },
  },

  // Dilemma 4: 约书亚的治疗 vs 他的战斗力
  dilemma_joshua_cure: {
    id: 'dilemma_joshua_cure',
    name: '清醒的代价',
    description: '你找到了可能治愈约书亚深潜者变异的方法。但治疗过程会剥夺他在战斗中的异常能力——他是你唯一的战斗同伴。',
    choices: [
      {
        id: 'cure_joshua',
        label: '治愈约书亚',
        shortLabel: '治愈他',
        immediateEffect: '约书亚恢复正常，失去战斗同伴',
        hiddenCost: {
          npc: '约书亚·布莱克',
          npcPenalty: -3, // loses his "gift"
          combat_bonus: -20,
        },
        hiddenBenefit: {
          npc: '约书亚·布莱克',
          npcBenefit: +3, // grateful
          humanity: +10,
        },
      },
      {
        id: 'keep_ability',
        label: '保留他的能力',
        shortLabel: '保留能力',
        immediateEffect: '约书亚保持现状',
        hiddenCost: {
          humanity: -5,
          morality_score: -3,
          delayedEffect: 'joshua_suffering',
          delayDays: 14,
        },
      },
      {
        id: 'partial_cure',
        label: '只缓解症状',
        shortLabel: '缓解症状',
        immediateEffect: '约书亚症状减轻，能力保留一部分',
        hiddenCost: {
          humanity: -2,
          npc: '约书亚·布莱克',
          npcPenalty: -1, // senses something is wrong
        },
      },
    ],
    triggerConditions: {
      minTrust: { '约书亚·布莱克': 4 },
      requiresKnowledge: 'deep_one_cure_method',
      minDay: 12,
      maxUses: 1,
    },
    fearModifier: {
      morality: { intensity: 1.6 },
      body: { intensity: 1.8 },
      control: { intensity: 1.4 },
    },
  },

  // Dilemma 5: 伊莎贝拉的真相 vs 镇民的稳定
  dilemma_isabella_truth: {
    id: 'dilemma_isabella_truth',
    name: '信仰的崩塌',
    description: '你发现了伊莎贝拉的晨星会身份。公布真相会让镇民陷入恐慌，但让她继续领导教堂意味着更多人会受到影响。',
    choices: [
      {
        id: 'expose_isabella',
        label: '公布伊莎贝拉的身份',
        shortLabel: '揭发她',
        immediateEffect: '教堂信任崩溃',
        hiddenCost: {
          faction: 'cultist',
          factionPenalty: -5,
          npc: '伊莎贝拉·韦伯',
          npcPenalty: -5,
          global: 'town_panic',
          panicLevel: 3,
        },
        hiddenBenefit: {
          faction: 'seal_keeper',
          factionBonus: 2,
          npc: '伊莱亚斯·沃德',
          npcBenefit: +2,
        },
      },
      {
        id: 'blackmail_isabella',
        label: '用秘密控制伊莎贝拉',
        shortLabel: '控制她',
        immediateEffect: '获得教堂影响力',
        hiddenCost: {
          behaviorCounter: 'betrayed_high_trust_npcs',
          behaviorIncrement: 1,
          morality_score: -8,
          npc: '伊莎贝拉·韦伯',
          npcPenalty: -2,
        },
      },
      {
        id: 'protect_isabella',
        label: '保护伊莎贝拉的秘密',
        shortLabel: '保护她',
        immediateEffect: '伊莎贝拉感激',
        hiddenCost: {
          faction: 'seal_keeper',
          factionPenalty: -1,
          humanity: -5,
          delayedEffect: 'isabella_betrayal_risk',
          delayDays: 10,
        },
      },
    ],
    triggerConditions: {
      requiresKnowledge: 'isabella_cult_identity',
      minDay: 10,
      maxUses: 1,
    },
    fearModifier: {
      morality: { intensity: 2.0 },
      control: { intensity: 1.6 },
      knowledge: { intensity: 1.3 },
    },
  },

  // Dilemma 6: 帮助陌生人 vs 自身资源
  dilemma_stranger_help: {
    id: 'dilemma_stranger_help',
    name: '陌生人的请求',
    description: '一个受伤的陌生人请求你的帮助。帮助他会消耗你宝贵的资源，但拒绝意味着他可能活不过今晚。',
    choices: [
      {
        id: 'help_stranger',
        label: '帮助陌生人',
        shortLabel: '帮助他',
        immediateEffect: '消耗资源，获得潜在盟友',
        hiddenCost: {
          food: -2,
          hp: -1,
        },
        hiddenBenefit: {
          karma: 2, // abstract moral currency
          npc: 'stranger',
          npcBenefit: 3,
        },
      },
      {
        id: 'refuse_stranger',
        label: '拒绝帮助',
        shortLabel: '拒绝',
        immediateEffect: '资源保留',
        hiddenCost: {
          humanity: -3,
          karma: -2,
        },
      },
      {
        id: 'conditional_help',
        label: '以某个条件交换帮助',
        shortLabel: '条件交换',
        immediateEffect: '双方各取所需',
        hiddenCost: {
          karma: 1,
          food: -1,
        },
      },
    ],
    triggerConditions: {
      minFood: 3,
      minDay: 3,
      maxUses: 3,
    },
    fearModifier: {
      morality: { intensity: 1.4 },
      isolation: { intensity: 1.6 },
    },
  },
};

// ═══════════════════════════════════════════════════════════════
// SECTION 4: Reputation Propagation
// ═══════════════════════════════════════════════════════════════
// When player acts toward NPC A, effects ripple to connected NPCs.

/**
 * Propagate reputation change through the relationship network.
 * @param {string} targetNpc - NPC the player directly interacted with
 * @param {number} trustDelta - trust change (+/-)
 * @param {object} state - game state
 * @returns {object} propagation results { direct: npc, ripples: [{npc, delta}] }
 */
export function propagateReputation(targetNpc, trustDelta, state) {
  var ripples = [];
  var processed = new Set();
  processed.add(targetNpc);

  // Direct effect
  ripples.push({ npc: targetNpc, delta: trustDelta, isDirect: true });

  // Find all relationships involving targetNpc
  for (var key in NPC_RELATIONSHIPS) {
    var rel = NPC_RELATIONSHIPS[key];
    var parts = key.split('-');
    if (parts.length !== 2) continue;

    var otherNpc = null;
    if (parts[0] === targetNpc) otherNpc = parts[1];
    else if (parts[1] === targetNpc) otherNpc = parts[0];
    if (!otherNpc || processed.has(otherNpc)) continue;

    // Calculate ripple effect
    var rippleDelta = Math.round(trustDelta * rel.moralWeight * 0.3);
    if (rippleDelta !== 0) {
      ripples.push({ npc: otherNpc, delta: rippleDelta, isDirect: false, via: targetNpc });
      processed.add(otherNpc);
    }
  }

  // Second-degree propagation (friend of friend)
  for (var i = 0; i < ripples.length; i++) {
    var ripple = ripples[i];
    if (ripple.isDirect) continue;
    for (var key2 in NPC_RELATIONSHIPS) {
      var rel2 = NPC_RELATIONSHIPS[key2];
      var parts2 = key2.split('-');
      if (parts2.length !== 2) continue;
      var thirdNpc = null;
      if (parts2[0] === ripple.npc) thirdNpc = parts2[1];
      else if (parts2[1] === ripple.npc) thirdNpc = parts2[0];
      if (!thirdNpc || processed.has(thirdNpc)) continue;

      var secondRipple = Math.round(ripple.delta * rel2.moralWeight * 0.15);
      if (secondRipple !== 0) {
        ripples.push({ npc: thirdNpc, delta: secondRipple, isDirect: false, via: ripple.npc });
        processed.add(thirdNpc);
      }
    }
  }

  return { target: targetNpc, ripples: ripples };
}

/**
 * Get faction standing change from an action.
 * @param {string} npcId
 * @param {string} action - 'help', 'harm', 'betray', 'redeem'
 * @returns {object} { factionChanges: { factionId: delta } }
 */
export function getFactionImpact(npcId, action) {
  var changes = {};
  for (var fid in FACTIONS) {
    var faction = FACTIONS[fid];
    if (faction.members.indexOf(npcId) >= 0) {
      var delta = 0;
      switch (action) {
        case 'help':
        case 'redeem':
          delta = 2;
          break;
        case 'harm':
        case 'betray':
          delta = -3;
          break;
        case 'exploit':
          delta = -1;
          break;
        default:
          delta = 0;
      }
      if (delta !== 0) changes[fid] = delta;
    }
  }
  return { factionChanges: changes };
}

// ═══════════════════════════════════════════════════════════════
// SECTION 5: Moral Score (abstract, hidden from player)
// ═══════════════════════════════════════════════════════════════

/**
 * Compute abstract moral score from state.
 * This is NEVER shown to the player — used only for ending conditions
 * and narrative flavor.
 *
 * Positive = altruistic choices
 * Negative = selfish/harmful choices
 *
 * @param {object} state
 * @returns {number} moral score (-100 to +100)
 */
export function computeMoralScore(state) {
  var score = 0;
  var bt = state.behaviorTracking || {};

  // Positive actions
  score += (bt.redeemed_npcs || 0) * 10;
  score += (bt.selfless_actions || 0) * 5;
  score += (bt.promises_kept || 0) * 5;
  score += (bt.truths_told || 0) * 3;
  score += (bt.npc_saved_from_danger || 0) * 8;
  score += (bt.donated_money_total || 0) * 2;

  // Negative actions
  score -= (bt.betrayed_high_trust_npcs || 0) * 15;
  score -= (bt.cannibalism_count || 0) * 20;
  score -= (bt.direct_kill_count || 0) * 10;
  score -= (bt.npc_as_resource_count || 0) * 12;
  score -= (bt.npc_deaths_by_manipulation || 0) * 15;
  score -= (bt.accepted_bribes || 0) * 5;

  // Dilemma choices
  if (state._dilemmaChoices) {
    for (var i = 0; i < state._dilemmaChoices.length; i++) {
      var choice = state._dilemmaChoices[i];
      score += (choice.moralWeight || 0);
    }
  }

  return Math.max(-100, Math.min(100, score));
}

/**
 * Get moral tier description (for narrative use only).
 * This describes the player's moral PATTERN, not their score.
 *
 * @param {number} moralScore
 * @returns {{ tier: string, description: string }}
 */
export function getMoralTier(moralScore) {
  if (moralScore >= 50) {
    return {
      tier: 'altruist',
      description: '你选择了一条艰难的路。不是因为没有更好的选择，而是因为你觉得那是对的。',
    };
  }
  if (moralScore >= 20) {
    return {
      tier: 'principled',
      description: '你在善恶之间摇摆，但总有一个声音在拉你回去。',
    };
  }
  if (moralScore >= -20) {
    return {
      tier: 'pragmatist',
      description: '你做的选择没有对错。只有后果。',
    };
  }
  if (moralScore >= -50) {
    return {
      tier: 'compromised',
      description: '有些选择你现在后悔了。但后悔和改变是两回事。',
    };
  }
  return {
    tier: 'fallen',
    description: '你已经不记得最初的自己是什么样子了。',
  };
}
