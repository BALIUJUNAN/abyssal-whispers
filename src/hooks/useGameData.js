// src/hooks/useGameData.js — Assembles the full `game` object from granular selectors.
// Returns a memoized object with reference stability (useMemo deps mirror every selector).
// Consumers: App component, PrologueScreen, CharCreation, EndingScreen, DevPanel, ShopModal

import { useMemo, useRef } from 'react';
import {
  useScreen, getDispatch, useGameStore,
} from '../state/useGameStore.js';
import {
  useSan, useSanStageClasses, useDay, useLoopCount, useCurrentArea,
  useEnding, useEndingCoins, useLoopShopTier, useTutorialSeen,
  useLevel13GlitchScheduled, useAccessibilityOptions,
  useSafehouseCorruption, useGlitchPulse,
} from '../state/selectors.js';

export function useGameData() {
  // Granular selector subscriptions — each re-renders independently
  var screen = useScreen();
  var day = useDay();
  var loopCount = useLoopCount();
  var san = useSan();
  var currentArea = useCurrentArea();
  var sanStage = useSanStageClasses(true);

  var gameEnding = useEnding();
  var gameEndingCoins = useEndingCoins();
  var gameLoopShopTier = useLoopShopTier();
  var gameTutorialSeen = useTutorialSeen();
  var gameLevel13Glitch = useLevel13GlitchScheduled();
  var gameAccessibility = useAccessibilityOptions();
  var gameSafehouseCorruption = useSafehouseCorruption();
  var gameGlitchPulse = useGlitchPulse();

  // Direct store subscriptions (inline selectors — same as previous app.jsx)
  var gameHp = useGameStore(function (s) { return s.hp; });
  var gameMaxHp = useGameStore(function (s) { return s.maxHp; });
  var gameAp = useGameStore(function (s) { return s.ap; });
  var gameMaxAp = useGameStore(function (s) { return s.maxAp; });
  var gameMoney = useGameStore(function (s) { return s.money; });
  var gameFood = useGameStore(function (s) { return s.food; });
  var gameInventory = useGameStore(function (s) { return s.inventory; });
  var gameClues = useGameStore(function (s) { return s.clues; });
  var gameNarrative = useGameStore(function (s) { return s.narrative; });
  var gameEventLog = useGameStore(function (s) { return s.eventLog; });
  var gamePendingEvent = useGameStore(function (s) { return s.pendingEvent; });
  var gamePendingNpc = useGameStore(function (s) { return s.pendingNpc; });
  var gamePendingGamble = useGameStore(function (s) { return s.pendingGamble; });
  var gamePendingChoice = useGameStore(function (s) { return s.pendingChoice; });
  var gameTransition = useGameStore(function (s) { return s.transition; });
  var gameMadnessActive = useGameStore(function (s) { return s.madnessActive; });
  var gameVisitedAreas = useGameStore(function (s) { return s.visitedAreas; });
  var gameSealState = useGameStore(function (s) { return s.sealState; });
  var gameWeather = useGameStore(function (s) { return s.weather; });
  var gameCurrentSafehouse = useGameStore(function (s) { return s.currentSafehouse; });
  var gameStatsRun = useGameStore(function (s) { return s.stats_run; });
  var gameSkills = useGameStore(function (s) { return s.skills; });
  var gameObjectives = useGameStore(function (s) { return s.objectives; });
  var gameLongTermEffects = useGameStore(function (s) { return s.longTermEffects; });
  var gamePollution = useGameStore(function (s) { return s.pollution; });

  // Assemble game object — same field names and order as original app.jsx
  var game = useMemo(function () {
    return {
      ending: gameEnding, endingCoins: gameEndingCoins, loopShopTier: gameLoopShopTier,
      tutorialSeen: gameTutorialSeen, _level13GlitchScheduled: gameLevel13Glitch,
      accessibilityOptions: gameAccessibility, safehouseCorruption: gameSafehouseCorruption,
      glitchPulse: gameGlitchPulse,
      screen: screen, day: day, san: san,
      hp: gameHp, maxHp: gameMaxHp, ap: gameAp, maxAp: gameMaxAp,
      loopCount: loopCount, currentArea: currentArea,
      pollution: gamePollution, money: gameMoney, food: gameFood,
      inventory: gameInventory, clues: gameClues,
      narrative: gameNarrative, eventLog: gameEventLog,
      pendingEvent: gamePendingEvent, pendingNpc: gamePendingNpc,
      pendingGamble: gamePendingGamble, pendingChoice: gamePendingChoice,
      transition: gameTransition, madnessActive: gameMadnessActive,
      visitedAreas: gameVisitedAreas,
      sealState: gameSealState, weather: gameWeather,
      currentSafehouse: gameCurrentSafehouse,
      stats_run: gameStatsRun,
      skills: gameSkills, objectives: gameObjectives,
      longTermEffects: gameLongTermEffects,
      sanStage: sanStage,
    };
  }, [
    gameEnding, gameEndingCoins, gameLoopShopTier, gameTutorialSeen,
    gameLevel13Glitch, gameAccessibility, gameSafehouseCorruption, gameGlitchPulse,
    screen, day, san, loopCount, currentArea, sanStage,
    gameHp, gameMaxHp, gameAp, gameMaxAp, gamePollution, gameMoney, gameFood,
    gameInventory, gameClues, gameNarrative, gameEventLog,
    gamePendingEvent, gamePendingNpc, gamePendingGamble, gamePendingChoice,
    gameTransition, gameMadnessActive, gameVisitedAreas,
    gameSealState, gameWeather, gameCurrentSafehouse,
    gameStatsRun, gameSkills, gameObjectives, gameLongTermEffects,
  ]);

  // Preserve stateRef pattern used by dispatch wrapper
  var stateRef = useRef(game);
  stateRef.current = game;

  return { game: game, stateRef: stateRef, getDispatch: getDispatch };
}
