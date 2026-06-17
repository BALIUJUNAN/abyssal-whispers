# CHANGELOG

## 2026-06-17 — Bug 修复 + 事件精修 + UI/UX 精修 + 美术统一

### Bug 修复（19 个文件，+977 / -200 行）

- **Import 缺失修复**（7 处）
  - `extendedEvents.js` ← `hasClueId`（checkTriggerExtended 崩溃）
  - `extendedEventsInit.js` ← `getDeathEchoEvents` / `getSupplementEvents`
  - `conclusionReducer.js` ← `hasClueId`
  - `objectiveReducer.js` ← `hasClueId`
  - `miscReducer.js` ← `getSealState` / `getSanStageFromGD`
  - `chapterReducer.js` ← `makeRand`
  - `loopReducer.js` ← `makeRand`

- **Reducer 20 处 Math.random() → 确定性 RNG**
  - 新增 `makeRand(rng)` 工具函数（`utils.js`），消除 11 处重复 fallback 模式
  - 7 个 reducer 工具函数新增 `rng` 参数：`applyLightTextCorruption` / `canDetectFalseOption` / `processSafehouseNight` / `selectEvent` / `doSkillCheck` / `getGambleOptions` / `getMotifFlavorText` / `getMonsterManifestation` / `checkFalseInterpretations` / `getPollutionText` / `getForcedProgressGuard` / `chooseWeightedEvent` / `selectEventV2`
  - 3 个 slice 传入 `c.rng`：`exploreSlice.js`（8 处）/ `dailySlice.js`（2 处）/ `uiSlice.js`（1 处）

- **回调参数遮蔽修复**（7 处）
  - `prologueReducer.js` `.find((c) =>` → `.find((x) =>`
  - `extendedEvents.js` `.filter((c) =>` → `.filter((cond) =>`
  - `objectiveReducer.js` `.filter((c) =>` → `.filter((x) =>` ×2
  - `endingReducer.js` `.map/.every/.some((c) =>` → `x` / `cond`
  - `GamePanels.jsx` `.forEach((c) =>` → `.forEach((clue) =>`
  - `clueNameMap.js` `.forEach((c) =>` → `.forEach((clue) =>`

- **overflow: clip Safari 回退**
  - `styles.css` / `app.jsx` — `overflow: hidden` 作为 Safari <16 fallback

### 事件系统精修

- **`events_supplement.js` — 120 个事件补全 3 个缺失字段**
  - `quality_tier`：B×100, C×16（氛围事件）, A×4（meta）
  - `normalcy_anchor`：true×25（NPC/氛围）, false×95
  - `unreliable_narration_level`：0×93, 1×15（怪物）, 2×12（超自然）

- **高级触发条件**（30 处）
  - 怪物遭遇 `san_lte: 50`（14 个）
  - 超自然遭遇 `san_lte: 60`（12 个）
  - meta `min_loop: 2`（4 个）

- **`hasClueId` import 修复** — `extendedEvents.js` 中 `checkTriggerExtended` 的 clue 检查不再崩溃

### UI/UX 精修

- **加载黑屏 → 加载态**
  - `index.template.html` — 新增 `#loading-screen`（黑底 + 呼吸点 + "正在连接沃切斯特..."）
  - `app.jsx` — React 首帧挂载后自动淡出并移除

- **视觉精致度**
  - CSS 变量体系：`--font-*`、`--radius-*`、`--shadow-*`、`--sp-*`、`--transition-*` 共 20+ 变量
  - 字体统一：`system-ui, -apple-system, sans-serif`，正文 15px，按钮 14px，HUD 13px，最小 12px
  - 圆角统一：按钮 6px、弹窗 8px、HUD 4px
  - 阴影统一：纯黑半透明，按钮/弹窗/HUD 三档
  - 间距统一：8px 栅格（8/16/24/32px）

- **交互反馈**
  - `.btn` 4 态补全（hover 上移 / active 下压 / disabled 灰化）
  - `.action-btn` hover 左侧高亮条 + 选中态 `.selected`
  - `.modal-content` 打开时 `scale(0.95)→scale(1)` 缩放动画
  - 弹窗内边框 `inset 0 0 0 1px rgba(255,255,255,0.03)`

- **1% 细节**
  - 全局噪点背景（SVG feTurbulence，消除纯黑塑料感）
  - 滚动条美化（5px 宽，暗灰半透明，Firefox + WebKit 双兼容）

- **轻提示系统**
  - 前传结束 → 正片：底部 "按 M 切换布局 · 按 J 打开笔记本"（8 秒自动消失）
  - 第一次掉 SAN <75：右下角 "理智正在流失，世界会逐渐发生变化"（2.5 秒自动消失）
  - 笔记本首次打开：第一条线索链金色微光高亮 1.5 秒

- **笔记本快捷键统一** — `GameLayout.jsx` N 键 → J 键

### 美术统一系统

- **SVG 滤镜源**（`index.template.html`）
  - `#global-film-grain` — 胶片颗粒，消除 AI 塑料感
  - `#soft-vignette` — 轻暗角，场景/背景用
  - `#strong-vignette` — 强暗角，结局 CG 用
  - `#soft-sharpen` — 轻锐化，NPC 立绘用

- **CSS 滤镜系统**（`styles.css`）
  - `img.game-art` — 降饱和 12% + 对比度 1.08 + 压暗 0.92 + 暖调 + 颗粒
  - `img.npc-portrait` — 基础 + 锐化
  - `img.scene-bg` / `.town-map-bg` — 基础 + 轻暗角
  - `img.ending-cg` — 高对比 1.15 + 强暗角
  - `.game-panel` / `.modal-content` — UI 面板噪点质感

- **组件 class 注入**（6 个组件 8 处）
  - `NPCDialog.jsx` / `GamePanels.jsx` / `InteractiveTownMap.jsx` / `AreaPanelModal.jsx` / `GameCommon.jsx`

### 测试

- **完整流程测试**（`tests/test_full_flow.mjs`）— 19 组 48 项断言，覆盖所有修改过的函数调用链
- 拼接构建 + Vite ESM 构建双通过

---

## 2026-06-16 — 前传音频 + 笔记本 UI + 页面缩放 + AP 音效

### 新增功能

- **前传音频** (`src/components/GameScreens.jsx`)
  - PrologueScreen 挂载时自动播放夜间环境音（`amb_town_night`），卸载时自动停止
  - 场景切换时播放 UI 音效（`ui_panel_open`）
  - 新增 `audioManager` import

- **笔记本 UI** (`src/components/GamePanels.jsx` + `src/styles.css`)
  - 独立 `NotebookModal` 浮层组件，不干扰上方 HP/SAN/AP 数据查看
  - 左栏「已知线索」底部 📓 打开笔记本按钮
  - 快捷键 N 打开笔记本（键盘提示同步更新）
  - 展示 3 条线索链（港口失踪案/莫里斯家族/晨星会仪式）找到/锁定状态
  - 线索类型标签（表层/深层/终末）+ 线索⟷结论互引标记
  - 5 个结论进度 + 散落笔记 + 笔记本底部设计文本

- **页面缩放** (`src/components/GameModals.jsx` + `src/app.jsx`)
  - 设置面板新增「页面缩放」滑块（70%-140%，步进 5%）
  - `document.documentElement.style.zoom` 应用，App 启动时自动恢复

- **AP 消耗音效反馈** (`src/app.jsx` + 各 slice handler)
  - 通用机制：主 reducer 层 AP 变化检测（AP ≤ 2 → `ui_error`，AP 归零 → `ui_click_forbidden`，AP ≤ 3 → 背景音乐切换）
  - MOVE/EXPLORE/TALK_NPC/WORK/BUY_FOOD 各自独立 AP 音效

### 修复

- **镇中心图片** (`src/portraitMap.js`)
  - `AREA_IMAGE_MAP.town_center` 从通用全景图改为专用「镇中心街道」系列
  - `沃切斯特镇中心 白天/深夜/崩坏.webp` 从 PNG 源转换（平均压缩比 93%）

### 资源

- 新增 3 张 WebP 镇中心场景图（总 779KB），图片总数 141 张

---

## 2026-06-16 — GLM-4.7 Flash AI 叙事增强接入

### 新增功能

- **GLM-4.7 Flash API 客户端** (`src/utils/glmClient.js`)
  - OpenAI-compatible endpoint via Z.ai / Zhipu AI
  - 离线优先：所有调用可选，失败自动 fallback 到静态文本
  - 内置限流（2s最小间隔）、5分钟响应缓存、15s超时
  - API Key 持久化存储（localStorage）

- **LLM 叙事增强层** (`src/systems/llmNarrative.js`)
  - `enhanceDeathSummary()` — 死亡总结4段叙事 LLM 增强
  - `generateNpcDialogue()` — 8位NPC动态对话生成（基于信任/周目/腐蚀度）
  - `generateMetaCorruptionEvent()` — 低SAN时 LLM 生成独特伪系统消息
  - `enhanceEventDescription()` — 事件描述动态润色
  - `generateAfterglow()` — 死亡余韵诗意文本
  - `generateSanCorruptedText()` — 低SAN不可靠叙述改写

- **设置面板集成** (`src/components/GameModals.jsx`)
  - 新增「AI 叙事增强」设置分组
  - 开关、API Key 输入、子功能独立控制

- **动态事件/文本生成** (`src/components/GamePanels.jsx`)
  - `EnhancedNarrativeBlock` 组件：事件触发时异步调用 LLM 生成个性化叙事
  - 智能触发：仅增强 signature/milestone 事件或 SAN≤40 时的事件
  - 采样率控制：普通事件 30% 概率增强，高优先级事件 100%
  - 单飞守卫：同一时间只发一个 LLM 请求，避免 API 洪泛
  - 缓存 + 新轮回自动清理

- **死亡画面集成** (`src/components/GamePanels.jsx`)
  - `EndingScreen` 组件异步加载 LLM 增强文本
  - 渐进增强：静态文本立即显示，LLM文本就绪后追加
  - 死亡余韵（afterglow）诗意文本 LLM 生成

### 工程变更

- `build.py` REDUCER_FILES 新增 `utils/glmClient.js`、`systems/llmNarrative.js`
- `gameSettings.js` 新增 LLM 相关设置项（llmEnabled, llmDeathSummary, llmNpcDialogue, llmMetaCorruption, llmEventText）

---

## 2026-06-14 — SAN系统重构 + 工程改造 + 4个运行时Bug修复

### 错误记录

---

#### Bug 1: `getCorruptedSystemText is not defined`

- **表现**: 点击序章选项后崩溃，ReferenceError
- **触发路径**: `PROLOGUE_CHOICE` → `uiSlice` → `buildReducerCtx` → `narr()` → 调用 `getCorruptedSystemText`
- **根因**: `appHelpers.js` 的 `buildReducerCtx` 函数内调用了 `getCorruptedSystemText(text, layer)`，该函数定义在 `app.jsx` 中。旧 `build.py` 单文件构建把所有函数放在同一作用域，全局可用。迁移到 Vite ESM 后每个文件是独立模块，必须显式导入。
- **修复**: `buildReducerCtx(s, opts)` 改为 `buildReducerCtx(s, opts, corruptFn)`，由 `app.jsx` 调用时传入 `getCorruptedSystemText`
- **教训**: **任何在 A 文件定义、B 文件裸调用的函数，在 ESM 模式下都会崩溃。** 不能依赖 bundle 作用域的隐式全局。

---

#### Bug 2: `ctx is not defined`

- **表现**: `BEGIN_ADVENTURE` 时崩溃，ReferenceError at coreSlice.js:98
- **触发路径**: `BEGIN_ADVENTURE` → `handleCoreAction` → `genObjectives(1, ctx)` → `ctx` 未定义
- **根因**: `handleCoreAction` 签名是 `(s, action, c)` 只有3个参数，但函数内部多处使用 `ctx`（第4个参数名）。`app.jsx` 调用时也只传了3个参数。同时 `npcSlice`、`uiSlice`、`darkSlice` 也有同样问题。
- **修复**:
  - 所有5个 slice handler 签名统一为 `(s, action, c, ctx)`
  - `app.jsx` 调用处全部传入 `ctx` 作为第4参数
  - `coreSlice.js` 内部 `ctx` 引用改为 `c`（`c` 是 `buildReducerCtx` 的输出）
- **教训**: **函数签名和实际使用必须对齐。** 手写多参数传递链极易出错——应该用解构或单一 context 对象。

---

#### Bug 3: 封面背景图不显示

- **表现**: 标题屏幕纯黑，无海报图片
- **根因**: CSS 引用 `url('./assets/webp/海报.webp')`。源文件在 `src/`，构建后 CSS 输出到 `dist/assets/style-*.css`，`./assets/` 解析为 `dist/assets/assets/`（不存在）。图片实际在 `dist/webp/海报.webp`。
- **修复**: `url('./assets/webp/海报.webp')` → `url('/webp/海报.webp')`（绝对路径，Vite 自动转换）
- **教训**: **CSS 中的相对路径在构建后可能错位。** Vite 项目用 `/` 开头的绝对路径更安全。

---

#### Bug 4: 开局 SAN=25 导致第一章无法进行

- **表现**: 约20%玩家开局 SAN < 40，直接进入 explanation_loss 阶段（文本腐蚀、AP惩罚、加速腐蚀）
- **根因**: SAN = POW = 3d6×5（范围15-90），无地板值。doctor 职业 POW-10 后最低 SAN=5。
- **修复**: `s.san = Math.max(40, s.san)` 放在职业惩罚之后。Occultist 代价改为 maxSan 上限69。
- **教训**: **数值设计必须用概率分布验证。** 3d6×5 有20%概率<40，写公式时看不出来，模拟后才暴露。
