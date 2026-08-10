#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  AUDIT_MODES,
  PLAYER_PROFILES,
  auditAreaReachability,
  buildRunMatrix,
  canonicalGameplaySnapshot,
  collectPlayerFacingStrings,
  createMemoryStorage,
  loadProductionGameData,
  parseAuditArgs,
  progressSignature,
  stableSerialize,
  summarizeState,
  summarizeValidation,
  validateRuntimeState,
} from './playability/audit-core.mjs';
import { useGameStore } from '../src/state/useGameStore.js';
import { initialState } from '../src/state/initialState.js';
import { createSeededRng } from '../src/utils/seededRng.js';
import { getConnectedAreas } from '../src/engine/WorldTimeSystem.js';
import { isAreaUnlocked } from '../src/utils/gameHelpers.js';
import { getNpcsHere } from '../src/utils/npcLocation.js';
import { getNpcStateByRef } from '../src/utils/npcStateAccess.js';
import { getCombatActions } from '../src/systems/combatSystem.js';
import { applyTextFragmentation } from '../src/systems/textFragmentation.js';
import {
  configureSaveManager,
  deleteSlot,
  loadSlot,
  manualSave,
} from '../src/engine/SaveManager.js';
import {
  SAVE_VERSION,
  getPersistedStateKeys,
  migrateSaveData,
  toPersistedState,
} from '../src/reducers/saveMigration.js';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(SCRIPT_PATH), '..');

function profileById(id) {
  return PLAYER_PROFILES.find((profile) => profile.id === id) || PLAYER_PROFILES[0];
}

function sanitizeAction(action) {
  const out = { type: action.type };
  const fields = [
    'areaId',
    'choiceIdx',
    'choiceId',
    'choice',
    'actionType',
    'itemId',
    'difficulty',
    'archetypeId',
  ];
  for (const field of fields) if (action[field] !== undefined) out[field] = action[field];
  if (action.npc) out.npc = action.npc.id || action.npc.name;
  if (action.creatureType) out.creatureType = action.creatureType;
  if (action.stage) out.stage = action.stage;
  return out;
}

function terminalStatus(state) {
  if (state.ending) return 'ending';
  if (state.hp <= 0) return 'physical_death';
  if (state.san <= 0) return 'mental_death';
  if (state.day > 28) return 'time_limit_without_ending';
  return null;
}

function cleanResetStore(GD) {
  const current = useGameStore.getState();
  const methods = {};
  for (const [key, value] of Object.entries(current)) {
    if (typeof value === 'function') methods[key] = value;
  }
  useGameStore.setState({ ...initialState(GD), ...methods, _GD: GD }, true);
}

function validateVisibleNpcs(state, GD) {
  const failures = [];
  for (const npc of getNpcsHere(state, { GD })) {
    if (getNpcStateByRef(state, npc.name).dead) {
      failures.push({
        code: 'DEAD_NPC_VISIBLE',
        message: 'getNpcsHere returned a dead NPC',
        npc: npc.name,
        area: state.currentArea,
        day: state.day,
      });
    }
  }
  return failures;
}

function makeRunContext(spec) {
  return {
    spec,
    profile: profileById(spec.profile),
    policyRng: createSeededRng('policy:' + spec.seed, spec.difficulty),
    previousArea: null,
    exploredToday: new Set(),
    trace: [],
    warnings: [],
    failures: [],
    captureSnapshots: false,
    stepSnapshots: [],
    noProgressCount: 0,
    coverage: {
      areas: new Set(),
      events: new Set(),
      clues: new Set(),
      chains: new Set(),
      conclusions: new Set(),
      npcsTalked: new Set(),
      combatTypes: new Set(),
      pendingTypes: new Set(),
    },
  };
}

function captureCoverage(ctx, state, action) {
  for (const area of state.visitedAreas || []) ctx.coverage.areas.add(area);
  for (const eventId of state.triggeredEvents || []) ctx.coverage.events.add(eventId);
  for (const clue of state.clues || [])
    ctx.coverage.clues.add(clue?.id || clue?.name || String(clue));
  for (const chain of state.completedChains || []) ctx.coverage.chains.add(chain);
  for (const conclusion of state.discoveredConclusions || []) {
    ctx.coverage.conclusions.add(conclusion?.id || conclusion?.name || String(conclusion));
  }
  if (action?.type === 'TALK_NPC' && action.npc)
    ctx.coverage.npcsTalked.add(action.npc.name || action.npc.id);
  if (action?.type === 'START_COMBAT') ctx.coverage.combatTypes.add(action.creatureType);
  if (state.pendingChoice) ctx.coverage.pendingTypes.add('choice');
  if (state.pendingGamble) ctx.coverage.pendingTypes.add('gamble');
  if (state.pendingNpc) ctx.coverage.pendingTypes.add('npc');
  if (state.combat?.active) ctx.coverage.pendingTypes.add('combat');
}

function dispatchChecked(ctx, action, GD, phase = 'simulation') {
  const beforeState = useGameStore.getState();
  const before = summarizeState(beforeState);
  const beforeSignature = progressSignature(beforeState);
  let result;
  try {
    result = beforeState.dispatch(action);
  } catch (error) {
    ctx.failures.push({
      code: 'DISPATCH_THROW',
      message: error.message,
      name: error.name,
      phase,
      action: sanitizeAction(action),
      stack: error.stack,
    });
    return false;
  }
  if (!result || result.ok !== true) {
    ctx.failures.push({
      code: 'DISPATCH_REJECTED',
      message: result?.error?.message || 'dispatch did not return { ok: true }',
      phase,
      action: sanitizeAction(action),
    });
    return false;
  }

  const afterState = useGameStore.getState();
  const after = summarizeState(afterState);
  const stateFailures = validateRuntimeState(afterState, GD).concat(
    validateVisibleNpcs(afterState, GD)
  );
  for (const failure of stateFailures) {
    ctx.failures.push({ ...failure, phase, action: sanitizeAction(action), state: after });
  }
  captureCoverage(ctx, afterState, action);

  const progressed = beforeSignature !== progressSignature(afterState);
  ctx.noProgressCount = progressed ? 0 : ctx.noProgressCount + 1;
  ctx.trace.push({
    index: ctx.trace.length,
    action: sanitizeAction(action),
    before,
    after,
    progressed,
  });
  if (ctx.captureSnapshots) ctx.stepSnapshots.push(canonicalGameplaySnapshot(afterState));
  if (ctx.trace.length > 500) ctx.trace.shift();

  if (ctx.noProgressCount >= 8) {
    ctx.failures.push({
      code: 'RUN_NO_PROGRESS',
      message: 'eight consecutive production actions made no observable gameplay progress',
      phase,
      action: sanitizeAction(action),
      state: after,
    });
    return false;
  }
  return stateFailures.length === 0;
}

function startProductionRun(ctx, GD) {
  cleanResetStore(GD);
  useGameStore.setState({ runSeed: ctx.spec.seed, _actionIndex: 0 });
  const setupActions = [
    { type: 'START_GAME' },
    { type: 'SKIP_PROLOGUE' },
    { type: 'DISMISS_GUIDE' },
    { type: 'SET_DIFFICULTY', difficulty: ctx.spec.difficulty },
    { type: 'SET_ARCHETYPE', archetypeId: ctx.spec.archetype },
    { type: 'ROLL_STATS' },
    { type: 'BEGIN_ADVENTURE' },
  ];
  for (const action of setupActions) {
    if (!dispatchChecked(ctx, action, GD, 'setup')) return false;
  }
  return true;
}

function chooseChoiceIndex(pendingChoice, profile, rng) {
  const choices = pendingChoice?.choices || [];
  if (choices.length <= 1) return 0;
  if (profile.id === 'reckless') return choices.length - 1;
  if (profile.id === 'survivor') {
    const safeIndex = choices.findIndex((choice) =>
      /离开|拒绝|放弃|谨慎|安全|停止/.test(choice.label || '')
    );
    return safeIndex >= 0 ? safeIndex : 0;
  }
  return rng.intBetween(0, choices.length - 1);
}

function chooseNpcResponse(state, ctx) {
  const pending = state.pendingNpc;
  const npcName = pending?.npc?.name;
  const threads = pending?.availableThreads || [];
  if (
    threads.length > 0 &&
    state.ap >= 1 &&
    (ctx.profile.id === 'social' || ctx.profile.id === 'investigator')
  ) {
    const chosen = threads[ctx.policyRng.intBetween(0, threads.length - 1)];
    const suffix = chosen.branch && chosen.choiceText ? '_' + chosen.branch : '';
    return { type: 'NPC_RESPONSE', choice: 'probe_' + chosen.thread.id + suffix };
  }
  if (npcName && state._dailyTrustGains?.[npcName])
    return { type: 'NPC_RESPONSE', choice: 'leave' };
  if (state.ap >= 1) return { type: 'NPC_RESPONSE', choice: 'trust_up' };
  return { type: 'NPC_RESPONSE', choice: 'leave' };
}

function areaDistance(start, goal, state, GD) {
  if (start === goal) return 0;
  const areaById = new Map((GD.areas || []).map((area) => [area.id, area]));
  const seen = new Set([start]);
  const queue = [[start, 0]];
  while (queue.length > 0) {
    const [current, distance] = queue.shift();
    for (const target of getConnectedAreas(current, { GD })) {
      const area = areaById.get(target);
      if (!area || !isAreaUnlocked(area, state) || seen.has(target)) continue;
      if (target === goal) return distance + 1;
      seen.add(target);
      queue.push([target, distance + 1]);
    }
  }
  return 999;
}

function chooseMoveTarget(state, ctx, GD) {
  const areas = GD.areas || [];
  const areaById = new Map(areas.map((area) => [area.id, area]));
  const candidates = getConnectedAreas(state.currentArea, { GD })
    .map((id) => areaById.get(id))
    .filter((area) => area && isAreaUnlocked(area, state));
  if (candidates.length === 0) return null;
  const lowFood = state.food <= 1;
  const scored = candidates.map((area) => {
    let score = ctx.policyRng.next();
    if (!(state.visitedAreas || []).includes(area.id)) score += 100;
    const lastDay = state.lastVisitedDates?.[area.id] || 0;
    score += Math.max(0, state.day - lastDay) * 2;
    score += (area.danger_level || 0) * ctx.profile.dangerBias * 5;
    if (area.id === ctx.previousArea) score -= 4;
    if (lowFood) score -= areaDistance(area.id, 'town_center', state, GD) * 40;
    return { area, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].area.id;
}

function chooseCombatAction(state, ctx) {
  const actions = getCombatActions(state.combat, state);
  const itemAction = actions.find((action) => action.type === 'item');
  if (itemAction && state.hp <= Math.ceil(state.maxHp * 0.4)) {
    const healingItem = (itemAction.items || []).find(
      (item) => item.id === 'bandage' || item.id === 'tranquilizer'
    );
    if (healingItem) return { type: 'COMBAT_ACTION', actionType: 'item', itemId: healingItem.id };
  }
  const preferred =
    actions.find((action) => action.type === ctx.profile.combatPreference) ||
    actions.find((action) => action.type === 'flee') ||
    actions[0];
  return preferred
    ? { type: 'COMBAT_ACTION', actionType: preferred.type, itemId: null }
    : { type: 'END_COMBAT' };
}

function chooseNextAction(state, ctx, GD) {
  if (state.transition) return { type: 'CLEAR_TRANSITION' };
  if (state.pendingChoice) {
    return {
      type: 'CHOICE_SELECT',
      choiceIdx: chooseChoiceIndex(state.pendingChoice, ctx.profile, ctx.policyRng),
    };
  }
  if (state.pendingGamble) {
    const deep = ctx.policyRng.next() < ctx.profile.deepGambleChance;
    const desired = deep ? 'deep_investigate' : 'safe';
    const option =
      state.pendingGamble.options?.find((item) => item.id === desired) ||
      state.pendingGamble.options?.[0];
    return { type: 'GAMBLE_CHOICE', choiceId: option?.id || desired };
  }
  if (state.pendingNpc) return chooseNpcResponse(state, ctx);
  if (state.combat?.active) return chooseCombatAction(state, ctx);

  if (state.ap < 2) return { type: 'REST' };
  if (
    state.currentArea === 'town_center' &&
    state.food < Math.min(3, state.maxFood) &&
    state.money >= 3 &&
    state.ap >= 1
  ) {
    return { type: 'BUY_FOOD' };
  }

  const npcs = getNpcsHere(state, { GD }).filter(
    (npc) => state._dailyNpcTalks?.[npc.name] !== state.day
  );
  if (npcs.length > 0 && state.ap >= 2 && ctx.policyRng.next() < ctx.profile.talkChance) {
    return { type: 'TALK_NPC', npc: ctx.policyRng.pick(npcs) };
  }

  const explorationKey = state.day + ':' + state.currentArea;
  if (!ctx.exploredToday.has(explorationKey) && state.ap >= 2) {
    ctx.exploredToday.add(explorationKey);
    return { type: 'EXPLORE' };
  }

  if (state.ap >= 3) {
    const target = chooseMoveTarget(state, ctx, GD);
    if (target) {
      ctx.previousArea = state.currentArea;
      return { type: 'MOVE', areaId: target };
    }
  }

  if (state.ap >= 2 && (state.money < 9 || ctx.policyRng.next() < ctx.profile.workChance))
    return { type: 'WORK' };
  return { type: 'REST' };
}

function serializeCoverage(coverage) {
  const result = {};
  for (const [key, value] of Object.entries(coverage)) result[key] = Array.from(value).sort();
  return result;
}

export function runProductionSimulation(spec, GD, options = {}) {
  const ctx = makeRunContext(spec);
  ctx.captureSnapshots = Boolean(options.captureSnapshots);
  if (!startProductionRun(ctx, GD)) return finishRun(ctx, 'setup_error');
  captureCoverage(ctx, useGameStore.getState(), null);

  const actionLimit = options.actionLimit || spec.maxActions;
  let status = terminalStatus(useGameStore.getState());
  while (!status && ctx.trace.length < actionLimit && ctx.failures.length === 0) {
    const state = useGameStore.getState();
    const action = chooseNextAction(state, ctx, GD);
    if (!action) {
      ctx.failures.push({
        code: 'POLICY_STUCK',
        message: 'player policy could not choose a legal action',
        state: summarizeState(state),
      });
      status = 'stalled';
      break;
    }
    if (!dispatchChecked(ctx, action, GD)) {
      status = 'error';
      break;
    }
    status = terminalStatus(useGameStore.getState());
  }

  if (!status) {
    status = options.allowPartial ? 'prefix_complete' : 'max_actions';
    if (!options.allowPartial) {
      ctx.failures.push({
        code: 'RUN_ACTION_LIMIT',
        message: 'run did not reach a terminal state before the action limit',
        maxActions: actionLimit,
        state: summarizeState(useGameStore.getState()),
      });
    }
  }
  if (status === 'time_limit_without_ending') {
    ctx.failures.push({
      code: 'RUN_MISSING_ENDING',
      message: 'day 28 passed without an ending object or a death state',
      state: summarizeState(useGameStore.getState()),
    });
  }
  return finishRun(ctx, status);
}

function finishRun(ctx, status) {
  const state = useGameStore.getState();
  return {
    spec: ctx.spec,
    status,
    passed: ctx.failures.length === 0,
    actions: ctx.trace.length,
    maxDay: state.day,
    finalState: summarizeState(state),
    ending: state.ending
      ? {
          id: state.ending.id || null,
          name: state.ending.name || state.ending.title || null,
          type: state.ending.type || null,
        }
      : null,
    coverage: serializeCoverage(ctx.coverage),
    failures: ctx.failures,
    warnings: ctx.warnings,
    traceTail: ctx.trace.slice(-30),
    replaySnapshot: canonicalGameplaySnapshot(state),
    replayTrace: stableSerialize(
      ctx.trace.map((entry) => ({ action: entry.action, after: entry.after }))
    ),
    stepSnapshots: ctx.stepSnapshots,
  };
}

function runDeterminismProbe(spec, GD) {
  const replayOptions = {
    captureSnapshots: true,
    allowPartial: true,
    actionLimit: Math.min(spec.maxActions, 160),
  };
  const first = runProductionSimulation(spec, GD, replayOptions);
  const second = runProductionSimulation(spec, GD, replayOptions);
  const failures = [];
  const firstTrace = JSON.parse(first.replayTrace);
  const secondTrace = JSON.parse(second.replayTrace);
  const traceDivergenceIndex = Array.from({
    length: Math.max(firstTrace.length, secondTrace.length),
  }).findIndex(
    (_, index) => stableSerialize(firstTrace[index]) !== stableSerialize(secondTrace[index])
  );
  const stateDivergenceIndex = Array.from({
    length: Math.max(first.stepSnapshots.length, second.stepSnapshots.length),
  }).findIndex((_, index) => first.stepSnapshots[index] !== second.stepSnapshots[index]);
  const divergenceIndex = stateDivergenceIndex >= 0 ? stateDivergenceIndex : traceDivergenceIndex;
  if (first.replayTrace !== second.replayTrace) {
    failures.push({
      code: 'REPLAY_TRACE_MISMATCH',
      message: 'same seed/profile produced a different production action trace',
      seed: spec.seed,
      profile: spec.profile,
      divergenceIndex,
      traceDivergenceIndex,
      stateDivergenceIndex,
      first: traceDivergenceIndex >= 0 ? firstTrace[traceDivergenceIndex] : null,
      second: traceDivergenceIndex >= 0 ? secondTrace[traceDivergenceIndex] : null,
    });
  }
  if (first.replaySnapshot !== second.replaySnapshot) {
    const firstState = JSON.parse(first.replaySnapshot);
    const secondState = JSON.parse(second.replaySnapshot);
    const differingFields = Array.from(
      new Set([...Object.keys(firstState), ...Object.keys(secondState)])
    ).filter((key) => stableSerialize(firstState[key]) !== stableSerialize(secondState[key]));
    const firstDivergentState =
      stateDivergenceIndex >= 0 ? JSON.parse(first.stepSnapshots[stateDivergenceIndex]) : {};
    const secondDivergentState =
      stateDivergenceIndex >= 0 ? JSON.parse(second.stepSnapshots[stateDivergenceIndex]) : {};
    const firstDifferingFields = Array.from(
      new Set([...Object.keys(firstDivergentState), ...Object.keys(secondDivergentState)])
    ).filter(
      (key) =>
        stableSerialize(firstDivergentState[key]) !== stableSerialize(secondDivergentState[key])
    );
    failures.push({
      code: 'REPLAY_STATE_MISMATCH',
      message: 'same seed/profile produced a different persisted gameplay state',
      seed: spec.seed,
      profile: spec.profile,
      differingFields: differingFields.slice(0, 40),
      firstDivergenceFields: firstDifferingFields.slice(0, 40),
      firstDivergenceAction: stateDivergenceIndex >= 0 ? firstTrace[stateDivergenceIndex] : null,
    });
  }
  return {
    seed: spec.seed,
    profile: spec.profile,
    difficulty: spec.difficulty,
    firstStatus: first.status,
    secondStatus: second.status,
    failures: [...first.failures, ...second.failures, ...failures],
  };
}

function runSaveRoundTripProbe(spec, GD) {
  const ctx = makeRunContext({ ...spec, seed: spec.seed + '-save' });
  const failures = [];
  if (!startProductionRun(ctx, GD)) return { failures: ctx.failures };
  for (let index = 0; index < 18 && !terminalStatus(useGameStore.getState()); index += 1) {
    const action = chooseNextAction(useGameStore.getState(), ctx, GD);
    if (!dispatchChecked(ctx, action, GD, 'save_probe')) break;
  }
  if (ctx.failures.length > 0) return { failures: ctx.failures };

  const before = canonicalGameplaySnapshot(useGameStore.getState());
  const slot = 'manual_playability_audit';
  deleteSlot(slot);
  if (!manualSave(slot, useGameStore.getState())) {
    failures.push({ code: 'SAVE_WRITE_FAILED', message: 'manualSave returned false' });
    return { failures };
  }
  const loaded = loadSlot(slot);
  if (!loaded || loaded.incompatible) {
    failures.push({
      code: 'SAVE_LOAD_FAILED',
      message: 'loadSlot did not return a compatible state',
    });
    return { failures };
  }
  cleanResetStore(GD);
  const loadCtx = makeRunContext({ ...spec, seed: spec.seed + '-save-load' });
  if (!dispatchChecked(loadCtx, { type: 'CONTINUE_GAME', savedState: loaded }, GD, 'save_probe')) {
    failures.push(...loadCtx.failures);
    return { failures };
  }
  const after = canonicalGameplaySnapshot(useGameStore.getState());
  if (before !== after) {
    failures.push({
      code: 'SAVE_ROUND_TRIP_MISMATCH',
      message: 'persisted gameplay state changed across manualSave/loadSlot/CONTINUE_GAME',
    });
  }
  deleteSlot(slot);
  return {
    failures,
    savedDay: useGameStore.getState().day,
    persistedKeys: Object.keys(toPersistedState(useGameStore.getState())).length,
  };
}

function runCombatProbe(GD) {
  const cases = [
    { creatureType: 'deep_ones', preference: 'attack' },
    { creatureType: 'night_gaunts', preference: 'communicate' },
    { creatureType: 'shoggoth', preference: 'flee' },
  ];
  const results = [];
  for (const [index, probe] of cases.entries()) {
    const spec = {
      index,
      seed: 'combat-probe-' + probe.creatureType,
      profile:
        probe.preference === 'attack'
          ? 'reckless'
          : probe.preference === 'flee'
            ? 'survivor'
            : 'investigator',
      difficulty: 1,
      archetype: 'veteran',
      maxActions: 40,
    };
    const ctx = makeRunContext(spec);
    if (!startProductionRun(ctx, GD)) {
      results.push({ ...probe, failures: ctx.failures });
      continue;
    }
    dispatchChecked(
      ctx,
      { type: 'START_COMBAT', creatureType: probe.creatureType, stage: 'trace' },
      GD,
      'combat_probe'
    );
    let rounds = 0;
    while (useGameStore.getState().combat?.active && rounds < 16 && ctx.failures.length === 0) {
      dispatchChecked(ctx, chooseCombatAction(useGameStore.getState(), ctx), GD, 'combat_probe');
      rounds += 1;
    }
    if (useGameStore.getState().combat?.active) {
      ctx.failures.push({
        code: 'COMBAT_DID_NOT_TERMINATE',
        message: 'combat remained active after 16 player turns',
        creatureType: probe.creatureType,
      });
    }
    if (ctx.failures.length === 0) dispatchChecked(ctx, { type: 'END_COMBAT' }, GD, 'combat_probe');
    results.push({
      ...probe,
      rounds,
      playerHp: useGameStore.getState().hp,
      failures: ctx.failures,
    });
  }
  return results;
}

function runLowSanTextProbe(GD, sanLevels) {
  const source = collectPlayerFacingStrings(GD);
  const failures = [];
  let transforms = 0;
  let rawStringsValidated = 0;
  for (const [index, row] of source.rows.entries()) {
    rawStringsValidated += 1;
    if (/\b(?:undefined|NaN)\b/.test(row.text)) {
      failures.push({
        code: 'AUTHORED_TEXT_INVALID',
        message: 'authored player-facing text contains a runtime artifact',
        path: row.path,
      });
    }
    // Production fragmentation is applied to prose bodies, not UI labels or
    // event/ending names. Transforming headings here would create false
    // positives for paths the game never sends through this pipeline.
    if (row.key === 'name' || row.key === 'title' || row.key === 'label') continue;
    for (const san of sanLevels) {
      try {
        const rng = createSeededRng('text-audit:' + row.path, san + index);
        const rendered = applyTextFragmentation(
          row.text,
          san,
          rng,
          {
            isCritical: /ending|milestone|chapter/.test(row.path),
            loopCount: 5,
            difficultyLevel: 13,
          },
          { GD }
        );
        transforms += 1;
        if (
          typeof rendered !== 'string' ||
          rendered.length === 0 ||
          /\b(?:undefined|NaN)\b/.test(rendered)
        ) {
          failures.push({
            code: 'LOW_SAN_TEXT_INVALID',
            message: 'text fragmentation produced invalid player-facing text',
            path: row.path,
            san,
            rendered,
          });
        }
      } catch (error) {
        failures.push({
          code: 'LOW_SAN_TEXT_THROW',
          message: error.message,
          path: row.path,
          san,
          stack: error.stack,
        });
      }
      if (failures.length >= 100) break;
    }
    if (failures.length >= 100) break;
  }
  return {
    sourceStrings: source.rows.length,
    rawStringsValidated,
    dynamicFunctionsSkipped: source.functionValues,
    transforms,
    failures,
  };
}

function aggregateCoverage(runs) {
  const sets = {
    areas: new Set(),
    events: new Set(),
    clues: new Set(),
    chains: new Set(),
    conclusions: new Set(),
    npcsTalked: new Set(),
    combatTypes: new Set(),
    pendingTypes: new Set(),
  };
  for (const run of runs) {
    for (const key of Object.keys(sets)) {
      for (const value of run.coverage[key] || []) sets[key].add(value);
    }
  }
  return serializeCoverage(sets);
}

function evaluateCoverage(config, GD, runs, coverage) {
  const warnings = [];
  const failures = [];
  const authoredAreas = (GD.areas || []).map((area) => area.id);
  const missingAreas = authoredAreas.filter((area) => !coverage.areas.includes(area));
  if (missingAreas.length > 0) {
    const issue = {
      code: 'COVERAGE_AREAS_MISSING',
      message: 'production simulations did not visit every authored area',
      areas: missingAreas,
    };
    (config.mode === 'release' ? failures : warnings).push(issue);
  }
  if (coverage.events.length < config.minUniqueEvents) {
    const issue = {
      code: 'COVERAGE_EVENTS_LOW',
      message: 'too few unique events were exercised by the run matrix',
      actual: coverage.events.length,
      expected: config.minUniqueEvents,
    };
    (config.mode === 'release' ? failures : warnings).push(issue);
  }
  if (coverage.npcsTalked.length === 0) {
    failures.push({
      code: 'COVERAGE_NPC_ZERO',
      message: 'no production NPC interaction was exercised',
    });
  }
  const maxDay = Math.max(...runs.map((run) => run.maxDay), 0);
  if (config.requireLateGame && maxDay < 22) {
    failures.push({
      code: 'COVERAGE_LATE_GAME',
      message: 'no simulation reached chapter 5',
      maxDay,
    });
  } else if (maxDay < 15) {
    warnings.push({
      code: 'COVERAGE_LATE_GAME_LOW',
      message: 'no simulation reached chapter 4',
      maxDay,
    });
  }
  return { failures, warnings, maxDay };
}

function flattenFailures(report) {
  const failures = [];
  const add = (scope, list) => {
    for (const item of list || []) failures.push({ scope, ...item });
  };
  add('data', report.data.failures);
  add('reachability', report.reachability.failures);
  add('text', report.lowSanText.failures);
  add('save', report.saveRoundTrip.failures);
  report.combat.forEach((probe) => add('combat:' + probe.creatureType, probe.failures));
  report.determinism.forEach((probe) => add('determinism:' + probe.seed, probe.failures));
  report.runs.forEach((run) => add('run:' + run.spec.seed, run.failures));
  add('coverage', report.coverageGate.failures);
  add('runtime', report.runtime.failures);
  return failures;
}

function printReport(report, outputPath) {
  const ok = report.summary.passed;
  console.log('');
  console.log('Abyssal Whispers playability audit — ' + report.config.mode);
  console.log('  status       ' + (ok ? 'PASS' : 'FAIL'));
  console.log(
    '  simulations  ' + report.summary.runsPassed + '/' + report.summary.runsTotal + ' passed'
  );
  console.log('  max day      ' + report.coverageGate.maxDay);
  console.log(
    '  coverage     ' +
      report.coverage.areas.length +
      ' areas, ' +
      report.coverage.events.length +
      ' events, ' +
      report.coverage.clues.length +
      ' clues, ' +
      report.coverage.npcsTalked.length +
      ' NPCs'
  );
  console.log(
    '  text stress  ' +
      report.lowSanText.transforms +
      ' transforms from ' +
      report.lowSanText.sourceStrings +
      ' source strings'
  );
  console.log('  failures     ' + report.failures.length + ', warnings ' + report.warnings.length);
  if (report.failures.length > 0) {
    console.log('');
    for (const failure of report.failures.slice(0, 20)) {
      console.log('  [' + failure.scope + '] ' + failure.code + ': ' + failure.message);
      if (failure.seed) console.log('    seed: ' + failure.seed);
    }
    if (report.failures.length > 20)
      console.log('  ... ' + (report.failures.length - 20) + ' more failures in JSON report');
  }
  if (outputPath) console.log('  report       ' + outputPath);
  console.log('');
}

export async function runAudit(config, rootDir = ROOT) {
  if (!globalThis.localStorage) globalThis.localStorage = createMemoryStorage();
  const { GD, validation } = loadProductionGameData(rootDir);
  useGameStore.getState().seedState(GD);
  configureSaveManager({
    SAVE_VERSION,
    migrateSaveData,
    toPersistedState,
    persistedStateKeys: getPersistedStateKeys(GD),
  });

  const validationSummary = summarizeValidation(validation);
  const dataFailures =
    validationSummary.invalid > 0
      ? [
          {
            code: 'DATA_SCHEMA_INVALID',
            message:
              validationSummary.invalid + ' production data entries failed schema validation',
            errors: validationSummary.errors.slice(0, 50),
          },
        ]
      : [];
  const reachability = auditAreaReachability(GD);
  const matrix = buildRunMatrix(config);
  const runtimeWarnings = [];
  const originalWarn = console.warn;
  console.warn = function () {
    const args = Array.from(arguments);
    runtimeWarnings.push(
      args.map((value) => (typeof value === 'string' ? value : '[object]')).join(' ')
    );
    originalWarn.apply(console, args);
  };
  let runs;
  let determinism;
  let saveRoundTrip;
  let combat;
  let lowSanText;
  try {
    runs = matrix.map((spec) => runProductionSimulation(spec, GD));
    determinism = matrix
      .slice(0, Math.min(config.replayChecks, matrix.length))
      .map((spec) => runDeterminismProbe(spec, GD));
    saveRoundTrip = runSaveRoundTripProbe(matrix[0], GD);
    combat = runCombatProbe(GD);
    lowSanText = runLowSanTextProbe(GD, config.textSanLevels);
  } finally {
    console.warn = originalWarn;
  }
  const coverage = aggregateCoverage(runs);
  const coverageGate = evaluateCoverage(config, GD, runs, coverage);

  const report = {
    generatedAt: new Date().toISOString(),
    project: { name: 'abyssal-whispers', version: '0.9.8' },
    config,
    data: {
      eventsAfterRuntimeMerge: GD.events?.length || 0,
      endingsAfterRuntimeMerge: GD.endings?.length || 0,
      validation: validationSummary,
      failures: dataFailures,
    },
    reachability,
    runs,
    determinism,
    saveRoundTrip,
    combat,
    lowSanText,
    runtime: {
      warnings: runtimeWarnings,
      failures: runtimeWarnings
        .filter((warning) => warning.startsWith('[applyLegacyEffects]'))
        .map((warning) => ({
          code: 'LEGACY_EFFECT_UNHANDLED',
          message: warning,
        })),
    },
    coverage,
    coverageGate,
  };
  report.failures = flattenFailures(report);
  report.warnings = coverageGate.warnings;
  report.summary = {
    passed: report.failures.length === 0,
    failures: report.failures.length,
    warnings: report.warnings.length,
    runsTotal: runs.length,
    runsPassed: runs.filter((run) => run.passed).length,
    terminalStatuses: Object.fromEntries(
      Array.from(new Set(runs.map((run) => run.status))).map((status) => [
        status,
        runs.filter((run) => run.status === status).length,
      ])
    ),
  };
  return report;
}

async function main() {
  let config;
  try {
    config = parseAuditArgs(process.argv.slice(2));
  } catch (error) {
    console.error('Argument error: ' + error.message);
    console.error(
      'Usage: node scripts/audit-playability.mjs --mode quick|release [--runs N] [--max-actions N] [--seed value] [--output path]'
    );
    process.exitCode = 2;
    return;
  }
  const report = await runAudit(config, ROOT);
  let outputPath = null;
  if (!config.noReport) {
    outputPath = resolve(ROOT, config.output);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  }
  printReport(report, outputPath);
  if (!report.summary.passed) process.exitCode = 1;
}

if (resolve(process.argv[1] || '') === SCRIPT_PATH) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}

export { AUDIT_MODES, buildRunMatrix, parseAuditArgs, validateRuntimeState };
