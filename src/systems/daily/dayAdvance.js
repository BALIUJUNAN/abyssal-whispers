// src/systems/daily/dayAdvance.js — Daily REST: day clock advance, chapter transition, motif text, AP pollution
// Extracted from reducers/slices/dailySlice.js

import { rand, pick, clamp } from '../../reducers/utils.js';
import { GAME_BALANCE } from '../../state/gameConstants.js';
import { emit } from '../../engine/eventBus.js';
import { getSanStageFromGD, getSanStage, rollMadness } from '../../reducers/sanReducer.js';
import { getWeather, getSealStateId, getPhase } from '../../engine/WorldTimeSystem.js';
import { resetDailyCategoryCounts } from '../../reducers/extendedEvents.js';
import {
  getChapterForDay,
  checkChapterTransition,
  getMotifFlavorText,
} from '../../reducers/chapterReducer.js';
import { hasClueId } from '../../utils/clueNameMap.js';
import {
  addRunMemory,
  getNpcState,
} from '../../utils/appHelpers.js';
import { processDelayedEffects } from '../npcRelationshipSystem.js';
import { computeDailyNpcLocations, processNpcEncounters } from '../npcSchedule.js';

/**
 * Advance day counter, weather, seal, chapter. Play audio. Returns oldDay.
 */
export function _advanceDayClock(s, c, ctx) {
  const oldDay = s.day;
  s.day++;
  // Compute NPC autonomous movement for the new day
  computeDailyNpcLocations(s, ctx?.GD, c.rng);
  // Process NPC encounters (same-area interactions)
  processNpcEncounters(s, c, ctx?.GD);
  // Fire any delayed moral effects scheduled by MORAL_DILEMMAS
  processDelayedEffects(s, s.day, c);
  // eventBus: notify listeners of day transition
  try {
    emit('DAY_ADVANCED', { oldDay: oldDay, newDay: s.day });
  } catch (e) {}
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

/**
 * Process chapter transitions, motif flavor, SAN stage AP mod.
 */
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
    var hasChurchClue =
      hasClueId(s.clues, 'clue_church') || hasClueId(s.clues, 'evt_church_bell')
        || s.triggeredEvents.includes('evt_church_bell')
        || s.triggeredEvents.includes('evt_strange_clock');
    var hasHarborClue =
      hasClueId(s.clues, 'clue_warehouse') || hasClueId(s.clues, 'evt_warehouse_key')
        || s.triggeredEvents.includes('evt_warehouse_key')
        || s.triggeredEvents.includes('evt_fisherman_warning');
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
      c.narr(
        'event',
        '第三天的傍晚，你听到钟声又响了。这次你很确定——是十四声。\n\n你还没有找到钟声的来源。但你知道它来自两个方向之一：教堂，或者码头。\n\n明天你必须做出选择。',
        {
          eventTitle: '第十四声',
          eventType: 'hint',
          isSpecial: true,
        }
      );
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
      c.narr(
        'madness',
        '【被动疯狂检定】你的心智在低语中碎裂。\n【' + passiveMad.name + '】' + passiveMad.description,
        { madness: passiveMad }
      );
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
