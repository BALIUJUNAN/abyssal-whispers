// src/reducers/slices/dailySlice.js - Extracted from gameReducer
// REST, WORK, BUY_FOOD
// Phase 1 Refactor: REST case decomposed into sub-functions for readability.
// NOTE: Sub-functions receive ctx (bundle-scope context with GD) as 3rd param.

import { rand, clamp, pick, applySanLoss } from '../utils.js';
import { GAME_BALANCE } from '../../state/gameConstants.js';
import {
  getPhase,
  getAreaInfo,
  getSealState,
  getSealStateId,
  getWeather,
} from '../../engine/WorldTimeSystem.js';
import { getSanStage, processSanLoss } from '../sanReducer.js';
import { getSafehouseStage, processSafehouseNight } from '../miscReducer.js';
import { genObjectives } from '../objectiveReducer.js';
import { getChapterForDay, getMotifFlavorText, checkChapterTransition } from '../chapterReducer.js';
import { checkConclusions } from '../conclusionReducer.js';
import { checkEnding } from '../endingReducer.js';
import { checkNPCCorruption, applyNPCCorruption } from '../npcReducer.js';
import { resetDailyCategoryCounts } from '../extendedEvents.js';
import { maybeGetFakeMessage, maybeInsertFalseMemory } from '../../engine/PollutionManager.js';
import { addRunMemory, getNpcTrust, setNpcTrust } from '../../utils/appHelpers.js';

// TODO: checkSilentEvent is defined in app.jsx — avoid circular import.
// It remains a global for now; will be extracted to a utility in a future PR.

// ── REST sub-functions ──────────────────────────────────────────────

/** Process food consumption, starvation damage, and NPC trust decay. Returns true if player died. */
export function _processFoodAndStarvation(s, c, ctx) {
  const restArea = getAreaInfo(s.currentArea, ctx);
  const foodMod = restArea?.resource_pressure?.food_consumption_modifier || 1.0;
  const foodConsume = Math.ceil(1 * foodMod);
  s.food = Math.max(0, (s.food ?? 0) - foodConsume);
  if (s.food <= 0) {
    s.starvationDays = (s.starvationDays || 0) + 1;
    const sd = s.starvationDays;
    if (sd === 1) {
      applySanLoss(s, 1);
      c.narr('system', '你腹中空空。胃部的抽搐让你难以集中注意力。', { isSpecial: true });
    } else if (sd === 2) {
      s.hp = Math.max(0, s.hp - 1);
      c.narr('system', '饥饿在啃噬你的意志。你的手脚开始发软，动作变得迟缓。', { isSpecial: true });
    } else {
      s.hp = Math.max(0, s.hp - 2);
      c.narr('system', '你的身体已经开始消耗自身。视线模糊，每一个动作都是折磨。', {
        isSpecial: true,
      });
    }
    const npcs = GD.npcs || GD.module3_npcs || [];
    npcs.forEach((npc) => {
      if (getNpcTrust(s, npc.name) > 0 && Math.random() < GAME_BALANCE.NPC_TRUST_DECAY_CHANCE)
        setNpcTrust(s, npc.name, Math.max(0, getNpcTrust(s, npc.name) - 1));
    });
  } else {
    s.starvationDays = 0;
  }
  if (s.hp <= 0 || s.san <= 0) {
    const deathType = s.hp <= 0 ? 'starvation' : 'madness';
    const deathText =
      s.hp <= 0
        ? '饥饿耗尽了你最后的体力。你倒在了沃切斯特的街道上，再也没有站起来。'
        : '你的精神再也无法承受。意识在低语中碎裂，你再也分不清现实与幻觉。';
    applyDeathResolution(
      s,
      {
        mode: s.hp <= 0 ? 'hp' : 'san',
        type: deathType,
        area: s.currentArea,
        day: s.day,
        loop: s.loopCount,
        sourceEventId: null,
        sourceEventName: '饥饿致死',
        finalText: deathText,
        residueFlag: 'death_echo_starvation',
      },
      c.narr
    );
    return true;
  }
  return false;
}

/** Process safehouse degradation, world decay, area corruption, and safehouse visual stage. */
export function _processSafehouseAndWorldDecay(s, c, ctx) {
  s.safehouseCorruption = processSafehouseNight(s, ctx);
  {
    const dailyCorr = calculateDailyCorruption(s, ctx);
    s.safehouseCorruption = Math.min(100, (s.safehouseCorruption || 0) + dailyCorr);
    s.pollution = Math.min(1, (s.pollution || 0) + dailyCorr * 0.003);
  }
  if (typeof updateAreaCorruption === 'function') updateAreaCorruption(s, ctx);
  const visStage = getSafehouseVisualStage(s.safehouseCorruption || 0);
  const shStage = getSafehouseStage(s.safehouseCorruption, ctx);
  c.effects.push({ type: 'AUDIO_PLAY', id: visStage.sound });
  if (visStage.atmosphere && Math.random() < 0.5)
    c.narr('system', visStage.atmosphere, { isSpecial: true });
  {
    const pollutionEvt = getSafehousePollutionEvent(visStage.stage);
    if (pollutionEvt) {
      c.narr('system', '【安全屋】' + pollutionEvt.text, { isSpecial: true });
      if (pollutionEvt.sanCost > 0) {
        applySanLoss(s, pollutionEvt.sanCost);
        c.narr('system', 'SAN -' + pollutionEvt.sanCost, { isEffect: true });
      }
    }
  }
  {
    const prevStage = s._prevSafehouseStage || 0;
    if (visStage.stage > prevStage && visStage.stage >= 2)
      c.narr('system', '【' + visStage.name + '】' + visStage.description, { isSpecial: true });
    s._prevSafehouseStage = visStage.stage;
  }
  return shStage;
}

/** Process safehouse recovery, long-term effects, and AP reset for new day. */
export function _processRestRecovery(s, c, shStage, ctx) {
  let sanRec = shStage.available_functions?.san_recovery || 0;
  if (s.currentSafehouse !== 'main') {
    const alts = GD.systems?.safehouse?.relocation_rules?.alternative_safehouses || [];
    const curAlt = alts.find((a) => a.name === s.currentSafehouse);
    if (curAlt?.functions?.san_restore) sanRec += curAlt.functions.san_restore;
  }
  if ((s.food || 0) > 0) {
    if (sanRec !== 0) s.san = clamp(s.san + sanRec, 0, s.maxSan);
    s.hp = clamp(s.hp + 1, 0, s.maxHp);
  } else {
    c.narr('system', '没有食物，你无法从休息中恢复。', { isSpecial: true });
  }
  s.longTermEffects.forEach((l) => {
    if (l.daysRemaining > 0) l.daysRemaining--;
  });
  s.longTermEffects = s.longTermEffects.filter((l) => l.daysRemaining > 0);
  if (s.tempSkillBonus) {
    s.tempSkillBonus.days--;
    if (s.tempSkillBonus.days <= 0) s.tempSkillBonus = null;
  }
  s.harborRiskReduction = 0;
}

/** Advance day counter, weather, seal, chapter. Play audio. Returns oldDay. */
export function _advanceDayClock(s, c, ctx) {
  const oldDay = s.day;
  s.day++;
  s.ap = s.maxAp;
  s.weather = getWeather(pick).name;
  s.sealState = getSealStateId(s.day, ctx);
  c.effects.push({ type: 'INCREMENT_STAT', key: 'night_survived' });
  if (s.san <= GAME_BALANCE.LOW_SAN_STAT_THRESHOLD)
    c.effects.push({ type: 'INCREMENT_STAT', key: 'low_san_days' });
  c.effects.push({ type: 'AUDIO_PLAY', id: 'rest_generic' });
  try {
    const phase = getPhase(s.ap, s.maxAp);
    c.effects.push({ type: 'AUDIO_AMBIENT', area: s.currentArea, phase: phase });
  } catch (e) {
    c.effects.push({ type: 'AUDIO_AMBIENT', area: 'town_center', phase: 'morning' });
  }
  s.areaNameCache = {};
  resetDailyCategoryCounts(s);
  return oldDay;
}

/** Process chapter transitions, motif flavor, SAN stage AP mod. */
export function _processChapterAndMotif(s, c, oldDay, ctx) {
  const chTransition = checkChapterTransition(oldDay, s.day, ctx);
  if (chTransition) {
    s.currentChapter = getChapterForDay(s.day, ctx).key;
    s.transition = 'chapter';
    c.narr('system', chTransition.event_text, { isSpecial: true });
    if (chTransition.san_cost) s.san = clamp(s.san + chTransition.san_cost, 0, s.maxSan);
    if (chTransition.mythos_gain) s.mythosLevel = (s.mythosLevel || 0) + chTransition.mythos_gain;
  }
  if (Math.random() < GAME_BALANCE.MOTIF_TEXT_CHANCE) {
    const motifText = getMotifFlavorText(
      pick(['fog', 'bell', 'water']),
      s.safehouseCorruption || 0,
      ctx
    );
    if (motifText) c.narr('system', motifText);
  }
  const stage = getSanStage(s.san, ctx);
  if (stage.apMod !== 0) {
    s.ap = clamp(s.ap + stage.apMod, 0, s.maxAp);
    c.narr('system', '【' + stage.name + '】' + stage.desc + ' AP修正：' + stage.apMod);
  }
  if (s.day === GAME_BALANCE.FOG_CLEAR_DAY)
    c.narr(
      'system',
      '浓雾稍微散去。你注意到之前忽略的小径——低语森林和灯塔的方向似乎不再那么遥不可及。',
      { isSpecial: true }
    );
  const progEvents = GD.implementation_notes?.chapter_progression_events || [];
  const todayEvent = progEvents.find((e) => e.day === s.day);
  if (todayEvent) {
    c.narr('system', '【事件】' + todayEvent.name + '——' + todayEvent.description, {
      isSpecial: true,
    });
    if (todayEvent.effect?.all_npc_san)
      (GD.npcs || []).forEach((npc) => {
        if (!getNpcState(s, npc.name).dead)
          s.san = clamp(s.san + todayEvent.effect.all_npc_san, 0, s.maxSan);
      });
  }
}

/** Process day-specific critical events and world decay atmosphere. */
export function _processDayCriticalAndDecay(s, c, ctx) {
  {
    const dayCrit = getDayCriticalEvent(s.day);
    if (dayCrit && !s.triggeredEvents.includes('day_crit_' + s.day)) {
      s.triggeredEvents.push('day_crit_' + s.day);
      c.narr('event', dayCrit.text, {
        eventTitle: '第 ' + s.day + ' 天',
        eventType: 'milestone',
        isSpecial: true,
      });
      if (dayCrit.sanCost > 0) {
        applySanLoss(s, dayCrit.sanCost);
        c.narr('system', 'SAN -' + dayCrit.sanCost, { isEffect: true });
      }
      if (dayCrit.corruptionGain > 0)
        s.safehouseCorruption = Math.min(
          100,
          (s.safehouseCorruption || 0) + dayCrit.corruptionGain
        );
      addRunMemory(s, dayCrit.text.split('\\n')[0], 'world_decay');
    }
  }
  if (Math.random() < GAME_BALANCE.WORLD_DECAY_CHANCE) {
    const decayText = getWorldDecayNarrative(s.day, s.safehouseCorruption || 0, s);
    if (decayText) c.narr('system', decayText);
  }
}

/** Process NPC corruption triggers and seal-state accelerated corruption. */
export function _processNpcCorruption(s, c, ctx) {
  const corruptionTriggers = checkNPCCorruption(s, ctx);
  for (const { npc, trigger } of corruptionTriggers) {
    applyNPCCorruption(s, npc, trigger, c.narr);
    addRunMemory(s, npc.name + '被腐蚀了——' + (trigger.id || '未知原因'), 'npc');
  }
  const sm = getSealState(s.day, ctx).global_modifier;
  const sealRate = (sm?.npc_corruption_rate || 0.05) * 0.3;
  (GD.npcs || GD.module3_npcs || []).forEach((npc) => {
    if (getNpcState(s, npc.name).dead || getNpcState(s, npc.name).corrupted) return;
    if (Math.random() < sealRate)
      setNpcState(s, npc.name, {
        ...getNpcState(s, npc.name),
        corrupted: true,
        corruptionSource: 'seal_decay',
      });
  });
}

/** Process safehouse silent events, SAN break-wall, daily resources, corruption effects. */
export function _processNightEffects(s, c, ctx) {
  checkSilentEvent(s, c.narr, 'safehouse');
  {
    const bwfx = checkBreakWallEvent(s, c.narr);
    if (bwfx) c.effects.push(...bwfx);
  }
  processDailyResources(s);
  {
    const resNarr = getResourceNarrative(s);
    if (resNarr) c.narr('system', resNarr, { isSpecial: true });
  }
  {
    const fakeMsg = maybeGetFakeMessage(s.san, s.loopCount);
    if (fakeMsg)
      c.narr('system', fakeMsg, {
        isSpecial: true,
        madness: { name: '幻觉', description: '你看到了不存在的东西。' },
      });
  }
  maybeInsertFalseMemory(c.narr, s.san, s.loopCount, s.day);
  applyMetaCorruption(s, c, s._visualPollution);
}

/** Narrate new day header, area description, forced hooks, check endings and time limit. */
export function _processDayOpenAndEndings(s, c, _startSan, _startHp, _startClues, _startArea, ctx) {
  narrDailySummary(s, c.narr, _startSan, _startHp, _startClues, _startArea);
  c.narr(
    'system',
    '\n═══ 第 ' + s.day + ' 天 ═══ 天气：' + s.weather + ' ═══ 封印：' + s.sealState + ' ═══'
  );
  const area = getAreaInfo(s.currentArea, ctx);
  if (area) {
    var dayDesc = area.description;
    if (area.layout_variants && area.layout_variants.length > 0) {
      var phase = getPhase(s.ap, s.maxAp);
      var isNight = phase === 'midnight' || phase === 'evening';
      var isRainy = s.weather === '雨天' || s.weather === '大雾';
      var visitCount = (s.visitedAreas || []).filter((a) => a === s.currentArea).length;
      var eligible = area.layout_variants.filter(function (v) {
        if (v.id.endsWith('_dark') && !isNight) return false;
        if (v.id.endsWith('_flooded') && !isRainy) return false;
        if (v.id.endsWith('_wrecked') && visitCount < 2) return false;
        return true;
      });
      if (eligible.length > 0) {
        var totalW = eligible.reduce(function (t, v) {
          return t + (v.weight || 1);
        }, 0);
        var r = Math.random() * totalW;
        var chosen = eligible[0];
        for (var _vi = 0; _vi < eligible.length; _vi++) {
          r -= eligible[_vi].weight || 1;
          if (r <= 0) {
            chosen = eligible[_vi];
            break;
          }
        }
        if (chosen.description) dayDesc += '\n\n' + chosen.description;
      }
    }
    c.narr('location', dayDesc, {
      locationName: getAreaDisplayName(area, s),
      imageSrc: getAreaSceneImage(s.currentArea, {
        ...c.view,
        visits: (s.visitedAreas || []).filter((a) => a === s.currentArea).length,
      }),
      imageAlt: getAreaDisplayName(area, s),
      _areaClass: 'area-scene-' + s.currentArea,
    });
  }
  {
    const hook = checkForcedNarrativeHook(s);
    if (hook) {
      s.triggeredEvents.push(hook.id);
      c.narr('system', hook.text, { isSpecial: true });
      if (hook.sanCost) applySanLoss(s, hook.sanCost);
    }
  }
  const ending = checkEnding(s, ctx);
  if (ending) s.ending = { ...ending, recap: buildDeathRecap(s) };
  if (s.day > 28) {
    s.deathContext = {
      mode: 'hp',
      type: 'physical',
      area: s.currentArea,
      day: s.day,
      loop: s.loopCount,
      sourceEventId: null,
      sourceEventName: '时间耗尽',
      finalText: '封印崩溃，沃切斯特沉入深渊。',
      residueFlag: 'death_echo_time',
    };
    s.lastDeathType = 'physical';
    s.lastDeathMode = 'hp';
    c.effects.push({ type: 'AUDIO_PLAY', id: 'death_physical' });
    s.ending = {
      name: '时间耗尽',
      type: 'bad',
      description: '封印崩溃，沃切斯特沉入深渊。',
      recap: buildDeathRecap(s),
    };
  }
}

/** Final bookkeeping: objectives, stats, knowledge, daily patterns, auto-save. */
export function _processRestBookkeeping(s, c, ctx) {
  s.objectives = genObjectives(s.day, ctx);
  s.stats_run.days_best = Math.max(s.stats_run.days_best, s.day);
  c.log('第' + s.day + '天开始');
  checkKnowledgeEarned(s);
  trackDailyBehaviorPatterns(s, c.bt);
  s._dayActions = [];
  s._dailyTrustGains = {};
  s._todayEventTypes = [];
  s._dayStartArea = s.currentArea;
  saveGame(s);
  c.effects.push({ type: 'AUDIO_UI', id: 'save' });
  s.transition = 'rest';
  if (!s.tutorialSeen.first_rest) s.tutorialSeen = { ...s.tutorialSeen, first_rest: true };
}

// ── Main handler ────────────────────────────────────────────────────

export function handleDailyAction(s, action, c, ctx) {
  switch (action.type) {
    case 'REST': {
      const _startSan = s.san,
        _startHp = s.hp,
        _startClues = (s.clues || []).length,
        _startArea = s._dayStartArea || s.currentArea;
      if (_processFoodAndStarvation(s, c, ctx)) return s; // player died
      const shStage = _processSafehouseAndWorldDecay(s, c, ctx);
      _processRestRecovery(s, c, shStage, ctx);
      const oldDay = _advanceDayClock(s, c, ctx);
      _processChapterAndMotif(s, c, oldDay, ctx);
      _processDayCriticalAndDecay(s, c, ctx);
      _processNpcCorruption(s, c, ctx);
      _processNightEffects(s, c, ctx);
      _processDayOpenAndEndings(s, c, _startSan, _startHp, _startClues, _startArea, ctx);
      _processRestBookkeeping(s, c, ctx);
      return s;
    }
    case 'WORK': {
      if (s.ap < 2) {
        c.narr('system', '行动点不足（需要2AP）。');
        return s;
      }
      s.ap -= 2;
      const earned = rand(3, 12);
      s.money = (s.money || 0) + earned;
      c.bt.work_count = (c.bt.work_count || 0) + 1;
      if ((s.money || 0) > (c.bt.hoarded_money_max || 0)) c.bt.hoarded_money_max = s.money;
      c.narr('system', '你在码头帮了半天工。报酬微薄，但至少口袋里多了几枚硬币。金钱 +' + earned);
      c.log('打工挣钱');
      return s;
    }
    case 'BUY_FOOD': {
      if (s.ap < 1) {
        c.narr('system', '行动点不足（需要1AP）。');
        return s;
      }
      const foodPrice = 3;
      if ((s.money || 0) < foodPrice) {
        c.narr('system', '你的钱不够。购买食物需要 ' + foodPrice + ' 金钱。');
        return s;
      }
      if ((s.food || 0) >= (s.maxFood || 5)) {
        c.narr('system', '你的食物已经满了。');
        return s;
      }
      s.ap -= 1;
      s.money -= foodPrice;
      s.food = Math.min(s.maxFood, (s.food || 0) + 1);
      c.narr('system', '你在杂货店买了一些食物。食物 +1，金钱 -' + foodPrice);
      c.log('购买食物');
      return s;
    }
    default:
      return null;
  }
}
