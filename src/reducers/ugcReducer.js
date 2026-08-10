// src/reducers/ugcReducer.js — UGC Mod Storage Layer
// CRUD operations on localStorage for UGC mods.
// All mutations are synchronous (localStorage is sync).
//
// Storage key: ugc_modules
// Schema: { version: string, mods: ModObject[] }

import { validateMod, findIdConflicts, prefixEventIds, LIMITS } from '../data/ugcSchema.js';

export const STORAGE_KEY = 'ugc_modules';
export const STORAGE_VERSION = '1.0.0';

// ────────────────────────────────────────────────
// SECTION 1: Low-level storage
// ────────────────────────────────────────────────

export function readStore() {
  if (typeof localStorage === 'undefined') {
    return { version: STORAGE_VERSION, mods: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: STORAGE_VERSION, mods: [] };
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.mods)) return { version: STORAGE_VERSION, mods: [] };
    return data;
  } catch (e) {
    console.error('[UGCR] Failed to read store:', e);
    return { version: STORAGE_VERSION, mods: [] };
  }
}

export function writeStore(store) {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch (e) {
    console.error('[UGCR] Failed to write store:', e);
    return false;
  }
}

// ────────────────────────────────────────────────
// SECTION 2: CRUD Operations
// ────────────────────────────────────────────────

/**
 * Get all installed mods (raw objects with enabled flag).
 * @returns {object[]}
 */
export function getAllMods() {
  return readStore().mods;
}

/**
 * Get only enabled mods.
 * @returns {object[]}
 */
export function getEnabledMods() {
  return readStore().mods.filter((m) => m.enabled !== false);
}

/**
 * Get a single mod by ID.
 * @param {string} modId
 * @returns {object|null}
 */
export function getMod(modId) {
  return readStore().mods.find((m) => m.id === modId) || null;
}

/**
 * Install a new mod. Validates, checks ID conflicts, prefixes if needed.
 * Returns { success: boolean, mod?: object, errors?: string[], warnings?: string[] }
 */
export function installMod(rawMod) {
  // Step 1: Validate
  const validation = validateMod(rawMod);
  if (!validation.valid) {
    return { success: false, errors: validation.errors, warnings: validation.warnings };
  }

  const store = readStore();

  // Step 2: Check mod-level ID conflict
  if (store.mods.some((m) => m.id === validation.sanitized.id)) {
    return {
      success: false,
      errors: [
        `Mod ID "${validation.sanitized.id}" is already installed. Uninstall it first, or change the mod ID.`,
      ],
      warnings: validation.warnings,
    };
  }

  // Step 3: Check total mod count
  if (store.mods.length >= LIMITS.MAX_MODS_TOTAL) {
    return {
      success: false,
      errors: [`Maximum of ${LIMITS.MAX_MODS_TOTAL} mods reached. Uninstall one first.`],
      warnings: validation.warnings,
    };
  }

  // Step 4: Auto-prefix event IDs to avoid conflicts with base game
  const allBaseEvents = getAllInstalledEventIds(store);
  const conflicts = findIdConflicts(
    validation.sanitized.events,
    [...allBaseEvents].map((id) => ({ id }))
  );
  if (conflicts.length > 0) {
    // Auto-prefix rather than reject
    prefixEventIds(validation.sanitized.events, validation.sanitized.id);
    validation.warnings.push(
      `Auto-prefixed ${conflicts.length} event ID(s) to avoid conflicts: ${conflicts.slice(0, 5).join(', ')}${conflicts.length > 5 ? '...' : ''}`
    );
  }

  // Step 5: Install
  store.mods.push(validation.sanitized);
  writeStore(store);

  return { success: true, mod: validation.sanitized, errors: [], warnings: validation.warnings };
}

/**
 * Uninstall a mod by ID.
 * @param {string} modId
 * @returns {boolean}
 */
export function uninstallMod(modId) {
  const store = readStore();
  const idx = store.mods.findIndex((m) => m.id === modId);
  if (idx < 0) return false;
  store.mods.splice(idx, 1);
  writeStore(store);
  return true;
}

/**
 * Enable or disable a mod.
 * @param {string} modId
 * @param {boolean} enabled
 * @returns {boolean}
 */
export function setModEnabled(modId, enabled) {
  const store = readStore();
  const mod = store.mods.find((m) => m.id === modId);
  if (!mod) return false;
  mod.enabled = !!enabled;
  writeStore(store);
  return true;
}

/**
 * Toggle a mod's enabled state.
 * @param {string} modId
 * @returns {boolean} new enabled state
 */
export function toggleMod(modId) {
  const store = readStore();
  const mod = store.mods.find((m) => m.id === modId);
  if (!mod) return false;
  mod.enabled = !mod.enabled;
  writeStore(store);
  return mod.enabled;
}

/**
 * Update an existing mod (re-validate, replace).
 * @param {string} modId - ID of existing mod to replace
 * @param {object} rawMod - new raw mod data
 * @returns {{ success: boolean, errors?: string[], warnings?: string[] }}
 */
export function updateMod(modId, rawMod) {
  const store = readStore();
  const idx = store.mods.findIndex((m) => m.id === modId);
  if (idx < 0) return { success: false, errors: [`Mod "${modId}" not found`] };

  const validation = validateMod(rawMod);
  if (!validation.valid) {
    return { success: false, errors: validation.errors, warnings: validation.warnings };
  }

  // Preserve the original ID and enabled state
  validation.sanitized.id = modId;
  validation.sanitized.enabled = store.mods[idx].enabled;

  // Prefix event IDs if needed
  const otherModEvents = store.mods.filter((_, i) => i !== idx).flatMap((m) => m.events || []);
  const conflicts = findIdConflicts(validation.sanitized.events, otherModEvents);
  if (conflicts.length > 0) {
    prefixEventIds(validation.sanitized.events, modId);
    validation.warnings.push(`Auto-prefixed ${conflicts.length} event ID(s)`);
  }

  store.mods[idx] = validation.sanitized;
  writeStore(store);
  return { success: true, errors: [], warnings: validation.warnings };
}

/**
 * Export a mod as a JSON string (for sharing).
 * @param {string} modId
 * @returns {string|null} JSON string
 */
export function exportMod(modId) {
  const mod = getMod(modId);
  if (!mod) return null;
  // Strip runtime fields before export
  const exportData = {
    id: mod.id,
    name: mod.name,
    author: mod.author || '',
    version: mod.version || '1.0.0',
    events: mod.events || [],
    npcs: mod.npcs || [],
    items: mod.items || [],
    areas: mod.areas || [],
    endings: mod.endings || [],
    metadata: mod.metadata || {},
    createdAt: mod.createdAt,
  };
  return JSON.stringify(exportData, null, 2);
}

/**
 * Import a mod from a JSON string.
 * @param {string} jsonString
 * @returns {{ success: boolean, mod?: object, errors?: string[], warnings?: string[] }}
 */
export function importModFromJson(jsonString) {
  let raw;
  try {
    raw = JSON.parse(jsonString);
  } catch (e) {
    return { success: false, errors: ['Invalid JSON: ' + e.message] };
  }
  return installMod(raw);
}

/**
 * Get summary stats for UI display.
 */
export function getModStats() {
  const mods = getAllMods();
  const enabled = mods.filter((m) => m.enabled !== false);
  const totalEvents = enabled.reduce((sum, m) => sum + (m.events?.length || 0), 0);
  const totalNpcs = enabled.reduce((sum, m) => sum + (m.npcs?.length || 0), 0);
  const totalItems = enabled.reduce((sum, m) => sum + (m.items?.length || 0), 0);
  const totalAreas = enabled.reduce((sum, m) => sum + (m.areas?.length || 0), 0);
  const totalEndings = enabled.reduce((sum, m) => sum + (m.endings?.length || 0), 0);
  return {
    totalMods: mods.length,
    enabledMods: enabled.length,
    disabledMods: mods.length - enabled.length,
    totalUgcEvents: totalEvents,
    totalUgcNpcs: totalNpcs,
    totalUgcItems: totalItems,
    totalUgcAreas: totalAreas,
    totalUgcEndings: totalEndings,
  };
}

// ────────────────────────────────────────────────
// SECTION 3: Internal helpers
// ────────────────────────────────────────────────

/**
 * Collect all event IDs from all installed mods (for conflict detection).
 */
export function getAllInstalledEventIds(store) {
  const ids = new Set();
  for (const mod of store.mods) {
    for (const evt of mod.events || []) {
      ids.add(evt.id);
    }
  }
  return ids;
}

// ────────────────────────────────────────────────
// SECTION 4: Difficulty Mod Hooks (Feature 4)
// ────────────────────────────────────────────────

/**
 * Get difficulty modifiers from all enabled mods for a given difficulty level.
 * Merges modifiers from all enabled mods that have difficulty_modifiers defined.
 * @param {number} difficultyLevel - current game difficulty (1-21)
 * @returns {{ textCorruptionBoost: number, npcTrustMultiplier: number, customSwaps: string[][] }}
 */
export function getModDifficultyModifiers(difficultyLevel) {
  const mods = getEnabledMods();
  var totalCorruptionBoost = 1.0;
  var totalNpcTrustMult = 1.0;
  var allSwaps = [];

  for (const mod of mods) {
    const dm = mod.difficulty_modifiers;
    if (!dm) continue;
    // Check if this mod's difficulty range includes current level
    if (difficultyLevel < (dm.min_difficulty || 1)) continue;
    if (difficultyLevel > (dm.max_difficulty || 21)) continue;
    // Apply modifiers (multiplicative for boost, additive for others)
    if (typeof dm.text_corruption_boost === 'number') {
      totalCorruptionBoost *= dm.text_corruption_boost;
    }
    if (typeof dm.npc_trust_multiplier === 'number') {
      totalNpcTrustMult *= dm.npc_trust_multiplier;
    }
    if (Array.isArray(dm.custom_text_swaps)) {
      allSwaps.push(...dm.custom_text_swaps);
    }
  }

  return {
    textCorruptionBoost: Math.min(5, totalCorruptionBoost),
    npcTrustMultiplier: Math.max(0, Math.min(2, totalNpcTrustMult)),
    customSwaps: allSwaps.slice(0, 50), // Cap at 50 swap pairs
  };
}

/**
 * Check if any enabled mod provides difficulty hooks for the given level.
 * @param {number} difficultyLevel
 * @returns {boolean}
 */
export function hasModDifficultyHooks(difficultyLevel) {
  const mods = getEnabledMods();
  for (const mod of mods) {
    const dm = mod.difficulty_modifiers;
    if (!dm) continue;
    if (difficultyLevel >= (dm.min_difficulty || 1) && difficultyLevel <= (dm.max_difficulty || 21)) {
      return true;
    }
  }
  return false;
}

// Re-export for convenience
