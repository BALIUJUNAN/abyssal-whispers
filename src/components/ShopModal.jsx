// src/components/ShopModal.jsx — In-game shop modal (GD.shops data-driven)
// Shows items from GD.shops[shopId] with trust-gated unlocks.

import React from 'react';
const { useState, useMemo } = React;

/**
 * Get shop definition from GD.
 * @param {string} shopId
 * @param {object} ctx - { GD }
 * @returns {object|undefined}
 */
export function getShopDef(shopId, ctx) {
  if (!ctx || !ctx.GD || !ctx.GD.shops) return undefined;
  return (ctx.GD.shops || []).find(function (s) { return s.id === shopId; });
}

/**
 * Check if a shop item is unlocked for the current player state.
 * @param {object} item - shop item definition
 * @param {object} state - game state
 * @returns {boolean}
 */
export function isShopItemUnlocked(item, state) {
  if (!item.unlock_trust) return true;
  // Find NPC trust level - item.unlock_trust can be "NPC名>=N" or just a number threshold
  var threshold = parseInt(item.unlock_trust);
  if (isNaN(threshold)) return true;
  // If it's a simple number threshold, check if any NPC trust meets it
  var trusts = Object.values(state.npcTrust || {});
  return trusts.some(function (t) { return t >= threshold; });
}

export function ShopModal({ open, shopId, onClose, state, ctx, onPurchase }) {
  if (!open || !shopId) return null;

  var shopDef = getShopDef(shopId, ctx);
  if (!shopDef) return null;

  var canAfford = function (price) {
    return (state.money || 0) >= price;
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: '#1a1612', border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 8, padding: '1.5rem', maxWidth: 420, width: '90%',
        maxHeight: '70vh', overflowY: 'auto',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
          <h3 style={{ margin: 0, color: '#e0d5c0', fontSize: 16 }}>{shopDef.name}</h3>
          <span style={{ color: 'var(--gold)', fontSize: 13 }}>
            💰 {state.money || 0}
          </span>
        </div>
        <div style={{ fontSize: 11, color: '#a89a85', marginBottom: '0.8rem', lineHeight: 1.5 }}>
          {shopDef.description}
        </div>

        {shopDef.items && shopDef.items.map(function (item) {
          var unlocked = isShopItemUnlocked(item, state);
          var affordable = canAfford(item.price);
          var canBuy = unlocked && affordable;
          return (
            <div key={item.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '6px 0', opacity: unlocked ? 1 : 0.4,
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: canBuy ? '#e0d5c0' : '#666' }}>
                  {item.name}
                </div>
                <div style={{ fontSize: 10, color: '#a89a85' }}>
                  {item.id === 'food_ration' ? '食物+1' :
                   item.id === 'bandage' ? 'HP+2' :
                   item.id === 'flashlight' ? '光源' :
                   item.id === 'glowing_mushroom' ? '致幻/光源' : item.id}
                </div>
              </div>
              <button
                className="btn btn-sm"
                disabled={!canBuy}
                onClick={() => {
                  if (onPurchase) onPurchase(shopId, item);
                }}
                style={{
                  opacity: canBuy ? 1 : 0.5,
                  minWidth: '4rem',
                }}
              >
                💰 {item.price}
              </button>
            </div>
          );
        })}

        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <button className="btn btn-sm" onClick={onClose} style={{ opacity: 0.7 }}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
