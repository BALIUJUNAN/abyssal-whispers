// src/data/ugcSchema.js — UGC Validation & Security Layer
// Strict JSON-only schema enforcement. No code execution permitted.
//
// Design principles:
//   1. Fail closed — unknown fields are stripped, not ignored.
//   2. Depth-first validation — every nested object is checked.
//   3. Deterministic — same input always produces same output or same error.
//   4. Defense in depth — structural validation + content sanitization.

// ────────────────────────────────────────────────
// SECTION 1: Constants & Whitelists
// ────────────────────────────────────────────────

export const LIMITS = {
  MAX_EVENTS_PER_MOD: 30,
  MAX_CHOICES_PER_EVENT: 6,
  MAX_DESCRIPTION_CHARS: 2000,
  MAX_NAME_CHARS: 80,
  MAX_ID_CHARS: 64,
  MAX_AUTHOR_CHARS: 40,
  MAX_MOD_NAME_CHARS: 80,
  MAX_VERSION_CHARS: 16,
  MAX_CLUE_NAME_CHARS: 80,
  MAX_TEXT_CHARS: 1500,
  MAX_LABEL_CHARS: 60,
  MAX_MODS_TOTAL: 20,
  MAX_NPCS_PER_MOD: 8,
  MAX_ITEMS_PER_MOD: 12,
  MAX_AREAS_PER_MOD: 4,
  MAX_ENDINGS_PER_MOD: 4,
};

// Keys allowed inside an event's `effects` object (top-level)
export const EFFECTS_KEYS_WHITELIST = new Set([
  'san',
  'hp',
  'maxHp',
  'humanity',
  'mythos',
  'add_clue',
  'remove_clue',
  'add_item',
  'remove_item',
  'set_flag',
  'add_flag',
  'loop',
  'food',
  'money',
  'light',
  'skill',
  'add_run_memory',
  'modify_humanity',
  'modify_mythos',
  'modify_safehouse_corruption',
  'unlock_area',
  'unlock_ending_condition',
]);

// Keys allowed inside a choice's `effects` object
const CHOICE_EFFECTS_KEYS_WHITELIST = new Set([
  'san',
  'hp',
  'maxHp',
  'humanity',
  'mythos',
  'add_clue',
  'remove_clue',
  'add_item',
  'remove_item',
  'set_flag',
  'add_flag',
  'loop',
  'food',
  'money',
  'light',
  'skill',
  'add_run_memory',
  'modify_humanity',
  'modify_mythos',
  'modify_safehouse_corruption',
]);

// Allowed event types
const VALID_EVENT_TYPES = new Set([
  'humanity',
  'mythos',
  'loop_locked',
  'resource_pressure',
  'npc_cross',
  'area_deep',
  'ending_omen',
  'ending_aftermath',
  'silent',
  'meta',
  'exploration',
  'combat',
  'ugc',
]);

// Allowed tiers
const VALID_TIERS = new Set(['common', 'normal', 'rare', 'epic', 'unique', 'signature']);

// Allowed trigger time phases
const VALID_TIME_PHASES = new Set(['morning', 'afternoon', 'evening', 'midnight']);

// Allowed item types (for mod-defined items)
const ITEM_TYPES = new Set(['tool', 'consumable', 'weapon', 'key', 'clue', 'ritual', 'food', 'light']);

// Allowed area types (for mod-defined areas)
const AREA_TYPES = new Set(['town', 'dungeon', 'wilderness', 'water', 'indoor', 'safehouse']);

// Allowed ending condition types (for mod-defined endings)
const VALID_ENDING_COND_TYPES = new Set([
  'has_flag', 'has_clue', 'has_item',
  'san_lte', 'san_gte', 'san_lt', 'san_gt',
  'humanity_lte', 'humanity_gte',
  'loop_gte', 'mythos_gte',
  'npc_trust_gte', 'in_area',
  'and', 'or', 'not',
]);

// Allowed area IDs (from base game)
const VALID_AREA_IDS = new Set([
  'town_center',
  'harbor_district',
  'lighthouse',
  'voxchester_manor',
  'catacombs_entrance',
  'deep_catacombs',
  'ruins_of_yith',
  'whispering_forest',
  'forbidden_grove',
]);

// ────────────────────────────────────────────────
// SECTION 2: Prototype Pollution Guard
// ────────────────────────────────────────────────

// Dangerous key patterns — reject any object containing these at any depth
const DANGEROUS_KEY_PATTERNS = [
  '__proto__',
  'constructor',
  'prototype',
  'toString',
  'valueOf',
  'toJSON',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
];

// Dangerous value patterns — reject any string containing these
const DANGEROUS_VALUE_PATTERNS = [
  /\bfunction\s*\(/i,
  /\beval\s*\(/i,
  /\bnew\s+Function/i,
  /\bsetTimeout\s*\(/i,
  /\bsetInterval\s*\(/i,
  /\bimport\s*\(/i,
  /\brequire\s*\(/i,
  /\bfetch\s*\(/i,
  /\bXMLHttpRequest/i,
  /\bdocument\./i,
  /\bwindow\./i,
  /\bglobalThis\./i,
  /\bself\./i,
  /\bthis\b.*\bconstructor\b/i,
  /<script/i,
  /javascript:/i,
  /on\w+\s*=/i, // onclick=, onerror= etc.
];

// ────────────────────────────────────────────────
// SECTION 3: Core Validators
// ────────────────────────────────────────────────

/**
 * Deep-scan an object for dangerous keys and values.
 * Returns { safe: boolean, violations: string[] }
 */
function scanForDanger(obj, path = '') {
  const violations = [];

  if (obj === null || obj === undefined) return { safe: true, violations: [] };
  if (typeof obj === 'string') {
    for (const pattern of DANGEROUS_VALUE_PATTERNS) {
      if (pattern.test(obj)) {
        violations.push(`${path}: dangerous pattern "${pattern}" in string value`);
      }
    }
    return { safe: violations.length === 0, violations };
  }
  if (typeof obj !== 'object') return { safe: true, violations: [] };
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const r = scanForDanger(obj[i], `${path}[${i}]`);
      violations.push(...r.violations);
    }
    return { safe: violations.length === 0, violations };
  }

  for (const key of Object.keys(obj)) {
    // Check key name
    if (DANGEROUS_KEY_PATTERNS.includes(key)) {
      violations.push(`${path}.${key}: dangerous key "${key}"`);
      continue; // do NOT recurse into dangerous subtree
    }
    // Check for keys that look like function constructors
    if (typeof obj[key] === 'function') {
      violations.push(`${path}.${key}: function value detected`);
      continue;
    }
    // Recurse
    const r = scanForDanger(obj[key], path ? `${path}.${key}` : key);
    violations.push(...r.violations);
  }

  return { safe: violations.length === 0, violations };
}

/**
 * Validate that only whitelisted keys exist in an effects object.
 * Returns { valid: boolean, errors: string[] }
 */
function validateEffectsKeys(effects, whitelist, path) {
  if (!effects || typeof effects !== 'object') return { valid: true, errors: [] };
  const errors = [];
  for (const key of Object.keys(effects)) {
    if (!whitelist.has(key)) {
      errors.push(`${path}: disallowed effect key "${key}"`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Validate a string field: type check + length limit.
 */
function validateStringField(value, fieldName, maxLen, required = true) {
  if (value === undefined || value === null) {
    return required ? [`${fieldName}: required`] : [];
  }
  if (typeof value !== 'string') return [`${fieldName}: must be a string`];
  if (value.trim().length === 0 && required) return [`${fieldName}: cannot be empty`];
  if (value.length > maxLen) return [`${fieldName}: exceeds max length ${maxLen}`];
  return [];
}

/**
 * Validate an ID string: alphanumeric + underscore + hyphen only.
 */
function validateId(value, fieldName, maxLen) {
  const strErrors = validateStringField(value, fieldName, maxLen, true);
  if (strErrors.length > 0) return strErrors;
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
    return [`${fieldName}: must be alphanumeric (a-z, 0-9, _, -)`];
  }
  return [];
}

/**
 * Validate a number field within optional bounds.
 */
function validateNumberField(
  value,
  fieldName,
  { required = false, min, max, integer = false } = {}
) {
  if (value === undefined || value === null) {
    return required ? [`${fieldName}: required`] : [];
  }
  if (typeof value !== 'number' || isNaN(value)) return [`${fieldName}: must be a number`];
  if (integer && !Number.isInteger(value)) return [`${fieldName}: must be an integer`];
  if (min !== undefined && value < min) return [`${fieldName}: must be >= ${min}`];
  if (max !== undefined && value > max) return [`${fieldName}: must be <= ${max}`];
  return [];
}

// ────────────────────────────────────────────────
// SECTION 4: Event Validation
// ────────────────────────────────────────────────

/**
 * Validate a single UGC event against the schema.
 * Returns { valid: boolean, errors: string[], sanitized: object|null }
 *
 * `sanitized` is a deep clone with only allowed fields preserved.
 */
export function validateEvent(raw, index = 0) {
  const prefix = `event[${index}]`;
  const errors = [];

  // ── Step 1: Security scan ──
  const security = scanForDanger(raw, prefix);
  if (!security.safe) {
    return { valid: false, errors: security.violations, sanitized: null };
  }

  // ── Step 2: Required fields ──
  errors.push(...validateId(raw.id, `${prefix}.id`, LIMITS.MAX_ID_CHARS));
  errors.push(...validateStringField(raw.name, `${prefix}.name`, LIMITS.MAX_NAME_CHARS, true));
  errors.push(
    ...validateStringField(
      raw.description,
      `${prefix}.description`,
      LIMITS.MAX_DESCRIPTION_CHARS,
      true
    )
  );

  if (raw.type && !VALID_EVENT_TYPES.has(raw.type)) {
    errors.push(`${prefix}.type: invalid type "${raw.type}"`);
  }
  if (raw.tier && !VALID_TIERS.has(raw.tier)) {
    errors.push(`${prefix}.tier: invalid tier "${raw.tier}"`);
  }

  // ── Step 3: Trigger validation ──
  if (raw.trigger) {
    const t = raw.trigger;
    if (t.areas && Array.isArray(t.areas)) {
      for (const area of t.areas) {
        if (typeof area !== 'string') {
          errors.push(`${prefix}.trigger.areas: each area must be a string`);
        }
        // Allow custom area IDs (for future UGC areas), but warn
      }
    }
    errors.push(
      ...validateNumberField(t.min_loop, `${prefix}.trigger.min_loop`, {
        min: 0,
        max: 99,
        integer: true,
      })
    );
    errors.push(
      ...validateNumberField(t.max_loop, `${prefix}.trigger.max_loop`, {
        min: 0,
        max: 99,
        integer: true,
      })
    );
    errors.push(
      ...validateNumberField(t.probability, `${prefix}.trigger.probability`, { min: 0, max: 1 })
    );
    errors.push(
      ...validateNumberField(t.san_lte, `${prefix}.trigger.san_lte`, { min: 0, max: 99 })
    );
    errors.push(
      ...validateNumberField(t.san_gte, `${prefix}.trigger.san_gte`, { min: 0, max: 99 })
    );
    errors.push(
      ...validateNumberField(t.humanity_min, `${prefix}.trigger.humanity_min`, { min: 0, max: 100 })
    );
    errors.push(
      ...validateNumberField(t.humanity_max, `${prefix}.trigger.humanity_max`, { min: 0, max: 100 })
    );
    errors.push(
      ...validateNumberField(t.cooldown_days, `${prefix}.trigger.cooldown_days`, {
        min: 0,
        max: 99,
        integer: true,
      })
    );
    errors.push(
      ...validateNumberField(t.max_per_day_category, `${prefix}.trigger.max_per_day_category`, {
        min: 1,
        max: 10,
        integer: true,
      })
    );
    if (t.time_phase && Array.isArray(t.time_phase)) {
      for (const tp of t.time_phase) {
        if (!VALID_TIME_PHASES.has(tp)) {
          errors.push(`${prefix}.trigger.time_phase: invalid phase "${tp}"`);
        }
      }
    }
  }

  // ── Step 4: Effects whitelist ──
  errors.push(
    ...validateEffectsKeys(raw.effects, EFFECTS_KEYS_WHITELIST, `${prefix}.effects`).errors
  );

  // Validate add_clue structure
  if (raw.effects?.add_clue) {
    const ac = raw.effects.add_clue;
    if (typeof ac === 'object') {
      errors.push(...validateId(ac.id, `${prefix}.effects.add_clue.id`, LIMITS.MAX_ID_CHARS));
      errors.push(
        ...validateStringField(
          ac.name,
          `${prefix}.effects.add_clue.name`,
          LIMITS.MAX_CLUE_NAME_CHARS,
          true
        )
      );
    } else if (typeof ac !== 'string') {
      errors.push(`${prefix}.effects.add_clue: must be string or {id, name} object`);
    }
  }

  // Validate add_item structure
  if (raw.effects?.add_item) {
    const ai = raw.effects.add_item;
    if (typeof ai === 'object') {
      errors.push(...validateId(ai.id, `${prefix}.effects.add_item.id`, LIMITS.MAX_ID_CHARS));
    } else if (typeof ai !== 'string') {
      errors.push(`${prefix}.effects.add_item: must be string or {id, ...} object`);
    }
  }

  // ── Step 5: Choices validation ──
  if (raw.choices) {
    if (!Array.isArray(raw.choices)) {
      errors.push(`${prefix}.choices: must be an array`);
    } else {
      if (raw.choices.length > LIMITS.MAX_CHOICES_PER_EVENT) {
        errors.push(`${prefix}.choices: exceeds max ${LIMITS.MAX_CHOICES_PER_EVENT}`);
      }
      for (let ci = 0; ci < raw.choices.length; ci++) {
        const c = raw.choices[ci];
        const cp = `${prefix}.choices[${ci}]`;
        if (!c || typeof c !== 'object') {
          errors.push(`${cp}: must be an object`);
          continue;
        }
        errors.push(...validateId(c.id, `${cp}.id`, LIMITS.MAX_ID_CHARS));
        errors.push(...validateStringField(c.label, `${cp}.label`, LIMITS.MAX_LABEL_CHARS, true));
        if (c.text)
          errors.push(...validateStringField(c.text, `${cp}.text`, LIMITS.MAX_TEXT_CHARS, false));
        // Choice effects whitelist
        errors.push(
          ...validateEffectsKeys(c.effects, CHOICE_EFFECTS_KEYS_WHITELIST, `${cp}.effects`).errors
        );
        // Security scan on choice
        const cs = scanForDanger(c, cp);
        if (!cs.safe) errors.push(...cs.violations);
      }
    }
  }

  // ── Step 6: Tags validation ──
  if (raw.tags && !Array.isArray(raw.tags)) {
    errors.push(`${prefix}.tags: must be an array`);
  }
  if (raw.tags && Array.isArray(raw.tags)) {
    if (raw.tags.length > 20) errors.push(`${prefix}.tags: max 20 tags`);
    for (const tag of raw.tags) {
      if (typeof tag !== 'string') errors.push(`${prefix}.tags: each tag must be a string`);
    }
  }

  // ── Step 7: Difficulty modifiers validation (Feature 4) ──
  if (raw.difficulty_modifiers && typeof raw.difficulty_modifiers === 'object') {
    const dm = raw.difficulty_modifiers;
    // Validate min_difficulty / max_difficulty range
    if (typeof dm.min_difficulty === 'number') {
      if (dm.min_difficulty < 1 || dm.min_difficulty > 21) {
        errors.push(`${prefix}.difficulty_modifiers.min_difficulty: must be 1-21`);
      }
    }
    if (typeof dm.max_difficulty === 'number') {
      if (dm.max_difficulty < 1 || dm.max_difficulty > 21) {
        errors.push(`${prefix}.difficulty_modifiers.max_difficulty: must be 1-21`);
      }
    }
    if (dm.min_difficulty && dm.max_difficulty && dm.min_difficulty > dm.max_difficulty) {
      errors.push(`${prefix}.difficulty_modifiers: min_difficulty > max_difficulty`);
    }
    // Validate text_corruption_boost
    if (typeof dm.text_corruption_boost === 'number') {
      if (dm.text_corruption_boost < 0 || dm.text_corruption_boost > 5) {
        errors.push(`${prefix}.difficulty_modifiers.text_corruption_boost: must be 0-5`);
      }
    }
    // Validate npc_trust_multiplier
    if (typeof dm.npc_trust_multiplier === 'number') {
      if (dm.npc_trust_multiplier < 0 || dm.npc_trust_multiplier > 2) {
        errors.push(`${prefix}.difficulty_modifiers.npc_trust_multiplier: must be 0-2`);
      }
    }
    // Validate custom_text_swaps
    if (dm.custom_text_swaps && !Array.isArray(dm.custom_text_swaps)) {
      errors.push(`${prefix}.difficulty_modifiers.custom_text_swaps: must be array`);
    }
    if (dm.custom_text_swaps && Array.isArray(dm.custom_text_swaps)) {
      if (dm.custom_text_swaps.length > 20) {
        errors.push(`${prefix}.difficulty_modifiers.custom_text_swaps: max 20 entries`);
      }
    }
  }

  // ── Step 8: Build sanitized output (only allowed fields) ──
  if (errors.length > 0) {
    return { valid: false, errors, sanitized: null };
  }

  // Feature 4: Sanitize difficulty_modifiers if present
  var sanitizedDifficultyModifiers = null;
  if (raw.difficulty_modifiers && typeof raw.difficulty_modifiers === 'object') {
    const dm = raw.difficulty_modifiers;
    sanitizedDifficultyModifiers = {
      min_difficulty: typeof dm.min_difficulty === 'number' ? dm.min_difficulty : 1,
      max_difficulty: typeof dm.max_difficulty === 'number' ? dm.max_difficulty : 21,
      text_corruption_boost: typeof dm.text_corruption_boost === 'number' ? Math.max(0, Math.min(5, dm.text_corruption_boost)) : 1,
      npc_trust_multiplier: typeof dm.npc_trust_multiplier === 'number' ? Math.max(0, Math.min(2, dm.npc_trust_multiplier)) : 1,
      custom_text_swaps: Array.isArray(dm.custom_text_swaps) ? dm.custom_text_swaps.slice(0, 20) : [],
    };
  }

  const sanitized = {
    id: raw.id,
    name: raw.name,
    type: raw.type || 'ugc',
    subtype: raw.subtype || 'ugc',
    weight: typeof raw.weight === 'number' ? Math.max(0.1, Math.min(10, raw.weight)) : 1,
    tier: raw.tier || 'common',
    tags: Array.isArray(raw.tags) ? raw.tags.slice(0, 20) : [],
    trigger: sanitizeTrigger(raw.trigger),
    description: raw.description,
    effects: sanitizeObject(raw.effects, EFFECTS_KEYS_WHITELIST),
    choices: sanitizeChoices(raw.choices),
    // Marker for rendering layer
    source: 'ugc',
    // Feature 4: Difficulty modifiers for mod hooks
    difficulty_modifiers: sanitizedDifficultyModifiers,
  };

  return { valid: true, errors: [], sanitized };
}

/**
 * Sanitize a trigger object — keep only allowed fields.
 */
function sanitizeTrigger(trigger) {
  if (!trigger || typeof trigger !== 'object') return undefined;
  const out = {};
  if (Array.isArray(trigger.areas)) out.areas = trigger.areas.filter((a) => typeof a === 'string');
  if (Array.isArray(trigger.time_phase))
    out.time_phase = trigger.time_phase.filter((t) => VALID_TIME_PHASES.has(t));
  if (typeof trigger.probability === 'number')
    out.probability = Math.max(0, Math.min(1, trigger.probability));
  if (typeof trigger.min_loop === 'number') out.min_loop = trigger.min_loop;
  if (typeof trigger.max_loop === 'number') out.max_loop = trigger.max_loop;
  if (typeof trigger.san_lte === 'number') out.san_lte = trigger.san_lte;
  if (typeof trigger.san_gte === 'number') out.san_gte = trigger.san_gte;
  if (typeof trigger.humanity_min === 'number') out.humanity_min = trigger.humanity_min;
  if (typeof trigger.humanity_max === 'number') out.humanity_max = trigger.humanity_max;
  if (typeof trigger.min_mythos === 'number') out.min_mythos = trigger.min_mythos;
  if (typeof trigger.cooldown_days === 'number') out.cooldown_days = trigger.cooldown_days;
  if (typeof trigger.once_per_run === 'boolean') out.once_per_run = trigger.once_per_run;
  if (typeof trigger.once_ever === 'boolean') out.once_ever = trigger.once_ever;
  if (Array.isArray(trigger.requires)) out.requires = trigger.requires;
  if (Array.isArray(trigger.forbidden_flags)) out.forbidden_flags = trigger.forbidden_flags;
  if (Array.isArray(trigger.requires_prev_event))
    out.requires_prev_event = trigger.requires_prev_event;
  if (Array.isArray(trigger.requires_clues)) out.requires_clues = trigger.requires_clues;
  if (Array.isArray(trigger.requires_flags)) out.requires_flags = trigger.requires_flags;
  if (typeof trigger.max_per_day_category === 'number')
    out.max_per_day_category = trigger.max_per_day_category;
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Sanitize an effects/choice-effects object against a whitelist.
 */
function sanitizeObject(obj, whitelist) {
  if (!obj || typeof obj !== 'object') return undefined;
  const out = {};
  for (const key of Object.keys(obj)) {
    if (whitelist.has(key)) out[key] = obj[key];
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Sanitize choices array.
 */
function sanitizeChoices(choices) {
  if (!Array.isArray(choices)) return [];
  return choices.slice(0, LIMITS.MAX_CHOICES_PER_EVENT).map((c) => ({
    id: c.id,
    label: c.label,
    text: c.text || '',
    effects: sanitizeObject(c.effects, CHOICE_EFFECTS_KEYS_WHITELIST) || {},
  }));
}

// ────────────────────────────────────────────────
// SECTION 5: Mod Validation
// ────────────────────────────────────────────────

/**
 * Validate a complete UGC mod object.
 * Returns { valid: boolean, errors: string[], warnings: string[], sanitized: object|null }
 */
export function validateMod(raw) {
  const errors = [];
  const warnings = [];
  const validation = {};

  // ── Security scan ──
  const security = scanForDanger(raw, 'mod');
  if (!security.safe) {
    return { valid: false, errors: security.violations, warnings, sanitized: null };
  }

  // ── Required fields ──
  errors.push(...validateId(raw.id, 'mod.id', LIMITS.MAX_ID_CHARS));
  errors.push(...validateStringField(raw.name, 'mod.name', LIMITS.MAX_MOD_NAME_CHARS, true));
  errors.push(...validateStringField(raw.author, 'mod.author', LIMITS.MAX_AUTHOR_CHARS, true));
  errors.push(...validateStringField(raw.version, 'mod.version', LIMITS.MAX_VERSION_CHARS, true));

  // ── Events array ──
  if (!raw.events || !Array.isArray(raw.events)) {
    errors.push('mod.events: must be a non-empty array');
  } else {
    if (raw.events.length === 0) {
      errors.push('mod.events: must contain at least 1 event');
    }
    if (raw.events.length > LIMITS.MAX_EVENTS_PER_MOD) {
      errors.push(`mod.events: exceeds max ${LIMITS.MAX_EVENTS_PER_MOD} events per mod`);
    }

    // Validate each event
    const sanitizedEvents = [];
    const seenIds = new Set();
    for (let i = 0; i < raw.events.length; i++) {
      const result = validateEvent(raw.events[i], i);
      if (!result.valid) {
        errors.push(...result.errors);
      } else {
        // Check intra-mod ID uniqueness
        if (seenIds.has(result.sanitized.id)) {
          errors.push(`event[${i}]: duplicate ID "${result.sanitized.id}" within this mod`);
        } else {
          seenIds.add(result.sanitized.id);
          sanitizedEvents.push(result.sanitized);
        }
      }
    }
  }

  // ── Optional: validate compatibility ──
  // Semver range string, e.g. ">=0.2.3" or "0.2.x"
  if (raw.compatibility && typeof raw.compatibility !== 'string') {
    warnings.push('mod.compatibility: ignored (not a string)');
  }
  if (raw.compatibility && raw.compatibility.length > 32) {
    warnings.push('mod.compatibility: too long (max 32 chars)');
  }

  // ── Optional: validate metadata ──
  if (raw.metadata && typeof raw.metadata !== 'object') {
    warnings.push('mod.metadata: ignored (not an object)');
  }

  // ── NPCs ──
  if (raw.npcs && !Array.isArray(raw.npcs)) {
    errors.push('mod.npcs: must be an array');
  } else if (raw.npcs) {
    if (raw.npcs.length > LIMITS.MAX_NPCS_PER_MOD)
      errors.push('mod.npcs: exceeds max ' + LIMITS.MAX_NPCS_PER_MOD);
    var sn = []; var snIds = {};
    raw.npcs.forEach(function (n, i) {
      var r = validateNpc(n, i);
      if (!r.valid) { errors.push.apply(errors, r.errors); return; }
      if (snIds[r.sanitized.id]) errors.push('npc[' + i + ']: duplicate ID "' + r.sanitized.id + '"');
      else { snIds[r.sanitized.id] = true; sn.push(r.sanitized); }
    });
    validation._sn = sn;
  }

  // ── Items ──
  if (raw.items && !Array.isArray(raw.items)) {
    errors.push('mod.items: must be an array');
  } else if (raw.items) {
    if (raw.items.length > LIMITS.MAX_ITEMS_PER_MOD)
      errors.push('mod.items: exceeds max ' + LIMITS.MAX_ITEMS_PER_MOD);
    var si = []; var siIds = {};
    raw.items.forEach(function (it, i) {
      var r = validateItem(it, i);
      if (!r.valid) { errors.push.apply(errors, r.errors); return; }
      if (siIds[r.sanitized.id]) errors.push('item[' + i + ']: duplicate ID "' + r.sanitized.id + '"');
      else { siIds[r.sanitized.id] = true; si.push(r.sanitized); }
    });
    validation._si = si;
  }

  // ── Areas ──
  if (raw.areas && !Array.isArray(raw.areas)) {
    errors.push('mod.areas: must be an array');
  } else if (raw.areas) {
    if (raw.areas.length > LIMITS.MAX_AREAS_PER_MOD)
      errors.push('mod.areas: exceeds max ' + LIMITS.MAX_AREAS_PER_MOD);
    var sa = []; var saIds = {};
    raw.areas.forEach(function (a, i) {
      var r = validateArea(a, i);
      if (!r.valid) { errors.push.apply(errors, r.errors); return; }
      if (saIds[r.sanitized.id]) errors.push('area[' + i + ']: duplicate ID "' + r.sanitized.id + '"');
      else { saIds[r.sanitized.id] = true; sa.push(r.sanitized); }
    });
    validation._sa = sa;
  }

  // ── Endings ──
  if (raw.endings && !Array.isArray(raw.endings)) {
    errors.push('mod.endings: must be an array');
  } else if (raw.endings) {
    if (raw.endings.length > LIMITS.MAX_ENDINGS_PER_MOD)
      errors.push('mod.endings: exceeds max ' + LIMITS.MAX_ENDINGS_PER_MOD);
    var se = []; var seIds = {};
    raw.endings.forEach(function (e, i) {
      var r = validateEnding(e, i);
      if (!r.valid) { errors.push.apply(errors, r.errors); return; }
      if (seIds[r.sanitized.id]) errors.push('ending[' + i + ']: duplicate ID "' + r.sanitized.id + '"');
      else { seIds[r.sanitized.id] = true; se.push(r.sanitized); }
    });
    validation._se = se;
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings, sanitized: null };
  }

  // ── Build sanitized mod ──
  const sanitizedEvents = [];
  const seenIds = new Set();
  for (const evt of raw.events) {
    const result = validateEvent(evt);
    if (result.valid && !seenIds.has(result.sanitized.id)) {
      seenIds.add(result.sanitized.id);
      sanitizedEvents.push(result.sanitized);
    }
  }

  const sanitized = {
    id: raw.id,
    name: raw.name,
    author: raw.author,
    version: raw.version,
    compatibility: raw.compatibility || null,
    events: sanitizedEvents,
    npcs: validation._sn || [],
    items: validation._si || [],
    areas: validation._sa || [],
    endings: validation._se || [],
    metadata: raw.metadata && typeof raw.metadata === 'object' ? raw.metadata : {},
    createdAt: raw.createdAt || new Date().toISOString(),
    enabled: true,
  };

  return { valid: true, errors: [], warnings, sanitized };
}

/**
 * Check for ID conflicts between a mod's events and existing events.
 * Returns array of conflicting IDs.
 */
export function findIdConflicts(modEvents, existingEvents) {
  const existingIds = new Set(existingEvents.map((e) => e.id));
  return modEvents.filter((e) => existingIds.has(e.id)).map((e) => e.id);
}

/**
 * Prefix all event IDs in a mod to avoid conflicts.
 * Mutates the events array in place and returns it.
 */
export function prefixEventIds(events, modId) {
  for (const evt of events) {
    if (!evt.id.startsWith(modId + '__')) {
      evt.id = modId + '__' + evt.id;
    }
  }
  return events;
}

// ── Extended Entity Validators (NPC / Item / Area / Ending) ──

/**
 * Validate a single mod NPC definition.
 */
export function validateNpc(raw, index) {
  var p = 'npc[' + index + ']';
  var errs = [];
  var sec = scanForDanger(raw, p);
  if (!sec.safe) return { valid: false, errors: sec.violations, sanitized: null };
  errs.push(...validateId(raw.id, p + '.id', LIMITS.MAX_ID_CHARS));
  errs.push(...validateStringField(raw.name, p + '.name', LIMITS.MAX_NAME_CHARS, true));
  errs.push(...validateStringField(raw.location, p + '.location', 40, true));
  if (raw.portrait_hint && typeof raw.portrait_hint !== 'string')
    errs.push(p + '.portrait_hint: must be string');
  if (raw.trust_layers && !Array.isArray(raw.trust_layers))
    errs.push(p + '.trust_layers: must be array');
  if (errs.length) return { valid: false, errors: errs, sanitized: null };
  return {
    valid: true, errors: [],
    sanitized: {
      id: raw.id, name: raw.name, location: raw.location,
      trust_layers: raw.trust_layers || ['standard'],
      portrait_hint: raw.portrait_hint || '',
      aliases: raw.aliases || [],
      personality: raw.personality || '',
      background: raw.background || '',
      _ugcModId: raw._ugcModId,
    },
  };
}

/**
 * Validate a single mod item definition.
 */
export function validateItem(raw, index) {
  var p = 'item[' + index + ']';
  var errs = [];
  var sec = scanForDanger(raw, p);
  if (!sec.safe) return { valid: false, errors: sec.violations, sanitized: null };
  errs.push(...validateId(raw.id, p + '.id', LIMITS.MAX_ID_CHARS));
  errs.push(...validateStringField(raw.name, p + '.name', LIMITS.MAX_NAME_CHARS, true));
  if (!ITEM_TYPES.has(raw.type)) errs.push(p + '.type: invalid "' + raw.type + '"');
  errs.push(...validateNumberField(raw.uses, p + '.uses', { min: -1, integer: true }));
  if (raw.effects && !Array.isArray(raw.effects)) errs.push(p + '.effects: must be array');
  if (errs.length) return { valid: false, errors: errs, sanitized: null };
  return {
    valid: true, errors: [],
    sanitized: {
      id: raw.id, name: raw.name, type: raw.type || 'tool',
      uses: typeof raw.uses === 'number' ? raw.uses : 1,
      consume_on_use: !!raw.consume_on_use,
      effects: raw.effects || [],
      use_hint: raw.use_hint || '', use_text: raw.use_text || '',
      description: raw.description || '',
      _ugcModId: raw._ugcModId,
    },
  };
}

/**
 * Validate a single mod area definition.
 */
export function validateArea(raw, index) {
  var p = 'area[' + index + ']';
  var errs = [];
  var sec = scanForDanger(raw, p);
  if (!sec.safe) return { valid: false, errors: sec.violations, sanitized: null };
  errs.push(...validateId(raw.id, p + '.id', LIMITS.MAX_ID_CHARS));
  errs.push(...validateStringField(raw.name, p + '.name', LIMITS.MAX_NAME_CHARS, true));
  errs.push(...validateStringField(raw.description, p + '.description', 500, true));
  if (raw.connected_areas && !Array.isArray(raw.connected_areas))
    errs.push(p + '.connected_areas: must be array');
  if (raw.type && !AREA_TYPES.has(raw.type))
    errs.push(p + '.type: invalid "' + raw.type + '"');
  if (errs.length) return { valid: false, errors: errs, sanitized: null };
  return {
    valid: true, errors: [],
    sanitized: {
      id: raw.id, name: raw.name, description: raw.description,
      type: raw.type || 'town', connected_areas: raw.connected_areas || [],
      danger_level: raw.danger_level || 1,
      chapter_unlock: raw.chapter_unlock || 'chapter_1',
      hidden_features: raw.hidden_features || [],
      layout_variants: raw.layout_variants || [],
      resource_pressure: raw.resource_pressure || {},
      events: raw.events || [],
      _ugcModId: raw._ugcModId,
    },
  };
}

/**
 * Validate a single mod ending definition.
 */
export function validateEnding(raw, index) {
  var p = 'ending[' + index + ']';
  var errs = [];
  var sec = scanForDanger(raw, p);
  if (!sec.safe) return { valid: false, errors: sec.violations, sanitized: null };
  errs.push(...validateId(raw.id, p + '.id', LIMITS.MAX_ID_CHARS));
  errs.push(...validateStringField(raw.name, p + '.name', LIMITS.MAX_NAME_CHARS, true));
  if (raw.conditions && !Array.isArray(raw.conditions))
    errs.push(p + '.conditions: must be array');
  if (raw.conditions) {
    raw.conditions.forEach(function (c, i) {
      if (!c || typeof c !== 'object') { errs.push(p + '.conditions[' + i + ']: must be object'); return; }
      if (c.type && !VALID_ENDING_COND_TYPES.has(c.type))
        errs.push(p + '.conditions[' + i + '].type: invalid "' + c.type + '"');
    });
  }
  if (raw.humanity_variants) {
    ['humanity_high', 'humanity_fragile', 'humanity_lost'].forEach(function (k) {
      if (typeof raw.humanity_variants[k] !== 'string')
        errs.push(p + '.humanity_variants.' + k + ': required string');
    });
  }
  if (errs.length) return { valid: false, errors: errs, sanitized: null };
  return {
    valid: true, errors: [],
    sanitized: {
      id: raw.id, name: raw.name,
      world_outcome: raw.world_outcome || 'custom_ending',
      cost_bearer: raw.cost_bearer || 'player',
      conditions: raw.conditions || [],
      blocking_conds: raw.blocking_conds || [],
      npc_requirements: raw.npc_requirements || {},
      resource_requirements: raw.resource_requirements || {},
      humanity_variants: raw.humanity_variants || {},
      description: raw.description || '',
      priority: raw.priority || 500,
      _ugcModId: raw._ugcModId,
    },
  };
}

// ── Conflict Detection & Prefix Helpers (NPC / Item / Area / Ending) ──

export function findNpcConflicts(modNpcs, existing) {
  var ids = {};
  existing.forEach(function (n) { ids[n.id] = true; });
  return modNpcs.filter(function (n) { return ids[n.id]; }).map(function (n) { return n.id; });
}
export function prefixNpcIds(npcs, modId) {
  npcs.forEach(function (n) { if (!n.id.startsWith(modId + '__')) n.id = modId + '__' + n.id; });
}
export function findItemConflicts(modItems, existing) {
  var ids = {};
  existing.forEach(function (i) { ids[i.id] = true; });
  return modItems.filter(function (i) { return ids[i.id]; }).map(function (i) { return i.id; });
}
export function prefixItemIds(items, modId) {
  items.forEach(function (i) { if (!i.id.startsWith(modId + '__')) i.id = modId + '__' + i.id; });
}
export function findAreaConflicts(modAreas, existing) {
  var ids = {};
  existing.forEach(function (a) { ids[a.id] = true; });
  return modAreas.filter(function (a) { return ids[a.id]; }).map(function (a) { return a.id; });
}
export function prefixAreaIds(areas, modId) {
  areas.forEach(function (a) { if (!a.id.startsWith(modId + '__')) a.id = modId + '__' + a.id; });
}
export function findEndingConflicts(modEndings, existing) {
  var ids = {};
  existing.forEach(function (e) { ids[e.id] = true; });
  return modEndings.filter(function (e) { return ids[e.id]; }).map(function (e) { return e.id; });
}
export function prefixEndingIds(endings, modId) {
  endings.forEach(function (e) { if (!e.id.startsWith(modId + '__')) e.id = modId + '__' + e.id; });
}

/**
 * Validate a raw JSON string and return the parsed + validated mod.
 * Convenience wrapper for import flow.
 */
export function parseAndValidateMod(jsonString) {
  let raw;
  try {
    raw = JSON.parse(jsonString);
  } catch (e) {
    return { valid: false, errors: ['Invalid JSON: ' + e.message], warnings: [], sanitized: null };
  }
  return validateMod(raw);
}

// Re-export constants for use by other modules
