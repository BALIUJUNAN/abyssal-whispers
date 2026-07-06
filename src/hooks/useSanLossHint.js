// src/hooks/useSanLossHint.js
// Phase 1 extract: useEffect #13 — Show hint on first SAN loss (san < 75)
import { useEffect, useState, useRef } from 'react';

export function useSanLossHint(san, screen) {
  var sanHintShown = useRef(false);
  var sanHintVisiblePair = useState(false);
  var sanHintVisible = sanHintVisiblePair[0];
  var setSanHintVisible = sanHintVisiblePair[1];

  useEffect(function () {
    if (screen === 'game' && san < 75 && !sanHintShown.current) {
      sanHintShown.current = true;
      setSanHintVisible(true);
      var t = setTimeout(function () { setSanHintVisible(false); }, 2500);
      return function () { clearTimeout(t); };
    }
  }, [san, screen]);

  return sanHintVisible;
}
