# 项目规范

## 前置检查

每次对话开始时，先读 `mistake.txt`。每次改代码前，对照已记录的同类模式。每次踩坑后，**立即**合并追加到 `mistake.txt`（按类别归并，不重复造条目）。

## Reducer 三条铁律

1. **Import 必须显式声明** — 被调用的函数必须在当前文件 import。"模块已 export" ≠ "消费方已 import"。拼接构建隐藏了所有缺失，ESM 下全部暴露。
2. **随机性必须走 c.rng** — `rand(min, max, c.rng)` / `pick(arr, c.rng)` / `(c.rng ? c.rng.next() : Math.random())`。不允许裸 `Math.random()` 在 slice handler 中出现。
3. **不要用 `c` 做回调参数名** — slice handler 的 `c` 是 reducer context，`.find((c) => ...)` 必然遮蔽。回调参数用 `x`、`item`、`entry`。

## c 与 ctx 不要混淆

- `c` = reducer context（narr/effects/bt/rng），用于叙事和副作用
- `ctx` = `{ GD }`（游戏数据），用于需要 GD 的函数（chapterReducer、objectiveReducer 等）

## 新增文件双注册

新增 `.js` 文件后必须：① 目标消费方写 ESM import；② 加入 `build.py` 的 `REDUCER_FILES`（位置在依赖方之前）。运行 `python scripts/check_build_imports.py` 验证。

## 构建验证

- 重构后检查产物是否残留未编译 JSX（搜索 `return\s*\(\s*<[a-zA-Z]`）
- 新增文件后运行 `python scripts/check_build_imports.py`
- 修改后运行 `python build.py --no-babel` 确认构建成功
