// src/systems/metaCorruption.js - Meta-layer corruption effects
// False events, false logs, save name pollution at low SAN
// Makes the player feel "the game is playing me"

export var META_CORRUPTION_CHANCE = 0.2; // 20% per REST at SAN < 25

export var FALSE_EVENTS = [
  {
    text: '你听到了敲门声。你打开门，没有人。但门框上多了一行字：「第零天」。',
    prefix: '[系统错误]',
  },
  {
    text: '你的笔记本翻到了一页你不记得写过的笔记。字迹是你的。内容是你明天会做的事。',
    prefix: '[记忆碎片]',
  },
  { text: '你抬头看了一眼安全屋的钟。时间在倒流。你确定刚才不是三点。', prefix: '[时序异常]' },
  { text: '你听到了自己的声音从墙里传出来。说的不是你说过的话。', prefix: '[回声]' },
  { text: '你看到窗外有人在看你。那个人穿着你的衣服。', prefix: '[观察者]' },
  { text: '你安全屋的门自己关上了。你没有听到脚步声，但你知道有人进来了。', prefix: '[入侵]' },
];

export var FALSE_LOGS = [
  '你没有去过那个地方。（但你的鞋是湿的。）',
  '存档在你睡觉的时候被修改了。',
  '事件日志中多了一条你没有触发的记录。',
  '你的SAN值刚才变了一下。不，没有。也许有。',
  '你听到了钟声。日志里没有记录。但你确实听到了。',
  '笔记本上多了一行字：「别相信日志。」',
];

export var SAVE_POLLUTION_NAMES = [
  '它在看着你',
  '第零天',
  '已损坏',
  '你确定吗',
  '已观察',
  '循环#∞',
  '不要打开',
  '时间已停止',
  '记忆已覆盖',
];

/**
 * Apply meta corruption effects during REST.
 * May inject false narrative, false log entries, or pollute save display.
 * Called from dailySlice REST handler.
 * @param {object} s - mutable game state
 * @param {object} c - reducer context
 * @param {number} intensity - 0-100 from settings
 */
// P1-A: SSOT — import getSanStageFromGD for stage-based threshold
import { getSanStageFromGD } from '../reducers/sanReducer.js';

export function applyMetaCorruption(s, c, intensity) {
  // P1-A: SSOT — meta corruption fires at explanation_loss (level >= 3) + loop >= 1
  var _stage = getSanStageFromGD(s.san);
  if (_stage.level < 3 || s.loopCount < 1) return;
  var I = Math.max(0, Math.min(100, intensity || 50)) / 100;
  var chance = META_CORRUPTION_CHANCE * I * Math.max(0, 1 - _stage.level / 5);
  var _rand = c.rng ? c.rng.next.bind(c.rng) : Math.random;
  if (_rand() >= chance) return;

  var roll = _rand();
  if (roll < 0.45) {
    // False event: inject unsettling narrative
    var evt = FALSE_EVENTS[Math.floor(_rand() * FALSE_EVENTS.length)];
    c.narr('system', (evt.prefix ? evt.prefix + ' ' : '') + evt.text, {
      isSpecial: true,
      isEffect: true,
    });
  } else if (roll < 0.75) {
    // False log entry
    var logText = FALSE_LOGS[Math.floor(_rand() * FALSE_LOGS.length)];
    c.log(logText);
  } else {
    // Save name pollution: set a flag for the save/load modal to read
    if (!s._savePollution) s._savePollution = {};
    s._savePollution.name =
      SAVE_POLLUTION_NAMES[Math.floor(_rand() * SAVE_POLLUTION_NAMES.length)];
    s._savePollution.until = s.day + 1 + Math.floor(_rand() * 2);
    c.narr('system', '你感觉有什么东西在你存档的间隙中注视着。', { isSpecial: true });
  }
}

/**
 * Get corrupted save slot display name (if pollution is active).
 * Called from SaveLoadModal rendering.
 * @param {object} state - game state
 * @param {string} originalName - original display name
 * @returns {string} corrupted or original name
 */
export function getCorruptedSaveName(state, originalName) {
  if (!state || !state._savePollution) return originalName;
  if (state.day > (state._savePollution.until || 0)) return originalName;
  return state._savePollution.name || originalName;
}
