# 事件编写指南

## 核心规则

### 1. ID 引用（不是中文名）

```
NPC 引用:    "martha_grey"     不要 "玛莎·格雷"
区域引用:    "harbor_district"  不要 "码头区"
物品引用:    "silver_dagger"    不要 "银质匕首"
```

查 ID：`node -e "console.log(require('./src/data/registry/npcRegistry.cjs').NPC_REGISTRY)"`

### 2. effects 只能使用注册过的 type

```
合法: HP, san, food, items, add_flag, add_clue, add_item, npc_trust,
      safehouseCorruption, add_run_memory, mythos, humanity, _meta_effect

非法: 任何未注册的 key 会导致 E03 警告
```

### 3. conditions 结构

```
合法: "player_san <= 0"
合法: "completed_clue_chains >= 2"
合法: "has_key_blood OR has_alternative_seal"

规则:
  - OR/AND 必须大写
  - 括号必须配对
  - 不能有空条件
```

### 4. 新增债务会 FAIL

构建时 `python build.py --prod` 会运行验证器。如果新增了：

- 未注册的 NPC/物品引用 → E14/E15 ERROR
- 超过 baseline 的中文引用 → E11_BASELINE/E12_BASELINE ERROR

## 事件结构

```json
{
  "id": "evt_harbor_021",
  "name": "码头阴影",
  "type": "area_event",
  "event_classification": "区域事件",
  "chapter": 1,
  "trigger": {
    "areas": ["harbor_district"],
    "condition": "day >= 3"
  },
  "description": "你在码头边看到了...",
  "effects": {
    "san": -2,
    "items": ["tide_timetable"],
    "npc_changes": [{ "name": "martha_grey", "trust_delta": 1 }]
  },
  "sanity_damage": 2
}
```

## 快速参考

| 实体类型 | Registry        | 查 ID 命令                                                                                          |
| -------- | --------------- | --------------------------------------------------------------------------------------------------- |
| NPC      | npcRegistry.js  | `node -e "console.log(Object.keys(require('./src/data/registry/npcRegistry.cjs').NPC_REGISTRY))"`   |
| 区域     | areaRegistry.js | `node -e "console.log(Object.keys(require('./src/data/registry/areaRegistry.cjs').AREA_REGISTRY))"` |
| 物品     | itemRegistry.js | `node -e "console.log(Object.keys(require('./src/data/registry/itemRegistry.cjs').ITEM_REGISTRY))"` |
