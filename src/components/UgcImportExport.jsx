// src/components/UgcImportExport.jsx — UGC Mod Management UI
// Import/Export/Enable/Disable mods from localStorage.
// Uses React Hooks. No external state management required.

const { useState, useEffect, useCallback, useMemo } = React;

import {
  getAllMods,
  installMod,
  uninstallMod,
  toggleMod,
  exportMod,
  importModFromJson,
  getModStats,
} from '../reducers/ugcReducer.js';
import {
  validateMod, parseAndValidateMod,
  validateNpc, validateItem, validateArea, validateEnding,
} from '../data/ugcSchema.js';
import { applyUgcToGD } from '../utils/buildEventPool.js';
import UgcEventEditor from './UgcEventEditor.jsx';

// ── Bundled example mods catalog ──
// Each entry describes a mod that ships with the game.
// Players can install these with one click from the "Browse Examples" gallery.
const BUNDLED_EXAMPLES = [
  {
    id: 'simple_event',
    file: 'mods/examples/simple_event.json',
    name: '码头边的旧日记',
    author: '官方示例',
    version: '1.0.0',
    description: '最简单的纯叙事事件。在码头发现一本旧日记，无分支选择。适合学习事件基础结构。',
    icon: '📖',
    tags: ['入门', '纯叙事'],
    eventCount: 1,
    difficulty: '★☆☆',
  },
  {
    id: 'branch_choice',
    file: 'mods/examples/branch_choice.json',
    name: '流浪汉的请求',
    author: '官方示例',
    version: '1.0.0',
    description: '包含 3 个选项的分支选择事件。每个选项有不同的效果（食物、人性、信任、金钱）。',
    icon: '🤔',
    tags: ['入门', '分支选择'],
    eventCount: 1,
    difficulty: '★☆☆',
  },
  {
    id: 'chain_quest',
    file: 'mods/examples/chain_quest.json',
    name: '寻找失踪的猫',
    author: '官方示例',
    version: '1.0.0',
    description: '两阶段连锁任务。用 requires_flags 串联事件，第二阶段给予更好奖励。',
    icon: '🔗',
    tags: ['进阶', '任务链'],
    eventCount: 2,
    difficulty: '★★☆',
  },
  {
    id: 'add_npc_lighthouse_keeper',
    file: 'mods/examples/add-npc-lighthouse-keeper/mod.json',
    name: '老灯塔看守人',
    author: '官方示例',
    version: '1.0.0',
    description: '6 事件完整 NPC 任务链。初次相遇 → 帮助修灯 → 发现真相 → 道德抉择 → 结局分支。',
    icon: '🧙',
    tags: ['高级', 'NPC', '任务链', '剧情'],
    eventCount: 6,
    difficulty: '★★★',
  },
  {
    id: 'new_area_lighthouse_zone',
    file: 'mods/examples/new-area-lighthouse/mod.json',
    name: '废弃灯塔区',
    author: '官方示例',
    version: '1.0.0',
    description: '9 事件的新区域扩展。探索发现、深层调查、资源获取、氛围事件。多路径探索。',
    icon: '🏚️',
    tags: ['高级', '区域扩展', '探索'],
    eventCount: 9,
    difficulty: '★★★',
  },
  {
    id: 'difficulty_expert_mode',
    file: 'mods/examples/difficulty-expert/mod.json',
    name: '专家模式',
    author: '官方示例',
    version: '1.0.0',
    description: '难度调整 Mod。难度 8+ 时生效：文本腐化 ×2、NPC 信任 30%、6 组全局文本替换。',
    icon: '💀',
    tags: ['高级', '难度', '文本替换'],
    eventCount: 3,
    difficulty: '★★★',
  },
];

// ────────────────────────────────────────────────
// SECTION 1: Main Panel Component
// ────────────────────────────────────────────────

export function UgcPanel({ onClose, GD }) {
  const [mods, setMods] = useState([]);
  const [view, setView] = useState('list'); // 'list' | 'import' | 'detail'
  const [selectedMod, setSelectedMod] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Load mods on mount
  useEffect(() => {
    refreshMods();
  }, []);

  const [devMode, setDevMode] = useState(false);
  const refreshMods = () => {
    setMods(getAllMods());
  };

  const handleDevRefresh = () => {
    if (!GD) return;
    var result = applyUgcToGD(GD);
    refreshMods();
    var n = GD._ugcEventCount || 0;
    var nn = GD._ugcNpcCount || 0;
    var ni = GD._ugcItemCount || 0;
    var na = GD._ugcAreaCount || 0;
    var ne = GD._ugcEndingCount || 0;
    showToast('已刷新：' + n + ' 事件 + ' + nn + ' NPC + ' + ni + ' 物品 + ' + na + ' 区域 + ' + ne + ' 结局');
  };

  const stats = useMemo(() => getModStats(), [mods]);

  const showToast = (msg, type = 'success') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleToggle = (modId) => {
    toggleMod(modId);
    refreshMods();
  };

  const handleUninstall = (modId) => {
    if (!confirm('确定要卸载此MOD？')) return;
    uninstallMod(modId);
    refreshMods();
    if (selectedMod?.id === modId) {
      setSelectedMod(null);
      setView('list');
    }
    showToast('MOD已卸载');
  };

  const handleExport = (modId) => {
    const json = exportMod(modId);
    if (!json) return;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ugc_mod_${modId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('MOD已导出');
  };

  const handleImportSuccess = () => {
    refreshMods();
    setView('list');
    showToast('MOD安装成功');
  };

  const handleInstallExample = useCallback(
    async (example) => {
      try {
        // Fetch the bundled example mod JSON
        const resp = await fetch(example.file);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.text();
        const result = importModFromJson(json);
        if (result.success) {
          handleImportSuccess();
          showToast(`「${example.name}」安装成功！`);
        } else {
          showToast(result.errors?.join('\n') || '安装失败', 'error');
        }
      } catch (e) {
        showToast('加载示例失败: ' + e.message, 'error');
      }
    },
    [handleImportSuccess, showToast]
  );

  return (
    <div className="ugc-panel">
      <div className="ugc-panel-header">
        <h2>模组管理</h2>
        <div className="ugc-stats">
          <span>{stats.totalMods} 模组</span>
          <span>·</span>
          <span>{stats.totalUgcEvents} 事件</span>
          {stats.totalUgcNpcs > 0 && <span>·</span>}
          {stats.totalUgcNpcs > 0 && <span>{stats.totalUgcNpcs} NPC</span>}
          {stats.totalUgcItems > 0 && <span>·</span>}
          {stats.totalUgcItems > 0 && <span>{stats.totalUgcItems} 物品</span>}
          {stats.totalUgcAreas > 0 && <span>·</span>}
          {stats.totalUgcAreas > 0 && <span>{stats.totalUgcAreas} 区域</span>}
          {stats.totalUgcEndings > 0 && <span>·</span>}
          {stats.totalUgcEndings > 0 && <span>{stats.totalUgcEndings} 结局</span>}
        </div>
        <button className="ugc-close-btn" onClick={onClose}>
          ✕
        </button>
        {devMode && (
          <button className="ugc-dev-refresh" onClick={handleDevRefresh} title="重新加载所有模组">
            刷新
          </button>
        )}
      </div>

      {feedback && (
        <div className={'ugc-feedback ugc-feedback-' + feedback.type}>{feedback.msg}</div>
      )}

      <div className="ugc-panel-body">
        {view === 'list' && (
          <>
            <ModListView
              mods={mods}
              onToggle={handleToggle}
              onUninstall={handleUninstall}
              onExport={handleExport}
              onSelect={(m) => {
                setSelectedMod(m);
                setView('detail');
              }}
              onImport={() => setView('import')}
            />
            {/* Bundled Examples Gallery */}
            <ExampleGallery onInstall={handleInstallExample} installedIds={new Set(mods.map(m => m.id))} />
          </>
        )}
        {view === 'import' && (
          <ModImportView
            GD={GD}
            onBack={() => setView('list')}
            onSuccess={handleImportSuccess}
            onError={(msg) => showToast(msg, 'error')}
          />
        )}
        {view === 'detail' && selectedMod && (
          <ModDetailView
            mod={selectedMod}
            onBack={() => {
              setView('list');
              setSelectedMod(null);
            }}
            onToggle={() => handleToggle(selectedMod.id)}
            onExport={() => handleExport(selectedMod.id)}
            onUninstall={() => {
              handleUninstall(selectedMod.id);
            }}
          />
        )}
        {view === 'editor' && (
          <UgcEventEditor
            open={true}
            initialEvent={null}
            onClose={() => setView('list')}
            onSaveAsMod={(modData) => {
              var result = installMod(modData);
              if (result.success) {
                if (GD) applyUgcToGD(GD);
                refreshMods();
                setView('list');
                showToast('事件模组创建成功');
              } else {
                showToast((result.errors || []).join('\n') || '创建失败', 'error');
              }
            }}
          />
        )}
      </div>

      {/* Empty state — shown when no mods installed */}
      {view === 'list' && mods.length === 0 && (
        <div className="ugc-empty-state">
          <div className="ugc-empty-icon">📭</div>
          <div className="ugc-empty-text">还没有安装任何模组</div>
          <div className="ugc-empty-hint">浏览下方示例或导入自己的 JSON 文件</div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────
// SECTION 2: Bundled Example Gallery
// ────────────────────────────────────────────────

function ExampleGallery({ onInstall, installedIds }) {
  const [expanded, setExpanded] = useState(false);
  const visibleExamples = expanded ? BUNDLED_EXAMPLES : BUNDLED_EXAMPLES.slice(0, 3);

  return (
    <div className="ugc-example-gallery">
      <div className="ugc-example-header">
        <span className="ugc-example-title">📚 官方示例</span>
        <button
          className="btn btn-sm ugc-example-toggle"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? '收起' : `查看全部 (${BUNDLED_EXAMPLES.length})`}
        </button>
      </div>
      <div className="ugc-example-grid">
        {visibleExamples.map((ex) => {
          const isInstalled = installedIds.has(ex.id);
          return (
            <div key={ex.id} className="ugc-example-card">
              <div className="ugc-example-icon">{ex.icon}</div>
              <div className="ugc-example-info">
                <div className="ugc-example-name">{ex.name}</div>
                <div className="ugc-example-desc">{ex.description}</div>
                <div className="ugc-example-meta">
                  <span className="ugc-example-difficulty">{ex.difficulty}</span>
                  <span className="ugc-example-count">{ex.eventCount} 事件</span>
                  {ex.tags.map((t) => (
                    <span key={t} className="ugc-example-tag">{t}</span>
                  ))}
                </div>
              </div>
              <button
                className={'btn btn-sm ugc-example-install' + (isInstalled ? ' installed' : '')}
                onClick={() => !isInstalled && onInstall(ex)}
                disabled={isInstalled}
              >
                {isInstalled ? '✓ 已安装' : '安装'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// SECTION 3: Mod List View
// ────────────────────────────────────────────────

function ModListView({ mods, onToggle, onUninstall, onExport, onSelect, onImport }) {
  return (
    <>
      <div className="ugc-toolbar">
        <button className="btn btn-primary btn-sm" onClick={onImport}>
          📥 导入模组
        </button>
        <label className="ugc-dev-toggle" title="开发者模式：启用手动刷新">
          <input
            type="checkbox"
            checked={devMode}
            onChange={(e) => setDevMode(e.target.checked)}
          />
          <span>Dev</span>
        </label>
      </div>
      {mods.length > 0 && (
        <div className="ugc-mod-list">
          {mods.map((mod) => (
            <div
              key={mod.id}
              className={'ugc-mod-card' + (mod.enabled === false ? ' disabled' : '')}
            >
              <div className="ugc-mod-card-header">
                <div className="ugc-mod-info">
                  <div className="ugc-mod-name">{mod.name}</div>
                  {mod.metadata?.description && (
                    <div className="ugc-mod-desc">{mod.metadata.description}</div>
                  )}
                  <div className="ugc-mod-meta">
                    <span className="ugc-mod-author">by {mod.author}</span>
                    <span className="ugc-mod-version">v{mod.version}</span>
                    <span className="ugc-mod-count">{mod.events?.length || 0} 事件</span>
                  </div>
                </div>
                <div className="ugc-mod-toggle">
                  <button
                    className={'toggle-btn' + (mod.enabled !== false ? ' active' : '')}
                    onClick={() => onToggle(mod.id)}
                    title={mod.enabled !== false ? '点击禁用' : '点击启用'}
                  >
                    {mod.enabled !== false ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
              <div className="ugc-mod-card-actions">
                <button className="btn btn-sm" onClick={() => onSelect(mod)}>
                  详情
                </button>
                <button className="btn btn-sm" onClick={() => onExport(mod.id)}>
                  导出
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => onUninstall(mod.id)}>
                  卸载
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ────────────────────────────────────────────────
// SECTION 4: Import View
// ────────────────────────────────────────────────

function ModImportView({ GD, onBack, onSuccess, onError }) {
  const [jsonText, setJsonText] = useState('');
  const [validation, setValidation] = useState(null);
  const [installing, setInstalling] = useState(false);

  const handleValidate = useCallback(() => {
    if (!jsonText.trim()) {
      setValidation({ valid: false, errors: ['请输入JSON内容'] });
      return;
    }
    const result = parseAndValidateMod(jsonText);
    setValidation(result);
  }, [jsonText]);

  const handleInstall = useCallback(() => {
    if (!validation?.valid) return;
    setInstalling(true);
    try {
      const result = importModFromJson(jsonText);
      if (result.success) {
        onSuccess();
      } else {
        onError(result.errors?.join('\n') || '安装失败');
      }
    } catch (e) {
      onError('安装出错: ' + e.message);
    }
    setInstalling(false);
  }, [jsonText, validation, onSuccess, onError]);

  const handleFileDrop = useCallback(
    (e) => {
      e.preventDefault();
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      if (!file.name.endsWith('.json')) {
        onError('只支持 .json 文件');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setJsonText(ev.target.result);
        setValidation(null);
      };
      reader.readAsText(file);
    },
    [onError]
  );

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setJsonText(ev.target.result);
      setValidation(null);
    };
    reader.readAsText(file);
  }, []);

  return (
    <div className="ugc-import-view">
      <div className="ugc-import-header">
        <button className="btn btn-sm" onClick={onBack}>
          ← 返回
        </button>
        <h3>导入模组</h3>
      </div>

      <div
        className="ugc-import-area"
        onDrop={handleFileDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <div className="ugc-drop-zone">
          <div className="ugc-drop-icon">📄</div>
          <div>拖放 .json 文件到此处</div>
          <label className="btn btn-sm ugc-file-label">
            或点击选择文件
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        <div className="ugc-or-divider">—— 或者直接粘贴JSON ——</div>

        <textarea
          className="ugc-json-input"
          value={jsonText}
          onChange={(e) => {
            setJsonText(e.target.value);
            setValidation(null);
          }}
          placeholder="粘贴模组JSON..."
          rows={12}
          spellCheck={false}
        />
      </div>

      <div className="ugc-import-actions">
        <button className="btn" onClick={handleValidate} disabled={!jsonText.trim()}>
          🔍 验证
        </button>
        <button
          className="btn btn-primary"
          onClick={handleInstall}
          disabled={!validation?.valid || installing}
        >
          {installing ? '安装中...' : '📦 安装模组'}
        </button>
      </div>

      {validation && <ValidationResult result={validation} />}
    </div>
  );
}

// ────────────────────────────────────────────────
// SECTION 5: Detail View
// ────────────────────────────────────────────────

function ModDetailView({ mod, onBack, onToggle, onExport, onUninstall }) {
  const [expandedEvent, setExpandedEvent] = useState(null);

  return (
    <div className="ugc-detail-view">
      <div className="ugc-detail-header">
        <button className="btn btn-sm" onClick={onBack}>
          ← 返回
        </button>
        <h3>{mod.name}</h3>
      </div>

      <div className="ugc-detail-meta">
        <div>
          <strong>作者：</strong>
          {mod.author}
        </div>
        <div>
          <strong>版本：</strong>
          {mod.version}
        </div>
        <div>
          <strong>事件数：</strong>
          {mod.events?.length || 0}
        </div>
        <div>
          <strong>状态：</strong>
          {mod.enabled !== false ? '✅ 已启用' : '⏸ 已禁用'}
        </div>
        {mod.createdAt && (
          <div>
            <strong>创建：</strong>
            {new Date(mod.createdAt).toLocaleDateString()}
          </div>
        )}
      </div>

      <div className="ugc-detail-events">
        <h4>事件列表</h4>
        {(mod.events || []).map((evt, i) => (
          <div
            key={evt.id}
            className="ugc-event-card"
            onClick={() => setExpandedEvent(expandedEvent === i ? null : i)}
          >
            <div className="ugc-event-header">
              <span className="ugc-event-id">{evt.id}</span>
              <span className="ugc-event-name">{evt.name}</span>
              <span className="ugc-event-type">{evt.type}</span>
              {evt.tier && <span className={'ugc-event-tier tier-' + evt.tier}>{evt.tier}</span>}
            </div>
            {expandedEvent === i && (
              <div className="ugc-event-detail">
                <div className="ugc-event-desc">{evt.description}</div>
                {evt.choices && evt.choices.length > 0 && (
                  <div className="ugc-event-choices">
                    <strong>选项：</strong>
                    {evt.choices.map((c) => (
                      <div key={c.id} className="ugc-event-choice">
                        · {c.label}
                      </div>
                    ))}
                  </div>
                )}
                {evt.trigger && (
                  <div className="ugc-event-trigger">
                    <strong>触发条件：</strong> {JSON.stringify(evt.trigger)}
                  </div>
                )}
                {evt.effects && (
                  <div className="ugc-event-effects">
                    <strong>效果：</strong> {JSON.stringify(evt.effects)}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Extended entity sections */}
      {mod.npcs && mod.npcs.length > 0 && (
        <div className="ugc-detail-section">
          <h4>NPC ({mod.npcs.length})</h4>
          {mod.npcs.map((n, i) => (
            <div key={n.id || i} className="ugc-detail-row">
              <span className="ugc-detail-id">{n.id}</span>
              <span>{n.name}</span>
              <span className="ugc-detail-type">{n.location}</span>
            </div>
          ))}
        </div>
      )}
      {mod.items && mod.items.length > 0 && (
        <div className="ugc-detail-section">
          <h4>物品 ({mod.items.length})</h4>
          {mod.items.map((it, i) => (
            <div key={it.id || i} className="ugc-detail-row">
              <span className="ugc-detail-id">{it.id}</span>
              <span>{it.name}</span>
              <span className="ugc-detail-type">{it.type}</span>
              {it.uses > 0 && <span>x{it.uses}</span>}
            </div>
          ))}
        </div>
      )}
      {mod.areas && mod.areas.length > 0 && (
        <div className="ugc-detail-section">
          <h4>区域 ({mod.areas.length})</h4>
          {mod.areas.map((a, i) => (
            <div key={a.id || i} className="ugc-detail-row">
              <span className="ugc-detail-id">{a.id}</span>
              <span>{a.name}</span>
              <span className="ugc-detail-type">{a.type}</span>
            </div>
          ))}
        </div>
      )}
      {mod.endings && mod.endings.length > 0 && (
        <div className="ugc-detail-section">
          <h4>结局 ({mod.endings.length})</h4>
          {mod.endings.map((ed, i) => (
            <div key={ed.id || i} className="ugc-detail-row">
              <span className="ugc-detail-id">{ed.id}</span>
              <span>{ed.name}</span>
              <span className="ugc-detail-type">{ed.world_outcome}</span>
            </div>
          ))}
        </div>
      )}

      <div className="ugc-detail-actions">
        <button
          className={'btn' + (mod.enabled !== false ? '' : ' btn-primary')}
          onClick={onToggle}
        >
          {mod.enabled !== false ? '⏸ 禁用' : '▶ 启用'}
        </button>
        <button className="btn" onClick={onExport}>
          📥 导出
        </button>
        <button className="btn btn-danger" onClick={onUninstall}>
          🗑 卸载
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// SECTION 6: Validation Result Display
// ────────────────────────────────────────────────

function ValidationResult({ result }) {
  if (result.valid) {
    const evtCount = result.sanitized?.events?.length || 0;
    return (
      <div className="ugc-validation ugc-validation-pass">
        <div className="ugc-validation-title">✅ 验证通过</div>
        <div className="ugc-validation-info">
          <div>
            模组：{result.sanitized?.name} v{result.sanitized?.version}
          </div>
          <div>作者：{result.sanitized?.author}</div>
          <div>事件数：{evtCount}</div>
        </div>
        {result.warnings?.length > 0 && (
          <div className="ugc-validation-warnings">
            {result.warnings.map((w, i) => (
              <div key={i}>⚠️ {w}</div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="ugc-validation ugc-validation-fail">
      <div className="ugc-validation-title">❌ 验证失败</div>
      <div className="ugc-validation-errors">
        {result.errors.slice(0, 10).map((e, i) => (
          <div key={i} className="ugc-error-item">
            · {e}
          </div>
        ))}
        {result.errors.length > 10 && (
          <div className="ugc-error-more">...还有 {result.errors.length - 10} 个错误</div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// SECTION 6: Sample Mod Helper
// ────────────────────────────────────────────────

function downloadSampleMod() {
  const sample = {
    id: 'sample_horror_1926',
    author: '调查员档案馆',
    name: '1926沃切斯特补充事件',
    version: '1.0',
    events: [
      {
        id: 'ugc_sample_001',
        name: '码头的异常潮汐',
        type: 'area_deep',
        subtype: 'harbor',
        weight: 0.8,
        tier: 'rare',
        tags: ['ugc', 'harbor', 'tide', 'anomaly'],
        trigger: {
          areas: ['harbor_district'],
          time_phase: ['midnight'],
          probability: 0.12,
          min_loop: 1,
          once_per_run: true,
        },
        description:
          '你站在码头边。潮水正在退去——但退潮的方向不对。\n\n水不是向海里退去，而是向码头的木桩下方收缩。木桩在水中露出了更多的部分。你看到了木桩上刻着的数字。\n\n每一个木桩上都有一个数字。你从最近的开始数：3, 7, 11, 13。\n\n第十三根木桩上没有数字。上面刻着一个符号——和你笔记本最后一页上的一样。',
        effects: { san: -2 },
        choices: [
          {
            id: 'read_symbols',
            label: '记录符号',
            text: '你蹲下来，用铅笔把符号描在笔记本上。铅笔在纸上的触感变了——不是摩擦力的变化，是温度。纸张在你描的时候变热了。\n\n描完之后，符号消失了。不是从木桩上消失——是从你的笔记本上。但那页纸的温度还在。',
            effects: { add_clue: { id: 'clue_ugc_tide_symbol', name: '第十三根木桩的符号' } },
          },
          {
            id: 'touch_pile',
            label: '触碰第十三根木桩',
            text: '你的手指碰到木桩的那一刻，潮水回来了。\n\n不是慢慢涨回来的——是一瞬间。水没过了你的脚踝。冰冷。但那温度在往上走，一直走到膝盖才停。\n\n水退去之后，你的鞋带系成了你没见过的结。',
            effects: { san: -3, hp: -1 },
          },
        ],
      },
      {
        id: 'ugc_sample_002',
        name: '教堂侧室的烛光',
        type: 'humanity',
        subtype: 'trial',
        weight: 1,
        tier: 'common',
        tags: ['ugc', 'church', 'humanity', 'light'],
        trigger: {
          areas: ['town_center'],
          time_phase: ['evening'],
          probability: 0.15,
          once_per_run: true,
        },
        description:
          '教堂的侧室亮着光。不是主灯——是蜡烛。很多蜡烛。\n\n你推开门。侧室很小，大概三步乘三步。墙上挂满了照片。照片里的人你都不认识，但他们的表情都一样——不是恐惧，是困惑。像是突然看到了什么不该看到的东西。\n\n蜡烛的数量不对。你数了一下：十三根。但只有十二根在燃烧。第十三根蜡烛的火焰是黑色的。',
        effects: { san: -1 },
        choices: [
          {
            id: 'examine_photos',
            label: '仔细看照片',
            text: '你凑近了看。每张照片下面都有一个日期。日期从1899年开始，每隔几年一张。最近的一张——\n\n是你。\n\n照片里的你穿着你没见过的衣服，站在一个你不认识的地方。但那张脸是你的。日期是——明天。',
            effects: { san: -3, add_clue: { id: 'clue_ugc_photo_tomorrow', name: '明天的照片' } },
          },
          {
            id: 'blow_candle',
            label: '吹灭黑色火焰的蜡烛',
            text: '你弯下腰，靠近第十三根蜡烛。黑色的火焰没有温度。你吹了一口气。\n\n火焰没有灭。它变大了。\n\n其他十二根蜡烛同时熄灭了。房间暗了。但黑色的火焰还在。它照亮了你脚下的一块地砖。地砖上刻着一个字：\n\n「走」。',
            effects: { san: -2, add_clue: { id: 'clue_ugc_black_flame', name: '黑色的火焰' } },
          },
          {
            id: 'take_photo',
            label: '拿走那张你的照片',
            text: '你伸手去拿照片。照片粘在墙上——不是用胶水，是用什么温热的、有弹性的东西。\n\n你用力一扯。照片下来了。但照片的背面有一行字，墨水还没干：\n\n「你拿走的不是照片。是时间。」\n\n你把照片翻过来。正面的你——不见了。只剩下一个空的背景。',
            effects: { san: -2, add_clue: { id: 'clue_ugc_stolen_photo', name: '被拿走的时间' } },
          },
        ],
      },
      {
        id: 'ugc_sample_003',
        name: '安全屋的呼吸声',
        type: 'silent',
        subtype: 'safehouse',
        weight: 0.6,
        tier: 'normal',
        tags: ['ugc', 'safehouse', 'silent', 'breathing'],
        trigger: {
          areas: ['town_center'],
          probability: 0.1,
          san_lte: 50,
          once_per_run: true,
        },
        description:
          '你在安全屋里休息。夜很深了。\n\n你听到了呼吸声。不是你的——节奏不对。你的呼吸是每分钟十六次。那个声音是每分钟九次。\n\n声音从墙壁里传来。不是隔壁——是墙壁本身。像是墙体在缓慢地、有规律地起伏。\n\n你把手放在墙上。墙是温的。',
        effects: { san: -1 },
        choices: [],
      },
    ],
    metadata: {
      description: '三个额外的氛围事件，为沃切斯特增加更多不安的细节。',
      tags: ['horror', 'atmosphere', '1926'],
    },
    createdAt: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sample_worcester_mod.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default UgcPanel;
