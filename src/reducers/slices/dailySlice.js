// src/reducers/slices/dailySlice.js — Thin dispatcher for REST / WORK / BUY_FOOD
// All REST sub-functions live in src/systems/daily/ (domain-owned system files).
// This file only handles WORK and BUY_FOOD inline, plus dispatches REST steps.

import { rand, clamp, applySanLoss } from '../utils.js';
import { GAME_BALANCE } from '../../state/gameConstants.js';
import { narrApInsufficient } from '../../utils/appHelpers.js';
import { maybeInjectPhantomLog } from '../../systems/textVariants.js';

// ── Daily REST pipeline (domain-owned, imported) ─────────────────────

import {
  _processFoodAndStarvation,
} from '../../systems/daily/foodSystem.js';
import {
  _processSafehouseAndWorldDecay,
} from '../../systems/daily/safehouseSystem.js';
import {
  _processRestRecovery,
} from '../../systems/daily/restRecovery.js';
import {
  _advanceDayClock,
  _processChapterAndMotif,
} from '../../systems/daily/dayAdvance.js';
import {
  _processDayCriticalAndDecay,
} from '../../systems/daily/dayCritical.js';
import {
  _processNpcCorruption,
  _processNightEffects,
} from '../../systems/daily/nightEffects.js';
import {
  _processDayOpenAndEndings,
  _processRestBookkeeping,
} from '../../systems/daily/dayOpen.js';

// ── Main handler ──────────────────────────────────────────────────────

export function handleDailyAction(draft, action, c, ctx) {
  switch (action.type) {
    case 'REST': {
      const _startSan = draft.san,
        _startHp = draft.hp,
        _startClues = (draft.clues || []).length,
        _startArea = draft._dayStartArea || draft.currentArea;
      if (_processFoodAndStarvation(draft, c, ctx)) return null; // player died
      const shStage = _processSafehouseAndWorldDecay(draft, c, ctx);
      _processRestRecovery(draft, c, shStage, ctx);
      const oldDay = _advanceDayClock(draft, c, ctx);
      _processChapterAndMotif(draft, c, oldDay, ctx);
      _processDayCriticalAndDecay(draft, c, ctx);
      _processNpcCorruption(draft, c, ctx);
      _processNightEffects(draft, c, ctx);
      _processDayOpenAndEndings(draft, c, _startSan, _startHp, _startClues, _startArea, ctx);
      _processRestBookkeeping(draft, c, ctx);
      // "Suspected bug" — phantom log entry (0.5% at low SAN/high loop)
      maybeInjectPhantomLog(draft.eventLog, draft.san, draft.loopCount, c.rng);
      return null;
    }
    case 'WORK': {
      if (draft.ap < 2) {
        narrApInsufficient(draft, c.narr, 2);
        return null;
      }
      draft.ap -= 2;
      // AP 消耗音效反馈
      if (draft.ap <= 2 && draft.ap > 0) {
        c.effects.push({ type: 'AUDIO_PLAY', id: 'ui_error' });
      } else if (draft.ap <= 0) {
        c.effects.push({ type: 'AUDIO_PLAY', id: 'ui_click_forbidden' });
      }
      const earned = rand(3, 12, c.rng);
      draft.money = (draft.money || 0) + earned;
      c.bt.work_count = (c.bt.work_count || 0) + 1;
      if ((draft.money || 0) > (c.bt.hoarded_money_max || 0))
        c.bt.hoarded_money_max = draft.money;
      c.narr('system', '你在码头帮了半天工。报酬微薄，但至少口袋里多了几枚硬币。金钱 +' + earned);
      c.log('打工挣钱');
      return null;
    }
    case 'BUY_FOOD': {
      if (draft.ap < 1) {
        narrApInsufficient(draft, c.narr, 1);
        return null;
      }
      const foodPrice = 3;
      if ((draft.money || 0) < foodPrice) {
        c.narr('system', '你的钱不够。购买食物需要 ' + foodPrice + ' 金钱。');
        return null;
      }
      if ((draft.food || 0) >= (draft.maxFood || 5)) {
        c.narr('system', '你的食物已经满了。');
        return null;
      }
      draft.ap -= 1;
      // AP 消耗音效反馈
      if (draft.ap <= 2 && draft.ap > 0) {
        c.effects.push({ type: 'AUDIO_PLAY', id: 'ui_error' });
      } else if (draft.ap <= 0) {
        c.effects.push({ type: 'AUDIO_PLAY', id: 'ui_click_forbidden' });
      }
      draft.money -= foodPrice;
      draft.food = Math.min(draft.maxFood, (draft.food || 0) + 1);
      c.narr('system', '你在杂货店买了一些食物。食物 +1，金钱 -' + foodPrice);
      c.log('购买食物');
      return null;
    }
    default:
      return null;
  }
}
