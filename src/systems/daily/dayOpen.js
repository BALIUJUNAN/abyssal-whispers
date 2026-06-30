// src/systems/daily/dayOpen.js — Daily REST: day open narrative, area description, endings, bookkeeping
// Extracted from reducers/slices/dailySlice.js

import { applySanLoss } from '../../reducers/utils.js';
import { getAreaInfo, getPhase } from '../../engine/WorldTimeSystem.js';
import { getAreaDisplayName } from '../../utils/gameHelpers.js';
import { getAreaSceneImage } from '../../portraitMap.js';
import {
  narrDailySummary,
  buildDeathRecap,
  checkKnowledgeEarned,
  trackDailyBehaviorPatterns,
} from '../../utils/appHelpers.js';
import { hasClueId } from '../../utils/clueNameMap.js';
import { checkEnding } from '../../reducers/endingReducer.js';
import { genObjectives } from '../../reducers/objectiveReducer.js';
import { saveGame } from '../../engine/SaveManager.js';
import { checkForcedNarrativeHook } from '../../engine/EventEngine.js';

/**
 * Narrate new day header, area description, forced hooks, check endings and time limit.
 */
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

/**
 * Final bookkeeping: objectives, stats, knowledge, daily patterns, auto-save.
 */
export function _processRestBookkeeping(s, c, ctx) {
  s.objectives = genObjectives(s.day, ctx);
  s.stats_run.days_best = Math.max(s.stats_run.days_best, s.day);
  c.log('第' + s.day + '天开始');
  checkKnowledgeEarned(s);
  trackDailyBehaviorPatterns(s, c.bt);
  s._dayActions = [];
  s._dailyTrustGains = {};
  s._dailyNpcTalks = {};
  s._todayEventTypes = [];
  s._dayStartArea = s.currentArea;
  saveGame(s);
  c.effects.push({ type: 'AUDIO_UI', id: 'save' });
  s.transition = 'rest';
  if (!s.tutorialSeen.first_rest) s.tutorialSeen = { ...s.tutorialSeen, first_rest: true };
}
