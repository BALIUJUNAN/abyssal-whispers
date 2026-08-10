# 完整游玩逻辑审核

`scripts/audit-playability.mjs` 是面向发布前检查的真实状态机审核器。它直接加载与 `src/main.jsx` 相同的生产数据合并结果，并通过 `useGameStore.dispatch()` 驱动正式 reducer、事件池、NPC、战斗、结局和存档逻辑；不会复制一套简化游戏规则。

## 运行方式

```bash
# 日常改动后的快速审核：12 个完整 runs
npm run audit:playable

# 候选发布包审核：48 个完整 runs，更严格的覆盖门槛
npm run audit:playable:release

# 精确复现或缩小问题
node scripts/audit-playability.mjs --mode quick --seed my-probe --runs 4 --max-actions 300

# 自定义报告位置；默认写入已被 .gitignore 忽略的 test-results/
node scripts/audit-playability.mjs --output test-results/my-audit.json
```

可用参数：

| 参数                    | 作用                                  |
| ----------------------- | ------------------------------------- |
| `--mode quick\|release` | 选择日常或发布审核门槛                |
| `--runs N`              | 覆盖默认模拟局数                      |
| `--max-actions N`       | 单局最大生产 action 数                |
| `--replay-checks N`     | 重复回放的 seed 数量                  |
| `--seed value`          | seed 前缀；报告中的每局会追加稳定编号 |
| `--output path`         | JSON 报告路径                         |
| `--no-report`           | 仅输出控制台摘要                      |

脚本以退出码 `0` 表示所有阻断门禁通过，以 `1` 表示存在玩法/审计失败，以 `2` 表示命令参数错误。

## 审核模型

快速模式轮换四类玩家行为：

| 玩家模型       | 主要行为                     | 重点覆盖                               |
| -------------- | ---------------------------- | -------------------------------------- |
| `investigator` | 探索、追问、适度深入调查     | 事件、线索、追问链、区域开放           |
| `social`       | 高频 NPC 交谈和信任推进      | 身份键、死亡可见性、信任门槛、对话线程 |
| `survivor`     | 补给、工作、低风险选择、逃跑 | 经济、饥饿、休息、长期存活             |
| `reckless`     | 深入赌博、高危地区、正面战斗 | 低 SAN、负面效果、死亡与战斗           |

难度按 `1 / 4 / 8 / 13` 轮换，职业按六种正式职业轮换。玩家策略使用独立的确定性 policy RNG，绝不消耗游戏的 `c.rng`；因此策略选择和游戏随机都能由报告 seed 复现。

每局会走正式开局动作：

```text
START_GAME → SKIP_PROLOGUE → DISMISS_GUIDE
→ SET_DIFFICULTY → SET_ARCHETYPE → ROLL_STATS → BEGIN_ADVENTURE
→ MOVE / EXPLORE / TALK_NPC / NPC_RESPONSE / WORK / BUY_FOOD / REST / ...
→ ending 或合法死亡
```

## 阻断门禁

1. **生产数据**：运行 Zod 校验，并按正式入口合并基础数据、ch2plus、meta 与扩展事件。
2. **地图可达性**：验证邻接目标存在、边双向、解锁线索存在；按第 1/4/8/15/22/28 天计算所有已开放区域是否能从镇中心到达。
3. **真实 Store 连续游玩**：每个 action 必须被 `combineSlices` 正确接管且返回 `{ ok: true }`；Node 中 reducer 异常会直接抛出，不能被 UI 兼容层静默吞掉。
4. **逐 action 状态不变量**：数值必须有限；HP/SAN/AP/食物不得越界；数组和 NPC map 类型正确；当前地区存在；结局有身份；叙事不得出现空值、`undefined` 或 `NaN`。
5. **事件索引一致性**：`triggeredEvents ↔ _triggeredSet`、`triggeredSilentEvents ↔ _silentSet` 在每次写入后必须一致。
6. **NPC 身份与可见性**：持久 NPC map 只允许稳定 ID；禁止稳定 ID 与中文名影子键并存；死亡 NPC 不得被 `getNpcsHere()` 返回。
7. **阻塞状态与卡死检测**：choice、gamble、combat 不得重叠；连续八个生产动作没有可观察进展视为卡死，并保留最后 30 步轨迹。
8. **同进程确定性回放**：相同 seed、难度、职业和玩家模型连续执行两次，比较逐步持久状态和动作轨迹。这能捕获共享 `GD` 被第一局污染、无参 `pick()` 等跨局问题。
9. **存档往返**：通过正式 `manualSave → loadSlot → CONTINUE_GAME` 比较持久状态，检测漏存、污染和加载迁移分叉。
10. **战斗合同**：分别启动深潜者、夜魔、修格斯战斗，执行正式 `COMBAT_ACTION` 并验证能在上限内结束和清理。
11. **低 SAN 文本压力**：遍历玩家可见正文，在多个 SAN 阶段执行正式碎片化管线。事件名、标题和按钮 label 不经过正文碎片化，只校验原始文本合法性，避免制造不存在的调用路径。
12. **静默效果警告**：`applyLegacyEffects` 出现未识别字段时直接判失败，避免控制台提示代替实际效果。

快速模式把事件/晚期章节不足作为告警或较宽门槛；发布模式要求全部地区被访问、至少 30 个独立事件被实际触发，并至少有一局进入第五章。无论模式，异常、越界、卡死、回放分叉、存档分叉和未识别效果始终阻断。

## JSON 报告与复现

默认报告位于 `test-results/playability-audit.json`，该目录已被 `.gitignore` 忽略，不会上传 GitHub。报告包括：

- 完整配置和每局 seed；
- 每局终态、结局、最大天数和动作数；
- 地区/事件/线索/NPC/战斗/阻塞类型覆盖；
- 首个回放分叉 action 与字段；
- 失败前最后 30 个 action 的前后状态摘要；
- 数据、文本、战斗、存档和运行时告警探针结果。

复现单个失败时，将报告内的 seed 作为新的前缀并限制为一局：

```bash
node scripts/audit-playability.mjs --mode quick --runs 1 --seed abyssal-playability-007 --max-actions 340
```

如果需要完全相同的自动编号，可直接把失败局的 spec 参数复制到临时测试，或把顶层 `seed` 的编号前缀去掉后设置相同 run index。

## 与其他检查的边界

该审核回答“正式逻辑能否连续玩、状态是否自洽、相同 seed 能否复现”，但不替代：

- `npm test`：函数级和已知回归测试；
- `npm run build`：Vite ESM、JSX 与生产打包；
- `node tests/test_full_flow.mjs`：固定主流程断言；
- `npm run test:e2e`：真实浏览器布局、点击、弹窗和响应式行为；
- `npm run lint:audio`：音频映射与文件完整性；
- 人工体验：节奏、文案吸引力、难度体感和结局情绪效果。

推荐候选发布顺序：

```bash
npm test
npm run audit:playable:release
npm run build
node tests/test_full_flow.mjs
npm run test:e2e
```
