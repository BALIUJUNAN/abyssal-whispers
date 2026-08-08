// src/systems/npc/dialogueSystem.js — TALK_NPC case: dialogue system
// Extracted from npcSlice.js (TALK_NPC case, lines 37-224).

import { rand, d3, pick, applySanLoss } from '../../reducers/utils.js';
import { GAME_BALANCE } from '../../state/gameConstants.js';
import { processSanLoss, getSanTextVariant } from '../../reducers/sanReducer.js';
import { getFearNpcLine } from '../../systems/fearLens.js';
import { getNpcDialogueVariant, NPC_CORRUPTION_LINES, getNpcFatigueEffect, getDifficultyNpcTrustMultiplier, getDifficultyNpcSuspicion, getDaySpecificLine, getWeatherLine, getSanLevelLine } from '../../systems/npcDialogue.js';
import { handleNpcMemoryTier } from '../../utils/npcMemory.js';
import { NPC_THREAD_QUESTIONS } from '../../data/npcContextualLines.js';
import { narrApInsufficient, addRunMemory, getNpcTrust, setNpcTrust, modHumanity, getNpcState, setNpcState } from '../../utils/appHelpers.js';
import { setCorruptionFlag } from '../../reducers/npcReducer.js';
import { getSanStageFromGD } from '../../reducers/sanReducer.js';

export function _executeTalkNpc(s, action, c, ctx) {
  var GD = ctx.GD;
  if (s.ap < 1) {
    narrApInsufficient(s, c.narr, 1);
    return null;
  }
  s.ap -= 1;
  if (!s._dailyNpcTalks) s._dailyNpcTalks = {};
  s._dailyNpcTalks[action.npc.name] = s.day;
  // AP 消耗音效反馈
  if (s.ap <= 2 && s.ap > 0) {
    c.effects.push({ type: 'AUDIO_PLAY', id: 'ui_error' });
  } else if (s.ap <= 0) {
    c.effects.push({ type: 'AUDIO_PLAY', id: 'ui_click_forbidden' });
  }
  c.effects.push({ type: 'INCREMENT_STAT', key: 'run_npc_talks' });
  var npc = action.npc;
  var trust = getNpcTrust(s, npc.name);
  var ns = getNpcState(s, npc.name);
  var layer = npc.trust_layers
    ? npc.trust_layers.find(function (l) { return l.level === trust; }) || npc.trust_layers[0]
    : null;
  s.pendingNpc = { npc: npc, trust: trust, layer: layer };
  // Loop text variants: NPC dialogue changes with loop count
  if (s.loopCount > 0) {
    var npcVariantMap = {
      '玛莎·格雷': 'martha_grey',
      老费舍: 'old_fisher',
      '希尔达·莫里斯': 'hilda_morris',
      '伊莎贝拉·韦伯': 'isabella_weber',
      '约书亚·布莱克': 'joshua_black',
      '伊莱亚斯·沃德': 'elias_ward',
    };
    var variantKey = npcVariantMap[npc.name];
    var variants = variantKey
      ? GD.implementation_notes?.loop_text_variants?.npc_variants?.[variantKey]
      : null;
    if (variants) {
      var loopKey =
        s.loopCount >= GAME_BALANCE.LOOP_TEXT_VARIANT_5 ? 'loop_5_plus' : 'loop_' + s.loopCount;
      var variantText = variants[loopKey];
      if (variantText) c.narr('system', variantText);
    }
  }
  // Phase 7: Corruption-aware NPC dialogue
  {
    var corrVariant = getNpcDialogueVariant(npc.name, trust, s);
    if (corrVariant !== 'normal') {
      var corrLines = NPC_CORRUPTION_LINES[npc.name];
      if (corrLines) {
        var lines = corrVariant === 'heavy_corruption' ? corrLines.heavy : corrLines.light;
        if (lines && lines.length > 0 && c.rng.next() < 0.4)
          c.narr(
            'system',
            npc.name + ': "' + pick(lines, c.rng) + '"'
          );
      }
    }
  }
  // Phase 7: NPC fatigue at high loops
  {
    var fatigue = getNpcFatigueEffect(npc.name, s.loopCount, s);
    if (fatigue && c.rng.next() < 0.3) {
      c.narr('system', fatigue.text, { isSpecial: true });
      if (fatigue.trustModifier !== 0)
        setNpcTrust(s, npc.name, Math.max(0, getNpcTrust(s, npc.name) + fatigue.trustModifier));
    }
  }
  // Narrative Month: Day-specific and weather-reactive NPC lines
  {
    // Day milestone: key days trigger unique NPC reactions (one per day per NPC)
    var dayLine = getDaySpecificLine(npc.name, s.day);
    if (dayLine && c.rng.next() < 0.5) {
      c.narr('system', npc.name + '突然说：' + dayLine, { isSpecial: true });
    }
    // Weather commentary: NPCs react to current weather
    if (s.weather && !dayLine) {
      var weatherLine = getWeatherLine(npc.name, s.weather);
      if (weatherLine && c.rng.next() < 0.3) {
        c.narr('system', npc.name + '说：「' + weatherLine + '」');
      }
    }
    // SAN level observation: NPCs notice player's deteriorating mental state
    if (!dayLine && !weatherLine && s.san < 40) {
      var sanLine = getSanLevelLine(npc.name, s.san, c.rng);
      if (sanLine && c.rng.next() < 0.25) {
        c.narr('system', npc.name + '看着你说：「' + sanLine + '」', { isSpecial: true });
      }
    }
  }
  if (ns.corrupted) {
    var corrLoss = processSanLoss(
      2,
      s.inventory.map(function (i) { return i.name; }),
      s.weather,
      s.day,
      s.difficulty,
      ctx
    );
    if (corrLoss > 0) {
      applySanLoss(s, corrLoss);
      c.narr('system', npc.name + '的状态不对劲。SAN -' + corrLoss);
    }
    if (trust >= 3) modHumanity(s, -5, '明知' + npc.name + '已被腐蚀仍继续利用', c.rng);
  } else {
    var sanRec = GD.npcs?.find(function (n) { return n.name === npc.name; })?.san_recovery_effect;
    if (sanRec && sanRec.normal_chat) {
      if (sanRec.normal_chat.includes('SAN+1')) {
        applySanLoss(s, -1);
        var _sanRecText = getSanTextVariant(
          sanRec.description || '与' + npc.name + '交谈让你感到安慰。SAN +1',
          s.san, pick, ctx, c.rng
        );
        c.narr('san-recovery', _sanRecText);
      } else {
        var _npcChatText = getSanTextVariant(sanRec.description || sanRec.normal_chat, s.san, pick, ctx, c.rng);
        c.narr('system', _npcChatText);
      }
    } else if (trust < 3) {
      var rec = d3() - 1;
      if (rec > 0) {
        applySanLoss(s, -rec);
        c.narr('san-recovery', '与' + npc.name + '交谈让你感到些许安慰。SAN +' + rec);
      }
    }
  }
  // NPC fear line: subtle observation based on prologue fear profile
  if (s.fearTuning && s.fearTuning.primary) {
    var fearLine = getFearNpcLine(npc.name, s, c.rng);
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
