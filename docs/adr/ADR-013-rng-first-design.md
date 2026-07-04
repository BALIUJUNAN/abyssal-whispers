# ADR-013: 新函数涉及随机时必须接受 rng 参数

**日期**: 2026-06-18
**状态**: 已采纳

## Context

新增函数如果涉及随机，第一版就必须接受 rng 参数。
后补比一开始就写难 10 倍。

具体实例：
- `EventEngine.js` 的 `getDistortionVariant`：6 处 `Math.random()`，无 rng 参数
- `sanReducer.js` 的 `rollMadness`：`pick(table)` 未传 rng
- `appHelpers.js` 的 `narrDailySummary`、`checkBreakWallEvent`：`Math.random()` 未接入
- `loopReducer.js` 的 `initLoopState`：`pick(coreNpcs)` 未传 rng

## Decision

1. 新增函数如果涉及随机，第一版就必须接受 `rng` 参数
2. 工具函数签名：`export function foo(..., rng) { var _rand = makeRand(rng); ... }`
3. 调用方：`foo(..., c.rng)`
4. 搜索关键词：`pick(` 和 `Math.random()` — 每次重构后 grep 检查

## Consequences

- ✅ 新代码从一开始就符合确定性 RNG 规范
- ✅ 减少后补 rng 参数的大量 diff
- ⚠️ 需要在新函数评审时检查 rng 参数
