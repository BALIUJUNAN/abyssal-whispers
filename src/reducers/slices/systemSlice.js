// src/reducers/slices/systemSlice.js — Cross-cutting concerns
// Runs as before/after hooks around every domain action dispatch.
//
// before (pre-dispatch):
//   - TRACK_DAILY_ACTION: records _dayActions + _apBefore marker
//   - BEHAVIOR_PROFILING: recordActionHistory + hoarding tracking
//
// after (post-dispatch):
//   - AP_STEAL_CHECK: pollution AP deception
//   - AP_CHANGE_AUDIO: sound feedback on AP changes

import { getPhase } from '../../engine/WorldTimeSystem.js';
import { pick } from '../utils.js';
import { recordActionHistory } from '../../engine/EventEngine.js';
import { applySanConsequences, tryApSteal } from '../../systems/sanConsequenceChain.js';
import { getSanStageFromGD } from '../sanReducer.js';

export var systemSlice = {
  name: 'system',
  ownedFields: ['_apLies', '_apOffset', '_dayActions'],
  initialState: {
    _apLies: false,
    _apOffset: 0,
  },

  // ── beforeDispatch: runs before every domain handler ──
  before: function (s, action, c) {
    // 1. Daily action tracking for behavior endings
    var trackableTypes = [
      'MOVE', 'EXPLORE', 'TALK_NPC', 'USE_ITEM', 'SWITCH_SAFEHOUSE',
      'REST', 'GAMBLE_CHOICE', 'DO_SKILL_CHECK', 'NPC_RESPONSE',
      'WORK', 'PREACH', 'ATTACK', 'BUY_FOOD',
    ];
    if (trackableTypes.indexOf(action.type) !== -1 && action.type !== 'REST') {
      s._dayActions.push(
        action.type === 'NPC_RESPONSE' ? (action.choice || 'talk') : action.type
      );
    }

    // 2. Behavioral profiling — record action history for event selection
    if (typeof recordActionHistory === 'function') recordActionHistory(s, action.type);

    // 3. Hoarding tracking — track max food/money seen
    if ((s.food || 0) > (c.bt.hoarded_food_max || 0))
      c.bt.hoarded_food_max = s.food;
    if ((s.money || 0) > (c.bt.hoarded_money_max || 0))
      c.bt.hoarded_money_max = s.money;

    // 4. Mark AP before this action (for AP_CHANGE_AUDIO in afterDispatch)
    s._apBefore = s.ap;
  },

  // ── afterDispatch: runs after every domain handler ──
  after: function (s, action, c) {
    // 0. SAN consequence chain: level-based logical consequences (fake options, fake trust, AP steal, weight shift)
    //    NPC_RESPONSE and EXPLORE are handled in their respective slices; applySanConsequences skips them.
    applySanConsequences(s, c, action.type);

    // 1. AP 偷取检测（旧系统：_apLies 污染态，仅对特定 action 生效）
    //    level 5+ 的强制 AP 偷取已由 applySanConsequences -> tryApSteal 处理
    //    此处保留 _apLies 体系以兼容低等级污染叙事
    if (s._apLies && s._apOffset > 0 && (getSanStageFromGD(s.san).level || 0) < 5) {
      var _apActions = [
        'MOVE', 'EXPLORE', 'TALK_NPC', 'WORK', 'BUY_FOOD', 'NPC_RESPONSE',
        'SELF_HARM', 'SPREAD_PROPHECY', 'CONSUME_ARCHIVE', 'SELF_SACRIFICE',
        'DESECRATE', 'BREAK_SEAL',
      ];
      if (_apActions.indexOf(action.type) !== -1 && s.ap > 0) {
        var _stealChance = s._apOffset >= 3 ? 0.4 : 0.2;
        if ((c.rng ? c.rng.next() : Math.random()) < _stealChance) {
          s.ap = Math.max(0, s.ap - 1);
          var _stealTexts = [
            '你好像忘了什么。不是记忆——是时间。',
            '你低头看了一眼表。指针跳了一格。你确定刚才没有那么久。',
            '你的脚步比你预期的慢了一些。不是疲劳——是空间本身变厚了。',
            '你做了那个动作。但代价比你想象的多了一点。',
          ];
          c.narr('system', pick(_stealTexts, c.rng), { isEffect: true });
        }
      }
    }

    // 1b. Fake trust consequence: AP steal when NPC_RESPONSE had fake trust hint
    //     (applySanConsequences skips NPC_RESPONSE; this handles that gap)
    if (s._pendingSanConsequence && s._pendingSanConsequence.type === 'fake_trust') {
      var _fakeTrustLevel = getSanStageFromGD(s.san).level || 0;
      if (_fakeTrustLevel >= 5) {
        tryApSteal(s, c, _fakeTrustLevel);
      }
      delete s._pendingSanConsequence;
    }

    // 2. AP 变化音效：通用检测，覆盖所有 action type
    var _apBefore = s._apBefore;
    delete s._apBefore; // cleanup marker
    if (typeof _apBefore === 'number' && s.ap < _apBefore) {
      if (s.ap <= 0 && _apBefore > 0) {
        c.effects.push({ type: 'AUDIO_PLAY', id: 'ui_click_forbidden' });
      } else if (s.ap <= 2 && _apBefore > 2) {
        c.effects.push({ type: 'AUDIO_PLAY', id: 'ui_error' });
      }
      if (s.ap <= 3 && _apBefore > 3) {
        try {
          c.effects.push({
            type: 'AUDIO_AMBIENT',
            area: s.currentArea,
            phase: getPhase(s.ap, s.maxAp),
          });
        } catch (e) { /* silent */ }
      }
    }
  },
};
