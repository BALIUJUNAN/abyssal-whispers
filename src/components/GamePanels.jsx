// src/components/GamePanels.jsx - Game panel components (extracted from app.jsx)
// LeftPanel, CenterPanel, RightPanel, EndingScreen, GameHeader
// NPCDialog -> NPCDialog.jsx, CitySketchMap -> CitySketchMap.jsx
const { useState, useEffect, useRef, useMemo, useCallback, memo } = React;
import { StatBar, CollapsibleSection, NarrativeBlock } from './GameCommon.jsx';
import { NPCDialog } from './NPCDialog.jsx';
import { CitySketchMap } from './CitySketchMap.jsx';

export const LeftPanel = memo(function LeftPanel({ state }) {
  const seal = useMemo(
    () =>
      (GD.world?.seal_state_machine || []).find((s) => s.id === state.sealState) ||
      (GD.module8_time_schedule?.seal_state_machine?.states || []).find(
        (s) => s.id === state.sealState
      ),
    [state.sealState]
  );
  const shStage = useMemo(
    () => getSafehouseStage(state.safehouseCorruption, ctx),
    [state.safehouseCorruption]
  );
  // 快捷键 I：滚动到随身物件
  useEffect(() => {
    const handler = () => {
      const el = document.querySelector('[data-section="inventory"]');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    window.addEventListener('kbd:showInventory', handler);
    return () => window.removeEventListener('kbd:showInventory', handler);
  }, []);
  const altSanRestore = useMemo(() => {
    if (state.currentSafehouse === 'main') return 0;
    return (
      (GD.systems?.safehouse?.relocation_rules?.alternative_safehouses || []).find(
        (a) => a.name === state.currentSafehouse
      )?.functions?.san_restore || 0
    );
  }, [state.currentSafehouse]);
  const playerImage = getPlayerImage({
    san: state.san,
    hp: state.hp,
    maxHp: state.maxHp,
    pollution: state.pollution,
    loopCount: state.loopCount,
    madnessActive: state.madnessActive,
  });
  return (
    <div className="left-panel">
      {playerImage && (
        <div className="player-portrait-container">
          <img
            className="portrait-img player-portrait"
            src={playerImage}
            alt="我"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}
      {/* 常驻：生存状态 */}
      <div className="dossier-section">
        <div className="dossier-section-title" style={{ cursor: 'default' }}>
          调查员状态
        </div>
        <StatBar
          label="HP"
          value={state.hp}
          max={state.maxHp}
          cls="hp"
          colorMap={['var(--accent2)', 'var(--gold)', 'var(--danger)']}
        />
        <StatBar
          label="精神"
          value={state.san}
          max={state.maxSan}
          cls={'san' + (state.san <= 30 ? ' low' : state.san <= 50 ? ' mid' : '')}
          colorMap={['var(--san-high)', 'var(--san-mid)', 'var(--san-low)']}
        />
        <StatBar label="行动力" value={state.ap} max={state.maxAp} cls="ap" />
        <StatBar label="食物" value={state.food || 0} max={state.maxFood || 5} cls="food" />
        <div
          style={{
            fontSize: '0.7rem',
            padding: '0.1rem 0',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ color: 'var(--text-dim)' }}>金钱</span>
          <span style={{ color: 'var(--gold)', fontFamily: 'JetBrains Mono,monospace' }}>
            {state.money || 0}
          </span>
        </div>
      </div>
      {/* 折叠：身体记录 */}
      <CollapsibleSection title="身体记录" defaultOpen={false}>
        <div className="base-stats">
          {Object.entries(state.stats).map(([k, v]) => (
            <div key={k} className="base-stat">
              <div className="label">{k}</div>
              <div className="val">{v}</div>
            </div>
          ))}
        </div>
      </CollapsibleSection>
      {/* 折叠：调查技能 */}
      {(() => {
        const top = Object.entries(state.skills)
          .filter(([, v]) => v > 0)
          .sort((a, b) => b[1] - a[1])[0];
        return (
          <CollapsibleSection title="调查技能" defaultOpen={false} summary={top ? top[0] : ''}>
            {Object.entries(state.skills)
              .filter(([, v]) => v > 0)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([k, v]) => (
                <div key={k} className="skill-item">
                  <span className="name">{k}</span>
                  <span className="val">{v}%</span>
                </div>
              ))}
          </CollapsibleSection>
        );
      })()}
      {/* 折叠：随身物件 */}
      <div data-section="inventory">
        <CollapsibleSection title="随身物件" count={state.inventory.length} defaultOpen={true}>
          {state.inventory.map((item, i) => (
            <div key={i} className="item-entry">
              <span className="name">{item.name}</span>
              {item.uses > 0 && <span className="uses"> ×{item.uses}</span>}
              {item.uses === -1 && <span className="uses"> ∞</span>}
            </div>
          ))}
        </CollapsibleSection>
      </div>
      {/* 折叠：已知线索 */}
      {state.clues.length > 0 && (
        <CollapsibleSection
          title="已知线索"
          count={state.clues.length}
          defaultOpen={true}
          summary={(() => {
            const _lc = state.clues[state.clues.length - 1];
            return (
              (typeof _lc === 'object' ? _lc.name : resolveClueName(_lc || '')).slice(0, 12) || ''
            );
          })()}
        >
          {state.clues.slice(-5).map((c, i) => (
            <div key={i} className="clue-entry">
              · {typeof c === 'object' ? c.name : resolveClueName(c)}
            </div>
          ))}
        </CollapsibleSection>
      )}
      {/* 折叠：封印记录 */}
      {seal && (
        <CollapsibleSection title="封印记录" defaultOpen={false} summary={seal?.name || ''}>
          <div className={'seal-status ' + (state.sealState || 'intact')}>
            <div className="state">{seal.name}</div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>
              {(seal.description || '').slice(0, 40)}...
            </div>
          </div>
        </CollapsibleSection>
      )}
      {/* 折叠：避难所状态 */}
      <CollapsibleSection title="避难所状态" summary={shStage.name}>
        <div className={'safehouse-info s' + shStage.stage}>
          <div className="stage-name">
            {shStage.name}
            {state.currentSafehouse !== 'main' ? ' · ' + state.currentSafehouse : ''}
          </div>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>
            恢复：{shStage.available_functions?.san_recovery || 0}
            {altSanRestore > 0 ? ' +' + altSanRestore : ''} | 污染：{state.safehouseCorruption}%
          </div>
        </div>
      </CollapsibleSection>
      {/* 折叠：环境记录 */}
      <CollapsibleSection title="环境记录" defaultOpen={false} summary={state.weather}>
        <div className="weather-info">
          天气：{state.weather} | 光源：Lv.{state.lightLevel || 0}
        </div>
      </CollapsibleSection>
    </div>
  );
});

export const CenterPanel = memo(function CenterPanel({ state, dispatch }) {
  const ref = useRef(null);
  const transitionTimer = useRef(null);
  const [forbiddenOpen, setForbiddenOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  // 操作分组折叠状态
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const toggleActionGroup = (g) => setCollapsedGroups((prev) => ({ ...prev, [g]: !prev[g] }));
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [state.narrative.length]);
  // Keyboard shortcuts: 1-9, Space, Enter, M, I, J
  useEffect(() => {
    const isPending =
      state.pendingEvent?.rolled ||
      state.pendingNpc ||
      state.pendingGamble ||
      state.pendingChoice ||
      state.ending;
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const key = e.key;
      // 1-9: select action button (always active)
      if (key >= '1' && key <= '9') {
        const idx = parseInt(key) - 1;
        const btns = document.querySelectorAll('.action-area .action-btn:not(:disabled)');
        if (btns[idx]) {
          btns[idx].click();
          e.preventDefault();
        }
        return;
      }
      if (isPending) return;
      // Space/Enter: click first enabled action
      if (key === ' ' || key === 'Enter') {
        const btn = document.querySelector('.action-area .action-btn:not(:disabled)');
        if (btn) {
          btn.click();
          e.preventDefault();
        }
        return;
      }
      // M: toggle map tab
      if (key === 'm' || key === 'M') {
        window.dispatchEvent(new Event('kbd:toggleMap'));
        return;
      }
      // I: scroll to inventory in left panel
      if (key === 'i' || key === 'I') {
        window.dispatchEvent(new Event('kbd:showInventory'));
        return;
      }
      // J: switch to clues tab
      if (key === 'j' || key === 'J') {
        window.dispatchEvent(new Event('kbd:showClues'));
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    state.ap,
    state.currentArea,
    state.day,
    state.pendingEvent,
    state.pendingNpc,
    state.pendingGamble,
    state.pendingChoice,
    state.ending,
    dispatch,
  ]);
  // Auto-clear transition overlays after animation
  useEffect(() => {
    if (!state.transition) return;
    const dur = { move: 800, rest: 1800, 'san-loss': 500, chapter: 2500 }[state.transition] || 800;
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    transitionTimer.current = setTimeout(() => dispatch({ type: 'CLEAR_TRANSITION' }), dur);
    return () => {
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
    };
  }, [state.transition, dispatch]);
  const conn = useMemo(() => getConnectedAreas(state.currentArea, ctx), [state.currentArea]);
  const npcs = useMemo(
    () => getNpcsHere(state),
    [state.day, state.currentArea, state.npcStates, state.npcTrust]
  );
  const areas = GD.areas || GD.module2_areas || [];
  const itemUseInfo = useMemo(() => {
    const m = {};
    (GD.items || []).forEach((def) => {
      if (def.use_hint) m[def.name] = def.use_hint;
    });
    return m;
  }, []);
  // P3: perception levels — respect accessibility
  const percCls = useMemo(() => {
    const raw =
      state.accessibilityOptions?.visual_distortion === false
        ? { focus: 0, edge: 0, audio: 0, input: 0, text: 0 }
        : getPerceptionLevels(state);
    return (
      (raw.text > 0 ? ' perception-text-' + Math.min(3, raw.text) : '') +
      (raw.focus > 1 ? ' perception-focus-' + Math.min(3, raw.focus) : '') +
      (raw.edge > 0 ? ' perception-edge-' + Math.min(3, raw.edge) : '')
    );
  }, [
    state.san,
    state.loopCount,
    state.safehouseCorruption,
    state.currentArea,
    state.accessibilityOptions?.visual_distortion,
  ]);
  // audio perception → volume modulation (safe, no side effect on render)
  const perceptionAudio =
    state.accessibilityOptions?.visual_distortion === false ? 0 : getPerceptionLevels(state).audio;
  try {
    if (perceptionAudio >= 2) {
      audioManager._volumeScale = 0.6 + perceptionAudio * 0.15;
    } else {
      audioManager._volumeScale = 1;
    }
  } catch (e) {}

  return (
    <div className="center-panel">
      {state.transition && (
        <div className={'transition-overlay transition-' + state.transition}>
          {state.transition === 'rest' && <div className="transition-day">第 {state.day} 天</div>}
          {state.transition === 'chapter' && (
            <div className="transition-chapter-content">
              <div className="transition-chapter-label">— 章节 —</div>
              <div className="transition-chapter-name">
                {(() => {
                  const ch = getChapterForDay(state.day, ctx);
                  return ch?.name || '未知章节';
                })()}
              </div>
              <div className="transition-chapter-day">第 {state.day} 天</div>
            </div>
          )}
        </div>
      )}
      <div className={'narrative-area' + percCls} ref={ref}>
        {state.narrative.map((b) => (
          <NarrativeBlock key={b.id} block={b} />
        ))}
        {state.pendingEvent &&
          !state.pendingEvent.rolled &&
          state.pendingEvent.effects?.skill_check && (
            <div className="narrative-block">
              <div className="skill-check">
                <div className="check-title">
                  技能检定：{state.pendingEvent.effects.skill_check.skill}（阈值{' '}
                  {state.pendingEvent.effects.skill_check.threshold || 50}）
                </div>
                <button
                  className="btn btn-sm"
                  onClick={() => dispatch({ type: 'DO_SKILL_CHECK' })}
                  style={{ marginTop: '0.3rem' }}
                >
                  掷骰 (d100)
                </button>
              </div>
            </div>
          )}
        {state.pendingEvent?.rolled && (
          <div className="narrative-block">
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
              <button
                className="btn btn-sm"
                onClick={() => dispatch({ type: 'DISMISS_PENDING' })}
                style={{ marginTop: '0.3rem' }}
              >
                继续
              </button>
            </div>
          </div>
        )}
        {state.pendingNpc && (
          <NPCDialog
            npc={state.pendingNpc.npc}
            trust={state.pendingNpc.trust}
            layer={state.pendingNpc.layer}
            dispatch={dispatch}
            state={state}
          />
        )}
        {state.pendingGamble && (
          <div className="narrative-block">
            <div className="skill-check">
              <div className="check-title" style={{ color: 'var(--danger2)' }}>
                深入探究？
              </div>
              <div
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--text)',
                  lineHeight: '1.6',
                  margin: '0.5rem 0',
                }}
              >
                某些东西一旦看到就无法忘记。你可以选择就此收手，或者更深入地观察——代价未知。
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {state.pendingGamble.options.map((opt) => {
                  const label =
                    opt.id === 'safe'
                      ? getOptionText('gamble_safe', state.san) || opt.label
                      : getOptionText('gamble_deep', state.san) || opt.label;
                  const risk = opt.cost ? '（SAN损失 1d6）' : '（安全）';
                  return (
                    <CorruptibleChoice
                      key={opt.id}
                      className={
                        'btn btn-sm' + (opt.id === 'deep_investigate' ? ' btn-danger' : '')
                      }
                      san={state.san}
                      onClick={() => dispatch({ type: 'GAMBLE_CHOICE', choiceId: opt.id })}
                    >
                      {label}
                      <span className="cost">{risk}</span>
                    </CorruptibleChoice>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        {state.pendingChoice && (
          <div className="narrative-block">
            <div className="skill-check">
              <div className="check-title">选择</div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.3rem',
                  marginTop: '0.3rem',
                }}
              >
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
            </div>
          </div>
        )}
      </div>
      {!state.pendingEvent?.rolled &&
        !state.pendingNpc &&
        !state.pendingGamble &&
        !state.pendingChoice &&
        !state.ending && (
          <div className="action-area">
            {(() => {
              window.__n = 0;
              return null;
            })()}
            {(() => {
              const ts = state.tutorialSeen || {};
              const hints = [
                { key: 'first_explore', text: '探索区域可能发现线索或遭遇异常。需要2AP。' },
                { key: 'first_move', text: '移动到相邻区域会消耗1AP。试试和NPC交谈获取情报。' },
                { key: 'first_talk', text: '和NPC交谈可以获取情报，建立信任会解锁更多内容。' },
                { key: 'first_clue', text: '你发现了一条线索！线索会保存在右侧面板。' },
                { key: 'first_rest', text: '结束一天会消耗食物恢复AP和SAN。注意食物管理。' },
              ];
              const hint = hints.find((h) => !ts[h.key]);
              if (!hint) return null;
              return (
                <div className="tutorial-hint" key={hint.key}>
                  {hint.text}
                </div>
              );
            })()}

            {/* A. 调查行动 */}
            <div className="action-group">
              <div className="action-group-title" onClick={() => toggleActionGroup('investigate')}>
                <span className={'chevron' + (collapsedGroups.investigate ? '' : ' open')}>▶</span>
                <span className="action-group-icon">🔍</span>调查行动
              </div>
              <div
                className={'action-group-grid' + (collapsedGroups.investigate ? ' collapsed' : '')}
              >
                <button
                  className="action-btn primary-action"
                  onClick={() => dispatch({ type: 'EXPLORE' })}
                  disabled={state.ap < 2}
                >
                  <span className="btn-hint">
                    {(() => {
                      window.__n = (window.__n || 0) + 1;
                      return window.__n;
                    })()}
                  </span>
                  <span className="action-icon">🔍</span>
                  {getOptionText('investigate_sound', state.san) || '探索区域'}
                  <span className="cost">2 AP</span>
                </button>
                {conn.map((aid) => {
                  const a = areas.find((ar) => ar.id === aid);
                  if (!a) return null;
                  const unlocked = isAreaUnlocked(a, state);
                  const isRumor = a.chapter_1_role === 'rumor_only' && !unlocked;
                  window.__n = (window.__n || 0) + 1;
                  const n = window.__n;
                  return (
                    <button
                      key={aid}
                      className="action-btn primary-action"
                      onClick={() => dispatch({ type: 'MOVE', areaId: aid })}
                      disabled={state.ap < 1 || !unlocked}
                    >
                      <span className="btn-hint">{n}</span>
                      <span className="action-icon">{isRumor ? '?' : '👣'}</span>
                      {isRumor ? '听说：' : ''}
                      {a.name}
                      {!unlocked ? ' [锁定]' : ''}
                      <span className="cost">{!unlocked ? '需要线索' : '1 AP'}</span>
                    </button>
                  );
                })}
                {npcs.map((npc) => {
                  window.__n = (window.__n || 0) + 1;
                  const n = window.__n;
                  return (
                    <button
                      key={npc.name}
                      className="action-btn"
                      onClick={() => dispatch({ type: 'TALK_NPC', npc: npc })}
                      disabled={state.ap < 1}
                    >
                      <span className="btn-hint">{n}</span>
                      <span className="action-icon">💬</span>
                      {npc.name}
                      <span className="cost">1 AP</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* B. 随身物件 */}
            {state.inventory.filter((i) => i.uses !== 0).some((it) => itemUseInfo[it.name]) && (
              <div className="action-group">
                <div className="action-group-title" onClick={() => toggleActionGroup('items')}>
                  <span className={'chevron' + (collapsedGroups.items ? '' : ' open')}>▶</span>
                  <span className="action-group-icon">🎒</span>随身物件
                </div>
                <div className={'action-group-grid' + (collapsedGroups.items ? ' collapsed' : '')}>
                  {state.inventory
                    .filter((i) => i.uses !== 0)
                    .map((it, i) => {
                      const label = itemUseInfo[it.name];
                      if (!label) return null;
                      window.__n = (window.__n || 0) + 1;
                      const n = window.__n;
                      return (
                        <button
                          key={i}
                          className="action-btn"
                          onClick={() => dispatch({ type: 'USE_ITEM', item: it })}
                        >
                          <span className="btn-hint">{n}</span>
                          <span className="action-icon">🧪</span>
                          {it.name}
                          <span className="cost">
                            {label}
                            {it.uses > 0 ? ' ×' + it.uses : ''}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* C. 日常行动 */}
            <div className="action-group">
              <div className="action-group-title" onClick={() => toggleActionGroup('daily')}>
                <span className={'chevron' + (collapsedGroups.daily ? '' : ' open')}>▶</span>
                <span className="action-group-icon">☀️</span>日常行动
              </div>
              <div className={'action-group-grid' + (collapsedGroups.daily ? ' collapsed' : '')}>
                {getAvailableSafehouses(state)
                  .filter((sh) => state.currentSafehouse !== sh.name)
                  .map((sh) => {
                    window.__n = (window.__n || 0) + 1;
                    const n = window.__n;
                    return (
                      <button
                        key={sh.name}
                        className="action-btn"
                        onClick={() => dispatch({ type: 'SWITCH_SAFEHOUSE', safehouse: sh.name })}
                      >
                        <span className="btn-hint">{n}</span>
                        <span className="action-icon">🏠</span>搬到{sh.name}
                        <span className="cost">恢复+{sh.functions?.san_restore || 0}</span>
                      </button>
                    );
                  })}
                {state.currentSafehouse !== 'main' &&
                  (() => {
                    window.__n = (window.__n || 0) + 1;
                    const n = window.__n;
                    return (
                      <button
                        className="action-btn"
                        onClick={() => dispatch({ type: 'SWITCH_SAFEHOUSE', safehouse: 'main' })}
                      >
                        <span className="btn-hint">{n}</span>
                        <span className="action-icon">🍺</span>回酒馆
                        <span className="cost">返回原处</span>
                      </button>
                    );
                  })()}
                {(() => {
                  window.__n = (window.__n || 0) + 1;
                  const n = window.__n;
                  return (
                    <button
                      className="action-btn"
                      onClick={() => dispatch({ type: 'WORK' })}
                      disabled={state.ap < 2}
                    >
                      <span className="btn-hint">{n}</span>
                      <span className="action-icon">💰</span>打工挣钱
                      <span className="cost">2 AP</span>
                    </button>
                  );
                })()}
                {state.currentArea === 'town_center' &&
                  (() => {
                    window.__n = (window.__n || 0) + 1;
                    const n = window.__n;
                    const canBuy =
                      state.ap >= 1 &&
                      (state.money || 0) >= 3 &&
                      (state.food || 0) < (state.maxFood || 5);
                    return (
                      <button
                        className="action-btn"
                        onClick={() => dispatch({ type: 'BUY_FOOD' })}
                        disabled={!canBuy}
                      >
                        <span className="btn-hint">{n}</span>
                        <span className="action-icon">🛒</span>杂货店买食物
                        <span className="cost">1 AP · 3金钱</span>
                      </button>
                    );
                  })()}
                {(() => {
                  window.__n = (window.__n || 0) + 1;
                  const n = window.__n;
                  return (
                    <button className="action-btn" onClick={() => dispatch({ type: 'REST' })}>
                      <span className="btn-hint">{n}</span>
                      <span className="action-icon">🏕️</span>
                      {getOptionText('rest_at_safehouse', state.san) || '结束今日'}
                      <span className="cost">休息恢复</span>
                    </button>
                  );
                })()}
              </div>
            </div>

            {/* D. 禁忌批注 */}
            {(() => {
              const dangerActions = [];
              if (['town_center', 'harbor_district'].includes(state.currentArea))
                dangerActions.push({
                  type: 'DESECRATE',
                  label: '亵渎圣地',
                  cost: '2 AP',
                  costAp: 2,
                });
              if (
                ['catacombs_entrance', 'deep_catacombs', 'ruins_of_yith'].includes(
                  state.currentArea
                )
              )
                dangerActions.push({
                  type: 'BREAK_SEAL',
                  label: '破坏封印',
                  cost: '3 AP',
                  costAp: 3,
                });
              if (state.san < 60 || state.pollution > 0.2)
                dangerActions.push({
                  type: 'SELF_HARM',
                  label: '自残仪式',
                  cost: '2 AP',
                  costAp: 2,
                });
              if (
                (state.behaviorTracking.cult_leader_score || 0) >= 1 ||
                (state.mythosLevel || 0) >= 2
              )
                dangerActions.push({
                  type: 'SPREAD_PROPHECY',
                  label: '散布预言',
                  cost: '2 AP',
                  costAp: 2,
                });
              if (state.clues && state.clues.length >= 2)
                dangerActions.push({
                  type: 'CONSUME_ARCHIVE',
                  label: '吞噬档案',
                  cost: '2 AP',
                  costAp: 2,
                });
              if ((state.mythosLevel || 0) >= 2)
                dangerActions.push({
                  type: 'SELF_SACRIFICE',
                  label: '自我献祭',
                  cost: '3 AP',
                  costAp: 3,
                });
              if (dangerActions.length === 0) return null;
              return (
                <div className={'action-group forbidden' + (forbiddenOpen ? ' open' : '')}>
                  <button
                    type="button"
                    className="forbidden-toggle"
                    onClick={() => {
                      setForbiddenOpen((v) => {
                        audioManager.playUI(v ? 'panel_close' : 'panel_open');
                        return !v;
                      });
                    }}
                  >
                    <span className="forbidden-mark">{forbiddenOpen ? '▾' : '▸'}</span>
                    <span className="forbidden-title">
                      {forbiddenOpen ? '禁忌批注' : '不要翻开这一页'}
                    </span>
                    <span className="forbidden-count">{dangerActions.length}</span>
                  </button>
                  {forbiddenOpen && (
                    <div className="forbidden-actions">
                      <div className="forbidden-warning">
                        这些选择会留下痕迹。不是所有痕迹都会消失在下一次轮回里。
                      </div>
                      <div className="action-group-grid forbidden-grid">
                        {dangerActions.map((da) => {
                          window.__n = (window.__n || 0) + 1;
                          const n = window.__n;
                          return (
                            <button
                              key={da.type}
                              className="action-btn forbidden-btn"
                              onClick={() => dispatch({ type: da.type })}
                              disabled={state.ap < da.costAp}
                            >
                              <span className="btn-hint">{n}</span>
                              <span className="forbidden-bullet">※</span>
                              {da.label}
                              <span className="cost">{da.cost}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
            <div className="keyboard-hint">快捷键：1-9选择 · Space确认 · M地图 · I物品 · J线索</div>
          </div>
        )}
      {state.eventLog.length > 0 && (
        <div className="event-log">
          <div className="event-log-header" onClick={() => setLogOpen((v) => !v)}>
            <span className="event-log-toggle">{logOpen ? '▾' : '▸'}</span>
            <span>事件日志 ({state.eventLog.length})</span>
          </div>
          {logOpen && (
            <div className="event-log-body">
              {state.eventLog.slice(-8).map((l, i) => (
                <div key={i} className="log-entry">
                  <span className="log-day">[Day {l.day}]</span> {l.text}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export const RightPanel = memo(function RightPanel({ state, dispatch }) {
  const [tab, setTab] = useState('map');
  // 快捷键事件监听：M切换地图，J切换线索
  useEffect(() => {
    const onMap = () => setTab((prev) => (prev === 'map' ? 'map' : 'map'));
    const onClues = () => setTab('clues');
    window.addEventListener('kbd:toggleMap', onMap);
    window.addEventListener('kbd:showClues', onClues);
    return () => {
      window.removeEventListener('kbd:toggleMap', onMap);
      window.removeEventListener('kbd:showClues', onClues);
    };
  }, []);
  const areas = GD.areas || GD.module2_areas || [];
  const npcs = GD.npcs || GD.module3_npcs || [];
  const conn = useMemo(() => getConnectedAreas(state.currentArea, ctx), [state.currentArea]);
  const inProgressConclusions = useMemo(() => {
    return (GD.systems?.clue_conclusion?.conclusions || [])
      .filter((c) => !(state.discoveredConclusions || []).includes(c.id))
      .map((conc) => {
        const satisfied = (conc.evidence_pool || []).filter((ev) => {
          if (ev.source && state.triggeredEvents.includes(ev.source)) return true;
          const tm = ev.source && ev.source.match(/^(.+?)\s+trust>=(\d+)$/);
          if (tm) return (state.npcTrust[tm[1]] || 0) >= parseInt(tm[2]);
          return false;
        });
        const needed = conc.required_evidence_count || 2;
        if (satisfied.length === 0) return null;
        return (
          <div
            key={conc.id}
            style={{
              fontSize: '0.65rem',
              color: 'var(--text-dim)',
              padding: '0.15rem 0',
              borderLeft: '2px solid var(--border)',
              paddingLeft: '0.4rem',
              marginBottom: '0.2rem',
            }}
          >
            {conc.name} [{satisfied.length}/{needed}]
            {satisfied.map((ev, ei) => (
              <div key={ei} style={{ color: 'var(--blue)', paddingLeft: '0.3rem' }}>
                · {ev.description.slice(0, 25)}
              </div>
            ))}
          </div>
        );
      })
      .filter(Boolean);
  }, [state.discoveredConclusions, state.triggeredEvents, state.npcTrust]);
  const tabs = [
    { id: 'map', label: '地图' },
    { id: 'people', label: '人物' },
    { id: 'clues', label: '线索' },
    { id: 'goals', label: '目标' },
  ];
  const clueCount =
    state.clues.length +
    (state.completedChains?.length || 0) +
    (state.discoveredConclusions?.length || 0);
  return (
    <div className="right-panel">
      <div className="right-panel-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={'tab-btn' + (tab === t.id ? ' active' : '')}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === 'clues' && clueCount > 0 && <span className="tab-badge">{clueCount}</span>}
          </button>
        ))}
      </div>
      {tab === 'map' && (
        <div className="tab-content">
          <div className="panel-title">沃切斯特地图</div>
          <div className="map-section">
            <CitySketchMap areas={areas} state={state} dispatch={dispatch} conn={conn} />
          </div>
        </div>
      )}
      {tab === 'people' && (
        <div className="tab-content">
          <div className="panel-title">NPC</div>
          <div className="npc-section">
            {npcs
              .filter((n) => !state.npcStates[n.name]?.dead)
              .map((n) => {
                const trust = state.npcTrust[n.name] || 0;
                const ns = state.npcStates[n.name] || {};
                const d = ((state.day - 1) % 5) + 1;
                const sch = (n.schedule || []).find((s) => s.startsWith('day' + d));
                const loc = sch ? (sch.split(':')[1] || '').trim() : '???';
                const ln = (areas.find((a) => a.id === loc) || {}).name || loc;
                const npcImg =
                  trust > 0 || ns.corrupted ? getNpcImage(n.name, state.npcStates) : null;
                const inArea = state.currentArea === loc;
                const canTalk =
                  inArea &&
                  state.ap >= 1 &&
                  !state.pendingEvent?.rolled &&
                  !state.pendingNpc &&
                  !state.ending;
                return (
                  <div
                    key={n.name}
                    className={'npc-entry' + (canTalk ? ' npc-clickable' : '')}
                    onClick={canTalk ? () => dispatch({ type: 'TALK_NPC', npc: n }) : undefined}
                  >
                    {npcImg && (
                      <img
                        className="npc-portrait-thumb"
                        src={npcImg}
                        alt={n.name}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    {!npcImg && trust === 0 && !ns.corrupted && (
                      <div
                        className="npc-portrait-thumb"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(184,150,58,0.06)',
                          color: 'var(--text-dim)',
                          fontSize: '0.7rem',
                        }}
                      >
                        ?
                      </div>
                    )}
                    <div>
                      <div className="npc-name">
                        {n.name}
                        {n.chapter_1_availability === 'core' && (
                          <span
                            style={{
                              fontSize: '0.6rem',
                              color: 'var(--gold)',
                              marginLeft: '0.2rem',
                            }}
                          >
                            核心
                          </span>
                        )}
                        {inArea && state.ap >= 1 && (
                          <span
                            style={{
                              fontSize: '0.55rem',
                              color: 'var(--accent2)',
                              marginLeft: '0.3rem',
                            }}
                          >
                            💬
                          </span>
                        )}
                        {ns.corrupted && <span className="npc-status corrupted"> [腐蚀]</span>}
                        {ns.dead && <span className="npc-status dead"> [死亡]</span>}
                      </div>
                      <div className="npc-role">{n.role}</div>
                      <div className="npc-trust">
                        {'★'.repeat(Math.max(0, trust))}
                        {'☆'.repeat(Math.max(0, 5 - trust))} | {ln}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
          {state.activeBlessings && state.activeBlessings.length > 0 && (
            <>
              <div className="panel-title" style={{ color: 'var(--gold)' }}>
                恩赐
              </div>
              {state.activeBlessings.map((bkey, i) => {
                const b = GD.systems?.loop?.loop_blessings?.[bkey];
                return b ? (
                  <div
                    key={i}
                    style={{ fontSize: '0.7rem', color: 'var(--gold)', padding: '0.15rem 0' }}
                  >
                    ★ {b.name}
                  </div>
                ) : null;
              })}
            </>
          )}
          {state.humanityScore !== undefined && state.humanityScore !== 50 && (
            <>
              <div
                className="panel-title"
                style={{
                  color:
                    state.humanityScore >= 60
                      ? 'var(--accent2)'
                      : state.humanityScore >= 30
                        ? 'var(--gold)'
                        : 'var(--danger2)',
                }}
              >
                人性
              </div>
              <div
                style={{
                  fontSize: '0.7rem',
                  color:
                    state.humanityScore >= 60
                      ? 'var(--accent2)'
                      : state.humanityScore >= 30
                        ? 'var(--gold)'
                        : 'var(--danger2)',
                  padding: '0.15rem 0',
                }}
              >
                {state.humanityScore >= 60
                  ? '尚存人性'
                  : state.humanityScore >= 30
                    ? '人性脆弱'
                    : '人性迷失'}{' '}
                ({state.humanityScore})
              </div>
            </>
          )}
        </div>
      )}
      {tab === 'clues' && (
        <div className="tab-content">
          {state.clues.length > 0 && (
            <>
              <div className="panel-title">线索 ({state.clues.length})</div>
              <div className="clues-section">
                {state.clues.map((c, i) => (
                  <div key={i} className="clue-entry">
                    • {typeof c === 'object' ? c.name : resolveClueName(c)}
                  </div>
                ))}
              </div>
            </>
          )}
          {state.completedChains && state.completedChains.length > 0 && (
            <>
              <div className="panel-title">事件链 ({state.completedChains.length})</div>
              <div className="clues-section">
                {state.completedChains.map((cid, i) => (
                  <div
                    key={i}
                    style={{ fontSize: '0.7rem', color: 'var(--san-high)', padding: '0.15rem 0' }}
                  >
                    ✓ {cid}
                  </div>
                ))}
              </div>
            </>
          )}
          {state.discoveredConclusions && state.discoveredConclusions.length > 0 && (
            <>
              <div className="panel-title" style={{ color: 'var(--gold)' }}>
                结论
              </div>
              <div className="clues-section">
                {state.discoveredConclusions.map((cid, i) => {
                  const conc = (GD.systems?.clue_conclusion?.conclusions || []).find(
                    (c) => c.id === cid
                  );
                  return (
                    <div key={i} className="conclusion-entry">
                      ★ {conc?.name || cid}
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {inProgressConclusions}
          {state.loopCount > 0 && (
            <>
              <div className="panel-title" style={{ color: 'var(--purple)' }}>
                轮回
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--purple)', padding: '0.15rem 0' }}>
                第 {state.loopCount} 次轮回 | 污染：{Math.round((state.pollution || 0) * 100)}%
              </div>
            </>
          )}
        </div>
      )}
      {tab === 'goals' && (
        <div className="tab-content">
          {state.objectives && state.objectives.length > 0 && (
            <>
              <div className="panel-title">当前目标</div>
              <div className="clues-section">
                {state.objectives.map((o, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: '0.7rem',
                      padding: '0.15rem 0',
                      color: o.done ? 'var(--san-high)' : 'var(--text-dim)',
                    }}
                  >
                    {o.icon} {o.text} {o.done ? '✓' : ''}
                  </div>
                ))}
              </div>
            </>
          )}
          {state.eventLog.length > 0 && (
            <>
              <div className="panel-title">事件记录</div>
              <div className="clues-section">
                {state.eventLog.slice(-10).map((l, i) => (
                  <div
                    key={i}
                    style={{ fontSize: '0.65rem', color: 'var(--text-dim)', padding: '0.1rem 0' }}
                  >
                    <span style={{ color: 'var(--text-dim)', opacity: 0.5 }}>[Day {l.day}]</span>{' '}
                    {l.text}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
});

export function EndingScreen({ ending, state, dispatch }) {
  const tc =
    ending.type === 'good'
      ? 'good'
      : ending.type === 'bad'
        ? 'bad'
        : ending.type === 'hidden'
          ? 'hidden'
          : 'neutral';
  const recap = ending.recap;
  const endingImage = ending.id ? getEndingCgImage(ending.id) : null;
  const isStructured =
    recap && typeof recap === 'object' && !Array.isArray(recap) && recap.deathType;
  const isFirstDeath = state.loopCount === 0 && tc === 'bad';
  const deathAnimClass = isFirstDeath
    ? isStructured && recap.deathType === 'mental'
      ? 'death-anim-mental'
      : 'death-anim-physical'
    : '';
  return (
    <div className={'ending-screen ' + tc + ' ' + deathAnimClass}>
      <h2>{ending.name}</h2>
      {endingImage && (
        <img
          className="ending-cg"
          src={endingImage}
          alt={ending.name + '结局图'}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
      <div className="ending-desc">
        {ending.description
          .split('\n')
          .filter(Boolean)
          .map((p, i) => (
            <p key={i}>{p}</p>
          ))}
      </div>
      {ending.rewards && (
        <div className="rewards">
          <div style={{ marginBottom: '0.3rem' }}>奖励：</div>
          {ending.rewards.map((r, i) => (
            <div key={i}>{r}</div>
          ))}
        </div>
      )}
      {ending.behaviorAnnotations && ending.behaviorAnnotations.length > 0 && (
        <div className="behavior-annotations">
          <div className="annotation-label">档案附注</div>
          {ending.behaviorAnnotations.map((a, i) => (
            <div key={i} className="annotation-line">
              {a.name}：{(a.description || '').split('\n')[0].slice(0, 80)}
              {(a.description || '').length > 80 ? '……' : ''}
            </div>
          ))}
        </div>
      )}
      {isFirstDeath && (
        <div className="tutorial-hint" style={{ maxWidth: '500px', margin: '0 auto 1rem' }}>
          死亡不是终点。你的部分知识会在下一轮保留。点击"再次踏入深渊"开始新的轮回。
        </div>
      )}
      {isStructured ? (
        <>
          <div
            className={
              'death-recap death-report ' +
              (recap.deathType === 'mental' ? 'death-san' : 'death-physical')
            }
          >
            <div className="death-report-header">
              <div className="death-report-icon">
                {recap.deathType === 'mental' ? ' ' : recap.deathType === 'physical' ? ' ' : '⏱️'}
              </div>
              <div className="death-report-title">死因报告</div>
              <div className={'death-report-badge death-badge-' + recap.deathType}>
                {recap.deathType === 'physical'
                  ? '肉体消亡'
                  : recap.deathType === 'mental'
                    ? '理智崩塌'
                    : recap.deathType === 'time'
                      ? '时间耗尽'
                      : '未知'}
              </div>
            </div>
            <div className="death-report-stats">
              <div className="death-stat-row">
                <span className="death-stat-label">存活</span>
                <span className="death-stat-value">{recap.day} 天</span>
              </div>
              <div className="death-stat-row">
                <span className="death-stat-label">SAN</span>
                <span
                  className="death-stat-value"
                  style={{ color: state.san <= 0 ? 'var(--danger2)' : 'var(--san-low)' }}
                >
                  {state.san}/{state.maxSan}
                </span>
              </div>
              <div className="death-stat-row">
                <span className="death-stat-label">HP</span>
                <span
                  className="death-stat-value"
                  style={{ color: state.hp <= 0 ? 'var(--danger2)' : 'var(--text)' }}
                >
                  {state.hp}/{state.maxHp}
                </span>
              </div>
              <div className="death-stat-row">
                <span className="death-stat-label">污染</span>
                <span className="death-stat-value" style={{ color: 'var(--purple)' }}>
                  {Math.round((state.pollution || 0) * 100)}%
                </span>
              </div>
            </div>
            <div className="recap-section death-cause-section">
              <div className="recap-section-label">终结事件</div>
              <div className="recap-section-content">{recap.causeEvent}</div>
            </div>
            {recap.keyDiscoveries.length > 0 && (
              <div className="recap-section">
                <div className="recap-section-label">关键发现 ({recap.keyDiscoveries.length})</div>
                {recap.keyDiscoveries.map((d, i) => (
                  <div key={i} className="recap-section-item">
                    ⚡ {d}
                  </div>
                ))}
              </div>
            )}
            {recap.conclusionsUnlocked.length > 0 && (
              <div className="recap-section">
                <div className="recap-section-label">已解锁结论</div>
                {recap.conclusionsUnlocked.map((c, i) => (
                  <div key={i} className="recap-section-item">
                    {' '}
                    {typeof c === 'string' ? c : c}
                  </div>
                ))}
              </div>
            )}
            {recap.npcTrustHighlights.length > 0 && (
              <div className="recap-section">
                <div className="recap-section-label">NPC关系</div>
                {recap.npcTrustHighlights.map(([name, trust], i) => {
                  const t = Math.max(0, Math.min(5, trust));
                  return (
                    <div key={i} className="recap-section-item">
                      {name}：{'★'.repeat(t)}
                      {'☆'.repeat(5 - t)}
                    </div>
                  );
                })}
              </div>
            )}
            {recap.permanentUnlocks.length > 0 && (
              <div className="recap-section">
                <div className="recap-section-label">永久解锁</div>
                {recap.permanentUnlocks.map((b, i) => (
                  <div key={i} className="recap-section-item">
                    {b}
                  </div>
                ))}
              </div>
            )}
            {recap.pollutionGained > 0 && (
              <div className="recap-section">
                <div className="recap-section-label">污染扩散</div>
                <div className="recap-section-content" style={{ color: 'var(--purple)' }}>
                  世界污染 +{Math.round(recap.pollutionGained * 100)}%
                </div>
              </div>
            )}
            {recap.adviceLine && (
              <div className="recap-section">
                <div className="recap-section-label">分析建议</div>
                <div className="recap-section-content" style={{ fontStyle: 'italic' }}>
                  {recap.adviceLine}
                </div>
              </div>
            )}
            {recap.timeline.length > 0 && (
              <div className="recap-section">
                <div className="recap-section-label">时间线</div>
                <div className="death-timeline">
                  {recap.timeline.map((m, i) => (
                    <div key={i} className="timeline-entry">
                      <span className="timeline-day">D{m.day}</span>
                      <span className="timeline-text">{m.text.replace(/^第 \d+ 天：/, '')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="recap-final">
              {state.san <= 0
                ? '疯狂不是终点。它记住了你的选择。'
                : '死亡不是终点。雾会把你送回原处。'}
            </div>
          </div>
        </>
      ) : recap && Array.isArray(recap) ? (
        <div className="death-recap">
          <div className="recap-title">本轮留下的痕迹</div>
          {recap.slice(-5).map((m, i) => (
            <div key={i} className="recap-line">
              {typeof m === 'string' ? m : m.text}
            </div>
          ))}
          <div className="recap-final">
            {state.san <= 0
              ? '疯狂不是终点。它记住了你的选择。'
              : '死亡不是终点。雾会把你送回原处。'}
          </div>
        </div>
      ) : null}
      <div className="stats-summary">
        存活天数：{state.day} | 收集线索：{state.clues.length} | 最终SAN：{state.san} | 检定成功：
        {state.stats_run.checks_passed} | 探索区域：
        {state.stats_run.areas_explored || state.visitedAreas.length} | 总轮数：
        {state.stats_run.runs}
        {state.loopCount > 0 ? ' | 轮回：' + state.loopCount + '次' : ''}
        {state.humanityScore !== undefined
          ? ' | 人性：' +
            (state.humanityScore >= 60 ? '尚存' : state.humanityScore >= 30 ? '脆弱' : '迷失')
          : ''}
        {state.discoveredConclusions?.length > 0
          ? ' | 结论：' + state.discoveredConclusions.length + '个'
          : ''}
      </div>
      <button className="btn btn-primary" onClick={() => dispatch({ type: 'NEW_GAME' })}>
        {state.loopCount > 0 ? '这次不一样' : '再次踏入深渊'}
      </button>
    </div>
  );
}

export function GameHeader({ state, dispatch, areas, onSettingsOpen, onUgcOpen, onSaveOpen }) {
  const area = areas.find((a) => a.id === state.currentArea);
  const areaName = area ? getAreaDisplayName(area, state) : state.currentArea;
  const sanStage = getSanStage(state.san, ctx);
  const sanClass =
    state.san >= 80
      ? 'stable'
      : state.san >= 60
        ? 'tense'
        : state.san >= 40
          ? 'shaken'
          : state.san >= 20
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
  const sanDanger =
    state.san <= 20 ? 'san-danger-critical' : state.san <= 40 ? 'san-danger-low' : '';
  return (
    <header className={'game-header' + (sanDanger ? ' ' + sanDanger : '')}>
      <div className="header-brand">
        <div className="header-title">深渊低语</div>
        <div className="header-subtitle">沃切斯特之影</div>
      </div>
      <div className="header-meta">
        <span className="header-meta-item">第 {state.day} 日</span>
        <span className="header-meta-separator">·</span>
        {state.loopCount > 0 && (
          <>
            <span className="header-meta-item">第 {state.loopCount} 次轮回</span>
            <span className="header-meta-separator">·</span>
          </>
        )}
        <span className="header-meta-item location">{areaName}</span>
        <span className="header-meta-separator">·</span>
        <span className="header-meta-item weather">{state.weather}</span>
      </div>
      <div className="header-status">
        <span className={'header-status-pill mental ' + sanClass}>
          精神：{sanStage.name}
          <span className="san-mini-bar">
            <span
              className="san-mini-fill"
              style={{ width: (state.san / state.maxSan) * 100 + '%' }}
            />
          </span>
        </span>
        <span className={'header-status-pill seal seal-' + state.sealState}>封印：{sealLabel}</span>
        <span className="header-status-pill ap">
          行动余裕：{state.ap}/{state.maxAp}
        </span>
      </div>
      <div className="header-controls">
        {onUgcOpen && (
          <button className="header-btn" onClick={onUgcOpen} title="模组管理">
            🧩
          </button>
        )}
        <button className="header-btn" onClick={onSettingsOpen} title="设置">
          ⚙️
        </button>
        <button
          className="header-btn"
          onClick={() => dispatch({ type: 'AUDIO_MUTE_TOGGLE' })}
          title={state.audioMuted ? '取消静音' : '静音'}
        >
          {state.audioMuted ? '🔇' : '🔊'}
        </button>
        <button
          className="header-btn header-btn-state"
          onClick={() => dispatch({ type: 'ACCESSIBILITY_TOGGLE', key: 'visual_distortion' })}
          title="切换视觉特效"
        >
          {state.accessibilityOptions?.visual_distortion === false ? '特效:关' : '特效:开'}
        </button>
        <button
          className="header-btn"
          onClick={() => {
            onSaveOpen && onSaveOpen();
            audioManager.playUI('panel_open');
          }}
          title="写入调查记录"
        >
          💾
        </button>
        <button
          className="header-btn"
          onClick={() => {
            uiStore.setState({ saveLoadMode: 'load', saveLoadOpen: true });
            audioManager.playUI('panel_open');
          }}
          title="读取调查记录"
        >
          📖
        </button>
      </div>
    </header>
  );
}
