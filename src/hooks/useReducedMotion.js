// src/hooks/useReducedMotion.js
// Phase 1 extract: useEffect #10 — Sync reduced-motion setting to body attribute
import { useEffect } from 'react';

export function useReducedMotion(settings) {
  useEffect(function () {
    try {
      document.body.setAttribute(
        'data-reduced-motion',
        settings.reducedMotion ? 'true' : 'false'
      );
    } catch (e) { /* noop */ }
  }, [settings.reducedMotion]);
}
