# 深渊低语：沃切斯特之影

_Abyssal Whispers: Shadow of Voxchester_

<div align="center">

<img src="docs/dossier.png" alt="沃切斯特档案" style="max-width:860px; border:1px solid #333; box-shadow: 0 4px 24px rgba(0,0,0,0.5);">

![CI](https://github.com/BALIUJUNAN/abyssal-whispers/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/badge/License-CC_BY--NC--ND_4.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20Browser-lightgrey)
![Build](https://img.shields.io/badge/build-py_%2B_Vite_dual-green)
![Tests](https://img.shields.io/badge/tests-285_flow_%2B_events_%2B_difficulty-brightgreen)
![Version](https://img.shields.io/badge/version-0.7.1-orange)

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
| **独立事件**   | **855+ 个**（599 扩展事件 + 120 补充事件 + 90 ch2plus + 20 基础 + 17 死亡回声 + 3 预兆） + 102 结局，全部含 quality_tier / trigger 条件 |
| **行为结局**   | **36 条** — 由你的选择模式触发，非预设分支                                                                                  |
| **主线结局**   | **10 条** — 封印守护者 / 希尔达抉择 / 老费舍血脉 / 第十二声钟 / 海上逃离 / 证据逃离 / 异端黎明 / 深渊吞噬 / 超越 / 循环真相 |
| **结局余韵**   | 每条结局附带可解锁的 Afterglow 文本（条件触发）                                                                             |
| **死亡类型**   | 16 种 — 7 种物理死亡 + 8 种精神死亡 + 1 种混合                                                                              |
| **NPC**        | **8 位** × 5 级信任 × 4 层跨轮记忆 × 关系网 × 死后遗产 × **40+ 条上下文对话**（信任/时段/SAN/轮回/死亡遗产变体）             |
| **可探索区域** | 9 个 — 从镇中心到深渊墓穴，危险度递进（45-265 事件/区域）                                                                    |
| **物品**       | 79 种 — 全部有效果，含 2 家可购买商店 + 轮回商店 6 件永久商品                                                                |
| **事件链**     | 7 条 — 码头暗流 / 森林深处 / 庄园迷踪 / 墓穴惊魂 / 伊斯之谜 / 灯塔真相 / 城市暗流                                           |
| **音频素材**   | 53 段 (WAV + MP3) — 覆盖环境音乐 / 音效 / 中文语音                                                                          |
| **成就**       | 20 个 — 进程 / 结局 / 挑战 / 隐藏四大类                                                                                     |
| **存档槽位**   | 6 个 — 3 自动轮转 + 3 手动管理，JSON 导入导出                                                                               |
| **图片素材**   | 141 张 WebP — 含 72 张独立结局 CG + 3 张镇中心专用场景图                                                                     |
| **前传系统**   | 7 场景线性叙事 — 构建你的恐惧画像 + 打字机效果                                                                               |
| **SAN 系统**   | 6 阶段 × 4 维度（视觉/交互/逻辑/Meta）完整污染定义，SAN视觉精度化（稀疏恐怖，非噪声）+ AP 污染 + 不可靠总结 + Mythos 门控    |
| **布局模式**   | 2 种 — 暗黑地牢风格全景地图 / 经典三栏面板                                                                                  |
| **转场动画**   | **Canvas 程序化转场** — 噪声擦拭 / 墨汁渗透 / 虚空之环 / 故障切片 4 种效果 + 主题音效联动 + 可关闭                          |
| **AI 叙事增强**| GLM-4.7 Flash — 9 个场景动态生成，离线优先                                                                   |
| **代码规模**   | 45,000+ 行 JS/JSX — 114+ 个源文件                                                                                           |
| **数据校验**   | Zod Schema 855条数据全量校验                                                                                                 |
| **引擎边界**   | src/engine/ 零游戏导入，6个独立模块，`npm run lint:engine` 自动检查                                                           |
| **测试覆盖**   | 完整流程测试 48 项（19 组）+ 事件 lint 69 项 + 拼接/Vite 双构建验证                                                          |

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
| **Mythos SAN门控**        | SAN≥50且loop<3时mythos增益静默跳过——知识"滑过"意识，保持"不可知"恐怖                               |
| **事件文本感官化**        | 800+事件全面改写：去掉"你知道——"句式，"展现"替代"讲述"，感官细节替代概念说明                       |
| **神话专名门控**          | 第一周目零真名泄露；loop 2 使用模糊替代（"那个符号""地下的纹路"）；loop 3+ 才解锁专名              |
| **Meta 事件后果**         | 存档覆盖 / NPC 信任锁定 / NPC 永久失踪 / 对话分支删除                                               |
| **数据验证**              | 效果/条件/引用三层校验器（CJS），运行时自动校验游戏数据完整性                                       |
| **身份注册表**            | 区域/物品/NPC 统一注册表（双格式 ESM+CJS），支持名称别名解析                                        |
| **效果执行器**            | 独立 post-reducer 副作用层（音频/存档/统计），去重 + 类型分发                                       |
| **无障碍支持**            | 轻度污染模式 / 减少动画 / 高对比度 / 字号放大 / 闪烁控制 / prefers-reduced-motion                   |
| **UGC 模组**              | 支持导入自定义事件 JSON（Schema 校验）                                                              |
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
| **难度模组 Hooks**        | UGC 模组可注入 `difficulty_modifiers`(text_corruption_boost/npc_trust_multiplier/custom_text_swaps)，Zod Schema 全量校验                |
| **NPC 记忆 Tier 5**       | 汤米·陈 + 埃德加·洛夫克拉夫特新增 Tier 5 跨轮记忆(实验室/相机记忆/时间线重叠)，8 NPC 全部覆盖到 T5                              |
| **模拟器性能增强**        | `simulate_loops.cjs` 新增 --difficulty/--batch/--progress/--json 参数，游戏数据模块级缓存，循环效果表预计算                               |
| **SanPollutionLayer 缓存**| `getVisualForSan` 结果 useRef 缓存，仅 SAN 变化时重算，减少 Canvas 渲染开销                                                           |
| **第 600 事件**           | 隐藏终局事件 — loop≥10 + mythos≥25 + san≤10 + 5+结局 + 终局内容 → 599→600 虚拟事件自动显现         |

---

## 在线体验

🔗 **[GitHub Pages 在线版](https://baliujunan.github.io/abyssal-whispers/)** — 浏览器直接打开即可游玩

> 推荐使用 Chrome / Edge 以获得最佳音频体验。移动端同样适配。

### 21级难度系统

游戏提供 **21级难度梯度**，从休闲体验到原汁原味的克苏鲁恐怖：

| 区间 | 级别 | 存活率 | 平均天数 | 目标玩家 |
|------|------|--------|----------|----------|
| **基础** | Level 1-3 | 25-8% | 20-14天 | 新手/标准玩家 |
| **进阶** | Level 4-9 | 20-6% | 19-13天 | 进阶玩家 |
| **硬核** | Level 10-15 | 5-2% | 12-8天 | 硬核玩家 |
| **极限** | Level 16-21 | 2-3% | 10-8天 | 受苦爱好者 |

**难度特性**：
- **Level 1 (普通)**: SAN/HP损失减少65%，前6天安全区
- **Level 3 (噩梦)**: SAN/HP损失减少35%，前4天安全区
- **Level 12 (专家)**: SAN/HP损失减少15%，前2天安全区
- **Level 21 (v1原版)**: 无任何保护，原始难度

**保护机制**：
- **SAN保护**: 根据难度级别减少SAN损失
- **HP保护**: 根据难度级别减少HP损失
- **安全区**: 低难度前几天禁止访问高危险区域
- **损失上限**: 限制单次/每日最大损失

**测试数据** (基于1000+次模拟)：
```
Level  1: 存活率 23.5%, 平均 20.05天
Level  3: 存活率 5.0%, 平均 13.40天
Level  6: 存活率 2.5%, 平均 11.57天
Level 12: 存活率 1.5%, 平均 8.96天
Level 21: 存活率 1.0%, 平均 7.94天
```

**使用方法**：
```bash
# 运行难度测试
node scripts/sim28balance_final.cjs --difficulty normal --runs 1000 --seed 42

# 测试所有难度
for level in 1 3 6 9 12 15 18 21; do
  node scripts/sim28balance_21levels.cjs --level $level --runs 500 --seed 42
done
```

**集成代码**：
```javascript
import { DIFFICULTY_LEVELS, getDifficultyConfig } from './config/difficulty.js';
import { applyDifficultyToState, applyDifficultyProtection } from './state/difficultyState.js';

// 应用难度到游戏状态
const stateWithDifficulty = applyDifficultyToState(initialState, difficultyLevel);

// 在处理SAN损失时
const protectedLoss = applyDifficultyProtection(baseLoss, day, state);
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
React 18 + useReducer + Immer + 双 Store (useGameStore + useUiStore)
  → 引擎层 (src/engine/) — 独立npm包，零游戏导入，DI注入
  │    EventEngine / PollutionManager / WorldTimeSystem / SaveManager
  │    commands.js (类型化effect工厂) / eventBus.js (跨Slice通信)
  │    EventEngine Section 9: Day-of-Cycle权重(关键日期超自然×1.8/日常×0.4)
  → 运行时层 (src/runtime/) — post-reducer 副作用执行器（类型分发+去重）
  → 模块化 Reducer（6个slice handler + ctx显式传参）
  │    loopReducer: applyLoopMemoryEffects() 结局记忆效应机械化 + 封印知识持久化
  │    exploreSlice: Loop 2-3 渐进保护 (adjustSanLossForLoop23/getSanFloor)
  → AP 污染系统 — SAN门控AP欺骗+偷取+揭示（utils/appHelpers.js）
  → Mythos SAN 门控 — SAN≥50时mythos增益静默跳过（reducers/effectReducer.js）
  → SAN视觉系统 (systems/sanityVisual.js + sanVisualCorruption.js) — 精度化恐怖 + Day-Critical脉冲
  → 早期钩子 (systems/earlyHooks.js) — 十三声钟入口序列 + Canvas脉冲
  → SAN SSOT — getCurrentSanStage() 统一查询，6阶段×4维度
  → AI 叙事增强 (utils/glmClient.js + systems/llmNarrative.js)
  │    GLM-4.7 Flash — 9 场景动态生成，离线优先，UI层异步，Reducer零侵入
  → NPC对话深化 (systems/npcDialogue.js) — 日期里程碑/天气反应/SAN观察三层扩展
  → 难度系统 (state/difficultyState.js + config/difficulty.js) — 21级梯度 + 模组Hooks
  → 首轮保护 (systems/firstLoopBalance.js) — Loop 2-3渐进桥梁 (SAN上限/安全区/致命屏蔽)
  → JSON 配置驱动 + Zod Schema 校验（855条数据全量 + difficulty_modifiers校验）
  → 章节硬限（Chapter 1 事件池过滤 + AP压限 + Day 3强制过渡）
  → Vite 主线构建（ESM + code-split + 587字节HTML）→ dist/
  → Tauri v2 打包 → 原生桌面应用
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
├── src/                      # 21,000+ 行 JS/JSX，106+ 个源文件
│   ├── config/               # 集中化配置
│   │   ├── difficulty.js         # 21级难度 DIFFICULTY_LEVELS 配置
│   │   └── difficultyLevels.json # 难度参数 JSON（安全区/SAN保护/HP保护/损失上限）
│   │
│   ├── app.jsx               # 主入口（368 行 — 路由 + 双Store桥接 + 布局切换）
│   ├── main.vite.jsx         # Vite 入口（加载 shim + 游戏数据 + 启动 app）
│   ├── main.jsx              # Legacy 构建入口（Babel 环境）
│   ├── vite-compat-shim.jsx  # Vite 兼容层（54 模块 globalThis 桥接）
│   ├── styles.css            # 样式表（1,483 行）— 含 SAN 腐化动画 + 地图模式样式
│   ├── portraitMap.js        # 图片路径映射（379 行，ESM export）
│   ├── index.template.html   # Legacy 构建模板（__INLINE_CSS__ / __INLINE_JS__ 占位符）
│   │
│   ├── engine/               # 6 个引擎模块（1,077 行）— 独立npm包，零游戏导入
│   │   ├── EventEngine.js          # 统一三层加权事件选择（465 行）
│   │   ├── PollutionManager.js     # SAN+逻辑+视觉污染（161 行，DI注入getStage）
│   │   ├── WorldTimeSystem.js      # 世界状态/封印/天气（86 行，纯引擎）
│   │   ├── SaveManager.js          # 存档系统+版本迁移（224 行，DI注入migration）
│   │   ├── commands.js             # 类型化effect命令工厂（68 行）
│   │   ├── eventBus.js             # 跨Slice类型化事件总线（73 行）
│   │   └── ENGINE_CONTRACT.md      # 引擎边界规则文档
│   │
│   ├── runtime/              # 运行时副作用层
│   │   └── effectExecutor.js       # post-reducer 副作用执行器（45 行）
│   │                               #   AUDIO_PLAY / SAVE_GAME / INCREMENT_STAT 等
│   │                               #   按 _fxId 去重，类型分发（EFFECT_HANDLERS map）
│   │
│   ├── state/                # 6 个状态模块 — 双 Store 架构 + 难度状态 + 平衡常量
│   │   ├── gameStore.js            # useGameStore + 选择器钩子（90 行）
│   │   ├── uiStore.js              # useUiStore（模态/Toast/设置/地图模式状态）（89 行）
│   │   ├── initialState.js         # 游戏初始状态定义（72 行）
│   │   ├── gameConstants.js        # GAME_BALANCE 集中化平衡常量（40 行）
│   │   ├── difficultyState.js      # 21级难度 applyDifficultyToState（~60 行）
│   │   └── transientKeys.js        # 临时状态键定义（23 行）
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
│   │   └── UgcImportExport.jsx     # UGC 模组导入导出（466 行）
│   │
│   ├── reducers/             # 21 个状态管理模块（5,500+ 行）
│   │   ├── slices/                 # 6 个 slice handler（ctx 显式传参）
│   │   │   ├── coreSlice.js        # START_GAME / NEW_GAME / CONTINUE_GAME（115 行）
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
│   │   ├── textVariants.js         # 文本重复控制 — 4层污染变体 + 难度文本替换（~230 行）
│   │   ├── llmNarrative.js         # AI 叙事增强层（~320 行）— 9个LLM增强函数（事件/NPC/死亡/Meta/余韵/SAN腐蚀/人格反思/轮回开场/存档名污染）
│   │   └── gameSettings.js         # 设置系统 — 无障碍+音量+视觉+LLM控制（~110 行）
│   │
│   ├── utils/                # 9 个工具模块（1,600+ 行）
│   │   ├── appHelpers.js           # 游戏核心辅助函数（274 行）
│   │   ├── errorTracker.js         # 操作追踪 & 错误报告（337 行）
│   │   ├── buildEventPool.js       # 事件池构建（130 行）
│   │   ├── gameHelpers.js          # 游戏辅助工具（122 行）
│   │   ├── trustGates.js           # NPC 信任门控（171 行）
│   │   ├── npcMemory.js            # NPC 跨轮记忆（~130 行）— Tier 5新增(汤米·陈/洛夫克拉夫特)
│   │   ├── clueNameMap.js          # 线索中文名映射（47 行）
│   │   ├── glmClient.js            # GLM-4.7 Flash API 客户端（~190 行）— 限流/缓存/超时/设置持久化
│   │   └── uiStore.js              # 旧 UI Store 兼容层（77 行）
│   │
│   ├── data/                 # 38+ 个数据文件 — 855+ 事件 + 结局余韵 + loop_memory_effect
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
│   │   ├── events_supplement.js    # 后7区补充事件（120 个，56KB）
│   │   ├── npcContextualLines.js   # NPC 上下文对话（143 条，8 NPC × 7 类型）
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
│   │   │   ── Zod Schema 验证 ──
│   │   ├── schemas/
│   │   │   └── index.js            # Zod Schema 定义（260 行）— Event/NPC/Area/Item 全量校验
│   │   │
│   │   ├── milestones.js           # 章节里程碑 + 强制叙事钩子（102 行）
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
├── tests/                    # 9 个测试文件（285 tests）
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
│   ├── simulate_loops.cjs          # 轮回批量模拟器（--loops/--difficulty/--batch/--progress/--json）
│   ├── lint_san_mutations.cjs      # SAN mutation 静态检查（禁止直接 clamp）
│   ├── lint_engine_boundary.cjs    # 引擎边界检查（零游戏导入）
│   ├── validate_data.cjs           # Zod Schema 数据校验 CLI
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
| **EventEngine**        | `engine/`                | 373+    | 三层加权 + Day-of-Cycle权重         | 行为画像/冷却衰减/缓冲执行/恐惧权重/关键日期超自然×1.8 |
| **PollutionManager**   | `engine/`                | 98      | SAN+逻辑+视觉污染                   | 文本幻觉/虚假消息/虚假记忆/权重腐蚀 + 确定性RNG        |
| **WorldTimeSystem**    | `engine/`                | 97      | 世界状态/封印/天气                  | 5阶段封印状态机/区域名称扭曲/安全屋退化 + 确定性RNG    |
| **SaveManager**        | `engine/`                | 190     | 存档系统+版本迁移                   | 6槽位/字段过滤/旧格式兼容/JSON导入导出                 |
| **effectExecutor**     | `runtime/`               | 45      | post-reducer 副作用                 | EFFECT_HANDLERS 类型分发 / \_fxId 去重                 |
| **SAN SSOT**           | `state/` + JSON          | —       | 统一SAN阶段配置                     | `getCurrentSanStage()` 全局查询，6阶段×4维度，零硬编码 |
| **SanPollutionLayer**  | `components/`            | 194     | 6阶段渐进腐化 + Day-Critical脉冲    | CSS动画+Canvas渲染+useRef缓存+CorruptibleChoice+AbyssPopup |
| **GameLayout**         | `components/`            | 90      | 布局模式切换                        | 全景地图/经典模式双入口，M键切换                       |
| **InteractiveTownMap** | `components/`            | 339     | 全景城镇地图                        | 暗黑地牢风格/9热点/hover光晕/污染变体背景              |
| **FloatingInfoBar**    | `components/`            | 140     | 浮动 HUD                            | 位置/时间/SAN/HP/AP/封印/天气全状态                    |
| **AreaPanelModal**     | `components/`            | 303     | 热点功能面板                        | 行动/NPC对话/区域信息三标签页                          |
| **useGameStore**       | `state/`                 | 90      | 游戏状态桥接                        | useSan/useDay/useHp/usePollution 等选择器钩子          |
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
| **Validators**         | `data/validators/`       | 522     | 数据验证器                          | 效果/条件/引用三层校验，构建时 + 运行时                |
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

| 路线              | 命令                            | 产物                     | 适用场景                          |
| ----------------- | ------------------------------- | ------------------------ | --------------------------------- |
| **Vite（推荐）**  | `npm run dev` / `npm run build` | `dist/` 587B HTML + 分块  | 日常开发、生产部署                |
| **Legacy 单文件** | `npm run build:single`          | `index.html` (~1.8MB)    | 离线分发（保留，非主线）          |
| **Tauri 桌面版**  | `npm run tauri:build`           | `.exe` 安装包            | 桌面客户端                        |

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
npm test                 # 全部测试（285 tests / 9 suites）
npm run format:check     # 代码格式检查（Prettier）

# ── 轮回系统测试 ─────────────────────────────────────

npm run test:reinc       # 轮回核心+场景测试（102 tests）
npm run test:reinc:sim   # 玩家行为模拟器（5人格×8轮报表）
npm run simulate:loops   # 批量轮回模拟（--difficulty/--batch/--progress/--json 参数）

# ── Legacy 路线（兼容保留，不推荐新开发使用） ─────────

npm run build:single     # Python 单文件构建 → index.html
npm run dev:legacy       # Legacy 开发模式（跳过 Babel）
python build.py --analyze # 包体积分析

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

> **路线说明**：Vite 是当前主线，提供 ESM 原生模块 + HMR 热更新 + 路径别名。
> Legacy 单文件构建通过 `build.py` 保留，用于 GitHub Pages 部署和离线分发场景。
> `npm run verify` 同时覆盖两条路线，确保不退化。

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

### 综合评分：**9.4 / 10**

| 维度                 | 评分       | 状态                                                                                           |
| -------------------- | ---------- | ---------------------------------------------------------------------------------------------- |
| **主循环 & Reducer** | **9.5/10** | ✅ 6 slice handler + ctx 显式传参 + 引擎层独立 + 双Store架构                                   |
| **事件系统**         | **9.5/10** | ✅ EventEngine 三层加权选择，pure/commit 分离，SSOT triggeredEvents，855 事件 + 102 结局       |
| **SAN 系统**         | **9.5/10** | ✅ SSOT 6阶段×4维度，零硬编码，CSS+Canvas+CorruptibleChoice+AbyssPopup 全实现                  |
| **子系统**           | **9.0/10** | ✅ PollutionManager/WorldTimeSystem 引擎独立，数据驱动 infection_risk                          |
| **构建流程**         | **9.5/10** | ✅ Vite 主线（ESM + HMR）；Legacy 单文件保留；verify 覆盖双构建；注释安全删除 + token 边界保护 |
| **开发体验**         | **9.5/10** | ✅ DevPanel(~) + 双Store选择器 + 三滑块SAN控制 + GAME_BALANCE 常量                             |

### 架构优势

- ✅ **SAN SSOT** — `getCurrentSanStage()` 统一查询，6阶段×4维度配置，修改JSON即全局生效
- ✅ **引擎层独立** — `src/engine/` 4个引擎模块（758行），核心逻辑与UI完全解耦 + 确定性RNG
- ✅ **运行时副作用层** — `src/runtime/effectExecutor.js` post-reducer 副作用去重执行，类型分发架构
- ✅ **双Store架构** — `useGameStore`（游戏状态选择器）+ `useUiStore`（UI状态 + 地图模式）
- ✅ **双界面模式** — 暗黑地牢全景地图 + 经典三栏，共用 reducer，零游戏逻辑改动
- ✅ **模块化彻底** — app.jsx 346行（原 4600 行），提取 18 个独立组件（含 ScreenTransition + TransitionCanvas）
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
- ✅ **首轮保护** — `shouldBlockLethalEvent` + `adjustSanLossForFirstLoop` + `adjustSanLossForLoop23` 接入 exploreSlice 事件筛选和伤害计算（Loop 0-3 渐进桥梁）
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
| **0.7.0** | 2026-06-17 | **21级难度系统 + 平衡性测试框架** — ①新增21级难度梯度：从Level 1(普通,SAN/HP损失-65%,前6天安全区)到Level 21(原版无保护)，覆盖休闲→标准→进阶→硬核→极限五个区间；②难度保护机制：SAN保护/HP保护/安全区/损失上限四维防护，`getDifficultyConfig()` 统一配置；③平衡性测试框架：`sim28balance_21levels.cjs` 支持单级/全级批量模拟(1000+次)，输出存活率/平均天数/死因分布；④集成代码：`difficulty.js`(配置) + `difficultyState.js`(状态应用) + `applyDifficultyProtection()`(运行时防护)；⑤测试数据：Level 1存活率23.5%/20天 → Level 21存活率1.0%/7.9天，符合预期递减曲线；⑥确定性RNG全面接入：6个slice handler 40+处`Math.random()`改为`c.rng`fallback模式，新增`makeRand(rng)`工具函数；⑦ctx参数传递完善：`applyDeathResolution`/`narrDailySummary`/`rollMadness`等核心函数添加游戏数据上下文；⑧构建顺序修复：`miscReducer.js`移至`effectReducer.js`之后加载；⑨饥饿伤害接入首轮保护：`adjustStarvationDamage()`减少低难度前期饥饿惩罚 |
| **0.7.1** | 2026-06-19 | **轮回记忆机械化 + Day-of-Cycle权重 + NPC对话深化 + 性能优化** — ①轮回记忆效应机械化：`applyLoopMemoryEffects()` 解析结局`loop_memory_effect`叙事文本，自动应用NPC信任+/腐化-/SAN上下限/全属性+/神秘学+/物品/角色解锁/封印知识持久化(10+种模式)；②Loop 2-3渐进保护：`firstLoopBalance.js`新增Loop 2( SAN上限7/安全区2天/致命屏蔽)和Loop 3(SAN上限9/安全区1天/致命解除)，技能保留30%→40%→50%→60%阶梯；③Day-of-Cycle事件权重：`EventEngine.js` Section 9新增关键日期(7/14/21/28)超自然×1.8/日常×0.4 + SAN stage 5+类型差异化修正(超自然1.8/日常0.4)；④NPC对话三扩展：日期里程碑对话(1-28天×8NPC)、天气反应对话(5天气×8NPC)、SAN观察对话(SAN<40时NPC关心玩家)；⑤SanVisualCorruption重构：Canvas渲染移至`SanPollutionLayer`组件，此文件改为surge/flash触发器(关键日期脉冲×1.8/×2.2)；⑥难度模组Hooks：`textVariants.js`/`ugcReducer.js`新增`difficulty_modifiers`(文本腐蚀/NPC信任/自定义替换)，Zod Schema全量校验；⑦NPC记忆Tier 5：汤米·陈+埃德加·洛夫克拉夫特新增T5跨轮记忆(实验室/相机/时间线重叠)；⑧封印知识持久化：`initLoopState`追踪封印仪式参与记录(Hilda/Fisher/Isabella)，跨轮解锁特殊对话；⑨确定性RNG扩展：`PollutionManager`/`fearLens`/`worldDecay`/`getWeather`等系统接入`rng`参数；⑩模拟器增强：`simulate_loops.cjs`新增`--difficulty/--batch/--progress/--json`参数+游戏数据模块级缓存+循环效果表预计算；⑪性能优化：`SanPollutionLayer` `getVisualForSan` useRef缓存，仅SAN变化时重算；⑫游戏数据扩展：4个结局新增`afterglow`余韵文本(老费舍救赎/伊莎贝拉第十二声钟/深渊吞噬/循环真相)，5个`loop_memory_effect`机械化映射 |
| **0.6.1** | 2026-06-17 | **UI 可用性修复 + 美术滤镜校准 + 设置弹窗增强** — ①前传屏幕滚动：`body { overflow: clip }` 阻止滚轮事件传递，改用 JS wheel handler 直接在容器上捕获并手动滚动，`.prologue-screen` 改为 `height:100vh; overflow-y:auto`，隐藏滚动条；②前传底部按钮遮挡：`.prologue-footer` 固定底栏 `z-index:5` 遮挡「进入沃切斯特」按钮，添加 `pointer-events: none` 穿透点击；③调查员档案滚动：新增 `.screen-scroll` 全屏滚动容器，CharCreation 包裹其中，回调 ref 绑定 wheel handler；④结局画面滚动：`.ending-screen` 改为 `height:100vh; overflow-y:auto`；⑤`.screen-transition` 从 `min-height:100vh` 改为 `height:100vh; overflow:hidden`，确保子滚动容器能正确溢出；⑥设置弹窗增强：新增 💾存档 / 📖读档 / 🏆成就 三个按钮，解决图片模式下 FloatingInfoBar 不可见时功能入口缺失；⑦SVG 暗角滤镜修复：`soft-vignette` stdDeviation 80→35、`strong-vignette` 60→28，filterRegion 200%→100%，解决大面积均匀变暗问题；⑧CSS 选择器修复：`.area-scene img` → `.area-scene > img`（直接子元素），NPC 头像（`.npc-portrait-thumb` / `.area-panel-npc-img`）加独立滤镜规则，避免场景暗角覆盖圆形头像 |
| **0.6.0** | 2026-06-16 | **转场动画 + NPC 对话扩充 + 事件池 + Bug 修复** — ①屏幕转场系统：新增 `ScreenTransition.jsx`（Canvas exit + CSS enter + 音频联动）+ `TransitionCanvas.jsx`（4 种程序化效果：noiseWipe / inkBleed / voidCircle / glitchSlices），重构 app.jsx 渲染架构，设置面板新增「减弱动效」开关；②NPC 上下文对话：新增 `npcContextualLines.js`（8 位 NPC × 143 条条件感知对话），`selectContextualLine()` 支持信任 / 时段 / SAN / 轮回 / 死亡遗产 / 物品 / 区域条件过滤 + 已读去重，NPCDialog 组件显示上下文短句；③后 7 区事件池扩充 +120 事件：`events_supplement.js` 覆盖 forbidden_grove / ruins_of_yith / lighthouse / catacombs_entrance / voxchester_manor / whispering_forest / deep_catacombs，区域分布从 26-56 均衡至 45-65；④第 600 事件修复：mergeExtendedEvents 中 50 个物品定义（无 trigger）被计入 _extendedEvents 导致 .length≠599，已 filter(e => e.trigger)；⑤ch2plus 70 事件补全 once_per_run；⑥轮回商店 3 个购买效果落地（SAN 上限+5 / 死亡保留物品 / 随机稀有物品）；⑦DevPanel 新增 Event Pool 区域（599/600 进度）；⑧修复 2 处 getSanStageFromGD import 缺失；⑨修复前传打字机 CSS steps(var()) 静默失败 + ScreenTransition children 缓存导致同屏更新失效；⑩页面基础缩放 110% 作为 100%，消除侧边留白 |
| **0.6.0-stable** | 2026-06-17 | **稳定性修复 + 事件精修 + UI/UX 精修 + 美术统一** — ①修复 7 处 ESM import 缺失（extendedEvents/extendedEventsInit/conclusionReducer/objectiveReducer/miscReducer）；②Reducer 20 处 Math.random() 接入确定性 RNG，新增 `makeRand(rng)` 工具函数消除 11 处重复 fallback；③120 个 supplement 事件补全 quality_tier / normalcy_anchor / unreliable_narration_level + 30 处高级触发条件（san_lte / min_loop）；④加载黑屏→加载态（"正在连接沃切斯特..."）；⑤CSS 设计系统（圆角/阴影/间距/字体 20+ 变量）；⑥按钮 4 态补全 + 弹窗缩放动画 + 滚动条美化 + 全局噪点；⑦轻提示系统（前传结束/SAN 首掉/笔记本首次高亮）；⑧美术统一 SVG 滤镜（胶片颗粒/暗角/锐化）+ 8 处组件 class 注入；⑨笔记本快捷键统一为 J；⑩新增完整流程测试 48 项 + 拼接/Vite 双构建验证 |
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
