// src/components/GameLayout.jsx — 布局模式切换入口
// 在地图模式（暗黑地牢风格）和经典模式（三栏面板）之间切换。
// 这是 game screen 渲染的唯一入口，替换 app.jsx 中直接渲染的三栏布局。
const { useState, useEffect, useRef, useMemo, useCallback, memo } = React;
import { InteractiveTownMap } from './InteractiveTownMap.jsx';
import { FloatingInfoBar, NarrativeFloatingPanel } from './FloatingInfoBar.jsx';
import { AreaPanelModal } from './AreaPanelModal.jsx';
import { GameHeader, LeftPanel, CenterPanel, RightPanel } from './GamePanels.jsx';
import { generateMetaCorruptionEvent, generateLoopOpening, generateCorruptedSaveName, isGlmAvailable } from '../systems/llmNarrative.js';
import { getPhase } from '../engine/WorldTimeSystem.js';

export function GameLayout({ state, dispatch, areas, settings }) {
  const ui = uiStore();
  const uiMode = ui.uiMode || 'town_map';
  const activeHotspot = ui.activeHotspot;
  const activePanel = ui.activePanel;

  // SAN/corruption/fx classes now applied by parent div.game-root in app.jsx
  // This avoids duplication and lets CSS descendant selectors work for both modes.

  // 环境音初始化：进入游戏画面时确保背景音乐播放
  // 兜底机制：effect 系统在 BEGIN_ADVENTURE/MOVE/REST 时也会触发，
  // 但如果 effect 因浏览器自动播放限制被静默吞掉，这里提供安全网。
  useEffect(() => {
    try {
      if (audioManager.muted) return;
      var phase = getPhase(state.ap, state.maxAp);
      audioManager.playAreaAmbient(state.currentArea || 'town_center', phase);
    } catch (e) {}
  }, [state.currentArea, state.day, state.audioMuted]);

  // LLM 轮回开场白：新轮回开始时生成既视感叙事
  var loopOpeningFired = useRef(false);
  useEffect(() => {
    if (loopOpeningFired.current) return;
    if (!state.loopCount || state.loopCount < 1) return;
    loopOpeningFired.current = true;
    try {
      var s = JSON.parse(localStorage.getItem('abyssal_whispers_settings') || '{}');
      if (s.llmEnabled === false) return;
    } catch (e) { return; }
    if (!isGlmAvailable()) return;
    generateLoopOpening(state, state.deathContext || {}).then(function (text) {
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
  var prevDayRef = useRef(state.day);
  useEffect(() => {
    var prevDay = prevDayRef.current;
    prevDayRef.current = state.day;
    // 仅在 day 真正变化时触发（REST 导致的 day++）
    if (state.day <= prevDay) return;
    var san = state.san || 60;
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
    generateMetaCorruptionEvent(state).then(function (result) {
      if (result && result.text) {
        dispatch({
          type: 'DELAYED_NARRATE',
          narrType: 'system',
          text: (result.prefix || '[异象]') + ' ' + result.text,
          extra: { isSpecial: true },
        });
      }
    });
  }, [state.day]);

  // LLM 存档名污染：SAN ≤ 20 时异步篡改最近存档的显示名
  useEffect(() => {
    if (!state.day || state.day <= 1) return;
    var san = state.san || 60;
    if (san > 20) return;
    try {
      var s = JSON.parse(localStorage.getItem('abyssal_whispers_settings') || '{}');
      if (s.llmEnabled === false) return;
    } catch (e) { return; }
    if (!isGlmAvailable()) return;
    if (Math.random() > 0.5) return;
    var area = state.currentArea || '沃切斯特';
    var originalName = '第' + state.day + '日 · ' + area + ' · SAN:' + san;
    generateCorruptedSaveName(originalName, state).then(function (corrupted) {
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
  }, [state.day]);

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
          <InteractiveTownMap state={state} dispatch={dispatch} />

          {/* 浮动信息栏（替代 LeftPanel + RightPanel + GameHeader 的部分功能） */}
          <FloatingInfoBar state={state} dispatch={dispatch} />

          {/* 叙事浮动面板 */}
          <NarrativeFloatingPanel state={state} dispatch={dispatch} />
        </div>

        {/* 热点点击后弹出的功能面板 */}
        {activeHotspot && activePanel && (
          <AreaPanelModal
            hotspot={activeHotspot}
            state={state}
            dispatch={dispatch}
            onClose={() => uiStore.setState({ activeHotspot: null, activePanel: null })}
          />
        )}

        {/* 事件日志浮动按钮 */}
        {state.eventLog.length > 0 && <EventLogButton state={state} />}
      </>
    );
  }

  // 经典模式（原有三栏布局）
  return (
    <div className="game-layout">
      <GameHeader
        state={state}
        dispatch={dispatch}
        areas={areas}
        onSettingsOpen={() => uiStore.setState({ settingsOpen: true })}
        onUgcOpen={() => uiStore.setState({ ugcOpen: true })}
        onSaveOpen={() => {
          uiStore.setState({ saveLoadMode: 'save', saveLoadOpen: true });
        }}
      />
      <LeftPanel state={state} />
      <CenterPanel state={state} dispatch={dispatch} />
      <RightPanel state={state} dispatch={dispatch} />
    </div>
  );
}

// === 事件日志浮动按钮 ===
function EventLogButton({ state }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="event-log-floating">
      <button className="event-log-fab" onClick={() => setOpen((v) => !v)}>
        📜 事件记录 ({state.eventLog.length})
      </button>
      {open && (
        <div className="event-log-floating-body">
          {state.eventLog
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
