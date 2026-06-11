// src/components/FloatingInfoBar.jsx — 暗黑地牢风格浮动信息栏
// 悬浮在地图上方的 HUD，显示关键状态信息。
// 设计参考：Darkest Dungeon 的顶部/底部状态栏

function FloatingInfoBar({ state, dispatch }) {
  const areas = GD.areas || GD.module2_areas || [];
  const area = areas.find(a => a.id === state.currentArea);
  const areaName = area ? getAreaDisplayName(area, state) : state.currentArea;
  const sanStage = getSanStage(state.san, ctx);
  const sanClass = state.san >= 80 ? 'stable' : state.san >= 60 ? 'tense' : state.san >= 40 ? 'shaken' : state.san >= 20 ? 'critical' : 'abyssal';
  const sealLabel = state.sealState === 'intact' ? '完整' : state.sealState === 'weakening' ? '削弱' : state.sealState === 'critical' ? '危急' : state.sealState === 'collapsing' ? '崩塌' : '破裂';

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
      </div>

      {/* 中间：核心状态条 */}
      <div className="finfo-center">
        <div className="finfo-bar-group">
          <div className={'finfo-bar san ' + sanClass}>
            <span className="finfo-bar-label">精神</span>
            <div className="finfo-bar-track">
              <div className="finfo-bar-fill" style={{ width: (state.san / state.maxSan * 100) + '%' }} />
            </div>
            <span className="finfo-bar-value">{state.san}</span>
          </div>
          <div className="finfo-bar hp">
            <span className="finfo-bar-label">生命</span>
            <div className="finfo-bar-track">
              <div className="finfo-bar-fill" style={{ width: (state.hp / state.maxHp * 100) + '%' }} />
            </div>
            <span className="finfo-bar-value">{state.hp}</span>
          </div>
          <div className="finfo-bar ap">
            <span className="finfo-bar-label">行动</span>
            <div className="finfo-bar-track">
              <div className="finfo-bar-fill" style={{ width: (state.ap / state.maxAp * 100) + '%' }} />
            </div>
            <span className="finfo-bar-value">{state.ap}</span>
          </div>
        </div>
      </div>

      {/* 右侧：快捷操作 */}
      <div className="finfo-right">
        <span className="finfo-pill food">⻝ {state.food || 0}/{state.maxFood || 5}</span>
        <span className="finfo-pill money">💰 {state.money || 0}</span>
        <span className={'finfo-pill seal seal-' + state.sealState}>封印：{sealLabel}</span>
        <span className="finfo-pill clue">线索 {state.clues.length}</span>
        <button className="finfo-btn" onClick={() => uiStore.setState({ settingsOpen: true })} title="设置">⚙</button>
        <button className="finfo-btn" onClick={() => { uiStore.setState({ saveLoadMode: 'save', saveLoadOpen: true }); }} title="存档">💾</button>
        <button className="finfo-btn" onClick={() => { uiStore.setState({ saveLoadMode: 'load', saveLoadOpen: true }); }} title="读档">📖</button>
        <button className="finfo-btn" onClick={() => { uiStore.setState({ uiMode: 'classic' }); }} title="切换经典模式">☷</button>
      </div>
    </div>
  );
}

// === 叙事浮动面板（在地图模式下显示最新的叙述文本） ===
function NarrativeFloatingPanel({ state, dispatch }) {
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
  const hasPending = state.pendingEvent?.rolled || state.pendingNpc || state.pendingGamble || state.pendingChoice || state.ending;

  if (!expanded && !hasPending && recentNarrative.length === 0) return null;

  return (
    <div className={'narrative-floating-panel' + (expanded ? ' expanded' : '') + (hasPending ? ' has-pending' : '')}>
      {/* 折叠按钮 */}
      <button className="narrative-toggle" onClick={() => setExpanded(v => !v)}>
        {expanded ? '▼ 收起叙述' : '▲ 展开叙述'} ({state.narrative.length})
      </button>

      {/* 叙述内容 */}
      {expanded && (
        <div className="narrative-floating-content" ref={panelRef}>
          {state.narrative.map(b => <NarrativeBlock key={b.id} block={b} />)}
        </div>
      )}

      {/* 待处理交互（始终显示在折叠面板上方） */}
      {hasPending && (
        <div className="narrative-pending-area">
          {state.pendingEvent?.rolled && (
            <div className="skill-check">
              <div className="roll-result">
                <div className={'roll-num ' + (state.pendingEvent.result === 'success' ? 'success' : 'fail')}>
                  {state.pendingEvent.roll} / 技能{state.pendingEvent.playerSkill} / 难度{state.pendingEvent.threshold}
                </div>
                <div className={state.pendingEvent.result === 'success' ? 'result-success' : 'result-fail'}>
                  {state.pendingEvent.result === 'success' ? '成功！' : '失败！'}
                </div>
              </div>
              <button className="btn btn-sm" onClick={() => dispatch({ type: 'DISMISS_PENDING' })}>继续</button>
            </div>
          )}
          {state.pendingNpc && (
            <NPCDialog npc={state.pendingNpc.npc} trust={state.pendingNpc.trust} layer={state.pendingNpc.layer} dispatch={dispatch} state={state} />
          )}
          {state.pendingChoice && (
            <div className="skill-check">
              <div className="check-title">选择</div>
              {state.pendingChoice.choices.map((ch, i) => (
                <CorruptibleChoice key={i} className="btn btn-sm" san={state.san} onClick={() => dispatch({ type: 'CHOICE_SELECT', choiceIdx: i })}>
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