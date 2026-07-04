# ADR-000: 架构决策记录索引

> 从 `mistake.txt` 转换而来。`mistake.txt` 保留作为原始记录。

## 列表

| 编号 | 标题 | 日期 | 类别 |
|------|------|------|------|
| ADR-001 | ESM 迁移后必须显式 import | 2026-06-14 | 模块系统 |
| ADR-002 | 确定性 RNG 全链路接入 | 2026-06-15 | 随机性 |
| ADR-003 | 混合类型数据必须类型感知访问 | 2026-06-14 | 数据结构 |
| ADR-004 | reducer context 的回调禁止使用 c | 2026-06-14 | 命名 |
| ADR-005 | 拼接构建迁移完成（Vite ESM 唯一构建） | 2026-06-14 | 构建 |
| ADR-006 | c 与 ctx 命名分离 | 2026-06-15 | 命名 |
| ADR-007 | Immer 使用规范 | 2026-06-14 | 状态管理 |
| ADR-008 | 可选功能的设置 UI 与调用逻辑交叉校验 | 2026-06-16 | 功能集成 |
| ADR-009 | CSS 函数参数不支持 var() | 2026-06-16 | CSS |
| ADR-010 | 存档安全 + 浏览器音频 + 构建验证 | 2026-06-16 | 安全/构建 |
| ADR-011 | 代码生成用 Python 而非 bash heredoc | 2026-06-19 | 构建 |
| ADR-012 | 新计数器必须四注册 | 2026-06-18 | 数据 |
| ADR-013 | 新函数涉及随机时必须接受 rng 参数 | 2026-06-18 | 随机性 |
| ADR-014 | slice handler 必须检查 pending 状态 | 2026-06-18 | 状态管理 |
| ADR-015 | 对象方法内部调用必须用 this | 2026-06-18 | JS |
| ADR-016 | typeof 保护不等于正确性 | 2026-06-18 | ESM |
| ADR-017 | 模块级可变状态的边界规则 | 2026-06-15 | 状态管理 |
| ADR-018 | window.GD 全局依赖的消除策略 | 2026-06-18 | 架构 |
| ADR-019 | 叙事条目 ID 使用确定性序列 | 2026-07-02 | 随机性 |
| ADR-020 | setter 函数内置 clamp | 2026-06-18 | 数据 |
| ADR-021 | 数值设计必须跑概率分布 | 2026-06-16 | 数值 |
| ADR-022 | combineSlices 分发路由 | 2026-07-02 | 架构 |
| ADR-023 | npcSchedule.js GD 未声明变量 | 2026-07-02 | 模块系统 |
| ADR-024 | systemSlice after hook 缺 ctx | 2026-07-02 | 命名 |
| ADR-025 | appHelpers.js 非确定性叙事 ID | 2026-07-02 | 随机性 |
| ADR-026 | build.py 事件文件正则大小写（已弃用） | 2026-07-02 | 构建 |
| ADR-027 | build.py events_ch2plus 缺失别名映射（已弃用） | 2026-07-02 | 构建 |
| ADR-028 | 项目统一使用 var 声明 | 2026-07-02 | JS |
| ADR-029 | 引擎层保持纯 JavaScript，移除 TypeScript 文件 | 2026-07-02 | 构建 |
| ADR-030 | CJS 文件的保留范围与策略 | 2026-07-02 | 模块系统 |

## 通用教训速查

1. **Import 是第一大坑** — 拼接构建隐藏了所有 import 缺失，ESM 下全部暴露
2. **"设计了但没接入"是最高频 bug 模式** — milestones、firstLoopBalance、RNG、clue_finds
3. **新增文件只需 ESM import** — Vite ESM 自动解析依赖图，无需维护构建顺序
4. **不要用 c 做回调参数名** — 必然遮蔽 reducer context
5. **Slice handler 第一个动作** — `var GD = ctx.GD;` + `var _rand = makeRand(rng)`
6. **新计数器必须四注册** — initialState + 递增点 + BEHAVIOR_COUNTERS + CONDITION_VAR_MAP
7. **typeof 保护 ≠ 正确性** — 防止崩溃但功能被静默禁用
8. **ESM + CJS 混用是定时炸弹** — try/catch 吞掉 ReferenceError，功能永久失效
9. **设置 UI 和调用逻辑必须交叉校验** — 三处必须对齐
10. **CSS 函数参数必须是字面值** — `var()` 只能用在属性值层面
11. **代码生成用 Python** — 避免 bash heredoc 的转义歧义
12. **批量请求需要队列化** — 不能用即发即决的 rate limiter
13. **模块级布尔守卫有竞态** — 改用单调递增 ID
14. **组件文件同样需要 ESM import** — 只要调用了非 React 函数就必须 import
