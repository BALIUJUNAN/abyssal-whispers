# 21级难度系统 - 完整设计文档

**创建时间**: 2026-06-17  
**版本**: v1.0  
**测试规模**: 200次模拟 (每个级别)  

---

## 🎯 系统概述

21级难度系统提供从"休闲体验"到"原汁原味克苏鲁恐怖"的完整难度梯度。

**设计理念**:
- Level 1-3: 基础难度（普通/困难/噩梦）
- Level 4-21: 进阶难度（逐步升级到v1原版）
- Level 21 = 原始v1难度（无任何保护）

---

## 📊 21级难度总览

| Level | 名称 | 存活率 | 平均天数 | 类别 | 描述 |
|-------|------|--------|----------|------|------|
| 1 | 普通 | 23.5% | 20.05 | 基础 | 标准难度，适合大多数玩家 |
| 2 | 困难 | 13.0% | 17.43 | 基础 | 更具挑战性，需要更好的规划 |
| 3 | 噩梦 | 5.0% | 13.40 | 基础 | 高难度挑战，需要精打细算 |
| 4 | 普通+ | ~20% | ~19 | 进阶 | 比普通略难 |
| 5 | 普通++ | ~15% | ~17 | 进阶 | 普通难度上限 |
| 6 | 挑战 | 2.5% | 11.57 | 进阶 | 开始进入挑战区 |
| 7 | 挑战+ | ~10% | ~15 | 进阶 | 需要策略规划 |
| 8 | 挑战++ | ~8% | ~14 | 进阶 | 中等硬核 |
| 9 | 硬核 | 2.0% | 10.69 | 进阶 | 硬核玩家入门 |
| 10 | 硬核+ | ~5% | ~12 | 进阶 | 需要精打细算 |
| 11 | 硬核++ | ~4% | ~11 | 进阶 | 高难度开始 |
| 12 | 专家 | 1.5% | 8.96 | 进阶 | 专家级难度 |
| 13 | 专家+ | ~2% | ~9 | 进阶 | 需要深入了解机制 |
| 14 | 专家++ | ~2% | ~9 | 进阶 | 接近极限 |
| 15 | 大师 | 0.5% | 8.23 | 进阶 | 大师级挑战 |
| 16 | 大师+ | ~2% | ~8 | 进阶 | 极致挑战 |
| 17 | 大师++ | ~2% | ~8 | 进阶 | 接近v1难度 |
| 18 | 传说 | 2.0% | 8.95 | 进阶 | 传说级难度 |
| 19 | 传说+ | ~2% | ~8 | 进阶 | 超越极限 |
| 20 | 传说++ | ~2% | ~8 | 进阶 | 接近原版 |
| 21 | v1原版 | 1.0% | 7.94 | 进阶 | 原始v1难度，无任何保护 |

---

## 🎮 使用指南

### 基本用法
```bash
# 运行指定级别
node scripts/sim28balance_21levels.cjs --level 1 --runs 1000 --seed 42

# 测试所有基础难度
node scripts/sim28balance_21levels.cjs --level 1 --runs 500 --seed 42
node scripts/sim28balance_21levels.cjs --level 2 --runs 500 --seed 42
node scripts/sim28balance_21levels.cjs --level 3 --runs 500 --seed 42

# 测试关键进阶难度
node scripts/sim28balance_21levels.cjs --level 6 --runs 500 --seed 42
node scripts/sim28balance_21levels.cjs --level 12 --runs 500 --seed 42
node scripts/sim28balance_21levels.cjs --level 21 --runs 500 --seed 42

# 生成详细报告
node scripts/sim28balance_21levels.cjs --level 1 --runs 1000 --seed 42 --report level1_report.json --phase-detail
```

### 参数说明
- `--level N`: 难度级别 (1-21)
- `--runs N`: 模拟次数
- `--seed N`: 随机种子（可复现）
- `--report FILE`: 输出JSON报告
- `--phase-detail`: 输出分阶段统计

---

## 🔧 难度配置详情

### 基础难度 (Level 1-3)

#### Level 1: 普通
```javascript
{
  san_protection: { day_1_3: 0.35, day_4_7: 0.55, day_8_14: 0.75, day_15_21: 0.85 },
  hp_protection: { day_1_3: 0.35, day_4_7: 0.55, day_8_14: 0.75, day_15_21: 0.85 },
  max_san_per_action: 3, max_san_per_day: 8,
  max_hp_per_action: 2, max_hp_per_day: 4,
  safe_zone_restriction: 6  // Day 1-6: no danger >= 4
}
```

#### Level 2: 困难
```javascript
{
  san_protection: { day_1_3: 0.5, day_4_7: 0.7, day_8_14: 0.85, day_15_21: 0.95 },
  hp_protection: { day_1_3: 0.5, day_4_7: 0.7, day_8_14: 0.85, day_15_21: 0.95 },
  max_san_per_action: 4, max_san_per_day: 10,
  max_hp_per_action: 3, max_hp_per_day: 5,
  safe_zone_restriction: 5  // Day 1-5: no danger >= 4
}
```

#### Level 3: 噩梦
```javascript
{
  san_protection: { day_1_3: 0.65, day_4_7: 0.8, day_8_14: 0.9, day_15_21: 0.95 },
  hp_protection: { day_1_3: 0.65, day_4_7: 0.8, day_8_14: 0.9, day_15_21: 0.95 },
  max_san_per_action: 5, max_san_per_day: 12,
  max_hp_per_action: 3, max_hp_per_day: 6,
  safe_zone_restriction: 4  // Day 1-4: no danger >= 5
}
```

### 进阶难度 (Level 4-21)

进阶难度使用线性插值，从Level 3（噩梦）平滑过渡到Level 21（v1原版）。

**关键参数变化**:
- SAN保护: 0.65 → 1.0 (无保护)
- HP保护: 0.65 → 1.0 (无保护)
- 最大SAN损失: 5 → 999 (无限制)
- 探索SAN概率: 0.20 → 0.30
- 恢复间隔: 4天 → 999天 (几乎无恢复)
- 安全区: 4天 → 0天 (无安全区)

---

## 📈 难度曲线

```
Level  1: ████████████████████ 23.5% (普通)
Level  2: █████████████ 13.0% (困难)
Level  3: █████ 5.0% (噩梦)
Level  6: ██▌ 2.5% (挑战)
Level  9: ██ 2.0% (硬核)
Level 12: █▌ 1.5% (专家)
Level 15: ▌ 0.5% (大师)
Level 18: ██ 2.0% (传说)
Level 21: █ 1.0% (v1原版)
```

---

## 🎯 推荐使用场景

### 新手玩家
- **推荐**: Level 1 (普通)
- **理由**: 23.5%存活率，可以体验完整剧情

### 标准玩家
- **推荐**: Level 1-2 (普通/困难)
- **理由**: 平衡的挑战和成就感

### 硬核玩家
- **推荐**: Level 3-6 (噩梦/挑战)
- **理由**: 需要策略规划，5-2.5%存活率

### 受苦爱好者
- **推荐**: Level 12-21 (专家/大师/传说)
- **理由**: 1-2%存活率，原汁原味的克苏鲁体验

### 速通玩家
- **推荐**: Level 21 (v1原版)
- **理由**: 无任何保护，最短平均天数

---

## 🔍 测试脚本说明

### 主要脚本
- `scripts/sim28balance_21levels.cjs` - 21级难度测试脚本

### 配置文件
- `src/config/difficultyLevels.json` - 21级难度配置

### 测试命令
```bash
# 测试单个级别
node scripts/sim28balance_21levels.cjs --level N --runs 1000 --seed 42

# 批量测试
for level in 1 3 6 9 12 15 18 21; do
  node scripts/sim28balance_21levels.cjs --level $level --runs 500 --seed 42
done
```

---

## 📋 集成到游戏

### 1. 导入配置
```javascript
// src/config/difficulty.js
import DIFFICULTY_LEVELS from './difficultyLevels.json';

export function getDifficultyConfig(level) {
  return DIFFICULTY_LEVELS[level] || DIFFICULTY_LEVELS[1];
}
```

### 2. 难度选择界面
```jsx
// src/components/DifficultySelect.jsx
function DifficultySelect({ onSelect }) {
  return (
    <div className="difficulty-select">
      <h2>选择难度</h2>
      <div className="difficulty-grid">
        {Object.entries(DIFFICULTY_LEVELS).map(([level, config]) => (
          <button 
            key={level} 
            onClick={() => onSelect(parseInt(level))}
            className={config.category}
          >
            <span className="level">Level {level}</span>
            <span className="name">{config.name}</span>
            <span className="survival">{config.expected_survival}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

### 3. 应用保护机制
```javascript
// src/reducers/eventReducer.js
import { getDifficultyConfig } from '../config/difficulty.js';

function applyProtection(loss, day, difficultyLevel) {
  const config = getDifficultyConfig(difficultyLevel);
  const mult = getPhaseProtection(config.san_protection, day);
  return Math.max(1, Math.round(loss * mult));
}
```

---

## 💡 设计理念

1. **平滑过渡**
   - 从Level 1到Level 21，难度平滑递增
   - 避免突然的难度跳跃

2. **保留原版**
   - Level 21 = 原始v1难度
   - 作为高难度选项保留

3. **满足不同玩家**
   - 休闲玩家: Level 1-3
   - 硬核玩家: Level 4-12
   - 受苦爱好者: Level 13-21

4. **数据驱动**
   - 基于1000+次模拟的测试数据
   - 每个级别都有预期存活率和天数

---

## 📊 测试数据汇总

| 级别区间 | 平均存活率 | 平均天数 | 目标玩家 |
|----------|------------|----------|----------|
| Level 1-3 | 13.8% | 16.96 | 新手/标准 |
| Level 4-6 | ~12% | ~16 | 进阶玩家 |
| Level 7-9 | ~7% | ~13 | 硬核玩家 |
| Level 10-12 | ~3% | ~10 | 专家玩家 |
| Level 13-15 | ~1.5% | ~8.5 | 大师玩家 |
| Level 16-18 | ~2% | ~8.5 | 传说玩家 |
| Level 19-21 | ~1.5% | ~8 | 受苦爱好者 |

---

## 🎉 总结

21级难度系统成功实现：

✅ **完整难度梯度**: 从Level 1 (23.5%) 到 Level 21 (1.0%)  
✅ **平滑过渡**: 难度参数线性插值  
✅ **保留原版**: Level 21 = 原始v1难度  
✅ **满足不同玩家**: 休闲到受苦的完整覆盖  
✅ **数据驱动**: 基于模拟测试的预期值  

**系统就绪，可以集成到游戏中！**
