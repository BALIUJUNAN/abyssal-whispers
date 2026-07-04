# ADR-004: reducer context `c` 的回调参数禁止使用 `c`

**日期**: 2026-06-14 ~ 2026-06-15
**状态**: 已采纳

## Context

Slice handler 签名 `(s, action, c, ctx)` 中，`c` 是 reducer context（`{ narr, effects, bt, rng }`）。
在 `.find`/`.filter`/`.map` 的 arrow 回调里用 `c` 作为参数名会遮蔽外部的 c，
导致 `c.rng`、`c.narr` 等访问全部指向错误对象。

发生 3 次：uiSlice.js 前传选项卡死、npcSlice.js NPC 食物文本不显示、uiSlice.js 线索名记录错误。

## Decision

1. 回调参数不要用 `c`——用 `x`、`item`、`entry`、`cond` 等
2. 搜索命令：`grep -rn "\.find((c)" src/reducers/` 拦截所有遮蔽
3. `c` 和 `ctx` 是完全不同的对象，名字太相似极易混淆（见 ADR-006）

## Consequences

- ✅ 消除回调遮蔽导致的运行时错误
- ⚠️ 需要代码审查时额外检查回调参数名
