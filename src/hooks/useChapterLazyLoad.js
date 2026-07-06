// src/hooks/useChapterLazyLoad.js
// Phase 1 extract: useEffect #9 — Lazy-load chapter 2+ and meta game data
import { useEffect } from 'react';
import { loadChapterData } from '../reducers/extendedEventsLoader.js';

export function useChapterLazyLoad(GD, day, screen) {
  useEffect(function () {
    if (screen !== 'game') return;
    if (!GD._extendedEventsLoaded) return;
    try {
      if (day >= 5) loadChapterData(GD, 'ch2plus', 'game_ch2plus.json');
      if (day >= 10) loadChapterData(GD, 'meta', 'game_meta.json');
    } catch (e) {
      /* non-fatal: game continues with existing data */
    }
  }, [day, screen]);
}
