// src/components/CombatPanel.jsx — Combat UI panel for monster encounters
// Renders inside the narrative area when combat is active.

import React from 'react';
import { getCombatActions } from '../systems/combatSystem.js';
const { useState, useMemo } = React;

export function CombatPanel({ combatState, state, dispatch, ctx }) {
  if (!combatState || !combatState.active) return null;

  var isPlayerTurn = combatState.turn === 'player';
  var monsterHpPct = Math.max(0, (combatState.monsterHp / combatState.monsterMaxHp) * 100);
  var playerHpPct = Math.max(0, (state.hp / state.maxHp) * 100);
  var actions = getCombatActions(combatState, state);
  var [selectedItem, setSelectedItem] = useState(null);
  var showItemSelect = selectedItem !== null;

  var handleAction = function (actionType, item) {
    if (!isPlayerTurn) return;
    if (actionType === 'item') {
      if (item) {
        dispatch({
          type: 'COMBAT_ACTION',
          actionType: 'item',
          itemId: item.id,
        });
        setSelectedItem(null);
      } else {
        setSelectedItem({}); // show item selection
      }
      return;
    }
    dispatch({
      type: 'COMBAT_ACTION',
      actionType: actionType,
      itemId: null,
    });
  };

  return (
    <div className="narrative-block combat-panel" style={{
      borderLeft: '3px solid var(--danger)',
      marginBottom: '0.5rem',
      padding: '0.6rem 0.8rem',
      background: 'rgba(180,40,40,0.08)',
    }}>
      {/* Monster info */}
      <div style={{ marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
          <span style={{ color: 'var(--danger2)', fontSize: '0.85rem', fontWeight: 600 }}>
            ⚔ {combatState.creatureName}
          </span>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
            HP {combatState.monsterHp}/{combatState.monsterMaxHp}
          </span>
        </div>
        <div style={{
          height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden', marginBottom: '0.4rem',
        }}>
          <div style={{
            width: monsterHpPct + '%', height: '100%', background: monsterHpPct > 50 ? 'var(--danger)' : 'var(--danger2)',
            transition: 'width 0.3s', borderRadius: 3,
          }} />
        </div>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
          {combatState.monsterDescription}
        </div>
      </div>

      {/* Player HP */}
      <div style={{ marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-dim)', marginBottom: '0.15rem' }}>
          <span>你的状态</span>
          <span>HP {state.hp}/{state.maxHp}</span>
        </div>
        <div style={{
          height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden',
        }}>
          <div style={{
            width: playerHpPct + '%', height: '100%', background: playerHpPct > 50 ? 'var(--accent)' : 'var(--danger)',
            transition: 'width 0.3s', borderRadius: 2,
          }} />
        </div>
      </div>

      {/* Combat log */}
      {combatState.log.length > 0 && (
        <div style={{
          fontSize: '0.62rem', color: 'var(--text-dim)', marginBottom: '0.5rem',
          maxHeight: 80, overflowY: 'auto', padding: '0.3rem',
          background: 'rgba(0,0,0,0.3)', borderRadius: 4,
        }}>
          {combatState.log.slice(-5).map(function (entry, i) {
            return <div key={i} style={{ lineHeight: '1.4', borderBottom: i < combatState.log.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>{entry}</div>;
          })}
        </div>
      )}

      {/* Turn indicator */}
      <div style={{
        fontSize: '0.65rem', color: isPlayerTurn ? 'var(--gold)' : 'var(--danger2)',
        marginBottom: '0.4rem', textAlign: 'center',
      }}>
        {isPlayerTurn ? '👉 你的回合' : '⏳ 敌方回合...'}
      </div>

      {/* Action buttons */}
      {isPlayerTurn && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.3rem' }}>
          {actions.map(function (act) {
            if (act.type === 'item') {
              if (showItemSelect) {
                return (
                  <div key="item_select" style={{ gridColumn: '1/-1' }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', marginBottom: '0.2rem' }}>选择道具：</div>
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                      {(act.items || []).map(function (item) {
                        return (
                          <button key={item.id} className="btn btn-sm" onClick={() => handleAction('item', item)} style={{ fontSize: '0.6rem' }}>
                            {item.name} (×{item.uses > 0 ? item.uses : '∞'})
                          </button>
                        );
                      })}
                      <button className="btn btn-sm" onClick={() => setSelectedItem(null)} style={{ fontSize: '0.6rem', opacity: 0.6 }}>
                        取消
                      </button>
                    </div>
                  </div>
                );
              }
              return (
                <button key={act.type} className="btn btn-sm" onClick={() => handleAction('item')} style={{ fontSize: '0.65rem' }}>
                  {act.icon} {act.label}
                </button>
              );
            }
            return (
              <button key={act.type} className="btn btn-sm" onClick={() => handleAction(act.type)} style={{ fontSize: '0.65rem' }}>
                {act.icon} {act.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
