// src/systems/deathSummary.js — Death summary page: 4-section narrative + legacy highlights
// Section 1: 你如何死去 (How you died)
// Section 2: 你本轮发现了什么 (What you discovered this loop)
// Section 3: 世界因此改变了什么 (How the world changed)
// Section 4: 下一轮你可以尝试什么 (What you can try next loop)
// Section 5: 遗产亮点 (Legacy highlights — top NPC farewell, key moments)

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

    // ── 遗产亮点：最高信任NPC遗言 + 本轮最佳时刻 ──
    legacy: _buildLegacyHighlights(state, deathCtx, ctx),
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

// ═══════════════════════════════════════════════════════
// Section 5: Legacy Highlights (遗产亮点)
// ═══════════════════════════════════════════════════════

/**
 * Build legacy highlights: NPC farewell + run best moments.
 * Called from buildDeathSummary; result stored in summary.legacy.
 */
function _buildLegacyHighlights(state, deathCtx, ctx) {
  const highlights = [];
  const topNpc = _findTopTrustNpc(state);
  if (topNpc) {
    highlights.push({
      type: 'npc_farewell',
      npc: topNpc.name,
      trust: topNpc.trust,
      tier: topNpc.tier,
      line: topNpc.farewellLine,
      emphasis: true,
    });
  }
  const moments = _findRunBestMoments(state, deathCtx);
  moments.forEach(function (m) { highlights.push(m); });
  const stamp = _buildLoopStamp(state);
  if (stamp) highlights.push(stamp);
  return {
    title: '你留下的痕迹',
    highlights: highlights,
  };
}

/**
 * Find the NPC with highest trust and generate their farewell line.
 * @returns {{ name, trust, tier, farewellLine } | null}
 */
function _findTopTrustNpc(state) {
  const trust = state.npcTrust || {};
  const entries = Object.entries(trust).filter(function ([, v]) { return v > 0; });
  if (entries.length === 0) return null;
  entries.sort(function (a, b) { return b[1] - a[1]; });
  const name = entries[0][0];
  const trustLevel = entries[0][1];
  const tier = trustLevel >= 5 ? 'max' : trustLevel >= 3 ? 'high' : trustLevel >= 1 ? 'low' : 'none';
  const farewellLine = _getNpcFarewell(name, tier, state);
  return { name: name, trust: trustLevel, tier: tier, farewellLine: farewellLine };
}

/**
 * NPC farewell lines by trust tier.
 * These are not what the NPC says during gameplay — they are the "last thing
 * you remember them saying" as you die. Internal, atmospheric, brief.
 */
var _FAREWELL_LINES = {
  '玛莎·格雷': {
    max: '你推开门的时候，她已经把那张桌子擦干净了。桌上放着一杯还冒着热气的酒。\n\n「我给你留了位置。每次都是。」',
    high: '她把一杯酒推到你面前。没有说话。杯沿上有一道盐渍。',
    low: '她在柜台后面看了你一眼。点了点头。像对待任何一个客人。',
  },
  '老费舍': {
    max: '他站在码头尽头，背对着你。海风把他的外套吹起来。\n\n「你要是回不来了，」他没有转身，「鱼还是会来的。潮水不会因为你不在就停下来。」\n\n停了很久。\n\n「但我会注意到。」',
    high: '他从缆绳上解下一段旧绳子，递给你。「结实的。够你用一次。」',
    low: '他没有看你。只是在补他的网。你走的时候，他的手停了一下。',
  },
  '希尔达·莫里斯': {
    max: '她站在画像走廊的尽头。灯灭了一盏，她没有去点。\n\n「你下次来的时候，」她的声音很轻，「门会开着。不是因为我不在乎——是因为我知道你会来。」\n\n她把一样东西塞进你手里。是一把旧钥匙。温热的。',
    high: '她打开门的时候，这次没有退后。只是站在门框里，看着你。\n\n「走廊到了傍晚会很难走。但你已经知道了。」',
    low: '她站在门廊里。门缝在收窄。你在她眼中看到了一种无法命名的东西。',
  },
  '伊莎贝拉·韦伯': {
    max: '她跪在圣坛前。你进来的时候，她没有抬头。\n\n「我为你祈祷了，」她说。声音像纸一样薄。\n\n「但不是向神。」',
    high: '教堂的蜡烛灭了一根。她看了你一眼，然后把它重新点燃。\n\n「有些东西灭了就不该再亮。但这根不一样。」',
    low: '她在圣坛前低着头。你不确定她是否知道你进来了。',
  },
  '约书亚·布莱克': {
    max: '他把灯塔的门从里面打开了。你听到齿轮转动的声音。\n\n「你要是能回来，」他说，「灯会亮着。」\n\n他的手放在门框上。指关节发白。\n\n「灯塔守望者不多了。你算半个。」',
    high: '他递给你一个弹壳。空的。\n\n「留着。不是给你防身用的。是提醒你——有些东西打完了就打完了。」',
    low: '他站在灯塔的楼梯上，看着你离开。没有说话。灯在他身后闪了一下。',
  },
  '伊莱亚斯·沃德': {
    max: '他把你带到镜子前。镜子里的你穿着不同年代的衣服。他看了很久。\n\n「你会回来的，」他说。不是猜测。是诊断。\n\n「但下一次，你可能不再是同一个人。我会做好记录。」\n\n他合上笔记本。封面上多了一行你没见过的字。',
    high: '他合上笔记本，递给你一片药。\n\n「不是给你的。是给你下次醒来的时候。梦的内容你会忘。但身体会记得。」',
    low: '他把你带到门口。「你的认知模式出现了偏移。下次来的时候带上笔记。」',
  },
  '汤米·陈': {
    max: '他把相机递给你。屏幕上是你——但不是现在的你。是好几个你。重叠在一起。\n\n「我把照片都洗了。每一张都有你。」\n\n他把一叠照片放在柜台上。最上面那张，你在笑。\n\n「你笑的次数不多。但我每次都在拍。」',
    high: '他把一张照片塞进你口袋。\n\n「你走了之后我才洗出来的。不知道为什么——每张照片里你的影子都比你先到。」',
    low: '他在柜台后面擦镜头。你走的时候，他举了一下相机，没有按快门。',
  },
  '埃德加·洛夫克拉夫特': {
    max: '他合上笔记本。封面上的标题你上次来的时候没有。\n\n「你的故事会继续的，」他说。\n\n「不是因为有人想听。是因为故事本身不想停。」\n\n他把笔记本放在桌上。你看到扉页上写着你的名字。笔迹不是他的。',
    high: '他翻了翻笔记本。「你上周说的那个细节——关于钟声的方向——我写进去了。」\n\n他合上本子。「有些真实的东西比虚构更可怕。」',
    low: '他在角落里写字。你进来的时候他没有抬头。「坐。我需要一个听众。」',
  },
};

/**
 * Get farewell line for an NPC based on trust tier.
 */
function _getNpcFarewell(npcName, tier, state) {
  var npcLines = _FAREWELL_LINES[npcName];
  if (!npcLines) {
    // Generic fallback for unknown NPCs
    if (tier === 'max') return npcName + '在你离开的时候叫住了你。你没有听清他说了什么。但你知道那是告别。';
    if (tier === 'high') return npcName + '看了你一眼。那个眼神比任何话都长。';
    return null;
  }
  return npcLines[tier] || npcLines.low || null;
}

/**
 * Find the most notable moments from this run.
 */
function _findRunBestMoments(state, deathCtx) {
  var moments = [];
  var bt = state.behaviorTracking || {};

  // Redeemed NPCs
  if ((bt.redeemed_npcs || 0) > 0) {
    moments.push({
      type: 'moment',
      icon: '✦',
      label: '救赎',
      text: '你让某人做出了属于自己的选择。这比任何线索都重要。',
    });
  }

  // High humanity
  var humanity = state.humanityScore ?? 50;
  if (humanity >= 70) {
    moments.push({
      type: 'moment',
      icon: '◎',
      label: '人性',
      text: '你在深渊面前保持了人样。不是所有人都能做到。',
    });
  }

  // Key conclusions
  var conclusions = state.discoveredConclusions || [];
  if (conclusions.length >= 2) {
    moments.push({
      type: 'moment',
      icon: '◈',
      label: '真相',
      text: '你推导出了' + conclusions.length + '条结论。真相的轮廓开始显现。',
    });
  }

  // Dark path
  if ((bt.cannibalism_count || 0) > 0 || (bt.sacred_desecration_count || 0) > 0) {
    moments.push({
      type: 'moment',
      icon: '▼',
      label: '堕落',
      text: '你做了不该做的事。沃切斯特不会忘记。',
      severity: 'dark',
    });
  }

  // Many clues
  if ((state.clues || []).length >= 8) {
    moments.push({
      type: 'moment',
      icon: '◇',
      label: '探索',
      text: '你收集了' + state.clues.length + '条线索。距离拼出全貌只差最后几块。',
    });
  }

  // Self-sacrifice
  if (deathCtx?.mode === 'san' && (state.humanityScore ?? 50) >= 50) {
    moments.push({
      type: 'moment',
      icon: '◉',
      label: '代价',
      text: '你的精神在探索中燃尽了。这不是浪费——这是代价。',
    });
  }

  // Keep max 3 most relevant
  return moments.slice(0, 3);
}

/**
 * Build a loop inheritance stamp (轮回印记).
 */
function _buildLoopStamp(state) {
  var loop = state.loopCount || 0;
  if (loop === 0) return null;
  var items = [];
  if ((state.retainedKnowledge || []).length > 0)
    items.push(state.retainedKnowledge.length + '条知识');
  if ((state.clues || []).length > 0)
    items.push(state.clues.length + '条线索');
  if ((state.discoveredConclusions || []).length > 0)
    items.push(state.discoveredConclusions.length + '条推论');
  if (items.length === 0) return null;
  return {
    type: 'loop_stamp',
    icon: '↻',
    label: '轮回印记',
    text: '你带走了' + items.join('、') + '。世界会记住你来过。',
    loop: loop,
  };
}
