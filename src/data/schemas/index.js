// src/data/schemas/index.js — Zod schemas for all game data
// Validates game_base.json, extended events, and Content Editor output.
//
// Usage:
//   import { validateEvent, validateAllEvents, EventSchema } from './schemas/index.js';
//   const result = validateEvent(myEvent);
//   if (!result.success) console.error(result.error.issues);
//
// Design: schemas mirror the ACTUAL data shapes in game_base.json.
// When a field is optional in the data, it's optional in the schema.

import { z } from 'zod';

// ────────────────────────────────────────────
// Primitives
// ────────────────────────────────────────────

export const IdSchema = z.string().min(1);

// ────────────────────────────────────────────
// Event Schema
// ────────────────────────────────────────────

export const EventTriggerSchema = z.object({
  areas: z.array(z.string()).optional(),
  time_phase: z.array(z.string()).optional(),
  probability: z.number().min(0).max(1).optional(),
  chapter: z.number().int().min(1).max(5).optional(),
  requires: z.array(z.string()).optional(),
  forbidden_flags: z.array(z.string()).optional(),
  min_loop: z.number().int().min(0).optional(),
  max_loop: z.number().int().min(0).optional(),
  humanity_min: z.number().min(0).max(100).optional(),
  humanity_max: z.number().min(0).max(100).optional(),
  min_mythos: z.number().min(0).optional(),
  san_lte: z.number().min(0).optional(),
  san_gte: z.number().min(0).optional(),
  food_lte: z.number().min(0).optional(),
  light_lte: z.number().min(0).optional(),
  safehouse_corruption_gte: z.number().min(0).max(100).optional(),
  once_per_run: z.boolean().optional(),
  once_ever: z.boolean().optional(),
  cooldown_days: z.number().int().min(0).optional(),
  max_per_day_category: z.string().optional(),
}).passthrough();

export const EventEffectsSchema = z.object({
  san: z.number().optional(),
  HP: z.number().optional(),
  food: z.number().optional(),
  money: z.number().optional(),
  add_clue: z.union([z.string(), z.object({ id: z.string(), name: z.string() })]).optional(),
  add_item: z.object({ item_id: z.string(), name: z.string().optional(), uses: z.number().optional() }).optional(),
  add_flag: z.string().optional(),
  npc_changes: z.array(z.union([
    z.object({ name: z.string(), trust: z.number().optional(), state: z.string().optional() }),
    z.string(), // simple format: just NPC name
  ])).optional(),
  skill_check: z.object({
    skill: z.string(),
    difficulty: z.number().int().min(1).max(20),
    success: z.object({ text: z.string().optional(), effects: z.any().optional() }).optional(),
    failure: z.object({ text: z.string().optional(), effects: z.any().optional() }).optional(),
  }).optional(),
  modify_event_weight: z.any().optional(),
  _meta_effect: z.any().optional(),
}).passthrough();

export const EventChoiceSchema = z.object({
  id: z.string().optional(), // some extended events use index-based choices
  label: z.string(),
  text: z.string().optional(),
  cost: z.number().int().min(0).optional(),
  effects: z.any().optional(),
  requires: z.array(z.string()).optional(),
  fear: z.record(z.string(), z.number()).optional(),
  isFinal: z.boolean().optional(),
}).passthrough();

export const EventSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  type: z.string().optional(),
  event_classification: z.string().optional(),
  chapter: z.number().int().min(1).max(5).optional(),
  trigger: EventTriggerSchema.optional(),
  description: z.string().min(1),
  effects: EventEffectsSchema.optional(),
  sanity_damage: z.number().optional(), // negative = SAN loss, positive = SAN gain
  unreliable_narration_level: z.number().int().min(0).max(5).optional(),
  distortion_trigger: z.number().nullable().optional(),
  distortion_text: z.string().nullable().optional(),
  distortion_variants: z.record(z.string(), z.string()).optional(),
  false_memory: z.string().nullable().optional(),
  skill_check: z.any().optional(),
  choices: z.array(EventChoiceSchema).optional(),
  chapter_1_eligible: z.boolean().optional(),
  normalcy_anchor: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  weight: z.number().min(0).optional(),
}).passthrough();

// ────────────────────────────────────────────
// NPC Schema
// ────────────────────────────────────────────

export const NpcTrustLayerSchema = z.object({
  level: z.number().int().min(0).max(5),
  dialogue: z.string(),
  unlocks: z.array(z.string()).optional(),
  hint: z.string().optional(),
});

export const NpcSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  role: z.string(),
  location: z.string(),
  schedule: z.array(z.string()).optional(),
  personality: z.string().optional(),
  background: z.string().optional(),
  possible_interactions: z.array(z.string()).optional(),
  sanity_impact: z.number().optional(),
  trust_threshold: z.number().int().min(0).max(5).optional(),
  trust_layers: z.array(NpcTrustLayerSchema).optional(),
  secrets: z.array(z.string()).optional(),
  trust_profile: z.record(z.string(), z.any()).optional(),
  chapter_1_availability: z.string().optional(),
  san_recovery_effect: z.union([z.number(), z.record(z.string(), z.any())]).optional(),
}).passthrough();

// ────────────────────────────────────────────
// Area Schema
// ────────────────────────────────────────────

export const ResourcePressureSchema = z.object({
  food: z.string().optional(),
  light: z.string().optional(),
  fatigue: z.string().optional(),
  infection: z.string().optional(),
  safe_rest_available: z.boolean().optional(),
  required_light_level: z.number().int().min(0).max(3).optional(),
}).passthrough();

export const AreaSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  type: z.string().optional(),
  description: z.string().min(1),
  danger_level: z.number().int().min(0).max(10).optional(),
  chapter_unlock: z.union([z.number(), z.string()]).optional(), // "chapter_1" or 1
  mythos_visibility_level: z.number().int().min(0).max(5).optional(),
  connected_areas: z.array(z.string()).optional(),
  narrative_function: z.string().optional(),
  gameplay_function: z.string().optional(),
  main_clue_chain: z.string().optional(),
  early_game_alias: z.string().optional(),
  hidden_features: z.array(z.string()).optional(),
  layout_variants: z.array(z.any()).optional(),
  item_placement_pool: z.union([z.array(z.any()), z.record(z.string(), z.any())]).optional(),
  micro_events: z.array(z.any()).optional(),
  events_pool: z.array(z.string()).optional(),
  resource_pressure: ResourcePressureSchema.optional(),
  imagery_focus: z.union([z.string(), z.record(z.string(), z.any())]).optional(),
  chapter_1_role: z.string().optional(),
}).passthrough();

// ────────────────────────────────────────────
// Item Schema
// ────────────────────────────────────────────

export const ItemSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  type: z.string().optional(),
  uses: z.number().int().min(-1).optional(), // -1 = unlimited
  consume_on_use: z.boolean().optional(),
  use_hint: z.string().optional(),
  use_text: z.string().optional(),
  effects: z.any().optional(),
}).passthrough();

// ────────────────────────────────────────────
// Validator functions
// ────────────────────────────────────────────

/**
 * Validate a single event object.
 * @param {object} event
 * @returns {{ success: true, data: object } | { success: false, error: ZodError }}
 */
export function validateEvent(event) {
  return EventSchema.safeParse(event);
}

/**
 * Validate a single NPC object.
 */
export function validateNpc(npc) {
  return NpcSchema.safeParse(npc);
}

/**
 * Validate a single area object.
 */
export function validateArea(area) {
  return AreaSchema.safeParse(area);
}

/**
 * Validate a single item object.
 */
export function validateItem(item) {
  return ItemSchema.safeParse(item);
}

/**
 * Validate all events in a dataset and return summary.
 * @param {object[]} events
 * @returns {{ valid: number, invalid: number, errors: Array<{id, issues}> }}
 */
export function validateAllEvents(events) {
  var valid = 0, invalid = 0, errors = [];
  for (var i = 0; i < events.length; i++) {
    var r = EventSchema.safeParse(events[i]);
    if (r.success) valid++;
    else {
      invalid++;
      errors.push({ id: events[i]?.id || '(unknown)', issues: r.error.issues });
    }
  }
  return { valid: valid, invalid: invalid, errors: errors };
}

/**
 * Validate a complete game data object (game_base.json).
 * @param {object} data - parsed JSON
 * @returns {{ events, npcs, areas, items } — each with valid/invalid/errors}
 */
export function validateGameData(data) {
  return {
    events: data.events ? validateAllEvents(data.events) : { valid: 0, invalid: 0, errors: [] },
    npcs: data.npcs ? _validateArray(data.npcs, NpcSchema, 'npcs') : { valid: 0, invalid: 0, errors: [] },
    areas: data.areas ? _validateArray(data.areas, AreaSchema, 'areas') : { valid: 0, invalid: 0, errors: [] },
    items: data.items ? _validateArray(data.items, ItemSchema, 'items') : { valid: 0, invalid: 0, errors: [] },
  };
}

function _validateArray(arr, schema, label) {
  var valid = 0, invalid = 0, errors = [];
  for (var i = 0; i < arr.length; i++) {
    var r = schema.safeParse(arr[i]);
    if (r.success) valid++;
    else {
      invalid++;
      errors.push({ id: arr[i]?.id || '(unknown)', label: label, issues: r.error.issues });
    }
  }
  return { valid: valid, invalid: invalid, errors: errors };
}
