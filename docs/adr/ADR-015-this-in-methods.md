# ADR-015: 对象方法内部调用必须用 `this`

**日期**: 2026-06-18
**状态**: 已采纳

## Context

`errorTracker.js` 的 `toJSON()` 方法调用 `exportReport(...)` 而非 `this.exportReport(...)`。
模块作用域中没有 `exportReport` 函数 → ReferenceError。

## Decision

1. 对象方法内部调用其他方法必须用 `this.` 前缀
2. 如果方法被提取为独立函数，需要显式传递 `this` 或改为实例方法调用
3. 代码审查时检查对象方法链中的 `this` 使用

## Consequences

- ✅ 消除方法链调用中的 ReferenceError
- ⚠️ 需要理解 JS `this` 绑定规则
