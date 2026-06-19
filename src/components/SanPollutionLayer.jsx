// src/components/SanPollutionLayer.jsx - SAN visual corruption (SSOT, 6 stages)
// Visual parameter computation delegated to systems/sanityVisual.js
const { useEffect, useRef, useCallback, useState, memo } = React;
// P2-4: Adaptive FPS — 3-tier performance system
// Tier 0 (normal): all effects, 15fps cap
// Tier 1 (degraded): skip barrel distortion + noise, 12fps cap
// Tier 2 (critical): CSS-only fallback, 8fps cap
export const FPS_CAP_DEFAULT = 15;
export const FPS_CAP_DEGRADED = 12;
export const FPS_CAP_LOW = 8;
var _currentFpsCap = FPS_CAP_DEFAULT;
var FRAME_MS = 1000 / _currentFpsCap;
var _perfTier = 0; // 0=normal, 1=degraded (skip expensive effects), 2=critical (CSS-only)
const LERP = 0.06;
export function lerp(a, b, t) {
  return a + (b - a) * t;
}
var _noise = null;
export function getNoise(w, h) {
  if (_noise && _noise.width === w && _noise.height === h) return _noise;
  _noise = document.createElement('canvas');
  _noise.width = w;
  _noise.height = h;
  var nc = _noise.getContext('2d');
  var id = nc.createImageData(w, h);
  var d = id.data;
  for (var i = 0; i < d.length; i += 4) {
    var v = Math.random() * 255;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 18;
  }
  nc.putImageData(id, 0, 0);
  return _noise;
}

// getVisualForSan moved to systems/sanityVisual.js (SSOT)
// Re-export for backward compat; canvas renderer uses the canonical version.
import { getVisualForSan } from '../systems/sanityVisual.js';
export { getVisualForSan };

// === Canvas Renderer ===
export var SanPollutionLayer = memo(function SanPollutionLayer(props) {
  var san = props.san,
    loopCount = props.loopCount,
    corruption = props.corruption,
    glitchPulse = props.glitchPulse || 0;
  var enabled = props.enabled,
    intensity = props.intensity;
  var canvasRef = useRef(null);
  // Cache getVisualForSan result — only recalculate when san changes
  var cachedSan = useRef(san);
  var cachedVisual = useRef(null);
  var getCachedVisual = useCallback(function (currentSan) {
    if (currentSan !== cachedSan.current || !cachedVisual.current) {
      cachedSan.current = currentSan;
      cachedVisual.current = getVisualForSan(currentSan);
    }
    return cachedVisual.current;
  }, []);
  var st = useRef({
    cR: 0,
    cG: 0,
    cB: 0,
    cA: 0,
    scanA: 0,
    tearP: 0,
    noiseA: 0,
    vigA: 0,
    chromaA: 0,
    barrelS: 0,
    rotA: 0,
    lastT: 0,
    raf: 0,
  });
  var I = Math.max(0, Math.min(100, intensity != null ? intensity : 50)) / 100;
  // P2-4: prefers-reduced-motion — disable canvas effects entirely for accessibility
  var _prm = useState(function () {
    return typeof window !== 'undefined' &&
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  var reducedMotion = _prm[0];
  // P2-4: Monitor FPS and auto-degrade if performance is poor
  var fpsMon = useRef({ frames: 0, lastCheck: 0, avgFps: 60 });
  var resize = useCallback(function () {
    var c = canvasRef.current;
    if (!c) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = window.innerWidth * dpr;
    c.height = window.innerHeight * dpr;
    c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);
  useEffect(
    function () {
      resize();
      window.addEventListener('resize', resize);
      return function () {
        window.removeEventListener('resize', resize);
      };
    },
    [resize]
  );
  useEffect(
    function () {
      var canvas = canvasRef.current;
      if (!canvas || !enabled || reducedMotion) return;
      var ctx = canvas.getContext('2d');
      var s = st.current;
      var alive = true;
      function frame(now) {
        if (!alive) return;
        s.raf = requestAnimationFrame(frame);
        if (now - s.lastT < FRAME_MS) return;
        s.lastT = now;
        // P2-4: FPS monitoring — auto-degrade to FPS_CAP_LOW if avg FPS < 10
        var fm = fpsMon.current;
        fm.frames++;
        if (now - fm.lastCheck > 3000) {
          fm.avgFps = Math.round((fm.frames * 1000) / (now - fm.lastCheck));
          fm.frames = 0;
          fm.lastCheck = now;
          // 3-tier performance degrade: skip expensive effects at low FPS
          if (fm.avgFps < 10) {
            if (_perfTier !== 2) { _perfTier = 2; _currentFpsCap = FPS_CAP_LOW; FRAME_MS = 1000 / _currentFpsCap; }
          } else if (fm.avgFps < 20) {
            if (_perfTier !== 1) { _perfTier = 1; _currentFpsCap = FPS_CAP_DEGRADED; FRAME_MS = 1000 / _currentFpsCap; }
          } else {
            if (_perfTier !== 0) { _perfTier = 0; _currentFpsCap = FPS_CAP_DEFAULT; FRAME_MS = 1000 / _currentFpsCap; }
          }
        }
        var w = window.innerWidth,
          h = window.innerHeight;
        ctx.clearRect(0, 0, w, h);
        var V = getCachedVisual(san);
        var corF = Math.min(1, (corruption || 0) / 80) * I;
        var totalI = Math.abs(V.sat) + V.vig + V.scan + V.noise + V.barrel + V.chroma + V.rot;
        if (totalI < 0.5 && corF < 0.01) {
          if (canvas.style.opacity !== '0') canvas.style.opacity = '0';
          canvas.style.filter = 'none';
          return;
        }
        if (canvas.style.opacity !== '1') canvas.style.opacity = '1';
        // Color shift
        var colorI = Math.max(0, -V.sat / 60) * I;
        s.cR = lerp(s.cR, 20 + colorI * 50, LERP);
        s.cG = lerp(s.cG, colorI * 2, LERP);
        s.cB = lerp(s.cB, 8 + colorI * 25, LERP);
        s.cA = lerp(s.cA, colorI * 0.08 + corF * 0.03, LERP);
        if (s.cA > 0.003) {
          ctx.fillStyle =
            'rgba(' +
            (s.cR | 0) +
            ',' +
            (s.cG | 0) +
            ',' +
            (s.cB | 0) +
            ',' +
            s.cA.toFixed(3) +
            ')';
          ctx.fillRect(0, 0, w, h);
        }
        // Noise (skip at perf tier 1+ — expensive drawImage)
        if (_perfTier < 1) {
          var targetNoise = (V.noise * I + corF * 0.02) * (1 + 0.3 * Math.sin(now * 0.002));
          s.noiseA = lerp(s.noiseA, targetNoise, LERP);
          if (s.noiseA > 0.003) {
            ctx.globalAlpha = s.noiseA;
            ctx.drawImage(getNoise(w | 0, h | 0), 0, 0, w, h);
            ctx.globalAlpha = 1;
          }
        }
        // Scanlines
        var targetScan = V.scan * 0.12 * I;
        s.scanA = lerp(s.scanA, targetScan, LERP);
        if (s.scanA > 0.003) {
          ctx.strokeStyle = 'rgba(0,0,0,' + s.scanA.toFixed(4) + ')';
          ctx.lineWidth = 0.8;
          var off = (now * 0.015) % 4;
          for (var y = off; y < h; y += 2.5) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
          }
        }
        // Vignette
        var targetVig = V.vig * I * (1 + 0.3 * Math.sin(now * 0.001));
        s.vigA = lerp(s.vigA, targetVig + corF * 0.05, LERP);
        if (s.vigA > 0.01) {
          var vigR = V.level >= 4 ? 0.1 : 0.25;
          var g = ctx.createRadialGradient(w / 2, h / 2, w * vigR, w / 2, h / 2, w * 0.68);
          g.addColorStop(0, 'rgba(0,0,0,0)');
          g.addColorStop(1, 'rgba(12,0,8,' + s.vigA.toFixed(3) + ')');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, w, h);
        }
        // Chromatic aberration
        var targetChroma = V.chroma * 0.015 * I;
        s.chromaA = lerp(s.chromaA, targetChroma, LERP);
        if (s.chromaA > 0.005) {
          var edgeW = Math.min(0.2, 0.08 + V.chroma * 0.02) * w;
          var cr = ctx.createLinearGradient(0, 0, edgeW, 0);
          cr.addColorStop(0, 'rgba(180,20,30,' + s.chromaA.toFixed(3) + ')');
          cr.addColorStop(1, 'rgba(180,20,30,0)');
          ctx.fillStyle = cr;
          ctx.fillRect(0, 0, edgeW, h);
          var cb = ctx.createLinearGradient(w - edgeW, 0, w, 0);
          cb.addColorStop(0, 'rgba(30,40,180,0)');
          cb.addColorStop(1, 'rgba(30,40,180,' + s.chromaA.toFixed(3) + ')');
          ctx.fillStyle = cb;
          ctx.fillRect(w - edgeW, 0, edgeW, h);
        }
        // Barrel + rotation (skip CSS filter/transform at perf tier 1+)
        s.barrelS = lerp(s.barrelS, V.barrel * I, LERP);
        s.rotA = lerp(s.rotA, V.rot * I, LERP);
        var breathPulse = 1 + 0.004 * Math.sin(now * 0.0008) * (V.level >= 3 ? 1 : 0);
        var blurAmt = s.barrelS > 0.02 ? s.barrelS * 8 : 0;
        var rotDeg = s.rotA * Math.sin(now * 0.0003) * 0.5;
        if (_perfTier < 1) {
          canvas.style.filter = blurAmt > 0.02 ? 'blur(' + blurAmt.toFixed(1) + 'px) ' : '';
          canvas.style.transform =
            'scale(' + breathPulse.toFixed(4) + ') rotate(' + rotDeg.toFixed(2) + 'deg)';
        } else {
          canvas.style.filter = 'none';
          canvas.style.transform = 'none';
        }
        // Glitch pulse overlay (early hooks / thirteenth bell entrance)
        if (glitchPulse > 0) {
          var gpI = glitchPulse / 10; // 0..1
          var gpBlur = 1 + gpI * 4;
          var gpHue = Math.sin(now * 0.01) * 15 * gpI;
          var gpSat = 1 + gpI * 0.6;
          canvas.style.filter += 'blur(' + gpBlur.toFixed(1) + 'px) hue-rotate(' + gpHue.toFixed(0) + 'deg) saturate(' + gpSat.toFixed(2) + ')';
          canvas.style.opacity = '1';
          // Draw a red-purple flash overlay
          ctx.fillStyle = 'rgba(120, 10, 30, ' + (gpI * 0.12).toFixed(3) + ')';
          ctx.fillRect(0, 0, w, h);
          // Horizontal tear lines
          for (var gt = 0; gt < 3 * gpI; gt++) {
            var gtY = Math.random() * h;
            var gtH = 1 + Math.random() * 3 * gpI;
            var gtShift = (Math.random() - 0.5) * 30 * gpI;
            try {
              var gtData = ctx.getImageData(0, gtY | 0, w | 0, gtH | 0);
              ctx.putImageData(gtData, gtShift | 0, gtY | 0);
            } catch (e) {}
          }
        }
        // Screen tears (level>=4, skip at perf tier 2 — expensive getImageData)
        if (V.level >= 4 && _perfTier < 2) {
          var tearProb = (V.level >= 5 ? 0.18 : 0.06) * I;
          s.tearP = lerp(s.tearP, tearProb, LERP);
          if (Math.random() < s.tearP) {
            var sy = Math.random() * h,
              sh = 1 + Math.random() * 8;
            var sx = (Math.random() - 0.5) * 20 * I;
            try {
              var id = ctx.getImageData(0, sy | 0, w | 0, sh | 0);
              ctx.putImageData(id, sx | 0, sy | 0);
            } catch (e) {}
          }
        }
      }
      s.raf = requestAnimationFrame(frame);
      return function () {
        alive = false;
        cancelAnimationFrame(s.raf);
      };
    },
    [san, loopCount, corruption, enabled, I, reducedMotion, glitchPulse]
  );
  if (!enabled || reducedMotion) return null;
  var V = getCachedVisual(san);
  var tier =
    V.level >= 4
      ? 'spl-extreme'
      : V.level >= 3
        ? 'spl-hostile'
        : V.level >= 2
          ? 'spl-mid'
          : V.level >= 1
            ? 'spl-low'
            : '';
  return React.createElement('canvas', {
    ref: canvasRef,
    className: 'san-pollution-layer ' + tier,
    'aria-hidden': 'true',
  });
});

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
  var V = getVisualForSan(san); // This is called once per render, not in animation loop — OK
  // DESIGN_REFACTOR_NOTES.md: "选项自改写只在关键事件触发，普通行动保持轻度"
  // Non-key events: cap at level 2 (visual flicker only, no text rewriting)
  var maxCorruption = isKeyEvent ? 100 : (V.level >= 3 ? 20 : 0);
  var active = V.level >= 1 && !disabled && maxCorruption > 0;
  // Key events get faster corruption; non-key events get slow, subtle flicker
  var hoverDelay = isKeyEvent
    ? (V.level >= 5 ? 400 : V.level >= 4 ? 800 : V.level >= 3 ? 600 : V.level >= 2 ? 1200 : 0)
    : (V.level >= 4 ? 2000 : V.level >= 3 ? 3000 : 0);
  var startCorruption = useCallback(
    function () {
      if (!active || hoverDelay <= 0) return;
      hoverRef.current = true;
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
    [active, hoverDelay]
  );
  var stopCorruption = useCallback(function () {
    hoverRef.current = false;
    if (tickRef.current) {
      clearTimeout(tickRef.current);
      clearInterval(tickRef.current);
      tickRef.current = null;
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
  useEffect(function () {
    return function () {
      if (tickRef.current) {
        clearTimeout(tickRef.current);
        clearInterval(tickRef.current);
      }
      if (decayRef.current) clearInterval(decayRef.current);
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
// Level 3 (explanation_loss, SAN 25-39): 90-150s interval
// Level 4 (reality_dissolution, SAN 10-24): 120-180s interval
// Level 5 (narrative_death, SAN 1-9): 30-60s + resist micro-interaction
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
      var _slvl = getVisualForSan(san).level || 0; // Called once per effect, not in animation loop — OK
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

// === Injected CSS: 6 stage progressive effects ===
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
    // Stage 1: mild_erosion [55,74] — shadow + cold hue + breathing
    '.san-stage-1 .narrative-block,.san-stage-1 .event-text{animation:splMildShadow 10s ease-in-out infinite}',
    '.san-stage-1 .game-layout{filter:hue-rotate(-8deg) saturate(0.95);animation:splBreath 30s ease-in-out infinite}',
    '@keyframes splMildShadow{0%,85%,100%{text-shadow:none}88%{text-shadow:0 0 2px rgba(100,120,160,0.15)}92%{text-shadow:0 1px 1px rgba(100,120,160,0.1)}}',
    '@keyframes splBreath{0%,100%{transform:scale(1)}50%{transform:scale(1.003)}}',
    // Stage 2: perception_shift [40,54] — tremble + glow
    '.san-stage-2 .narrative-block,.san-stage-2 .event-text{animation:splTremble 0.15s ease-in-out infinite}',
    '.san-stage-2 .game-layout{filter:hue-rotate(-12deg) saturate(0.85)}',
    '.san-stage-2 .area-name,.san-stage-2 .event-title{animation:splGlow 3s ease-in-out infinite}',
    '@keyframes splTremble{0%,100%{transform:translate(0,0)}25%{transform:translate(0.5px,-0.5px)}50%{transform:translate(-0.5px,0.5px)}75%{transform:translate(0.5px,0.5px)}}',
    '@keyframes splGlow{0%,100%{text-shadow:none;opacity:1}50%{text-shadow:0 0 6px rgba(160,140,200,0.2);opacity:0.95}}',
    // Stage 3: explanation_loss [25,39] — strong tremble + barrel
    '.san-stage-3 .game-layout{filter:hue-rotate(-15deg) saturate(0.75)}',
    '.san-stage-3 .narrative-block,.san-stage-3 .event-text{animation:splTrembleStrong 0.12s ease-in-out infinite}',
    '@keyframes splTrembleStrong{0%,100%{transform:translate(0,0)}25%{transform:translate(1px,-1px)}50%{transform:translate(-1px,0.5px)}75%{transform:translate(0.5px,1px)}}',
    // Stage 4: reality_dissolution [10,24] — button flicker + displacement
    '.san-stage-4 .game-layout{filter:hue-rotate(-18deg) saturate(0.6)}',
    '.san-stage-4 .action-btn{animation:splFlicker 4s ease-in-out infinite}',
    '.san-stage-4 .action-btn:nth-child(2n){animation-delay:1.3s}',
    '.san-stage-4 .action-btn:nth-child(3n){animation-delay:2.7s}',
    '@keyframes splFlicker{0%,92%,100%{opacity:1;transform:translate(0,0)}93%{opacity:0.7;transform:translate(1px,0)}95%{opacity:1;transform:translate(-1px,0)}97%{opacity:0.8;transform:translate(0,1px)}}',
    // Stage 5: narrative_death [1,9] — extreme everything + cursor
    '.san-stage-5 .game-layout{filter:hue-rotate(-22deg) saturate(0.4) contrast(1.1)}',
    '.san-stage-5 .action-btn{animation:splFlicker 2s ease-in-out infinite,splTrembleStrong 0.1s ease-in-out infinite;cursor:crosshair}',
    '.san-stage-5 .narrative-block{animation:splTrembleStrong 0.08s ease-in-out infinite}',
    // CorruptibleChoice
    '.cc-hovering{opacity:0.92!important;transition:opacity 0.3s}',
    '.cc-early{color:var(--text)!important;opacity:0.88!important;text-shadow:0 0 4px rgba(180,30,30,0.3)}',
    '.cc-corrupted{color:var(--danger2)!important;font-style:italic;opacity:0.82!important;text-shadow:0 0 8px rgba(180,30,30,0.4);animation:ccFlicker 0.6s ease-in-out infinite}',
    '.cc-abyss{color:#6a1b1b!important;font-style:italic;opacity:0.75!important;text-shadow:0 0 12px rgba(180,30,30,0.6);animation:ccAbyss 0.4s ease-in-out infinite;letter-spacing:0.05em}',
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
