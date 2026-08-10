// tests/test_difficulty_integration.cjs
// 难度系统集成测试

import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    console.log('  FAIL: ' + name + ' -> ' + e.message);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

console.log('=== 难度系统集成测试 ===\n');

// 测试1: 难度配置文件
console.log('1. 测试难度配置文件');
test('difficulty.js 存在', () => {
  const filePath = path.join(ROOT, 'src/config/difficulty.js');
  assert(fs.existsSync(filePath), 'File not found: ' + filePath);
});

test('difficulty.js 可读取', () => {
  const content = fs.readFileSync(path.join(ROOT, 'src/config/difficulty.js'), 'utf8');
  assert(content.includes('DIFFICULTY_LEVELS'), 'Missing DIFFICULTY_LEVELS');
  assert(content.includes('getDifficultyConfig'), 'Missing getDifficultyConfig');
});

// 测试2: 难度选择组件
console.log('\n2. 测试难度选择组件');
test('DifficultySelect.jsx 存在', () => {
  const filePath = path.join(ROOT, 'src/components/DifficultySelect.jsx');
  assert(fs.existsSync(filePath), 'File not found: ' + filePath);
});

test('DifficultySelect.css 存在', () => {
  const filePath = path.join(ROOT, 'src/components/DifficultySelect.css');
  assert(fs.existsSync(filePath), 'File not found: ' + filePath);
});

test('角色创建页使用难度配置的实际展示字段', () => {
  const content = fs.readFileSync(path.join(ROOT, 'src/components/GameScreens.jsx'), 'utf8');
  assert(content.includes('diffConfig.expected_survival'), 'Missing expected_survival display');
  assert(content.includes('diffConfig.expected_days'), 'Missing expected_days display');
  assert(!content.includes('diffConfig.survival}'), 'Uses nonexistent survival field');
});

// 测试3: 状态管理
console.log('\n3. 测试状态管理');
test('difficultyState.js 存在', () => {
  const filePath = path.join(ROOT, 'src/state/difficultyState.js');
  assert(fs.existsSync(filePath), 'File not found: ' + filePath);
});

test('difficultyState.js 可读取', () => {
  const content = fs.readFileSync(path.join(ROOT, 'src/state/difficultyState.js'), 'utf8');
  assert(content.includes('applyDifficultyToState'), 'Missing applyDifficultyToState');
  assert(content.includes('applyDifficultyProtection'), 'Missing applyDifficultyProtection');
});

// 测试4: 当前维护的模拟测试入口
console.log('\n4. 测试模拟测试脚本');
test('simulate_loops.cjs 存在', () => {
  const filePath = path.join(ROOT, 'scripts/simulate_loops.cjs');
  assert(fs.existsSync(filePath), 'File not found: ' + filePath);
});

test('package.json 使用当前模拟器入口', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert(pkg.scripts?.['simulate:loops'] === 'node scripts/simulate_loops.cjs', 'simulate:loops points to an archived simulator');
});

// 测试5: 配置文件
console.log('\n5. 测试配置文件');
test('difficultyLevels.json 存在', () => {
  const filePath = path.join(ROOT, 'src/config/difficultyLevels.json');
  assert(fs.existsSync(filePath), 'File not found: ' + filePath);
});

test('difficultyLevels.json 可解析', () => {
  const content = fs.readFileSync(path.join(ROOT, 'src/config/difficultyLevels.json'), 'utf8');
  const config = JSON.parse(content);
  assert(Object.keys(config).length === 13, 'Expected 13 difficulty levels');
});

// 测试6: 报告文件
console.log('\n6. 测试报告文件');
test('BALANCE_ANALYSIS.md 存在', () => {
  const filePath = path.join(ROOT, 'docs/reports/BALANCE_ANALYSIS.md');
  assert(fs.existsSync(filePath), 'File not found: ' + filePath);
});

test('FINAL_BALANCE_REPORT.md 存在', () => {
  const filePath = path.join(ROOT, 'docs/reports/FINAL_BALANCE_REPORT.md');
  assert(fs.existsSync(filePath), 'File not found: ' + filePath);
});

test('21_LEVEL_DIFFICULTY_SYSTEM.md 存在', () => {
  const filePath = path.join(ROOT, 'docs/reports/21_LEVEL_DIFFICULTY_SYSTEM.md');
  assert(fs.existsSync(filePath), 'File not found: ' + filePath);
});

// 输出结果
console.log('\n' + '='.repeat(50));
console.log('测试结果: ' + passed + ' 通过, ' + failed + ' 失败');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('='.repeat(50));

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\n✅ 所有测试通过！');
}
