# ADR-025: appHelpers.js 残留非确定性叙事 ID（Date.now + Math.random）

**日期**: 2026-07-02  
**状态**: 已采纳（修复）  
**关联**: ADR-019（叙事条目 ID 使用确定性序列）、ADR-002（确定性 RNG 全链路接入）

## Context

ADR-019 已将 `buildSliceCtx`（useGameStore.js）的叙事 ID 改为
`(actionIndex * 1000) + localSequence++` 确定性序列。

但 `appHelpers.js` 中仍有两条路径使用非确定性 ID：

1. `buildReducerCtx`（旧版 context builder）：`id: Date.now() + Math.random()`
   — 被 `useGameStore.js` 弃用后残留，但 `buildReducerCtx` 仍 export 且
     可能被外部调用方使用
2. `modHumanity`：`id: Date.now() + Math.random()`
   — 完全未接入 RNG，每次调用产生随机 ID

非确定性 ID 导致：
- 同一 gameplay 序列产生不同 narrative 数组
- 存档回放时 narrative ID 不匹配
- 测试中无法可靠比较 narrative 内容

## Decision

1. `buildReducerCtx` 的 narr 内部改用 `(opts.rng ? opts.rng.next() : Math.random()) * 0xFFFFFF | 0`
2. `modHumanity` 新增可选 `rng` 末参，ID 生成使用相同的 `_rand() * 0xFFFFFF | 0` 模式
3. 所有调用方（darkSlice.js 6 处、npcSlice.js 14 处）传入 `c.rng`

## Consequences

- ✅ 叙事 ID 可复现（同 seed + 同 action index → 相同 ID 序列）
- ✅ 存档回放一致性
- ✅ 测试可靠
- ⚠️ `0xFFFFFF | 0` 产生 24bit 整数 ID，碰撞概率极低但不为零
- ⚠️ `modHumanity` 调用方必须传入 `c.rng`（已全部更新）
