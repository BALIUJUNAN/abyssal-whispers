# ADR-007: Immer 使用规范

**日期**: 2026-06-14 ~ 2026-06-15
**状态**: 已采纳

## Context

Immer 允许在 `produce` 回调中直接修改 draft 对象。但开发者混合了两种模式：
1. 纯 mutation（修改 draft + return undefined）
2. 纯 return（返回新 state 对象）

混合使用导致 draft proxy 泄漏到 produce 外部。

## Decision

1. **纯 mutation 模式**——修改 draft + return undefined（不 return 新对象）
2. **不要混合**——修改 draft 后又 return 新对象，新对象的嵌套字段仍引用 draft proxy
3. **useReducer dispatch 无返回值**——effects 用 module-level buffer
4. **不要在 produce 回调中执行副作用**——`clearInterval` 等操作应在 produce 外部

## Consequences

- ✅ Immer 正确追踪变更
- ✅ 禁止了 state 直接赋值的错误模式
- ⚠️ 每个 reducer 函数签名需要包含 draft 参数
- ⚠️ 需要在代码审查中检查 mutation/return 一致性
