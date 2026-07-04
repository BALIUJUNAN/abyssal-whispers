# ADR-008: 可选功能的设置 UI 与调用逻辑必须交叉校验

**日期**: 2026-06-16
**状态**: 已采纳

## Context

LLM 叙事增强层是后加的可选功能，设置 UI 和调用逻辑分属不同文件。
开发时"设置面板"和"调用逻辑"分头写，遗漏了交叉校验——开关有但 UI 没给、
调用方存在但没读设置。

6 个具体问题：
1. `llmEventText` 无 UI 开关 → 功能永远不可用
2. EndingScreen 不检查 `llmDeathSummary` 设置 → 关闭开关仍发 API 请求
3. API Key onBlur 强制 `llmSettings.enabled = true` → 用户禁用后输入 key 被重新启用
4. 新轮回只清 `_llmEnhanceQueue`，不清 `glmClient._responseCache` → 显示旧叙事文本
5. `_llmInFlight` 布尔守卫 + clear 有竞态 → 多发并发请求
6. Rate limiter 不支持批量请求 → 4+1 并发仅 1 个成功

## Decision

1. **设置定义 → UI 控件 → 调用方读取** 三处必须对齐
2. **异步可选功能的"总开关 + 子开关"模式**——`isGlmAvailable()` 只查总开关，每个调用方还必须读自己的子开关
3. **批量请求用 FIFO 队列串行发送**——不能用即发即决的 rate limiter
4. **模块级布尔守卫改用单调递增 ID**——请求完成后检查 ID 是否仍匹配

## Consequences

- ✅ 设置 UI 和调用逻辑不再脱节
- ✅ 批量 LLM 请求正确串行化
- ✅ 无竞态条件
- ⚠️ 需要设置 Schema 文档化每个 key 的 UI 控件和调用方
