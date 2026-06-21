// scripts/benchmark/runBenchmarks.cjs — Performance benchmark runner
//
// Usage:
//   node scripts/benchmark/runBenchmarks.cjs              # all suites
//   node scripts/benchmark/runBenchmarks.cjs --suite reducer
//   node scripts/benchmark/runBenchmarks.cjs --suite loop
//   node scripts/benchmark/runBenchmarks.cjs --suite full
//   node scripts/benchmark/runBenchmarks.cjs --iterations 5000
//
// Output: JSON to stdout, human-readable to stderr.
// CI integration: parse JSON for regression detection.

const path = require('path');
const fs = require('fs');

var SUITES_DIR = path.join(__dirname, 'suites');
var ITERATIONS = parseInt(process.argv.find(function (a) { return a.startsWith('--iterations='); })?.split('=')[1]) || 1000;
var FILTER = process.argv.find(function (a) { return a.startsWith('--suite='); })?.split('=')[1] || null;

// ═══════════════════════════════════════════════════════════════
// Benchmark harness
// ═══════════════════════════════════════════════════════════════

function benchmark(name, fn, iterations) {
  iterations = iterations || ITERATIONS;
  // Warmup (JIT, cache)
  for (var w = 0; w < Math.min(100, iterations / 10); w++) fn();

  // Timed run
  var start = process.hrtime.bigint();
  for (var i = 0; i < iterations; i++) {
    fn();
  }
  var end = process.hrtime.bigint();
  var totalNs = end - start;
  var totalMs = Number(totalNs) / 1e6;
  var perOp = Number(totalNs) / iterations;

  return {
    name: name,
    iterations: iterations,
    total_ms: Math.round(totalMs * 100) / 100,
    per_op_ns: Math.round(perOp),
    per_op_us: Math.round(perOp / 1000 * 100) / 100,
    ops_per_sec: Math.round(1e9 / perOp),
  };
}

function report(result) {
  console.error(
    '  ' + result.name.padEnd(40) +
    result.iterations.toString().padStart(8) + ' ops  ' +
    result.per_op_us.toString().padStart(8) + ' us/op  ' +
    result.ops_per_sec.toString().padStart(10) + ' ops/s'
  );
  return result;
}

// ═══════════════════════════════════════════════════════════════
// Load benchmark suites
// ═══════════════════════════════════════════════════════════════

function loadSuites() {
  var files = fs.readdirSync(SUITES_DIR).filter(function (f) { return f.endsWith('.cjs'); });
  var suites = [];
  files.forEach(function (f) {
    var full = path.join(SUITES_DIR, f);
    var mod = require(full);
    if (mod && mod.name && mod.run) {
      suites.push(mod);
    }
  });
  return suites;
}

// ═══════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════

var suites = loadSuites();
if (suites.length === 0) {
  console.error('No benchmark suites found in ' + SUITES_DIR);
  process.exit(1);
}

if (FILTER) {
  suites = suites.filter(function (s) { return s.name.toLowerCase().indexOf(FILTER.toLowerCase()) >= 0; });
  if (suites.length === 0) {
    console.error('No suites matching filter: ' + FILTER);
    process.exit(1);
  }
}

console.error('\n══════════════════════════════════════════════');
console.error(' Performance Benchmarks  (' + ITERATIONS + ' iterations each)');
console.error('══════════════════════════════════════════════\n');

var results = [];
var suiteErrors = [];

suites.forEach(function (suite) {
  console.error('── ' + suite.name + ' ──');
  try {
    var fn = suite.run();
    if (Array.isArray(fn)) {
      fn.forEach(function (f) {
        if (f && typeof f.fn === 'function') {
          var r = benchmark(f.name || suite.name, f.fn, f.iterations);
          results.push(report(r));
        }
      });
    } else if (typeof fn === 'function') {
      var r = benchmark(suite.name, fn);
      results.push(report(r));
    } else if (fn && typeof fn === 'object') {
      Object.keys(fn).forEach(function (key) {
        var r = benchmark(key, fn[key]);
        results.push(report(r));
      });
    }
  } catch (e) {
    console.error('  ERROR: ' + e.message);
    suiteErrors.push({ suite: suite.name, error: e.message });
  }
  console.error('');
});

// ═══════════════════════════════════════════════════════════════
// JSON output (for CI / regression detection)
// ═══════════════════════════════════════════════════════════════

var output = {
  timestamp: new Date().toISOString(),
  iterations_per_suite: ITERATIONS,
  suites_run: suites.length,
  suite_errors: suiteErrors,
  results: results,
};

process.stdout.write(JSON.stringify(output, null, 2) + '\n');

if (suiteErrors.length > 0) {
  process.exit(1);
}
