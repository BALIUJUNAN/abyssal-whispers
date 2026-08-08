// src/systems/explore/moveSystem.js — MOVE action handler.
// Extracted from exploreSlice.js (lines 52-215).
// Handles area transitions, description assembly, audio, layout variants.

import { rand, clamp, pick, applySanLoss } from '../../reducers/utils.js';
import { GAME_BALANCE } from '../../state/gameConstants.js';
import { getPhase, getAreaInfo } from '../../engine/WorldTimeSystem.js';
import { getSanTextVariant, getSanSceneVariant } from '../../reducers/sanReducer.js';
import { applyLightTextCorruption } from '../../reducers/miscReducer.js';
import { getAreaDescriptionVariant } from '../../data/areaDescriptionVariants.js';
import { getInvestigationDetail } from '../../data/areaInvestigationDetails.js';
import { getPlayerTraceNarrative } from '../../systems/playerTraces.js';
import { applyResourceTextCorruption } from '../../systems/resourceNarrative.js';
import { getAreaSceneImage } from '../../portraitMap.js';
import { getAreaCorruptionNarrative } from '../../systems/worldDecay.js';
import { applyTextHallucination } from '../../engine/PollutionManager.js';
import { checkObjCompletion } from '../../reducers/objectiveReducer.js';
import { narrApInsufficient, checkSilentEvent } from '../../utils/appHelpers.js';
import { emit } from '../../engine/eventBus.js';
import { applyMythosAliases } from '../../systems/textVariants.js';
import { applyTextFragmentation } from '../../systems/textFragmentation.js';
import { isAreaUnlocked, getAreaDisplayName } from '../../utils/gameHelpers.js';

export function handleMove(s, action, c, ctx) {
  if (!s) return null;
  var GD = ctx.GD;

  if (s.ap < 1) {
    narrApInsufficient(s, c.narr, 1);
    return null;
  }
  var target = action.areaId;
  var cur = getAreaInfo(s.currentArea, ctx);
  if (!cur || !cur.connected_areas.includes(target)) {
    c.narr('system', '无法到达该区域。');
    return null;
  }
  var targetArea = getAreaInfo(target, ctx);
  if (!targetArea) {
    c.narr('system', '未知区域。');
    return null;
  }
  if (!isAreaUnlocked(targetArea, s)) {
    c.narr('system', '你还没有找到通往' + targetArea.name + '的路径。也许需要更多线索。');
    return null;
  }
  s.ap -= action.cost || 1;
  if (s.ap <= 2 && s.ap > 0) {
    c.effects.push({ type: 'AUDIO_PLAY', id: 'ui_error' });
  } else if (s.ap <= 0) {
    c.effects.push({ type: 'AUDIO_PLAY', id: 'ui_click_forbidden' });
  }
  var _fromArea = s.currentArea;
  s.currentArea = target;
  if (!s.visitedAreas.includes(target)) s.visitedAreas.push(target);
  try { emit('AREA_ENTERED', { areaId: target, fromArea: _fromArea }); } catch (e) {}
  if (target === 'harbor_district') {
    c.bt.harbor_visits = (c.bt.harbor_visits || 0) + 1;
    c.effects.push({ type: 'AUDIO_PLAY', id: 'harbor_water_omen' });
  }
  if (target === 'lighthouse')
    c.effects.push({ type: 'AUDIO_PLAY', id: 'lighthouse_lens_crack' });
  if (target === 'catacombs_entrance' || target === 'deep_catacombs')
    c.effects.push({ type: 'AUDIO_PLAY', id: 'catacombs_stone' });
  if (targetArea.danger_level > (s.stats_run.deepest_area_danger || 0))
    s.stats_run.deepest_area_danger = targetArea.danger_level;
  if (!s.lastVisitedDates) s.lastVisitedDates = {};
  s.lastVisitedDates = { ...s.lastVisitedDates, [target]: s.day };
  var displayName = getAreaDisplayName(targetArea, s);
  c.narr('system', '你前往了' + displayName + '。');
  var lightCorrPenalty =
    (s.lightLevel || 0) < (targetArea?.resource_pressure?.required_light_level || 0) ? 2 : 1;
  var desc = getSanTextVariant(targetArea.description, s.san, pick, ctx, c.rng);
  desc = applyLightTextCorruption(desc, s.lightLevel || 0, ctx, c.rng);
  var visitCount = (s.visitedAreas || []).filter(function (a) { return a === target; }).length;
  if (visitCount >= 2) {
    var tier = visitCount <= 3 ? 'visit_2_3' : visitCount <= 6 ? 'visit_4_6' : 'visit_7_plus';
    var variant = getAreaDescriptionVariant(target, tier);
    if (variant) {
      var cleanVariant = variant.replace(/\\n/g, '\n');
      desc = desc + '\n\n' + cleanVariant;
    }
  }
  desc = applyMythosAliases(desc, s.currentChapter || 'chapter_1', s.mythosLevel || 0, ctx, undefined, c.rng);
  desc = applyTextFragmentation(desc, s.san, c.rng, { isCritical: false }, ctx);
  var invDetail = getInvestigationDetail(target, s, c.rng);
  if (invDetail) desc = desc + '\n\n' + invDetail;
  var traceNarr = getPlayerTraceNarrative(target, s);
  if (traceNarr) desc = desc + '\n\n' + traceNarr;
  if (targetArea.layout_variants && targetArea.layout_variants.length > 0) {
    var phase = getPhase(s.ap, s.maxAp);
    var isNight = phase === 'midnight' || phase === 'evening';
    var isRainy = s.weather === '雨天' || s.weather === '大雾';
    var visitCount2 = (s.visitedAreas || []).filter(function (a) { return a === target; }).length;
    var eligible = targetArea.layout_variants.filter(function (v) {
      if (v.id.endsWith('_dark') && !isNight) return false;
      if (v.id.endsWith('_flooded') && !isRainy) return false;
      if (v.id.endsWith('_wrecked') && visitCount2 < 2) return false;
      return true;
    });
    if (eligible.length > 0) {
      var totalW = eligible.reduce(function (t, v) { return t + (v.weight || 1); }, 0);
      var r = c.rng.next() * totalW;
      var chosen = eligible[0];
      for (var vi = 0; vi < eligible.length; vi++) {
        r -= eligible[vi].weight || 1;
        if (r <= 0) { chosen = eligible[vi]; break; }
      }
      if (chosen.description) desc += '\n\n' + chosen.description;
    }
  }
  if (lightCorrPenalty > 1 && c.rng.next() < GAME_BALANCE.LIGHT_CORRUPTION_CHANCE)
    desc += '\n\n光线不足。你不确定自己看到的是不是真的。';
  desc = applyResourceTextCorruption(desc, s, c.rng);
  var areaCssClass = 'area-scene-' + target;
  c.narr('location', desc, {
    locationName: displayName,
    imageSrc: getAreaSceneImage(target, {
      ...c.view,
      visits: (s.visitedAreas || []).filter(function (a) { return a === target; }).length,
    }),
    imageAlt: displayName,
    _areaClass: areaCssClass,
  });
  try {
    var _phase = getPhase(s.ap, s.maxAp);
    c.effects.push({ type: 'AUDIO_AMBIENT', area: target, phase: _phase });
  } catch (e) {}
  if (
    targetArea.micro_events &&
    targetArea.micro_events.length > 0 &&
    c.rng.next() < GAME_BALANCE.MICRO_EVENT_CHANCE
  ) {
    var me = pick(targetArea.micro_events, c.rng);
    var meText = getSanTextVariant(me.description, s.san, pick, ctx, c.rng);
    c.narr('system', meText, { type: '微事件' });
    if (me.effect)
      Object.entries(me.effect).forEach(function (_ref) {
        var k = _ref[0], v = _ref[1];
        if (k === 'SAN') applySanLoss(s, -v);
        if (k === 'HP') s.hp = clamp(s.hp + v, 0, s.maxHp);
      });
  }
  if (c.rng.next() < GAME_BALANCE.SILENT_EVENT_ON_MOVE) checkSilentEvent(s, c.narr, target, GD);
  var sceneKeyMap = {
    harbor_district: 'harbor_water',
    voxchester_manor: 'hilda_portrait',
    catacombs_entrance: 'catacombs_entrance_text',
  };
  var sceneKey = sceneKeyMap[target];
  if (
    sceneKey &&
    s.san < GAME_BALANCE.SAN_SCENE_VARIANT_GATE &&
    c.rng.next() < GAME_BALANCE.SAN_SCENE_VARIANT_CHANCE
  ) {
    var sceneText = getSanSceneVariant(sceneKey, s.san, ctx);
    if (sceneText) c.narr('system', sceneText);
  }
  var areaNarr = getAreaCorruptionNarrative(target, s, c.rng);
  if (areaNarr) c.narr('system', areaNarr, { isSpecial: true });
  s.objectives = checkObjCompletion(s.objectives, s);
  s.transition = 'move';
  c.log('前往' + displayName);
  if (!s.tutorialSeen.first_move) s.tutorialSeen = { ...s.tutorialSeen, first_move: true };
  return null;
}
