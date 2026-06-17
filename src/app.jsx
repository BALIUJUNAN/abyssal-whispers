// src/app.jsx - 深渊低语：沃切斯特之影 游戏主逻辑
// All imports are stripped by build.py bundler at build time.
// In Vite (ESM), these imports resolve to real modules.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { produce } from 'immer';

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
  getSanStageFromGD,
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
import { getSanStageClasses } from './systems/sanityVisual.js';
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
import {
  applyTextHallucination,
  maybeGetFakeMessage,
  getChoiceDelay,
  maybeInsertFalseMemory,
  corruptEventWeights,
} from './engine/PollutionManager.js';

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

// ── State stores ──
import { initGameStore, updateGameStore } from './state/gameStore.js';
import { uiStore, getSettings, addUiToast, removeUiToast, notifySave, updateSettings } from './state/uiStore.js';
import { initialState } from './state/initialState.js';

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
import { AbyssPopup } from './components/SanPollutionLayer.jsx';
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

const { useState, useReducer, useEffect, useLayoutEffect, useRef, useMemo, useCallback, memo } = React;

const GD = initExtendedEvents(__GAME_DATA__);
const ctx = { GD };
/* [TRACKER-INIT] 初始化 — GD 之后，dispatch 之前 */
const errorTracker = createErrorTracker();
if (typeof window !== 'undefined') {
  window.errorTracker = errorTracker;
}

// checkSilentEvent moved to src/utils/appHelpers.js (now accepts GD as 4th param)

// checkKnowledgeEarned moved to src/utils/appHelpers.js

function getCorruptedSystemText(baseText, layer) {
  // Fear lens corruption: prologue-derived fear-specific UI corruption
  // Applied before generic corruption
  if (layer > 0 && _currentFearTuning && _currentFearTuning.primary) {
    const fearCorrupted = applyFearCorruption({ fearTuning: _currentFearTuning }, baseText, layer);
    if (fearCorrupted !== baseText) return fearCorrupted;
  }
  if (layer <= 0 || Math.random() > 0.3) return baseText;
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
  if (layer >= 3 && Math.random() < 0.15) {
    const ex = layerData.examples;
    if (ex) {
      const keys = Object.keys(ex);
      return ex[keys[Math.floor(Math.random() * keys.length)]] || baseText;
    }
  }
  // Layer 1-2: append mild suffix
  if (layer === 1 && Math.random() < 0.4) return baseText + '（你确定吗？）';
  if (layer === 2 && Math.random() < 0.3) return baseText + ' / ' + baseText;
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

// === REDUCER (Immer) ===
// Immer draft: all direct mutations (s.xxx = ..., .push(), .pop()) are safe.
// Slice handlers receive (draft, action, c) and return draft if handled, null otherwise.
// P0 FIX: effects are collected into a module-level buffer and flushed by the
// dispatch wrapper AFTER the reducer returns. This avoids relying on useReducer's
// return value (which is undefined) and avoids the early-return bug where
// `if (r) return` skipped the _effects assignment when a slice handled the action.
var _pendingEffects = [];

function gameReducer(state, action) {
  _pendingEffects = [];
  return produce(state, (s) => {
    _currentFearTuning = s.fearTuning || null;
    // AP 变化检测：记录 reducer 执行前的 AP
    const _apBefore = s.ap;
    // Seeded RNG: create deterministic rng for this reducer run
    const _runSeed = s.runSeed || 'default';
    const _actIdx = (action.meta && action.meta._actionIndex != null) ? action.meta._actionIndex : (s._actionIndex || 0);
    const _rng = createSeededRng(_runSeed, _actIdx);
    const c = buildReducerCtx(s, { rng: _rng, now: action.meta?.now }, getCorruptedSystemText);
    // Increment action index for next dispatch
    s._actionIndex = _actIdx + 1;
    // Daily action tracking for behavior endings
    const trackableTypes = [
      'MOVE',
      'EXPLORE',
      'TALK_NPC',
      'USE_ITEM',
      'SWITCH_SAFEHOUSE',
      'REST',
      'GAMBLE_CHOICE',
      'DO_SKILL_CHECK',
      'NPC_RESPONSE',
      'WORK',
      'PREACH',
      'ATTACK',
      'BUY_FOOD',
    ];
    if (trackableTypes.includes(action.type) && action.type !== 'REST') {
      s._dayActions.push(action.type === 'NPC_RESPONSE' ? action.choice || 'talk' : action.type);
    }
    // Phase 5: Behavioral profiling — record action history for event selection
    if (typeof recordActionHistory === 'function') recordActionHistory(s, action.type);
    // Track food/money hoarding
    if ((s.food || 0) > (c.bt.hoarded_food_max || 0)) c.bt.hoarded_food_max = s.food;
    if ((s.money || 0) > (c.bt.hoarded_money_max || 0)) c.bt.hoarded_money_max = s.money;
    // Dispatch to slice handlers (first handler that returns s wins, but
    // effects are always flushed — no early return that skips effect collection)
    let handled = false;
    if (!handled) { const r = handleCoreAction(s, action, c, ctx); if (r) handled = true; }
    if (!handled) { const r = handleExploreAction(s, action, c, ctx); if (r) handled = true; }
    if (!handled) { const r = handleNpcAction(s, action, c, ctx); if (r) handled = true; }
    if (!handled) { const r = handleDailyAction(s, action, c, ctx); if (r) handled = true; }
    if (!handled) { const r = handleDarkAction(s, action, c, ctx); if (r) handled = true; }
    if (!handled) { const r = handleUiAction(s, action, c, ctx); if (r) handled = true; }
    if (!handled) {
      c.track?.('unknown_action', action.type);
    }
    // ── AP 偷取：污染状态下行动有概率多扣 1 AP ──
    // 玩家看到的 AP 比实际多，但行动消耗的是真实 AP
    // 当真实 AP 耗尽而显示 AP 还有剩余时，玩家发现被欺骗
    if (s._apLies && s._apOffset > 0) {
      const _apActions = ['MOVE', 'EXPLORE', 'TALK_NPC', 'WORK', 'BUY_FOOD', 'NPC_RESPONSE',
        'SELF_HARM', 'SPREAD_PROPHECY', 'CONSUME_ARCHIVE', 'SELF_SACRIFICE', 'DESECRATE', 'BREAK_SEAL'];
      if (_apActions.includes(action.type) && s.ap > 0) {
        const _stealChance = s._apOffset >= 3 ? 0.4 : 0.2;
        if (c.rng.next() < _stealChance) {
          s.ap = Math.max(0, s.ap - 1);
          // AP 偷取时的叙事暗示
          const _stealTexts = [
            '你好像忘了什么。不是记忆——是时间。',
            '你低头看了一眼表。指针跳了一格。你确定刚才没有那么久。',
            '你的脚步比你预期的慢了一些。不是疲劳——是空间本身变厚了。',
            '你做了那个动作。但代价比你想象的多了一点。',
          ];
          c.narr('system', pick(_stealTexts, c.rng), { isEffect: true });
        }
      }
    }
    // ── AP 变化音效：通用检测（覆盖所有 action type）──
    if (typeof _apBefore === 'number' && s.ap < _apBefore) {
      // 仅在 AP 低到临界值时播放音效，避免频繁打扰
      if (s.ap <= 0 && _apBefore > 0) {
        c.effects.push({ type: 'AUDIO_PLAY', id: 'ui_click_forbidden' });
      } else if (s.ap <= 2 && _apBefore > 2) {
        c.effects.push({ type: 'AUDIO_PLAY', id: 'ui_error' });
      }
      // AP 紧张时切换背景音乐到对应阶段（营造紧迫感）
      if (s.ap <= 3 && _apBefore > 3) {
        try {
          var _phase = getPhase(s.ap, s.maxAp);
          c.effects.push({ type: 'AUDIO_AMBIENT', area: s.currentArea, phase: _phase });
        } catch (e) {}
      }
    }
    // Tag effects deterministically from action.meta.actionId (no Date.now/random in reducer)
    if (c.effects.length > 0) {
      const batchId = action.meta?.actionId || 'anon';
      c.effects.forEach((fx, i) => {
        fx._fxId = batchId + '_' + i;
      });
    }
    _pendingEffects = c.effects;
  });
}

function App() {
  const [state, rawDispatch] = useReducer(gameReducer, null, initialState);
  /* [TRACKER-DISPATCH] 包装 dispatch — 自动记录每步操作 */
  const stateRef = useRef(state);
  stateRef.current = state;
  // P0 FIX: flushPendingEffects reads from the module-level _pendingEffects buffer
  // populated by gameReducer, instead of relying on rawDispatch return value (which is
  // undefined for useReducer). Effects are flushed synchronously after the state update.
  const flushRef = useRef(function () {});
  const dispatch = useCallback((action) => {
    // Attach deterministic actionId for effect dedup (keeps reducer pure)
    if (!action.meta) action.meta = {};
    if (!action.meta.actionId)
      action.meta.actionId = Date.now() + '_' + Math.random().toString(16).slice(2, 6);
    // Seeded RNG: inject runSeed and actionIndex into action meta
    // so reducer can create deterministic rng = createSeededRng(runSeed, actionIndex)
    var currentState = stateRef.current;
    if (!action.meta.now) action.meta.now = Date.now();
    action.meta._actionIndex = (currentState._actionIndex || 0);
    errorTracker.record(action, currentState);
    // Run the reducer. _pendingEffects is now populated by gameReducer.
    rawDispatch(action);
    // Flush post-reducer side effects from the module-level buffer.
    // flushRef.current is updated by useLayoutEffect to always point to
    // the latest flush function (stable across renders).
    flushRef.current();
  }, []);
  // Dual store: initialize game store bridge for useGameStore/useSan/useDay selectors
  useEffect(function () {
    initGameStore(state, dispatch);
    // 移除加载层（首帧渲染完成后）
    var ls = document.getElementById('loading-screen');
    if (ls) {
      ls.classList.add('fade-out');
      setTimeout(function () { ls.remove(); }, 700);
    }
  }, []);
  // P0 FIX: flush effects from the module-level buffer.
  // Use a stable ref so dispatch callback doesn't need to be recreated.
  flushRef.current = function () {
    if (_pendingEffects.length > 0) {
      var effects = _pendingEffects;
      _pendingEffects = [];
      try {
        runPostReducerEffects(effects, dispatch);
      } catch (e) { /* effect errors are non-fatal */ }
    }
  };
  // P0 FIX: updateGameStore moved from render body to useLayoutEffect.
  // Calling listeners (via useSyncExternalStore) during render causes
  // "Cannot update during render" warnings in StrictMode / concurrent mode.
  useLayoutEffect(function () {
    updateGameStore(state);
  }, [state]);
  // UI state from external store (replaces 7 useState calls)
  const ui = uiStore();
  const settings = ui.settings || getSettings();
  const savedExists = useMemo(() => hasSave(), [ui.saveTick]);

  // Achievement checking
  useEffect(() => {
    const achData = loadAchievements();
    const newUnlocks = checkAchievements(state, achData.unlocked, achData.stats);
    if (newUnlocks.length > 0) {
      achData.unlocked.push(...newUnlocks);
      saveAchievements(achData);
      newUnlocks.forEach((id) => {
        const def = getAchievementDef(id);
        if (def) addUiToast({ id, def, type: 'achievement' });
      });
    }
  }, [state.day, state.ending, state.visitedAreas?.length, state.clues?.length]);

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
    dispatch({
      type: 'ACCESSIBILITY_TOGGLE',
      key: 'visual_distortion',
      value: !!settings.visualDistortion,
    });
    dispatch({
      type: 'ACCESSIBILITY_TOGGLE',
      key: 'flicker_control',
      value: !!settings.flickerEffect,
    });
    // SSOT: three independent pollution sliders
    dispatch({
      type: 'SET_META_FIELD',
      field: '_visualPollution',
      value: settings.visualPollution ?? 50,
    });
    dispatch({
      type: 'SET_META_FIELD',
      field: '_interactionPollution',
      value: settings.interactionPollution ?? 50,
    });
    dispatch({
      type: 'SET_META_FIELD',
      field: '_metaPollution',
      value: settings.metaPollution ?? 50,
    });
    // Light pollution mode: override all sliders to minimum
    if (settings.lightPollutionMode) {
      dispatch({ type: 'SET_META_FIELD', field: '_visualPollution', value: 10 });
      dispatch({ type: 'SET_META_FIELD', field: '_interactionPollution', value: 5 });
      dispatch({ type: 'SET_META_FIELD', field: '_metaPollution', value: 25 });
    }
  }, [settings]);

  // 笔记本打开 → 同步标记引导已读（uiStore → game state）
  useEffect(() => {
    if (ui.notebookEverOpened && !(state.tutorialSeen || {}).notebook_opened) {
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

  const handleSettingsChange = (s) => updateSettings(s);
  const fontSizeClass = 'narrative-size-' + settings.narrativeFontSize;
  const handleLoadSlot = (loaded) => {
    dispatch({ type: 'CONTINUE_GAME', savedState: loaded });
    notifySave('从存档中醒来', 'load');
  };

  // 结局CG预加载：SAN < 30 时静默预加载，暗示结局临近
  // P1-A: SSOT — preload ending CGs at explanation_loss (level >= 3)
  useEffect(() => {
    if (state.screen === 'game' && getSanStageFromGD(state.san).level >= 3) preloadEndingCGs();
  }, [state.san, state.screen]);

  // Lazy-load ch2+ game data (web mode only — skipped if already merged at build time)
  // Chapter-gated: load ch2+ at day 5, meta at day 10 (reduces initial load)
  useEffect(() => {
    if (state.screen !== 'game') return;
    if (!GD._extendedEventsLoaded) return;
    try {
      if (state.day >= 5) loadChapterData(GD, 'ch2plus', 'game_ch2plus.json');
      if (state.day >= 10) loadChapterData(GD, 'meta', 'game_meta.json');
    } catch (e) {
      /* non-fatal: game continues with existing data */
    }
  }, [state.day, state.screen]);

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

  // ── 轻提示：前传结束进入正片时 ──
  const bootHintShown = useRef(false);
  const [bootHintVisible, setBootHintVisible] = useState(false);
  useEffect(() => {
    if (state.screen === 'game' && state.day === 1 && !bootHintShown.current) {
      bootHintShown.current = true;
      setBootHintVisible(true);
      var t = setTimeout(function () { setBootHintVisible(false); }, 8000);
      return function () { clearTimeout(t); };
    }
  }, [state.screen, state.day]);

  // ── 轻提示：第一次掉 SAN ──
  const sanHintShown = useRef(false);
  const [sanHintVisible, setSanHintVisible] = useState(false);
  useEffect(() => {
    if (state.screen === 'game' && state.san < 75 && !sanHintShown.current) {
      sanHintShown.current = true;
      setSanHintVisible(true);
      var t = setTimeout(function () { setSanHintVisible(false); }, 2500);
      return function () { clearTimeout(t); };
    }
  }, [state.san, state.screen]);

  // ── Compute game screen vars (needed when screen === 'game') ──
  const corrLevel = getCorruptionLevel(state.san, state.loopCount);
  const areas = GD.areas || GD.module2_areas || [];
  const visualDistortion = state.accessibilityOptions?.visual_distortion;
  const allowVisualFX = visualDistortion !== false;
  const sanClasses = getSanStageClasses(state.san, allowVisualFX, ctx);
  const sanFeedback = getSanStageFeedback(state.san, ctx);
  const _vtClass = sanClasses.vtClass;
  const sanStageClass = sanClasses.stageClass;
  const sanClass = sanClasses.sanClass;

  // ── Determine active screen key for ScreenTransition ──
  var _screenKey = state.ending ? 'ending' : state.screen;

  return (
    <>
      {/* Screen content wrapped in ScreenTransition for animated switching */}
      <ScreenTransition screenKey={_screenKey} duration={800}>

        {state.screen === 'title' && (
          <TitleScreen
            onStart={() => dispatch({ type: 'START_GAME' })}
            saveExists={savedExists}
            onContinue={() => {
              uiStore.setState({ saveLoadMode: 'load', saveLoadOpen: true });
            }}
            onSettingsOpen={() => uiStore.setState({ settingsOpen: true })}
            onAchOpen={() => uiStore.setState({ achOpen: true })}
            endingCoins={state.endingCoins || 0}
            loopShopTier={state.loopShopTier || 0}
            loopCount={state.loopCount || 0}
            onShopPurchase={(item) => {
              dispatch({ type: 'LOOP_SHOP_PURCHASE', itemId: item.id, cost: item.cost });
            }}
          />
        )}

        {state.screen === 'prologue' && (
          <PrologueScreen state={state} dispatch={dispatch} />
        )}

        {state.screen === 'guide' && (
          <SurvivalGuide onContinue={() => dispatch({ type: 'DISMISS_GUIDE' })} />
        )}

        {state.screen === 'creation' && (
          <CharCreation
            state={state}
            onRoll={() => dispatch({ type: 'ROLL_STATS' })}
            onStart={() => dispatch({ type: 'BEGIN_ADVENTURE' })}
            onSetDifficulty={(d) => dispatch({ type: 'SET_DIFFICULTY', difficulty: d })}
            onSetArchetype={(id) => dispatch({ type: 'SET_ARCHETYPE', archetypeId: id })}
          />
        )}

        {state.ending && (
          <EndingScreen ending={state.ending} state={state} dispatch={dispatch} />
        )}

        {state.screen === 'game' && !state.ending && (
          <>
            <DevPanel state={state} dispatch={dispatch} />
            <SanPollutionLayer
              san={state.san}
              loopCount={state.loopCount}
              corruption={state.safehouseCorruption || 0}
              glitchPulse={state.glitchPulse || 0}
              enabled={allowVisualFX}
              intensity={settings.visualPollution ?? 50}
              interactionPollution={settings.interactionPollution ?? 50}
              metaPollution={settings.metaPollution ?? 50}
            />
            <AbyssPopup san={state.san} onSanDrain={(amt) => dispatch({ type: 'RESIST_SAN_DRAIN', amount: amt })} />
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
                const _guide = getGuideStep(state, ctx);
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
              <GameLayout state={state} dispatch={dispatch} areas={areas} settings={settings} />
            </div>
          </>
        )}

      </ScreenTransition>

      {/* ── Global overlays & modals (outside transition, always available) ── */}
      <SettingsModal
        open={ui.settingsOpen}
        onClose={() => uiStore.setState({ settingsOpen: false })}
        settings={settings}
        onChange={handleSettingsChange}
        onAchOpen={() => uiStore.setState({ achOpen: true })}
        dispatch={dispatch}
      />
      <SaveLoadModal
        open={ui.saveLoadOpen}
        onClose={() => uiStore.setState({ saveLoadOpen: false })}
        state={state.screen === 'game' ? state : null}
        onLoad={handleLoadSlot}
        mode={ui.saveLoadMode}
        onSaved={notifySave}
      />
      <AchievementGallery open={ui.achOpen} onClose={() => uiStore.setState({ achOpen: false })} />
      <NotebookModal
        open={!!ui.notebookOpen}
        onClose={() => uiStore.setState({ notebookOpen: false })}
        state={state}
      />
      {ui.ugcOpen && (
        <Modal
          open={ui.ugcOpen}
          onClose={() => uiStore.setState({ ugcOpen: false })}
          title="模组管理"
          width="720px"
        >
          <UgcPanel onClose={() => uiStore.setState({ ugcOpen: false })} GD={GD} />
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
      {bootHintVisible && state.screen === 'game' && (
        <div className="boot-hint">按 M 切换布局 · 按 J 打开笔记本</div>
      )}

      {/* ── 轻提示：第一次掉 SAN ── */}
      {sanHintVisible && state.screen === 'game' && (
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
