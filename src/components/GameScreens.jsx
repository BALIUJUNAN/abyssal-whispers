// src/components/GameScreens.jsx - Screen components extracted from app.jsx
// PrologueScreen, SurvivalGuide, CharCreation
import React from 'react';
const { useState, useEffect, useRef, useMemo, useCallback, memo } = React;
import { audioManager } from '../managers/AudioManager.js';
import { DIFFICULTY_LEVELS } from '../config/difficulty.js';
import { getPrologueEvent, getPrologueSceneOrder } from '../reducers/prologueReducer.js';
import { GD } from '../state/gameData.js';

export function PrologueScreen({ state, dispatch }) {
  const prologue = state.prologue;
  if (!prologue) return null;

  const currentEvent = getPrologueEvent(prologue.currentScene);
  const [showHint, setShowHint] = useState(false);
  const [choiceMade, setChoiceMade] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [typewriterReveal, setTypewriterReveal] = useState(false);
  var scrollElRef = useRef(null);
  function setScrollRef(el) {
    var old = scrollElRef.current;
    if (old && old._wh) old.removeEventListener('wheel', old._wh);
    scrollElRef.current = el;
    if (!el) return;
    el._wh = function (e) {
      if (el.scrollHeight > el.clientHeight) {
        e.preventDefault();
        el.scrollTop += e.deltaY;
      }
    };
    el.addEventListener('wheel', el._wh, { passive: false });
  }

  // 前传音频：挂载时播放夜间环境音，卸载时停止
  useEffect(() => {
    try {
      audioManager.playAreaAmbient('town_center', 'night');
    } catch (e) {}
    return () => {
      try { audioManager.stopAmbient(); } catch (e) {}
    };
  }, []);

  // 场景切换时播放低沉音效
  useEffect(() => {
    try { audioManager.playUI('panel_open'); } catch (e) {}
  }, [prologue.currentScene]);

  // 当场景变化时重置
  useEffect(() => {
    setChoiceMade(false);
    setSelectedChoice(null);
    setShowHint(false);
    setTypewriterReveal(false);
    // Typewriter: delayed reveal for first narrative line
    var timer = setTimeout(function () {
      setTypewriterReveal(true);
    }, 300);
    return function () { clearTimeout(timer); };
  }, [prologue.currentScene]);

  if (!currentEvent) return null;

  const isDawn = currentEvent.id === 'prologue_dawn';
  const isCompleted = prologue.completed;

  // 前传完成画面
  if (isCompleted) {
    return (
      <div className="prologue-screen prologue-complete">
        <div className="prologue-bg" />
        <div className="prologue-vignette" />
        <main className="prologue-content">
          <div className="prologue-kicker">前传档案 / 入城前夜</div>
          <div className="prologue-complete-text">
            <p>档案已建立。</p>
            <p>你害怕的东西，比你先一步抵达。</p>
          </div>
          <div className="prologue-choices">
            <button
              className="btn btn-primary"
              onClick={() => dispatch({ type: 'COMPLETE_PROLOGUE' })}
            >
              继续
            </button>
          </div>
        </main>
      </div>
    );
  }

  const handleChoice = (choiceId) => {
    setChoiceMade(true);
    setSelectedChoice(choiceId);
    // 延迟dispatch以显示选择反馈
    setTimeout(() => {
      dispatch({ type: 'PROLOGUE_CHOICE', choiceId });
    }, 800);
  };

  const handleSkip = () => {
    if (confirm('跳过前传？你可以随时从主菜单重新开始。')) {
      dispatch({ type: 'SKIP_PROLOGUE' });
    }
  };

  return (
    <div className="prologue-screen" ref={setScrollRef}>
      <div className="prologue-bg" />
      <div className="prologue-vignette" />
      <div className="prologue-fog-layer fog-1" />
      <div className="prologue-fog-layer fog-2" />
      <main className="prologue-content">
        <div className="prologue-kicker">前传 / 入城前夜</div>

        {/* 场景标题 */}
        <h2 className="prologue-scene-title">{currentEvent.name}</h2>

        {/* 叙述文本 */}
        <div className="narrative-block prologue-narrative">
          {currentEvent.description.split('\n').map((line, i) => {
            var isFirst = i === 0 && line.trim();
            return (
              <p
                key={i}
                className={
                  'narrative-line' +
                  (isFirst && !typewriterReveal ? ' typewriter' : '') +
                  (isFirst && typewriterReveal ? ' typewriter typewriter--reveal' : '')
                }
              >
                {line}
              </p>
            );
          })}
        </div>

        {/* 教学提示 */}
        {currentEvent.tutorial_hint && (
          <div className="prologue-hint" onClick={() => setShowHint(!showHint)}>
            <span className="prologue-hint-icon">?</span>
            <span className="prologue-hint-text">{currentEvent.tutorial_hint}</span>
          </div>
        )}

        {/* AP显示（如果场景有AP消耗） */}
        {currentEvent.ap_cost && (
          <div className="prologue-ap">
            <span className="prologue-ap-label">行动点：</span>
            <span className="prologue-ap-value">{state.ap}</span>
          </div>
        )}

        {/* 选择按钮 */}
        {!choiceMade && (
          <div className="prologue-choices">
            {currentEvent.choices.map((choice) => (
              <button
                key={choice.id}
                className={'action-btn prologue-choice-btn' + (choice.cost ? ' has-cost' : '')}
                onClick={() => handleChoice(choice.id)}
              >
                <span className="choice-label">{choice.label}</span>
                {choice.cost && <span className="choice-cost">AP -{choice.cost}</span>}
              </button>
            ))}
          </div>
        )}

        {/* 选择反馈 */}
        {choiceMade && selectedChoice && (
          <div className="prologue-choice-feedback">
            <div className="feedback-indicator" />
          </div>
        )}

        {/* 跳过按钮（非最后一个场景） */}
        {!isDawn && !isCompleted && (
          <div className="prologue-skip">
            <button className="btn btn-sm" onClick={handleSkip}>
              跳过前传
            </button>
          </div>
        )}

        {/* 底部状态栏 */}
        <div className="prologue-footer">
          <span className="prologue-footer-item">SAN：{state.san}</span>
          <span className="prologue-footer-separator">·</span>
          <span className="prologue-footer-item">
            场景 {getPrologueSceneOrder().indexOf(prologue.currentScene) + 1}/
            {getPrologueSceneOrder().length}
          </span>
          {state.clues.length > 0 && (
            <>
              <span className="prologue-footer-separator">·</span>
              <span className="prologue-footer-item">线索：{state.clues.length}</span>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export function SurvivalGuide({ onContinue }) {
  const [visibleItems, setVisibleItems] = useState(0);
  useEffect(() => {
    const items = [
      { id: 0, delay: 400 },
      { id: 1, delay: 900 },
      { id: 2, delay: 1500 },
      { id: 3, delay: 2200 },
      { id: 4, delay: 3000 },
      { id: 5, delay: 3900 },
      { id: 6, delay: 4900 },
      { id: 7, delay: 6000 },
      { id: 8, delay: 7200 },
    ];
    const timers = items.map((it) => setTimeout(() => setVisibleItems((v) => v + 1), it.delay));
    return () => timers.forEach(clearTimeout);
  }, []);
  const guideItems = [
    {
      label: '行动点',
      icon: '◐',
      text: '每天有12点行动。移动、探索、对话、使用物品——每一步都在消耗你所剩不多的时间。太阳不会等你。',
    },
    {
      label: '理智',
      icon: '◈',
      text: '直面不该直面之物，你的理智会被侵蚀。低理智看到的世界……不再是同一个世界。',
    },
    { label: '食物', icon: '◎', text: '不吃东西会饿死。吃了不该吃的——你不会想知道后果。' },
    { label: '灯', icon: '◇', text: '黑暗中什么都能看到你。手电筒是有电量的。' },
    {
      label: '信任',
      icon: '◆',
      text: '这里的人不会轻易信任外来者。但如果你帮他们，他们会记住你。',
    },
    {
      label: '线索',
      icon: '▣',
      text: '用笔记本记下一切——尤其是那些你觉得"不可能"的事。线索会连成链，链会指向真相。真相可能不会指向出口。',
    },
    {
      label: '探索',
      icon: '▷',
      text: '每个区域都有自己的秘密和危险。你不会在第一次探索中就看到全部。',
    },
    {
      label: '轮回',
      icon: '↻',
      text: '死亡不是终点。你会回来。你会记得一些事情。沃切斯特也会记得你来过。',
    },
    {
      label: '安全屋',
      icon: '⌂',
      text: '当你精疲力竭时，安全屋是唯一的避风港。但请记住——在沃切斯特，连墙壁都不是完全安全的。',
    },
  ];
  return (
    <div className="prologue-screen survival-guide-screen">
      <div className="prologue-bg" />
      <div className="prologue-vignette" />
      <main className="prologue-content">
        <div className="guide-journal">
          <div className="guide-journal-header">
            <div className="guide-journal-title">生存指南</div>
            <div className="guide-journal-subtitle">—— 从某本旧日记中撕下的一页 ——</div>
          </div>
          <div className="guide-journal-body">
            <div className="guide-journal-intro">
              到沃切斯特的第三天，我开始记录这些规则。不是为了教谁——是为了让下一个人活得比我久一点。
            </div>
            <div className="guide-items">
              {guideItems.slice(0, visibleItems).map((item, i) => (
                <div key={item.label} className="guide-item" style={{ animationDelay: i * 0.1 + 's' }}>
                  <span className="guide-item-icon">{item.icon}</span>
                  <div className="guide-item-content">
                    <div className="guide-item-label">{item.label}</div>
                    <div className="guide-item-text">{item.text}</div>
                  </div>
                </div>
              ))}
            </div>
            {visibleItems >= 9 && (
              <div
                className="guide-journal-closing"
                style={{ animation: 'guideFadeIn 1.5s ease-out both' }}
              >
                <div className="guide-closing-line">
                  钟声会响十三下。数到第十三下的时候，不要抬头。
                </div>
                <button className="btn btn-primary guide-continue-btn" onClick={onContinue}>
                  我记住了
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export function CharCreation({ state, onRoll, onStart, onSetDifficulty, onSetArchetype }) {
  const s = state.stats;
  const rolled = state.statsRolled === true ||
    s.STR !== 50 || s.CON !== 55 || s.DEX !== 55 || s.APP !== 50 ||
    s.POW !== 60 || s.INT !== 65 || s.SIZ !== 60 || s.EDU !== 70;
  const archetypes = GD.systems?.player?.archetypes || [];
  const selectedArch = archetypes.find((a) => a.id === state.archetype);
  const diffLevel = state.difficultyLevel || 1;
  const [showAdvanced, setShowAdvanced] = useState(diffLevel > 3);
  const diffConfig = DIFFICULTY_LEVELS[diffLevel] || DIFFICULTY_LEVELS[1];
  var scrollElRef = useRef(null);
  function setScrollRef(el) {
    var old = scrollElRef.current;
    if (old && old._wh) old.removeEventListener('wheel', old._wh);
    scrollElRef.current = el;
    if (!el) return;
    el._wh = function (e) {
      if (el.scrollHeight > el.clientHeight) {
        e.preventDefault();
        el.scrollTop += e.deltaY;
      }
    };
    el.addEventListener('wheel', el._wh, { passive: false });
  }
  function getDiffColor(level) {
    if (level <= 3) return 'var(--accent)';     // 绿
    if (level <= 6) return '#66BB6A';           // 浅绿
    if (level <= 9) return 'var(--gold)';       // 橙
    return '#F44336';                            // 红（10-13）
  }
  return (
    <div className="screen-scroll" ref={setScrollRef}>
    <div className="char-creation">
      <h2>调查员档案</h2>
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
          难度选择
        </div>
        {/* 基础3级 */}
        <div
          style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '0.5rem' }}
        >
          {[1, 2, 3].map((lv) => (
            <button
              key={lv}
              className={'btn btn-sm' + (diffLevel === lv ? ' btn-primary' : '')}
              onClick={() => onSetDifficulty(lv)}
              title={DIFFICULTY_LEVELS[lv]?.description}
            >
              {DIFFICULTY_LEVELS[lv]?.name}
            </button>
          ))}
        </div>
        {/* 解锁进阶难度按钮 */}
        {!showAdvanced && (
          <button
            className="btn btn-sm"
            style={{ fontSize: '0.65rem', opacity: 0.7, marginBottom: '0.5rem' }}
            onClick={() => setShowAdvanced(true)}
          >
            ▼ 解锁进阶难度
          </button>
        )}
        {/* 进阶难度 4-13 */}
        {showAdvanced && (
          <div style={{ marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', justifyContent: 'center', marginBottom: '0.3rem' }}>
              {Object.keys(DIFFICULTY_LEVELS).map(Number).filter(lv => lv > 3).map((lv) => (
                <button
                  key={lv}
                  className={'btn btn-sm' + (diffLevel === lv ? ' btn-primary' : '')}
                  onClick={() => onSetDifficulty(lv)}
                  title={DIFFICULTY_LEVELS[lv]?.description}
                  style={{
                    fontSize: '0.6rem',
                    padding: '0.2rem 0.4rem',
                    minWidth: '2.2rem',
                    borderColor: diffLevel === lv ? getDiffColor(lv) : undefined,
                  }}
                >
                  {lv}
                </button>
              ))}
            </div>
            <button
              className="btn btn-sm"
              style={{ fontSize: '0.6rem', opacity: 0.5 }}
              onClick={() => setShowAdvanced(false)}
            >
              ▲ 收起
            </button>
          </div>
        )}
        {/* 当前难度信息 */}
        <div style={{ color: getDiffColor(diffLevel), fontSize: '0.7rem', marginBottom: '0.5rem' }}>
          Lv.{diffLevel} {diffConfig.name} — {diffConfig.description}
          {diffConfig.phase_label && (
            <span style={{ marginLeft: '0.5rem', opacity: 0.7 }}>
              [{diffConfig.phase_label}]
            </span>
          )}
        </div>
        <div style={{ color: 'var(--text-dim)', fontSize: '0.6rem' }}>
          预期存活率 {diffConfig.expected_survival} · 平均存活 {diffConfig.expected_days} 天
        </div>
      </div>
      {archetypes.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div
            style={{
              color: 'var(--text-dim)',
              fontSize: '0.8rem',
              marginBottom: '0.5rem',
              textAlign: 'center',
            }}
          >
            职业选择
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.4rem' }}>
            {archetypes.map((a) => (
              <button
                key={a.id}
                className={'btn btn-sm' + (state.archetype === a.id ? ' btn-primary' : '')}
                onClick={() => onSetArchetype(a.id)}
                title={a.special}
                style={{
                  textAlign: 'left',
                  padding: '0.4rem',
                  fontSize: '0.7rem',
                  lineHeight: '1.4',
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>{a.name}</div>
                <div style={{ color: 'var(--text-dim)' }}>{a.description.slice(0, 30)}...</div>
                {a.special && (
                  <div style={{ color: 'var(--gold)', fontSize: '0.65rem' }}>
                    {a.special.slice(0, 20)}
                  </div>
                )}
              </button>
            ))}
          </div>
          {selectedArch && (
            <div
              style={{
                color: 'var(--text)',
                fontSize: '0.75rem',
                marginTop: '0.4rem',
                textAlign: 'center',
                lineHeight: '1.6',
              }}
            >
              <strong>{selectedArch.name}</strong>：{selectedArch.description}
              <br />
              <span style={{ color: 'var(--gold)' }}>{selectedArch.special}</span>
              {selectedArch.stat_modifiers && (
                <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                  {Object.entries(selectedArch.stat_modifiers).map(([k, v]) => {
                    const statNames = {
                      STR: '力量',
                      CON: '体质',
                      DEX: '敏捷',
                      APP: '外貌',
                      POW: '意志',
                      INT: '智力',
                      SIZ: '体型',
                      EDU: '教育',
                    };
                    return (
                      <span key={k} style={{ margin: '0 0.3rem' }}>
                        {statNames[k] || k}
                        {v > 0 ? '+' : ''}
                        {v}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <button className="btn" onClick={onRoll}>
          {rolled ? '重新掷骰' : '掷骰生成属性'}
        </button>
      </div>
      {rolled && (
        <>
          <div className="stat-grid">
            {Object.entries(s).map(([k, v]) => {
              const mod = selectedArch?.stat_modifiers?.[k] || 0;
              const statNames = {
                STR: '力量',
                CON: '体质',
                DEX: '敏捷',
                APP: '外貌',
                POW: '意志',
                INT: '智力',
                SIZ: '体型',
                EDU: '教育',
              };
              return (
                <div key={k} className="stat-item">
                  <div className="label">
                    {k}
                    <span
                      style={{ fontSize: '0.6rem', color: 'var(--text-dim)', marginLeft: '0.2rem' }}
                    >
                      {statNames[k] || ''}
                    </span>
                  </div>
                  <div className="value">
                    {v}
                    {mod !== 0 && (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          color: mod > 0 ? 'var(--accent2)' : 'var(--danger2)',
                        }}
                      >
                        {mod > 0 ? '+' : ''}
                        {mod}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="derived-stats">
            <h3>衍生属性</h3>
            <div className="derived-row">
              <span className="derived-item">
                <span className="label">HP </span>
                <span className="value">{Math.floor((s.CON + s.SIZ) / 10)}</span>
              </span>
              <span className="derived-item">
                <span className="label"> SAN </span>
                <span className="value">{s.POW}</span>
              </span>
              <span className="derived-item">
                <span className="label"> MP </span>
                <span className="value">{Math.floor(s.POW / 5)}</span>
              </span>
              <span className="derived-item">
                <span className="label"> 闪避 </span>
                <span className="value">{Math.floor(s.DEX / 2)}</span>
              </span>
              <span className="derived-item">
                <span className="label"> 意志 </span>
                <span className="value">{Math.floor(s.POW / 2)}</span>
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <button className="btn btn-primary" onClick={onStart}>
              开始调查
            </button>
          </div>
        </>
      )}
    </div>
    </div>
  );
}
