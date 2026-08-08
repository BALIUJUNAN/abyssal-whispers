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

## 2026-08-08 补充：publicDir 资源路径按发布根目录书写

Vite 将 `publicDir: 'assets'` 的内容复制到产物根目录，因此源码引用应写成 `webp/...`、`webp_ending/...`，不能写成 `assets/webp/...`。构建成功不代表资源 URL 正确；发布验证还需确认产物目录和实际请求路径一致。

## 2026-08-08 补充：存档写入、导入和读档必须共享字段契约

不得在 `toPersistedState`、外部导入校验和 `CONTINUE_GAME` 中各维护一份状态白名单。字段漂移会造成“存档中存在、读档时静默丢弃”的数据损坏。允许持久化的字段由 `initialState` 注册项减去 transient 集合生成；迁移过程使用同一集合并只额外接纳内部迁移标记。

- 新增需持久化字段必须先注册到 `initialState`，不能只在运行时动态挂载。
- `_GD`、派生 Set、action 游标和缓存必须登记为 transient，禁止写入存档。
- 回归测试必须执行真实的 `manualSave → loadSlot → CONTINUE_GAME`，逐项比较天数、资源、周目、NPC、任务和事件进度。
- 存档格式的 `requiredStateKeys` 只表示最低核心字段；外部导入使用注入的完整 `allowedStateKeys` 清洗。
