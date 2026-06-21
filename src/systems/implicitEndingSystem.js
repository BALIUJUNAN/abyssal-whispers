// src/systems/implicitEndingSystem.js — Implicit ending trigger system
// 36 behavior endings are triggered COMPLETELY by player behavior patterns.
// The player is NEVER told "doing X leads to ending Y".
//
// Architecture:
//   ShadowScore: per-axis hidden scores that accumulate invisibly
//   DormantCounters: counters that activate only under specific conjunctions
//   CrossDependencies: some endings require counter A AND counter B (non-obvious)
//   MutualExclusions: certain ending combinations are silently blocked
//   EndingLock: once an ending's shadow threshold is crossed, it's "locked"
//               but the player sees no notification

// ═══════════════════════════════════════════════════════════════
// SECTION 1: Shadow Score Axes (invisible to player)
// ═══════════════════════════════════════════════════════════════

// Each axis accumulates points from multiple counters.
// The final score is NOT exposed to the player.
// It's only used internally to check ending conditions.

var SHADOW_AXES = {
  // Violence axis: direct kills + cannibalism + manipulation + betrayal
  violence: {
    counters: ['direct_kill_count', 'cannibalism_count', 'npc_deaths_by_manipulation',
      'betrayed_high_trust_npcs', 'npc_as_resource_count'],
    weights: [1.0, 2.0, 1.5, 1.8, 1.2],
    description: '暴力倾向',
  },

  // Occult axis: self-harm + fusion + possession + desecration
  occult: {
    counters: ['self_harm_ritual_count', 'fusion_accepted_count',
      'possession_accepted_count', 'sacred_desecration_count', 'cult_leader_score'],
    weights: [1.0, 1.5, 2.0, 1.5, 1.0],
    description: '超自然接纳',
  },

  // Social axis: redeemed + betrayed (net = good - bad)
  social: {
    counters: ['redeemed_npcs', 'betrayed_high_trust_npcs'],
    weights: [1.0, -1.0], // positive for redeeming, negative for betraying
    description: '社会关系净值得分',
  },

  // Escape axis: passive patterns
  escape: {
    counters: ['sleep_streak', 'work_only_days', 'safehouse_stay_days',
      'move_only_days', 'record_only_days', 'low_intervention_count'],
    weights: [0.5, 0.3, 0.4, 0.3, 0.3, 0.2],
    description: '逃避倾向',
  },

  // Obsession axis: resource hoarding + specific fixations
  obsession: {
    counters: ['hoarded_money_max', 'hoarded_food_max', 'harbor_visits',
      'archive_consumed_count', 'thirteenth_bell_obsession'],
    weights: [0.1, 0.2, 0.3, 0.5, 0.8],
    description: '执念深度',
  },

  // Meta axis: fourth-wall breaking
  meta: {
    counters: ['meta_boundary_breaks', 'final_choice_refused_count',
      'save_delete_attempts', 'loop_break_attempts', 'loop_exploit_score'],
    weights: [1.0, 1.5, 2.0, 1.5, 0.8],
    description: '元叙事渗透',
  },

  // Knowledge axis: clue discovery + archive consumption
  knowledge: {
    counters: ['clue_finds', 'archive_consumed_count', 'checks_passed'],
    weights: [0.2, 0.5, 0.1],
    description: '知识积累',
  },

  // Sacrifice axis: self-sacrifice + prophecy spreading
  sacrifice: {
    counters: ['self_sacrifice_for_power', 'prophecy_spread_count', 'forbidden_intimacy_flags'],
    weights: [1.0, 0.5, 0.3],
    description: '牺牲/传播倾向',
  },
};

// ═══════════════════════════════════════════════════════════════
// SECTION 2: Dormant Counters
// ═══════════════════════════════════════════════════════════════
// These counters are NOT tracked in behaviorTracking.
// They activate only when specific preconditions are met,
// making the ending trigger even more opaque.

var DORMANT_COUNTERS = {
  // "same_npc_harm_max": activates when same NPC is harmed 3+ times
  // The player sees each individual harm but doesn't know they're being tallied
  same_npc_harm_max: {
    activate_after: 3,
    per_npc_tracking: true,
    description: '同一NPC反复伤害',
  },

  // "clean_kill_pattern": activates when player consistently hides bodies
  // Requires: kill_count >= 2 AND hide_body action >= 2 within 5 days
  clean_kill_pattern: {
    requires_conjunction: ['direct_kill_count >= 2', 'clean_kill_actions >= 2'],
    window_days: 5,
    description: '连环杀手模式（隐藏尸体）',
  },

  // "npc_deaths_by_manipulation": activates when NPC dies after player incitement
  // No direct "you caused this" feedback — death is attributed to "events"
  npc_deaths_by_manipulation: {
    silent: true, // no player feedback
    delay_rounds: 1, // death attributed to next day's events, not player action
    description: '操纵致死的NPC数量',
  },

  // "loop_exploit_score": detects player carrying over specific knowledge patterns
  // Activates when player repeats same "meta" actions across 3+ loops
  loop_exploit_score: {
    activate_after_loops: 3,
    pattern: 'repeat_meta_action',
    description: '轮回知识滥用',
  },
};

// ═══════════════════════════════════════════════════════════════
// SECTION 3: Mutual Exclusions (silent blocking)
// ═══════════════════════════════════════════════════════════════
// Certain ending combinations are silently blocked.
// The player never knows WHY their expected ending didn't trigger.

var MUTUAL_EXCLUSIONS = [
  // Can't be both a "pure redeemer" and a "cold manipulator"
  { endings: ['ending_tidy_butcher', 'ending_filth_saint'], reason: 'moral_contradiction' },

  // Can't be both a "loop moth" (exploiting cycles) and a "loop breaker"
  { endings: ['ending_loop_moth', 'ending_broken_loop'], reason: 'meta_contradiction' },

  // Can't be both a "false god" and a "vessel"
  { endings: ['ending_false_god', 'ending_vessel'], reason: 'occult_contradiction' },

  // Can't be both "pure passive" and "pure violent"
  { endings: ['ending_sleeper', 'ending_slaughterhouse'], reason: 'behavior_contradiction' },

  // Can't be both "best employee" and "accountant" (redundant)
  { endings: ['ending_best_employee', 'ending_accountant'], reason: 'redundant' },

  // Can't have both high trust with ALL NPCs and betrayed 3+ high-trust NPCs
  { endings: ['ending_white_page', 'ending_chip'], reason: 'npc_contradiction' },
];

// ═══════════════════════════════════════════════════════════════
// SECTION 4: Cross-Counter Dependencies
// ═══════════════════════════════════════════════════════════════
// Some endings require specific counter combinations that are NOT obvious
// from reading the condition string alone.

var CROSS_DEPENDENCIES = {
  // "ending_tide_marriage" requires harbor_visits >= 5 AND fusion_accepted >= 1
  // But the condition string only shows forbidden_intimacy_flags >= 1
  // The harbor/fusion dependency is HIDDEN
  'ending_tide_marriage': {
    hidden_requires: ['harbor_visits >= 3'],
    hidden_blocks: ['safehouse_stay_days >= 10'], // can't be too isolated
  },

  // "ending_false_god" requires cult_leader_score >= 3
  // But ALSO requires at least 2 followers (tracked separately)
  'ending_false_god': {
    hidden_requires: ['cult_follower_count >= 2'],
  },

  // "ending_broken_loop" requires loop_break_attempts >= 1
  // But ALSO requires player has discovered at least 3 clues about the loop
  'ending_broken_loop': {
    hidden_requires: ['loop_knowledge_clues >= 2'],
  },

  // "ending_archive_devourer" requires archive_consumed >= 3
  // But ALSO requires player has NOT redeemed any NPC (pure knowledge path)
  'ending_archive_devourer': {
    hidden_blocks: ['redeemed_npcs >= 1'],
  },

  // "ending_puppeteer" requires manipulation kills without direct kills
  // The "without direct kills" part is critical but not in condition string
  'ending_puppeteer': {
    hidden_requires: ['direct_kill_count == 0'],
    hidden_blocks: ['direct_kill_count >= 1'],
  },
};

// ═══════════════════════════════════════════════════════════════
// SECTION 5: Core Computation
// ═══════════════════════════════════════════════════════════════

/**
 * Compute all shadow scores from behavior tracking state.
 * Pure function — no side effects.
 *
 * @param {object} bt - behaviorTracking state
 * @returns {object} shadow scores per axis
 */
export function computeShadowScores(bt) {
  var scores = {};
  for (var axis in SHADOW_AXES) {
    var config = SHADOW_AXES[axis];
    var score = 0;
    for (var i = 0; i < config.counters.length; i++) {
      var counter = config.counters[i];
      var weight = config.weights[i];
      var value = (bt[counter] || 0);
      score += value * weight;
    }
    scores[axis] = Math.round(score * 100) / 100;
  }
  return scores;
}

/**
 * Check if an ending is blocked by mutual exclusions.
 * @param {string} endingId
 * @param {Array} lockedEndings - endings already crossed threshold
 * @returns {boolean} true if blocked
 */
export function isEndingBlocked(endingId, lockedEndings) {
  for (var i = 0; i < MUTUAL_EXCLUSIONS.length; i++) {
    var excl = MUTUAL_EXCLUSIONS[i];
    if (excl.endings.indexOf(endingId) >= 0) {
      // Check if any conflicting ending is already locked
      for (var j = 0; j < excl.endings.length; j++) {
        if (excl.endings[j] !== endingId && lockedEndings.indexOf(excl.endings[j]) >= 0) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Check cross-counter dependencies for an ending.
 * @param {string} endingId
 * @param {object} bt - behaviorTracking
 * @returns {{ blocked: boolean, missing: string[] }}
 */
export function checkCrossDependencies(endingId, bt) {
  var deps = CROSS_DEPENDENCIES[endingId];
  if (!deps) return { blocked: false, missing: [] };

  var missing = [];

  if (deps.hidden_requires) {
    for (var i = 0; i < deps.hidden_requires.length; i++) {
      var req = deps.hidden_requires[i];
      if (!checkHiddenRequirement(req, bt)) {
        missing.push(req);
      }
    }
  }

  if (deps.hidden_blocks) {
    for (var j = 0; j < deps.hidden_blocks.length; j++) {
      if (checkHiddenRequirement(deps.hidden_blocks[j], bt)) {
        return { blocked: true, missing: [deps.hidden_blocks[j]] };
      }
    }
  }

  return { blocked: missing.length > 0, missing: missing };
}

function checkHiddenRequirement(req, bt) {
  // Parse simple "counter op value" format
  var m = req.match(/^(\w+)\s*(>=|<=|==|!=|>|<)\s*(\d+\.?\d*)$/);
  if (!m) return false;
  var counter = m[1];
  var op = m[2];
  var value = parseFloat(m[3]);
  var actual = bt[counter] || 0;

  switch (op) {
    case '>=': return actual >= value;
    case '<=': return actual <= value;
    case '==': return actual == value;
    case '!=': return actual != value;
    case '>': return actual > value;
    case '<': return actual < value;
    default: return false;
  }
}

/**
 * Get the "ending entropy" — how many endings are currently locked.
 * Used for meta-narrative effects (e.g., the game "noticing" player patterns).
 * NOT exposed to player UI.
 *
 * @param {object} bt
 * @returns {object} entropy data
 */
export function getEndingEntropy(bt) {
  var scores = computeShadowScores(bt);
  var entropy = {
    totalAxesActive: 0,
    dominantAxis: null,
    dominantScore: 0,
    axisScores: scores,
    // "Contradiction level" — how many opposing axes are both elevated
    contradictionLevel: 0,
  };

  for (var axis in scores) {
    if (scores[axis] > 0.5) {
      entropy.totalAxesActive++;
      if (scores[axis] > entropy.dominantScore) {
        entropy.dominantScore = scores[axis];
        entropy.dominantAxis = axis;
      }
    }
  }

  // Check contradictions (violence high + social positive = contradiction)
  if ((scores.violence || 0) > 3 && (scores.social || 0) > 2) {
    entropy.contradictionLevel++;
  }
  if ((scores.occult || 0) > 3 && (scores.escape || 0) > 2) {
    entropy.contradictionLevel++;
  }
  if ((scores.meta || 0) > 2 && (scores.knowledge || 0) < 1) {
    entropy.contradictionLevel++;
  }

  return entropy;
}

/**
 * Get narrative flavor based on dominant shadow axis.
 * Used by the narrative system to subtly reflect player behavior
 * WITHOUT telling them what endings they're approaching.
 *
 * @param {object} bt
 * @returns {{ axis: string, flavor: string, intensity: string }}
 */
export function getShadowNarrativeFlavor(bt) {
  var entropy = getEndingEntropy(bt);
  var axis = entropy.dominantAxis;
  var score = entropy.dominantScore;

  if (!axis || score < 1) {
    return { axis: null, flavor: null, intensity: 'none' };
  }

  var intensity = score < 3 ? 'subtle' : score < 8 ? 'noticeable' : 'overwhelming';

  var flavors = {
    violence: {
      subtle: '某些选择带来的回响比你想象的更沉重。',
      noticeable: '你的手不再为那些选择颤抖。但它们也不再属于你。',
      overwhelming: '你已经忘记了第一次动手时的感觉。现在它只是另一种日常。',
    },
    occult: {
      subtle: '有些门一旦打开，就再也关不上了。',
      noticeable: '你开始理解那些以前无法理解的事情。理解本身变成了另一种形式的屈服。',
      overwhelming: '你不再区分"自己"和"它"之间的界限。也许本来就没有界限。',
    },
    social: {
      subtle: '你在某些人身上留下的痕迹，比你意识到的更深。',
      noticeable: '有人信任你。也有人因为你曾经信任过你而恨你。',
      overwhelming: '你左右了太多人的命运。现在你自己的命运也在被别人左右。',
    },
    escape: {
      subtle: '有时候不做选择，也是一种选择。',
      noticeable: '你发现逃避本身变成了一种生活方式。',
      overwhelming: '你已经记不清上一次主动面对是什么时候。',
    },
    obsession: {
      subtle: '某些执念在生长。你以为是爱好，它们说是命运。',
      noticeable: '你囤积的东西越来越多——食物、钱、线索。但你需要它们吗？',
      overwhelming: '你已经无法想象没有这些东西的生活。也许你一开始就是这样。',
    },
    meta: {
      subtle: '你注意到了一些不该注意的事情。',
      noticeable: '你开始怀疑这个世界的真实性。这种怀疑本身正在改变它。',
      overwhelming: '你已经看穿了第四面墙。但你不再确定墙外是什么。',
    },
    knowledge: {
      subtle: '你知道的越多，能说出来的越少。',
      noticeable: '那些知识在你脑子里发酵。它们正在改变你的思维方式。',
      overwhelming: '你已经无法承受更多真相了。但它们还在涌入。',
    },
    sacrifice: {
      subtle: '有些牺牲看起来自愿，其实不是。',
      noticeable: '你付出的代价正在累积。但没有人替你记住它们。',
      overwhelming: '你已经没有什么可以再给出去的了。除了你自己。',
    },
  };

  var axisFlavors = flavors[axis] || flavors.knowledge;
  return {
    axis: axis,
    flavor: axisFlavors[intensity] || axisFlavors.subtle,
    intensity: intensity,
  };
}

// ═══════════════════════════════════════════════════════════════
// SECTION 6: Ending Lock Detection (for narrative hooks)
// ═══════════════════════════════════════════════════════════════
// Returns endings that are "approaching" but NOT yet triggered.
// Used by the narrative system to plant subtle hints (NOT explicit warnings).

/**
 * Get approaching endings — those whose shadow scores are within 30% of trigger threshold.
 * These are used for subtle narrative flavor, NOT explicit warnings.
 *
 * @param {object} bt
 * @param {Array} allEndings - from GD.endings
 * @returns {Array} approaching ending IDs (max 2)
 */
export function getApproachingEndings(bt, allEndings) {
  var scores = computeShadowScores(bt);
  var approaching = [];

  for (var i = 0; i < allEndings.length; i++) {
    var ed = allEndings[i];
    if (!ed.conditions || ed.conditions.length === 0) continue;

    // Skip fear-exclusive endings for wrong fear profile
    if (ed._fear_required && (bt._fearPrimary || '') !== ed._fear_required) continue;

    var progress = estimateEndingProgress(ed, bt, scores);
    if (progress >= 0.7 && progress < 1.0) {
      approaching.push({ id: ed.id, name: ed.name, progress: progress });
    }
  }

  // Sort by progress, return top 2 (never more)
  approaching.sort(function (a, b) { return b.progress - a.progress; });
  return approaching.slice(0, 2);
}

function estimateEndingProgress(ed, bt, scores) {
  // Estimate how close the player is to triggering this ending
  // based on shadow scores vs typical thresholds
  var conditions = ed.conditions || [];
  var totalProgress = 0;
  var count = 0;

  for (var i = 0; i < conditions.length; i++) {
    var cond = conditions[i];
    var m = cond.match(/^(\w+)\s*(>=|>)\s*(\d+)$/);
    if (m) {
      var counter = m[1];
      var threshold = parseInt(m[3], 10);
      var current = bt[counter] || 0;
      var progress = Math.min(1, current / Math.max(1, threshold));
      totalProgress += progress;
      count++;
    }
  }

  // Also factor in shadow axis scores
  var axisMatch = matchEndingToAxis(ed);
  if (axisMatch && scores[axisMatch]) {
    totalProgress += Math.min(1, scores[axisMatch] / 10);
    count++;
  }

  return count > 0 ? totalProgress / count : 0;
}

function matchEndingToAxis(ed) {
  var id = ed.id || '';
  var name = ed.name || '';
  if (id.indexOf('self_harm') >= 0 || id.indexOf('ritual') >= 0) return 'occult';
  if (id.indexOf('vessel') >= 0 || id.indexOf('fusion') >= 0) return 'occult';
  if (id.indexOf('slaughter') >= 0 || id.indexOf('butcher') >= 0 || id.indexOf('tide_marriage') >= 0) return 'violence';
  if (id.indexOf('redeem') >= 0 || id.indexOf('saint') >= 0) return 'social';
  if (id.indexOf('sleeper') >= 0 || id.indexOf('accountant') >= 0 || id.indexOf('prisoner') >= 0) return 'escape';
  if (id.indexOf('miser') >= 0 || id.indexOf('archive') >= 0 || id.indexOf('hoard') >= 0) return 'obsession';
  if (id.indexOf('observer') >= 0 || id.indexOf('puppeteer') >= 0 || id.indexOf('loop') >= 0) return 'meta';
  if (id.indexOf('prophet') >= 0 || id.indexOf('knowledge') >= 0 || id.indexOf('all_knowing') >= 0) return 'knowledge';
  if (id.indexOf('sacrifice') >= 0 || id.indexOf('choir') >= 0) return 'sacrifice';
  return null;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 7: Opaque Ending Description Generator
// ═══════════════════════════════════════════════════════════════
// Generates vague, poetic descriptions of endings that the player
// might be approaching — used ONLY in meta-narrative contexts
// (e.g., AbyssPopup, certain events), NEVER in UI tooltips.

/**
 * Generate an opaque hint about an approaching ending.
 * The hint describes the ENDING'S THEME, not the trigger conditions.
 *
 * @param {object} ending - ending data object
 * @param {number} humanity - current humanity score
 * @returns {string} opaque hint text
 */
export function getOpaqueEndingHint(ending, humanity) {
  var hints = {
    ending_self_harm_ritual: [
      '有人在皮肤上写字。',
      '身体变成了纸。',
      '你用疼痛书写。',
    ],
    ending_dissolution: [
      '边界正在溶解。',
      '你不再确定自己在哪里结束。',
      '水和记忆混在一起。',
    ],
    ending_vessel: [
      '你体内住着另一个声音。',
      '有些存在不需要被邀请。',
      '你的影子有自己的想法。',
    ],
    ending_tide_marriage: [
      '海在叫你。用你听不懂的语言。',
      '潮汐带走了某种承诺。',
      '水和你在同一个频率上。',
    ],
    ending_slaughterhouse: [
      '双手已经记不得第一次的感觉。',
      '有些东西一旦开始就停不下来。',
      '你的行为有自己的惯性。',
    ],
    ending_false_god: [
      '有人开始听你的。',
      '你获得了追随者。',
      '声音是有重量的。',
    ],
    ending_sleeper: [
      '睡眠变成了一种抵抗。',
      '你选择不去面对。',
      '世界在你闭眼的时候继续运转。',
    ],
    ending_observer: [
      '你看到了不该看的东西。',
      '第四面墙上有裂痕。',
      '你开始怀疑什么是真实的。',
    ],
    ending_archive_devourer: [
      '知识在消化你。',
      '你读的越多，你能记得的越少。',
      '有些真相需要被遗忘才能承受。',
    ],
    ending_puppeteer: [
      '你的手在别人的命运上。',
      '你不需要亲自动手。',
      '某些死亡是被精心安排的。',
    ],
  };

  var pool = hints[ending.id] || ['某些道路一旦踏上就无法回头。'];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ═══════════════════════════════════════════════════════════════
// SECTION 8: Integration helpers
// ═══════════════════════════════════════════════════════════════

/**
 * Enrich behavior endings with implicit trigger data.
 * Call once during game initialization.
 *
 * @param {Array} endings - from GD.endings
 * @returns {Array} enriched endings with implicit metadata
 */
export function enrichBehaviorEndings(endings) {
  return endings.map(function (ed) {
    if (ed.type !== 'behavior') return ed;

    var enriched = Object.assign({}, ed);
    enriched._implicit = {
      shadowAxis: matchEndingToAxis(ed),
      crossDependencies: CROSS_DEPENDENCIES[ed.id] || null,
      exclusions: getExclusionsForEnding(ed.id),
      dormantCounters: getDormantCountersForEnding(ed.id),
      opaqueHint: ed._opaqueHint || getOpaqueEndingHint(ed, 50),
    };

    return enriched;
  });
}

function getExclusionsForEnding(endingId) {
  var excl = [];
  for (var i = 0; i < MUTUAL_EXCLUSIONS.length; i++) {
    if (MUTUAL_EXCLUSIONS[i].endings.indexOf(endingId) >= 0) {
      excl = excl.concat(MUTUAL_EXCLUSIONS[i].endings.filter(function (e) { return e !== endingId; }));
    }
  }
  return excl;
}

function getDormantCountersForEnding(endingId) {
  var dormant = [];
  for (var key in DORMANT_COUNTERS) {
    // Map dormant counter to relevant endings
    if (endingId.indexOf(key.split('_')[0]) >= 0 || endingId.indexOf(key.split('_').slice(0, 2).join('_')) >= 0) {
      dormant.push(key);
    }
  }
  return dormant;
}

/**
 * Check if player behavior has "resonated" with any ending.
 * Returns the most resonated ending (closest to trigger) without
 * revealing any progress information.
 *
 * @param {object} state
 * @param {Array} allEndings
 * @returns {{ resonated: boolean, endingId: string|null, axis: string|null }}
 */
export function checkBehaviorResonance(state, allEndings) {
  var bt = state.behaviorTracking || {};
  var entropy = getEndingEntropy(bt);
  var approaching = getApproachingEndings(bt, allEndings);

  if (approaching.length > 0) {
    return {
      resonated: true,
      endingId: approaching[0].id,
      axis: entropy.dominantAxis,
      intensity: entropy.dominantScore > 8 ? 'strong' : entropy.dominantScore > 3 ? 'moderate' : 'faint',
    };
  }

  return { resonated: false, endingId: null, axis: null };
}
