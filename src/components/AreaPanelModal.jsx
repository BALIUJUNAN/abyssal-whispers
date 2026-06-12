// src/components/AreaPanelModal.jsx — 热点点击后弹出的功能面板
// 复用现有 NPCDialog、GamePanels 中的逻辑，以模态窗形式呈现。
//
// 设计参考：Darkest Dungeon 中点击建筑后弹出的功能界面
//   - 左侧：区域/建筑信息 + 插图
//   - 右侧：可用行动列表
//   - 底部：资源消耗提示

const { useState, useEffect, useMemo, useCallback, memo } = React;

export function AreaPanelModal({ hotspot, state, dispatch, onClose }) {
  const [tab, setTab] = useState('actions'); // 'actions' | 'info' | 'npc'

  // 区域信息
  const area = useMemo(() => {
    if (!hotspot.areaId) return null;
    return (GD.areas || GD.module2_areas || []).find((a) => a.id === hotspot.areaId);
  }, [hotspot.areaId]);

  // 区域场景图
  const sceneImage = useMemo(() => {
    if (!hotspot.areaId) return null;
    return getAreaSceneImage(hotspot.areaId, {
      phase: getPhase ? getPhase(state.day) : 'morning',
      visits: (state.visitedAreas || []).filter((a) => a === hotspot.areaId).length,
      pollution: state.pollution || 0,
    });
  }, [hotspot.areaId, state.day, state.pollution, state.visitedAreas]);

  // 该区域的 NPC
  const npcsHere = useMemo(() => {
    return getNpcsHere({ ...state, currentArea: hotspot.areaId || state.currentArea });
  }, [state.day, hotspot.areaId, state.npcStates, state.npcTrust]);

  // 该区域的连接区域
  const conn = useMemo(() => {
    if (!hotspot.areaId) return [];
    return getConnectedAreas(hotspot.areaId, ctx);
  }, [hotspot.areaId, state.currentArea]);

  // 可用行动列表
  const availableActions = useMemo(() => {
    const actions = [];
    const isInArea = state.currentArea === (hotspot.areaId || state.currentArea);
    const isCurrentHotspot = state.currentArea === hotspot.areaId;

    // 探索（需要在该区域内）
    if (hotspot.actions?.includes('explore') && isInArea) {
      actions.push({
        id: 'explore',
        icon: '🔍',
        label: '探索区域',
        cost: '2 AP',
        costAp: 2,
        disabled: state.ap < 2,
        onClick: () => {
          dispatch({ type: 'EXPLORE' });
          onClose();
        },
      });
    }

    // 移动到相邻区域
    if (isCurrentHotspot) {
      conn.forEach((aid) => {
        const a = (GD.areas || GD.module2_areas || []).find((ar) => ar.id === aid);
        if (!a) return;
        const unlocked = isAreaUnlocked(a, state);
        if (!unlocked) return;
        actions.push({
          id: 'move_' + aid,
          icon: '👣',
          label: '前往 ' + getAreaDisplayName(a, state),
          cost: '1 AP',
          costAp: 1,
          disabled: state.ap < 1,
          onClick: () => {
            dispatch({ type: 'MOVE', areaId: aid });
            onClose();
          },
        });
      });
    }

    // NPC 对话
    if (isInArea && npcsHere.length > 0) {
      npcsHere.forEach((npc) => {
        actions.push({
          id: 'talk_' + npc.name,
          icon: '💬',
          label: '与 ' + npc.name + ' 交谈',
          cost: '1 AP',
          costAp: 1,
          disabled: state.ap < 1,
          onClick: () => {
            dispatch({ type: 'TALK_NPC', npc });
            onClose();
          },
        });
      });
    }

    // 买食物（仅镇中心杂货店）
    if (hotspot.id === 'grocery' || (hotspot.id === 'town_center' && isInArea)) {
      const canBuy =
        state.ap >= 1 && (state.money || 0) >= 3 && (state.food || 0) < (state.maxFood || 5);
      actions.push({
        id: 'buy_food',
        icon: '🛒',
        label: '购买食物',
        cost: '1 AP · 3金钱',
        costAp: 1,
        disabled: !canBuy,
        onClick: () => {
          dispatch({ type: 'BUY_FOOD' });
          onClose();
        },
      });
    }

    // 打工
    if (hotspot.actions?.includes('work') && isInArea) {
      actions.push({
        id: 'work',
        icon: '💰',
        label: '打工挣钱',
        cost: '2 AP',
        costAp: 2,
        disabled: state.ap < 2,
        onClick: () => {
          dispatch({ type: 'WORK' });
          onClose();
        },
      });
    }

    // 休息
    if (hotspot.actions?.includes('rest') || hotspot.id === 'tavern') {
      actions.push({
        id: 'rest',
        icon: '🏕',
        label: '结束今日',
        cost: '休息恢复',
        costAp: 0,
        disabled: false,
        onClick: () => {
          dispatch({ type: 'REST' });
          onClose();
        },
      });
    }

    // 切换安全屋
    if (
      hotspot.actions?.includes('switch_safehouse') &&
      typeof getAvailableSafehouses === 'function'
    ) {
      const shs = getAvailableSafehouses(state);
      shs
        .filter((sh) => state.currentSafehouse !== sh.name)
        .forEach((sh) => {
          actions.push({
            id: 'safehouse_' + sh.name,
            icon: '🏠',
            label: '搬到 ' + sh.name,
            cost: '恢复+' + (sh.functions?.san_restore || 0),
            costAp: 0,
            disabled: false,
            onClick: () => {
              dispatch({ type: 'SWITCH_SAFEHOUSE', safehouse: sh.name });
              onClose();
            },
          });
        });
    }

    // 如果没有行动且不在该区域 → 显示移动按钮
    if (actions.length === 0 && !isCurrentHotspot && hotspot.areaId) {
      const unlocked = isHotspotUnlocked(hotspot, state);
      if (unlocked) {
        actions.push({
          id: 'go_here',
          icon: '👣',
          label: '前往此处',
          cost: '1 AP',
          costAp: 1,
          disabled: state.ap < 1 || !conn.includes(hotspot.areaId),
          onClick: () => {
            dispatch({ type: 'MOVE', areaId: hotspot.areaId });
            onClose();
          },
        });
      }
    }

    return actions;
  }, [state, hotspot, conn, npcsHere]);

  // ESC 关闭
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // 计算安全屋阶段信息（如果是酒馆）
  const shStage = useMemo(() => {
    if (hotspot.id !== 'tavern') return null;
    return getSafehouseStage(state.safehouseCorruption, ctx);
  }, [hotspot.id, state.safehouseCorruption]);

  return (
    <div
      className="area-panel-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="area-panel-modal">
        {/* 标题栏 */}
        <div className="area-panel-header">
          <div className="area-panel-title-row">
            <span className="area-panel-icon">{hotspot.icon}</span>
            <h2 className="area-panel-title">{hotspot.label}</h2>
            <button className="area-panel-close" onClick={onClose} title="关闭 (Esc)">
              ✕
            </button>
          </div>
          {area && (
            <div className="area-panel-subtitle">
              危险等级：{'★'.repeat(Math.min(3, area.danger_level || 0))}
              {'☆'.repeat(Math.max(0, 3 - (area.danger_level || 0)))}
              {state.currentArea === hotspot.areaId && (
                <span className="area-here-badge">当前位置</span>
              )}
            </div>
          )}
        </div>

        {/* 主内容区 */}
        <div className="area-panel-body">
          {/* 左侧：区域插图 + 描述 */}
          <div className="area-panel-left">
            {sceneImage && (
              <img
                className="area-panel-scene"
                src={sceneImage}
                alt={hotspot.label}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <div className="area-panel-description">{hotspot.description}</div>
            {/* 安全屋详情（仅酒馆） */}
            {shStage && (
              <div className="area-panel-safehouse">
                <div className="safehouse-stage-name">{shStage.name}</div>
                <div className="safehouse-detail">
                  恢复：{shStage.available_functions?.san_recovery || 0} SAN | 污染：
                  {state.safehouseCorruption}%
                </div>
              </div>
            )}
            {/* NPC 列表 */}
            {npcsHere.length > 0 && (
              <div className="area-panel-npcs">
                <div className="area-panel-npcs-title">在此处的人</div>
                {npcsHere.map((npc) => {
                  const trust = state.npcTrust[npc.name] || 0;
                  const ns = state.npcStates[npc.name] || {};
                  const img = getNpcImage(npc.name, state.npcStates);
                  return (
                    <div key={npc.name} className="area-panel-npc-item">
                      {img && (
                        <img
                          className="area-panel-npc-img"
                          src={img}
                          alt={npc.name}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      <div>
                        <div className="area-panel-npc-name">
                          {npc.name}
                          {ns.corrupted && <span className="npc-corrupted-badge">腐蚀</span>}
                        </div>
                        <div className="area-panel-npc-trust">
                          {'★'.repeat(Math.max(0, Math.min(5, trust)))}
                          {'☆'.repeat(Math.max(0, 5 - Math.min(5, trust)))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 右侧：可用行动 */}
          <div className="area-panel-right">
            <div className="area-panel-actions-title">可用行动</div>
            {availableActions.length === 0 && (
              <div className="area-panel-no-actions">
                {state.currentArea !== (hotspot.areaId || '')
                  ? '需要先前往此处才能执行行动'
                  : '当前没有可用行动'}
              </div>
            )}
            <div className="area-panel-actions-list">
              {availableActions.map((action) => (
                <button
                  key={action.id}
                  className={'area-panel-action-btn' + (action.disabled ? ' disabled' : '')}
                  onClick={action.onClick}
                  disabled={action.disabled}
                >
                  <span className="action-icon">{action.icon}</span>
                  <span className="action-label">{action.label}</span>
                  <span className="action-cost">{action.cost}</span>
                </button>
              ))}
            </div>

            {/* 资源概览 */}
            <div className="area-panel-resources">
              <div className="resource-item">
                <span className="resource-label">行动点</span>
                <span className="resource-value">
                  {state.ap}/{state.maxAp}
                </span>
              </div>
              <div className="resource-item">
                <span className="resource-label">SAN</span>
                <span className="resource-value">
                  {state.san}/{state.maxSan}
                </span>
              </div>
              <div className="resource-item">
                <span className="resource-label">食物</span>
                <span className="resource-value">
                  {state.food || 0}/{state.maxFood || 5}
                </span>
              </div>
              <div className="resource-item">
                <span className="resource-label">金钱</span>
                <span className="resource-value">{state.money || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
