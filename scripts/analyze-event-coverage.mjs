// scripts/analyze-event-coverage.mjs — Event coverage and redundancy analyzer.
//
// 7 analysis sections:
//   1. Per-area coverage
//   2. Trigger condition space
//   3. Semantic redundancy (Jaccard)
//   4. Weight distribution simulation
//   5. Budget feasibility
//   6. Pool exhaustion modeling
//   7. Actionable recommendations
//
// Usage:
//   node scripts/analyze-event-coverage.mjs              # full analysis
//   node scripts/analyze-event-coverage.mjs --ci         # exit 1 on CRITICAL
//   node scripts/analyze-event-coverage.mjs --json       # JSON output
//   node scripts/analyze-event-coverage.mjs --section coverage  # specific section

import { getAllEvents, getEventsByArea, getCoverageReport, detectRedundancy, simulateSelection, validateBudgetFeasibility, modelPoolExhaustion, generateRecommendations } from '../src/data/registry/eventRegistry.js';
import { EVENT_BUDGET } from '../src/reducers/extendedEvents.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── CLI Args ───────────────────────────────────────────────────────

var args = process.argv.slice(2);
var opts = {
  ci: args.indexOf('--ci') >= 0,
  json: args.indexOf('--json') >= 0,
  csv: args.indexOf('--csv') >= 0,
  verbose: args.indexOf('--verbose') >= 0,
  section: null,
  iterations: 1000,
};
var sectionIdx = args.indexOf('--section');
if (sectionIdx >= 0 && args[sectionIdx + 1]) opts.section = args[sectionIdx + 1];
var iterIdx = args.indexOf('--iterations');
if (iterIdx >= 0 && args[iterIdx + 1]) opts.iterations = parseInt(args[iterIdx + 1], 10) || 1000;

// ── Data Loading ───────────────────────────────────────────────────

function loadGameData() {
  var GD = { events: [], areas: [] };

  try {
    var narrativeJson = path.join(ROOT, 'src/data/game_base/narrative.json');
    if (fs.existsSync(narrativeJson)) {
      var data = JSON.parse(fs.readFileSync(narrativeJson, 'utf-8'));
      GD.events = data.events || [];
      GD.areas = data.areas || [];
    }
  } catch (e) {
    try {
      var baseData = JSON.parse(fs.readFileSync(path.join(ROOT, 'game_base.json'), 'utf-8'));
      GD.events = baseData.narrative?.events || baseData.events || [];
      GD.areas = baseData.world?.areas || [];
    } catch (e2) {
      console.warn('Could not load game_base data:', e2.message);
    }
  }

  return GD;
}

// ── Analysis Functions ─────────────────────────────────────────────

function analyzeAreaCoverage(events, GD) {
  var report = getCoverageReport(events, GD);
  var lines = ['== Section 1: Per-Area Coverage ==', ''];

  var areaEntries = Object.keys(report.byArea).map(function (id) {
    return { id: id, count: report.byArea[id].count, label: report.byArea[id].label };
  });
  areaEntries.sort(function (a, b) { return b.count - a.count; });

  for (var i = 0; i < areaEntries.length; i++) {
    var a = areaEntries[i];
    var status = 'OK';
    var areaInfo = report.byArea[a.id];
    if (!areaInfo.isCanonical) status = 'CONTEXT';
    else if (a.count < 10) status = 'CRITICAL';
    else if (a.count < 20) status = 'WARN';
    else if (a.count > 150) status = 'BLOAT';
    lines.push('  ' + a.id.padEnd(24) + a.count + ' events [' + status + ']' + (a.label !== a.id ? ' (' + a.label + ')' : ''));
  }

  lines.push('');
  lines.push('  Total pool events: ' + report.totalPool);
  lines.push('  Total events (all sources): ' + report.totalEvents);

  if (report.underServed.length > 0) {
    lines.push('');
    lines.push('  Under-served areas:');
    for (var u = 0; u < report.underServed.length; u++) {
      lines.push('    - ' + report.underServed[u].area + ': ' + report.underServed[u].count + ' events [' + report.underServed[u].severity + ']');
    }
  }
  if (report.overServed.length > 0) {
    lines.push('');
    lines.push('  Over-served areas:');
    for (var o = 0; o < report.overServed.length; o++) {
      lines.push('    - ' + report.overServed[o].area + ': ' + report.overServed[o].count + ' events');
    }
  }

  lines.push('');
  lines.push('  By category:');
  var cats = Object.keys(report.byCategory).sort();
  for (var c = 0; c < cats.length; c++) {
    lines.push('    ' + cats[c].padEnd(20) + report.byCategory[cats[c]]);
  }

  return lines.join('\n');
}

function analyzeTriggerSpace(events) {
  var lines = ['== Section 2: Trigger Condition Space ==', ''];

  var poolEvents = events.filter(function (e) { return e._raw && e._raw.trigger; });
  var triggerCombos = {};
  var areaCounts = {};
  var loopRanges = {};

  for (var i = 0; i < poolEvents.length; i++) {
    var e = poolEvents[i];
    var t = e._raw.trigger;
    var areas = (t.areas || []).join(',');
    var key = areas + ' | loop:' + (t.min_loop || 0) + '-' + (t.max_loop || '∞') + ' | san:' + (t.san_lte || 'any');

    triggerCombos[key] = (triggerCombos[key] || 0) + 1;

    for (var j = 0; j < (t.areas || []).length; j++) {
      areaCounts[t.areas[j]] = (areaCounts[t.areas[j]] || 0) + 1;
    }

    if (t.min_loop || t.max_loop) {
      var lk = (t.min_loop || 0) + '-' + (t.max_loop || '∞');
      loopRanges[lk] = (loopRanges[lk] || 0) + 1;
    }
  }

  var deadZones = Object.keys(triggerCombos).filter(function (k) { return triggerCombos[k] === 0; });
  var hotZones = Object.keys(triggerCombos).filter(function (k) { return triggerCombos[k] > 20; });

  lines.push('  Total unique trigger combinations: ' + Object.keys(triggerCombos).length);
  lines.push('  Dead zones (0 events): ' + deadZones.length + ' combinations');
  lines.push('  Hot zones (>20 events): ' + hotZones.length + ' combinations');

  if (hotZones.length > 0) {
    lines.push('');
    lines.push('  Top hot zones:');
    hotZones.sort(function (a, b) { return triggerCombos[b] - triggerCombos[a]; });
    for (var h = 0; h < Math.min(10, hotZones.length); h++) {
      lines.push('    ' + triggerCombos[hotZones[h]] + ' events: ' + hotZones[h]);
    }
  }

  lines.push('');
  lines.push('  Loop range distribution:');
  var lk = Object.keys(loopRanges).sort();
  for (var l = 0; l < lk.length; l++) {
    lines.push('    loop ' + lk[l].padEnd(12) + loopRanges[lk[l]] + ' events');
  }

  return lines.join('\n');
}

function analyzeRedundancy(events) {
  var lines = ['== Section 3: Semantic Redundancy ==', ''];

  var groups = detectRedundancy(events, 0.6);
  var highSim = groups.filter(function (g) { return g.similarity >= 0.7; });
  var medSim = groups.filter(function (g) { return g.similarity >= 0.5 && g.similarity < 0.7; });

  lines.push('  Total event pairs analyzed: ' + (groups.length + medSim.length));
  lines.push('  High similarity (>=0.7): ' + highSim.length + ' pairs');
  lines.push('  Medium similarity (0.5-0.7): ' + medSim.length + ' pairs');

  if (highSim.length > 0) {
    lines.push('');
    lines.push('  High-similarity pairs:');
    for (var i = 0; i < Math.min(20, highSim.length); i++) {
      lines.push('    - ' + highSim[i].eventA + ' + ' + highSim[i].eventB + ' (sim: ' + highSim[i].similarity + ')');
    }
  }

  if (medSim.length > 0 && opts.verbose) {
    lines.push('');
    lines.push('  Medium-similarity pairs (--verbose):');
    for (var j = 0; j < Math.min(10, medSim.length); j++) {
      lines.push('    - ' + medSim[j].eventA + ' + ' + medSim[j].eventB + ' (sim: ' + medSim[j].similarity + ')');
    }
  }

  return lines.join('\n');
}

function analyzeWeightDistribution(events) {
  var lines = ['== Section 4: Weight Distribution ==', ''];

  var sim = simulateSelection(events, opts.iterations);
  lines.push('  Pool size: ' + sim.totalPool);
  lines.push('  Iterations: ' + sim.iterations);
  lines.push('  Total weight: ' + sim.totalWeight);

  if (sim.neverSelected.length > 0) {
    lines.push('');
    lines.push('  Never selected (' + sim.neverSelected.length + ' events):');
    for (var i = 0; i < Math.min(20, sim.neverSelected.length); i++) {
      lines.push('    - ' + sim.neverSelected[i].id + ' (weight: ' + sim.neverSelected[i].weight + ', expected: ' + sim.neverSelected[i].expected + ')');
    }
  }

  if (sim.lowFrequency.length > 0) {
    lines.push('');
    lines.push('  Low frequency (<30% of expected, ' + sim.lowFrequency.length + ' events):');
    for (var l = 0; l < Math.min(10, sim.lowFrequency.length); l++) {
      lines.push('    - ' + sim.lowFrequency[l].id + ' (actual: ' + sim.lowFrequency[l].actual + ', expected: ' + sim.lowFrequency[l].expected + ', ratio: ' + sim.lowFrequency[l].ratio + ')');
    }
  }

  if (sim.topFrequency.length > 0) {
    lines.push('');
    lines.push('  Top frequency events:');
    for (var t = 0; t < sim.topFrequency.length; t++) {
      lines.push('    - ' + sim.topFrequency[t].id + ' (selections: ' + sim.topFrequency[t].actual + ')');
    }
  }

  return lines.join('\n');
}

function analyzeBudgetFeasibility(events) {
  var lines = ['== Section 5: Budget Feasibility ==', ''];

  var issues = validateBudgetFeasibility(events);

  if (issues.length === 0) {
    lines.push('  All budgets are feasible.');
  } else {
    for (var i = 0; i < issues.length; i++) {
      var issue = issues[i];
      var prefix = issue.severity === 'critical' ? '  CRITICAL' : '  HIGH';
      lines.push(prefix + ': ' + issue.message);
    }
  }

  lines.push('');
  lines.push('  EVENT_BUDGET:');
  var types = Object.keys(EVENT_BUDGET).sort();
  for (var t = 0; t < types.length; t++) {
    var b = EVENT_BUDGET[types[t]];
    var parts = [];
    if (b.maxPerDay) parts.push('maxPerDay: ' + b.maxPerDay);
    if (b.maxPerRun) parts.push('maxPerRun: ' + b.maxPerRun);
    if (b.minPerRun) parts.push('minPerRun: ' + b.minPerRun);
    lines.push('    ' + types[t].padEnd(20) + parts.join(', '));
  }

  return lines.join('\n');
}

function analyzePoolExhaustion(events) {
  var lines = ['== Section 6: Pool Exhaustion ==', ''];

  var exhaustion = modelPoolExhaustion(events, [10, 25, 50, 100]);
  var counts = Object.keys(exhaustion).sort(function (a, b) { return parseInt(a) - parseInt(b); });

  for (var i = 0; i < counts.length; i++) {
    var e = exhaustion[counts[i]];
    lines.push('  After ' + e.explores + ' explores:');
    lines.push('    Unique events seen: ' + e.uniqueEventsSeen + ' / ' + e.totalPool + ' (' + e.exhaustionRate + '% exhausted)');
    lines.push('    Once-per-run consumed: ' + e.oncePerRunConsumed + ' / ' + e.oncePerRunTotal);
  }

  return lines.join('\n');
}

function analyzeRecommendations(events, GD) {
  var lines = ['== Section 7: Recommendations ==', ''];

  var report = getCoverageReport(events, GD);
  var redundancy = detectRedundancy(events, 0.6);
  var selection = simulateSelection(events, opts.iterations);
  var budgetIssues = validateBudgetFeasibility(events);
  var recs = generateRecommendations(report, redundancy, selection, budgetIssues);

  if (recs.length === 0) {
    lines.push('  No issues found. Event pool looks healthy.');
  } else {
    var byPriority = { critical: [], high: [], medium: [], low: [] };
    for (var i = 0; i < recs.length; i++) {
      var p = recs[i].priority || 'low';
      if (!byPriority[p]) byPriority[p] = [];
      byPriority[p].push(recs[i]);
    }

    var order = ['critical', 'high', 'medium', 'low'];
    for (var o = 0; o < order.length; o++) {
      var p = order[o];
      if (!byPriority[p] || byPriority[p].length === 0) continue;
      lines.push('');
      lines.push('  [' + p.toUpperCase() + ']');
      for (var r = 0; r < byPriority[p].length; r++) {
        lines.push('    - ' + byPriority[p][r].message);
      }
    }
  }

  return lines.join('\n');
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  var exitCode = 0;

  console.log('Loading game data...');
  var GD = loadGameData();

  console.log('Building event registry...');
  var events = getAllEvents(GD);
  console.log('  Total events: ' + events.length);

  // Filter to specific section if requested
  var sections = {
    coverage: analyzeAreaCoverage,
    trigger: analyzeTriggerSpace,
    redundancy: analyzeRedundancy,
    weight: analyzeWeightDistribution,
    budget: analyzeBudgetFeasibility,
    exhaustion: analyzePoolExhaustion,
    recommendations: analyzeRecommendations,
  };

  var results = [];
  var criticalCount = 0;

  if (opts.section && sections[opts.section]) {
    results.push(sections[opts.section](events, GD));
  } else {
    var keys = Object.keys(sections);
    for (var i = 0; i < keys.length; i++) {
      results.push(sections[keys[i]](events, GD));
    }
  }

  // Count critical issues
  var output = results.join('\n\n');
  var critMatches = output.match(/\[CRITICAL\]/g);
  criticalCount = critMatches ? critMatches.length : 0;

  if (opts.json) {
    var jsonReport = {
      totalEvents: events.length,
      totalPool: events.filter(function (e) { return e._raw && e._raw.isPool !== false; }).length,
      coverage: getCoverageReport(events, GD),
      redundancy: detectRedundancy(events, 0.6),
      selection: simulateSelection(events, opts.iterations),
      budgetIssues: validateBudgetFeasibility(events),
      exhaustion: modelPoolExhaustion(events, [10, 25, 50, 100]),
      recommendations: generateRecommendations(
        getCoverageReport(events, GD),
        detectRedundancy(events, 0.6),
        simulateSelection(events, opts.iterations),
        validateBudgetFeasibility(events)
      ),
      criticalCount: criticalCount,
    };
    console.log(JSON.stringify(jsonReport, null, 2));
  } else if (opts.csv) {
    // CSV: event_id,category,area,weight,tier,quality_tier
    console.log('event_id,category,area,weight,tier,quality_tier');
    var poolEvents = events.filter(function (e) { return e._raw && e._raw.isPool !== false; });
    for (var j = 0; j < poolEvents.length; j++) {
      var ev = poolEvents[j];
      var areas = (ev.trigger && ev.trigger.areas ? ev.trigger.areas.join(';') : '');
      console.log(ev.id + ',' + ev._category + ',' + areas + ',' + ev.weight + ',' + ev.tier + ',' + ev.quality_tier);
    }
  } else {
    console.log('');
    console.log('========================================');
    console.log('EVENT COVERAGE ANALYSIS REPORT');
    console.log('========================================');
    console.log('');
    console.log(results.join('\n\n'));
    console.log('');
    console.log('========================================');
    console.log('CRITICAL ISSUES: ' + criticalCount);
    console.log('========================================');
  }

  if (opts.ci && criticalCount > 0) {
    console.log('\nCI mode: FAIL (found ' + criticalCount + ' critical issues)');
    process.exit(1);
  }

  if (criticalCount > 0) {
    process.exit(1);
  }
}

main().catch(function (err) {
  console.error('Analysis failed:', err);
  process.exitCode = 1;
});
