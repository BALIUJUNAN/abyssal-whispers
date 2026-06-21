# 新增NPC：老灯塔看守人

> 在雾港码头区新增一位神秘的灯塔看守人NPC，包含6个事件的完整任务链。

## 安装

1. 打开游戏，点击顶部 **🧩 模组管理** 按钮
2. 点击 **导入模组**
3. 选择 `add-npc-lighthouse-keeper/mod.json`
4. 点击 **启用**

## 内容概览

| # | 事件名 | 类型 | 触发条件 | 稀有度 |
|---|--------|------|---------|--------|
| 1 | 熄灭的灯塔 | area_deep | 码头区， evening/midnight | 普通 |
| 2 | 灯塔顶部的镜子 | area_deep | 码头区，需要 flag | 普通 |
| 3 | 看守人的真相 | npc_cross | 码头区，需要 flag | 稀有 |
| 4 | 重新点亮灯塔 | area_deep | 码头区，高潮事件 | 稀有 |
| 5 | 看守人的告别 | area_deep | 码头区，midnight | 稀有 |
| 6 | 码头上的回声 | silent | 码头区，once_ever | 普通 |

## 任务链流程

```
[1] 熄灭的灯塔
  ├── 选择「询问详细经过」→ 获得线索 + 记忆
  ├── 选择「提出帮忙修灯」→ 获得 flag → 进入任务链
  └── 选择「离开」→ 获得 flag（可后续重新触发）
         ↓
[2] 灯塔顶部的镜子（需要 flag_lh_quest_started）
  ├── 「仔细检查镜子」→ 线索
  ├── 「带走镜子」→ 物品 + 记忆
  └── 「 leave 镜子」→ 线索
         ↓
[3] 看守人的真相（需要 flag_lh_mirror_found）
  ├── 「同意帮忙」→ 获得 flag + 物品
  └── 「拒绝」→ 不同的叙事分支
         ↓
[4] 重新点亮灯塔（需要 flag_lh_quest_accepted）
  └── 唯一选择：下楼见看守人 → 获得信物 + 线索
         ↓
[5] 看守人的告别（需要 flag_lh_lighthouse_lit）
  ├── 「捡起煤油灯」→ 物品 + 线索
  └── 「 leave 灯」→ 线索
         ↓
[6] 码头上的回声（需要 flag_lh_lighthouse_lit, once_ever）
  └── 无选项，纯氛围叙事
```

## 新增线索

- `clue_lh_green_light` — 灯塔的绿光
- `clue_lh_keeper_scar` — 看守人手心的伤疤
- `clue_lh_cracked_mirror` — 灯塔顶部的铜镜
- `clue_lh_mirror_inscription` — 镜子背面的铭文
- `clue_lh_mirror_shattered` — 自行碎裂的铜镜
- `clue_lh_keeper_truth` — 灯塔看守人的真实身份
- `clue_lh_light_inside` — 灯塔深处的存在
- `clue_lh_ward_stone` — 灯塔守护石
- `clue_lh_keeper_fate` — 看守人的命运
- `clue_lh_song` — 灯塔的歌

## 新增物品

- `item_lh_cracked_mirror` — 裂开的铜镜（1次使用）
- `item_lh_oil_lamp` — 看守人的煤油灯（1次使用）
- `item_lh_cold_lamp` — 熄灭的煤油灯（1次使用）
- `item_lh_ward_stone` — 灯塔守护石（1次使用）

## 设计要点

- **任务链逻辑**：用 `requires_flags` + `add_flag` 实现线性任务链
- **分支叙事**：关键选择点有 2-3 个分支，分支之间有 `add_run_memory` 记录差异
- **SAN 管理**：高潮事件 SAN -4，需要玩家合理分配资源
- **氛围营造**：silent 类型事件做无选项的氛围收尾
- **NPC 模拟**：通过多事件序列模拟 NPC 的登场→对话→揭示→告别
