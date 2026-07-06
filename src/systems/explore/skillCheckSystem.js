// src/systems/explore/skillCheckSystem.js — DO_SKILL_CHECK action handler.
// Extracted from exploreSlice.js (lines 522-577).

import { doSkillCheck } from '../../reducers/eventReducer.js';
import { rand } from '../../reducers/utils.js';
import { GAME_BALANCE } from '../../state/gameConstants.js';

export function handleSkillCheck(s, action, c, ctx) {
  if (!s || !s.pendingEvent || s.pendingEvent.rolled) return null;
  var evt = s.pendingEvent;
  var sc = evt.effects && evt.effects.skill_check;
  if (!sc) {
    s.pendingEvent = { ...evt, rolled: true, result: 'no_check' };
    return null;
  }
  c.effects.push({ type: 'AUDIO_SKILL', id: 'roll' });
  var result = doSkillCheck(sc.skill, sc.threshold || 50, s, s.difficulty, ctx, c.rng);
  s.pendingEvent = {
    ...evt,
    rolled: true,
    result: result.success ? 'success' : 'failure',
    roll: result.roll,
    playerSkill: result.playerSkill,
    threshold: result.threshold,
  };
  if (result.success) {
    c.effects.push({ type: 'AUDIO_SKILL', id: 'success' });
    s.stats_run.checks_passed++;
    c.narr(
      'system',
      '【技能检定：' +
        result.skillName +
        '】掷骰 ' +
        result.roll +
        ' / 技能' +
        result.playerSkill +
        ' / 难度' +
        result.threshold +
        ' —— 成功！'
    );
    c.narr('system', sc.success && sc.success.text ? sc.success.text : (sc.success || '检定成功。'));
    if ((c.rng ? c.rng.next() : Math.random()) < GAME_BALANCE.SKILL_IMPROVE_CHANCE)
      s.skills[result.skillName] = (s.skills[result.skillName] || 0) + rand(1, 3, c.rng);
  } else {
    c.effects.push({ type: 'AUDIO_SKILL', id: result.isCritFail ? 'critical_fail' : 'fail' });
    s.stats_run.checks_failed++;
    c.narr(
      'system',
      '【技能检定：' +
        result.skillName +
        '】掷骰 ' +
        result.roll +
        ' / 技能' +
        result.playerSkill +
        ' / 难度' +
        result.threshold +
        ' —— 失败！' +
        (result.isCritFail ? '（大失败！）' : '')
    );
    c.narr('system', sc.failure && sc.failure.text ? sc.failure.text : (sc.failure || '检定失败。'));
  }
  return null;
}
