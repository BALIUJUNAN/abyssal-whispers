import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { initExtendedEvents } from '../../src/reducers/extendedEventsInit.js';
import { validateGameData } from '../../src/data/schemas/index.js';
import { isAreaUnlocked } from '../../src/utils/gameHelpers.js';
import { getConnectedAreas } from '../../src/engine/WorldTimeSystem.js';
import { NPC_REGISTRY, getNpcName, resolveNpcId } from '../../src/data/registry/npcRegistry.js';
import { toPersistedState } from '../../src/reducers/saveMigration.js';

export const AUDIT_MODES = {
  quick: {
    runs: 12,
    maxActions: 260,
    replayChecks: 1,
    textSanLevels: [35, 20, 8, 1],
    minUniqueEvents: 12,
    requireLateGame: false,
  },
  release: {
    runs: 48,
    maxActions: 340,
    replayChecks: 3,
    textSanLevels: [45, 35, 20, 8, 1],
    minUniqueEvents: 30,
    requireLateGame: true,
  },
};

export const PLAYER_PROFILES = [
  {
    id: 'investigator',
    talkChance: 0.28,
    workChance: 0.12,
    deepGambleChance: 0.55,
    dangerBias: 0.2,
    combatPreference: 'communicate',
  },
  {
    id: 'social',
    talkChance: 0.8,
    workChance: 0.08,
    deepGambleChance: 0.2,
    dangerBias: -0.1,
    combatPreference: 'communicate',
  },
  {
    id: 'survivor',
    talkChance: 0.18,
    workChance: 0.42,
    deepGambleChance: 0,
    dangerBias: -0.5,
    combatPreference: 'flee',
  },
  {
    id: 'reckless',
    talkChance: 0.2,
    workChance: 0.04,
    deepGambleChance: 1,
    dangerBias: 0.8,
    combatPreference: 'attack',
  },
];

const DIFFICULTY_MATRIX = [1, 4, 8, 13];
const ARCHETYPE_MATRIX = ['journalist', 'detective', 'scholar', 'doctor', 'veteran', 'occultist'];

export function parseAuditArgs(argv = []) {
  const raw = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const eq = token.indexOf('=');
    const key = token.slice(2, eq >= 0 ? eq : undefined);
    const value =
      eq >= 0
        ? token.slice(eq + 1)
        : argv[i + 1] && !argv[i + 1].startsWith('--')
          ? argv[++i]
          : true;
    raw[key] = value;
  }

  const mode = raw.mode || 'quick';
  if (!AUDIT_MODES[mode]) throw new Error('Unknown audit mode: ' + mode);
  const preset = AUDIT_MODES[mode];
  const positiveInt = (name, fallback) => {
    if (raw[name] == null) return fallback;
    const value = Number(raw[name]);
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error('--' + name + ' must be a positive integer');
    }
    return value;
  };

  return {
    mode,
    runs: positiveInt('runs', preset.runs),
    maxActions: positiveInt('max-actions', preset.maxActions),
    replayChecks: positiveInt('replay-checks', preset.replayChecks),
    seed: String(raw.seed || 'abyssal-playability'),
    output: String(raw.output || 'test-results/playability-audit.json'),
    verbose: Boolean(raw.verbose),
    noReport: Boolean(raw['no-report']),
    textSanLevels: preset.textSanLevels.slice(),
    minUniqueEvents: preset.minUniqueEvents,
    requireLateGame: preset.requireLateGame,
  };
}

export function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(String(key)) ? values.get(String(key)) : null;
    },
    setItem(key, value) {
      values.set(String(key), String(value));
    },
    removeItem(key) {
      values.delete(String(key));
    },
    clear() {
      values.clear();
    },
    key(index) {
      return Array.from(values.keys())[index] || null;
    },
    get length() {
      return values.size;
    },
  };
}

export function loadProductionGameData(rootDir) {
  const root = resolve(rootDir);
  const gameBase = JSON.parse(readFileSync(resolve(root, 'src/data/game_base.json'), 'utf8'));
  const gameCh2plus = JSON.parse(readFileSync(resolve(root, 'game_ch2plus.json'), 'utf8'));
  const gameMeta = JSON.parse(readFileSync(resolve(root, 'game_meta.json'), 'utf8'));
  const merged = structuredClone(gameBase);

  // Keep this merge aligned with src/main.jsx. The canonical unsplit JSON is
  // intentionally used here because Node cannot import Vite's JSON modules
  // without import attributes.
  merged.events = [...(gameBase.events || []), ...(gameCh2plus.events || [])];
  if (gameCh2plus.endings) merged.endings = gameCh2plus.endings;
  if (gameCh2plus.ending_judgement) merged.ending_judgement = gameCh2plus.ending_judgement;
  if (gameMeta.implementation_notes) merged.implementation_notes = gameMeta.implementation_notes;
  if (gameMeta.deprecated_endings_archive) {
    merged.deprecated_endings_archive = gameMeta.deprecated_endings_archive;
  }

  const validation = validateGameData(merged);
  initExtendedEvents(merged);
  return { GD: merged, validation };
}

export function buildRunMatrix(config) {
  const rows = [];
  for (let i = 0; i < config.runs; i += 1) {
    const profile = PLAYER_PROFILES[i % PLAYER_PROFILES.length];
    rows.push({
      index: i,
      seed: config.seed + '-' + String(i + 1).padStart(3, '0'),
      profile: profile.id,
      difficulty: DIFFICULTY_MATRIX[i % DIFFICULTY_MATRIX.length],
      archetype: ARCHETYPE_MATRIX[i % ARCHETYPE_MATRIX.length],
      maxActions: config.maxActions,
    });
  }
  return rows;
}

function sortedObject(value, seen = new WeakSet()) {
  if (value == null || typeof value !== 'object') return value;
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  if (value instanceof Set) {
    return Array.from(value)
      .map((item) => sortedObject(item, seen))
      .sort();
  }
  if (value instanceof Map) {
    return Array.from(value.entries())
      .map(([key, item]) => [key, sortedObject(item, seen)])
      .sort(([a], [b]) => String(a).localeCompare(String(b)));
  }
  if (Array.isArray(value)) return value.map((item) => sortedObject(item, seen));
  const out = {};
  for (const key of Object.keys(value).sort()) {
    const item = value[key];
    if (typeof item !== 'function' && typeof item !== 'undefined')
      out[key] = sortedObject(item, seen);
  }
  return out;
}

export function stableSerialize(value) {
  return JSON.stringify(sortedObject(value));
}

export function canonicalGameplaySnapshot(state) {
  return stableSerialize(toPersistedState(state));
}

function addFailure(list, code, message, details = {}) {
  list.push({ code, message, ...details });
}

function validateFiniteNumber(state, key, failures) {
  if (!Number.isFinite(state[key])) {
    addFailure(failures, 'STATE_NON_FINITE', key + ' must be a finite number', {
      field: key,
      actual: String(state[key]),
    });
  }
}

function validateNpcMap(map, field, failures, options = {}) {
  if (!map || typeof map !== 'object' || Array.isArray(map)) {
    addFailure(failures, 'STATE_NPC_MAP', field + ' must be an object');
    return;
  }
  for (const [key, value] of Object.entries(map)) {
    const stableId = resolveNpcId(key);
    const displayName = getNpcName(stableId);
    if (NPC_REGISTRY[stableId] && key !== stableId) {
      addFailure(failures, 'NPC_NON_CANONICAL_KEY', field + ' contains a display-name/alias key', {
        field,
        key,
        expected: stableId,
      });
    }
    if (
      NPC_REGISTRY[stableId] &&
      key !== displayName &&
      Object.prototype.hasOwnProperty.call(map, displayName)
    ) {
      addFailure(
        failures,
        'NPC_DUPLICATE_IDENTITY',
        field + ' contains both stable and display-name keys',
        {
          field,
          key,
          displayName,
        }
      );
    }
    if (options.trust && (!Number.isFinite(value) || value < 0 || value > 5)) {
      addFailure(failures, 'NPC_TRUST_RANGE', field + '.' + key + ' must be in [0, 5]', {
        field,
        key,
        actual: value,
      });
    }
  }
}

export function validateRuntimeState(state, GD) {
  const failures = [];
  const numericFields = [
    'day',
    'ap',
    'maxAp',
    'hp',
    'maxHp',
    'san',
    'maxSan',
    'food',
    'maxFood',
    'money',
    'loopCount',
    'pollution',
    'safehouseCorruption',
    'humanityScore',
  ];
  numericFields.forEach((key) => validateFiniteNumber(state, key, failures));

  const rangeChecks = [
    ['day', 1, Number.POSITIVE_INFINITY],
    ['ap', 0, state.maxAp],
    ['hp', 0, state.maxHp],
    ['san', 0, state.maxSan],
    ['food', 0, state.maxFood],
    ['maxAp', 1, Number.POSITIVE_INFINITY],
    ['maxHp', 1, Number.POSITIVE_INFINITY],
    ['maxSan', 1, Number.POSITIVE_INFINITY],
    ['maxFood', 1, Number.POSITIVE_INFINITY],
    ['loopCount', 0, Number.POSITIVE_INFINITY],
  ];
  for (const [field, min, max] of rangeChecks) {
    if (Number.isFinite(state[field]) && (state[field] < min || state[field] > max)) {
      addFailure(failures, 'STATE_RANGE', field + ' is outside its legal range', {
        field,
        actual: state[field],
        min,
        max,
      });
    }
  }

  const arrays = [
    'inventory',
    'clues',
    'visitedAreas',
    'objectives',
    'completedChains',
    'triggeredEvents',
    'triggeredSilentEvents',
    'narrative',
    'eventLog',
  ];
  for (const field of arrays) {
    if (!Array.isArray(state[field]))
      addFailure(failures, 'STATE_ARRAY', field + ' must be an array', { field });
  }

  const areaIds = new Set((GD.areas || GD.module2_areas || []).map((area) => area.id));
  if (!areaIds.has(state.currentArea)) {
    addFailure(failures, 'AREA_UNKNOWN', 'currentArea does not exist in production game data', {
      currentArea: state.currentArea,
    });
  }

  validateNpcMap(state.npcTrust, 'npcTrust', failures, { trust: true });
  validateNpcMap(state.npcStates, 'npcStates', failures);
  validateNpcMap(state.npcRelations, 'npcRelations', failures);
  validateNpcMap(state._npcTrustLocked, '_npcTrustLocked', failures);

  if (state._triggeredSet instanceof Set && Array.isArray(state.triggeredEvents)) {
    for (const id of state.triggeredEvents) {
      if (!state._triggeredSet.has(id)) {
        addFailure(failures, 'TRIGGER_INDEX_DRIFT', '_triggeredSet is missing a triggered event', {
          eventId: id,
        });
        break;
      }
    }
  }
  if (state._silentSet instanceof Set && Array.isArray(state.triggeredSilentEvents)) {
    for (const id of state.triggeredSilentEvents) {
      if (!state._silentSet.has(id)) {
        addFailure(
          failures,
          'SILENT_INDEX_DRIFT',
          '_silentSet is missing a triggered silent event',
          { eventId: id }
        );
        break;
      }
    }
  }

  const modalCount = [
    state.pendingChoice,
    state.pendingGamble,
    state.combat?.active ? state.combat : null,
  ].filter(Boolean).length;
  if (modalCount > 1) {
    addFailure(failures, 'BLOCKING_STATE_OVERLAP', 'multiple blocking gameplay states are active', {
      pendingChoice: Boolean(state.pendingChoice),
      pendingGamble: Boolean(state.pendingGamble),
      combat: Boolean(state.combat?.active),
    });
  }

  if (Array.isArray(state.narrative)) {
    for (let index = 0; index < state.narrative.length; index += 1) {
      const entry = state.narrative[index];
      if (!entry || typeof entry.text !== 'string' || /\b(?:undefined|NaN)\b/.test(entry.text)) {
        addFailure(failures, 'NARRATIVE_INVALID', 'narrative contains an invalid rendered entry', {
          index,
          actual: entry?.text,
        });
        break;
      }
    }
  }

  if (state.ending && typeof state.ending !== 'object') {
    addFailure(failures, 'ENDING_INVALID', 'ending must be null or an object');
  } else if (state.ending && !state.ending.id && !state.ending.name && !state.ending.title) {
    addFailure(failures, 'ENDING_IDENTITY', 'ending has no id, name, or title');
  }

  return failures;
}

export function summarizeState(state) {
  return {
    actionIndex: state._actionIndex,
    day: state.day,
    ap: state.ap,
    hp: state.hp,
    san: state.san,
    food: state.food,
    money: state.money,
    area: state.currentArea,
    events: state.triggeredEvents?.length || 0,
    clues: state.clues?.length || 0,
    chains: state.completedChains?.length || 0,
    ending: state.ending?.id || state.ending?.name || state.ending?.title || null,
    pending: state.pendingChoice
      ? 'choice'
      : state.pendingGamble
        ? 'gamble'
        : state.pendingNpc
          ? 'npc'
          : state.combat?.active
            ? 'combat'
            : null,
  };
}

export function progressSignature(state) {
  return stableSerialize({
    day: state.day,
    ap: state.ap,
    hp: state.hp,
    san: state.san,
    food: state.food,
    money: state.money,
    area: state.currentArea,
    events: state.triggeredEvents,
    clues: state.clues,
    chains: state.completedChains,
    trust: state.npcTrust,
    npcThreads: state.npcThreads,
    ending: state.ending,
    pendingChoice: Boolean(state.pendingChoice),
    pendingGamble: Boolean(state.pendingGamble),
    pendingNpc: state.pendingNpc
      ? {
          name: state.pendingNpc.npc?.name || null,
          threads: (state.pendingNpc.availableThreads || []).map((entry) => ({
            id: entry.thread?.id,
            branch: entry.branch || null,
            nextDepth: entry.nextDepth,
          })),
        }
      : null,
    combat: state.combat
      ? {
          active: state.combat.active,
          monsterHp: state.combat.monsterHp,
          round: state.combat.round,
        }
      : null,
    transition: state.transition,
  });
}

function collectClueIds(GD) {
  const ids = new Set();
  for (const chain of GD.clue_chains || []) {
    for (const clue of chain.clues || []) if (clue?.id) ids.add(clue.id);
  }
  for (const event of GD.events || []) {
    const candidates = [event.effects, ...(event.choices || []).map((choice) => choice.effects)];
    for (const effects of candidates) {
      if (!effects) continue;
      const clue = effects.clue || effects.add_clue || effects.clue_id;
      if (typeof clue === 'string') ids.add(clue);
      if (Array.isArray(clue)) clue.forEach((id) => ids.add(id));
    }
  }
  return ids;
}

export function auditAreaReachability(GD) {
  const failures = [];
  const snapshots = [];
  const areas = GD.areas || GD.module2_areas || [];
  const areaById = new Map(areas.map((area) => [area.id, area]));
  const clueIds = collectClueIds(GD);
  const allClues = Array.from(clueIds).map((id) => ({ id, name: id }));

  for (const area of areas) {
    for (const target of area.connected_areas || []) {
      if (!areaById.has(target)) {
        addFailure(failures, 'AREA_EDGE_MISSING', 'area connection points to an unknown area', {
          area: area.id,
          target,
        });
      } else if (!(areaById.get(target).connected_areas || []).includes(area.id)) {
        addFailure(failures, 'AREA_EDGE_ONE_WAY', 'area connection is not bidirectional', {
          area: area.id,
          target,
        });
      }
    }
    if (area.unlock_clue && !clueIds.has(area.unlock_clue)) {
      addFailure(failures, 'AREA_UNLOCK_CLUE_MISSING', 'area unlock clue is not authored', {
        area: area.id,
        clue: area.unlock_clue,
      });
    }
  }

  const startArea = areaById.has('town_center') ? 'town_center' : areas[0]?.id;
  for (const day of [1, 4, 8, 15, 22, 28]) {
    const state = { day, clues: allClues };
    const unlocked = new Set(
      areas.filter((area) => isAreaUnlocked(area, state)).map((area) => area.id)
    );
    const reached = new Set(startArea && unlocked.has(startArea) ? [startArea] : []);
    const queue = Array.from(reached);
    while (queue.length > 0) {
      const current = queue.shift();
      for (const target of getConnectedAreas(current, { GD })) {
        if (unlocked.has(target) && !reached.has(target)) {
          reached.add(target);
          queue.push(target);
        }
      }
    }
    const unreachable = Array.from(unlocked).filter((id) => !reached.has(id));
    if (unreachable.length > 0) {
      addFailure(
        failures,
        'AREA_UNREACHABLE',
        'unlocked areas cannot be reached from the starting area',
        {
          day,
          areas: unreachable,
        }
      );
    }
    snapshots.push({
      day,
      unlocked: Array.from(unlocked).sort(),
      reachable: Array.from(reached).sort(),
    });
  }

  return { failures, snapshots, areaCount: areas.length, clueIdCount: clueIds.size };
}

const PLAYER_TEXT_KEYS = new Set([
  'text',
  'description',
  'distortion_text',
  'false_memory',
  'label',
  'event_text',
  'restart_text',
  'narrative',
  'narrative_text',
  'success_text',
  'failure_text',
  'outcome_text',
  'warning',
  'hint',
  'title',
  'name',
  'epilogue',
  'dialogue',
]);

export function collectPlayerFacingStrings(GD) {
  const roots = {
    events: GD.events || [],
    areas: GD.areas || [],
    npcs: GD.npcs || [],
    endings: GD.endings || [],
    ending_judgement: GD.ending_judgement || {},
    clue_chains: GD.clue_chains || [],
    event_chains: GD.event_chains || [],
    implementation_notes: GD.implementation_notes || {},
  };
  const rows = [];
  const seen = new Set();
  let functionValues = 0;

  const walk = (value, path, key) => {
    if (typeof value === 'function') {
      functionValues += 1;
      return;
    }
    if (typeof value === 'string') {
      if (
        (PLAYER_TEXT_KEYS.has(key) ||
          /(?:text|description|narrative|dialogue|hint|title|name)$/i.test(key)) &&
        value.length >= 10
      ) {
        const identity = path + '\u0000' + value;
        if (!seen.has(identity)) {
          seen.add(identity);
          rows.push({ path, key, text: value });
        }
      }
      return;
    }
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, path + '[' + index + ']', key));
      return;
    }
    for (const [childKey, childValue] of Object.entries(value)) {
      walk(childValue, path + '.' + childKey, childKey);
    }
  };

  for (const [key, value] of Object.entries(roots)) walk(value, key, key);
  return { rows, functionValues };
}

export function summarizeValidation(validation) {
  const categories = ['events', 'npcs', 'areas', 'items'];
  const totals = { valid: 0, invalid: 0, errors: [] };
  for (const category of categories) {
    const result = validation[category] || { valid: 0, invalid: 0, errors: [] };
    totals.valid += result.valid || 0;
    totals.invalid += result.invalid || 0;
    for (const error of result.errors || []) {
      totals.errors.push({ category, id: error.id, issues: error.issues });
    }
  }
  return totals;
}
