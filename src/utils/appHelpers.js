// src/utils/appHelpers.js - Extracted from app.jsx
// All functions use global GD, ctx, pick, clamp from bundle scope.

import { clamp, pick, makeRand } from '../reducers/utils.js';
import { hasClueId } from './clueNameMap.js';
export { hasClueId };
import { buildDeathSummary } from '../systems/deathSummary.js';
import { hasTriggered, syncTriggeredSet } from './triggeredSet.js';
import { generatePersonalityReport } from '../data/behavior_endings.js';
// P1-A: use getSanStageFromGD instead of hardcoded SAN thresholds
import { getSanStageFromGD } from '../reducers/sanReducer.js';
import { applyTextPollution } from '../systems/textPollution.js';
import { captureNpcEcho } from '../reducers/npcReducer.js';
// P-REFACTOR: getPerceptionLevels moved to systems/sanityVisual.js
// Re-export removed — concatenation build declares it once from sanityVisual.js
// Explicit imports — these were previously implicit globals from the bundle scope
import { getPhase, getAreaInfo } from '../engine/WorldTimeSystem.js';
import { checkEnding } from '../reducers/endingReducer.js';
import { generateDeathFragments, decayDeathFragments } from '../systems/deathLegacies.js';
import { getDeathCountMetaEvent } from '../data/events/events_death_count_meta.js';
import { audioManager } from '../managers/AudioManager.js';

export function getUICorruptionLayer(san, loopCount, safehouseCorruption) {
  // P1-A: SAN thresholds derive from stage.level (SSOT, 7 stages)
  // safehouseCorruption thresholds remain explicit (not part of san_stages)
  const stage = getSanStageFromGD(san);
  if (safehouseCorruption >= 80 || stage.level >= 5) return 4; // hostile — 濒死 / 极度腐化
  if (safehouseCorruption >= 60 || stage.level >= 3) return 3; // contradictory — 现实崩解/认知迷雾
  if (loopCount >= 3 || stage.level >= 2) return 2; // repetitive — 感知偏移
  if (safehouseCorruption >= 20 || stage.level >= 1) return 1; // fogged — 轻度侵蚀
  return 0; // clean — 理智
}

export function modHumanity(state, amount, reason, rng) {
  state.humanityScore = clamp((state.humanityScore ?? 50) + amount, 0, 100);
  if (Math.abs(amount) >= 5) {
    const narr = state.narrative;
    const label = amount > 0 ? '人性光辉' : '人性暗面';
    var _rand = rng ? rng.next.bind(rng) : Math.random;
    narr.push({
      id: _rand() * 0xFFFFFF | 0,
      type: 'system',
      text: '【' + label + '】' + reason,
      isSpecial: true,
    });
  }
}

export function getHumanityTier(score) {
  if (score >= 60) return 'high';
  if (score >= 30) return 'fragile';
  return 'lost';
}

export function addRunMemory(state, text, type = 'choice') {
  if (!state.runMemory) state.runMemory = [];
  state.runMemory.push({ day: state.day, type, text: '第 ' + state.day + ' 天：' + text });
  if (state.runMemory.length > 12) state.runMemory = state.runMemory.slice(-12);
}

export function buildDeathRecap(state, deathContext = null) {
  const mem = state.runMemory || [];
  // Use precise death type from resolveDeath if available, fall back to binary check
  const HP_TYPES = [
    'drowning',
    'bleeding',
    'infection',
    'starvation',
    'falling',
    'darkness_taken',
    'physical',
  ];
  const SAN_TYPES = [
    'madness',
    'possession',
    'identity_erasure',
    'mythos_absorption',
    'loop_collapse',
    'becomes_event',
    'mental',
  ];
  let deathType;
  if (deathContext?.type) {
    deathType = HP_TYPES.includes(deathContext.type)
      ? 'physical'
      : SAN_TYPES.includes(deathContext.type)
        ? 'mental'
        : 'hybrid';
  } else {
    deathType =
      state.hp <= 0 ? 'physical' : state.san <= 0 ? 'mental' : state.day > 28 ? 'time' : 'unknown';
  }
  const deathEntry = mem.filter((m) => m.type === 'death').slice(-1)[0];
  const causeEvent = deathEntry
    ? deathEntry.text.replace(/^第 \d+ 天：/, '')
    : state.day > 28
      ? '封印崩溃，时间耗尽。'
      : '你倒在了沃切斯特的黑暗中。';
  const timeline =
    mem.length > 0
      ? mem
          .slice(-8)
          .map((m) => ({ day: m.day, type: m.type, text: typeof m === 'string' ? m : m.text }))
      : [
          {
            day: state.day,
            type: 'death',
            text: '第 ' + state.day + ' 天：你走到了记录无法继续的地方。',
          },
        ];
  const keyDiscoveries = (state.clues || [])
    .slice(-5)
    .map((c) => (typeof c === 'object' ? c.name : c));
  const conclusionsUnlocked = state.discoveredConclusions || [];
  const npcEntries = Object.entries(state.npcTrust || {})
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const pollutionGained = state.pollution || 0;
  const adviceLines = [];
  if (deathType === 'physical') adviceLines.push('也许下次该更加小心，或者准备一些治疗物品。');
  else if (deathType === 'mental')
    adviceLines.push('理智比你想的更加脆弱。也许该寻找能帮助你保持清醒的盟友。');
  if (state.day <= 3) adviceLines.push('你走得还不够远。试着多和人交谈，获取更多信息。');
  else if (state.day <= 7) adviceLines.push('你已经开始触及真相了。保持耐心。');
  else adviceLines.push('你已经走了很远。下一个轮回，你会记得更多。');
  return {
    deathType,
    day: state.day,
    causeEvent,
    timeline,
    keyDiscoveries,
    conclusionsUnlocked,
    npcTrustHighlights: npcEntries,
    permanentUnlocks: state.activeBlessings || [],
    pollutionGained,
    adviceLine: adviceLines[0] || '雾不会放弃。你也不应该。',
  };
}


export function applyBlessing(state, blessing, narr, ctx) {
  if (!blessing) return;
  var GD = ctx?.GD || {};
  const eff = blessing.effect || {};
  narr('system', '【恩赐·' + blessing.name + '】' + blessing.description, { isSpecial: true });
  if (eff.type === 'unlock_knowledge' && eff.knowledge_id) {
    if (!state.retainedKnowledge.includes(eff.knowledge_id))
      state.retainedKnowledge.push(eff.knowledge_id);
  }
  if (eff.type === 'npc_trust_bonus') {
    const coreNpcs = (GD.npcs || []).filter((n) => n.chapter_1_availability === 'core');
    if (coreNpcs.length > 0) {
      const t = pick(coreNpcs);
      setNpcTrust(state, t.name, getNpcTrust(state, t.name) + (eff.amount || 1));
    }
  }
  if (eff.type === 'skip_intro') {
    state.ch1IntroComplete = true;
  }
  if (blessing.bonus_skill_points) {
    const skills = Object.keys(state.skills);
    if (skills.length > 0) {
      const sk = pick(skills);
      state.skills[sk] = (state.skills[sk] || 0) + blessing.bonus_skill_points;
    }
  }
}

export function getAvailableSafehouses(state, ctx) {
  var GD = ctx?.GD || {};
  const alts = GD.systems?.safehouse?.relocation_rules?.alternative_safehouses || [];
  return alts.filter((sh) => {
    const npcName = sh.unlock_condition.includes('伊莱亚斯')
      ? '伊莱亚斯·沃德'
      : sh.unlock_condition.includes('希尔达')
        ? '希尔达·莫里斯'
        : null;
    const trustNeeded = parseInt(sh.unlock_condition.match(/\d+/)?.[0] || '99');
    return npcName && getNpcTrust(state, npcName) >= trustNeeded;
  });
}

// === Death Resolution (extracted from 4 duplicate blocks in app.jsx) ===
const _DEATH_HP_TYPES = [
  'drowning',
  'bleeding',
  'infection',
  'starvation',
  'falling',
  'darkness_taken',
  'physical',
];
const _DEATH_SAN_TYPES = [
  'madness',
  'possession',
  'identity_erasure',
  'mythos_absorption',
  'loop_collapse',
  'becomes_event',
  'mental',
];

/**
 * Play death sound, write narrative, build ending, track memory.
 * Mutates `s` directly (same as gameReducer convention).
 *
 * @param {object} s          - mutable game state
 * @param {object} deathCtx   - from resolveDeath()
 * @param {function} narr     - narrative pusher
 * @param {object} [ctx]      - { GD } game data context
 */
export function applyDeathResolution(s, deathCtx, narr, ctx) {
  var GD = ctx?.GD || {};
  s.deathContext = deathCtx;
  s.lastDeathType = deathCtx.type;
  s.lastDeathMode = deathCtx.mode;
  // Sound
  if (_DEATH_HP_TYPES.includes(deathCtx.type)) audioManager.playEffect('death_physical');
  else if (_DEATH_SAN_TYPES.includes(deathCtx.type)) audioManager.playEffect('death_mental');
  else audioManager.playEffect('death_hybrid');
  // Narrative
  narr('death', deathCtx.finalText, { isSpecial: true });
  // Build death summary (4-section narrative)
  const deathSummary = buildDeathSummary(s, deathCtx, ctx);
  // Personality report from behavior tracking
  const personalityReport = generatePersonalityReport(s.behaviorTracking || {}, s.humanityScore ?? 50);
  // Ending
  if (deathCtx.mode === 'hp') {
    const failPhys = GD.implementation_notes?.failure_states?.failure_types?.physical_death;
    s.ending = {
      name: failPhys?.name || deathCtx.type,
      type: 'bad',
      description: deathCtx.finalText,
      recap: buildDeathRecap(s, deathCtx),
      deathSummary,
      personalityReport,
    };
  } else if (deathCtx.mode === 'san') {
    const ending = checkEnding(s, ctx);
    if (ending) {
      s.ending = { ...ending, recap: buildDeathRecap(s, deathCtx), deathSummary, personalityReport };
    } else {
      const failMental = GD.implementation_notes?.failure_states?.failure_types?.mental_death;
      s.ending = {
        name: failMental?.name || deathCtx.type,
        type: 'bad',
        description: deathCtx.finalText,
        permanent_pollution: failMental?.permanent_pollution || 0,
        recap: buildDeathRecap(s, deathCtx),
        deathSummary,
        personalityReport,
      };
    }
  } else {
    s.ending = {
      name: '身心俱灭',
      type: 'bad',
      description: deathCtx.finalText,
      recap: buildDeathRecap(s, deathCtx),
      deathSummary,
      personalityReport,
    };
  }
  addRunMemory(s, deathCtx.finalText.split('\n')[0], 'death');
  if (!s.tutorialSeen.first_death) s.tutorialSeen = { ...s.tutorialSeen, first_death: true };

  // ── Death fragments: narrative legacy across loops ──
  generateDeathFragments(s, deathCtx, null);

  // ── Death count meta: check if threshold crossed ──
  var totalDeaths = s.stats_run?.deaths || 0;
  if (totalDeaths > 0) {
    var metaCheck = getDeathCountMetaEvent(totalDeaths);
    if (metaCheck && !s.metaEventFlags?.[metaCheck.seenFlag]) {
      // Store pending meta event for BEGIN_ADVENTURE to display
      if (!s.metaEventFlags) s.metaEventFlags = {};
      s.metaEventFlags[metaCheck.seenFlag] = true;
      s._pendingDeathCountMeta = {
        event: metaCheck.event,
        threshold: metaCheck.threshold,
      };
    }
  }
}

// === Daily Summary Card (extracted from REST case in app.jsx) ===
const _ACT_NAMES = {
  MOVE: '移动',
  EXPLORE: '探索',
  TALK_NPC: '交谈',
  WORK: '打工',
  BUY_FOOD: '购买食物',
  USE_ITEM: '使用物品',
  SWITCH_SAFEHOUSE: '更换安全屋',
};

export function narrDailySummary(s, narr, _startSan, _startHp, _startClues, _startArea, ctx, rng) {
  var _rand = makeRand(rng);
  const acts = s._dayActions || [];
  const areaObj = getAreaInfo(_startArea, ctx);
  const areaName = areaObj?.name || '沃切斯特';
  const sanDelta = s.san - _startSan;
  const hpDelta = s.hp - _startHp;
  const cluesFound = (s.clues?.length || 0) - _startClues;
  const parts = ['今日在' + areaName + '活动。'];
  if (acts.length === 0) parts.push('整天待在安全屋休息。');
  else {
    const actCounts = {};
    acts.forEach((a) => {
      actCounts[a] = (actCounts[a] || 0) + 1;
    });
    const desc = Object.entries(actCounts)
      .map(([k, v]) => (_ACT_NAMES[k] || k) + (v > 1 ? '×' + v : ''))
      .join('、');
    parts.push('行动：' + desc + '。');
  }
  if (sanDelta !== 0) parts.push('精神' + (sanDelta > 0 ? '+' : '') + sanDelta);
  if (hpDelta !== 0) parts.push('体力' + (hpDelta > 0 ? '+' : '') + hpDelta);
  if (cluesFound > 0) parts.push('发现' + cluesFound + '条线索');
  if (acts.includes('EXPLORE') && cluesFound === 0) parts.push('探索未发现新线索');
  // ── 总结污染：低 SAN 时总结开始"撒谎" ──
  const _sanLvl = getSanStageFromGD(s.san).level;
  if (_sanLvl >= 3 && parts.length > 2) {
    // 随机省略一条行动记录（玩家"忘记"了自己做了什么）
    const _omitIdx = 1 + Math.floor(_rand() * (parts.length - 2));
    if (_omitIdx < parts.length) parts.splice(_omitIdx, 1);
  }
  if (_sanLvl >= 4) {
    // SAN 极低时，总结中加入未发生的事件
    const _phantomParts = [
      '你好像在某个地方停留了很久。你不记得是哪里。',
      '有人对你说了一句话。但你想不起是谁。',
      '你的笔记本上多了一行你不记得写过的字。',
      '你发现袖口沾了海盐。但你今天没有去码头。',
    ];
    parts.push(_phantomParts[Math.floor(_rand() * _phantomParts.length)]);
  }
  // 数值轻微失真
  if (_sanLvl >= 2 && sanDelta !== 0 && _rand() < 0.3) {
    // 替换真实 SAN 变化为 ±1 的误差
    const _fake = sanDelta + (_rand() < 0.5 ? 1 : -1);
    const _sanPart = '精神' + (_fake > 0 ? '+' : '') + _fake;
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].startsWith('精神')) { parts[i] = _sanPart; break; }
    }
  }
  narr('system', '【今日总结】' + parts.join('，') + '。', { isSpecial: true });
}

// === Daily Behavior Pattern Analysis (extracted from REST case) ===
export function trackDailyBehaviorPatterns(s, bt) {
  const acts = s._dayActions || [];
  if (acts.length === 0) {
    bt.sleep_streak = (bt.sleep_streak || 0) + 1;
  } else {
    bt.sleep_streak = 0;
  }
  if (acts.length <= 1) {
    bt.low_intervention_count = (bt.low_intervention_count || 0) + 1;
  }
  const hasMove = acts.includes('MOVE'),
    hasExplore = acts.includes('EXPLORE'),
    hasTalk = acts.some(
      (a) =>
        a === 'TALK_NPC' ||
        a === 'trust_up' ||
        a === 'get_item' ||
        a === 'silence' ||
        a === 'share_food' ||
        a === 'redeem' ||
        a === 'incite' ||
        a === 'preach' ||
        a === 'attack'
    );
  const hasWork = acts.includes('WORK') || acts.includes('BUY_FOOD'),
    hasItem = acts.includes('USE_ITEM');
  const stayedInArea = !hasMove;
  if (stayedInArea) {
    bt.safehouse_stay_days = (bt.safehouse_stay_days || 0) + 1;
  }
  if (hasWork && !hasExplore && !hasTalk && !hasMove) {
    bt.work_only_days = (bt.work_only_days || 0) + 1;
  }
  if (hasMove && !hasExplore && !hasTalk && !hasWork) {
    bt.move_only_days = (bt.move_only_days || 0) + 1;
  }
  if (hasItem && !hasMove && !hasExplore && !hasTalk && !hasWork) {
    bt.record_only_days = (bt.record_only_days || 0) + 1;
  }
}

export function checkWrongInference(state, narr, GD) {
  if (hasTriggered(state, 'wrong_inference_checked')) return;
  const wi = GD.systems?.wrong_inference?.consequences || [];
  for (const inf of wi) {
    if (
      inf.id === 'wrong_lighthouse_destroy' &&
      state.visitedAreas.includes('lighthouse') &&
      hasTriggered(state, 'evt_lighthouse_light') &&
      !hasClueId(state.clues, 'clue_2_2')
    ) {
      state.triggeredEvents.push('wrong_inference_checked');
      syncTriggeredSet(state, 'wrong_inference_checked');
      narr('system', '【错误推断】你开始怀疑灯塔是邪恶的源头。也许破坏它能解决问题……', {
        isSpecial: true,
      });
      break;
    }
  }
}

// === CH1 Vertical Slice Script ===
export const CH1_INTRO = [
  { type: 'system', text: '公元1926年，马萨诸塞州东南海岸。' },
  {
    type: 'system',
    text: '你乘坐的长途汽车在浓雾中停了下来。司机回头看了一眼，没有说话，只是指了指车窗外隐约可见的路牌：\n\n沃切斯特 —— 3英里',
  },
  {
    type: 'location',
    text: '鹅卵石街道在雨后泛着暗沉的光泽，两侧的维多利亚式建筑虽然外表还算完整，但窗后的窗帘永远紧闭。市政厅前的广场上矗立着一座建城者雕像，雕像的面容在岁月侵蚀下变得模糊不清。\n\n公告栏上贴满了失踪人口的告示，日期跨度长达三年。',
    locationName: '沃切斯特镇中心',
  },
  {
    type: 'system',
    text: '教堂的钟响了。\n一下。两下。三下。\n……\n十二下。\n……\n十三下。\n\n没有人抬头。',
  },
  {
    type: 'system',
    text: '【提示】你可以在镇中心和码头区自由活动。对话NPC获取情报，探索区域收集线索。\n注意SAN值——正常事件不会消耗你的理智，但深究异常需要付出代价。',
  },
];
// === Event Type Labels ===
export const EVENT_TYPE_LABELS = {
  opening_cut: '序章',
  area_event: '区域事件',
  mythos: '神秘事件',
  resource: '资源事件',
  humanity: '人性事件',
  meta: '隐秘事件',
  silent: '静默事件',
  prologue: '前传',
  area_deep: '深层探索',
  npc_cross: 'NPC交错',
  loop_locked: '轮回锁定',
  clue: '线索',
  ending: '结局',
  madness_immunity: '疯狂免疫',
  identify_false_clue: '辨别伪证',
  mechanism: '机关',
  horror: '恐怖',
  investigation: '调查',
  minor_abnormal: '轻微异常',
  normal: '普通',
  bad: '负面',
  good: '正面',
  hidden: '隐藏',
  consumable: '消耗品',
  key_item: '关键物品',
  add_clue: '线索获取',
  add_flag: '标记',
  modify_event_weight: '事件权重',
  modify_npc_trust: '信任变动',
  modify_resource: '资源变动',
};
// === Ending CG Preload ===
export const ENDING_CGS = [
  '人肉税',
  '伊莎贝拉 救赎',
  '伊莎贝拉：第十二声',
  '伊莱亚斯 守门人',
  '伪神',
  '删档祈愿者',
  '十三响的先知',
  '升座的牺牲品',
  '囚徒',
  '回音',
  '埃德加 观测者',
  '多余的餐具',
  '守财奴',
  '守门人',
  '容器',
  '封印的亲吻',
  '屠宰场',
  '希尔达的选择',
  '希尔达：封印代价',
  '希尔达：终局知情',
  '异端降临',
  '归海',
  '循环的蛀虫',
  '悦纳者',
  '愉悦的先知',
  '成为事件的残页',
  '整洁的屠夫',
  '断环',
  '无效档案',
  '旧汗渍',
  '最佳员工',
  '最后的人事',
  '木偶师',
  '档案吞噬者',
  '永恒记录员',
  '污圣徒',
  '洗不掉的印记',
  '海上逃离',
  '深渊吞噬',
  '溶盐者',
  '漂浮的外套',
  '漫游者',
  '潮声之婚',
  '王座上的蛆',
  '玩家成为事件',
  '白页',
  '空白事件卡',
  '空白墓碑',
  '第600事件：笔记本最后一页',
  '第600结局：墨水化',
  '第600预兆：事件日志问号',
  '第600预兆：路人低语',
  '第十二声',
  '筹码',
  '约书亚 救赎',
  '老费舍 最后的人事',
  '血肉合唱',
  '被观察者',
  '裂痕',
  '观测者',
  '证据逃离',
  '账房先生',
  '超越者',
  '身心俱灭',
  '轮回破壁',
  '镜中缺席者',
  '长眠者',
  '页码599变600',
  '餐具',
  '骨头落地的声音',
  '黑暗中的手',
  '黑潮圣婚',
];
let _cgPreloaded = false;
export function preloadEndingCGs() {
  if (_cgPreloaded) return;
  _cgPreloaded = true;
  const batch = (start) => {
    const end = Math.min(start + 5, ENDING_CGS.length);
    for (let i = start; i < end; i++) {
      const img = new Image();
      img.src = 'assets/webp_ending/' + encodeURIComponent(ENDING_CGS[i]) + '.webp';
    }
    if (end < ENDING_CGS.length) {
      const sched =
        window.requestIdleCallback || window.requestAnimationFrame || ((cb) => setTimeout(cb, 200));
      sched(() => batch(end));
    }
  };
  batch(0);
}

// === Reducer Context Builder (Immer) ===
// Builds the shared context object passed to all slice handlers from gameReducer.
// `s` is an Immer draft — all direct mutations are safe.
// P_NEXT: opts.rng — seeded RNG for deterministic gameplay (replaces Math.random in reducers)
// P_NEXT: opts.now — deterministic timestamp (replaces Date.now in reducers)
export function buildReducerCtx(s, opts, corruptFn) {
  const MAX_NARRATIVE_ENTRIES = 250;
  const _narrCorrLayer = getUICorruptionLayer(s.san, s.loopCount, s.safehouseCorruption);
  const _corruptText = corruptFn || function (t) { return t; };
  const effects = [];
  const narr = (type, text, extra = {}) => {
    var _rand = (opts && opts.rng) ? opts.rng.next.bind(opts.rng) : Math.random;
    const entry = { id: _rand() * 0xFFFFFF | 0, type, text, ...extra };
    if (
      _narrCorrLayer > 0 &&
      (type === 'system' || type === 'event') &&
      !extra.isSpecial &&
      !extra.isEffect &&
      !extra.madness
    ) {
      const corrupted = _corruptText(text, _narrCorrLayer);
      if (corrupted !== text) {
        entry._originalText = text;
        entry.text = corrupted;
      }
    }
    // P2-5: text pollution (SAN-driven) — applies to all non-special text
    if (!extra.isSpecial && !extra.isEffect && !extra.madness) {
      const polluted = applyTextPollution(entry.text, s.san, s.loopCount);
      if (polluted !== entry.text) entry._originalText = entry._originalText || entry.text;
      entry.text = polluted;
    }
    s.narrative.push(entry);
    if (s.narrative.length > MAX_NARRATIVE_ENTRIES) {
      s.narrative = s.narrative.slice(-MAX_NARRATIVE_ENTRIES);
    }
  };
  const log = (text) => {
    s.eventLog.push({ day: s.day, text });
  };
  // View object for portraitMap functions — extracts display-relevant fields only
  const view = {
    phase: getPhase(s.ap, s.maxAp),
    visits: 0, // computed per-area by caller
    pollution: s.pollution || 0,
    san: s.san,
    hp: s.hp,
    maxHp: s.maxHp,
    loopCount: s.loopCount || 0,
    madnessActive: !!s.madnessActive,
  };
  return {
    narr,
    log,
    effects,
    bt: s.behaviorTracking,
    view,
    // P_NEXT: Seeded RNG — all story-affecting randomness should use c.rng
    rng: (opts && opts.rng) || null,
    now: (opts && opts.now) || Date.now(),
    // Deterministic pick — uses rng if available, falls back to Math.random
    pick: (opts && opts.rng) ? opts.rng.pick : function (arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  };
}

// === NPC Trust Compat Helpers ===
// Resolve npcTrust key: tries direct key first, then resolveNpcId fallback.
// Works with both Chinese name keys (old) and stable id keys (new).
export function getNpcTrust(s, name) {
  if (s.npcTrust[name] !== undefined) return s.npcTrust[name];
  if (typeof resolveNpcId === 'function') {
    var id = resolveNpcId(name);
    if (id !== name && s.npcTrust[id] !== undefined) return s.npcTrust[id];
  }
  return 0;
}
export function setNpcTrust(s, name, value) {
  // Always write to resolved id — state naturally converges to id keys
  var id = typeof resolveNpcId === 'function' ? resolveNpcId(name) : name;
  s.npcTrust[id] = Math.max(0, Math.min(5, value));
}
export function getNpcState(s, name) {
  if (s.npcStates[name]) return s.npcStates[name];
  if (typeof resolveNpcId === 'function') {
    var id = resolveNpcId(name);
    if (id !== name && s.npcStates[id]) return s.npcStates[id];
  }
  return {};
}
export function setNpcState(s, name, value) {
  var id = typeof resolveNpcId === 'function' ? resolveNpcId(name) : name;
  s.npcStates[id] = value;
  // Capture echo for next loop if NPC just died
  if (value.dead) captureNpcEcho(s, id);
}

// === Knowledge Tracking (moved from app.jsx) ===
// === AP Pollution Display Helper ===
// When _apLies is true, display AP with offset (player sees more than real).
// All UI components must use this instead of state.ap directly.
export function getDisplayedAp(state) {
  if (state._apLies && state._apOffset) return state.ap + state._apOffset;
  return state.ap;
}

// AP 污染下的行动点不足提示——揭示欺骗
export function narrApInsufficient(s, narr, cost) {
  if (s._apLies && s._apOffset > 0 && s.ap <= 0) {
    // 真实 AP 归零但显示还有余量——揭示被欺骗
    narr('system', '你试图行动。但你的身体不听使唤。\n\n不是疲劳。是时间本身在你不知情的情况下流逝了。\n\n——你以为你还有行动力。但你没有。', { isSpecial: true });
    // 揭示后取消 AP 污染
    s._apLies = false;
    s._apOffset = 0;
  } else {
    narr('system', '行动点不足' + (cost ? '（需要' + cost + 'AP）' : '') + '。');
  }
}

export function checkKnowledgeEarned(state) {
  const k = state.retainedKnowledge;
  if (
    state.visitedAreas.includes('lighthouse') ||
    state.visitedAreas.includes('catacombs_entrance')
  ) {
    if (!k.includes('knowledge_dark_passages')) k.push('knowledge_dark_passages');
  }
  if (Object.values(state.npcTrust).some((t) => t >= 3)) {
    if (!k.includes('knowledge_npc_weaknesses')) k.push('knowledge_npc_weaknesses');
  }
  if (state.visitedAreas.length >= 5) {
    if (!k.includes('knowledge_map_structure')) k.push('knowledge_map_structure');
  }
  if ((state.completedChains || []).length > 0) {
    if (!k.includes('knowledge_clue_relations')) k.push('knowledge_clue_relations');
  }
  if (Object.values(state.npcTrust).some((t) => t >= 2)) {
    if (!k.includes('knowledge_npc_trust_shadow')) k.push('knowledge_npc_trust_shadow');
  }
  // Achievement: areas explored (systems.progression)
  if (!state.stats_run.areas_explored) state.stats_run.areas_explored = state.visitedAreas.length;
  else
    state.stats_run.areas_explored = Math.max(
      state.stats_run.areas_explored,
      state.visitedAreas.length
    );
}

// === SAN Break-Wall Events (moved from app.jsx) ===
// Pure state mutation: narrates and records memory. Returns side-effect descriptors for audio/timers.
// GD passed explicitly to avoid implicit global dependency.
export function checkBreakWallEvent(state, narr, GD, rng) {
  var _rand = makeRand(rng);
  // P1-A: SSOT — only fires at reality_dissolution (level >= 5)
  const _stage = getSanStageFromGD(state.san);
  if (_stage.level < 5) return null;
  if (_rand() >= 0.1) return null;
  const r = _rand();
  const fx = [
    { type: 'AUDIO_PLAY', id: 'wall_break' },
    { type: 'AUDIO_PLAY', id: 'safehouse_wall' },
    { type: 'AUDIO_PLAY', id: 'bell_wrong' },
  ];
  if (r < 0.33) {
    // Effect 1: Fake save message
    narr('system', '存档完成。Day ' + state.day + ' - ' + (state.currentArea || '???'), {
      isSpecial: true,
    });
    fx.push({
      type: 'NARRATE_DELAYED',
      delay: 3000,
      text: '它在看着你写入这段存档。',
      extra: { isSpecial: true },
    });
    addRunMemory(state, '你听见自己的名字在系统提示之外出现。', 'break_wall');
  } else if (r < 0.66) {
    // Effect 2: Fake error
    narr('system', '⚠ 检测到不稳定叙事层\n正在修复……\n修复失败\n它已经知道你在读这段文字了', {
      isSpecial: true,
    });
    addRunMemory(state, '现实出现了裂痕——检测到不稳定叙事层。', 'break_wall');
  } else {
    // Effect 3: Item description篡改
    const items = state.inventory;
    if (items.length > 0) {
      const corruptedItem = pick(items, rng);
      const replacements = {
        怀表: '它在计算你还剩多少时间',
        急救包: '它不确定你是否值得被救',
        手电筒: '光在回避你',
        笔记本和笔: '你写的字在自行修改',
      };
      const corrupted = replacements[corruptedItem.name] || corruptedItem.name + '……它刚才动了？';
      narr('system', '【' + corruptedItem.name + '】……不对。是【' + corrupted + '】', {
        isSpecial: true,
      });
      addRunMemory(state, corruptedItem.name + '的描述被篡改了。', 'break_wall');
    }
  }
  return fx;
}

// === Silent Event Check (moved from app.jsx) ===
// GD passed explicitly to avoid implicit global dependency.
export function checkSilentEvent(state, narr, location, GD) {
  const pool = (GD.implementation_notes?.silent_events?.event_pool || []).filter((e) => {
    if (e.location !== location) return false;
    if (e.repeat_behavior === 'only_once' && state.triggeredSilentEvents.includes(e.id))
      return false;
    if (e.trigger_condition && e.trigger_condition !== 'always') {
      if (e.trigger_condition.startsWith('day>=')) {
        if (state.day < parseInt(e.trigger_condition.split('>=')[1])) return false;
      }
      if (e.trigger_condition.startsWith('corruption>=')) {
        if ((state.safehouseCorruption || 0) < parseInt(e.trigger_condition.split('>=')[1]))
          return false;
      }
    }
    return true;
  });
  if (pool.length === 0) return false;
  const evt = pick(pool);
  state.triggeredSilentEvents.push(evt.id);
  narr('system', evt.text);
  if (evt.mechanical_effect?.san) {
    state.san = clamp(state.san + evt.mechanical_effect.san, 0, state.maxSan);
  }
  return true;
}

// runPostReducerEffects moved to src/runtime/effectExecutor.js
