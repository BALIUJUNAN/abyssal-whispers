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
