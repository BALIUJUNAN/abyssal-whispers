# 存档格式规范 v1.0（冻结版）

> **冻结日期**：2026-06-20 | **当前版本**：v1.2.0 | **格式版本**：`1.2.0`

---

## 1. 冻结原则

1. **不删除旧字段** — 只增不改，旧字段在迁移中保留或映射
2. **不改变顶层结构** — `{ version, timestamp, slotId, meta, state }` 五字段不变
3. **新增字段必须有默认值** — 老存档加载时 `ensureMinimalExtendedState()` 补全
4. **版本号递增** — 任何结构性变更 bump `SAVE_VERSION`
5. **迁移永远尝试** — 不因版本不兼容直接删除存档

---

## 2. 存档文件结构

```
存档文件（localStorage key: coc_save_<slotId>）
│
├── version       : string   格式版本号（当前 "1.2.0"）
├── timestamp     : number   Unix 毫秒时间戳
├── slotId        : string   槽位 ID（auto_1 / manual_1 等）
├── meta          : object   摘要元数据（用于列表展示，不参与逻辑）
│   ├── day          : number  第几日
│   ├── area         : string  当前区域 ID
│   ├── loopCount    : number  轮回次数
│   ├── san          : number  当前 SAN
│   └── hp           : number  当前 HP
│
└── state         : object   完整游戏状态（经过 toPersistedState 过滤）
    │
    ├── [角色层]
    │   ├── stats       : object  { STR, CON, DEX, APP, POW, INT, SIZ, EDU }
    │   ├── hp          : number
    │   ├── maxHp       : number
    │   ├── san         : number
    │   ├── maxSan      : number
    │   ├── luck        : number
    │   ├── mp          : number
    │   ├── skills      : object
    │   ├── archetype   : string | null
    │   ├── inventory   : Array<{ id, name, uses }>
    │   ├── clues       : Array<string | { id, name }>
    │   ├── difficulty  : string   向后兼容（"normal" 等）
    │   └── difficultyLevel : number 1-13
    │
    ├── [世界层]
    │   ├── currentArea         : string
    │   ├── visitedAreas        : string[]
    │   ├── npcTrust            : object  { <npcId>: 0-5 }
    │   ├── npcStates           : object
    │   ├── npcRelations        : object
    │   ├── sealState           : string
    │   ├── weather             : string
    │   ├── safehouseCorruption : number
    │   └── dayCount            : number
    │
    ├── [进度层]
    │   ├── flags               : string[]
    │   ├── eventLog            : Array（ capped at 200 条）
    │   ├── runMemory           : string[]
    │   ├── previousRunSummary  : object | null
    │   ├── previousDeathsByArea: object
    │   ├── previousEndings     : Array
    │   ├── endingHistory       : Array
    │   ├── loopEchoFlags       : string[]
    │   ├── worldCorrectionFlags: string[]
    │   ├── eventCooldowns      : object
    │   ├── categoryCountsToday : object
    │   ├── categoryCountsRun   : object
    │   ├── abnormalStreak      : number
    │   ├── runTriggeredExtendedEvents : string[]
    │   ├── everTriggeredEvents : string[]
    │   ├── pendingFollowupEvents : string[]
    │   ├── unlockedAreas       : string[]
    │   ├── unlockedEndingConditions : string[]
    │   ├── endingEchoes        : Array
    │   ├── lastDeathHint       : string | null
    │   ├── deathContext        : object | null
    │   ├── lastDeathMode       : string | null
    │   ├── previousDeathContext: object | null
    │   ├── prologue            : object | null
    │   └── fearTuning          : object | null
    │
    ├── [行为追踪层]
    │   └── behaviorTracking    : object
    │       ├── direct_kill_count          : number
    │       ├── cannibalism_count          : number
    │       ├── clean_kill_pattern         : number
    │       ├── npc_deaths_by_manipulation : number
    │       ├── cult_leader_score         : number
    │       ├── self_harm_ritual_count     : number
    │       ├── fusion_accepted_count      : number
    │       ├── possession_accepted_count  : number
    │       ├── forbidden_intimacy_flags   : Array
    │       ├── sacred_desecration_count   : number
    │       ├── same_npc_harm_max          : number
    │       ├── _npc_harm_tally           : object
    │       ├── npc_as_resource_count      : number
    │       ├── betrayed_high_trust_npcs   : number
    │       ├── self_sacrifice_for_power   : number
    │       ├── fusion_and_self_harm_total : number
    │       ├── harbor_visits             : number
    │       ├── sea_acceptance_flags      : Array
    │       ├── sleep_streak             : number
    │       ├── work_only_days           : number
    │       ├── safehouse_stay_days      : number
    │       ├── move_only_days           : number
    │       ├── record_only_days         : number
    │       ├── low_intervention_count   : number
    │       ├── work_count               : number
    │       ├── hoarded_money_max        : number
    │       ├── hoarded_food_max         : number
    │       ├── archive_consumed_count   : number
    │       ├── prophecy_spread_count    : number
    │       ├── redeemed_npcs            : number
    │       ├── thirteenth_bell_obsession: number
    │       ├── meta_boundary_breaks     : number
    │       ├── final_choice_refused_count: number
    │       ├── save_delete_attempts     : number
    │       ├── loop_exploit_score       : number
    │       └── loop_break_attempts      : number
    │
    └── [运行时层 — 不持久化]
        （由 toPersistedState 过滤掉）
        ├── _effects
        ├── _lastAction
        ├── _runtime
        ├── _debug
        └── _actionHistory
```

---

## 3. 版本迁移历史

| 版本 | 变更 | 迁移动作 |
|------|------|---------|
| ≤1.1 | 旧版（扁平行为计数器在 state 顶层） | 迁移到 `behaviorTracking` 对象 |
| 1.2.0 | NPC 键从中文名迁移到稳定 ID | `resolveNpcId()` 重映射 `npcTrust`/`npcStates` 等 |
| 1.2.0 | 物品 ID 迁移 | `migrateInventory()` 重映射 `inventory` |
| 1.2.0 | 难度等级上限 21→13 | clamp `difficultyLevel` 到 13 |

---

## 4. 冻结规则

### 4.1 允许的变更（小版本 patch）

- 新增可选字段（带默认值）
- 扩展 `behaviorTracking` 计数器列表
- 扩展 `unlockedAreas` / `unlockedEndingConditions`
- 新增 transient key（不持久化）

### 4.2 不允许的变更（需要大版本 bump）

- 修改顶层五字段结构
- 删除或重命名已持久化字段
- 改变字段类型（如 `number` → `string`）
- 修改 `TRANSIENT_STATE_KEYS` 导致已有存档丢失运行时状态

### 4.3 冻结检查清单（发布前）

```
□ SAVE_VERSION 已更新
□ ensureMinimalExtendedState() 包含所有新增字段的默认值
□ migrateSaveData() 处理旧版本 → 新版本的转换
□ toPersistedState() 的 transientKeys 列表完整
□ 加载旧存档后 ensureExtendedState() 二次补全
□ 手动测试：旧存档 → 新版本 → 正常加载
```

---

## 5. 与其他系统的边界

| 边界 | 说明 |
|------|------|
| SaveManager ↔ saveMigration | DI 注入：`configureSaveManager({ SAVE_VERSION, migrateSaveData, toPersistedState })` |
| SaveManager ↔ Reducer | `saveToSlot(slotId, state)` 接收完整 state，内部调用 `toPersistedState` |
| SaveManager ↔ UI | `exportSave()` / `importSave()` 是纯 JSON 文件操作 |
| saveMigration ↔ registries | `resolveNpcId` / `migrateInventory` 从 registry 导入，不硬编码映射 |
