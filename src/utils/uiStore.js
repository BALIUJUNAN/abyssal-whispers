// src/utils/uiStore.js - External UI store (Zustand-like pattern)
// Replaces useState for all non-gameplay UI state: modals, toasts, settings.
// Works with flat bundle + global React. No npm dependency.

const _useSyncExternalStore = React.useSyncExternalStore;

function createUiStore(initialState) {
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
const uiStore = createUiStore({
  toasts: [],
  settingsOpen: false,
  saveLoadOpen: false,
  saveLoadMode: 'save',
  achOpen: false,
  ugcOpen: false,
  settings: null, // loaded lazily via loadSettings()
  saveTick: 0,
});

// Lazy-load settings on first access
function getSettings() {
  const s = uiStore.getState();
  if (s.settings === null) {
    uiStore.setState({ settings: loadSettings() });
    return uiStore.getState().settings;
  }
  return s.settings;
}

function updateSettings(newSettings) {
  saveSettings(newSettings);
  uiStore.setState({ settings: newSettings });
}

function addUiToast(toast) {
  uiStore.setState((s) => ({
    toasts: [...s.toasts, { ...toast, key: Date.now() }],
  }));
}

function removeUiToast(key) {
  uiStore.setState((s) => ({
    toasts: s.toasts.filter((t) => t.key !== key),
  }));
}

function notifySave(msg, type) {
  uiStore.setState((s) => ({ saveTick: s.saveTick + 1 }));
  addUiToast({
    id: 'save_' + Date.now(),
    type: type || 'save',
    def: { icon: type === 'load' ? '📖' : '💾', name: msg || '已存档', desc: '' },
  });
}
