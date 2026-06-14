# 深渊低语：沃切斯特之影

_Abyssal Whispers: Shadow of Voxchester_

<div align="center">

<img src="docs/dossier.png" alt="沃切斯特档案" style="max-width:860px; border:1px solid #333; box-shadow: 0 4px 24px rgba(0,0,0,0.5);">

![CI](https://github.com/BALIUJUNAN/abyssal-whispers/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/badge/License-CC_BY--NC--ND_4.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20Browser-lightgrey)
![Build](https://img.shields.io/badge/build-1.8MB_production-green)
![Version](https://img.shields.io/badge/version-0.3.1-orange)

[在线游玩 (Browser)](https://baliujunan.github.io/abyssal-whispers/) · [桌面版 (Tauri EXE)](#桌面版) · [快速开始](#快速开始) · [游戏特色](#游戏特色) · [技术架构](#技术架构)

**"第十三声钟响的那天晚上，我没有离开沃切斯特。"**

_不是我不肯走。是这个城镇不允许我离开。_

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
npm run tauri:build
# 输出：src-tauri/target/release/abyssal-whispers_0.2.3_x64-setup.exe
```

| 平台        | 状态          | 说明                  |
| ----------- | ------------- | --------------------- |
| **Windows** | ✅ 已验证     | NSIS 安装包，~10MB    |
| **macOS**   | ⚠️ 需自行构建 | `npm run tauri:build` |
| **Linux**   | ⚠️ 需自行构建 | `npm run tauri:build` |

- 无需安装任何依赖，完全离线可玩
- 手机 / 平板 / 桌面全平台响应式适配
- **推荐佩戴耳机** — 音频体验是沉浸感的关键

---

## 游戏特色

> **一个用 800+ 个事件、36 种行为结局、53 段原创音频和一套会对你撒谎的界面，讲述你在一座不该存在的城镇上活过、死过、再回来的故事。**

### 核心数据

| 维度           | 数据                                                                                                                        |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **独立事件**   | 800+ 个（619 扩展事件 + 175+ JSON 事件）                                                                                    |
| **行为结局**   | **36 条** — 由你的选择模式触发，非预设分支                                                                                  |
| **主线结局**   | **10 条** — 封印守护者 / 希尔达抉择 / 老费舍血脉 / 第十二声钟 / 海上逃离 / 证据逃离 / 异端黎明 / 深渊吞噬 / 超越 / 循环真相 |
| **结局余韵**   | 每条结局附带可解锁的 Afterglow 文本（条件触发）                                                                             |
| **死亡类型**   | 16 种 — 7 种物理死亡 + 8 种精神死亡 + 1 种混合                                                                              |
| **NPC**        | **8 位** × 5 级信任 × 4 层跨轮记忆 × 关系网 × 死后遗产                                                                      |
| **可探索区域** | 9 个 — 从镇中心到深渊墓穴，危险度递进                                                                                       |
| **物品**       | 79 种 — 全部有效果，含 2 家可购买商店                                                                                       |
| **事件链**     | 7 条 — 码头暗流 / 森林深处 / 庄园迷踪 / 墓穴惊魂 / 伊斯之谜 / 灯塔真相 / 城市暗流                                           |
| **音频素材**   | 53 段 (WAV + MP3) — 覆盖环境音乐 / 音效 / 中文语音                                                                          |
| **成就**       | 20 个 — 进程 / 结局 / 挑战 / 隐藏四大类                                                                                     |
| **存档槽位**   | 6 个 — 3 自动轮转 + 3 手动管理，JSON 导入导出                                                                               |
| **图片素材**   | 138 张 WebP — 含 72 张独立结局 CG                                                                                           |
| **前传系统**   | 7 场景线性叙事 — 构建你的恐惧画像                                                                                           |
| **SAN 系统**   | 6 阶段 × 4 维度（视觉/交互/逻辑/Meta）完整污染定义                                                                          |
| **布局模式**   | 2 种 — 暗黑地牢风格全景地图 / 经典三栏面板                                                                                  |
| **代码规模**   | 21,300+ 行 JS/JSX — 104 个源文件                                                                                            |

预计完整体验：**20-40 小时** | 三周目入门，十周目见真结局

### 世界观：1926 年的马萨诸塞州沃切斯特

一座港口城市。

教堂的钟声每天响 **十三下**。码头潮汐与任何时刻表都不吻合。公告栏上贴着你的失踪告示——上面的照片是你，但你还没拍过那张照。

三百年前莫里斯家族在此建立了封印。三百年后，封印开始松动。

而你——一个偶然踏入这座城镇的外来者——将用你的选择决定它的命运。

### 你会遇到这些人

| 角色                | 身份            | 关键特征                                         |
| ------------------- | --------------- | ------------------------------------------------ |
| 老费舍              | 渔夫            | 血管里流着不属于人类的东西。他知道的比你想象的多 |
| 玛莎·格雷           | 酒吧老板娘      | 镇上唯一不问来处的女人                           |
| 希尔达·莫里斯       | 庄园女主人      | 封印家族最后一位直系后裔。二十八岁               |
| 伊莎贝拉·韦伯       | 教堂执事        | 每天敲响十三下钟声的人                           |
| 伊莱亚斯·沃德       | 退休教授        | 能读不该读的文字，代价是理智以可测量速度流失     |
| 约书亚·布莱克       | 流浪汉          | 前海军陆战队员，身上的螺旋疤痕不是战场上留下的   |
| 汤米·陈             | 杂货店主/摄影师 | 冲洗的照片里总有些不该存在的影子                 |
| 埃德加·洛夫克拉夫特 | 神秘学者        | 知道太多不该知道的事，选择用沉默保护自己         |

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

### 双界面模式

游戏提供两种界面模式，按 **M 键**随时切换：

| 模式                        | 说明                                                              | 参考                   |
| --------------------------- | ----------------------------------------------------------------- | ---------------------- |
| **🗺️ 全景地图模式**（默认） | 暗黑地牢风格，全景城镇地图 + 可点击热点 + 浮动 HUD + 模态功能面板 | Darkest Dungeon Hamlet |
| **📋 经典模式**             | 传统三栏布局 — 左栏状态 / 中栏叙事 / 右栏行动                     | 经典文字 MUD           |

**全景地图模式**由以下组件驱动：

- `InteractiveTownMap` — 全屏背景图 + 9 个可点击热点（区域/NPC/建筑），hover 光晕 + 状态指示
- `FloatingInfoBar` — 悬浮 HUD，显示位置/时间/SAN/HP/AP/封印状态/天气等核心信息
- `AreaPanelModal` — 点击热点后弹出的功能面板（行动/NPC 对话/区域信息）

**经典模式**保持原有 `GamePanels` 三栏布局不变。

### 理智值 (SAN) 系统

SAN 是玩家与现实之间的契约强度。它不是一个数字——是玩家与现实之间逐渐崩裂的桥梁。随着 SAN 降低，界面、文本、世界、甚至游戏本身都会开始"背叛"玩家，最终让玩家怀疑自己是否还在操控游戏。

**单一数据源 (SSOT)**：所有 SAN 阈值从 `game_base.json` 的 `san_stages` 统一读取，通过 `getCurrentSanStage()` 全局查询，消除硬编码。每个阶段定义 visual / interaction / logic / meta 四维度参数。

| 阶段           | SAN    | 视觉（CSS + Canvas）                                                   | 交互                                                  | 逻辑                            | Meta                                      |
| -------------- | ------ | ---------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------- | ----------------------------------------- |
| **认知稳定**   | 75-100 | 无效果                                                                 | 完全正常                                              | 无                              | 无                                        |
| **轻度侵蚀**   | 55-74  | `hue-rotate(-8°)` `saturate(0.95)` 文字阴影(10s周期) 背景呼吸缩放(30s) | 按钮 30ms 延迟                                        | 零星异常词汇                    | 无                                        |
| **感知偏移**   | 40-54  | 文字颤抖(0.15s) 标题泛光(3s) 扫描线+暗角+色差(Canvas)                  | 80ms 延迟                                             | 文本幻觉 + 恐怖权重↑15%         | 无                                        |
| **解释权动摇** | 25-39  | barrel distortion + 噪点增强 + 强颤抖(0.12s)                           | **Hover 600ms 后选项扭曲** **选项文字缓慢自改写**     | 虚假记忆 + 权重腐蚀↑30%         | 存档名轻度污染                            |
| **现实侵蚀**   | 10-24  | 强 barrel + 脉冲暗角 + 旋转 + 屏幕撕裂 + 按钮随机闪烁                  | **Hover 800ms 后文字逐渐腐化** UI 大幅对抗(闪烁/错位) | 虚假消息 + 日志注入上一周目记忆 | 存档名深度污染                            |
| **现实崩解**   | 1-9    | 极端扭曲 + 随机字符替换 + 撕裂风暴 + 强旋转 + 十字准星光标             | **虚假选项**(点击消失扣SAN) 按钮抵抗抖动              | 全部逻辑污染激活                | **伪造系统通知 + Meta文本直接对玩家说话** |

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

| 时间节点 | 封印状态     | 事件                  |
| -------- | ------------ | --------------------- |
| Day 1    | 封印完整     | 钟声开始异常          |
| Day 7    | 封印松动     | 核心 NPC 出现腐化征兆 |
| Day 14   | 封印危急     | 深潜者大潮登陆        |
| Day 21   | 封印濒临崩溃 | 全城疯狂之夜          |
| Day 28   | **封印破碎** | **最终决战**          |

每次轮回更难：SAN 上限削减（loop5+ 每周 -2），世界污染加深，NPC 逐步识别你是重复访客。

### 6 种起始职业

记者 / 私家侦探 / 学者 / 医生 / 退伍军人 / 通灵者

---

## 系统功能一览

| 功能                      | 说明                                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| **双界面模式**            | 全景地图模式（暗黑地牢风格）+ 经典三栏模式，M 键切换                                                |
| **SAN 系统**              | 6 阶段 × 4 维度污染（视觉/交互/逻辑/Meta），SSOT 统一配置，平滑过渡                                 |
| **SAN 扣减统一**          | `applySanLoss()` 中央函数 — 所有 reducer 通过此函数扣 SAN，禁止直接 `clamp(san-)`                    |
| **SAN 反馈分层**          | 4 档损失表现：minor(1-3) / moderate(4-8) / severe(9-15) / critical(16+)，各有独立音效+屏幕特效+文案 |
| **死亡总结页**            | 4 段叙事结构：你如何死去 / 你发现了什么 / 世界变化了什么 / 下一轮尝试什么                           |
| **轮回差异提示**          | 每次新周目开始时展示跨轮变化：SAN上限/污染/NPC信任/技能/商店/恩赐                                   |
| **叙事引导**              | 前30分钟氛围式引导（非手游教程），受 `showGuideHints` 设置控制                                      |
| **NPC 关系反馈**          | 6 级信任分层（敌意→忠诚），跨级触发脉冲+音效，同级轻提示                                           |
| **首轮保护**              | 前3天屏蔽致命事件，SAN损失上限5，饥饿伤害减半，怪物遭遇率×0.3                                      |
| **文本重复控制**          | 4 层污染变体：原文→微妙替换→可读腐蚀→跳过摘要，跨轮持久追踪                                        |
| **商店系统**              | 2 家商店，NPC 信任解锁高级商品                                                                      |
| **事件链 / 线索链**       | 顺序推进的多阶段调查，线索组合推导结论                                                              |
| **音频系统**              | 53 段音频 — 区域环境音乐(9区×昼夜) + 技能检定音效 + 死亡叙事 + 中文语音台词 + 钟声变体              |
| **设置面板**              | 字号/行高/字族 · 闪烁/动画/高对比度 · 视觉污染/震动/文字污染/暗角 · 5路音量/静音 · 引导/跳过已读   |
| **成就系统**              | 20 个成就，进程 / 结局 / 挑战 / 隐藏四大类                                                          |
| **多槽位存档**            | 3 自动 + 3 手动，版本迁移兼容，JSON 导入/导出                                                       |
| **快捷键**                | `1-9` 选择 / `Space` 确认 / `M` 布局切换 / `I` 物品 / `J` 线索                                      |
| **章节转场**              | Day 4/8/15/22 沉浸式过渡动画（3D 透视旋转）                                                         |
| **轮回继承**              | 知识碎片 / 世界污染 / NPC 跨轮记忆 / 关系网 / 死后遗产 / 技能保留(30%) / 行为计数器搬入 / 结局代币  |
| **结局余韵**              | 每条结局附带 Afterglow 文本，满足条件后解锁（事件/物品/周目数）                                     |
| **NPC 关系网**            | NPC 间动态关系（ally/enemy/relative），跨循环保留，影响对话与事件                                   |
| **NPC 死后遗产**          | NPC 死亡后留下物品/知识/任务，玩家可领取继承                                                        |
| **轮回商店**              | 结局代币解锁（loop5+ Tier1 / loop7+ Tier2），标题画面🪙入口，6件永久商品，跨轮回效果生效          |
| **神话专名渐进渗透**      | 每NPC独立roll"滑嘴"概率，Ch2=0-5%→Ch5=70-95%，高信任更易说漏，说完立刻"改口"                     |
| **临时疯狂系统**          | 10种疯狂效果（AP清零/SAN额外/NPC信任-1/HP-3/检定惩罚/AP翻倍/附身），被动检定SAN≤15触发            |
| **光源系统**              | 4级光源影响怪物遭遇倍率(2×→0.7×)+事件文本可靠性腐蚀                                               |
| **行为人格报告**          | 32项行为计数器→人格档案，自问式叙事（"你还是你吗？"），死亡/结局时自动生成                         |
| **恐怖密度控制**          | per-chapter异常率上限(Ch1=15%/Ch5=70%)+per-area上限，接入事件权重系统                              |
| **"疑似bug"系统**         | 幻影日志(0.5%,8s消失)/NPC名字错字(0.3%)/幻影叙述(0.3%,5s消失)，玩家永远不确定是bug还是疯狂         |
| **Meta 事件后果**         | 存档覆盖 / NPC 信任锁定 / NPC 永久失踪 / 对话分支删除                                               |
| **数据验证**              | 效果/条件/引用三层校验器（CJS），运行时自动校验游戏数据完整性                                       |
| **身份注册表**            | 区域/物品/NPC 统一注册表（双格式 ESM+CJS），支持名称别名解析                                        |
| **效果执行器**            | 独立 post-reducer 副作用层（音频/存档/统计），去重 + 类型分发                                       |
| **无障碍支持**            | 轻度污染模式 / 减少动画 / 高对比度 / 字号放大 / 闪烁控制 / prefers-reduced-motion                   |
| **UGC 模组**              | 支持导入自定义事件 JSON（Schema 校验）                                                              |
| **ErrorBoundary**         | 渲染崩溃时显示错误报告（含最近30步操作回放），一键复制/重新加载                                     |
| **Error Tracker**         | 测试期玩家操作追踪模块（可插拔，一行删除即可移除）                                                  |
| **DevPanel**              | 开发者调试面板（F12 / Ctrl+Shift+D）— 一键改状态/强制事件/权重查看/性能监控                         |
| **SAN mutation 静态检查** | `npm run lint:san` — 扫描全部 reducer，禁止直接 `s.san = clamp(san-...)`，白名单除外                 |

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
  → 运行时层 (src/runtime/) — post-reducer 副作用执行器（音频/存档/统计去重）
  → 模块化 Reducer 体系（21 个领域 reducer，6 个 slice handler）
  → SAN SSOT — getCurrentSanStage() 统一查询，6阶段×4维度
  → JSON 配置驱动（事件/结局/效果/NPC/商店/SAN阶段 全部数据化）
  → 身份注册表（区域/物品/NPC 双格式 ESM+CJS，名称别名解析）
  → 数据验证器（效果/条件/引用三层校验，构建时 + 运行时）
  → 章节懒加载（ch2+ 在 day5 加载，meta 在 day10 加载）
  → Vite 主线构建（ESM + HMR + 热更新 + 路径别名）→ 多文件产物 dist-vite/
  → Python 单文件构建（Babel JSX + CSS/JS minify）→ index.html (~1.8MB)
  → Tauri v2 打包 → 原生桌面应用 (~10MB)
```

### 项目结构

```
COC/
├── index.html                # Legacy 构建产物（单文件 ~1.8MB）
├── build.py                  # Python 单文件构建脚本（--dev/--prod/--analyze/--verify）
├── vite.config.js            # Vite 配置（dev server + build + 路径别名）
├── dev.html                  # Vite 开发入口（dev server 通过 middleware 重定向）
├── package.json              # npm scripts: dev / build / build:single / verify / tauri
├── game_base.json            # 主数据（构建时从 src/data/ 复制）
├── game_ch2plus.json         # 二周目+数据
├── game_meta.json            # Meta 层数据
│
├── assets/webp/              # 138 张 WebP 图片素材
├── audio/                    # 53 个音频文件（WAV + MP3）
│
├── src/                      # 20,456 行 JS/JSX，104 个源文件
│   ├── app.jsx               # 主入口（368 行 — 路由 + 双Store桥接 + 布局切换）
│   ├── main.vite.jsx         # Vite 入口（加载 shim + 游戏数据 + 启动 app）
│   ├── main.jsx              # Legacy 构建入口（Babel 环境）
│   ├── vite-compat-shim.jsx  # Vite 兼容层（54 模块 globalThis 桥接）
│   ├── styles.css            # 样式表（1,483 行）— 含 SAN 腐化动画 + 地图模式样式
│   ├── portraitMap.js        # 图片路径映射（379 行，ESM export）
│   ├── index.template.html   # Legacy 构建模板（__INLINE_CSS__ / __INLINE_JS__ 占位符）
│   │
│   ├── engine/               # 4 个引擎模块（758 行）— 核心逻辑独立层
│   │   ├── EventEngine.js          # 统一三层加权事件选择（373 行）
│   │   ├── PollutionManager.js     # SAN+逻辑+视觉污染（98 行，SSOT阈值）
│   │   ├── WorldTimeSystem.js      # 世界状态/封印/天气/安全屋（97 行）
│   │   └── SaveManager.js          # 存档系统+版本迁移（190 行）
│   │
│   ├── runtime/              # 运行时副作用层
│   │   └── effectExecutor.js       # post-reducer 副作用执行器（45 行）
│   │                               #   AUDIO_PLAY / SAVE_GAME / INCREMENT_STAT 等
│   │                               #   按 _fxId 去重，类型分发（EFFECT_HANDLERS map）
│   │
│   ├── state/                # 5 个状态模块 — 双 Store 架构 + 平衡常量
│   │   ├── gameStore.js            # useGameStore + 选择器钩子（90 行）
│   │   ├── uiStore.js              # useUiStore（模态/Toast/设置/地图模式状态）（89 行）
│   │   ├── initialState.js         # 游戏初始状态定义（72 行）
│   │   ├── gameConstants.js        # GAME_BALANCE 集中化平衡常量（40 行）
│   │   └── transientKeys.js        # 临时状态键定义（23 行）
│   │
│   ├── components/           # 16 个 UI 组件（2,895 行）
│   │   ├── ui/DevPanel.jsx         # 开发者调试面板（79 行，F12 打开）
│   │   │
│   │   ├── GameLayout.jsx          # 布局模式切换入口（90 行）
│   │   │                           #   M 键切换全景地图/经典模式
│   │   │                           #   地图模式 → InteractiveTownMap + FloatingInfoBar
│   │   │                           #   经典模式 → GamePanels 三栏布局
│   │   ├── InteractiveTownMap.jsx  # 暗黑地牢风格全景城镇地图（339 行）
│   │   │                           #   9 个可点击热点 + hover 光晕 + 状态指示
│   │   │                           #   背景图随污染程度切换变体
│   │   ├── FloatingInfoBar.jsx     # 浮动 HUD 信息栏（140 行）
│   │   │                           #   位置/时间/SAN/HP/AP/封印/天气
│   │   ├── AreaPanelModal.jsx      # 热点点击功能面板（303 行）
│   │   │                           #   行动/NPC对话/区域信息三标签页
│   │   │
│   │   ├── GamePanels.jsx          # 经典模式主面板（428 行）
│   │   │                           #   Left/Center/Right/Header/Ending
│   │   ├── SanPollutionLayer.jsx   # SAN 6阶段腐化层（194 行）
│   │   │                           #   CSS动画+Canvas+CorruptibleChoice+AbyssPopup
│   │   ├── GameModals.jsx          # 设置/存档/成就弹窗（154 行）
│   │   ├── GameScreens.jsx         # 屏幕路由（标题/游戏/结局）（223 行）
│   │   ├── TitleScreen.jsx         # 标题画面（50 行）
│   │   ├── NPCDialog.jsx           # NPC 对话面板（91 行）
│   │   ├── CitySketchMap.jsx       # 经典模式小地图（121 行）
│   │   ├── ErrorBoundary.jsx       # 渲染错误捕获（222 行）
│   │   ├── AppToast.jsx            # Toast 通知（17 行）
│   │   ├── GameCommon.jsx          # 通用游戏 UI 片段（57 行）
│   │   └── UgcImportExport.jsx     # UGC 模组导入导出（466 行）
│   │
│   ├── reducers/             # 21 个状态管理模块（5,283 行）
│   │   ├── slices/                 # 6 个 slice handler（ctx 显式传参）
│   │   │   ├── coreSlice.js        # START_GAME / NEW_GAME / CONTINUE_GAME（115 行）
│   │   │   ├── exploreSlice.js     # MOVE / EXPLORE / DO_SKILL_CHECK（368 行）
│   │   │   │                       #   EXPLORE 分解为 3 子阶段
│   │   │   ├── npcSlice.js         # TALK_NPC / NPC_RESPONSE（287 行）
│   │   │   ├── dailySlice.js       # REST / WORK / BUY_FOOD（218 行）
│   │   │   ├── darkSlice.js        # SELF_HARM / DESECRATE / BREAK_SEAL（71 行）
│   │   │   └── uiSlice.js          # CHOICE_SELECT / GAMBLE_CHOICE / PROLOGUE（200 行）
│   │   │
│   │   ├── extendedEvents.js       # V2 事件调度（709 行）
│   │   │                           #   pure/commit 分离，SSOT triggeredEvents
│   │   ├── extendedEventsInit.js   # 扩展事件初始化（121 行）
│   │   ├── extendedEventsLoader.js # 扩展事件加载与合并（205 行）
│   │   ├── deathSystem.js          # 16 种死亡 × 四段叙事（383 行）
│   │   ├── endingReducer.js        # 结局判定与触发（343 行）
│   │   ├── loopReducer.js          # 轮回/周目切换逻辑（258 行）
│   │   ├── effectReducer.js        # 效果应用（185 行）
│   │   ├── prologueReducer.js      # 前传系统（195 行）
│   │   ├── sanReducer.js           # SAN 值变更与阶段判断（95 行）
│   │   ├── npcReducer.js           # NPC 状态管理（158 行）
│   │   ├── saveMigration.js        # 存档版本迁移（187 行）
│   │   ├── ugcReducer.js           # UGC 模组处理（265 行）
│   │   ├── miscReducer.js          # 杂项 action 处理（115 行）
│   │   ├── chapterReducer.js       # 章节转场（70 行）
│   │   ├── achievementReducer.js   # 成就系统（90 行）
│   │   ├── conclusionReducer.js    # 结局余韵（73 行）
│   │   ├── objectiveReducer.js     # 任务目标（102 行）
│   │   └── utils.js                # reducer 共用工具函数（50 行）
│   │
│   ├── systems/              # 17 个游戏系统（~3,200 行）
│   │   ├── fearLens.js             # 恐惧滤镜 — 文本+NPC对话（333 行）
│   │   ├── fearProfile.js          # 恐惧画像系统（111 行）
│   │   ├── resourceNarrative.js    # 资源-叙事绑定（271 行）
│   │   │                           #   数据驱动 infection_risk
│   │   ├── worldDecay.js           # 世界腐化推进（187 行）
│   │   ├── sanVisualCorruption.js  # SAN 视觉腐化系统（152 行）
│   │   ├── npcDialogue.js          # NPC 对话系统（128 行）
│   │   ├── metaCorruption.js       # Meta 层腐化（73 行）
│   │   ├── deathSummary.js         # 死亡总结页 — 4段叙事结构（~300 行）
│   │   │                           #   你如何死去 / 你发现了什么 / 世界变化 / 下轮目标
│   │   ├── reincarnationDiff.js    # 轮回差异提示 — 跨轮变化对比（~100 行）
│   │   ├── firstRunGuide.js        # 前30分钟叙事引导 — 氛围式提示（~80 行）
│   │   ├── npcFeedback.js          # NPC 关系反馈 — 6级信任分层（~100 行）
│   │   ├── sanFeedback.js          # SAN 反馈分层 — 4档损失表现（~120 行）
│   │   ├── firstLoopBalance.js     # 首轮保护 — 限制随机暴毙（~40 行）
│   │   ├── textVariants.js         # 文本重复控制 — 4层污染变体（~150 行）
│   │   └── gameSettings.js         # 设置系统 — 无障碍+音量+视觉控制（~100 行）
│   │
│   ├── utils/                # 8 个工具模块（1,310 行）
│   │   ├── appHelpers.js           # 游戏核心辅助函数（274 行）
│   │   ├── errorTracker.js         # 操作追踪 & 错误报告（337 行）
│   │   ├── buildEventPool.js       # 事件池构建（130 行）
│   │   ├── gameHelpers.js          # 游戏辅助工具（122 行）
│   │   ├── trustGates.js           # NPC 信任门控（171 行）
│   │   ├── npcMemory.js            # NPC 跨轮记忆（75 行）
│   │   ├── clueNameMap.js          # 线索中文名映射（47 行）
│   │   └── uiStore.js              # 旧 UI Store 兼容层（77 行）
│   │
│   ├── data/                 # 38 个数据文件 — 800+ 事件
│   │   │
│   │   │   ── 扩展事件（619 个，9 个方向） ──
│   │   ├── events_loop.js          # 轮回锁定事件（701 行）
│   │   ├── events_npc_cross.js     # NPC 跨角色事件（853 行）
│   │   ├── events_mythos.js        # 神话知识事件（610 行）
│   │   ├── events_resource.js      # 资源压力事件（664 行）
│   │   ├── events_humanity.js      # 人性抉择事件（563 行）
│   │   ├── events_area_deep.js     # 区域深层事件（143 行）
│   │   ├── events_silent.js        # 静默事件（104 行）
│   │   ├── events_omens_600.js     # 征兆事件（102 行）
│   │   ├── events_missing_600.js   # 失踪事件（143 行）
│   │   ├── events_ending.js        # 结局事件（70 行）
│   │   ├── events_death_echo.js    # 死亡回声（27 行）
│   │   ├── events_meta.js          # Meta 叙事事件（31 行）
│   │   ├── extended_events_index.js # 扩展事件汇总索引（76 行）
│   │   │
│   │   │   ── 结局系统 ──
│   │   ├── behavior_endings.js     # 36 种行为结局（710 行）
│   │   ├── ending_missing_600.js   # 第 600 号隐藏结局（72 行）
│   │   │
│   │   │   ── 前传 / 地图 / 模版 ──
│   │   ├── prologue_events.js      # 前传事件数据（299 行）
│   │   ├── townHotspots.js         # 城镇地图热点定义（237 行）
│   │   ├── mapConstants.js         # 地图布局常量（37 行）
│   │   ├── descriptionTemplates.js # 描述文本模板（14 行）
│   │   ├── ugcSchema.js            # UGC 模组 JSON Schema（582 行）
│   │   │
│   │   │   ── 核心 JSON 数据（支持懒加载） ──
│   │   ├── game_base.json          # 主游戏数据 — 区域/NPC/物品/SAN配置（8,325 行）
│   │   ├── game_ch2plus.json       # 二周目+ 事件与数据（4,065 行）
│   │   ├── game_meta.json          # Meta 层叙事数据（2,508 行）
│   │   │
│   │   │   ── 身份注册表（ESM + CJS 双格式） ──
│   │   ├── registry/
│   │   │   ├── areaRegistry.js     # 区域注册表（39 行）— 9 区域 + 别名解析
│   │   │   ├── itemRegistry.js     # 物品注册表（82 行）
│   │   │   ├── npcRegistry.js      # NPC 注册表（24 行）
│   │   │   └── registryUtils.js    # 注册表工具函数（82 行）
│   │   │
│   │   │   ── 数据验证器（CJS） ──
│   │   ├── validators/
│   │   │   ├── conditionValidator.cjs  # 条件表达式校验（26 行）
│   │   │   ├── effectValidator.cjs     # 效果对象校验（111 行）
│   │   │   ├── referenceValidator.cjs  # 引用完整性校验（84 行）
│   │   │   ├── validateGameData.cjs    # 主校验入口（15 行）
│   │   │   └── validateGameData_test.cjs  # 校验器测试（286 行）
│   │   │
│   │   └── lint_extended_events.js # 扩展事件 lint 工具（82 行）
│   │
│   ├── managers/
│   │   └── AudioManager.js         # 音频系统（144 行）
│   │
│   └── vendor/                     # React 18 / ReactDOM / Babel / Immer
│
├── src-tauri/                # Tauri v2 桌面应用配置
├── tests/                    # 9 个测试文件（272 tests）
│   ├── test_effect_protocol.cjs       # 效果协议测试（6 tests）
│   ├── test_game_data_protocol.cjs    # 游戏数据协议测试（10 tests）
│   ├── test_event_system.cjs          # 事件系统测试（19 tests）
│   ├── test_smoke_flows.cjs           # 冒烟+集成验证测试（53 tests）
│   │                                  #   S1-S6: 数据/区域/NPC/事件/轮回/状态
│   │                                  #   S7-S8: SAN mutation hygiene + death resolution
│   │                                  #   S9-S10: 模块接入验证 + 修复验证
│   ├── test_reincarnation_core.cjs    # 轮回系统完整测试（102 tests）
│   │                                  #   Part A: 单元测试（继承/污染/NPC/死亡/结局）
│   │                                  #   Part B: 场景测试（全流程/极端/存档迁移/平衡）
│   ├── test_reincarnation_player_sim.cjs # 玩家行为模拟器（32 tests）
│   │                                  #   5种人格×确定性种子×多轮回×报表生成
│   ├── test_ending_reachability.cjs   # 结局可达性测试（6 tests）
│   │                                  #   验证 10-15 轮内可达至少 2 个结局方向
│   ├── test_player_experience_loop.cjs # 玩家体验链集成测试（25 tests）
│   │                                  #   完整体验: 引导→NPC→SAN→死亡→总结→轮回→差异
│   └── integration_test.cjs           # 集成测试（19 tests）
│
├── mods/                     # UGC 模组
│   └── examples/             # 示例模组
│       ├── README.md               # 模组编写指南
│       ├── simple_event.json       # 简单事件示例
│       ├── branch_choice.json      # 分支选择示例
│       └── chain_quest.json        # 链式任务示例
│
├── scripts/
│   ├── report_references.cjs       # 引用关系分析脚本
│   ├── simulate_loops.cjs          # 轮回批量模拟器（--loops N --seed N）
│   ├── lint_san_mutations.cjs      # SAN mutation 静态检查（禁止直接 clamp）
│   ├── mod_validate.cjs            # UGC 模组校验
│   ├── mod_preview.cjs             # UGC 模组预览
│   └── mod_pack.cjs                # UGC 模组打包
│
└── docs/                     # 文档
    ├── dossier.png                 # 沃切斯特档案封面
    ├── event_authoring.md          # 事件编写指南
    ├── event_template.jsonc        # 事件模板
    ├── effect_types.md             # 效果类型文档
    ├── vite-smoke-checklist.md     # Vite 浏览器手动验收清单（9 步）
    ├── maintenance-audit-baseline.md # 维护审计基线
    └── ERROR_TRACKER_REMOVAL.md    # Error Tracker 移除指南
```

### 核心模块一览

| 模块                   | 路径                     | 行数    | 职责                                | 关键特性                                               |
| ---------------------- | ------------------------ | ------- | ----------------------------------- | ------------------------------------------------------ |
| **EventEngine**        | `engine/`                | 373     | 三层加权事件选择                    | 行为画像/冷却衰减/缓冲执行/恐惧权重/累积权重二分查找   |
| **PollutionManager**   | `engine/`                | 98      | SAN+逻辑+视觉污染                   | 文本幻觉/虚假消息/虚假记忆/权重腐蚀（SSOT阈值）        |
| **WorldTimeSystem**    | `engine/`                | 97      | 世界状态/封印/天气                  | 5阶段封印状态机/区域名称扭曲/安全屋退化                |
| **SaveManager**        | `engine/`                | 190     | 存档系统+版本迁移                   | 6槽位/字段过滤/旧格式兼容/JSON导入导出                 |
| **effectExecutor**     | `runtime/`               | 45      | post-reducer 副作用                 | EFFECT_HANDLERS 类型分发 / \_fxId 去重                 |
| **SAN SSOT**           | `state/` + JSON          | —       | 统一SAN阶段配置                     | `getCurrentSanStage()` 全局查询，6阶段×4维度，零硬编码 |
| **SanPollutionLayer**  | `components/`            | 194     | 6阶段渐进腐化                       | CSS动画+Canvas渲染+CorruptibleChoice+AbyssPopup        |
| **GameLayout**         | `components/`            | 90      | 布局模式切换                        | 全景地图/经典模式双入口，M键切换                       |
| **InteractiveTownMap** | `components/`            | 339     | 全景城镇地图                        | 暗黑地牢风格/9热点/hover光晕/污染变体背景              |
| **FloatingInfoBar**    | `components/`            | 140     | 浮动 HUD                            | 位置/时间/SAN/HP/AP/封印/天气全状态                    |
| **AreaPanelModal**     | `components/`            | 303     | 热点功能面板                        | 行动/NPC对话/区域信息三标签页                          |
| **useGameStore**       | `state/`                 | 90      | 游戏状态桥接                        | useSan/useDay/useHp/usePollution 等选择器钩子          |
| **useUiStore**         | `state/`                 | 89      | UI状态管理                          | 模态框/Toast/设置/地图模式/热点状态                    |
| **DevPanel**           | `components/ui/`         | 79      | 开发者调试面板                      | F12打开，4标签页：状态/工具/权重/性能                  |
| **死亡系统**           | `reducers/`              | 383     | 16种死亡×四段叙事                   | 标题→临终→世界处理→残留提示                            |
| **死亡总结**           | `systems/`               | 300     | 4段叙事死亡总结                     | 死因叙事/发现/世界变化/新目标，不暴露机制               |
| **轮回系统**           | `reducers/`              | 258     | 跨周目状态传递                      | 污染累积/SAN上限削减/技能继承30%/NPC记忆渐进           |
| **轮回差异**           | `systems/`               | 100     | 跨轮变化对比                        | SAN/污染/NPC/技能/商店/恩赐变化列表                    |
| **applySanLoss**       | `reducers/utils.js`      | 25      | SAN 扣减统一入口                    | 统计追踪/音频推送/_lastSanLoss UI反馈                  |
| **叙事引导**           | `systems/`               | 80      | 前30分钟氛围式提示                  | 8条环境叙事，受设置控制，不打破第四面墙                 |
| **NPC 反馈**           | `systems/`               | 100     | 信任变化分层反馈                    | 6级信任/跨级脉冲+音效/同级轻提示                       |
| **SAN 反馈**           | `systems/`               | 120     | SAN 损失4档表现                     | minor/moderate/severe/critical 各有独立音效+屏幕特效    |
| **首轮保护**           | `systems/`               | 40      | 防止首轮随机暴毙                    | 前3天屏蔽致命/SAN上限5/饥饿减半/怪物率×0.3             |
| **文本变体**           | `systems/`               | 330+    | 文本重复+神话别名+疑似bug           | 4层重复控制+专名渐进渗透+幻影日志/NPC错字/幻影叙述      |
| **前传系统**           | `reducers/`              | 195     | 7场景恐惧画像                       | 6维度心理profile/跳过保护                              |
| **结局引擎**           | `reducers/`              | 343     | AND/OR条件解析                      | 36行为结局+10主线+隐藏+Meta打破                        |
| **NPC系统**            | `reducers/` + `systems/` | 286+128 | 8人×5级信任×4层记忆×关系网×死后遗产 | 信任门控/腐蚀/救赎路线/NPC间关系/遗产继承              |
| **结局余韵**           | `reducers/`              | 73      | Afterglow 文本系统                  | 条件解锁(事件/物品/周目数)/轮回记录UI                  |
| **AudioManager**       | `managers/`              | 144     | 53段音频管理                        | 区域环境音(昼夜)/技能检定分级/SAN损失分层              |
| **Registry**           | `data/registry/`         | 227     | 身份注册表                          | 区域/物品/NPC 统一注册 + 名称别名双向解析              |
| **Validators**         | `data/validators/`       | 522     | 数据验证器                          | 效果/条件/引用三层校验，构建时 + 运行时                |

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

### UGC 模组创作指南

> **10 分钟写出你的第一个事件模组。** 只需要 JSON，不需要写代码。

#### 最小模组

```json
{
  "id": "mod_my_first",
  "name": "我的第一个模组",
  "events": [
    {
      "id": "my_event_001",
      "name": "一张奇怪的纸条",
      "type": "ugc",
      "trigger": { "areas": ["town_center"], "probability": 0.3 },
      "description": "你在公告栏后面发现了一张纸条……",
      "effects": { "san": -1 },
      "choices": [
        {
          "id": "keep",
          "text": "收起来",
          "effects": { "add_clue": { "id": "clue_note", "name": "纸条" } }
        },
        { "id": "ignore", "text": "忽略", "effects": {} }
      ]
    }
  ]
}
```

#### 作者工具

```bash
# 校验模组 JSON（检查结构、字段、安全规则）
npm run mod:validate mods/my-mod.json

# 预览模组事件（人类可读格式）
npm run mod:preview mods/my-mod.json

# 打包目录为单个 JSON（my-mod/mod.json + events/*.json → my-mod.json）
npm run mod:pack mods/my-mod
```

#### 模组目录结构（推荐）

```
my-mod/
  mod.json          ← 模组元数据（id, name, author, version, compatibility）
  events/
    strange_note.json
    mysterious_sound.json
```

#### 安全限制

UGC 模组有严格的安全限制：

| 限制             | 说明                                                        |
| ---------------- | ----------------------------------------------------------- |
| **仅 JSON**      | 不支持 JavaScript 代码执行，所有逻辑通过声明式 effects 实现 |
| **未知字段剥离** | Schema 不认识的字段会被静默移除，不会进入游戏               |
| **ID 校验**      | 仅允许字母、数字、下划线、连字符                            |
| **深度限制**     | 最多 30 个事件 / 每事件 6 个选项                            |
| **危险内容拦截** | 自动扫描并拦截脚本注入、事件处理器、远程 URL                |
| **兼容性字段**   | `compatibility` 字段标注适用游戏版本（如 `>=0.2.3`）        |

> **不会执行任何远程代码。** 模组只包含数据，不包含可执行逻辑。

---

## 开发指南

### 环境要求

| 依赖            | 版本       | 说明                             |
| --------------- | ---------- | -------------------------------- |
| **Node.js**     | >= 20.19.0 | Vite 8 官方要求；项目含 `.nvmrc` |
| **npm**         | >= 10      | 随 Node.js 20+ 自带              |
| **Python**      | >= 3.8     | Legacy 单文件构建 (`build.py`)   |
| **Rust stable** | latest     | 仅 Tauri 桌面版构建需要          |

```bash
# 推荐：使用 nvm 自动切换版本
nvm use   # 读取 .nvmrc → 20.19.0
```

### 构建路线

项目有两条构建路线，**推荐使用 Vite**：

| 路线              | 命令                            | 产物                  | 适用场景                          |
| ----------------- | ------------------------------- | --------------------- | --------------------------------- |
| **Vite（推荐）**  | `npm run dev` / `npm run build` | `dist-vite/` 多文件   | 日常开发、生产部署                |
| **Legacy 单文件** | `npm run build:single`          | `index.html` (~1.8MB) | GitHub Pages 单文件部署、离线分发 |
| **Tauri 桌面版**  | `npm run tauri:build`           | `.exe` 安装包         | 桌面客户端                        |

```bash
# 安装依赖
npm install

# ── 推荐路线 ──────────────────────────────────────────

npm run dev              # 开发服务器 → http://localhost:3000（Vite HMR）
npm run build            # 生产构建 → dist-vite/
npm run preview          # 预览生产构建 → http://localhost:4173
npm run tauri:build      # 桌面版构建（需要 Rust）

# ── 验证 ──────────────────────────────────────────────

npm run verify           # 完整验证（测试 + Vite 构建 + Legacy 构建）
npm test                 # 全部测试（272 tests / 9 suites）
npm run format:check     # 代码格式检查（Prettier）

# ── 轮回系统测试 ─────────────────────────────────────

npm run test:reinc       # 轮回核心+场景测试（102 tests）
npm run test:reinc:sim   # 玩家行为模拟器（5人格×8轮报表）
npm run simulate:loops   # 批量轮回模拟（默认 10 轮）

# ── Legacy 路线（兼容保留，不推荐新开发使用） ─────────

npm run build:single     # Python 单文件构建 → index.html
npm run dev:legacy       # Legacy 开发模式（跳过 Babel）
python build.py --analyze # 包体积分析

# ── 工具 ──────────────────────────────────────────────

npm run format           # 格式化全部源文件（Prettier）
npm run lint:san         # SAN mutation 静态检查（禁止直接 clamp）
npm run lint:events      # 扩展事件 lint
npm run test:missing600  # 第 600 号事件测试
npm run mod:validate     # UGC 模组校验
npm run mod:preview      # UGC 模组预览
npm run mod:pack         # UGC 模组打包
```

> **路线说明**：Vite 是当前主线，提供 ESM 原生模块 + HMR 热更新 + 路径别名。
> Legacy 单文件构建通过 `build.py` 保留，用于 GitHub Pages 部署和离线分发场景。
> `npm run verify` 同时覆盖两条路线，确保不退化。

### 开发者调试面板

按 **F12** 或 **Ctrl+Shift+D** 打开 DevPanel：

| 标签页      | 功能                                                                               |
| ----------- | ---------------------------------------------------------------------------------- |
| **STATE**   | 实时查看 SAN/HP/Day/Loop/AP/Area/Food/Money/Pollution/Corruption/Mythos/Seal/Clues |
| **TOOLS**   | 一键 Force EXPLORE / REST / New Game / Reset Pollution / Full SAN / Full HP        |
| **WEIGHTS** | 查看触发事件数/今日类型/异常连续/最近事件/类别预算/冷却计时                        |
| **PERF**    | FPS 监控/State key 数量/Narrative 条目数/堆内存使用                                |

### 轮回系统测试套件

`npm run test:reinc` 运行 **102 个测试**，覆盖轮回系统的完整状态机：

| 部分   | 覆盖内容                                            | 用例 |
| ------ | --------------------------------------------------- | ---- |
| 单元   | SAN 曲线 · 污染叠加 · NPC 信任 · 技能保留 · 行为计数器 · 代币商店 · 15 种死亡类型 · 结局条件解析 · SSOT 一致性 | 75   |
| 场景   | 全流程烟雾 · 连续 SAN 归零 · 高污染 · 存档迁移 · 后期平衡 · 结局历史 · 死亡区域追踪                     | 27   |

`npm run test:reinc:sim` 运行 **玩家行为模拟器**（32 tests），使用概率+规则驱动的 AI 模拟 5 种人格：

| 人格         | 特点                     | 平均存活 |
| ------------ | ------------------------ | -------- |
| `balanced`   | 均衡探索/社交/生存       | ~11 天   |
| `explorer`   | 狂探索高危区域           | ~9 天    |
| `investigator` | 线索+对话优先          | ~12 天   |
| `social`     | 优先刷 NPC 好感          | ~13 天   |
| `suicidal`   | 作死到底，测极端死亡路径 | ~2.6 天  |

```bash
node tests/test_reincarnation_player_sim.cjs --verbose --loops 10 --personality suicidal --seed 42
```

`npm run simulate:loops` 批量轮回模拟，输出统计报表（平均存活天数、死因分布、平衡评估）：

```bash
node scripts/simulate_loops.cjs --loops 20 --seed 42 --verbose
node scripts/simulate_loops.cjs --loops 50 --report report.txt
```

---

## 代码质量

### 综合评分：**9.4 / 10**

| 维度                 | 评分       | 状态                                                                                           |
| -------------------- | ---------- | ---------------------------------------------------------------------------------------------- |
| **主循环 & Reducer** | **9.5/10** | ✅ 6 slice handler + ctx 显式传参 + 引擎层独立 + 双Store架构                                   |
| **事件系统**         | **9.5/10** | ✅ EventEngine 三层加权选择，pure/commit 分离，SSOT triggeredEvents                            |
| **SAN 系统**         | **9.5/10** | ✅ SSOT 6阶段×4维度，零硬编码，CSS+Canvas+CorruptibleChoice+AbyssPopup 全实现                  |
| **子系统**           | **9.0/10** | ✅ PollutionManager/WorldTimeSystem 引擎独立，数据驱动 infection_risk                          |
| **构建流程**         | **9.5/10** | ✅ Vite 主线（ESM + HMR）；Legacy 单文件保留；verify 覆盖双构建；注释安全删除 + token 边界保护 |
| **开发体验**         | **9.5/10** | ✅ DevPanel(F12) + 双Store选择器 + 三滑块SAN控制 + GAME_BALANCE 常量                           |

### 架构优势

- ✅ **SAN SSOT** — `getCurrentSanStage()` 统一查询，6阶段×4维度配置，修改JSON即全局生效
- ✅ **引擎层独立** — `src/engine/` 4个引擎模块（758行），核心逻辑与UI完全解耦
- ✅ **运行时副作用层** — `src/runtime/effectExecutor.js` post-reducer 副作用去重执行，类型分发架构
- ✅ **双Store架构** — `useGameStore`（游戏状态选择器）+ `useUiStore`（UI状态 + 地图模式）
- ✅ **双界面模式** — 暗黑地牢全景地图 + 经典三栏，共用 reducer，零游戏逻辑改动
- ✅ **模块化彻底** — app.jsx 346行（原 4600 行），提取 16 个独立组件
- ✅ **三层事件调度** — EventEngine 实现里程碑/行为权重/冷却衰减/累积权重二分查找
- ✅ **污染平滑过渡** — SanPollutionLayer 基于阶段配置自动插值，2s ease 平滑过渡
- ✅ **三滑块SAN控制** — 视觉/交互/Meta 独立可调，轻度污染模式无障碍保护
- ✅ **数据驱动设计** — 新增事件无需改reducer代码，只需添加JSON条目；危险区域用 `infection_risk` 标志
- ✅ **身份注册表** — 区域/物品/NPC 统一注册（ESM+CJS双格式），名称别名双向解析
- ✅ **数据验证器** — 效果/条件/引用三层校验器，构建时 + 运行时自动校验
- ✅ **Vite 主线构建** — `npm run dev` / `npm run build` 使用 Vite，ESM 原生模块 + HMR 热更新 + 路径别名
- ✅ **DevPanel调试** — F12一键打开，实时查看/修改游戏状态、事件权重、性能指标
- ✅ **ctx 显式传参** — slice handler 通过参数接收上下文，可独立单元测试，无隐式全局依赖
- ✅ **GAME_BALANCE 常量** — `src/state/gameConstants.js` 集中管理平衡参数，零散魔法数字已消除
- ✅ **EXPLORE 分阶段** — 事件选择(`_selectExploreEvent`) + 效果应用(inline) + 后处理(`_postExploreProcessing`) 三阶段清晰分离
- ✅ **slice handler 显式 import** — 所有 6 个 slice handler 具备完整 ESM import，不依赖 globalThis 桥接
- ✅ **SAN 扣减统一** — `applySanLoss()` 中央函数，28 个 reducer 文件全部通过此函数扣 SAN，`lint:san` 静态检查强制执行
- ✅ **死亡总结4段叙事** — 死因叙事先行（不暴露机制）→ 发现回顾 → 世界变化 → 新目标建议，`DeathSummaryView` 组件直接渲染
- ✅ **轮回差异提示** — `computeReincarnationDiff()` 在 `initLoopState` 末尾自动生成，存入 `f.reincarnationDiff`
- ✅ **NPC 反馈分层** — 跨级触发脉冲+音效，同级轻文本，信任降级有警告，避免 UI 噪音
- ✅ **首轮保护** — `shouldBlockLethalEvent` + `adjustSanLossForFirstLoop` 接入 exploreSlice 事件筛选和伤害计算
- ✅ **文本重复控制** — `getTrackedText` 4 层分级，`seenEventTexts` 跨轮持久化（loopReducer 搬入）
- ✅ **体验链测试** — `test_player_experience_loop.cjs` 25 个测试覆盖完整玩家旅程：引导→NPC→SAN→死亡→总结→轮回→差异
- ✅ **结局可达性测试** — `test_ending_reachability.cjs` 验证 10-15 轮内普通玩家可达多个结局方向

---

## 版本历史

| 版本      | 日期       | 主要更新                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0.3.0** | 2026-06-12 | **Vite 主线切换** — ①`npm run dev` / `npm run build` 切换为 Vite；②修复 14 个组件缺失 export + React hooks 未解构；③修复 SaveManager 相对路径、ugcSchema/gameConstants/transientKeys 缺少 export；④所有 6 个 slice handler 添加显式 import（~60 条）；⑤shim 从 60 模块缩减至 54；⑥`npm run verify` 同时覆盖测试 + Vite 构建 + Legacy 构建；⑦新增 `docs/vite-smoke-checklist.md`；⑧Legacy 构建通过 `build:single` / `dev:legacy` 保留          |
| **0.3.1** | 2026-06-14 | **克苏鲁混乱感落地 + 10大系统对接** — ①神话专名渐进渗透系统：每NPC每句话独立roll"滑嘴"概率（Ch2=0-5%, Ch3=5-30%, Ch4=20-60%, 永不到100%），高信任NPC更易说漏；②临时疯狂10种效果全部接入（恐慌逃跑AP清零/歇斯底里SAN额外/偏执妄想NPC信任-1/暴力发作HP-3/幻觉SAN/失忆侦查-10/僵直闪避-50/强迫AP翻倍/幻痛全检定-15/短暂附身神话+SAN-）；③被动疯狂检定：SAN≤15时30%概率/SAN≤10时50%概率，休息时触发；④光源系统4等级接入：无光→弱光→稳定→仪式级，影响怪物遭遇倍率(2×/1.3×/1×/0.7×)+事件文本可靠性腐蚀；⑤行为人格报告：32项行为计数器→人格档案（深渊使徒/矛盾体/观测者等），死亡/结局时自动生成，自问式叙事（非标签）；⑥轮回商店UI：标题画面🪙入口，Tier1/Tier2共6件商品，代币购买+跨轮回持久化+效果接入（技能点/NPC信任/神话抗性/SAN上限）；⑦恐怖密度控制：per-chapter异常率上限（Ch1=15%/Ch5=70%）+per-area上限接入事件权重；⑧事件去重：`seenEventTexts`权重衰减（2次→0.5×, 3+次→0.2×）；⑨"疑似bug"设计系统：幻影日志(0.5%)→8秒消失/NPC名字错字(0.3%)/幻影叙述(0.3%)→5秒消失；⑩SAN文本污染概率渐进：所有硬阈值改为SAN每降1点概率微增（不再100%开关）；⑪序列规则概率梯度：连续2异常→30%插正常/3→60%/4→90%/永远不到100%；⑫修复6个bug：Immer冻结状态setTimeout修改/疯狂被同REST周期清除/恐怖密度计数逻辑反转/商店效果死状态/暴力发疯狂no-op/无用import |
| **0.2.4** | 2026-06-12 | **玩家体验系统 + SAN 工程治理** — ①新增 8 个系统模块（deathSummary/reincarnationDiff/firstRunGuide/npcFeedback/sanFeedback/firstLoopBalance/textVariants/gameSettings）；②`applySanLoss` 中央 SAN 扣减函数，28 个 reducer 文件全部接入，`lint:san` 静态检查强制执行；③死亡总结页 4 段叙事结构（DeathSummaryView 组件直接渲染）；④轮回差异提示自动计算并存入 state；⑤NPC 反馈分层（跨级脉冲+音效，同级轻提示）；⑥SAN 反馈 4 档分级（minor/moderate/severe/critical）；⑦首轮保护（前3天屏蔽致命事件，SAN 上限 5）；⑧文本重复控制 4 层变体（跨轮持久化）；⑨设置系统完善（字号/行高/字族/减少动画/高对比度/5路音量/引导开关）；⑩新增 2 个测试套件（ending_reachability + player_experience），总用例 272 / 9 套件；⑪修复 smoke_flows 从 0 用例到 53 用例；⑫修复 NPC 过滤器字段名（area→location, chapter_1_role→chapter_1_availability）；⑬污染日志区分轮基值与本轮增量 |
| **0.2.3** | 2026-06-06 | **Bug 修复 + 体验增强** — ①修复开局 ROLL_STATS 可能产出 0 HP/SAN 的 bug；②修复成就弹窗 ReferenceError；③修复 `checkSingleCondition` 的 `default: return true` 导致任何解析失败的结局条件都会触发；④修复 Babel 编译器 JSON 字符串空格导致 NPC schedule 解析失败；⑤修复 `CONTINUE_GAME` 存档读取后 UI 不更新；⑥修复死亡动画遮挡"再次踏入轮回"按钮；⑦激活码头区 layout_variants 系统；⑧码头区氛围 CSS；⑨NPC 面板增强（肖像+对话）；⑩读档系统修复 |
| **0.2.2** | 2026-06-04 | **运行时稳定性 + 构建安全 + 工程规范化** — ①修复 slice handler `ctx` 未传递导致 P0 崩溃；②修复 var 提升导致饥饿系统失效；③修复 build.py 注释删除 token 粘连导致白屏；④修复 Immer wrapper 被误删；⑤新增 GAME_BALANCE 常量集中化；⑥EXPLORE case 分解（-61%）；⑦triggeredEvents SSOT 守卫；⑧Accessibility toggle 同步；⑨数据驱动 infection_risk                                                                                                  |
| **0.2.1** | 2026-06-03 | **系统深化** — NPC 关系网 + 死后遗产；结局余韵 Afterglow；轮回平衡重做（SAN 阶梯式上限）；结局代币 + 轮回商店；Meta 事件真实后果；质量分层；Meta 频率门控；数据大幅扩展                                                                                                                                                                                                                                                                       |
| **0.2.0** | 2026-06-02 | **SAN 系统满分实现** — 6阶段×4维度 SSOT；SanPollutionLayer 全重写；三滑块SAN控制；引擎层独立；双Store架构；DevPanel；build --analyze                                                                                                                                                                                                                                                                                                          |
| **0.1.2** | 2026-06-01 | appHelpers 拆分；dailySlice REST 分解；GamePanels 组件拆分；miscReducer 合并；Zustand UI Store；章节懒加载；Vite HMR                                                                                                                                                                                                                                                                                                                          |
| **0.1.1** | 2026-05-31 | Error Tracker；ErrorBoundary 升级；四维度代码审查                                                                                                                                                                                                                                                                                                                                                                                             |
| **0.1.0** | 2026-05    | Tauri 桌面版；模块化重构；ErrorBoundary；循环数组截断                                                                                                                                                                                                                                                                                                                                                                                         |
| **v1.2**  | 2026-05    | 线索中文名解析；多槽位存档；UGC 模组；成就系统；Meta 叙事                                                                                                                                                                                                                                                                                                                                                                                     |
| **v1.1**  | 2026-04    | V2 事件调度；死亡四段叙事；轮回污染；前传恐惧画像；中文语音                                                                                                                                                                                                                                                                                                                                                                                   |
| **v1.0**  | 2026-03    | 首次发布；核心游戏循环；9 区域探索；8 NPC；SAN UI 腐败                                                                                                                                                                                                                                                                                                                                                                                        |

---

<div align="center">

_THE WHISPER BELOW_

_在深渊的低语被听见之前，没人知道沃切斯特曾经存在过。_

</div>
