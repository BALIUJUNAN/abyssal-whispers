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
import { getSanStage, getSanStageFromGD, processSanLoss, rollMadness } from '../sanReducer.js';
import { getSafehouseStage, processSafehouseNight } from '../miscReducer.js';
import { genObjectives } from '../objectiveReducer.js';
import { getChapterForDay, getMotifFlavorText, checkChapterTransition } from '../chapterReducer.js';
import { checkConclusions } from '../conclusionReducer.js';
import { checkEnding } from '../endingReducer.js';
import { checkNPCCorruption, applyNPCCorruption } from '../npcReducer.js';
import { resetDailyCategoryCounts } from '../extendedEvents.js';
import { maybeGetFakeMessage, maybeInsertFalseMemory } from '../../engine/PollutionManager.js';
import { addRunMemory, getNpcTrust, setNpcTrust, getNpcState, setNpcState, narrDailySummary, trackDailyBehaviorPatterns, checkKnowledgeEarned, checkBreakWallEvent, checkSilentEvent, applyDeathResolution, buildDeathRecap, narrApInsufficient } from '../../utils/appHelpers.js';
import { adjustStarvationDamage, getSanFloor } from '../../systems/firstLoopBalance.js';
import { hasClueId } from '../../utils/clueNameMap.js';
import { getAreaDisplayName } from '../../utils/gameHelpers.js';
import { getAreaSceneImage } from '../../portraitMap.js';
import { checkForcedNarrativeHook } from '../../engine/EventEngine.js';
import { saveGame } from '../../engine/SaveManager.js';
import { getDayCriticalEvent, getWorldDecayNarrative, getHarborDeepOneWhisper, calculateDailyCorruption, updateAreaCorruption } from '../../systems/worldDecay.js';
import { triggerDayCriticalSurge, triggerSanLossFlash } from '../../systems/sanVisualCorruption.js';
import { processDailyResources, getResourceNarrative, getSafehouseVisualStage, getSafehousePollutionEvent } from '../../systems/resourceNarrative.js';
import { applyMetaCorruption } from '../../systems/metaCorruption.js';
import { emit } from '../../engine/eventBus.js';
import { maybeInjectPhantomLog } from '../../systems/textVariants.js';

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
      const dmg = adjustStarvationDamage(1, s);
      s.hp = Math.max(0, s.hp - dmg);
      c.narr('system', '饥饿在啃噬你的意志。你的手脚开始发软，动作变得迟缓。', { isSpecial: true });
    } else {
      const dmg = adjustStarvationDamage(2, s);
      s.hp = Math.max(0, s.hp - dmg);
      c.narr('system', '你的身体已经开始消耗自身。视线模糊，每一个动作都是折磨。', {
        isSpecial: true,
      });
    }
    var GD = ctx.GD;
    const npcs = GD.npcs || GD.module3_npcs || [];
    npcs.forEach((npc) => {
      if (getNpcTrust(s, npc.name) > 0 && (c.rng ? c.rng.next() : Math.random()) < GAME_BALANCE.NPC_TRUST_DECAY_CHANCE)
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
      c.narr,
      ctx
    );
    return true;
  }
  return false;
}

/** Process safehouse degradation, world decay, area corruption, and safehouse visual stage. */
export function _processSafehouseAndWorldDecay(s, c, ctx) {
  s.safehouseCorruption = processSafehouseNight(s, ctx, c.rng);
  {
    const dailyCorr = calculateDailyCorruption(s, ctx);
    s.safehouseCorruption = Math.min(100, (s.safehouseCorruption || 0) + dailyCorr);
    s.pollution = Math.min(1, (s.pollution || 0) + dailyCorr * 0.003);
  }
  updateAreaCorruption(s, ctx);
  const visStage = getSafehouseVisualStage(s.safehouseCorruption || 0);
  const shStage = getSafehouseStage(s.safehouseCorruption, ctx);
  c.effects.push({ type: 'AUDIO_PLAY', id: visStage.sound });
  if (visStage.atmosphere && (c.rng ? c.rng.next() : Math.random()) < 0.5)
    c.narr('system', visStage.atmosphere, { isSpecial: true });
  {
    const pollutionEvt = getSafehousePollutionEvent(visStage.stage, null, c.rng);
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
  var GD = ctx.GD;
  let sanRec = shStage.available_functions?.san_recovery || 0;
  if (s.currentSafehouse !== 'main') {
    const alts = GD.systems?.safehouse?.relocation_rules?.alternative_safehouses || [];
    const curAlt = alts.find((a) => a.name === s.currentSafehouse);
    if (curAlt?.functions?.san_restore) sanRec += curAlt.functions.san_restore;
  }
  // DESIGN_REFACTOR_NOTES.md: degraded safehouse reduces SAN recovery
  // Stage 3+ (不再完全安全): -1 SAN recovery
  // Stage 4+ (安全屋破裂): -2 SAN recovery
  if (shStage.stage >= 4 && sanRec > 0) {
    sanRec = Math.max(0, sanRec - 2);
    c.narr('system', '你试图休息。但墙壁在呼吸。你没有真正睡着。', { isSpecial: true });
  } else if (shStage.stage >= 3 && sanRec > 0) {
    sanRec = Math.max(0, sanRec - 1);
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
  // eventBus: notify listeners of day transition
  try { emit('DAY_ADVANCED', { oldDay: oldDay, newDay: s.day }); } catch (e) {}
  s.ap = s.maxAp;
  // Chapter 1 protection: cap AP to 5 for Days 1-3 on first loop.
  // Forces focused exploration — player must visit church/harbor, not wander aimlessly.
  // DESIGN_REFACTOR_NOTES.md: "前3天AP上限压到4-5"
  if (s.loopCount <= 0 && s.day <= 3) {
    s.ap = Math.min(s.ap, 5);
    if (s.day === 1) {
      c.narr('system', '雾很浓。你今天走不了太远。', { isSpecial: true });
    }
  }
  // ── AP 污染系统：SAN 深渊吞噬行动力的可靠性 ──
  // 第一章前期不触发（保持"可控"的假象）
  // 触发条件：SAN stage >= 3（认知丧失）或 轮回 >= 3
  {
    var _sanLvl = getSanStageFromGD(s.san).level;
    var _apPolluteChance = 0;
    if (_sanLvl >= 4) _apPolluteChance = 0.6;
    else if (_sanLvl >= 3) _apPolluteChance = 0.35;
    else if (s.loopCount >= 3) _apPolluteChance = 0.25;
    else if (s.loopCount >= 1 && _sanLvl >= 2) _apPolluteChance = 0.15;
    if (_apPolluteChance > 0 && (c.rng ? c.rng.next() : Math.random()) < _apPolluteChance) {
      var _offset = _sanLvl >= 4 ? rand(2, 4, c.rng) : rand(1, 2, c.rng);
      s._apLies = true;
      s._apOffset = _offset;
      // 叙事暗示：不直接告诉玩家 AP 被污染了
      var _apLiesTexts = [
        '你数了数今天的行动力。好像比昨天多了一点。……真的吗？',
        '你觉得自己精力充沛。但你的手在发抖。',
        '今天的雾好像薄了一些。你能做的好像更多了。也许。',
        '你感到一种不自然的清醒。像是有什么东西在替你计算代价。',
      ];
      c.narr('system', pick(_apLiesTexts, c.rng), { isSpecial: true });
    } else {
      s._apLies = false;
      s._apOffset = 0;
    }
  }
  s.weather = getWeather(c.rng).name;
  s.sealState = getSealStateId(s.day, ctx);
  c.effects.push({ type: 'INCREMENT_STAT', key: 'night_survived' });
  if (s.san <= GAME_BALANCE.LOW_SAN_STAT_THRESHOLD)
    c.effects.push({ type: 'INCREMENT_STAT', key: 'low_san_days' });
  c.effects.push({ type: 'AUDIO_PLAY', id: rand(0, 1, c.rng) ? 'rest_alt' : 'rest_generic' });
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
  var GD = ctx.GD;
  const oldChKey = getChapterForDay(oldDay, ctx).key;
  const chTransition = checkChapterTransition(oldDay, s.day, ctx);
  if (chTransition) {
    s.currentChapter = getChapterForDay(s.day, ctx).key;
    s.transition = 'chapter';
    c.narr('system', chTransition.event_text, { isSpecial: true });
    if (chTransition.san_cost) s.san = clamp(s.san + chTransition.san_cost, 0, s.maxSan);
    if (chTransition.mythos_gain) s.mythosLevel = (s.mythosLevel || 0) + chTransition.mythos_gain;
    // Chapter 1→2: play the fourteenth bell on the transition
    if (oldChKey === 'chapter_1' && s.currentChapter === 'chapter_2') {
      c.effects.push({ type: 'AUDIO_PLAY', id: 'bell_reverse' });
    }
  }
  // Day 3 forced narrative: "you found something" if player has any clues
  // DESIGN_REFACTOR_NOTES.md: "Day 3结束强制触发教堂地下室或码头仓库过渡事件"
  if (oldDay === 3 && s.loopCount <= 0 && !s.triggeredEvents.includes('evt_day3_transition')) {
    s.triggeredEvents.push('evt_day3_transition');
    var hasChurchClue = hasClueId(s.clues, 'clue_church') || hasClueId(s.clues, 'evt_church_bell')
      || s.triggeredEvents.includes('evt_church_bell') || s.triggeredEvents.includes('evt_strange_clock');
    var hasHarborClue = hasClueId(s.clues, 'clue_warehouse') || hasClueId(s.clues, 'evt_warehouse_key')
      || s.triggeredEvents.includes('evt_warehouse_key') || s.triggeredEvents.includes('evt_fisherman_warning');
    if (hasChurchClue || hasHarborClue) {
      var loc = hasChurchClue ? '教堂' : '码头';
      var detail = hasChurchClue
        ? '你推开教堂侧厅的木门。门后是一段向下的石阶。石阶上很干燥——但墙壁是湿的。你听到钟声从地下传来。不是十三声。是一声。很长。'
        : '你找到了仓库后面的暗门。门上没有锁，只有一个铜环。你拉了一下。门开了。海风从门里吹出来——但门后不是海。是一条向下的通道。墙壁上有水痕。水痕的形状像是文字。你读不懂。';
      c.narr('event', detail, {
        eventTitle: loc + '的秘密',
        eventType: 'transition',
        isSpecial: true,
      });
      addRunMemory(s, '在' + loc + '发现了向下的通道。', 'discovery');
    } else {
      // Player didn't explore much — give them a hint
      c.narr('event', '第三天的傍晚，你听到钟声又响了。这次你很确定——是十四声。\n\n你还没有找到钟声的来源。但你知道它来自两个方向之一：教堂，或者码头。\n\n明天你必须做出选择。', {
        eventTitle: '第十四声',
        eventType: 'hint',
        isSpecial: true,
      });
    }
  }
  if ((c.rng ? c.rng.next() : Math.random()) < GAME_BALANCE.MOTIF_TEXT_CHANCE) {
    const motifText = getMotifFlavorText(
      pick(['fog', 'bell', 'water'], c.rng),
      s.safehouseCorruption || 0,
      ctx,
      c.rng
    );
    if (motifText) c.narr('system', motifText);
  }
  const stage = getSanStage(s.san, ctx);
  if (stage.apMod !== 0) {
    s.ap = clamp(s.ap + stage.apMod, 0, s.maxAp);
    c.narr('system', '【' + stage.name + '】' + stage.desc + ' AP修正：' + stage.apMod);
  }
  // Clear expired madness FIRST (madness from previous turns expires on rest)
  if (s.madnessActive) {
    c.narr('system', '疯狂的浪潮渐渐退去。你暂时恢复了理智。');
    s.madnessActive = null;
    s._madnessSkillPenalty = null;
    s._madnessApMultiplier = null;
    s._madnessGlobalCheckPenalty = null;
  }
  // THEN check for passive madness (low SAN triggers madness even without event)
  // P1-A: SSOT — narrative_death (level >= 5): 50%; reality_dissolution (level >= 4): 30%
  var _sanLvl = getSanStageFromGD(s.san).level;
  if (_sanLvl >= 4) {
    var passiveMadnessChance = _sanLvl >= 5 ? 0.5 : 0.3;
    if ((c.rng ? c.rng.next() : Math.random()) < passiveMadnessChance) {
      var passiveMad = rollMadness(ctx, c.rng);
      s.madnessActive = passiveMad;
      c.effects.push({ type: 'INCREMENT_STAT', key: 'madness_count' });
      c.narr('madness', '【被动疯狂检定】你的心智在低语中碎裂。\n【' + passiveMad.name + '】' + passiveMad.description, { madness: passiveMad });
      addRunMemory(s, '在低SAN状态下触发被动疯狂——' + passiveMad.name, 'madness');
      c.effects.push({ type: 'AUDIO_PLAY', id: 'madness' });
    }
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
  var GD = ctx.GD;
  {
    const dayCrit = getDayCriticalEvent(s.day);
    if (dayCrit && !s.triggeredEvents.includes('day_crit_' + s.day)) {
      s.triggeredEvents.push('day_crit_' + s.day);
      // Narrative Month: Trigger visual surge for critical days
      if (s.day === 7 || s.day === 14 || s.day === 21 || s.day === 28 || s.day === 5 || s.day === 15 || s.day === 20 || s.day === 25) {
        triggerDayCriticalSurge(s.day, s.san);
      }
      c.narr('event', dayCrit.text, {
        eventTitle: '第 ' + s.day + ' 天',
        eventType: 'milestone',
        isSpecial: true,
      });
      if (dayCrit.sanCost > 0) {
        applySanLoss(s, dayCrit.sanCost);
        // Narrative Month: Screen flash proportional to SAN loss
        triggerSanLossFlash(dayCrit.sanCost);
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
  // Loop 2-3 graduated protection: enforce SAN floor
  var sanFloor = getSanFloor(s);
  if (sanFloor > 0 && s.san < sanFloor) {
    s.san = sanFloor;
  }
  if ((c.rng ? c.rng.next() : Math.random()) < GAME_BALANCE.WORLD_DECAY_CHANCE) {
    const decayText = getWorldDecayNarrative(s.day, s.safehouseCorruption || 0, s);
    if (decayText) c.narr('system', decayText);
  }
  // DESIGN_REFACTOR_NOTES.md: "Day 7后harbor_district自动增加深潜者相关模糊事件"
  // 30% chance of harbor whisper when player rested near harbor, Day 7+
  if (s.day >= 7 && (c.rng ? c.rng.next() : Math.random()) < 0.3) {
    var lastArea = s._dayStartArea || s.currentArea || '';
    if (lastArea === 'harbor_district' || lastArea === 'town_center') {
      var harborWhisper = getHarborDeepOneWhisper(s.day, s.safehouseCorruption || 0, s);
      if (harborWhisper) c.narr('system', harborWhisper);
    }
  }
}

/** Process NPC corruption triggers and seal-state accelerated corruption. */
export function _processNpcCorruption(s, c, ctx) {
  var GD = ctx.GD;
  const corruptionTriggers = checkNPCCorruption(s, ctx);
  for (const { npc, trigger } of corruptionTriggers) {
    applyNPCCorruption(s, npc, trigger, c.narr);
    addRunMemory(s, npc.name + '被腐蚀了——' + (trigger.id || '未知原因'), 'npc');
  }
  const sm = getSealState(s.day, ctx).global_modifier;
  const sealRate = (sm?.npc_corruption_rate || 0.05) * 0.3;
  (GD.npcs || GD.module3_npcs || []).forEach((npc) => {
    if (getNpcState(s, npc.name).dead || getNpcState(s, npc.name).corrupted) return;
    if ((c.rng ? c.rng.next() : Math.random()) < sealRate)
      setNpcState(s, npc.name, {
        ...getNpcState(s, npc.name),
        corrupted: true,
        corruptionSource: 'seal_decay',
      });
  });
}

/** Process safehouse silent events, SAN break-wall, daily resources, corruption effects. */
export function _processNightEffects(s, c, ctx) {
  var GD = ctx.GD;
  checkSilentEvent(s, c.narr, 'safehouse', GD);
  {
    const bwfx = checkBreakWallEvent(s, c.narr, GD, c.rng);
    if (bwfx) c.effects.push(...bwfx);
  }
  processDailyResources(s, c.rng);
  {
    const resNarr = getResourceNarrative(s, c.rng);
    if (resNarr) c.narr('system', resNarr, { isSpecial: true });
  }
  {
    const fakeMsg = maybeGetFakeMessage(s.san, s.loopCount, getSanStageFromGD, c.rng);
    if (fakeMsg)
      c.narr('system', fakeMsg, {
        isSpecial: true,
        madness: { name: '幻觉', description: '你看到了不存在的东西。' },
      });
  }
  maybeInsertFalseMemory(c.narr, s.san, s.loopCount, s.day, getSanStageFromGD, c.rng);
  applyMetaCorruption(s, c, s._visualPollution);
}

/** Narrate new day header, area description, forced hooks, check endings and time limit. */
export function _processDayOpenAndEndings(s, c, _startSan, _startHp, _startClues, _startArea, ctx) {
  narrDailySummary(s, c.narr, _startSan, _startHp, _startClues, _startArea, ctx, c.rng);
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
        var r = (c.rng ? c.rng.next() : Math.random()) * totalW;
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

export function handleDailyAction(draft, action, ctx) {
  switch (action.type) {
    case 'REST': {
      const _startSan = draft.san,
        _startHp = draft.hp,
        _startClues = (draft.clues || []).length,
        _startArea = draft._dayStartArea || draft.currentArea;
      if (_processFoodAndStarvation(draft, ctx, ctx)) return null; // player died
      const shStage = _processSafehouseAndWorldDecay(draft, ctx, ctx);
      _processRestRecovery(draft, ctx, shStage, ctx);
      const oldDay = _advanceDayClock(draft, ctx, ctx);
      _processChapterAndMotif(draft, ctx, oldDay, ctx);
      _processDayCriticalAndDecay(draft, ctx, ctx);
      _processNpcCorruption(draft, ctx, ctx);
      _processNightEffects(draft, ctx, ctx);
      _processDayOpenAndEndings(draft, ctx, _startSan, _startHp, _startClues, _startArea, ctx);
      _processRestBookkeeping(draft, ctx, ctx);
      // "Suspected bug" — phantom log entry (0.5% at low SAN/high loop)
      maybeInjectPhantomLog(draft.eventLog, draft.san, draft.loopCount, ctx.rng);
      return null;
    }
    case 'WORK': {
      if (draft.ap < 2) {
        narrApInsufficient(draft, ctx.narr, 2);
        return null;
      }
      draft.ap -= 2;
      // AP 消耗音效反馈
      if (draft.ap <= 2 && draft.ap > 0) {
        ctx.effects.push({ type: 'AUDIO_PLAY', id: 'ui_error' });
      } else if (draft.ap <= 0) {
        ctx.effects.push({ type: 'AUDIO_PLAY', id: 'ui_click_forbidden' });
      }
      const earned = rand(3, 12, ctx.rng);
      draft.money = (draft.money || 0) + earned;
      ctx.bt.work_count = (ctx.bt.work_count || 0) + 1;
      if ((draft.money || 0) > (ctx.bt.hoarded_money_max || 0)) ctx.bt.hoarded_money_max = draft.money;
      ctx.narr('system', '你在码头帮了半天工。报酬微薄，但至少口袋里多了几枚硬币。金钱 +' + earned);
      ctx.log('打工挣钱');
      return null;
    }
    case 'BUY_FOOD': {
      if (draft.ap < 1) {
        narrApInsufficient(draft, ctx.narr, 1);
        return null;
      }
      const foodPrice = 3;
      if ((draft.money || 0) < foodPrice) {
        ctx.narr('system', '你的钱不够。购买食物需要 ' + foodPrice + ' 金钱。');
        return null;
      }
      if ((draft.food || 0) >= (draft.maxFood || 5)) {
        ctx.narr('system', '你的食物已经满了。');
        return null;
      }
      draft.ap -= 1;
      // AP 消耗音效反馈
      if (draft.ap <= 2 && draft.ap > 0) {
        ctx.effects.push({ type: 'AUDIO_PLAY', id: 'ui_error' });
      } else if (draft.ap <= 0) {
        ctx.effects.push({ type: 'AUDIO_PLAY', id: 'ui_click_forbidden' });
      }
      draft.money -= foodPrice;
      draft.food = Math.min(draft.maxFood, (draft.food || 0) + 1);
      ctx.narr('system', '你在杂货店买了一些食物。食物 +1，金钱 -' + foodPrice);
      ctx.log('购买食物');
      return null;
    }
    default:
      return null;
  }
}
