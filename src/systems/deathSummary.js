// src/systems/deathSummary.js — Death summary page: 4-section narrative structure
// Section 1: 你如何死去 (How you died)
// Section 2: 你本轮发现了什么 (What you discovered this loop)
// Section 3: 世界因此改变了什么 (How the world changed)
// Section 4: 下一轮你可以尝试什么 (What you can try next loop)

/**
 * Build a 4-section death summary for the death/ending screen.
 * @param {object} state     - game state at time of death
 * @param {object} deathCtx  - from resolveDeath()
 * @param {object} ctx       - { GD }
 * @returns {{ section1, section2, section3, section4, meta }}
 */
export function buildDeathSummary(state, deathCtx, ctx) {
  const { GD } = ctx;
  const loop = state.loopCount || 0;

  return {
    meta: {
      cause: deathCtx?.type || 'unknown',
      mode: deathCtx?.mode || 'unknown',
      area: state.currentArea || '未知',
      day: state.day || 1,
      loop,
    },

    // ── 第一段：你如何死去 ──
    section1: _buildHowYouDied(state, deathCtx, ctx),

    // ── 第二段：你本轮发现了什么 ──
    section2: _buildWhatYouDiscovered(state, ctx),

    // ── 第三段：世界因此改变了什么 ──
    section3: _buildHowWorldChanged(state, deathCtx, ctx),

    // ── 第四段：下一轮你可以尝试什么 ──
    section4: _buildWhatToTryNext(state, deathCtx, ctx),
  };
}

// ═══════════════════════════════════════════════════════
// Section 1: 你如何死去
// ═══════════════════════════════════════════════════════

function _buildHowYouDied(state, deathCtx, ctx) {
  const label = _getDeathCauseLabel(deathCtx);
  const narrative = deathCtx?.finalText || '你的故事在这里中断了。';
  const area = state.currentArea || '某处';
  const day = state.day || 1;
  const mode = deathCtx?.mode || 'unknown';

  // Narrative lead: atmospheric, never exposes "san <= 0"
  const narrativeLead = _getNarrativeLead(mode, label, area, day);

  // System line: smaller, factual, below the narrative
  const factors = [];
  if (state.food <= 0) factors.push('饥饿致死');
  if (_countDarkActions(state) >= 3) factors.push('多次暗黑行为');
  if ((state.pollution || 0) > 0.5) factors.push('高污染状态');
  if ((state.san || 0) < 20) factors.push('持续低SAN');
  const dayLimit = state.day > 28;
  if (dayLimit) factors.push('超过28天时限');
  if (factors.length === 0) factors.push(mode === 'san' ? '理智耗尽' : '生命值归零');

  return {
    title: '你如何死去',
    // Narrative layer (big, atmospheric)
    narrativeLead,
    narrative,
    // System layer (small, factual, below)
    causeLabel: label,
    factors,
    context: {
      day,
      area: _areaName(area),
      loop: state.loopCount || 0,
    },
  };
}

function _getNarrativeLead(mode, label, area, day) {
  if (mode === 'san') {
    return '你不是死于伤口。你只是无法继续解释这个世界了。';
  }
  if (mode === 'hybrid') {
    return '你的身体和意识不再属于同一个人。它们各自选择了不同的终点。';
  }
  // HP death
  const leads = {
    drowning: '水没有给你选择的余地。',
    bleeding: '疼痛在某个时刻停了。那才是最糟的部分。',
    infection: '你以为那只是一个小伤口。',
    starvation: '饥饿不是疼痛。是一种空洞。它从内部开始。',
    falling: '坠落比你想象的安静。',
    darkness_taken: '灯灭了。你摸了摸口袋。火柴没了。',
  };
  return leads[label] || '你的身体停止了运作。不是某个特定的原因——只是磨损。';
}

// ═══════════════════════════════════════════════════════
// Section 2: 你本轮发现了什么
// ═══════════════════════════════════════════════════════

function _buildWhatYouDiscovered(state, ctx) {
  const clues = state.clues || [];
  const conclusions = state.discoveredConclusions || [];
  const areas = state.visitedAreas || [];
  const npcs = Object.entries(state.npcTrust || {}).filter(([, v]) => v > 0);
  const knowledge = state.retainedKnowledge || [];

  const discoveries = [];

  // Clues
  if (clues.length > 0) {
    const clueNames = clues.slice(0, 5).map(c => c.name || c.id || '未知线索');
    discoveries.push({
      type: 'clues',
      label: '线索',
      count: clues.length,
      items: clueNames,
      summary: '你找到了' + clues.length + '条线索' + (clueNames.length > 0 ? '：' + clueNames.slice(0, 3).join('、') + (clues.length > 3 ? '……' : '') : '') + '。',
    });
  }

  // Conclusions
  if (conclusions.length > 0) {
    discoveries.push({
      type: 'conclusions',
      label: '推论',
      count: conclusions.length,
      summary: '你推导出了' + conclusions.length + '条结论。',
    });
  }

  // NPCs
  if (npcs.length > 0) {
    const trusted = npcs.filter(([, v]) => v >= 3);
    const names = npcs.slice(0, 4).map(([n]) => n);
    discoveries.push({
      type: 'npcs',
      label: '人际关系',
      count: npcs.length,
      summary: '你和' + names.length + '个人建立了联系'
        + (trusted.length > 0 ? '，其中' + trusted.map(([n]) => n).join('、') + '信任你' : '') + '。',
    });
  }

  // Areas
  if (areas.length > 1) {
    discoveries.push({
      type: 'areas',
      label: '探索',
      count: areas.length,
      summary: '你到访了' + areas.length + '个区域。',
    });
  }

  // Nothing
  if (discoveries.length === 0) {
    discoveries.push({
      type: 'nothing',
      label: '一无所获',
      summary: '你在沃切斯特走了一圈。什么都没有改变。也许这就是最令人不安的部分。',
    });
  }

  return {
    title: '你本轮发现了什么',
    discoveries,
    totals: {
      clues: clues.length,
      conclusions: conclusions.length,
      areas: areas.length,
      npcs: npcs.length,
      knowledge: knowledge.length,
    },
  };
}

// ═══════════════════════════════════════════════════════
// Section 3: 世界因此改变了什么
// ═══════════════════════════════════════════════════════

function _buildHowWorldChanged(state, deathCtx, ctx) {
  const { GD } = ctx;
  const loop = state.loopCount || 0;
  const nextLoop = loop + 1;
  const changes = [];

  // SAN cap
  const loopKey = nextLoop <= 5 ? 'loop_' + nextLoop : 'loop_6_plus';
  const effect = GD.systems?.loop?.loop_count_effects?.[loopKey];
  if (effect) {
    if (effect.san_cap_reduction && effect.san_cap_reduction < 0)
      changes.push({ severity: 'warning', text: '你的SAN上限降低了' + Math.abs(effect.san_cap_reduction) + '点。你的精神承受了不可逆的损伤。' });
    if (effect.pollution_intensity > 0)
      changes.push({ severity: 'warning', text: '沃切斯特的污染强度升至' + Math.round(effect.pollution_intensity * 100) + '%。某些文字开始变得不一样了。' });
    if (effect.description)
      changes.push({ severity: 'flavor', text: effect.description });
  }

  // NPC trust decay
  if (nextLoop >= 3) {
    const decay = Math.min(2, Math.floor(nextLoop / 3));
    changes.push({ severity: 'info', text: 'NPC对你的信任衰减了' + decay + '点。他们隐约记得你——但不是好印象。' });
  }

  // Pollution effects
  const pollution = state.pollution || 0;
  if (pollution >= 0.3 && pollution < 0.7)
    changes.push({ severity: 'info', text: '沃切斯特的文字开始出现轻微扭曲。你不确定是书页的问题还是你的眼睛。' });
  if (pollution >= 0.7)
    changes.push({ severity: 'warning', text: '沃切斯特的文字已经严重扭曲。某些段落完全无法辨认。' });

  // Behavior echoes
  const bt = state.behaviorTracking || {};
  if ((bt.cult_leader_score || 0) >= 3)
    changes.push({ severity: 'warning', text: '你散布的预言在镇民中流传。有些人开始追随你——即使你不认识他们。' });
  if ((bt.betrayed_high_trust_npcs || 0) > 0)
    changes.push({ severity: 'warning', text: '被你背叛的人的记忆渗入了新的循环。他们的警惕不是没有原因的。' });
  if ((bt.meta_boundary_breaks || 0) > 0)
    changes.push({ severity: 'warning', text: '世界的边界出现了裂痕。某些不该存在的东西开始显现。' });

  // Shop unlock
  if (nextLoop >= 5 && (state.loopShopTier || 0) < 1)
    changes.push({ severity: 'positive', text: '轮回商店解锁了新的物品。死亡不是完全没有收获。' });
  if (nextLoop >= 7 && (state.loopShopTier || 0) < 2)
    changes.push({ severity: 'positive', text: '轮回商店再次升级。你可以用结局代币交换更强大的东西。' });

  if (changes.length === 0) {
    changes.push({ severity: 'flavor', text: '世界几乎没有变化。也许这就是最可怕的部分。' });
  }

  return {
    title: '世界因此改变了什么',
    changes,
    endingCoins: state.endingCoins || 0,
  };
}

// ═══════════════════════════════════════════════════════
// Section 4: 下一轮你可以尝试什么
// ═══════════════════════════════════════════════════════

function _buildWhatToTryNext(state, deathCtx, ctx) {
  const loop = state.loopCount || 0;
  const clues = (state.clues || []).length;
  const npcs = Object.keys(state.npcTrust || {}).filter(k => (state.npcTrust[k] || 0) >= 2).length;
  const areas = (state.visitedAreas || []).length;
  const suggestions = [];

  // Based on what they DIDN'T do
  if (clues === 0)
    suggestions.push({ priority: 'high', text: '和镇上的人交谈。他们知道一些你不知道的事。' });
  else if (clues < 3)
    suggestions.push({ priority: 'high', text: '继续收集线索。你还没有看到全貌。' });
  else if ((state.discoveredConclusions || []).length === 0)
    suggestions.push({ priority: 'high', text: '打开笔记本，把线索组合起来。答案可能就在那里。' });

  if (npcs === 0)
    suggestions.push({ priority: 'medium', text: '试着和某个人建立信任。关系比线索更有价值。' });
  else if (npcs < 3)
    suggestions.push({ priority: 'medium', text: '深化你的人际关系。信任度够高时，他们会告诉你秘密。' });

  if (areas <= 3)
    suggestions.push({ priority: 'medium', text: '去你还没去过的地方看看。沃切斯特比你想象的更大。' });

  // Based on HOW they died
  if (deathCtx?.mode === 'san')
    suggestions.push({ priority: 'high', text: '你的精神很脆弱。先去安全的地方恢复SAN值，再考虑冒险。' });
  if (deathCtx?.mode === 'hp')
    suggestions.push({ priority: 'high', text: '保持食物充足，避免高危区域。活着才能继续调查。' });

  if (deathCtx?.type === 'starvation')
    suggestions.push({ priority: 'high', text: '打工赚钱，买够食物再出发。' });
  if (deathCtx?.type === 'madness')
    suggestions.push({ priority: 'high', text: '和NPC交谈可以恢复少量SAN值。安全屋休息也能帮助恢复。' });

  // Based on loop count
  if (loop >= 2 && (state.discoveredConclusions || []).length === 0)
    suggestions.push({ priority: 'medium', text: '你已经有足够的线索了。试着推导结论吧。' });
  if (loop >= 3 && (state.humanityScore ?? 50) < 30)
    suggestions.push({ priority: 'medium', text: '你的人性正在流失。考虑做出更人道的选择。' });

  // Always include one generic hint
  if (suggestions.length === 0)
    suggestions.push({ priority: 'low', text: '这次试试不同的路线。沃切斯特会记住你的选择。' });

  return {
    title: '下一轮你可以尝试什么',
    suggestions: suggestions.slice(0, 4),
    inherited: _buildInheritanceBrief(state),
  };
}

// ═══════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════

function _getDeathCauseLabel(deathCtx) {
  if (!deathCtx) return '未知原因';
  const labels = {
    drowning: '溺水', bleeding: '失血', infection: '感染',
    starvation: '饥饿', falling: '坠落', darkness_taken: '黑暗吞噬',
    physical: '肉体消亡', madness: '疯狂', possession: '附身',
    identity_erasure: '身份抹除', mythos_absorption: '神话吞噬',
    loop_collapse: '循环崩塌', becomes_event: '成为事件',
    mental: '理智崩塌', body_and_self_lost: '身心俱灭',
  };
  return labels[deathCtx.type] || deathCtx.type || '未知';
}

function _areaName(id) {
  const names = {
    town_center: '镇中心', harbor_district: '码头区',
    voxchester_manor: '沃切斯特庄园', whispering_forest: '低语森林',
    catacombs_entrance: '墓穴入口', deep_catacombs: '深层墓穴',
    lighthouse: '灯塔', forbidden_grove: '禁忌树丛',
    ruins_of_yith: '伊斯废墟',
  };
  return names[id] || id || '某处';
}

function _countDarkActions(state) {
  const bt = state.behaviorTracking || {};
  return (bt.self_harm_ritual_count || 0) + (bt.sacred_desecration_count || 0)
    + (bt.cannibalism_count || 0) + (bt.loop_break_attempts || 0);
}

function _buildInheritanceBrief(state) {
  const items = [];
  if ((state.retainedKnowledge || []).length > 0)
    items.push(state.retainedKnowledge.length + '条知识');
  if ((state.clues || []).length > 0)
    items.push(state.clues.length + '条线索残留');
  if ((state.discoveredConclusions || []).length > 0)
    items.push(state.discoveredConclusions.length + '条推论');
  if ((state.endingCoins || 0) > 0)
    items.push(state.endingCoins + '枚结局代币');
  const skills = Object.entries(state.skills || {}).filter(([, v]) => v > 0);
  if (skills.length > 0)
    items.push('技能残留：' + skills.map(([k]) => k).join('、'));
  return items;
}
