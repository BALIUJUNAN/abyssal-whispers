// src/systems/reincarnationDiff.js — Compute what changed between loops
// Shows the player a clear diff of what their new loop looks like.

/**
 * Compute a list of changes between the old (pre-death) state and the new (post-transition) state.
 * @param {object} oldState - state at end of previous loop (before transition)
 * @param {object} newState - state after initLoopState (start of new loop)
 * @param {object} ctx      - { GD }
 * @returns {Array<{type, label, severity, detail}>} list of changes
 */
export function computeReincarnationDiff(oldState, newState, ctx) {
  const { GD } = ctx;
  const changes = [];

  // SAN cap
  const oldMaxSan = oldState.maxSan || 99;
  const newMaxSan = newState.maxSan || 99;
  if (newMaxSan < oldMaxSan)
    changes.push({ type: 'san_cap', label: 'SAN上限降低', severity: 'warning',
      detail: oldMaxSan + ' → ' + newMaxSan });

  // Pollution
  const oldPol = oldState.pollution || 0;
  const newPol = newState.pollution || 0;
  if (newPol > oldPol + 0.01)
    changes.push({ type: 'pollution', label: '污染加深', severity: 'warning',
      detail: Math.round(oldPol * 100) + '% → ' + Math.round(newPol * 100) + '%' });

  // NPC trust
  const oldTrust = oldState.npcTrust || {};
  const newTrust = newState.npcTrust || {};
  const trustChanges = [];
  for (const npc of new Set([...Object.keys(oldTrust), ...Object.keys(newTrust)])) {
    const ov = oldTrust[npc] || 0;
    const nv = newTrust[npc] || 0;
    if (nv < ov) trustChanges.push(npc + ' (' + ov + '→' + nv + ')');
  }
  if (trustChanges.length > 0)
    changes.push({ type: 'trust_decay', label: 'NPC信任衰减', severity: 'info',
      detail: trustChanges.join(', ') });

  // Skills
  const oldSkills = oldState.skills || {};
  const newSkills = newState.skills || {};
  const lostSkills = [];
  for (const [k, v] of Object.entries(oldSkills)) {
    if (v > 0 && (newSkills[k] || 0) < v) lostSkills.push(k + ' (' + v + '→' + (newSkills[k] || 0) + ')');
  }
  if (lostSkills.length > 0)
    changes.push({ type: 'skills', label: '技能衰退', severity: 'info',
      detail: lostSkills.join(', ') });

  // Mythos
  const oldMythos = oldState.mythosLevel || 0;
  const newMythos = newState.mythosLevel || 0;
  if (newMythos < oldMythos)
    changes.push({ type: 'mythos', label: '神秘学知识衰退', severity: 'info',
      detail: oldMythos + ' → ' + newMythos });

  // Shop tier unlock
  const oldTier = oldState.loopShopTier || 0;
  const newTier = newState.loopShopTier || 0;
  if (newTier > oldTier)
    changes.push({ type: 'shop', label: '轮回商店升级', severity: 'positive',
      detail: 'Tier ' + oldTier + ' → Tier ' + newTier });

  // Blessing
  const newBlessings = (newState.activeBlessings || []).filter(b => !(oldState.activeBlessings || []).includes(b));
  for (const b of newBlessings) {
    const blessingData = GD.systems?.loop?.loop_blessings?.[b];
    changes.push({ type: 'blessing', label: '新恩赐', severity: 'positive',
      detail: blessingData?.description || b });
  }

  // Humanity
  const oldH = oldState.humanityScore ?? 50;
  const newH = newState.humanityScore ?? 50;
  if (newH !== oldH)
    changes.push({ type: 'humanity', label: '人性', severity: newH < oldH ? 'warning' : 'positive',
      detail: oldH + ' → ' + newH });

  // Ending coins
  const oldCoins = oldState.endingCoins || 0;
  const newCoins = newState.endingCoins || 0;
  if (newCoins > oldCoins)
    changes.push({ type: 'coins', label: '获得结局代币', severity: 'positive',
      detail: '+' + (newCoins - oldCoins) });

  return changes;
}
