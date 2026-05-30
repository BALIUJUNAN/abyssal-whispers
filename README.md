# 深渊低语：沃切斯特之影

*Abyssal Whispers: Shadow of Voxchester*

<div align="center">

<img src="docs/dossier.png" alt="沃切斯特档案" style="max-width:860px; border:1px solid #333; box-shadow: 0 4px 24px rgba(0,0,0,0.5);">

![License](https://img.shields.io/badge/License-CC_BY--NC--ND_4.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20Browser-lightgrey)
![Build](https://img.shields.io/badge/build-2.00MB-green)
![Version](https://img.shields.io/badge/version-0.1.0-orange)

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
| **独立事件** | 400+ 个 — 探索 / 人性 / 超自然 / NPC / 区域深层 / Meta / 资源 |
| **行为结局** | **36 条** — 由你的选择模式触发，非预设分支 |
| **主线 + 隐藏结局** | 11+ 条 — 含打破第四面墙的 Meta 结局 |
| **死亡类型** | 16 种 — 7 种物理死亡 + 8 种精神死亡 + 1 种混合 |
| **NPC** | 7 位核心 × 5 级信任 × 4 层跨轮记忆 |
| **可探索区域** | 9 个 — 从镇中心到深渊墓穴，危险度递进 |
| **物品** | 79 种 — 全部有效果，含 2 家可购买商店 |
| **事件链 / 线索链** | 多条 — 顺序推进的多阶段调查链 |
| **音频素材** | 53 段 (WAV + MP3) — 覆盖环境音乐 / 音效 / 中文语音 |
| **成就** | 21 个 — 进程 / 结局 / 挑战 / 隐藏四大类 |
| **存档槽位** | 6 个 — 3 自动轮转 + 3 手动管理，JSON 导入导出 |
| **图片素材** | 210 张 WebP — 含 72 张独立结局 CG |
| **前传系统** | 7 场景线性叙事 — 构建你的恐惧画像 |

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

| 时间节点 | 事件 |
|----------|------|
| Day 1 | 钟声开始异常 |
| Day 7 | 核心 NPC 出现腐化征兆 |
| Day 14 | 深潜者大潮登陆 |
| Day 21 | 全城疯狂之夜 |
| Day 28 | **封印破碎 —— 最终决战** |

每次轮回更难：SAN 上限削减 3 点，世界污染加深，NPC 逐步识别你是重复访客。

### 7 种起始职业

记者 / 渔夫 / 学者 / 军医 / 侦探 / 牧师 / 流亡者

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
| **ErrorBoundary** | 渲染崩溃时显示友好错误页面，一键重新加载 |

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
React 18 (production, 内联) + useReducer 全状态驱动
  → 模块化 Reducer 体系（24 个领域 reducer）
  → {GD} Context 单例（游戏数据全局访问）
  → JSON 配置驱动（事件/结局/效果/NPC/商店 全部数据化）
  → Babel JSX 编译 → 单文件构建产物 index.html (~2.0MB, 完全离线)
  → Tauri v2 打包 → 原生桌面应用 (~10MB)
```

### 项目结构（重构后）

```
COC/
├── index.html              # 构建产物（~2.0MB，可直接运行）
├── build.py                # Python 构建脚本（Babel JSX 编译 + 产物合并）
├── check_build.cjs         # 构建产物自动验证（10 项检查，PASS/FAIL）
├── dev-server.cjs          # 开发服务器（含 SPA fallback）
├── build-web.cjs           # Tauri 打包前端资源复制
├── package.json            # Node.js 依赖 (@babel/cli, @babel/preset-react)
│
├── assets/webp/            # 210 张 WebP 图片素材（138 场景 + 72 结局 CG）
├── audio/                  # 53 个音频文件 (47 WAV + 6 MP3)
│
├── src/
│   ├── app.jsx             # 主逻辑 + gameReducer + 核心 UI 组件 (~2997 行)
│   ├── styles.css          # 完整样式表（81KB，档案纸张美学）
│   ├── game_data.json      # 核心游戏数据（593KB，世界设定/规则/NPC/区域）
│   ├── portraitMap.js      # 立绘/场景/结局CG 图片路径映射
│   │
│   ├── components/         # 提取出的 UI 组件
│   │   ├── ErrorBoundary.jsx     # React 错误边界（防白屏崩溃）
│   │   ├── TitleScreen.jsx        # 标题画面
│   │   ├── AppToast.jsx           # 成就/通知吐司
│   │   └── UgcImportExport.jsx    # UGC 模组管理面板
│   │
│   ├── managers/
│   │   └── AudioManager.js       # 音频系统（53 段音频路径 + 播放逻辑）
│   │
│   ├── state/
│   │   └── initialState.js      # 初始状态定义（behaviorTracking 分组嵌套）
│   │
│   ├── utils/
│   │   ├── clueNameMap.js        # 线索 ID → 中文名映射（惰性求值）
│   │   ├── gameHelpers.js        # 游戏工具函数集
│   │   └── buildEventPool.js     # 事件池构建
│   │
│   ├── data/
│   │   ├── descriptionTemplates.js  # DRY 描述模板常量
│   │   ├── events_*.js              # 12 个事件数据模块（400+ 事件）
│   │   ├── prologue_events.js      # 前传 7 场景事件
│   │   ├── behavior_endings.js     # 36 种行为结局
│   │   └── game_data.json           # 世界设定总汇
│   │
│   ├── reducers/               # 24 个 useReducer 状态管理模块
│   │   ├── utils.js / worldReducer.js / sanReducer.js
│   │   ├── eventReducer.js / effectReducer.js / saveReducer.js
│   │   ├── loopReducer.js          # 轮回系统（14步初始化 + 数组截断保护）
│   │   ├── prologueReducer.js      # 前传（含 SkipPrologue 保护）
│   │   ├── deathSystem.js          # 死亡系统（16 种 × 四段叙事）
│   │   ├── endingReducer.js        # 结局判定引擎（AND/OR/NOT 解析器）
│   │   └── extendedEvents*.js      # V2 扩展事件调度系统
│   │
│   ├── systems/
│   │   ├── fearProfile.js         # 恐惧画像生成（6维 × 7风格）
│   │   └── fearLens.js            # 恐惧滤镜（影响文本变体）
│   │
│   └── vendor/
│       ├── react.production.min.js
│       ├── react-dom.production.min.js
│       └── babel.min.js             # 开发模式 fallback
│
├── src-tauri/              # Tauri v2 桌面应用配置
│   ├── tauri.conf.json      # 窗口/CSP/打包设置
│   ├── capabilities/       # 权限声明
│   ├── icons/              # 应用图标（多尺寸）
│   └── src/                # Tauri 后端 (Rust)
│
└── docs/
    └── dossier.png         # README 头图
```

### 核心模块一览

| 模块 | 职责 | 关键特性 |
|------|------|---------|
| **V2 事件调度器** | 30+ 触发条件筛选 | min_loop/max_loop/once_per_run/权重/probability |
| **死亡系统** | 16 种死亡 × 四段叙事 | 标题→临终→世界处理→残留提示 |
| **SAN 系统** | 5 阶段认知崩溃 | 文字变异/UI对抗/第四面墙破裂 |
| **轮回系统** | 跨周目状态传递 | 污染累积/SAN上限削减/技能继承30%/NPC记忆渐进 |
| **前传系统** | 7 场景恐惧画像 | 6维度心理profile/跳过保护(多周目兼容) |
| **结局引擎** | AND/OR/ 条件解析 | 36行为结局+主线+隐藏+Meta打破 |
| **NPC 系统** | 7人×5级信任×4层记忆 | 信任门控/腐蚀/救赎路线 |
| **存档系统** | 6槽位+版本迁移 | P0-P5字段过滤/旧格式兼容 |
| **UGC 系统** | 自定义事件导入 | Schema校验/IndexedDB存储 |
| **AudioManager** | 53段音频管理 | 区域环境音(昼夜)/技能检定分级/SAN损失分层 |

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

# 构建 HTML（浏览器版）
python build.py

# 验证构建产物
node check_build.cjs

# 启动开发服务器
node dev-server.cjs
# 访问 http://localhost:1420

# 构建桌面版（需要 Rust）
npm run tauri build
```

### 构建验证

`check_build.cjs` 自动检查 10 项关键指标：

```
$ node check_build.cjs
  ✅ index.html 大小 — 2.00 MB
  ✅ const GD= — 出现 1 次
  ✅ ErrorBoundary — 出现 6 次
  ✅ getClueNameMap — 出现 2 次
  ✅ audioManager — 出现 74 次
  ✅ initialState — 出现 9 次
  ✅ gameReducer — 出现 2 次
  ✅ import 残留 — 未发现
  ✅ export 残留 — 未发现
  PASS: 10   FAIL: 0

$ node check_build.cjs --dist   # 额外检查 dist/ 目录结构
```

---

## 版本历史

| 版本 | 日期 | 主要更新 |
|------|------|---------|
| **0.1.0** | 2026-05 | Tauri 桌面版打包；模块化重构(app.jsx 4600→2997行)；CLUE_NAME_MAP惰性修复；DESC时序修复；ErrorBoundary；循环数组截断；SkipPrologue保护；dev-server SPA fallback；DRY描述模板；构建自检脚本 |
| **v1.2** | 2026-05 | 线索中文名解析；存档多槽位+版本迁移；UGC模组系统；成就系统21个；Meta叙事事件 |
| **v1.1** | 2026-04 | V2事件调度器扩展；死亡四段叙事；轮回污染系统；前传恐惧画像；中文语音台词 |
| **v1.0** | 2026-03 | 首次发布；核心游戏循环；9区域探索；7NPC；SAN五阶段UI腐败 |

---

<div align="center">

*THE WHISPER BELOW*

*在深渊的低语被听见之前，没人知道沃切斯特曾经存在过。*

</div>
