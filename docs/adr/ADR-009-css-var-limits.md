# ADR-009: CSS 函数参数不支持 `var()`

**日期**: 2026-06-16
**状态**: 已采纳

## Context

CSS 动画函数（`steps()`、`cubic-bezier()` 等）的参数必须是字面值，不能用 `var()` 引用自定义属性。
浏览器遇到 `steps(var(--tw-steps, 40))` 时**静默跳过整条 animation 声明**，不报错、不回退。

结果：`width: 0` + `overflow: hidden` 的组合导致文字永远不可见。

## Decision

1. **不要在 CSS animation/transition 函数参数中使用 `var()`**
2. 改用：
   - **JS 设置具体值**：`element.style.animationDuration = duration + 's'`
   - **纯 CSS transition**：用 `opacity`/`transform` + `transition` 代替 `@keyframes` + `steps()`
   - **内联 style**：`style={{ '--tw-steps': 40 }}` + CSS 中用固定值 `steps(40)`
3. 受影响的 CSS 函数：`steps()`、`cubic-bezier()`、`linear()`、`path()`、`polygon()` 等

## Consequences

- ✅ 动画不再静默失效
- ✅ 调试 CSS 问题时排除函数参数陷阱
- ⚠️ 某些动态参数需要 JS 设置而非 CSS 变量
