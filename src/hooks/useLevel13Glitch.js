// src/hooks/useLevel13Glitch.js
// Phase 1 extract: useEffect #11 — Level 13 reality distortion glitch interval
import { useEffect, useRef } from 'react';

export function useLevel13Glitch(scheduled, screen, dispatch) {
  var l13IntervalRef = useRef(null);

  useEffect(function () {
    if (scheduled && screen === 'game' && !l13IntervalRef.current) {
      l13IntervalRef.current = setInterval(function () {
        if (Math.random() < 0.5) {
          dispatch({
            type: 'GLITCH_PULSE',
            strength: 3 + Math.floor(Math.random() * 5),
            meta: { consumeGameplayRng: false },
          });
        }
      }, 15000 + Math.floor(Math.random() * 10000));
    }
    if (!scheduled && l13IntervalRef.current) {
      clearInterval(l13IntervalRef.current);
      l13IntervalRef.current = null;
    }
    return function () {
      if (l13IntervalRef.current) {
        clearInterval(l13IntervalRef.current);
        l13IntervalRef.current = null;
      }
    };
  }, [scheduled, screen]);

  return l13IntervalRef;
}
