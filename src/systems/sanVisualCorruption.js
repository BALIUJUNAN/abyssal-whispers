// src/systems/sanVisualCorruption.js - SAN visual corruption (surge/flash triggers)
// Actual canvas rendering is handled by <SanPollutionLayer> component.
// This file exports trigger functions that set visual state.
//
// State is module-level (write from reducer, read from rAF loop).
// resetVisualCorruption() MUST be called on NEW_GAME to prevent carry-over.

// Day-critical surge state
let _surgeMultiplier = 1.0;
let _surgeDecayTimer = 0;
const SURGE_DECAY_MS = 300000;
const SURGE_PEAK_MULTIPLIER = 1.8;
const SURGE_FINAL_MULTIPLIER = 2.2;

// SAN-loss flash state
let _flashAlpha = 0;
const FLASH_DECAY = 0.04;

/**
 * Reset all visual corruption state. Call on NEW_GAME to prevent
 * carry-over from the previous run's surge/flash.
 */
export function resetVisualCorruption() {
  _surgeMultiplier = 1.0;
  _surgeDecayTimer = 0;
  _flashAlpha = 0;
}

/**
 * Decay internal state. Call from the animation loop each frame.
 * @param {number} now - current timestamp (performance.now())
 */
export function tickVisualCorruption(now) {
  if (_surgeDecayTimer > 0 && now - _surgeDecayTimer > SURGE_DECAY_MS) {
    var elapsed = now - _surgeDecayTimer;
    var t = Math.min(1, elapsed / SURGE_DECAY_MS);
    _surgeMultiplier = 1.0 + (SURGE_FINAL_MULTIPLIER - 1.0) * (1 - t) * (1 - t);
    if (t >= 1) _surgeDecayTimer = 0;
  }
  if (_flashAlpha > 0) {
    _flashAlpha = Math.max(0, _flashAlpha - FLASH_DECAY);
  }
}

/** @returns {number} current surge multiplier (1.0 = baseline) */
export function getSurgeMultiplier() { return _surgeMultiplier; }

/** @returns {number} current flash alpha (0 = none) */
export function getFlashAlpha() { return _flashAlpha; }

/**
 * Trigger a visual "surge" on critical days (7/14/21/28).
 * The trigger sets internal state consumed by SanPollutionLayer.
 */
export function triggerDayCriticalSurge(day, san) {
  if (day === 28) _surgeMultiplier = SURGE_FINAL_MULTIPLIER;
  else if (day === 7 || day === 14 || day === 21) _surgeMultiplier = SURGE_PEAK_MULTIPLIER;
  else _surgeMultiplier = 1.3;
  _surgeDecayTimer = performance.now();
  if (san < 30) _surgeMultiplier *= 1.2;
  if (san < 15) _surgeMultiplier *= 1.15;
}

/**
 * Trigger a brief screen flash when the player loses SAN.
 */
export function triggerSanLossFlash(sanLoss) {
  var intensity = Math.min(1, Math.max(0.15, sanLoss / 8));
  _flashAlpha = Math.max(_flashAlpha, intensity * 0.6);
}
