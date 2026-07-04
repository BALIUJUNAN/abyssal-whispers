# ADR-029: 引擎层保持纯 JavaScript，移除 TypeScript 文件

**日期**: 2026-07-02
**状态**: 已采纳

## Context

`src/engine/` 存在 3 对 `.ts` + `.js` 文件（EventEngine、PollutionManager、SaveManager），共 6 种格式。
项目使用 Vite ESM 构建，不编译 TypeScript。`tsconfig.json` 设置了 `noEmit: true`（仅类型检查）。
`.ts` 文件未被任何其他文件 import，`tsc --noEmit` 通过但无消费方。

## Decision

保持引擎层纯 JavaScript：

1. 删除 3 个 `.ts` 文件（EventEngine.ts、PollutionManager.ts、SaveManager.ts）
2. 删除 `tsconfig.json`
3. 保留 `.js` 文件作为唯一实现
4. ENGINE_CONTRACT.md 记录"JavaScript only"规则

## Rationale

- `.ts` 文件是死代码 — 未被任何文件 import，Vite 不编译，CI 不检查
- 全面迁移到 TS 成本高：145 个 JS 文件需要迁移、Vite 配置需要调整、团队需要学习成本
- 对于独立游戏项目，JS 的灵活性和迭代速度更符合需求
- 类型检查收益（边界检查）已通过 `lint:engine` 和 ESM import 静态分析实现

## Consequences

- ✅ `src/engine/` 统一为 JS，消除格式混用困惑
- ✅ 删除死代码，减少维护负担
- ✅ 无需维护 `tsconfig.json` 和 TS 构建配置
- ⚠️ 如果未来需要 TypeScript，需要从零开始规划全项目迁移
