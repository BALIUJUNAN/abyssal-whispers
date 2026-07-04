# ADR-023: npcSchedule.js 三个函数使用未声明的 GD 变量

**日期**: 2026-07-02  
**状态**: 已采纳（修复）  
**关联**: ADR-018（消除 window.GD 全局依赖）

## Context

`npcSchedule.js` 的 `getNpcLocations`、`processNpcEncounters`、`_getAreaDisplayName`
三个函数直接引用 `GD` 变量，但该变量既未在函数参数中声明，也未被 import。

在严格模式下直接抛出 `ReferenceError: GD is not defined`。
在非严格模式下静默依赖 `window.GD` 全局，与 ADR-018 的消除策略直接冲突。

`computeDailyNpcLocations` 虽然正确接收了 `GD` 参数，但调用方
`dayAdvance.js` 使用 `ctx?.GD` 传递，而 `getNpcLocations` 的调用方
（如有）无法传递 GD——签名不匹配。

## Decision

1. `getNpcLocations(state, areaId)` → `getNpcLocations(state, areaId, GD)`
2. `processNpcEncounters(state, c)` → `processNpcEncounters(state, c, GD)`
3. `_getAreaDisplayName(areaId)` → `_getAreaDisplayName(areaId, GD)`
4. `dayAdvance.js` 调用 `processNpcEncounters(s, c, ctx?.GD)` 显式传入
5. 所有内部引用 `GD.npcs` / `GD.areas` 改为 `GD?.npcs` / `GD?.areas` 防御性访问

## Consequences

- ✅ 消除严格模式下的 ReferenceError
- ✅ 函数可独立测试（不依赖全局 window.GD）
- ✅ 调用链显式化：GD 从 ctx 传递到每个需要它的函数
- ⚠️ 函数签名增加一个参数，调用方必须同步更新
- ⚠️ `getNpcLocations` 目前仅在测试和潜在外部调用中使用，需确认所有调用点
