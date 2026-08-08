#!/usr/bin/env node
/**
 * tests/run_all.mjs — 统一测试入口
 * 用法: node tests/run_all.mjs
 *       npm test
 *
 * 按顺序运行所有测试套件，汇总结果后以 exit code 报告成败。
 */

import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const SUITES = [
  { file: 'tests/test_effect_protocol.mjs', label: 'effect_protocol' },
  { file: 'tests/test_game_data_protocol.mjs', label: 'game_data_protocol' },
  { file: 'tests/test_event_system.mjs', label: 'event_system' },
  { file: 'tests/test_smoke_flows.mjs', label: 'smoke_flows' },
  { file: 'tests/test_reincarnation_core.mjs', label: 'reincarnation' },
  { file: 'tests/test_reincarnation_player_sim.mjs', label: 'reincarnation_player_sim' },
  { file: 'tests/test_ending_reachability.mjs', label: 'ending_reachability' },
  { file: 'tests/test_player_experience_loop.mjs', label: 'player_experience' },
  { file: 'tests/test_combineSlices.mjs', label: 'combineSlices' },
  { file: 'tests/test_phase2_features.mjs', label: 'phase2_features' },
  { file: 'tests/test_balance_system.mjs', label: 'balance_system' },
  { file: 'tests/test_achievement_reducer.mjs', label: 'achievement_reducer' },
  { file: 'tests/test_chapter_reducer.mjs', label: 'chapter_reducer' },
  { file: 'tests/integration_test.mjs', label: 'integration' },
  { file: 'tests/test_difficulty_integration.mjs', label: 'difficulty_integration' },
  { file: 'tests/test_full_flow.mjs', label: 'full_flow' },
  { file: 'tests/test_save_security.mjs', label: 'save_security' },
  { file: 'tests/test_regressions.mjs', label: 'regressions' },
];

let totalPassed = 0;
let totalFailed = 0;
let suiteResults = [];

for (const suite of SUITES) {
  const fullPath = join(ROOT, suite.file);
  if (!fs.existsSync(fullPath)) {
    console.log('  [SKIP] ' + suite.label + ' — ' + suite.file + ' not found');
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
  const detail = passed + ' passed, ' + failed + ' failed';

  console.log('  ' + statusIcon + ' ' + suite.label.padEnd(22) + ' ' + detail);
  suiteResults.push({ label: suite.label, status, passed, failed });

  // On failure, show last few lines of output for diagnosis
  if (exitCode !== 0) {
    const lines = output.split('\n').filter((l) => l.trim());
    for (const line of lines.slice(-5)) {
      console.log('     ' + line);
    }
  }
}

console.log('');
console.log('  ' + totalPassed + ' passed, ' + totalFailed + ' failed — ' + suiteResults.length + ' suites');

const anyFailed = suiteResults.some((r) => r.status === 'FAIL');
if (anyFailed) {
  console.log('\n  ❌ TEST SUITE FAILED');
  process.exit(1);
} else {
  console.log('\n  ✅ ALL TESTS PASSED');
  process.exit(0);
}
