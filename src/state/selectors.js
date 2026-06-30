// src/state/selectors.js — Fine-grained Zustand selectors
//
// CRITICAL: Zustand 5.0.14 does NOT support equalityFn (it's silently ignored).
// React's useSyncExternalStore compares with Object.is (reference equality).
// Every selector returning an object/array MUST use useMemo to cache the result.
// All selector functions must be defined at module level (stable refs).

import { useGameStore } from './useGameStore.js';
import { getVisualForSan, getSanStageClasses, getPerceptionLevels } from '../systems/sanityVisual.js';
import { getNpcTrust, getDisplayedAp, getAvailableSafehouses } from '../utils/appHelpers.js';

var useMemo = React.useMemo;

// ── Module-level selector functions (stable references) ──

var _selSan = function (s) { return s.san; };
var _selCurrentArea = function (s) { return s.currentArea || ''; };
var _selVisitedCount = function (s) { return (s.visitedAreas || []).length; };
var _selWeather = function (s) { return s.weather || ''; };
var _selSafehouseCorruption = function (s) { return s.safehouseCorruption || 0; };
var _selSealState = function (s) { return s.sealState || ''; };
var _selMythosLevel = function (s) { return s.mythosLevel || 0; };
var _selEventLogLength = function (s) { return (s.eventLog || []).length; };
var _selNarrativeText = function (s) { return (s.narrative || []).map(function (n) { return n.text; }).join('\n'); };
var _selDay = function (s) { return s.day || 1; };
var _selLoopCount = function (s) { return s.loopCount || 0; };
var _selCurrentChapter = function (s) { return s.currentChapter || ''; };
var _selFood = function (s) { return s.food != null ? s.food : 0; };
var _selMoney = function (s) { return s.money != null ? s.money : 0; };
var _selPollution = function (s) { return s.pollution != null ? s.pollution : 0; };
var _selHumanityScore = function (s) { return s.humanityScore != null ? s.humanityScore : 0; };
var _selMadnessActive = function (s) { return !!s.madnessActive; };
var _selLongTermEffectsCount = function (s) { return (s.longTermEffects || []).length; };

// ── Public selectors ──

// SAN / Visual — use useMemo because Zustand 5 has no equalityFn
export function useSan() { return useGameStore(_selSan); }
export function useSanVisual() {
  var san = useGameStore(_selSan);
  return useMemo(function () { return getVisualForSan(san); }, [san]);
}
export function useSanStageClasses(allowVisualFX) {
  var san = useGameStore(_selSan);
  return useMemo(function () {
    return getSanStageClasses(san, allowVisualFX, { GD: window.GD || {} });
  }, [san, allowVisualFX]);
}
export function usePerceptionLevels() {
  var san = useGameStore(_selSan);
  var loopCount = useGameStore(_selLoopCount);
  var safehouseCorruption = useGameStore(_selSafehouseCorruption);
  var mythosLevel = useGameStore(_selMythosLevel);
  var pollution = useGameStore(_selPollution);
  return useMemo(function () {
    return getPerceptionLevels({ san: san, loopCount: loopCount, safehouseCorruption: safehouseCorruption, mythosLevel: mythosLevel, pollution: pollution });
  }, [san, loopCount, safehouseCorruption, mythosLevel, pollution]);
}
export function useSanLevel() {
  var san = useGameStore(_selSan);
  return useMemo(function () { return getVisualForSan(san).level; }, [san]);
}

// Character — subscribe to primitives, useMemo to create objects
export function useHp() {
  var hp = useGameStore(function (s) { return s.hp; });
  var maxHp = useGameStore(function (s) { return s.maxHp; });
  return useMemo(function () { return { hp: hp, maxHp: maxHp }; }, [hp, maxHp]);
}
export function useAp() {
  var ap = useGameStore(function (s) { return s.ap; });
  var maxAp = useGameStore(function (s) { return s.maxAp; });
  return useMemo(function () { return { ap: ap, maxAp: maxAp }; }, [ap, maxAp]);
}
export function useInventory() {
  return useGameStore(function (s) { return s.inventory || []; });
}
export function useClues() {
  return useGameStore(function (s) { return s.clues || []; });
}
export function useSkills() {
  return useGameStore(function (s) { return s.skills || {}; });
}

// World
export function useCurrentArea() { return useGameStore(_selCurrentArea); }
export function useVisitedCount() { return useGameStore(_selVisitedCount); }
export function useWeather() { return useGameStore(_selWeather); }
export function useSafehouseCorruption() { return useGameStore(_selSafehouseCorruption); }
export function useSealState() { return useGameStore(_selSealState); }
export function useMythosLevel() { return useGameStore(_selMythosLevel); }

// NPC
export function useNpcTrust(npcId) {
  return useGameStore(function (s) { return getNpcTrust(s, npcId); });
}
export function useAllNpcTrust() {
  return useGameStore(function (s) { return s.npcTrust || {}; });
}
export function useNpcState(npcId) {
  return useGameStore(function (s) { return (s.npcStates || {})[npcId] || null; });
}

// Event / Narrative
export function useEventLog() {
  return useGameStore(function (s) { return s.eventLog || []; });
}
export function useEventLogLength() { return useGameStore(_selEventLogLength); }
export function useRecentEventLog(n) {
  var count = n || 10;
  return useGameStore(function (s) { return (s.eventLog || []).slice(-count); });
}
export function useNarrative() {
  return useGameStore(function (s) { return s.narrative || []; });
}
export function useNarrativeText() { return useGameStore(_selNarrativeText); }

// Progress
export function useDay() { return useGameStore(_selDay); }
export function useLoopCount() { return useGameStore(_selLoopCount); }
export function useCurrentChapter() { return useGameStore(_selCurrentChapter); }
export function useObjectives() {
  return useGameStore(function (s) { return s.objectives || []; });
}
export function useTriggeredEvents() {
  return useGameStore(function (s) { return s.triggeredEvents || []; });
}

// Resources
export function useFood() { return useGameStore(_selFood); }
export function useMoney() { return useGameStore(_selMoney); }
export function usePollution() { return useGameStore(_selPollution); }
export function useHumanityScore() { return useGameStore(_selHumanityScore); }

// UI state
export function useUiState(selector) {
  var _useUiStore = require('./uiStore.js').useUiStore;
  if (selector) return _useUiStore(selector);
  return _useUiStore();
}
export function useUiModal(modalKey) {
  var _useUiStore = require('./uiStore.js').useUiStore;
  return _useUiStore(function (s) { return s[modalKey]; });
}

// Derived
export function useEventTriggered(eventId) {
  return useGameStore(function (s) { return (s.triggeredEvents || []).indexOf(eventId) >= 0; });
}
export function useLongTermEffectsCount() { return useGameStore(_selLongTermEffectsCount); }
export function useMadnessActive() { return useGameStore(_selMadnessActive); }

// ── Combined selectors ──
// CRITICAL: subscribe to primitives only, use useMemo to create the combined object.
// Zustand 5.0.14 has no equalityFn; React's Object.is sees new objects as changes.

export function useAppGameData() {
  var screen = useGameStore(function (s) { return s.screen; });
  var day = useGameStore(_selDay);
  var san = useGameStore(_selSan);
  var hp = useGameStore(function (s) { return s.hp; });
  var maxHp = useGameStore(function (s) { return s.maxHp; });
  var ap = useGameStore(function (s) { return s.ap; });
  var maxAp = useGameStore(function (s) { return s.maxAp; });
  var loopCount = useGameStore(_selLoopCount);
  var currentArea = useGameStore(_selCurrentArea);
  var safehouseCorruption = useGameStore(_selSafehouseCorruption);
  var pollution = useGameStore(_selPollution);
  var money = useGameStore(_selMoney);
  var food = useGameStore(_selFood);
  var inventory = useGameStore(function (s) { return s.inventory; });
  var clues = useGameStore(function (s) { return s.clues; });
  var narrative = useGameStore(function (s) { return s.narrative; });
  var eventLog = useGameStore(function (s) { return s.eventLog; });
  var pendingEvent = useGameStore(function (s) { return s.pendingEvent; });
  var pendingNpc = useGameStore(function (s) { return s.pendingNpc; });
  var pendingGamble = useGameStore(function (s) { return s.pendingGamble; });
  var pendingChoice = useGameStore(function (s) { return s.pendingChoice; });
  var transition = useGameStore(function (s) { return s.transition; });
  var madnessActive = useGameStore(_selMadnessActive);
  var ending = useGameStore(function (s) { return s.ending; });
  var endingCoins = useGameStore(function (s) { return s.endingCoins; });
  var loopShopTier = useGameStore(function (s) { return s.loopShopTier; });
  var visitedAreas = useGameStore(function (s) { return s.visitedAreas; });
  var sealState = useGameStore(_selSealState);
  var weather = useGameStore(_selWeather);
  var currentSafehouse = useGameStore(function (s) { return s.currentSafehouse; });
  var _level13GlitchScheduled = useGameStore(function (s) { return s._level13GlitchScheduled; });
  var glitchPulse = useGameStore(function (s) { return s.glitchPulse; });
  var stats_run = useGameStore(function (s) { return s.stats_run; });
  var accessibilityOptions = useGameStore(function (s) { return s.accessibilityOptions; });

  return useMemo(function () {
    return {
      screen: screen, day: day, san: san, hp: hp, maxHp: maxHp,
      ap: ap, maxAp: maxAp, loopCount: loopCount, currentArea: currentArea,
      safehouseCorruption: safehouseCorruption, pollution: pollution,
      money: money, food: food, inventory: inventory, clues: clues,
      narrative: narrative, eventLog: eventLog,
      pendingEvent: pendingEvent, pendingNpc: pendingNpc,
      pendingGamble: pendingGamble, pendingChoice: pendingChoice,
      transition: transition, madnessActive: madnessActive,
      ending: ending, endingCoins: endingCoins, loopShopTier: loopShopTier,
      visitedAreas: visitedAreas, sealState: sealState, weather: weather,
      currentSafehouse: currentSafehouse,
      _level13GlitchScheduled: _level13GlitchScheduled, glitchPulse: glitchPulse,
      stats_run: stats_run, accessibilityOptions: accessibilityOptions,
    };
  }, [screen, day, san, hp, maxHp, ap, maxAp, loopCount, currentArea,
      safehouseCorruption, pollution, money, food, inventory, clues,
      narrative, eventLog, pendingEvent, pendingNpc, pendingGamble, pendingChoice,
      transition, madnessActive, ending, endingCoins, loopShopTier, visitedAreas,
      sealState, weather, currentSafehouse, _level13GlitchScheduled, glitchPulse,
      stats_run, accessibilityOptions]);
}

// Other batch selectors — use useMemo for the same reason
export function useGameLayoutData() {
  var screen = useGameStore(function (s) { return s.screen; });
  var day = useGameStore(_selDay);
  var loopCount = useGameStore(_selLoopCount);
  var currentArea = useGameStore(_selCurrentArea);
  var ap = useGameStore(function (s) { return s.ap; });
  var maxAp = useGameStore(function (s) { return s.maxAp; });
  var san = useGameStore(_selSan);
  var audioMuted = useGameStore(function (s) { return s.audioMuted; });
  var deathContext = useGameStore(function (s) { return s.deathContext; });
  var _level13GlitchScheduled = useGameStore(function (s) { return s._level13GlitchScheduled; });
  var tutorialSeen = useGameStore(function (s) { return s.tutorialSeen; });
  var currentSafehouse = useGameStore(function (s) { return s.currentSafehouse; });
  return useMemo(function () {
    return {
      screen: screen, day: day, loopCount: loopCount, currentArea: currentArea,
      ap: ap, maxAp: maxAp, san: san, audioMuted: audioMuted,
      deathContext: deathContext, _level13GlitchScheduled: _level13GlitchScheduled,
      tutorialSeen: tutorialSeen, currentSafehouse: currentSafehouse,
    };
  }, [screen, day, loopCount, currentArea, ap, maxAp, san, audioMuted,
      deathContext, _level13GlitchScheduled, tutorialSeen, currentSafehouse]);
}

export function useCenterPanelData() {
  var ap = useGameStore(function (s) { return s.ap; });
  var maxAp = useGameStore(function (s) { return s.maxAp; });
  var san = useGameStore(_selSan);
  var hp = useGameStore(function (s) { return s.hp; });
  var maxHp = useGameStore(function (s) { return s.maxHp; });
  var food = useGameStore(_selFood);
  var money = useGameStore(_selMoney);
  var currentArea = useGameStore(_selCurrentArea);
  var day = useGameStore(_selDay);
  var loopCount = useGameStore(_selLoopCount);
  var inventory = useGameStore(function (s) { return s.inventory; });
  var clues = useGameStore(function (s) { return s.clues; });
  var narrative = useGameStore(function (s) { return s.narrative; });
  var eventLog = useGameStore(function (s) { return s.eventLog; });
  var pendingEvent = useGameStore(function (s) { return s.pendingEvent; });
  var pendingNpc = useGameStore(function (s) { return s.pendingNpc; });
  var pendingGamble = useGameStore(function (s) { return s.pendingGamble; });
  var pendingChoice = useGameStore(function (s) { return s.pendingChoice; });
  var transition = useGameStore(function (s) { return s.transition; });
  var madnessActive = useGameStore(_selMadnessActive);
  var ending = useGameStore(function (s) { return s.ending; });
  var skills = useGameStore(function (s) { return s.skills; });
  var pollution = useGameStore(_selPollution);
  var safehouseCorruption = useGameStore(_selSafehouseCorruption);
  var currentSafehouse = useGameStore(function (s) { return s.currentSafehouse; });
  var objectives = useGameStore(function (s) { return s.objectives; });
  var longTermEffects = useGameStore(function (s) { return s.longTermEffects; });
  return useMemo(function () {
    return {
      ap: ap, maxAp: maxAp, san: san, hp: hp, maxHp: maxHp,
      food: food, money: money, currentArea: currentArea, day: day,
      loopCount: loopCount, inventory: inventory, clues: clues,
      narrative: narrative, eventLog: eventLog,
      pendingEvent: pendingEvent, pendingNpc: pendingNpc,
      pendingGamble: pendingGamble, pendingChoice: pendingChoice,
      transition: transition, madnessActive: madnessActive, ending: ending,
      skills: skills, pollution: pollution, safehouseCorruption: safehouseCorruption,
      currentSafehouse: currentSafehouse, objectives: objectives,
      longTermEffects: longTermEffects,
    };
  }, [ap, maxAp, san, hp, maxHp, food, money, currentArea, day, loopCount,
      inventory, clues, narrative, eventLog, pendingEvent, pendingNpc,
      pendingGamble, pendingChoice, transition, madnessActive, ending,
      skills, pollution, safehouseCorruption, currentSafehouse, objectives,
      longTermEffects]);
}

export function useLeftPanelDataFull() {
  var san = useGameStore(_selSan);
  var hp = useGameStore(function (s) { return s.hp; });
  var maxHp = useGameStore(function (s) { return s.maxHp; });
  var pollution = useGameStore(_selPollution);
  var loopCount = useGameStore(_selLoopCount);
  var madnessActive = useGameStore(_selMadnessActive);
  var sealState = useGameStore(_selSealState);
  var safehouseCorruption = useGameStore(_selSafehouseCorruption);
  var currentSafehouse = useGameStore(function (s) { return s.currentSafehouse; });
  var weather = useGameStore(_selWeather);
  var food = useGameStore(_selFood);
  var money = useGameStore(_selMoney);
  var inventory = useGameStore(function (s) { return s.inventory; });
  var clues = useGameStore(function (s) { return s.clues; });
  var skills = useGameStore(function (s) { return s.skills; });
  var stats = useGameStore(function (s) { return s.stats; });
  var objectives = useGameStore(function (s) { return s.objectives; });
  var longTermEffects = useGameStore(function (s) { return s.longTermEffects; });
  var currentArea = useGameStore(_selCurrentArea);
  return useMemo(function () {
    return {
      san: san, hp: hp, maxHp: maxHp, pollution: pollution,
      loopCount: loopCount, madnessActive: madnessActive, sealState: sealState,
      safehouseCorruption: safehouseCorruption, currentSafehouse: currentSafehouse,
      weather: weather, food: food, money: money, inventory: inventory,
      clues: clues, skills: skills, stats: stats, objectives: objectives,
      longTermEffects: longTermEffects, currentArea: currentArea,
    };
  }, [san, hp, maxHp, pollution, loopCount, madnessActive, sealState,
      safehouseCorruption, currentSafehouse, weather, food, money, inventory,
      clues, skills, stats, objectives, longTermEffects, currentArea]);
}

export function useGameHeaderData() {
  var day = useGameStore(_selDay);
  var ap = useGameStore(function (s) { return s.ap; });
  var maxAp = useGameStore(function (s) { return s.maxAp; });
  var san = useGameStore(_selSan);
  var hp = useGameStore(function (s) { return s.hp; });
  var maxHp = useGameStore(function (s) { return s.maxHp; });
  var food = useGameStore(_selFood);
  var money = useGameStore(_selMoney);
  var loopCount = useGameStore(_selLoopCount);
  var currentArea = useGameStore(_selCurrentArea);
  return useMemo(function () {
    return {
      day: day, ap: ap, maxAp: maxAp, san: san,
      hp: hp, maxHp: maxHp, food: food, money: money,
      loopCount: loopCount, currentArea: currentArea,
    };
  }, [day, ap, maxAp, san, hp, maxHp, food, money, loopCount, currentArea]);
}

export function useLeftPanelData() {
  var sealState = useGameStore(_selSealState);
  var safehouseCorruption = useGameStore(_selSafehouseCorruption);
  var currentSafehouse = useGameStore(function (s) { return s.currentSafehouse; });
  var pollution = useGameStore(_selPollution);
  var weather = useGameStore(_selWeather);
  var san = useGameStore(_selSan);
  var loopCount = useGameStore(_selLoopCount);
  return useMemo(function () {
    return {
      sealState: sealState, safehouseCorruption: safehouseCorruption,
      currentSafehouse: currentSafehouse, pollution: pollution,
      weather: weather, san: san, loopCount: loopCount,
    };
  }, [sealState, safehouseCorruption, currentSafehouse, pollution, weather, san, loopCount]);
}