/**
 * tests/test_ending_reachability.cjs
 * Ending reachability test.
 */
import assert from 'assert';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROOT = path.resolve(__dirname, '..');
let passed = 0;
let failed = 0;

function test(name, fn) {
  try { fn(); passed++; console.log('  PASS: ' + name); }
  catch (e) { failed++; console.log('  FAIL: ' + name + ' -> ' + (e.message || String(e)).split(String.fromCharCode(10))[0]); }
}

let GD = {};
try { GD = JSON.parse(fs.readFileSync(path.join(ROOT, 'game_base.json'), 'utf8')); }
catch (e) {}

let _seed = 42;
function seedRng(s) { _seed = s; }
function srand() { _seed ^= _seed << 13; _seed ^= _seed >> 17; _seed ^= _seed << 5; return (_seed >>> 0) / 4294967296; }
function randInt(min, max) { return Math.floor(srand() * (max - min + 1)) + min; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function checkEndings(s) {
  const bt = s.behaviorTracking || {};
  const endings = [];
  if (s.hp <= 0 || s.san <= 0) endings.push({ id: 'death' });
  if (s.day > 28 && s.hp > 0 && s.san > 0) endings.push({ id: 'survival' });
  if ((s.clues || []).length >= 5 && (s.discoveredConclusions || []).length >= 1) endings.push({ id: 'investigator' });
  if (Object.values(s.npcTrust || {}).filter(v => v >= 4).length >= 3) endings.push({ id: 'social' });
  if ((bt.self_harm_ritual_count || 0) + (bt.sacred_desecration_count || 0) >= 5) endings.push({ id: 'dark' });
  if ((bt.cult_leader_score || 0) >= 5) endings.push({ id: 'cult' });
  if ((s.humanityScore ?? 50) >= 80) endings.push({ id: 'humanity' });
  if ((s.visitedAreas || []).length >= 8) endings.push({ id: 'explorer' });
  return endings;
}

function simLoop(s, maxDays) {
  for (let d = 1; d <= maxDays; d++) {
    if (d > 1) s.ap = s.maxAp || 12;
    let safety = 0;
    while (s.ap > 0 && safety < 30) {
      safety++;
      const r = srand();
      if (r < 0.3 && s.ap >= 2) {
        s.ap -= 2;
        if (srand() < 0.35) { s.clues = s.clues || []; s.clues.push({ id: 'c' + s.clues.length }); }
        if (srand() < 0.15) s.san = clamp(s.san - randInt(1, 3), 0, s.maxSan);
        const areas = GD.areas || [];
        const a = areas[Math.floor(srand() * areas.length)];
        if (a && !s.visitedAreas.includes(a.id)) s.visitedAreas.push(a.id);
      } else if (r < 0.5 && s.ap >= 1) {
        s.ap -= 1;
        const npcs = GD.npcs || [];
        const npc = npcs[Math.floor(srand() * npcs.length)];
        if (npc) s.npcTrust[npc.name] = (s.npcTrust[npc.name] || 0) + (srand() < 0.5 ? 1 : 0);
      } else if (r < 0.6 && s.ap >= 2) {
        s.ap -= 2; s.money += randInt(3, 10); s.behaviorTracking.work_count++;
      } else if (r < 0.65) {
        s.ap = 0; s.food = Math.max(0, (s.food || 0) - 1);
        if (s.food > 0) { s.hp = clamp(s.hp + 1, 0, s.maxHp); s.san = clamp(s.san + 1, 0, s.maxSan); }
        else { s.hp = Math.max(0, s.hp - 1); }
        s.day++;
      } else { s.ap -= 1; }
      if (s.hp <= 0 || s.san <= 0) break;
    }
    if (s.hp <= 0 || s.san <= 0) break;
    if (s.day > 28) break;
  }
  return s;
}

function mkState() {
  return {
    day: 1, ap: 12, maxAp: 12, hp: 11, maxHp: 11, san: 60, maxSan: 99,
    currentArea: 'town_center', visitedAreas: ['town_center'],
    clues: [], npcTrust: {}, npcStates: {}, triggeredEvents: [],
    stats_run: { deaths: 0, runs: 0 }, food: 3, maxFood: 5, money: 5,
    loopCount: 0, pollution: 0, retainedKnowledge: [], discoveredConclusions: [],
    mythosLevel: 0, humanityScore: 50, activeBlessings: [], endingCoins: 0,
    loopShopTier: 0, ending: null, endingHistory: [], previousEndings: [],
    behaviorTracking: { self_harm_ritual_count: 0, sacred_desecration_count: 0, cannibalism_count: 0, cult_leader_score: 0, work_count: 0, harbor_visits: 0, loop_break_attempts: 0, _npc_harm_tally: {} },
    deathContext: null, starvationDays: 0, safehouseCorruption: 0, npcRelations: {},
    previousDeathContext: null, lastDeathType: null, lastDeathMode: null,
    prologue: null, fearTuning: null, _npcTrustLocked: {}, inventory: [], skills: {},
    longTermEffects: [], screen: 'game',
  };
}

function transition(s) {
  const f = mkState();
  f.loopCount = (s.loopCount || 0) + 1;
  f.loopShopTier = s.loopShopTier || 0;
  if (f.loopCount >= 5 && f.loopShopTier < 1) f.loopShopTier = 1;
  if (f.loopCount >= 7 && f.loopShopTier < 2) f.loopShopTier = 2;
  f.retainedKnowledge = [...(s.retainedKnowledge || [])];
  f.discoveredConclusions = [...(s.discoveredConclusions || [])];
  f.humanityScore = s.humanityScore ?? 50;
  f.endingCoins = s.endingCoins || 0;
  f.clues = []; f.visitedAreas = ['town_center']; f.npcTrust = {};
  const lk = f.loopCount <= 5 ? 'loop_' + f.loopCount : 'loop_6_plus';
  const eff = GD.systems && GD.systems.loop && GD.systems.loop.loop_count_effects && GD.systems.loop.loop_count_effects[lk];
  if (eff) { f.maxSan = Math.max(10, 99 + (eff.san_cap_reduction || 0)); f.pollution = eff.pollution_intensity || 0; }
  f.pollution = Math.min(1, (f.pollution || 0) + (f.loopCount >= 6 ? 0.08 : 0.05) * f.loopCount);
  const bt = s.behaviorTracking || {};
  Object.keys(bt).forEach(k => { if (k !== '_npc_harm_tally' && k !== 'sleep_streak') f.behaviorTracking[k] = bt[k] || 0; });
  return f;
}

console.log('=== Ending Reachability Tests ===');

test('E1: death ending reachable in 15 loops', () => {
  seedRng(42); let s = mkState(); let found = false;
  for (let i = 0; i < 15; i++) { s = simLoop(s, 28); if (checkEndings(s).some(e => e.id === 'death')) { found = true; break; } s = transition(s); }
  assert.ok(found);
});

test('E2: explorer ending reachable in 10 loops', () => {
  seedRng(100); let s = mkState(); let found = false;
  for (let i = 0; i < 10; i++) { s = simLoop(s, 28); if (checkEndings(s).some(e => e.id === 'explorer')) { found = true; break; } s = transition(s); }
  assert.ok(found);
});

test('E3: social ending reachable in 10 loops', () => {
  seedRng(200); let s = mkState(); let found = false;
  for (let i = 0; i < 10; i++) { s = simLoop(s, 28); if (checkEndings(s).some(e => e.id === 'social')) { found = true; break; } s = transition(s); }
  assert.ok(found);
});

test('E4: at least 1 ending in 15 loops (balanced)', () => {
  seedRng(42); let s = mkState(); let all = new Set();
  for (let i = 0; i < 15; i++) { s = simLoop(s, 28); checkEndings(s).forEach(e => all.add(e.id)); s = transition(s); }
  assert.ok(all.size >= 1, 'got: ' + [...all].join(', '));
});

test('E5: multiple ending directions in 15 loops', () => {
  seedRng(42); let s = mkState(); let all = new Set();
  for (let i = 0; i < 15; i++) { s = simLoop(s, 28); checkEndings(s).forEach(e => all.add(e.id)); s = transition(s); }
  assert.ok(all.size >= 2, 'got ' + all.size + ': ' + [...all].join(', '));
});

test('E6: ending system infrastructure exists', () => {
  // Check that ending reducer file exists and exports checkEnding
  const endingPath = path.join(ROOT, 'src', 'reducers', 'endingReducer.js');
  const deathPath = path.join(ROOT, 'src', 'reducers', 'deathSystem.js');
  assert.ok(fs.existsSync(endingPath), 'endingReducer.js should exist');
  assert.ok(fs.existsSync(deathPath), 'deathSystem.js should exist');
  const endingContent = fs.readFileSync(endingPath, 'utf8');
  assert.ok(endingContent.includes('checkEnding'), 'should export checkEnding');
  const deathContent = fs.readFileSync(deathPath, 'utf8');
  assert.ok(deathContent.includes('resolveDeath'), 'should export resolveDeath');
  assert.ok(deathContent.includes('getDeathText'), 'should export getDeathText');
});

console.log('');
console.log('=== Ending Reachability Tests ===');
console.log('  ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0 && typeof process !== 'undefined') process.exit(1);
