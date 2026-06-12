// src/state/uiStore.js - UI State Store (Zustand-like pattern)
// Migrated from src/utils/uiStore.js
// Manages: modals, toasts, settings, temporary UI state
// Uses useSyncExternalStore for React 18 compatibility.
//
// This is the "useUiStore" half of the dual-store architecture.
// Game state (useGameStore) lives in state/gameStore.js (currently useReducer).

// src/utils/uiStore.js - External UI store (Zustand-like pattern)
// Replaces useState for all non-gameplay UI state: modals, toasts, settings.
// Works with flat bundle + global React. No npm dependency.

const _useSyncExternalStore = React.useSyncExternalStore;

export function createUiStore(initialState) {
  let state = typeof initialState === 'function' ? initialState() : { ...initialState };
  const listeners = new Set();
  function getState() {
    return state;
  }
  function setState(partial) {
    const next = typeof partial === 'function' ? partial(state) : partial;
    if (next === state) return;
    state = { ...state, ...next };
    listeners.forEach((fn) => fn());
  }
  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
  function useStore(selector) {
    const sel = selector || ((s) => s);
    return _useSyncExternalStore(
      subscribe,
      () => sel(getState()),
      () => sel(getState())
    );
  }
  useStore.getState = getState;
  useStore.setState = setState;
  useStore.subscribe = subscribe;
  return useStore;
}

// === UI Store ===
export const uiStore = createUiStore({
  toasts: [],
  settingsOpen: false,
  saveLoadOpen: false,
  saveLoadMode: 'save',
  achOpen: false,
  ugcOpen: false,
  settings: null, // loaded lazily via loadSettings()
  saveTick: 0,
  // ── 暗黑地牢风格地图模式 ──
  uiMode: 'town_map', // 'town_map' | 'classic' — 地图模式 vs 经典模式
  activeHotspot: null, // 当前激活的热点 { id, type, data, ... }
  activePanel: null, // 当前面板类型: 'area_actions' | 'explore' | 'talk' | null
});

// Lazy-load settings on first access
export function getSettings() {
  const s = uiStore.getState();
  if (s.settings === null) {
    uiStore.setState({ settings: loadSettings() });
    return uiStore.getState().settings;
  }
  return s.settings;
}

export function updateSettings(newSettings) {
  saveSettings(newSettings);
  uiStore.setState({ settings: newSettings });
}

export function addUiToast(toast) {
  uiStore.setState((s) => ({
    toasts: [...s.toasts, { ...toast, key: Date.now() }],
  }));
}

export function removeUiToast(key) {
  uiStore.setState((s) => ({
    toasts: s.toasts.filter((t) => t.key !== key),
  }));
}

export function notifySave(msg, type) {
  uiStore.setState((s) => ({ saveTick: s.saveTick + 1 }));
  addUiToast({
    id: 'save_' + Date.now(),
    type: type || 'save',
    def: { icon: type === 'load' ? '📖' : '💾', name: msg || '已存档', desc: '' },
  });
}
