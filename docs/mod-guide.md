# Mod 开发完全指南

> **适用版本**：v0.8.0+ | **最后更新**：2026-06-20

---

## 目录

1. [Mod 系统概述](#1-mod-系统概述)
2. [目录结构](#2-目录结构)
3. [mod.json 完整参考](#3-modjson-完整参考)
4. [事件格式完整参考](#4-事件格式完整参考)
5. [进阶功能详解](#5-进阶功能详解)
6. [三个官方示例逐个拆解](#6-三个官方示例逐个拆解)
7. [从头创建你的第一个 Mod](#7-从头创建你的第一个-mod)
8. [测试与调试](#8-测试与调试)
9. [发布与分享](#9-发布与分享)
10. [API 速查表](#10-api-速查表)
11. [常见错误与解决](#11-常见错误与解决)

---

## 1. Mod 系统概述

### 1.1 Mod 是什么

Mod（模组）是玩家制作的游戏内容扩展包。每个 Mod 是一个 **纯 JSON 文件**，
包含自定义事件、NPC 数据、区域扩展和难度调整。

### 1.2 系统架构

```
┌─────────────────────────────────────────────────────┐
│                    Mod 生命周期                       │
│                                                      │
│  1. 安装 ──→ ugcReducer.installMod()                 │
│              ├─ schema 安全验证                        │
│              ├─ ID 冲突检测                            │
│              └─ 自动前缀冲突的 event ID                │
│                                                      │
│  2. 存储 ──→ localStorage (key: ugc_modules)         │
│                                                      │
│  3. 加载 ──→ initExtendedEvents()                    │
│              └─ applyUgcToGD(GD)                      │
│                   └─ buildEventPool()                 │
│                        └─ GD.events += mod.events     │
│                                                      │
│  4. 运行 ──→ selectEventV2()                         │
│              └─ 从合并后的事件池中随机选取             │
│                   (UGC 事件带 source='ugc' 标记)      │
│                                                      │
│  5. 渲染 ──→ GameCommon.jsx                          │
│              └─ 检测 _ugcAuthor → 显示 "MOD by XXX"   │
└─────────────────────────────────────────────────────┘
```

### 1.3 核心限制

| 限制 | 值 | 说明 |
|------|-----|------|
| 最大事件数 | 30/Mod | `LIMITS.MAX_EVENTS_PER_MOD` |
| 最大选项数 | 6/事件 | `LIMITS.MAX_CHOICES_PER_EVENT` |
| 最大 Mod 数 | 20 | `LIMITS.MAX_MODS_TOTAL` |
| 描述最大长度 | 2000 字符 | 包含 `\n` |
| 文本最大长度 | 1500 字符 | 选项文本 |
| ID 格式 | `[a-zA-Z0-9_-]+` | 仅字母、数字、下划线、连字符 |
| 安全策略 | 无代码执行 | 禁止 eval/Function/fetch 等 |

### 1.4 支持的 Mod 类型

| 类型 | 说明 | 示例 |
|------|------|------|
| 事件扩展 | 添加自定义事件 | 新剧情、新遭遇 |
| 难度调整 | 修改游戏数值 | 专家模式、休闲模式 |
| 文本替换 | 全局文本替换 | 克苏鲁风格替换 |
| 混合 | 以上组合 | 完整剧情扩展 |

---

## 2. 目录结构

### 2.1 Mod 包标准格式

```
你的模组名/
├── mod.json          # 模组清单（必需）
└── events/           # 事件 JSON 文件（可选，可多文件）
    ├── events.json   # 所有事件集中在一个文件
    ├── npc_events.json
    └── area_events.json
```

### 2.2 开发时的推荐结构

```
my_awesome_mod/
├── mod.json          # 模组清单
├── README.md         # 模组说明（发布时附带）
├── events/
│   ├── events.json   # 主事件文件
│   └── quest_chain.json  # 任务链事件
└── scripts/
    └── validate.mjs  # 本地验证脚本（可选）
```

### 2.3 mod.json 结构

```json
{
  "id": "my_mod_id",              // 唯一标识符（字母数字下划线连字符）
  "name": "我的模组",             // 显示名称
  "author": "作者名",             // 作者名
  "version": "1.0.0",             // 版本号（SemVer 推荐）
  "compatibility": ">=0.8.0",     // 兼容的游戏版本
  "description": "模组简介",      // 描述
  "events": [ /* 事件数组 */ ],
  "difficulty_modifiers": { /* 可选 */ },
  "metadata": { /* 可选 */ }
}
```

### 2.4 示例：完整 mod.json

```json
{
  "id": "lighthouse_keeper",
  "name": "灯塔看守人",
  "author": "调查员档案馆",
  "version": "1.0.0",
  "compatibility": ">=0.8.0",
  "description": "在雾港码头区新增一位神秘的灯塔看守人NPC，包含6个事件和一个两阶段任务链。",
  "events": [
    {
      "id": "lh_keeper_001",
      "name": "灯塔的灯光",
      "type": "area_deep",
      "subtype": "harbor",
      "weight": 1,
      "tier": "normal",
      "tags": ["lighthouse", "npc", "harbor", "quest_start"],
      "trigger": {
        "areas": ["harbor_district"],
        "probability": 0.15,
        "once_per_run": true,
        "min_loop": 1
      },
      "description": "你在码头尽头看到了灯塔。\n灯塔的灯已经熄了——但 tonight 不该熄。\n灯塔看守人坐在台阶上，手里拿着一盏煤油灯。\n他的眼睛在黑暗中亮得不太正常。\n\n「 lighthouse 已经三年没有亮过了，」他说。\n「从那个东西上岸的那天起。」",
      "effects": { "san": -1 },
      "choices": [
        {
          "id": "lh_ask_about_light",
          "label": "询问灯塔熄灭的经过",
          "text": "他沉默了一会儿，然后开始讲述。\n\n三年前的一个午夜，灯塔的光突然变成了绿色。不是折射——是光本身变成了绿色。\n持续了整整七分钟。然后熄了。\n\n「我见过很多东西，」他说，「但那不是光。那是某种东西在灯塔里面。」",
          "effects": {
            "add_clue": { "id": "clue_lh_green_light", "name": "灯塔的绿光" },
            "add_flag": "flag_met_lighthouse_keeper"
          }
        },
        {
          "id": "lh_ignore",
          "label": "离开",
          "text": "你转身离开了。灯塔看守人没有看你离开。\n你走了很远之后回头看——他还在那里。\n煤油灯的光没有移动。",
          "effects": { "san": -1 }
        }
      ]
    }
  ],
  "metadata": {
    "tags": ["npc", "quest", "harbor", "lighthouse"],
    "homepage": "https://example.com/my_awesome_mod"
  }
}
```

---

## 3. 事件格式完整参考

### 3.1 事件对象结构

```
Event Object
├── id: string          [必需] 唯一标识符
├── name: string        [必需] 事件名称
├── type: string        [必需] 事件类型（见下方白名单）
├── subtype: string     [可选] 子类型标签
├── weight: number      [可选] 权重 (0.1-10, 默认 1)
├── tier: string        [可选] 稀有度 (common/normal/rare/epic/unique/signature)
├── tags: string[]      [可选] 标签数组（最多20个）
├── quality_tier: string [可选] 质量评级 (A/B/C/D)
├── trigger: object     [可选] 触发条件
├── description: string [必需] 事件描述（\n 分隔段落）
├── effects: object     [可选] 自动效果
├── choices: Choice[]   [可选] 玩家选项
├── event_classification: string [可选] "调查"/"NPC互动"/"危险"
├── normalcy_anchor: boolean [可选] 是否为常态锚点
├── distortion_variants: object [可选] 腐化变体文本
├── description_variants: object [可选] 描述变体（按访问次数）
├── echo_overlay: string [可选] 轮回回声覆盖层
└── source: string      [自动] "ugc"（安装后自动设置）
```

### 3.2 事件类型白名单

| 类型 | 说明 | 适合场景 |
|------|------|---------|
| `area_deep` | 区域专属深层事件 | 地点探索、区域叙事 |
| `humanity` | 人性值驱动事件 | 道德选择、善恶回报 |
| `mythos` | 神话知识事件 | 克苏鲁揭示、禁忌知识 |
| `loop_locked` | 轮回解锁事件 | 多轮回任务链 |
| `resource_pressure` | 资源压力事件 | 饥饿/资金/物资危机 |
| `npc_cross` | NPC 交叉事件 | 多 NPC 互动 |
| `ending_omen` | 结局预兆事件 | 结局引导 |
| `ending_aftermath` | 结局后续事件 | 结局后续 |
| `silent` | 无声事件 | 氛围营造、环境叙事 |
| `meta` | 元叙事事件 | 打破第四面墙 |
| `exploration` | 探索事件 | 新区域发现 |
| `combat` | 战斗事件 | 战斗遭遇 |
| `ugc` | 通用 UGC 事件 | 任意自定义内容 |

### 3.3 稀有度说明

| tier | 权重建议 | 出现频率 | 用途 |
|------|---------|---------|------|
| `common` | 0.3-0.8 | 高频 | 普通遭遇 |
| `normal` | 1.0 | 标准 | 常规内容 |
| `rare` | 0.4-0.7 | 中频 | 特殊事件 |
| `epic` | 0.1-0.3 | 低频 | 重要剧情 |
| `unique` | 0.05-0.1 | 极低频 | 关键转折 |
| `signature` | 0.01-0.05 | 极稀有 | 标志性事件 |

### 3.4 标签（Tags）使用指南

标签用于事件分类和过滤。推荐标签体系：

**场景标签：**
- 区域：`harbor`, `town`, `forest`, `manor`, `catacombs`, `safehouse`
- 类型：`investigation`, `combat`, `social`, `atmosphere`
- 主题：`lovecraft`, `gothic`, `mystery`, `ritual`

**功能标签：**
- `quest_start`, `quest_end`, `quest_chain`
- `npc_<name>` — 关联特定 NPC
- `clue_<topic>` — 提供特定线索

**Mod 标识：**
- `ugc` — 所有 Mod 事件必须包含
- `mod_<your_mod_id>` — 你的 Mod 专属前缀

### 3.5 Trigger（触发条件）完整参考

```json
{
  "trigger": {
    "areas": ["harbor_district", "town_center"],
    "time_phase": ["evening", "midnight"],
    "probability": 0.15,
    "once_per_run": true,
    "once_ever": false,
    "min_loop": 1,
    "max_loop": 99,
    "san_lte": 50,
    "san_gte": 20,
    "humanity_min": 30,
    "humanity_max": 80,
    "min_mythos": 5,
    "cooldown_days": 3,
    "max_per_day_category": 2,
    "requires_flags": ["flag_lh_green_light"],
    "forbidden_flags": ["flag_lh_lighthouse_lit"],
    "requires_clues": ["clue_lh_green_light"],
    "requires_prev_event": ["lh_keeper_001"],
    "npc_alive": ["lighthouse_keeper"]
  }
}
```

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `areas` | `string[]` | 全部区域 | 可触发的区域 ID |
| `time_phase` | `string[]` | 全部时段 | `morning`/`afternoon`/`evening`/`midnight` |
| `probability` | `number` | 1.0 | 触发概率 (0-1) |
| `once_per_run` | `boolean` | false | 每轮只触发一次 |
| `once_ever` | `boolean` | false | 全局只触发一次（跨轮回） |
| `min_loop` | `number` | 0 | 最低轮回次数 |
| `max_loop` | `number` | 99 | 最高轮回次数 |
| `san_lte` | `number` | — | SAN 值 ≤ 此值才触发 |
| `san_gte` | `number` | — | SAN 值 ≥ 此值才触发 |
| `humanity_min` | `number` | — | 人性值 ≥ 此值 |
| `humanity_max` | `number` | — | 人性值 ≤ 此值 |
| `min_mythos` | `number` | — | 最低神话知识 |
| `cooldown_days` | `number` | 0 | 触发后冷却天数 |
| `max_per_day_category` | `number` | — | 同类别每日最大触发次数 |
| `requires_flags` | `string[]` | — | 需要的标记 |
| `forbidden_flags` | `string[]` | — | 不能有的标记 |
| `requires_clues` | `string[]` | — | 需要的线索 |
| `requires_prev_event` | `string[]` | — | 需要先触发的事件 |
| `npc_alive` | `string[]` | — | 需要存活的 NPC |

### 3.6 Effects（效果）完整参考

```json
{
  "effects": {
    "san": -2,
    "hp": -1,
    "maxHp": -1,
    "humanity": 3,
    "mythos": 2,
    "food": -1,
    "money": -5,
    "light": -1,
    "skill": 1,
    "loop": 1,
    "add_clue": { "id": "clue_id", "name": "线索显示名" },
    "add_clue": "clue_id",
    "remove_clue": "clue_id",
    "add_item": { "id": "item_id", "name": "物品名", "uses": 3 },
    "add_item": "item_id",
    "remove_item": "item_id",
    "add_flag": "flag_name",
    "set_flag": "flag_name",
    "add_run_memory": "记忆内容",
    "modify_humanity": 2,
    "modify_mythos": 1,
    "modify_safehouse_corruption": 0.5,
    "unlock_area": "new_area_id",
    "unlock_ending_condition": "ending_id"
  }
}
```

| 效果字段 | 类型 | 说明 |
|----------|------|------|
| `san` | `number` | SAN 变化（正=恢复，负=损失） |
| `hp` | `number` | 生命值变化 |
| `maxHp` | `number` | 最大 HP 变化 |
| `humanity` | `number` | 人性值变化 |
| `mythos` | `number` | 神话知识变化 |
| `food` | `number` | 食物变化 |
| `money` | `number` | 金钱变化 |
| `light` | `number` | 光源变化 |
| `skill` | `number` | 技能点变化 |
| `loop` | `number` | 强制进入新一轮 |
| `add_clue` | `string\|object` | 添加线索 |
| `remove_clue` | `string` | 移除线索 |
| `add_item` | `string\|object` | 添加物品 |
| `remove_item` | `string` | 移除物品 |
| `add_flag` | `string` | 设置标记 |
| `set_flag` | `string` | 设置标记（覆盖） |
| `add_run_memory` | `string` | 添加到笔记本 |
| `modify_humanity` | `number` | 人性值修改 |
| `modify_mythos` | `number` | 神话知识修改 |
| `modify_safehouse_corruption` | `number` | 安全屋腐蚀度修改 |
| `unlock_area` | `string` | 解锁新区域 |
| `unlock_ending_condition` | `string` | 解锁结局条件 |

### 3.7 Choice（选项）完整参考

```json
{
  "choices": [
    {
      "id": "choice_id",
      "label": "按钮显示文字",
      "text": "选择后的叙述文本（\\n 分段）",
      "effects": {
        "san": -2,
        "add_clue": { "id": "clue_id", "name": "线索名" },
        "add_flag": "flag_name",
        "humanity": 1
      }
    }
  ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 选项唯一 ID |
| `label` | `string` | 按钮显示文字（≤60 字符） |
| `text` | `string` | 选择后的叙述文本（≤1500 字符） |
| `effects` | `object` | 选择效果（同顶层 effects，但无 unlock_area/unlock_ending_condition） |

### 3.8 描述文本写作指南

**基本原则：**
- 用 `\n\n` 分隔段落（空行 = 视觉段落间隔）
- 用 `\n` 分隔短句（制造停顿）
- 3-6 段为佳，每段 1-3 行
- 不要超过 2000 字符

**好的描述示例：**
```json
{
  "description": "你在码头边的木板缝隙里发现了一本旧日记。\n日记的封面已经褪色，但你还能看清上面的字：「沃切斯特，1893年」。\n\n你翻开了第一页。\n「今天到达了沃切斯特。海面很平静。但镇民的眼神不太对。」\n\n你合上日记。1893年。一百多年前。\n你把日记放回了缝隙里。它属于这里。"
}
```

**差的描述示例（不要这样做）：**
```json
{
  "description": "你在码头边发现了一本日记。1893年的。很旧。镇民眼神不对。你把日记放回去了。"
}
```

---

## 4. 进阶功能详解

### 4.1 difficulty_modifiers（难度调整）

在 mod.json 顶层添加 `difficulty_modifiers` 对象：

```json
{
  "difficulty_modifiers": {
    "min_difficulty": 5,
    "max_difficulty": 21,
    "text_corruption_boost": 1.5,
    "npc_trust_multiplier": 0.5,
    "custom_text_swaps": [
      { "find": "安全的", "replace": "暂时安全的" },
      { "find": "短暂的", "replace": "极其短暂的" }
    ]
  }
}
```

| 字段 | 类型 | 范围 | 说明 |
|------|------|------|------|
| `min_difficulty` | `number` | 1-21 | 此 Mod 生效的最低难度 |
| `max_difficulty` | `number` | 1-21 | 此 Mod 生效的最高难度 |
| `text_corruption_boost` | `number` | 0-5 | 文本腐化倍率（1=不变，>1=增强） |
| `npc_trust_multiplier` | `number` | 0-2 | NPC 信任增长倍率（1=不变） |
| `custom_text_swaps` | `Array<{find, replace}>` | ≤20 | 全局文本替换规则 |

### 4.2 distortion_variants（腐化变体文本）

当玩家 SAN 值下降时，事件描述会被"腐化"。你可以提供变体：

```json
{
  "distortion_variants": {
    "san_mid": "你的感知开始扭曲。\n空气中的气味变得异常清晰——不只是海水的咸味，\n还有一种更深层的东西，像是被遗忘的记忆在腐烂。",
    "san_low": "世界在融化。\n码头变成了某种巨大生物的内壁。\n木板是肋骨。锚链是血管。\n你站在它的身体里。",
    "loop_3_plus": "你确定你之前来过这里。\n但这次有些东西不一样了——\n上次这里没有那扇门。\n那扇门现在就在你面前。关着。"
  }
}
```

| 变体键 | 触发条件 |
|--------|---------|
| `san_mid` | SAN 30-50 |
| `san_low` | SAN 10-30 |
| `loop_3_plus` | 第 3+ 轮回 |

### 4.3 description_variants（描述访问变体）

同一事件在不同周目访问时显示不同文本：

```json
{
  "description_variants": {
    "visit_2_3": "第二次来访的描述...",
    "visit_4_6": "第四到第六次的描述...",
    "visit_7_plus": "第七次及以后的描述..."
  }
}
```

### 4.4 echo_overlay（轮回回声）

在玩家进行新轮回时，某些事件会覆盖一层"回声"文本：

```json
{
  "echo_overlay": "你站在码头边。\n空气里有种熟悉的味道——你上一次轮回也闻过。\n但上次这里没有那盏灯。\n这盏灯是新出现的。"
}
```

---

## 5. 三个官方示例逐个拆解

### 5.1 simple_event.json — 纯叙事事件

**文件位置：** `mods/examples/simple_event.json`

```
核心结构：
├── type: "area_deep"      → 区域深层事件
├── trigger.areas: ["harbor_district"]
├── trigger.once_per_run: true   → 每轮一次
├── effects: { san: -1 }    → 最简单的效果
└── choices: []             → 无分支
```

**关键设计：**
- 不需要选项，玩家只读不选
- `once_per_run: true` 确保不会重复刷屏
- `tier: "normal"` 配合低 weight = 不会太频繁
- 描述用 `\n\n` 分段，营造阅读节奏

### 5.2 branch_choice.json — 分支选择事件

**文件位置：** `mods/examples/branch_choice.json`

```
核心结构：
├── 3 个 choices，每个有独立 effects
├── effects 包含多种类型：
│   ├── food/humanity/money  → 资源类
│   ├── npc_trust            → NPC 关系
│   └── add_clue             → 线索推进
└── trigger.once_per_run: true
```

**关键设计：**
- 三个选项分别对应三种"道德立场"：利他、利己、冷漠
- 每个选项的 effects 不同，引导玩家思考
- `add_clue` 使用对象格式 `{id, name}` 确保线索名可读

### 5.3 chain_quest.json — 连锁任务

**文件位置：** `mods/examples/chain_quest.json`

```
核心结构：
├── 事件 1: example_chain_001
│   ├── choices → add_flag: "flag_looking_for_cat"
│   └── trigger.once_per_run: true
│
└── 事件 2: example_chain_002
    ├── trigger.requires_flags: ["flag_looking_for_cat"]
    ├── trigger.once_per_run: true
    └── 更好的奖励（线索 + SAN 恢复）
```

**关键设计：**
- `requires_flags` 实现任务链
- 第二步提供更好奖励（补偿第一步的"投资"）
- 两步都在同一区域树（town_center → harbor_district）
- 第二步的 tier 从 normal 升级为 rare（暗示更有价值）

---

## 6. 从头创建你的第一个 Mod

### 6.1 规划阶段

**问自己三个问题：**

1. **主题**：你的 Mod 想讲述什么故事？
2. **位置**：事件在哪个区域触发？
3. **互动**：纯叙事？选择？任务链？

### 6.2 最小可行 Mod

从一个事件开始：

```json
{
  "id": "my_mod_001",
  "name": "我的第一个事件",
  "type": "area_deep",
  "subtype": "example",
  "weight": 1,
  "tier": "normal",
  "tags": ["ugc", "example"],
  "trigger": {
    "areas": ["town_center"],
    "probability": 0.1,
    "once_per_run": true
  },
  "description": "一段描述文字。\\n\\n第二段。",
  "effects": { "san": -1 },
  "choices": []
}
```

### 6.3 从零到发布：完整流程

```
步骤 1：创建目录结构
  mkdir -p my_mod/events

步骤 2：编写 mod.json
  用文本编辑器创建 my_mod/mod.json

步骤 3：本地验证
  node -e "
    const { validateMod } = require('./src/data/ugcSchema.js');
    const mod = JSON.parse(require('fs').readFileSync('my_mod/mod.json', 'utf8'));
    const result = validateMod(mod);
    console.log(result.valid ? '✅ 通过' : '❌ 失败:', result.errors);
  "

步骤 4：在游戏中测试
  - 打开游戏 → 点击 🧩 按钮
  - 导入模组 → 选择 my_mod/mod.json
  - 启用模组 → 开始新游戏

步骤 5：迭代
  - 根据测试结果调整触发条件/效果/描述
  - 重复步骤 3-4 直到满意

步骤 6：发布
  - 将 mod.json 重命名为 <mod_id>.json
  - 附带 README.md
  - 分享给玩家
```

### 6.4 命名规范

| 实体 | 格式 | 示例 |
|------|------|------|
| Mod ID | `[a-z][a-z0-9_]+` | `lighthouse_keeper` |
| 事件 ID | `<mod_prefix>_<type>_<序号>` | `lh_keeper_intro_001` |
| 线索 ID | `clue_<mod_prefix>_<描述>` | `clue_lh_green_light` |
| 标记 ID | `flag_<mod_prefix>_<描述>` | `flag_lh_met_keeper` |
| 选项 ID | `<mod_prefix>_<序号>_<choice>` | `lh_001_ask_about` |

**禁止使用的官方前缀：** `meta_`, `loop_`, `ending_`, `chapter_`, `area_`, `npc_`

---

## 7. 测试与调试

### 7.1 验证脚本

创建一个 `validate.mjs`：

```javascript
// validate.mjs
import { readFileSync } from 'fs';
import { validateMod } from '../src/data/ugcSchema.js';

const modPath = process.argv[2] || './mod.json';
const raw = JSON.parse(readFileSync(modPath, 'utf8'));
const result = validateMod(raw);

if (result.valid) {
  console.log('✅ Mod 验证通过');
  console.log(`   名称: ${result.sanitized.name}`);
  console.log(`   事件数: ${result.sanitized.events.length}`);
  if (result.warnings.length > 0) {
    console.log('⚠️  警告:');
    result.warnings.forEach(w => console.log('   ', w));
  }
} else {
  console.log('❌ 验证失败:');
  result.errors.forEach(e => console.log('   ', e));
  process.exit(1);
}
```

### 7.2 事件池验证

```javascript
// 检查事件是否被正确注入
import { buildEventPool } from '../src/utils/buildEventPool.js';

// 模拟 GD
const GD = { events: [] };

// 加载你的 Mod
const mod = JSON.parse(readFileSync('mod.json', 'utf8'));
GD.events = mod.events;

// 构建事件池
const pool = buildEventPool(GD, [mod]);
console.log(`事件池大小: ${pool.events.length}`);
console.log(`UGC 事件数: ${pool.ugcCount}`);
console.log(`冲突: ${pool.conflicts.join(', ') || '无'}`);
```

### 7.3 游戏内调试

**启用开发者模式：**
1. 游戏中按 F12
2. 在控制台中输入：

```javascript
// 查看当前事件池
console.log('总事件数:', GD.events.length);
console.log('UGC 事件:', GD._ugcEventCount);

// 查看 Mod 列表
console.log('已安装 Mod:', getAllMods());

// 手动触发事件
const pool = buildEventPool(GD);
const ugcEvents = pool.events.filter(e => e.source === 'ugc');
console.log('我的事件:', ugcEvents.map(e => e.id));

// 查看线索
console.log('当前线索:', state.clues);

// 查看标记
console.log('当前标记:', state.flags);
```

### 7.4 常见调试场景

**事件不触发：**
1. 检查 `trigger.areas` 是否包含你当前所在区域
2. 检查 `trigger.probability` 是否太小
3. 检查 `trigger.min_loop` 是否满足
4. 检查 `trigger.once_per_run` 是否已触发过
5. 控制台 `GD.events.filter(e => e.id.startsWith('your_prefix'))` 确认事件已注入

**效果不生效：**
1. 检查 effects 中的 key 是否在白名单内
2. 检查 add_clue 格式（string 或 `{id, name}`）
3. 检查 add_flag 的标记名是否与其他事件冲突

**NPC 不出现：**
1. Mod 系统当前仅注入事件
2. NPC 对话需要 `npc_cross` 类型的事件
3. NPC 的位置由 base game 的 `npcRegistry` 决定

---

## 8. 发布与分享

### 8.1 Mod 文件规范

发布时提供：
```
<mod_id>_v<version>.json    ← 核心文件
README.md                   ← 安装说明 + 内容介绍
CHANGELOG.md               ← 版本变更记录（可选）
```

### 8.2 README.md 模板

```markdown
# <Mod 名称>

> <一句话描述>

## 安装

1. 打开游戏，点击顶部 🧩 按钮
2. 点击"导入模组"
3. 选择此 JSON 文件
4. 启用模组，开始新游戏

## 内容

- <数量> 个自定义事件
- <特点 1>
- <特点 2>

## 兼容性

- 游戏版本：>= X.X.X
- 与其他 Mod 的兼容说明

## 作者

<作者名> — <联系方式/主页>
```

### 8.3 版本号规范

推荐使用 SemVer：
- `1.0.0` — 首次发布
- `1.0.1` — Bug 修复
- `1.1.0` — 新增内容
- `2.0.0` — 重大改动（不兼容旧存档）

---

## 9. API 速查表

### 9.1 内置事件 ID 参考

**区域 ID：**
```
town_center      — 沃切斯特镇中心
harbor_district  — 雾港码头区
lighthouse       — 灯塔
voxchester_manor — 沃切斯特庄园
catacombs_entrance — 地下墓穴入口
deep_catacombs   — 深层墓穴
ruins_of_yith    — 伊思遗迹
whispering_forest — 低语森林
forbidden_grove  — 禁忌林地
```

**时间段：**
```
morning    — 清晨 (06:00-12:00)
afternoon  — 午后 (12:00-18:00)
evening    — 傍晚 (18:00-22:00)
midnight   — 深夜 (22:00-06:00)
```

**效果值参考：**
```
SAN 变化: -5（严重损伤）到 +3（恢复）
HP 变化: -3（重伤）到 +2（治疗）
人性: -5（堕落）到 +5（升华）
食物: -1（消耗一份）
金钱: -10（大额支出）到 +5（意外收获）
```

### 9.2 游戏系统常量

| 概念 | 值 | 说明 |
|------|-----|------|
| 每轮回天数 | 28 | 一个完整轮回周期 |
| 起始 SAN | 40-70 | 3d6×5 骰出 |
| 起始 HP | 30 | 固定值 |
| 每日食物消耗 | 1 | 每天 1 份 |
| 信任范围 | 0-5 | NPC 信任等级 |
| 最大事件/Mod | 30 | 硬限制 |
| 最大 Mod 数 | 20 | 硬限制 |

---

## 10. 常见错误与解决

### 10.1 验证错误

| 错误 | 原因 | 解决 |
|------|------|------|
| `event[0].id: must be alphanumeric` | ID 包含中文或特殊字符 | 改用 `my_mod_001` |
| `event[0].description: exceeds max length 2000` | 描述太长 | 缩减到 2000 字符内 |
| `event[0].trigger.probability: must be >= 0` | probability 为负数 | 改为 0-1 之间的值 |
| `event[0].effects: disallowed effect key "xxx"` | 不在白名单中的效果 | 检查白名单，使用合法 key |
| `event[0].choices[0].id: duplicate` | 选项 ID 重复 | 确保每个选项 ID 唯一 |
| `mod.events: exceeds max 30` | 事件数超限 | 拆分到多个 Mod |

### 10.2 运行时问题

| 问题 | 可能原因 | 调试方法 |
|------|---------|---------|
| 事件从未触发 | areas 不匹配 | 控制台检查当前区域 ID |
| 效果无效 | effects key 拼写错误 | 对比白名单 |
| 任务链断裂 | flag 名不匹配 | 确认 requires_flags 中的 flag 名与 add_flag 完全一致 |
| 描述显示 [object Object] | add_clue 使用了错误格式 | 用 `{id, name}` 或 string |
| Mod 不显示在管理面板 | 安装时验证失败 | 检查浏览器控制台的错误信息 |

---

## 附录 A：完整 Mod 模板

见 `mods/examples/` 目录中的三个官方示例。

## 附录 B：联系与反馈

- 项目仓库：`D:\ZHIJIGozgewan\COC`
- 问题反馈：在游戏内按 F12 打开开发者工具，查看 Console 标签
