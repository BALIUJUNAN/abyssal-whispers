// src/systems/earlyHooks.js - Day 1-3 audiovisual hooks
// Strong sensory anchors for the first 30 minutes of gameplay.
//
// 1. Thirteenth bell entrance: delayed audio + canvas glitch pulse
// 2. Auto-fires once per run, 6s after BEGIN_ADVENTURE (first loop only)

import { audioManager } from '../managers/AudioManager.js';

var _bellFired = false;

/**
 * Reset the bell entrance flag (called on NEW_GAME).
 */
export function resetEarlyHooks() {
  _bellFired = false;
}

/**
 * Fire the thirteenth bell entrance sequence.
 * Called from effectExecutor via BELL_ENTRANCE effect.
 *
 * Sequence:
 *   t=0ms    dispatch GLITCH_PULSE (canvas distortion starts)
 *   t=200ms  play bell_entrance audio (13th bell reverse)
 *   t=4200ms play bell_wrong audio (subsonic unease layer)
 *   t=6000ms dispatch GLITCH_PULSE_CLEAR (distortion fades)
 *
 * @param {function} dispatch - game dispatch
 */
export function fireBellEntrance(dispatch) {
  if (_bellFired) return;
  _bellFired = true;

  // Phase 1: Canvas glitch pulse (triggers SanPollutionLayer CSS distortion)
  try {
    dispatch({ type: 'GLITCH_PULSE', strength: 6, source: 'bell_entrance' });
  } catch (e) {}

  // Phase 2: Bell audio - 200ms after glitch starts (visual leads audio)
  setTimeout(function () {
    try {
      audioManager.playEffect('bell_entrance');
    } catch (e) {}
  }, 200);

  // Phase 3: Subsonic unease layer - 4s after bell (the wrongness lingers)
  setTimeout(function () {
    try {
      audioManager.playEffect('bell_wrong');
    } catch (e) {}
  }, 4200);

  // Phase 4: Clear glitch - 6s total
  setTimeout(function () {
    try {
      dispatch({ type: 'GLITCH_PULSE_CLEAR' });
    } catch (e) {}
  }, 6000);
}

/**
 * Narrative whispers for Day 1-3 ambient hooks.
 * Injected into the narrative stream at random intervals during exploration
 * when the player is in chapter_1 areas.
 *
 * These are NOT events — they don't cost AP or trigger choices.
 * They are pure atmospheric flavor that makes the world feel alive and watching.
 */
export var EARLY_WHISPERS = {
  town_center: [
    '远处传来一声钟响。你数了一下。十二声。然后——又一声。你不确定自己是不是数错了。',
    '公告栏上的失踪告示又多了一张。纸角还没干。',
    '你路过教堂的时候，风琴自己响了一下。只有一个音。很低。',
    '路灯闪了一下。你看到自己的影子做了一个你没有做的动作。',
    '有人在你身后快步走过。你回头的时候，街道是空的。但地上的脚印是湿的。',
  ],
  harbor_district: [
    '海面很平静。但你总觉得平静下面有什么东西在等。',
    '码头的木板在你脚下发出声音。不是嘎吱声——更像是有人在你脚下说话。',
    '你闻到了海的味道。比平时浓。像是有人在岸上打开了一个贝壳。很大的贝壳。',
    '渔船的缆绳在没有风的时候自己绷紧了一下。',
    '水面映出了天空。但天空里少了一颗星。你刚才明明数过。',
  ],
};
