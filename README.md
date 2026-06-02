# 深渊低语：沃切斯特之影

*Abyssal Whispers: Shadow of Voxchester*

<div align="center">

<img src="docs/dossier.png" alt="沃切斯特档案" style="max-width:860px; border:1px solid #333; box-shadow: 0 4px 24px rgba(0,0,0,0.5);">

![License](https://img.shields.io/badge/License-CC_BY--NC--ND_4.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20Browser-lightgrey)
![Build](https://img.shields.io/badge/build-5.1MB_(with_Babel)-green)
![Version](https://img.shields.io/badge/version-0.1.3-orange)

[在线游玩 (Browser)](https://baliujunan.github.io/abyssal-whispers/) · [桌面版 (Tauri EXE)](#桌面版下载) · [快速开始](#快速开始) · [游戏特色](#游戏特色) · [技术架构](#技术架构)

**"第十三声钟响的那天晚上，我没有离开沃切斯特。"**

*不是我不肯走。是这个城镇不允许我离开。*

</div>

---

## 快速开始

### 浏览器版（无需安装）

```bash
# 方式一：直接打开（推荐 Chrome / Edge）
双击 index.html

# 方式二：本地 HTTP 服务器
python -m http.server 8080
# 然后访问 http://localhost:8080
```

### 桌面版（EXE 安装包）

> 使用 [Tauri v2](https://tauri.app/) 打包的原生桌面应用，提供更好的离线体验与音频支持。

```bash
# 从源码构建（需要 Rust + Node.js 环境）
npm install
npm run tauri build
# 输出：src-tauri/target/release/abyssal-whispers_0.1.0_x64-setup.exe
```

| 平台 | 状态 | 说明 |
|------|------|------|
| **Windows** | ✅ 已验证 | NSIS 安装包，~10MB |
| **macOS** | ⚠️ 需自行构建 | `npm run tauri build` |
| **Linux** | ⚠️ 需自行构建 | `npm run tauri build` |

- 无需安装任何依赖，完全离线可玩
- 手机 / 平板 / 桌面全平台响应式适配
- **推荐佩戴耳机** — 音频体验是沉浸感的关键

---

## 游戏特色

> **一个用 400+ 个事件、36 种行为结局、53 段原创音频和一套会对你撒谎的界面，讲述你在一座不该存在的城镇上活过、死过、再回来的故事。**

### 核心数据

| 维度 | 数据 |
|------|------|
| **独立事件** | 700+ 个（632 扩展事件 + 90 JSON 事件）— 探索 / 人性 / 超自然 / NPC / 区域深层 / Meta / 资源 |
| **行为结局** | **36 条** — 由你的选择模式触发，非预设分支 |
| **主线 + 隐藏结局** | **10 条**（封印守护者 / 希尔达抉择 / 老费舍血脉 / 第十二声钟 / 海上逃离 / 证据逃离 / 异端黎明 / 深渊吞噬 / 超越 / 循环真相） |
| **死亡类型** | 16 种 — 7 种物理死亡 + 8 种精神死亡 + 1 种混合 |
| **NPC** | **8 位** × 5 级信任 × 4 层跨轮记忆 |
| **可探索区域** | 9 个 — 从镇中心到深渊墓穴，危险度递进 |
| **物品** | 79 种 — 全部有效果，含 2 家可购买商店 |
| **事件链** | 7 条 — 码头暗流 / 森林深处 / 庄园迷踪 / 墓穴惊魂 / 伊斯之谜 / 灯塔真相 / 城市暗流 |
| **音频素材** | 53 段 (WAV + MP3) — 覆盖环境音乐 / 音效 / 中文语音 |
| **成就** | 21 个 — 进程 / 结局 / 挑战 / 隐藏四大类 |
| **存档槽位** | 6 个 — 3 自动轮转 + 3 手动管理，JSON 导入导出 |
| **图片素材** | 210 张 WebP — 含 72 张独立结局 CG |
| **前传系统** | 7 场景线性叙事 — 构建你的恐惧画像 |
| **代码规模** | 18,333 行 JS/JSX — 85 个源文件 |

预计完整体验：**20-40 小时** | 三周目入门，十周目见真结局

### 世界观：1926 年的马萨诸塞州沃切斯特

一座港口城市。

教堂的钟声每天响 **十三下**。码头潮汐与任何时刻表都不吻合。公告栏上贴着你的失踪告示——上面的照片是你，但你还没拍过那张照。

三百年前莫里斯家族在此建立了封印。三百年后，封印开始松动。

而你——一个偶然踏入这座城镇的外来者——将用你的选择决定它的命运。

### 你会遇到这些人

| 角色 | 身份 | 关键特征 |
|------|------|----------|
| 老费舍 | 渔夫 | 血管里流着不属于人类的东西。他知道的比你想象的多 |
| 玛莎·格雷 | 酒吧老板娘 | 镇上唯一不问来处的女人 |
| 希尔达·莫里斯 | 庄园女主人 | 封印家族最后一位直系后裔。二十八岁 |
| 伊莎贝拉·韦伯 | 教堂执事 | 每天敲响十三下钟声的人 |
| 伊莱亚斯·沃德 | 退休教授 | 能读不该读的文字，代价是理智以可测量速度流失 |
| 约书亚·布莱克 | 流浪汉 | 前海军陆战队员，身上的螺旋疤痕不是战场上留下的 |
| 汤米·陈 | 杂货店主/摄影师 | 冲洗的照片里总有些不该存在的影子 |
| 埃德加·洛夫克拉夫特 | 神秘学者 | 知道太多不该知道的事，选择用沉默保护自己 |

每位 NPC 有 **5 级信任体系** + **4 层跨轮回记忆渐进** —— 沉默也是一种选择。

> "你又来了。" —— 第八周目的老费舍会这样对你说。五个字。

---

## 游戏机制

### 核心循环

```
每日行动点 (AP) → 探索 / 对话 / 调查 / 工作 / 购买 / 隐秘动作
        ↓
   触发事件 → 技能检定 (d100) → SAN/HP 变化
        ↓
   HP 归零 = 死亡（四段式叙事）→ 进入下一周目
   SAN 归零 = 疯狂（精神崩溃）→ 进入下一周目
        ↓
   保留知识碎片 & 世界污染记录
   SAN 上限永久削减 (-3/周)
   NPC 记住你是重复访客
   再次踏入沃切斯特
```

### 理智值 (SAN)：这不是血条

SAN 是你与现实之间的契约强度。数值下降时，**游戏本身开始对你撒谎：**

| SAN 区间 | 临床表现 | 游戏表现 |
|----------|---------|---------|
| **80-100** | 认知稳定 | 一切正常 |
| **60-79** | 轻度侵蚀 | 文字偶尔出现微弱阴影 |
| **40-59** | 感知偏移 | 叙事文本颤抖、按钮变慢、区域名称泛光 |
| **20-39** | 解释权丧失 | UI 对抗你：选项文字自改写、存档名变化 |
| **1-19** | 现实崩解 | 第四面墙破裂：伪造通知、注入虚假错误、篡改物品描述 |

> **这不是"角色看到幻觉"的廉价处理 —— 是界面本身成为恐怖载体。**

### 前传系统（恐惧画像）

游戏开场的 **7 场景交互式叙事**，不测试属性，只测试选择：

```
车站 → 旅馆 → 走廊 → 镜子 → 哭泣 → 笔记本 → 黎明
```

每一步选择塑造你的 **6 维恐惧画像**：
- 🌊 Ocean（深海） / 🫀 Body（肉体） / 🔗 Control（控制）
- 🏚️ Isolation（孤立） / 📖 Knowledge（知识） / ⚖️ Morality（道德）

画像影响后续事件的文本变体和 NPC 对话分支。**可以跳过，但不建议跳过。**

### 经济与生存系统

- **商店**：陈氏杂货店（汤米·陈）+ 码头酒馆补给（玛莎·格雷，需信任解锁）
- **饥饿机制**：食物每日消耗，归零后递增惩罚（SAN↓ → HP↓ → 饿死概率↑）
- **安全屋系统**：休息恢复 HP/AP，但有腐蚀度积累风险

### 封印倒计时（28 天）

| 时间节点 | 封印状态 | 事件 |
|----------|----------|------|
| Day 1 | 封印完整 | 钟声开始异常 |
| Day 7 | 封印松动 | 核心 NPC 出现腐化征兆 |
| Day 14 | 封印危急 | 深潜者大潮登陆 |
| Day 21 | 封印濒临崩溃 | 全城疯狂之夜 |
| Day 28 | **封印破碎** | **最终决战** |

每次轮回更难：SAN 上限削减（loop5+ 每周 -2），世界污染加深，NPC 逐步识别你是重复访客。

### 6 种起始职业

记者 / 私家侦探 / 学者 / 医生 / 退伍军人 / 通灵者

---

## 系统功能一览

| 功能 | 说明 |
|------|------|
| **商店系统** | 2 家商店，NPC 信任解锁高级商品 |
| **事件链 / 线索链** | 顺序推进的多阶段调查，线索组合推导结论 |
| **音频系统** | 53 段音频 — 区域环境音乐(9区×昼夜) + 技能检定音效 + 死亡叙事 + 中文语音台词 + 钟声变体 |
| **设置面板** | 4 类音量 / 字号三级缩放 / 视觉扭曲开关 / 突发音效 / 闪烁效果 / reduced-motion |
| **成就系统** | 21 个成就，进程 / 结局 / 挑战 / 隐藏四大类 |
| **多槽位存档** | 3 自动 + 3 手动，版本迁移兼容，JSON 导入/导出 |
| **快捷键** | `1-9` 选择 / `Space` 确认 / `M` 地图 / `I` 物品 / `J` 线索 |
| **章节转场** | Day 4/8/15/22 沉浸式过渡动画（3D 透视旋转） |
| **轮回继承** | 知识碎片 / 世界污染 / NPC 跨轮记忆 / 技能保留(30%) / 行为计数器搬入 |
| **无障碍支持** | 可关闭视觉扭曲 / 字号放大 / prefers-reduced-motion |
| **UGC 模组** | 支持导入自定义事件 JSON（Schema 校验） |
| **ErrorBoundary** | 渲染崩溃时显示错误报告（含最近30步操作回放），一键复制/重新加载 |
| **Error Tracker** | 测试期玩家操作追踪模块（可插拔，一行删除即可移除） |
| **DevPanel** | 开发者调试面板（F12 / Ctrl+Shift+D）— 一键改状态/强制事件/权重查看/性能监控 |

---

## 在线体验

🔗 **[GitHub Pages 在线版](https://baliujunan.github.io/abyssal-whispers/)** — 浏览器直接打开即可游玩

> 推荐使用 Chrome / Edge 以获得最佳音频体验。移动端同样适配。

---

## 许可证

Copyright © 2024-2026 BALIUJUNAN. All Rights Reserved.

本游戏受 **[CC BY-NC-ND 4.0](LICENSE)** 许可保护：

- ✅ 允许：查看、下载、非商业分享（需注明出处）
- ❌ 禁止：商业使用、修改、再分发修改版、移除版权声明

> React 库由 Facebook, Inc. 以 MIT License 发布。
> 游戏素材（WebP 图片、音频文件）可能受独立版权条款约束。

---

## 技术架构

> 面向开发者与对交互叙事工程感兴趣的研究者。

### 整体架构

```
React 18 + useReducer 全状态驱动 + 双 Store 架构 (useGameStore + useUiStore)
  → 引擎层 (src/engine/) — 事件引擎 / 污染管理 / 世界时间 / 存档系统
  → 模块化 Reducer 体系（22 个领域 reducer，6 个 slice handler）
  → {GD} Context 单例（游戏数据全局访问）
  → JSON 配置驱动（事件/结局/效果/NPC/商店 全部数据化）
  → 章节懒加载（ch2+ 在 day5 加载，meta 在 day10 加载）
  → Babel JSX 编译 + CSS/JS minify → 单文件构建产物 index.html (~5MB 含 Babel)
  → Vite 开发环境（HMR + 热更新 + 路径别名）
  → Tauri v2 打包 → 原生桌面应用 (~10MB)
```

### 项目结构

```
COC/
├── index.html              # 构建产物（含 Babel ~5MB，生产 ~4.3MB，可直接运行）
├── build.py                # Python 构建脚本（Babel JSX 编译 + CSS/JS minify）
├── vite.config.js          # Vite 开发环境配置（HMR + 路径别名）
├── dev.html                # Vite 开发入口
├── package.json            # npm scripts: dev / build / build:vite / tauri
│
├── assets/webp/            # 210 张 WebP 图片素材（138 场景 + 72 结局 CG）
├── audio/                  # 53 个音频文件 (47 WAV + 6 MP3)
│
├── src/                    # 18,333 行 JS/JSX，85 个源文件
│   ├── app.jsx             # 主入口（319 行 — 游戏路由 + 双 Store 桥接 + DevPanel）
│   ├── main.jsx            # Vite ES 模块入口（渐进迁移起点）
│   ├── styles.css          # 完整样式表（84KB，档案纸张美学）
│   ├── portraitMap.js      # 立绘/场景/结局CG 图片路径映射
│   │
│   ├── engine/             # 4 个引擎模块（805 行）— 核心逻辑独立层
│   │   ├── EventEngine.js        # 统一三层加权事件选择引擎（367 行）
│   │   │                          #   行为画像 / 冷却衰减 / 缓冲执行 / 恐惧权重
│   │   ├── PollutionManager.js   # SAN + 逻辑 + 视觉污染管理（151 行）
│   │   │                          #   文本幻觉 / 虚假消息 / 虚假记忆 / 权重腐蚀
│   │   ├── WorldTimeSystem.js    # 世界状态 / 封印 / 天气 / 安全屋退化（97 行）
│   │   └── SaveManager.js        # 存档系统 + 版本迁移 + 持久化过滤（190 行）
│   │
│   ├── state/              # 3 个状态模块（245 行）— 双 Store 架构
│   │   ├── gameStore.js          # useGameStore — 游戏状态桥接 + 选择器钩子
│   │   │                          #   useSan / useDay / useHp / useAp / usePollution 等
│   │   ├── uiStore.js            # useUiStore — 模态框 / Toast / 设置 / 临时 UI 状态
│   │   └── initialState.js       # 游戏初始状态定义（70 行）
│   │
│   ├── components/         # 11 个 UI 组件（2,087 行）
│   │   ├── ui/
│   │   │   └── DevPanel.jsx      # 开发者调试面板（79 行，F12 / Ctrl+Shift+D）
│   │   │                          #   STATE/TOOLS/WEIGHTS/PERF 四标签页
│   │   ├── GamePanels.jsx        # LeftPanel/CenterPanel/RightPanel/GameHeader/EndingScreen
│   │   ├── NPCDialog.jsx         # NPC 对话组件（从 GamePanels 提取）
│   │   ├── CitySketchMap.jsx     # 城市地图组件（从 GamePanels 提取）
│   │   ├── SanPollutionLayer.jsx # SAN 视觉腐化 Canvas + CorruptibleChoice
│   │   ├── GameScreens.jsx       # PrologueScreen/SurvivalGuide/CharCreation
│   │   ├── GameModals.jsx        # SettingsModal/SaveLoadModal/AchievementGallery
│   │   ├── GameCommon.jsx        # StatBar/Modal/CollapsibleSection/NarrativeBlock
│   │   ├── ErrorBoundary.jsx     # React 错误边界（含错误报告+一键复制）
│   │   └── TitleScreen.jsx / AppToast.jsx / UgcImportExport.jsx
│   │
│   ├── reducers/           # 22 个状态管理模块（4,887 行）
│   │   ├── slices/                 # gameReducer 拆分后的 6 个 slice handler
│   │   │   ├── coreSlice.js       # START_GAME/NEW_GAME/CONTINUE_GAME/SWITCH_SAFEHOUSE
│   │   │   ├── exploreSlice.js    # MOVE/EXPLORE/DO_SKILL_CHECK
│   │   │   ├── npcSlice.js        # TALK_NPC/NPC_RESPONSE
│   │   │   ├── dailySlice.js      # REST/WORK/BUY_FOOD（7 个命名子函数）
│   │   │   ├── darkSlice.js       # SELF_HARM/SPREAD_PROPHECY/DESECRATE/BREAK_SEAL
│   │   │   └── uiSlice.js         # CHOICE_SELECT/GAMBLE_CHOICE/PROLOGUE/ACCESSIBILITY
│   │   ├── miscReducer.js         # 合并: safehouse + item + settings (112 行)
│   │   ├── extendedEvents.js      # V2 事件调度（触发/权重/抽取/提交 分离）
│   │   ├── deathSystem.js         # 16 种死亡 × 四段叙事
│   │   ├── endingReducer.js       # 结局判定引擎（AND/OR/NOT 解析器）
│   │   ├── objectiveReducer.js    # 目标系统 + 进度保镖（Critical Progress Guards）
│   │   └── ... (loopReducer/prologueReducer/saveReducer 等)
│   │
│   ├── systems/            # 9 个游戏系统（1,764 行）
│   │   ├── eventSystemV2.js      # 三层事件选择（冷却衰减/行为权重/恐惧滤镜）
│   │   ├── fearLens.js           # 恐惧滤镜（影响文本变体 + NPC 对话）
│   │   ├── fearProfile.js        # 恐惧画像计算（6 维度）
│   │   ├── resourceNarrative.js  # 资源-叙事绑定 + 安全屋 5 阶段降级
│   │   ├── worldDecay.js         # 世界腐化推进 + 区域侵蚀
│   │   ├── metaCorruption.js     # Meta 层腐化（伪事件/伪日志/存档名污染）
│   │   ├── logicCorruption.js    # 逻辑腐化（文本幻觉/虚假记忆/选择延迟）
│   │   ├── npcDialogue.js        # NPC 多版本对话 + 循环继承
│   │   └── sanVisualCorruption.js # SAN Canvas 视觉腐化层
│   │
│   ├── utils/              # 8 个工具模块（1,130 行）
│   │   ├── uiStore.js            # 外部 UI store（Zustand-like 模式，已迁移至 state/）
│   │   ├── trustGates.js         # NPC 信任门条件检查
│   │   ├── npcMemory.js          # NPC 轮回记忆对话数据
│   │   ├── appHelpers.js         # 游戏核心辅助函数（248 行）
│   │   ├── gameHelpers.js        # 游戏工具函数集
│   │   ├── clueNameMap.js        # 线索中文名解析
│   │   ├── buildEventPool.js     # 事件池构建工具
│   │   └── errorTracker.js       # 玩家操作追踪 & 错误报告（测试期模块）
│   │
│   ├── data/               # 24 个数据文件 — 700+ 事件
│   │   ├── events_*.js           # 12 个事件数据模块（632 扩展事件）
│   │   ├── behavior_endings.js   # 36 种行为结局
│   │   ├── mapConstants.js       # 地图布局/连线/分区常量
│   │   ├── prologue_events.js    # 前传 7 场景事件
│   │   └── game_base/ch2plus/meta.json  # 分离的 JSON 数据（支持懒加载）
│   │
│   ├── managers/AudioManager.js  # 音频系统（53 段音频管理）
│   └── vendor/                   # React/ReactDOM/Babel 生产版本
│
├── src-tauri/              # Tauri v2 桌面应用配置
└── docs/                   # 文档与图片
```

### 核心模块一览

| 模块 | 职责 | 关键特性 |
|------|------|---------|
| **EventEngine** | 统一三层加权事件选择 | 行为画像/冷却衰减/缓冲执行/恐惧权重/累积权重二分查找 |
| **PollutionManager** | SAN + 逻辑 + 视觉污染 | 文本幻觉/虚假消息/虚假记忆/权重腐蚀 |
| **WorldTimeSystem** | 世界状态 / 封印 / 天气 | 5 阶段封印状态机/区域名称扭曲/安全屋退化 |
| **SaveManager** | 存档系统 + 版本迁移 | 6 槽位/字段过滤/旧格式兼容/JSON 导入导出 |
| **useGameStore** | 游戏状态桥接 | useSan/useDay/useHp/usePollution 等选择器钩子 |
| **useUiStore** | UI 状态管理 | 模态框/Toast/设置/临时 UI 状态 |
| **V2 事件调度器** | 30+ 触发条件筛选 | min_loop/max_loop/once_per_run/权重/probability |
| **死亡系统** | 16 种死亡 × 四段叙事 | 标题→临终→世界处理→残留提示 |
| **SAN 系统** | 5 阶段认知崩溃 | 文字变异/UI对抗/第四面墙破裂 |
| **轮回系统** | 跨周目状态传递 | 污染累积/SAN上限削减/技能继承30%/NPC记忆渐进 |
| **前传系统** | 7 场景恐惧画像 | 6维度心理profile/跳过保护(多周目兼容) |
| **结局引擎** | AND/OR 条件解析 | 36行为结局+10主线+隐藏+Meta打破 |
| **NPC 系统** | 8人×5级信任×4层记忆 | 信任门控/腐蚀/救赎路线 |
| **存档系统** | 6槽位+版本迁移 | P0-P5字段过滤/旧格式兼容 |
| **UGC 系统** | 自定义事件导入 | Schema校验/IndexedDB存储 |
| **AudioManager** | 53段音频管理 | 区域环境音(昼夜)/技能检定分级/SAN损失分层 |
| **ErrorTracker** | 玩家操作追踪 | 自动记录每步 dispatch + state 快照 + 错误报告生成 |
| **DevPanel** | 开发者调试面板 | F12/Ctrl+Shift+D 打开，4标签页，一键改状态/强制事件/性能监控 |

### UI 视觉设计

- **四层字体**：Noto Serif SC（叙事） / Noto Sans SC（界面） / JetBrains Mono（数据） / LXGW WenKai（手写笔记）
- **SAN 腐败六层递进**：阴影偏移 → 闪烁色漂移 → 抖动文字改写 → 强烈震颤删除线 → 持续故障
- **感知五维独立**：文本不可靠 / 焦点失真 / 边缘清晰度 / 输入抵抗 / 音频入侵
- **25+ CSS 动画**：标题呼吸光效 / 雾气漂浮 / 叙事滑入 / 死亡渐黑 / 章节透视转场 / 污染抖颤

### 数据驱动设计

新增事件**无需改动任何 reducer 代码** —— 只需在 `src/data/events_*.js` 中添加数据条目：

```javascript
// 示例：新增一个区域深层事件
{
  id: "area_custom_001",
  name: "事件名称",
  type: "area_deep",
  subtype: "town_center",
  weight: 1,
  tier: "normal",
  tags: ["area", "deep", "town_center"],
  trigger: {
    areas: ["town_center"],
    min_loop: 2,
    probability: 0.15,
    once_per_run: true,
  },
  description: DESC.DEEP_EXPLORE_WALL_SKIN + "你发现了一些不该存在的东西。",
  effects: { add_clue: "clue_custom_001", san: -1 },
}
```

事件调度器会自动将其纳入触发池。

---

## 开发指南

### 环境要求

- Node.js >= 18
- Python >= 3.8
- (可选) Rust + Cargo — 如需构建 Tauri 桌面版

### 构建命令

```bash
# 安装依赖
npm install

# 开发模式（推荐）— Vite HMR 热更新
npm run dev
# 访问 http://localhost:3000

# 生产构建 — 单文件 HTML（浏览器版 / Tauri 通用）
npm run build
# 输出：index.html（含 Babel ~5MB，安装 @babel/cli 后 ~4.3MB）

# 生产构建（要求 Babel 编译成功，否则失败）
python build.py --prod

# 快速开发构建（跳过 Babel 编译）
python build.py --dev

# 包体积分析（按目录分类展示）
python build.py --analyze

# 验证当前 index.html
python build.py --verify

# Vite 构建（实验性）
npm run build:vite
# 输出：dist-vite/

# 构建桌面版（需要 Rust）
npm run tauri build
```

---

## 代码质量

> 2026-05-31 ~ 06-02 五维度全面审查 + 重构结果

### 综合评分：**9.0 / 10**（初评 7.5 → 重构后 +1.5）

| 维度 | 初评 | 复评 | 重构后 | 状态 |
|------|------|------|--------|------|
| **主循环 & Reducer** | 6.5/10 | 8.2/10 | **9.0/10** | ✅ 6 slice handler + 引擎层独立 + 双 Store 架构 |
| **事件系统** | 7.5/10 | 8.0/10 | **9.0/10** | ✅ EventEngine 统一三层加权选择，pure/commit 分离 |
| **子系统** | 7.0/10 | 8.2/10 | **9.0/10** | ✅ PollutionManager/WorldTimeSystem 引擎独立 |
| **构建流程** | 8.0/10 | 8.3/10 | **9.0/10** | ✅ --analyze/--dev/--prod 模式；CSS/JS minify |
| **开发体验** | — | — | **9.0/10** | ✅ DevPanel(F12) + 双 Store 选择器钩子 + 性能监控 |

### 架构优势

- ✅ **引擎层独立** — `src/engine/` 4 个引擎模块（805 行），核心逻辑与 UI 完全解耦
- ✅ **双 Store 架构** — `useGameStore`（游戏状态选择器）+ `useUiStore`（UI 状态），减少 prop drilling
- ✅ **模块化彻底** — app.jsx 从 4600 行降至 319 行（-93%），提取 20+ 个独立模块
- ✅ **Reducer 分层清晰** — 6 个 slice handler + 16 个领域 reducer，通过 `ctx` 共享 GD
- ✅ **三层事件调度** — EventEngine 实现里程碑/行为权重/冷却衰减/累积权重二分查找
- ✅ **章节懒加载** — ch2+ 数据在 day5 加载，meta 在 day10 加载，减少初始负载
- ✅ **CSS/JS minify** — 构建产物支持 terser 压缩 + CSS minify
- ✅ **Vite 开发环境** — HMR 热更新 + 路径别名(@engine/@state/@components 等)
- ✅ **数据驱动设计** — 新增事件无需改 reducer 代码，只需添加 JSON 条目
- ✅ **DevPanel 调试** — F12 一键打开，实时查看/修改游戏状态、事件权重、性能指标

### v0.1.1-post 修复记录

| # | 问题 | 优先级 | 状态 |
|---|------|--------|------|
| 1 | ~~`getDistortedVariant` 未定义~~ | P0 | **🗑️ 误报删除** — 实际函数名 `getDistortionVariant`（eventSystemV2.js:87），定义+调用+构建产物三者一致 |
| 2 | ~~`CRITICAL_PROGRESS_GUARDS` 未定义~~ | P0 | ✅ 已定义 3 条守卫规则（码头Day6/庄园Day21/墓穴Day24） |
| 3 | ~~loopReducer `setCorruptionFlag(s)` 写错对象~~ | P0 | ✅ 一行修复 s→f，矛盾检测恢复工作 |
| 4 | ~~UI 腐蚀层与 SAN 阶段语义错位~~ | P1 | ✅ 阈值统一为 5/10/30/50 |
| 5 | ~~旧版 `selectEvent()` 无废弃标记~~ | P1 | ✅ @deprecated + console.error |
| 6 | ~~clueNameMap 缓存无失效策略~~ | P1 | ✅ 新增 invalidateClueNameCache() |
| 7 | ~~`.gitignore` 规则不完整~~ | P1 | ✅ 从 5 行扩展至 41 行 |
| 8 | ~~dispatch 闭包 state 滞后~~ | P2 | ✅ 改用 useRef 模式 |
| 9 | ~~`const acts` REST case 重复声明~~ | P2 | ✅ REST case 拆分为 7 个子函数，作用域隔离 |
| 10 | ~~dailySlice.js REST 中 `state` 未定义~~ | P0 | ✅ `state.san/hp/clues/_dayStartArea` → `s.san/s.hp/s.clues/s._dayStartArea` |
| 11 | ~~exploreSlice.js `checkOmens(state)` 崩溃~~ | P0 | ✅ `state` → `s`（参数名） |
| 12 | ~~饥饿追踪 var 提升导致失效~~ | P0 | ✅ `var food` 声明移到 `if (food === 0)` 判断之前 |
| 13 | ~~computeEventWeight 死代码~~ | P2 | ✅ 删除 computeEventWeight + enhanceEventCandidates（从未被调用） |
| 14 | ~~visualDistortion 类型不一致~~ | P2 | ✅ 6 处统一为 boolean（initialState/uiSlice/app.jsx/GamePanels） |
| 15 | eventSystemV2→extendedEvents 构建隐性依赖 | P3 | ✅ build.py 添加 DEPENDENCY 注释标注函数级依赖 |

### 剩余已知问题（均非阻塞）

| # | 问题 | 说明 | 计划 |
|---|------|------|------|
| A | ~~`const acts` 重复声明~~ | REST case 拆分为 7 个子函数，作用域已隔离 | ✅ v0.1.2 已修复 |
| B | meta 事件仅在 town_center 触发 | 36 个 meta 事件 areas 全部为 ["town_center"] | 设计决策 or 扩展分配 |
| C | applyLegacyEffects 静默丢失风险 | 事件简写格式绕过 adapter 则效果消失无提示 | 未来迁移标准格式时处理 |
| D | `flicker_control` 仅写不读 | accessibilityOptions 中存储但无消费逻辑 | 如不需要可清理 |

---

## 版本历史

| 版本 | 日期 | 主要更新 |
|------|------|---------|
| **0.1.3** | 2026-06-02 | **状态管理极致拆分 + 引擎层独立** — `src/engine/` 4 个引擎模块（EventEngine/PollutionManager/WorldTimeSystem/SaveManager，805 行）；双 Store 架构（useGameStore + useUiStore）；DevPanel 开发者调试面板（F12/Ctrl+Shift+D，4 标签页）；build.py --analyze/--dev/--prod 模式；vite @engine 别名；app.jsx 319 行 |
| **0.1.2** | 2026-06-01 | **大规模架构重构** — appHelpers.js 拆分(-60%)；dailySlice REST 7 子函数；GamePanels 组件拆分(NPCDialog/CitySketchMap)；miscReducer 合并(3→1)；Zustand-like 外部 UI Store；章节懒加载(day5/day10)；CSS minify(-6.8%)；Vite 开发环境(HMR+路径别名)；index.html 2.00→1.14MB(-43%) |
| **0.1.1** | 2026-05-31 | Error Tracker 玩家操作追踪模块（可插拔设计，一行删除移除）；ErrorBoundary 升级（错误报告含最近30步操作回放+一键复制）；ops-log.cjs 开发日志工具；清理48个调试临时文件；四维度全面代码审查（7.5/10） |
| **0.1.0** | 2026-05 | Tauri 桌面版打包；模块化重构(app.jsx 4600→2997行)；CLUE_NAME_MAP惰性修复；DESC时序修复；ErrorBoundary；循环数组截断；SkipPrologue保护；dev-server SPA fallback；DRY描述模板；构建自检脚本 |
| **v1.2** | 2026-05 | 线索中文名解析；存档多槽位+版本迁移；UGC模组系统；成就系统21个；Meta叙事事件 |
| **v1.1** | 2026-04 | V2事件调度器扩展；死亡四段叙事；轮回污染系统；前传恐惧画像；中文语音台词 |
| **v1.0** | 2026-03 | 首次发布；核心游戏循环；9区域探索；7NPC；SAN五阶段UI腐败 |

---

<div align="center">

*THE WHISPER BELOW*

*在深渊的低语被听见之前，没人知道沃切斯特曾经存在过。*

</div>
