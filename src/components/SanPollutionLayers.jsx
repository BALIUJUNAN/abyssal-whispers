// src/components/SanPollutionLayers.jsx — SAN visual corruption layers (independent render passes)
// Each layer is self-activating: it subscribes to SAN stage and only draws when its
// visual parameter exceeds the activation threshold. This eliminates unnecessary Canvas
// draw calls for effects that are invisible at the current SAN level.
//
// Architecture:
//   SanPollutionLayer (parent) — owns canvas, shared rAF loop
//     ├── SanColorShiftLayer     — full-screen color tint (saturation)
//     ├── SanNoiseLayer          — grain/noise overlay (skip at perf tier ≥ 1)
//     ├── SanScanlineLayer       — horizontal scan lines
//     ├── SanVignetteLayer       — radial darkening at edges
//     ├── SanChromaticLayer      — left/right edge color fringing
//     └── SanDistortionLayer     — CSS filter blur + rotation + breath pulse
//
// Each layer receives { visual, intensity, surge, perfTier, now, ctx, w, h }
// and returns true/false (drawn this frame). The parent skips ctx operations
// for layers that return false.

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { getVisualForSan } from '../systems/sanityVisual.js';
import { tickVisualCorruption, getSurgeMultiplier, getFlashAlpha } from '../systems/sanVisualCorruption.js';
import { GD } from '../state/gameData.js';

// ── Performance tier constants ──

export const FPS_CAP_DEFAULT = 15;
export const FPS_CAP_DEGRADED = 12;
export const FPS_CAP_LOW = 8;

// Module-level perf state (shared across all layer instances)
let _currentFpsCap = FPS_CAP_DEFAULT;
let FRAME_MS = 1000 / _currentFpsCap;
let _perfTier = 0; // 0=normal, 1=degraded, 2=critical

export function getPerfTier() { return _perfTier; }
export function getFrameMs() { return FRAME_MS; }

const LERP = 0.06;
export function lerp(a, b, t) { return a + (b - a) * t; }

// ── Noise canvas (cached by dimensions) ──

let _noise = null;
export function getNoise(w, h) {
  if (_noise && _noise.width === w && _noise.height === h) return _noise;
  _noise = document.createElement('canvas');
  _noise.width = w;
  _noise.height = h;
  const nc = _noise.getContext('2d');
  const id = nc.createImageData(w, h);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.random() * 255;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 18;
  }
  nc.putImageData(id, 0, 0);
  return _noise;
}

export function clearNoiseCache() {
  _noise = null;
}

// ── Layer definitions ──
// Each layer is a plain function { name, render(ctx, params) => boolean }
// that draws one type of effect. Returns true if it drew anything.

/**
 * Color shift overlay — full-screen tint based on SAN saturation parameter.
 * Activates when sat > 0.03 (SAN ≤ 60, mild_erosion+)
 */
export function renderColorShiftLayer(ctx, p) {
  const colorI = Math.max(0, -p.visual.sat / 60) * p.intensity;
  const state = p.state;
  state.cR = lerp(state.cR, 20 + colorI * 50, LERP);
  state.cG = lerp(state.cG, colorI * 2, LERP);
  state.cB = lerp(state.cB, 8 + colorI * 25, LERP);
  state.cA = lerp(state.cA, colorI * 0.08 + p.corruptionFactor * 0.03, LERP);
  if (state.cA > 0.003) {
    ctx.fillStyle =
      'rgba(' +
      (state.cR | 0) +
      ',' +
      (state.cG | 0) +
      ',' +
      (state.cB | 0) +
      ',' +
      state.cA.toFixed(3) +
      ')';
    ctx.fillRect(0, 0, p.w, p.h);
    return true;
  }
  return false;
}

export function shouldActivateColorShift(visual, intensity) {
  const target = Math.max(0, -visual.sat / 60) * intensity;
  return target > 0.003;
}

/**
 * Noise grain overlay — cached noise canvas drawn with globalAlpha.
 * Skipped at perf tier ≥ 1 (expensive drawImage).
 * Activates when noise > 0.02
 */
export function renderNoiseLayer(ctx, p) {
  if (p.perfTier >= 1) return false;
  const state = p.state;
  const targetNoise = (p.visual.noise * p.intensity + p.corruptionFactor * 0.02) *
    (1 + 0.3 * Math.sin(p.now * 0.002));
  state.noiseA = lerp(state.noiseA, targetNoise, LERP);
  if (state.noiseA > 0.003) {
    ctx.globalAlpha = state.noiseA;
    ctx.drawImage(getNoise(p.w | 0, p.h | 0), 0, 0, p.w, p.h);
    ctx.globalAlpha = 1;
    return true;
  }
  return false;
}

export function shouldActivateNoise(visual, intensity, perfTier) {
  if (perfTier >= 1) return false;
  const target = (visual.noise * intensity) > 0.02;
  return target;
}

/**
 * Scanline overlay — horizontal lines at 2.5px spacing, drifting downward.
 * Pure Canvas strokes, cheap to render.
 * Activates when scan > 0.03
 */
export function renderScanlineLayer(ctx, p) {
  const state = p.state;
  const targetScan = p.visual.scan * 0.12 * p.intensity;
  state.scanA = lerp(state.scanA, targetScan, LERP);
  if (state.scanA > 0.003) {
    ctx.strokeStyle = 'rgba(0,0,0,' + state.scanA.toFixed(4) + ')';
    ctx.lineWidth = 0.8;
    const off = (p.now * 0.015) % 4;
    for (let y = off; y < p.h; y += 2.5) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(p.w, y);
      ctx.stroke();
    }
    return true;
  }
  return false;
}

export function shouldActivateScanline(visual, intensity) {
  return visual.scan * 0.12 * intensity > 0.003;
}

/**
 * Vignette overlay — radial gradient darkening at screen edges.
 * Uses createRadialGradient (moderate cost).
 * Activates when vig > 0.02
 */
export function renderVignetteLayer(ctx, p) {
  const state = p.state;
  const targetVig = p.visual.vig * p.intensity * (1 + 0.3 * Math.sin(p.now * 0.001));
  state.vigA = lerp(state.vigA, targetVig + p.corruptionFactor * 0.05, LERP);
  if (state.vigA > 0.01) {
    const vigR = p.visual.level >= 4 ? 0.1 : 0.25;
    const g = ctx.createRadialGradient(
      p.w / 2, p.h / 2, p.w * vigR,
      p.w / 2, p.h / 2, p.w * 0.68
    );
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(12,0,8,' + state.vigA.toFixed(3) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, p.w, p.h);
    return true;
  }
  return false;
}

export function shouldActivateVignette(visual, intensity) {
  return visual.vig * intensity > 0.02;
}

/**
 * Chromatic aberration — left/right edge color fringing.
 * Two linear gradients (red left, blue right).
 * Activates when chroma > 0.05
 */
export function renderChromaticLayer(ctx, p) {
  const state = p.state;
  const targetChroma = p.visual.chroma * 0.015 * p.intensity;
  state.chromaA = lerp(state.chromaA, targetChroma, LERP);
  if (state.chromaA > 0.005) {
    const edgeW = Math.min(0.2, 0.08 + p.visual.chroma * 0.02) * p.w;
    // Red fringe (left)
    const cr = ctx.createLinearGradient(0, 0, edgeW, 0);
    cr.addColorStop(0, 'rgba(180,20,30,' + state.chromaA.toFixed(3) + ')');
    cr.addColorStop(1, 'rgba(180,20,30,0)');
    ctx.fillStyle = cr;
    ctx.fillRect(0, 0, edgeW, p.h);
    // Blue fringe (right)
    const cb = ctx.createLinearGradient(p.w - edgeW, 0, p.w, 0);
    cb.addColorStop(0, 'rgba(30,40,180,0)');
    cb.addColorStop(1, 'rgba(30,40,180,' + state.chromaA.toFixed(3) + ')');
    ctx.fillStyle = cb;
    ctx.fillRect(p.w - edgeW, 0, edgeW, p.h);
    return true;
  }
  return false;
}

export function shouldActivateChromatic(visual, intensity) {
  return visual.chroma * 0.015 * intensity > 0.005;
}

/**
 * Distortion layer — CSS filter (blur + breath pulse + rotation).
 * This is NOT a Canvas draw — it sets canvas.style.filter and canvas.style.transform.
 * Skipped at perf tier ≥ 1.
 */
export function renderDistortionLayer(canvas, p) {
  if (p.perfTier >= 1) {
    canvas.style.filter = 'none';
    canvas.style.transform = 'none';
    return false;
  }
  const state = p.state;
  state.barrelS = lerp(state.barrelS, p.visual.barrel * p.intensity, LERP);
  state.rotA = lerp(state.rotA, p.visual.rot * p.intensity, LERP);
  const breathPulse = 1 + 0.004 * Math.sin(p.now * 0.0008) * (p.visual.level >= 3 ? 1 : 0);
  const blurAmt = state.barrelS > 0.02 ? state.barrelS * 8 : 0;
  const rotDeg = state.rotA * Math.sin(p.now * 0.0003) * 0.5;
  canvas.style.filter = blurAmt > 0.02 ? 'blur(' + blurAmt.toFixed(1) + 'px) ' : '';
  canvas.style.transform =
    'scale(' + breathPulse.toFixed(4) + ') rotate(' + rotDeg.toFixed(2) + 'deg)';
  return true;
}

export function shouldActivateDistortion(visual, intensity, perfTier) {
  if (perfTier >= 1) return false;
  return visual.barrel * intensity > 0.02 || visual.rot * intensity > 0.005;
}

// ── Layer activation map ──
// Maps SAN level ranges to which layers are relevant.
// This allows the parent to skip layer evaluation entirely for inactive layers.

const LAYER_ACTIVATION_BY_LEVEL = {
  0: [], // stable — no layers
  1: ['colorShift', 'scanline', 'vignette'], // mild_erosion
  2: ['colorShift', 'scanline', 'vignette', 'chromatic'], // perception_shift
  3: ['colorShift', 'noise', 'scanline', 'vignette', 'chromatic', 'distortion'], // explanation_loss
  4: ['colorShift', 'noise', 'scanline', 'vignette', 'chromatic', 'distortion'], // cognitive_fog
  5: ['colorShift', 'noise', 'scanline', 'vignette', 'chromatic', 'distortion'], // reality_dissolution
  6: ['colorShift', 'noise', 'scanline', 'vignette', 'chromatic', 'distortion'], // narrative_death
};

function getActiveLayerNames(level) {
  return LAYER_ACTIVATION_BY_LEVEL[level] || LAYER_ACTIVATION_BY_LEVEL[Math.min(level, 6)] || [];
}

// ── Perf tier auto-degradation ──

export function updatePerfTier(avgFps) {
  if (avgFps < 10) {
    if (_perfTier !== 2) {
      _perfTier = 2;
      _currentFpsCap = FPS_CAP_LOW;
      FRAME_MS = 1000 / _currentFpsCap;
    }
  } else if (avgFps < 20) {
    if (_perfTier !== 1) {
      _perfTier = 1;
      _currentFpsCap = FPS_CAP_DEGRADED;
      FRAME_MS = 1000 / _currentFpsCap;
    }
  } else {
    if (_perfTier !== 0) {
      _perfTier = 0;
      _currentFpsCap = FPS_CAP_DEFAULT;
      FRAME_MS = 1000 / _currentFpsCap;
    }
  }
}

// ── Parent component: owns canvas + shared rAF loop ──

export var SanPollutionLayer = memo(function SanPollutionLayer(props) {
  const san = props.san;
  const loopCount = props.loopCount;
  const corruption = props.corruption;
  const glitchPulse = props.glitchPulse || 0;
  const enabled = props.enabled;
  const intensity = props.intensity;

  const canvasRef = useRef(null);
  const isPausedRef = useRef(false); // pause-when-idle: true when rAF is cancelled

  // Cache getVisualForSan result
  const cachedSan = useRef(san);
  const cachedVisual = useRef(null);
  const getCachedVisual = useCallback(function (currentSan) {
    if (currentSan !== cachedSan.current || !cachedVisual.current) {
      cachedSan.current = currentSan;
      cachedVisual.current = getVisualForSan(currentSan, { GD: GD });
    }
    return cachedVisual.current;
  }, []);

  // Shared animation state (all layers read/write this)
  const st = useRef({
    cR: 0, cG: 0, cB: 0, cA: 0,
    scanA: 0, noiseA: 0, vigA: 0, chromaA: 0,
    barrelS: 0, rotA: 0,
    lastT: 0, raf: 0,
  });

  const I = Math.max(0, Math.min(100, intensity != null ? intensity : 50)) / 100;

  // prefers-reduced-motion
  const prmState = useState(function () {
    return typeof window !== 'undefined' &&
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  const reducedMotion = prmState[0];

  // FPS monitor
  const fpsMon = useRef({ frames: 0, lastCheck: 0, avgFps: 60 });

  // Resize handler
  const resize = useCallback(function () {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = window.innerWidth * dpr;
    c.height = window.innerHeight * dpr;
    c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    clearNoiseCache(); // noise canvas size changed
  }, []);

  useEffect(function () {
    resize();
    window.addEventListener('resize', resize);
    return function () {
      window.removeEventListener('resize', resize);
    };
  }, [resize]);

  // Pause-when-idle: cancel rAF when canvas is invisible to save CPU.
  // The loop restarts automatically when any prop changes (useEffect deps).

  // Main animation loop — delegates to independent layers
  useEffect(function () {
    isPausedRef.current = false; // reset pause state on prop change
    const canvas = canvasRef.current;
    if (!canvas || !enabled || reducedMotion) return;
    const ctx = canvas.getContext('2d');
    const s = st.current;
    const alive = { current: true };
    var idleFrames = 0;
    const IDLE_THRESHOLD = 90; // ~6s at 15fps cap

    function frame(now) {
      if (!alive.current) return;
      s.raf = requestAnimationFrame(frame);

      // FPS cap
      if (now - s.lastT < FRAME_MS) return;
      s.lastT = now;

      // FPS monitoring
      const fm = fpsMon.current;
      fm.frames++;
      if (now - fm.lastCheck > 3000) {
        fm.avgFps = Math.round((fm.frames * 1000) / (now - fm.lastCheck));
        fm.frames = 0;
        fm.lastCheck = now;
        updatePerfTier(fm.avgFps);
      }

      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      tickVisualCorruption(now);
      const surge = getSurgeMultiplier();
      const V = getCachedVisual(san);
      const corF = Math.min(1, (corruption || 0) / 80) * I * surge;
      const totalI = Math.abs(V.sat) + V.vig + V.scan + V.noise + V.barrel + V.chroma + V.rot;

      // Pause-when-idle: skip frames when canvas would be invisible
      if (totalI < 0.5 && corF < 0.01 && glitchPulse <= 0) {
        idleFrames++;
        if (canvas.style.opacity !== '0') canvas.style.opacity = '0';
        canvas.style.filter = 'none';
        // Cancel rAF after N consecutive idle frames to save CPU
        if (idleFrames >= IDLE_THRESHOLD && !isPausedRef.current) {
          isPausedRef.current = true;
          cancelAnimationFrame(s.raf);
          return;
        }
        return;
      }
      // Reset idle counter and resume if was paused
      idleFrames = 0;
      if (isPausedRef.current) {
        isPausedRef.current = false;
      }
      if (canvas.style.opacity !== '1') canvas.style.opacity = '1';

      // Determine which layers are relevant for this SAN level
      const activeLayers = getActiveLayerNames(V.level);
      const layerParams = {
        visual: V, intensity: I, corruptionFactor: corF,
        perfTier: _perfTier, now, ctx, w, h,
        state: s, glitchPulse, canvas,
      };

      // Render only active layers (skip evaluation for inactive ones)
      if (activeLayers.includes('colorShift')) renderColorShiftLayer(ctx, layerParams);
      if (activeLayers.includes('noise')) renderNoiseLayer(ctx, layerParams);
      if (activeLayers.includes('scanline')) renderScanlineLayer(ctx, layerParams);
      if (activeLayers.includes('vignette')) renderVignetteLayer(ctx, layerParams);
      if (activeLayers.includes('chromatic')) renderChromaticLayer(ctx, layerParams);
      if (activeLayers.includes('distortion')) renderDistortionLayer(canvas, layerParams);

      // Glitch pulse overlay (early hooks / thirteenth bell)
      if (glitchPulse > 0) {
        const gpI = glitchPulse / 10;
        const gpBlur = 1 + gpI * 4;
        const gpHue = Math.sin(now * 0.01) * 15 * gpI;
        const gpSat = 1 + gpI * 0.6;
        canvas.style.filter +=
          'blur(' + gpBlur.toFixed(1) + 'px) hue-rotate(' +
          gpHue.toFixed(0) + 'deg) saturate(' + gpSat.toFixed(2) + ')';
        canvas.style.opacity = '1';
        ctx.fillStyle = 'rgba(120, 10, 30, ' + (gpI * 0.12).toFixed(3) + ')';
        ctx.fillRect(0, 0, w, h);
        // Horizontal tear lines
        for (let gt = 0; gt < 3 * gpI; gt++) {
          const gtY = Math.random() * h;
          const gtH = 1 + Math.random() * 3 * gpI;
          const gtShift = (Math.random() - 0.5) * 30 * gpI;
          try {
            const gtData = ctx.getImageData(0, gtY | 0, w | 0, gtH | 0);
            ctx.putImageData(gtData, gtShift | 0, gtY | 0);
          } catch (e) { /* cross-origin safety */ }
        }
      }

      // SAN-loss flash overlay
      const fa = getFlashAlpha();
      if (fa > 0.003) {
        ctx.fillStyle = 'rgba(160, 10, 20, ' + fa.toFixed(3) + ')';
        ctx.fillRect(0, 0, w, h);
      }

      // Screen tears (level ≥ 4, skip at tier 2)
      if (V.level >= 4 && _perfTier < 2) {
        const tearProb = (V.level >= 5 ? 0.18 : 0.06) * I;
        s.tearP = lerp(s.tearP, tearProb, LERP);
        if (Math.random() < s.tearP) {
          const sy = Math.random() * h;
          const sh = 1 + Math.random() * 8;
          const sx = (Math.random() - 0.5) * 20 * I;
          try {
            const id = ctx.getImageData(0, sy | 0, w | 0, sh | 0);
            ctx.putImageData(id, sx | 0, sy | 0);
          } catch (e) { /* cross-origin safety */ }
        }
      }
    }

    s.raf = requestAnimationFrame(frame);
    return function () {
      alive.current = false;
      cancelAnimationFrame(s.raf);
      // Reset canvas visibility for next mount
      if (canvas) {
        canvas.style.opacity = '';
        canvas.style.filter = '';
      }
    };
  }, [san, loopCount, corruption, enabled, I, reducedMotion, glitchPulse, getCachedVisual]);

  if (!enabled || reducedMotion) return null;
  const V = getCachedVisual(san);
  const tier =
    V.level >= 6
      ? 'spl-extreme'
      : V.level >= 4
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
