# ADR-017: 模块级可变状态的边界规则

**日期**: 2026-06-15 ~ 2026-06-19
**状态**: 已采纳

## Context

模块级可变状态是必要的（effect buffer、executed FX ID set、eventBus listeners），
但没有清晰的边界规则导致维护困难：
- 原 `gameReducer.js` 的 `_pendingEffects` 无上限（已删除 — effects 显式传递，无需模块级 fallback）
- `effectExecutor.js`（含 effects buffer）的 `_executedFxIds` 无清理机制
- `eventBus.js` 的 `_listeners` 无生命周期绑定

## Decision

1. **模块级状态必须有上限**——`_FX_DEDUP_CAP = 300`、`_HISTORY_CAP = 50`
2. **效果 buffer 只存在于 dispatch 周期内**——不持久化到 state
3. **eventBus listeners 应有清理机制**——与组件生命周期绑定
4. **side effect 延迟执行**——reducer 只收集 effects，flush 在 set() 之后异步执行

## Consequences

- ✅ 模块级状态不会无限增长
- ✅ Side effects 可序列化、可重放、可调试
- ⚠️ 需要理解 dispatch → flush 的两阶段模型

## 2026-08-08 补充：共享游戏定义必须只读

事件效果对象来自共享 GD，同一个定义会被多个存档和多次行动复用。效果结算不得直接改写或删除定义字段；进入适配器后先复制顶层对象，再对副本执行资源折扣等变换。回归测试必须确认输入定义在结算前后深度相等。
