// src/components/InteractiveTownMap.jsx — 暗黑地牢风格互动城镇地图
// 主界面组件：全景地图背景 + 可点击热点 + 浮动信息栏
// 复用现有 reducer action（MOVE/EXPLORE/TALK_NPC 等），零游戏逻辑改动。
//
// 设计参考：Darkest Dungeon 的 Hamlet 全景图
//   - 全屏背景图（根据污染程度切换变体）
//   - 可点击热点（区域 + NPC + 建筑）带 hover 光晕
//   - 点击热点弹出 AreaPanelModal（功能面板）
//   - 浮动信息栏覆盖在地图上方

const { useState, useEffect, useRef, useMemo, useCallback, memo } = React;

// === 热点节点组件 ===
export const HotspotNode = memo(function HotspotNode({
  hotspot,
  hotspotState: hs,
  isCurrentArea,
  npcHere,
  onClick,
}) {
  const [hovered, setHovered] = useState(false);
  const cls = [
    'town-hotspot',
    'hotspot-type-' + hotspot.type,
    'hotspot-state-' + hs,
    isCurrentArea ? 'hotspot-current' : '',
    hovered ? 'hotspot-hovered' : '',
    npcHere ? 'hotspot-has-npc' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const style = {
    left: hotspot.x + '%',
    top: hotspot.y + '%',
  };

  // 锁定/不可达时的视觉处理
  const isLocked = hs === 'locked';
  const isReachable = hs === 'reachable';
  const isCurrent = hs === 'current';

  return (
    <button
      className={cls}
      style={style}
      onClick={() => !isLocked && onClick(hotspot)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={isLocked}
      title={isLocked ? hotspot.unlockHint || '尚未解锁' : hotspot.label}
      aria-label={hotspot.label}
    >
      {/* 光晕效果 */}
      <span
        className="hotspot-glow"
        style={{
          backgroundColor: isCurrent ? '#ffffff' : hotspot.glowColor || '#b8963a',
          opacity: isCurrent ? 0.6 : isReachable ? 0.4 : 0.15,
        }}
      />
      {/* 图标 */}
      <span className="hotspot-icon">{hotspot.icon}</span>
      {/* 标签 */}
      <span className="hotspot-label">{isLocked ? '???' : hotspot.shortLabel}</span>
      {/* NPC 指示器 */}
      {npcHere && <span className="hotspot-npc-indicator">💬</span>}
      {/* 危险等级（仅区域类型） */}
      {hotspot.type === 'area' &&
        !isLocked &&
        (() => {
          const area = (GD.areas || GD.module2_areas || []).find((a) => a.id === hotspot.areaId);
          if (area && area.danger_level > 0) {
            return (
              <span className="hotspot-danger">{'★'.repeat(Math.min(3, area.danger_level))}</span>
            );
          }
          return null;
        })()}
      {/* 当前位置标记 */}
      {isCurrent && <span className="hotspot-current-marker">▼</span>}
    </button>
  );
});

// === 连接路径线（SVG overlay） ===
export const MapPaths = memo(function MapPaths({ hotspots, state }) {
  const visibleIds = useMemo(() => {
    return new Set(hotspots.filter((h) => h.type === 'area').map((h) => h.areaId || h.id));
  }, [hotspots]);

  return (
    <svg className="town-map-paths" viewBox="0 0 100 100" preserveAspectRatio="none">
      {MAP_EDGES.map(([from, to]) => {
        const a = MAP_LAYOUT[from];
        const b = MAP_LAYOUT[to];
        if (!a || !b) return null;
        if (!visibleIds.has(from) || !visibleIds.has(to)) return null;

        // 路径状态
        const conn =
          typeof getConnectedAreas === 'function' ? getConnectedAreas(state.currentArea, ctx) : [];
        const isActive =
          (from === state.currentArea && conn.includes(to)) ||
          (to === state.currentArea && conn.includes(from));
        const fromVisited = state.visitedAreas.includes(from);
        const toVisited = state.visitedAreas.includes(to);
        const isKnown = fromVisited && toVisited;

        // 贝塞尔曲线控制点（轻微弯曲）
        const mx = (a.x + b.x) / 2 + (a.y - b.y) * 0.12;
        const my = (a.y + b.y) / 2 + (b.x - a.x) * 0.08;

        const cls = isActive ? 'map-path-active' : isKnown ? 'map-path-known' : 'map-path-faint';
        return (
          <path
            key={from + '-' + to}
            className={cls}
            d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
          />
        );
      })}
    </svg>
  );
});

// === 背景图切换 ===
function getMapBackground(state) {
  // 根据污染程度、SAN值切换全景地图变体
  const pollution = state.pollution || 0;
  const san = state.san || 60;

  // 高污染 → 崩坏版本
  if (pollution > 0.6) return 'assets/webp/沃切斯特全景 崩坏.webp';

  // 低SAN → 深夜版本
  if (san <= 30) return 'assets/webp/沃切斯特全景 深夜.webp';

  // 默认白天版本
  return 'assets/webp/沃切斯特全景 白天.webp';
}

// === 主组件：InteractiveTownMap ===
export function InteractiveTownMap({ state, dispatch }) {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  // 可见热点
  const hotspots = useMemo(() => {
    return getVisibleHotspots(state);
  }, [state.currentArea, state.visitedAreas?.length, state.day, state.clues?.length]);

  // NPC 指示器：哪些热点区域当前有 NPC
  const npcsByArea = useMemo(() => {
    const map = {};
    const npcs = GD.npcs || GD.module3_npcs || [];
    npcs.forEach((n) => {
      if (state.npcStates[n.name]?.dead) return;
      const d = ((state.day - 1) % 5) + 1;
      const sch = (n.schedule || []).find((x) => x.startsWith('day' + d));
      if (sch) {
        const loc = (sch.split(':')[1] || '').trim();
        if (!map[loc]) map[loc] = [];
        map[loc].push(n);
      }
    });
    return map;
  }, [state.day, state.npcStates]);

  // 背景图
  const bgImage = useMemo(() => getMapBackground(state), [state.pollution, state.san, state.day]);

  // 热点点击处理
  const handleHotspotClick = useCallback(
    (hotspot) => {
      audioManager.playUI('panel_open');

      if (hotspot.type === 'area') {
        // 区域热点
        if (state.currentArea === hotspot.areaId) {
          // 已在该区域 → 直接打开探索面板
          uiStore.setState({ activeHotspot: hotspot, activePanel: 'area_actions' });
        } else {
          // 不在该区域 → 执行 MOVE action
          const conn = getConnectedAreas(state.currentArea, ctx);
          if (conn.includes(hotspot.areaId) && isHotspotUnlocked(hotspot, state) && state.ap >= 1) {
            dispatch({ type: 'MOVE', areaId: hotspot.areaId });
            // 移动后打开该区域面板
            setTimeout(() => {
              uiStore.setState({ activeHotspot: hotspot, activePanel: 'area_actions' });
            }, 300);
          } else {
            // 不可达 → 显示提示
            addUiToast({
              id: 'locked_' + hotspot.id,
              type: 'info',
              def: { icon: '🔒', name: hotspot.unlockHint || '无法前往', desc: '' },
            });
          }
        }
      } else if (hotspot.type === 'building') {
        // 建筑热点 → 直接打开对应面板
        uiStore.setState({
          activeHotspot: hotspot,
          activePanel: hotspot.actions[0] || 'area_actions',
        });
      }
    },
    [state, dispatch]
  );

  // 缩放控制
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.5, Math.min(2.5, z + (e.deltaY > 0 ? -0.1 : 0.1))));
  }, []);

  // 拖拽平移
  const handleMouseDown = useCallback(
    (e) => {
      if (e.target.closest('.town-hotspot')) return;
      setDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY };
      panStart.current = { ...pan };
    },
    [pan]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!dragging) return;
      setPan({
        x: panStart.current.x + (e.clientX - dragStart.current.x),
        y: panStart.current.y + (e.clientY - dragStart.current.y),
      });
    },
    [dragging]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  // 触屏支持
  const handleTouchStart = useCallback(
    (e) => {
      if (e.target.closest('.town-hotspot')) return;
      const t = e.touches[0];
      setDragging(true);
      dragStart.current = { x: t.clientX, y: t.clientY };
      panStart.current = { ...pan };
    },
    [pan]
  );

  const handleTouchMove = useCallback(
    (e) => {
      if (!dragging) return;
      const t = e.touches[0];
      setPan({
        x: panStart.current.x + (t.clientX - dragStart.current.x),
        y: panStart.current.y + (t.clientY - dragStart.current.y),
      });
    },
    [dragging]
  );

  // 键盘快捷键（继承 CenterPanel 的 1-9 键）
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      // M 键已移至 GameLayout 统一处理
      // Escape 关闭活跃面板
      if (e.key === 'Escape') {
        uiStore.setState({ activeHotspot: null, activePanel: null });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div
      className="town-map-container"
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseUp}
    >
      {/* 缩放+平移容器：背景图、路径、热点一起变换 */}
      <div
        className="town-map-viewport"
        style={{
          transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          transformOrigin: 'center center',
        }}
      >
        {/* 全景背景图 */}
        <div className="town-map-background">
          <img
            src={bgImage}
            alt="沃切斯特全景"
            className="town-map-bg-image"
            draggable={false}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement.classList.add('town-map-bg-fallback');
            }}
          />
          {/* 氛围雾气叠加 */}
          <div className="town-map-fog" />
        </div>

        {/* SVG 路径连线 */}
        <MapPaths hotspots={hotspots} state={state} />

        {/* 热点节点层 */}
        <div className="town-map-hotspots">
          {hotspots.map((hotspot) => {
            const hotspotState =
              hotspot.type === 'area' ? getHotspotState(hotspot, state) : 'available';
            const isCurrent = state.currentArea === (hotspot.areaId || hotspot.id);
            const npcHere = npcsByArea[hotspot.areaId]?.length > 0;

            return (
              <HotspotNode
                key={hotspot.id}
                hotspot={hotspot}
                hotspotState={hotspotState}
                isCurrentArea={isCurrent}
                npcHere={npcHere}
                onClick={handleHotspotClick}
              />
            );
          })}
        </div>
      </div>

      {/* 缩放控制 */}
      <div className="town-map-zoom-controls">
        <button
          className="map-zoom-btn"
          onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
          title="放大"
        >
          +
        </button>
        <span className="map-zoom-level">{Math.round(zoom * 100)}%</span>
        <button
          className="map-zoom-btn"
          onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
          title="缩小"
        >
          −
        </button>
        <button
          className="map-zoom-btn"
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          title="重置"
        >
          ⟲
        </button>
      </div>

      {/* 图例 */}
      <div className="town-map-legend">
        <span className="legend-item legend-current">● 当前位置</span>
        <span className="legend-item legend-reachable">● 可前往</span>
        <span className="legend-item legend-visited">○ 已访问</span>
        <span className="legend-item legend-locked">◌ 未解锁</span>
      </div>

      {/* 操作提示 */}
      <div className="town-map-hint">
        {state.day <= 3 && state.loopCount <= 0
          ? '🔔 你听到了钟声。它从教堂的方向传来。或者是码头。你不确定。 · 点击热点探索'
          : '点击热点探索 · 滚轮缩放 · 拖拽平移 · M键切换经典模式 · Esc关闭面板'}
      </div>
    </div>
  );
}
