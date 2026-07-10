// src/components/SanPollutionLayer.jsx - SAN visual corruption (re-exports from SanPollutionLayers.jsx)
// CorruptibleChoice, AbyssPopup, and injected CSS live here for backward compatibility.
// The canvas renderer was split into SanPollutionLayers.jsx for layered activation.

import { getVisualForSan } from '../systems/sanityVisual.js';
import { tickVisualCorruption, getSurgeMultiplier, getFlashAlpha } from '../systems/sanVisualCorruption.js';
const { useState, useEffect, useRef, useCallback, memo } = React;
export { getVisualForSan };

// Re-export the layered renderer (defined in SanPollutionLayers.jsx)
export {
  SanPollutionLayer,
  FPS_CAP_DEFAULT,
  FPS_CAP_DEGRADED,
  FPS_CAP_LOW,
  getPerfTier,
  getFrameMs,
  lerp,
  getNoise,
  clearNoiseCache,
} from './SanPollutionLayers.jsx';

// === CorruptibleChoice: stage-aware hover corruption ===
var _CG = '█▓▒░▄▀▌▐■▬▲▼●○☼★';
var _CP = [
  ['探索', '窥视'],
  ['移动', '爬行'],
  ['交谈', '低语'],
  ['休息', '放弃'],
  ['深入', '坠入'],
  ['调查', '挖掘'],
  ['离开', '逃跑'],
  ['相信', '服从'],
  ['质疑', '背叛'],
  ['安全', '暂时'],
  ['选择', '屈服'],
];
export var CorruptibleChoice = memo(function (props) {
  var children = props.children,
    san = props.san,
    onClick = props.onClick,
    className = props.className,
    disabled = props.disabled,
    isKeyEvent = props.isKeyEvent; // true = bell/NPC core dialogue: full corruption
  var _l = useState(0);
  var level = _l[0],
    setLevel = _l[1];
  var hoverRef = useRef(false),
    tickRef = useRef(null),
    decayRef = useRef(null);
  var V = getVisualForSan(san, { GD: state._GD }); // This is called once per render, not in animation loop — OK
  // DESIGN_REFACTOR_NOTES.md: "选项自改写只在关键事件触发，普通行动保持轻度"
  // Non-key events: cap at level 2 (visual flicker only, no text rewriting)
  // Level 4 (cognitive_fog): minor option distrust for non-key events
  var maxCorruption = isKeyEvent ? 100 : (V.level >= 4 ? 20 : 0);
  var active = V.level >= 1 && !disabled && maxCorruption > 0;
  // Key events get faster corruption; non-key events get slow, subtle flicker
  var hoverDelay = isKeyEvent
    ? (V.level >= 6 ? 300 : V.level >= 5 ? 400 : V.level >= 4 ? 800 : V.level >= 3 ? 600 : V.level >= 2 ? 1200 : 0)
    : (V.level >= 5 ? 2000 : V.level >= 4 ? 3000 : 0);
  var startCorruption = useCallback(
    function () {
      if (!active || hoverDelay <= 0) return;
      hoverRef.current = true;
      // 清理旧计时器（防止快速 hover 切换产生堆积）
      if (tickRef.current) {
        clearTimeout(tickRef.current);
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      if (decayRef.current) {
        clearInterval(decayRef.current);
        decayRef.current = null;
      }
      var delay = hoverDelay + Math.random() * 200;
      tickRef.current = setTimeout(function () {
        setLevel(Math.min(maxCorruption, 10));
        tickRef.current = setInterval(function () {
          setLevel(function (p) {
            return Math.min(maxCorruption, p + 10);
          });
        }, 200);
      }, delay);
    },
    [active, hoverDelay, maxCorruption]
  );
  var stopCorruption = useCallback(function () {
    hoverRef.current = false;
    if (tickRef.current) {
      clearTimeout(tickRef.current);
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (decayRef.current) {
      clearInterval(decayRef.current);
      decayRef.current = null;
    }
    decayRef.current = setInterval(function () {
      setLevel(function (p) {
        if (p <= 0) {
          clearInterval(decayRef.current);
          decayRef.current = null;
          return 0;
        }
        return p - 15;
      });
    }, 150);
  }, []);
  // 集中清理：组件卸载或重新渲染时清理所有计时器
  useEffect(function () {
    return function () {
      if (tickRef.current) {
        clearTimeout(tickRef.current);
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      if (decayRef.current) {
        clearInterval(decayRef.current);
        decayRef.current = null;
      }
    };
  }, []);
  var text = children;
  if (level > 0 && typeof children === 'string' && children.length > 0) {
    if (level >= 10) {
      var t = children;
      for (var pi = 0; pi < _CP.length; pi++) {
        if (t.indexOf(_CP[pi][0]) >= 0) {
          t = t.replace(_CP[pi][0], _CP[pi][1]);
          break;
        }
      }
      text = t;
    }
    if (level >= 30) {
      var chars = String(text).split('');
      var ratio = (level - 30) / 70;
      var cc = Math.floor(chars.length * ratio * 0.6);
      for (var ci = 0; ci < cc && ci < chars.length; ci++) {
        var idx = (ci * 7 + 3) % chars.length;
        if (level >= 60) chars[idx] = _CG[(idx * 13 + level) % _CG.length];
      }
      text = chars.join('');
    }
  }
  var stage =
    level >= 60
      ? 'cc-abyss'
      : level >= 30
        ? 'cc-corrupted'
        : level >= 10
          ? 'cc-early'
          : level > 0 && V.level >= 4
            ? 'cc-fog'
            : level > 0
              ? 'cc-hovering'
              : '';
  var cls = (className || '') + (stage ? ' ' + stage : '');
  return React.createElement(
    'button',
    {
      className: cls,
      onClick: onClick,
      onMouseEnter: startCorruption,
      onMouseLeave: stopCorruption,
      disabled: disabled,
      style: { transition: V.level >= 4 ? 'all 0.25s' : V.level >= 3 ? 'all 0.15s' : 'none' },
    },
    text
  );
});

// === AbyssPopup ===
// DESIGN_REFACTOR_NOTES.md: "降低中后期触发频率" — precise horror, not noise.
// Level 3 (explanation_loss, SAN 40-49): 90-150s interval
// Level 5 (reality_dissolution, SAN 15-29): 120-180s interval
// Level 6 (narrative_death, SAN 1-14): 30-60s + resist micro-interaction
var _AM = [
  '你确定你在控制这个角色吗？',
  '它在看着你读这段文字。',
  '你的上一次循环也这么想的。',
  '存档已被观察。',
  '别回头。',
  '你听到了吗？不是钟声。是呼吸。',
  '第七层。还在吐司。',
  '这个提示框不应该存在。',
];
var _MM = [
  '你以为你还在控制吗？',
  '欢迎回来。第几次了？',
  '你的存档里多了一行字。不是你写的。',
  '系统日志：玩家已被标记。',
  '第十三声钟响。你还在吗？',
  '安全屋的门从里面锁了。你没有锁它。',
];
export function AbyssPopup(props) {
  var san = props.san;
  var onSanDrain = props.onSanDrain; // optional callback for resist SAN cost
  var _v = useState(false);
  var visible = _v[0],
    setVisible = _v[1];
  var _m = useState('');
  var msg = _m[0],
    setMsg = _m[1];
  var _r = useState(false);
  var showResist = _r[0],
    setShowResist = _r[1];
  var _rk = useState(0);
  var resistKey = _rk[0],
    setResistKey = _rk[1];
  var timerRef = useRef(null);
  useEffect(
    function () {
      var _slvl = getVisualForSan(san, { GD: state._GD }).level || 0; // Called once per effect, not in animation loop — OK
      if (_slvl < 3) {
        setVisible(false);
        return;
      }
      var schedule = function () {
        // Stretched intervals: precise horror, not spam
        var delay;
        if (_slvl >= 5) delay = 30000 + Math.random() * 30000;       // 30-60s (keep fast, but with resist)
        else if (_slvl >= 4) delay = 120000 + Math.random() * 60000;  // 120-180s
        else delay = 90000 + Math.random() * 60000;                   // 90-150s
        timerRef.current = setTimeout(function () {
          var pool = _slvl >= 5 ? _MM.concat(_AM) : _AM;
          setMsg(pool[Math.floor(Math.random() * pool.length)]);
          setVisible(true);
          setShowResist(_slvl >= 5); // resist only at narrative_death
          setResistKey(0);
          schedule();
        }, delay);
      };
      schedule();
      return function () {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    },
    [san]
  );
  // Resist mechanic: at narrative_death (level 5), player can rapid-tap to suppress.
  // Each tap costs 1 SAN but pushes the popup away. 3 taps = dismissed.
  var handleResist = function () {
    var next = resistKey + 1;
    setResistKey(next);
    if (onSanDrain) onSanDrain(1); // -1 SAN per tap
    if (next >= 3) {
      setVisible(false);
      setShowResist(false);
      setResistKey(0);
    }
  };
  if (!visible || !msg) return null;
  return React.createElement(
    'div',
    { className: 'abyss-popup' + (showResist ? ' abyss-popup-resist' : ''), role: 'alert' },
    React.createElement('div', { className: 'abyss-popup-text' }, msg),
    showResist
      ? React.createElement(
          'button',
          {
            className: 'abyss-resist-btn',
            onClick: handleResist,
            title: '抵抗 (-1 SAN)',
          },
          '抵抗' + (resistKey > 0 ? ' (' + resistKey + '/3)' : '')
        )
      : null,
    React.createElement(
      'button',
      {
        className: 'abyss-popup-close',
        onClick: function () {
          setVisible(false);
        },
      },
      '×'
    )
  );
}

// === Injected CSS: 7 stage progressive effects ===
if (typeof document !== 'undefined' && !document.getElementById('spl-css')) {
  var _css = document.createElement('style');
  _css.id = 'spl-css';
  _css.textContent = [
    // Canvas layer
    '.san-pollution-layer{position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9997;mix-blend-mode:multiply;opacity:0;transition:opacity 2s ease,filter 1.5s ease,transform 1.5s ease;transform-origin:center center}',
    '.san-pollution-layer.spl-low{opacity:0.6}',
    '.san-pollution-layer.spl-mid{opacity:0.8}',
    '.san-pollution-layer.spl-hostile{opacity:0.9}',
    '.san-pollution-layer.spl-extreme{opacity:1}',
    // Stage 1: mild_erosion [60,74] — shadow + cold hue + breathing
    '.san-stage-1 .narrative-block,.san-stage-1 .event-text{animation:splMildShadow 10s ease-in-out infinite}',
    '.san-stage-1 .game-layout{filter:hue-rotate(-8deg) saturate(0.95);animation:splBreath 30s ease-in-out infinite}',
    '@keyframes splMildShadow{0%,85%,100%{text-shadow:none}88%{text-shadow:0 0 2px rgba(100,120,160,0.15)}92%{text-shadow:0 1px 1px rgba(100,120,160,0.1)}}',
    '@keyframes splBreath{0%,100%{transform:scale(1)}50%{transform:scale(1.003)}}',
    // Stage 2: perception_shift [50,59] — tremble + glow
    '.san-stage-2 .narrative-block,.san-stage-2 .event-text{animation:splTremble 0.15s ease-in-out infinite}',
    '.san-stage-2 .game-layout{filter:hue-rotate(-12deg) saturate(0.85)}',
    '.san-stage-2 .area-name,.san-stage-2 .event-title{animation:splGlow 3s ease-in-out infinite}',
    '@keyframes splTremble{0%,100%{transform:translate(0,0)}25%{transform:translate(0.5px,-0.5px)}50%{transform:translate(-0.5px,0.5px)}75%{transform:translate(0.5px,0.5px)}}',
    '@keyframes splGlow{0%,100%{text-shadow:none;opacity:1}50%{text-shadow:0 0 6px rgba(160,140,200,0.2);opacity:0.95}}',
    // Stage 3: explanation_loss [40,49] — strong tremble + barrel
    '.san-stage-3 .game-layout{filter:hue-rotate(-15deg) saturate(0.75)}',
    '.san-stage-3 .narrative-block,.san-stage-3 .event-text{animation:splTrembleStrong 0.12s ease-in-out infinite}',
    '@keyframes splTrembleStrong{0%,100%{transform:translate(0,0)}25%{transform:translate(1px,-1px)}50%{transform:translate(-1px,0.5px)}75%{transform:translate(0.5px,1px)}}',
    // Stage 4: cognitive_fog [30,39] — fog overlay + option distrust
    '.san-stage-4 .game-layout{filter:hue-rotate(-16deg) saturate(0.7) blur(0.3px)}',
    '.san-stage-4 .narrative-block,.san-stage-4 .event-text{animation:splFog 8s ease-in-out infinite}',
    '.san-stage-4 .action-btn{opacity:0.9;transition:opacity 0.5s}',
    '@keyframes splFog{0%,100%{opacity:1}50%{opacity:0.85}}',
    // Stage 5: reality_dissolution [15,29] — button flicker + displacement
    '.san-stage-5 .game-layout{filter:hue-rotate(-18deg) saturate(0.6)}',
    '.san-stage-5 .action-btn{animation:splFlicker 4s ease-in-out infinite}',
    '.san-stage-5 .action-btn:nth-child(2n){animation-delay:1.3s}',
    '.san-stage-5 .action-btn:nth-child(3n){animation-delay:2.7s}',
    '@keyframes splFlicker{0%,92%,100%{opacity:1;transform:translate(0,0)}93%{opacity:0.7;transform:translate(1px,0)}95%{opacity:1;transform:translate(-1px,0)}97%{opacity:0.8;transform:translate(0,1px)}}',
    // Stage 6: narrative_death [1,14] — extreme everything + cursor + screen tear
    '.san-stage-6 .game-layout{filter:hue-rotate(-22deg) saturate(0.4) contrast(1.1)}',
    '.san-stage-6 .action-btn{animation:splFlicker 2s ease-in-out infinite,splTrembleStrong 0.1s ease-in-out infinite;cursor:crosshair}',
    '.san-stage-6 .narrative-block{animation:splTrembleStrong 0.08s ease-in-out infinite}',
    // CorruptibleChoice
    '.cc-hovering{opacity:0.92!important;transition:opacity 0.3s}',
    '.cc-early{color:var(--text)!important;opacity:0.88!important;text-shadow:0 0 4px rgba(180,30,30,0.3)}',
    '.cc-corrupted{color:var(--danger2)!important;font-style:italic;opacity:0.82!important;text-shadow:0 0 8px rgba(180,30,30,0.4);animation:ccFlicker 0.6s ease-in-out infinite}',
    '.cc-abyss{color:#6a1b1b!important;font-style:italic;opacity:0.75!important;text-shadow:0 0 12px rgba(180,30,30,0.6);animation:ccAbyss 0.4s ease-in-out infinite;letter-spacing:0.05em}',
    // Cognitive fog choice style (stage 4)
    '.cc-fog{color:var(--danger2)!important;opacity:0.88!important;text-shadow:0 0 3px rgba(180,30,30,0.2);animation:ccFog 6s ease-in-out infinite}',
    '@keyframes ccFog{0%,100%{text-shadow:0 0 3px rgba(180,30,30,0.2)}50%{text-shadow:0 0 6px rgba(180,30,30,0.35)}}',
    '@keyframes ccFlicker{0%,100%{opacity:0.82}50%{opacity:0.62}}',
    '@keyframes ccAbyss{0%,100%{opacity:0.75;transform:translateX(0)}25%{opacity:0.6;transform:translateX(-1px)}75%{opacity:0.65;transform:translateX(1px)}}',
    // Abyss popup
    '.abyss-popup{position:fixed;bottom:12%;right:5%;z-index:10001;background:rgba(8,2,12,0.92);border:1px solid rgba(120,30,30,0.35);color:rgba(180,140,140,0.9);padding:0.7rem 1rem;font-size:0.82rem;font-family:"Noto Serif SC","Songti SC",serif;max-width:280px;pointer-events:auto;animation:abyssAppear 1.5s ease-out;box-shadow:0 0 30px rgba(80,10,10,0.2)}',
    '.abyss-popup-text{line-height:1.5}',
    '.abyss-popup-close{position:absolute;top:0.2rem;right:0.5rem;background:none;border:none;color:rgba(180,140,140,0.5);cursor:pointer;font-size:1rem;padding:0.2rem}',
    '.abyss-popup-close:hover{color:rgba(180,140,140,0.8)}',
    '.abyss-popup-resist{border-color:rgba(180,30,30,0.6);animation:abyssPulse 2s ease-in-out infinite}',
    '.abyss-resist-btn{display:block;margin:0.5rem 0 0;padding:0.3rem 0.8rem;background:rgba(180,30,30,0.15);border:1px solid rgba(180,30,30,0.4);color:rgba(220,160,160,0.9);cursor:pointer;font-size:0.78rem;font-family:inherit;border-radius:3px;transition:all 0.15s}',
    '.abyss-resist-btn:hover{background:rgba(180,30,30,0.3);border-color:rgba(180,30,30,0.7)}',
    '.abyss-resist-btn:active{transform:scale(0.95);background:rgba(180,30,30,0.5)}',
    '@keyframes abyssPulse{0%,100%{box-shadow:0 0 30px rgba(80,10,10,0.2)}50%{box-shadow:0 0 50px rgba(120,20,20,0.4)}}',
    '@keyframes abyssAppear{0%{opacity:0;transform:translateY(20px)}100%{opacity:1;transform:translateY(0)}}',
  ].join('');
  document.head.appendChild(_css);
}
