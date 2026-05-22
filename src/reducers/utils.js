// src/reducers/utils.js - Pure utility functions (no React dependency)
// These can be imported by both the reducer and tests.

export const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
export const d100 = () => rand(1, 100);
export const d3 = () => rand(1, 3);
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const pick = arr => arr[rand(0, arr.length - 1)];
export const rollDice = (dice) => {
  const m = dice.match(/(\d+)d(\d+)(?:\+(\d+))?/);
  if (!m) return 0;
  const [n, faces, bonus] = m.slice(1).map(Number);
  let t = bonus || 0;
  for (let i = 0; i < n; i++) t += rand(1, faces);
  return t;
};
export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
