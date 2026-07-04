# ADR-019: 叙事条目 ID 使用确定性序列替代 Date.now()

**日期**: 2026-07-02
**状态**: 已采纳

## Context

`buildSliceCtx` 中叙事条目的 ID 使用 `Date.now() + Math.random()`，
这是整条代码库中唯一一个打破种子 RNG 可复现性的点。
每次 dispatch 产生不同的叙事 ID，导致：
- 测试中 narrative 数组不可比较
- 存档回放时 narrative ID 不同

## Decision

1. 叙事条目 ID 由 `(actionIndex * 1000) + (localSequence++)` 生成
2. 完全确定性——同一 action index 永远产生相同 ID 序列
3. 不消耗游戏 RNG

## Consequences

- ✅ Narrative 数组在回放中完全一致
- ✅ 测试可以可靠地比较 narrative 内容
- ✅ 不依赖系统时钟
