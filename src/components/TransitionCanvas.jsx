// src/components/TransitionCanvas.jsx - Canvas procedural transition effects
const { useRef, useEffect, useImperativeHandle, forwardRef } = React;

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function buildNoiseField(w, h, seed) {
  var size = w * h; var field = new Float32Array(size);
  var rng = mulberry32(seed);
  for (var i = 0; i < size; i++) field[i] = rng();
  return field;
}
function smoothstep(edge0, edge1, x) {
  var t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function noise2d(x, y, seed) {
  var n = Math.sin(x * 127.1 + y * 311.7 + seed) * 43758.5453;
  return n - Math.floor(n);
}
function fbm(x, y, seed) {
  return noise2d(x, y, seed) * 0.6 + noise2d(x * 2, y * 2, seed + 100) * 0.4;
}
// --- Noise Wipe: procedural Perlin-like dissolve ---
function renderNoiseWipe(ctx, w, h, p, seed, noise) {
  var threshold = easeInOutCubic(p);
  var edge = 0.15;
  var imgData = ctx.createImageData(w, h);
  var data = imgData.data;
  var scaleX = 32 / w, scaleY = 32 / h;
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var nVal = fbm(x * scaleX, y * scaleY, seed);
      var centered = nVal + noise[y * w + x] * 0.3;
      var alpha = smoothstep(threshold - edge, threshold + edge, centered);
      var idx = (y * w + x) * 4;
      data[idx] = 10; data[idx+1] = 10; data[idx+2] = 18;
      data[idx+3] = alpha * 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

// --- Ink Bleed: organic tendrils spreading from center ---
function renderInkBleed(ctx, w, h, p, seed) {
  ctx.clearRect(0, 0, w, h);
  var cx = w * 0.5, cy = h * 0.5;
  var maxR = Math.sqrt(w * w + h * h) * 0.5;
  for (var b = 0; b < 12; b++) {
    var angle = (b / 12) * Math.PI * 2 + seed * 0.1;
    var dist = maxR * p * (0.8 + 0.4 * noise2d(b, seed, 42));
    var bx = cx + Math.cos(angle) * dist;
    var by = cy + Math.sin(angle) * dist;
    var radius = maxR * p * (0.6 + 0.6 * noise2d(b + 100, seed, 42));
    var grad = ctx.createRadialGradient(bx, by, 0, bx, by, radius);
    grad.addColorStop(0, "rgba(8, 8, 15, " + (p) + ")");
    grad.addColorStop(0.6, "rgba(15, 10, 25, " + (0.8 * p) + ")");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(bx, by, radius, 0, Math.PI * 2); ctx.fill();
  }
  // 全屏覆盖层，确保完全遮挡
  var cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * p);
  cg.addColorStop(0, "rgba(8, 8, 15, " + (p * 0.9) + ")");
  cg.addColorStop(0.7, "rgba(8, 8, 15, " + (p * 0.8) + ")");
  cg.addColorStop(1, "rgba(8, 8, 15, " + (p * 0.6) + ")");
  ctx.fillStyle = cg; ctx.fillRect(0, 0, w, h);
}
// --- Void Circle: expanding darkness ring with chromatic aberration ---
function renderVoidCircle(ctx, w, h, p, seed) {
  ctx.clearRect(0, 0, w, h);
  var cx = w * 0.5, cy = h * 0.5;
  var maxR = Math.sqrt(w * w + h * h) * 0.55;
  var curR = maxR * easeInOutCubic(p);
  ctx.fillStyle = "#060610"; ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "destination-out";
  for (var s = 0; s < 3; s++) {
    var sx = cx + Math.sin(seed + s * 2.1) * curR * 0.15;
    var sy = cy + Math.cos(seed + s * 1.7) * curR * 0.15;
    var sr = curR * (1 + Math.sin(seed + s) * 0.1);
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = "rgba(106, 74, 138, " + (p * 0.4) + ")";
  ctx.lineWidth = 2;
  for (var r = 0; r < 3; r++) {
    ctx.beginPath();
    ctx.arc(cx, cy, curR * (1 + r * 0.08), 0, Math.PI * 2);
    ctx.stroke();
  }
  if (p > 0.3) {
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = "rgba(74, 138, 138, " + (p * 0.12) + ")";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
  }
}

// --- Glitch Slices: horizontal scan-line distortion ---
function renderGlitchSlices(ctx, w, h, p, seed, noise) {
  ctx.clearRect(0, 0, w, h);
  var nSlices = 16, sliceH = h / nSlices;
  var intensity = Math.sin(p * Math.PI);
  ctx.fillStyle = "rgba(10, 10, 16, " + (p * 0.85) + ")";
  ctx.fillRect(0, 0, w, h);
  for (var s = 0; s < nSlices; s++) {
    var n = noise[s * 37 % noise.length];
    var ox = (n - 0.5) * w * 0.3 * intensity;
    var y = s * sliceH;
    var cr = n > 0.6 ? 120 : 10;
    var cg2 = n > 0.7 ? 60 : 10;
    var cb = n > 0.5 ? 140 : 18;
    ctx.fillStyle = "rgba(" + cr + "," + cg2 + "," + cb + "," + (intensity * 0.4) + ")";
    ctx.fillRect(ox, y, w, sliceH * (0.3 + n * 0.7));
  }
  if (intensity > 0.5) {
    ctx.fillStyle = "rgba(116, 52, 52, " + ((intensity - 0.5) * 0.3) + ")";
    ctx.fillRect(0, 0, w, h);
  }
}
// --- TransitionCanvas Component ---
export var TransitionCanvas = forwardRef(function TransitionCanvasComp(props, ref) {
  var canvasRef = useRef(null);
  var animRef = useRef(null);
  var activeRef = useRef(false);
  var _onComplete = useRef(null);

  useImperativeHandle(ref, function () {
    return {
      play: function (effectType, duration, onComplete) {
        var canvas = canvasRef.current;
        if (!canvas) { if (onComplete) onComplete(); return; }
        if (animRef.current) cancelAnimationFrame(animRef.current);
        var dpr = window.devicePixelRatio || 1;
        var vw = window.innerWidth, vh = window.innerHeight;
        canvas.width = vw * dpr; canvas.height = vh * dpr;
        canvas.style.width = vw + "px"; canvas.style.height = vh + "px";
        var ctx = canvas.getContext("2d");
        ctx.scale(dpr, dpr);
        var seed = (Date.now() * 0.001) | 0;
        var noise = buildNoiseField(vw, vh, seed);
        var dur = duration || 500;
        var startTime = 0;
        activeRef.current = true;
        _onComplete.current = onComplete || null;
        var effectFn =
          effectType === "inkBleed" ? renderInkBleed :
          effectType === "voidCircle" ? renderVoidCircle :
          effectType === "glitchSlices" ? renderGlitchSlices :
          renderNoiseWipe;
        canvas.style.opacity = "1";
        canvas.style.display = "block";
        function tick(ts) {
          if (!startTime) startTime = ts;
          var p = Math.min((ts - startTime) / dur, 1);
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, vw, vh);
          effectFn(ctx, vw, vh, p, seed, noise);
          if (p < 1) {
            animRef.current = requestAnimationFrame(tick);
          } else {
            canvas.style.transition = "opacity 0.15s ease-out";
            canvas.style.opacity = "0";
            setTimeout(function () {
              canvas.style.display = "none";
              canvas.style.transition = "";
              activeRef.current = false;
              if (_onComplete.current) _onComplete.current();
            }, 160);
          }
        }
        animRef.current = requestAnimationFrame(tick);
      },
      isActive: function () { return activeRef.current; },
    };
  });

  useEffect(function () {
    return function () {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  return React.createElement("canvas", {
    ref: canvasRef,
    style: {
      position: "fixed", inset: "0", zIndex: 9990,
      pointerEvents: "none", display: "none", opacity: 0,
    },
  });
});
