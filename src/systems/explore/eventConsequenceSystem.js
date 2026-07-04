// src/systems/explore/eventConsequenceSystem.js — Phases 3-4: Meta effects, quality tier, post-event processing
// Extracted from exploreSlice.js (P1-9 decomposition).

import { pick } from '../../reducers/utils.js';
import { GAME_BALANCE } from '../../state/gameConstants.js';
import { checkObjCompletion } from '../../reducers/objectiveReducer.js';
import { checkChainCompletion } from '../../utils/gameHelpers.js';
import { checkConclusions, checkFalseInterpretations } from '../../reducers/conclusionReducer.js';
import { getMonsterManifestation } from '../../reducers/chapterReducer.js';
import { getAreaCorruptionNarrative } from '../../systems/worldDecay.js';
import { adjustMonsterChance } from '../../systems/firstLoopBalance.js';
import { setNpcTrust, getNpcState, hasClueId, applyDeathResolution, checkWrongInference } from '../../utils/appHelpers.js';
import { resolveClueName } from '../../utils/clueNameMap.js';

// §3.3: Meta event real consequences
export function applyMetaEffect(effectType, state, evt, c) {
  if (!effectType) return;
  switch (effectType) {
    case 'overwrite_save_slot':
      // §3.3: "虚假的存档" — 标记存档槽被覆盖
      state._metaSaveOverwritten = true;
      c.narr('system', '存档已更新为最新版本。你可能失去了什么。', { isSpecial: true });
      break;
    case 'npc_trust_lock_random':
    case 'npc_trust_lock_and_achievement':
      // §3.3: NPC信任锁定为0 + 解锁成就
      var trustNpcs = Object.entries(state.npcTrust || {}).filter(function (kv) {
        return kv[1] >= 3;
      });
      if (trustNpcs.length > 0) {
        var target = c.pick(trustNpcs);
        setNpcTrust(state, target[0], 0);
        state._npcTrustLocked = state._npcTrustLocked || {};
        state._npcTrustLocked[target[0]] = true;
        c.narr(
          'system',
          target[0] + '突然说了一串你听不懂的话。然后沉默了。你感到——有什么东西断裂了。',
          { isSpecial: true }
        );
      }
      if (effectType === 'npc_trust_lock_and_achievement') {
        state._achievements = state._achievements || [];
        if (!state._achievements.includes('achievement_fourth_wall')) {
          state._achievements.push('achievement_fourth_wall');
          c.narr('system', '【成就解锁】打破第四面墙', { isSpecial: true });
        }
      }
      break;
    case 'npc_permanent_disappear':
      // §3.3: "作者的提示" — 随机NPC永久失踪
      var aliveNpcs = Object.entries(state.npcStates || {}).filter(function (kv) {
        return !kv[1].dead;
      });
      if (aliveNpcs.length > 0) {
        var victim = c.pick(aliveNpcs);
        setNpcState(state, victim[0], {
          ...getNpcState(state, victim[0]),
          dead: true,
          disappearance: 'meta_vanish',
        });
        c.narr(
          'system',
          victim[0] + '失踪了。没有人记得他/她是什么时候消失的。好像从来没有存在过。',
          { isSpecial: true }
        );
      }
      break;
    case 'delete_dialogue_branch':
      // §3.3: "选择的消失" — 删除一个未选择的对话分支
      state._deletedBranches = state._deletedBranches || [];
      state._deletedBranches.push({ day: state.day, source: evt.id });
      c.narr('system', '你感到——某种可能性消失了。一条你没有走过的路，现在永远走不了了。', {
        isSpecial: true,
      });
      break;
  }
}

// P1: Quality tier dynamic truncation
// Tier S: full display (no change)
// Tier A: full display (no change)
// Tier B: normal display
// Tier C: first trigger = truncate to 2 sentences; subsequent = generic replacement
var _QT_GENERIC_REPLACEMENT = '你又有一种熟悉的感觉，但你想不起细节了。沃切斯特的日常就是这样。';
export function applyQualityTier(text, evt, state) {
  var qt = evt.quality_tier;
  if (!qt || qt === 'S' || qt === 'A' || qt === 'B') return text;
  // Tier C: check trigger count
  if (qt === 'C') {
    var triggered = state.triggeredEvents || [];
    var count = 0;
    for (var i = 0; i < triggered.length; i++) {
      if (triggered[i] === evt.id) count++;
    }
    if (count >= 2) return _QT_GENERIC_REPLACEMENT;
    // First trigger: truncate to first 2 sentences
    var sentences = text.split(/[。\n]/);
    var result = [];
    for (var j = 0; j < sentences.length && result.length < 2; j++) {
      var s = sentences[j].trim();
      if (s.length > 0) result.push(s);
    }
    return result.join('。') + '。';
  }
  return text;
}

/** Phase 4: Post-event processing — objectives, chains, conclusions, monsters, tracking. */
export function _postExploreProcessing(evt, s, c, GD) {
  s.objectives = checkObjCompletion(s.objectives, s);
  // Event chain progress
  const chains = GD.event_chains || [];
  for (const ch of chains) {
    const seq = ch.sequence || [];
    const idx = seq.indexOf(evt.id);
    if (idx >= 0) {
      const progress = seq.filter(function (eid) {
        return s._triggeredSet ? s._triggeredSet.has(eid) : s.triggeredEvents.includes(eid);
      }).length;
      if (idx < seq.length - 1)
        c.narr('system', '【事件链：' + ch.name + '】进度 ' + progress + '/' + seq.length, {
          isSpecial: true,
        });
    }
  }
  // Area corruption narrative
  const areaNarr = getAreaCorruptionNarrative(s.currentArea, s, c.rng);
  if (areaNarr) c.narr('system', areaNarr, { isSpecial: true });
  checkChainCompletion(s, c.narr);
  checkWrongInference(s, c.narr, GD);
  // Conclusions
  const newConclusions = checkConclusions(s, ctx);
  for (const conc of newConclusions) {
    s.discoveredConclusions.push(conc.id);
    c.narr('system', '【结论达成】' + conc.name, { isSpecial: true });
    c.effects.push({ type: 'AUDIO_PLAY', id: 'clue_found' });
    conc.evidence.forEach(function (e) {
      c.narr('system', '  · ' + e);
    });
    conc.unlocks.forEach(function (u) {
      if (!hasClueId(s.clues, u)) {
        const _rn = resolveClueName(u);
        s.clues.push({ id: u, name: _rn || u });
      }
    });
  }
  // False interpretations
  const falseInts = checkFalseInterpretations(s, ctx, c.rng);
  for (const fi of falseInts)
    c.narr(
      'system',
      '【注意】你隐约觉得"' + fi.interpretation + '"这个想法不太对劲。' + (fi.consequence || ''),
      { isSpecial: true }
    );
  // Monster manifestation
  const adjMonsterChance = adjustMonsterChance(GAME_BALANCE.MONSTER_MANIFEST_CHANCE, s);
  if ((c.rng ? c.rng.next() : Math.random()) < adjMonsterChance) {
    const creature = pick(['deep_ones', 'night_gaunts', 'shoggoth'], c.rng);
    const manifest = getMonsterManifestation(creature, s.day, ctx, c.rng);
    if (manifest) {
      const stageNames = {
        absence: '异常',
        trace: '痕迹',
        influence: '影响',
        partial_presence: '阴影',
        full_presence: '出现',
      };
      c.narr(
        'system',
        '【' + (stageNames[manifest.stage] || '异常') + '】' + manifest.manifestation
      );
    }
  }
  // Behavior tracking
  if (evt.tags) {
    if (evt.tags.includes('fusion')) {
      c.bt.fusion_accepted_count = (c.bt.fusion_accepted_count || 0) + 1;
      c.bt.fusion_and_self_harm_total = (c.bt.fusion_and_self_harm_total || 0) + 1;
    }
    if (evt.tags.includes('possession'))
      c.bt.possession_accepted_count = (c.bt.possession_accepted_count || 0) + 1;
    if (evt.tags.includes('bell') || evt.tags.includes('thirteenth'))
      c.bt.thirteenth_bell_obsession = (c.bt.thirteenth_bell_obsession || 0) + 1;
    if (evt.tags.includes('meta') || evt.tags.includes('loop'))
      c.bt.meta_boundary_breaks = (c.bt.meta_boundary_breaks || 0) + 1;
    if (evt.tags.includes('sea') || evt.tags.includes('tide') || evt.tags.includes('harbor_deep'))
      c.bt.sea_acceptance_flags = (c.bt.sea_acceptance_flags || 0) + 1;
  }
  if (evt.event_classification === '超自然遭遇' || evt.event_classification === '怪物遭遇')
    c.bt.meta_boundary_breaks = (c.bt.meta_boundary_breaks || 0) + 1;
  c.log('探索：' + evt.name);
  if (!s.tutorialSeen.first_explore) s.tutorialSeen = { ...s.tutorialSeen, first_explore: true };
}
