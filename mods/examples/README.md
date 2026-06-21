# 官方示例模组

本目录包含 6 个官方示例模组，覆盖三种核心 Mod 类型。

## 快速导航

| Mod | 类型 | 难度 | 事件数 | 说明 |
|------|------|------|--------|------|
| [简单事件](#1-simple_event--纯叙事事件) | 事件扩展 | ★☆☆ | 1 | 最基本的纯叙事事件 |
| [分支选择](#2-branch_choice--分支选择事件) | 事件扩展 | ★☆☆ | 1 | 3 选项分支叙事 |
| [连锁任务](#3-chain_quest--连锁任务) | 事件扩展 | ★★☆ | 2 | 两阶段任务链 |
| [新增NPC：老灯塔看守人](#4-新增npc老灯塔看守人) | 事件扩展 | ★★★ | 6 | 完整 NPC 任务链 |
| [新区域：废弃灯塔区](#5-新区域废弃灯塔区) | 区域扩展 | ★★★ | 9 | 新区域 + 多路径探索 |
| [难度曲线：专家模式](#6-难度曲线专家模式) | 难度调整 | ★★★ | 3 | difficulty_modifiers 演示 |

## 如何使用

1. 在游戏主菜单进入游戏
2. 点击顶部 **🧩 模组管理** 按钮
3. 点击 **导入模组**，选择对应的 JSON 文件
4. 导入后默认禁用，点击 **启用** 即可
5. 启用后，模组中的事件会自动加入事件池

---

## 1. simple_event — 纯叙事事件

**文件：** `simple_event.json`

**结构要点：**
- `choices: []` — 无选项，玩家只读不选
- `once_per_run: true` — 每轮只触发一次
- `effects: { san: -1 }` — 最简单的效果（SAN-1）

**适合场景：** 氛围营造、环境叙事、线索发现。

## 2. branch_choice — 分支选择事件

**文件：** `branch_choice.json`

**结构要点：**
- `choices` 数组包含 3 个选项，每个有独立的 `effects`
- 选项效果包括：`food`（食物）、`humanity`（人性值）、`npc_trust`（NPC信任）、`money`（金钱）、`add_clue`（添加线索）
- `add_run_memory` 可以在玩家的笔记本中添加记录

**适合场景：** 道德抉择、NPC互动、资源管理。

## 3. chain_quest — 连锁任务

**文件：** `chain_quest.json`

**结构要点：**
- 第一个事件使用 `add_flag` 设置标记
- 第二个事件使用 `requires_flags` 检查标记
- 只有完成了第一个事件，第二个才会出现
- 第二个事件可以给予更好的奖励（线索、SAN恢复）

**适合场景：** 任务链、多步骤调查、NPC任务。

---

## 4. 新增NPC：老灯塔看守人

**文件：** `add-npc-lighthouse-keeper/mod.json`

6 个事件的完整 NPC 任务链：初次相遇 → 帮助修灯 → 发现真相 → 道德抉择 → 结局分支。

详见该目录下的 [README.md](add-npc-lighthouse-keeper/README.md)。

### 任务链流程

```
[1] 熄灭的灯塔 (area_deep)
  ├── 询问经过 → 线索 + 记忆
  ├── 提出帮忙 → flag → 进入任务链
  └── 离开 → 可后续重触
       ↓
[2] 灯塔顶部的镜子 (area_deep, requires flag)
  ├── 检查镜子 → 铭文线索
  ├── 带走镜子 → 物品
  └── 离开镜子 → 碎裂线索
       ↓
[3] 看守人的真相 (npc_cross, requires flag)
  ├── 同意帮忙 → flag + 煤油灯
  └── 拒绝 → 不同分支
       ↓
[4] 重新点亮灯塔 (area_deep, 高潮)
  └── SAN -4, 获得信物
       ↓
[5] 看守人的告别 (area_deep, midnight)
  └── 两种结局选择
       ↓
[6] 码头上的回声 (silent, once_ever)
  └── 氛围收尾
```

## 5. 新区域：废弃灯塔区

**文件：** `new-area-lighthouse/mod.json`

9 个事件的新区域扩展，包含探索发现、深层调查、资源获取、氛围事件。

详见该目录下的 [README.md](new-area-lighthouse/README.md)。

### 事件类型分布

| 类型 | 数量 | 说明 |
|------|------|------|
| exploration | 1 | 区域发现入口 |
| area_deep | 5 | 区域深层事件（喷泉、钟楼、管理所、铭文、十字路口） |
| resource_pressure | 2 | 物资获取 + 恐怖遭遇 |
| silent | 1 | 夜间氛围 |

### 联动需求

需要同时安装「老灯塔看守人」NPC Mod 才能完整体验。

## 6. 难度曲线：专家模式

**文件：** `difficulty-expert/mod.json`

难度调整 + 专属事件。在难度 8 级以上自动生效。

详见该目录下的 [README.md](difficulty-expert/README.md)。

### 难度调整

| 调整 | 效果 |
|------|------|
| 文本腐化 | ×2 倍速 |
| NPC 信任 | 仅 30% 增长 |
| 文本替换 | 6 组（更压抑措辞） |

---

## 字段参考速查

### trigger（触发条件）

| 字段 | 类型 | 说明 |
|------|------|------|
| `areas` | `string[]` | 可触发的区域 ID |
| `probability` | `number` | 触发概率 (0-1) |
| `once_per_run` | `boolean` | 每轮只触发一次 |
| `once_ever` | `boolean` | 全局只触发一次 |
| `min_loop` | `number` | 最低轮回次数 |
| `san_lte` | `number` | SAN 值上限 |
| `time_phase` | `string[]` | 可触发时段 |
| `requires_flags` | `string[]` | 需要的标记 |
| `npc_alive` | `string[]` | 需要存活的 NPC |

### effects（效果）

| 字段 | 类型 | 说明 |
|------|------|------|
| `san` | `number` | SAN 值变化 |
| `hp` | `number` | 生命值变化 |
| `food` | `number` | 食物变化 |
| `money` | `number` | 金钱变化 |
| `humanity` | `number` | 人性值变化 |
| `mythos` | `number` | 神话知识增加 |
| `npc_trust` | `object` | NPC信任变化 |
| `add_clue` | `string\|object` | 添加线索 |
| `add_flag` | `string` | 设置标记 |
| `add_item` | `string\|object` | 添加物品 |
| `add_run_memory` | `string` | 添加到笔记本 |

### difficulty_modifiers（难度调整）

| 字段 | 类型 | 说明 |
|------|------|------|
| `min_difficulty` | `number` | 生效的最低难度 (1-21) |
| `max_difficulty` | `number` | 生效的最高难度 (1-21) |
| `text_corruption_boost` | `number` | 文本腐化倍率 (0-5) |
| `npc_trust_multiplier` | `number` | NPC 信任倍率 (0-2) |
| `custom_text_swaps` | `Array<{find,replace}>` | 全局文本替换 |

## 命名规范

- 事件 ID：`<mod_prefix>_<type>_<序号>`（如 `lh_keeper_intro_001`）
- 线索 ID：`clue_<mod_prefix>_<描述>`
- 标记 ID：`flag_<mod_prefix>_<描述>`
- 避免使用 `meta_`、`loop_`、`ending_` 等官方前缀

## 完整开发指南

详见项目根目录下的 [docs/mod-guide.md](../../docs/mod-guide.md)。
