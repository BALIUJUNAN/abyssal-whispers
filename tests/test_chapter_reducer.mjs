/**
 * Chapter Reducer Tests
 * Validates: chapter progression, mythos cap, alias resolution,
 *            chapter transition detection, motif flavor text, monster manifestation.
 *
 * Run: node tests/test_chapter_reducer.mjs
 */
import assert from 'assert';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, '..', 'src');

async function importFrom(relativePath) {
  return import(pathToFileURL(join(SRC, relativePath)).href);
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  PASS: ' + name);
  } catch (e) {
    failed++;
    console.log('  FAIL: ' + name + ' -> ' + e.message);
  }
}

async function main() {
  const {
    getChapterForDay, getMythosCap, getChapterAlias,
    checkChapterTransition, getMotifFlavorText, getMonsterManifestation,
  } = await importFrom('reducers/chapterReducer.js');

  // Minimal GD mock — chapterReducer falls back to _CHAPTER_DEFAULTS when
  // implementation_notes.chapters is missing.
  var mockCtx = { GD: {} };

  // === getChapterForDay ===

  test('day 1 → chapter_1', function () {
    var ch = getChapterForDay(1, mockCtx);
    assert.strictEqual(ch.key, 'chapter_1');
  });

  test('day 3 → chapter_1', function () {
    var ch = getChapterForDay(3, mockCtx);
    assert.strictEqual(ch.key, 'chapter_1');
  });

  test('day 4 → chapter_2', function () {
    var ch = getChapterForDay(4, mockCtx);
    assert.strictEqual(ch.key, 'chapter_2');
  });

  test('day 7 → chapter_2', function () {
    var ch = getChapterForDay(7, mockCtx);
    assert.strictEqual(ch.key, 'chapter_2');
  });

  test('day 8 → chapter_3', function () {
    var ch = getChapterForDay(8, mockCtx);
    assert.strictEqual(ch.key, 'chapter_3');
  });

  test('day 14 → chapter_3', function () {
    var ch = getChapterForDay(14, mockCtx);
    assert.strictEqual(ch.key, 'chapter_3');
  });

  test('day 15 → chapter_4', function () {
    var ch = getChapterForDay(15, mockCtx);
    assert.strictEqual(ch.key, 'chapter_4');
  });

  test('day 21 → chapter_4', function () {
    var ch = getChapterForDay(21, mockCtx);
    assert.strictEqual(ch.key, 'chapter_4');
  });

  test('day 22 → chapter_5', function () {
    var ch = getChapterForDay(22, mockCtx);
    assert.strictEqual(ch.key, 'chapter_5');
  });

  test('day 28 → chapter_5', function () {
    var ch = getChapterForDay(28, mockCtx);
    assert.strictEqual(ch.key, 'chapter_5');
  });

  test('each chapter has mythos_cap', function () {
    for (var day = 1; day <= 28; day += 3) {
      var ch = getChapterForDay(day, mockCtx);
      assert.ok(ch.mythos_cap >= 1, 'mythos_cap missing for day ' + day);
    }
  });

  // === getMythosCap ===

  test('getMythosCap returns chapter mythos_cap', function () {
    assert.strictEqual(getMythosCap(1, mockCtx), 1);
    assert.strictEqual(getMythosCap(4, mockCtx), 3);
    assert.strictEqual(getMythosCap(8, mockCtx), 5);
  });

  // === getChapterAlias ===

  test('getChapterAlias returns alias from chapter_1 defaults', function () {
    assert.strictEqual(getChapterAlias('deep_one', 1, mockCtx), '海里的东西');
  });

  test('getChapterAlias returns null for unknown entity', function () {
    assert.strictEqual(getChapterAlias('unknown_entity', 1, mockCtx), null);
  });

  // === checkChapterTransition ===

  test('no transition when same chapter', function () {
    var result = checkChapterTransition(1, 3, mockCtx);
    assert.strictEqual(result, null);
  });

  test('transition detected ch1→ch2', function () {
    var result = checkChapterTransition(3, 4, mockCtx);
    assert.ok(result, 'expected transition object');
    assert.ok(result.event_text, 'expected event_text');
  });

  test('transition detected ch2→ch3', function () {
    var result = checkChapterTransition(7, 8, mockCtx);
    assert.ok(result, 'expected transition object');
  });

  test('fallback transition text when no GD config', function () {
    var result = checkChapterTransition(14, 15, mockCtx);
    assert.ok(result, 'expected fallback transition');
    assert.ok(result.event_text.length > 0);
  });

  // === getMotifFlavorText ===

  test('returns null when no GD motifs', function () {
    var result = getMotifFlavorText('fog', 50, mockCtx, null);
    assert.strictEqual(result, null);
  });

  test('returns null when motif type not found', function () {
    var gdWithMotifs = {
      systems: {
        motifs: {
          motifs: { fog: { narrative_examples: ['雾弥漫'] } },
        },
      },
    };
    var ctx = { GD: gdWithMotifs };
    var result = getMotifFlavorText('unknown_type', 50, ctx, null);
    assert.strictEqual(result, null);
  });

  test('returns motif example when available', function () {
    var gdWithMotifs = {
      systems: {
        motifs: {
          motifs: { fog: { narrative_examples: ['雾弥漫', '雾更深了'] } },
        },
      },
    };
    var ctx = { GD: gdWithMotifs };
    // Use a seeded RNG for determinism
    var seed = 42;
    var h = 0;
    var s = String(seed) + '_' + String(0);
    for (var i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    var state = h >>> 0 || 1;
    function next() {
      state = (state + 0x6d2b79f5) | 0;
      var t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    var rng = { next: next };
    var result = getMotifFlavorText('fog', 80, ctx, rng);
    assert.ok(result, 'expected motif flavor text');
    assert.ok(gdWithMotifs.systems.motifs.motifs.fog.narrative_examples.includes(result),
      'result should be one of the examples');
  });

  test('returns null when corruptionLevel < 20 and RNG rolls high', function () {
    var gdWithMotifs = {
      systems: {
        motifs: {
          motifs: { fog: { narrative_examples: ['雾弥漫'] } },
        },
      },
    };
    var ctx = { GD: gdWithMotifs };
    // Force RNG to return > 0.3 (always skip)
    var rng = { next: () => 0.5 };
    var result = getMotifFlavorText('fog', 10, ctx, rng);
    assert.strictEqual(result, null);
  });

  test('returns null when corruptionLevel < 50 and RNG rolls > 0.5', function () {
    var gdWithMotifs = {
      systems: {
        motifs: {
          motifs: { fog: { narrative_examples: ['雾弥漫'] } },
        },
      },
    };
    var ctx = { GD: gdWithMotifs };
    var rng = { next: () => 0.8 };
    var result = getMotifFlavorText('fog', 30, ctx, rng);
    assert.strictEqual(result, null);
  });

  // === getMonsterManifestation ===

  test('returns null when no GD monster rules', function () {
    var result = getMonsterManifestation('deep_one', 10, mockCtx, null);
    assert.strictEqual(result, null);
  });

  test('returns null when creature type not found', function () {
    var gdWithMonsters = {
      implementation_notes: {
        monster_presence: {
          creature_rules: { deep_one: { stage_distribution: {}, preferred_manifestations: [] } },
        },
      },
    };
    var ctx = { GD: gdWithMonsters };
    var result = getMonsterManifestation('unknown_creature', 10, ctx, null);
    assert.strictEqual(result, null);
  });

  test('returns null when no manifestations', function () {
    var gdWithMonsters = {
      implementation_notes: {
        monster_presence: {
          creature_rules: { deep_one: { stage_distribution: { absence: 1 }, preferred_manifestations: [] } },
        },
      },
    };
    var ctx = { GD: gdWithMonsters };
    var result = getMonsterManifestation('deep_one', 10, ctx, null);
    assert.strictEqual(result, null);
  });

  test('returns manifestation with stage and text', function () {
    var gdWithMonsters = {
      implementation_notes: {
        monster_presence: {
          creature_rules: {
            deep_one: {
              stage_distribution: { absence: 0.5, trace: 0.3, partial_presence: 0.2 },
              preferred_manifestations: ['远处有东西在动', '你闻到了海水的味道'],
            },
          },
        },
      },
    };
    var ctx = { GD: gdWithMonsters };
    // Deterministic RNG that picks first manifestation
    var rng = { next: () => 0.0 };
    var result = getMonsterManifestation('deep_one', 10, ctx, rng);
    assert.ok(result, 'expected manifestation');
    assert.ok(['absence', 'trace', 'partial_presence', 'full_presence'].includes(result.stage));
    assert.ok(typeof result.manifestation === 'string');
    assert.ok(result.manifestation.length > 0);
  });

  test('early days downgrade full_presence → partial_presence', function () {
    var gdWithMonsters = {
      implementation_notes: {
        monster_presence: {
          creature_rules: {
            deep_one: {
              stage_distribution: { full_presence: 1 },
              preferred_manifestations: ['全盛形态'],
            },
          },
        },
      },
    };
    var ctx = { GD: gdWithMonsters };
    var rng = { next: () => 0.0 };
    // Day 7 → full_presence should be downgraded
    var result = getMonsterManifestation('deep_one', 7, ctx, rng);
    assert.ok(result);
    assert.notStrictEqual(result.stage, 'full_presence', 'full_presence should be downgraded on day 7');
  });

  test('day 15+ allows full_presence', function () {
    var gdWithMonsters = {
      implementation_notes: {
        monster_presence: {
          creature_rules: {
            deep_one: {
              stage_distribution: { full_presence: 1 },
              preferred_manifestations: ['全盛形态'],
            },
          },
        },
      },
    };
    var ctx = { GD: gdWithMonsters };
    var rng = { next: () => 0.0 };
    var result = getMonsterManifestation('deep_one', 15, ctx, rng);
    assert.ok(result);
    assert.strictEqual(result.stage, 'full_presence');
  });

  // === Summary ===

  console.log('\n=== Chapter Reducer Tests ===');
  console.log('  ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
