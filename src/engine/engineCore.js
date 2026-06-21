// src/engine/engineCore.js — Pure JS game engine core (zero React dependency)
// This module contains the complete game engine logic in pure JavaScript.
// It can run in Node.js (for simulation, testing, balance analysis) without
// any browser or React environment.
//
// Usage in Node.js:
//   import { createGameState, processDay, processAction, simulateRun } from './engineCore.js';
//   import { GD } from './data/game_base.json'; // game data
//   import { makeRng } from './utils/seededRng.js';
//   const rng = makeRng(12345);
//   const state = createGameState(GD);
//   for (let day = 1; day <= 28; day++) {
//     processDay(state, day, rng);
//   }
//
// Architecture:
//   - All functions are pure (no side effects, no DOM access)
//   - State is mutated in-place (mutable pattern for simulation efficiency)
//   - RNG is explicit parameter (deterministic)
//   - GD (game data) is explicit parameter
//   - No imports from React, ReactDOM, or browser APIs

// ═══════════════════════════════════════════════════════════════
// SECTION 1: State creation
// ═══════════════════════════════════════════════════════════════

/**
 * Create a fresh game state from game data.
 * @param {object} GD - game data object
 * @param {object} [options] - optional overrides
 * @param {number} [options.seed] - RNG seed
 * @param {string} [options.difficulty] - difficulty key
 * @param {number} [options.difficultyLevel] - difficulty level 1-13
 * @returns {object} fresh game state
 */
export function createGameState(GD, options) {
  const opts = options || {};
  return {
    // Character
    stats: { STR: 50, CON: 55, DEX: 55, APP: 50, POW: 60, INT: 65, SIZ: 60, EDU: 70 },
    hp: 11, maxHp: 11,
    san: 60, maxSan: 60,
    luck: 50, mp: 12,
    skills: {},
    archetype: null,
    tempSkillBonus: null,
    inventory: (GD.systems?.player?.starting_items?.starting_items || [])
      .map(function (item) {
        const idMap = {
          手电筒: 'flashlight', 笔记本和笔: 'notebook',
          急救包: 'first_aid_kit', 怀表: 'pocket_watch',
        };
        return { id: idMap[item.name] || item.name, name: item.name, uses: item.uses };
      }),
    clues: [],
    difficulty: opts.difficulty || 'normal',
    difficultyLevel: opts.difficultyLevel || 1,

    // World
    currentArea: 'town_center',
    visitedAreas: ['town_center'],
    npcTrust: {},
    npcStates: {},
    npcRelations: {},
    sealState: 'intact',
    weather: '阴天',
    safehouseCorruption: 0,
    currentSafehouse: 'main',
    harborRiskReduction: 0,
    areaNameCache: {},
    retainedKnowledge: [],
    lastVisitedDates: {},
    lastDeathType: null,
    mythosLevel: 0,
    currentChapter: 'chapter_1',
    humanityScore: 50,
    discoveredConclusions: [],
    activeBlessings: [],
    pollution: 0,
    loopEchoes: { deadNpcAreas: [] },

    // Progress
    day: 1,
    ap: 0, maxAp: 12,
    objectives: [],
    completedChains: [],
    triggeredEvents: [],
    triggeredSilentEvents: [],
    seenEventTexts: {},
    longTermEffects: [],
    madnessActive: null,

    // Runtime (not persisted)
    narrative: [],
    eventLog: [],
    _dayActions: [],
    _actionIndex: 0,
    _effects: [],
    _apLies: false,
    _apOffset: 0,
    _runtime: {},
    _debug: {},
    _GD: GD,

    // Loop tracking
    loopCount: 0,
    behaviorTracking: {
      direct_kill_count: 0, cannibalism_count: 0, npc_deaths_by_manipulation: 0,
      harbor_visits: 0, meta_boundary_breaks: 0, areas_explored: 0,
      redeemed_npcs: 0, cult_leader_score: 0,
      low_intervention_count: 0, sleep_streak: 0,
      self_harm_ritual_count: 0, fusion_accepted_count: 0,
      possession_accepted_count: 0, sacred_desecration_count: 0,
      checks_passed: 0, clue_finds: 0, days_best: 0, low_san_days: 0,
      _actionHistory: [],
    },

    // Event cooldowns
    eventCooldowns: {},
    _recentEventIds: [],
  };
}

// ═══════════════════════════════════════════════════════════════
// SECTION 2: RNG helpers
// ═══════════════════════════════════════════════════════════════

/**
 * Create a simple seeded RNG (compatible with makeRng from seededRng.js).
 * For simulation, use the actual makeRng from seededRng.js.
 * This is a fallback for environments without that module.
 */
export function createSimRng(seed) {
  let s = seed || 42;
  return {
    next: function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return (s >>> 8) / 16777216;
    },
    nextInt: function (min, max) {
      return min + Math.floor(this.next() * (max - min + 1));
    },
    pick: function (arr) {
      return arr[Math.floor(this.next() * arr.length)];
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// SECTION 3: Event selection (pure, deterministic)
// ═══════════════════════════════════════════════════════════════

/**
 * Select an event for the current day and state.
 * Pure function — no side effects.
 *
 * @param {object} state
 * @param {object} GD
 * @param {object} rng
 * @returns {object|null} selected event or null
 */
export function selectEvent(state, GD, rng) {
  if (!GD.events || GD.events.length === 0) return null;

  const day = state.day || 1;
  const san = state.san || 60;
  const loop = state.loopCount || 0;

  // Filter eligible events
  const eligible = GD.events.filter(function (evt) {
    // Already triggered?
    if ((state.triggeredEvents || []).includes(evt.id)) return false;
    // Day range check
    if (evt.trigger && evt.trigger.days) {
      const d = evt.trigger.days;
      if (typeof d === 'object' && d.min != null && day < d.min) return false;
      if (typeof d === 'object' && d.max != null && day > d.max) return false;
    }
    // SAN check
    if (evt.trigger && evt.trigger.san_range) {
      const sr = evt.trigger.san_range;
      if (sr.min != null && san < sr.min) return false;
      if (sr.max != null && san > sr.max) return false;
    }
    // Loop check
    if (evt.trigger && evt.trigger.loop_min != null && loop < evt.trigger.loop_min) return false;
    return true;
  });

  if (eligible.length === 0) return null;

  // Weighted selection
  const weights = eligible.map(function (evt) {
    return evt.weight || 1;
  });
  const totalWeight = weights.reduce(function (a, b) { return a + b; }, 0);
  let roll = (rng.next() * totalWeight);
  for (let i = 0; i < eligible.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return eligible[i];
  }
  return eligible[eligible.length - 1];
}

// ═══════════════════════════════════════════════════════════════
// SECTION 4: Resource simulation
// ═══════════════════════════════════════════════════════════════

export const CONSUMPTION_RATES = {
  foodPerAction: 1,
  baseDailyFood: 2,
  starvationDmg: 2,
  maxStarvationDays: 5,
};

export const REST_RECOVERY = {
  apPerRest: 8,
  hpPerRest: 2,
  sanPerRest: 3,
  foodCostPerRest: 1,
};

/**
 * Simulate daily resource consumption.
 * Pure function — mutates state in place.
 */
export function simulateDailyResources(state, rng) {
  const day = state.day || 1;
  const actions = state._dayActions || [];
  const actionCount = actions.length;

  // Food consumption: base + per-action
  const foodConsumed = CONSUMPTION_RATES.baseDailyFood + actionCount * CONSUMPTION_RATES.foodPerAction;
  state.food = Math.max(0, (state.food || 0) - foodConsumed);

  // Starvation
  if (state.food <= 0) {
    state.hp = Math.max(0, state.hp - CONSUMPTION_RATES.starvationDmg);
    state.starvationDays = (state.starvationDays || 0) + 1;
  } else {
    state.starvationDays = 0;
  }

  // Death from starvation
  if (state.hp <= 0) {
    state._deathCause = 'starvation';
    return false; // dead
  }

  // AP recovery at rest
  if (state._didRest) {
    state.ap = Math.min(state.maxAp, state.ap + REST_RECOVERY.apPerRest);
    state.hp = Math.min(state.maxHp, state.hp + REST_RECOVERY.hpPerRest);
    state.san = Math.min(state.maxSan, state.san + REST_RECOVERY.sanPerRest);
  }

  // SAN drift (very slow natural recovery)
  state.san = Math.min(state.maxSan, state.san + 0.5);

  // Pollution accumulation
  state.pollution = Math.min(100, (state.pollution || 0) + 0.3);

  return true; // alive
}

/**
 * Process a single action's resource cost.
 */
export function processActionCost(state, actionType, rng) {
  const costs = {
    EXPLORE: { ap: 2, food: 1 },
    MOVE: { ap: 1, food: 0 },
    TALK_NPC: { ap: 1, food: 0 },
    REST: { ap: 0, food: -REST_RECOVERY.foodCostPerRest },
    DO_SKILL_CHECK: { ap: 3, food: 1 },
    USE_ITEM: { ap: 1, food: 0 },
  };
  const cost = costs[actionType] || { ap: 1, food: 0 };
  state.ap = Math.max(0, state.ap - cost.ap);
  if (cost.food > 0) {
    state.food = Math.max(0, state.food - cost.food);
  } else if (cost.food < 0) {
    state.food = Math.max(0, state.food + cost.food); // negative = gain
  }
  return cost;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 5: Area exploration
// ═══════════════════════════════════════════════════════════════

/**
 * Get available exits from current area.
 * @param {string} currentArea
 * @param {object} GD
 * @returns {Array} list of { id, name, requires }
 */
export function getAvailableExits(currentArea, GD) {
  const areas = GD.areas || GD.module2_areas || [];
  const area = areas.find(function (a) { return a.id === currentArea; });
  if (!area || !area.exits) return [];
  return area.exits
    .filter(function (exit) {
      if (exit.requires_clue) {
        return false; // caller must check clue separately
      }
      return true;
    })
    .map(function (exit) {
      return {
        id: exit.area || exit,
        name: (areas.find(function (a) { return a.id === (exit.area || exit); }) || {}).name || exit,
        requires: exit.requires_clue || null,
      };
    });
}

/**
 * Check if moving to an area is allowed.
 * @param {string} targetAreaId
 * @param {object} state
 * @param {object} GD
 * @returns {boolean}
 */
export function canMoveTo(targetAreaId, state, GD) {
  const areas = GD.areas || GD.module2_areas || [];
  const target = areas.find(function (a) { return a.id === targetAreaId; });
  if (!target) return false;
  if (target.unlock_clue) {
    return (state.clues || []).some(function (c) {
      const id = typeof c === 'string' ? c : (c.id || c.name || '');
      return id === target.unlock_clue;
    });
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 6: NPC interaction
// ═══════════════════════════════════════════════════════════════

/**
 * Get trust level for an NPC.
 * @param {object} state
 * @param {string} npcId
 * @returns {number} 0-5
 */
export function getNpcTrust(state, npcId) {
  const trust = (state.npcTrust || {})[npcId];
  return typeof trust === 'number' ? Math.max(0, Math.min(5, trust)) : 0;
}

/**
 * Modify NPC trust.
 * @param {object} state
 * @param {string} npcId
 * @param {number} delta
 */
export function modifyNpcTrust(state, npcId, delta) {
  const current = getNpcTrust(state, npcId);
  state.npcTrust = state.npcTrust || {};
  state.npcTrust[npcId] = Math.max(0, Math.min(5, current + delta));
}

// ═══════════════════════════════════════════════════════════════
// SECTION 7: Effect application (pure)
// ═══════════════════════════════════════════════════════════════

/**
 * Apply an event's effects to state.
 * @param {object} state
 * @param {object} event
 * @param {object} rng
 */
export function applyEventEffects(state, event, rng) {
  const effects = event.effects || [];
  for (const eff of effects) {
    applySingleEffect(state, eff, rng);
  }
}

function applySingleEffect(state, eff, rng) {
  if (eff.san) {
    state.san = Math.max(0, Math.min(state.maxSan, state.san + eff.san));
  }
  if (eff.hp) {
    state.hp = Math.max(0, Math.min(state.maxHp, state.hp + eff.hp));
  }
  if (eff.ap) {
    state.ap = Math.max(0, state.ap + eff.ap);
  }
  if (eff.food) {
    state.food = state.food != null ? state.food + eff.food : eff.food;
  }
  if (eff.add_item) {
    const items = Array.isArray(eff.add_item) ? eff.add_item : [eff.add_item];
    for (const item of items) {
      state.inventory = state.inventory || [];
      state.inventory.push({ id: item, name: item, uses: 1 });
    }
  }
  if (eff.add_clue) {
    state.clues = state.clues || [];
    const clues = Array.isArray(eff.add_clue) ? eff.add_clue : [eff.add_clue];
    for (const clue of clues) {
      if (!(state.clues || []).some(function (c) {
        const id = typeof c === 'string' ? c : (c.id || '');
        return id === (typeof clue === 'string' ? clue : clue.id);
      })) {
        state.clues.push(clue);
      }
    }
  }
  if (eff.corruption) {
    state.safehouseCorruption = Math.min(100, (state.safehouseCorruption || 0) + eff.corruption);
  }
  if (eff.pollution) {
    state.pollution = Math.min(100, (state.pollution || 0) + eff.pollution);
  }
  if (eff.mythos) {
    state.mythosLevel = Math.min(100, (state.mythosLevel || 0) + eff.mythos);
  }
  if (eff.npc_trust) {
    for (const key in eff.npc_trust) {
      modifyNpcTrust(state, key, eff.npc_trust[key]);
    }
  }
  if (eff.narr) {
    state.narrative = state.narrative || [];
    state.narrative.push({ text: eff.narr, day: state.day, type: 'narrative' });
  }
  if (eff.event_log) {
    state.eventLog = state.eventLog || [];
    state.eventLog.push({
      text: eff.event_log,
      day: state.day,
      type: 'event',
      timestamp: Date.now(),
    });
  }
  if (eff.objective) {
    state.objectives = state.objectives || [];
    // Check if already exists
    const exists = state.objectives.some(function (o) { return o.id === eff.objective.id; });
    if (!exists) {
      state.objectives.push({
        id: eff.objective.id,
        text: eff.objective.text || eff.objective.id,
        done: false,
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 8: Day processing
// ═══════════════════════════════════════════════════════════════

/**
 * Process the start of a new day.
 * @param {object} state
 * @param {number} day
 * @param {object} GD
 * @param {object} rng
 * @returns {Array} events triggered this day
 */
export function processDayStart(state, day, GD, rng) {
  state.day = day;
  state._dayActions = [];
  state._didRest = false;

  // Day-based ambient audio
  if (day <= 3) {
    emit('AMBIENT_SWITCH', { name: 'town_quiet', volume: 0.3 });
  } else if (day <= 7) {
    emit('AMBIENT_SWITCH', { name: 'town_uneasy', volume: 0.4 });
  } else {
    emit('AMBIENT_SWITCH', { name: 'town_hostile', volume: 0.5 });
  }

  // Critical day surge
  if (day === 7 || day === 14 || day === 21 || day === 28) {
    emit('DAY_SURGE', { day, san: state.san });
  }

  return [];
}

/**
 * Process end of day: resource consumption, effects, cleanup.
 * @param {object} state
 * @param {object} GD
 * @param {object} rng
 * @returns {{ alive: boolean, events: Array }}
 */
export function processDayEnd(state, GD, rng) {
  // Apply daily event
  const event = selectEvent(state, GD, rng);
  const triggeredEvents = [];

  if (event) {
    applyEventEffects(state, event, rng);
    state.triggeredEvents = state.triggeredEvents || [];
    state.triggeredEvents.push(event.id);
    state.eventCooldowns = state.eventCooldowns || {};
    state.eventCooldowns[event.id] = state.day;
    triggeredEvents.push(event);
  }

  // Resource consumption
  const alive = simulateDailyResources(state, rng);

  // SAN check
  if (state.san <= 0) {
    state._deathCause = 'sanity';
    return { alive: false, events: triggeredEvents };
  }
  if (state.hp <= 0) {
    state._deathCause = state._deathCause || 'starvation';
    return { alive: false, events: triggeredEvents };
  }

  return { alive: true, events: triggeredEvents };
}

// ═══════════════════════════════════════════════════════════════
// SECTION 9: Action processing
// ═══════════════════════════════════════════════════════════════

/**
 * Process a player action.
 * @param {object} state
 * @param {string} actionType
 * @param {object} params - action-specific parameters
 * @param {object} GD
 * @param {object} rng
 * @returns {{ success: boolean, result: object }}
 */
export function processAction(state, actionType, params, GD, rng) {
  // Track action for behavior profiling
  state._dayActions = state._dayActions || [];
  state._dayActions.push(actionType);
  state.behaviorTracking = state.behaviorTracking || {};
  state.behaviorTracking._actionHistory = state.behaviorTracking._actionHistory || [];
  state.behaviorTracking._actionHistory.push({ type: actionType, day: state.day });
  if (state.behaviorTracking._actionHistory.length > 20) {
    state.behaviorTracking._actionHistory = state.behaviorTracking._actionHistory.slice(-20);
  }

  // Cost
  processActionCost(state, actionType, rng);

  switch (actionType) {
    case 'EXPLORE':
      return processExplore(state, params, GD, rng);
    case 'MOVE':
      return processMove(state, params, GD, rng);
    case 'TALK_NPC':
      return processTalkNpc(state, params, GD, rng);
    case 'REST':
      return processRest(state, params, GD, rng);
    case 'DO_SKILL_CHECK':
      return processSkillCheck(state, params, GD, rng);
    case 'USE_ITEM':
      return processUseItem(state, params, GD, rng);
    default:
      return { success: true, result: {} };
  }
}

function processExplore(state, params, GD, rng) {
  // Find explore event
  const event = selectEvent(state, GD, rng);
  if (!event) {
    return { success: true, result: { text: '你仔细搜索了周围，但没有发现什么特别的。' } };
  }

  applyEventEffects(state, event, rng);

  // Log
  emit('EVENT_LOG_APPEND', { text: event.description || event.name, day: state.day });
  if (event.san && event.san < 0) {
    emit('SAN_LOSS_FLASH', { amount: Math.abs(event.san) });
  }

  return { success: true, result: { event, text: event.description || event.name } };
}

function processMove(state, params, GD, rng) {
  const targetId = params.target;
  if (!targetId) return { success: false, result: { error: 'no_target' } };
  if (!canMoveTo(targetId, state, GD)) {
    return { success: false, result: { error: 'locked', message: '你还不清楚如何前往那里。' } };
  }

  state.currentArea = targetId;
  state.visitedAreas = state.visitedAreas || [];
  if (!state.visitedAreas.includes(targetId)) {
    state.visitedAreas.push(targetId);
    state.behaviorTracking = state.behaviorTracking || {};
    state.behaviorTracking.areas_explored = (state.behaviorTracking.areas_explored || 0) + 1;
  }

  emit('AREA_ENTERED', { areaId: targetId, fromArea: params.from });
  return { success: true, result: { areaId: targetId } };
}

function processTalkNpc(state, params, GD, rng) {
  const npcId = params.npcId;
  if (!npcId) return { success: false, result: { error: 'no_npc' } };

  const trust = getNpcTrust(state, npcId);
  modifyNpcTrust(state, npcId, 1);

  // Simple NPC response
  const npcs = GD.npcs || GD.module3_npcs || [];
  const npc = npcs.find(function (n) { return n.id === npcId; });
  const response = npc
    ? (npc.dialogue && npc.dialogue[Math.min(trust, (npc.dialogue.length || 1) - 1)])
      || npc.description || '...'
    : '（对方没有回应）';

  state.narrative = state.narrative || [];
  state.narrative.push({ text: response, day: state.day, type: 'npc' });

  return { success: true, result: { response, trust: getNpcTrust(state, npcId) } };
}

function processRest(state, params, GD, rng) {
  state._didRest = true;
  state.ap = Math.min(state.maxAp, state.ap + REST_RECOVERY.apPerRest);
  state.hp = Math.min(state.maxHp, state.hp + REST_RECOVERY.hpPerRest);
  state.san = Math.min(state.maxSan, state.san + REST_RECOVERY.sanPerRest);
  state.behaviorTracking = state.behaviorTracking || {};
  state.behaviorTracking.sleep_streak = (state.behaviorTracking.sleep_streak || 0) + 1;

  state.narrative = state.narrative || [];
  state.narrative.push({ text: '你找了个地方休息了一会。', day: state.day, type: 'system' });

  return { success: true, result: { text: '休息完成。' } };
}

function processSkillCheck(state, params, GD, rng) {
  const skill = params.skill || 'listen';
  const difficulty = params.difficulty || 50;
  const roll = Math.floor(rng.next() * 100) + 1;
  const skillBonus = (state.skills || {})[skill] || 0;
  const total = roll + skillBonus;
  const passed = total >= difficulty;

  state.behaviorTracking = state.behaviorTracking || {};
  if (passed) state.behaviorTracking.checks_passed = (state.behaviorTracking.checks_passed || 0) + 1;

  if (passed) {
    state.ap = Math.max(0, state.ap - 3);
    emit('AUDIO_PLAY', { name: 'skill_pass', volume: 0.5 });
    return { success: true, result: { passed: true, roll, total, text: '检定通过！' } };
  } else {
    state.ap = Math.max(0, state.ap - 3);
    state.san = Math.max(0, state.san - 2);
    emit('SAN_LOSS_FLASH', { amount: 2 });
    emit('AUDIO_PLAY', { name: 'skill_fail', volume: 0.5 });
    return { success: true, result: { passed: false, roll, total, text: '检定失败...' } };
  }
}

function processUseItem(state, params, GD, rng) {
  const itemId = params.itemId;
  const inventory = state.inventory || [];
  const itemIndex = inventory.findIndex(function (item) { return item.id === itemId; });

  if (itemIndex < 0) {
    return { success: false, result: { error: 'not_found' } };
  }

  const item = inventory[itemIndex];
  // Apply item effect
  if (itemId === 'first_aid_kit') {
    state.hp = Math.min(state.maxHp, state.hp + 3);
  } else if (itemId === 'flashlight') {
    state._runtime = state._runtime || {};
    state._runtime.lightSource = true;
  }

  // Consume
  item.uses = (item.uses || 1) - 1;
  if (item.uses <= 0) {
    inventory.splice(itemIndex, 1);
  }

  return { success: true, result: { item, consumed: item.uses <= 0 } };
}

// ═══════════════════════════════════════════════════════════════
// SECTION 10: Run simulation
// ═══════════════════════════════════════════════════════════════

/**
 * Simulate a complete run (1-28 days) with random actions.
 * Pure function — no DOM, no React, no side effects (uses emit for logging).
 *
 * @param {object} GD
 * @param {object} options
 * @param {number} options.seed - RNG seed
 * @param {number} options.maxDays - max days to simulate (default 28)
 * @param {string} options.profile - behavior profile: 'balanced', 'violent', 'explorer', 'social', 'passive', 'occultist', 'investigator', 'survivor'
 * @returns {object} simulation result
 */
export function simulateRun(GD, options) {
  const opts = options || {};
  const seed = opts.seed != null ? opts.seed : Date.now() & 0xFFFF;
  const rng = createSimRng(seed);
  const maxDays = opts.maxDays || 28;

  const state = createGameState(GD, opts);

  // Apply behavior profile
  applyBehaviorProfile(state, opts.profile || 'balanced', rng);

  const stats = {
    seed: seed,
    daysSurvived: 0,
    eventsTriggered: [],
    actionsPerDay: [],
    finalSan: state.san,
    finalHp: state.hp,
    finalArea: state.currentArea,
    loopCount: 0,
    deathDay: null,
    deathCause: null,
    npcTrust: {},
    discoveredClues: [],
    foodConsumed: 0,
    foodGained: 0,
  };

  for (let day = 1; day <= maxDays; day++) {
    processDayStart(state, day, GD, rng);

    // Simulate actions for this day (3-5 actions)
    const actionCount = 3 + Math.floor(rng.next() * 3);
    for (let a = 0; a < actionCount; a++) {
      const actionType = pickAction(state, opts.profile, rng);
      const params = getActionParams(actionType, state, GD, rng);
      const result = processAction(state, actionType, params, GD, rng);
      if (!result.success) continue;

      // Track food
      if (state.food < (state._prevFood || state.food)) {
        stats.foodConsumed += (state._prevFood || state.food) - state.food;
      }
      state._prevFood = state.food;
    }

    const dayResult = processDayEnd(state, GD, rng);
    stats.actionsPerDay.push(state._dayActions ? state._dayActions.length : 0);
    stats.eventsTriggered = stats.eventsTriggered.concat(dayResult.events);

    if (!dayResult.alive) {
      stats.deathDay = day;
      stats.deathCause = state._deathCause || 'unknown';
      stats.daysSurvived = day;
      stats.finalSan = state.san;
      stats.finalHp = state.hp;
      break;
    }

    stats.daysSurvived = day;
    stats.finalSan = state.san;
    stats.finalHp = state.hp;
  }

  // Collect final stats
  stats.npcTrust = Object.assign({}, state.npcTrust);
  stats.discoveredClues = (state.clues || []).map(function (c) {
    return typeof c === 'string' ? c : (c.id || c.name || '');
  });
  stats.finalArea = state.currentArea;
  stats.loopCount = state.loopCount;

  return stats;
}

function applyBehaviorProfile(state, profile, rng) {
  // Pre-set some stats based on profile for varied simulation
  const presets = {
    violent: { STR: 65, san: 55 },
    explorer: { DEX: 60, INT: 70 },
    social: { APP: 60, EDU: 65 },
    passive: { POW: 55, CON: 60 },
    occultist: { POW: 70, INT: 70 },
    investigator: { INT: 75, EDU: 75 },
    survivor: { CON: 65, SIZ: 65 },
  };
  const preset = presets[profile] || {};
  for (const key in preset) {
    if (state.stats[key]) state.stats[key] = preset[key];
  }
}

function pickAction(state, profile, rng) {
  const actions = ['EXPLORE', 'MOVE', 'TALK_NPC', 'REST', 'DO_SKILL_CHECK', 'USE_ITEM'];
  const weights = {
    balanced:   [3, 2, 2, 2, 1, 1],
    violent:    [2, 1, 1, 1, 3, 1],
    explorer:   [4, 2, 1, 1, 2, 1],
    social:     [1, 2, 4, 1, 1, 1],
    passive:    [1, 1, 1, 5, 1, 1],
    occultist:  [2, 1, 1, 1, 3, 1],
    investigator: [2, 1, 2, 1, 4, 1],
    survivor:   [2, 2, 1, 3, 1, 2],
  };
  const w = weights[profile] || weights.balanced;
  const total = w.reduce(function (a, b) { return a + b; }, 0);
  let roll = rng.next() * total;
  for (let i = 0; i < actions.length; i++) {
    roll -= w[i];
    if (roll <= 0) return actions[i];
  }
  return 'EXPLORE';
}

function getActionParams(actionType, state, GD, rng) {
  switch (actionType) {
    case 'MOVE': {
      const exits = getAvailableExits(state.currentArea, GD);
      const validExits = exits.filter(function (e) { return canMoveTo(e.id, state, GD); });
      return { target: validExits.length > 0 ? rng.pick(validExits).id : state.currentArea, from: state.currentArea };
    }
    case 'TALK_NPC':
      return { npcId: rng.pick(['old_lady', 'priest', 'librarian', 'doctor', 'shopkeeper']) };
    case 'DO_SKILL_CHECK':
      return { skill: rng.pick(['listen', 'spot_hidden', 'psychology', 'library']), difficulty: 40 + Math.floor(rng.next() * 30) };
    case 'USE_ITEM': {
      const inv = state.inventory || [];
      return inv.length > 0 ? { itemId: rng.pick(inv).id } : {};
    }
    default:
      return {};
  }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 11: Batch simulation (for balance analysis)
// ═══════════════════════════════════════════════════════════════

/**
 * Run N simulations and aggregate stats.
 * @param {object} GD
 * @param {object} options
 * @param {number} options.count - number of simulations (default 100)
 * @param {number} [options.seed] - base seed (incremented per run)
 * @returns {object} aggregated statistics
 */
export function batchSimulate(GD, options) {
  const opts = options || {};
  const count = opts.count || 100;
  const baseSeed = opts.seed != null ? opts.seed : 42;
  const profile = opts.profile || 'balanced';

  const results = [];
  for (let i = 0; i < count; i++) {
    const result = simulateRun(GD, {
      seed: baseSeed + i,
      maxDays: opts.maxDays || 28,
      profile: profile,
    });
    results.push(result);
  }

  // Aggregate
  const survived = results.filter(function (r) { return r.deathDay === null; }).length;
  const deathDays = results.filter(function (r) { return r.deathDay != null; }).map(function (r) { return r.deathDay; });
  const avgSurvival = deathDays.length > 0
    ? deathDays.reduce(function (a, b) { return a + b; }, 0) / deathDays.length
    : 28;

  const avgSan = results.reduce(function (a, r) { return a + r.finalSan; }, 0) / results.length;
  const avgHp = results.reduce(function (a, r) { return a + r.finalHp; }, 0) / results.length;

  // Death cause distribution
  const deathCauses = {};
  for (const r of results) {
    if (r.deathCause) {
      deathCauses[r.deathCause] = (deathCauses[r.deathCause] || 0) + 1;
    }
  }

  // Day-by-day survival rate
  const survivalByDay = {};
  for (let d = 1; d <= (opts.maxDays || 28); d++) {
    survivalByDay[d] = results.filter(function (r) { return (r.daysSurvived || 0) >= d; }).length / count;
  }

  return {
    totalRuns: count,
    survived,
    survivalRate: survived / count,
    avgSurvivalDay: avgSurvival,
    avgFinalSan: avgSan,
    avgFinalHp: avgHp,
    deathCauses: deathCauses,
    survivalByDay: survivalByDay,
    rawResults: results,
  };
}

// ═══════════════════════════════════════════════════════════════
// SECTION 12: Event bus bridge (Node.js compatible)
// ═══════════════════════════════════════════════════════════════

// Lightweight event bus for pure JS environment (no DOM)
const _nodeListeners = {};
const _nodeHistory = [];
const _NODE_HISTORY_CAP = 100;

export function nodeEmit(event, payload) {
  _nodeHistory.push({ event: event, payload: payload, t: Date.now() });
  if (_nodeHistory.length > _NODE_HISTORY_CAP) _nodeHistory.shift();
  const handlers = _nodeListeners[event];
  if (!handlers) return;
  for (let i = 0; i < handlers.length; i++) {
    try { handlers[i](payload); } catch (e) { console.warn('[NodeBus]', event, e); }
  }
}

export function nodeOn(event, handler) {
  if (!_nodeListeners[event]) _nodeListeners[event] = [];
  _nodeListeners[event].push(handler);
  return function unsub() {
    _nodeListeners[event] = (_nodeListeners[event] || []).filter(function (h) { return h !== handler; });
  };
}

export function getNodeEventHistory() {
  return _nodeHistory.slice();
}

export function clearNodeBus() {
  for (const key in _nodeListeners) {
    _nodeListeners[key].length = 0;
  }
}

// Alias for convenience
export const emit = nodeEmit;
export const on = nodeOn;
