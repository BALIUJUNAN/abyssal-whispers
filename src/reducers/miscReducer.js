// src/reducers/miscReducer.js - Merged: safehouseReducer + itemReducer + settingsReducer

// === Safehouse Degradation (was safehouseReducer.js) ===

// src/reducers/safehouseReducer.js - Safehouse degradation

export function getSafehouseStage(corruption, ctx) {
  const { GD } = ctx;
  const stages = GD.systems?.safehouse?.degradation_stages || [];
  for (let i = stages.length - 1; i >= 0; i--) {
    const r = stages[i].corruption_range;
    if (corruption >= r[0] && corruption <= r[1]) return stages[i];
  }
  return (
    stages[0] || {
      stage: 1,
      name: '安宁',
      is_safe: true,
      corruption_range: [0, 15],
      available_functions: { san_recovery: 2, fatigue_recovery: 30 },
    }
  );
}

export function processSafehouseNight(state, ctx) {
  let corruption = state.safehouseCorruption || 0;
  const sealState = getSealState(state.day, ctx);
  let accel = sealState?.global_modifier?.npc_corruption_rate || 0.05;
  let baseGain = Math.round(accel * 10 + rand(0, 3));
  // Degradation triggers
  if (state.san < 30) baseGain = Math.round(baseGain * 1.3); // SAN<30: +30% speed
  if (state.npcStates['玛莎·格雷']?.corrupted) baseGain = Math.round(baseGain * 1.5); // Martha corrupted: +50%
  corruption += baseGain;
  const corruptedCount = Object.values(state.npcStates).filter(
    (ns) => ns.corrupted && !ns.dead
  ).length;
  corruption += corruptedCount;
  return Math.min(100, corruption);
}

// === Item Usage Logic (was itemReducer.js) ===

// src/reducers/itemReducer.js - Item usage logic (data-driven)

export function getItemDef(itemId, ctx) {
  const { GD } = ctx;
  const items = GD.items || [];
  return items.find((i) => i.id === itemId);
}

export function useItemByDef(state, item, narr, ctx) {
  const def = getItemDef(item.id, ctx);
  if (!def) return false;

  if (def.use_text_ref === 'clue_count') {
    narr('system', '你翻看笔记本，记录了' + state.clues.length + '条线索。');
    return false;
  }
  if (def.use_text_ref === 'show_day') {
    narr('system', '指针不规则地转动——有时倒转。现在是第' + state.day + '天。');
    return false;
  }

  if (def.effects && def.effects.length > 0) {
    applyEffects(state, def.effects, { source: 'item_use', item_id: item.id });
    const effectDesc = def.effects
      .map((e) => {
        if (e.type === 'modify_stat') return `${e.target} ${e.amount > 0 ? '+' : ''}${e.amount}`;
        if (e.type === 'modify_resource')
          return `${e.resource} ${e.amount > 0 ? '+' : ''}${e.amount}`;
        if (e.type === 'add_item') return `获得 ${e.name || e.item_id}`;
        if (e.type === 'add_clue') return `获得线索`;
        if (e.type === 'add_flag') return `标记 ${e.flag_id}`;
        return e.type;
      })
      .join(', ');
    narr('system', '使用 ' + item.name + '，' + effectDesc);
  } else if (def.use_text) {
    narr('system', def.use_text);
  }

  return !!def.consume_on_use;
}

// === Settings Persistence (was settingsReducer.js) ===

// src/reducers/settingsReducer.js - 持久化设置管理

export const SETTINGS_KEY = 'coc_game_settings';
export const SETTINGS_VERSION = '1.1.0';

export const DEFAULT_SETTINGS = {
  volume: 80,
  ambientVolume: 80,
  effectVolume: 80,
  uiVolume: 80,
  narrativeFontSize: 'medium',
  visualDistortion: true,
  suddenSounds: true,
  flickerEffect: true,
  visualPollution: 50,
  interactionPollution: 50,
  metaPollution: 50,
  lightPollutionMode: false,
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const data = JSON.parse(raw);
    if (data.version !== SETTINGS_VERSION) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...data.settings };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        version: SETTINGS_VERSION,
        settings,
      })
    );
  } catch (e) {
    console.error('Save settings failed:', e);
  }
}
