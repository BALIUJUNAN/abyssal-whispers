# ADR-020: setter 函数内置 clamp

**日期**: 2026-06-18
**状态**: 已采纳

## Context

`setNpcTrust(s, name, value)` 直接写入值，不 clamp 到 [0, 5]。
虽然当前所有调用方都手动 clamp，但遗漏风险高。
类似问题可能出现在其他 setter 中。

## Decision

1. Setter 函数应内置 clamp——不依赖调用方的记忆力
2. `setNpcTrust`：`s.npcTrust[id] = Math.max(0, Math.min(5, value))`
3. 其他 setter 遵循相同模式

## Consequences

- ✅ 防止溢出值
- ✅ 调用方不需要记得 clamp
- ⚠️ clamp 范围硬编码在 setter 中

## 2026-08-10 补充：资源效果必须同时限制上下界

`Math.min(max, current + delta)` 只限制增益溢出，负事件效果仍可把食物写成 `-1`，随后饥饿、UI 与存档读取会对同一状态产生不同解释。无论 typed `modify_resource` 还是 legacy 累积效果，资源提交点都必须使用同一个双向 `clamp(value, 0, max)`；连续游玩审计应在每个 action 后检查 HP、SAN、AP、食物等范围，不能只在休息结算时检查。
