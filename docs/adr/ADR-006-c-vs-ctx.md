# ADR-006: `c` 与 `ctx` 命名分离

**日期**: 2026-06-15 ~ 2026-06-18
**状态**: 已采纳

## Context

Slice handler 有两个上下文参数，名字太相似：
- `c`   = `buildSliceCtx` 输出 `{ narr, effects, bt, rng }`（运行时，用于叙事和副作用）
- `ctx` = `{ GD }`（静态游戏数据，用于需要 GD 的函数）

`coreSlice.js` 中 `genObjectives(1, c)` 应为 `genObjectives(1, ctx)` → GD undefined 崩溃。
变量遮蔽回调参数名 `c` 加剧了混淆（见 ADR-004）。

## Decision

1. `c` = reducer context（narr/effects/bt/rng），用于叙事和副作用
2. `ctx` = `{ GD }`（游戏数据），用于需要 GD 的函数
3. Slice handler 的第一个动作应该是 `var GD = ctx.GD;`——和 `var _rand = makeRand(rng)` 一样重要
4. 建议：将 reducer context 重命名为 `rctx` 或 `rc`（尚未实施，待评估）

## Consequences

- ✅ GD 访问错误减少
- ✅ 函数签名自文档化（ctx 参数暗示需要游戏数据）
- ⚠️ 需要培训新贡献者理解双上下文约定
- ⚠️ `c` 作为单字母变量名仍可能在回调中被遮蔽（ADR-004 独立处理）
