// src/components/GameLayout.jsx — 布局模式切换入口
// 在地图模式（暗黑地牢风格）和经典模式（三栏面板）之间切换。
// 这是 game screen 渲染的唯一入口，替换 app.jsx 中直接渲染的三栏布局。
const { useState, useEffect, useRef, useMemo, useCallback, memo } = React;
import { InteractiveTownMap } from './InteractiveTownMap.jsx';
import { FloatingInfoBar, NarrativeFloatingPanel } from './FloatingInfoBar.jsx';

export function GameLayout({ state, dispatch, areas, settings }) {
  const ui = uiStore();
  const uiMode = ui.uiMode || 'town_map';
  const activeHotspot = ui.activeHotspot;
  const activePanel = ui.activePanel;

  // SAN/corruption/fx classes now applied by parent div.game-root in app.jsx
  // This avoids duplication and lets CSS descendant selectors work for both modes.

  // M 键切换模式 — 放在这里而非子组件中，确保两种模式下都能响应
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'm' || e.key === 'M') {
        uiStore.setState((prev) => ({
          uiMode: prev.uiMode === 'town_map' ? 'classic' : 'town_map',
        }));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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
