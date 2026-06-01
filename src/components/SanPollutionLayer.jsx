// src/components/SanPollutionLayer.jsx - Unified SAN visual corruption layer
// Three tiers: low(60-40), mid(39-20), extreme(<20)

const { useEffect, useRef, useCallback, useState, memo } = React;

const TIER = { LOW_MAX: 60, MID_MAX: 40, EXT_MAX: 20 };
const FPS_CAP = 15;
const FRAME_MS = 1000 / FPS_CAP;
const LERP = 0.06;

function lerp(a, b, t) { return a + (b - a) * t; }

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

const SanPollutionLayer = memo(function SanPollutionLayer({ san, loopCount, corruption, enabled }) {
  const canvasRef = useRef(null);
  const st = useRef({cR:0,cG:0,cB:0,cA:0,scanA:0,tearP:0,noiseA:0,vigA:0,chromaA:0,barrelS:0,lastT:0,raf:0});

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
      if (san >= TIER.LOW_MAX && corruption < 20) {
        if (canvas.style.opacity !== '0') canvas.style.opacity = '0';
        return;
      }
      if (canvas.style.opacity !== '1') canvas.style.opacity = '1';
      const sanF = Math.max(0, (TIER.LOW_MAX - san) / TIER.LOW_MAX);
      const corF = Math.min(1, corruption / 80);

      // TIER 1: color shift + noise (SAN < 60)
      if (san < TIER.LOW_MAX || corruption >= 20) {
        s.cR = lerp(s.cR, 28 + sanF * 45 + corF * 12, LERP);
        s.cG = lerp(s.cG, sanF * 3, LERP);
        s.cB = lerp(s.cB, 12 + sanF * 22, LERP);
        s.cA = lerp(s.cA, sanF * 0.09 + corF * 0.03, LERP);
        if (s.cA > 0.003) {
          ctx.fillStyle = 'rgba('+(s.cR|0)+','+(s.cG|0)+','+(s.cB|0)+','+s.cA.toFixed(3)+')';
          ctx.fillRect(0, 0, w, h);
        }
        s.noiseA = lerp(s.noiseA, sanF * 0.035 + corF * 0.015, LERP);
        if (s.noiseA > 0.002) {
          ctx.globalAlpha = s.noiseA;
          ctx.drawImage(getNoise(w|0, h|0), 0, 0, w, h);
          ctx.globalAlpha = 1;
        }
      }

      // TIER 2: scan lines + vignette + chromatic aberration (SAN < 40)
      if (san < TIER.MID_MAX || corruption >= 40) {
        s.scanA = lerp(s.scanA, Math.min(0.06, (TIER.MID_MAX - san) / TIER.MID_MAX * 0.04 + corF * 0.015), LERP);
        if (s.scanA > 0.003) {
          ctx.strokeStyle = 'rgba(0,0,0,'+s.scanA.toFixed(4)+')';
          ctx.lineWidth = 0.5;
          const off = (now * 0.012) % 4;
          for (let y = off; y < h; y += 3) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
        }
        s.vigA = lerp(s.vigA, 0.04 + sanF * 0.10 + corF * 0.05, LERP);
        if (s.vigA > 0.01) {
          const g = ctx.createRadialGradient(w/2,h/2,w*0.28, w/2,h/2,w*0.72);
          g.addColorStop(0, 'rgba(0,0,0,0)');
          g.addColorStop(1, 'rgba(12,0,8,'+s.vigA.toFixed(3)+')');
          ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        }
        s.chromaA = lerp(s.chromaA, Math.min(0.055, (TIER.MID_MAX - san) / TIER.MID_MAX * 0.035), LERP);
        if (s.chromaA > 0.005) {
          const cr = ctx.createLinearGradient(0, 0, w * 0.12, 0);
          cr.addColorStop(0, 'rgba(180,20,30,'+s.chromaA.toFixed(3)+')');
          cr.addColorStop(1, 'rgba(180,20,30,0)');
          ctx.fillStyle = cr; ctx.fillRect(0, 0, w * 0.12, h);
          const cb = ctx.createLinearGradient(w * 0.88, 0, w, 0);
          cb.addColorStop(0, 'rgba(30,40,180,0)');
          cb.addColorStop(1, 'rgba(30,40,180,'+s.chromaA.toFixed(3)+')');
          ctx.fillStyle = cb; ctx.fillRect(w * 0.88, 0, w * 0.12, h);
        }
      }

      // TIER 3: screen tears + blur + aggressive vignette (SAN < 20)
      if (san < TIER.EXT_MAX) {
        const ext = (TIER.EXT_MAX - san) / TIER.EXT_MAX;
        s.tearP = lerp(s.tearP, ext * 0.10, LERP);
        if (Math.random() < s.tearP) {
          const sy = Math.random() * h, sh = 1 + Math.random() * 5;
          const sx = (Math.random() - 0.5) * 18 * ext;
          try { const id = ctx.getImageData(0, sy|0, w|0, sh|0); ctx.putImageData(id, sx|0, sy|0); } catch(e) {}
        }
        s.barrelS = lerp(s.barrelS, ext * 0.5, LERP);
        canvas.style.filter = s.barrelS > 0.05 ? 'blur('+s.barrelS.toFixed(1)+'px)' : 'none';
        const pulse = 0.5 + 0.5 * Math.sin(now * 0.0012);
        const pv = 0.10 + pulse * 0.15;
        const pg = ctx.createRadialGradient(w/2,h/2,w*0.12, w/2,h/2,w*0.62);
        pg.addColorStop(0, 'rgba(0,0,0,0)');
        pg.addColorStop(1, 'rgba(22,0,10,'+pv.toFixed(3)+')');
        ctx.fillStyle = pg; ctx.fillRect(0, 0, w, h);
      }
    }
    s.raf = requestAnimationFrame(frame);
    return () => { alive = false; cancelAnimationFrame(s.raf); };
  }, [san, loopCount, corruption, enabled]);

  if (!enabled) return null;
  const tier = san < TIER.EXT_MAX ? 'spl-extreme' : san < TIER.MID_MAX ? 'spl-mid' : san < TIER.LOW_MAX ? 'spl-low' : '';
  return <canvas ref={canvasRef} className={"san-pollution-layer "+tier} aria-hidden="true" />;
});

// CorruptibleChoice: hover delay + text corruption at SAN < 50
const _CORRUPT_MAP = {
  '\u63a2\u7d22':'\u7aa5\u89c6', '\u79fb\u52a8':'\u722c\u884c', '\u4ea4\u8c08':'\u4f4e\u8bed', '\u4f11\u606f':'\u653e\u5f03',
  '\u6df1\u5165':'\u5760\u5165', '\u8c03\u67e5':'\u6316\u6398', '\u79bb\u5f00':'\u9003\u8dd1', '\u89c2\u5bdf':'\u51dd\u89c6',
  '\u76f8\u4fe1':'\u670d\u4ece', '\u8d28\u7591':'\u80cc\u53db', '\u5b89\u5168':'\u6682\u65f6', '\u9009\u62e9':'\u5c48\u670d',
  '\u7ee7\u7eed':'\u56de\u4e0d\u53bb\u4e86', '\u786e\u8ba4':'\u627f\u8ba4',
};

function CorruptibleChoice({ children, san, onClick, className, disabled }) {
  const [hover, setHover] = useState(false);
  const [corrupt, setCorrupt] = useState(false);
  const timer = useRef(null);
  const active = san < 50 && !disabled;
  const enter = () => { if (!active) return; setHover(true); timer.current = setTimeout(() => setCorrupt(true), 800 + Math.random() * 700); };
  const leave = () => { setHover(false); if (timer.current) clearTimeout(timer.current); setCorrupt(false); };
  let text = children;
  if (corrupt && typeof children === 'string') {
    let t = children;
    for (const [from, to] of Object.entries(_CORRUPT_MAP)) { if (t.includes(from)) { t = t.replace(from, to); break; } }
    text = t;
  }
  const cls = (className||'') + (corrupt ? ' choice-corrupted' : hover ? ' choice-hovering' : '');
  return <button className={cls} onClick={onClick} onMouseEnter={enter} onMouseLeave={leave} disabled={disabled}>{text}</button>;
}

if (typeof document !== 'undefined' && !document.getElementById('spl-css')) {
  const _css = document.createElement('style');
  _css.id = 'spl-css';
  _css.textContent = '.san-pollution-layer{position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9997;mix-blend-mode:multiply;opacity:0;transition:opacity 1.5s ease}.san-pollution-layer.spl-low,.san-pollution-layer.spl-mid,.san-pollution-layer.spl-extreme{opacity:1}.choice-corrupted{color:var(--danger2)!important;text-decoration:line-through;opacity:0.85;font-style:italic;animation:corruptFlicker 0.8s ease-in-out infinite}.choice-hovering{transition:opacity 0.3s;opacity:0.88}@keyframes corruptFlicker{0%,100%{opacity:0.85}50%{opacity:0.65}}';
  document.head.appendChild(_css);
}