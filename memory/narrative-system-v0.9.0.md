---
name: narrative-system-v0.9.0
description: v0.9.0 三大叙事系统增强：隐性结局触发、NPC关系网道德抉择、恐惧画像→道德倾向
metadata:
  type: project
---

# v0.9.0 叙事系统增强（2026-06-21）

## 完成的三项核心增强

### 1. 隐性结局触发系统（`src/systems/implicitEndingSystem.js`）
- **Shadow Score Axes**: 8 个隐性评分轴（violence/occult/social/escape/obsession/meta/knowledge/sacrifice），从 35+ 行为计数器加权计算
- **Mutual Exclusions**: 6 组互斥锁（如"纯洁救赎者"与"冷血操纵者"不能同时触发），玩家永远不知道 WHY
- **Cross-Dependencies**: 隐藏的计数器组合条件（如 `ending_tide_marriage` 需要 harbor_visits >= 3，但条件字符串只显示 `forbidden_intimacy_flags >= 1`）
- **Dormant Counters**: `same_npc_harm_max`、`npc_deaths_by_manipulation` 等计数器在满足前提后才激活
- **Ending Entropy**: 检测玩家行为矛盾度（如暴力+社交高=矛盾），用于元叙事效果
- **Opaque Hints**: 生成模糊的诗意提示（如"有人在皮肤上写字"），只描述结局主题，不泄露触发条件
- **Approaching Endings**: 检测进度 ≥70% 的结局，最多返回 2 个，用于叙事调味

### 2. NPC 关系网道德抉择系统（`src/data/npcRelationshipWeb.js` + `src/systems/moralChoiceEngine.js`）
- **6 个阵营**: 封印守护者、深潜者血脉、普通镇民、军方残余、晨星会
- **11 对 NPC 关系**: 双向关系图（affinity/knowledge/conflict/moralWeight）
- **6 个道德困境**: 每个困境 3 个选择，全部有隐藏代价
  - `dilemma_elias_research`: 伊莱亚斯的研究 vs 玛莎的安全
  - `dilemma_hilda_sacrifice`: 希尔达的牺牲 vs 封印修复
  - `dilemma_fisher_secret`: 费舍的秘密 vs 玛莎的幸福
  - `dilemma_joshua_cure`: 约书亚的治疗 vs 他的战斗力
  - `dilemma_isabella_truth`: 伊莎贝拉的真相 vs 镇民的稳定
  - `dilemma_stranger_help`: 陌生人的请求 vs 自身资源
- **Reputation Propagation**: 信任变化通过关系网传播（直接→一度关系→二度关系）
- **Faction Impact**: 行为影响阵营立场
- **Moral Score**: 抽象道德评分（-100 到 +100），完全不暴露给玩家
- **Moral Dissonance**: 矛盾行为检测，用于叙事压力放大

### 3. 恐惧画像→道德倾向系统（`src/systems/fearMoralModifier.js`）
- **6 种恐惧的道德压力映射**:
  - ocean: "在洪水中选择救谁" — 所有选项都有代价
  - body: "在疼痛中选择更轻的那一种" — 身体代价
  - control: "在监禁中选择牢房" — 虚假选择
  - isolation: "在背叛和孤独之间选择" — 关系赌注
  - knowledge: "在知情和不知情之间选择" — 信息不对称
  - morality: "在善与善之间选择" — 最痛苦的抉择（特殊：更多困境+更高赌注+额外选择）
- **Coping Style 调节**: 6 种应对风格影响选择框架（回避型/调查型/社交型/支配型/牺牲型/掠夺型）
- **道德恐惧特殊处理**: `dilemmaAmplification.noBadOptions = true` + 1.5x 频率 + postChoiceDoubt
- **Moral Pressure Events**: 根据恐惧画像生成氛围压力事件

## 技术实现

### 新建文件
| 文件 | 行数 | 说明 |
|------|------|------|
| `src/systems/implicitEndingSystem.js` | ~500 | 隐性结局触发核心 |
| `src/data/npcRelationshipWeb.js` | ~400 | NPC 关系网络 + 道德困境数据 |
| `src/systems/fearMoralModifier.js` | ~600 | 恐惧→道德压力映射 |
| `src/systems/moralChoiceEngine.js` | ~300 | 道德选择引擎（集成点） |

### 修改文件
| 文件 | 变更 |
|------|------|
| `src/reducers/endingReducer.js` | 添加隐性结局过滤器（互斥锁+交叉依赖） |
| `src/reducers/slices/npcSlice.js` | NPC_RESPONSE 末尾集成 moralChoiceEngine |
| `src/state/initialState.js` | 新增 11 个行为计数器（mercy/selfless/promises 等） |
| `build.py` | 注册 4 个新文件（正确依赖顺序） |

### 关键设计原则
1. **玩家永远不知道触发条件** — 没有 UI 提示、没有日志、没有成就提示
2. **没有完美选项** — 每个道德困境的所有选择都有隐藏代价
3. **恐惧画像差异化体验** — 不同恐惧类型的玩家遇到不同类型的困境，强度不同
4. **关系网涟漪效应** — 帮助/伤害一个 NPC 会影响通过关系网连接的所有人
5. **隐性累积** — 计数器在后台运行，玩家只看到即时反馈，不知道长期影响

### 构建验证
- `check_build_imports.py`: ✅ 307 imports, 137 files
- `build.py --no-babel`: ✅ 成功
- `npm run build`: ✅ 1.27s
- `test_full_flow.mjs`: ✅ 48 passed
- `lint:narrative`: ✅ 0 禁用词, S级 31 + A级 19
- `lint:npc`: ✅ 8 NPC, 478 条台词, 0 矛盾
