// src/components/GamePanels.jsx - Game panel components (extracted from app.jsx)
// LeftPanel, CenterPanel, RightPanel, EndingScreen, GameHeader
// NPCDialog -> NPCDialog.jsx, CitySketchMap -> CitySketchMap.jsx
const { useState, useEffect, useRef, useMemo, useCallback, memo } = React;
import { StatBar, CollapsibleSection, NarrativeBlock } from './GameCommon.jsx';
import { isPhantomExpired } from '../systems/textVariants.js';
import { getPerceptionLevels } from '../systems/sanityVisual.js';
import { NPCDialog } from './NPCDialog.jsx';
import { CombatPanel } from './CombatPanel.jsx';
import { CitySketchMap } from './CitySketchMap.jsx';
import { NarrativeVirtualList, useVirtualList } from './VirtualList.jsx';
import { getNpcTrust, getDisplayedAp, getAvailableSafehouses } from '../utils/appHelpers.js';
import { getPlayerImage, getNpcImage } from '../portraitMap.js';
import { getNpcsHere } from '../utils/npcLocation.js';
import { getAreaDisplayName, isAreaUnlocked } from '../utils/gameHelpers.js';
import { getConnectedAreas } from '../engine/WorldTimeSystem.js';
import { getChapterForDay } from '../reducers/chapterReducer.js';
import { checkAfterglowUnlock, getAfterglowTexts, getEndingTriggerCount } from '../reducers/endingReducer.js';
import { getSanStage } from '../reducers/sanReducer.js';
import { getSafehouseStage } from '../reducers/miscReducer.js';
import { enhanceDeathSummary, generateAfterglow, enhanceEventDescription, generateSanCorruptedText, generatePersonalityReflection, generateLoopOpening, isGlmAvailable, clearGlmCache, clearGlmQueue } from '../systems/llmNarrative.js';
import { hasClueId, resolveClueName } from '../utils/clueNameMap.js';
import { uiStore } from '../state/uiStore.js';

import { getInputResistanceLevel, getInputResistanceClass } from '../systems/inputResistance.js';
import { getShopDef, isShopItemUnlocked } from './ShopModal.jsx';
export const LeftPanel = memo(function LeftPanel({ state }) {
  const seal = useMemo(
    () =>
      (state._GD?.world?.seal_state_machine || []).find((s) => s.id === state.sealState) ||
      (state._GD?.module8_time_schedule?.seal_state_machine?.states || []).find(
        (s) => s.id === state.sealState
      ),
    [state.sealState]
  );
  const shStage = useMemo(
    () => getSafehouseStage(state.safehouseCorruption, { GD: state._GD }),
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
      (state._GD?.systems?.safehouse?.relocation_rules?.alternative_safehouses || []).find(
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
            className="portrait-img player-portrait game-art"
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
        <StatBar label="行动力" value={getDisplayedAp(state)} max={state.maxAp} cls="ap" />
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
          <button
            className="notebook-open-btn"
            onClick={() => {
              uiStore.setState({ notebookOpen: true, notebookEverOpened: true });
            }}
          >
            📓 打开笔记本
          </button>
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

// Enhanced NarrativeBlock with optional LLM dynamic text generation
// Only enhances event-type blocks with tier >= signature, when LLM is enabled and SAN <= 40
var _llmEnhanceQueue = new Map(); // blockId -> enhancedText cache
var _llmInFlightId = 0;           // monotonic request ID (null = idle)

function EnhancedNarrativeBlock({ block, gameState }) {
  const [enhancedText, setEnhancedText] = useState(null);
  const [corruptedText, setCorruptedText] = useState(null);

  // LLM 事件描述增强（原有逻辑）
  useEffect(() => {
    // Only enhance event blocks
    if (!block || block.type !== 'event') return;
    // Only enhance if LLM is available
    if (!isGlmAvailable()) return;
    // Check settings
    try {
      var s = JSON.parse(localStorage.getItem('abyssal_whispers_settings') || '{}');
      if (s.llmEnabled === false) return;
      if (s.llmEventText === false) return;
    } catch (e) { return; }

    // Priority: only enhance signature/milestone events, or when SAN <= 40
    var san = (gameState && gameState.san) || 60;
    var isHighPriority = block.tier === 'signature' || block.tier === 'milestone' || block._isMilestone;
    var isLowSan = san <= 40;

    if (!isHighPriority && !isLowSan) return;

    // Random sampling: only enhance ~30% of eligible events to avoid API spam
    if (!isHighPriority && Math.random() > 0.3) return;

    // Check cache
    if (_llmEnhanceQueue.has(block.id)) {
      setEnhancedText(_llmEnhanceQueue.get(block.id));
      return;
    }

    // Single-flight guard: don't queue multiple concurrent calls
    if (_llmInFlightId > 0) return;
    var reqId = ++_llmInFlightId;

    var cancelled = false;
    var eventObj = { description: block.text, name: block.eventTitle, type: block.eventType, tier: block.tier };
    enhanceEventDescription(eventObj, gameState || {}).then(function (text) {
      // Only clear flight guard if this request is still the active one
      // (clearLlmEventCache resets _llmInFlightId to 0, invalidating stale requests)
      if (_llmInFlightId === reqId) _llmInFlightId = 0;
      if (!cancelled && text && text.length > 20) {
        _llmEnhanceQueue.set(block.id, text);
        setEnhancedText(text);
      }
    }).catch(function () {
      if (_llmInFlightId === reqId) _llmInFlightId = 0;
    });

    return function () { cancelled = true; };
  }, [block && block.id]);

  // LLM SAN 文本污染：SAN ≤ 25 时，非系统文本块送去 LLM 改写为不可靠叙述
  useEffect(() => {
    setCorruptedText(null);
    if (!block || !block.text || block.text.length < 30) return;
    if (block.type === 'system' || block.isEffect || block.isSpecial) return;
    var san = (gameState && gameState.san) || 60;
    if (san > 25) return;
    try {
      var s = JSON.parse(localStorage.getItem('abyssal_whispers_settings') || '{}');
      if (s.llmEnabled === false) return;
    } catch (e) { return; }
    if (!isGlmAvailable()) return;
    // 随机采样 40%，避免 API 洪泛
    if (Math.random() > 0.4) return;
    var cancelled = false;
    generateSanCorruptedText(block.text, gameState || {}).then(function (text) {
      if (!cancelled && text && text.length > 15) setCorruptedText(text);
    });
    return function () { cancelled = true; };
  }, [block && block.id]);

  // SAN 文本污染：用污染后的文本替代原始文本
  var displayBlock = corruptedText ? { ...block, text: corruptedText } : block;

  return (
    <div>
      <NarrativeBlock block={displayBlock} />
      {enhancedText && (
        <div style={{
          marginTop: '0.3rem',
          padding: '0.5rem 0.8rem',
          borderLeft: '2px solid rgba(180, 160, 120, 0.3)',
          fontSize: '0.9em',
          color: 'var(--text-secondary, #a89a85)',
          fontStyle: 'italic',
          opacity: 0.9,
          lineHeight: 1.7,
          animation: 'fadeIn 0.8s ease-in',
        }}>
          {enhancedText}
        </div>
      )}
    </div>
  );
}

// Clear LLM cache on new loop (event cache + API response cache + pending queue)
export function clearLlmEventCache() {
  _llmEnhanceQueue.clear();
  _llmInFlightId = 0; // invalidate any in-flight request (its reqId check will fail)
  try { clearGlmCache(); } catch (e) { /* guard: module may not be loaded */ }
  try { clearGlmQueue(); } catch (e) { /* guard: module may not be loaded */ }
}

export const CenterPanel = memo(function CenterPanel({ state, dispatch }) {
  const transitionTimer = useRef(null);
  const btnIndex = useRef(0);  // replaces window.__n — render-order counter for button keys
  const [forbiddenOpen, setForbiddenOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  // 操作分组折叠状态
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const toggleActionGroup = (g) => setCollapsedGroups((prev) => ({ ...prev, [g]: !prev[g] }));
  // 感知污染 — 输入阻尼层 CSS class
  var _irLevel = getInputResistanceLevel(state, { GD: state._GD });
  var inputResistClass = getInputResistanceClass(_irLevel);

  // Virtual scroll for narrative (50+ items)
  var narrativeBlocks = state.narrative.filter(function (b) { return !isPhantomExpired(b); });
  var vl = useVirtualList({
    items: narrativeBlocks,
    rowHeight: 72,
    overscan: 6,
    threshold: 50,
    maxHeight: 480,
    autoScroll: true,
  });
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
      // N 键笔记本已移至 GameLayout.jsx（两种布局模式通用）
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
  const conn = useMemo(() => getConnectedAreas(state.currentArea, { GD: state._GD }), [state.currentArea]);
  const npcs = useMemo(
    () => getNpcsHere(state),
    [state.day, state.currentArea, state.npcStates, state.npcTrust]
  );
  const areas = state._GD?.areas || state._GD?.module2_areas || [];
  const itemUseInfo = useMemo(() => {
    const m = {};
    (state._GD?.items || []).forEach((def) => {
      if (def.use_hint) m[def.name] = def.use_hint;
    });
    return m;
  }, []);
  // P3: perception levels — respect accessibility
  const percCls = useMemo(() => {
    const raw =
      state.accessibilityOptions?.visual_distortion === false
        ? { focus: 0, edge: 0, audio: 0, input: 0, text: 0 }
        : getPerceptionLevels(state, { GD: state._GD });
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
  // audio perception → volume modulation (multiply user base, don't overwrite)
  const perceptionAudio =
    state.accessibilityOptions?.visual_distortion === false ? 0 : getPerceptionLevels(state, { GD: state._GD }).audio;
  try {
    const baseVol = audioManager._userVolumeScale || 1;
    if (perceptionAudio >= 2) {
      audioManager._volumeScale = baseVol * (0.6 + perceptionAudio * 0.15);
    } else {
      audioManager._volumeScale = baseVol;
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
                  const ch = getChapterForDay(state.day, { GD: state._GD });
                  return ch?.name || '未知章节';
                })()}
              </div>
              <div className="transition-chapter-day">第 {state.day} 天</div>
            </div>
          )}
        </div>
      )}
      <div className={'narrative-area' + percCls} ref={vl.containerRef} onScroll={vl.handleScroll}>
        {vl.useVirtual
          ? vl.visibleItems.map(function ({ item, index }) {
              return <EnhancedNarrativeBlock key={item.id} block={item} gameState={state} />;
            })
          : narrativeBlocks.map(function (b) {
              return <EnhancedNarrativeBlock key={b.id} block={b} gameState={state} />;
            })}
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
                {state.pendingChoice.choices.map((ch, i) => {
                  // DESIGN_REFACTOR_NOTES.md: key events get full corruption, normal actions stay light
                  var _evt = state.pendingChoice.evt || {};
                  var _isKey = (_evt.unreliable_narration_level || 0) >= 2
                    || (_evt.tags || []).some(function(t) { return t === 'bell' || t === 'thirteenth' || t === 'npc_core'; });
                  return (
                    <CorruptibleChoice
                      key={i}
                      className="btn btn-sm"
                      san={state.san}
                      isKeyEvent={_isKey}
                      onClick={() => dispatch({ type: 'CHOICE_SELECT', choiceIdx: i })}
                    >
                      {ch.label}
                    </CorruptibleChoice>
                  );
                })}
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
              btnIndex.current = 0;
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
                  onClick={() => {
                    if (state.ap < 2) { audioManager.playUI('click_forbidden'); return; }
                    dispatch({ type: 'EXPLORE' });
                  }}
                  onMouseEnter={() => audioManager.playUI('hover')}
                >
                  <span className="btn-hint">
                    {(() => {
                      btnIndex.current += 1;
                      return btnIndex.current;
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
                  btnIndex.current += 1;
                  const n = btnIndex.current;
                  return (
                    <button
                      key={aid}
                      className="action-btn primary-action"
                      onClick={() => {
                        if (state.ap < 1 || !unlocked) { audioManager.playUI('click_forbidden'); return; }
                        dispatch({ type: 'MOVE', areaId: aid });
                      }}
                      onMouseEnter={() => audioManager.playUI('hover')}
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
                  btnIndex.current += 1;
                  const n = btnIndex.current;
                  return (
                    <button
                      key={npc.name}
                      className="action-btn"
                      onClick={() => {
                        if (state.ap < 1) { audioManager.playUI('click_forbidden'); return; }
                        dispatch({ type: 'TALK_NPC', npc: npc });
                      }}
                      onMouseEnter={() => audioManager.playUI('hover')}
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
                      btnIndex.current += 1;
                      const n = btnIndex.current;
                      return (
                        <button
                          key={i}
                          className="action-btn"
                          onClick={() => dispatch({ type: 'USE_ITEM', item: it })}
                          onMouseEnter={() => audioManager.playUI('hover')}
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
                    btnIndex.current += 1;
                    const n = btnIndex.current;
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
                    btnIndex.current += 1;
                    const n = btnIndex.current;
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
                  btnIndex.current += 1;
                  const n = btnIndex.current;
                  return (
                    <button
                      className="action-btn"
                      onClick={() => {
                        if (state.ap < 2) { audioManager.playUI('click_forbidden'); return; }
                        dispatch({ type: 'WORK' });
                      }}
                      onMouseEnter={() => audioManager.playUI('hover')}
                    >
                      <span className="btn-hint">{n}</span>
                      <span className="action-icon">💰</span>打工挣钱
                      <span className="cost">2 AP</span>
                    </button>
                  );
                })()}
                {state.currentArea === 'town_center' &&
                  (() => {
                    btnIndex.current += 1;
                    const n = btnIndex.current;
                    const canBuy =
                      state.ap >= 1 &&
                      (state.money || 0) >= 3 &&
                      (state.food || 0) < (state.maxFood || 5);
                    return (
                      <button
                        className="action-btn"
                        onClick={() => {
                          if (!canBuy) { audioManager.playUI('click_forbidden'); return; }
                          dispatch({ type: 'BUY_FOOD' });
                        }}
                        onMouseEnter={() => audioManager.playUI('hover')}
                      >
                        <span className="btn-hint">{n}</span>
                        <span className="action-icon">🛒</span>杂货店买食物
                        <span className="cost">1 AP · 3金钱</span>
                      </button>
                    );
                  })()}
                {(() => {
                  btnIndex.current += 1;
                  const n = btnIndex.current;
                  return (
                    <button className="action-btn" onClick={() => dispatch({ type: 'REST' })} onMouseEnter={() => audioManager.playUI('hover')}>
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
                          btnIndex.current += 1;
                          const n = btnIndex.current;
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
            <div className="keyboard-hint">快捷键：1-9选择 · Space确认 · M地图 · I物品 · J线索 · N笔记本</div>
          </div>
        )}
      {state.eventLog.length > 0 && (
        <div className="event-log">
          <div className="event-log-header" onClick={() => setLogOpen((v) => !v)}>
            <span className="event-log-toggle">{logOpen ? '▾' : '▸'}</span>
            <span>事件日志 ({state.eventLog.length})</span>
          </div>
          {logOpen && (
            <NarrativeVirtualList
              entries={state.eventLog.filter(l => !isPhantomExpired(l))}
              maxHeight={240}
              autoScroll={false}
            />
          )}
        </div>
      )}

      {/* Combat panel — renders when combat is active */}
      {state.combat && state.combat.active && (
        <CombatPanel combatState={state.combat} state={state} dispatch={dispatch} ctx={{ GD: state._GD }} />
      )}
    </div>
  );
});

export const RightPanel = memo(function RightPanel({ state, dispatch }) {
  // ── Fine-grained selector pattern (v0.9.0) ──
  // For panels needing few state fields, prefer individual selectors:
  //   import { useCurrentArea, useDiscoveredConclusions } from '../state/selectors.js';
  //   const currentArea = useCurrentArea();  // re-renders ONLY on area change
  // RightPanel uses many fields (currentArea, npcTrust, discoveredConclusions, etc.)
  // so it receives state as prop from GameLayout. Sub-components should use fine-grained
  // selectors independently.
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
  const areas = state._GD?.areas || state._GD?.module2_areas || [];
  const npcs = state._GD?.npcs || state._GD?.module3_npcs || [];
  const conn = useMemo(() => getConnectedAreas(state.currentArea, { GD: state._GD }), [state.currentArea]);
  const inProgressConclusions = useMemo(() => {
    return (state._GD?.systems?.clue_conclusion?.conclusions || [])
      .filter((c) => !(state.discoveredConclusions || []).includes(c.id))
      .map((conc) => {
        const satisfied = (conc.evidence_pool || []).filter((ev) => {
          if (ev.source && state.triggeredEvents.includes(ev.source)) return true;
          const tm = ev.source && ev.source.match(/^(.+?)\s+trust>=(\d+)$/);
          if (tm) return getNpcTrust(state, tm[1]) >= parseInt(tm[2]);
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
                const trust = getNpcTrust(state, n.name);
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
                        className="npc-portrait-thumb game-art"
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
                const b = state._GD?.systems?.loop?.loop_blessings?.[bkey];
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
                  const conc = (state._GD?.systems?.clue_conclusion?.conclusions || []).find(
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

// === 笔记本 Modal ===
// 独立浮层，不干扰上方数据查看。按 N 键或点击按钮打开。
export function NotebookModal({ open, onClose, state }) {
  const chains = useMemo(() => state._GD?.clue_chains || [], []);
  const conclusions = useMemo(
    () => (state._GD?.systems?.clue_conclusion?.conclusions || []),
    []
  );
  // 首次打开高亮：记录是否是第一次打开
  const isFirstOpen = useRef(true);
  const [highlightFirst, setHighlightFirst] = useState(false);
  useEffect(() => {
    if (open && isFirstOpen.current) {
      isFirstOpen.current = false;
      setHighlightFirst(true);
      var t = setTimeout(function () { setHighlightFirst(false); }, 1500);
      return function () { clearTimeout(t); };
    }
  }, [open]);
  // 用 Set 加速查找
  const clueIdSet = useMemo(() => {
    const s = new Set();
    (state.clues || []).forEach((clue) => s.add(clue.id || clue.name));
    return s;
  }, [state.clues]);
  const completedChainSet = useMemo(
    () => new Set(state.completedChains || []),
    [state.completedChains]
  );
  const discoveredConcSet = useMemo(
    () => new Set(state.discoveredConclusions || []),
    [state.discoveredConclusions]
  );

  // 找到线索在哪些结论中被引用
  const clueToConclusions = useMemo(() => {
    const m = {};
    conclusions.forEach((co) => {
      (co.evidence_pool || []).forEach((ev) => {
        const key = ev.source || '';
        if (!m[key]) m[key] = [];
        m[key].push(co);
      });
    });
    return m;
  }, [conclusions]);

  if (!open) return null;
  const totalClueCount = chains.reduce((t, ch) => t + (ch.clues?.length || 0), 0);
  const foundCount = clueIdSet.size;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content notebook-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">📓 笔记本</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body notebook-body">
          <div className="notebook-stats">
            线索 {foundCount}/{totalClueCount} · 事件链 {completedChainSet.size}/{chains.length} · 结论 {discoveredConcSet.size}/{conclusions.length}
          </div>

          {/* 线索链 */}
          {chains.map((chain, chainIdx) => {
            const chainDone = completedChainSet.has(chain.id);
            const clues = chain.clues || [];
            const foundInChain = clues.filter((cl) => clueIdSet.has(cl.id)).length;
            return (
              <div key={chain.id} className={'notebook-chain' + (chainDone ? ' chain-done' : '') + (highlightFirst && chainIdx === 0 ? ' notebook-guide-highlight' : '')}>
                <div className="notebook-chain-title">
                  <span className="chain-icon">{chainDone ? '✓' : '◇'}</span>
                  {chain.name}
                  <span className="chain-count">{foundInChain}/{clues.length}</span>
                </div>
                <div className="notebook-chain-clues">
                  {clues.map((cl) => {
                    const found = clueIdSet.has(cl.id);
                    const typeLabel = { surface: '表层', mechanism: '深层', ending: '终末' }[cl.type] || cl.type;
                    // 这条线索被哪些结论引用
                    const linkedConcs = clueToConclusions[cl.id] || [];
                    return (
                      <div key={cl.id} className={'notebook-clue' + (found ? ' clue-found' : ' clue-locked')}>
                        <span className="clue-mark">{found ? '▪' : '◻'}</span>
                        <span className="clue-name">{found ? cl.name : '？？？'}</span>
                        <span className="clue-type">{typeLabel}</span>
                        {found && linkedConcs.length > 0 && (
                          <span className="clue-links" title={linkedConcs.map(c => c.name).join('、')}>
                            ⟷ {linkedConcs.length}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* 结论区 */}
          {conclusions.length > 0 && (
            <div className="notebook-section">
              <div className="notebook-section-title">结论</div>
              {conclusions.map((co) => {
                const discovered = discoveredConcSet.has(co.id);
                const evidence = co.evidence_pool || [];
                const matched = evidence.filter((ev) => clueIdSet.has(ev.source)).length;
                return (
                  <div key={co.id} className={'notebook-conclusion' + (discovered ? ' conc-discovered' : '')}>
                    <span className="conc-mark">{discovered ? '★' : '☆'}</span>
                    <span className="conc-name">{discovered ? co.name : '？？？'}</span>
                    <span className="conc-progress">{matched}/{co.required_evidence_count || evidence.length}</span>
                    {discovered && (
                      <div className="conc-evidence">
                        {evidence.map((ev, i) => (
                          <div key={i} className="conc-ev-item">
                            {clueIdSet.has(ev.source) ? '✓' : '…'} {ev.description?.slice(0, 30)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 已收集线索（不在链中的自由线索） */}
          {useMemo(() => {
            const chainClueIds = new Set();
            chains.forEach((ch) => (ch.clues || []).forEach((cl) => chainClueIds.add(cl.id)));
            const freeClues = (state.clues || []).filter((c) => {
              const id = typeof c === 'object' ? c.id || c.name : c;
              return !chainClueIds.has(id);
            });
            if (freeClues.length === 0) return null;
            return (
              <div className="notebook-section">
                <div className="notebook-section-title">散落笔记</div>
                {freeClues.map((c, i) => (
                  <div key={i} className="notebook-clue clue-found">
                    <span className="clue-mark">▪</span>
                    <span className="clue-name">{typeof c === 'object' ? c.name : resolveClueName(c)}</span>
                  </div>
                ))}
              </div>
            );
          }, [chains, state.clues])}

        </div>
      </div>
    </div>
  );
}

/** 4-section death summary view */
function DeathSummaryView({ summary }) {
  const s1 = summary.section1;
  const s2 = summary.section2;
  const s3 = summary.section3;
  const s4 = summary.section4;
  if (!s1) return null;

  return (
    <div className="death-summary" style={{ maxWidth: 520, margin: '1.5rem auto', textAlign: 'left', fontSize: 14, lineHeight: 1.7 }}>
      {/* Section 1: 你如何死去 */}
      <div className="summary-section" style={{ marginBottom: '1.2rem' }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: 'var(--text, #e0d5c0)' }}>{s1.title}</div>
        <div style={{ fontStyle: 'italic', color: 'var(--text-secondary, #a89a85)', marginBottom: 8 }}>{s1.narrativeLead}</div>
        {s1.narrative && <div style={{ marginBottom: 8, whiteSpace: 'pre-line' }}>{s1.narrative.split('\n').filter(Boolean).map((p, i) => <p key={i} style={{ margin: '0 0 4px' }}>{p}</p>)}</div>}
        {s1.factors && s1.factors.length > 0 && (
          <div style={{ fontSize: 12, opacity: 0.5, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 6, marginTop: 6 }}>
            主要因素：{s1.factors.join('、')}
          </div>
        )}
      </div>

      {/* Section 2: 你本轮发现了什么 */}
      {s2 && (
        <div className="summary-section" style={{ marginBottom: '1.2rem' }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{s2.title}</div>
          {s2.discoveries.map((d, i) => (
            <div key={i} style={{ marginBottom: 4 }}>
              <span style={{ opacity: 0.7 }}>{d.label}：</span>{d.summary}
            </div>
          ))}
        </div>
      )}

      {/* Section 3: 世界因此改变了什么 */}
      {s3 && (
        <div className="summary-section" style={{ marginBottom: '1.2rem' }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{s3.title}</div>
          {s3.changes.map((c, i) => (
            <div key={i} style={{
              marginBottom: 4,
              color: c.severity === 'warning' ? 'var(--danger2, #e67e22)' : c.severity === 'positive' ? 'var(--green, #27ae60)' : 'inherit',
            }}>
              {c.severity === 'warning' ? '⚠ ' : c.severity === 'positive' ? '✓ ' : ''}{c.text}
            </div>
          ))}
        </div>
      )}

      {/* Section 4: 下一轮你可以尝试什么 */}
      {s4 && (
        <div className="summary-section">
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{s4.title}</div>
          {s4.suggestions.map((s, i) => (
            <div key={i} style={{ marginBottom: 4, color: s.priority === 'high' ? 'var(--text, #e0d5c0)' : 'var(--text-secondary, #a89a85)' }}>
              {s.priority === 'high' ? '→ ' : '  '}{s.text}
            </div>
          ))}
          {s4.inherited && s4.inherited.length > 0 && (
            <div style={{ fontSize: 12, opacity: 0.5, marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 6 }}>
              继承：{s4.inherited.join('、')}
            </div>
          )}
        </div>
      )}

      {/* Section 5: Legacy Highlights (遗产亮点) */}
      {summary.legacy && summary.legacy.highlights && summary.legacy.highlights.length > 0 && (
        <div className="summary-section legacy-highlights" style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '1rem' }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 10, color: 'var(--text, #e0d5c0)', letterSpacing: '0.05em' }}>
            {summary.legacy.title}
          </div>
          {summary.legacy.highlights.map((h, i) => {
            if (h.type === 'npc_farewell') {
              return (
                <div key={i} className="legacy-npc-farewell" style={{
                  marginBottom: 12, padding: '10px 14px',
                  background: 'rgba(180, 140, 80, 0.06)',
                  borderLeft: '3px solid rgba(180, 140, 80, 0.35)',
                  borderRadius: '0 4px 4px 0',
                }}>
                  <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>
                    {h.npc}（信任 {h.trust}）
                  </div>
                  <div style={{ fontStyle: 'italic', color: '#c8b89a', whiteSpace: 'pre-line', lineHeight: 1.8 }}>
                    {h.line}
                  </div>
                </div>
              );
            }
            if (h.type === 'moment') {
              return (
                <div key={i} style={{
                  marginBottom: 6, fontSize: 13,
                  color: h.severity === 'dark' ? 'var(--danger2, #e67e22)' : 'var(--text-secondary, #a89a85)',
                }}>
                  <span style={{ opacity: 0.6, marginRight: 6 }}>{h.icon}</span>
                  <span style={{ opacity: 0.5, marginRight: 4 }}>{h.label}：</span>
                  {h.text}
                </div>
              );
            }
            if (h.type === 'loop_stamp') {
              return (
                <div key={i} style={{
                  marginTop: 8, fontSize: 12, opacity: 0.5,
                  borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8,
                }}>
                  <span style={{ marginRight: 4 }}>{h.icon}</span>
                  {h.text}
                </div>
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
}

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

  // LLM narrative enhancement (async, optional)
  const [llmSections, setLlmSections] = useState(null);
  const [llmAfterglow, setLlmAfterglow] = useState(null);
  const [llmReflection, setLlmReflection] = useState(null);
  useEffect(() => {
    if (!isGlmAvailable() || !ending.deathSummary) return;
    // Respect sub-setting: llmDeathSummary
    try {
      var s = JSON.parse(localStorage.getItem('abyssal_whispers_settings') || '{}');
      if (s.llmEnabled === false) return;
      if (s.llmDeathSummary === false) return;
    } catch (e) { return; }
    var cancelled = false;
    enhanceDeathSummary(state, state.deathContext || {}, ending.deathSummary).then(function (result) {
      if (!cancelled && result) setLlmSections(result);
    });
    generateAfterglow(state, state.deathContext || {}).then(function (text) {
      if (!cancelled && text) setLlmAfterglow(text);
    });
    return function () { cancelled = true; };
  }, []);

  // LLM 人格反思增强：用 LLM 生成更深邃的行为档案附注
  useEffect(() => {
    if (!isGlmAvailable()) return;
    if (!ending.personalityReport || !ending.personalityReport.traits || ending.personalityReport.traits.length === 0) return;
    try {
      var s = JSON.parse(localStorage.getItem('abyssal_whispers_settings') || '{}');
      if (s.llmEnabled === false) return;
    } catch (e) { return; }
    var cancelled = false;
    generatePersonalityReflection(state, ending.personalityReport.traits).then(function (paragraphs) {
      if (!cancelled && paragraphs && paragraphs.length > 0) setLlmReflection(paragraphs);
    });
    return function () { cancelled = true; };
  }, []);

  return (
    <div className={'ending-screen ' + tc + ' ' + deathAnimClass}>
      <h2>{ending.name}</h2>
      {endingImage && (
        <img
          className="ending-cg game-art"
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
      {/* Data-driven afterglow: narrative fragments unlocked progressively by ending trigger count */}
      {ending.afterglow && (() => {
        var agResult = getAfterglowTexts(ending, state);
        if (agResult.texts.length === 0) return null;
        var lockedCount = agResult.locked || 0;
        return (
          <div style={{ maxWidth: 500, margin: '1rem auto', textAlign: 'center', fontSize: 13, lineHeight: 2, color: 'var(--text-secondary, #a89a85)', opacity: 0.8, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
            <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 10, letterSpacing: '0.15em' }}>— 余 韵 —</div>
            {agResult.texts.map(function(t, i) {
              return <p key={i} style={{ marginBottom: 8, fontStyle: 'italic' }}>{t}</p>;
            })}
            {lockedCount > 0 && (
              <p style={{ fontSize: 11, opacity: 0.4, fontStyle: 'normal', marginTop: 4 }}>
                还有 {lockedCount} 段余韵等待解锁……
              </p>
            )}
          </div>
        );
      })()}
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
      {/* Personality Report — atmospheric self-questioning, never explicit labels */}
      {ending.personalityReport && ending.personalityReport.traits.length > 0 && (
        <div className="personality-report" style={{ maxWidth: 520, margin: '1rem auto', textAlign: 'left', fontSize: 13, lineHeight: 1.8, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', color: 'var(--text-secondary, #a89a85)' }}>
          <div style={{ fontStyle: 'italic', marginBottom: 8 }}>
            你看着镜子里的自己。
          </div>
          {ending.personalityReport.traits.slice(0, 3).map((t, i) => {
            // Convert explicit labels to atmospheric self-questions
            const reflections = {
              mass_killer: '你已经不记得这是第几次了。手很稳。这让你不安。',
              killer: '你的手上有痕迹。不是血——是某种你已经习惯的东西。',
              cannibal: '你吃过了不该吃的东西。你没有吐。这本身就是一种变化。',
              puppeteer: '你没有亲自动过手。但这让你更不安，而不是更安心。',
              betrayer: '有人曾经信任你。你不确定那个人现在怎么看你。',
              cult_leader: '有人跪在你面前。你不确定他们跪的是你，还是你身后的东西。',
              desecrator: '你打碎了什么。不是因为愤怒——是因为你想看看碎了之后里面有什么。',
              ritualist: '你用刀在自己身上画了什么。疤痕还在。你已经不记得画的是什么了。',
              fused: '你感觉自己的边界比以前模糊了。空气有时候会穿过你。',
              vessel: '你里面有什么东西。不是寄生——更像是一个沉默的室友。',
              sea_bound: '海在叫你。不是用声音——是用空缺。',
              sleeper: '你睡了很久。久到你不确定外面还是不是同一天。',
              workaholic: '你的手上有老茧。你的账本很整齐。你已经不记得来这里是为了什么了。',
              hermit: '安全屋的墙壁记住了你的呼吸。你不确定这是安慰还是囚禁。',
              wanderer: '你走了很多路。但你没有找到你来时要找的东西。',
              meta_breaker: '你看到了什么不该看到的东西。不是恐怖——是结构。',
              deleter: '你试图删除什么。它回来了。但少了一点。',
              redeemer: '你帮了一个人。那个人没有说谢谢。但这不重要。',
              hoarder: '你拥有很多东西。你一样都没有用过。',
            };
            const text = reflections[t.id] || t.desc;
            return <div key={i} style={{ marginBottom: 6 }}>{text}</div>;
          })}
          <div style={{ fontSize: 12, opacity: 0.4, marginTop: 10, fontStyle: 'italic' }}>
            你还是你吗？
          </div>
        </div>
      )}
      {/* LLM 人格反思增强（异步加载） */}
      {llmReflection && llmReflection.length > 0 && (
        <div style={{ maxWidth: 520, margin: '0.5rem auto', textAlign: 'left', fontSize: 13, lineHeight: 1.8, color: 'var(--text-secondary, #a89a85)', padding: '0.5rem 0', borderLeft: '2px solid rgba(120,100,80,0.2)', paddingLeft: '1rem' }}>
          <div style={{ fontSize: 11, opacity: 0.4, marginBottom: 6, letterSpacing: '0.1em' }}>✦ 档案附注 · AI</div>
          {llmReflection.map(function (p, i) { return <p key={i} style={{ marginBottom: 6 }}>{p}</p>; })}
        </div>
      )}
      <button className="btn btn-primary" onClick={() => { clearLlmEventCache(); dispatch({ type: 'NEW_GAME' }); }}>
        {state.loopCount > 0 ? '这次不一样' : '再次踏入深渊'}
      </button>
      {/* 4-section death summary */}
      {ending.deathSummary && <DeathSummaryView summary={ending.deathSummary} />}

      {/* LLM-enhanced narrative (async, appears when ready) */}
      {llmSections && (
        <div className="llm-enhanced-summary" style={{ maxWidth: 520, margin: '1rem auto', textAlign: 'left', fontSize: 14, lineHeight: 1.8, borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '1rem' }}>
          <div style={{ fontSize: 11, opacity: 0.4, marginBottom: 8, letterSpacing: '0.1em' }}>✦ AI 叙事增强</div>
          {llmSections.section1 && <p style={{ marginBottom: 8 }}>{llmSections.section1}</p>}
          {llmSections.section2 && <p style={{ marginBottom: 8 }}>{llmSections.section2}</p>}
          {llmSections.section3 && <p style={{ marginBottom: 8 }}>{llmSections.section3}</p>}
          {llmSections.section4 && <p style={{ marginBottom: 8 }}>{llmSections.section4}</p>}
        </div>
      )}

      {/* LLM afterglow (poetic reflection) */}
      {llmAfterglow && (
        <div style={{ maxWidth: 480, margin: '1rem auto', textAlign: 'center', fontStyle: 'italic', color: 'var(--text-secondary, #a89a85)', fontSize: 13, lineHeight: 1.9, opacity: 0.85 }}>
          {llmAfterglow}
        </div>
      )}
    </div>
  );
}

export function GameHeader({ state, dispatch, areas, GD, onSettingsOpen, onUgcOpen, onSaveOpen }) {
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
          行动余裕：{getDisplayedAp(state)}/{state.maxAp}
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
