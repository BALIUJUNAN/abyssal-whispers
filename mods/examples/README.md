# 官方示例模组

本目录包含 3 个官方示例模组，用于展示模组系统的基本结构。

## 如何使用

1. 在游戏主菜单进入"模组工坊"（或在设置中找到"社区模组"）。
2. 点击"导入模组"，选择对应的 JSON 文件。
3. 导入后默认禁用，点击"启用"即可。
4. 启用后，模组中的事件会自动加入事件池，在满足触发条件时出现。

## 示例列表

### 1. simple_event.json — 纯叙事事件

**结构要点：**
- `choices: []` — 无选项，玩家只读不选
- `once_per_run: true` — 每轮只触发一次
- `effects: { san: -1 }` — 最简单的效果（SAN-1）

**适合场景：** 氛围营造、环境叙事、线索发现。

### 2. branch_choice.json — 分支选择事件

**结构要点：**
- `choices` 数组包含 3 个选项，每个有独立的 `effects`
- 选项效果包括：`food`（食物）、`humanity`（人性值）、`npc_trust`（NPC信任）、`money`（金钱）、`add_clue`（添加线索）
- `add_run_memory` 可以在玩家的笔记本中添加记录

**适合场景：** 道德抉择、NPC互动、资源管理。

### 3. chain_quest.json — 连锁任务

**结构要点：**
- 第一个事件使用 `add_flag` 设置标记
- 第二个事件使用 `requires_flags` 检查标记
- 只有完成了第一个事件，第二个才会出现
- 第二个事件可以给予更好的奖励（线索、SAN恢复）

**适合场景：** 任务链、多步骤调查、NPC任务。

## 字段参考

### trigger（触发条件）

| 字段 | 类型 | 说明 |
|------|------|------|
| `areas` | string[] | 可触发的区域ID列表 |
| `probability` | number | 触发概率 (0-1) |
| `once_per_run` | boolean | 每轮只触发一次 |
| `once_ever` | boolean | 全局只触发一次（跨轮回） |
| `min_loop` | number | 最低轮回次数 |
| `san_lte` | number | SAN值上限 |
| `time_phase` | string[] | 可触发时段 |
| `requires_flags` | string[] | 需要的标记 |
| `npc_alive` | string[] | 需要存活的NPC |
| `food_lte` | number | 食物上限 |

### effects（效果）

| 字段 | 类型 | 说明 |
|------|------|------|
| `san` | number | SAN值变化（正数=恢复，负数=损失） |
| `hp` | number | 生命值变化 |
| `food` | number | 食物变化 |
| `money` | number | 金钱变化 |
| `humanity` | number | 人性值变化 |
| `mythos` | number | 神话知识增加 |
| `npc_trust` | object | NPC信任变化 `{ "NPC名": 数值 }` |
| `add_clue` | string | 添加线索ID |
| `add_flag` | string | 设置标记 |
| `add_item` | object | 添加物品 `{ item_id, name, uses }` |

### choices（选项）

每个选项是一个对象，包含：
- `label: string` — 按钮文字
- `text: string` — 选择后的叙述文本
- `effects: object` — 选择的效果（同上）

## 命名规范

- 事件ID：`你的模组前缀_类型_序号`（如 `my_mod_food_001`）
- 线索ID：`clue_你的模组前缀_描述`
- 标记ID：`flag_你的模组前缀_描述`
- 避免使用 `meta_`、`loop_`、`ending_` 等官方前缀
