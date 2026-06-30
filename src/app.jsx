// src/app.jsx - 深渊低语：沃切斯特之影 游戏主逻辑
// All imports are stripped by build.py bundler at build time.
// In Vite (ESM), these imports resolve to real modules.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { produce } from 'immer';

// Granular Zustand selectors — replaces useSyncExternalStore(getState())
import {
  useAppGameData,
  useSan,
  useSanStageClasses,
  useDay,
  useLoopCount,
  useCurrentArea,
} from './state/selectors.js';
import { useScreen, getDispatch, seedGameStore, useGameStore } from './state/useGameStore.js';

// ── Core reducers & systems ──
import { rand, d100, d3, clamp, pick, rollDice, shuffle } from './reducers/utils.js';
import {
  getPhase,
  getSealState,
  getSealStateId,
  getWeather,
  getAreaInfo,
  getConnectedAreas,
} from './engine/WorldTimeSystem.js';
import { getDistortedName } from './systems/textVariants.js';
import {
  getSanTextVariant,
  getSanSceneVariant,
  processSanLoss,
  rollMadness,
} from './reducers/sanReducer.js';
import {
  getSafehouseStage,
  processSafehouseNight,
  getItemDef,
  useItemByDef,
  loadSettings,
  saveSettings,
} from './reducers/miscReducer.js';
import {
  checkTrigger,
  selectEvent,
  doSkillCheck,
  getGambleOptions,
  processNormalAnchorEvent,
} from './reducers/eventReducer.js';
import { applyEffects, applyLegacyEffects } from './reducers/effectReducer.js';
import { genObjectives, checkObjCompletion } from './reducers/objectiveReducer.js';
import {
  saveGame,
  loadGame,
  clearSave,
  hasSave,
  getAllSlots,
  autoSave,
  manualSave,
  loadSlot,
  deleteSlotById,
  migrateOldSave,
  exportSave,
  importSave,
  configureSaveManager,
  enforceSaveFormatFreeze,
  validateSaveFormat,
} from './engine/SaveManager.js';
import {
  loadAchievements,
  saveAchievements,
  checkAchievements,
  getAchievementDef,
  getAllAchievements,
  incrementStat,
  resetRunStats,
} from './reducers/achievementReducer.js';
import { getPollutionText, initLoopState } from './reducers/loopReducer.js';
import {
  getChapterForDay,
  getMythosCap,
  getChapterAlias,
  checkChapterTransition,
  getMotifFlavorText,
  getMonsterManifestation,
} from './reducers/chapterReducer.js';
import { checkConclusions, checkFalseInterpretations } from './reducers/conclusionReducer.js';
import { checkEnding } from './reducers/endingReducer.js';
import {
  checkNPCCorruption,
  applyNPCCorruption,
  setCorruptionFlag,
} from './reducers/npcReducer.js';
import {
  selectEventV2,
  checkTriggerExtended,
  resetDailyCategoryCounts,
  buildPreviousRunSummary,
  applyExtendedEffect,
  getEligibleEvents,
  chooseWeightedEvent,
  commitSelectedEvent,
  getEventWeight,
} from './reducers/extendedEvents.js';
import {
  ensureExtendedState,
  mergeExtendedEvents,
  loadChapterData,
} from './reducers/extendedEventsLoader.js';
import { shouldTriggerMissing600, createMissing600Event } from './data/events_missing_600.js';
import { checkOmens } from './data/events_omens_600.js';
import { initExtendedEvents } from './reducers/extendedEventsInit.js';
import { resolveDeath } from './reducers/deathSystem.js';
import { getGuideStep } from './systems/firstRunGuide.js';
import { getSanLossPresentation, getSanStageFeedback } from './systems/sanFeedback.js';
import { PROLOGUE_EVENTS } from './data/prologue_events.js';
import {
  initPrologueState,
  handlePrologueChoice,
  handleSkipPrologue,
  getPrologueEvent,
  getPrologueSceneOrder,
} from './reducers/prologueReducer.js';
import {
  getFearEventWeightModifier,
  applyFearLens,
  getFearNpcLine,
  applyFearCorruption,
} from './systems/fearLens.js';

// ── Engine & runtime ──
import { recordActionHistory } from './engine/EventEngine.js';
import { runPostReducerEffects } from './runtime/effectExecutor.js';

// ── Reducer slice handlers ──
import { handleCoreAction } from './reducers/slices/coreSlice.js';
import { handleExploreAction } from './reducers/slices/exploreSlice.js';
import { handleNpcAction } from './reducers/slices/npcSlice.js';
import { handleDailyAction } from './reducers/slices/dailySlice.js';
import { handleDarkAction } from './reducers/slices/darkSlice.js';
import { handleUiAction } from './reducers/slices/uiSlice.js';

// ── Utilities ──
import { addRunMemory, preloadEndingCGs, buildReducerCtx, checkKnowledgeEarned, checkBreakWallEvent, checkSilentEvent } from './utils/appHelpers.js';
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
import { useSanVisual, useSanLevel, useNpcTrust, useEventLogLength } from './state/selectors.js';

// ── Event side effects (must be imported once to activate handlers) ──
import './runtime/eventSideEffects.js';

// ── Components ──
import { UgcPanel } from './components/UgcImportExport.jsx';
import { Modal } from './components/GameCommon.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { InteractiveTownMap, HotspotNode, MapPaths } from './components/InteractiveTownMap.jsx';
import { AreaPanelModal } from './components/AreaPanelModal.jsx';
import { FloatingInfoBar, NarrativeFloatingPanel } from './components/FloatingInfoBar.jsx';
import { GameLayout } from './components/GameLayout.jsx';
import {
  TOWN_HOTSPOTS,
  getVisibleHotspots,
  isHotspotUnlocked,
  getHotspotState,
} from './data/townHotspots.js';
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

// GAME_DATA placeholder is replaced at build time by build.py.
// In Vite, __GAME_DATA__ is set on window by main.vite.jsx before this module loads.

const { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, memo } = React;

const GD = initExtendedEvents(__GAME_DATA__);
const ctx = { GD };
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
  if (layer > 0 && _currentFearTuning && _currentFearTuning.primary) {
    const fearCorrupted = applyFearCorruption({ fearTuning: _currentFearTuning }, baseText, layer, rng);
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

// Fear lens: module-level reference for corruption function
let _currentFearTuning = null;

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
  var game = useAppGameData(); // combined: hp, ap, inventory, narrative, etc.

  var stateRef = React.useRef(game);
  stateRef.current = game;
  // Seed Zustand store on mount (may already be seeded by main.jsx in dev mode)
  React.useEffect(function () {
    var storeState = useGameStore.getState();
    if (!storeState._GD) {
      seedGameStore(GD);
    }
    // 移除加载层
    var ls = document.getElementById('loading-screen');
    if (ls) {
      ls.classList.add('fade-out');
      setTimeout(function () { ls.remove(); }, 700);
    }
  }, []);

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
  var _uiSettings = useUiStore(function (s) { return s.settings; });
  var _uiSaveTick = useUiStore(function (s) { return s.saveTick; });
  var _uiToasts = useUiStore(function (s) { return s.toasts; });
  var ui = useMemo(function () {
    return {
      settingsOpen: _uiSettingsOpen, saveLoadOpen: _uiSaveLoadOpen,
      saveLoadMode: _uiSaveLoadMode, achOpen: _uiAchOpen, ugcOpen: _uiUgcOpen,
      notebookOpen: _uiNotebookOpen, notebookEverOpened: _uiNotebookEverOpened,
      settings: _uiSettings, saveTick: _uiSaveTick, toasts: _uiToasts,
    };
  }, [_uiSettingsOpen, _uiSaveLoadOpen, _uiSaveLoadMode, _uiAchOpen, _uiUgcOpen,
      _uiNotebookOpen, _uiNotebookEverOpened, _uiSettings, _uiSaveTick, _uiToasts]);
  const settings = ui.settings;
  const savedExists = useMemo(() => hasSave(), [ui.saveTick]);

  // Achievement checking
  useEffect(() => {
    const achData = loadAchievements();
    const newUnlocks = checkAchievements(game, achData.unlocked, achData.stats);
    if (newUnlocks.length > 0) {
      achData.unlocked.push(...newUnlocks);
      saveAchievements(achData);
      newUnlocks.forEach((id) => {
        const def = getAchievementDef(id);
        if (def) addUiToast({ id, def, type: 'achievement' });
      });
    }
  }, [day, game.ending, (game.visitedAreas || []).length, (game.clues || []).length]);

  useEffect(() => {
    migrateOldSave();
  }, []);

  useEffect(() => {
    audioManager._volumeScale = settings.volume / 100;
    audioManager._userVolumeScale = settings.volume / 100;
    audioManager._ambientScale = (settings.ambientVolume ?? 80) / 100;
    audioManager._effectScale = (settings.effectVolume ?? 80) / 100;
    audioManager._uiScale = (settings.uiVolume ?? 80) / 100;
    audioManager.suddenMuted = !settings.suddenSounds;
  }, []); // Audio settings only — game state sync moved to seedState

  // 笔记本打开 → 同步标记引导已读（uiStore → game state）
  useEffect(() => {
    if (ui.notebookEverOpened && !(game.tutorialSeen || {}).notebook_opened) {
      dispatch({ type: 'MARK_NOTEBOOK_OPENED' });
    }
  }, [ui.notebookEverOpened]);

  // 页面缩放初始化：基础 zoom 1.1x，slider 100 = 1.1x 实际缩放
  useEffect(() => {
    var BASE_ZOOM = 1.1;
    var scale = settings.pageScale ?? 100;
    var actualZoom = (scale / 100) * BASE_ZOOM;
    document.documentElement.style.zoom = actualZoom.toString();
    // 防止缩放 >1 时出现滚动条 (clip 不创建滚动容器，不影响 fixed 定位子元素)
    // Safari <16 不支持 clip，hidden 作为 fallback
    document.documentElement.style.overflow = 'clip';
    document.body.style.overflow = 'clip';
  }, [settings.pageScale]);

  // Audio autoplay unlock: browsers block audio until first user gesture
  useEffect(() => {
    var handler = function () {
      audioManager.unlock();
      window.removeEventListener('click', handler);
      window.removeEventListener('touchstart', handler);
      window.removeEventListener('keydown', handler);
    };
    window.addEventListener('click', handler, { once: false });
    window.addEventListener('touchstart', handler, { once: false });
    window.addEventListener('keydown', handler, { once: false });
    return function () {
      window.removeEventListener('click', handler);
      window.removeEventListener('touchstart', handler);
      window.removeEventListener('keydown', handler);
    };
  }, []);

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

  // 结局CG预加载：SAN < 30 时静默预加载，暗示结局临近
  // P1-A: SSOT — preload ending CGs at explanation_loss (level >= 3)
  useEffect(() => {
    if (screen === 'game' && sanStage.level >= 3) preloadEndingCGs();
  }, [san, screen]);

  // Lazy-load ch2+ game data (web mode only — skipped if already merged at build time)
  // Chapter-gated: load ch2+ at day 5, meta at day 10 (reduces initial load)
  useEffect(() => {
    if (screen !== 'game') return;
    if (!GD._extendedEventsLoaded) return;
    try {
      if (day >= 5) loadChapterData(GD, 'ch2plus', 'game_ch2plus.json');
      if (day >= 10) loadChapterData(GD, 'meta', 'game_meta.json');
    } catch (e) {
      /* non-fatal: game continues with existing data */
    }
  }, [day, screen]);

  // SAN visual corruption: now handled by <SanPollutionLayer> component (see render below)

  // ── Reduced motion: sync settings → body data attribute ──
  useEffect(() => {
    try {
      document.body.setAttribute(
        'data-reduced-motion',
        settings.reducedMotion ? 'true' : 'false'
      );
    } catch (e) {}
  }, [settings.reducedMotion]);

  // Level 13 (十三钟响): periodic reality distortion glitch pulses
  const l13IntervalRef = useRef(null);
  useEffect(function () {
    if (game._level13GlitchScheduled && screen === 'game' && !l13IntervalRef.current) {
      l13IntervalRef.current = setInterval(function () {
        if (Math.random() < 0.5) {
          dispatch({ type: 'GLITCH_PULSE', strength: 3 + Math.floor(Math.random() * 5) });
        }
      }, 15000 + Math.floor(Math.random() * 10000));
    }
    if (!game._level13GlitchScheduled && l13IntervalRef.current) {
      clearInterval(l13IntervalRef.current);
      l13IntervalRef.current = null;
    }
    return function () {
      if (l13IntervalRef.current) {
        clearInterval(l13IntervalRef.current);
        l13IntervalRef.current = null;
      }
    };
  }, [game._level13GlitchScheduled, screen]);

  // ── 轻提示：前传结束进入正片时 ──
  const bootHintShown = useRef(false);
  const [bootHintVisible, setBootHintVisible] = useState(false);
  useEffect(() => {
    if (screen === 'game' && day === 1 && !bootHintShown.current) {
      bootHintShown.current = true;
      setBootHintVisible(true);
      var t = setTimeout(function () { setBootHintVisible(false); }, 8000);
      return function () { clearTimeout(t); };
    }
  }, [screen, day]);

  // ── 轻提示：第一次掉 SAN ──
  const sanHintShown = useRef(false);
  const [sanHintVisible, setSanHintVisible] = useState(false);
  useEffect(() => {
    if (screen === 'game' && san < 75 && !sanHintShown.current) {
      sanHintShown.current = true;
      setSanHintVisible(true);
      var t = setTimeout(function () { setSanHintVisible(false); }, 2500);
      return function () { clearTimeout(t); };
    }
  }, [san, screen]);

  // ── Compute game screen vars (needed when screen === 'game') ──
  const corrLevel = getCorruptionLevel(san, loopCount);
  const areas = GD.areas || GD.module2_areas || [];
  const visualDistortion = game.accessibilityOptions?.visual_distortion;
  const allowVisualFX = visualDistortion !== false;
  const sanClasses = sanStage; // already computed by useSanStageClasses
  const sanFeedback = getSanStageFeedback(san, ctx);
  const _vtClass = sanClasses.vtClass;
  const sanStageClass = sanClasses.stageClass;
  const sanClass = sanClasses.sanClass;

  // ── Determine active screen key for ScreenTransition ──
  var _screenKey = game.ending ? 'ending' : screen;

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
            endingCoins={game.endingCoins || 0}
            loopShopTier={game.loopShopTier || 0}
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

        {game.ending && (
          <EndingScreen ending={game.ending} state={game} dispatch={dispatch} />
        )}

        {screen === 'game' && !game.ending && (
          <>
            <DevPanel state={game} dispatch={dispatch} />
            <SanPollutionLayer
              san={san}
              loopCount={loopCount}
              corruption={game.safehouseCorruption || 0}
              glitchPulse={game.glitchPulse || 0}
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
                const _guide = getGuideStep(game, ctx);
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
              <GameLayout state={game} dispatch={dispatch} areas={areas} settings={settings} />
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
