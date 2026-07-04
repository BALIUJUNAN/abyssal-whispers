# ADR-005: 拼接构建迁移完成（Vite ESM 唯一构建）

**日期**: 2026-06-14 ~ 2026-07-02
**状态**: 已弃用（v0.9.7 删除 build.py，Vite ESM 为唯一构建系统）

## Context

`build.py` 曾将 100+ 文件拼接为单一作用域，产生了独特的 bug 模式：
同名变量冲突、import alias 被剥离、re-export 导致重复声明。
2026-07-02 删除 `build.py`，Vite + vite-plugin-singlefile 为唯一构建系统。

## Decision（历史记录）

1. **不要用 import alias 解决命名冲突**——拼接构建会剥离 alias
   改用唯一命名的 getter 函数（`getDeathEchoEvents` / `getSupplementEvents`）

2. **多个文件不要用同一个 `export var` 名**——后者覆盖前者
   如果发现两个文件用同名 export var，立即重命名其中一个

3. ~~**新增文件必须双注册**——ESM import + `build.py` 的 `REDUCER_FILES`~~ （已删除 build.py）
   新增文件只需 ESM import，Vite 自动解析依赖图

4. **从大文件提取函数时，必须检查所有自由变量**——ctx、GD、rng 都是外部依赖
   提取后的函数签名必须列出所有外部依赖

5. **Re-export 清理**——如果消费方已直接 import 新位置，必须删除旧位置的 re-export

## Consequences（当前状态）

- ✅ 拼接构建不再出现变量冲突和 alias 失效
- ✅ 文件提取更安全
- ✅ 新增文件只需 ESM import，无需维护文件顺序列表
- ⚠️ 本 ADR 保留为历史参考，规则 1/2/4/5 仍适用于理解旧代码中的命名约束
