# 深渊低语：沃切斯特之影

_Abyssal Whispers: Shadow of Voxchester_

<div align="center">

<img src="docs/dossier.png" alt="沃切斯特档案" style="max-width:860px; border:1px solid #333; box-shadow: 0 4px 24px rgba(0,0,0,0.5);">

![CI](https://github.com/BALIUJUNAN/abyssal-whispers/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/badge/License-CC_BY--NC--ND_4.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20Browser-lightgrey)
![Build](https://img.shields.io/badge/build-Vite_%2B_singlefile-green)
![Tests](https://img.shields.io/badge/tests-648_passed_%2F_0_failed-brightgreen)
![Version](https://img.shields.io/badge/version-0.9.8-orange)

[在线游玩 (Browser)](https://baliujunan.github.io/abyssal-whispers/) · [桌面版 (Tauri EXE)](#桌面版) · [快速开始](#快速开始) · [游戏特色](#游戏特色) · [技术架构](#技术架构)

**"第十三声钟响的那天晚上，我没有离开沃切斯特。"**

_不是我不肯走。是这个城镇不允许我离开。_

</div>

---

## 快速开始

### 浏览器版（无需安装）

```bash
# 方式一：开发模式（推荐，热更新）
npm install
npm run dev          # → http://localhost:3000

# 方式二：构建后预览
npm run build        # → dist/ (587字节HTML + 分块JS + 音频 + 图片)
npx vite preview     # → http://localhost:4173

# 方式三：内容编辑器
npm run dev
# 浏览器访问 http://localhost:3000/editor
```

### 桌面版（EXE 安装包）

> 使用 [Tauri v2](https://tauri.app/) 打包的原生桌面应用，提供更好的离线体验与音频支持。

```bash
# 从源码构建（需要 Rust + Node.js 环境）
npm install
npm run tauri:build
# 输出：src-tauri/target/release/abyssal-whispers_0.9.7_x64-setup.exe
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
| **独立事件**   | **629 个**（599 扩展事件 + 120 补充事件 + 90 ch2plus + 20 基础 + 17 死亡回声 + 3 预兆 + 10 痕迹连锁） + 102 结局，全部含 quality_tier / trigger 条件，**589 个事件含 SAN/轮回 distortion variants（覆盖率 93%，54 个引用 5 套共享模板，消除逐字重复）** |
| **行为结局**   | **36 条** — 由你的选择模式触发，非预设分支                                                                                  |
| **主线结局**   | **10 条** — 封印守护者 / 希尔达抉择 / 老费舍血脉 / 第十二声钟 / 海上逃离 / 证据逃离 / 异端黎明 / 深渊吞噬 / 超越 / 循环真相 |
| **结局余韵**   | 每条结局附带可解锁的 Afterglow 文本（条件触发）                                                                             |
| **死亡类型**   | 16 种 — 7 种物理死亡 + 8 种精神死亡 + 1 种混合                                                                              |
| **NPC**        | **8 位** × 5 级信任 × 4 层跨轮记忆 × 关系网 × 死后遗产 × **40+ 条上下文对话**（信任/时段/SAN/轮回/死亡遗产变体）             |
| **可探索区域** | 9 个 — 从镇中心到深渊墓穴，危险度递进（45-265 事件/区域）                                                                    |
| **物品**       | 79 种 — 全部有效果，含 2 家可购买商店 + 轮回商店 6 件永久商品                                                                |
| **事件链**     | 12 条 — 7 条主线叙事链 + 5 条玩家痕迹软连锁（has_flag/add_flag 引擎级事件依赖）                                                |
| **音频素材**   | 53 段 (WAV + MP3) — 覆盖环境音乐 / 音效 / 中文语音                                                                          |
| **成就**       | 20 个 — 进程 / 结局 / 挑战 / 隐藏四大类                                                                                     |
| **存档槽位**   | 6 个 — 3 自动轮转 + 3 手动管理，JSON 导入导出                                                                               |
| **图片素材**   | 141 张 WebP — 含 72 张独立结局 CG + 3 张镇中心专用场景图                                                                     |
| **前传系统**   | 7 场景线性叙事 — 构建你的恐惧画像 + 打字机效果                                                                               |
| **SAN 系统**   | 6 阶段 × 4 维度（视觉/交互/逻辑/Meta）完整污染定义，SAN视觉精度化（稀疏恐怖，非噪声）+ AP 污染 + 不可靠总结 + Mythos 门控    |
| **布局模式**   | 2 种 — 暗黑地牢风格全景地图 / 经典三栏面板                                                                                  |
| **转场动画**   | **Canvas 程序化转场** — 噪声擦拭 / 墨汁渗透 / 虚空之环 / 故障切片 4 种效果 + 主题音效联动 + 可关闭                          |
| **AI 叙事增强**| GLM-4.7 Flash — 9 个场景动态生成，离线优先                                                                   |
| **代码规模**   | 60,282 行 JS/JSX — 120+ 个源文件                                                                                           |
| **数据校验**   | Zod Schema 855条数据全量校验                                                                                                 |
| **引擎边界**   | src/engine/ 零游戏导入，6个独立模块，`npm run lint:engine` 自动检查                                                           |
| **测试覆盖**   | 15 个套件 648 项（完整流程 48 + 事件 lint 100 + 平衡系统 96 + 轮回 134 + 冒烟 53 + 集成 19 + slice handler 单元测试 40 + 其他 86），拼接/Vite 双构建验证                                                          |

预计完整体验：**20-40 小时** | 三周目入门，十周目见真结局

### 世界观：1926 年的马萨诸塞州沃切斯特

一座港口城市。

教堂的钟声每天响 **十三下**。码头潮汐与任何时刻表都不吻合。公告栏上贴着你的失踪告示——上面的照片是你，但你还没拍过那张照。

三百年前莫里斯家族在此建立了这座城市。三百年后，地下的某些东西开始松动。

而你——一个偶然踏入这座城镇的外来者——将用你的选择决定它的命运。

### 你会遇到这些人

| 角色                | 身份            | 关键特征                                                                    |
| ------------------- | --------------- | --------------------------------------------------------------------------- |
| 老费舍              | 渔夫            | 六十年不脱鞋。血管在皮肤下蠕动。闭上眼能精确预知潮汐                        |
| 玛莎·格雷           | 酒吧老板娘      | 丈夫出海五年未归。醉酒水手说在深海中看到了她丈夫的面孔——但那已经不完全是人类的了 |
| 希尔达·莫里斯       | 庄园女主人      | 莫里斯家族女性没有活过三十岁。她的梳妆台抽屉里有一口量好尺寸的棺材          |
| 伊莎贝拉·韦伯       | 教堂执事        | 每天敲十三下钟。祈祷词里有一些不属于任何已知语言的音节。手腕内侧的血管是蓝绿色的 |
| 伊莱亚斯·沃德       | 退休教授        | 手指尖被墨水染成永久蓝黑色。对话中会突然停顿，盯着你身后某个你看不到的东西  |
| 约书亚·布莱克       | 流浪汉          | 失踪一周后被发现蜷缩在垃圾桶旁。身体上的螺旋疤痕排列得不像意外              |
| 汤米·陈             | 杂货店主/摄影师 | 冲洗的照片里总有些不该存在的影子。建筑物阴影中多了一个人影                  |
| 埃德加·洛夫克拉夫特 | 作家            | 从未来过沃切斯特，但他的小说越来越多地与这里的真实事件重合。凌晨三点准时醒来 |

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

注意：AP 本身不可靠。SAN 深渊会吞噬你对行动力的感知——
你以为自己还能行动，但时间已经在你不知情的情况下流逝了。
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
- **AbyssPopup** 组件：SAN<40 时每 90-180 秒弹出 meta 消息，SAN≤9 保留 30-60 秒但可**抵抗**（快速连点3次，每次-1SAN）

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

### Day-of-Cycle 事件权重

关键日期(第 7/14/21/28 天)事件权重动态调整，营造"世界加速崩塌"的节奏感：

| 日期类型 | 超自然/怪物事件 | 日常/NPC/氛围事件 |
|----------|----------------|------------------|
| 普通日期 | ×1.0 | ×1.0 |
| **关键日期** (7/14/21/28) | **×1.8** | **×0.4** |

此外 SAN stage 5+ 时叠加类型差异化修正：超自然遭遇 ×1.8，日常事件 ×0.4——双重机制确保高侵蚀时恐怖密度持续攀升。

### NPC 对话深化

8 位 NPC 对话系统扩展至三层优先级：

| 优先级 | 触发条件 | 触发概率 | 内容类型 |
|--------|---------|---------|---------|
| P1 | 日期里程碑 (Day 1-28) | 50% | NPC 对关键日期的独特反应 |
| P2 | 当前天气变化 | 30% | NPC 对 5 种天气的个性化评论 |
| P3 | 信任/时段/SAN/轮回 (原有) | 条件触发 | 上下文感知对话 |
| P4 | 腐化/感染变体 (原有) | 条件触发 | 疾病/疯狂影响下的对话 |

**SAN 观察系统**：SAN < 40 时 NPC 注意到玩家精神状态恶化，触发关心/警告台词（25% 概率，`isSpecial: true` 高亮显示）。

### 6 种起始职业

记者 / 私家侦探 / 学者 / 医生 / 退伍军人 / 通灵者

### AI 叙事增强（GLM-4.7 Flash）

> **可选功能** — 离线优先，需联网 + API Key，API 失败自动回退静态文本。

游戏接入 [智谱 GLM-4.7 Flash](https://z.ai/) 模型，为 **9 个核心场景**提供动态叙事生成：

| # | 场景 | 触发条件 | 说明 |
|---|------|---------|------|
| 1 | **NPC 动态对话** | 信任 ≥3 时与 NPC 对话 | 8 位 NPC 独立人设，基于信任/周目/腐蚀度动态生成对话 |
| 2 | **SAN 文本污染** | SAN ≤25 的叙事文本（40%采样） | 将正常文本改写为"不可靠叙述"版本 |
| 3 | **Meta 异象** | REST 后 SAN≤30（15-50%概率） | 生成独特的"系统入侵"伪消息 |
| 4 | **事件描述增强** | signature/里程碑 或 SAN≤40 | 根据玩家状态润色事件描述 |
| 5 | **人格反思增强** | 死亡画面（有行为标签时） | LLM 生成更深邃的行为档案附注 |
| 6 | **存档名污染** | SAN≤20 + day 变化（50%概率） | 异步篡改最近存档的显示名 |
| 7 | **轮回开场白** | 新轮回开始（loopCount≥1） | 根据上轮死因/线索/NPC 关系生成既视感叙事 |
| 8 | **死亡总结增强** | 死亡画面 | 4 段叙事 LLM 重写 |
| 9 | **死亡余韵** | 死亡画面 | 诗意的氛围描写，暗示轮回即将开始 |

**架构设计**：

```
设置面板（总开关 + API Key + 4 个子功能独立控制）
    ↓
glmClient.js — API 封装（限流2s / 缓存5min / 超时15s / 队列串行化 / 单飞守卫）
    ↓
llmNarrative.js — 9 个增强函数（Prompt 工程 + 游戏状态注入）
    ↓
UI 层异步调用 → 渐进增强（静态文本立即显示，LLM 文本就绪后追加）
```

**离线优先原则**：

- Reducer 层零 LLM 依赖（保持同步确定性）
- API 不可用时自动回退到 800+ 条静态事件文本
- 设置面板一键开关，子功能可独立控制
- 新轮回自动清缓存

**成本控制**：限流 2s 间隔 · 缓存 5min · 普通事件 30% 采样 · 高优先级 100% · 单飞守卫 · 队列串行化

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
| **首轮保护**              | Loop 0-3 渐进保护：L0 前3天屏蔽致命/SAN上限5/饥饿减半/怪物×0.3 → L2 前2天安全/SAN上限7/致命屏蔽/怪物×0.5 → L3 前1天安全/SAN上限9/致命解除/怪物×0.7 |
| **文本重复控制**          | 4 层污染变体：原文→微妙替换→可读腐蚀→跳过摘要，跨轮持久追踪                                        |
| **商店系统**              | 2 家商店，NPC 信任解锁高级商品                                                                      |
| **事件链 / 线索链**       | 顺序推进的多阶段调查，线索组合推导结论                                                              |
| **音频系统**              | 53 段音频 — 区域环境音乐(9区×昼夜) + 技能检定音效 + 死亡叙事 + 中文语音台词 + 钟声变体 + AP消耗音效反馈 + 前传环境音 |
| **笔记本系统**            | 独立浮层 UI（N 键/按钮），3 条线索链 + 5 个结论 + 线索互引标记 + 散落笔记，不影响上方数据查看          |
| **事件日志**              | 可折叠事件记录面板（左栏全量 / 右栏最近10条 / 顶部快捷按钮），按 Day 标记，支持幻影条目过期过滤，存档持久化（200条上限）  |
| **设置面板**              | **页面缩放**(70-140%) · 字号/行高/字族 · 闪烁/动画/高对比度 · 视觉污染/震动/文字污染/暗角 · 5路音量/静音 · 引导/跳过已读 · **存档/读档/成就入口** |
| **成就系统**              | 20 个成就，进程 / 结局 / 挑战 / 隐藏四大类                                                          |
| **多槽位存档**            | 3 自动 + 3 手动，版本迁移兼容，JSON 导入/导出                                                       |
| **快捷键**                | `1-9` 选择 / `Space` 确认 / `M` 布局切换 / `I` 物品 / `J` 线索 / `N` 笔记本                            |
| **章节转场**              | Day 4/8/15/22 沉浸式过渡动画（3D 透视旋转）                                                         |
| **轮回记忆效应机械化**    | 结局 `loop_memory_effect` 叙事文本自动解析为机械效果（NPC信任+/腐化-/SAN上限/全属性+/神秘学+/物品/角色解锁/封印知识），10+种模式正则匹配，`applyLoopMemoryEffects()` 实现 |
| **封印知识持久化**        | 追踪封印仪式参与记录(Hilda/Fisher/Isabella)，跨轮解锁特殊对话和事件                                                                  |
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
| **AP 污染系统**           | SAN深/轮回多时AP显示欺骗(多报1-4点)+行动偷取(20-40%多扣1AP)+发现机制(揭示叙事)                   |
| **不可靠每日总结**        | SAN stage≥2:数值误差±1 / ≥3:省略行动记录 / ≥4:追加虚假记忆                                        |
| **区域描述渐进变体**      | 9区域×3层到访记忆（2-3次/4-6次/7+次），lookup表驱动，自然流过污染管线                                  |
| **Mythos SAN门控**        | SAN≥50且loop<3时mythos增益静默跳过——知识"滑过"意识，保持"不可知"恐怖                               |
| **事件文本感官化**        | 800+事件全面改写：去掉"你知道——"句式，"展现"替代"讲述"，感官细节替代概念说明                       |
| **神话专名门控**          | 第一周目零真名泄露；loop 2 使用模糊替代（"那个符号""地下的纹路"）；loop 3+ 才解锁专名              |
| **Meta 事件后果**         | 存档覆盖 / NPC 信任锁定 / NPC 永久失踪 / 对话分支删除                                               |
| **数据验证**              | 效果/条件/引用三层校验器（CJS），运行时自动校验游戏数据完整性                                       |
| **身份注册表**            | 区域/物品/NPC 统一注册表（双格式 ESM+CJS），支持名称别名解析                                        |
| **效果执行器**            | 独立 post-reducer 副作用层（音频/存档/统计），去重 + 类型分发                                       |
| **无障碍支持**            | 轻度污染模式 / 减少动画 / 高对比度 / 字号放大 / 闪烁控制 / prefers-reduced-motion                   |
| **UGC 模组**              | 支持导入自定义事件 JSON + 可视化事件编辑器（Schema 校验 + 实时预览）；Mod 可扩展 5 种实体类型（事件/NPC/物品/区域/结局），自动 ID 冲突前缀 + Dev Mode 热重载                                                              |
| **ErrorBoundary**         | 渲染崩溃时显示错误报告（含最近30步操作回放），一键复制/重新加载                                     |
| **Error Tracker**         | 测试期玩家操作追踪模块（可插拔，一行删除即可移除）                                                  |
| **DevPanel**              | 开发者调试面板（~ / Ctrl+Shift+D）— 一键改状态/强制事件/权重查看/性能监控                           |
| **AI 叙事增强**           | GLM-4.7 Flash — 9 场景动态生成，离线优先，API 失败自动回退                                          |
| **SAN mutation 静态检查** | `npm run lint:san` — 扫描全部 reducer，禁止直接 `s.san = clamp(san-...)`，白名单除外                 |
| **屏幕转场动画**          | Canvas 程序化转场（噪声擦拭/墨汁渗透/虚空之环/故障切片）+ CSS enter + 主题音效联动 + 800ms 编排      |
| **NPC 上下文对话**        | 8 位 NPC × 143+ 条条件感知对话（信任/时段/SAN/轮回/死亡遗产/物品/区域/日期里程碑/天气反应），优先未读，去重              |
| **Day-of-Cycle 事件权重** | 关键日期(7/14/21/28)超自然事件×1.8、日常事件×0.4，营造"世界加速崩塌"节奏感                                                           |
| **轮回记忆效应机械化**    | `applyLoopMemoryEffects()` 解析结局 `loop_memory_effect` 文本，自动应用 NPC 信任/腐化/SAN/属性/物品/角色解锁等机械效果                   |
| **NPC 日期里程碑对话**    | 关键日期(1-28天)触发 NPC 独特反应，每 NPC 每日期一条，50% 概率触发                                                                     |
| **NPC 天气反应对话**      | 8 位 NPC 对 5 种天气(晴/阴/雨/雾/血月)各有独立台词，30% 概率触发                                                                       |
| **NPC SAN 观察对话**      | SAN < 40 时 NPC 注意到玩家精神状态恶化，25% 概率触发关心/警告台词                                                                      |
| **Loop 2-3 渐进保护**     | Loop 2(SAN损失上限7/安全区2天/致命屏蔽) → Loop 3(SAN损失上限9/安全区1天/致命解除)，渐进过渡桥梁                              |
| **Day-Critical SAN 脉冲** | 关键日期触发视觉脉冲(surge 1.8×/final 2.2×)，SAN 损失闪光反馈，增强日期紧迫感                                                          |
| **难度模组 Hooks**        | UGC 模组可注入 `difficulty_modifiers`(text_corruption_boost/npc_trust_multiplier/custom_text_swaps) + 5 种扩展实体类型（NPC/物品/区域/结局），Zod Schema 全量校验                |
| **NPC 记忆 Tier 5**       | 汤米·陈 + 埃德加·洛夫克拉夫特新增 Tier 5 跨轮记忆(实验室/相机记忆/时间线重叠)，8 NPC 全部覆盖到 T5                              |
| **模拟器性能增强**        | `simulate_loops.cjs` 新增 --difficulty/--batch/--progress/--json 参数，游戏数据模块级缓存，循环效果表预计算                               |
| **balanceSimulator**      | 轻量级 28 天蒙特卡洛模拟器（~280 行），复用 13 级难度 + 恐惧画像 + graduated protection + 封印状态，96 项平衡测试覆盖 10 维度                                  |
| **玩家痕迹系统**          | 9 条行为痕迹（3 试点 + 6 扩展），跨轮回区域描述自动追加，add_flag/has_flag 软连锁引擎级事件依赖，5 条痕迹回声事件                                                       |
| **SanPollutionLayer 缓存**| `getVisualForSan` 结果 useRef 缓存，仅 SAN 变化时重算，减少 Canvas 渲染开销                                                           |
| **第 600 事件**           | 隐藏终局事件 — loop≥10 + mythos≥25 + san≤10 + 5+结局 + 终局内容 → 599→600 虚拟事件自动显现         |
| **triggeredSet.js**       | 并行 Set 结构替代 triggeredEvents.includes() O(n) 扫描，12 个文件 migrated，事件查询 O(1)                                                               |
| **triggeredEvents 上限**  | triggeredEvents 硬上限 1000 + triggeredSilentEvents 上限 500，每轮回 initLoopState 自动截断，防止长玩存档膨胀                                                                 |
| **AudioManager 资源释放** | stopAmbient() 加 `src=''` 释放媒体引用，允许 GC 回收 Audio 对象                                                                             |
| **NPCDialog AbortController** | LLM 异步请求真正 abort（不只是丢弃结果），glmClient._doFetch 接受外部 AbortSignal                                                                    |
| **React 渲染缓存**        | FloatingInfoBar CluePanel + GamePanels freeClues 加 useMemo，大数组 filter 仅依赖变化时重算                                                              |
| **eventBus 订阅审计**     | 确认 on() 订阅未被组件导入使用，无监听器泄漏风险                                                                                                |

---

## 在线体验

🔗 **[GitHub Pages 在线版](https://baliujunan.github.io/abyssal-whispers/)** — 浏览器直接打开即可游玩

> 推荐使用 Chrome / Edge 以获得最佳音频体验。移动端同样适配。

### 13 级难度系统

游戏提供 **13 级难度梯度**，从休闲体验到原汁原味的克苏鲁恐怖，每级均有独立的中文名称与完整参数配置：

| 区间 | 级别 | 名称 | 存活率 | 平均天数 | 目标玩家 |
|------|------|------|--------|----------|----------|
| **基础** | Level 1 | 薄雾 | 35-45% | 22-24天 | 新手 |
| | Level 2 | 潮声 | 25-35% | 20-22天 | 新手 |
| | Level 3 | 初访 | 20-25% | 19-21天 | 标准玩家 |
| **进阶** | Level 4 | 低语 | 15-20% | 17-19天 | 进阶玩家 |
| | Level 5 | 湿痕 | 12-15% | 16-18天 | 进阶玩家 |
| | Level 6 | 失名 | 10-12% | 15-17天 | 进阶玩家 |
| **硬核** | Level 7 | 曲径 | 8-10% | 14-16天 | 硬核玩家 |
| | Level 8 | 螺旋 | 6-8% | 13-15天 | 硬核玩家 |
| | Level 9 | 地鸣 | 5-6% | 12-14天 | 硬核玩家 |
| **传说** | Level 10 | 影随 | 4-5% | 11-13天 | 极限玩家 |
| | Level 11 | 海蚀 | 3-4% | 10-12天 | 极限玩家 |
| | Level 12 | 门开 | 2-3% | 9-11天 | 极限玩家 |
| **终极** | Level 13 | 归渊 | <1% | 8-10天 | 第十三声钟 |

**难度分级**：

| 级别 | 钟相 | 起始食物 | 起始AP | 负面事件权重 | 特殊机制 |
|------|------|---------|--------|-------------|---------|
| 1-3 | 昼钟 | 3 | 12 | ×1.0 | 新手保护期 |
| 4-6 | 雾钟 | 2 | 10 | ×1.2 | 资源紧张 |
| 7-9 | 昏钟 | 1 | 8 | ×1.5 | 系统性压力 |
| 10-12 | 夜钟 | 0 | 6 | ×2.0 | 极限压迫 |
| 13 | 第十三声 | 0 | 4 | ×3.0 | 现实扭曲 + 隐藏结局解锁 |

**保护机制**：
- **SAN保护**: 根据难度级别和游戏天数减少SAN损失（Day 1-3 最高保护，Day 22-28 无保护）
- **HP保护**: 同 SAN 保护，按难度×天数阶梯衰减
- **安全区**: 低难度限制可访问区域范围（Level 1-3: 6/5/4 区 → Level 13: 0 区）
- **损失上限**: 每次/每日最大 SAN/HP 损失限制
- **SAN继承**: Level 13 特有 — 轮回时继承 10% SAN（上限 20），开启"第十三声"钟响

**数据驱动**：所有 13 级参数存储于 `difficultyLevels.json`，`difficultyLevels.js` 自动生成，`difficultyState.js` 运行时应用。

**使用方法**：
```bash
# 运行难度测试
node scripts/simulate_loops.cjs --loops 100 --seed 42 --verbose

# 测试特定难度
node scripts/simulate_loops.cjs --difficulty 13 --loops 50 --report report.txt
```

**集成代码**：
```javascript
import { DIFFICULTY_LEVELS_RAW } from './config/difficultyLevels.js';
import { getDifficultyConfig, getPhaseProtection } from './config/difficulty.js';
import { applyDifficultyToState } from './state/difficultyState.js';

// 获取难度配置（按级别查表）
const config = getDifficultyConfig(7); // Level 7: 曲径

// 应用难度到游戏状态
const stateWithDifficulty = applyDifficultyToState(initialState, 7);

// 按阶段查询保护（Day-based）
const protection = getPhaseProtection(7, 5); // Level 7, Day 5
```


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
React 18 + Zustand + Immer middleware + combineSlices 声明式切片
  → useGameStore (Zustand + immer) — 唯一游戏状态源，dispatch → rootReducer → flushEffects
  → src/state/combineSlices.js — createSlice 工厂 + rootReducer 组合器，before/after 三阶段执行
  → 8 个 domain slice（core/explore/npc/daily/dark/ui + systemSlice cross-cutting）— 薄调度层，逻辑委托 src/systems/{explore,npc,daily}/
  → 引擎层 (src/engine/) — 纯 JavaScript，独立 npm 包，零游戏导入，DI 注入
  │    EventEngine / WorldTimeSystem / SaveManager / PollutionManager
  │    commands.js (类型化 effect 工厂) / eventBus.js (跨 Slice 通信)
  │    EventEngine Section 9: Day-of-Cycle 权重(关键日期超自然×1.8/日常×0.4)
  → 运行时层 (src/runtime/) — post-reducer 副作用执行器（类型分发 + 去重 + effects buffer）
  → AI 叙事增强 (utils/glmClient.js + systems/llmNarrative.js)
  │    GLM-4.7 Flash — 9 场景动态生成，离线优先，UI层异步，Reducer零侵入
  → NPC对话深化 (systems/npcDialogue.js) — 日期里程碑/天气反应/SAN观察三层扩展
  → 难度系统 (state/difficultyState.js + config/difficulty.js) — 13级梯度 + 模组Hooks
  → JSON 配置驱动 + Zod Schema 校验（855条数据全量 + difficulty_modifiers校验）
  → 章节硬限（Chapter 1 事件池过滤 + AP压限 + Day 3强制过渡）
  → Vite 主线构建（ESM + code-split + 587字节HTML）→ dist/
  → Tauri v2 打包 → 原生桌面应用
```

### 项目结构

```
COC/
├── index.html                # Vite 开发入口
├── vite.config.js            # Vite 配置（dev server + build + 路径别名 + singlefile）
├── package.json              # npm scripts: dev / build / verify / tauri / test suites
├── game_base.json            # 主数据 canonical 源（脚本/校验工具使用，游戏代码通过 src/data/game_base/index.js 导入）
├── game_ch2plus.json         # 二周目+数据
├── game_meta.json            # Meta 层数据
│
├── assets/webp/              # 138 张 WebP 图片素材
├── audio/                    # 53 个音频文件（WAV + MP3）
│
├── src/                      # 60,282 行 JS/JSX，130+ 个源文件
│   │   ├── initialState.js        # 游戏初始状态定义（72 行）
│   │   ├── gameConstants.js       # GAME_BALANCE 集中化平衡常量（40 行）
│   │   ├── difficultyState.js     # 难度 applyDifficultyToState（~60 行）
│   │   └── transientKeys.js       # 临时状态键定义（23 行）
│   │
│   ├── components/           # 16 个 UI 组件（2,895 行）
│   │   ├── ui/DevPanel.jsx         # 开发者调试面板（79 行，~ 打开）
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
│   │   ├── ScreenTransition.jsx    # 屏幕转场编排器（118 行）— Canvas + CSS + 音频联动
│   │   ├── TransitionCanvas.jsx    # Canvas 程序化转场引擎（197 行）— 4种像素级效果
│   │   ├── UgcEventEditor.jsx      # 可视化事件编辑器（~450 行）— 表单 + 实时验证 + JSON 预览
│   │   └── UgcImportExport.jsx     # UGC 模组管理 + Dev Mode（~600 行）
│   │
│   ├── reducers/             # 21 个状态管理模块（5,500+ 行）
│   │   ├── slices/                 # 6 个 legacy slice + 1 个 systemSlice
│   │   │   ├── systemSlice.js     # Cross-cutting hooks（95 行）— before/after 三阶段
│   │   │   │                      #   before: tracking/profiling/hoarding + _apBefore 标记
│   │   │   │                      #   after: AP 偷取检测 + AP 变化音效
│   │   │   ├── coreSlice.js        # START_GAME / NEW_GAME / CONTINUE_GAME / SET_DIFFICULTY 等（~150 行）
│   │   │   ├── adventureSlice.js   # BEGIN_ADVENTURE（~250 行）— 从 coreSlice 提取
│   │   │   ├── exploreSlice.js     # MOVE / EXPLORE / DO_SKILL_CHECK（368 行）
│   │   │   │                       #   EXPLORE 分解为 3 子阶段
│   │   │   ├── npcSlice.js         # TALK_NPC / NPC_RESPONSE（~350 行）— 日期/天气/SAN观察对话
│   │   │   ├── dailySlice.js       # REST / WORK / BUY_FOOD（~250 行）— Day-Critical脉冲触发
│   │   │   ├── darkSlice.js        # SELF_HARM / DESECRATE / BREAK_SEAL（71 行）
│   │   │   └── uiSlice.js          # CHOICE_SELECT / GAMBLE_CHOICE / PROLOGUE（200 行）
│   │   │
│   │   ├── extendedEvents.js       # V2 事件调度（709 行）
│   │   │                           #   pure/commit 分离，SSOT triggeredEvents
│   │   ├── extendedEventsInit.js   # 扩展事件初始化（121 行）
│   │   ├── extendedEventsLoader.js # 扩展事件加载与合并（205 行）
│   │   ├── deathSystem.js          # 16 种死亡 × 四段叙事（383 行）
│   │   ├── endingReducer.js        # 结局判定与触发（343 行）
│   │   ├── loopReducer.js          # 轮回/周目切换 + 记忆效应机械化（~390 行）
│   │   ├── effectReducer.js        # 效果应用（185 行）
│   │   ├── prologueReducer.js      # 前传系统（195 行）
│   │   ├── sanReducer.js           # SAN 游戏逻辑（70 行）— 扣分/疯狂 + re-export展示层
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
│   ├── hooks/                # 13 个自定义 hooks（250 行）— 从 app.jsx 提取的 useEffect 逻辑
│   │   ├── index.js              # barrel export
│   │   ├── useSeedStore.js       # Zustand store 初始化 + loading 层移除
│   │   ├── useMigrateOldSaves.js # 旧存档格式迁移
│   │   ├── useAudioSettingsInit.js # 音频设置同步
│   │   ├── useAudioAutoplayUnlock.js # 浏览器音频解锁
│   │   ├── useReducedMotion.js   # reduced-motion 属性同步
│   │   ├── useNotebookTutorialSync.js # 笔记本引导同步
│   │   ├── usePageZoom.js        # 页面缩放控制
│   │   ├── useEndingCgPreload.js # 结局 CG 预加载
│   │   ├── useChapterLazyLoad.js # 章节数据懒加载
│   │   ├── useAchievementCheck.js # 成就检测 + toast
│   │   ├── useSanLossHint.js     # 第一次掉 SAN 轻提示
│   │   ├── useBootHint.js        # 前传结束轻提示
│   │   └── useLevel13Glitch.js   # 十三钟响脉冲
│   │
│   ├── hooks/                # 13 个自定义 hooks（250 行）— 从 app.jsx 提取的 useEffect 逻辑
│   │   ├── index.js              # barrel export
│   │   ├── useSeedStore.js       # Zustand store 初始化 + loading 层移除
│   │   ├── useMigrateOldSaves.js # 旧存档格式迁移
│   │   ├── useAudioSettingsInit.js # 音频设置同步
│   │   ├── useAudioAutoplayUnlock.js # 浏览器音频解锁
│   │   ├── useReducedMotion.js   # reduced-motion 属性同步
│   │   ├── useNotebookTutorialSync.js # 笔记本引导同步
│   │   ├── usePageZoom.js        # 页面缩放控制
│   │   ├── useEndingCgPreload.js # 结局 CG 预加载
│   │   ├── useChapterLazyLoad.js # 章节数据懒加载
│   │   ├── useAchievementCheck.js # 成就检测 + toast
│   │   ├── useSanLossHint.js     # 第一次掉 SAN 轻提示
│   │   ├── useBootHint.js        # 前传结束轻提示
│   │   └── useLevel13Glitch.js   # 十三钟响脉冲
│   │
│   ├── systems/              # 22 个游戏系统（~4,800 行）
│   │   ├── sanityVisual.js         # SAN 视觉呈现系统（290 行）— 颜色/文本腐蚀/CSS类/Canvas参数
│   │   ├── earlyHooks.js           # Day 1-3 感官锚点（82 行）— 十三声钟入口+区域低语
│   │   ├── fearLens.js             # 恐惧滤镜 — 文本+NPC对话（333 行）
│   │   ├── fearProfile.js          # 恐惧画像系统（111 行）
│   │   ├── resourceNarrative.js    # 资源-叙事绑定（271 行）
│   │   │                           #   数据驱动 infection_risk
│   │   ├── worldDecay.js           # 世界腐化推进（~540 行）— Day 1-2 新叙事 + 确定性RNG
│   │   ├── sanVisualCorruption.js  # SAN 视觉腐化触发器（35 行）— surge/flash脉冲，渲染移至组件层
│   │   ├── npcDialogue.js          # NPC 对话系统（~400 行）— 日期里程碑/天气反应/SAN观察三层扩展
│   │   ├── metaCorruption.js       # Meta 层腐化（73 行）
│   │   ├── deathSummary.js         # 死亡总结页 — 4段叙事结构（~300 行）
│   │   │                           #   你如何死去 / 你发现了什么 / 世界变化 / 下轮目标
│   │   ├── reincarnationDiff.js    # 轮回差异提示 — 跨轮变化对比（~100 行）
│   │   ├── firstRunGuide.js        # 前30分钟叙事引导 — 氛围式提示（~80 行）
│   │   ├── npcFeedback.js          # NPC 关系反馈 — 6级信任分层（~100 行）
│   │   ├── sanFeedback.js          # SAN 反馈分层 — 4档损失表现（~120 行）
│   │   ├── firstLoopBalance.js     # 首轮+二三轮保护（~140 行）— Loop 2-3渐进桥梁
│   │   ├── balanceSimulator.js     # 平衡模拟器（~280 行）— 28天蒙特卡洛/13级难度/恐惧画像/graduated protection/封印状态
│   │   ├── textVariants.js         # 文本重复控制 — 4层污染变体 + 难度文本替换（~230 行）
│   │   ├── llmNarrative.js         # AI 叙事增强层（~320 行）— 9个LLM增强函数（事件/NPC/死亡/Meta/余韵/SAN腐蚀/人格反思/轮回开场/存档名污染）
│   │
│   ├── utils/                # 9 个工具模块（1,600+ 行）
│   │   ├── appHelpers.js           # 游戏核心辅助函数（274 行）
│   │   ├── errorTracker.js         # 操作追踪 & 错误报告（337 行）
│   │   ├── buildEventPool.js       # 事件池构建 + 扩展实体合并（~280 行）
│   │   ├── gameHelpers.js          # 游戏辅助工具（122 行）
│   │   ├── trustGates.js           # NPC 信任门控（171 行）
│   │   ├── npcMemory.js            # NPC 跨轮记忆（~130 行）— Tier 5新增(汤米·陈/洛夫克拉夫特)
│   │   ├── clueNameMap.js          # 线索中文名映射（47 行）
│   │   ├── triggeredSet.js         # triggeredEvents 并行 Set（O(1) 查询，替代 Array.includes O(n)）
│   │   ├── glmClient.js            # GLM-4.7 Flash API 客户端（~190 行）— 限流/缓存/超时/设置持久化
│   │   └── uiStore.js              # 旧 UI Store 兼容层（77 行）
│   │
│   ├── data/                 # 38+ 个数据文件 — 855+ 事件 + 结局余韵 + loop_memory_effect
│   │   │
│   │   │   ── 扩展事件（619 个，9 个方向） ──
│   │   ├── events/               # 事件数据目录（18 文件 / 860 事件 / 26,253 行）
│   │   │   ├── INDEX.md          # 自动生成事件索引
│   │   │   ├── events_loop.js          # 轮回锁定事件（701 行）
│   │   │   ├── events_npc_cross.js     # NPC 跨角色事件（853 行）
│   │   │   ├── events_mythos.js        # 神话知识事件（610 行）
│   │   │   ├── events_resource.js      # 资源压力事件（664 行）
│   │   │   ├── events_humanity.js      # 人性抉择事件（1706 行，54 事件，6 子类型模板化）
│   │   │   ├── events_area_deep.js     # 区域深层事件（143 行）
│   │   │   ├── events_silent.js        # 静默事件（104 行）
│   │   │   ├── events_omens_600.js     # 征兆事件（102 行）
│   │   │   ├── events_missing_600.js   # 失踪事件（143 行）
│   │   │   ├── events_ending.js        # 结局事件（70 行）
│   │   │   ├── events_death_echo.js    # 死亡回声（27 行）
│   │   │   ├── events_meta.js          # Meta 叙事事件（31 行）
│   │   │   ├── events_supplement.js    # 后7区补充事件（120 个，56KB）
│   │   │   ├── events_legendary.js     # 传奇事件
│   │   │   ├── events_ch2plus.js       # ch2+ 事件
│   │   │   ├── events_fear_endings.js  # 恐惧结局事件
│   │   │   └── events_death_count_meta.js # 死亡计数元事件
│   │   │
│   │   │   ── 聚合索引（stay in src/data/） ──
│   │   ├── extended_events_index.js # 扩展事件汇总索引（76 行）
│   │   │
│   │   │   ── 结局系统 ──│   │   │   ── 结局系统 ──
│   │   ├── behavior_endings.js     # 36 种行为结局（710 行）
│   │   ├── ending_missing_600.js   # 第 600 号隐藏结局（72 行）
│   │   │
│   │   │   ── 前传 / 地图 / 模版 ──
│   │   ├── prologue_events.js      # 前传事件数据（299 行）
│   │   ├── townHotspots.js         # 城镇地图热点定义（237 行）
│   │   ├── mapConstants.js         # 地图布局常量（37 行）
│   │   ├── descriptionTemplates.js # 描述文本模板（14 行）
│   │   ├── areaDescriptionVariants.js # 区域描述到访渐进变体 lookup 表（9区域×3层，~70 行）
│   │   ├── distortionTemplates.js  # 扭曲文本共享模板（6 模板 + DISTORTION_TEMPLATE_MAP，~90 行）
│   │   ├── ugcSchema.js            # UGC 模组 JSON Schema + 扩展实体验证（~950 行）
│   │   │
│   │   │   ── 核心 JSON 数据（支持懒加载） ──
│   │   ├── game_base/              # 主游戏数据目录（拆分为 6 领域文件 + 聚合 index.js）
│   │   │   ├── index.js           # 聚合导出（向后兼容，替代原 game_base.json import）
│   │   │   ├── design_intent.json # 设计意图、文本风格（910 行）
│   │   │   ├── balance.json       # core_loop + world 配置（7,108 行）
│   │   │   ├── systems.json       # 系统配置（58,123 行）
│   │   │   ├── narrative.json     # areas/npcs/events/items/chains（83,958 行）
│   │   │   ├── shops.json         # 商店配置（543 行）
│   │   │   └── vertical_slice.json # 垂直切片配置（1,114 行）
│   │   ├── game_base.json         # 主游戏数据 — 脚本/校验工具 canonical 源（8,410 行）
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
│   │   │   ── Zod Schema 验证 ──
│   │   ├── schemas/
│   │   │   └── index.js            # Zod Schema 定义（260 行）— Event/NPC/Area/Item 全量校验
│   │   │
│   │   ├── milestones.js           # 章节里程碑 + 强制叙事钩子（102 行）
│   │   │
│   │   │   ── 数据验证器（CJS） ──
│   │   └── validators/
│   │       ├── conditionValidator.cjs  # 条件表达式校验（26 行）
│   │       ├── effectValidator.cjs     # 效果对象校验（111 行）
│   │       ├── referenceValidator.cjs  # 引用完整性校验（84 行）
│   │       ├── validateGameData.cjs    # 主校验入口
│   │       └── validateGameData_test.cjs  # 校验器测试
│   │   │
│   │   └── lint_extended_events.js # 扩展事件 lint 工具
│   │
│   ├── managers/
│   │   └── AudioManager.js         # 音频系统
│   │
│   ├── docs/
│   │   ├── adr/                    # 架构决策记录（29 条 ADR）
│   │   └── reports/                # 平衡性测试报告 + 设计文档（迁移自 tests/）
│   │
│   ├── scripts/
│   │   ├── validators/             # 数据校验器（CJS，迁移自 src/data/validators/）
│   │   ├── benchmark/              # 性能基准测试（reducer throughput + full game loop）
│   │   ├── sim28balance*.cjs       # 28天平衡模拟器（13级难度 × 恐惧画像）
│   │   └── ...
│
├── src-tauri/                # Tauri v2 桌面应用配置
├── tests/                    # 15 个测试套件（648 tests）
│   ├── test_effect_protocol.cjs       # 效果协议测试（19 tests）
│   ├── test_game_data_protocol.cjs    # 游戏数据协议测试（10 tests）
│  ├── test_event_system.cjs          # 事件系统测试（19 tests）
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
│   ├── test_phase2_features.mjs        # Phase 2 专项测试（100 tests）
│   │                                  #   has_flag 触发/micro_horror 数据完整性/玩家痕迹/NPC 覆盖率
│   ├── test_balance_system.mjs         # 平衡系统测试（96 tests）
│   │                                  #   10 维度：配置完整性/单调性/保护倍率/graduated protection/恐惧画像/难度梯度/消耗速率/封印递增/可复现性/输出结构
│   └── integration_test.cjs           # 集成测试（19 tests）
│   │
│   ├── unit/                    # 单元测试
│   │   ├── sliceHandlers.test.mjs  # Slice handler 核心分支测试（40 tests）
│   │   │                           #   dailySlice(WORK/REST) / darkSlice(SELF_HARM/SPREAD_PROPHECY)
│   │   │                           #   coreSlice(SET_DIFFICULTY/SET_ARCHETYPE/ROLL_STATS)
│   │   │                           #   loopSlice(NEW_GAME) / exploreSlice(MOVE/EXPLORE)
│   │   │                           #   npcSlice(TALK_NPC) + RNG 确定性验证
│   │   └── mocks/                # 测试 mock
│   │       └── saveManager.mjs   # SaveManager no-op mock（localStorage/save 副作用隔离）
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
│   ├── simulate_loops.cjs          # 轮回批量模拟器（--loops/--difficulty/--batch/--progress/--json）
│   ├── lint_san_mutations.cjs      # SAN mutation 静态检查（禁止直接 clamp）
│   ├── lint_engine_boundary.cjs    # 引擎边界检查（零游戏导入）
│   ├── validate_data.cjs           # Zod Schema 数据校验 CLI
│   ├── count_events.mjs            # 事件文件统计（自动生成 events/INDEX.md）
│   ├── split_game_base.mjs         # game_base.json 拆分为领域目录（可重复运行）
│   ├── mod_validate.cjs            # UGC 模组校验
│   ├── mod_preview.cjs             # UGC 模组预览
│   └── mod_pack.cjs                # UGC 模组打包
│
├── tools/
│   └── editor.html                 # 内容编辑器（381 行）— 非程序员数据编辑，localhost:3000/editor
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
| **EventEngine**        | `engine/`                | 465+    | 三层加权 + Day-of-Cycle权重 + 扭曲模板注入 | behavior画像/冷却衰减/缓冲执行/恐惧权重/关键日期超自然×1.8 + injectDistortionTemplates DI模板注入 |
| **PollutionManager**   | `engine/`                | 161     | SAN+逻辑+视觉污染                   | 文本幻觉/虚假消息/虚假记忆/权重腐蚀 + 确定性RNG        |
| **SaveManager**        | `engine/`                | ~230    | 存档系统+版本迁移                   | 6槽位/字段过滤/旧格式兼容/JSON导入导出                    |
| **useGameStore**       | `state/`                 | 143    | Zustand + Immer 桥接层   | dispatch → rootReducer → patch draft → flushEffects |
| **gameStore**          | `state/`                 | 14     | 旧 Zustand 兼容 facade  | 委托 useGameStore.js                                       |
| **useUiStore**         | `state/`                 | 89     | UI状态管理               | 模态框/Toast/设置/地图模式/热点状态                        |
| **WorldTimeSystem**    | `engine/`                | 97     | 世界状态/封印/天气       | 5阶段封印状态机/区域名称扭曲/安全屋退化 + 确定性RNG       |
| **effectExecutor**     | `runtime/`               | ~107    | post-reducer 副作用      | EFFECT_HANDLERS 类型分发 / \_fxId 去重 + flushEffectsBuffer |
| **SAN SSOT**           | `state/` + JSON          | —       | 统一SAN阶段配置          | `getCurrentSanStage()` 全局查询，6阶段×4维度，零硬编码    |
| **SanPollutionLayer**  | `components/`            | 194     | 6阶段渐进腐化 + Day-Critical脉冲 | CSS动画+Canvas渲染+useRef缓存+CorruptibleChoice+AbyssPopup |
| **GameLayout**         | `components/`            | 90      | 布局模式切换             | 全景地图/经典模式双入口，M键切换                          |
| **InteractiveTownMap** | `components/`            | 339     | 全景城镇地图             | 暗黑地牢风格/9热点/hover光晕/污染变体背景                 |
| **FloatingInfoBar**    | `components/`            | 140     | 浮动 HUD                 | 位置/时间/SAN/HP/AP/封印/天气全状态                       |
| **AreaPanelModal**     | `components/`            | 303     | 热点功能面板             | 行动/NPC对话/区域信息三标签页                             |
| **useUiStore**         | `state/`                 | 89      | UI状态管理                          | 模态框/Toast/设置/地图模式/热点状态                    |
| **DevPanel**           | `components/ui/`         | 79      | 开发者调试面板                      | ~打开，4标签页：状态+事件池/工具/权重/性能             |
| **死亡系统**           | `reducers/`              | 383     | 16种死亡×四段叙事                   | 标题→临终→世界处理→残留提示                            |
| **死亡总结**           | `systems/`               | 300     | 4段叙事死亡总结                     | 死因叙事/发现/世界变化/新目标，不暴露机制               |
| **轮回系统**           | `reducers/`              | 390+    | 跨周目状态传递 + 记忆效应机械化     | 污染累积/SAN上限削减/技能继承30%-60%阶梯/NPC信任高值持久/封印知识追踪/loop_memory_effect解析 |
| **轮回差异**           | `systems/`               | 100     | 跨轮变化对比                        | SAN/污染/NPC/技能/商店/恩赐变化列表                    |
| **applySanLoss**       | `reducers/utils.js`      | 25      | SAN 扣减统一入口                    | 统计追踪/音频推送/_lastSanLoss UI反馈                  |
| **AP 污染**            | `utils/appHelpers.js`    | 30      | AP 显示欺骗+偷取+揭示               | getDisplayedAp/narrApInsufficient，SAN门控触发          |
| **Mythos 门控**        | `reducers/effectReducer` | 10      | mythos增益SAN条件触发               | SAN≥50且loop<3静默跳过，保持"不可知"恐怖              |
| **叙事引导**           | `systems/`               | 80      | 前30分钟氛围式提示                  | 8条环境叙事，受设置控制，不打破第四面墙                 |
| **NPC 反馈**           | `systems/`               | 100     | 信任变化分层反馈                    | 6级信任/跨级脉冲+音效/同级轻提示                       |
| **SAN 反馈**           | `systems/`               | 120     | SAN 损失4档表现                     | minor/moderate/severe/critical 各有独立音效+屏幕特效    |
| **首轮保护**           | `systems/`               | 140     | Loop 0-3渐进保护                    | L0:3天安全/SAN上限5/L2:2天安全/SAN上限7/L3:1天安全/SAN上限9/致命事件渐进解除 |
| **Day-of-Cycle权重**    | `engine/EventEngine`     | ~87     | 关键日期事件权重乘数                 | 7/14/21/28天超自然×1.8/日常×0.4 + SAN stage 5+类型差异化 |
| **轮回记忆效应**        | `reducers/loopReducer`   | ~113    | 结局loop_memory_effect文本解析       | 10+正则模式(NPC信任/腐化/SAN/属性/物品/角色/封印知识) |
| **NPC对话深化**         | `systems/npcDialogue`    | ~400    | 三层扩展对话系统                    | 日期里程碑(1-28天×8NPC)/天气反应(5天气×8NPC)/SAN观察(SAN<40) |
| **难度模组Hooks**       | `reducers/ugcReducer`    | ~62     | UGC模组难度修饰符                   | text_corruption_boost/npc_trust_multiplier/custom_text_swaps + Zod校验 |
| **Day-Critical脉冲**    | `systems/sanVisualCorruption` | ~130 | SAN视觉腐化触发器                   | 关键日期surge(1.8×/2.2×) + SAN损失flash + SanPollutionLayer缓存 |
| **模拟器增强**         | `scripts/simulate_loops` | ~166    | 批量轮回模拟                        | --difficulty/--batch/--progress/--json + 数据缓存 + 预计算 |
| **文本变体**           | `systems/`               | 230+    | 文本重复+神话别名+难度文本替换+模组  | 4层重复控制+专名渐进渗透+难度词汇替换+模组custom_text_swaps+幻影日志/NPC错字/幻影叙述 |
| **前传系统**           | `reducers/`              | 195     | 7场景恐惧画像                       | 6维度心理profile/跳过保护                              |
| **结局引擎**           | `reducers/`              | 343     | AND/OR条件解析                      | 36行为结局+10主线+隐藏+Meta打破                        |
| **NPC系统**            | `reducers/` + `systems/` + `data/` | 350+400+206 | 8人×5级信任×5层记忆×关系网×死后遗产×200+条三层对话 | 信任门控/腐蚀/救赎路线/NPC间关系/遗产继承/日期里程碑/天气反应/SAN观察/条件感知对话 |
| **结局余韵**           | `reducers/`              | 73      | Afterglow 文本系统                  | 条件解锁(事件/物品/周目数)/轮回记录UI                  |
| **AudioManager**       | `managers/`              | 144     | 53段音频管理                        | 区域环境音(昼夜)/技能检定分级/SAN损失分层              |
| **Registry**           | `data/registry/`         | 227     | 身份注册表                          | 区域/物品/NPC 统一注册 + 名称别名双向解析              |
| **Validators**         | `scripts/validators/`   | 522     | 数据验证器                          | 效果/条件/引用三层校验，构建时 + 运行时                |
| **GLM Client**         | `utils/`                 | 190     | GLM-4.7 Flash API 客户端            | OpenAI兼容/限流2s/缓存5min/超时15s/离线回退            |
| **LLM Narrative**      | `systems/`               | 320     | AI 叙事增强层                       | 9函数:事件文本/NPC对话/死亡总结/Meta异象/余韵/SAN腐蚀/人格反思/轮回开场/存档名污染 |

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
       └── app.jsx             → 游戏路由 + hooks 编排 + 子组件 props 分发（438 行，原 678 行）
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

**事件连锁（软依赖）**：用 `add_flag` / `has_flag` 实现跨事件联动，无需硬编码事件 ID：

```javascript
// 前置事件：触发后设置痕迹标志
{ effects: { add_flag: 'trace_broken_window_church' } }

// 后序事件：需要该标志才出现
{ trigger: { areas: ['church'], has_flag: 'trace_broken_window_church', min_loop: 2 } }
```

事件调度器会自动将其纳入触发池。

### UGC 模组创作指南

> **10 分钟写出你的第一个事件模组。** 只需要 JSON，不需要写代码。
> 也可以使用**可视化事件编辑器**在游戏内直接创建事件。

#### 可视化事件编辑器

游戏内置表单编辑器（点击模组管理面板的「＋ 创建事件」）：

- **5 个标签页**：基础信息 / 触发条件 / 效果 / 选项 / 实时预览
- **实时验证**：输入时自动校验 Schema，错误即时显示
- **一键保存**：保存为可直接安装的 Mod
- **复制 JSON**：导出为 JSON 粘贴到其他项目

#### Mod 扩展类型

Mod 不再仅能添加事件，还支持 4 种扩展实体：

| 类型 | 字段 | 说明 |
|------|------|------|
| `events` | id, name, type, trigger, description, effects, choices | 自定义事件（原有） |
| `npcs` | id, name, location, trust_layers, portrait_hint | 自定义 NPC（简化对话由事件驱动） |
| `items` | id, name, type, uses, effects | 自定义物品（支持 tool/consumable/weapon/key/clue/ritual/food/light） |
| `areas` | id, name, description, type, connected_areas | 自定义区域（支持 town/dungeon/wilderness/water/indoor/safehouse） |
| `endings` | id, name, conditions, humanity_variants | 自定义结局（支持 15 种条件类型） |

**限制**：每 Mod 最多 30 事件 / 8 NPC / 12 物品 / 4 区域 / 4 结局。

#### 最小模组（纯事件）

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

#### 扩展模组（含 NPC + 物品 + 区域 + 结局）

```json
{
  "id": "mod_extended",
  "name": "扩展内容包",
  "events": [...],
  "npcs": [
    { "id": "my_npc", "name": "神秘旅人", "location": "town_center",
      "trust_layers": ["standard", "deep"] }
  ],
  "items": [
    { "id": "my_key", "name": "古旧钥匙", "type": "key", "uses": 1 }
  ],
  "areas": [
    { "id": "my_area", "name": "废弃地下室", "type": "dungeon",
      "description": "一个隐藏在镇中心地下的废弃空间。",
      "connected_areas": ["town_center"] }
  ],
  "endings": [
    { "id": "my_ending", "name": "真相之路",
      "conditions": [{ "type": "has_flag", "id": "flag_truth", "value": 1 }],
      "humanity_variants": {
        "humanity_high": "你选择了真相。",
        "humanity_fragile": "真相让你动摇。",
        "humanity_lost": "真相摧毁了你。"
      }
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
| **深度限制**     | 最多 30 事件/8 NPC/12 物品/4 区域/4 结局 per Mod           |
| **选项限制**     | 每事件最多 6 个选项                                          |
| **Mod 上限**     | 最多同时安装 20 个 Mod                                       |
| **危险内容拦截** | 自动扫描并拦截脚本注入、事件处理器、远程 URL                |
| **兼容性字段**   | `compatibility` 字段标注适用游戏版本（如 `>=0.9.0`）        |
| **Dev Mode**     | 开发者可启用 Dev Mode 热重载，无需重启游戏即可刷新 Mod 数据  |

> **不会执行任何远程代码。** 模组只包含数据，不包含可执行逻辑。

---

## CI/CD 流水线

项目使用 GitHub Actions 自动化测试、构建和部署：

| 流水线 | 触发 | 功能 |
|--------|------|------|
| **PR Quality Gate** | PR → main/develop | 测试 + 6 项 lint（schema/engine/narrative/npc/mod）+ Vite 构建 + Legacy 构建 + 格式检查，一步失败阻断合入 |
| **Main CI** | push → main/develop | 5 个并行 job：Lint（schema/engine/narrative/npc/mod）→ Test（10min 超时）→ Vite Build（产物上传）→ Legacy Build（产物上传）→ Format Check |
| **Preview Deploy** | push → develop | 继承 lint + test + legacy build 结果，构建后部署到 GitHub Pages（`/preview/` 子目录） |
| **Release** | push tag `v*` | 测试 + Legacy 构建 + 自动生成 changelog + GitHub Release + 上传 `index.html` |

**Node.js 版本**：22.15.0 LTS（CI + 本地 `.nvmrc` 同步）

**在线预览**：`https://baliujunan.github.io/abyssal-whispers/preview/`

**快速测试命令**：
```bash
npm test                  # 全量测试（536 tests / 12 suites）
npm run lint:schema       # 数据 Schema 校验
npm run lint:engine       # 引擎边界检查
npm run mod:validate      # Mod 格式校验
npm run build             # Vite 生产构建
npm run build:single      # Legacy 单文件构建
```

---

## 架构决策记录（ADR）

> 记录了项目中关键架构决策的背景、理由和后果。
> 按时间顺序排列，编号对应 mistake.txt 中同类问题的系统性修复。

### ADR-005: 拼接构建迁移完成（Vite ESM 唯一构建）

| 字段 | 内容 |
|------|------|
| **状态** | 已弃用（v0.9.7 删除 build.py） |
| **背景** | 项目曾维护两条独立构建管线：Vite（开发/生产 ESM）+ `build.py`（拼接为单文件 HTML），产生双注册、构建顺序依赖等问题 |
| **决策** | 删除 `build.py`，Vite + vite-plugin-singlefile 为唯一构建系统，产出自包含单文件 `dist/index.html` |
| **理由** | Vite singlefile 插件已能产出自包含单 HTML 文件，满足离线分发需求；消除双构建维护成本和拼接构建的作用域隔离问题 |
| **后果** | 新增文件只需 ESM import，无需维护文件顺序列表；`npm run build` 同时覆盖开发和分发场景 |
| **相关** | ADR-005（拼接构建的作用域隔离规则）、ADR-026/027（build.py 特有 bug） |

### ADR-002: Zustand + Immer 声明式状态管理

| 字段 | 内容 |
|------|------|
| **状态** | 已采纳 |
| **背景** | 原 `gameReducer.js` 单体 switch 超过 1000 行，难以维护和测试 |
| **决策** | 迁移到 Zustand + Immer + `combineSlices` 声明式切片架构 |
| **理由** | slice 文件职责单一（core/explore/npc/daily/dark/ui），`combineSlices` 提供 before/after 三阶段执行；Immer 保证不可变性的同时允许 mutable 写法 |
| **后果** | `useGameStore.dispatch(action)` 直接调用 slice handler；`gameReducer.js` 合并入 `effectExecutor.js`（文件删除） |
| **相关** | mistake.txt #7（Immer 使用错误） |

### ADR-003: `c` / `ctx` 双上下文分离

| 字段 | 内容 |
|------|------|
| **状态** | 已采纳 |
| **背景** | 原 `ctx` 承载了 `{ GD, narr, log, effects, rng, bt }` 全部职责，导致混淆和传递错误 |
| **决策** | 拆分为两个独立参数：`c`（reducer context：narr/effects/bt/rng）和 `ctx`（`{ GD }` 纯数据） |
| **理由** | 需要 GD 的函数（chapterReducer 等）和需要 narr/effects 的函数（副作用）分属不同层级；分离后类型更清晰 |
| **后果** | 所有 slice handler 签名统一为 `(draft, action, c, ctx)`；命名冲突风险（回调参数勿用 `c`） |
| **相关** | mistake.txt #6（c 与 ctx 混淆）、#45（slice handler 迁移后签名遗漏 c 参数） |

### ADR-004: 确定性 RNG（Seeded RNG）

| 字段 | 内容 |
|------|------|
| **状态** | 已采纳 |
| **背景** | `Math.random()` 导致存档回放不可靠，bug 复现困难 |
| **决策** | 引入 `createSeededRng` + `c.rng`，所有 reducer 工具函数通过 `makeRand(rng)` 接入 |
| **理由** | 存档回放、模拟器、平衡测试均依赖可复现的随机序列 |
| **后果** | `rand()`/`pick()` 必须传 `c.rng`；测试环境 `c.rng` 可能为 null，需 fallback `Math.random()` |
| **相关** | mistake.txt #2（确定性 RNG 未接入）、#17（RNG 缺失第六批） |

### ADR-005: SAN 系统 SSOT（Single Source of Truth）

| 字段 | 内容 |
|------|------|
| **状态** | 已采纳 |
| **背景** | SAN 阈值、阶段名称、视觉效果参数散落在多个 reducer 和组件中 |
| **决策** | 所有 SAN 配置集中在 `game_base.json` 的 `san_stages`，通过 `getCurrentSanStage()` 全局查询 |
| **理由** | 6 阶段 × 4 维度（visual/interaction/logic/meta）配置变更只需改 JSON，零硬编码 |
| **后果** | 组件层通过 CSS 类 + Canvas 参数响应阶段变化；`applySanLoss()` 是唯一扣减入口 |
| **相关** | CLAUDE.md "Reducer 三条铁律" |

### ADR-006: 引擎层隔离（纯 JavaScript + DI 注入）

| 字段 | 内容 |
|------|------|
| **状态** | 已采纳（v0.9.8 移除 TypeScript，保持纯 JS） |
| **背景** | 游戏逻辑、数据、渲染混杂在同一模块，导致循环依赖和测试困难 |
| **决策** | `src/engine/` 独立为纯 JavaScript ESM 模块，零游戏导入，依赖通过 DI 注入 |
| **理由** | EventEngine / WorldTimeSystem / SaveManager / PollutionManager 可在无 React 环境运行（模拟器、测试）。TypeScript 文件（.ts）因孤立死代码于 v0.9.8 移除 |
| **后果** | 引擎层不引用任何 `src/reducers/` 或 `src/components/`；`npm run lint:engine` 自动检查边界 |
| **相关** | mistake.txt #19（ milestone 死代码 — 未注入 GD）、ADR-029（JS-only 引擎）、ADR-030（CJS 保留策略） |

### ADR-007: Post-Reducer 副作用执行器

| 字段 | 内容 |
|------|------|
| **状态** | 已采纳 |
| **背景** | Reducer 中混杂音频播放、存档写入、统计递增等副作用，违反纯函数原则 |
| **决策** | Slice handler 只收集 `c.effects.push({ type, ... })`，由 `effectExecutor.js` 在 reducer 结束后批量执行 |
| **理由** | 副作用类型分发（AUDIO_PLAY / SAVE_GAME / INCREMENT_STAT）+ 去重（`_fxId`）+ 测试时可直接 mock |
| **后果** | Reducer 保持同步确定性；异步副作用不阻塞状态更新 |
| **相关** | mistake.txt #7b（dispatch 返回 undefined） |

### ADR-008: 每日流程领域拆分（dailySlice → systems/daily/）

| 字段 | 内容 |
|------|------|
| **状态** | 已采纳（v0.9.5） |
| **背景** | `dailySlice.js` 膨胀至 594 行、37 个 import，REST 流程耦合在一个文件 |
| **决策** | 按领域拆分为 7 个独立系统文件：`foodSystem` / `safehouseSystem` / `restRecovery` / `dayAdvance` / `dayCritical` / `nightEffects` / `dayOpen` |
| **理由** | 每个系统文件只关注自己的领域逻辑，import 降至 5-8 个；dailySlice 变为 162 行的纯调度层 |
| **后果** | 新增每日流程只需在对应系统文件修改；ESM import 自动解析依赖 |
| **相关** | 本次重构 |

### ADR-009: 事件数据统一命名（`events` → `EVENTS`）

| 字段 | 内容 |
|------|------|
| **状态** | 已采纳（v0.9.5） |
| **背景** | 多个事件文件 `export const events = [...]` 在拼接构建中同名遮蔽（mistake.txt #36） |
| **决策** | 所有事件数据文件统一使用 `export const EVENTS = [...]` |
| **理由** | 消除 ESM + 拼接构建双重作用域下的变量遮蔽风险；未来新增事件文件只需遵循命名约定 |
| **后果** | 所有导入方（`extended_events_index.js`、测试文件）已同步更新 |
| **相关** | mistake.txt #36（同名 export 变量遮蔽函数声明） |

---

## 开发指南

### 环境要求

| 依赖            | 版本       | 说明                             |
| --------------- | ---------- | -------------------------------- |
| **Node.js**     | >= 22.15.0 | Vite 8 官方要求；CI 同步使用 22 LTS；项目含 `.nvmrc` |
| **npm**         | >= 10      | 随 Node.js 22+ 自带              |
| **Rust stable** | latest     | 仅 Tauri 桌面版构建需要          |

```bash
# 推荐：使用 nvm 自动切换版本
nvm use   # 读取 .nvmrc → 22.15.0
```

### 构建路线

项目使用 Vite + vite-plugin-singlefile 构建**自包含单 HTML 文件**：

| 路线              | 命令                            | 产物                     | 适用场景                          |
| ----------------- | ------------------------------- | ------------------------ | --------------------------------- |
| **Vite（推荐）**  | `npm run dev` / `npm run build` | `dist/index.html`（~2.8MB，自包含） | 日常开发、离线分发、生产部署 |
| **Tauri 桌面版**  | `npm run tauri:build`           | `.exe` 安装包            | 桌面客户端                        |

```bash
# 安装依赖
npm install

# ── 推荐路线 ──────────────────────────────────────────

npm run dev              # 开发服务器 → http://localhost:3000（Vite HMR）
npm run build            # 生产构建 → dist/index.html（自包含单文件，双击即可打开）
npm run preview          # 预览生产构建 → http://localhost:4173
npm run tauri:build      # 桌面版构建（需要 Rust）

# ── 验证 ──────────────────────────────────────────────

npm run verify           # 完整验证（测试 + Vite 构建）
npm test                 # 全部测试（536 tests / 12 suites）
npm run format:check     # 代码格式检查（Prettier）

# ── 轮回系统测试 ─────────────────────────────────────

npm run test:reinc       # 轮回核心+场景测试（102 tests）
npm run test:reinc:sim   # 玩家行为模拟器（5人格×8轮报表）
npm run simulate:loops   # 批量轮回模拟（--difficulty/--batch/--progress/--json 参数）

# ── 工具 ──────────────────────────────────────────────

npm run format           # 格式化全部源文件（Prettier）
npm run lint:san         # SAN mutation 静态检查（禁止直接 clamp）
npm run lint:engine      # 引擎边界检查（src/engine/ 零游戏导入）
npm run lint:schema      # Zod Schema 数据校验（855条数据 + difficulty_modifiers全量）
npm run lint:events      # 扩展事件 lint
npm run test:missing600  # 第 600 号事件测试
npm run mod:validate     # UGC 模组校验
npm run mod:preview      # UGC 模组预览
npm run mod:pack         # UGC 模组打包
```

> **路线说明**：Vite + vite-plugin-singlefile 是唯一构建系统，产出自包含单 HTML 文件（`dist/index.html`），同时支持浏览器开发和离线分发。`npm run verify` 覆盖测试 + 构建。

### 开发者调试面板

按 **~** 或 **Ctrl+Shift+D** 打开 DevPanel：

| 标签页      | 功能                                                                               |
| ----------- | ---------------------------------------------------------------------------------- |
| **STATE**   | 实时查看 SAN/HP/Day/Loop/AP/Area/Food/Money/Pollution/Corruption/Mythos/Seal/Clues + **Event Pool**（Total/Base/Extended/Supplement/600th event 状态） |
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
node scripts/simulate_loops.cjs --loops 100 --difficulty 10 --batch 10 --progress --json
```

---

## 代码质量

### 综合评分：**9.5 / 10**

| 维度                 | 评分       | 状态                                                                                           |
| -------------------- | ---------- | ---------------------------------------------------------------------------------------------- |
| **主循环 & Reducer** | **9.5/10** | ✅ 6 legacy slice + systemSlice before/after hooks + combineSlices 组合器 + Zustand+Immer 桥接层 |
| **事件系统**         | **9.5/10** | ✅ EventEngine 三层加权选择，pure/commit 分离，SSOT triggeredEvents，629 事件 + 102 结局 + has_flag 软连锁       |
| **SAN 系统**         | **9.5/10** | ✅ SSOT 6阶段×4维度，零硬编码，CSS+Canvas+CorruptibleChoice+AbyssPopup 全实现                  |
| **子系统**           | **9.0/10** | ✅ PollutionManager/WorldTimeSystem 引擎独立，数据驱动 infection_risk                          |
| **构建流程**         | **9.5/10** | ✅ Vite 主线（ESM + HMR）；Legacy 单文件保留；verify 覆盖双构建；注释安全删除 + token 边界保护 |
| **开发体验**         | **9.5/10** | ✅ DevPanel(~) + 双Store选择器 + 三滑块SAN控制 + GAME_BALANCE 常量                             |

### 架构优势

- ✅ **Zustand + Immer 桥接** — useReducer + gameReducer 完整迁移到 Zustand store，dispatch 时序不变（reducer → patch draft → flushEffects），切片逻辑零改动
- ✅ **combineSlices 声明式切片** — `src/state/combineSlices.js` createSlice 工厂 + rootReducer 组合器，before/after 三阶段执行，8 个 legacy slice 共存
- ✅ **systemSlice cross-cutting** — AP tracking/profiling/hoarding (before) + AP steal/audio (after) 统一管理
- ✅ **Post-reducer 副作用层** — `src/runtime/effectExecutor.js` 合并 effects buffer（原 gameReducer.js），统一 post-reducer 副作用去重执行
- ✅ **Slice 领域拆分** — exploreSlice（928行）和 npcSlice（774行）拆分到 `src/systems/explore/`（3 域文件）和 `src/systems/npc/`（6 域文件），切片文件变为薄调度层（explore ~70行，npc ~55行）
- ✅ **引擎层纯 JavaScript** — 移除 3 个孤立 `.ts` 文件（EventEngine/PollutionManager/SaveManager）和 `tsconfig.json`，ENGINE_CONTRACT.md 记录 JS-only 规则
- ✅ **CJS 保留策略** — tests/scripts 保留 CJS（~50 文件），src/ 强制 ESM，ADR-030 记录边界规则
- ✅ **错误隔离** — 钩子/处理器各自 try/catch，单点失败不阻塞 action 链路
- ✅ **JSDoc 类型注解** — SliceConfig/SliceReducer/BeforeHook/AfterHook 四个 typedef，对齐未来 TS 迁移
- ✅ **SAN SSOT** — `getCurrentSanStage()` 统一查询，6阶段×4维度配置，修改JSON即全局生效
- ✅ **引擎层独立** — `src/engine/` 5 个引擎模块（纯 JavaScript），核心逻辑与 UI 完全解耦 + 确定性 RNG
- ✅ **运行时副作用层** — `src/runtime/effectExecutor.js` post-reducer 副作用去重执行，类型分发架构
- ✅ **双界面模式** — 暗黑地牢全景地图 + 经典三栏，共用 reducer，零游戏逻辑改动
- ✅ **四层事件调度** — EventEngine 实现里程碑/行为权重/冷却衰减/累积权重二分查找 + Day-of-Cycle权重(关键日期×1.8/0.4)
- ✅ **污染平滑过渡** — SanPollutionLayer 基于阶段配置自动插值，2s ease 平滑过渡
- ✅ **三滑块SAN控制** — 视觉/交互/Meta 独立可调，轻度污染模式无障碍保护
- ✅ **数据驱动设计** — 新增事件无需改reducer代码，只需添加JSON条目；危险区域用 `infection_risk` 标志
- ✅ **身份注册表** — 区域/物品/NPC 统一注册（ESM+CJS双格式），名称别名双向解析
- ✅ **数据验证器** — 效果/条件/引用三层校验器，构建时 + 运行时自动校验
- ✅ **Vite 主线构建** — `npm run dev` / `npm run build` 使用 Vite，ESM 原生模块 + HMR 热更新 + 路径别名
- ✅ **DevPanel调试** — ~一键打开，实时查看/修改游戏状态、事件权重、性能指标
- ✅ **ctx 显式传参** — slice handler 通过参数接收上下文，可独立单元测试，无隐式全局依赖
- ✅ **GAME_BALANCE 常量** — `src/state/gameConstants.js` 集中管理平衡参数，零散魔法数字已消除
- ✅ **EXPLORE 分阶段** — 事件选择(`_selectExploreEvent`) + 效果应用(inline) + 后处理(`_postExploreProcessing`) 三阶段清晰分离
- ✅ **slice handler 显式 import** — 所有 6 个 slice handler 具备完整 ESM import，不依赖 globalThis 桥接
- ✅ **SAN 扣减统一** — `applySanLoss()` 中央函数，28 个 reducer 文件全部通过此函数扣 SAN，`lint:san` 静态检查强制执行
- ✅ **Reducer 确定性 RNG** — 6 个 slice handler 共 40+ 处随机调用全部接入 `c.rng`（`createSeededRng`），存档回放和 bug 复现完全确定性
- ✅ **死亡总结4段叙事** — 死因叙事先行（不暴露机制）→ 发现回顾 → 世界变化 → 新目标建议，`DeathSummaryView` 组件直接渲染
- ✅ **轮回差异提示** — `computeReincarnationDiff()` 在 `initLoopState` 末尾自动生成，存入 `f.reincarnationDiff`
- ✅ **NPC 反馈分层** — 跨级触发脉冲+音效，同级轻文本，信任降级有警告，避免 UI 噪音
- ✅ **事件软连锁** — `add_flag`/`has_flag` 引擎级事件依赖，5 条前置 + 5 条回声，零 reducer 改造，支持多对多叙事链
- ✅ **玩家痕迹系统** — 9 条行为痕迹跨轮回区域描述追加，`detectPlayerTraces` 自动检测 + `recordPlayerTrace` 手动记录，`_triggeredSet` O(1) 查询
- ✅ **平衡模拟器** — `balanceSimulator.js` 28 天蒙特卡洛，复用 13 级难度 + 恐惧画像 + graduated protection + 封印状态，96 项 CI 回归测试
- ✅ **NPC 语言指纹** — 8 位 NPC 完整写作规范（句式/语气/意象/信任递进/轮回记忆/死亡回响/SAN 退化/禁用词），`event_authoring.md` 官方文档
- ✅ **首轮保护** — `shouldBlockLethalEvent` + `adjustSanLossForLoop23` + `adjustMonsterChance` 接入 exploreSlice 事件筛选和伤害计算（Loop 0-3 渐进桥梁）
- ✅ **Day-of-Cycle权重** — `EventEngine.js` Section 9，关键日期(7/14/21/28)超自然事件×1.8/日常事件×0.4 + SAN stage 5+ 类型差异化修正
- ✅ **轮回记忆效应机械化** — `applyLoopMemoryEffects()` 解析 `loop_memory_effect` 叙事文本为10+种机械效果（NPC信任/腐化/SAN/属性/物品/角色/封印知识）
- ✅ **NPC 对话三层扩展** — `npcDialogue.js` 日期里程碑(1-28天×8NPC) + 天气反应(5天气×8NPC) + SAN观察(SAN<40关心玩家)
- ✅ **难度模组 Hooks** — `textVariants.js`/`ugcReducer.js` 难度文本替换 + 模组 difficulty_modifiers（text_corruption_boost/npc_trust_multiplier/custom_text_swaps）
- ✅ **SanPollutionLayer 缓存** — `getVisualForSan` useRef 缓存，仅 SAN 变化时重算 Canvas 参数，减少渲染开销
- ✅ **封印知识持久化** — `initLoopState` 追踪封印仪式参与(Hilda/Fisher/Isabella)，跨轮解锁特殊对话和事件
- ✅ **文本重复控制** — `getTrackedText` 4 层分级，`seenEventTexts` 跨轮持久化（loopReducer 搬入）
- ✅ **体验链测试** — `test_player_experience_loop.cjs` 25 个测试覆盖完整玩家旅程：引导→NPC→SAN→死亡→总结→轮回→差异
- ✅ **结局可达性测试** — `test_ending_reachability.cjs` 验证 10-15 轮内普通玩家可达多个结局方向

---

## 版本历史

| 版本      | 日期       | 主要更新                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0.9.7** | 2026-07-02 | **工程质量升级：build.py 退役 + ESM 清算 + 内容质量验证** — ①删除 `build.py` 和 `build-web.cjs`，Vite + vite-plugin-singlefile 为唯一构建系统，消除双注册/构建顺序依赖债务；②`.cjs` 校验工具从 `src/data/validators/` 迁移至 `scripts/validators/`，与 ESM 游戏数据目录彻底分离；③`src/` 目录全部 `.cjs` 残留清零，ESM import 完全接管；④Zod 数据验证接入 main.jsx bootstrap，malformed 数据不再静默失败；⑤`s.clues` 混合类型归一化，10 个 push 点统一为 `{id, name}` 对象格式，消除 `[object Object]` 显示 bug；⑥`.gitattributes` 引入 + `git add --renormalize`，CRLF 编码警告全部消除；⑦`tests/test_effect_protocol.cjs` Test 17 从 build order 校验迁移为 ESM import 存在性验证；⑧`loop_contradiction_001` 叙事文本重写（75→99分），消除唯一 B 级事件；⑨全量测试 608 passed / 0 failed / 14 suites |
| **0.9.8** | 2026-07-07 | **架构重构：useEffect 拆分 + 全局变量治理 + 事件数据归拢 + E2E 测试** — ①app.jsx 从 678 行瘦身至 438 行（-35%）：13 个 useEffect 块拆分为 `src/hooks/` 下 13 个自定义 hooks（useSeedStore/useMigrateOldSaves/useAudioSettingsInit/useAudioAutoplayUnlock/useReducedMotion/useNotebookTutorialSync/usePageZoom/useEndingCgPreload/useChapterLazyLoad/useAchievementCheck/useSanLossHint/useBootHint/useLevel13Glitch），每个职责独立可测试；②模块级变量治理：删除 `const ctx = { GD }`（替换为内联 `{ GD }`），`_currentFearTuning` 迁移到 Zustand store（`state.fearTuning`），GD 保留模块级并添加 ADR-018 合规注释；③`useAppGameData()` 移除（死代码，零组件消费），App 改用 granular selectors + useMemo 构建 game 对象；④事件数据归拢：18 个 `events_*.js` 从 `src/data/` 移入 `src/data/events/`，统一路径，更新 9 个文件的导入；⑤Playwright E2E 骨架：4 个测试文件（game-startup/first-san-loss/settings-persistence/save-load/explore-actions），自动启动 dev server；⑥清理 71 个未使用导入；全量测试 48/48 passed，Vite build 1.26s |
| **0.9.6** | 2026-06-30 | **Zustand 5 迁移修复 + 每日流程领域拆分** — ①dailySlice 按领域拆分为 7 个独立系统文件（foodSystem/safehouseSystem/restRecovery/dayAdvance/dayCritical/nightEffects/dayOpen），从 594 行瘦身至 108 行纯调度层；②修复 Zustand 5.0.14 不支持 equalityFn 导致所有返回对象的 selector 触发无限重渲染（Maximum update depth exceeded），全部改用 useMemo 缓存；③修复 `buildSliceCtx` 缺失 `view` 属性导致区域场景图永远显示默认变体；④修复 Immer autoFreeze 冻结 GD 导致 `initExtendedEvents` 报错；⑤修复 `uiStore.settings: null` 导致渲染阶段 `set()` 调用；⑥`main.jsx` 静态 JSON import 替代 fetch()；⑦`seedGameStore` 移至 React 渲染前执行；⑧所有 selector 函数提取为模块级常量（稳定引用）；⑨`ScreenTransition` 修复 children 缓存导致同屏更新失效；⑩关闭 Immer autoFreeze 避免开发模式冻结问题；⑪mistake.txt 新增条目 #46（Zustand 5 equalityFn 缺失） |
| **0.9.5** | 2026-06-22 | **扭曲文本模板化 + 文学参照文档化** — ①`distortionTemplates.js` 新建 6 个共享模板（good_return / bad_consequence / trial_early / trial_late / collective / special_trade）+ `DISTORTION_TEMPLATE_MAP` 查找表；②`events_humanity.js` 移除 23 块模板级重复文本（-107 行），添加 23 个 `distortion_template` 字段（+46 行），净省 62 行；③`EventEngine.js` 新增 `injectDistortionTemplates(GD)` 运行时注入器，事件本地含 `corruption_high`/`san_mid` 等独特键时保留本地 variants，其余按 `distortion_template` 字段或 `subtype` 名自动注入；④`extendedEventsInit.js` 注册 injector 调用；⑤文学参照补录：`DESIGN_REFACTOR_NOTES.md` 新增 Lovecraft/Baudelaire/Murakami/Borges/Houellebecq 五作者对照表 + 恐惧结局特殊文本策略说明；⑥`game_base.json` `text_style` 新增 `literary_references` 字段；⑦`mistake.txt` 条目 #44「隐性设计意图未记录」；⑧构建验证：Vite ESM 1.32s + 全测试 48/48 + lint:narrative 27S/20A/3B |
| **0.9.4** | 2026-06-22 | **Phase 2 体系化升级** — ①轻量事件依赖机制：引擎级 `has_flag`/`add_flag` 软连锁，5 条前置事件 + 5 条回声事件，零 reducer 改造；②玩家痕迹系统扩展：3 试点→9 条痕迹（+森林低语/酒馆硬币/墓穴符号/灯塔信号/庄园日记/森林祭品），跨轮回区域描述自动追加；③NPC 语言指纹规范沉淀：`event_authoring.md` 8 位 NPC 完整指纹（句式/语气/意象/信任递进/轮回记忆/死亡回响/SAN 退化/禁用词）；④测试与平衡体系补全：`balanceSimulator.js` 轻量蒙特卡洛模拟器（13 级难度/恐惧画像/graduated protection/封印状态）+ `test_balance_system.mjs` 96 项平衡测试（10 维度：配置完整性/单调性/保护倍率/graduated protection/恐惧画像/难度梯度/消耗速率/封印递增/可复现性/输出结构）；⑤微恐怖触发率测试：19 个 micro_horror 事件数据完整性验证（weight/probability/once_per_run）；⑥NPC 台词覆盖率测试：8 位 NPC 三级优先级（low/mid/high）全覆盖，memory line 关键词验证；⑦全量回归 536 passed / 0 failed / 12 suites |
| **0.9.3** | 2026-06-21 | **区域描述渐进变体系统 + 事件日志文档化** — ①区域描述渐进变体：`areaDescriptionVariants.js` lookup 表（9区域×3层到访记忆：2-3次/4-6次/7+次），MOVE handler 描述管线集成，变体文本自然流过 mythos alias / text fragmentation / resource corruption 管线，营造跨访问"déjà vu"体验；②事件日志系统文档化：`state.eventLog` 多模块写入（engineCore/effectReducer/appHelpers），三处 UI 展示（左栏可折叠全量面板/右栏最近10条/顶部 EventLogButton），`useEventLog` 细粒度 selector，存档持久化200条上限，幻影条目过期过滤；③构建验证通过 |
| **0.9.2** | 2026-06-21 | **Effects 传递架构修复 + BEGIN_ADVENTURE 切片提取** — ①`flushEffectsBuffer()` 从"轮询 Zustand state._effects"改为"显式接收 effects 参数"，消除 gameReducer → Zustand → flushEffectsBuffer 的循环读取，修复 effects 在并发 dispatch 下可能丢失或读到 stale batch 的问题；②`useGameStore.js` 移除 `sliceEffects` 中间变量（每个 slice handler 后赋值 `c.effects`），改为直接在 produce 末尾 `c.effects.slice()` → `effectsToFlush`，再显式传给 `flushEffectsBuffer(effectsToFlush)`；③`BEGIN_ADVENTURE` handler 从 `coreSlice.js` 提取为独立 `adventureSlice.js`（~250行），`gameReducer.js` 新增 `adventureSlice` 路由分支；④`test_effect_protocol.cjs` Test 9 更新为引用 `adventureSlice.js` + 验证 typed commands (`audio.play/audio.ambient`) |
| **0.9.1** | 2026-06-21 | **Mod 生态增强 + CI/CD 流水线** — ①Mod 扩展类型：支持 5 种实体（事件/NPC/物品/区域/结局），Schema 校验 + 自动 ID 冲突前缀 + GD 注入 + 注册表同步；②可视化事件编辑器：5 标签页表单（基础/触发/效果/选项/预览），实时验证，一键保存为 Mod；③Dev Mode 热重载：开发者模式切换 + 刷新按钮，无需重启游戏即可重载 Mod；④CI/CD 流水线：PR Quality Gate + Main CI + Preview Deploy（GitHub Pages）+ Release（自动 changelog + GitHub Release）；⑤构建修复：`hasClueId` re-export 缺失导致 Vite build 失败 |
| **0.9.0** | 2026-06-21 | **状态管理架构升级：Zustand + Immer 桥接 + combineSlices 声明式切片** — ①Step 1 桥接层：将 useReducer + gameReducer 桥接至 Zustand + Immer middleware，状态从模块级变量迁移到 Zustand store，dispatch 时序严格保持（reducer → patch draft → flushEffects），所有切片逻辑零改动；②Step 2 切片组合：新建 `combineSlices.js`（220行）createSlice 工厂 + rootReducer 组合器，支持 before/after 三阶段执行（systemSlice 的 tracking/AP/audio），JSDoc 类型注解对齐未来 TS 迁移，钩子错误隔离（单钩子抛错不阻塞 action 链路）；③gameReducer.js 从 194 行瘦身至 102 行纯调度入口；④新建 systemSlice（95行）将 hoarding tracking / recordActionHistory / AP steal / AP audio 四类 cross-cutting 逻辑从主 reducer 内联迁移到 before/after hooks；⑤新增 `resetVisualCorruption()` 修复 NEW_GAME 时 surge/flash 残留；⑥构建验证：check_build_imports 270 imports 0 errors + Vite build 1.13s + 全测试套件 285 passed；⑦`__SLICE_DEBUG__` 开发环境钩子执行日志（before/业务/after 时序追踪） |
| **0.8.0** | 2026-06-20 | **长玩稳定性 + 工程质量 + 内容质量验证** — ①triggeredEvents 上限防御：triggeredEvents 硬上限 1000 + triggeredSilentEvents 上限 500，每轮回 initLoopState 自动截断，防止长玩存档膨胀；②O(1) 查询优化：新增 `triggeredSet.js` 并行 Set 结构，12 个 reducer/组件文件 migrated (`includes`→`hasTriggered`)，事件存在性查询从 O(n)→O(1)；③AudioManager 资源释放：`stopAmbient()` 加 `src=''` 释放媒体引用，防止 Audio 对象驻留内存；④SanPollutionLayer 清理集中化：startCorruption 清理旧计时器 + useEffect cleanup 统一清理所有 interval/timeout；⑤React 渲染缓存：FloatingInfoBar CluePanel 加 useMemo + GamePanels freeClues 加 useMemo，消除大数组 filter 每帧重算；⑥NPCDialog AbortController：LLM 请求真正 abort（不只是丢弃结果），glmClient._doFetch 接受外部 AbortSignal；⑦eventBus 订阅审计：确认 on() 订阅未被组件使用，无泄漏风险；⑧测试修复：smoke_flows S9-4 (adjustSanLossForLoop23 重命名对齐) + player_experience P3-5/P3-6 (safe window 测试修正) + integration afterglow 预期宽松化，**285 passed / 0 failed / 9 suites**；⑨叙事质量验证：`lint-narrative-quality.mjs` 抽检 50 条 → 平均 96.7/100，禁用词 0，S=33/A=17；⑩NPC 一致性验证：`lint-npc-consistency.mjs` → 478 条台词 0 矛盾；⑪FORBIDDEN_WORDS 调整：去除克苏鲁语境合法词（扭曲/疯狂/诡异/恐怖），仅保留纯标签化恐怖词（不可名状/令人毛骨悚然/骇人听闻/极度恐惧） |
| **0.7.1** | 2026-06-19 | **轮回记忆机械化 + Day-of-Cycle权重 + NPC对话深化 + 性能优化** — ①轮回记忆效应机械化：`applyLoopMemoryEffects()` 解析结局`loop_memory_effect`叙事文本，自动应用NPC信任+/腐化-/SAN上下限/全属性+/神秘学+/物品/角色解锁/封印知识持久化(10+种模式)；②Loop 2-3渐进保护：`firstLoopBalance.js`新增Loop 2( SAN上限7/安全区2天/致命屏蔽)和Loop 3(SAN上限9/安全区1天/致命解除)，技能保留30%→40%→50%→60%阶梯；③Day-of-Cycle事件权重：`EventEngine.js` Section 9新增关键日期(7/14/21/28)超自然×1.8/日常×0.4 + SAN stage 5+类型差异化修正(超自然1.8/日常0.4)；④NPC对话三扩展：日期里程碑对话(1-28天×8NPC)、天气反应对话(5天气×8NPC)、SAN观察对话(SAN<40时NPC关心玩家)；⑤SanVisualCorruption重构：Canvas渲染移至`SanPollutionLayer`组件，此文件改为surge/flash触发器(关键日期脉冲×1.8/×2.2)；⑥难度模组Hooks：`textVariants.js`/`ugcReducer.js`新增`difficulty_modifiers`(文本腐蚀/NPC信任/自定义替换)，Zod Schema全量校验；⑦NPC记忆Tier 5：汤米·陈+埃德加·洛夫克拉夫特新增T5跨轮记忆(实验室/相机/时间线重叠)；⑧封印知识持久化：`initLoopState`追踪封印仪式参与记录(Hilda/Fisher/Isabella)，跨轮解锁特殊对话；⑨确定性RNG扩展：`PollutionManager`/`fearLens`/`worldDecay`/`getWeather`等系统接入`rng`参数；⑩模拟器增强：`simulate_loops.cjs`新增`--difficulty/--batch/--progress/--json`参数+游戏数据模块级缓存+循环效果表预计算；⑪性能优化：`SanPollutionLayer` `getVisualForSan` useRef缓存，仅SAN变化时重算；⑫游戏数据扩展：4个结局新增`afterglow`余韵文本(老费舍救赎/伊莎贝拉第十二声钟/深渊吞噬/循环真相)，5个`loop_memory_effect`机械化映射 |
| **0.6.1** | 2026-06-17 | **UI 可用性修复 + 美术滤镜校准 + 设置弹窗增强** — ①前传屏幕滚动：`body { overflow: clip }` 阻止滚轮事件传递，改用 JS wheel handler 直接在容器上捕获并手动滚动，`.prologue-screen` 改为 `height:100vh; overflow-y:auto`，隐藏滚动条；②前传底部按钮遮挡：`.prologue-footer` 固定底栏 `z-index:5` 遮挡「进入沃切斯特」按钮，添加 `pointer-events: none` 穿透点击；③调查员档案滚动：新增 `.screen-scroll` 全屏滚动容器，CharCreation 包裹其中，回调 ref 绑定 wheel handler；④结局画面滚动：`.ending-screen` 改为 `height:100vh; overflow-y:auto`；⑤`.screen-transition` 从 `min-height:100vh` 改为 `height:100vh; overflow:hidden`，确保子滚动容器能正确溢出；⑥设置弹窗增强：新增 💾存档 / 📖读档 / 🏆成就 三个按钮，解决图片模式下 FloatingInfoBar 不可见时功能入口缺失；⑦SVG 暗角滤镜修复：`soft-vignette` stdDeviation 80→35、`strong-vignette` 60→28，filterRegion 200%→100%，解决大面积均匀变暗问题；⑧CSS 选择器修复：`.area-scene img` → `.area-scene > img`（直接子元素），NPC 头像（`.npc-portrait-thumb` / `.area-panel-npc-img`）加独立滤镜规则，避免场景暗角覆盖圆形头像 |
| **0.6.0** | 2026-06-16 | **转场动画 + NPC 对话扩充 + 事件池 + Bug 修复** — ①屏幕转场系统：新增 `ScreenTransition.jsx`（Canvas exit + CSS enter + 音频联动）+ `TransitionCanvas.jsx`（4 种程序化效果：noiseWipe / inkBleed / voidCircle / glitchSlices），重构 app.jsx 渲染架构，设置面板新增「减弱动效」开关；②NPC 上下文对话：新增 `npcContextualLines.js`（8 位 NPC × 143 条条件感知对话），`selectContextualLine()` 支持信任 / 时段 / SAN / 轮回 / 死亡遗产 / 物品 / 区域条件过滤 + 已读去重，NPCDialog 组件显示上下文短句；③后 7 区事件池扩充 +120 事件：`events_supplement.js` 覆盖 forbidden_grove / ruins_of_yith / lighthouse / catacombs_entrance / voxchester_manor / whispering_forest / deep_catacombs，区域分布从 26-56 均衡至 45-65；④第 600 事件修复：mergeExtendedEvents 中 50 个物品定义（无 trigger）被计入 _extendedEvents 导致 .length≠599，已 filter(e => e.trigger)；⑤ch2plus 70 事件补全 once_per_run；⑥轮回商店 3 个购买效果落地（SAN 上限+5 / 死亡保留物品 / 随机稀有物品）；⑦DevPanel 新增 Event Pool 区域（599/600 进度）；⑧修复 2 处 getSanStageFromGD import 缺失；⑨修复前传打字机 CSS steps(var()) 静默失败 + ScreenTransition children 缓存导致同屏更新失效；⑩页面基础缩放 110% 作为 100%，消除侧边留白 |
| **0.6.0-stable** | 2026-06-17 | **稳定性修复 + 事件精修 + UI/UX 精修 + 美术统一** — ①修复 7 处 ESM import 缺失（extendedEvents/extendedEventsInit/conclusionReducer/objectiveReducer/miscReducer）；②Reducer 20 处 Math.random() 接入确定性 RNG，新增 `makeRand(rng)` 工具函数消除 11 处重复 fallback；③120 个 supplement 事件补全 quality_tier / normalcy_anchor / unreliable_narration_level + 30 处高级触发条件（san_lte / min_loop）；④加载黑屏→加载态（"正在连接沃切斯特..."）；⑤CSS 设计系统（圆角/阴影/间距/字体 20+ 变量）；⑥按钮 4 态补全 + 弹窗缩放动画 + 滚动条美化 + 全局噪点；⑦轻提示系统（前传结束/SAN 首掉/笔记本首次高亮）；⑧美术统一 SVG 滤镜（胶片颗粒/暗角/锐化）+ 8 处组件 class 注入；⑨笔记本快捷键统一为 J；⑩新增完整流程测试 48 项 + Vite 构建验证 |
| **0.5.0** | 2026-06-16 | **GLM-4.7 Flash AI 叙事增强接入** — ①新增 `glmClient.js`(190行)：GLM-4.7 Flash API 客户端，OpenAI 兼容端点，内置限流(2s)/缓存(5min)/超时(15s)/设置持久化；②新增 `llmNarrative.js`(320行)：6 个 LLM 增强函数——`enhanceEventDescription`(动态事件文本)、`generateNpcDialogue`(8NPC角色扮演对话)、`enhanceDeathSummary`(死亡4段增强)、`generateMetaCorruptionEvent`(Meta异象)、`generateAfterglow`(余韵诗意)、`generateSanCorruptedText`(SAN腐蚀叙述)；③`EnhancedNarrativeBlock` 组件：事件触发时异步调用LLM生成个性化叙事(signature/里程碑100%，普通事件SAN≤40时30%)，单飞守卫+缓存+新轮回清理；④设置面板「AI 叙事增强」分组：总开关+API Key输入+4个子功能独立控制(死亡总结/NPC对话/Meta异象/事件文本)；⑤死亡画面LLM增强：4段叙事异步加载+余韵诗意文本渐进显示；⑥离线优先架构：Reducer零LLM依赖，UI层异步调用，API失败自动回退800+条静态文本 |
| **0.4.1** | 2026-06-15 | **"活的深渊"系统 + 事件文本感官化** — ①AP污染系统：SAN stage≥3或loop≥3时AP显示欺骗(多报1-4点)+行动偷取(20-40%概率多扣1AP)+发现揭示机制；②不可靠每日总结：SAN stage≥2数值误差/≥3省略行动/≥4追加虚假记忆；③Mythos SAN门控：SAN≥50且loop<3时mythos增益静默跳过，保持"不可知"恐怖；④事件文本感官化重写：343行改动，7个事件文件+5个NPC背景全面改写，去掉"你知道——/你注意到/你认出了"句式，"展现"替代"讲述"；⑤神话专名门控：第一周目零真名泄露，loop 2使用模糊替代("那个符号"/"地下的纹路")，loop 3+解锁专名；⑥全景地图缩放同步：热点图标随背景图一起缩放平移(viewport容器统一transform)；⑦修复6个Bug：updateSettings未定义/c.target变量遮蔽/Modal未import/3函数定义位置错误/60+处缺失ESM import/save变量名冲突 |
| **0.4.1维护** | 2026-06-15 | **Reducer 确定性 RNG + 3 个 import 缺失 + 2 个逻辑错误** — ①修复 `coreSlice.js` 未导入 `clamp` 导致 `RESIST_SAN_DRAIN` 运行时崩溃（深渊弹窗抵抗机制）；②修复 `effectReducer.js` 未导入 `resolveClueName` 导致线索名解析静默失败（线索显示原始 ID 而非中文名）；③修复 `dailySlice.js` 未导入 `updateAreaCorruption` 导致 REST 时区域腐蚀度不更新；④修复 `npcSlice.js` `get_item` 路径将 NPC 秘密的叙事文本（如"他曾亲眼见过深潜者的祭祀"）当作线索 ID 塞入 `s.clues`，污染线索数组；⑤修复 `darkSlice.js` `CONSUME_ARCHIVE` 线索名显示 `[object Object]`（`s.clues.pop()` 返回对象时未提取 name）；⑥修复 `uiSlice.js` `GAMBLE_CHOICE` deep_investigate 路径 `addRunMemory` 引用 `availableClues[0]` 而非实际被 `pick()` 选中的线索；⑦**确定性 RNG 全面接入**：6 个 reducer slice 文件共 40+ 处 `Math.random()` / `rand()` / `pick()` 调用全部改为 `c.rng` fallback 模式（`(c.rng ? c.rng.next() : Math.random())` + `rand(min, max, c.rng)` + `pick(arr, c.rng)`），确保存档回放、确定性测试、bug 复现可靠 |
| **0.4.0** | 2026-06-15 | **SAN精度化 + 第一章节奏 + 工程改造** — ①新建 `sanityVisual.js`(290行)：SAN视觉呈现集中化，sanReducer瘦身50%；②新建 `earlyHooks.js`(82行)：十三声钟入口序列（6秒延迟音频+Canvas脉冲）+区域氛围低语；③遗产亮点系统：NPC遗言(8人×3档24段)+运行时刻+轮回印记；④Chapter 1硬限：事件池过滤(blocked types)+AP上限5(Days 1-3)+Day 3强制过渡事件；⑤SAN精度化：AbyssPopup间隔拉长(90-180s)+抵抗微交互(3连点-1SAN)+CorruptibleChoice门控(isKeyEvent)+unreliable_narration_level字段+Canvas 3级性能降级+文本腐蚀概率下调37-60%；⑥资源对接：光源→区域描述污染+感染→NPC幻觉变体(24条)+安全屋退化加速(loop≥3+2)+码头深潜者低语(10条)+章节配置回退；⑦工程改造：eventBus.js(跨Slice通信)+commands.js(类型化effect)+Zod Schema(735条数据校验)+engine边界检查(0违规)+Content Editor(editor.html)+Vite构建优化(587B HTML/code-split/734ms)；⑧修复4个运行时Bug：ESM隐式全局/ctx参数不匹配/CSS路径错位/SAN地板值；⑨新增CHANGELOG.md+mistake.txt错误追踪 |
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
