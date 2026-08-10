// src/systems/npcFeedback.js — NPC trust change feedback
// Makes NPC trust changes perceptible to the player, not just numbers.

/**
 * Compute NPC trust change feedback.
 * @param {object} oldTrust - { npcName: number } before action
 * @param {object} newTrust - { npcName: number } after action
 * @param {string} actionType - 'TALK_NPC', 'HELP_NPC', 'BETRAY_NPC', etc.
 * @returns {Array<{npc, oldVal, newVal, delta, tier, message, icon}>}
 */
export function computeNpcFeedback(oldTrust, newTrust, actionType) {
  const feedback = [];
  const allNpcs = new Set([...Object.keys(oldTrust || {}), ...Object.keys(newTrust || {})]);

  for (const npc of allNpcs) {
    const ov = oldTrust?.[npc] || 0;
    const nv = newTrust?.[npc] || 0;
    const delta = nv - ov;
    if (delta === 0) continue;

    const tier = _getTrustTier(nv);
    const prevTier = _getTrustTier(ov);
    const tierChanged = tier.id !== prevTier.id;

    feedback.push({
      npc,
      oldVal: ov,
      newVal: nv,
      delta,
      tier: tier.id,
      tierLabel: tier.label,
      tierChanged,
      message: _buildMessage(npc, delta, tier, tierChanged, actionType),
      icon: delta > 0 ? '💚' : '💔',
      color: tier.color,
      pulse: tierChanged, // UI should pulse/flash on tier change
    });
  }

  return feedback;
}

function _getTrustTier(value) {
  if (value <= 0) return { id: 'hostile', label: '敌意', color: '#c0392b', min: -99, max: 0 };
  if (value === 1) return { id: 'wary', label: '警惕', color: '#e67e22', min: 1, max: 1 };
  if (value === 2) return { id: 'neutral', label: '中立', color: '#f39c12', min: 2, max: 2 };
  if (value === 3) return { id: 'friendly', label: '友善', color: '#27ae60', min: 3, max: 3 };
  if (value === 4) return { id: 'trusting', label: '信任', color: '#2ecc71', min: 4, max: 4 };
  return { id: 'devoted', label: '忠诚', color: '#1abc9c', min: 5, max: 5 };
}

function _buildMessage(npc, delta, tier, tierChanged, actionType) {
  if (tierChanged && delta > 0) {
    return npc + '对你的态度升级为「' + tier.label + '」';
  }
  if (tierChanged && delta < 0) {
    return npc + '对你的态度降为「' + tier.label + '」';
  }
  if (delta > 0) return npc + '对你的好感度 +' + delta;
  return npc + '对你的好感度 ' + delta;
}

/**
 * Get trust tier info for display.
 * @param {number} value - trust value
 * @returns {{ id, label, color, description }}
 */
export function getTrustTierInfo(value) {
  const tier = _getTrustTier(value);
  const descriptions = {
    hostile: '这个人对你充满敌意，不愿与你交谈。',
    wary: '这个人对你保持警惕，只愿意进行表面交流。',
    neutral: '这个人对你态度中立，可以进行正常对话。',
    friendly: '这个人把你当朋友，愿意分享更多信息。',
    trusting: '这个人非常信任你，可能会透露重要秘密。',
    devoted: '这个人对你绝对忠诚，愿意为你做任何事。',
  };
  return { ...tier, description: descriptions[tier.id] || '' };
}

/** Light trust-drop warning — only narrates when the relationship tier changes. */
export function warnTrustDrop(c, npcName, oldVal, newVal) {
  var oldTier = getTrustTierInfo(oldVal);
  var newTier = getTrustTierInfo(newVal);
  if (oldTier.id !== newTier.id) {
    c.narr('system', npcName + '对你的态度变成了「' + newTier.label + '」。', { isEffect: true });
  }
}
