# CHANGELOG

## 2026-06-14 — SAN系统重构 + 工程改造 + 4个运行时Bug修复

### 错误记录

---

#### Bug 1: `getCorruptedSystemText is not defined`

- **表现**: 点击序章选项后崩溃，ReferenceError
- **触发路径**: `PROLOGUE_CHOICE` → `uiSlice` → `buildReducerCtx` → `narr()` → 调用 `getCorruptedSystemText`
- **根因**: `appHelpers.js` 的 `buildReducerCtx` 函数内调用了 `getCorruptedSystemText(text, layer)`，该函数定义在 `app.jsx` 中。旧 `build.py` 单文件构建把所有函数放在同一作用域，全局可用。迁移到 Vite ESM 后每个文件是独立模块，必须显式导入。
- **修复**: `buildReducerCtx(s, opts)` 改为 `buildReducerCtx(s, opts, corruptFn)`，由 `app.jsx` 调用时传入 `getCorruptedSystemText`
- **教训**: **任何在 A 文件定义、B 文件裸调用的函数，在 ESM 模式下都会崩溃。** 不能依赖 bundle 作用域的隐式全局。

---

#### Bug 2: `ctx is not defined`

- **表现**: `BEGIN_ADVENTURE` 时崩溃，ReferenceError at coreSlice.js:98
- **触发路径**: `BEGIN_ADVENTURE` → `handleCoreAction` → `genObjectives(1, ctx)` → `ctx` 未定义
- **根因**: `handleCoreAction` 签名是 `(s, action, c)` 只有3个参数，但函数内部多处使用 `ctx`（第4个参数名）。`app.jsx` 调用时也只传了3个参数。同时 `npcSlice`、`uiSlice`、`darkSlice` 也有同样问题。
- **修复**:
  - 所有5个 slice handler 签名统一为 `(s, action, c, ctx)`
  - `app.jsx` 调用处全部传入 `ctx` 作为第4参数
  - `coreSlice.js` 内部 `ctx` 引用改为 `c`（`c` 是 `buildReducerCtx` 的输出）
- **教训**: **函数签名和实际使用必须对齐。** 手写多参数传递链极易出错——应该用解构或单一 context 对象。

---

#### Bug 3: 封面背景图不显示

- **表现**: 标题屏幕纯黑，无海报图片
- **根因**: CSS 引用 `url('./assets/webp/海报.webp')`。源文件在 `src/`，构建后 CSS 输出到 `dist/assets/style-*.css`，`./assets/` 解析为 `dist/assets/assets/`（不存在）。图片实际在 `dist/webp/海报.webp`。
- **修复**: `url('./assets/webp/海报.webp')` → `url('/webp/海报.webp')`（绝对路径，Vite 自动转换）
- **教训**: **CSS 中的相对路径在构建后可能错位。** Vite 项目用 `/` 开头的绝对路径更安全。

---

#### Bug 4: 开局 SAN=25 导致第一章无法进行

- **表现**: 约20%玩家开局 SAN < 40，直接进入 explanation_loss 阶段（文本腐蚀、AP惩罚、加速腐蚀）
- **根因**: SAN = POW = 3d6×5（范围15-90），无地板值。doctor 职业 POW-10 后最低 SAN=5。
- **修复**: `s.san = Math.max(40, s.san)` 放在职业惩罚之后。Occultist 代价改为 maxSan 上限69。
- **教训**: **数值设计必须用概率分布验证。** 3d6×5 有20%概率<40，写公式时看不出来，模拟后才暴露。
