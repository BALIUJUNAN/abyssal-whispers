# 项目评审：深渊低语：沃切斯特之影

> 评审日期：2026-07-02 | 版本：v0.9.7 → v0.9.8（进行中）

---

## 总体评价：8.5 / 10

一个**雄心勃勃、执行力惊人**的独立游戏项目。在约 4 个月的时间里，从零构建了一个 5 万+ 行代码、629 个事件、102 个结局的克苏鲁文字冒险游戏。架构设计展现了成熟的工程判断力，测试覆盖远超同类项目。主要扣分点在**部分模块膨胀**、**JS/TS 混用不彻底**、以及**重构进行中遗留的半成品痕迹**。

---

## 1. 架构设计：9 / 10

### 做得好的

**Zustand + Immer + combineSlices 声明式切片**是最正确的架构决策。从 v0.9.0 的 `useReducer` + 单体 switch（1000+ 行）迁移到现在的 9 个 slice + systemSlice cross-cutting hooks，dispatch 链路清晰（before → handler → after → flushEffects），每个 slice 职责单一。这是教科书级的状态管理演进。

**引擎层隔离**（`src/engine/`）非常干净。EventEngine / PollutionManager / SaveManager / WorldTimeSystem 四个核心模块零游戏导入，依赖通过 DI 注入。TypeScript strict 模式 + `lint:engine` 边界检查。这意味着引擎可以在无 React 环境下运行（模拟器、测试），是正确的分层。

**ADR 体系**（`docs/adr/`）是少见的好习惯。27 条架构决策记录，每条有背景/决策/理由/后果，从 `mistake.txt` 的 45+ 条错误中提炼。这是真正的工程成熟度标志——大多数个人项目没有这种纪律。

**Post-reducer 副作用执行器**（`effectExecutor.js`）将音频、存档、统计等副作用从纯 reducer 中分离，类型分发 + 去重。Reducer 保持同步确定性，副作用异步不阻塞状态更新。

**SSOT（单一数据源）**贯彻得彻底 — SAN 配置在 `game_base.json`，难度在 `difficultyLevels.json`，修改 JSON 全局生效，零硬编码。

**数据驱动设计** — 新增事件只需 JSON 条目，`has_flag`/`add_flag` 引擎级软连锁，零 reducer 改造。这是内容创作和代码的完美分离。

### 需要改进的

**`combineSlices.js` 放在 `src/engine/` 里语义不对**。它是状态管理基础设施（Zustand slice 组合），不是"引擎"（引擎应该是不依赖 React/Zustand 的纯逻辑）。当前 `useGameStore.js` 从 `../engine/combineSlices.js` 导入，但 engine 层不应该知道 Zustand slice 的存在。建议移到 `src/state/`。

**`gameReducer.js` 名不副实**。文件现在是 41 行的 effects buffer 壳（`flushEffectsBuffer` + `setEffectsDispatch`），已经不做任何 game reduction。应该重命名为 `effectBuffer.js` 或合并到 `effectExecutor.js`。

**`var` 全项目使用**。理解这是有意为之（hoisting 行为一致性 + 避免 TDZ），但在 2026 年的 ES 模块项目中，`const`/`let` 的块级作用域是更好的默认选择。`var` 的 hoisting 曾经导致 dailySlice 的饥饿系统失效（v0.2.2 bug），不是没有代价的。如果坚持 `var`，建议在 ADR 中记录理由。

---

## 2. 代码质量：8 / 10

### 亮点

- **Reducer 三条铁律**（CLAUDE.md）是好的约束 — 显式 import、随机性走 c.rng、不用 c 做回调参数名。这些问题在 ESM 迁移中反复出现，把教训固化为规则是正确的。
- **JSDoc 类型注解**（SliceConfig / SliceReducer / BeforeHook / AfterHook）为未来 TS 迁移铺路，成本低、收益高。
- **lint 体系完善** — `lint:san`、`lint:engine`、`lint:narrative`、`lint:npc`、`lint:schema`，每层都有自动化检查。
- **测试覆盖 608 用例 / 14 套件**，包括轮回系统（102 用例）、玩家行为模拟器（5 种人格 × 8 轮）、平衡性蒙特卡洛模拟（96 项）。在独立游戏中极其罕见。

### 问题

**`exploreSlice.js`（928 行）和 `npcSlice.js`（774 行）仍然膨胀**。dailySlice 从 594 行拆分到 7 个领域文件（v0.9.6）是正确的方向，但 exploreSlice 和 npcSlice 没有跟进。exploreSlice 的 EXPLORE case 已在 v0.2.2 分解为 3 子阶段，但代码仍在一个文件里。这是当前最大的单文件膨胀问题。

**`extendedEvents.js`（984 行）是最大的单文件**。V2 事件调度（pure/commit 分离、SSOT triggeredEvents、三层加权）是核心逻辑，但近千行在一个文件里意味着修改任何事件选择逻辑都需要在这个文件里操作。

**JS/TS 混用不彻底**。`src/engine/` 有 3 个 `.ts` 文件（EventEngine.ts 486 行、SaveManager.ts、PollutionManager.ts）和 6 个 `.js` 文件。同一目录下两种格式共存，不清楚为什么有些引擎模块用了 TS 而有些没有。`engineCore.js`（引擎入口）是 JS，但 EventEngine 是 TS —— 这让 TS 的边界检查价值打折扣。

**CJS 残留**。`tests/` 目录下仍有大量 `.cjs` 测试文件（`test_reincarnation_core.cjs`、`test_smoke_flows.cjs` 等）。`scripts/validators/` 也还是 CJS。`type: "module"` 的 package.json 下跑 CJS 测试，这种双模块格式的张力是技术债务。建议在 ADR 中明确记录 CJS 的保留范围和时间表。

**当前工作树有 53 个文件修改（+906/-2006）**，处于重构中途状态。`useGameStore.js` 的 diff 显示正在将 if/else-if 路由替换为 combineSlices 的 dispatch map，同时叙事 ID 从 `Date.now() + Math.random()` 迁移到确定性序列。这是正确的方向（ADR-019/ADR-025），但重构进行中意味着代码库处于"半迁移"状态，应尽快完成并提交。

---

## 3. 游戏设计：9.5 / 10

这是项目最强的维度。

**SAN 系统的 6 阶段 × 4 维度**（视觉/交互/逻辑/Meta）是见过的最完整的克苏鲁疯狂模拟。从 CSS 动画（文字颤抖、色偏）到 Canvas 渲染（噪点、扫描线、barrel distortion）到 CorruptibleChoice（Hover 延迟 + 文字腐化）到 AbyssPopup（Meta 消息），层层递进。三滑块独立控制 + 轻度污染模式是真正的无障碍设计。

**"AP 污染"系统**（显示欺骗 + 行动偷取 + 发现机制）和"不可靠每日总结"是神来之笔。玩家永远不确定自己是否真的还有行动力，这是洛夫克拉夫特式"不可靠感知"的机械实现。

**"疑似 bug"系统**（幻影日志 0.5%、NPC 名字错字 0.3%、幻影叙述 0.3%）用游戏机制模糊了 bug 和疯狂的边界。这是元叙事的精妙设计——同类项目中极为罕见。

**神话专名门控**（第一周目零真名泄露，loop 2 模糊替代，loop 3+ 解锁专名）体现了对克苏鲁"不可名状"本质的深刻理解。

**13 级难度系统** + 恐惧画像 + 首轮渐进保护 + Day-of-Cycle 事件权重，数值设计层次丰富、可调参。

**629 个事件 + 102 个结局**的内容量对于一个独立项目来说非常庞大。事件覆盖 9 个方向（轮回/NPC 跨角色/神话/资源/人性/区域深层/静默/征兆/失踪），结构完整。

### 一个担忧

内容量巨大，但**叙事质量的一致性**是挑战。`lint:narrative` 抽检 50 条/次，平均分 96.7/100 是不错的成绩，但 800+ 事件的文本质量方差可能很大。`distortionTemplates.js`（6 个共享模板）是减少重复的正确方向，但模板化也可能导致"模板味"。建议持续关注 `lint:narrative` 中的 B 级事件，不要让它们沉淀。

---

## 4. 工程实践：8.5 / 10

### 做得好的

- **CI/CD 流水线**完整 — PR Quality Gate（6 项 lint + 测试 + 构建 + 格式检查）、Main CI（5 个并行 job）、Preview Deploy（GitHub Pages）、Release（自动 changelog）。
- **版本历史记录详尽** — README 的版本历史表从 v1.0 到 v0.9.7，每个版本都有清晰的主要更新说明。
- **UGC 模组系统**设计周全 — 5 种扩展实体、可视化编辑器、Schema 校验、安全限制（仅 JSON、未知字段剥离、危险内容拦截）。安全限制尤其重要。
- **`npm run verify` 一键验证** — 测试 + Vite 构建。好的 CI 入口。
- **Vite + vite-plugin-singlefile** 构建自包含单 HTML 文件（~2.8MB），双击即可打开。对独立游戏分发非常友好。

### 问题

- **测试文件中有分析报告**（`BALANCE_ANALYSIS.md`、`FINAL_BALANCE_REPORT.md` 等）直接放在 `tests/` 目录下。这些应该移到 `docs/reports/`。
- **`src/vendor/immer.production.js`** 的存在暗示之前可能有手动 vendor 管理。现在 Immer 通过 npm 安装，这个文件应该可以移除了。
- **README 1303 行**，非常详尽但对新贡献者来说信息密度过高。考虑将部分内容拆分到 `docs/` 下的独立文件（如 `docs/architecture.md`、`docs/changelog.md`）。

---

## 5. LLM 集成的定位

GLM-4.7 Flash 的 9 个增强场景设计精良，离线回退架构也正确。但如果 API 成本或可用性变化，这整块代码（`glmClient.js` + `llmNarrative.js` ~510 行）就成了维护死重。需要明确：这是核心卖点还是可选增强？如果是后者，考虑是否值得保持这个复杂度，或者将其提取为可选插件。

---

## 6. 优先级建议

### 高优先级（建议 v0.9.8 完成）

1. **完成当前工作树的 combineSlices 迁移** — 将 if/else-if 路由替换为 dispatch map，叙事 ID 确定性化。这是 v0.9.8 的核心变更，完成后应立即提交，避免半迁移状态持续。

2. **拆分 exploreSlice.js（928 行）和 npcSlice.js（774 行）** — 参照 dailySlice 的拆分模式（7 个领域文件 + 薄调度层）。这是当前最大的单文件膨胀问题。

3. **重命名/合并 `gameReducer.js`** — 它已经不是 game reducer，而是 effect buffer。建议重命名为 `effectBuffer.js` 或直接合并到 `effectExecutor.js`。

### 中优先级（v0.10.0 前）

4. **统一 JS/TS** — 决定引擎层是否全部 TS。如果是，把 `engineCore.js`、`combineSlices.js`、`eventBus.js`、`commands.js` 迁移到 TS。如果否，把 `.ts` 文件转回 JS 以避免混用。在 ADR 中记录决策。

5. **移动 `combineSlices.js` 到 `src/state/`** — 它是状态管理基础设施，不是引擎。

6. **清理 `tests/` 目录** — 移除分析报告到 `docs/reports/`，移除 `src/vendor/immer.production.js`。

7. **CJS 测试文件的长期计划** — 在 ADR 中记录 CJS 保留范围和时间表。要么全部迁移到 ESM，要么明确接受双格式。

8. **找 3-5 个真实玩家盲测** — 608 个测试通过说明代码按预期运行，不等于玩家体验好。观察：前 30 分钟在哪里卡住？第一次死亡后是否愿意继续？轮回机制是否被理解？SAN 系统是否真的让人感到不安？

### 低优先级（持续关注）

9. **叙事质量方差** — 持续运行 `lint:narrative`，关注 B 级事件，不要让它们沉淀。
10. **`extendedEvents.js`（984 行）** — 考虑拆分为事件池构建、事件选择、权重计算三个模块。
11. **README 精简** — 将架构细节拆分到 `docs/architecture.md`，版本历史拆分到 `docs/changelog.md`。
12. **范围冻结** — 系统复杂度在持续增长（v0.9.0 → v0.9.7 三个月 8 个版本），但每个新系统的边际玩家体验收益在递减。NPC 日期里程碑对话、天气反应、SAN 观察——这些系统对 99% 的玩家来说感知差异不大。下一步最有价值的事是**砍功能、打磨核心体验**，而不是加功能。

---

## 7. 结语

这是一个**令人印象深刻的项目**。4 个月从零到 5 万行代码、608 个测试、102 个结局，而且架构设计不是"先写再改"的堆积，而是有清晰的演进路径（从 CJS 到 ESM、从 useReducer 到 Zustand+Immer、从单体到切片）。ADR 体系、lint 体系、CI/CD 流水线表明作者有成熟的工程习惯。

**SAN 系统是真正的核心创新**——UI 本身成为恐怖载体，这是设计上的高级手法。

当前处于 v0.9.7 → v0.9.8 的重构中途（combineSlices 路由替换 + 叙事 ID 确定性化），这是正确的方向。完成这些重构后，建议优先处理 exploreSlice 和 npcSlice 的拆分，以及 JS/TS 混用问题。

**最大的风险不是技术，而是范围**——你在用工程思维解决叙事问题，但叙事问题的核心是"玩家是否被打动"，这需要真实玩家的反馈来验证。下一步应该少写代码，多找玩家。