// src/hooks/useAchievementCheck.js
// Phase 1 extract: useEffect #2 — Check and persist achievement unlocks
import { useEffect } from 'react';
import {
  loadAchievements,
  saveAchievements,
  checkAchievements,
  getAchievementDef,
} from '../reducers/achievementReducer.js';
import { addUiToast } from '../state/uiStore.js';

export function useAchievementCheck(game) {
  useEffect(function () {
    var achData = loadAchievements();
    var newUnlocks = checkAchievements(game, achData.unlocked, achData.stats);
    if (newUnlocks.length > 0) {
      achData.unlocked.push.apply(achData.unlocked, newUnlocks);
      saveAchievements(achData);
      newUnlocks.forEach(function (id) {
        var def = getAchievementDef(id);
        if (def) addUiToast({ id: id, def: def, type: 'achievement' });
      });
    }
  }, [
    game.ending,
    (game.visitedAreas || []).length,
    (game.clues || []).length,
  ]);
}
