// src/app.jsx - Thin orchestrator (extracted from 509 lines)
// Responsibilities: bootstrap import, compose hooks, render screen routing + modals.
import React from 'react';
import ReactDOM from 'react-dom/client';

// ── Bootstrap (runs module-level init once) ──
import { GD, errorTracker } from './bootstrap.js';

// ── Composite hooks ──
import {
  useGameData, useDispatchWrapper, useUiState,
  useSeedStore, useMigrateOldSaves, useAudioSettingsInit,
  useAudioAutoplayUnlock, useReducedMotion, useNotebookTutorialSync,
  usePageZoom, useEndingCgPreload, useChapterLazyLoad,
  useAchievementCheck, useSanLossHint, useBootHint, useLevel13Glitch,
} from './hooks/index.js';

// ── Components ──
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { GameModals } from './components/GameModals.jsx';
import { ScreenTransition } from './components/ScreenTransition.jsx';
import { TitleScreen } from './components/TitleScreen.jsx';
import { PrologueScreen, SurvivalGuide, CharCreation } from './components/GameScreens.jsx';
import { EndingScreen } from './components/GamePanels.jsx';
import { GameLayout } from './components/GameLayout.jsx';
import { DevPanel } from './components/ui/DevPanel.jsx';
import { SanPollutionLayer, AbyssPopup } from './components/SanPollutionLayer.jsx';

// ── Systems & utilities ──
import { getGuideStep } from './systems/firstRunGuide.js';
import { getSanStageFeedback } from './systems/sanFeedback.js';
import { getCorruptionLevel } from './utils/gameHelpers.js';
import { hasSave } from './engine/SaveManager.js';
import { notifySave, updateSettings, useUiStore } from './state/uiStore.js';

const { useState, useEffect, useRef, useMemo, useCallback } = React;

function App() {
  // ── Composite hooks (replaces 40+ lines of selector calls + useMemo) ──
  var gameData = useGameData();
  var game = gameData.game;
  var stateRef = gameData.stateRef;
  var dispatch = useDispatchWrapper(errorTracker, stateRef);
  var ui = useUiState();

  var settings = ui.settings;
  var savedExists = useMemo(function () { return hasSave(); }, [ui.saveTick]);

  // ── Settings / load handlers (stay here — depend on dispatch) ──
  var handleSettingsChange = function (s) {
    updateSettings(s);
    dispatch({ type: 'SET_META_FIELD', field: '_visualPollution', value: s.visualPollution ?? 50 });
    dispatch({ type: 'SET_META_FIELD', field: '_interactionPollution', value: s.interactionPollution ?? 50 });
    dispatch({ type: 'SET_META_FIELD', field: '_metaPollution', value: s.lightPollutionMode ? 25 : (s.metaPollution ?? 50) });
    if (s.lightPollutionMode) {
      dispatch({ type: 'SET_META_FIELD', field: '_visualPollution', value: 10 });
      dispatch({ type: 'SET_META_FIELD', field: '_interactionPollution', value: 5 });
    }
  };

  var handleLoadSlot = function (loaded) {
    dispatch({ type: 'CONTINUE_GAME', savedState: loaded });
    notifySave('从存档中醒来', 'load');
  };

  var fontSizeClass = 'narrative-size-' + settings.narrativeFontSize;

  // ── Phase 1 custom hooks ──
  useSeedStore(GD);
  useMigrateOldSaves();
  useAudioSettingsInit(settings);
  useAudioAutoplayUnlock();
  useNotebookTutorialSync(ui.notebookEverOpened, game.tutorialSeen, gameData.getDispatch);
  usePageZoom(settings);
  useEndingCgPreload(game.san, game.screen, game.sanStage);
  useChapterLazyLoad(GD, game.day, game.screen);
  useReducedMotion(settings);
  var l13IntervalRef = useLevel13Glitch(game._level13GlitchScheduled, game.screen, dispatch);
  var bootHintVisible = useBootHint(game.screen, game.day);
  var sanHintVisible = useSanLossHint(game.san, game.screen);
  useAchievementCheck(game);

  // ── Game screen computed vars ──
  var corrLevel = getCorruptionLevel(game.san, game.loopCount);
  var areas = GD.areas || GD.module2_areas || [];
  var visualDistortion = game.accessibilityOptions?.visual_distortion;
  var allowVisualFX = visualDistortion !== false;
  var sanClasses = game.sanStage;
  var _vtClass = sanClasses.vtClass;
  var sanStageClass = sanClasses.stageClass;
  var sanClass = sanClasses.sanClass;
  var sanFeedback = getSanStageFeedback(game.san, { GD });

  var _screenKey = game.ending ? 'ending' : game.screen;

  return (
    <>
      <ScreenTransition screenKey={_screenKey} duration={800}>
        {game.screen === 'title' && (
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
            loopCount={game.loopCount || 0}
            onShopPurchase={(item) => {
              dispatch({ type: 'LOOP_SHOP_PURCHASE', itemId: item.id, cost: item.cost });
            }}
          />
        )}

        {game.screen === 'prologue' && (
          <PrologueScreen state={game} dispatch={dispatch} />
        )}

        {game.screen === 'guide' && (
          <SurvivalGuide onContinue={() => dispatch({ type: 'DISMISS_GUIDE' })} />
        )}

        {game.screen === 'creation' && (
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

        {game.screen === 'game' && !game.ending && (
          <>
            <DevPanel state={game} dispatch={dispatch} />
            <SanPollutionLayer
              san={game.san}
              loopCount={game.loopCount}
              corruption={game.safehouseCorruption || 0}
              glitchPulse={game.glitchPulse || 0}
              enabled={allowVisualFX}
              intensity={settings.visualPollution ?? 50}
              interactionPollution={settings.interactionPollution ?? 50}
              metaPollution={settings.metaPollution ?? 50}
            />
            <AbyssPopup san={game.san} onSanDrain={(amt) => dispatch({ type: 'RESIST_SAN_DRAIN', amount: amt })} />
            <div
              className={
                'game-root ' +
                (corrLevel > 0 ? 'corruption-' + corrLevel + ' ' : '') +
                sanClass + sanStageClass + _vtClass + ' ' + fontSizeClass
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

      <GameModals
        game={game}
        ui={ui}
        dispatch={dispatch}
        GD={GD}
        settings={settings}
        screen={game.screen}
        bootHintVisible={bootHintVisible}
        sanHintVisible={sanHintVisible}
        onSettingsChange={handleSettingsChange}
        onLoadSlot={handleLoadSlot}
      />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary errorTracker={errorTracker}>
    <App />
  </ErrorBoundary>
);
