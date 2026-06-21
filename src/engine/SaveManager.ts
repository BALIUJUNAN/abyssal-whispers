// src/engine/SaveManager.ts — Multi-slot save system (TypeScript)
// ENGINE CONTRACT: Zero game-specific imports. Migration injected via configureSaveManager().

// ── Types ──

/** Save slot data as stored in localStorage */
export interface SaveData {
  version: number;
  timestamp: number;
  slotId: string;
  meta: {
    day: number;
    area: string;
    loopCount: number;
    san: number;
    hp: number;
  };
  state: unknown;
  incompatible?: boolean;
}

/** Slot metadata (lightweight, no full state) */
export interface SlotMeta {
  slotId: string;
  exists: boolean;
  timestamp?: number;
  meta?: {
    day: number;
    area: string;
    loopCount: number;
    san: number;
    hp: number;
  };
  version?: number;
}

/** Dependency injection config for save migration */
export interface SaveManagerDeps {
  SAVE_VERSION?: number;
  migrateSaveData?: (data: SaveData, slotId: string) => SaveData | null;
  toPersistedState?: (state: unknown) => unknown;
}

/** Partial game state (only fields used for meta) */
export interface GameStateMeta {
  day?: number;
  currentArea?: string;
  loopCount?: number;
  san?: number;
  hp?: number;
  [key: string]: unknown;
}

// ── Constants ──

export const SAVE_PREFIX = 'coc_save_';
export const AUTO_SLOTS = ['auto_1', 'auto_2', 'auto_3'];
export const MANUAL_SLOTS = ['manual_1', 'manual_2', 'manual_3'];

// ── Dependency Injection ──

let _SAVE_VERSION = 1;
let _migrateSaveData: ((data: SaveData, slotId: string) => SaveData | null) | null = null;
let _toPersistedState: ((state: unknown) => unknown) | null = null;

/**
 * Inject save migration dependencies. Call once at app startup.
 */
export function configureSaveManager(deps: SaveManagerDeps): void {
  if (deps.SAVE_VERSION != null) _SAVE_VERSION = deps.SAVE_VERSION;
  if (deps.migrateSaveData) _migrateSaveData = deps.migrateSaveData;
  if (deps.toPersistedState) _toPersistedState = deps.toPersistedState;
}

// ── Internal helpers ──

function _getKey(slotId: string): string {
  return SAVE_PREFIX + slotId;
}

function _readSlot(slotId: string): SaveData | null {
  try {
    const raw = localStorage.getItem(_getKey(slotId));
    if (!raw) return null;
    return JSON.parse(raw) as SaveData;
  } catch {
    return null;
  }
}

function _writeSlot(slotId: string, data: SaveData): void {
  localStorage.setItem(_getKey(slotId), JSON.stringify(data));
}

// ── Public API ──

/**
 * Save state to a slot. Uses toPersistedState to strip runtime fields.
 */
export function saveToSlot(slotId: string, state: GameStateMeta): boolean {
  try {
    const persistedState = _toPersistedState ? _toPersistedState(state) : state;
    const saveData: SaveData = {
      version: _SAVE_VERSION,
      timestamp: Date.now(),
      slotId,
      meta: {
        day: state.day || 1,
        area: state.currentArea || '',
        loopCount: state.loopCount || 0,
        san: state.san || 0,
        hp: state.hp || 0,
      },
      state: persistedState as SaveData['state'],
    };
    _writeSlot(slotId, saveData);
    return true;
  } catch (e) {
    console.error('Save to slot ' + slotId + ' failed:', e);
    return false;
  }
}

/**
 * Load from slot. Attempts migration instead of deleting on version mismatch.
 */
export function loadFromSlot(slotId: string): SaveData | null {
  try {
    const data = _readSlot(slotId);
    if (!data) return null;

    // Version matches — return as-is
    if (data.version === _SAVE_VERSION) {
      return data;
    }

    // Version mismatch — attempt migration
    console.info(
      '[Save] Slot ' + slotId + ' version mismatch (got ' + data.version + ', expected ' + _SAVE_VERSION + '). Attempting migration...'
    );
    if (_migrateSaveData) {
      const migrated = _migrateSaveData(data, slotId);
      if (migrated) {
        _writeSlot(slotId, migrated);
        console.info('[Save] Slot ' + slotId + ' migrated successfully.');
        return migrated;
      }
    }

    // Migration failed — preserve data for potential future recovery
    console.warn('[Save] Slot ' + slotId + ' could not be migrated. Data preserved for recovery.');
    return { ...data, incompatible: true };
  } catch (e) {
    console.error('Load from slot ' + slotId + ' failed:', e);
    localStorage.removeItem(_getKey(slotId));
    return null;
  }
}

export function deleteSlot(slotId: string): void {
  localStorage.removeItem(_getKey(slotId));
}

export function getSlotMeta(slotId: string): SlotMeta {
  try {
    const raw = localStorage.getItem(_getKey(slotId));
    if (!raw) return { slotId, exists: false };
    const data = JSON.parse(raw) as SaveData;
    return {
      slotId,
      exists: true,
      timestamp: data.timestamp,
      meta: data.meta,
      version: data.version,
    };
  } catch {
    return { slotId, exists: false };
  }
}

export function getAllSlots(): SlotMeta[] {
  return [...AUTO_SLOTS, ...MANUAL_SLOTS].map(getSlotMeta);
}

export function autoSave(state: GameStateMeta): void {
  // Rotate: auto_2 -> auto_3, auto_1 -> auto_2, new -> auto_1
  for (let i = AUTO_SLOTS.length - 1; i > 0; i--) {
    const prev = loadFromSlot(AUTO_SLOTS[i - 1]);
    if (prev && prev.state) saveToSlot(AUTO_SLOTS[i], prev.state as GameStateMeta);
  }
  saveToSlot('auto_1', state);
}

export function manualSave(slotId: string, state: GameStateMeta): boolean {
  return saveToSlot(slotId, state);
}

export function loadSlot(slotId: string): unknown | { incompatible: true } {
  const data = loadFromSlot(slotId);
  if (!data || data.incompatible) return data;
  return data.state;
}

export function deleteSlotById(slotId: string): void {
  deleteSlot(slotId);
}

// Backward compatibility
export function saveGame(state: GameStateMeta): void {
  autoSave(state);
}

export function loadGame(): unknown | { incompatible: true } | null {
  const data = loadFromSlot('auto_1');
  if (!data || data.incompatible) return data;
  return data.state;
}

export function clearSave(): void {
  [...AUTO_SLOTS, ...MANUAL_SLOTS].forEach(deleteSlot);
  localStorage.removeItem('coc_game_save'); // old key
}

export function hasSave(): boolean {
  return [...AUTO_SLOTS, ...MANUAL_SLOTS].some((sid) => getSlotMeta(sid).exists);
}

/**
 * Migrate old single-slot save. Attempts migration for any version.
 */
export function migrateOldSave(): void {
  try {
    const old = localStorage.getItem('coc_game_save');
    if (old) {
      const data = JSON.parse(old) as SaveData;
      if (_migrateSaveData) {
        const migrated = _migrateSaveData(data, 'auto_1');
        if (migrated && migrated.state) {
          saveToSlot('auto_1', migrated.state as GameStateMeta);
          console.info('[Save] Old single-slot save migrated successfully.');
        }
      }
      localStorage.removeItem('coc_game_save');
    }
  } catch (e) {
    // silent
  }
}

// ── Import/Export ──

export function exportSave(): boolean {
  try {
    const slots: Record<string, SaveData> = {};
    [...AUTO_SLOTS, ...MANUAL_SLOTS].forEach((sid) => {
      const raw = localStorage.getItem(_getKey(sid));
      if (raw) slots[sid] = JSON.parse(raw) as SaveData;
    });
    const exportData = {
      version: _SAVE_VERSION,
      save_time: new Date().toISOString(),
      slots,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'savegame.json';
    a.click();
    URL.revokeObjectURL(url);
    return true;
  } catch (e) {
    console.error('Export save failed:', e);
    return false;
  }
}

export function importSave(jsonString: string): { ok: boolean; error?: string } {
  try {
    const data = JSON.parse(jsonString) as { version: number; slots: Record<string, SaveData> };
    if (!data.version || !data.slots) return { ok: false, error: '存档格式不兼容' };
    Object.entries(data.slots).forEach(([sid, slotData]) => {
      if ([...AUTO_SLOTS, ...MANUAL_SLOTS].includes(sid) && slotData) {
        if (_migrateSaveData) {
          const migrated = _migrateSaveData(slotData, sid);
          if (migrated && migrated.state) {
            _writeSlot(sid, migrated);
          } else if (slotData.state) {
            _writeSlot(sid, slotData);
          }
        } else {
          _writeSlot(sid, slotData);
        }
      }
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: '存档格式不兼容' };
  }
}
