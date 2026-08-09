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

## 2026-07-18 补充：legacy handler 必须显式声明 action 所有权

现有 switch handler 在“已处理”和 default 分支都返回 `null`，不能靠返回值实现 first-match-wins；否则一个 action 会落入后续所有 slice，既产生无关异常，也可能重复修改状态。迁移完成前，store 注册 legacy handler 时必须同时声明其 action type 集合，并由包装器在命中后返回 `true`。新增或移动 action 时，case 与注册表必须同步更新，并由完整流程测试覆盖。

## 2026-08-08 补充：注册表与 case 集合自动对账

完整流程不一定触发每个 action。回归测试必须静态提取所有 slice 的 `case 'ACTION'`，并与 `useGameStore` 的 `claimActions` 注册段对比：不允许漏注册，也不允许重复归属。

## 2026-08-08 补充：action 所有权返回值不承载 replacement state

`claimActions` 的布尔返回值只表示“该 action 已被此 slice 接管”，不能复用为 reducer 的新状态返回值。所有 legacy handler 必须原地修改 draft；需要全量重置时显式执行 draft 字段替换。任何直接断言 handler 返回新对象的测试都必须改为真实 Store 分发测试。

## 2026-08-08 补充：全局 after hook 必须区分玩家行动与生命周期 action

`systemSlice.after` 会收到包括 `NEW_GAME`、`CONTINUE_GAME`、设置更新在内的所有 action。SAN 偷取、行动代价等玩法后果只能对白名单中的真实玩家行动生效；不能用“除两个特殊 action 外全部执行”的反向排除法。否则低 SAN 存档会在读取完成的同一次 dispatch 中再次损失 AP，破坏存档往返一致性。

## 2026-08-08 补充：reducer 与 hook 异常必须终止事务

`before`、领域 reducer、`after` 都会修改同一个 Immer draft，其中任何阶段异常后继续运行都会提交部分状态。`combineSlices` 只能为异常补充 action、slice、phase 上下文，随后必须重新抛出；禁止仅 `console.warn` 后继续。Store 在 Immer 事务外统一记录失败：开发和测试环境重新抛出，生产环境显示“操作失败且状态未改变”，两者都不得刷新本轮副作用。

未知 action 也不能默认为成功。root reducer 必须返回 `handled`，Store 对未归属 action 触发同样的回滚与报告流程。错误追踪必须位于 Store 的统一 dispatch 边界，不能只放在 React 包装 hook 中，否则地图模式和后台副作用的直接分发会绕过记录。回归测试至少覆盖 reducer、legacy handler、before/after hook、未知 action、完整回滚、after 不继续执行和失败后下一次正常 action 可恢复。

## 2026-08-09 补充：领域分支必须独占一次玩法结算

领域 handler 若已负责计数器、信任、阵营或人性变更，外层 dispatcher 不得在 handler 返回后再运行一套旧的“补充处理”。handler 可能清空或改写 `pendingNpc` 等路由状态，用变更后的状态判断是否补算会造成分支不一致：多数操作被跳过，少数保留弹窗的操作却重复计数。

- 先确定唯一的结算所有者，再由该 handler 同步完成直接变更和关系涟漪。
- 不得用 handler 修改后的临时 UI 状态判断是否执行玩法后果。
- 不得用空 `catch` 将结算异常降级为静默失败；异常必须交给统一事务边界回滚和记录。
- 回归测试应覆盖计数恰好一次、直接信任、关系传播和阵营变化。
