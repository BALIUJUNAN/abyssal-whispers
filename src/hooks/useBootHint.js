// src/hooks/useBootHint.js
// Phase 1 extract: useEffect #12 — Show hint on first prologue-to-game transition
import { useEffect, useState, useRef } from 'react';

export function useBootHint(screen, day) {
  var bootHintShown = useRef(false);
  var bootHintVisiblePair = useState(false);
  var bootHintVisible = bootHintVisiblePair[0];
  var setBootHintVisible = bootHintVisiblePair[1];

  useEffect(function () {
    if (screen === 'game' && day === 1 && !bootHintShown.current) {
      bootHintShown.current = true;
      setBootHintVisible(true);
      var t = setTimeout(function () { setBootHintVisible(false); }, 8000);
      return function () { clearTimeout(t); };
    }
  }, [screen, day]);

  return bootHintVisible;
}
