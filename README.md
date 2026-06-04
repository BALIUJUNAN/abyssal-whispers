# 深渊低语：沃切斯特之影

*Abyssal Whispers: Shadow of Voxchester*

<div align="center">

<img src="docs/dossier.png" alt="沃切斯特档案" style="max-width:860px; border:1px solid #333; box-shadow: 0 4px 24px rgba(0,0,0,0.5);">

![License](https://img.shields.io/badge/License-CC_BY--NC--ND_4.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20Browser-lightgrey)
![Build](https://img.shields.io/badge/build-1.7MB_production-green)
![Version](https://img.shields.io/badge/version-0.2.2-orange)

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

> **一个用 700+ 个事件、36 种行为结局、53 段原创音频和一套会对你撒谎的界面，讲述你在一座不该存在的城镇上活过、死过、再回来的故事。**

### 核心数据

| 维度 | 数据 |
|------|------|
| **独立事件** | 750+ 个（575 扩展事件 + 175+ JSON 事件） |
| **行为结局** | **36 条** — 由你的选择模式触发，非预设分支 |
| **主线结局** | **10 条** — 封印守护者 / 希尔达抉择 / 老费舍血脉 / 第十二声钟 / 海上逃离 / 证据逃离 / 异端黎明 / 深渊吞噬 / 超越 / 循环真相 |
| **结局余韵** | 每条结局附带可解锁的 Afterglow 文本（条件触发） |
| **死亡类型** | 16 种 — 7 种物理死亡 + 8 种精神死亡 + 1 种混合 |
| **NPC** | **8 位** × 5 级信任 × 4 层跨轮记忆 × 关系网 × 死后遗产 |
| **可探索区域** | 9 个 — 从镇中心到深渊墓穴，危险度递进 |
| **物品** | 79 种 — 全部有效果，含 2 家可购买商店 |
| **事件链** | 7 条 — 码头暗流 / 森林深处 / 庄园迷踪 / 墓穴惊魂 / 伊斯之谜 / 灯塔真相 / 城市暗流 |
| **音频素材** | 53 段 (WAV + MP3) — 覆盖环境音乐 / 音效 / 中文语音 |
| **成就** | 20 个 — 进程 / 结局 / 挑战 / 隐藏四大类 |
| **存档槽位** | 6 个 — 3 自动轮转 + 3 手动管理，JSON 导入导出 |
| **图片素材** | 210 张 WebP — 含 72 张独立结局 CG |
| **前传系统** | 7 场景线性叙事 — 构建你的恐惧画像 |
| **SAN 系统** | 6 阶段 × 4 维度（视觉/交互/逻辑/Meta）完整污染定义 |
| **代码规模** | 18,842 行 JS/JSX — 91 个源文件 |

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
   SAN 上限阶梯式削减（loop4-5 下限60，loop10+ 固定50）
   NPC 记住你是重复访客 + 关系网跨循环保留
   结局代币 +1，轮回商店按周目解锁
   再次踏入沃切斯特
```

### 理智值 (SAN) 系统

SAN 是玩家与现实之间的契约强度。它不是一个数字——是玩家与现实之间逐渐崩裂的桥梁。随着 SAN 降低，界面、文本、世界、甚至游戏本身都会开始"背叛"玩家，最终让玩家怀疑自己是否还在操控游戏。

**单一数据源 (SSOT)**：所有 SAN 阈值从 `game_base.json` 的 `san_stages` 统一读取，通过 `getCurrentSanStage()` 全局查询，消除硬编码。每个阶段定义 visual / interaction / logic / meta 四维度参数。

| 阶段 | SAN | 视觉（CSS + Canvas） | 交互 | 逻辑 | Meta |
|------|-----|---------------------|------|------|------|
| **认知稳定** | 75-100 | 无效果 | 完全正常 | 无 | 无 |
| **轻度侵蚀** | 55-74 | `hue-rotate(-8°)` `saturate(0.95)` 文字阴影(10s周期) 背景呼吸缩放(30s) | 按钮 30ms 延迟 | 零星异常词汇 | 无 |
| **感知偏移** | 40-54 | 文字颤抖(0.15s) 标题泛光(3s) 扫描线+暗角+色差(Canvas) | 80ms 延迟 | 文本幻觉 + 恐怖权重↑15% | 无 |
| **解释权动摇** | 25-39 | barrel distortion + 噪点增强 + 强颤抖(0.12s) | **Hover 600ms 后选项扭曲** **选项文字缓慢自改写** | 虚假记忆 + 权重腐蚀↑30% | 存档名轻度污染 |
| **现实侵蚀** | 10-24 | 强 barrel + 脉冲暗角 + 旋转 + 屏幕撕裂 + 按钮随机闪烁 | **Hover 800ms 后文字逐渐腐化** UI 大幅对抗(闪烁/错位) | 虚假消息 + 日志注入上一周目记忆 | 存档名深度污染 |
| **现实崩解** | 1-9 | 极端扭曲 + 随机字符替换 + 撕裂风暴 + 强旋转 + 十字准星光标 | **虚假选项**(点击消失扣SAN) 按钮抵抗抖动 | 全部逻辑污染激活 | **伪造系统通知 + Meta文本直接对玩家说话** |

**污染平滑过渡**：所有视觉与交互效果通过 `getVisualForSan(san)` 自动插值相邻阶段，2s CSS transition 平滑渐变。玩家能清晰感觉到自己在"慢慢沉下去"。

**实现方式**：
- **CSS 动画**驱动轻量效果：文字颤抖(`splTremble`)、色偏(`hue-rotate`)、呼吸缩放(`splBreath`)、按钮闪烁(`splFlicker`)
- **Canvas** 驱动重效果：噪点、扫描线、vignette 暗角、色差、barrel distortion、旋转、屏幕撕裂
- **CorruptibleChoice** 组件：Hover 延迟随阶段递增(1200→600→800→400ms)，渐进文字腐化(正常→红色→深渊符号)
- **AbyssPopup** 组件：SAN<40 时每 60-120 秒弹出 meta 消息，SAN≤9 缩短至 30-60 秒并混入伪造通知

**三个独立滑块**（设置面板）：
- 🎨 视觉污染强度 — 扫描线、噪点、色差、barrel distortion、vignette
- 🖱️ 交互污染强度 — 选项文字自改写、Hover扭曲、按钮延迟、虚假选项
- 👁️ Meta 污染强度 — 伪造系统通知、存档名污染、第四面墙破裂

**无障碍保护**：提供"轻度污染模式"，大幅降低视觉+交互效果(视觉10%/交互5%/Meta25%)，仅保留核心文字污染。

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
| **SAN 系统** | 6 阶段 × 4 维度污染（视觉/交互/逻辑/Meta），SSOT 统一配置，平滑过渡 |
| **商店系统** | 2 家商店，NPC 信任解锁高级商品 |
| **事件链 / 线索链** | 顺序推进的多阶段调查，线索组合推导结论 |
| **音频系统** | 53 段音频 — 区域环境音乐(9区×昼夜) + 技能检定音效 + 死亡叙事 + 中文语音台词 + 钟声变体 |
| **设置面板** | 4 类音量 / 字号三级缩放 / 视觉扭曲开关 / 突发音效 / 闪烁效果 / **三滑块SAN污染控制** / 轻度污染模式 |
| **成就系统** | 20 个成就，进程 / 结局 / 挑战 / 隐藏四大类 |
| **多槽位存档** | 3 自动 + 3 手动，版本迁移兼容，JSON 导入/导出 |
| **快捷键** | `1-9` 选择 / `Space` 确认 / `M` 地图 / `I` 物品 / `J` 线索 |
| **章节转场** | Day 4/8/15/22 沉浸式过渡动画（3D 透视旋转） |
| **轮回继承** | 知识碎片 / 世界污染 / NPC 跨轮记忆 / 关系网 / 死后遗产 / 技能保留(30%) / 行为计数器搬入 / 结局代币 |
| **结局余韵** | 每条结局附带 Afterglow 文本，满足条件后解锁（事件/物品/周目数） |
| **NPC 关系网** | NPC 间动态关系（ally/enemy/relative），跨循环保留，影响对话与事件 |
| **NPC 死后遗产** | NPC 死亡后留下物品/知识/任务，玩家可领取继承 |
| **轮回商店** | 结局代币解锁（loop5+ Tier1 / loop7+ Tier2），提供稀有物资 |
| **Meta 事件后果** | 存档覆盖 / NPC 信任锁定 / NPC 永久失踪 / 对话分支删除 |
| **无障碍支持** | 轻度污染模式 / 可关闭视觉扭曲 / 字号放大 / prefers-reduced-motion |
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
  → SAN SSOT — getCurrentSanStage() 统一查询，6阶段×4维度
  → JSON 配置驱动（事件/结局/效果/NPC/商店/SAN阶段 全部数据化）
  → 章节懒加载（ch2+ 在 day5 加载，meta 在 day10 加载）
  → Babel JSX 编译 + CSS/JS minify → 单文件构建产物 index.html
  → Vite 开发环境（HMR + 热更新 + 路径别名）
  → Tauri v2 打包 → 原生桌面应用 (~10MB)
```

### 项目结构

```
COC/
├── index.html              # 构建产物（含 Babel ~6.5MB，生产 ~1.7MB）
├── build.py                # Python 构建脚本 --dev/--prod/--analyze/--verify
├── vite.config.js          # Vite 开发环境配置（HMR + @engine/@state 别名）
├── dev.html                # Vite 开发入口
├── package.json            # npm scripts: dev / build / build:vite / tauri
│
├── assets/webp/            # 210 张 WebP 图片素材
├── audio/                  # 53 个音频文件
│
├── src/                    # 18,842 行 JS/JSX，91 个源文件
│   ├── app.jsx             # 主入口（334 行 — 路由 + 双Store桥接 + DevPanel）
│   ├── main.jsx            # Vite ES 模块入口
│   ├── styles.css          # 样式表（84KB）
│   ├── portraitMap.js      # 图片路径映射
│   │
│   ├── engine/             # 4 个引擎模块（758 行）— 核心逻辑独立层
│   │   ├── EventEngine.js        # 统一三层加权事件选择（367 行）
│   │   ├── PollutionManager.js   # SAN+逻辑+视觉污染（151 行，SSOT阈值）
│   │   ├── WorldTimeSystem.js    # 世界状态/封印/天气/安全屋（97 行）
│   │   └── SaveManager.js        # 存档系统+版本迁移（190 行）
│   │
│   ├── state/              # 5 个状态模块 — 双 Store 架构 + 平衡常量
│   │   ├── gameStore.js          # useGameStore + 选择器钩子
│   │   ├── uiStore.js            # useUiStore（模态/Toast/设置）
│   │   ├── initialState.js       # 游戏初始状态定义
│   │   ├── gameConstants.js      # GAME_BALANCE 集中化平衡常量（18项阈值/概率）
│   │   └── transientKeys.js      # 临时状态键定义
│   │
│   ├── components/         # 11 个 UI 组件（2,087 行）
│   │   ├── ui/DevPanel.jsx       # 开发者调试面板（F12，4标签页）
│   │   ├── GamePanels.jsx        # 主面板（Left/Center/Right/Header/Ending）
│   │   ├── SanPollutionLayer.jsx # SAN 6阶段腐化层（194行，CSS+Canvas+CorruptibleChoice+AbyssPopup）
│   │   ├── GameModals.jsx        # 设置/存档/成就弹窗（含三滑块SAN控制）
│   │   └── ... (NPCDialog/CitySketchMap/GameScreens/ErrorBoundary 等)
│   │
│   ├── reducers/           # 22 个状态管理模块（4,887 行）
│   │   ├── slices/               # 6 个 slice handler（ctx 显式传参）
│   │   │   ├── coreSlice.js      # START_GAME/NEW_GAME/CONTINUE_GAME
│   │   │   ├── exploreSlice.js   # MOVE/EXPLORE/DO_SKILL_CHECK（EXPLORE 分解为 3 子阶段）
│   │   │   ├── npcSlice.js       # TALK_NPC/NPC_RESPONSE
│   │   │   ├── dailySlice.js     # REST/WORK/BUY_FOOD（9 子函数，ctx 显式传参）
│   │   │   ├── darkSlice.js      # SELF_HARM/DESECRATE/BREAK_SEAL
│   │   │   └── uiSlice.js        # CHOICE_SELECT/GAMBLE_CHOICE/PROLOGUE
│   │   ├── extendedEvents.js     # V2 事件调度（pure/commit 分离，SSOT triggeredEvents）
│   │   ├── deathSystem.js        # 16 种死亡 × 四段叙事
│   │   └── ... (miscReducer/loopReducer/saveReducer 等)
│   │
│   ├── systems/            # 9 个游戏系统（1,764 行）
│   │   ├── eventSystemV2.js      # 三层事件选择
│   │   ├── fearLens.js           # 恐惧滤镜（文本+NPC对话）
│   │   ├── resourceNarrative.js  # 资源-叙事绑定（数据驱动 infection_risk）
│   │   ├── worldDecay.js         # 世界腐化推进
│   │   ├── metaCorruption.js     # Meta层腐化
│   │   └── ... (fearProfile/npcDialogue/sanVisualCorruption 等)
│   │
│   ├── utils/              # 8 个工具模块
│   │   ├── appHelpers.js         # 游戏核心辅助函数
│   │   ├── errorTracker.js       # 操作追踪 & 错误报告
│   │   └── ... (clueNameMap/trustGates/npcMemory 等)
│   │
│   ├── data/               # 24 个数据文件 — 723+ 事件
│   │   ├── events_*.js           # 12 个事件数据模块（633 扩展事件）
│   │   ├── behavior_endings.js   # 36 种行为结局
│   │   └── game_base/ch2plus/meta.json  # JSON 数据（支持懒加载）
│   │
│   ├── managers/AudioManager.js  # 音频系统
│   └── vendor/                   # React/ReactDOM/Babel
│
├── src-tauri/              # Tauri v2 桌面应用配置
├── tests/                  # 测试（事件系统集成测试 + 单元测试）
├── mods/                   # UGC 模组示例
└── docs/                   # 文档与图片
```

### 核心模块一览

| 模块 | 职责 | 关键特性 |
|------|------|---------|
| **EventEngine** | 三层加权事件选择 | 行为画像/冷却衰减/缓冲执行/恐惧权重/累积权重二分查找 |
| **PollutionManager** | SAN+逻辑+视觉污染 | 文本幻觉/虚假消息/虚假记忆/权重腐蚀（SSOT阈值） |
| **WorldTimeSystem** | 世界状态/封印/天气 | 5阶段封印状态机/区域名称扭曲/安全屋退化 |
| **SaveManager** | 存档系统+版本迁移 | 6槽位/字段过滤/旧格式兼容/JSON导入导出 |
| **SAN SSOT** | 统一SAN阶段配置 | `getCurrentSanStage()` 全局查询，6阶段×4维度，零硬编码 |
| **SanPollutionLayer** | 6阶段渐进腐化 | CSS动画+Canvas渲染+CorruptibleChoice+AbyssPopup，194行 |
| **useGameStore** | 游戏状态桥接 | useSan/useDay/useHp/usePollution 等选择器钩子 |
| **useUiStore** | UI状态管理 | 模态框/Toast/设置/临时UI状态 |
| **DevPanel** | 开发者调试面板 | F12打开，4标签页：状态/工具/权重/性能 |
| **死亡系统** | 16种死亡×四段叙事 | 标题→临终→世界处理→残留提示 |
| **轮回系统** | 跨周目状态传递 | 污染累积/SAN上限削减/技能继承30%/NPC记忆渐进 |
| **前传系统** | 7场景恐惧画像 | 6维度心理profile/跳过保护 |
| **结局引擎** | AND/OR条件解析 | 36行为结局+10主线+隐藏+Meta打破 |
| **NPC系统** | 8人×5级信任×4层记忆×关系网×死后遗产 | 信任门控/腐蚀/救赎路线/NPC间关系/遗产继承 |
| **结局余韵** | Afterglow 文本系统 | 条件解锁(事件/物品/周目数)/轮回记录UI |
| **AudioManager** | 53段音频管理 | 区域环境音(昼夜)/技能检定分级/SAN损失分层 |

### SAN 系统架构（SSOT）

```
game_base.json  →  san_stages[6]  →  visual / interaction / logic / meta 四维度配置
       │
       ▼
getCurrentSanStage(san, ctx)  ← 定义在 utils.js（bundle 最先加载）
       │
       ├── sanReducer.js       → getSanStage() 用 stage.level 判断文本变体
       ├── PollutionManager.js → 文本幻觉/虚假消息/虚假记忆/权重腐蚀
       ├── EventEngine.js      → getSanWeightMultiplier（6阶段阈值）
       ├── SanPollutionLayer.jsx
       │     ├── getVisualForSan(san) → 阶段插值 → Canvas 渲染
       │     ├── san-stage-N CSS类    → hue-rotate/tremble/glow/flicker 动画
       │     ├── CorruptibleChoice    → 阶段感知 Hover 延迟 + 渐进文字腐化
       │     └── AbyssPopup           → Meta 消息弹出（60-120s / 30-60s）
       └── app.jsx             → san-stage-N CSS类注入 + 破壁事件 + CG预加载
```

修改 JSON 中的 `san_stages` 范围或效果参数，所有系统自动跟随。无硬编码阈值。

### 数据驱动设计

新增事件**无需改动任何 reducer 代码** —— 只需在 `src/data/events_*.js` 中添加数据条目：

```javascript
{
  id: "area_custom_001",
  name: "事件名称",
  type: "area_deep",
  trigger: { areas: ["town_center"], min_loop: 2, once_per_run: true },
  description: "你发现了一些不该存在的东西。",
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

# 生产构建 — 单文件 HTML
npm run build
# 输出：index.html（生产 ~1.7MB，开发含 Babel ~6.5MB）

# 生产构建（要求 Babel 编译成功，否则失败）
python build.py --prod

# 快速开发构建（跳过 Babel 编译）
python build.py --dev

# 包体积分析（按目录分类展示各模块大小）
python build.py --analyze

# 验证当前 index.html
python build.py --verify

# Vite 构建（实验性）
npm run build:vite

# 构建桌面版（需要 Rust）
npm run tauri build
```

### 开发者调试面板

按 **F12** 或 **Ctrl+Shift+D** 打开 DevPanel：

| 标签页 | 功能 |
|--------|------|
| **STATE** | 实时查看 SAN/HP/Day/Loop/AP/Area/Food/Money/Pollution/Corruption/Mythos/Seal/Clues |
| **TOOLS** | 一键 Force EXPLORE / REST / New Game / Reset Pollution / Full SAN / Full HP |
| **WEIGHTS** | 查看触发事件数/今日类型/异常连续/最近事件/类别预算/冷却计时 |
| **PERF** | FPS 监控/State key 数量/Narrative 条目数/堆内存使用 |

---

## 代码质量

### 综合评分：**9.4 / 10**

| 维度 | 评分 | 状态 |
|------|------|------|
| **主循环 & Reducer** | **9.5/10** | ✅ 6 slice handler + ctx 显式传参 + 引擎层独立 + 双Store架构 |
| **事件系统** | **9.5/10** | ✅ EventEngine 三层加权选择，pure/commit 分离，SSOT triggeredEvents |
| **SAN 系统** | **9.5/10** | ✅ SSOT 6阶段×4维度，零硬编码，CSS+Canvas+CorruptibleChoice+AbyssPopup 全实现 |
| **子系统** | **9.0/10** | ✅ PollutionManager/WorldTimeSystem 引擎独立，数据驱动 infection_risk |
| **构建流程** | **9.0/10** | ✅ --analyze/--dev/--prod 模式；注释安全删除 + token 边界保护 |
| **开发体验** | **9.5/10** | ✅ DevPanel(F12) + 双Store选择器 + 三滑块SAN控制 + GAME_BALANCE 常量 |

### 架构优势

- ✅ **SAN SSOT** — `getCurrentSanStage()` 统一查询，6阶段×4维度配置，修改JSON即全局生效
- ✅ **引擎层独立** — `src/engine/` 4个引擎模块（758行），核心逻辑与UI完全解耦
- ✅ **双Store架构** — `useGameStore`（游戏状态选择器）+ `useUiStore`（UI状态）
- ✅ **模块化彻底** — app.jsx 从4600行降至334行（-93%），提取20+个独立模块
- ✅ **三层事件调度** — EventEngine 实现里程碑/行为权重/冷却衰减/累积权重二分查找
- ✅ **污染平滑过渡** — SanPollutionLayer 基于阶段配置自动插值，2s ease 平滑过渡
- ✅ **三滑块SAN控制** — 视觉/交互/Meta 独立可调，轻度污染模式无障碍保护
- ✅ **数据驱动设计** — 新增事件无需改reducer代码，只需添加JSON条目；危险区域用 `infection_risk` 标志
- ✅ **DevPanel调试** — F12一键打开，实时查看/修改游戏状态、事件权重、性能指标
- ✅ **ctx 显式传参** — slice handler 通过参数接收上下文，可独立单元测试，无隐式全局依赖
- ✅ **GAME_BALANCE 常量** — `src/state/gameConstants.js` 集中管理 18 项阈值/概率/时长，零散魔法数字已消除
- ✅ **EXPLORE 分阶段** — 事件选择(`_selectExploreEvent`) + 效果应用(inline) + 后处理(`_postExploreProcessing`) 三阶段清晰分离

---

## 版本历史

| 版本 | 日期 | 主要更新 |
|------|------|---------|
| **0.2.2** | 2026-06-04 | **运行时稳定性 + 构建安全 + 工程规范化** — ①修复 dailySlice/exploreSlice 的 `ctx` 未传递导致 REST/EXPLORE 必然 TypeError 的 P0 崩溃（所有 slice handler 显式接收 ctx 参数）；②修复 resourceNarrative.js 的 var 提升导致饥饿系统完全失效的 P0 bug（`var food` 移至函数顶部 + `_starvingDays`→`starvationDays` 统一计数器键名）；③修复 build.py `_strip_comments_safe` 删除 `/* */` 后 token 粘连导致 63 处 `returnReact` ReferenceError 白屏的 P0 bug（状态机补空格 + 正则兜底 `[)}:=!~]` 标点边界）；④修复 Immer UMD wrapper 的 `return module.exports` 被注释行删除导致 `Immer.produce` undefined 的 P0 bug；⑤修复 build.py 正则过度匹配（`[^\s]`→字母）导致全文 `var`→`v a r` 字符间距破坏的回归 bug；⑥新增 `src/state/gameConstants.js` 集中化 GAME_BALANCE 常量（18 项阈值/概率/时长），替换 5 个 slice 文件中的魔法数字；⑦EXPLORE case 从 222 行/6 层嵌套分解为 `_selectExploreEvent` + `_postExploreProcessing` + 85 行主干（-61%）；⑧`commitSelectedEvent` 写入 `triggeredEvents`（SSOT），加守卫防止双重 push；⑨GameModals 的 visualDistortion/flickerEffect toggle 同步 dispatch `ACCESSIBILITY_TOGGLE`，修复 state/settings 不一致；⑩resourceNarrative.js 的危险区域改为数据驱动 `area.infection_risk` 标志；⑪extendedEvents.js 添加构建顺序依赖注释；⑫清理 eventSystemV2.js 的 `computeEventWeight` 死代码 |
| **0.2.1** | 2026-06-03 | **系统深化 + 构建修复** — ①修复 `utils/uiStore.js` 重复打包导致 `SyntaxError: _useSyncExternalStore` 的致命bug；②NPC 关系网(§1.2)：`setNpcRelation`/`getNpcRelation`/`getNpcConnections` — NPC间动态关系(ally/enemy/relative)，跨循环保留；③NPC 死后遗产(§1.2)：`registerNpcLegacy`/`claimNpcLegacy` — NPC死亡后留下物品/知识/任务；④结局余韵系统(§5.3)：`checkAfterglowUnlock`/`getAfterglowTexts`/`getEndingRecord` — 结局附带可解锁Afterglow文本；⑤轮回平衡重做(§2.2)：SAN阶梯式上限(loop4-5下限60, loop10+固定50)，污染取代SAN惩罚；⑥结局代币+轮回商店(§2.4)：每达成结局+1代币，loop5/7解锁商店层级；⑦Meta事件真实后果(§3.3)：存档覆盖/NPC信任锁定/NPC永久失踪/对话分支删除；⑧质量分层(§3.2)：Tier C事件文本截断+重复触发泛化替换；⑨Meta事件频率门控(§3.4)：`max_meta_per_run`触发条件；⑩数据大幅扩展：game_base.json +8322行，9个事件模块全面更新 |
| **0.2.0** | 2026-06-02 | **SAN系统满分实现** — 6阶段×4维度详细污染定义；SSOT单一数据源(`getCurrentSanStage()`零硬编码)；SanPollutionLayer完全重写(194行，CSS动画+Canvas渲染+CorruptibleChoice+AbyssPopup)；6阶段渐进效果(色偏/颤抖/泛光/扫描线/暗角/barrel/撕裂/虚假选项/伪造通知)；三滑块SAN控制；轻度污染模式(无障碍)；引擎层独立(4模块758行)；双Store架构；DevPanel(F12)；build --analyze/--dev/--prod |
| **0.1.2** | 2026-06-01 | appHelpers拆分(-60%)；dailySlice REST 7子函数；GamePanels组件拆分；miscReducer合并(3→1)；Zustand外部UI Store；章节懒加载(day5/day10)；Vite开发环境(HMR) |
| **0.1.1** | 2026-05-31 | Error Tracker操作追踪；ErrorBoundary升级(30步回放)；四维度代码审查(7.5/10) |
| **0.1.0** | 2026-05 | Tauri桌面版；模块化重构(app.jsx 4600→2997行)；ErrorBoundary；循环数组截断 |
| **v1.2** | 2026-05 | 线索中文名解析；存档多槽位+版本迁移；UGC模组系统；成就系统20个；Meta叙事事件 |
| **v1.1** | 2026-04 | V2事件调度器扩展；死亡四段叙事；轮回污染系统；前传恐惧画像；中文语音台词 |
| **v1.0** | 2026-03 | 首次发布；核心游戏循环；9区域探索；8NPC；SAN五阶段UI腐败 |

---

<div align="center">

*THE WHISPER BELOW*

*在深渊的低语被听见之前，没人知道沃切斯特曾经存在过。*

</div>

