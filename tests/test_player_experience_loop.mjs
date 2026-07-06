/**
 * tests/test_player_experience_loop.mjs
 * Full player experience chain integration test.
 * Run: node tests/test_player_experience_loop.mjs
 */
import assert from 'assert';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

import fs from 'fs';
import { buildDeathSummary } from '../src/systems/deathSummary.js';
import { computeReincarnationDiff } from '../src/systems/reincarnationDiff.js';
import { getGuideStep } from '../src/systems/firstRunGuide.js';
import { computeNpcFeedback, getTrustTierInfo } from '../src/systems/npcFeedback.js';
import { getSanLossPresentation, getSanStageFeedback } from '../src/systems/sanFeedback.js';
import { getTrackedText, createSeenTextMap } from '../src/systems/textVariants.js';
import { adjustSanLossForLoop23, shouldBlockLethalEvent } from '../src/systems/firstLoopBalance.js';
import { DEFAULT_SETTINGS } from '../src/reducers/miscReducer.js';

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  PASS: ' + name); }
  catch (e) { failed++; console.log('  FAIL: ' + name + ' -> ' + (e.message || String(e)).split('\n')[0]); }
}

let GD = {};
try { GD = JSON.parse(fs.readFileSync(path.join(ROOT, 'game_base.json'), 'utf8')); } catch (e) {}
const ctx = { GD };

function mkState(overrides) {
  return Object.assign({
    screen: 'game', day: 1, ap: 12, maxAp: 12, hp: 11, maxHp: 11,
    san: 60, maxSan: 99, currentArea: 'town_center', visitedAreas: ['town_center'],
    clues: [], npcTrust: {}, npcStates: {}, triggeredEvents: [],
    stats_run: { deaths: 0, runs: 0, max_san_loss_single: 0, total_san_loss: 0 },
    food: 3, maxFood: 5, money: 5, loopCount: 0, pollution: 0,
    retainedKnowledge: [], discoveredConclusions: [], mythosLevel: 0, humanityScore: 50,
    activeBlessings: [], endingCoins: 0, loopShopTier: 0,
    behaviorTracking: { self_harm_ritual_count: 0, sacred_desecration_count: 0, cannibalism_count: 0, cult_leader_score: 0, work_count: 0, harbor_visits: 0, loop_break_attempts: 0, _npc_harm_tally: {} },
    ending: null, endingHistory: [], previousEndings: [], npcRelations: {},
    deathContext: null, starvationDays: 0, safehouseCorruption: 0, seenEventTexts: {},
    longTermEffects: [], inventory: [], skills: {},
  }, overrides);
}

console.log('=== Player Experience Loop Integration Tests ===');

// ── Phase 1: New game ──
console.log('--- Phase 1: New Game ---');

test('P1-1: fresh state gets welcome guide (narrative, not tutorial)', () => {
  const s = mkState();
  const guide = getGuideStep(s, ctx);
  assert.ok(guide, 'should have guide');
  assert.ok(!guide.message.includes('点击'), 'no click');
  assert.ok(!guide.message.includes('NPC'), 'no NPC');
  assert.ok(!guide.message.includes('AP'), 'no AP');
});

test('P1-2: guide has no mechanical hint field', () => {
  const guide = getGuideStep(mkState(), ctx);
  assert.strictEqual(guide.hint, undefined, 'no hint field');
});

test('P1-3: guide not shown when dead', () => {
  assert.strictEqual(getGuideStep(mkState({ hp: 0 }), ctx), null);
});

test('P1-4: guide not shown after loop 1', () => {
  assert.strictEqual(getGuideStep(mkState({ loopCount: 2 }), ctx), null);
});

// ── Phase 2: NPC talk ──
console.log('--- Phase 2: NPC Interaction ---');

test('P2-1: trust change produces feedback', () => {
  const fb = computeNpcFeedback({ testNpc: 0 }, { testNpc: 1 }, 'TALK_NPC');
  assert.ok(fb.length > 0);
  assert.ok(fb[0].message);
  assert.ok(fb[0].tier);
});

test('P2-2: tier change triggers pulse', () => {
  const fb = computeNpcFeedback({ testNpc: 1 }, { testNpc: 3 }, 'TALK_NPC');
  assert.strictEqual(fb[0].pulse, true);
});

test('P2-3: trust tier has description', () => {
  const info = getTrustTierInfo(3);
  assert.ok(info.description && info.description.length > 5);
});

// ── Phase 3: SAN loss ──
console.log('--- Phase 3: SAN Loss ---');

test('P3-1: small loss = minor tier', () => {
  assert.strictEqual(getSanLossPresentation(2, mkState()).tier, 'minor');
});

test('P3-2: medium loss = moderate tier', () => {
  assert.strictEqual(getSanLossPresentation(6, mkState()).tier, 'moderate');
});

test('P3-3: severe loss = severe tier', () => {
  assert.strictEqual(getSanLossPresentation(12, mkState()).tier, 'severe');
});

test('P3-4: critical loss = critical tier', () => {
  assert.strictEqual(getSanLossPresentation(20, mkState()).tier, 'critical');
});

test('P3-5: first loop caps SAN loss at 5', () => {
  assert.strictEqual(adjustSanLossForLoop23(15, mkState()), 5);
  assert.strictEqual(adjustSanLossForLoop23(3, mkState()), 3);
});

test('P3-6: safe window blocks lethal events', () => {
  // Safe window (loop 0, days 1-3) blocks ALL events — new player protection
  const s = mkState({ loopCount: 0, day: 2 });
  assert.ok(shouldBlockLethalEvent({ sanity_damage: 15, tags: ['lethal'] }, s), 'lethal event blocked');
  assert.ok(shouldBlockLethalEvent({ sanity_damage: 3 }, s), 'non-lethal also blocked in safe window');
  // Outside safe window, only tagged lethal events blocked
  const s2 = mkState({ loopCount: 0, day: 5 });
  assert.ok(!shouldBlockLethalEvent({ sanity_damage: 3 }, s2), 'non-lethal not blocked outside safe window');
});

// ── Phase 4: Low SAN ──
console.log('--- Phase 4: Low SAN ---');

test('P4-1: low SAN guide is atmospheric', () => {
  const guide = getGuideStep(mkState({ san: 25, day: 5 }), ctx);
  assert.ok(guide);
  assert.ok(!guide.message.includes('SAN'), 'no SAN mention');
});

test('P4-2: SAN stage feedback has UI hints', () => {
  const fb = getSanStageFeedback(20, ctx);
  assert.ok(fb.stage);
  assert.ok(fb.uiHints);
});

// ── Phase 5: Death & summary ──
console.log('--- Phase 5: Death & Summary ---');

test('P5-1: death summary has 4 sections', () => {
  const s = mkState({ san: 0, day: 8, clues: [{ id: 'c1', name: 'sym' }] });
  const dc = { type: 'madness', mode: 'san', finalText: 'text', area: 'catacombs_entrance', day: 8 };
  const sum = buildDeathSummary(s, dc, ctx);
  assert.ok(sum.section1 && sum.section2 && sum.section3 && sum.section4);
});

test('P5-2: section1 narrative lead does not expose mechanics', () => {
  const sum = buildDeathSummary(mkState({ san: 0 }), { type: 'mental', mode: 'san', finalText: '' }, ctx);
  assert.ok(!sum.section1.narrativeLead.includes('san'), 'no san');
  assert.ok(!sum.section1.narrativeLead.includes('<='), 'no math');
  assert.ok(sum.section1.factors.length > 0, 'has system factors');
});

test('P5-3: section4 suggestions are narrative', () => {
  const sum = buildDeathSummary(mkState({ clues: [] }), { type: 'starvation', mode: 'hp', finalText: '' }, ctx);
  for (const sug of sum.section4.suggestions) {
    assert.ok(!sug.text.includes('AP'), 'no AP');
    assert.ok(!sug.text.includes('消耗'), 'no cost');
    assert.ok(!sug.text.includes('按钮'), 'no button');
  }
});

// ── Phase 6: Reincarnation ──
console.log('--- Phase 6: Reincarnation ---');

test('P6-1: diff detects SAN cap change', () => {
  const diff = computeReincarnationDiff(mkState({ maxSan: 99 }), mkState({ maxSan: 94, loopCount: 1 }), ctx);
  assert.ok(diff.find(d => d.type === 'san_cap'));
});

test('P6-2: diff detects pollution increase', () => {
  const diff = computeReincarnationDiff(mkState({ pollution: 0 }), mkState({ pollution: 0.15, loopCount: 1 }), ctx);
  assert.ok(diff.find(d => d.type === 'pollution'));
});

// ── Phase 7: Text variants ──
console.log('--- Phase 7: Text Variants ---');

test('P7-1: first view = original (tier 1)', () => {
  const map = createSeenTextMap();
  const r = getTrackedText('e1', 'abc', 0.5, 1, map);
  assert.strictEqual(r.tier, 1);
  assert.strictEqual(r.action, 'show');
});

test('P7-2: second view = subtle shift (tier 2)', () => {
  const map = createSeenTextMap();
  const text = '你走进了码头区。海风带着盐味。';
  getTrackedText('e2', text, 0.5, 1, map);
  const r = getTrackedText('e2', text, 0.5, 1, map);
  assert.strictEqual(r.tier, 2);
  assert.ok(r.text.includes('码头区'), 'keeps core');
});

test('P7-3: fourth view = summary (tier 4, skip)', () => {
  const map = createSeenTextMap();
  const text = '你走进了码头区。海风带着盐味。';
  for (let i = 0; i < 3; i++) getTrackedText('e4', text, 0.5, 1, map);
  const r = getTrackedText('e4', text, 0.5, 1, map);
  assert.strictEqual(r.action, 'skip');
  assert.strictEqual(r.tier, 4);
  assert.ok(r.text.length > 0 && r.text.length < text.length);
});

test('P7-4: no pollution = no variant', () => {
  const map = createSeenTextMap();
  const text = 'abc';
  getTrackedText('e5', text, 0, 0, map);
  assert.strictEqual(getTrackedText('e5', text, 0, 0, map).action, 'show');
});

// ── Phase 8: Settings ──
console.log('--- Phase 8: Settings ---');

test('P8-1: DEFAULT_SETTINGS has active settings fields', () => {
  for (const k of ['volume', 'ambientVolume', 'effectVolume', 'uiVolume', 'narrativeFontSize', 'visualDistortion', 'flickerEffect', 'reduceMotion', 'visualPollution', 'interactionPollution', 'metaPollution', 'showGuideHints']) {
    assert.ok(k in DEFAULT_SETTINGS, 'missing: ' + k);
  }
});

console.log('');
console.log('=== Player Experience Loop Integration Tests ===');
console.log('  ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0 && typeof process !== 'undefined') process.exit(1);
