// src/systems/explore/madnessEffectSystem.js — Phase 5: Madness consequence mapping
// Extracted from exploreSlice.js (P1-9 decomposition).

import { rand, applySanLoss } from '../../reducers/utils.js';

/**
 * Apply mechanical effects from temporary_madness_table.
 * Maps madness name to in-game consequences.
 */
export function _applyMadnessEffects(mad, s, c, ctx) {
  var name = mad.name || '';
  // Panic flee: lose all remaining AP
  if (name === '恐慌逃跑') {
    s.ap = 0;
    c.narr('system', '你无法控制自己的双腿。剩余行动力耗尽。', { isEffect: true });
  }
  // Hysteria: extra SAN loss
  else if (name === '歇斯底里') {
    var extraSan = rand(1, 3, c.rng);
    applySanLoss(s, extraSan);
    c.narr('system', '你无法停止大笑/大哭。SAN -' + extraSan, { isEffect: true });
  }
  // Paranoia: NPC trust -1 for all known NPCs
  else if (name === '偏执妄想') {
    var npcs = Object.keys(s.npcTrust || {});
    for (var i = 0; i < npcs.length; i++) {
      if ((s.npcTrust[npcs[i]] || 0) > 0) {
        s.npcTrust[npcs[i]] = Math.max(0, s.npcTrust[npcs[i]] - 1);
      }
    }
    if (npcs.length > 0) c.narr('system', '你开始怀疑每一个人。所有NPC信任 -1。', { isEffect: true });
  }
  // Violence: HP loss to self
  else if (name === '暴力发作') {
    s.hp = Math.max(0, s.hp - 3);
    c.narr('system', '你失控了。HP -3。', { isEffect: true });
  }
  // Hallucination: extra SAN loss
  else if (name === '幻觉侵袭') {
    var hallSan = rand(1, 4, c.rng);
    applySanLoss(s, hallSan);
    c.narr('system', '幻觉吞没了你。SAN -' + hallSan, { isEffect: true });
  }
  // Amnesia: lose recent clues (narrative only, don't actually remove)
  else if (name === '失忆症') {
    c.narr('system', '你想不起来了……最近获得的线索变得模糊。（侦查检定 -10）', { isEffect: true });
    s._madnessSkillPenalty = { skill: '侦查', penalty: -10 };
  }
  // Catatonia: narrative only (AP already consumed by the event)
  else if (name === '僵直症') {
    c.narr('system', '你蜷缩在地上，无法动弹。闪避 -50。', { isEffect: true });
    s._madnessSkillPenalty = { skill: '闪避', penalty: -50 };
  }
  // Compulsion: AP cost doubled (flag for next actions)
  else if (name === '强迫行为') {
    c.narr('system', '你开始反复数数。接下来的行动消耗翻倍。', { isEffect: true });
    s._madnessApMultiplier = 2;
  }
  // Phantom pain: all checks -15
  else if (name === '幻痛') {
    c.narr('system', '剧烈的疼痛袭来——但你身上没有伤口。所有检定 -15。', { isEffect: true });
    s._madnessGlobalCheckPenalty = -15;
  }
  // Brief possession: mythos gain + extra SAN loss
  else if (name === '短暂附身') {
    var mythosGain = rand(1, 3, c.rng);
    var possSan = rand(1, 6, c.rng);
    s.mythosLevel = (s.mythosLevel || 0) + mythosGain;
    applySanLoss(s, possSan);
    c.narr('system', '你的嘴说出了不属于你的话。克苏鲁神话 +' + mythosGain + '，SAN -' + possSan, { isEffect: true });
    c.bt.possession_accepted_count = (c.bt.possession_accepted_count || 0) + 1;
  }
}
