# 项目规范

## 前置检查

每次对话开始时，先读 `mistake.txt`。每次改代码前，对照已记录的同类模式。每次踩坑后，**立即**合并追加到 `mistake.txt`（按类别归并，不重复造条目）。

## Reducer 三条铁律

1. **Import 必须显式声明** — 被调用的函数必须在当前文件 import。"模块已 export" ≠ "消费方已 import"。拼接构建隐藏了所有缺失，ESM 下全部暴露。
2. **随机性必须走 c.rng** — reducer 工具函数用 `makeRand(rng)` 创建 `_rand`；slice handler 传入 `c.rng`。不允许裸 `Math.random()` 在 reducer 中出现。
3. **不要用 `c` 做回调参数名** — slice handler 的 `c` 是 reducer context，`.find((c) => ...)` 必然遮蔽。回调参数用 `x`、`item`、`entry`、`cond`。

## c 与 ctx 不要混淆

- `c` = reducer context（narr/effects/bt/rng），用于叙事和副作用
- `ctx` = `{ GD }`（游戏数据），用于需要 GD 的函数（chapterReducer、objectiveReducer 等）

## reducer 工具函数签名

工具函数（如 `getMotifFlavorText`、`selectEvent` 等）接收 `rng` 作为可选末参：
```js
export function getMotifFlavorText(motifType, corruptionLevel, ctx, rng) {
  var _rand = makeRand(rng);
  // ...
}
```
slice handler 调用时传入 `c.rng`：
```js
const text = getMotifFlavorText('fog', s.safehouseCorruption, ctx, c.rng);
```

## 新增文件双注册

新增 `.js` 文件后必须：① 目标消费方写 ESM import；② 加入 `build.py` 的 `REDUCER_FILES`（位置在依赖方之前）。运行 `python scripts/check_build_imports.py` 验证。

## 构建验证

- 重构后检查产物是否残留未编译 JSX（搜索 `return\s*\(\s*<[a-zA-Z]`）
- 新增文件后运行 `python scripts/check_build_imports.py`
- 修改后运行 `python build.py --no-babel` 确认拼接构建成功
- 同时运行 `npm run build` 确认 Vite ESM 构建成功
- 运行 `node tests/test_full_flow.mjs` 确认完整流程测试通过
- **事件迭代后**：运行 `npm run lint:narrative` 抽检叙事质量（随机 50 条，按风格指南打分），确保禁用词为零、平均分不低于 60
- **NPC 台词修改后**：运行 `npm run lint:npc` 校验对话一致性，确保无时间线/数字/状态矛盾

## 内容质量校验

### 叙事质量抽检 (`npm run lint:narrative`)

- **脚本**：`scripts/lint-narrative-quality.mjs`
- **触发时机**：新增/修改事件后，每次迭代必跑
- **检查内容**：随机抽 50 条事件，按 6 维度打分（禁用词/感官细节/冷静叙述/对话控制/抽象判断/句式控制）
- **通过标准**：禁用词 = 0，平均分 ≥ 60
- **风格指南来源**：`src/data/game_base.json § design_intent.text_style`

### NPC 对话一致性校验 (`npm run lint:npc`)

- **脚本**：`scripts/lint-npc-consistency.mjs`
- **触发时机**：新增/修改 NPC 台词后必跑
- **检查内容**：
  1. **时间线矛盾** — "没见过你" vs "上次见过你"；"没去过X" vs "在X..."
  2. **跨角色地点矛盾** — A 说 B 在某处 vs B 注册位置
  3. **状态自相矛盾** — 同一 NPC 同时说"没事"和"不舒服"
  4. **数字矛盾** — 同一单位数字冲突（排除历史年份引用）
  5. **死后发言** — NPC 明确说自己已死但又有存活行为台词
- **通过标准**：无 TIMELINE/NUMERIC/STATE 硬矛盾
- **数据来源**：`src/data/npcContextualLines.js` + `src/systems/npcDialogue.js` + `src/utils/npcMemory.js` + `src/data/game_base.json`

### 自动化建议

两个脚本均可集成到 CI（`.github/workflows/ci.yml`），作为 advisory 或 blocking check。默认 `--strict` 模式会因任意矛盾而失败，适合 CI 使用。

## UI/UX 规范

- 快捷键：**N** 打开笔记本、**J** 切换线索面板、**I** 滚动到物品栏、**M** 切换地图/经典模式
- 圆角：按钮 6px、弹窗 8px、HUD 4px
- 阴影：纯黑半透明，不用带颜色的阴影
- 字体：`system-ui, -apple-system, sans-serif`，最小 12px
- 间距：8px 栅格（8/16/24/32px），不用奇数
- 图片 class：`game-art`（基础滤镜）、`npc-portrait`（锐化）、`scene-bg`（暗角）、`ending-cg`（强暗角）
