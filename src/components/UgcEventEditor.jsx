// src/components/UgcEventEditor.jsx — Visual Event Editor for UGC Mods
// Form-based editor with live validation and JSON preview.

const { useState, useEffect, useCallback, useRef } = React;

import { validateEvent, LIMITS, EFFECTS_KEYS_WHITELIST } from '../data/ugcSchema.js';

const EVENT_TYPES = [
  { value: 'ugc', label: '通用 (ugc)' },
  { value: 'area_deep', label: '区域深层 (area_deep)' },
  { value: 'humanity', label: '人性 (humanity)' },
  { value: 'mythos', label: '神话 (mythos)' },
  { value: 'loop_locked', label: '轮回锁定 (loop_locked)' },
  { value: 'resource_pressure', label: '资源压力 (resource_pressure)' },
  { value: 'npc_cross', label: 'NPC 交叉 (npc_cross)' },
  { value: 'ending_omen', label: '结局预兆 (ending_omen)' },
  { value: 'ending_aftermath', label: '结局余波 (ending_aftermath)' },
  { value: 'silent', label: '无声 (silent)' },
  { value: 'meta', label: '元叙事 (meta)' },
  { value: 'exploration', label: '探索 (exploration)' },
  { value: 'combat', label: '战斗 (combat)' },
];

const TIERS = [
  { value: 'common', label: '普通' },
  { value: 'normal', label: '标准' },
  { value: 'rare', label: '稀有' },
  { value: 'epic', label: '史诗' },
  { value: 'unique', label: '独特' },
  { value: 'signature', label: '标志' },
];

const TIME_PHASES = ['morning', 'afternoon', 'evening', 'midnight'];
const TIME_PHASE_LABELS = { morning: '清晨', afternoon: '午后', evening: '傍晚', midnight: '深夜' };

const EFFECT_KEYS = Array.from(EFFECTS_KEYS_WHITELIST).sort();

function emptyForm() {
  return {
    id: '', name: '', type: 'ugc', tier: 'normal', weight: 1,
    description: '', tags: [],
    trigger: {
      areas: [], time_phase: [], probability: 0.15,
      once_per_run: false, once_ever: false,
      min_loop: 0, max_loop: 99,
      san_lte: '', san_gte: '', humanity_min: '', humanity_max: '',
      min_mythos: '', cooldown_days: 0,
      requires_flags: [], forbidden_flags: [],
      requires_clues: [], requires_items: [],
      requires_prev_event: [], npc_alive: [],
    },
    effects: {},
    choices: [],
  };
}

export default function UgcEventEditor({ open, onClose, initialEvent, onSaveAsMod }) {
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState([]);
  const [activeTab, setActiveTab] = useState('basic');
  const [copyOk, setCopyOk] = useState(false);
  const [saving, setSaving] = useState(false);
  const validateTimer = useRef(null);

  // Load initialEvent when provided
  useEffect(() => {
    if (initialEvent) {
      setForm({
        ...emptyForm(),
        ...initialEvent,
        trigger: {
          ...emptyForm().trigger,
          ...(initialEvent.trigger || {}),
        },
      });
      setActiveTab('basic');
    } else {
      setForm(emptyForm());
    }
    setErrors([]);
    setCopyOk(false);
  }, [initialEvent, open]);

  // Auto-validate on form change (debounced)
  useEffect(() => {
    if (validateTimer.current) clearTimeout(validateTimer.current);
    validateTimer.current = setTimeout(() => {
      validateForm();
    }, 400);
    return () => { if (validateTimer.current) clearTimeout(validateTimer.current); };
  }, [form]);

  function updateForm(path, value) {
    setForm(function (prev) {
      var next = { ...prev };
      if (path.length === 1) {
        next[path[0]] = value;
      } else {
        var obj = { ...next[path[0]] };
        obj[path[1]] = value;
        next[path[0]] = obj;
      }
      return next;
    });
  }

  function validateForm() {
    var evt = buildEventFromForm();
    var result = validateEvent(evt, 0);
    setErrors(result.valid ? [] : result.errors);
    return result.valid;
  }

  function buildEventFromForm() {
    var f = form;
    var trigger = {};
    if (f.trigger.areas.length) trigger.areas = f.trigger.areas;
    if (f.trigger.time_phase.length) trigger.time_phase = f.trigger.time_phase;
    if (f.trigger.probability !== 0.15) trigger.probability = f.trigger.probability;
    if (f.trigger.once_per_run) trigger.once_per_run = true;
    if (f.trigger.ever) trigger.once_ever = true;
    if (f.trigger.min_loop) trigger.min_loop = f.trigger.min_loop;
    if (f.trigger.max_loop && f.trigger.max_loop !== 99) trigger.max_loop = f.trigger.max_loop;
    if (f.trigger.san_lte !== '') trigger.san_lte = Number(f.trigger.san_lte);
    if (f.trigger.san_gte !== '') trigger.san_gte = Number(f.trigger.san_gte);
    if (f.trigger.humanity_min !== '') trigger.humanity_min = Number(f.trigger.humanity_min);
    if (f.trigger.humanity_max !== '') trigger.humanity_max = Number(f.trigger.humanity_max);
    if (f.trigger.min_mythos !== '') trigger.min_mythos = Number(f.trigger.min_mythos);
    if (f.trigger.cooldown_days) trigger.cooldown_days = f.trigger.cooldown_days;
    if (f.trigger.requires_flags.length) trigger.requires_flags = f.trigger.requires_flags;
    if (f.trigger.forbidden_flags.length) trigger.forbidden_flags = f.trigger.forbidden_flags;
    if (f.trigger.requires_clues.length) trigger.requires_clues = f.trigger.requires_clues;
    if (f.trigger.requires_items.length) trigger.requires_items = f.trigger.requires_items;
    if (f.trigger.requires_prev_event.length) trigger.requires_prev_event = f.trigger.requires_prev_event;
    if (f.trigger.npc_alive.length) trigger.npc_alive = f.trigger.npc_alive;
    if (Object.keys(trigger).length === 0) trigger = undefined;

    var effects = {};
    if (f.effects && Object.keys(f.effects).length > 0) effects = { ...f.effects };

    var choices = f.choices
      .filter(function (c) { return c.id && c.label; })
      .map(function (c) {
        var choice = { id: c.id, label: c.label };
        if (c.text) choice.text = c.text;
        if (c.effects && Object.keys(c.effects).length > 0) choice.effects = { ...c.effects };
        return choice;
      });

    return {
      id: f.id || 'temp_' + Date.now(),
      name: f.name || '未命名事件',
      type: f.type,
      tier: f.tier,
      weight: f.weight || 1,
      description: f.description || '',
      tags: f.tags,
      trigger: trigger,
      effects: Object.keys(effects).length > 0 ? effects : undefined,
      choices: choices.length > 0 ? choices : undefined,
    };
  }

  function handleSave() {
    if (!validateForm()) return;
    setSaving(true);
    var evt = buildEventFromForm();
    var modData = {
      id: 'editor_' + Date.now(),
      name: evt.name || '未命名事件',
      author: 'Event Editor',
      version: '1.0.0',
      compatibility: '>=0.9.0',
      events: [evt],
    };
    try {
      onSaveAsMod(modData);
    } catch (e) {
      setErrors(['保存失败: ' + e.message]);
    }
    setSaving(false);
  }

  function handleCopyJson() {
    var json = JSON.stringify(buildEventFromForm(), null, 2);
    navigator.clipboard.writeText(json).then(function () {
      setCopyOk(true);
      setTimeout(function () { setCopyOk(false); }, 2000);
    }).catch(function () {
      setErrors(['复制失败，请手动复制']);
    });
  }

  function handleReset() {
    setForm(initialEvent ? { ...emptyForm(), ...initialEvent, trigger: { ...emptyForm().trigger, ...(initialEvent.trigger || {}) } } : emptyForm());
    setErrors([]);
    setActiveTab('basic');
  }

  var jsonPreview = JSON.stringify(buildEventFromForm(), null, 2);

  return (
    <div className="ugc-event-editor">
      {/* Tab bar */}
      <div className="ugc-editor-tabs">
        {[
          { key: 'basic', label: '基础' },
          { key: 'trigger', label: '触发' },
          { key: 'effects', label: '效果' },
          { key: 'choices', label: '选项' },
          { key: 'preview', label: '预览' },
        ].map(function (tab) {
          return (
            <button
              key={tab.key}
              className={'ugc-editor-tab' + (activeTab === tab.key ? ' active' : '')}
              onClick={function () { setActiveTab(tab.key); }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="ugc-editor-tab-content">
        {activeTab === 'basic' && renderBasicTab()}
        {activeTab === 'trigger' && renderTriggerTab()}
        {activeTab === 'effects' && renderEffectsTab()}
        {activeTab === 'choices' && renderChoicesTab()}
        {activeTab === 'preview' && renderPreviewTab()}
      </div>

      {/* Footer */}
      <div className="ugc-editor-footer">
        <button className="btn btn-sm" onClick={handleReset}>重置</button>
        <button className="btn btn-sm" onClick={handleCopyJson}>
          {copyOk ? '已复制!' : '复制 JSON'}
        </button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : '保存为新模组'}
        </button>
      </div>
    </div>
  );

  function renderBasicTab() {
    return (
      <div className="ugc-editor-section">
        <div className="ugc-editor-row">
          <label>ID</label>
          <input
            value={form.id}
            onChange={function (e) { updateForm(['id'], e.target.value); }}
            placeholder="my_event_001（字母数字下划线）"
            spellCheck={false}
          />
          <span className="ugc-editor-hint">字母数字+下划线</span>
        </div>
        <div className="ugc-editor-row">
          <label>名称</label>
          <input
            value={form.name}
            onChange={function (e) { updateForm(['name'], e.target.value); }}
            placeholder="事件名称"
          />
        </div>
        <div className="ugc-editor-row">
          <label>类型</label>
          <select value={form.type} onChange={function (e) { updateForm(['type'], e.target.value); }}>
            {EVENT_TYPES.map(function (t) {
              return <option key={t.value} value={t.value}>{t.label}</option>;
            })}
          </select>
        </div>
        <div className="ugc-editor-row">
          <label>稀有度</label>
          <select value={form.tier} onChange={function (e) { updateForm(['tier'], e.target.value); }}>
            {TIERS.map(function (t) {
              return <option key={t.value} value={t.value}>{t.label}</option>;
            })}
          </select>
        </div>
        <div className="ugc-editor-row">
          <label>权重</label>
          <input
            type="number" min="0.1" max="10" step="0.1"
            value={form.weight}
            onChange={function (e) { updateForm(['weight'], Number(e.target.value)); }}
            style={{ width: '70px' }}
          />
        </div>
        <div className="ugc-editor-row">
          <label>描述</label>
          <textarea
            value={form.description}
            onChange={function (e) { updateForm(['description'], e.target.value); }}
            placeholder="事件描述文本（用 \\n\\n 分隔段落）"
            rows={8}
          />
        </div>
        <div className="ugc-editor-row">
          <label>标签</label>
          <div className="ugc-tag-area">
            {form.tags.map(function (tag, i) {
              return (
                <span key={i} className="ugc-tag-chip">
                  {tag}
                  <span className="ugc-tag-x" onClick={function () {
                    var next = form.tags.filter(function (_, j) { return j !== i; });
                    updateForm(['tags'], next);
                  }}>x</span>
                </span>
              );
            })}
            <input
              value=""
              placeholder="输入标签按 Enter"
              style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '0.72rem', width: '120px', outline: 'none' }}
              onKeyDown={function (e) {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  var next = form.tags.concat([e.target.value.trim()]);
                  if (next.length <= 20) updateForm(['tags'], next);
                  e.target.value = '';
                }
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  function renderTriggerTab() {
    var t = form.trigger;
    return (
      <div className="ugc-editor-section">
        <div className="ugc-editor-row">
          <label>区域</label>
          <input
            value={t.areas.join(', ')}
            onChange={function (e) {
              var arr = e.target.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
              updateForm(['trigger', 'areas'], arr);
            }}
            placeholder="town_center, harbor_district"
          />
        </div>
        <div className="ugc-editor-row">
          <label>时段</label>
          <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
            {TIME_PHASES.map(function (tp) {
              return (
                <label key={tp} style={{ fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <input
                    type="checkbox"
                    checked={t.time_phase.indexOf(tp) >= 0}
                    onChange={function (e) {
                      var next = e.target.checked
                        ? t.time_phase.concat([tp])
                        : t.time_phase.filter(function (x) { return x !== tp; });
                      updateForm(['trigger', 'time_phase'], next);
                    }}
                  />
                  {TIME_PHASE_LABELS[tp]}
                </label>
              );
            })}
          </div>
        </div>
        <div className="ugc-editor-row">
          <label>概率</label>
          <input
            type="number" min="0" max="1" step="0.01"
            value={t.probability}
            onChange={function (e) { updateForm(['trigger', 'probability'], Number(e.target.value)); }}
            style={{ width: '70px' }}
          />
          <span className="ugc-editor-hint">0~1</span>
        </div>
        <div className="ugc-editor-row">
          <label>每轮一次</label>
          <input type="checkbox" checked={t.once_per_run} onChange={function (e) { updateForm(['trigger', 'once_per_run'], e.target.checked); }} />
        </div>
        <div className="ugc-editor-row">
          <label>全局一次</label>
          <input type="checkbox" checked={t.once_ever} onChange={function (e) { updateForm(['trigger', 'once_ever'], e.target.checked); }} />
        </div>
        <div className="ugc-editor-row">
          <label>轮回范围</label>
          <input type="number" min="0" max="99" value={t.min_loop} onChange={function (e) { updateForm(['trigger', 'min_loop'], Number(e.target.value)); }} style={{ width: '60px' }} />
          <span>~</span>
          <input type="number" min="0" max="99" value={t.max_loop} onChange={function (e) { updateForm(['trigger', 'max_loop'], Number(e.target.value)); }} style={{ width: '60px' }} />
        </div>
        <div className="ugc-editor-row">
          <label>SAN &le;</label>
          <input type="number" value={t.san_lte} onChange={function (e) { updateForm(['trigger', 'san_lte'], e.target.value); }} placeholder="不限" style={{ width: '60px' }} />
        </div>
        <div className="ugc-editor-row">
          <label>SAN &ge;</label>
          <input type="number" value={t.san_gte} onChange={function (e) { updateForm(['trigger', 'san_gte'], e.target.value); }} placeholder="不限" style={{ width: '60px' }} />
        </div>
        <div className="ugc-editor-row">
          <label>人性范围</label>
          <input type="number" value={t.humanity_min} onChange={function (e) { updateForm(['trigger', 'humanity_min'], e.target.value); }} placeholder="min" style={{ width: '60px' }} />
          <span>~</span>
          <input type="number" value={t.humanity_max} onChange={function (e) { updateForm(['trigger', 'humanity_max'], e.target.value); }} placeholder="max" style={{ width: '60px' }} />
        </div>
        <div className="ugc-editor-row">
          <label>最低神话</label>
          <input type="number" value={t.min_mythos} onChange={function (e) { updateForm(['trigger', 'min_mythos'], e.target.value); }} placeholder="不限" style={{ width: '60px' }} />
        </div>
        <div className="ugc-editor-row">
          <label>冷却天数</label>
          <input type="number" min="0" max="99" value={t.cooldown_days} onChange={function (e) { updateForm(['trigger', 'cooldown_days'], Number(e.target.value)); }} style={{ width: '60px' }} />
        </div>
      </div>
    );
  }

  function renderEffectsTab() {
    var entries = Object.entries(form.effects);
    return (
      <div className="ugc-editor-section">
        {entries.map(function (entry, i) {
          return (
            <div key={i} className="ugc-effect-row">
              <select
                value={entry[0]}
                onChange={function (e) {
                  var next = {};
                  Object.keys(form.effects).forEach(function (k) {
                    if (k !== entry[0]) next[k] = form.effects[k];
                  });
                  next[e.target.value] = entry[1];
                  updateForm(['effects'], next);
                }}
                style={{ width: '120px', fontSize: '0.68rem' }}
              >
                {EFFECT_KEYS.map(function (k) {
                  return <option key={k} value={k}>{k}</option>;
                })}
              </select>
              <input
                value={entry[1]}
                onChange={function (e) {
                  var next = { ...form.effects };
                  // Try to parse as number
                  var num = Number(e.target.value);
                  next[entry[0]] = (e.target.value !== '' && !isNaN(num)) ? num : e.target.value;
                  updateForm(['effects'], next);
                }}
                style={{ flex: 1, fontSize: '0.72rem' }}
              />
              <button className="ugc-btn-danger-xs" onClick={function () {
                var next = { ...form.effects };
                delete next[entry[0]];
                updateForm(['effects'], next);
              }}>删除</button>
            </div>
          );
        })}
        <button className="ugc-add-btn" onClick={function () {
          var next = { ...form.effects };
          var key = EFFECT_KEYS.find(function (k) { return !(k in next); }) || 'san';
          next[key] = 0;
          updateForm(['effects'], next);
        }}>+ 添加效果</button>
      </div>
    );
  }

  function renderChoicesTab() {
    return (
      <div className="ugc-editor-section">
        {form.choices.map(function (choice, i) {
          return (
            <div key={i} className="ugc-choice-card">
              <div className="ugc-choice-header">
                <span style={{ fontSize: '0.7rem', color: 'var(--text)' }}>选项 {i + 1}</span>
                <button className="ugc-btn-danger-xs" onClick={function () {
                  var next = form.choices.filter(function (_, j) { return j !== i; });
                  updateForm(['choices'], next);
                }}>删除</button>
              </div>
              <div className="ugc-editor-row">
                <label>ID</label>
                <input value={choice.id} onChange={function (e) {
                  var next = form.choices.slice();
                  next[i] = { ...next[i], id: e.target.value };
                  updateForm(['choices'], next);
                }} />
              </div>
              <div className="ugc-editor-row">
                <label>按钮文字</label>
                <input value={choice.label} onChange={function (e) {
                  var next = form.choices.slice();
                  next[i] = { ...next[i], label: e.target.value };
                  updateForm(['choices'], next);
                }} />
              </div>
              <div className="ugc-editor-row">
                <label>描述文本</label>
                <textarea
                  value={choice.text || ''}
                  onChange={function (e) {
                    var next = form.choices.slice();
                    next[i] = { ...next[i], text: e.target.value };
                    updateForm(['choices'], next);
                  }}
                  rows={3}
                />
              </div>
            </div>
          );
        })}
        <button className="ugc-add-btn" onClick={function () {
          var next = form.choices.concat([{ id: 'choice_' + (form.choices.length + 1), label: '新选项', text: '', effects: {} }]);
          updateForm(['choices'], next);
        }}>+ 添加选项</button>
      </div>
    );
  }

  function renderPreviewTab() {
    return (
      <div className="ugc-editor-section">
        {errors.length > 0 ? (
          <div className="ugc-val-badge fail">验证失败 ({errors.length} 个错误)</div>
        ) : (
          <div className="ugc-val-badge pass">验证通过</div>
        )}
        {errors.length > 0 && (
          <div style={{ marginBottom: '0.6rem' }}>
            {errors.slice(0, 8).map(function (err, i) {
              return <div key={i} className="ugc-val-err">· {err}</div>;
            })}
          </div>
        )}
        <div className="ugc-editor-preview">
          {jsonPreview}
        </div>
      </div>
    );
  }
}
