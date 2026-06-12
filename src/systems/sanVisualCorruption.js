// src/systems/sanVisualCorruption.js - Canvas-based SAN visual corruption overlay
// Phase 3: Lightweight canvas overlay for scan lines, color shift, screen tearing.
// Runs at 10fps with 2-second cooldown to avoid performance impact.

let _canvas = null;
let _ctx = null;
let _lastUpdate = 0;
let _active = false;
export const FRAME_INTERVAL = 100; // 10fps
export const COOLDOWN_MS = 2000; // 2s between major effect changes

// Current effect targets (lerped for smooth transitions)
let _curColorR = 0,
  _curColorG = 0,
  _curColorB = 0,
  _curColorA = 0;
let _curScanlineA = 0;
let _curTearChance = 0;

/**
 * Initialize the canvas overlay. Call once at app startup.
 * Creates a fixed-position canvas that sits above the game UI.
 */
export function initSanVisualOverlay() {
  if (_canvas) return;
  _canvas = document.createElement('canvas');
  _canvas.id = 'san-corruption-canvas';
  _canvas.setAttribute('aria-hidden', 'true');
  // Style: fixed, full viewport, pointer-events none, above everything except modals
  _canvas.style.cssText =
    'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9997;mix-blend-mode:multiply;opacity:0;transition:opacity 1.5s ease;';
  document.body.appendChild(_canvas);
  _ctx = _canvas.getContext('2d');
  _resizeCanvas();
  window.addEventListener('resize', _resizeCanvas);
  _active = true;
}

export function _resizeCanvas() {
  if (!_canvas) return;
  // Use device pixel ratio for crisp scan lines
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  _canvas.width = window.innerWidth * dpr;
  _canvas.height = window.innerHeight * dpr;
  _ctx.scale(dpr, dpr);
}

/**
 * Destroy the canvas overlay. Call on cleanup.
 */
export function destroySanVisualOverlay() {
  if (_canvas) {
    _canvas.remove();
    _canvas = null;
    _ctx = null;
  }
  _active = false;
}

/**
 * Update the visual corruption based on current SAN state.
 * Throttled to FRAME_INTERVAL ms. No-op if SAN >= 70.
 *
 * @param {number} san         - current SAN value
 * @param {number} loopCount   - current loop count
 * @param {number} corruption  - safehouse corruption (0-100)
 */
export function updateSanVisualOverlay(san, loopCount, corruption) {
  if (!_active || !_canvas || !_ctx) return;
  if (san >= 70 && corruption < 20) {
    // No corruption needed — fade out canvas
    if (_canvas.style.opacity !== '0') _canvas.style.opacity = '0';
    return;
  }

  const now = performance.now();
  if (now - _lastUpdate < FRAME_INTERVAL) return;
  _lastUpdate = now;

  // Show canvas
  if (_canvas.style.opacity !== '1') _canvas.style.opacity = '1';

  const w = window.innerWidth;
  const h = window.innerHeight;
  _ctx.clearRect(0, 0, w, h);

  // === Tier 1: Color shift (SAN < 70) ===
  const sanFactor = Math.max(0, 70 - san) / 70; // 0..1
  const corrFactor = Math.min(1, corruption / 80);

  // Target color: deep red-purple tint that intensifies with low SAN
  const targetR = Math.floor(40 + sanFactor * 60 + corrFactor * 20);
  const targetG = Math.floor(sanFactor * 5);
  const targetB = Math.floor(20 + sanFactor * 30);
  const targetA = sanFactor * 0.12 + corrFactor * 0.05;

  // Lerp for smooth transitions
  const lerp = 0.08;
  _curColorR += (targetR - _curColorR) * lerp;
  _curColorG += (targetG - _curColorG) * lerp;
  _curColorB += (targetB - _curColorB) * lerp;
  _curColorA += (targetA - _curColorA) * lerp;

  if (_curColorA > 0.005) {
    _ctx.fillStyle =
      'rgba(' +
      Math.floor(_curColorR) +
      ',' +
      Math.floor(_curColorG) +
      ',' +
      Math.floor(_curColorB) +
      ',' +
      _curColorA.toFixed(3) +
      ')';
    _ctx.fillRect(0, 0, w, h);
  }

  // === Tier 2: Scan lines (SAN < 50) ===
  if (san < 50 || corruption >= 40) {
    const targetScanA = Math.min(0.06, ((50 - san) / 50) * 0.04 + corrFactor * 0.02);
    _curScanlineA += (targetScanA - _curScanlineA) * lerp;

    if (_curScanlineA > 0.003) {
      _ctx.strokeStyle = 'rgba(0,0,0,' + _curScanlineA.toFixed(4) + ')';
      _ctx.lineWidth = 0.5;
      const offset = (now * 0.02) % 4;
      for (let y = offset; y < h; y += 3) {
        _ctx.beginPath();
        _ctx.moveTo(0, y);
        _ctx.lineTo(w, y);
        _ctx.stroke();
      }
    }
  }

  // === Tier 3: Screen tearing (SAN < 30) ===
  if (san < 30) {
    const tearChance = ((30 - san) / 30) * 0.08;
    _curTearChance += (tearChance - _curTearChance) * lerp;

    if (Math.random() < _curTearChance) {
      // Random horizontal tear: copy a slice and shift it
      const sliceY = Math.random() * h;
      const sliceH = 1 + Math.random() * 4;
      const shift = (Math.random() - 0.5) * 15;
      try {
        const imgData = _ctx.getImageData(0, Math.floor(sliceY), Math.floor(w), Math.floor(sliceH));
        _ctx.putImageData(imgData, Math.floor(shift), Math.floor(sliceY));
      } catch (e) {
        // getImageData can fail on some browsers; silently ignore
      }
    }
  }

  // === Tier 4: Vignette pulsing (SAN < 20) ===
  if (san < 20) {
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.002);
    const vigA = 0.1 + pulse * 0.15;
    const gradient = _ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.7);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(20,0,10,' + vigA.toFixed(3) + ')');
    _ctx.fillStyle = gradient;
    _ctx.fillRect(0, 0, w, h);
  }
}
