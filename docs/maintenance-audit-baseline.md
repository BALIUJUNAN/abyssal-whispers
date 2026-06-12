# 构建链基线审计 — 2026-06-12

> 本文档记录 Step 0 基线验证结果。未修改任何业务代码。

---

## 命令逐条验证

### 1. `python build.py`（默认构建 = Babel 编译 + minify）

| 项             | 结果                                                                          |
| -------------- | ----------------------------------------------------------------------------- |
| **状态**       | ✅ 通过                                                                       |
| **输出文件**   | `index.html`（1,832,037 bytes / 1.75 MB）                                     |
| **产物类型**   | 生产单文件 — Babel 编译过，无 Babel standalone，游戏完整可玩                  |
| **Babel 编译** | ✅ JSX → JS（Babel CLI via npx）                                              |
| **JS minify**  | basic fallback（\_strip_comments_safe + 正则空白折叠，terser 因 >800KB 跳过） |
| **CSS minify** | ✅ 103,763 → 95,364 bytes                                                     |
| **JSON 合并**  | split 模式：base(344KB) + ch2plus(170KB) + meta(127KB) → 474KB 内联           |
| **副作用**     | 复制 3 个 split JSON 到项目根目录（供 web lazy load）                         |
| **依赖**       | Python 3 + Node.js（@babel/cli via npx）                                      |

### 2. `python build.py --verify`

| 项           | 结果                              |
| ------------ | --------------------------------- |
| **状态**     | ✅ 通过                           |
| **测试套件** | 4 个 CJS 测试全部 PASS            |
| **产物检查** | 1.75 MB，无 Babel standalone 残留 |
| **输出**     | 无文件产出，纯验证                |

测试详情：

```
[PASS] test_effect_protocol.cjs      (6 passed, 0 failed)
[PASS] test_game_data_protocol.cjs   (10 passed, 0 failed)
[PASS] test_event_system.cjs         (19 passed, 0 failed)
[PASS] test_smoke_flows.cjs          (0 passed, 0 failed — skipped)
```

### 3. `npm run dev`（= `vite`）

| 项                   | 结果                                                                             |
| -------------------- | -------------------------------------------------------------------------------- |
| **状态**             | ⚠️ 启动但不可用                                                                  |
| **Vite 版本**        | v8.0.16，端口 3000                                                               |
| **是否可玩**         | ❌ 不可 — **只显示占位文本**                                                     |
| **失败原因（致命）** | `react` / `react-dom` 未安装在 node_modules，Vite 无法解析                       |
| **失败原因（逻辑）** | `src/main.jsx` 只渲染"ES 模块渐进迁移中"占位页，不渲染游戏                       |
| **实际渲染**         | `<div><h1>深渊低语 — Vite 开发模式</h1><p>当前阶段: ES 模块渐进迁移中</p></div>` |

Vite 错误日志：

```
Failed to resolve dependency: react (imported by src/main.jsx)
Failed to resolve dependency: react-dom/client (imported by src/main.jsx)
Are they installed?
```

**根因**：React/ReactDOM 以 UMD 形式存放在 `src/vendor/`（被 build.py 内联），但从未通过 npm 安装。Vite 走 ES module 解析，找不到 `import React from 'react'`。

### 4. `npm run build`（= `python build.py`）

| 项       | 结果                                        |
| -------- | ------------------------------------------- |
| **状态** | ✅ 通过                                     |
| **输出** | 与 #1 完全相同 — 就是调用 `python build.py` |
| **产物** | `index.html`（1.75 MB，生产可用）           |

### 5. `npm run build:vite`（= `vite build`）

| 项             | 结果                                                                             |
| -------------- | -------------------------------------------------------------------------------- |
| **状态**       | ❌ **构建失败**                                                                  |
| **输出目录**   | `dist-vite/`（已生成部分文件但不完整）                                           |
| **失败原因**   | Rolldown 无法 resolve `import "react"` from `src/main.jsx`                       |
| **产物**       | 仅 `dev.html`(419B) + `assets/main-CsxDWFtZ.js`(2KB) + CSS(88KB)，**无游戏逻辑** |
| **是否真游戏** | ❌ 占位页 + 空壳 CSS                                                             |

错误：

```
Error: [vite]: Rolldown failed to resolve import "react" from "src/main.jsx"
```

### 6. `node check_build.cjs`

| 项           | 结果                                                       |
| ------------ | ---------------------------------------------------------- |
| **状态**     | ✅ 通过（10/10）                                           |
| **检查内容** | index.html 大小 >1MB + 8 个关键字 + import/export 残留检查 |
| **依赖**     | 需要 `index.html` 已存在（由 build.py 产出）               |

---

## 补充验证

### `node _v.cjs`（快速 JS 语法检查）

| 项       | 结果                                                            |
| -------- | --------------------------------------------------------------- |
| **状态** | ❌ 崩溃                                                         |
| **错误** | `ReferenceError: scripts is not defined`（第37行变量作用域bug） |
| **结论** | 脚本本身有 bug，不可用                                          |

### `node _verify.cjs`（构建产物验证）

| 项       | 结果                                                                 |
| -------- | -------------------------------------------------------------------- |
| **状态** | ❌ 崩溃                                                              |
| **错误** | `SyntaxError: Invalid or unexpected token`（第26行字符串引号未转义） |
| **结论** | 脚本本身有 bug，不可用                                               |

### 单元测试逐条运行

| 测试文件                            | 运行时       | 结果                                           |
| ----------------------------------- | ------------ | ---------------------------------------------- |
| `tests/test_effect_protocol.cjs`    | CJS          | ✅ 6 passed                                    |
| `tests/test_game_data_protocol.cjs` | CJS          | ✅ 10 passed                                   |
| `tests/test_event_system.cjs`       | CJS          | ✅ 19 passed                                   |
| `tests/test_smoke_flows.cjs`        | CJS          | ✅ 0 passed（全部 skipped）                    |
| `tests/test_event_system.js`        | **ESM 强制** | ❌ `require is not defined in ES module scope` |
| `tests/integration_test.cjs`        | CJS          | ✅ 19 passed                                   |

> `test_event_system.js` 使用 `.js` 扩展名 + `require()`，但 package.json 有 `"type": "module"`，Node 强制按 ESM 解析。应该重命名为 `.cjs`。

### `scripts/report_references.cjs`

| 项         | 结果                                                                  |
| ---------- | --------------------------------------------------------------------- |
| **数据源** | 读取 `src/game_data.json`（旧单体文件）+ `src/data/game_ch2plus.json` |
| **问题**   | 不读 split JSON 的 base/meta，数据不完整                              |

---

## 构建产物对比

| 产物            | 路径                 | 大小    | 游戏完整                | 用途                      |
| --------------- | -------------------- | ------- | ----------------------- | ------------------------- |
| **生产单文件**  | `./index.html`       | 1.83 MB | ✅ 完整                 | GitHub Pages / 浏览器直开 |
| **dev 单文件**  | `./index.html`       | 4.94 MB | ✅ 完整（含 Babel）     | 本地快速构建              |
| **dist/**       | `dist/index.html`    | 1.74 MB | ✅ 但**过时**（6月3日） | build-web.cjs 旧产物      |
| **dist-vite/**  | `dist-vite/dev.html` | 419 B   | ❌ 空壳                 | vite build 失败残留       |
| **根目录 JSON** | `game_base.json` 等  | 3×      | N/A                     | lazy load（web 服务器用） |

---

## 关键发现

### 当前唯一可玩的构建路径

```
python build.py          →  index.html（1.75MB，完整游戏）
npm run build            →  同上（只是 alias）
双击 index.html          →  Chrome/Edge 直接可玩
python build.py --dev    →  index.html（4.94MB，含 Babel standalone，也能玩但更大）
```

**没有任何 Vite 路径可以运行游戏。**

### Vite dev 为什么不可玩

1. **React 不在 node_modules** — React/ReactDOM 是 `src/vendor/` 里的 UMD 文件，从未 `npm install react`。Vite 走 ES module 解析，找不到 `react` 包。
2. **main.jsx 是占位页** — 即使修复了 React 依赖，`src/main.jsx` 也只渲染一段"ES 模块渐进迁移中"的文本，不会渲染 `<App />`。
3. **app.jsx 不能直接被 Vite import** — app.jsx 内部使用全局变量（`GD`、`produce`、`ReactDOM` 等），这些依赖 build.py 按顺序拼接注入到全局作用域。Vite 的 ES module 隔离使这些全局变量不可见。

### GitHub Pages / Web 发布到底用哪个产物

| 场景                      | 产物                               | 来源                                         |
| ------------------------- | ---------------------------------- | -------------------------------------------- |
| **GitHub Pages（当前）**  | 根目录 `index.html`                | `python build.py` 直接产出                   |
| **GitHub Pages（dist/）** | `dist/index.html` + assets + audio | `build-web.cjs` 复制（当前**过时**，6月3日） |
| **.nojekyll**             | 存在                               | 禁用 Jekyll 处理                             |
| **CI/CD workflow**        | 不存在                             | `.github/workflows/` 目录为空                |

当前最可能的发布方式是：直接从 main 分支根目录 serving（`.nojekyll` 在场），或通过 `build-web.cjs` 复制到 `dist/` 后发布。但 `dist/` 内容已经 **9 天未更新**。

### 有效的测试命令

| 命令                                     | 有效 | 说明                                  |
| ---------------------------------------- | ---- | ------------------------------------- |
| `python build.py --verify`               | ✅   | 最完整：跑 4 个 CJS 测试 + 产物检查   |
| `node tests/test_effect_protocol.cjs`    | ✅   | 6 项效果协议测试                      |
| `node tests/test_game_data_protocol.cjs` | ✅   | 10 项游戏数据协议测试                 |
| `node tests/test_event_system.cjs`       | ✅   | 19 项事件系统测试                     |
| `node tests/integration_test.cjs`        | ✅   | 19 项集成测试                         |
| `node tests/test_smoke_flows.cjs`        | ⚠️   | 全部 skipped（0 passed）              |
| `node tests/test_event_system.js`        | ❌   | ESM/CJS 冲突，无法运行                |
| `node _v.cjs`                            | ❌   | 脚本自身 bug                          |
| `node _verify.cjs`                       | ❌   | 脚本自身 bug                          |
| `node check_build.cjs`                   | ✅   | 构建产物关键字检查                    |
| `npm test`                               | ❌   | 不存在（package.json 无 test script） |

---

## 运行时依赖全景

```
运行时
├── React 18 (src/vendor/react.production.min.js)      ← UMD, 不在 node_modules
├── ReactDOM 18 (src/vendor/react-dom.production.min.js) ← UMD, 不在 node_modules
├── Immer (src/vendor/immer.production.js)               ← UMD, 同时也在 node_modules
└── Babel standalone (src/vendor/babel.min.js)            ← 仅 dev build 使用

构建时
├── Python 3 (build.py)
├── @babel/cli + @babel/preset-react (via npx, devDependencies)
├── terser (devDependencies, 但因 >800KB 跳过)
└── Vite + @vitejs/plugin-react (devDependencies, 仅用于 HMR dev server)

未使用
├── vite build                  ← 失败（缺 React npm 包）
├── build-web.cjs               ← dist/ 过时，无 CI 调用
├── dev-server.cjs              ← Tauri 遗留（端口1420），与 Vite 无关
└── check_build.cjs             ← 可用但与 build.py --verify 功能重叠
```

---

## 总结

| 问题                                   | 严重性 | 一句话                                                    |
| -------------------------------------- | ------ | --------------------------------------------------------- |
| Vite dev 不可用                        | 🔴     | React 不在 npm + main.jsx 是占位页 + app.jsx 依赖全局变量 |
| vite build 失败                        | 🔴     | 同上，Rolldown 找不到 react                               |
| 4 条幽灵 import                        | 🟡     | app.jsx 引用不存在的文件，靠构建时剥除掩盖                |
| npm test 不存在                        | 🟡     | 测试需手动跑 python 或 node，阻碍 CI                      |
| \_v.cjs / \_verify.cjs 自身 bug        | 🟢     | 临时脚本，check_build.cjs 可替代                          |
| test_event_system.js 扩展名错误        | 🟢     | .js + type:module 导致 ESM 强制解析                       |
| dist/ 过时 9 天                        | 🟡     | build-web.cjs 未被自动调用                                |
| scripts/report_references.cjs 读旧数据 | 🟢     | 读 src/game_data.json 而非 split JSON                     |
