// src/app.jsx - 深渊低语：沃切斯特之影 游戏主逻辑
// All imports are stripped by build.py bundler at build time.
// In Vite (ESM), these imports resolve to real modules.
import React from 'react';
import ReactDOM from 'react-dom/client';

// Granular Zustand selectors — replaces useSyncExternalStore(getState())
import {
  useSan,
  useSanStageClasses,
  useDay,
  useLoopCount,
  useCurrentArea,
  useEnding,
  useEndingCoins,
  useLoopShopTier,
  useTutorialSeen,
  useLevel13GlitchScheduled,
  useAccessibilityOptions,
  useSafehouseCorruption,
  useGlitchPulse,
} from './state/selectors.js';
import { useScreen, getDispatch, useGameStore } from './state/useGameStore.js';

// ── Core reducers & systems ──
import { rand, d100, d3, clamp, pick, rollDice, shuffle } from './reducers/utils.js';

import { configureSaveManager, enforceSaveFormatFreeze } from './engine/SaveManager.js';
import { loadAchievements, saveAchievements, checkAchievements, getAchievementDef } from './reducers/achievementReducer.js';

import { shouldTriggerMissing600, createMissing600Event } from './data/events/events_missing_600.js';
import { checkOmens } from './data/events/events_omens_600.js';
import { initExtendedEvents } from './reducers/extendedEventsInit.js';

import { getGuideStep } from './systems/firstRunGuide.js';
import { getSanStageFeedback } from './systems/sanFeedback.js';

import { applyFearCorruption } from './systems/fearLens.js';

// ── Phase 1 custom hooks ──
import {
  useSeedStore,
  useMigrateOldSaves,
  useAudioSettingsInit,
  useAudioAutoplayUnlock,
  useReducedMotion,
  useNotebookTutorialSync,
  usePageZoom,
  useEndingCgPreload,
  useChapterLazyLoad,
  useAchievementCheck,
  useSanLossHint,
  useBootHint,
  useLevel13Glitch,
} from './hooks/index.js';

// ── Utilities ──

import { createSeededRng } from './utils/seededRng.js';
import { getCorruptionLevel } from './utils/gameHelpers.js';
import { createErrorTracker } from './utils/errorTracker.js';
import { SAVE_VERSION, migrateSaveData, toPersistedState } from './reducers/saveMigration.js';

// ── Engine DI: inject save migration into SaveManager (breaks engine → reducers/ dep) ──
configureSaveManager({ SAVE_VERSION, migrateSaveData, toPersistedState });

// ── Save format freeze ──
// Enforces the frozen save format spec at startup.
// Any structural drift will be logged to console for developers.
enforceSaveFormatFreeze();

// ── State stores ──
import { uiStore, useUiStore, addUiToast, removeUiToast, notifySave, updateSettings } from './state/uiStore.js';

// ── Event side effects (must be imported once to activate handlers) ──
import { setDispatch } from './runtime/eventSideEffects.js';
setDispatch(getDispatch());

// ── Components ──
import { UgcPanel } from './components/UgcImportExport.jsx';
import { Modal } from './components/GameCommon.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { InteractiveTownMap, HotspotNode, MapPaths } from './components/InteractiveTownMap.jsx';
import { AreaPanelModal } from './components/AreaPanelModal.jsx';
import { FloatingInfoBar, NarrativeFloatingPanel } from './components/FloatingInfoBar.jsx';
import { GameLayout } from './components/GameLayout.jsx';

import { audioManager } from './managers/AudioManager.js';
import { TitleScreen } from './components/TitleScreen.jsx';
import { AppToast } from './components/AppToast.jsx';
import { SettingsModal, SaveLoadModal, AchievementGallery } from './components/GameModals.jsx';
import { PrologueScreen, SurvivalGuide, CharCreation } from './components/GameScreens.jsx';
import { SanPollutionLayer, AbyssPopup } from './components/SanPollutionLayer.jsx';
import { DevPanel } from './components/ui/DevPanel.jsx';
import { ScreenTransition } from './components/ScreenTransition.jsx';
import {
  EndingScreen,
  GameHeader,
  LeftPanel,
  CenterPanel,
  RightPanel,
  NotebookModal,
} from './components/GamePanels.jsx';
import { ShopModal } from './components/ShopModal.jsx';

// GAME_DATA placeholder is replaced at build time by build.py.
// In Vite, __GAME_DATA__ is set on window by main.vite.jsx before this module loads.

const { useState, useEffect, useRef, useMemo, useCallback } = React;

const GD = initExtendedEvents(__GAME_DATA__);
/* [TRACKER-INIT] 初始化 — GD 之后，dispatch 之前 */
const errorTracker = createErrorTracker();
if (typeof window !== 'undefined') {
  window.errorTracker = errorTracker;
}

// checkSilentEvent moved to src/utils/appHelpers.js (now accepts GD as 4th param)

// checkKnowledgeEarned moved to src/utils/appHelpers.js

function getCorruptedSystemText(baseText, layer, rng) {
  // Fear lens corruption: prologue-derived fear-specific UI corruption
  // Applied before generic corruption
  var fearTuning = useGameStore.getState().fearTuning;
  if (layer > 0 && fearTuning && fearTuning.primary) {
    const fearCorrupted = applyFearCorruption({ fearTuning: fearTuning }, baseText, layer, rng);
    if (fearCorrupted !== baseText) return fearCorrupted;
  }
  var _rand = rng ? rng.next.bind(rng) : Math.random;
  if (layer <= 0 || _rand() > 0.3) return baseText;
  const corruptions = GD.systems?.ui_corruption?.layers;
  if (!corruptions) return baseText;
  const layerKey =
    'layer_' +
    layer +
    '_' +
    ['clean', 'fogged', 'repetitive', 'contradictory', 'hostile', 'abyssal'][Math.min(layer, 5)];
  const layerData = corruptions[layerKey];
  if (!layerData) return baseText;
  // Occasionally return a corrupted example instead
  if (layer >= 3 && _rand() < 0.15) {
    const ex = layerData.examples;
    if (ex) {
      const keys = Object.keys(ex);
      return ex[keys[Math.floor(_rand() * keys.length)]] || baseText;
    }
  }
  // Layer 1-2: append mild suffix
  if (layer === 1 && _rand() < 0.4) return baseText + '（你确定吗？）';
  if (layer === 2 && _rand() < 0.3) return baseText + ' / ' + baseText;
  return baseText;
}

// checkBreakWallEvent moved to src/utils/appHelpers.js (now accepts GD as 3rd param)

// GD is intentionally module-level: initialized once by initExtendedEvents.
// Store holds state._GD (same object ref). Prefer state._GD or props; never use window.GD (ADR-018).

/**
 * P0-3: Check if a critical progress guard should fire.
 * Called before normal event selection in EXPLORE.
 *
 * Returns a guard object if one should fire, or null.
 * Only considers guards that haven't already fired this run.
 *
 * @param {object} state - game state
 * @param {object} ctx - context with GD
 * @returns {object|null} guard entry to fire, or null
 */

/**
 * P0-3: Execute a forced progress guard.
 * Produces a gentle narrative nudge and marks the guard as fired.
 * Does NOT directly give the clue — it nudges the player toward the right area/event.
 *
 * @param {object} guard - guard entry from CRITICAL_PROGRESS_GUARDS
 * @param {object} state - game state (will be mutated)
 * @param {function} narr - narrative function
 */

// === STATE: Zustand granular selectors (Step 3 — no full-state subscription) ===
// State lives in useGameStore (Zustand + immer). Components subscribe via granular selectors.
// App uses useAppGameData() for game screen; individual components use their own selectors.

function App() {
  // Granular subscriptions — each hook re-renders only when its slice changes
  var screen = useScreen();
  var day = useDay();
  var loopCount = useLoopCount();
  var san = useSan();
  var currentArea = useCurrentArea();
  var sanStage = useSanStageClasses(true);
  // ── Granular selectors (replaces useAppGameData 34-field combined) ──
  var gameEnding = useEnding();
  var gameEndingCoins = useEndingCoins();
  var gameLoopShopTier = useLoopShopTier();
  var gameTutorialSeen = useTutorialSeen();
  var gameLevel13Glitch = useLevel13GlitchScheduled();
  var gameAccessibility = useAccessibilityOptions();
  var gameSafehouseCorruption = useSafehouseCorruption();
  var gameGlitchPulse = useGlitchPulse();

    // Combined game object for child components (built from granular subscriptions)
  // Fields for children (PrologueScreen, CharCreation, EndingScreen, DevPanel, ShopModal)
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
    };
  }, [gameEnding, gameEndingCoins, gameLoopShopTier, gameTutorialSeen,
      gameLevel13Glitch, gameAccessibility, gameSafehouseCorruption, gameGlitchPulse,
      screen, day, san, loopCount, currentArea,
      gameHp, gameMaxHp, gameAp, gameMaxAp, gamePollution, gameMoney, gameFood,
      gameInventory, gameClues, gameNarrative, gameEventLog,
      gamePendingEvent, gamePendingNpc, gamePendingGamble, gamePendingChoice,
      gameTransition, gameMadnessActive, gameVisitedAreas,
      gameSealState, gameWeather, gameCurrentSafehouse,
      gameStatsRun, gameSkills, gameObjectives, gameLongTermEffects]);var stateRef = React.useRef(game);
  stateRef.current = game;

  /* [TRACKER-DISPATCH] 包装 dispatch — 自动记录每步操作 */
  var dispatch = React.useCallback(function (action) {
    if (!action.meta) action.meta = {};
    if (!action.meta.actionId)
      action.meta.actionId = Date.now() + '_' + Math.random().toString(16).slice(2, 6);
    var currentState = stateRef.current;
    if (!action.meta.now) action.meta.now = Date.now();
    action.meta._actionIndex = (currentState._actionIndex || 0);
    errorTracker.record(action, currentState);
    // Zustand store dispatch: reducer → patch draft → flushEffects
    getDispatch()(action);
  }, []);

  // UI state from external store — use useMemo because Zustand 5 has no equalityFn
  var _uiSettingsOpen = useUiStore(function (s) { return s.settingsOpen; });
  var _uiSaveLoadOpen = useUiStore(function (s) { return s.saveLoadOpen; });
  var _uiSaveLoadMode = useUiStore(function (s) { return s.saveLoadMode; });
  var _uiAchOpen = useUiStore(function (s) { return s.achOpen; });
  var _uiUgcOpen = useUiStore(function (s) { return s.ugcOpen; });
  var _uiNotebookOpen = useUiStore(function (s) { return s.notebookOpen; });
  var _uiNotebookEverOpened = useUiStore(function (s) { return s.notebookEverOpened; });
  var _uiActiveShop = useUiStore(function (s) { return s.activeShop; });
  var _uiSettings = useUiStore(function (s) { return s.settings; });
  var _uiSaveTick = useUiStore(function (s) { return s.saveTick; });
  var _uiToasts = useUiStore(function (s) { return s.toasts; });
  var ui = useMemo(function () {
    return {
      settingsOpen: _uiSettingsOpen, saveLoadOpen: _uiSaveLoadOpen,
      saveLoadMode: _uiSaveLoadMode, achOpen: _uiAchOpen, ugcOpen: _uiUgcOpen,
      notebookOpen: _uiNotebookOpen, notebookEverOpened: _uiNotebookEverOpened,
      activeShop: _uiActiveShop,
      settings: _uiSettings, saveTick: _uiSaveTick, toasts: _uiToasts,
    };
  }, [_uiSettingsOpen, _uiSaveLoadOpen, _uiSaveLoadMode, _uiAchOpen, _uiUgcOpen,
      _uiNotebookOpen, _uiNotebookEverOpened, _uiActiveShop,
      _uiSettings, _uiSaveTick, _uiToasts]);
  const settings = ui.settings;
  const savedExists = useMemo(() => hasSave(), [ui.saveTick]);

  // ── Phase 1 custom hooks (replaces 13 useEffect blocks) ──
  useSeedStore(GD);
  useMigrateOldSaves();
  useAudioSettingsInit(settings);
  useAudioAutoplayUnlock();
  useNotebookTutorialSync(ui.notebookEverOpened, gameTutorialSeen, getDispatch());
  usePageZoom(settings);
  useEndingCgPreload(san, screen, sanStage);
  useChapterLazyLoad(GD, day, screen);
  useReducedMotion(settings);
  var l13IntervalRef = useLevel13Glitch(gameLevel13Glitch, screen, getDispatch());
  var bootHintVisible = useBootHint(screen, day);
  var sanHintVisible = useSanLossHint(san, screen);
  useAchievementCheck(game);

  const handleSettingsChange = (s) => {
    updateSettings(s);
    // Sync pollution settings to game state (initial values set in seedState)
    dispatch({ type: 'SET_META_FIELD', field: '_visualPollution', value: s.visualPollution ?? 50 });
    dispatch({ type: 'SET_META_FIELD', field: '_interactionPollution', value: s.interactionPollution ?? 50 });
    dispatch({ type: 'SET_META_FIELD', field: '_metaPollution', value: s.lightPollutionMode ? 25 : (s.metaPollution ?? 50) });
    if (s.lightPollutionMode) {
      dispatch({ type: 'SET_META_FIELD', field: '_visualPollution', value: 10 });
      dispatch({ type: 'SET_META_FIELD', field: '_interactionPollution', value: 5 });
    }
  };
  const fontSizeClass = 'narrative-size-' + settings.narrativeFontSize;
  const handleLoadSlot = (loaded) => {
    dispatch({ type: 'CONTINUE_GAME', savedState: loaded });
    notifySave('从存档中醒来', 'load');
  };

  // ── Compute game screen vars (needed when screen === 'game') ──
  const corrLevel = getCorruptionLevel(san, loopCount);
  const areas = GD.areas || GD.module2_areas || [];
  const visualDistortion = gameAccessibility?.visual_distortion;
  const allowVisualFX = visualDistortion !== false;
  const sanClasses = sanStage; // already computed by useSanStageClasses
  const sanFeedback = getSanStageFeedback(san, { GD });
  const _vtClass = sanClasses.vtClass;
  const sanStageClass = sanClasses.stageClass;
  const sanClass = sanClasses.sanClass;

  // ── Determine active screen key for ScreenTransition ──
  var _screenKey = gameEnding ? 'ending' : screen;

  return (
    <>
      {/* Screen content wrapped in ScreenTransition for animated switching */}
      <ScreenTransition screenKey={_screenKey} duration={800}>

        {screen === 'title' && (
          <TitleScreen
            onStart={() => dispatch({ type: 'START_GAME' })}
            saveExists={savedExists}
            onContinue={() => {
              useUiStore.setState({ saveLoadMode: 'load', saveLoadOpen: true });
            }}
            onSettingsOpen={() => useUiStore.setState({ settingsOpen: true })}
            onAchOpen={() => useUiStore.setState({ achOpen: true })}
            endingCoins={gameEndingCoins || 0}
            loopShopTier={gameLoopShopTier || 0}
            loopCount={loopCount || 0}
            onShopPurchase={(item) => {
              dispatch({ type: 'LOOP_SHOP_PURCHASE', itemId: item.id, cost: item.cost });
            }}
          />
        )}

        {screen === 'prologue' && (
          <PrologueScreen state={game} dispatch={dispatch} />
        )}

        {screen === 'guide' && (
          <SurvivalGuide onContinue={() => dispatch({ type: 'DISMISS_GUIDE' })} />
        )}

        {screen === 'creation' && (
          <CharCreation
            state={game}
            onRoll={() => dispatch({ type: 'ROLL_STATS' })}
            onStart={() => dispatch({ type: 'BEGIN_ADVENTURE' })}
            onSetDifficulty={(d) => dispatch({ type: 'SET_DIFFICULTY', difficulty: d })}
            onSetArchetype={(id) => dispatch({ type: 'SET_ARCHETYPE', archetypeId: id })}
          />
        )}

        {gameEnding && (
          <EndingScreen ending={gameEnding} state={game} dispatch={dispatch} />
        )}

        {screen === 'game' && !game.ending && (
          <>
            <DevPanel state={game} dispatch={dispatch} />
            <SanPollutionLayer
              san={san}
              loopCount={loopCount}
              corruption={gameSafehouseCorruption || 0}
              glitchPulse={gameGlitchPulse || 0}
              enabled={allowVisualFX}
              intensity={settings.visualPollution ?? 50}
              interactionPollution={settings.interactionPollution ?? 50}
              metaPollution={settings.metaPollution ?? 50}
            />
            <AbyssPopup san={san} onSanDrain={(amt) => dispatch({ type: 'RESIST_SAN_DRAIN', amount: amt })} />
            <div
              className={
                'game-root ' +
                (corrLevel > 0 ? 'corruption-' + corrLevel + ' ' : '') +
                sanClass +
                sanStageClass +
                _vtClass +
                ' ' +
                fontSizeClass
              }
            >
              {settings?.showGuideHints !== false && (() => {
                const _guide = getGuideStep(game, { GD });
                return _guide ? (
                  <div className="guide-hint" style={{
                    position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.85)', color: '#e0d5c0', padding: '10px 24px',
                    borderRadius: 8, fontSize: 14, zIndex: 1000, maxWidth: 440, textAlign: 'center',
                    border: '1px solid rgba(255,255,255,0.1)', pointerEvents: 'none',
                    fontStyle: 'italic', letterSpacing: '0.02em', lineHeight: 1.6,
                  }}>
                    <div>{_guide.message}</div>
                  </div>
                ) : null;
              })()}
              <GameLayout dispatch={dispatch} areas={areas} settings={settings} />
            </div>
          </>
        )}

      </ScreenTransition>

      {/* ── Global overlays & modals (outside transition, always available) ── */}
      <SettingsModal
        open={ui.settingsOpen}
        onClose={() => useUiStore.setState({ settingsOpen: false })}
        settings={settings}
        onChange={handleSettingsChange}
        onAchOpen={() => useUiStore.setState({ achOpen: true })}
        onSaveOpen={() => useUiStore.setState({ saveLoadMode: 'save', saveLoadOpen: true })}
        onLoadOpen={() => useUiStore.setState({ saveLoadMode: 'load', saveLoadOpen: true })}
        dispatch={dispatch}
      />
      <SaveLoadModal
        open={ui.saveLoadOpen}
        onClose={() => useUiStore.setState({ saveLoadOpen: false })}
        state={screen === 'game' ? game : null}
        onLoad={handleLoadSlot}
        mode={ui.saveLoadMode}
        onSaved={notifySave}
      />
      <AchievementGallery open={ui.achOpen} onClose={() => useUiStore.setState({ achOpen: false })} />
      <NotebookModal
        open={!!ui.notebookOpen}
        onClose={() => useUiStore.setState({ notebookOpen: false })}
        state={game}
      />
      <ShopModal
        open={!!ui.activeShop}
        shopId={ui.activeShop}
        onClose={() => useUiStore.setState({ activeShop: null })}
        state={game}
        ctx={{ GD }}
        onPurchase={function (shopId, item) {
          dispatch({ type: 'BUY_FROM_SHOP', shopId: shopId, itemId: item.id });
        }}
      />
      {ui.ugcOpen && (
        <Modal
          open={ui.ugcOpen}
          onClose={() => useUiStore.setState({ ugcOpen: false })}
          title="模组管理"
          width="720px"
        >
          <UgcPanel onClose={() => useUiStore.setState({ ugcOpen: false })} GD={GD} />
        </Modal>
      )}
      {ui.toasts.length > 0 && (
        <div className="achievement-toast-container">
          {ui.toasts.map((t) => (
            <AppToast key={t.key} toast={t} onDismiss={() => removeUiToast(t.key)} />
          ))}
        </div>
      )}

      {/* ── 轻提示：前传结束 → 正片 ── */}
      {bootHintVisible && screen === 'game' && (
        <div className="boot-hint">按 M 切换布局 · 按 J 打开笔记本</div>
      )}

      {/* ── 轻提示：第一次掉 SAN ── */}
      {sanHintVisible && screen === 'game' && (
        <div className="san-hint">理智正在流失，世界会逐渐发生变化</div>
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
