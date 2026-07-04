# ADR-024: systemSlice.js after hook 缺少 ctx 参数

**日期**: 2026-07-02  
**状态**: 已采纳（修复）  
**关联**: ADR-006（c 与 ctx 命名分离）、ADR-022（combineSlices 分发路由）

## Context

`systemSlice.after` 函数签名为 `after: function(s, action, c)`，
但内部调用 `applySanConsequences(s, c, action.type, ctx)` 时引用了未声明的 `ctx`。

`combineSlices` 的 `rootReducer(state, action, c)` 只传 3 个参数，
`ctx` 不在作用域内。JavaScript 在非严格模式下静默创建全局变量，
但该全局始终为 `{}`——导致 `applySanConsequences` 中的
`getCurrentSanStage(s.san, { GD: {} })` 永远拿不到真实 GD 数据。

SAN 阶段判断退化为无 GD 的 fallback，影响等级 5+ 的强制 AP 偷取
`tryApSteal` 的准确性。

## Decision

1. `after` 函数签名改为 `after: function(s, action, c, ctx)`
2. `combineSlices` 的 `_runHook` 已将 `ctx` 传给所有 hook（第 127 行）
3. 签名对齐后，`applySanConsequences` 收到真实的 `ctx.GD`

## Consequences

- ✅ `applySanConsequences` 获得正确的 GD 数据
- ✅ SAN 等级判断基于真实 game data，不再退化为 fallback
- ✅ 与 `before` hook 签名一致（before 已接收 s, action, c, ctx）
- ⚠️ 自定义 hook 调用方必须确保传 4 个参数
