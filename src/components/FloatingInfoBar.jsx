// src/components/FloatingInfoBar.jsx — 暗黑地牢风格浮动信息栏
// 悬浮在地图上方的 HUD，显示关键状态信息。
// 设计参考：Darkest Dungeon 的顶部/底部状态栏
import React from 'react';
const { useState, useEffect, useRef, useMemo, useCallback, memo } = React;
import { GD } from '../state/gameData.js';
import { NarrativeBlock } from './GameCommon.jsx';
import { uiStore } from '../state/uiStore.js';
import { NPCDialog } from './NPCDialog.jsx';
import { getDisplayedAp } from '../utils/appHelpers.js';
import { getAreaDisplayName } from '../utils/gameHelpers.js';
import { getSanStage } from '../reducers/sanReducer.js';
import { getInProgressConclusions } from '../reducers/conclusionReducer.js';
import { resolveClueName } from '../utils/clueNameMap.js';
import { CorruptibleChoice } from './SanPollutionLayer.jsx';
// v0.9.0: Fine-grained selectors for components that don't need full state
import { useSanLevel, useEventLog, useCurrentArea, usePollution } from '../state/selectors.js';

export function FloatingInfoBar({ state, dispatch }) {
  const [clueOpen, setClueOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const areas = GD.areas || GD.module2_areas || [];
  const area = areas.find((a) => a.id === state.currentArea);
  const areaName = area ? getAreaDisplayName(area, state) : state.currentArea;
  const sanStage = getSanStage(state.san, { GD });
  const sanClass =
    state.san >= 75
      ? 'stable'
      : state.san >= 60
        ? 'fogged'
        : state.san >= 50
          ? 'tense'
          : state.san >= 40
            ? 'shaken'
            : state.san >= 30
              ? 'dissolving'
              : state.san >= 15
                ? 'critical'
                : 'abyssal';
  const sealLabel =
    state.sealState === 'intact'
      ? '完整'
      : state.sealState === 'weakening'
        ? '削弱'
        : state.sealState === 'critical'
          ? '危急'
          : state.sealState === 'collapsing'
            ? '崩塌'
            : '破裂';

  // Chapter 1 bell countdown HUD: shows mystery hint on Days 1-3
  var bellHint = null;
  if (state.day <= 3 && state.loopCount <= 0) {
    var bellsHeard = 0;
    if ((state.triggeredEvents || []).includes('evt_strange_clock')) bellsHeard = 13;
    else if ((state.clues || []).length > 0) bellsHeard = 12;
    bellHint = bellsHeard >= 13
      ? '🔔 十三声……还差什么？'
      : bellsHeard >= 12
        ? '🔔 钟声响了十二下。你还在等什么？'
        : '🔔 你在数钟声。';
  }

  // Map mode owns its own clue/inventory surfaces. The classic panels are not
  // mounted here, so the shared keyboard events must be consumed locally.
  useEffect(() => {
    const onClues = () => {
      setInventoryOpen(false);
      setClueOpen((open) => !open);
    };
    const onInventory = () => {
      setClueOpen(false);
      setInventoryOpen((open) => !open);
    };
    window.addEventListener('kbd:showClues', onClues);
    window.addEventListener('kbd:showInventory', onInventory);
    return () => {
      window.removeEventListener('kbd:showClues', onClues);
      window.removeEventListener('kbd:showInventory', onInventory);
    };
  }, []);

  return (
    <div className="floating-info-bar">
      {/* 左侧：位置 + 时间 */}
      <div className="finfo-left">
        <div className="finfo-location">
          <span className="finfo-icon">📍</span>
          <span className="finfo-location-name">{areaName}</span>
        </div>
        <div className="finfo-time">
          <span className="finfo-icon">📅</span>
          <span>第 {state.day} 日</span>
          {state.loopCount > 0 && <span className="finfo-loop">轮回 ×{state.loopCount}</span>}
        </div>
        <div className="finfo-weather">{state.weather}</div>
        {bellHint && <div className="finfo-bell-hint" style={{ fontSize: 11, opacity: 0.55, fontStyle: 'italic', marginTop: 2, color: 'var(--san-mid, #c8a96e)' }}>{bellHint}</div>}
      </div>

      {/* 中间：核心状态条 */}
      <div className="finfo-center">
        <div className="finfo-bar-group">
          <div className={'finfo-bar san ' + sanClass}>
            <span className="finfo-bar-label">精神</span>
            <div className="finfo-bar-track">
              <div
                className="finfo-bar-fill"
                style={{ width: (state.san / state.maxSan) * 100 + '%' }}
              />
            </div>
            <span className="finfo-bar-value">{state.san}</span>
          </div>
          <div className="finfo-bar hp">
            <span className="finfo-bar-label">生命</span>
            <div className="finfo-bar-track">
              <div
                className="finfo-bar-fill"
                style={{ width: (state.hp / state.maxHp) * 100 + '%' }}
              />
            </div>
            <span className="finfo-bar-value">{state.hp}</span>
          </div>
          <div className="finfo-bar ap">
            <span className="finfo-bar-label">行动</span>
            <div className="finfo-bar-track">
              <div
                className="finfo-bar-fill"
                style={{ width: (getDisplayedAp(state) / state.maxAp) * 100 + '%' }}
              />
            </div>
            <span className="finfo-bar-value">{getDisplayedAp(state)}</span>
          </div>
        </div>
      </div>

      {/* 右侧：快捷操作 */}
      <div className="finfo-right">
        <span className="finfo-pill food">
          ⻝ {state.food || 0}/{state.maxFood || 5}
        </span>
        <span className="finfo-pill money">💰 {state.money || 0}</span>
        <span className={'finfo-pill seal seal-' + state.sealState}>封印：{sealLabel}</span>
        <span
          className={'finfo-pill clue' + (clueOpen ? ' active' : '')}
          onClick={() => {
            setInventoryOpen(false);
            setClueOpen((v) => !v);
          }}
          style={{ cursor: 'pointer' }}
          title="线索 (J)"
        >
          线索 {state.clues.length}
        </span>
        <span
          className={'finfo-pill inventory' + (inventoryOpen ? ' active' : '')}
          onClick={() => {
            setClueOpen(false);
            setInventoryOpen((v) => !v);
          }}
          style={{ cursor: 'pointer' }}
          title="随身物件 (I)"
        >
          🎒 {state.inventory.length}
        </span>
        <button
          className="finfo-btn notebook-open-map-btn"
          onClick={() => {
            uiStore.setState({ notebookOpen: true, notebookEverOpened: true });
            dispatch({ type: 'MARK_NOTEBOOK_OPENED' });
          }}
          title="笔记本 (N)"
        >
          📓
        </button>
        <button
          className="finfo-btn"
          onClick={() => uiStore.setState({ settingsOpen: true })}
          title="设置"
        >
          ⚙
        </button>
        <button
          className="finfo-btn"
          onClick={() => {
            uiStore.setState({ saveLoadMode: 'save', saveLoadOpen: true });
          }}
          title="存档"
        >
          💾
        </button>
        <button
          className="finfo-btn"
          onClick={() => {
            uiStore.setState({ saveLoadMode: 'load', saveLoadOpen: true });
          }}
          title="读档"
        >
          📖
        </button>
        <button
          className="finfo-btn"
          onClick={() => {
            uiStore.setState({ uiMode: 'classic' });
          }}
          title="切换经典模式"
        >
          ☷
        </button>
      </div>
      {/* 线索弹出面板 */}
      {clueOpen && (
        <CluePanel state={state} onClose={() => setClueOpen(false)} />
      )}
      {inventoryOpen && (
        <InventoryPanel
          state={state}
          dispatch={dispatch}
          onClose={() => setInventoryOpen(false)}
        />
      )}
    </div>
  );
}

// === 线索弹出面板 ===
function CluePanel({ state, onClose }) {
  var inProgress = useMemo(function () {
    return getInProgressConclusions(state, { GD: GD });
  }, [
    state.clues,
    state.discoveredConclusions,
    state.npcTrust,
    state.triggeredEvents,
    state._triggeredSet,
  ]);

  return (
    <div className="clue-panel-overlay" onClick={onClose}>
      <div className="clue-panel" onClick={function (e) { e.stopPropagation(); }}>
        <div className="clue-panel-header">
          <span>📋 已知线索 ({state.clues.length})</span>
          <button className="finfo-btn" onClick={onClose}>✕</button>
        </div>
        <div className="clue-panel-body">
          {state.clues.length > 0 && (
            <>
              <div className="clue-panel-title">线索</div>
              {state.clues.map(function (c, i) {
                return <div key={i} className="clue-entry">• {typeof c === 'object' ? c.name : resolveClueName(c)}</div>;
              })}
            </>
          )}
          {state.completedChains && state.completedChains.length > 0 && (
            <>
              <div className="clue-panel-title">事件链</div>
              {state.completedChains.map(function (cid, i) {
                return <div key={i} className="clue-entry" style={{ color: 'var(--san-high)' }}>✓ {cid}</div>;
              })}
            </>
          )}
          {state.discoveredConclusions && state.discoveredConclusions.length > 0 && (
            <>
              <div className="clue-panel-title" style={{ color: 'var(--gold)' }}>结论</div>
              {state.discoveredConclusions.map(function (cid, i) {
                var conc = (GD.systems?.clue_conclusion?.conclusions || []).find(function (c) { return c.id === cid; });
                return <div key={i} className="clue-entry" style={{ color: 'var(--gold)' }}>★ {conc?.name || cid}</div>;
              })}
            </>
          )}
          {inProgress.length > 0 && (
            <>
              <div className="clue-panel-title" style={{ color: 'var(--text-dim)' }}>推断中</div>
              {inProgress.map(function (c, i) {
                return (
                  <div key={i} className="clue-entry" style={{ color: 'var(--text-dim)', opacity: 0.7 }}>
                    … {c.name} ({c.satisfiedEvidence.length}/{c.requiredEvidenceCount})
                  </div>
                );
              })}
            </>
          )}
          {state.loopCount > 0 && (
            <div className="clue-entry" style={{ color: 'var(--purple)', marginTop: 8 }}>
              第 {state.loopCount} 次轮回 | 污染：{Math.round((state.pollution || 0) * 100)}%
            </div>
          )}
          {state.clues.length === 0 && (
            <div className="clue-entry" style={{ color: 'var(--text-dim)', opacity: 0.5 }}>尚未发现任何线索。</div>
          )}
        </div>
      </div>
    </div>
  );
}

// === 地图模式物品面板 ===
function InventoryPanel({ state, dispatch, onClose }) {
  var itemDefs = GD.items || [];
  return (
    <div className="clue-panel-overlay inventory-panel-overlay" onClick={onClose}>
      <div className="clue-panel inventory-panel" onClick={function (e) { e.stopPropagation(); }}>
        <div className="clue-panel-header">
          <span>🎒 随身物件 ({state.inventory.length})</span>
          <button className="finfo-btn" onClick={onClose}>✕</button>
        </div>
        <div className="clue-panel-body">
          {(state.inventory || []).map(function (item, i) {
            var def = itemDefs.find(function (entry) {
              return entry.id === item.id || entry.name === item.name;
            });
            var useHint = def?.use_hint;
            var exhausted = item.uses === 0;
            return (
              <div key={item.id || item.name || i} className="inventory-panel-item">
                <div className="inventory-panel-item-info">
                  <span className="inventory-panel-item-name">{item.name}</span>
                  <span className="inventory-panel-item-uses">
                    {item.uses > 0 ? '×' + item.uses : item.uses === -1 ? '∞' : ''}
                  </span>
                </div>
                {useHint ? (
                  <button
                    className="btn btn-sm inventory-use-btn"
                    disabled={exhausted}
                    onClick={() => dispatch({ type: 'USE_ITEM', item: item })}
                  >
                    {useHint}
                  </button>
                ) : (
                  <span className="inventory-passive-label">被动</span>
                )}
              </div>
            );
          })}
          {state.inventory.length === 0 && (
            <div className="clue-entry" style={{ color: 'var(--text-dim)', opacity: 0.5 }}>
              你没有携带任何物件。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// === 叙事浮动面板（在地图模式下显示最新的叙述文本） ===
export function NarrativeFloatingPanel({ state, dispatch }) {
  const panelRef = useRef(null);
  const [expanded, setExpanded] = useState(false);

  // 最近的叙述文本
  const recentNarrative = useMemo(() => {
    return (state.narrative || []).slice(-3);
  }, [state.narrative?.length]);

  // 自动滚动到底部
  useEffect(() => {
    if (panelRef.current && expanded) {
      panelRef.current.scrollTop = panelRef.current.scrollHeight;
    }
  }, [state.narrative?.length, expanded]);

  // 待处理事件（技能检定、NPC对话、选择等）
  const hasPending =
    state.pendingEvent?.rolled ||
    state.pendingNpc ||
    state.pendingGamble ||
    state.pendingChoice ||
    state.ending;

  if (!expanded && !hasPending && recentNarrative.length === 0) return null;

  return (
    <div
      className={
        'narrative-floating-panel' +
        (expanded ? ' expanded' : '') +
        (hasPending ? ' has-pending' : '')
      }
    >
      {/* 折叠按钮 */}
      <button className="narrative-toggle" onClick={() => setExpanded((v) => !v)}>
        {expanded ? '▼ 收起叙述' : '▲ 展开叙述'} ({state.narrative.length})
      </button>

      {/* 叙述内容 */}
      {expanded && (
        <div className="narrative-floating-content" ref={panelRef}>
          {state.narrative.map((b) => (
            <NarrativeBlock key={b.id} block={b} />
          ))}
        </div>
      )}

      {/* 待处理交互（始终显示在折叠面板上方） */}
      {hasPending && (
        <div className="narrative-pending-area">
          {state.pendingEvent?.rolled && (
            <div className="skill-check">
              <div className="roll-result">
                <div
                  className={
                    'roll-num ' + (state.pendingEvent.result === 'success' ? 'success' : 'fail')
                  }
                >
                  {state.pendingEvent.roll} / 技能{state.pendingEvent.playerSkill} / 难度
                  {state.pendingEvent.threshold}
                </div>
                <div
                  className={
                    state.pendingEvent.result === 'success' ? 'result-success' : 'result-fail'
                  }
                >
                  {state.pendingEvent.result === 'success' ? '成功！' : '失败！'}
                </div>
              </div>
              <button className="btn btn-sm" onClick={() => dispatch({ type: 'DISMISS_PENDING' })}>
                继续
              </button>
            </div>
          )}
          {state.pendingNpc && !uiStore.getState().activeHotspot && (
            <NPCDialog
              npc={state.pendingNpc.npc}
              trust={state.pendingNpc.trust}
              layer={state.pendingNpc.layer}
              dispatch={dispatch}
              state={state}
            />
          )}
          {state.pendingChoice && (
            <div className="skill-check">
              <div className="check-title">选择</div>
              {state.pendingChoice.choices.map((ch, i) => (
                <CorruptibleChoice
                  key={i}
                  className="btn btn-sm"
                  san={state.san}
                  onClick={() => dispatch({ type: 'CHOICE_SELECT', choiceIdx: i })}
                >
                  {ch.label}
                </CorruptibleChoice>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
