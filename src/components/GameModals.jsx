// src/components/GameModals.jsx - Modal components extracted from app.jsx
// SettingsModal, SaveLoadModal, AchievementGallery
import { Modal } from './GameCommon.jsx';

export function SettingsModal({ open, onClose, settings, onChange, onAchOpen, dispatch }) {
  const update = (key, val) => onChange({ ...settings, [key]: val });
  const toggleA11y = (key) => {
    const val = !settings[key];
    update(key, val);
    if (dispatch)
      dispatch({
        type: 'ACCESSIBILITY_TOGGLE',
        key:
          key === 'visualDistortion'
            ? 'visual_distortion'
            : key === 'flickerEffect'
              ? 'flicker_control'
              : key,
        value: val,
      });
  };
  return (
    <Modal open={open} onClose={onClose} title="设置" width="400px">
      <div className="settings-group-title">音频</div>
      <div className="settings-row">
        <span className="settings-label">主音量</span>
        <input
          type="range"
          className="settings-slider"
          min="0"
          max="100"
          value={settings.volume}
          onChange={(e) => update('volume', Number(e.target.value))}
        />
        <span
          style={{
            fontSize: '0.7rem',
            color: 'var(--text-dim)',
            width: '2.5rem',
            textAlign: 'right',
          }}
        >
          {settings.volume}%
        </span>
      </div>
      <div className="settings-row">
        <span className="settings-label">环境音</span>
        <input
          type="range"
          className="settings-slider"
          min="0"
          max="100"
          value={settings.ambientVolume ?? 80}
          onChange={(e) => update('ambientVolume', Number(e.target.value))}
        />
        <span
          style={{
            fontSize: '0.7rem',
            color: 'var(--text-dim)',
            width: '2.5rem',
            textAlign: 'right',
          }}
        >
          {settings.ambientVolume ?? 80}%
        </span>
      </div>
      <div className="settings-row">
        <span className="settings-label">效果音</span>
        <input
          type="range"
          className="settings-slider"
          min="0"
          max="100"
          value={settings.effectVolume ?? 80}
          onChange={(e) => update('effectVolume', Number(e.target.value))}
        />
        <span
          style={{
            fontSize: '0.7rem',
            color: 'var(--text-dim)',
            width: '2.5rem',
            textAlign: 'right',
          }}
        >
          {settings.effectVolume ?? 80}%
        </span>
      </div>
      <div className="settings-row">
        <span className="settings-label">界面音</span>
        <input
          type="range"
          className="settings-slider"
          min="0"
          max="100"
          value={settings.uiVolume ?? 80}
          onChange={(e) => update('uiVolume', Number(e.target.value))}
        />
        <span
          style={{
            fontSize: '0.7rem',
            color: 'var(--text-dim)',
            width: '2.5rem',
            textAlign: 'right',
          }}
        >
          {settings.uiVolume ?? 80}%
        </span>
      </div>
      <div className="settings-row">
        <span className="settings-label">突袭音效</span>
        <button
          className={'settings-toggle' + (settings.suddenSounds ? ' on' : '')}
          onClick={() => update('suddenSounds', !settings.suddenSounds)}
        />
      </div>
      <div className="settings-group-title">显示</div>
      <div className="settings-row">
        <span className="settings-label">页面缩放</span>
        <input
          type="range"
          className="settings-slider"
          min="100"
          max="140"
          step="5"
          value={settings.pageScale ?? 100}
          onChange={(e) => {
            const v = Number(e.target.value);
            update('pageScale', v);
            var BASE_ZOOM = 1.1;
            document.documentElement.style.zoom = ((v / 100) * BASE_ZOOM).toString();
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';
          }}
        />
        <span
          style={{
            fontSize: '0.7rem',
            color: 'var(--text-dim)',
            width: '2.5rem',
            textAlign: 'right',
          }}
        >
          {settings.pageScale ?? 100}%
        </span>
      </div>
      <div className="settings-row">
        <span className="settings-label">叙事字号</span>
        <div className="font-size-group">
          {[
            ['small', '小'],
            ['medium', '中'],
            ['large', '大'],
          ].map(([k, l]) => (
            <button
              key={k}
              className={'font-size-btn' + (settings.narrativeFontSize === k ? ' active' : '')}
              onClick={() => update('narrativeFontSize', k)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="settings-group-title">效果</div>
      <div className="settings-row">
        <span className="settings-label">减弱动效</span>
        <button
          className={'settings-toggle' + (settings.reducedMotion ? ' on' : '')}
          onClick={() => {
            var next = !settings.reducedMotion;
            update('reducedMotion', next);
            // Sync data attribute on body for CSS targeting
            try {
              document.body.setAttribute('data-reduced-motion', next ? 'true' : 'false');
            } catch (e) {}
          }}
        />
      </div>
      <div
        style={{
          fontSize: '0.65rem',
          color: 'var(--text-dim)',
          marginTop: '0.2rem',
          lineHeight: 1.4,
        }}
      >
        关闭屏幕转场动画与打字机效果，减少视觉运动。
      </div>
      <div className="settings-row">
        <span className="settings-label">视觉抖动</span>
        <button
          className={'settings-toggle' + (settings.visualDistortion ? ' on' : '')}
          onClick={() => toggleA11y('visualDistortion')}
        />
      </div>
      <div className="settings-row">
        <span className="settings-label">闪烁效果</span>
        <button
          className={'settings-toggle' + (settings.flickerEffect ? ' on' : '')}
          onClick={() => toggleA11y('flickerEffect')}
        />
      </div>
      <div className="settings-group-title">SAN污染</div>
      <div className="settings-row">
        <span className="settings-label">视觉污染</span>
        <input
          type="range"
          className="settings-slider"
          min="0"
          max="100"
          value={settings.visualPollution ?? 50}
          onChange={(e) => update('visualPollution', Number(e.target.value))}
        />
        <span
          style={{
            fontSize: '0.7rem',
            color: 'var(--text-dim)',
            width: '2.5rem',
            textAlign: 'right',
          }}
        >
          {settings.visualPollution ?? 50}%
        </span>
      </div>
      <div
        style={{
          fontSize: '0.65rem',
          color: 'var(--text-dim)',
          marginTop: '0.2rem',
          lineHeight: 1.4,
        }}
      >
        扫描线、噪点、色差、barrel distortion、vignette。0=完全关闭。
      </div>
      <div className="settings-row">
        <span className="settings-label">交互污染</span>
        <input
          type="range"
          className="settings-slider"
          min="0"
          max="100"
          value={settings.interactionPollution ?? 50}
          onChange={(e) => update('interactionPollution', Number(e.target.value))}
        />
        <span
          style={{
            fontSize: '0.7rem',
            color: 'var(--text-dim)',
            width: '2.5rem',
            textAlign: 'right',
          }}
        >
          {settings.interactionPollution ?? 50}%
        </span>
      </div>
      <div
        style={{
          fontSize: '0.65rem',
          color: 'var(--text-dim)',
          marginTop: '0.2rem',
          lineHeight: 1.4,
        }}
      >
        选项文字自改写、Hover扭曲、按钮延迟、虚假选项。0=完全关闭。
      </div>
      <div className="settings-row">
        <span className="settings-label">Meta污染</span>
        <input
          type="range"
          className="settings-slider"
          min="0"
          max="100"
          value={settings.metaPollution ?? 50}
          onChange={(e) => update('metaPollution', Number(e.target.value))}
        />
        <span
          style={{
            fontSize: '0.7rem',
            color: 'var(--text-dim)',
            width: '2.5rem',
            textAlign: 'right',
          }}
        >
          {settings.metaPollution ?? 50}%
        </span>
      </div>
      <div
        style={{
          fontSize: '0.65rem',
          color: 'var(--text-dim)',
          marginTop: '0.2rem',
          lineHeight: 1.4,
        }}
      >
        伪造系统通知、存档名污染、第四面墙破裂、Meta文本。0=完全关闭。
      </div>
      <div className="settings-row">
        <span className="settings-label">轻度污染模式</span>
        <button
          className={'settings-toggle' + (settings.lightPollutionMode ? ' on' : '')}
          onClick={() => update('lightPollutionMode', !settings.lightPollutionMode)}
        />
      </div>
      <div
        style={{
          fontSize: '0.65rem',
          color: 'var(--text-dim)',
          marginTop: '0.2rem',
          lineHeight: 1.4,
        }}
      >
        无障碍选项：大幅降低视觉+交互效果，仅保留核心文字污染。
      </div>
      {/* LLM Enhancement Settings */}
      <div className="settings-group-title">AI 叙事增强</div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', margin: '0 0 0.5rem', lineHeight: 1.4 }}>
        接入 GLM-4.7 Flash API，获得动态生成的叙事文本。需联网 + API Key。
      </div>
      <div className="settings-row">
        <span className="settings-label">启用 AI 增强</span>
        <button
          className={'settings-toggle' + (settings.llmEnabled ? ' on' : '')}
          onClick={() => {
            update('llmEnabled', !settings.llmEnabled);
            // Sync to LLM settings storage
            try {
              var llmSettings = JSON.parse(localStorage.getItem('abyssal_whispers_llm') || '{}');
              llmSettings.enabled = !settings.llmEnabled;
              localStorage.setItem('abyssal_whispers_llm', JSON.stringify(llmSettings));
            } catch (e) { /* ignore */ }
          }}
        />
      </div>
      {settings.llmEnabled && (
        <>
          <div className="settings-row">
            <span className="settings-label">API Key</span>
            <input
              type="password"
              className="settings-slider"
              style={{ width: '180px', fontSize: '0.75rem' }}
              placeholder="输入 GLM API Key"
              defaultValue={(() => {
                try { return JSON.parse(localStorage.getItem('abyssal_whispers_llm') || '{}').apiKey || ''; } catch (e) { return ''; }
              })()}
              onBlur={(e) => {
                try {
                  var llmSettings = JSON.parse(localStorage.getItem('abyssal_whispers_llm') || '{}');
                  llmSettings.apiKey = e.target.value;
                  // 不强制覆盖 enabled 状态，保持用户的开关选择
                  localStorage.setItem('abyssal_whispers_llm', JSON.stringify(llmSettings));
                } catch (err) { /* ignore */ }
              }}
            />
          </div>
          <div className="settings-row">
            <span className="settings-label">死亡总结增强</span>
            <button
              className={'settings-toggle' + (settings.llmDeathSummary ? ' on' : '')}
              onClick={() => update('llmDeathSummary', !settings.llmDeathSummary)}
            />
          </div>
          <div className="settings-row">
            <span className="settings-label">NPC 对话增强</span>
            <button
              className={'settings-toggle' + (settings.llmNpcDialogue ? ' on' : '')}
              onClick={() => update('llmNpcDialogue', !settings.llmNpcDialogue)}
            />
          </div>
          <div className="settings-row">
            <span className="settings-label">Meta 异象增强</span>
            <button
              className={'settings-toggle' + (settings.llmMetaCorruption ? ' on' : '')}
              onClick={() => update('llmMetaCorruption', !settings.llmMetaCorruption)}
            />
          </div>
          <div className="settings-row">
            <span className="settings-label">事件描述增强</span>
            <button
              className={'settings-toggle' + (settings.llmEventText ? ' on' : '')}
              onClick={() => update('llmEventText', !settings.llmEventText)}
            />
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', margin: '0.2rem 0 0.5rem', lineHeight: 1.4 }}>
            事件触发时动态润色描述文本。API调用更频繁，仅增强重要事件或低SAN时的事件。
          </div>
        </>
      )}
      {onAchOpen && (
        <>
          <div className="settings-group-title">其他</div>
          <div className="settings-row">
            <span className="settings-label">成就</span>
            <button
              className="btn btn-sm"
              onClick={() => {
                onClose();
                onAchOpen();
              }}
            >
              查看成就
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

export function SaveLoadModal({ open, onClose, state, onLoad, mode, onSaved }) {
  const slots = getAllSlots();
  const autoSlots = slots.filter((s) => s.slotId.startsWith('auto'));
  const manualSlots = slots.filter((s) => s.slotId.startsWith('manual'));
  const formatTime = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return (
      d.toLocaleDateString() +
      ' ' +
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  };
  const renderSlot = (slot) => {
    const isManual = slot.slotId.startsWith('manual');
    const label = isManual
      ? '手动 ' + slot.slotId.split('_')[1]
      : slot.slotId === 'auto_1'
        ? '最近自动'
        : '自动 ' + slot.slotId.split('_')[1];
    if (!slot.exists)
      return (
        <div
          key={slot.slotId}
          className="save-slot empty"
          onClick={() => {
            if (mode === 'save' && isManual && state) {
              manualSave(slot.slotId, state);
              onClose();
              onSaved && onSaved('存档成功');
            } else if (mode === 'save' && !state) {
              alert('无法存档：无游戏状态');
            }
          }}
        >
          <div className="save-slot-label">{label}</div>
          <div className="save-slot-meta">{mode === 'load' ? '（空）' : '点击存档'}</div>
        </div>
      );
    const m = slot.meta || {};
    return (
      <div
        key={slot.slotId}
        className={'save-slot' + (isManual ? ' manual' : ' auto')}
        onClick={() => {
          if (mode === 'save' && isManual) {
            if (confirm('覆盖此存档？')) {
              manualSave(slot.slotId, state);
              onClose();
              onSaved && onSaved('存档成功');
            }
          } else if (mode === 'load') {
            try {
              const loaded = loadSlot(slot.slotId);
              if (loaded && !loaded.incompatible) {
                onLoad(loaded);
                onClose();
              } else if (loaded?.incompatible) {
                alert('存档版本不兼容');
              } else {
                alert('无法读取此存档');
              }
            } catch (e) {
              alert('读取异常: ' + e.message);
            }
          }
        }}
      >
        <div className="save-slot-label">{label}</div>
        <div className="save-slot-meta" style={m._corruptedName ? { color: 'var(--danger2)', fontStyle: 'italic' } : undefined}>
          {m._corruptedName || ('第' + (m.day || '?') + '日 · ' + (m.area || '?') + ' · SAN:' + (m.san || '?'))}
        </div>
        <div className="save-slot-time">{formatTime(slot.timestamp)}</div>
      </div>
    );
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'save' ? '写入调查记录' : '读取调查记录'}
      width="440px"
    >
      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '0.6rem' }}>
        {mode === 'save' ? '手动存档槽位（点击空槽存档）：' : '手动存档：'}
      </div>
      <div className="save-slots-grid">{manualSlots.map(renderSlot)}</div>
      {mode === 'load' && (
        <>
          <div
            style={{
              fontSize: '0.7rem',
              color: 'var(--text-dim)',
              margin: '0.8rem 0 0.4rem',
              borderTop: '1px solid var(--border)',
              paddingTop: '0.5rem',
            }}
          >
            自动存档：
          </div>
          <div className="save-slots-grid">{autoSlots.map(renderSlot)}</div>
        </>
      )}
      <div className="save-io-bar">
        <button
          className="btn btn-sm save-io-btn"
          onClick={() => {
            exportSave();
          }}
        >
          导出存档
        </button>
        <label className="btn btn-sm save-io-btn">
          导入存档
          <input
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files[0];
              if (!f) return;
              const r = new FileReader();
              r.onload = () => {
                const res = importSave(r.result);
                if (res.ok) {
                  onSaved && onSaved('导入成功');
                  onClose();
                } else {
                  alert(res.error);
                }
              };
              r.readAsText(f);
              e.target.value = '';
            }}
          />
        </label>
      </div>
    </Modal>
  );
}

export function AchievementGallery({ open, onClose }) {
  const all = getAllAchievements();
  const data = loadAchievements();
  return (
    <Modal open={open} onClose={onClose} title="成就" width="480px">
      <div className="achievement-gallery">
        {all.map((ach) => {
          const unlocked = data.unlocked.includes(ach.id);
          return (
            <div key={ach.id} className={'achievement-card' + (unlocked ? '' : ' locked')}>
              <div className="achievement-card-icon">{unlocked ? ach.icon : '❓'}</div>
              <div className="achievement-card-info">
                <div className="achievement-card-name">{ach.name}</div>
                <div className="achievement-card-desc">{unlocked ? ach.desc : '???'}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
