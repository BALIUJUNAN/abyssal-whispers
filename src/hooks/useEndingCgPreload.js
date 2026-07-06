// src/hooks/useEndingCgPreload.js
// Phase 1 extract: useEffect #8 — Preload ending CGs when SAN drops to stage >= 3
import { useEffect } from 'react';
import { preloadEndingCGs } from '../utils/appHelpers.js';

export function useEndingCgPreload(san, screen, sanStage) {
  useEffect(function () {
    if (screen === 'game' && sanStage.level >= 3) preloadEndingCGs();
  }, [san, screen]);
}
