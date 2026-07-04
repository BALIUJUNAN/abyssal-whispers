// src/systems/npc/socialBranches.js — Trust, redemption, silence, sharing, intimacy, preach
// Extracted from npcSlice.js NPC_RESPONSE case.

import { rand, pick, applySanLoss } from '../../reducers/utils.js';
import { GAME_BALANCE } from '../../state/gameConstants.js';
import { getSanStageFromGD, getSanTextVariant } from '../../reducers/sanReducer.js';
import { getDifficultyNpcTrustMultiplier, getDifficultyNpcSuspicion } from '../../systems/npcDialogue.js';
import { getFakeTrustHint } from '../../systems/sanConsequenceChain.js';
import { computeNpcFeedback, getTrustTierInfo } from '../../systems/npcFeedback.js';
import { getNpcTrust, setNpcTrust, modHumanity, addRunMemory, narrApInsufficient } from '../../utils/appHelpers.js';
import { checkTrustGate } from '../../utils/trustGates.js';
import { hasClueId, resolveClueName } from '../../utils/clueNameMap.js';
import { setCorruptionFlag } from '../../reducers/npcReducer.js';
import { propagateTrustChange, propagateFactionStanding } from '../../systems/npcRelationshipSystem.js';
import { checkObjCompletion } from '../../reducers/objectiveReducer.js';
import { _warnTrustDrop } from './npcResponseDispatcher.js';

export function _executeTrustUp(s, npc, trust, ns, c, ctx) {
  // Daily limit: each NPC can only gain trust once per day
  if (s._dailyTrustGains && s._dailyTrustGains[npc.name]) {
    c.narr('system', npc.name + '今天已经对你敞开心扉了。也许明天再来，关系会更进一步。');
    s.pendingNpc = null;
    return;
  } else if (s.ap < 1) {
    c.narr('system', '你需要行动点来深入交谈。（需要1 AP）');
    s.pendingNpc = null;
    return;
  }
  var GD = ctx.GD;
  // Feature 2: High difficulty suspicion — NPC may refuse at difficulty >= 7
  var _trustMult = getDifficultyNpcTrustMultiplier(s.difficultyLevel);
  var _suspicion = getDifficultyNpcSuspicion(s.difficultyLevel);
  if (_suspicion > 0 && (c.rng ? c.rng.next() : Math.random()) < _suspicion * 0.15) {
    c.narr('system', npc.name + '看着你，似乎在犹豫什么。' + (s.difficultyLevel >= 13 ? '现在不是合适的时候。' : '今天……不太方便。'));
    s.pendingNpc = null;
    return;
  }
  // Trust gate: levels 3/4/5 require progression conditions
  var _gateMsg = checkTrustGate(trust + 1, s, npc.name);
  if (_gateMsg) {
    c.narr('system', npc.name + '似乎想对你说些什么，但犹豫了。' + _gateMsg);
    s.pendingNpc = null;
    return;
  }
  if (ns.corrupted && (c.rng ? c.rng.next() : Math.random()) < 0.6) {
    c.narr('system', npc.name + '似乎很热情地回应你，但你隐约感到有些不对劲。');
    s.pendingNpc = null;
    return;
  }
  // SAN consequence: level 5+ may show fake trust hint (trust doesn't actually increase)
  var _sanStage = getSanStageFromGD(s.san);
  var _fakeTrustHint = _sanStage.level >= 5 ? getFakeTrustHint(npc.name, _sanStage.level, c.rng) : null;
  if (_fakeTrustHint) {
    // Show fake trust gain message; deduct AP but don't actually increase trust
    s.ap -= 1;
    if (!s._dailyTrustGains) s._dailyTrustGains = {};
    s._dailyTrustGains[npc.name] = 'talk';
    c.narr('system', _fakeTrustHint.text, { isEffect: true });
    c.narr('system', npc.name + '似乎更放松了一些。（你感觉是这样。）', { isEffect: true });
    // Flag for systemSlice.after to apply AP steal consequence
    s._pendingSanConsequence = { type: 'fake_trust', npc: npc.name };
    s.pendingNpc = null;
    return;
  }
  s.ap -= 1;
  // Feature 2: Difficulty trust multiplier — high difficulty = less trust per interaction
  var _gain = Math.max(0, Math.round(1 * _trustMult));
  var _newTrust = Math.min(5, trust + _gain);
  setNpcTrust(s, npc.name, _newTrust);
  propagateTrustChange(npc.name, _gain, s, c);
  propagateFactionStanding(npc.name, _gain, s);
  if (!s._dailyTrustGains) s._dailyTrustGains = {};
  s._dailyTrustGains[npc.name] = 'talk';
  for (var lv = trust + 1; lv <= _newTrust; lv++) {
    var layer = npc.trust_layers ? npc.trust_layers.find(function (l) { return l.level === lv; }) : null;
    if (layer && layer.unlocks)
      layer.unlocks.forEach(function (u) {
        if (!hasClueId(s.clues, u)) {
          var _rn = resolveClueName(u);
          s.clues.push({ id: u, name: _rn || u });
        }
      });
  }
  // NPC feedback: tier change = strong, same-tier = subtle
  var _fb = computeNpcFeedback({ [npc.name]: trust }, { [npc.name]: _newTrust }, 'TALK_NPC');
  for (var f = 0; f < _fb.length; f++) {
    if (_fb[f].tierChanged) {
      // Cross-tier: full feedback with audio
      c.narr('system', _fb[f].message, { isEffect: true });
      c.effects.push({ type: 'AUDIO_PLAY', id: 'trust_tier_change' });
    } else if (_fb[f].delta >= 0) {
      // Same-tier gain: quiet single-line
      c.narr('system', npc.name + '似乎更放松了一些。', { isEffect: true });
    }
    // Same-tier loss: handled by existing narr above, no extra noise
  }
  modHumanity(s, 3, '与' + npc.name + '建立真诚的联系', c.rng);
  addRunMemory(s, npc.name + '开始相信你。', 'npc');
  // Keep dialog open with updated trust & layer
  var newLayer = npc.trust_layers
    ? npc.trust_layers.find(function (l) { return l.level === _newTrust; }) || npc.trust_layers[0]
    : null;
  s.pendingNpc = { npc: npc, trust: _newTrust, layer: newLayer };
}

export function _executeGetItem(s, npc, trust, c) {
  if (npc.secrets && npc.secrets.length > trust) {
    var secret = npc.secrets[Math.min(trust, npc.secrets.length - 1)];
    c.narr('system', npc.name + '低声告诉你："' + secret + '"');
    // npc.secrets contains narrative text, not clue IDs — do NOT push into s.clues
    // Corruption triggers: asking NPC for info sets flags
    if (npc.name === '玛莎·格雷' && trust >= 2)
      setCorruptionFlag(s, 'player_asked_harbor_watch');
    if (npc.name === '老费舍' && trust >= 2)
      setCorruptionFlag(s, 'player_insisted_fisher_explain_tide');
    if (npc.name === '伊莎贝拉·韦伯' && trust >= 3)
      setCorruptionFlag(s, 'player_accused_isabella_heretic');
  } else {
    c.narr('system', npc.name + '暂时没有更多信息了。');
  }
}

export function _executeRedeem(s, npc, trust, c, ctx) {
  var GD = ctx.GD;
  var npcRedemptionMap = {
    '希尔达·莫里斯': 'hilda_morris',
    老费舍: 'old_fisher',
    '伊莎贝拉·韦伯': 'isabella_weber',
    '约书亚·布莱克': 'joshua_black',
  };
  var rKey = npcRedemptionMap[npc.name];
  var redemption = GD.implementation_notes?.npc_redemption?.characters?.[rKey];
  if (redemption) {
    c.narr('system', redemption.redemption_text);
    setNpcState(s, npc.name, {
      ...getNpcState(s, npc.name),
      corrupted: false,
      redeemed: true,
    });
    c.bt.redeemed_npcs = (c.bt.redeemed_npcs || 0) + 1;
    modHumanity(s, 15, '选择自己承担代价，救赎' + npc.name, c.rng);
  } else {
    c.narr('system', '你尝试与' + npc.name + '建立更深的联系，但对方的状态似乎无法挽回。');
  }
}

export function _executeSilence(s, c) {
  var GD = s._GD;
  var silenceEntries =
    GD.implementation_notes?.philosophical_mechanics?.silence_is_choice
      ?.silence_journal_entries || [];
  c.narr(
    'system',
    silenceEntries.length > 0 ? pick(silenceEntries, c.rng) : '你没有回答。沉默也是一种回答。'
  );
  applySanLoss(s, 1);
  modHumanity(s, -5, '在沉默面前隐瞒真相', c.rng);
  addRunMemory(s, '你没有回答。沉默也被记录了。', 'humanity');
}

export function _executeShareFood(s, npc, trust, c, ctx) {
  var GD = ctx.GD;
  if (s._dailyTrustGains && s._dailyTrustGains[npc.name]) {
    c.narr('system', npc.name + '今天已经接受过你的心意了。明天再来吧。');
    return;
  } else if (s.ap < 1) {
    c.narr('system', '你需要行动点来照顾对方。（需要1 AP）');
    return;
  } else if ((s.food || 0) < 1) {
    c.narr('system', '你没有食物可以分享了。');
    return;
  }
  // Check trust gate before consuming resources
  var curTrust = getNpcTrust(s, npc.name);
  var gate = checkTrustGate(curTrust + 1, s, npc.name);
  if (gate) {
    c.narr('system', npc.name + '看着你递来的食物，摇了摇头。' + gate);
    return;
  }
  s.ap -= 1;
  s.food--;
  var npcResourceMap = {
    '约书亚·布莱克': 'joshua',
    '汤米·陈': 'tommy',
    '希尔达·莫里斯': 'hilda',
    老费舍: 'old_fisher',
  };
  var rKey = npcResourceMap[npc.name];
  var foodChoices = GD.systems?.resources?.resources?.food?.usage_choices || [];
  var choice_data = foodChoices.find(function (x) { return x.target === rKey; });
  if (choice_data) {
    c.narr('system', choice_data.description || '你把食物分给了' + npc.name + '。');
    if (choice_data.humanity_impact)
      modHumanity(s, choice_data.humanity_impact, '把食物分给' + npc.name, c.rng);
    if (choice_data.effect) c.narr('system', choice_data.effect);
  } else {
    c.narr('system', '你把食物分给了' + npc.name + '。对方默默接了过去。');
    modHumanity(s, 2, '把食物分给' + npc.name, c.rng);
  }
  var newTrust = Math.min(5, curTrust + 1);
  setNpcTrust(s, npc.name, newTrust);
  propagateTrustChange(npc.name, 1, s, c);
  propagateFactionStanding(npc.name, 1, s);
  if (!s._dailyTrustGains) s._dailyTrustGains = {};
  s._dailyTrustGains[npc.name] = 'food';
  addRunMemory(s, '你把食物分给了' + npc.name + '。', 'npc');
  // Update dialog with new trust
  var newLayer = npc.trust_layers
    ? npc.trust_layers.find(function (l) { return l.level === newTrust; }) || npc.trust_layers[0]
    : null;
  s.pendingNpc = { npc: npc, trust: newTrust, layer: newLayer };
}

export function _executeLeave(s, c) {
  s.pendingNpc = null;
  s.objectives = checkObjCompletion(s.objectives, s);
}

export function _executeIntimacy(s, npc, c) {
  if (s.ap < 2) {
    c.narr('system', '行动点不足。');
    s.pendingNpc = null;
    return;
  }
  s.ap -= 2;
  c.bt.forbidden_intimacy_flags = (c.bt.forbidden_intimacy_flags || 0) + 1;
  var sanLoss = rand(3, 8, c.rng);
  applySanLoss(s, sanLoss);
  s.pollution = Math.min(1, (s.pollution || 0) + 0.1);
  c.effects.push({ type: 'AUDIO_PLAY', id: 'loop_pollution' });
  modHumanity(s, -8, '与' + npc.name + '发生了禁忌的亲密', c.rng);
  c.narr(
    'system',
    '你靠近了' +
      npc.name +
      '。你没有问这是否正确。对方没有回答——但也没有退开。SAN -' +
      sanLoss,
    { isSpecial: true }
  );
  s.pendingNpc = null;
}

export function _executePreach(s, npc, trust, ns, c, ctx) {
  if (s.ap < 2) {
    c.narr('system', '行动点不足（需要2AP）。');
    s.pendingNpc = null;
    return;
  }
  s.ap -= 2;
  var cultSkill = s.skills['神秘学'] || s.skills['话术'] || 20;
  var roll = rand(1, 100, c.rng);
  if (roll <= cultSkill) {
    c.bt.cult_leader_score = (c.bt.cult_leader_score || 0) + 1;
    setNpcState(s, npc.name, { ...ns, follower: true });
    var sanLoss = rand(2, 6, c.rng);
    applySanLoss(s, sanLoss);
    modHumanity(s, -10, '将' + npc.name + '引入歧途，建立邪教追随', c.rng);
    addRunMemory(s, npc.name + '开始追随你。不是信任——是信仰。', 'npc');
    c.narr(
      'system',
      '【传教】掷骰 ' +
        roll +
        ' / 神秘学' +
        cultSkill +
        ' —— 成功。' +
        npc.name +
        '眼中不再有疑问。你所说的每一个字，都被当作了真理。SAN -' +
        sanLoss,
      { isSpecial: true }
    );
    setNpcTrust(s, npc.name, Math.min(5, getNpcTrust(s, npc.name) + 1));
    propagateTrustChange(npc.name, 1, s, c); propagateFactionStanding(npc.name, 1, s);
  } else {
    c.narr(
      'system',
      '【传教】掷骰 ' +
        roll +
        ' / 神秘学' +
        cultSkill +
        ' —— 失败。' +
        npc.name +
        '后退了一步，表情变得警惕。'
    );
    setNpcTrust(s, npc.name, Math.max(0, getNpcTrust(s, npc.name) - 1));
    propagateTrustChange(npc.name, -1, s, c); propagateFactionStanding(npc.name, -1, s);
  }
  s.pendingNpc = null;
}
