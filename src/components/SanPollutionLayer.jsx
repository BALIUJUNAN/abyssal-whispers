// src/components/SanPollutionLayer.jsx - SAN visual corruption layer (SSOT)
// All visual parameters come from game_base.json san_stages[].visual config.
// Smooth interpolation between stages — no hardcoded thresholds.

const { useEffect, useRef, useCallback, useState, memo } = React;

const FPS_CAP = 15;
const FRAME_MS = 1000 / FPS_CAP;
const LERP = 0.06;

function lerp(a, b, t) { return a + (b - a) * t; }

// Default clean stage visual (used when stages config is unavailable)
var _CLEAN_VIS = {saturation:0,vignette:0,scanline:0,noise:0,barrel_distortion:0,
  chromatic_aberration:0,rotation:0,text_shadow:false,text_tremble:false,glow:false};

/**
 * Get interpolated visual config for a given SAN value.
 * Smoothly blends between current and next stage at stage boundaries.
 * @param {number} san
 * @returns {{ sat, vig, scan, noise, barrel, chroma, rot, shadow, tremble, glow, level }}
 */
function getVisualForSan(san) {
  // Access stages from global GD (set by initExtendedEvents)
  var GD = (typeof __GAME_DATA__ !== 'undefined') ? __GAME_DATA__ : (typeof window !== 'undefined' && window.__GAME_DATA__) || {};
  var stages = (GD.systems && GD.systems.sanity && GD.systems.sanity.san_stages) || [];
  if (stages.length === 0) return {sat:0,vig:0,scan:0,noise:0,barrel:0,chroma:0,rot:0,shadow:false,tremble:false,glow:false,level:0};

  // Find current stage
  var curIdx = 0;
  for (var i = 0; i < stages.length; i++) {
    if (san >= stages[i].range[0] && san <= stages[i].range[1]) { curIdx = i; break; }
    if (san < stages[i].range[0] && (i === stages.length - 1 || san >= stages[i+1].range[0])) { curIdx = i; break; }
  }
  if (san < stages[stages.length-1].range[0]) curIdx = stages.length - 1;

  var cur = stages[curIdx];
  var curVis = cur.visual || _CLEAN_VIS;

  // If at last stage or SAN is high, just return current stage values
  if (curIdx >= stages.length - 1 || san >= 75) {
    return {sat:curVis.saturation||0,vig:curVis.vignette||0,scan:curVis.scanline||0,
      noise:curVis.noise||0,barrel:curVis.barrel_distortion||0,chroma:curVis.chromatic_aberration||0,
      rot:curVis.rotation||0,shadow:!!curVis.text_shadow,tremble:!!curVis.text_tremble,
      glow:!!curVis.glow,level:cur.level||0};
  }

  // Blend factor: 0 at top of current range, 1 at bottom (approaching next stage)
  var rangeSize = cur.range[1] - cur.range[0];
  var blend = rangeSize > 0 ? Math.max(0, Math.min(1, (cur.range[1] - san) / rangeSize)) : 0;

  var next = stages[curIdx + 1];
  var nextVis = next.visual || _CLEAN_VIS;

  return {
    sat:    lerp(curVis.saturation||0, nextVis.saturation||0, blend),
    vig:    lerp(curVis.vignette||0, nextVis.vignette||0, blend),
    scan:   lerp(curVis.scanline||0, nextVis.scanline||0, blend),
    noise:  lerp(curVis.noise||0, nextVis.noise||0, blend),
    barrel: lerp(curVis.barrel_distortion||0, nextVis.barrel_distortion||0, blend),
    chroma: lerp(curVis.chromatic_aberration||0, nextVis.chromatic_aberration||0, blend),
    rot:    lerp(curVis.rotation||0, nextVis.rotation||0, blend),
    shadow: curVis.text_shadow || (blend > 0.5 && nextVis.text_shadow),
    tremble:curVis.text_tremble || (blend > 0.3 && nextVis.text_tremble),
    glow:   curVis.glow || (blend > 0.5 && nextVis.glow),
    level:  cur.level || 0
  };
}

let _noise = null;
function getNoise(w, h) {
  if (_noise && _noise.width === w && _noise.height === h) return _noise;
  _noise = document.createElement('canvas');
  _noise.width = w; _noise.height = h;
  const nc = _noise.getContext('2d');
  const id = nc.createImageData(w, h);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.random() * 255;
    d[i] = d[i+1] = d[i+2] = v; d[i+3] = 18;
  }
  nc.putImageData(id, 0, 0);
  return _noise;
}

const SanPollutionLayer = memo(function SanPollutionLayer({ san, loopCount, corruption, enabled, intensity, interactionPollution, metaPollution }) {
  const canvasRef = useRef(null);
  const st = useRef({cR:0,cG:0,cB:0,cA:0,scanA:0,tearP:0,noiseA:0,vigA:0,chromaA:0,barrelS:0,rotA:0,lastT:0,raf:0});
  // intensity: 0-100, default 50. Scales visual effects.
  const I = Math.max(0, Math.min(100, intensity != null ? intensity : 50)) / 100;

  const resize = useCallback(() => {
    const c = canvasRef.current; if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = window.innerWidth * dpr;
    c.height = window.innerHeight * dpr;
    c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  useEffect(() => {
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [resize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled) return;
    const ctx = canvas.getContext('2d');
    const s = st.current;
    let alive = true;

    function frame(now) {
      if (!alive) return;
      s.raf = requestAnimationFrame(frame);
      if (now - s.lastT < FRAME_MS) return;
      s.lastT = now;

      const w = window.innerWidth, h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      // SSOT: get interpolated visual config from san_stages
      var V = getVisualForSan(san);
      var corF = Math.min(1, (corruption || 0) / 80) * I;

      // If all visual values are near zero, fade out
      var totalIntensity = Math.abs(V.sat) + V.vig + V.scan + V.noise + V.barrel + V.chroma + V.rot;
      if (totalIntensity < 0.5 && corF < 0.01) {
        if (canvas.style.opacity !== '0') canvas.style.opacity = '0';
        canvas.style.filter = 'none';
        return;
      }
      if (canvas.style.opacity !== '1') canvas.style.opacity = '1';

      // === SATURATION: CSS filter on the canvas ===
      var satVal = V.sat * I;
      var filterStr = '';
      if (satVal < -1) {
        filterStr = 'saturate(' + Math.max(0, 1 + satVal / 100).toFixed(2) + ') ';
      }

      // === COLOR SHIFT: dark red/blue overlay ===
      var colorIntensity = Math.max(0, -V.sat / 60) * I;
      s.cR = lerp(s.cR, 20 + colorIntensity * 50, LERP);
      s.cG = lerp(s.cG, colorIntensity * 2, LERP);
      s.cB = lerp(s.cB, 8 + colorIntensity * 25, LERP);
      s.cA = lerp(s.cA, colorIntensity * 0.08 + corF * 0.03, LERP);
      if (s.cA > 0.003) {
        ctx.fillStyle = 'rgba('+(s.cR|0)+','+(s.cG|0)+','+(s.cB|0)+','+s.cA.toFixed(3)+')';
        ctx.fillRect(0, 0, w, h);
      }

      // === NOISE ===
      var targetNoise = (V.noise * I + corF * 0.02) * (1 + 0.3 * Math.sin(now * 0.002));
      s.noiseA = lerp(s.noiseA, targetNoise, LERP);
      if (s.noiseA > 0.003) {
        ctx.globalAlpha = s.noiseA;
        ctx.drawImage(getNoise(w|0, h|0), 0, 0, w, h);
        ctx.globalAlpha = 1;
      }

      // === SCANLINES ===
      var targetScan = V.scan * 0.12 * I;
      s.scanA = lerp(s.scanA, targetScan, LERP);
      if (s.scanA > 0.003) {
        ctx.strokeStyle = 'rgba(0,0,0,'+s.scanA.toFixed(4)+')';
        ctx.lineWidth = 0.8;
        var off = (now * 0.015) % 4;
        for (var y = off; y < h; y += 2.5) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      }

      // === VIGNETTE ===
      var targetVig = V.vig * I * (1 + 0.3 * Math.sin(now * 0.001));
      s.vigA = lerp(s.vigA, targetVig + corF * 0.05, LERP);
      if (s.vigA > 0.01) {
        var vigRadius = V.level >= 4 ? 0.10 : 0.25;
        var g = ctx.createRadialGradient(w/2, h/2, w * vigRadius, w/2, h/2, w * 0.68);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(12,0,8,'+s.vigA.toFixed(3)+')');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      // === CHROMATIC ABERRATION ===
      var targetChroma = V.chroma * 0.015 * I;
      s.chromaA = lerp(s.chromaA, targetChroma, LERP);
      if (s.chromaA > 0.005) {
        var edgeW = Math.min(0.20, 0.08 + V.chroma * 0.02) * w;
        var cr = ctx.createLinearGradient(0, 0, edgeW, 0);
        cr.addColorStop(0, 'rgba(180,20,30,'+s.chromaA.toFixed(3)+')');
        cr.addColorStop(1, 'rgba(180,20,30,0)');
        ctx.fillStyle = cr; ctx.fillRect(0, 0, edgeW, h);
        var cb = ctx.createLinearGradient(w - edgeW, 0, w, 0);
        cb.addColorStop(0, 'rgba(30,40,180,0)');
        cb.addColorStop(1, 'rgba(30,40,180,'+s.chromaA.toFixed(3)+')');
        ctx.fillStyle = cb; ctx.fillRect(w - edgeW, 0, edgeW, h);
      }

      // === BARREL DISTORTION + ROTATION (CSS transform) ===
      var targetBarrel = V.barrel * I;
      s.barrelS = lerp(s.barrelS, targetBarrel, LERP);
      var targetRot = V.rot * I;
      s.rotA = lerp(s.rotA, targetRot, LERP);

      var breathPulse = 1 + 0.004 * Math.sin(now * 0.0008) * (V.level >= 3 ? 1 : 0);
      var blurAmt = s.barrelS > 0.02 ? s.barrelS * 8 : 0;
      var rotDeg = s.rotA * Math.sin(now * 0.0003) * 0.5;
      filterStr += (blurAmt > 0.02 ? 'blur('+blurAmt.toFixed(1)+'px) ' : '');
      canvas.style.filter = filterStr || 'none';
      canvas.style.transform = 'scale('+breathPulse.toFixed(4)+') rotate('+rotDeg.toFixed(2)+'deg)';

      // === SCREEN TEARS (level >= 4) ===
      if (V.level >= 4) {
        var tearProb = (V.level >= 5 ? 0.18 : 0.06) * I;
        s.tearP = lerp(s.tearP, tearProb, LERP);
        if (Math.random() < s.tearP) {
          var sy = Math.random() * h, sh = 1 + Math.random() * 8;
          var sx = (Math.random() - 0.5) * 20 * I;
          try { var id = ctx.getImageData(0, sy|0, w|0, sh|0); ctx.putImageData(id, sx|0, sy|0); } catch(e) {}
        }
      }
    }

    s.raf = requestAnimationFrame(frame);
    return () => { alive = false; cancelAnimationFrame(s.raf); };
  }, [san, loopCount, corruption, enabled, I]);

  if (!enabled) return null;
  var V = getVisualForSan(san);
  var tier = V.level >= 4 ? 'spl-extreme' : V.level >= 3 ? 'spl-hostile' : V.level >= 2 ? 'spl-mid' : V.level >= 1 ? 'spl-low' : '';
  return <canvas ref={canvasRef} className={"san-pollution-layer "+tier} aria-hidden="true" />;
});

// === CorruptibleChoice: gradual hover corruption ===
// Corruption increases step-by-step while hovering (800ms delay, then +10% every 200ms)
// Characters are replaced progressively: normal \u2192 red tint \u2192 corrupted glyph \u2192 abyss symbol
const _CORRUPT_GLYPHS = '\u2588\u2593\u2592\u2591\u2584\u2580\u258c\u2590\u25a0\u25ac\u25b2\u25bc\u25cf\u25cb\u263c\u2605\u2606\u2720\u2721\u2726\u273d\u273e\u0416\u0429\u042a\u042b\u042d\u042e\u042f\u0414\u041b\u0424\u0426\u0417\u0418\u0419\u041a\u041c\u041d\u041e\u041f\u0420\u0421\u0422\u0423\u0412\u0413\u0415';
const _CORRUPT_PAIRS = [
  ['\u63a2\u7d22','\u7aa5\u89c6'], ['\u79fb\u52a8','\u722c\u884c'], ['\u4ea4\u8c08','\u4f4e\u8bed'], ['\u4f11\u606f','\u653e\u5f03'],
  ['\u6df1\u5165','\u5760\u5165'], ['\u8c03\u67e5','\u6316\u6398'], ['\u79bb\u5f00','\u9003\u8dd1'], ['\u89c2\u5bdf','\u51dd\u89c6'],
  ['\u76f8\u4fe1','\u670d\u4ece'], ['\u8d28\u7591','\u80cc\u53db'], ['\u5b89\u5168','\u6682\u65f6'], ['\u9009\u62e9','\u5c48\u670d'],
  ['\u7ee7\u7eed','\u56de\u4e0d\u53bb\u4e86'], ['\u786e\u8ba4','\u627f\u8ba4'],
];

function CorruptibleChoice({ children, san, onClick, className, disabled }) {
  const [level, setLevel] = useState(0); // 0-100
  const hoverRef = useRef(false);
  const tickRef = useRef(null);
  const decayRef = useRef(null);
  // SSOT: activate below stable stage (mild_erosion and lower)
  const active = san < 75 && !disabled;

  const startCorruption = useCallback(() => {
    if (!active) return;
    hoverRef.current = true;
    // Initial delay 800-1200ms, then +10% every 200ms
    const delay = 800 + Math.random() * 400;
    tickRef.current = setTimeout(() => {
      setLevel(10);
      tickRef.current = setInterval(() => {
        setLevel(prev => Math.min(100, prev + 10));
      }, 200);
    }, delay);
  }, [active]);

  const stopCorruption = useCallback(() => {
    hoverRef.current = false;
    if (tickRef.current) { clearTimeout(tickRef.current); clearInterval(tickRef.current); tickRef.current = null; }
    // Decay: -15% every 150ms
    decayRef.current = setInterval(() => {
      setLevel(prev => {
        if (prev <= 0) { clearInterval(decayRef.current); decayRef.current = null; return 0; }
        return prev - 15;
      });
    }, 150);
  }, []);

  useEffect(() => () => {
    if (tickRef.current) { clearTimeout(tickRef.current); clearInterval(tickRef.current); }
    if (decayRef.current) clearInterval(decayRef.current);
  }, []);

  let text = children;
  if (level > 0 && typeof children === 'string' && children.length > 0) {
    // Stage 1 (10-30%): word replacement
    if (level >= 10) {
      let t = children;
      for (const [from, to] of _CORRUPT_PAIRS) { if (t.includes(from)) { t = t.replace(from, to); break; } }
      text = t;
    }
    // Stage 2 (30-60%): some chars become red/corrupted
    // Stage 3 (60%+): chars replaced with abyss glyphs
    if (level >= 30) {
      const chars = (typeof text === 'string' ? text : String(text)).split('');
      const ratio = (level - 30) / 70; // 0 at 30%, 1 at 100%
      const corruptCount = Math.floor(chars.length * ratio * 0.6);
      // Deterministic corruption based on char position
      for (let i = 0; i < corruptCount && i < chars.length; i++) {
        const idx = (i * 7 + 3) % chars.length;
        if (level >= 60) {
          chars[idx] = _CORRUPT_GLYPHS[(idx * 13 + level) % _CORRUPT_GLYPHS.length];
        }
        // CSS class handles the red tint for stage 2
      }
      text = chars.join('');
    }
  }
  const stage = level >= 60 ? 'cc-abyss' : level >= 30 ? 'cc-corrupted' : level >= 10 ? 'cc-early' : level > 0 ? 'cc-hovering' : '';
  const cls = (className||'') + (stage ? ' '+stage : '');
  return <button className={cls} onClick={onClick} onMouseEnter={startCorruption} onMouseLeave={stopCorruption} disabled={disabled}>{text}</button>;
}

// AbyssPopup: randomly appears at low SAN, closable but unsettling
function AbyssPopup({ san, onDismiss }) {
  const MESSAGES = [
    '\u4f60\u786e\u5b9a\u4f60\u5728\u63a7\u5236\u8fd9\u4e2a\u89d2\u8272\u5417\uff1f',
    '\u5b83\u5728\u770b\u7740\u4f60\u8bfb\u8fd9\u6bb5\u6587\u5b57\u3002',
    '\u4f60\u7684\u4e0a\u4e00\u6b21\u5faa\u73af\u4e5f\u8fd9\u4e48\u60f3\u7684\u3002',
    '\u5b58\u6863\u5df2\u88ab\u89c2\u5bdf\u3002',
    '\u522b\u56de\u5934\u3002',
    '\u4f60\u542c\u5230\u4e86\u5417\uff1f\u4e0d\u662f\u949f\u58f0\u3002\u662f\u547c\u5438\u3002',
    '\u7b2c\u4e03\u5c42\u3002\u8fd8\u5728\u5410\u53f8\u3002',
    '\u8fd9\u4e2a\u63d0\u793a\u6846\u4e0d\u5e94\u8be5\u5b58\u5728\u3002',
  ];
  const [visible, setVisible] = useState(false);
  const [msg, setMsg] = useState('');
  const timerRef = useRef(null);

  useEffect(() => {
    // SSOT: abyss popup only at explanation_loss and below (level >= 3, SAN <= 39)
    if (san >= 40 || !visible) { setVisible(false); return; }
    // Random interval: 60-120 seconds
    const schedule = () => {
      const delay = 60000 + Math.random() * 60000;
      timerRef.current = setTimeout(() => {
        setMsg(MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);
        setVisible(true);
        schedule();
      }, delay);
    };
    schedule();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [san < 40]); // SSOT: matches explanation_loss threshold

  if (!visible || !msg) return null;
  return <div className="abyss-popup" role="alert">
    <div className="abyss-popup-text">{msg}</div>
    <button className="abyss-popup-close" onClick={() => { setVisible(false); onDismiss && onDismiss(); }} aria-label="\u5173\u95ed">\u00d7</button>
  </div>;
}

if (typeof document !== 'undefined' && !document.getElementById('spl-css')) {
  const _css = document.createElement('style');
  _css.id = 'spl-css';
  _css.textContent = [
    // Canvas layer — smooth transitions between all tiers
    '.san-pollution-layer{position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9997;mix-blend-mode:multiply;opacity:0;transition:opacity 2s ease,filter 1.5s ease,transform 1.5s ease;transform-origin:center center}',
    '.san-pollution-layer.spl-low{opacity:0.6}',
    '.san-pollution-layer.spl-mid{opacity:0.8}',
    '.san-pollution-layer.spl-hostile{opacity:0.9}',
    '.san-pollution-layer.spl-extreme{opacity:1}',
    // CorruptibleChoice stages
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
    '@keyframes abyssAppear{0%{opacity:0;transform:translateY(20px)}100%{opacity:1;transform:translateY(0)}}',
  ].join('');
  document.head.appendChild(_css);
}