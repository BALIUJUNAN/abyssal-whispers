# ADR-002: 确定性 RNG 全链路接入

**日期**: 2026-06-15 ~ 2026-06-18
**状态**: 已采纳

## Context

项目引入了 `createSeededRng` + `c.rng` 实现确定性回放，但 reducer 工具函数中的
`Math.random()` / `rand()` / `pick()` 调用未传入 rng，导致存档回放和 bug 复现不可靠。
这是"设计了但没接入"的典型——架构存在但调用点遗漏。

## Decision

1. 工具函数签名接收 `rng` 作为可选末参：`function foo(..., rng)`
2. 工具函数内部用 `var _rand = makeRand(rng)` 创建本地随机源
3. Slice handler 调用时传入 `c.rng`：`foo(..., c.rng)`
4. 替换模式：
   - `Math.random() < 0.4` → `(c.rng ? c.rng.next() : Math.random()) < 0.4`
   - `rand(1, 100)` → `rand(1, 100, c.rng)`
   - `pick(arr)` → `pick(arr, c.rng)`
5. 新增函数如果涉及随机，第一版就必须接受 rng 参数
6. 每次重构后 grep `Math.random()` 和 `pick(` 检查接入情况

## Consequences

- ✅ 存档回放完全可复现
- ✅ 同一 action index 永远产生相同随机序列
- ⚠️ rng 可能为 null（如测试环境），需要 fallback 模式
- ⚠️ 子函数如果内部用了随机，必须把 c 作为参数传入

## 2026-08-08 补充：handler 内禁止随机源降级

Store 创建的 reducer context 保证存在 `c.rng`。因此 slice handler 和它直接调用的流程函数应直接使用 `c.rng.next()`；`c.rng ? ... : Math.random()` 会掩盖 context 接线错误并破坏回放。只有明确设计为可独立调用的叶子工具函数，才允许通过 `makeRand(rng)` 提供无 RNG 兜底。

## 2026-08-09 补充：随机函数签名、动态内容与后台 action 必须同链路

一次 RNG 审计暴露了三种仅搜索裸 `Math.random()` 无法发现的泄漏：

1. `makeRand(rng)` 返回的是零参数 `[0, 1)` 函数，不能按 `_rand(min, max)` 调用；整数选择使用 `rng.pick()` / `rand(min, max, rng)`。
2. 函数型事件描述和跨轮回死亡碎片同样属于游戏结果，调用方必须把当前 `c.rng` 继续传入，禁止用 `null` 主动降级。
3. 定时视觉脉冲、过渡清理和异步 LLM 叙事不应因为墙钟时序不同而推进玩法 `_actionIndex`；这类 dispatch 必须声明 `meta.consumeGameplayRng = false`。

新增 `npm run lint:rng` 门禁：游戏逻辑目录中的直接 `Math.random()` 必须带 `rng-exempt:` 理由，并拦截 `c.rng` 降级、`_rand(min,max)` 误用和死亡碎片显式传 `null`。

## 2026-08-10 补充：无参 `pick` 同样是 RNG 泄漏

只搜索 `Math.random()` 不足以证明可复现：`pick(pool)` 在未传第二参数时会内部降级到裸随机。沉默事件曾因此让同 seed 在相同 action index 上选出不同事件，随后 SAN、AP 和整条路线分叉。所有 reducer 可达的选择函数都必须把 `c.rng` 透传到叶子；确定性门禁应覆盖无 RNG 的 `pick(...)`，完整游玩审计还必须在同一进程中连续回放同 seed，并报告首个持久字段分叉。

展示随机如果被写入 `eventLog`、叙事或缓存，也已成为可观察状态。区域名称在 reducer 内必须使用 `c.rng` 并缓存；纯 UI 重渲染没有 `c.rng` 时，使用 `runSeed + day + areaId` 派生的稳定展示 RNG，禁止每次 render 调裸随机造成名称闪烁。

死亡归因是持久 `deathContext` 的一部分，不是可忽略的文案装饰。所有 reducer 中的 `resolveDeath(...)` 调用都必须传入 `c.rng`，让 `selectDeathNarrative` 使用同一 action 随机链；仅修死亡碎片而漏掉归因变体，仍会造成同 seed 存档快照不同。
