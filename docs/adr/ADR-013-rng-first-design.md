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

## 2026-07-18 补充：函数体使用 rng 时，签名必须同步声明

把实现改为 `rng ? rng.next(...) : Math.random()` 但忘记在函数签名增加可选末参，会在对应 UI 首次挂载时直接抛 `ReferenceError`。代码审查和静态扫描应把“函数体出现 `rng`、参数表没有 `rng`”视为阻断问题；调用方可以省略可选参数，但被调用函数必须显式声明。

## Consequences

- ✅ 新代码从一开始就符合确定性 RNG 规范
- ✅ 减少后补 rng 参数的大量 diff
- ⚠️ 需要在新函数评审时检查 rng 参数
