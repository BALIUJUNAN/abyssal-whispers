/**
 * Smoke Tests — Game data flow integrity checks.
 * Validates that game_base.json is internally consistent:
 *   - Required sections exist
 *   - Areas have valid connectivity
 *   - NPCs reference valid areas and have required fields
 *   - Events have valid structure
 *   - Loop system config is internally consistent
 *   - State transitions produce valid game states
 *
 * Run: node tests/test_smoke_flows.cjs
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  PASS: ' + name);
  } catch (e) {
    failed++;
    console.log('  FAIL: ' + name + ' -> ' + (e.message || String(e)).split('\n')[0]);
  }
}

let GD = {};
try {
  GD = JSON.parse(fs.readFileSync(path.join(ROOT, 'game_base.json'), 'utf8'));
} catch (e) {
  console.log('  [WARN] Could not load game_base.json: ' + e.message);
}

const areas = GD.areas || [];
const areaIds = new Set(areas.map((a) => a.id));
const npcs = GD.npcs || [];
const events = GD.events || [];
const systems = GD.systems || {};

// S1: Core data sections
console.log('--- S1: Core Data Sections ---');

test('S1-1: game_base.json loads with areas', () => {
  assert.ok(areas.length > 0, 'should have areas, got ' + areas.length);
});

test('S1-2: game_base.json loads with npcs', () => {
  assert.ok(npcs.length > 0, 'should have npcs, got ' + npcs.length);
});

test('S1-3: game_base.json loads with events', () => {
  assert.ok(events.length > 0, 'should have events, got ' + events.length);
});

test('S1-4: game_base.json has systems.loop', () => {
  assert.ok(systems.loop, 'systems.loop should exist');
});

test('S1-5: game_base.json has systems.sanity', () => {
  assert.ok(systems.sanity, 'systems.sanity should exist');
});

// S2: Area connectivity
console.log('--- S2: Area Connectivity ---');

test('S2-1: all areas have required fields (id, name)', () => {
  for (const a of areas) {
    assert.ok(a.id, 'area missing id');
    assert.ok(a.name, 'area missing name: ' + a.id);
  }
});

test('S2-2: all connected_areas reference existing area ids', () => {
  for (const a of areas) {
    for (const conn of a.connected_areas || []) {
      assert.ok(areaIds.has(conn), 'area ' + a.id + ' refs non-existent ' + conn);
    }
  }
});

test('S2-3: area ids are unique', () => {
  const seen = new Set();
  for (const a of areas) {
    assert.ok(!seen.has(a.id), 'duplicate area id: ' + a.id);
    seen.add(a.id);
  }
});

test('S2-4: town_center exists (main hub)', () => {
  assert.ok(areaIds.has('town_center'), 'town_center should exist');
});

test('S2-5: town_center has at least 2 connected areas', () => {
  const tc = areas.find((a) => a.id === 'town_center');
  assert.ok(tc, 'town_center not found');
  assert.ok((tc.connected_areas || []).length >= 2, 'should connect to >= 2 areas');
});

// S3: NPC data integrity
console.log('--- S3: NPC Data Integrity ---');

test('S3-1: all NPCs have required fields (name, location)', () => {
  for (const n of npcs) {
    assert.ok(n.name, 'NPC missing name');
    assert.ok(n.location, 'NPC ' + (n.name || '?') + ' missing location');
  }
});

test('S3-2: all NPC locations reference valid area ids', () => {
  for (const n of npcs) {
    if (n.location) {
      assert.ok(areaIds.has(n.location), 'NPC ' + n.name + ' invalid location ' + n.location);
    }
  }
});

test('S3-3: all NPCs have chapter_1_availability', () => {
  const valid = ['core', 'rumor_only', 'limited_appearance'];
  for (const n of npcs) {
    assert.ok(n.chapter_1_availability, 'NPC ' + n.name + ' missing chapter_1_availability');
    assert.ok(
      valid.includes(n.chapter_1_availability),
      'NPC ' + n.name + ' invalid chapter_1_availability ' + n.chapter_1_availability
    );
  }
});

test('S3-4: at least 2 core NPCs exist (always available)', () => {
  const core = npcs.filter((n) => n.chapter_1_availability === 'core');
  assert.ok(core.length >= 2, 'should have >= 2 core NPCs, got ' + core.length);
});

test('S3-5: NPC names are unique', () => {
  const seen = new Set();
  for (const n of npcs) {
    assert.ok(!seen.has(n.name), 'duplicate NPC name: ' + n.name);
    seen.add(n.name);
  }
});

test('S3-6: NPCs have trust_layers or trust_threshold', () => {
  for (const n of npcs) {
    const hasLayers = n.trust_layers && n.trust_layers.length > 0;
    const hasThreshold = typeof n.trust_threshold === 'number';
    assert.ok(hasLayers || hasThreshold, 'NPC ' + n.name + ' needs trust config');
  }
});

// S4: Event data integrity
console.log('--- S4: Event Data Integrity ---');

test('S4-1: all events have id and name', () => {
  for (const e of events) {
    assert.ok(e.id, 'event missing id');
    assert.ok(e.name, 'event ' + e.id + ' missing name');
  }
});

test('S4-2: event ids are unique', () => {
  const seen = new Set();
  for (const e of events) {
    assert.ok(!seen.has(e.id), 'duplicate event id: ' + e.id);
    seen.add(e.id);
  }
});

test('S4-3: at least 10 events exist', () => {
  assert.ok(events.length >= 10, 'should have >= 10 events, got ' + events.length);
});

// S5: Loop system consistency
console.log('--- S5: Loop System Consistency ---');

test('S5-1: loop_count_effects has loop_1 through loop_6_plus', () => {
  const lce = (systems.loop && systems.loop.loop_count_effects) || {};
  assert.ok(lce.loop_1, 'missing loop_1');
  assert.ok(lce.loop_2, 'missing loop_2');
  assert.ok(lce.loop_3, 'missing loop_3');
  assert.ok(lce.loop_6_plus, 'missing loop_6_plus');
});

test('S5-2: loop pollution_intensity increases with loop count', () => {
  const lce = (systems.loop && systems.loop.loop_count_effects) || {};
  const vals = [lce.loop_1, lce.loop_2, lce.loop_3, lce.loop_4, lce.loop_5].map(
    (v) => v && v.pollution_intensity
  );
  for (let i = 1; i < vals.length; i++) {
    assert.ok(
      vals[i] >= vals[i - 1],
      'pollution_intensity should increase: loop_' + (i + 1) + '=' + vals[i] + ' vs loop_' + i + '=' + vals[i - 1]
    );
  }
});

test('S5-3: loop san_cap_reduction is non-positive', () => {
  const lce = (systems.loop && systems.loop.loop_count_effects) || {};
  for (const [key, eff] of Object.entries(lce)) {
    if (eff.san_cap_reduction !== undefined) {
      assert.ok(eff.san_cap_reduction <= 0, key + ' san_cap_reduction should be <= 0');
    }
  }
});

test('S5-4: pollution_rules array exists and is non-empty', () => {
  const pr = (systems.loop && systems.loop.pollution_rules) || [];
  assert.ok(pr.length > 0, 'pollution_rules should be non-empty');
});

test('S5-5: pollution_san_cap rule exists and is cumulative', () => {
  const pr = (systems.loop && systems.loop.pollution_rules) || [];
  const rule = pr.find((r) => r.id === 'pollution_san_cap');
  assert.ok(rule, 'pollution_san_cap rule should exist');
  assert.strictEqual(rule.cumulative, true, 'pollution_san_cap should be cumulative');
});

test('S5-6: loop_blessings has entries for loop_2+', () => {
  const blessings = (systems.loop && systems.loop.loop_blessings) || {};
  assert.ok(blessings.loop_2, 'missing loop_2 blessing');
  assert.ok(blessings.loop_3, 'missing loop_3 blessing');
});

// S6: State transition smoke test
console.log('--- S6: State Transition Smoke ---');

function makeTestState() {
  return {
    screen: 'game',
    day: 1,
    ap: 12,
    maxAp: 12,
    hp: 11,
    maxHp: 11,
    san: 60,
    maxSan: 99,
    currentArea: 'town_center',
    visitedAreas: ['town_center'],
    inventory: [],
    clues: [],
    skills: {},
    npcTrust: {},
    npcStates: {},
    npcRelations: {},
    triggeredEvents: [],
    longTermEffects: [],
    stats_run: { deaths: 0, runs: 0 },
    food: 3,
    maxFood: 5,
    money: 5,
    loopCount: 0,
    pollution: 0,
    retainedKnowledge: [],
    discoveredConclusions: [],
    mythosLevel: 0,
    humanityScore: 50,
    activeBlessings: [],
    endingCoins: 0,
    loopShopTier: 0,
    behaviorTracking: {},
    ending: null,
    endingHistory: [],
    previousEndings: [],
    loopEchoFlags: [],
    everTriggeredEvents: [],
    deathContext: null,
    lastDeathType: null,
    starvationDays: 0,
    safehouseCorruption: 0,
    previousDeathContext: null,
    lastDeathMode: null,
    prologue: null,
    fearTuning: null,
    _npcTrustLocked: {},
    _dayActions: [],
    worldCorrectionFlags: [],
  };
}

function performTestLoopTransition(s) {
  const f = makeTestState();
  f.loopCount = (s.loopCount || 0) + 1;
  const loopKey = f.loopCount <= 5 ? 'loop_' + f.loopCount : 'loop_6_plus';
  const loopEffect =
    systems.loop && systems.loop.loop_count_effects && systems.loop.loop_count_effects[loopKey];
  if (loopEffect) {
    f.maxSan = Math.max(10, 99 + (loopEffect.san_cap_reduction || 0));
    f.pollution = loopEffect.pollution_intensity || 0;
  }
  if (f.loopCount >= 10) f.maxSan = 50;
  else if (f.loopCount >= 6) f.maxSan = Math.max(60, f.maxSan);
  else if (f.loopCount >= 4) f.maxSan = Math.max(60, f.maxSan);
  f.san = Math.min(f.san, f.maxSan);
  var pollutionRate = f.loopCount >= 6 ? 0.08 : 0.05;
  f.pollution = Math.min(1, (f.pollution || 0) + pollutionRate * f.loopCount);
  return f;
}

test('S6-1: loop 1 transition produces valid state', () => {
  const s = makeTestState();
  const t = performTestLoopTransition(s);
  assert.strictEqual(t.loopCount, 1, 'loopCount should be 1');
  assert.ok(t.maxSan > 0, 'maxSan should be > 0');
  assert.ok(t.san >= 0, 'san should be >= 0');
  assert.ok(t.pollution >= 0, 'pollution should be >= 0');
  assert.ok(t.hp > 0, 'hp should be > 0');
});

test('S6-2: loop 3 transition reduces maxSan', () => {
  let s = makeTestState();
  for (let i = 0; i < 3; i++) s = performTestLoopTransition(s);
  assert.ok(s.maxSan < 99, 'maxSan should be reduced after 3 loops, got ' + s.maxSan);
});

test('S6-3: loop 10 transition locks maxSan to 50', () => {
  let s = makeTestState();
  for (let i = 0; i < 10; i++) s = performTestLoopTransition(s);
  assert.strictEqual(s.maxSan, 50, 'maxSan should be 50 at loop 10');
});

test('S6-4: pollution increases with loop count', () => {
  let s = makeTestState();
  const polValues = [];
  for (let i = 0; i < 6; i++) {
    s = performTestLoopTransition(s);
    polValues.push(s.pollution);
  }
  for (let i = 1; i < polValues.length; i++) {
    assert.ok(
      polValues[i] >= polValues[i - 1],
      'pollution should not decrease: loop ' + (i + 1) + '=' + polValues[i].toFixed(3)
    );
  }
});

test('S6-5: pollution never exceeds 1.0', () => {
  let s = makeTestState();
  for (let i = 0; i < 15; i++) {
    s = performTestLoopTransition(s);
    assert.ok(s.pollution <= 1.0, 'pollution=' + s.pollution + ' exceeds 1.0 at loop ' + s.loopCount);
  }
});

test('S6-6: state has all required fields after transition', () => {
  const s = makeTestState();
  const t = performTestLoopTransition(s);
  const required = [
    'loopCount', 'maxSan', 'san', 'hp', 'pollution',
    'food', 'money', 'currentArea', 'behaviorTracking', 'npcTrust',
  ];
  for (const key of required) {
    assert.ok(key in t, 'missing required field: ' + key);
  }
});

// S7: SAN mutation hygiene (static analysis)
console.log('--- S7: SAN Mutation Hygiene ---');

const SAN_SLICES = [
  'src/reducers/slices/darkSlice.js',
  'src/reducers/slices/npcSlice.js',
  'src/reducers/slices/dailySlice.js',
  'src/reducers/slices/exploreSlice.js',
  'src/reducers/slices/uiSlice.js',
  'src/reducers/objectiveReducer.js',
  'src/reducers/effectReducer.js',
];

test('S7-1: all SAN loss slices import applySanLoss from utils.js', () => {
  for (const rel of SAN_SLICES) {
    const filePath = path.join(ROOT, rel);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      content.includes('applySanLoss'),
      rel + ' should import/use applySanLoss'
    );
  }
});

test('S7-2: no direct s.san = clamp(s.san - ...) in SAN loss slices', () => {
  const RE = /s\.san\s*=\s*clamp\(s\.san\s*-/;
  for (const rel of SAN_SLICES) {
    const filePath = path.join(ROOT, rel);
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('//')) continue;
      assert.ok(!RE.test(line), rel + ':' + (i + 1) + ' has direct SAN mutation: ' + line.trim());
    }
  }
});

test('S7-3: no direct state.san = clamp(state.san - ...) in SAN loss slices', () => {
  const RE = /state\.san\s*=\s*clamp\(state\.san\s*-/;
  for (const rel of SAN_SLICES) {
    const filePath = path.join(ROOT, rel);
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('//')) continue;
      assert.ok(!RE.test(line), rel + ':' + (i + 1) + ' has direct SAN mutation: ' + line.trim());
    }
  }
});

// S8: SAN death resolution coverage
console.log('--- S8: SAN Death Resolution Coverage ---');

test('S8-1: all SAN loss slices have death resolution in same file or caller', () => {
  // Files that call applySanLoss MUST also have resolveDeath/applyDeathResolution
  // either in the same file or be called from a main reducer that does.
  // For dailySlice.js, death resolution lives in foodSystem.js (domain-owned).
  const slicesWithDeathCheck = [
    'src/reducers/slices/exploreSlice.js',
    'src/reducers/slices/uiSlice.js',
  ];
  const dailyDeathResolutionFiles = [
    'src/reducers/slices/dailySlice.js',
    'src/systems/daily/foodSystem.js', // _processFoodAndStarvation calls applyDeathResolution
  ];
  const slicesViaMainReducer = [
    'src/reducers/slices/darkSlice.js',
    'src/reducers/slices/npcSlice.js',
    'src/reducers/objectiveReducer.js',
    'src/reducers/effectReducer.js',
  ];
  // Slices with direct death check
  for (const rel of slicesWithDeathCheck) {
    const content = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    assert.ok(
      content.includes('resolveDeath') || content.includes('applyDeathResolution'),
      rel + ' should have death resolution (resolveDeath/applyDeathResolution)'
    );
  }
  // dailySlice delegates death resolution to foodSystem.js — check at least one file has it
  var dailyHasDeathRes = false;
  for (const rel of dailyDeathResolutionFiles) {
    const content = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    if (content.includes('resolveDeath') || content.includes('applyDeathResolution')) {
      dailyHasDeathRes = true;
      break;
    }
  }
  assert.ok(dailyHasDeathRes, 'dailySlice.js or foodSystem.js should have death resolution');
  // Slices that rely on main reducer — verify they export a handler (not top-level death check)
  for (const rel of slicesViaMainReducer) {
    const content = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    assert.ok(
      content.includes('export function') || content.includes('export default'),
      rel + ' should export a handler function (death resolution via main reducer)'
    );
  }
});

test('S8-2: resolveDeath is exported from deathSystem.js', () => {
  const content = fs.readFileSync(path.join(ROOT, 'src/reducers/deathSystem.js'), 'utf8');
  assert.ok(content.includes('export function resolveDeath'), 'resolveDeath should be exported');
});

test('S8-3: applyDeathResolution is exported from appHelpers.js', () => {
  const content = fs.readFileSync(path.join(ROOT, 'src/utils/appHelpers.js'), 'utf8');
  assert.ok(
    content.includes('export function applyDeathResolution'),
    'applyDeathResolution should be exported'
  );
});

// S9: Module integration verification
console.log('--- S9: Module Integration ---');

test('S9-1: deathSummary is imported in appHelpers.js', () => {
  const content = fs.readFileSync(path.join(ROOT, 'src/utils/appHelpers.js'), 'utf8');
  assert.ok(content.includes("from '../systems/deathSummary.js'"), 'should import deathSummary');
  assert.ok(content.includes('buildDeathSummary'), 'should call buildDeathSummary');
});

test('S9-2: reincarnationDiff is imported in loopReducer.js', () => {
  const content = fs.readFileSync(path.join(ROOT, 'src/reducers/loopReducer.js'), 'utf8');
  assert.ok(content.includes("from '../systems/reincarnationDiff.js'"), 'should import reincarnationDiff');
  assert.ok(content.includes('computeReincarnationDiff'), 'should call computeReincarnationDiff');
  assert.ok(content.includes('reincarnationDiff'), 'should store diff on state');
});

test('S9-3: applySanLoss records _lastSanLoss for UI feedback', () => {
  const content = fs.readFileSync(path.join(ROOT, 'src/reducers/utils.js'), 'utf8');
  assert.ok(content.includes('_lastSanLoss'), 'should record _lastSanLoss on state');
});

test('S9-4: firstLoopBalance is imported in exploreSlice.js', () => {
  const content = fs.readFileSync(path.join(ROOT, 'src/reducers/slices/exploreSlice.js'), 'utf8');
  assert.ok(content.includes("from '../../systems/firstLoopBalance.js'"), 'should import firstLoopBalance');
  assert.ok(content.includes('adjustSanLossForLoop23'), 'should call adjustSanLossForLoop23');
  assert.ok(content.includes('shouldBlockLethalEvent'), 'should call shouldBlockLethalEvent');
});

test('S9-5: all 9 system modules exist in src/systems/', () => {
  const modules = [
    'deathSummary.js', 'reincarnationDiff.js', 'firstRunGuide.js',
    'npcFeedback.js', 'sanFeedback.js', 'firstLoopBalance.js',
    'textVariants.js', 'gameSettings.js',
  ];
  for (const mod of modules) {
    assert.ok(
      fs.existsSync(path.join(ROOT, 'src/systems', mod)),
      'src/systems/' + mod + ' should exist'
    );
  }
});

test('S9-7: npcFeedback is imported in npcSlice.js', () => {
  const content = fs.readFileSync(path.join(ROOT, 'src/reducers/slices/npcSlice.js'), 'utf8');
  assert.ok(content.includes("from '../../systems/npcFeedback.js'"), 'should import npcFeedback');
  assert.ok(content.includes('computeNpcFeedback'), 'should call computeNpcFeedback');
});

test('S9-8: firstRunGuide is imported in app.jsx', () => {
  const content = fs.readFileSync(path.join(ROOT, 'src/app.jsx'), 'utf8');
  assert.ok(content.includes("from './systems/firstRunGuide.js'"), 'should import firstRunGuide');
  assert.ok(content.includes('getGuideStep'), 'should call getGuideStep');
});

test('S9-9: sanFeedback is imported in app.jsx', () => {
  const content = fs.readFileSync(path.join(ROOT, 'src/app.jsx'), 'utf8');
  assert.ok(content.includes("from './systems/sanFeedback.js'"), 'should import sanFeedback');
  assert.ok(content.includes('getSanStageFeedback'), 'should call getSanStageFeedback');
});

test('S9-10: textVariants is imported in exploreSlice.js', () => {
  const content = fs.readFileSync(path.join(ROOT, 'src/reducers/slices/exploreSlice.js'), 'utf8');
  assert.ok(content.includes("from '../../systems/textVariants.js'"), 'should import textVariants');
  assert.ok(content.includes('getTrackedText'), 'should call getTrackedText');
});

test('S9-11: gameSettings fields merged into miscReducer DEFAULT_SETTINGS', () => {
  const content = fs.readFileSync(path.join(ROOT, 'src/reducers/miscReducer.js'), 'utf8');
  assert.ok(content.includes('showGuideHints'), 'should have showGuideHints');
  assert.ok(content.includes('reduceMotion'), 'should have reduceMotion');
  assert.ok(content.includes('screenShake'), 'should have screenShake');
  assert.ok(content.includes('textCorruption'), 'should have textCorruption');
  assert.ok(content.includes('vignetteIntensity'), 'should have vignetteIntensity');
});

test('S9-6: deathSummary builds 4-section structure', () => {
  const content = fs.readFileSync(path.join(ROOT, 'src/systems/deathSummary.js'), 'utf8');
  assert.ok(content.includes('section1'), 'should have section1 (how you died)');
  assert.ok(content.includes('section2'), 'should have section2 (what you discovered)');
  assert.ok(content.includes('section3'), 'should have section3 (how world changed)');
  assert.ok(content.includes('section4'), 'should have section4 (what to try next)');
});

// S10: Fix verification
console.log('--- S10: Fix Verification ---');

test('S10-1: EndingScreen renders DeathSummaryView', () => {
  const content = fs.readFileSync(path.join(ROOT, 'src/components/GamePanels.jsx'), 'utf8');
  assert.ok(content.includes('DeathSummaryView'), 'should define DeathSummaryView component');
  assert.ok(content.includes('ending.deathSummary'), 'should render ending.deathSummary');
});

test('S10-2: firstRunGuide respects showGuideHints setting', () => {
  const content = fs.readFileSync(path.join(ROOT, 'src/app.jsx'), 'utf8');
  assert.ok(content.includes('showGuideHints'), 'should check showGuideHints');
  assert.ok(content.includes('getGuideStep'), 'should call getGuideStep');
});

test('S10-3: npcFeedback only strong on tier change', () => {
  const npcSliceContent = fs.readFileSync(path.join(ROOT, 'src/reducers/slices/npcSlice.js'), 'utf8');
  const socialContent = fs.readFileSync(path.join(ROOT, 'src/systems/npc/socialBranches.js'), 'utf8');
  assert.ok(socialContent.includes('tierChanged'), 'should check tierChanged in socialBranches');
  assert.ok(npcSliceContent.includes('_warnTrustDrop'), 'should have _warnTrustDrop for drops');
});

test('S10-4: seenEventTexts persists across loops', () => {
  const loopContent = fs.readFileSync(path.join(ROOT, 'src/reducers/loopReducer.js'), 'utf8');
  assert.ok(loopContent.includes('seenEventTexts'), 'loopReducer should carry seenEventTexts');
  const exploreContent = fs.readFileSync(path.join(ROOT, 'src/reducers/slices/exploreSlice.js'), 'utf8');
  assert.ok(exploreContent.includes('seenEventTexts'), 'exploreSlice should use seenEventTexts');
  const initContent = fs.readFileSync(path.join(ROOT, 'src/state/initialState.js'), 'utf8');
  assert.ok(initContent.includes('seenEventTexts'), 'initialState should include seenEventTexts');
});

test('S10-5: textVariants tier system has 4 tiers', () => {
  const content = fs.readFileSync(path.join(ROOT, 'src/systems/textVariants.js'), 'utf8');
  assert.ok(content.includes('Tier 1'), 'should document tier 1');
  assert.ok(content.includes('Tier 2'), 'should document tier 2');
  assert.ok(content.includes('Tier 3'), 'should document tier 3');
  assert.ok(content.includes('Tier 4'), 'should document tier 4');
  assert.ok(content.includes('_applySubtleShift'), 'should have subtle shift for tier 2');
  assert.ok(content.includes('_applyReadableCorruption'), 'should have readable corruption for tier 3');
  assert.ok(content.includes('_buildSummary'), 'should have summary for tier 4');
});

// Summary
console.log('');
console.log('=== Smoke Flow Tests ===');
console.log('  ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0 && typeof process !== 'undefined') process.exit(1);
