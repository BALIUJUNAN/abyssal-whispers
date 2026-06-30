// src/reducers/slices/npcSlice.js - Extracted from gameReducer
// TALK_NPC, NPC_RESPONSE

import { rand, d3, clamp, pick, applySanLoss } from '../utils.js';
import { GAME_BALANCE } from '../../state/gameConstants.js';
import { processSanLoss } from '../sanReducer.js';
import { checkObjCompletion } from '../objectiveReducer.js';
import { setCorruptionFlag } from '../npcReducer.js';
import { getFearNpcLine } from '../../systems/fearLens.js';
import { addRunMemory, getNpcTrust, setNpcTrust, modHumanity, getNpcState, setNpcState, narrApInsufficient } from '../../utils/appHelpers.js';
import { computeNpcFeedback, getTrustTierInfo } from '../../systems/npcFeedback.js';
import { getSanTextVariant } from '../sanReducer.js';
import { getNpcDialogueVariant, NPC_CORRUPTION_LINES, getNpcFatigueEffect, getDifficultyNpcTrustMultiplier, getDifficultyNpcSuspicion, getDaySpecificLine, getWeatherLine, getSanLevelLine } from '../../systems/npcDialogue.js';
import { handleNpcMemoryTier } from '../../utils/npcMemory.js';
import { checkTrustGate } from '../../utils/trustGates.js';
import { getNpcsHere } from '../../utils/npcLocation.js';
import { hasClueId, resolveClueName } from '../../utils/clueNameMap.js';
import { getFakeTrustHint, shouldShowFakeTrustHint } from '../../systems/sanConsequenceChain.js';
import { getSanStageFromGD } from '../sanReducer.js';
// v0.9.0: Moral choice engine — reputation propagation + moral tracking
import { processNpcMoralChoice } from '../../systems/moralChoiceEngine.js';
import { propagateTrustChange, propagateFactionStanding } from '../../systems/npcRelationshipSystem.js';
import { NPC_THREAD_QUESTIONS } from '../../data/npcContextualLines.js';

/** Light trust-drop warning — only narrates, no audio. Used for significant drops. */
function _warnTrustDrop(c, npcName, oldVal, newVal) {
  const oldTier = getTrustTierInfo(oldVal);
  const newTier = getTrustTierInfo(newVal);
  if (oldTier.id !== newTier.id) {
    c.narr('system', npcName + '对你的态度变成了「' + newTier.label + '」。', { isEffect: true });
  }
}

export function handleNpcAction(s, action, c, ctx) {
  var GD = ctx.GD;
  switch (action.type) {
    case 'TALK_NPC': {
      if (s.ap < 1) {
        narrApInsufficient(s, c.narr, 1);
        return null;
      }
      s.ap -= 1;
      if (!s._dailyNpcTalks) s._dailyNpcTalks = {};
      s._dailyNpcTalks[npc.name] = s.day;
      // AP 消耗音效反馈
      if (s.ap <= 2 && s.ap > 0) {
        c.effects.push({ type: 'AUDIO_PLAY', id: 'ui_error' });
      } else if (s.ap <= 0) {
        c.effects.push({ type: 'AUDIO_PLAY', id: 'ui_click_forbidden' });
      }
      c.effects.push({ type: 'INCREMENT_STAT', key: 'run_npc_talks' });
      const npc = action.npc;
      const trust = getNpcTrust(s, npc.name);
      const ns = getNpcState(s, npc.name);
      const layer = npc.trust_layers
        ? npc.trust_layers.find((l) => l.level === trust) || npc.trust_layers[0]
        : null;
      s.pendingNpc = { npc, trust, layer };
      // Loop text variants: NPC dialogue changes with loop count
      if (s.loopCount > 0) {
        const npcVariantMap = {
          '玛莎·格雷': 'martha_grey',
          老费舍: 'old_fisher',
          '希尔达·莫里斯': 'hilda_morris',
          '伊莎贝拉·韦伯': 'isabella_weber',
          '约书亚·布莱克': 'joshua_black',
          '伊莱亚斯·沃德': 'elias_ward',
        };
        const variantKey = npcVariantMap[npc.name];
        const variants = variantKey
          ? GD.implementation_notes?.loop_text_variants?.npc_variants?.[variantKey]
          : null;
        if (variants) {
          const loopKey =
            s.loopCount >= GAME_BALANCE.LOOP_TEXT_VARIANT_5 ? 'loop_5_plus' : 'loop_' + s.loopCount;
          const variantText = variants[loopKey];
          if (variantText) c.narr('system', variantText);
        }
      }
      // Phase 7: Corruption-aware NPC dialogue
      {
        const corrVariant = getNpcDialogueVariant(npc.name, trust, s);
        if (corrVariant !== 'normal') {
          const corrLines = NPC_CORRUPTION_LINES[npc.name];
          if (corrLines) {
            const lines = corrVariant === 'heavy_corruption' ? corrLines.heavy : corrLines.light;
            if (lines && lines.length > 0 && (c.rng ? c.rng.next() : Math.random()) < 0.4)
              c.narr(
                'system',
                npc.name + ': "' + pick(lines, c.rng) + '"'
              );
          }
        }
      }
      // Phase 7: NPC fatigue at high loops
      {
        const fatigue = getNpcFatigueEffect(npc.name, s.loopCount, s);
        if (fatigue && (c.rng ? c.rng.next() : Math.random()) < 0.3) {
          c.narr('system', fatigue.text, { isSpecial: true });
          if (fatigue.trustModifier !== 0)
            setNpcTrust(s, npc.name, Math.max(0, getNpcTrust(s, npc.name) + fatigue.trustModifier));
        }
      }
      // Narrative Month: Day-specific and weather-reactive NPC lines
      {
        // Day milestone: key days trigger unique NPC reactions (one per day per NPC)
        var dayLine = getDaySpecificLine(npc.name, s.day);
        if (dayLine && (c.rng ? c.rng.next() : Math.random()) < 0.5) {
          c.narr('system', npc.name + '突然说：' + dayLine, { isSpecial: true });
        }
        // Weather commentary: NPCs react to current weather
        if (s.weather && !dayLine) {
          var weatherLine = getWeatherLine(npc.name, s.weather);
          if (weatherLine && (c.rng ? c.rng.next() : Math.random()) < 0.3) {
            c.narr('system', npc.name + '说：「' + weatherLine + '」');
          }
        }
        // SAN level observation: NPCs notice player's deteriorating mental state
        if (!dayLine && !weatherLine && s.san < 40) {
          var sanLine = getSanLevelLine(npc.name, s.san);
          if (sanLine && (c.rng ? c.rng.next() : Math.random()) < 0.25) {
            c.narr('system', npc.name + '看着你说：「' + sanLine + '」', { isSpecial: true });
          }
        }
      }
      if (ns.corrupted) {
        const corrLoss = processSanLoss(
          2,
          s.inventory.map((i) => i.name),
          s.weather,
          s.day,
          s.difficulty,
          ctx
        );
        if (corrLoss > 0) {
          applySanLoss(s, corrLoss);
          c.narr('system', npc.name + '的状态不对劲。SAN -' + corrLoss);
        }
        if (trust >= 3) modHumanity(s, -5, '明知' + npc.name + '已被腐蚀仍继续利用');
      } else {
        const sanRec = GD.npcs?.find((n) => n.name === npc.name)?.san_recovery_effect;
        if (sanRec && sanRec.normal_chat) {
          if (sanRec.normal_chat.includes('SAN+1')) {
            applySanLoss(s, -1);
            const _sanRecText = getSanTextVariant(
              sanRec.description || '与' + npc.name + '交谈让你感到安慰。SAN +1',
              s.san, pick, ctx, c.rng
            );
            c.narr('san-recovery', _sanRecText);
          } else {
            const _npcChatText = getSanTextVariant(sanRec.description || sanRec.normal_chat, s.san, pick, ctx, c.rng);
            c.narr('system', _npcChatText);
          }
        } else if (trust < 3) {
          const rec = d3() - 1;
          if (rec > 0) {
            applySanLoss(s, -rec);
            c.narr('san-recovery', '与' + npc.name + '交谈让你感到些许安慰。SAN +' + rec);
          }
        }
      }
      // NPC fear line: subtle observation based on prologue fear profile
      if (s.fearTuning && s.fearTuning.primary) {
        const fearLine = getFearNpcLine(npc.name, s, c.rng);
        if (fearLine) c.narr('system', npc.name + '突然说："' + fearLine + '"');
      }
      // NPC 记忆渐进深化系统（数据在 appHelpers.js 模块级，避免每次 TALK_NPC 重分配）
      handleNpcMemoryTier(s, npc, c.narr, c.rng);
      // 对话追问系统：展示可用的追问线（信任≥2 解锁第一层，支持 depth2 分支）
      if (!ns.corrupted && NPC_THREAD_QUESTIONS[npc.name]) {
        var availableThreads = [];
        var allThreads = NPC_THREAD_QUESTIONS[npc.name];
        for (var ti = 0; ti < allThreads.length; ti++) {
          var thread = allThreads[ti];
          var threadState = (s.npcThreads || {})[npc.name + '_' + thread.id];
          if (threadState && threadState.resolved) continue;
          var curDepth = threadState ? threadState.depth : 0;
          // depth 0 → depth 1: show thread entry
          if (curDepth === 0) {
            if (trust >= (thread.trustReq || 2)) {
              availableThreads.push({ thread: thread, nextDepth: 1, branch: null });
            }
          }
          // depth 1 → depth 2: show depth2 text + choices (if any)
          else if (curDepth === 1) {
            var d2 = thread.depth2 || {};
            var d2TrustReq = d2.trustReq || 3;
            if (trust >= d2TrustReq) {
              if (d2.choices && d2.choices.length > 0) {
                // Show branch choices
                for (var ci = 0; ci < d2.choices.length; ci++) {
                  var ch = d2.choices[ci];
                  if (trust >= (ch.trustReq || d2TrustReq)) {
                    availableThreads.push({ thread: thread, nextDepth: 2, branch: ch.branch, choiceText: ch.text });
                  }
                }
              } else {
                // Linear: auto-advance to depth3
                availableThreads.push({ thread: thread, nextDepth: 3, branch: null });
              }
            }
          }
          // depth 2 → depth 3: show branch outcome (if branch chosen) or default depth3
          else if (curDepth === 2) {
            var d3TrustReq = (thread.depth3 && thread.depth3.trustReq) || 4;
            if (trust >= d3TrustReq) {
              var chosenBranch = threadState.branch;
              if (chosenBranch && thread.branches && thread.branches[chosenBranch]) {
                availableThreads.push({ thread: thread, nextDepth: 3, branch: chosenBranch, isOutcome: true });
              } else if (!chosenBranch) {
                // Show default depth3 (no branching was available)
                availableThreads.push({ thread: thread, nextDepth: 3, branch: null, isOutcome: true });
              }
            }
          }
        }
        if (availableThreads.length > 0) {
          s.pendingNpc = Object.assign({}, s.pendingNpc, { availableThreads: availableThreads });
        }
      }
      c.log('与' + npc.name + '对话');
      if (!s.tutorialSeen.first_talk) s.tutorialSeen = { ...s.tutorialSeen, first_talk: true };
      return null;
    }
    case 'NPC_RESPONSE': {
      if (!s.pendingNpc) return null;
      const npc = s.pendingNpc.npc;
      const trust = getNpcTrust(s, npc.name);
      const choice = action.choice;
      const ns = getNpcState(s, npc.name);
      // Feature 2: Difficulty NPC modifier
      var _trustMult = getDifficultyNpcTrustMultiplier(s.difficultyLevel);
      var _suspicion = getDifficultyNpcSuspicion(s.difficultyLevel);
      if (choice === 'trust_up') {
        // Daily limit: each NPC can only gain trust once per day
        if (s._dailyTrustGains && s._dailyTrustGains[npc.name]) {
          c.narr('system', npc.name + '今天已经对你敞开心扉了。也许明天再来，关系会更进一步。');
          s.pendingNpc = null;
        } else if (s.ap < 1) {
          c.narr('system', '你需要行动点来深入交谈。（需要1 AP）');
          s.pendingNpc = null;
        } else {
          // Feature 2: High difficulty suspicion — NPC may refuse at difficulty >= 7
          if (_suspicion > 0 && (c.rng ? c.rng.next() : Math.random()) < _suspicion * 0.15) {
            c.narr('system', npc.name + '看着你，似乎在犹豫什么。' + (s.difficultyLevel >= 13 ? '现在不是合适的时候。' : '今天……不太方便。'));
            s.pendingNpc = null;
          }
          // Trust gate: levels 3/4/5 require progression conditions
          else if (checkTrustGate(trust + 1, s, npc.name)) {
            c.narr('system', npc.name + '似乎想对你说些什么，但犹豫了。' + checkTrustGate(trust + 1, s, npc.name));
            s.pendingNpc = null;
          } else if (ns.corrupted && (c.rng ? c.rng.next() : Math.random()) < 0.6) {
            c.narr('system', npc.name + '似乎很热情地回应你，但你隐约感到有些不对劲。');
            s.pendingNpc = null;
          } else {
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
              return null;
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
            for (let lv = trust + 1; lv <= _newTrust; lv++) {
              const layer = npc.trust_layers ? npc.trust_layers.find((l) => l.level === lv) : null;
              if (layer?.unlocks)
                layer.unlocks.forEach((u) => {
                  if (!hasClueId(s.clues, u)) {
                    const _rn = resolveClueName(u);
                    s.clues.push({ id: u, name: _rn || u });
                  }
                });
            }
            // NPC feedback: tier change = strong, same-tier = subtle
            const _fb = computeNpcFeedback({ [npc.name]: trust }, { [npc.name]: _newTrust }, 'TALK_NPC');
            for (const f of _fb) {
              if (f.tierChanged) {
                // Cross-tier: full feedback with audio
                c.narr('system', f.message, { isEffect: true });
                c.effects.push({ type: 'AUDIO_PLAY', id: 'trust_tier_change' });
              } else if (f.delta >= 0) {
                // Same-tier gain: quiet single-line
                c.narr('system', npc.name + '似乎更放松了一些。', { isEffect: true });
              }
              // Same-tier loss: handled by existing narr above, no extra noise
            }
            modHumanity(s, 3, '与' + npc.name + '建立真诚的联系');
            addRunMemory(s, npc.name + '开始相信你。', 'npc');
            // Keep dialog open with updated trust & layer
            const newLayer = npc.trust_layers
              ? npc.trust_layers.find((l) => l.level === _newTrust) || npc.trust_layers[0]
              : null;
            s.pendingNpc = { npc, trust: _newTrust, layer: newLayer };
          }
        }
      } else if (choice === 'get_item') {
        if (npc.secrets && npc.secrets.length > trust) {
          const secret = npc.secrets[Math.min(trust, npc.secrets.length - 1)];
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
      } else if (choice === 'redeem') {
        const npcRedemptionMap = {
          '希尔达·莫里斯': 'hilda_morris',
          老费舍: 'old_fisher',
          '伊莎贝拉·韦伯': 'isabella_weber',
          '约书亚·布莱克': 'joshua_black',
        };
        const rKey = npcRedemptionMap[npc.name];
        const redemption = GD.implementation_notes?.npc_redemption?.characters?.[rKey];
        if (redemption) {
          c.narr('system', redemption.redemption_text);
          setNpcState(s, npc.name, {
            ...getNpcState(s, npc.name),
            corrupted: false,
            redeemed: true,
          });
          c.bt.redeemed_npcs = (c.bt.redeemed_npcs || 0) + 1;
          modHumanity(s, 15, '选择自己承担代价，救赎' + npc.name);
        } else {
          c.narr('system', '你尝试与' + npc.name + '建立更深的联系，但对方的状态似乎无法挽回。');
        }
      } else if (choice === 'silence') {
        const silenceEntries =
          GD.implementation_notes?.philosophical_mechanics?.silence_is_choice
            ?.silence_journal_entries || [];
        c.narr(
          'system',
          silenceEntries.length > 0 ? pick(silenceEntries, c.rng) : '你没有回答。沉默也是一种回答。'
        );
        applySanLoss(s, 1);
        modHumanity(s, -5, '在' + npc.name + '面前选择沉默，隐瞒真相');
        addRunMemory(s, '你没有回答。沉默也被记录了。', 'humanity');
      } else if (choice === 'share_food') {
        if (s._dailyTrustGains && s._dailyTrustGains[npc.name]) {
          c.narr('system', npc.name + '今天已经接受过你的心意了。明天再来吧。');
        } else if (s.ap < 1) {
          c.narr('system', '你需要行动点来照顾对方。（需要1 AP）');
        } else if ((s.food || 0) < 1) {
          c.narr('system', '你没有食物可以分享了。');
        } else {
          // Check trust gate before consuming resources
          const curTrust = getNpcTrust(s, npc.name);
          const gate = checkTrustGate(curTrust + 1, s, npc.name);
          if (gate) {
            c.narr('system', npc.name + '看着你递来的食物，摇了摇头。' + gate);
          } else {
            s.ap -= 1;
            s.food--;
            const npcResourceMap = {
              '约书亚·布莱克': 'joshua',
              '汤米·陈': 'tommy',
              '希尔达·莫里斯': 'hilda',
              老费舍: 'old_fisher',
            };
            const rKey = npcResourceMap[npc.name];
            const foodChoices = GD.systems?.resources?.resources?.food?.usage_choices || [];
            const choice_data = foodChoices.find((x) => x.target === rKey);
            if (choice_data) {
              c.narr('system', choice_data.description || '你把食物分给了' + npc.name + '。');
              if (choice_data.humanity_impact)
                modHumanity(s, choice_data.humanity_impact, '把食物分给' + npc.name);
              if (choice_data.effect) c.narr('system', choice_data.effect);
            } else {
              c.narr('system', '你把食物分给了' + npc.name + '。对方默默接了过去。');
              modHumanity(s, 2, '把食物分给' + npc.name);
            }
            const newTrust = Math.min(5, curTrust + 1);
            setNpcTrust(s, npc.name, newTrust);
            propagateTrustChange(npc.name, 1, s, c);
            propagateFactionStanding(npc.name, 1, s);
            if (!s._dailyTrustGains) s._dailyTrustGains = {};
            s._dailyTrustGains[npc.name] = 'food';
            addRunMemory(s, '你把食物分给了' + npc.name + '。', 'npc');
            // Update dialog with new trust
            const newLayer = npc.trust_layers
              ? npc.trust_layers.find((l) => l.level === newTrust) || npc.trust_layers[0]
              : null;
            s.pendingNpc = { npc, trust: newTrust, layer: newLayer };
          }
        }
      } else if (choice === 'leave') {
        s.pendingNpc = null;
        s.objectives = checkObjCompletion(s.objectives, s);
      } else if (choice === 'attack') {
        if (s.ap < 2) {
          c.narr('system', '行动点不足（需要2AP）。');
          s.pendingNpc = null;
          return null;
        }
        s.ap -= 2;
        c.effects.push({ type: 'INCREMENT_STAT', key: 'run_combat' });
        const fightSkill = s.skills['格斗'] || s.skills['潜行'] || 20;
        const npcDiff = npc.chapter_1_role === 'core' ? 55 : 40;
        const roll = rand(1, 100, c.rng);
        const success = roll <= fightSkill && roll <= npcDiff;
        if (success) {
          c.bt.direct_kill_count = (c.bt.direct_kill_count || 0) + 1;
          setNpcState(s, npc.name, { ...ns, dead: true, killedByPlayer: true });
          const sanLoss = rand(4, 12, c.rng);
          applySanLoss(s, sanLoss);
          modHumanity(s, -20, '亲手杀害了' + npc.name);
          addRunMemory(s, '你杀了' + npc.name + '。', 'death');
          c.narr(
            'system',
            '【攻击】掷骰 ' +
              roll +
              ' / 格斗' +
              fightSkill +
              ' —— 成功！' +
              npc.name +
              '倒下了。SAN -' +
              sanLoss,
            { isSpecial: true }
          );
          s.pendingNpc = { ...s.pendingNpc, postKill: true };
        } else {
          const dmg = rand(2, 8, c.rng);
          s.hp = Math.max(0, s.hp - dmg);
          { const _old = getNpcTrust(s, npc.name); setNpcTrust(s, npc.name, Math.max(0, _old - 2)); _warnTrustDrop(c, npc.name, _old, Math.max(0, _old - 2));
            propagateTrustChange(npc.name, -2, s, c); propagateFactionStanding(npc.name, -2, s); }
          c.narr(
            'system',
            '【攻击】掷骰 ' +
              roll +
              ' / 格斗' +
              fightSkill +
              ' —— 失败！' +
              npc.name +
              '激烈反抗。HP -' +
              dmg
          );
          if ((c.rng ? c.rng.next() : Math.random()) < 0.5) {
            setNpcState(s, npc.name, { ...ns, fled: true });
            c.narr('system', npc.name + '惊恐地逃走了。你可能再也找不到他了。');
          }
          s.pendingNpc = null;
        }
      } else if (choice === 'post_kill_hide') {
        c.bt.clean_kill_pattern = (c.bt.clean_kill_pattern || 0) + 1;
        if (s.ap >= 1) {
          s.ap -= 1;
          c.narr('system', '你花了一些时间处理现场。痕迹被抹去了。');
        } else {
          c.narr('system', '你没有时间仔细处理，但你尽力隐藏了能隐藏的一切。');
        }
        applySanLoss(s, 2);
        modHumanity(s, -5, '冷静地隐藏了' + npc.name + '的尸体');
        s.pendingNpc = null;
      } else if (choice === 'post_kill_cannibal') {
        c.bt.cannibalism_count = (c.bt.cannibalism_count || 0) + 1;
        s.food = Math.min(s.maxFood, (s.food || 0) + 2);
        s.starvationDays = 0; // 饥饿解除
        const sanLoss = rand(8, 20, c.rng);
        applySanLoss(s, sanLoss);
        modHumanity(s, -30, '食用了' + npc.name + '的肉体');
        addRunMemory(s, '你吃了' + npc.name + '。饥饿比道德更真实。', 'death');
        c.narr('system', '你做了无法挽回的事。食物+2。某种东西在你体内扎了根。SAN -' + sanLoss, {
          isSpecial: true,
        });
        s.pendingNpc = null;
      } else if (choice === 'post_kill_leave') {
        s.pendingNpc = null;
        const witnesses = getNpcsHere(s).filter((n2) => n2.name !== npc.name);
        if (witnesses.length > 0 && (c.rng ? c.rng.next() : Math.random()) < 0.4) {
          c.narr('system', '你匆忙离开了。但愿没有人注意到你的行踪。');
        }
      } else if (choice === 'incite') {
        if (s.ap < 2) {
          c.narr('system', '行动点不足（需要2AP）。');
          s.pendingNpc = null;
          return null;
        }
        s.ap -= 2;
        const socialSkill = s.skills['话术'] || s.skills['心理学'] || 25;
        const roll = rand(1, 100, c.rng);
        if (roll <= socialSkill) {
          c.bt.npc_deaths_by_manipulation = (c.bt.npc_deaths_by_manipulation || 0) + 1;
          setNpcState(s, npc.name, { ...ns, dead: true, manipulatedDeath: true });
          const sanLoss = rand(3, 8, c.rng);
          applySanLoss(s, sanLoss);
          modHumanity(s, -15, '操纵导致' + npc.name + '的死亡');
          addRunMemory(s, '你说了一些话。' + npc.name + '走向了危险。', 'death');
          c.narr(
            'system',
            '【陷害】掷骰 ' +
              roll +
              ' / 话术' +
              socialSkill +
              ' —— 成功。' +
              npc.name +
              '对你深信不疑，走向了你指出的"线索"。几天后，人们在码头发现了尸体。SAN -' +
              sanLoss,
            { isSpecial: true }
          );
        } else {
          c.narr(
            'system',
            '【陷害】掷骰 ' +
              roll +
              ' / 话术' +
              socialSkill +
              ' —— 失败。' +
              npc.name +
              '看穿了你的意图。'
          );
          setNpcTrust(s, npc.name, Math.max(0, getNpcTrust(s, npc.name) - 1));
          propagateTrustChange(npc.name, -1, s, c); propagateFactionStanding(npc.name, -1, s);
        }
        s.pendingNpc = null;
      } else if (choice === 'exploit_npc') {
        if (s.ap < 1) {
          c.narr('system', '行动点不足。');
          s.pendingNpc = null;
          return null;
        }
        s.ap -= 1;
        c.bt.npc_as_resource_count = (c.bt.npc_as_resource_count || 0) + 1;
        setNpcTrust(s, npc.name, Math.max(0, getNpcTrust(s, npc.name) - 2));
        propagateTrustChange(npc.name, -2, s, c); propagateFactionStanding(npc.name, -2, s);
        const gain = rand(2, 6, c.rng);
        s.money = (s.money || 0) + gain;
        modHumanity(s, -12, '把' + npc.name + '当作资源利用');
        addRunMemory(s, '你利用了' + npc.name + '。效率很高。', 'npc');
        c.narr(
          'system',
          '你利用了' + npc.name + '的信任。金钱 +' + gain + '。对方的眼神里多了一丝怀疑。'
        );
        s.pendingNpc = null;
      } else if (choice === 'betray_npc') {
        if (s.ap < 1) {
          c.narr('system', '行动点不足。');
          s.pendingNpc = null;
          return null;
        }
        s.ap -= 1;
        c.bt.betrayed_high_trust_npcs = (c.bt.betrayed_high_trust_npcs || 0) + 1;
        { const _old = getNpcTrust(s, npc.name); setNpcTrust(s, npc.name, 0); _warnTrustDrop(c, npc.name, _old, 0);
          propagateTrustChange(npc.name, -_old, s, c); propagateFactionStanding(npc.name, -_old, s); }
        if (!c.bt._npc_harm_tally) c.bt._npc_harm_tally = {};
        c.bt._npc_harm_tally[npc.name] = (c.bt._npc_harm_tally[npc.name] || 0) + 1;
        c.bt.same_npc_harm_max = Math.max(
          c.bt.same_npc_harm_max || 0,
          c.bt._npc_harm_tally[npc.name]
        );
        modHumanity(s, -20, '背叛了高度信任的' + npc.name);
        addRunMemory(s, '你背叛了' + npc.name + '。信任是一种货币。你把它兑现了。', 'npc');
        c.narr(
          'system',
          '你把' + npc.name + '的秘密告诉了不该告诉的人。信任归零。你得到了一些东西——但不是钱。',
          { isSpecial: true }
        );
        s.pendingNpc = null;
      } else if (choice === 'intimacy') {
        if (s.ap < 2) {
          c.narr('system', '行动点不足。');
          s.pendingNpc = null;
          return null;
        }
        s.ap -= 2;
        c.bt.forbidden_intimacy_flags = (c.bt.forbidden_intimacy_flags || 0) + 1;
        const sanLoss = rand(3, 8, c.rng);
        applySanLoss(s, sanLoss);
        s.pollution = Math.min(1, (s.pollution || 0) + 0.1);
        c.effects.push({ type: 'AUDIO_PLAY', id: 'loop_pollution' });
        modHumanity(s, -8, '与' + npc.name + '发生了禁忌的亲密');
        c.narr(
          'system',
          '你靠近了' +
            npc.name +
            '。你没有问这是否正确。对方没有回答——但也没有退开。SAN -' +
            sanLoss,
          { isSpecial: true }
        );
        s.pendingNpc = null;
      } else if (choice === 'preach') {
        if (s.ap < 2) {
          c.narr('system', '行动点不足（需要2AP）。');
          s.pendingNpc = null;
          return null;
        }
        s.ap -= 2;
        const cultSkill = s.skills['神秘学'] || s.skills['话术'] || 20;
        const roll = rand(1, 100, c.rng);
        if (roll <= cultSkill) {
          c.bt.cult_leader_score = (c.bt.cult_leader_score || 0) + 1;
          setNpcState(s, npc.name, { ...ns, follower: true });
          const sanLoss = rand(2, 6, c.rng);
          applySanLoss(s, sanLoss);
          modHumanity(s, -10, '将' + npc.name + '引入歧途，建立邪教追随');
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

      // 对话追问系统：处理追问选择（支持 depth2 分支）
      if (choice && choice.startsWith('probe_')) {
        // Parse: probe_{threadId} or probe_{threadId}_{branch}
        var _raw = choice.slice(6);
        var _threadId = _raw;
        var _branch = null;
        // Match against known thread IDs to separate id from branch suffix
        var _probeThreads = NPC_THREAD_QUESTIONS[npc.name] || [];
        for (var _pi = 0; _pi < _probeThreads.length; _pi++) {
          var _tid = _probeThreads[_pi].id;
          if (_raw === _tid) { _threadId = _tid; break; }
          if (_raw.startsWith(_tid + '_')) { _threadId = _tid; _branch = _raw.slice(_tid.length + 1); break; }
        }
        var _threads = _probeThreads;
        var _thread = _threads.find(function (t) { return t.id === _threadId; });
        if (_thread) {
          var _threadState = (s.npcThreads || {})[npc.name + '_' + _threadId] || { depth: 0, flags: [] };
          var _nextDepth = _threadState.depth + 1;
          var _responseText = '';
          var _clueAwarded = null;
          var _trustAward = 0;
          var _flagsToSet = [];
          var _resolved = false;

          // Check trust gate for next depth
          var _nextTrustReq = _nextDepth === 1 ? (_thread.trustReq || 2) : (_nextDepth === 2 ? (_thread.depth2 && _thread.depth2.trustReq || 3) : (_thread.depth3 && _thread.depth3.trustReq || 4));

          if (trust < _nextTrustReq) {
            _responseText = npc.name + '似乎不想再深入这个话题了。';
          } else if (_nextDepth === 1) {
            // Depth 1: always linear (no branching yet)
            _responseText = _thread.depth1 ? _thread.depth1.text || _thread.depth1.response || '' : '';
          } else if (_nextDepth === 2) {
            // Depth 2: if player just chose a branch, show branch-specific depth3 outcome
            if (_branch && _thread.branches && _thread.branches[_branch]) {
              var _brData = _thread.branches[_branch];
              if (_brData.depth3) {
                _responseText = _brData.depth3.text || '';
                _clueAwarded = _brData.depth3.clue || null;
                _trustAward = _brData.depth3.trustGain || 0;
                _flagsToSet = _brData.depth3.flags || [];
                _resolved = true;
              }
            } else {
              // No branch chosen yet: show depth2 text
              _responseText = _d2.text || _d2.response || '';
              if (_d2.clue && !hasClueId(s.clues, _d2.clue)) _clueAwarded = _d2.clue;
            }
          } else if (_nextDepth >= 3) {
            // Depth 3: show branch-specific outcome (using stored branch) or default
            var _activeBranch = _branch || _threadState.branch;
            if (_activeBranch && _thread.branches && _thread.branches[_activeBranch]) {
              var _br3 = _thread.branches[_activeBranch];
              _responseText = _br3.depth3 ? (_br3.depth3.text || '') : '';
              _clueAwarded = _br3.depth3 ? _br3.depth3.clue : null;
              _trustAward = _br3.depth3 ? (_br3.depth3.trustGain || 0) : 0;
              _flagsToSet = _br3.depth3 ? (_br3.depth3.flags || []) : [];
            } else {
              _responseText = _d3.text || _d3.response || '';
              _clueAwarded = _d3.clue || null;
              _trustAward = _d3.trustGain || 0;
            }
            _resolved = true;
          }

          // Deduct AP for probe action
          if (_nextDepth >= 1 && _nextDepth <= 2) {
            s.ap = Math.max(0, s.ap - 1);
          }

          // Update thread state
          if (!s.npcThreads) s.npcThreads = {};
          s.npcThreads[npc.name + '_' + _threadId] = {
            depth: _resolved ? 3 : _nextDepth,
            branch: _threadState.branch,
            flags: _threadState.flags.concat(_flagsToSet),
            resolved: _resolved,
          };

          // Narrate response
          if (_responseText) c.narr('system', npc.name + '："' + _responseText + '"');

          // Award clue
          if (_clueAwarded && !hasClueId(s.clues, _clueAwarded)) {
            var _clueName = resolveClueName(_clueAwarded) || _clueAwarded;
            s.clues.push({ id: _clueAwarded, name: _clueName });
            c.narr('system', '【线索获得】' + _clueName, { isSpecial: true });
            if (c.effects) c.effects.push({ type: 'AUDIO_PLAY', id: 'clue_found' });
          }

          // Award trust
          if (_trustAward > 0) {
            var _newTrust = Math.min(5, trust + _trustAward);
            setNpcTrust(s, npc.name, _newTrust);
            propagateTrustChange(npc.name, _trustAward, s, c);
            propagateFactionStanding(npc.name, _trustAward, s);
            c.narr('system', npc.name + '对你的信任加深了。（' + trust + '→' + _newTrust + '）');
          }

          // Set flags
          for (var fi = 0; fi < _flagsToSet.length; fi++) {
            if (!s._dialogueFlags) s._dialogueFlags = [];
            if (s._dialogueFlags.indexOf(_flagsToSet[fi]) < 0) {
              s._dialogueFlags.push(_flagsToSet[fi]);
            }
          }
        }
      }

      // v0.9.0: Moral choice engine integration
      // Reputation propagation through NPC relationship network + moral tracking
      if (choice && choice !== 'leave') {
        try {
          var _moralResult = processNpcMoralChoice(s, npc.name, choice, ctx);
          // Silent propagation — no narrative feedback, the effects just happen
          // This is intentional: the player feels consequences without being told "X happened because you did Y"
        } catch (e) {
          // Moral choice engine is optional — if it fails, the base game continues
        }
      }

      return null;
    }
    default:
      return null;
  }
}
