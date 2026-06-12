// src/components/TitleScreen.jsx — 游戏标题画面
import { audioManager } from '../managers/AudioManager.js';
const { useState, useEffect, useRef, useMemo, useCallback, memo } = React;

export const TITLE_TAGLINES = [
  '第十三声钟响之后，没有人再数下去。',
  '有些失踪，是从抵达开始的。',
  '沃切斯特记得你。你不记得它。',
  '雾从海上来，也从档案的空白处来。',
  '请勿相信所有记录。尤其是你亲手写下的。',
  '灯塔仍在工作。只是它不再指向岸边。',
  '你已经来过这里。只是这一次，门牌还没有认出你。',
];

export function TitleScreen({ onStart, onContinue, saveExists, onSettingsOpen, onAchOpen }) {
  const [tagIdx, setTagIdx] = useState(0);
  const [fading, setFading] = useState(false);
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: (i * 5.7 + 13) % 100,
        top: (i * 7.3 + 29) % 100,
        delay: (i * 1.3) % 10,
        dur: 15 + ((i * 1.7) % 10),
      })),
    []
  );
  useEffect(() => {
    const iv = setInterval(() => {
      setTagIdx((i) => (i + 1) % TITLE_TAGLINES.length);
    }, 8000);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => {
    try {
      audioManager.playAreaAmbient('harbor_district', 'morning');
    } catch (e) {}
    return () => {
      try {
        audioManager.stopAmbient && audioManager.stopAmbient();
      } catch (e) {}
    };
  }, []);
  const handleStart = () => {
    setFading(true);
    setTimeout(onStart, 800);
  };
  return (
    <div className={'title-screen' + (fading ? ' fading' : '')}>
      <div className="title-bg-harbor" />
      <div className="title-bg-vignette" />
      <div className="title-fog-layer fog-1" />
      <div className="title-fog-layer fog-2" />
      <div className="title-fog-layer fog-3" />
      <div className="title-particles">
        {particles.map((p) => (
          <div
            key={p.id}
            className="particle"
            style={{
              left: p.left + '%',
              top: p.top + '%',
              animationDelay: p.delay + 's',
              animationDuration: p.dur + 's',
            }}
          />
        ))}
      </div>
      <main className="title-content">
        <div className="title-kicker">调查档案 / 1926</div>
        <h1>深渊低语</h1>
        <h2>沃切斯特之影</h2>
        <p key={tagIdx} className="title-tagline">
          {TITLE_TAGLINES[tagIdx]}
        </p>
        <div className="title-actions">
          <button className="btn btn-primary" onClick={handleStart}>
            踏入深渊
          </button>
          {saveExists && (
            <button className="btn" onClick={onContinue}>
              翻阅旧档案
            </button>
          )}
        </div>
        <div className="title-version">ABYSSAL WHISPERS · v1.0</div>
        <div className="title-corner-btns">
          {onAchOpen && (
            <button className="title-settings-btn" onClick={onAchOpen} title="成就">
              🏆
            </button>
          )}
          {onSettingsOpen && (
            <button className="title-settings-btn" onClick={onSettingsOpen} title="设置">
              ⚙️
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
