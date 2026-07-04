# ADR-016: typeof 保护不等于正确性

**日期**: 2026-06-18 ~ 2026-06-19
**状态**: 已采纳

## Context

多个地方使用 `typeof x === 'function'` 保护，但效果是"防止崩溃而非保证正确"：

1. `effectExecutor.js` 的 `require()` 在 ESM 下未定义 → try/catch 吞掉 → 十三声钟入口钩子永远不触发
2. `saveMigration.js` 的 `resolveNpcId` 和 `migrateInventory` → typeof 为 'undefined' → 迁移永远不执行
3. `achievementReducer.js` 的 `catch { return fallback }` → 条件错误被静默忽略

## Decision

1. **typeof 保护应同时记录"功能被禁用"的日志**——不只是吞掉错误
2. **ESM + CommonJS 混用是定时炸弹**——`require()` 在 ESM 下静默失败（try/catch 吞掉），功能永久失效
3. **catch 块不应无条件覆盖上层已写入的值**
4. 空 catch 块需要注释说明"为什么安全地忽略"

## Consequences

- ✅ 隐形功能缺失更容易被发现
- ✅ ESM/CJS 混用问题被显式处理
- ⚠️ 日志输出增加
