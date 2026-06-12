/**
 * error-tracker.js — 玩家操作追踪 & 错误报告生成器
 *
 * 设计目标：
 *   1. 自动记录玩家每次操作（dispatch action）的完整上下文
 *   2. ErrorBoundary 捕获错误时，自动打包最近 N 步操作为可读报告
 *   3. 玩家可一键复制/下载完整错误报告发给你
 *   4. 报告包含：操作序列 + state 快照 + 错误堆栈 + 环境信息
 *
 * 使用方式：
 *   在 app.jsx 顶部 import 并初始化: const tracker = createErrorTracker();
 *   每个 dispatch 前调用: tracker.record(action, state);
 *   ErrorBoundary 中调用: tracker.exportReport(error, errorInfo) → 显示/复制
 */

// ═══ 配置 ═══
export const CONFIG = {
  // 保留最近多少步操作（超出后截断旧记录）
  MAX_STEPS: 50,

  // state 完整快照间隔（每 N 步保存一次完整 state，其余只存 diff）
  STATE_SNAPSHOT_INTERVAL: 10,

  // 是否在控制台输出调试日志
  DEBUG: false,
};

// ═══ 内部状态 ═══
let _steps = []; // 操作步骤数组
let _snapshots = []; // state 完整快照（按间隔）
let _sessionStart = null; // 本次会话开始时间
let _stepCount = 0; // 总步数

/**
 * 创建错误追踪器实例
 */
export function createErrorTracker() {
  _steps = [];
  _snapshots = [];
  _sessionStart = new Date().toISOString();
  _stepCount = 0;

  return {
    /**
     * 记录一步操作
     * @param {object|string} action - dispatch 的 action 对象或 action type 字符串
     * @param {object} [state] - 当前的 game state（可选，用于快照）
     */
    record(action, state) {
      _stepCount++;
      const entry = {
        step: _stepCount,
        ts: Date.now(),
        time: new Date().toISOString(),
        type: typeof action === 'string' ? action : (action && action.type) || 'unknown',
        action: action,
        hasState: !!state,
      };

      // 定期保存完整 state 快照
      if (state && _stepCount % CONFIG.STATE_SNAPSHOT_INTERVAL === 0) {
        try {
          // 深拷贝 state（过滤掉不可序列化的字段）
          entry.stateSnapshot = serializeState(state);
          entry.isSnapshot = true;
        } catch (e) {
          if (CONFIG.DEBUG) console.warn('[ErrorTracker] State snapshot failed:', e);
        }
      }

      _steps.push(entry);

      // 超出上限时截断旧记录（但至少保留最近一次快照）
      if (_steps.length > CONFIG.MAX_STEPS) {
        // 找到最近的 snapshot，保留它及之后的所有步骤
        let lastSnapIdx = -1;
        for (let i = _steps.length - 1; i >= 0; i--) {
          if (_steps[i].isSnapshot) {
            lastSnapIdx = i;
            break;
          }
        }
        const keepFrom =
          lastSnapIdx > 0 ? lastSnapIdx : _steps.length - Math.floor(CONFIG.MAX_STEPS / 2);
        _steps = _steps.slice(keepFrom);
      }

      if (CONFIG.DEBUG) {
        const preview = typeof action === 'string' ? action : (action && action.type) || '{}';
        console.log(`[#${_stepCount.toString().padStart(3)}] ${preview}`);
      }

      return entry;
    },

    /**
     * 导出错误报告（供 ErrorBoundary 或手动调用）
     * @param {Error} error - 错误对象
     * @param {React.ErrorInfo} [errorInfo] - React 错误信息
     * @returns {object} 格式化的错误报告对象
     */
    exportReport(error, errorInfo) {
      const now = new Date();
      const duration = _sessionStart
        ? ((now - new Date(_sessionStart)) / 1000).toFixed(1) + 's'
        : 'N/A';

      // 收集最近的操作步骤（用于回放上下文）
      const recentSteps = _steps.slice(-30).map((s) => ({
        step: s.step,
        time: s.time,
        type: s.type,
        actionPreview: simplifyAction(s.action),
        hasSnapshot: s.isSnapshot || false,
      }));

      // 收集 state 快照
      const snapshots = _steps
        .filter((s) => s.isSnapshot)
        .map((s) => ({ step: s.step, time: s.time, keys: Object.keys(s.stateSnapshot || {}) }));

      // 构建报告
      const report = {
        meta: {
          version: '0.1.0',
          generatedAt: now.toISOString(),
          sessionStart: _sessionStart,
          duration: duration,
          totalSteps: _stepCount,
          recordedSteps: _steps.length,
          url: typeof location !== 'undefined' ? location.href : 'local file',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
          screenWidth: typeof screen !== 'undefined' ? screen.width + 'x' + screen.height : 'N/A',
        },
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack || '',
          componentStack: (errorInfo && errorInfo.componentStack) || '',
        },
        recentSteps,
        snapshots,
        summary: generateSummary(error, recentSteps),
      };

      return report;
    },

    /**
     * 将报告渲染为可读文本（用于显示/复制）
     * @param {object} report - exportReport() 返回的报告对象
     * @returns {string} 格式化的纯文本
     */
    renderText(report) {
      let lines = [];

      lines.push('╔══════════════════════════════════════════════════════════╗');
      lines.push('║                    深 渊 低 语 · 错 误 报 告                      ║');
      lines.push('╠════════════════════════════════════════════════════════╣');
      lines.push('');
      lines.push(
        `  ⏰  ${report.meta.generatedAt}  |  会话时长: ${report.meta.duration}  |  总操作数: ${report.meta.totalSteps}`
      );
      lines.push(`  🌐 ${report.meta.url}  |  ${report.meta.screenWidth}`);
      lines.push('');
      lines.push('─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─');
      lines.push(`  ❌ 错误类型: ${report.error.name}`);
      lines.push(`  💬 错误信息: ${report.error.message}`);

      if (report.error.stack) {
        lines.push('  📜 调用栈:');
        // 只取最后 15 行（通常是关键位置）
        const stackLines = report.error.stack.split('\n').slice(0, 15);
        stackLines.forEach((line) => lines.push(`     ${line}`));
      }

      lines.push('');
      lines.push('─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ');
      lines.push(`  📋 最近 ${report.recentSteps.length} 步操作:`);
      lines.push('');

      report.recentSteps.forEach((s, i) => {
        const snapMark = s.hasSnapshot ? ' 📸' : '  ';
        lines.push(`${snapMark}[#${s.step.toString().padStart(3)}] ${s.time}  ${s.type}`);
        lines.push(`     操作: ${s.actionPreview}`);

        // 如果是快照步骤，显示 state 的关键字段
        if (s.hasSnapshot && s.stateSnapshot) {
          const keys = Object.keys(s.stateSnapshot);
          const interesting = ['screen', 'day', 'loopCount', 'san', 'hp', 'maxSan', 'currentArea'];
          const shown = keys.filter((k) => interesting.includes(k));
          if (shown.length > 0) {
            const vals = shown.map((k) => `${k}:${JSON.stringify(s.stateSnapshot[k])}`).join(', ');
            lines.push(`     📸 State: {${vals}}`);
          }
        }
        lines.push('');
      });

      if (report.snapshots.length > 0) {
        lines.push('─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ');
        lines.push(`  📸 State 快照: ${report.snapshots.length} 个`);
        report.snapshots.forEach((s) => {
          lines.push(`     [步骤 #${s.step}] ${s.time}  关键字段数: ${s.keys.length}`);
        });
      }

      lines.push('╚════════════════════════════════════════════════════════╝');
      lines.push('');
      lines.push('💡 提示: 请将此报告发送给开发者以帮助定位问题。');
      lines.push('   可通过以下方式分享:');
      lines.push('   ① 截图发送 / 复制文字');
      lines.push('   ② 导出 JSON（node ops-log.cjs export-report 从浏览器控制台）');

      return lines.join('\n');
    },

    /**
     * 将报告序列化为 JSON（用于文件导出/API 发送）
     */
    toJSON() {
      return exportReport(new Error('Manual export'), {});
    },

    /**
     * 清空当前会话记录
     */
    clear() {
      _steps = [];
      _snapshots = [];
      _stepCount = 0;
      _sessionStart = new Date().toISOString();
    },

    /**
     * 获取当前统计（不敏感数据）
     */
    getStats() {
      return {
        stepCount: _stepCount,
        sessionStart: _sessionStart,
        recordedSteps: _steps.length,
        snapshotCount: _snapshots.length,
      };
    },
  };
}

// ═══ 辅助函数 ═══

/**
 * 简化 action 对象为可读的一行字符串（避免过长）
 */
export function simplifyAction(action) {
  if (!action) return '(empty)';
  if (typeof action === 'string') return action.substring(0, 80);

  const type = action.type || 'unknown';
  const fields = [];

  // 提取常见字段
  if (action.areaId) fields.push(`area=${action.areaId}`);
  if (action.choiceId) fields.push(`choice=${action.choiceId}`);
  if (action.slotId) fields.push(`slot=${action.slotId}`);
  if (action.targetArea) fields.push(`target→${action.targetArea}`);
  if (action.difficulty !== undefined) fields.push(`diff=${action.difficulty}`);
  if (action.archetype !== undefined) fields.push(`archetype=${action.archetype}`);
  if (action.key !== undefined) fields.push(`key="${String(action.key).substring(0, 30)}"`);

  // 截断 payload 但不显示完整内容
  if (Object.keys(action).length > 5) {
    const extraKeys = Object.keys(action).filter(
      (k) =>
        ![
          'type',
          'areaId',
          'choiceId',
          'slotId',
          'targetArea',
          'difficulty',
          'archetype',
          'key',
        ].includes(k)
    );
    if (extraKeys.length > 0) {
      fields.push(`+${extraKeys.length}field`);
    }
  }

  return `[${type}] ${fields.join(' | ')}`.substring(0, 150);
}

/**
 * 序列化 state（去除不可序列化字段如函数、DOM节点、循环引用）
 */
export function serializeState(state) {
  try {
    return JSON.stringify(state, (key, value) => {
      // 跳过函数和 React 元素
      if (typeof value === 'function') return undefined;
      if (value instanceof Element) return '[DOM]';
      if (value instanceof EventTarget) return '[EventTarget]';
      if (value && value.$$typeof) return '[ReactInternal]';
      return value;
    });
  } catch (e) {
    return '{...}';
  }
}

/**
 * 根据错误和操作历史，生成人类可读的问题摘要
 */
export function generateSummary(error, steps) {
  const summaries = [];

  // 错误类型匹配
  if (error.name === 'TypeError') summaries.push('类型错误：可能访问了未定义的变量或属性');
  if (error.message.includes('Cannot access'))
    summaries.push('初始化顺序错误：某个变量在被使用前尚未定义（TDZ问题）');
  if (error.message.includes('null')) summaries.push('空值引用：尝试读取 null/undefined 的属性');
  if (error.message.includes('is not a function')) summaries.push('类型错误：将非函数作为函数调用');
  if (error.message.includes('Unexpected token'))
    summaries.push('语法错误：代码编译产物可能有损坏');

  // 操作模式分析
  const types = steps.map((s) => s.type);
  const lastType = types[types.length - 1];

  if (lastType === 'BEGIN_ADVENTURE')
    summaries.push('错误发生在"进入主游戏"阶段，可能是初始数据构建有问题');
  if (lastType === 'START_GAME')
    summaries.push('错误发生在"新游戏"阶段（前传初始化），检查 prologueReducer');
  if (lastType === 'COMPLETE_PROLOGUE')
    summaries.push('错误发生在前传完成阶段，检查 fearProfile/calculateFearTuning');
  if (lastType === 'EXPLORE' || lastType === 'SELECT_EVENT')
    summaries.push('错误发生在探索事件触发环节，检查 eventReducer/selectEventV2');
  if (lastType === 'REST') summaries.push('错误发生在过夜休息阶段，检查 safehouseReducer');
  if (lastType === 'MOVE') summaries.push('错误发生在区域移动阶段，检查 worldReducer');
  if (lastType === 'TALK_NPC')
    summaries.push('错误发生在 NPC 交互阶段，检查 npcReducer/trust gates');

  // 频率分析
  const exploreCount = types.filter((t) => t === 'EXPLORE' || t === 'SELECT_EVENT').length;
  if (exploreCount > 5) {
    summaries.push(`已进行 ${exploreCount} 次探索，可能是高频触发了某个边界条件`);
  }

  // 最后几步是否有异常模式
  const lastTypes = types.slice(-5);
  if (lastTypes.every((t) => t === lastType)) {
    summaries.push(`连续5次相同操作(${lastType})后出错，可能是该操作的特定边界情况`);
  }

  if (summaries.length === 0) {
    summaries.push('未知错误，需结合具体报错信息和操作上下文分析');
  }

  return summaries;
}
