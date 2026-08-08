// src/components/GameLayout.jsx — 布局模式切换入口
// 在地图模式（暗黑地牢风格）和经典模式（三栏面板）之间切换。
// 这是 game screen 渲染的唯一入口，替换 app.jsx 中直接渲染的三栏布局。
//
// Performance: uses granular Zustand selectors (not full state prop) to avoid
// cascading re-renders when unrelated state changes.
import React from 'react';
const { useState, useEffect, useRef, useMemo, useCallback, memo } = React;
import { InteractiveTownMap } from './InteractiveTownMap.jsx';
import { FloatingInfoBar, NarrativeFloatingPanel } from './FloatingInfoBar.jsx';
import { AreaPanelModal } from './AreaPanelModal.jsx';
import { GameHeader, LeftPanel, CenterPanel, RightPanel } from './GamePanels.jsx';
import { generateMetaCorruptionEvent, generateLoopOpening, generateCorruptedSaveName, isGlmAvailable } from '../systems/llmNarrative.js';
import { getPhase } from '../engine/WorldTimeSystem.js';
import { getAudioIntrusionLevel, applyAudioIntrusion, getAudioIntrusionDescription } from '../systems/audioIntrusion.js';
import { uiStore } from '../state/uiStore.js';
import { useGameLayoutData } from '../state/selectors.js';
import { getDispatch, useGameStore } from '../state/useGameStore.js';
import { GD } from '../state/gameData.js';
import { audioManager } from '../managers/AudioManager.js';

export function GameLayout() {
  // Granular subscription — re-renders only when these fields change
  var gl = useGameLayoutData();
  var dispatch = getDispatch();
  var ui = uiStore();
  var uiMode = ui.uiMode || 'town_map';
  var activeHotspot = ui.activeHotspot;
  var activePanel = ui.activePanel;

  var screen = gl.screen;
  var day = gl.day;
  var loopCount = gl.loopCount;
  var currentArea = gl.currentArea;
  var ap = gl.ap;
  var maxAp = gl.maxAp;
  var san = gl.san;
  var audioMuted = gl.audioMuted;
  var deathContext = gl.deathContext;
  var level13Glitch = gl._level13GlitchScheduled;
  var tutorialSeen = gl.tutorialSeen;
  var currentSafehouse = gl.currentSafehouse;

  // 环境音初始化：进入游戏画面时确保背景音乐播放
  // 兜底机制：effect 系统在 BEGIN_ADVENTURE/MOVE/REST 时也会触发，
  // 但如果 effect 因浏览器自动播放限制被静默吞掉，这里提供安全网。
  useEffect(() => {
    try {
      if (audioManager.muted) return;
      var phase = getPhase(ap, maxAp);
      audioManager.playAreaAmbient(currentArea || 'town_center', phase);
    } catch (e) {}
  }, [currentArea, day, audioMuted]);

  // 感知污染 — 音频侵入层：根据 SAN/loop/mythos 调整环境音
  var _aiSan = useGameStore(function (s) { return s.san; });
  var _aiLoopCount = useGameStore(function (s) { return s.loopCount; });
  var _aiCurrentArea = useGameStore(function (s) { return s.currentArea; });
  var _aiSafehouseCorruption = useGameStore(function (s) { return s.safehouseCorruption; });
  var _aiMythosLevel = useGameStore(function (s) { return s.mythosLevel; });
  var _aiInventory = useGameStore(function (s) { return s.inventory; });
  useEffect(function () {
    try {
      if (audioManager.muted) return;
      var aiState = {
        san: _aiSan, loopCount: _aiLoopCount, currentArea: _aiCurrentArea,
        safehouseCorruption: _aiSafehouseCorruption, mythosLevel: _aiMythosLevel,
        inventory: _aiInventory,
      };
      var intrusionLevel = getAudioIntrusionLevel(aiState, { GD: GD });
      var result = applyAudioIntrusion(intrusionLevel, audioManager, _aiCurrentArea);
      if (result.volumeScale !== undefined) {
        var baseVol = audioManager._userVolumeScale || 1;
        audioManager._volumeScale = baseVol * result.volumeScale;
      }
      if (result.silenceNext) {
        audioManager._silenceNextKeyEvent = true;
      } else {
        audioManager._silenceNextKeyEvent = false;
      }
    } catch (e) {}
  }, [_aiSan, _aiLoopCount, _aiCurrentArea, _aiSafehouseCorruption, _aiMythosLevel, _aiInventory, audioMuted]);

  // LLM 轮回开场白：新轮回开始时生成既视感叙事
  var loopOpeningFired = useRef(false);
  useEffect(() => {
    if (loopOpeningFired.current) return;
    if (!loopCount || loopCount < 1) return;
    loopOpeningFired.current = true;
    try {
      var s = JSON.parse(localStorage.getItem('abyssal_whispers_settings') || '{}');
      if (s.llmEnabled === false) return;
    } catch (e) { return; }
    if (!isGlmAvailable()) return;
    generateLoopOpening({ day, loopCount, currentArea, san, deathContext: deathContext || {} }, {})
      .then(function (text) {
        if (text) {
          dispatch({
            type: 'DELAYED_NARRATE',
            narrType: 'system',
            text: text,
            extra: { isSpecial: true },
          });
        }
      });
  }, []);

  // LLM Meta 异象：REST 结束（day+1）后低 SAN 有概率触发
  var prevDayRef = useRef(day);
  useEffect(() => {
    var prevDay = prevDayRef.current;
    prevDayRef.current = day;
    // 仅在 day 真正变化时触发（REST 导致的 day++）
    if (day <= prevDay) return;
    if (san > 30) return;
    // SAN 越低触发概率越高：SAN≤10 → 50%，SAN≤20 → 30%，SAN≤30 → 15%
    var chance = san <= 10 ? 0.5 : san <= 20 ? 0.3 : 0.15;
    if (Math.random() > chance) return;
    // 检查设置
    try {
      var s = JSON.parse(localStorage.getItem('abyssal_whispers_settings') || '{}');
      if (s.llmEnabled === false) return;
      if (s.llmMetaCorruption === false) return;
    } catch (e) { return; }
    if (!isGlmAvailable()) return;
    generateMetaCorruptionEvent({ day, san, currentArea }).then(function (result) {
      if (result && result.text) {
        dispatch({
          type: 'DELAYED_NARRATE',
          narrType: 'system',
          text: (result.prefix || '[异象]') + ' ' + result.text,
          extra: { isSpecial: true },
        });
      }
    });
  }, [day]);

  // LLM 存档名污染：SAN ≤ 20 时异步篡改最近存档的显示名
  useEffect(() => {
    if (!day || day <= 1) return;
    if (san > 20) return;
    try {
      var s = JSON.parse(localStorage.getItem('abyssal_whispers_settings') || '{}');
      if (s.llmEnabled === false) return;
    } catch (e) { return; }
    if (!isGlmAvailable()) return;
    if (Math.random() > 0.5) return;
    var area = currentArea || '沃切斯特';
    var originalName = '第' + day + '日 · ' + area + ' · SAN:' + san;
    generateCorruptedSaveName(originalName, { day, san, currentArea }).then(function (corrupted) {
      if (!corrupted) return;
      try {
        var raw = localStorage.getItem('coc_save_auto_1');
        if (!raw) return;
        var data = JSON.parse(raw);
        if (data && data.meta) {
          data.meta._corruptedName = corrupted;
          localStorage.setItem('coc_save_auto_1', JSON.stringify(data));
        }
      } catch (e) { /* non-fatal */ }
    });
  }, [day]);

  // M 键切换模式、N 键打开笔记本、J 键线索、I 键物品 — 放在这里确保两种模式下都能响应
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'm' || e.key === 'M') {
        uiStore.setState((prev) => ({
          uiMode: prev.uiMode === 'town_map' ? 'classic' : 'town_map',
        }));
      }
      // N 键打开笔记本
      if (e.key === 'n' || e.key === 'N') {
        try { uiStore.setState({ notebookOpen: true, notebookEverOpened: true }); } catch (err) {}
        try { dispatch({ type: 'MARK_NOTEBOOK_OPENED' }); } catch (err) {}
      }
      // J 键切换到线索标签
      if (e.key === 'j' || e.key === 'J') {
        window.dispatchEvent(new Event('kbd:showClues'));
      }
      // I 键滚动到物品栏
      if (e.key === 'i' || e.key === 'I') {
        window.dispatchEvent(new Event('kbd:showInventory'));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatch]);

  // 地图模式
  if (uiMode === 'town_map') {
    return (
      <>
        <div className="game-layout town-map-mode">
          {/* 全景互动地图（替代 CenterPanel） */}
          <InteractiveTownMap state={gl} dispatch={dispatch} />

          {/* 浮动信息栏（替代 LeftPanel + RightPanel + GameHeader 的部分功能） */}
          <FloatingInfoBar state={gl} dispatch={dispatch} />

          {/* 叙事浮动面板 */}
          <NarrativeFloatingPanel state={gl} dispatch={dispatch} />
        </div>

        {/* 热点点击后弹出的功能面板 */}
        {activeHotspot && activePanel && (
          <AreaPanelModal
            hotspot={activeHotspot}
            state={gl}
            dispatch={dispatch}
            onClose={() => uiStore.setState({ activeHotspot: null, activePanel: null })}
          />
        )}

        {/* 事件日志浮动按钮 */}
        {(gl.eventLog || []).length > 0 && <EventLogButton eventLog={gl.eventLog} />}
      </>
    );
  }

  // 经典模式（原有三栏布局）
  var areas = GD.areas || GD.module2_areas || [];
  return (
    <div className="game-layout">
      <GameHeader
        state={gl}
        dispatch={dispatch}
        areas={areas}
        GD={GD}
        onSettingsOpen={() => uiStore.setState({ settingsOpen: true })}
        onUgcOpen={() => uiStore.setState({ ugcOpen: true })}
        onSaveOpen={() => {
          uiStore.setState({ saveLoadMode: 'save', saveLoadOpen: true });
        }}
      />
      <LeftPanel state={gl} />
      <CenterPanel state={gl} dispatch={dispatch} />
      <RightPanel state={gl} dispatch={dispatch} />
    </div>
  );
}

// === 事件日志浮动按钮 ===
function EventLogButton({ eventLog }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="event-log-floating">
      <button className="event-log-fab" onClick={() => setOpen((v) => !v)}>
        📜 事件记录 ({(eventLog || []).length})
      </button>
      {open && (
        <div className="event-log-floating-body">
          {(eventLog || [])
            .slice(-10)
            .reverse()
            .map((l, i) => (
              <div key={i} className="log-entry">
                <span className="log-day">[Day {l.day}]</span> {l.text}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
