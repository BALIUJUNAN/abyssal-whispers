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

## 2026-07-18 补充：组件内的 GD 来源也必须真实存在

组件拆分后不能沿用旧变量名（例如在只有 `props` 的组件中读取 `state._GD`）。这类代码构建能通过，但只在目标页面挂载时抛 `ReferenceError`。组件应通过 props 显式接收 GD，或从 `state/gameData.js` 显式 import 共享只读 GD；调用纯函数时继续包装为 `{ GD }`。

共享查询工具同样不能把旧拼接构建里的自由变量 `GD` 当作参数。工具函数应显式接收 `ctx`，内部使用 `ctx?.GD || state?._GD || {}` 做边界兜底，所有已知调用方仍需传入 `{ GD }`。经典模式和地图模式必须分别挂载测试，因为它们会触发不同的查询链路。

## 2026-08-08 补充：可选 GD 不能让核心规则静默失效

标为“不依赖全局 GD”的公共计算函数，在没有传入 GD 时必须仍有与基础规则一致的语义兜底，不能把空对象交给查询函数后默认为最高健康阶段。`resourceFraud` 使用明确的 SAN 区间作为无 GD 兜底，并用低 SAN 单元测试验证功能确实激活。

## 2026-08-08 补充：数据驱动的可见性回调也属于 GD 调用链

地图热点的 `visibleWhen`、弹窗行动生成和经典模式行动列表都必须把 `{ GD }` 传给共享查询函数。仅修复工具函数签名而遗漏回调层，会让查询安全地返回空数组，功能仍永久不可见。工具可使用 `state._GD` 做边界兜底，但已知调用方仍应显式传递上下文；React memo 依赖还必须包含决定可见性的状态（例如 `npcTrust`）。

## 2026-08-08 补充：纯查询包装器禁止反向 import Store

`sanReducer.getSanStageFromGD` 被 reducer、系统和 UI 广泛依赖；若它为了读取 `_GD` 反向 import `useGameStore`，会把整个 reducer 图和 Store 合并成一个大型 ESM 强连通分量。无法逐层传 ctx 的兼容查询应读取 `state/gameData.js` 的共享只读 holder，并由 `seedState(gd)` 同步该 holder。数据模块必须保持叶子依赖，不能再反向引用 Store。
