# ADR-012: 新计数器必须四注册

**日期**: 2026-06-18
**状态**: 已采纳

## Context

`clue_finds` 计数器在 `getPlayerBehaviorProfile` 中被读取，但：
- `initialState` 的 `behaviorTracking` 中没有 `clue_finds`
- 没有 reducer 在获得线索时递增它
- `loopReducer` 的 `BEHAVIOR_COUNTERS` 列表中没有它
- `endingReducer` 的 `CONDITION_VAR_MAP` 中没有它

结果：investigator 原型永远不计线索发现数。

类似模式还出现在 milestones、firstLoopBalance 等功能的"设计了但没接入"场景。

## Decision

新计数器必须"四注册"：
1. `initialState.js` → 初始值 `0`
2. reducer 递增点 → 获得线索/完成行动时 `s.behaviorTracking.clue_finds++`
3. `loopReducer.js` → `BEHAVIOR_COUNTERS` 列表
4. `endingReducer.js` → `CONDITION_VAR_MAP`（如果结局条件需要）

## Consequences

- ✅ 新计数器从定义到读取的链路完整
- ✅ 行为原型评分正确
- ⚠️ 需要维护四个位置的同步
