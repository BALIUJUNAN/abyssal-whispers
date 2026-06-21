// src/systems/fearMoralModifier.js — Fear Profile → Moral Tendency System
// A player's fear profile shapes HOW they experience moral dilemmas:
//   - Which dilemmas appear (fear-specific triggers)
//   - How intense the dilemma feels (more choices, higher stakes)
//   - What narrative flavor wraps the choice
//
// Fear profiles do NOT determine the "right" answer — they determine
// the psychological PRESSURE of the choice.
//
// "道德恐惧" (Morality fear) players encounter MORE moral dilemmas
// with higher stakes, amplifying inner conflict.

import { MORAL_DILEMMAS } from '../data/npcRelationshipWeb.js';

// ═══════════════════════════════════════════════════════════════
// SECTION 1: Fear → Moral Pressure Mapping
// ═══════════════════════════════════════════════════════════════

/**
 * Map fear type to moral pressure characteristics.
 * Each fear type amplifies different aspects of moral dilemmas.
 *
 * @param {string} fearType - 'ocean'|'body'|'control'|'isolation'|'knowledge'|'morality'
 * @returns {object} moral pressure profile
 */
export function getFearMoralProfile(fearType) {
  var profiles = {
    ocean: {
      id: 'ocean',
      label: '海洋恐惧',
      moralPressure: 'impersonal',
      description: '你害怕的是一种无法对抗的自然力量。道德抉择对你来说更像是"在洪水中选择救谁"——你知道选择本身没有对错，但你无法承受不选的后果。',
      // Ocean fear players see dilemmas where ALL options lead to loss
      // The "cost" feels predetermined by forces beyond control
      dilemmaAmplification: {
        bothOptionsBad: true,     // both choices have significant hidden costs
        delayedConsequences: true, // consequences feel like they "wash ashore" later
        inevitability: 0.3,       // 30% more text about "no good outcome"
      },
      favoredChoices: ['sacrifice_self', 'accept_loss'], // tends toward resignation
      resistedChoices: ['fight_back', 'demand_better'],
      narrativeFlavor: {
        beforeChoice: '潮水在退。你知道有些东西被冲上岸的时候已经死了。',
        afterBadChoice: '海水带走了什么。你不知道是什么，但你知道它不会回来。',
        afterGoodChoice: '你选择了让潮水带走。也许那是唯一能让它停下的方式。',
      },
    },

    body: {
      id: 'body',
      label: '身体恐惧',
      moralPressure: 'physical',
      description: '你害怕的是身体的变化、侵蚀、异化。道德抉择对你来说是"在疼痛中选择更少的那一种"——每一条路都通向某种身体上的代价。',
      dilemmaAmplification: {
        physicalCost: true,       // hidden costs include physical damage
        transformation: true,     // choices affect body state
        inevitability: 0.2,
      },
      favoredChoices: ['preserve_body', 'partial_cure', 'resist_change'],
      resistedChoices: ['accept_fusion', 'embrace_mutation'],
      narrativeFlavor: {
        beforeChoice: '你的手在抖。不是因为恐惧——是因为你的身体正在做出反应。',
        afterBadChoice: '你感受到了变化。不是痛，是一种……更本质的东西。',
        afterGoodChoice: '你选择了对抗。身体记得这个选择。',
      },
    },

    control: {
      id: 'control',
      label: '控制恐惧',
      moralPressure: 'agency',
      description: '你害怕的是失去控制、被操纵、被观察。道德抉择对你来说是"在监禁中选择牢房"——你知道选择是假的，但你仍然需要做出选择。',
      dilemmaAmplification: {
        falseChoices: true,       // some "options" are illusory
        metaAwareness: true,      // more text questioning the choice itself
        inevitability: 0.4,
      },
      favoredChoices: ['refuse_to_choose', 'find_hidden_option', 'manipulate_system'],
      resistedChoices: ['accept_preset', 'follow_rules'],
      narrativeFlavor: {
        beforeChoice: '你环顾四周。这个场景太完美了。像是有人为你搭的舞台。',
        afterBadChoice: '你做出了选择。但你不确定是你选的，还是选项选了你。',
        afterGoodChoice: '你找到了第三条路。或者说——第三条路找到了你。',
      },
    },

    isolation: {
      id: 'isolation',
      label: '孤独恐惧',
      moralPressure: 'relational',
      description: '你害怕的是被孤立、被遗忘、独自面对一切。道德抉择对你来说是"在背叛和孤独之间选择"——你知道帮助别人可能带来连接，但也可能带来更大的损失。',
      dilemmaAmplification: {
        relationshipStakes: true, // choices directly affect NPC relationships
        lonelinessPenalty: true,  // refusing to choose has social cost
        inevitability: 0.2,
      },
      favoredChoices: ['help_npc', 'connect_with_others', 'sacrifice_for_relationship'],
      resistedChoices: ['abandon_npc', 'prioritize_self'],
      narrativeFlavor: {
        beforeChoice: '你看着他们的脸。你知道选择之后，有些人不会再这样看你。',
        afterBadChoice: '你转身离开。脚步声在空走廊里回响。比任何声音都响。',
        afterGoodChoice: '你伸出手。你不知道他们会怎么回应，但你知道自己不能再一个人走了。',
      },
    },

    knowledge: {
      id: 'knowledge',
      label: '知识恐惧',
      moralPressure: 'epistemic',
      description: '你害怕的是知道太多、知道得太快、知道无法承受的真相。道德抉择对你来说是"在知情和不知情之间选择"——你知道的信息量决定了你的选择空间，但知道本身就在改变你。',
      dilemmaAmplification: {
        informationAsymmetry: true, // you know more or less than NPCs
        truthWeight: true,          // "telling the truth" has different weight
        inevitability: 0.3,
      },
      favoredChoices: ['reveal_truth', 'study_more', 'share_knowledge'],
      resistedChoices: ['hide_truth', 'ignore_danger', 'destroy_knowledge'],
      narrativeFlavor: {
        beforeChoice: '你知道的太多了。这些知识在你脑子里像一块烧红的铁。你必须用它——或者扔掉它。',
        afterBadChoice: '你把知识放回了黑暗中。但你依然记得它发光的温度。',
        afterGoodChoice: '你说了出来。话一旦出口就再也收不回来。就像知识本身一样。',
      },
    },

    morality: {
      id: 'morality',
      label: '道德恐惧',
      moralPressure: 'ethical',
      description: '你害怕的是自己的道德判断、选择的重量、后果的不可逆。道德抉择对你来说是"在善与善之间选择"——没有坏选项，只有互相冲突的好选项。这是最痛苦的抉择类型。',
      // SPECIAL: morality fear players get MORE dilemmas, with higher stakes
      // and more "good option vs good option" scenarios
      dilemmaAmplification: {
        noBadOptions: true,        // all options have some moral merit
        higherStakes: true,        // consequences feel heavier
        extraChoices: true,        // more options per dilemma
        inevitability: 0.5,        // most text about "no perfect choice"
        postChoiceDoubt: true,     // additional narrative about second-guessing
      },
      favoredChoices: ['find_third_option', 'minimize_harm', 'confess_uncertainty'],
      resistedChoices: ['quick_solution', 'prioritize_self'],
      narrativeFlavor: {
        beforeChoice: '每个选项都有它的道理。这就是最可怕的地方。',
        afterBadChoice: '你做出了选择。现在你要学会和这个选择共存。每一天都是。',
        afterGoodChoice: '你选择了最小的恶。但最小的恶仍然是恶。',
      },
    },
  };

  return profiles[fearType] || profiles.knowledge;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 2: Dilemma Intensity Calculator
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate how intense a moral dilemma feels for a specific fear profile.
 * This affects: number of choices shown, text elaboration, consequence severity.
 *
 * @param {string} dilemmaId
 * @param {string} fearPrimary
 * @param {string} fearSecondary
 * @param {string} coping
 * @returns {{ intensity: number, extraChoices: string[], textModifier: string }}
 */
export function calculateDilemmaIntensity(dilemmaId, fearPrimary, fearSecondary, coping) {
  // Get dilemma definition (imported from npcRelationshipWeb)
  var dilemmas = typeof MORAL_DILEMMAS !== 'undefined' ? MORAL_DILEMMAS : {};
  var dilemma = dilemmas[dilemmaId];
  if (!dilemma) return { intensity: 1.0, extraChoices: [], textModifier: null };

  var baseIntensity = 1.0;
  var extraChoices = [];
  var textModifier = null;

  // Primary fear amplification
  var primaryProfile = getFearMoralProfile(fearPrimary);
  var primaryMod = primaryProfile.dilemmaAmplification;
  if (primaryMod) {
    if (primaryMod.intensity) baseIntensity *= primaryMod.intensity;
    if (primaryMod.extraChoices && dilemma.fearModifier && dilemma.fearModifier[fearPrimary]) {
      extraChoices = extraChoices.concat(dilemma.fearModifier[fearPrimary].extraChoices || []);
    }
  }

  // Secondary fear amplification (smaller)
  if (fearSecondary) {
    var secondaryProfile = getFearMoralProfile(fearSecondary);
    if (secondaryProfile.dilemmaAmplification && secondaryProfile.dilemmaAmplification.intensity) {
      baseIntensity *= 0.85 + secondaryProfile.dilemmaAmplification.intensity * 0.15;
    }
  }

  // Coping style modulation
  var copingMods = {
    avoidant: { intensityMult: 0.8, extraChoice: 'delay_choice' },
    investigative: { intensityMult: 1.0, extraChoice: 'investigate_more' },
    social: { intensityMult: 1.1, extraChoice: 'consult_npc' },
    controlling: { intensityMult: 1.2, extraChoice: 'negotiate_terms' },
    sacrificial: { intensityMult: 1.3, extraChoice: 'self_sacrifice_option' },
    predatory: { intensityMult: 0.9, extraChoice: 'exploit_situation' },
  };
  var copingConfig = copingMods[coping];
  if (copingConfig) {
    baseIntensity *= copingConfig.intensityMult;
    if (copingConfig.extraChoice) extraChoices.push(copingConfig.extraChoice);
  }

  // Generate text modifier based on intensity
  if (baseIntensity > 1.5) {
    textModifier = '高冲突';
  } else if (baseIntensity > 1.2) {
    textModifier = '中冲突';
  } else if (baseIntensity > 0.9) {
    textModifier = '标准';
  } else {
    textModifier = '低冲突';
  }

  return {
    intensity: Math.round(baseIntensity * 100) / 100,
    extraChoices: extraChoices,
    textModifier: textModifier,
  };
}

// ═══════════════════════════════════════════════════════════════
// SECTION 3: Coping Style → Choice Preference
// ═══════════════════════════════════════════════════════════════

/**
 * Adjust choice weights based on player's coping style.
 * This does NOT change the options available — it changes how the
 * narrative FRAMES each option, subtly引导 the player's tendency.
 *
 * @param {string} copingStyle
 * @param {Array} choices - dilemma choices
 * @returns {Array} choices with adjusted narrative framing
 */
export function applyCopingFraming(copingStyle, choices) {
  var framings = {
    avoidant: {
      label: '回避型',
      framing: '有些选择可以等。不是所有门都需要现在推开。',
      adjustments: {
        'delay_choice': { label: '推迟决定', weight: 2.0 },
        'refuse_sample': { label: '暂时不介入', weight: 1.5 },
        'keep_secret': { label: '不采取行动', weight: 1.3 },
      },
    },
    investigative: {
      label: '调查型',
      framing: '在做出选择之前，你可能需要更多的信息。',
      adjustments: {
        'investigate_more': { label: '先调查清楚', weight: 2.0 },
        'partial_cure': { label: '寻找折中方案', weight: 1.5 },
        'deceive_both': { label: '收集更多信息再做决定', weight: 1.3 },
      },
    },
    social: {
      label: '社交型',
      framing: '也许有人能帮你分担这个决定。',
      adjustments: {
        'consult_npc': { label: '征求他人意见', weight: 2.0 },
        'help_stranger': { label: '相信直觉', weight: 1.5 },
        'conditional_help': { label: '建立互惠关系', weight: 1.3 },
      },
    },
    controlling: {
      label: '支配型',
      framing: '最好的选择是你完全掌控的那个。',
      adjustments: {
        'negotiate_terms': { label: '设定条件', weight: 2.0 },
        'blackmail_isabella': { label: '用信息换筹码', weight: 1.5 },
        'manipulate_both': { label: '控制局面', weight: 1.3 },
      },
    },
    sacrificial: {
      label: '牺牲型',
      framing: '有些路需要有人走。也许那个人就是你。',
      adjustments: {
        'self_sacrifice_option': { label: '自己承担代价', weight: 2.0 },
        'accept_sacrifice': { label: '接受牺牲（如果是他人）', weight: 1.5 },
        'help_stranger': { label: '伸出援手', weight: 1.3 },
      },
    },
    predatory: {
      label: '掠夺型',
      framing: '在这个世界里，弱者的选择最少。',
      adjustments: {
        'exploit_situation': { label: '利用局势', weight: 2.0 },
        'manipulate_both': { label: '最大化自身利益', weight: 1.5 },
        'keep_ability': { label: '保留最大优势', weight: 1.3 },
      },
    },
  };

  var framing = framings[copingStyle];
  if (!framing) return choices;

  return choices.map(function (choice) {
    var adj = framing.adjustments[choice.id];
    if (adj) {
      return Object.assign({}, choice, {
        displayLabel: adj.label || choice.label,
        copingWeight: adj.weight,
        copingFraming: framing.framing,
      });
    }
    return Object.assign({}, choice, { copingWeight: 1.0 });
  });
}

// ═══════════════════════════════════════════════════════════════
// SECTION 4: Moral Pressure Event Generation
// ═══════════════════════════════════════════════════════════════
// Generates moral pressure events based on fear profile.
// These events DON'T present binary choices — they create ATMOSPHERIC
// moral pressure that influences how the player FEELS about upcoming choices.

/**
 * Get moral pressure events for the current game state.
 * These are atmospheric events that amplify the weight of moral choices.
 *
 * @param {object} state
 * @returns {Array} pressure events
 */
export function getMoralPressureEvents(state) {
  var bt = state.behaviorTracking || {};
  var fear = state.fearTuning || {};
  var primary = fear.primary || 'knowledge';
  var secondary = fear.secondary || null;
  var coping = fear.coping || 'investigative';
  var events = [];

  // Ocean fear: water imagery pressure
  if (primary === 'ocean' || secondary === 'ocean') {
    if ((bt.harbor_visits || 0) >= 3) {
      events.push({
        type: 'atmospheric_pressure',
        source: 'ocean_fear',
        text: '你听见潮声。即使在远离码头的地方，在安全屋里，在梦中。水无处不在。',
        moralAmplification: 0.2,
      });
    }
  }

  // Body fear: body change pressure
  if (primary === 'body' || secondary === 'body') {
    if ((bt.fusion_accepted_count || 0) >= 1) {
      events.push({
        type: 'atmospheric_pressure',
        source: 'body_fear',
        text: '你的皮肤下有东西在移动。你知道那是什么。你选择过让它进来。现在它在生长。',
        moralAmplification: 0.3,
      });
    }
  }

  // Control fear: agency doubt pressure
  if (primary === 'control' || secondary === 'control') {
    if ((bt.meta_boundary_breaks || 0) >= 2) {
      events.push({
        type: 'atmospheric_pressure',
        source: 'control_fear',
        text: '你开始怀疑这些选择是不是真的。也许它们从一开始就被设计好了。',
        moralAmplification: 0.25,
      });
    }
  }

  // Isolation fear: relationship pressure
  if (primary === 'isolation' || secondary === 'isolation') {
    var npcTrust = state.npcTrust || {};
    var trustedNpcs = Object.keys(npcTrust).filter(function (k) { return npcTrust[k] >= 3; });
    if (trustedNpcs.length <= 2) {
      events.push({
        type: 'atmospheric_pressure',
        source: 'isolation_fear',
        text: '你环顾四周。这些人，这些关系——它们都在慢慢消失。每一个选择都在加速那个过程。',
        moralAmplification: 0.3,
      });
    }
  }

  // Knowledge fear: truth burden pressure
  if (primary === 'knowledge' || secondary === 'knowledge') {
    if ((bt.clue_finds || 0) >= 10) {
      events.push({
        type: 'atmospheric_pressure',
        source: 'knowledge_fear',
        text: '你知道的太多了。每一条线索都在你的脑子里加重量。有些知识一旦知道就无法"不知道"。',
        moralAmplification: 0.2,
      });
    }
  }

  // Morality fear: ethical weight pressure (SPECIAL — more frequent, more intense)
  if (primary === 'morality') {
    // Morality fear players get pressure events after EVERY moral action
    var recentChoices = (state._dilemmaChoices || []).slice(-3);
    if (recentChoices.length > 0) {
      events.push({
        type: 'atmospheric_pressure',
        source: 'morality_fear',
        text: '你做的每一个选择都在 weighing 你。不是外界在评判你——是你自己在。',
        moralAmplification: 0.4,
        postChoiceDoubt: true,
      });
    }

    // Morality fear players also get "phantom guilt" events
    // — events that make them question past choices
    if ((bt.redeemed_npcs || 0) >= 1 && (bt.betrayed_high_trust_npcs || 0) >= 1) {
      events.push({
        type: 'phantom_guilt',
        source: 'morality_fear',
        text: '有时候你想起你做过的事。善的。恶的。它们在你脑子里排成同一列。你分不清哪一个是哪一个。',
        moralAmplification: 0.5,
      });
    }
  }

  return events;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 5: Dilemma Selection (integration with event system)
// ═══════════════════════════════════════════════════════════════

/**
 * Select an appropriate moral dilemma for the current state.
 * Returns null if no dilemma is currently available.
 *
 * @param {object} state
 * @param {object} GD - game data
 * @returns {object|null} dilemma data with amplified choices
 */
export function selectMoralDilemma(state, GD) {
  var bt = state.behaviorTracking || {};
  var fear = state.fearTuning || {};
  var primary = fear.primary || 'knowledge';
  var secondary = fear.secondary;
  var coping = fear.coping || 'investigative';

  var dilemmas = typeof MORAL_DILEMMAS !== 'undefined' ? MORAL_DILEMMAS : {};
  var eligible = [];

  for (var did in dilemmas) {
    var d = dilemmas[did];
    if (!d.triggerConditions) continue;

    // Check trust requirements
    var trustOk = true;
    var minTrust = d.triggerConditions.minTrust;
    if (minTrust) {
      var npcTrust = state.npcTrust || {};
      for (var npc in minTrust) {
        if ((npcTrust[npc] || 0) < minTrust[npc]) {
          trustOk = false;
          break;
        }
      }
    }
    if (!trustOk) continue;

    // Check day requirement
    if (d.triggerConditions.minDay && (state.day || 1) < d.triggerConditions.minDay) continue;

    // Check knowledge requirements
    if (d.triggerConditions.requiresKnowledge) {
      var clues = state.clues || [];
      var hasKnowledge = clues.some(function (c) {
        var id = typeof c === 'string' ? c : (c.id || '');
        return id === d.triggerConditions.requiresKnowledge;
      });
      if (!hasKnowledge) continue;
    }

    // Check max uses (tracked in state)
    var usedKey = '_dilemma_' + d.id + '_used';
    var used = state[usedKey] || 0;
    if (used >= (d.triggerConditions.maxUses || 1)) continue;

    eligible.push(d);
  }

  if (eligible.length === 0) return null;

  // Select based on fear profile — prefer dilemmas that match primary fear
  var primaryProfile = getFearMoralProfile(primary);
  eligible.sort(function (a, b) {
    var aMatch = (a.fearModifier && a.fearModifier[primary]) ? a.fearModifier[primary].intensity : 0.5;
    var bMatch = (b.fearModifier && b.fearModifier[primary]) ? b.fearModifier[primary].intensity : 0.5;
    return bMatch - aMatch;
  });

  var selected = eligible[0];

  // Calculate intensity
  var intensityData = calculateDilemmaIntensity(selected.id, primary, secondary, coping);

  // Apply coping framing to choices
  var amplifiedChoices = applyCopingFraming(coping, selected.choices);

  return {
    id: selected.id,
    name: selected.name,
    description: selected.description,
    choices: amplifiedChoices,
    intensity: intensityData.intensity,
    textModifier: intensityData.textModifier,
    extraChoices: intensityData.extraChoices,
    flavor: primaryProfile.narrativeFlavor,
    fearLabel: primaryProfile.label,
  };
}

/**
 * Record a dilemma choice for tracking.
 * @param {object} state
 * @param {string} dilemmaId
 * @param {string} choiceId
 * @param {object} GD
 */
export function recordDilemmaChoice(state, dilemmaId, choiceId, GD) {
  var dilemmas = typeof MORAL_DILEMMAS !== 'undefined' ? MORAL_DILEMMAS : {};
  var dilemma = dilemmas[dilemmaId];
  if (!dilemma) return;

  var choice = dilemma.choices.find(function (c) { return c.id === choiceId; });
  if (!choice) return;

  // Track choice
  state._dilemmaChoices = state._dilemmaChoices || [];
  state._dilemmaChoices.push({
    dilemmaId: dilemmaId,
    choiceId: choiceId,
    day: state.day,
    moralWeight: choice.hiddenCost ? -(choice.hiddenCost.morality_score || 0) : 0,
  });

  // Mark dilemma as used
  state['_dilemma_' + dilemmaId + '_used'] = (state['_dilemma_' + dilemmaId + '_used'] || 0) + 1;

  // Apply immediate effects
  if (choice.immediateEffect) {
    emitDilemmaEffect(state, choice.immediateEffect, GD);
  }

  // Schedule delayed effects
  if (choice.hiddenCost && choice.hiddenCost.delayedEffect) {
    scheduleDelayedEffect(state, choice.hiddenCost.delayedEffect,
      choice.hiddenCost.delayDays || 5, GD);
  }
}

// Lightweight emit for non-React context
function emitDilemmaEffect(state, effect, GD) {
  // In the engine context, this updates state directly
  // In the React context, effectReducer handles it
  if (typeof emit !== 'undefined') {
    emit('MORAL_CHOICE_MADE', { effect: effect, day: state.day });
  }
}

function scheduleDelayedEffect(state, effectId, delayDays, GD) {
  var currentDay = state.day || 1;
  var triggerDay = currentDay + delayDays;
  state._scheduledEffects = state._scheduledEffects || [];
  state._scheduledEffects.push({
    type: 'delayed_moral',
    effectId: effectId,
    triggerDay: triggerDay,
    sourceChoice: state._dilemmaChoices[state._dilemmaChoices.length - 1],
  });
}
