# 深渊低语：沃切斯特之影

_Abyssal Whispers: Shadow of Voxchester_

<div align="center">

<img src="docs/dossier.png" alt="沃切斯特档案" style="max-width:860px; border:1px solid #333; box-shadow: 0 4px 24px rgba(0,0,0,0.5);">

![CI](https://github.com/BALIUJUNAN/abyssal-whispers/actions/workflows/ci.yml/badge.svg)
[![Code License](https://img.shields.io/badge/Code-MIT-green.svg)](LICENSE)
[![Assets / Content License](https://img.shields.io/badge/Assets%20%2F%20Content-CC%20BY--NC--ND%204.0-blue.svg)](LICENSE-ASSETS.md)
![Platform](<https://img.shields.io/badge/platform-Browser%20%7C%20Windows%20(NSIS)-lightgrey>)
![Version](https://img.shields.io/badge/version-0.9.8-orange)

[在线版发布地址](https://baliujunan.github.io/abyssal-whispers/) · [快速开始](#快速开始) · [项目状态](#项目状态) · [许可证](#许可证)

**“第十三声钟响的那天晚上，我没有离开沃切斯特。”**

</div>

## 项目简介

《深渊低语：沃切斯特之影》是一款浏览器优先的克苏鲁风格文字 Roguelite 调查游戏。玩家在探索、对话、资源管理、SAN 变化、死亡与轮回之间推进剧情。项目包含全景地图与经典三栏两种界面、事件与线索系统、多槽位存档、NPC 关系、音频反馈、无障碍选项和可选的 GLM 叙事增强。

本仓库采用清晰的双许可证：程序代码开放为 MIT；剧情、美术、音频及其他创意内容不随代码自动开放商用，详见[许可证](#许可证)。

## 项目状态

下列数字来自当前 `v0.9.8` 工作区中的文件、配置或项目检查器，不代表用户量、下载量或生产采用情况。

| 项目        | 当前可验证状态                                                                                                         |
| ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| 版本        | `0.9.8`（`package.json`、Tauri 配置和最近标签一致）                                                                    |
| 事件注册表  | 917 个注册项；由 `npm run analyze:events -- --section coverage` 报告，包含基础事件、扩展事件、行为结局和元事件等类别   |
| 基础数据    | 20 个基础事件、8 个 NPC、9 个区域、79 个物品；由 `npm run lint:schema` 校验                                            |
| 图片        | 213 张受 Git 跟踪的 WebP：`assets/webp/` 141 张，`assets/webp_ending/` 72 张                                           |
| 音频        | `audio/` 中 77 个受 Git 跟踪的 WAV/MP3 文件；运行时资源表注册 79 个路径                                                |
| Node 测试   | 19 个套件，805 项通过、0 项失败                                                                                        |
| 浏览器测试  | Playwright 收集 6 个规格文件、19 项测试                                                                                |
| `src/` 规模 | `src/` 中有 212 个受 Git 跟踪的 JS/JSX 文件，共 74,384 个物理行；其中 `src/data/` 含大量叙事数据，不等同于纯程序代码量 |

这些计数会随开发变化。重新核对时应以相应命令的当前输出为准，而不是只更新徽章或手工数字。

## 快速开始

### 环境要求

- Node.js `>=20.19.0`
- npm
- Rust stable（仅构建 Tauri 桌面版时需要；项目声明的最低 Rust 版本为 1.77.2）

### 浏览器开发与构建

```bash
npm ci
npm run dev       # http://localhost:3000
npm run build     # 生成完整 dist/ 目录
npm run preview   # http://localhost:4173
```

`vite-plugin-singlefile` 会内联应用 JS、CSS 和静态导入的数据，但图片与音频仍是外部文件。发布或离线分发时必须保留完整 `dist/`，不能只复制 `dist/index.html`。构建会把代码、内容和第三方告知文件一起放入 `dist/`。

开发服务器还提供内容编辑器路由：`http://localhost:3000/editor`。

### Windows 桌面构建

```bash
npm ci
npm run tauri:build
```

当前 `src-tauri/tauri.conf.json` 的 bundle target 是 `nsis`，因此仓库配置直接支持 Windows NSIS 安装包。README 不承诺固定安装包文件名、体积或 macOS/Linux 产物；这些都应以实际构建输出为准。

## 核心玩法与功能

- 探索、调查、对话、技能检定、战斗、商店和资源管理组成的日常循环
- HP/SAN 死亡与跨轮回状态、记忆、污染和结局推进
- 9 个区域、8 位 NPC、物品、线索链、事件链和多种结局类别
- 全景地图模式与经典三栏模式，可用 `M` 切换
- 多槽位本地存档、JSON 导入导出与存档安全扫描
- 视觉/交互/文本污染，以及减少动画、高对比度等无障碍设置
- UGC 模组导入、校验、预览、打包和事件编辑器
- 可选的 GLM API 叙事增强；关闭或请求失败时使用仓库内静态文本

常用快捷键：`N` 打开笔记本，`J` 切换线索面板，`I` 滚动到物品栏，`M` 切换布局。

## 在线体验

[GitHub Pages 发布地址](https://baliujunan.github.io/abyssal-whispers/) 由 `.github/workflows/ci.yml` 在 `main` 分支通过完整构建和浏览器测试后部署。`develop` 分支的配置目标为 `/preview/` 子目录。部署是否在线仍取决于仓库 Pages 和 Actions 设置。

## Companion project / 配套项目

[AbyssDB](https://github.com/BALIUJUNAN/ABYSS-DB) 是配套的开源状态引擎项目。

当前游戏**尚未接入 AbyssDB**：代码中没有 AbyssDB 依赖或调用，浏览器存档仍由 `src/engine/SaveManager.js` 写入 `localStorage`。项目正在评估或计划未来的集成方式；这不表示现有存档已经由 AbyssDB 管理。

## 技术架构

### 技术栈

- React 19 + Vite 8
- Zustand 5 + Immer 11
- Zod 4 数据校验
- Playwright 浏览器测试
- Tauri 2 Windows 桌面封装
- 可选的外部 GLM API 客户端

### 运行时分层

```text
React 组件与 hooks
        ↓
Zustand Store + Immer
        ↓
9 个 slice 模块
(adventure/core/daily/dark/explore/loop/npc/ui/system)
        ↓
reducers / systems / internal engine modules
        ↓
post-reducer effect executor（音频、存档等副作用）
```

`src/engine/` 是仓库内部的纯 JavaScript 引擎边界，并不是单独发布的 npm 包。`src/data/` 同时包含注册/校验代码和受创意内容许可约束的剧情数据，因此不能按目录整体视为 MIT；参见 `src/data/LICENSE.md`。

### 主要目录

| 路径                                          | 用途                                            |
| --------------------------------------------- | ----------------------------------------------- |
| `src/components/`, `src/hooks/`               | React UI 与界面编排                             |
| `src/state/`, `src/reducers/`, `src/systems/` | 状态、reducer 与领域逻辑                        |
| `src/engine/`, `src/runtime/`                 | 内部引擎和副作用执行                            |
| `src/data/`                                   | 数据注册/校验代码以及剧情、角色、事件等混合内容 |
| `assets/`                                     | 场景、角色和结局 WebP 资产；Vite `publicDir`    |
| `audio/`                                      | 运行时音频资产                                  |
| `tests/`                                      | Node 与 Playwright 测试                         |
| `scripts/`, `tools/`                          | 校验、审核、模拟、构建辅助和内容工具            |
| `src-tauri/`                                  | Tauri Rust 外壳、配置和应用图标                 |
| `mods/`                                       | UGC 示例和示例叙事内容                          |
| `docs/`                                       | 技术文档、ADR，以及个别创意图片/内容            |

## 验证与发布审核

```bash
npm test                       # 19 个 Node 测试套件
npm run lint:schema            # 基础数据与扩展事件 Schema
npm run lint:engine            # engine 边界
npm run lint:undef             # 未声明引用
npm run lint:san               # SAN mutation 规则
npm run lint:rng               # reducer 随机性规则
npm run lint:audio             # 音频 ID、文件和质量
npm run lint:events            # 扩展事件规则
npm run analyze:events:ci      # 事件覆盖和冗余分析
npm run lint:narrative         # 叙事质量抽检
npm run lint:npc               # NPC 对话一致性
node scripts/validate-mods.mjs # 仓库内模组批量校验
npm run build                  # Vite 生产构建
node check_build.cjs --dist    # 发布目录与法律文件完整性
npm run test:e2e               # 19 项 Playwright 浏览器测试
```

快速与发布级游玩审核：

```bash
npm run audit:playable
npm run audit:playable:release
```

`npm run verify` 当前执行 Node 测试、Vite 构建和 `dist/` 检查；CI 还会单独运行完整 lint、模组校验和浏览器测试。

单文件模组校验需要显式路径：

```bash
npm run mod:validate -- mods/examples/new-area-lighthouse/mod.json
```

## 贡献与安全

- 贡献流程、代码风格、许可确认和素材来源要求见 [`CONTRIBUTING.md`](CONTRIBUTING.md)。
- 安全问题的支持范围和私密报告方式见 [`SECURITY.md`](SECURITY.md)。
- 重要架构约束见 [`docs/adr/README.md`](docs/adr/README.md)。
- 版本变化见 [`CHANGELOG.md`](CHANGELOG.md) 和 Git 标签；README 不重复维护一份易漂移的完整版本史。

## 许可证

Copyright © 2024-2026 BALIUJUNAN.

这是双许可证仓库。许可按材料类型决定，而不是简单按文件扩展名决定。

### 程序代码：MIT

作者拥有版权的程序代码采用 [`LICENSE`](LICENSE) 中的 MIT License。主要包括：

- `src/` 中的程序逻辑、React 组件、样式、状态管理、reducer、系统、引擎、运行时和工具代码；但不包括其中嵌入的剧情、美术、音频或其他创意表达
- `src-tauri/` 中的 Rust 源码、构建配置和能力配置；不包括 `src-tauri/icons/`
- `scripts/`、`tests/`、`tools/`、`.github/` 中作者拥有版权的代码与工作流
- `vite.config.js`、`check_build.cjs`、`dev-server.cjs`、Playwright 配置、包清单和其他构建/测试配置
- ADR、API/格式说明、构建说明等程序技术文档中的作者原创技术部分

MIT 允许使用、复制、修改、合并、发布、分发、再许可和销售这些代码，但必须保留 MIT 版权与许可声明。

### 创意内容与资产：CC BY-NC-ND 4.0 或原有权利状态

作者拥有版权的剧情文本、世界观、角色、对白、事件文案、图片、音频、视频及其他创意表达适用 [`LICENSE-ASSETS.md`](LICENSE-ASSETS.md) 中的 CC BY-NC-ND 4.0 条款。主要包括：

- `assets/`、`audio/`、`src-tauri/icons/` 和 `docs/dossier.png`
- 根目录 `沃切斯特的第十三声钟响.md`
- `game_base.json`、`game_ch2plus.json`、`game_meta.json` 以及 `src/data/` 中的剧情、事件、角色、世界观、物品描述、对白和其他创意字段
- `mods/` 中的示例剧情、角色、事件文案和创意命名
- `memory/`、`zhus/音频.txt` 以及文档中具有创意表达性质的故事、设定、提示词和文学内容

CC BY-NC-ND 4.0 不授予商业使用权，也不允许分享改编后的创意内容。**代码采用 MIT 不会自动授予剧情、美术、音频、角色或世界观的商用权。** 若要发布仅含 MIT 代码的商业版本，必须移除或替换受创意内容许可约束的材料，并自行确认替代素材的权利。

### 混合文件、生成产物与第三方内容

- `src/data/`、`mods/`、`zhus/` 和部分文档是混合区域：程序结构、schema、加载器和工具代码可属 MIT；其中的创意表达仍属创意内容许可。目录级说明提供更近的边界提示。
- `dist/` 是代码、第三方依赖和创意内容的组合发布物。构建不会改变任何输入材料的许可。
- 第三方库、服务、字体名称、图片、音频或其他素材以各自许可和服务条款为准，详见 [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)。
- 当前部分媒体文件缺少逐文件来源和授权记录。在完成来源核验前，不应把这些文件视为已由项目所有者重新授权。

如目录级说明、第三方声明或文件自带许可与本节冲突，以最接近该材料且有效的具体许可/权利声明为准。本说明不是对第三方权利的保证。
