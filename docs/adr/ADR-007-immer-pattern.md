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

## 2026-07-18 补充：应用壳层不得手写“不完整全量 state”

如果应用壳层需要把 `game` 继续传给多个页面、弹窗和布局组件，它消费的是开放式的完整状态协议，不能用手写字段列表伪装成“完整 state”。字段列表会随功能演进漏掉 `prologue`、`stats`、`guideSeen` 等字段，导致 reducer 已正确更新但页面静默返回 `null`。

- 应用壳层直接订阅完整 store state，并只额外合并明确的派生字段。
- 只有边界清晰的叶子组件才使用窄 selector；窄 selector 的返回值不能再作为完整 state 向下透传。

## 2026-08-08 补充：过渡容器缓存 React 节点必须同步同屏更新

页面过渡组件可以在跨屏动画期间暂存旧 `children`，但“当前 screenKey 未变化”不代表页面数据未变化。若缓存同步 effect 只依赖 `screenKey`，角色创建中的掷骰、难度和职业选择等同屏更新会被静默冻结。缓存 React 节点时必须把 `children` 纳入依赖，或只在过渡阶段缓存旧节点；E2E 需要覆盖至少一个不改变 screenKey 的交互更新。
- 页面跳转的 E2E 必须断言目标页面真实挂载，避免只验证 action 或 store 字段。

## 2026-08-08 补充：全量重置也必须遵守 mutation 契约

迁移到 Zustand + Immer 后，旧 reducer 的“构造新对象并 `return`”不会自动替换 Store state；legacy 路由包装器只声明 action 所有权，根 reducer 最终仍返回原 draft。`NEW_GAME` 这类全量重置必须先用旧 state 构造下一状态，再删除旧游戏字段并把新字段写回同一个 draft，同时保留 Store 方法和注入的 `_GD`。

- Slice handler 统一返回 `null`，不得把 replacement object 当成隐式协议。
- 不得把 Immer draft 自身存入下一状态；跨周目只保留消费方需要的普通数据快照。
- 测试必须通过真实 `useGameStore.dispatch()` 验证重置，不能只直接调用 handler 并断言返回值。

## 2026-08-08 补充：state 中存在 Map/Set 时必须启用 Immer 插件

事件去重索引 `_triggeredSet` / `_silentSet` 会在探索 reducer 内读取和修改。Zustand Immer 中间件不会自动启用 Map/Set drafting；Store 初始化必须调用 `enableMapSet()`。否则 action 会在访问 Set 时抛错，再被兼容路由捕获为警告，形成“探索按钮有响应但事件状态没有更新”的静默失败。真实 Store 回归测试必须覆盖一次包含 Set 索引的探索分发。

## 2026-08-09 补充：React 组件读取 Zustand 状态必须订阅

`store.getState()` 或兼容包装器 `uiStore()` 只返回调用瞬间的快照，不会让 React 组件在后续 `setState()` 时重渲染。组件若用快照读取 `activeHotspot`、`activePanel` 等临时 UI 状态，会出现点击已执行但界面只有在另一次无关更新后才偶发出现的时序 bug。

- React 渲染路径必须通过 `useUiStore(selector)` / `useGameStore(selector)` 订阅所需字段。
- `uiStore.getState()`、`uiStore()` 仅用于事件处理器和非 React 边界的即时读取。
- E2E 应直接点击当前区域热点并断言面板立即出现，避免等待无关计时器掩盖缺少订阅的问题。

## 2026-08-09 补充：可开关组件的 Hook 必须位于提前返回之前

Modal 常以 `if (!open) return null` 保持挂载但隐藏。所有 `useState`、`useEffect`、`useMemo`、`useRef` 必须在该提前返回之前无条件调用；禁止在 JSX 表达式中临时调用 Hook。否则组件从关闭切换为打开时 Hook 数量变化，生产构建会触发 React #310 并让整个游戏进入 ErrorBoundary。

- 派生列表先在组件顶部通过 Hook 计算，再在 JSX 中按长度决定是否渲染。
- 浏览器测试必须至少打开一次每个长期挂载的核心 Modal，不能只测试其关闭状态。
