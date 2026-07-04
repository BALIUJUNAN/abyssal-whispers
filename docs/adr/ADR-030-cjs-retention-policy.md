# ADR-030: CJS 文件的保留范围与策略

**日期**: 2026-07-02
**状态**: 已采纳

## Context

项目使用 `"type": "module"`（package.json），所有 `.js` 文件按 ESM 处理。
但代码库中存在 ~50 个 `.cjs` 文件，分布在 `tests/`、`scripts/` 和根目录。
这些文件使用 `require()` / `module.exports`，与 ESM 形成双格式张力。

项目评审建议"在 ADR 中记录 CJS 保留范围和时间表"。

## Decision

接受双格式共存，明确划分边界：

### 保留 CJS 的范围

| 目录 | 用途 | CJS 理由 |
|------|------|----------|
| `tests/*.cjs` | 测试套件（14 文件） | Node.js 直接运行，无需 bundler；`require()` 简洁 |
| `scripts/*.cjs` | 构建/验证/benchmark 脚本 | Node.js CLI 工具，直接 `node script.cjs` 运行 |
| `scripts/validators/*.cjs` | 数据验证器 | 同上 |
| `scripts/benchmark/**/*.cjs` | 性能基准测试 | 同上 |
| `dev-server.cjs` | 开发服务器入口 | Node.js 配置兼容性 |
| `playwright.config.cjs` | E2E 测试配置 | Playwright 要求 CJS 或 ESM 明确声明 |
| `check_build.cjs` | 构建验证脚本 | Node.js CLI |

### 强制 ESM 的范围

| 目录 | 用途 | ESM 理由 |
|------|------|----------|
| `src/**/*.js` | 应用源代码 | Vite ESM 构建，ESM import 静态分析 |
| `src/**/*.jsx` | React 组件 | Vite 处理 JSX + ESM |
| `src/engine/*.js` | 引擎模块 | 零框架依赖，纯 ESM |

### 规则

1. **新测试文件**：如果使用 Node.js `require()` 则用 `.cjs`；如果使用 ESM `import` 则用 `.mjs`
2. **新脚本文件**：保持 `.cjs` 格式（与现有 scripts/ 一致）
3. **新源代码**：必须用 `.js`（ESM），禁止新增 `.cjs` 或 `.ts` 在 `src/` 下
4. **迁移**：不主动迁移现有 CJS 文件。当某个 CJS 文件需要重构时，顺势迁移为 ESM

## Rationale

- CJS 测试文件运行稳定，14 个套件 608 用例全部通过
- 迁移成本高：每个 CJS 测试需要改写 `require` → `import`、`module.exports` → `export`
- 收益低：双格式在 Node.js 20+ 下完全兼容，无运行时问题
- CI 已通过 `npm run test` 和 `npm run build` 覆盖验证

## Consequences

- ✅ 边界清晰：tests/scripts 用 CJS，src/ 用 ESM
- ✅ 无需大规模迁移，避免引入回归风险
- ⚠️ 新贡献者需要理解双格式约定（CLAUDE.md 已记录）
- ⚠️ `lint:engine` 只检查 `src/engine/*.js`，不覆盖 CJS 文件
