# ADR-002: 确定性 RNG 全链路接入

**日期**: 2026-06-15 ~ 2026-06-18
**状态**: 已采纳

## Context

项目引入了 `createSeededRng` + `c.rng` 实现确定性回放，但 reducer 工具函数中的
`Math.random()` / `rand()` / `pick()` 调用未传入 rng，导致存档回放和 bug 复现不可靠。
这是"设计了但没接入"的典型——架构存在但调用点遗漏。

## Decision

1. 工具函数签名接收 `rng` 作为可选末参：`function foo(..., rng)`
2. 工具函数内部用 `var _rand = makeRand(rng)` 创建本地随机源
3. Slice handler 调用时传入 `c.rng`：`foo(..., c.rng)`
4. 替换模式：
   - `Math.random() < 0.4` → `(c.rng ? c.rng.next() : Math.random()) < 0.4`
   - `rand(1, 100)` → `rand(1, 100, c.rng)`
   - `pick(arr)` → `pick(arr, c.rng)`
5. 新增函数如果涉及随机，第一版就必须接受 rng 参数
6. 每次重构后 grep `Math.random()` 和 `pick(` 检查接入情况

## Consequences

- ✅ 存档回放完全可复现
- ✅ 同一 action index 永远产生相同随机序列
- ⚠️ rng 可能为 null（如测试环境），需要 fallback 模式
- ⚠️ 子函数如果内部用了随机，必须把 c 作为参数传入
