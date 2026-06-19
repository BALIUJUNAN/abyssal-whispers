// src/components/CitySketchMap.jsx - City sketch map component (extracted from GamePanels.jsx)
const { useState, useEffect, useRef, useMemo, useCallback, memo } = React;
import { getAreaDisplayName, isAreaUnlocked } from '../utils/gameHelpers.js';

export function CitySketchMap({ areas, state, dispatch, conn }) {
  const [fullscreen, setFullscreen] = useState(false);
  const areaById = useMemo(() => {
    const map = {};
    areas.forEach((a) => {
      map[a.id] = a;
    });
    return map;
  }, [areas]);
  const canShowNode = (area) => {
    if (!area) return false;
    const visited = state.visitedAreas.includes(area.id);
    const unlocked = isAreaUnlocked(area, state);
    const rumor = area.chapter_1_role === 'rumor_only';
    return visited || unlocked || rumor;
  };
  // 边的状态判定：active(当前可达) / known(可见但非当前) / faint(锁/传闻)
  const getEdgeState = (from, to) => {
    const fromVis = canShowNode(areaById[from]);
    const toVis = canShowNode(areaById[to]);
    if (!fromVis || !toVis) return 'hidden';
    const fromReach = conn.includes(from) || state.currentArea === from;
    const toReach = conn.includes(to) || state.currentArea === to;
    const currentArea = state.currentArea;
    // 当前区域到可达区域 = active
    if ((from === currentArea && conn.includes(to)) || (to === currentArea && conn.includes(from)))
      return 'active';
    // 两端都已访问/解锁 = known
    const fromUnlocked = isAreaUnlocked(areaById[from], state) || state.visitedAreas.includes(from);
    const toUnlocked = isAreaUnlocked(areaById[to], state) || state.visitedAreas.includes(to);
    if (fromUnlocked && toUnlocked) return 'known';
    return 'faint';
  };
  const renderNode = (areaId) => {
    const area = areaById[areaId];
    const pos = MAP_LAYOUT[areaId];
    if (!area || !pos || !canShowNode(area)) return null;
    const visited = state.visitedAreas.includes(area.id);
    const reachable = conn.includes(area.id);
    const unlocked = isAreaUnlocked(area, state);
    const locked = !unlocked && !visited;
    const rumor = area.chapter_1_role === 'rumor_only' && !visited;
    const current = state.currentArea === area.id;
    const displayName = visited
      ? getAreaDisplayName(area, state)
      : rumor
        ? area.early_game_alias || '???'
        : '???';
    const cls = [
      'sketch-map-node',
      current ? 'current' : '',
      visited ? 'visited' : '',
      reachable ? 'reachable' : '',
      locked ? 'locked' : '',
      rumor ? 'rumor' : '',
    ]
      .filter(Boolean)
      .join(' ');
    return (
      <button
        key={area.id}
        className={cls}
        style={{ left: pos.x + '%', top: pos.y + '%' }}
        disabled={!reachable || !unlocked || state.ap < 1}
        onClick={() => dispatch({ type: 'MOVE', areaId: area.id })}
        title={area.name}
      >
        <span className="sketch-map-pin" />
        <span className="sketch-map-node-name">{displayName}</span>
        <span className={'sketch-map-danger d' + area.danger_level}>
          {'★'.repeat(Math.max(0, area.danger_level))}
        </span>
      </button>
    );
  };
  // 当前区域名称 & 可前往列表（地图下方辅助信息）
  const currentAreaObj = areaById[state.currentArea];
  const currentName = currentAreaObj ? getAreaDisplayName(currentAreaObj, state) : '???';
  const reachableNames = conn
    .map((id) => {
      const a = areaById[id];
      if (!a) return null;
      const unlocked = isAreaUnlocked(a, state);
      if (!unlocked) return null;
      const visited = state.visitedAreas.includes(a.id);
      return visited ? getAreaDisplayName(a, state) : a.early_game_alias || '???';
    })
    .filter(Boolean);
  // 地图内容渲染函数（复用于普通和全屏模式）
  const renderMapContent = () => (
    <>
      {/* SVG 路径连线 — 按状态分三层渲染 */}
      <svg className="sketch-map-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
        {MAP_EDGES.map(([from, to]) => {
          const a = MAP_LAYOUT[from];
          const b = MAP_LAYOUT[to];
          if (!a || !b) return null;
          const edgeState = getEdgeState(from, to);
          if (edgeState === 'hidden') return null;
          const mx = (a.x + b.x) / 2 + (a.y - b.y) * 0.12;
          const my = (a.y + b.y) / 2 + (b.x - a.x) * 0.08;
          const cls = 'sketch-map-line sketch-map-line--' + edgeState;
          return (
            <path
              key={from + '-' + to}
              className={cls}
              d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
            />
          );
        })}
      </svg>
      <div className="sketch-map-coastline" />
      <div className="sketch-map-fog" />
      {MAP_ZONES.map((z) => {
        const hasVisible = z.areas.some((id) => canShowNode(areaById[id]));
        if (!hasVisible) return null;
        return (
          <div
            key={z.label}
            className="sketch-map-zone-label"
            style={{ left: z.x + '%', top: z.y + '%' }}
          >
            {z.label}
          </div>
        );
      })}
      {Object.keys(MAP_LAYOUT).map(renderNode)}
      <div className="sketch-map-legend">
        <span className="legend-item legend-current">● 当前</span>
        <span className="legend-item legend-reachable">● 可前往</span>
        <span className="legend-item legend-known">﹍ 已知路径</span>
        <span className="legend-item legend-active-path">━ 可行路径</span>
        <span className="legend-item legend-rumor">◌ 传闻</span>
        <span className="legend-item legend-locked">○ 锁定</span>
      </div>
    </>
  );

  // 全屏模式
  if (fullscreen)
    return (
      <div
        className="map-fullscreen-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) setFullscreen(false);
        }}
      >
        <button
          className="map-fullscreen-close"
          onClick={() => setFullscreen(false)}
          title="关闭全屏"
        >
          ✕ 关闭全屏
        </button>
        <div>
          <div className="sketch-map">{renderMapContent()}</div>
          <div className="sketch-map-info">
            <div className="sketch-map-info-row">
              <span className="sketch-map-info-label">当前位置</span>
              <span className="sketch-map-info-value">{currentName}</span>
            </div>
            {reachableNames.length > 0 && (
              <div className="sketch-map-info-row">
                <span className="sketch-map-info-label">可前往</span>
                <span className="sketch-map-info-value">{reachableNames.join(' / ')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );

  return (
    <div className="sketch-map-wrapper">
      <div className="sketch-map">
        <button
          className="map-fullscreen-btn"
          onClick={() => setFullscreen(true)}
          title="全屏查看地图"
        >
          ⛶ 全屏
        </button>
        {renderMapContent()}
      </div>
      {/* 地图下方辅助信息 */}
      <div className="sketch-map-info">
        <div className="sketch-map-info-row">
          <span className="sketch-map-info-label">当前位置</span>
          <span className="sketch-map-info-value">{currentName}</span>
        </div>
        {reachableNames.length > 0 && (
          <div className="sketch-map-info-row">
            <span className="sketch-map-info-label">可前往</span>
            <span className="sketch-map-info-value">{reachableNames.join(' / ')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
