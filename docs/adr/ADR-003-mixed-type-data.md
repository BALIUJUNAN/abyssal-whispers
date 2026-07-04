# ADR-003: 混合类型数据结构必须类型感知访问

**日期**: 2026-06-14 ~ 2026-06-18
**状态**: 已采纳

## Context

`state.clues` 数组同时存储 `string`（线索 ID）和 `{ id, name }`（线索对象）。
这种混合类型导致多个 bug：
- NPC 秘密叙事文本被当线索 ID 塞入 `s.clues`
- `CONSUME_ARCHIVE` 中 `pop()` 返回对象，拼入字符串显示 `[object Object]`
- `isAreaUnlocked` 用 `.includes()` 无法匹配对象元素

## Decision

1. 混合类型数组的查找必须用类型感知函数（`hasClueId`），不能用 `includes`
2. 从数组 pop/取出的值，拼入字符串前必须检查类型
3. NPC 数据中的 `secrets` 是叙事文本，不是线索 ID——代码注释应标明数据格式
4. Setter 函数应内置 clamp——不依赖调用方的记忆力

## Consequences

- ✅ 线索面板显示正确
- ✅ 区域解锁检测正确
- ✅ 减少类型检查遗漏
- ⚠️ 需要维护类型感知的访问函数而非直接用数组方法
