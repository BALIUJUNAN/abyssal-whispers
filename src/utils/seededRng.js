// src/utils/seededRng.js — Deterministic seeded RNG for reproducible gameplay
//
// Uses mulberry32 PRNG (period 2^32, adequate for game use).
// Each RNG instance produces a fixed sequence given the same seed.
//
// Usage:
//   const rng = createSeededRng('my_run_seed', 42);
//   rng.next();           // 0.7291... (deterministic)
//   rng.intBetween(1, 6); // 4
//   rng.pick([a, b, c]);  // b
//   rng.pickWeighted(items, i => i.weight); // weighted selection
//
// Architecture:
//   - runSeed: generated once per NEW_GAME, persisted in state
//   - _actionIndex: incremented on each dispatch, not persisted
//   - rng = createSeededRng(state.runSeed, action.meta.actionIndex)
//   - All story-affecting randomness goes through rng
//   - UI-only randomness (canvas noise, visual jitter) stays on Math.random

/**
 * Create a seeded RNG from a string seed and numeric salt.
 * The same (seed, salt) pair always produces the same sequence.
 *
 * @param {string} seed - run-level seed (e.g., 'run_abc123')
 * @param {number} salt - action-level salt (e.g., action index)
 * @returns {{ next: Function, intBetween: Function, pick: Function, pickWeighted: Function, shuffle: Function }}
 */
export function createSeededRng(seed, salt) {
  // Hash seed string + salt into a 32-bit integer
  var h = 0;
  var s = String(seed || 'default') + '_' + String(salt || 0);
  for (var i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  // mulberry32 state
  var state = h >>> 0;
  if (state === 0) state = 1; // avoid zero state

  function next() {
    state = (state + 0x6d2b79f5) | 0;
    var t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function intBetween(min, max) {
    return Math.floor(next() * (max - min + 1)) + min;
  }

  function pick(arr) {
    if (!arr || arr.length === 0) return undefined;
    return arr[intBetween(0, arr.length - 1)];
  }

  function pickWeighted(items, getWeight) {
    if (!items || items.length === 0) return null;
    var total = 0;
    for (var i = 0; i < items.length; i++) {
      total += Math.max(0, getWeight(items[i]) || 0);
    }
    if (total <= 0) return items[0];
    var roll = next() * total;
    for (var j = 0; j < items.length; j++) {
      roll -= Math.max(0, getWeight(items[j]) || 0);
      if (roll <= 0) return items[j];
    }
    return items[items.length - 1];
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = intBetween(0, i);
      var tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  return { next: next, intBetween: intBetween, pick: pick, pickWeighted: pickWeighted, shuffle: shuffle };
}

/**
 * Generate a run-level seed string.
 * Called once per NEW_GAME.
 */
export function generateRunSeed() {
  return 'run_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}
