// src/hooks/useUiState.js — Assembles the full UI state object from granular
// uiStore subscriptions. Returns a memoized object with reference stability.

import { useMemo } from 'react';
import { useUiStore } from '../state/uiStore.js';

export function useUiState() {
  var _uiSettingsOpen = useUiStore(function (s) { return s.settingsOpen; });
  var _uiSaveLoadOpen = useUiStore(function (s) { return s.saveLoadOpen; });
  var _uiSaveLoadMode = useUiStore(function (s) { return s.saveLoadMode; });
  var _uiAchOpen = useUiStore(function (s) { return s.achOpen; });
  var _uiUgcOpen = useUiStore(function (s) { return s.ugcOpen; });
  var _uiNotebookOpen = useUiStore(function (s) { return s.notebookOpen; });
  var _uiNotebookEverOpened = useUiStore(function (s) { return s.notebookEverOpened; });
  var _uiActiveShop = useUiStore(function (s) { return s.activeShop; });
  var _uiSettings = useUiStore(function (s) { return s.settings; });
  var _uiSaveTick = useUiStore(function (s) { return s.saveTick; });
  var _uiToasts = useUiStore(function (s) { return s.toasts; });

  var ui = useMemo(function () {
    return {
      settingsOpen: _uiSettingsOpen, saveLoadOpen: _uiSaveLoadOpen,
      saveLoadMode: _uiSaveLoadMode, achOpen: _uiAchOpen, ugcOpen: _uiUgcOpen,
      notebookOpen: _uiNotebookOpen, notebookEverOpened: _uiNotebookEverOpened,
      activeShop: _uiActiveShop,
      settings: _uiSettings, saveTick: _uiSaveTick, toasts: _uiToasts,
    };
  }, [
    _uiSettingsOpen, _uiSaveLoadOpen, _uiSaveLoadMode, _uiAchOpen, _uiUgcOpen,
    _uiNotebookOpen, _uiNotebookEverOpened, _uiActiveShop,
    _uiSettings, _uiSaveTick, _uiToasts,
  ]);

  return ui;
}
