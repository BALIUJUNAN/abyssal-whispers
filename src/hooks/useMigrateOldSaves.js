// src/hooks/useMigrateOldSaves.js
// Phase 1 extract: useEffect #3 — Migrate legacy save data on mount
import { useEffect } from 'react';
import { migrateOldSave } from '../engine/SaveManager.js';

export function useMigrateOldSaves() {
  useEffect(function () {
    migrateOldSave();
  }, []);
}
