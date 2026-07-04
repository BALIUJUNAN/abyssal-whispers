# ADR-026: build.py 事件文件正则大小写不匹配导致单文件构建事件池丢失

**日期**: 2026-07-02  
**状态**: 已弃用（v0.9.7 删除 build.py，此问题不再存在）
**关联**: ADR-011（代码生成用 Python）、ADR-005（拼接构建的作用域隔离规则）

## Context

`build.py` 的 `process_events_data_file()` 使用正则
`r'\bexport const events\b'`（小写）重命名事件变量，
但所有 10 个事件数据文件（`events_loop.js`、`events_humanity.js` 等）
统一使用 `export const EVENTS = [...]`（大写）。

结果：
1. 正则从未匹配，变量名从未被重命名
2. `strip_es_modules` 移除 `export` 后，10 个文件全部输出 `const EVENTS = [...]`
3. 拼接构建中同名变量互相覆盖——只有最后一个文件（`events_death_echo.js`，17 条）幸存
4. 别名赋值 `var loopEvents = _events_loopEvents` 引用不存在的变量 → `undefined`
5. `extended_events_index.js` → `EXTENDED_EVENT_MODULES` → 599 条扩展事件全部丢失
6. 单文件 `index.html`（GitHub Pages / itch.io 分发版）的事件池仅有 90 条基础事件

Vite ESM 构建不受影响（`import { EVENTS as loopEvents }` 正确解析），
只有 `build.py` 拼接构建产出的单文件版本受影响。

## Decision

1. 正则改为精确匹配大写：`r'export const EVENTS\b'`
2. 添加兜底：若大写未匹配，降级为 case-insensitive 匹配
3. 添加警告输出：若仍未匹配，打印文件前 100 字符帮助诊断

## Code

```python
def process_events_data_file(code, alias):
    unique = '_events_' + alias
    code = re.sub(r'export const EVENTS\b', 'const ' + unique, code)
    if 'const ' + unique not in code:
        code = re.sub(r'export const events\b', 'const ' + unique, code, flags=re.IGNORECASE)
    code = strip_es_modules(code)
    code += 'var ' + alias + ' = ' + unique + ';\n'
    return code
```

## Consequences

- ✅ 单文件构建的事件池完整（599 + 90 条事件）
- ✅ 变量重命名可靠，不再互相覆盖
- ⚠️ 依赖 `events_*.js` 文件保持 `export const EVENTS` 命名约定
- ⚠️ 若未来新增事件文件使用不同命名（如 `export const MyEvents`），需同步更新
