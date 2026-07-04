# ADR-018: `window.GD` 全局依赖的消除策略

**日期**: 2026-06-18 ~ 2026-07-02
**状态**: 已采纳（部分实施）

## Context

多个文件通过 `window.GD` 获取游戏数据，破坏纯函数测试，也违反了 `ctx` 约定。
`main.jsx` 在启动时设置 `window.GD = GD`，使得全局可用但隐式耦合。

## Decision

1. **所有需要 GD 的函数必须通过 `ctx` 参数传入**——`ctx.GD`
2. ** Eliminate `window.GD` fallback**——改为 `ctx?.GD || {}`
3. **已修复文件**：`appHelpers.js`、`deathLegacies.js`、`sanConsequenceChain.js`、`resourceFraud.js`、`resourceNarrative.js`、`npcSchedule.js`、`selectors.js`
4. **保留 `window.GD` 的场景**：`main.jsx`（启动赋值）、`DevPanel.jsx`（开发工具）、`sanityVisual.js`（纯计算函数，调用点多）
5. **长期目标**：所有调用路径都显式传递 ctx

## Consequences

- ✅ 函数可独立测试（不依赖全局状态）
- ✅ 数据流显式化
- ⚠️ 需要重构所有调用点传入 ctx
- ⚠️ 纯计算函数（sanityVisual.js）仍依赖 window.GD fallback
