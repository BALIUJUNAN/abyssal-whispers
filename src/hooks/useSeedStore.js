// src/hooks/useSeedStore.js
// Phase 1 extract: useEffect #1 — Seed Zustand store on mount + loading screen removal
import { useEffect } from 'react';
import { seedGameStore, useGameStore } from '../state/useGameStore.js';

export function useSeedStore(GD) {
  useEffect(function () {
    var storeState = useGameStore.getState();
    if (!storeState._GD) {
      seedGameStore(GD);
    }
    var ls = document.getElementById('loading-screen');
    if (ls) {
      ls.classList.add('fade-out');
      setTimeout(function () { ls.remove(); }, 700);
    }
  }, [GD]);
}
