# ADR-001: ESM 迁移后必须显式 import 所有使用的外部函数

**日期**: 2026-06-14 ~ 2026-06-19
**状态**: 已采纳

## Context

build.py 拼接构建将所有 `.js` 文件放入同一作用域，`import` 语句被剥离，
函数作为全局变量可用。开发者从未写 ESM import——因为拼接构建"不需要"。

迁移到 Vite ESM 后，每个文件是独立模块，未 import 的函数全部 ReferenceError。
这是最高频错误（16 次），影响 reducer、系统文件、组件文件三类。

## Decision

1. 任何被调用的函数必须在当前文件有明确 `import` 或定义
2. "已经在同模块 export 了" ≠ "消费方已 import 了"
3. 新增 `.js` 文件后必须：① 目标消费方写 ESM import；② 加入 `build.py` 的 `REDUCER_FILES`
4. 组件文件（`.jsx`）同样需要 ESM import——只要调用了非 React 函数就必须 import
5. 从大文件提取函数时，连同它的依赖一起提取（或显式 import）
6. CI 应同时运行 Vite build（检测 ESM 问题）和 build.py（检测拼接问题）

## Consequences

- ✅ ESM 下不再出现"函数未定义"的 ReferenceError
- ✅ 新增文件有明确的双注册流程
- ⚠️ 迁移期需要逐文件扫描补全 import
- ⚠️ 组件文件的 import 缺失容易遗漏（因为 JSX 渲染不报错，只在交互时崩溃）
