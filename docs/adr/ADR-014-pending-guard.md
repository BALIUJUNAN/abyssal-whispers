# ADR-014: slice handler 必须检查 pending 状态

**日期**: 2026-06-18
**状态**: 已采纳

## Context

`CHOICE_SELECT` 和 `GAMBLE_CHOICE` 有 pending 守卫，但 `NPC_RESPONSE` 遗漏了。
如果玩家在没有 `pendingNpc` 时 dispatch `NPC_RESPONSE`（如通过快速点击），会 TypeError 崩溃。

类似问题：所有 action handler 入口必须检查 pending 状态。

## Decision

1. 所有 action handler 入口必须检查对应的 pending 状态
2. 如果 pending 为 null/undefined，直接 return draft（不做任何变更）
3. 作为系统Slice的 before hook 统一检查，或在每个 handler 开头检查

## Consequences

- ✅ 快速点击不再导致崩溃
- ✅ 所有 action handler 的入口守卫一致
- ⚠️ 需要在新增 action type 时记得添加守卫
