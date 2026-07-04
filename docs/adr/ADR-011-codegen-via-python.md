# ADR-011: 代码生成用 Python 而非 bash heredoc

**日期**: 2026-06-19
**状态**: 已采纳

## Context

用 bash heredoc 写 Node.js 脚本来生成 JS 文件时，`\n` 的行为取决于上下文：
- bash heredoc 会保留 `\\n` 为两个字符（反斜杠+n）
- Node.js 中 `"text\\n"` 的 `\\n` 是字面反斜杠+n
- 生成器脚本中的 `\\n` 被 bash 展开后，输出文件中的 JS 字符串会包含真实换行而非转义序列

## Decision

1. **优先用 Python 做代码生成**——`chr(92) + 'n'` 产生字面 `\n`
2. **生成后必须用目标语言验证输出**——如用 Node.js 的 `JSON.stringify` 检查文件内容
3. 不用 bash heredoc 生成需要精确转义序列的代码

## Consequences

- ✅ 消除转义歧义
- ✅ 跨平台一致（Windows `\r\n` 问题由 Python `newline='\n'` 处理）
- ⚠️ 需要 Python 运行时（已有）
