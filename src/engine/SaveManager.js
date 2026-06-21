// src/engine/SaveManager.js — Multi-slot save system
// ENGINE CONTRACT: Zero game-specific imports. Migration injected via configureSaveManager().

export const SAVE_PREFIX = 'coc_save_';
export const AUTO_SLOTS = ['auto_1', 'auto_2', 'auto_3'];
export const MANUAL_SLOTS = ['manual_1', 'manual_2', 'manual_3'];

// ── Dependency Injection ──
var _SAVE_VERSION = 1;
var _migrateSaveData = null;
var _toPersistedState = null;

/**
 * Inject save migration dependencies. Call once at app startup.
 * @param {{ SAVE_VERSION?: number, migrateSaveData?: function, toPersistedState?: function }} deps
 */
export function configureSaveManager(deps) {
  if (deps.SAVE_VERSION != null) _SAVE_VERSION = deps.SAVE_VERSION;
  if (deps.migrateSaveData) _migrateSaveData = deps.migrateSaveData;
  if (deps.toPersistedState) _toPersistedState = deps.toPersistedState;
}

/**
 * Save state to a slot. Uses toPersistedState to strip runtime fields (P0-5).
 */
export function saveToSlot(slotId, state) {
  try {
    const persistedState = _toPersistedState(state);
    const saveData = {
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
      state: persistedState,
    };
    localStorage.setItem(SAVE_PREFIX + slotId, JSON.stringify(saveData));
    return true;
  } catch (e) {
    console.error('Save to slot ' + slotId + ' failed:', e);
    return false;
  }
}

/**
 * Load from slot. P0-4: attempts migration instead of deleting on version mismatch.
 */
export function loadFromSlot(slotId) {
  try {
    const raw = localStorage.getItem(SAVE_PREFIX + slotId);
    if (!raw) return null;
    const data = JSON.parse(raw);

    // Version matches — return as-is
    if (data.version === _SAVE_VERSION) {
      return data;
    }

    // P0-4: Version mismatch — attempt migration instead of deleting
    console.info(
      '[Save] Slot ' +
        slotId +
        ' version mismatch (got ' +
        data.version +
        ', expected ' +
        _SAVE_VERSION +
        '). Attempting migration...'
    );
    const migrated = _migrateSaveData(data, slotId);
    if (migrated) {
      // Persist the migrated save back to localStorage
      localStorage.setItem(SAVE_PREFIX + slotId, JSON.stringify(migrated));
      console.info('[Save] Slot ' + slotId + ' migrated successfully.');
      return migrated;
    }

    // Migration failed — only now do we consider it incompatible
    // But we DON'T delete it — keep it for potential future recovery
    console.warn('[Save] Slot ' + slotId + ' could not be migrated. Data preserved for recovery.');
    return { incompatible: true };
  } catch (e) {
    console.error('Load from slot ' + slotId + ' failed:', e);
    // Only remove genuinely corrupt data (JSON parse failure)
    localStorage.removeItem(SAVE_PREFIX + slotId);
    return null;
  }
}

export function deleteSlot(slotId) {
  localStorage.removeItem(SAVE_PREFIX + slotId);
}

export function getSlotMeta(slotId) {
  try {
    const raw = localStorage.getItem(SAVE_PREFIX + slotId);
    if (!raw) return { slotId, exists: false };
    const data = JSON.parse(raw);
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

export function getAllSlots() {
  return [...AUTO_SLOTS, ...MANUAL_SLOTS].map(getSlotMeta);
}

export function autoSave(state) {
  // Rotate: auto_2 -> auto_3, auto_1 -> auto_2, new -> auto_1
  for (let i = AUTO_SLOTS.length - 1; i > 0; i--) {
    const prev = loadFromSlot(AUTO_SLOTS[i - 1]);
    if (prev && prev.state) saveToSlot(AUTO_SLOTS[i], prev.state);
  }
  saveToSlot('auto_1', state);
}

export function manualSave(slotId, state) {
  return saveToSlot(slotId, state);
}

export function loadSlot(slotId) {
  const data = loadFromSlot(slotId);
  if (!data || data.incompatible) return data;
  // Format freeze: validate loaded save against spec (non-blocking)
  if (data.state && typeof validateSaveFormat === 'function') {
    const result = validateSaveFormat(data);
    if (!result.valid) {
      console.warn('[Save] Format validation failed for slot ' + slotId + ':', result.errors);
    }
    if (result.warnings.length > 0) {
      console.info('[Save] Format warnings for slot ' + slotId + ':', result.warnings);
    }
  }
  return data.state;
}

export function deleteSlotById(slotId) {
  deleteSlot(slotId);
}

// Backward compatibility
export function saveGame(state) {
  autoSave(state);
}
export function loadGame() {
  const data = loadFromSlot('auto_1');
  if (!data || data.incompatible) return data;
  return data.state;
}
export function clearSave() {
  [...AUTO_SLOTS, ...MANUAL_SLOTS].forEach(deleteSlot);
  localStorage.removeItem('coc_game_save'); // old key
}
export function hasSave() {
  return [...AUTO_SLOTS, ...MANUAL_SLOTS].some((sid) => getSlotMeta(sid).exists);
}

/**
 * Migrate old single-slot save. P0-4: attempts migration for any version.
 */
export function migrateOldSave() {
  try {
    const old = localStorage.getItem('coc_game_save');
    if (old) {
      const data = JSON.parse(old);
      // P0-4: Accept any version, attempt migration
      const migrated = _migrateSaveData(data, 'auto_1');
      if (migrated && migrated.state) {
        saveToSlot('auto_1', migrated.state);
        console.info('[Save] Old single-slot save migrated successfully.');
      }
      localStorage.removeItem('coc_game_save');
    }
  } catch (e) {}
}

// 导出全部存档为 JSON 文件
export function exportSave() {
  try {
    const slots = {};
    [...AUTO_SLOTS, ...MANUAL_SLOTS].forEach((sid) => {
      const raw = localStorage.getItem(SAVE_PREFIX + sid);
      if (raw) slots[sid] = JSON.parse(raw);
    });
    const exportData = { version: _SAVE_VERSION, save_time: new Date().toISOString(), slots };
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

// ────────────────────────────────────────────────
// SECTION: Save Format Freeze (v1.0)
// ────────────────────────────────────────────────

/**
 * Frozen save format specification.
 * Any structural change to the save format MUST update this object
 * and bump SAVE_VERSION in saveMigration.js.
 *
 * @type {object}
 */
export const SAVE_FORMAT_SPEC = {
  frozen: true,
  freezeDate: '2026-06-20',
  currentVersion: _SAVE_VERSION,
  topLevelKeys: ['version', 'timestamp', 'slotId', 'meta', 'state'],
  metaKeys: ['day', 'area', 'loopCount', 'san', 'hp'],
  requiredStateKeys: [
    'stats', 'hp', 'maxHp', 'san', 'maxSan', 'luck', 'mp',
    'skills', 'archetype', 'inventory', 'clues',
    'currentArea', 'visitedAreas', 'npcTrust', 'sealState',
    'weather', 'safehouseCorruption', 'dayCount',
    'flags', 'eventLog', 'runMemory',
    'behaviorTracking',
  ],
  transientKeys: ['_effects', '_lastAction', '_runtime', '_debug', '_actionHistory'],
  /**
   * Compute a checksum of the save format structure.
   * Used to detect unexpected format drift between versions.
   * Returns a string like "v1.2.0:15:5:31".
   */
  computeChecksum() {
    return [
      'v' + this.currentVersion,
      this.topLevelKeys.length,
      this.metaKeys.length,
      this.requiredStateKeys.length,
      this.transientKeys.length,
    ].join(':');
  },
};

/**
 * Validate a save object against the frozen format spec.
 * Returns { valid: boolean, errors: string[], warnings: string[] }.
 *
 * This is a non-destructive check — it never modifies the save.
 */
export function validateSaveFormat(saveData) {
  const errors = [];
  const warnings = [];

  if (!saveData || typeof saveData !== 'object') {
    return { valid: false, errors: ['Save data is null or not an object'], warnings };
  }

  // Top-level keys
  for (const key of SAVE_FORMAT_SPEC.topLevelKeys) {
    if (!(key in saveData)) {
      errors.push(`Missing top-level key: "${key}"`);
    }
  }

  // Version check
  if (saveData.version !== _SAVE_VERSION) {
    warnings.push(
      `Version mismatch: save is v${saveData.version}, current is v${_SAVE_VERSION} (migration will be attempted)`
    );
  }

  // Meta keys
  if (saveData.meta && typeof saveData.meta === 'object') {
    for (const key of SAVE_FORMAT_SPEC.metaKeys) {
      if (!(key in saveData.meta)) {
        warnings.push(`Meta missing optional key: "${key}"`);
      }
    }
  }

  // State presence
  if (!saveData.state || typeof saveData.state !== 'object') {
    errors.push('Save missing "state" object');
    return { valid: false, errors, warnings };
  }

  // Required state keys (warn only — ensureMinimalExtendedState handles defaults)
  for (const key of SAVE_FORMAT_SPEC.requiredStateKeys) {
    if (!(key in saveData.state)) {
      warnings.push(`State missing key (will be defaulted): "${key}"`);
    }
  }

  // Check for unexpected transient keys leaked into state
  for (const key of SAVE_FORMAT_SPEC.transientKeys) {
    if (key in saveData.state) {
      warnings.push(`Transient key found in persisted state: "${key}" (should be filtered)`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Format freeze enforcement: log a warning if the format spec
 * checksum doesn't match what we expect. This catches accidental
 * format drift during development.
 *
 * Call this once at app startup after configureSaveManager().
 */
export function enforceSaveFormatFreeze() {
  const checksum = SAVE_FORMAT_SPEC.computeChecksum();
  console.info(
    `[Save] Format freeze active — spec checksum: ${checksum} (frozen: ${SAVE_FORMAT_SPEC.freezeDate})`
  );
  return checksum;
}

// ────────────────────────────────────────────────
// SECTION: Human-readable text export
// ────────────────────────────────────────────────

/**
 * Format a timestamp to a readable date/time string.
 */
function formatTimestamp(ts) {
  if (!ts) return '未知';
  const d = new Date(ts);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Format a number with sign (+/-) for stat display.
 */
function fmtSigned(n) {
  if (n === undefined || n === null) return '?';
  return n >= 0 ? '+' + n : '' + n;
}

/**
 * Build a human-readable text summary of a single save slot.
 */
function buildSlotTextReport(slotId, saveData) {
  const s = saveData.state || {};
  const m = saveData.meta || {};
  const v = saveData.version || '?';
  const lines = [];

  lines.push('═══════════════════════════════════════════');
  lines.push('  深渊低语：沃切斯特之影 — 存档报告');
  lines.push('═══════════════════════════════════════════');
  lines.push('');
  lines.push('  槽位: ' + slotId);
  lines.push('  格式版本: v' + v);
  lines.push('  存档时间: ' + formatTimestamp(saveData.timestamp));
  lines.push('');

  // Meta summary
  lines.push('  ── 概况 ──');
  lines.push('  第 ' + (m.day || '?') + ' 日');
  lines.push('  轮回: ' + (m.loopCount || 0) + ' 次');
  lines.push('  区域: ' + (m.area || '?'));
  lines.push('  SAN: ' + (m.san || '?') + ' / ' + (s.maxSan || '?'));
  lines.push('  HP: ' + (m.hp || '?') + ' / ' + (s.maxHp || '?'));
  lines.push('');

  // Character
  lines.push('  ── 角色 ──');
  const stats = s.stats || {};
  const statNames = { STR: '力量', CON: '体质', DEX: '敏捷', APP: '外貌', POW: '意志', INT: '智力', SIZ: '体型', EDU: '教育' };
  for (const [k, label] of Object.entries(statNames)) {
    if (stats[k] !== undefined) lines.push('  ' + label + ' (' + k + '): ' + stats[k]);
  }
  if (s.luck) lines.push('  幸运 (LUCK): ' + s.luck);
  if (s.mp) lines.push('  魔法值 (MP): ' + s.mp);
  if (s.archetype) lines.push('  原型: ' + s.archetype);
  lines.push('');

  // Resources
  lines.push('  ── 资源 ──');
  lines.push('  食物: ' + (s.food || 0));
  lines.push('  金钱: ' + (s.money || 0));
  lines.push('  人性: ' + (s.humanity || 50));
  lines.push('  神话知识: ' + (s.mythosLevel || 0));
  lines.push('');

  // Inventory
  lines.push('  ── 物品栏 ──');
  if (s.inventory && s.inventory.length > 0) {
    for (const item of s.inventory) {
      lines.push('  · ' + item.name + (item.uses !== undefined ? ' (' + item.uses + '次)' : ''));
    }
  } else {
    lines.push('  （空）');
  }
  lines.push('');

  // Clues
  lines.push('  ── 线索 (' + (s.clues ? s.clues.length : 0) + ') ──');
  if (s.clues && s.clues.length > 0) {
    for (const clue of s.clues.slice(0, 20)) {
      const name = typeof clue === 'string' ? clue : (clue.name || clue.id || '?');
      lines.push('  · ' + name);
    }
    if (s.clues.length > 20) {
      lines.push('  ... 还有 ' + (s.clues.length - 20) + ' 条线索');
    }
  } else {
    lines.push('  （无）');
  }
  lines.push('');

  // Flags
  lines.push('  ── 标记 (' + (s.flags ? s.flags.length : 0) + ') ──');
  if (s.flags && s.flags.length > 0) {
    for (const flag of s.flags) {
      lines.push('  · ' + flag);
    }
  } else {
    lines.push('  （无）');
  }
  lines.push('');

  // NPC trust
  const trustEntries = s.npcTrust ? Object.entries(s.npcTrust) : [];
  if (trustEntries.length > 0) {
    lines.push('  ── NPC 信赖 ──');
    for (const [npc, level] of trustEntries) {
      const stars = '★'.repeat(level) + '☆'.repeat(5 - level);
      lines.push('  ' + npc + ': ' + stars + ' (' + level + '/5)');
    }
    lines.push('');
  }

  // Event log (last 10)
  if (s.eventLog && s.eventLog.length > 0) {
    lines.push('  ── 最近事件 (' + s.eventLog.length + ' 条) ──');
    const recent = s.eventLog.slice(-10).reverse();
    for (const entry of recent) {
      lines.push('  [Day ' + (entry.day || '?') + '] ' + (entry.text || '').slice(0, 80));
    }
    lines.push('');
  }

  // Run memory (last 5)
  if (s.runMemory && s.runMemory.length > 0) {
    lines.push('  ── 笔记本 (' + s.runMemory.length + ' 条) ──');
    const recent = s.runMemory.slice(-5).reverse();
    for (const mem of recent) {
      lines.push('  · ' + mem.slice(0, 80));
    }
    lines.push('');
  }

  // Behavior tracking summary
  const bt = s.behaviorTracking || {};
  const notableBt = [];
  if (bt.direct_kill_count > 0) notableBt.push('直接击杀: ' + bt.direct_kill_count);
  if (bt.cannibalism_count > 0) notableBt.push('食人: ' + bt.cannibalism_count);
  if (bt.npc_deaths_by_manipulation > 0) notableBt.push('NPC  deaths: ' + bt.npc_deaths_by_manipulation);
  if (bt.cult_leader_score > 0) notableBt.push('邪教领袖分: ' + bt.cult_leader_score);
  if (bt.hoarded_money_max > 0) notableBt.push('最大囤积金钱: ' + bt.hoarded_money_max);
  if (bt.hoarded_food_max > 0) notableBt.push('最大囤积食物: ' + bt.hoarded_food_max);
  if (bt.meta_boundary_breaks > 0) notableBt.push('元边界打破: ' + bt.meta_boundary_breaks);
  if (notableBt.length > 0) {
    lines.push('  ── 行为特征 ──');
    for (const entry of notableBt) {
      lines.push('  · ' + entry);
    }
    lines.push('');
  }

  // Unlocked areas
  if (s.unlockedAreas && s.unlockedAreas.length > 0) {
    lines.push('  ── 已解锁区域 ──');
    for (const area of s.unlockedAreas) {
      lines.push('  · ' + area);
    }
    lines.push('');
  }

  lines.push('═══════════════════════════════════════════');
  lines.push('  生成时间: ' + new Date().toLocaleString('zh-CN'));
  lines.push('  格式版本: v' + _SAVE_VERSION);
  lines.push('═══════════════════════════════════════════');

  return lines.join('\n');
}

/**
 * Export all saves as a human-readable text file.
 * Each slot gets its own section with stats, inventory, clues, etc.
 * Useful for backup, sharing run summaries, or debugging.
 */
export function exportSaveAsText() {
  try {
    const sections = [];
    const slotOrder = [...AUTO_SLOTS, ...MANUAL_SLOTS];

    for (const sid of slotOrder) {
      const raw = localStorage.getItem(SAVE_PREFIX + sid);
      if (!raw) continue;
      const data = JSON.parse(raw);
      if (data.incompatible) {
        sections.push('槽位 ' + sid + ': [版本不兼容，无法读取]');
        continue;
      }
      sections.push(buildSlotTextReport(sid, data));
    }

    if (sections.length === 0) {
      sections.push('没有找到任何存档。');
    }

    const header = [
      '╔══════════════════════════════════════════════════════╗',
      '║    深渊低语：沃切斯特之影 — 全部存档文本导出        ║',
      '║    生成时间: ' + new Date().toLocaleString('zh-CN'),
      '║    格式版本: v' + _SAVE_VERSION,
      '╚══════════════════════════════════════════════════════╝',
      '',
    ].join('\n');

    const fullText = header + '\n\n' + sections.join('\n\n');

    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    a.download = 'savegame_' + dateStr + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (e) {
    console.error('Export save as text failed:', e);
    return false;
  }
}

/**
 * 导入存档 JSON 文件. P0-4: attempts migration for each slot.
 */
export function importSave(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (!data.version || !data.slots) return { ok: false, error: '存档格式不兼容' };
    Object.entries(data.slots).forEach(([sid, slotData]) => {
      if ([...AUTO_SLOTS, ...MANUAL_SLOTS].includes(sid) && slotData) {
        // P0-4: Attempt migration on import too
        const migrated = _migrateSaveData(slotData, sid);
        if (migrated && migrated.state) {
          localStorage.setItem(SAVE_PREFIX + sid, JSON.stringify(migrated));
        } else if (slotData.state) {
          // Fallback: save as-is if migration module not available
          localStorage.setItem(SAVE_PREFIX + sid, JSON.stringify(slotData));
        }
      }
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: '存档格式不兼容' };
  }
}
