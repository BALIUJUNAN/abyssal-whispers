# ADR-022: `combineSlices` 分发路由

**日期**: 2026-07-02
**状态**: 已采纳

## Context

`useGameStore.js` 使用 50+ 行 if/else-if 链分发 action 到 slice handler。
`combineSlices.js` 框架已经实现并测试，但 store 未使用它的 dispatch map。
这是"写了代码但没接上"的典型。

## Decision

1. `useGameStore.dispatch` 使用 `combineSlices` 构建的 root reducer
2. 8 个 domain slice 各用 `createSlice({ name, handler })` 声明
3. `systemSlice` 的 before/after hooks 由 combineSlices 自动管理
4. 新增 action type 只需在对应 slice 的 switch/case 中添加一行

## Consequences

- ✅ 分发逻辑数据驱动，不再硬编码
- ✅ systemSlice.before/after 自动注入
- ✅ 新增 action type 的改动面最小化
- ⚠️ createSlice 配置和 handler 实现分在两处
