#!/usr/bin/env node
/**
 * tests/run_all.cjs — 统一测试入口
 * 用法: node tests/run_all.cjs
 *       npm test
 *
 * 按顺序运行所有 CJS 测试套件，汇总结果后以 exit code 报告成败。
 */

const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const SUITES = [
  { file: 'tests/test_effect_protocol.cjs', label: 'effect_protocol' },
  { file: 'tests/test_game_data_protocol.cjs', label: 'game_data_protocol' },
  { file: 'tests/test_event_system.cjs', label: 'event_system' },
  { file: 'tests/test_smoke_flows.cjs', label: 'smoke_flows' },
  { file: 'tests/test_reincarnation_core.cjs', label: 'reincarnation' },
  { file: 'tests/test_reincarnation_player_sim.cjs', label: 'reincarnation_player_sim' },
  { file: 'tests/integration_test.cjs', label: 'integration' },
];

let totalPassed = 0;
let totalFailed = 0;
let suiteResults = [];

for (const suite of SUITES) {
  const fullPath = path.join(ROOT, suite.file);
  const fs = require('fs');
  if (!fs.existsSync(fullPath)) {
    console.log(`  [SKIP] ${suite.label} — ${suite.file} not found`);
    suiteResults.push({ label: suite.label, status: 'SKIP' });
    continue;
  }

  const result = spawnSync('node', [fullPath], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 30000,
  });

  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  const output = (stdout + stderr).trim();
  const exitCode = result.status;

  // Try to extract pass/fail counts from output
  const passMatch = output.match(/(\d+)\s*passed/i);
  const failMatch = output.match(/(\d+)\s*failed/i);
  const passed = passMatch ? parseInt(passMatch[1], 10) : 0;
  const failed = failMatch ? parseInt(failMatch[1], 10) : 0;

  totalPassed += passed;
  totalFailed += failed;

  const status = exitCode === 0 ? 'PASS' : 'FAIL';
  const statusIcon = exitCode === 0 ? '✅' : '❌';
  const detail = `${passed} passed, ${failed} failed`;

  console.log(`  ${statusIcon} ${suite.label.padEnd(22)} ${detail}`);
  suiteResults.push({ label: suite.label, status, passed, failed });

  // On failure, show last few lines of output for diagnosis
  if (exitCode !== 0) {
    const lines = output.split('\n').filter((l) => l.trim());
    for (const line of lines.slice(-5)) {
      console.log(`     ${line}`);
    }
  }
}

console.log('');
console.log(`  ${totalPassed} passed, ${totalFailed} failed — ${suiteResults.length} suites`);

const anyFailed = suiteResults.some((r) => r.status === 'FAIL');
if (anyFailed) {
  console.log('\n  ❌ TEST SUITE FAILED');
  process.exit(1);
} else {
  console.log('\n  ✅ ALL TESTS PASSED');
  process.exit(0);
}
