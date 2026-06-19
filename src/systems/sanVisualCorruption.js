// src/systems/sanVisualCorruption.js - SAN visual corruption (surge/flash triggers)
// Actual canvas rendering is handled by <SanPollutionLayer> component.
// This file exports trigger functions that set visual state.

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
