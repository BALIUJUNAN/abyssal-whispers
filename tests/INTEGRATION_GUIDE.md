# 难度系统集成指南

**完成时间**: 2026-06-17  
**版本**: v1.0  
**状态**: ✅ 集成完成  

---

## 📁 文件清单

### 配置文件
```
src/config/
├── difficulty.js           # 难度配置和工具函数
└── difficultyLevels.json   # 21级难度详细配置
```

### 组件文件
```
src/components/
├── DifficultySelect.jsx    # 难度选择界面组件
└── DifficultySelect.css    # 难度选择界面样式
```

### 状态管理
```
src/state/
└── difficultyState.js      # 难度状态管理
```

### 测试脚本
```
scripts/
├── sim28balance.cjs        # v1基准测试
├── sim28balance_v2.cjs     # v2 SAN保护
├── sim28balance_v3.cjs     # v3 双保护
├── sim28balance_final.cjs  # 4难度版本
└── sim28balance_21levels.cjs # 21级难度版本
```

### 测试文件
```
tests/
├── test_difficulty_integration.cjs  # 集成测试
├── BALANCE_ANALYSIS.md              # v1分析报告
├── BALANCE_COMPARISON.md            # v1 vs v2对比
├── BALANCE_V3_DIFFICULTY_REPORT.md  # v3多难度对比
├── FINAL_BALANCE_REPORT.md          # 最终报告
└── 21_LEVEL_DIFFICULTY_SYSTEM.md    # 21级难度文档
```

---

## 🚀 快速开始

### 1. 导入难度配置
```javascript
import { DIFFICULTY_LEVELS, getDifficultyConfig } from './config/difficulty.js';
import { applyDifficultyToState, applyDifficultyProtection } from './state/difficultyState.js';
```

### 2. 使用难度选择组件
```jsx
import DifficultySelect from './components/DifficultySelect.jsx';
import './components/DifficultySelect.css';

function App() {
  const [difficulty, setDifficulty] = useState(1);
  
  return (
    <DifficultySelect 
      onSelect={(level) => setDifficulty(level)}
      currentLevel={difficulty}
    />
  );
}
```

### 3. 应用难度到游戏状态
```javascript
// 在游戏初始化时
const initialState = createInitialState();
const stateWithDifficulty = applyDifficultyToState(initialState, difficultyLevel);

// 在处理SAN损失时
function handleSanLoss(baseLoss, day, state) {
  const protectedLoss = applyDifficultyProtection(baseLoss, day, state);
  return protectedLoss;
}
```

---

## 🎮 难度系统特性

### 21级难度梯度
- Level 1-3: 基础难度（普通/困难/噩梦）
- Level 4-9: 进阶难度
- Level 10-15: 硬核难度
- Level 16-21: 极限难度（Level 21 = v1原版）

### 保护机制
- **SAN保护**: 根据难度级别减少SAN损失
- **HP保护**: 根据难度级别减少HP损失
- **安全区**: 低难度前几天禁止访问高危险区域
- **损失上限**: 限制单次/每日最大损失

### 难度参数
```javascript
// Level 1 (普通)
{
  protection: 0.35,      // SAN/HP损失减少65%
  maxSanLoss: 3,         // 单次最大SAN损失
  safeZoneDays: 6        // Day 1-6: 安全区
}

// Level 21 (v1原版)
{
  protection: 1.0,       // 无保护
  maxSanLoss: 999,       // 无限制
  safeZoneDays: 0        // 无安全区
}
```

---

## 📊 测试验证

### 运行集成测试
```bash
node tests/test_difficulty_integration.cjs
```

### 运行平衡性测试
```bash
# 测试单个难度
node scripts/sim28balance_final.cjs --difficulty normal --runs 1000 --seed 42

# 测试所有难度
for level in 1 3 6 9 12 15 18 21; do
  node scripts/sim28balance_21levels.cjs --level $level --runs 500 --seed 42
done

# 生成详细报告
node scripts/sim28balance_final.cjs --difficulty normal --runs 1000 --seed 42 --report output.json --phase-detail
```

---

## 🎯 难度选择界面

### 界面特性
- **21级难度**: 从Level 1到Level 21
- **分类显示**: 基础/进阶/硬核/极限
- **实时预览**: 悬停显示难度详情
- **响应式设计**: 支持移动端

### 使用方法
```jsx
<DifficultySelect 
  onSelect={(level) => {
    // 保存难度选择
    saveDifficulty(level);
    // 应用到游戏状态
    const newState = applyDifficultyToState(gameState, level);
    // 开始游戏
    startGame(newState);
  }}
  currentLevel={savedDifficulty}
/>
```

---

## 🔧 集成步骤

### 步骤1: 复制文件
```bash
# 复制配置文件
cp src/config/difficulty.js /path/to/game/src/config/
cp src/config/difficultyLevels.json /path/to/game/src/config/

# 复制组件
cp src/components/DifficultySelect.jsx /path/to/game/src/components/
cp src/components/DifficultySelect.css /path/to/game/src/components/

# 复制状态管理
cp src/state/difficultyState.js /path/to/game/src/state/
```

### 步骤2: 导入组件
```javascript
// 在主游戏文件中
import DifficultySelect from './components/DifficultySelect.jsx';
import { applyDifficultyToState } from './state/difficultyState.js';
```

### 步骤3: 添加难度选择界面
```jsx
// 在游戏开始界面
function GameStart() {
  const [showDifficulty, setShowDifficulty] = useState(false);
  
  return (
    <div>
      {showDifficulty ? (
        <DifficultySelect onSelect={handleDifficultySelect} />
      ) : (
        <button onClick={() => setShowDifficulty(true)}>
          选择难度
        </button>
      )}
    </div>
  );
}
```

### 步骤4: 应用难度保护
```javascript
// 在事件处理中
function handleEvent(event, state) {
  if (event.san_loss) {
    const protectedLoss = applyDifficultyProtection(
      event.san_loss, 
      state.day, 
      state
    );
    state.san -= protectedLoss;
  }
}
```

---

## 📈 难度曲线

```
Level  1: ████████████████████ 25-35% (普通)
Level  3: ████████████ 8-12% (噩梦)
Level  6: ████████████ 12-15% (挑战)
Level  9: ████████████ 6-8% (硬核)
Level 12: ████████████ 3-4% (专家)
Level 15: ████████████ 2-3% (大师)
Level 18: ████████████ 2-3% (传说)
Level 21: ████████████ 2-3% (v1原版)
```

---

## ✅ 验证清单

- [x] 难度配置文件创建
- [x] 难度选择组件创建
- [x] 状态管理集成
- [x] 集成测试通过
- [x] 平衡性测试完成
- [x] 文档完整

---

## 🎉 集成完成！

难度系统已成功集成到游戏中：

1. **21级难度系统**: 从休闲到噩梦的完整梯度
2. **难度选择界面**: 美观易用的UI组件
3. **状态管理**: 完整的难度状态管理
4. **保护机制**: SAN/HP双重保护
5. **测试验证**: 所有集成测试通过

**系统就绪，可以发布！** 🚀
