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

## 2026-08-09 补充：CI 必须区分单文件校验器与批量校验器

`scripts/mod_validate.cjs` 是面向开发者的单文件 CLI，必须接收 `<mod.json>` 路径；在 CI 中无参数执行 `npm run mod:validate` 会以状态码 1 退出，并阻断后续测试和构建。仓库级质量门必须调用 `node scripts/validate-mods.mjs`，递归发现并校验 `mods/` 下的全部 `mod.json`。

- CI 中的命令必须以无交互、无额外参数的方式本地复现一次。
- 单文件 CLI 的 README 示例必须显式写出 `-- <path>`，不能暗示无参数可运行。

- 质量门中的批量检查必须覆盖仓库实际样例，不能用一个固定样例代替全量发现。
- 尚未建立全仓格式化基线时，`format:check` 只能作为独立 advisory job；不得同时在阻塞式质量门中重复执行。待存量文件全部格式化且语法错误清零后，再单独决策是否升级为 blocking check。
- Advisory 只允许忽略存量格式差异，不能忽略 Prettier 报出的解析错误；解析失败的历史脚本至少要恢复为合法语法或明确的注释占位文件。
- CI 启用 Playwright `github` reporter，把失败用例和错误位置写入检查注释，确保无需下载私有任务日志也能诊断。
- Playwright 与 CI Node 版本必须做组合验证。`Playwright 1.61.0 + Node 22.15.0` 会在加载共享 CJS helper 时触发 `context.conditions?.includes is not a function`，表现为全部测试未收集并继发 `No tests found`；升级到 Playwright 1.62.1 后，同一 Node 版本可正确发现全部 16 条测试。
- 更新 Playwright 锁定版本并执行 `npm ci` 后，本地浏览器缓存也必须运行 `npx playwright install chromium` 同步；否则全部 E2E 会在 `browserType.launch` 阶段因缺少对应 revision 失败。CI 每次显式安装 Chromium，不依赖 runner 缓存恰好命中。

## 2026-08-09 补充：Windows 自动化命令显式调用 npm.cmd

部分 Windows PowerShell 环境会因执行策略拒绝加载 `npm.ps1`，导致项目脚本尚未启动就失败。在仓库维护和自动化验证命令中，Windows 终端应调用 `npm.cmd`；GitHub Actions 的 Ubuntu runner 仍使用 `npm`。

Windows 上若 Vite/Preview 进程仍持有 `node_modules` 中的原生绑定，`npm ci` 可能在删除 `.node` 文件时以 `EPERM unlink` 失败。重装依赖前先按监听端口确认并停止本项目遗留的开发/预览进程，不得盲目结束全部 Node 进程。

若受限执行环境同时禁止写入用户级 npm cache/log 目录，npm CLI 可能以 `Exit handler never called` 退出；这不是测试结论。应在获准写缓存的环境重跑相同命令，或显式使用工作区内、已忽略的临时 cache，不能把不完整的 `node_modules` 当作验证结果。

本地使用系统 Edge 回退运行构建版 E2E 时，如 Playwright 自动管理的 `webServer` 已完成测试却因 Windows 子进程句柄不退出，可先显式启动隐藏的 `vite preview`、通过 `TEST_BUILT_ARTIFACT=1` 复用该端口，完成后按已记录 PID 停止；不得把测试已通过但命令清理超时误报为用例失败。

## 2026-08-09 补充：网页发布单位是完整 dist 目录

`vite-plugin-singlefile` 只内联 JS、CSS 与静态导入的数据；程序化引用的 WebP 和音频仍位于 `dist/webp/`、`dist/webp_ending/`、`dist/audio/`。因此 `index.html` 不是独立发行包：Pages 必须部署完整 `dist/`，GitHub Release 必须压缩完整 `dist/`，不能只上传 HTML。

- CI 在构建后运行 `node check_build.cjs --dist`，检查 HTML、图片和音频数量及路径。
- Playwright 的 CI 模式必须针对下载后的生产构建运行 `vite preview`，不能只验证开发服务器。
- 构建版 E2E 不得在页面上下文动态导入 `/src/...` 来操纵 Store；该路径只由开发服务器提供，正式 `dist/` 必然 404。发布门中的导航、SAN、存读档与探索用例应走玩家可见 UI。
- 核心 Modal 与快捷键必须通过真实 UI 打开一次，并断言游戏未进入 ErrorBoundary；只验证主页面挂载无法发现条件 Hook 和布局消费者缺失。
- `main` 部署生产根目录，`develop` 部署 `/preview/`；标签发布复用同一份已验证构建产物，避免二次构建漂移。
