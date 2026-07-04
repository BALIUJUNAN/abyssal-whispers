# ADR-027: build.py events_ch2plus.js 缺失于 DATA_FILE_EVENTS_ALIAS

**日期**: 2026-07-02  
**状态**: 已弃用（v0.9.7 删除 build.py，此问题不再存在）
**关联**: ADR-026（build.py 事件文件正则大小写）、ADR-011（代码生成用 Python）

## Context

`build.py` 的 `DATA_FILE_EVENTS_ALIAS` 映射表包含 9 个事件文件，
但 `data/events_ch2plus.js`（70 条 Ch2+ 章节事件）被遗漏。

该文件在 REDUCER_FILES 中正确列出（第 99 行），
`extended_events_index.js` 也正确 `import { EVENTS as ch2plusEvents }`，
但拼接构建中：
1. `process_events_data_file` 不被调用（不在 ALIAS 映射中）
2. `strip_es_modules` 移除 `export` 后输出 `const EVENTS = [...]`
3. 全局 `var ch2plusEvents = _events_ch2plusEvents` 引用未定义变量
4. `CH2PLUS_EVENTS` 在单文件构建中为 `undefined`

运行时在 `extendedEventsInit.js` 中被 `if (CH2PLUS_EVENTS && CH2PLUS_EVENTS.length > 0)`
条件保护，不崩溃，但 **70 条 Ch2+ 事件全部静默丢失**。

Vite ESM 构建不受影响（`import { EVENTS as ch2plusEvents }` 正确解析）。

## Decision

1. 将 `'data/events_ch2plus.js': 'ch2plusEvents'` 加入 `DATA_FILE_EVENTS_ALIAS`
2. 与 ADR-026 的正则修复配合，确保变量正确重命名为 `_events_ch2plusEvents`

## Consequences

- ✅ 单文件构建包含全部 70 条 Ch2+ 事件
- ✅ `ch2plusEvents` 全局引用正确
- ✅ `CH2PLUS_EVENTS` 在单文件构建中可用
- ⚠️ 新增事件文件时必须同步更新 `DATA_FILE_EVENTS_ALIAS`
- ⚠️ 该映射与 `REDUCER_FILES` 顺序耦合——文件必须在映射中有条目才能在构建中被正确处理
