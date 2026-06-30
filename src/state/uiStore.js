// src/state/uiStore.js — UI State Store (Zustand)
// Migrated from custom useSyncExternalStore implementation to zustand/create.
// Manages: modals, toasts, settings, temporary UI state.
//
// Primary API: useUiStore() — React hook for components
// Legacy API: uiStore.setState() / uiStore.getState() — for non-hook contexts
// Named exports: getSettings, updateSettings, addUiToast, removeUiToast, notifySave

import { create } from 'zustand';
import { loadSettings, saveSettings } from '../reducers/miscReducer.js';

// ── Named exports (for import { getSettings } from '../state/uiStore.js') ──
// These delegate to the Zustand store. Defined as real functions so
// Vite/Rolldown can resolve the imports.

export function getSettings() {
  return useUiStore.getState().getSettings();
}

export function updateSettings(newSettings) {
  useUiStore.getState().updateSettings(newSettings);
}

export function addUiToast(toast) {
  useUiStore.getState().addToast(toast);
}

export function removeUiToast(key) {
  useUiStore.getState().removeToast(key);
}

export function notifySave(msg, type) {
  useUiStore.getState().notifySave(msg, type);
}

// ── Store definition ──

export const useUiStore = create((set, get) => ({
  toasts: [],
  settingsOpen: false,
  saveLoadOpen: false,
  saveLoadMode: 'save',
  achOpen: false,
  ugcOpen: false,
  notebookOpen: false,
  notebookEverOpened: false,
  settings: loadSettings(),
  saveTick: 0,
  uiMode: 'town_map',
  activeHotspot: null,
  activePanel: null,

  setState: (partial) => {
    const next = typeof partial === 'function' ? partial(get()) : partial;
    set(next);
  },

  getSettings: () => {
    return get().settings;
  },

  updateSettings: (newSettings) => {
    saveSettings(newSettings);
    set({ settings: newSettings });
  },

  addToast: (toast) => set((s) => ({
    toasts: [...s.toasts, { ...toast, key: Date.now() + '_' + Math.random().toString(36).slice(2, 6) }],
  })),

  removeToast: (key) => set((s) => ({
    toasts: s.toasts.filter((t) => t.key !== key),
  })),

  notifySave: (msg, type) => {
    set((s) => ({ saveTick: s.saveTick + 1 }));
    get().addToast({
      id: 'save_' + Date.now(),
      type: type || 'save',
      def: { icon: type === 'load' ? '📖' : '💾', name: msg || '已存档', desc: '' },
    });
  },
}));

// ── Legacy compatibility ──
// Old code calls: const ui = uiStore(); uiStore.setState({...}); uiStore.getState()
// These delegate to the Zustand store. Works from both React and non-React contexts.

export function uiStore() {
  return useUiStore.getState();
}

uiStore.setState = function (partial) {
  return useUiStore.setState(partial);
};

uiStore.getState = function () {
  return useUiStore.getState();
};
