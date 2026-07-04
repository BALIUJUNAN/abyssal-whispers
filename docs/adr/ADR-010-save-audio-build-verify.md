# ADR-010: 存档安全 + 浏览器音频 + 构建验证

**日期**: 2026-06-16 ~ 2026-06-19
**状态**: 已采纳

## Context

三项独立但同属"外部输入/环境"类问题的决策：

1. **存档导入安全**——`importSave` 直接 `JSON.parse` 无 schema 校验
2. **浏览器音频策略**——file:// + incognito 最严格，自动播放被拦截
3. **build.py 注释删除导致白屏**——string.replace() 缩进不匹配时静默失败

## Decision

1. **存档导入必须校验**——`validateSaveSchema()` + `quarantineSave()` + 版本号 wrapper
2. **音频必须绑定用户交互解锁**——`AudioManager.unlock()` 绑定首次点击/触摸
3. **构建后必须验证产物**——`run_verify()` 执行所有测试 + 检查输出大小
4. **build.py 用正则容忍缩进差异**——不用 string.replace()

## Consequences

- ✅ 外部存档不会破坏游戏状态
- ✅ 浏览器自动播放策略合规
- ✅ 构建失败不再静默产生损坏产物
- ⚠️ 存档导入需要额外的 schema 维护成本
