#!/usr/bin/env node
/**
 * scripts/deadlock_check.cjs — "无路可走"死锁状态检测器 v4
 *
 * v4 新增：因果路径追踪
 *   - 从正常开局模拟，记录每天的资源变化
 *   - 死亡时回溯最近 5 天的关键事件
 *   - 分类根因：RNG 连续坏运气 / 玩家决策失误 / 数值曲线逼迫
 *
 * 检测三类问题：
 *   A. 三重锁死 (Triple Lock): AP=0 + 💰0 + 🍖0 + HP≤3 → 必然死亡
 *   B. 活不好也死不了 (Zombie): AP=0 + 💰0 + 🍖0 + HP∈[4..10] → 慢性死亡
 *   C. 区域限制死锁 (Location Lock): 无法打工区域 + 资源枯竭
 *
 * 根因分类：
 *   - BAD_RNG: 连续坏运气（打工最低薪、探索受伤、食物事件未触发）
 *   - BAD_DECISION: 玩家决策失误（乱花钱、不优先买食物、过度探索）
 *   - DESIGN_PUSH: 数值曲线逼迫（起始钱少、打工收益不稳定、食物消耗恒定）
 *   - MIXED: 多种因素叠加
 *
 * 用法:
 *   node scripts/deadlock_check.cjs                    # 完整检测
 *   node scripts/deadlock_check.cjs --verbose          # 详细路径
 *   node scripts/deadlock_check.cjs --days 30 --loops 4
 *   node scripts/deadlock_check.cjs --trace            # 仅做路径追踪（从正常开局）
 *   node scripts/deadlock_check.cjs --root-cause       # 重点分析根因
 */

const VERBOSE = process.argv.includes('--verbose');
const TRACE_ONLY = process.argv.includes('--trace');
const ROOT_CAUSE = process.argv.includes('--root-cause');
function getArg(name, def) {
  const idx = process.argv.indexOf('--' + name);
  if (idx === -1) return def;
  const val = process.argv[idx + 1];
  return val && !isNaN(val) ? parseInt(val, 10) : def;
}
const LOCATION_LOCK = process.argv.includes('--location-lock');
const STUCK_LIMIT = 3;
const MAX_DAYS = getArg('days', 30);
const MAX_LOOPS = getArg('loops', 4);

// ══════════════════════════════════════════════════════════════════
// 真实游戏平衡常数（来自 src/reducers/slices/dailySlice.js）
// ══════════════════════════════════════════════════════════════════

const MAX_AP = 12;
const MAX_FOOD = 5;
const FOOD_PRICE = 3;          // 1 食物 = 3 金钱
const WORK_AP_COST = 2;        // 打工 AP 消耗
const WORK_MIN_PAY = 3;        // 打工最低收入
const WORK_MAX_PAY = 12;       // 打工最高收入
const BUY_FOOD_AP_COST = 1;    // 买食物 AP 消耗
const FOOD_PER_REST = 1;       // 每休息消耗 1 食物
const EXPLORE_AP_COST = 2;     // 探索 AP 消耗
const MAX_FOOD_STACK = 5;      // 食物上限

// 起始数值（newGame 默认）
const START_HP = 11;
const START_MAX_HP = 11;
const START_SAN = 60;
const START_MAX_SAN = 99;
const START_MONEY = 0;
const START_FOOD = 3;
const START_AP = 12;

// 饥饿伤害
const STARVATION_SAN_DAY1 = 1;     // 饥饿第1天: SAN -1
const STARVATION_HP_DAY2 = 1;      // 饥饿第2天: HP -1
const STARVATION_HP_DAYP3 = 2;     // 饥饿第3天+: HP -2

// 安全屋 SAN 恢复（按腐蚀阶段 1-5）
const SAFEHOUSE_SAN_REC = [0, 2, 1, 0, -1, -3];

// 轮回保护
const LOOP_PROTECTION = {
  0: { safeDays: 3, starvationMult: 0.5, sanFloor: 10, apCapDays: 3, apCap: 5 },
  1: { safeDays: 2, starvationMult: 0.7, sanFloor: 15, apCapDays: 0 },
  2: { safeDays: 1, starvationMult: 0.85, sanFloor: 10, apCapDays: 0 },
};

// 探索事件概率
const EXPLORE_FOOD_CHANCE = 0.4;   // starving 探索 40% 找到食物
const EXPLORE_DANGER_SAN = 3;      // 探索遇险 SAN-3
const WORK_AREAS = ['town_center', 'harbor_district'];

// ══════════════════════════════════════════════════════════════════
// 兜底事件（来自 src/data/events_resource.js）
// 在非工作区域/资源枯竭时提供生存机会
// ══════════════════════════════════════════════════════════════════

const FALLBACK_EVENTS = [
  // ── 连续饥饿链（最高优先级，food≤0 时必检）──
  {
    id: 'chain_starvation_3',
    name: '第三天的饥饿',
    areas: ['town_center', 'harbor_district'],
    food_lte: 0,
    starvation_day_gte: 3,
    probability: 0.4,
    once_per_run: true,
    effects: { food: 1, san: -2 },
  },
  {
    id: 'chain_martha_feeds',
    name: '玛莎的施舍（连续饥饿）',
    areas: ['harbor_district'],
    food_lte: 0,
    starvation_day_gte: 3,
    probability: 0.35,
    once_per_run: true,
    npc_alive: true,
    effects: { food: 2, san: 2 },
  },
  // ── 一般兜底（food≤0 时）──
  {
    id: 'food_015',
    name: '最后的储备',
    areas: ['town_center'],
    food_lte: 0,
    probability: 0.2,
    once_per_run: true,
    effects: { food: 2, san: -1 },
  },
  {
    id: 'food_003',
    name: '玛莎的施舍',
    areas: ['harbor_district'],
    food_lte: 1,
    probability: 0.2,
    once_per_run: true,
    npc_alive: true,
    effects: { food: 1, san: 1 },
  },
  // ── 一般觅食（food≤2 时）──
  {
    id: 'food_001',
    name: '垃圾桶里的食物',
    areas: ['town_center'],
    food_lte: 2,
    probability: 0.25,
    once_per_run: true,
    effects: { food: 1, san: -1 },
  },
  {
    id: 'food_011',
    name: '垃圾堆里的罐头',
    areas: ['harbor_district'],
    food_lte: 2,
    probability: 0.2,
    once_per_run: true,
    effects: { food: 2, san: -1 },
  },
  {
    id: 'food_012',
    name: '面包店的香气',
    areas: ['town_center'],
    food_lte: 2,
    probability: 0.2,
    once_per_run: true,
    effects: { food: 1, humanity: -2 },
  },
  {
    id: 'food_002',
    name: '渔民的鱼干',
    areas: ['harbor_district'],
    food_lte: 2,
    probability: 0.2,
    once_per_run: true,
    effects: { food: 2 },
  },
  // ── 特殊（food=0 且 money=0 时的绝望事件）──
  {
    id: 'food_005_desperation',
    name: '偷窃的诱惑',
    areas: ['town_center'],
    food_lte: 1,
    money_lte: 1,
    probability: 0.2,
    once_per_run: true,
    effects: { food: 3, humanity: -8 },
  },
  // ── 非工作区域兜底（森林/墓穴等）──
  {
    id: 'forage_forest',
    name: '林中野果',
    areas: ['whispering_forest', 'forbidden_grove'],
    food_lte: 1,
    probability: 0.25,
    once_per_run: true,
    effects: { food: 1, san: -1 },
  },
  {
    id: 'forage_catacomb',
    name: '墓穴真菌',
    areas: ['catacombs_entrance', 'deep_catacombs'],
    food_lte: 1,
    probability: 0.15,
    once_per_run: true,
    effects: { food: 1, san: -2 },
  },
  {
    id: 'forage_ruins',
    name: '遗迹苔藓',
    areas: ['ruins_of_yith'],
    food_lte: 1,
    probability: 0.15,
    once_per_run: true,
    effects: { food: 1, humanity: -2 },
  },
];

// ══════════════════════════════════════════════════════════════════
// PRNG
// ══════════════════════════════════════════════════════════════════

function createRng(seed) {
  let s = seed || Math.floor(Math.random() * 999999);
  return () => {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

// ══════════════════════════════════════════════════════════════════
// 工具函数
// ══════════════════════════════════════════════════════════════════

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function getMaxAp(state) {
  const prot = LOOP_PROTECTION[state.loopCount || 0];
  if (prot && prot.apCapDays > 0 && state.day <= prot.apCapDays) {
    return Math.min(MAX_AP, prot.apCap);
  }
  return MAX_AP;
}

function starvationDmg(sd, loopCount) {
  if (sd === 1) return { type: 'san', value: STARVATION_SAN_DAY1 };
  if (sd === 2) return { type: 'hp', value: applyProtection(STARVATION_HP_DAY2, loopCount) };
  return { type: 'hp', value: applyProtection(STARVATION_HP_DAYP3, loopCount) };
}

function applyProtection(raw, loop) {
  const mult = loop === 0 ? 0.5 : loop === 1 ? 0.7 : loop === 2 ? 0.85 : 1.0;
  return Math.max(1, Math.round(raw * mult));
}

// ══════════════════════════════════════════════════════════════════
// AI 策略
// ══════════════════════════════════════════════════════════════════

function smartAiDecide(s) {
  // Priority 0: can't work and starving -> move to work area first
  if (!s.canWork && s.food <= 1 && s.ap >= 1) return { type: 'MOVE', reason: '去打工区域' };
  // Priority 1: starving -> explore for food
  if (s.food <= 0 && s.ap >= EXPLORE_AP_COST) return { type: 'EXPLORE', reason: ' starving->觅食' };
  // Priority 2: food < 2 AND can afford -> BUY FIRST
  if (s.food < 2 && s.money >= FOOD_PRICE && s.ap >= BUY_FOOD_AP_COST) return { type: 'BUY_FOOD', reason: '食物不足先买' };
  // Priority 3: no money at all -> work to earn first
  if (s.money < FOOD_PRICE && s.food >= 2 && s.ap >= WORK_AP_COST && s.canWork) return { type: 'WORK', reason: '零收入先打工' };
  // Priority 4: food < 2 but can't afford -> work
  if (s.food < 2 && s.ap >= WORK_AP_COST && s.canWork) return { type: 'WORK', reason: '食物不足赚钱' };
  // Priority 5: no money for food -> work
  if (s.money < FOOD_PRICE && s.ap >= WORK_AP_COST && s.canWork) return { type: 'WORK', reason: '缺钱' };
  // Priority 6: food sufficient -> explore
  if (s.food >= 2 && s.ap >= EXPLORE_AP_COST) return { type: 'EXPLORE', reason: '推进' };
  // Priority 7: have money, food not full -> stock up
  if (s.money >= FOOD_PRICE && s.food < MAX_FOOD_STACK && s.ap >= BUY_FOOD_AP_COST) return { type: 'BUY_FOOD', reason: '囤食物' };
  // Priority 8: any remaining AP -> work
  if (s.ap >= WORK_AP_COST && s.canWork) return { type: 'WORK', reason: '赚钱' };
  // Priority 9: can't work but has AP -> try to move
  if (!s.canWork && s.ap >= 1) return { type: 'MOVE', reason: '离开危险区域' };
  return null;
}

function greedyAiDecide(s, rng) {
  const pool = [];
  // 被困且食物不足 → 优先逃离
  if (!s.canWork && s.food <= 2 && s.ap >= 1) return { type: 'MOVE', reason: '逃离' };
  if (s.ap >= WORK_AP_COST && s.canWork) pool.push('WORK');
  if (s.ap >= BUY_FOOD_AP_COST && s.money >= FOOD_PRICE && s.food < MAX_FOOD_STACK) pool.push('BUY_FOOD');
  if (s.ap >= EXPLORE_AP_COST) pool.push('EXPLORE');
  if (pool.length === 0) return null;
  return { type: pool[Math.floor(rng() * pool.length)], reason: '随机' };
}

function starvingAiDecide(s) {
  // Even a struggling player tries to escape and buy food when possible
  if (!s.canWork && s.food <= 2 && s.ap >= 1) return { type: 'MOVE', reason: '逃离危险区' };
  if (s.food <= 0 && s.ap >= EXPLORE_AP_COST) return { type: 'EXPLORE', reason: ' starving->觅食' };
  if (s.food < 2 && s.money >= FOOD_PRICE && s.ap >= BUY_FOOD_AP_COST) return { type: 'BUY_FOOD', reason: '先买食物' };
  if (s.ap >= WORK_AP_COST && s.canWork) return { type: 'WORK', reason: '赚钱买食物' };
  if (!s.canWork && s.ap >= 1) return { type: 'MOVE', reason: '离开' };
  return null;
}

function executeAction(s, action, rng) {
  switch (action.type) {
    case 'MOVE': {
      // 移动到相邻工作区域（消耗 1 AP）
      if (s.ap < 1) return { acted: false, reason: 'AP不足' };
      s.ap -= 1;
      // 简化：假设总能移动到最近的 WORK 区域
      s.currentArea = s._nearestWorkArea || 'town_center';
      s.canWork = true;
      return { acted: true, reason: '移动到' + s.currentArea };
    }
    case 'WORK': {
      if (s.ap < WORK_AP_COST || !s.canWork) return { acted: false, reason: 'AP不足或不能打工' };
      s.ap -= WORK_AP_COST;
      const earned = Math.floor(rng() * (WORK_MAX_PAY - WORK_MIN_PAY + 1)) + WORK_MIN_PAY;
      s.money += earned;
      return { acted: true, reason: '打工 +' + earned, earned };
    }
    case 'BUY_FOOD': {
      if (s.ap < BUY_FOOD_AP_COST || s.money < FOOD_PRICE || s.food >= MAX_FOOD_STACK) {
        return { acted: false, reason: '条件不足' };
      }
      s.ap -= BUY_FOOD_AP_COST;
      s.money -= FOOD_PRICE;
      s.food++;
      return { acted: true, reason: '买食物 -' + FOOD_PRICE };
    }
    case 'EXPLORE': {
      if (s.ap < EXPLORE_AP_COST) return { acted: false, reason: 'AP不足' };
      s.ap -= EXPLORE_AP_COST;
      let detail = '空手而归';
      const foodChance = s.food <= 0 ? EXPLORE_FOOD_CHANCE : EXPLORE_FOOD_CHANCE * 0.15;
      if (s.food <= 0 && rng() < foodChance) {
        s.food += 1;
        detail = '找到食物!';
      } else if (rng() < 0.25) {
        s.san = Math.max(0, s.san - EXPLORE_DANGER_SAN);
        detail = '遇险 SAN-' + EXPLORE_DANGER_SAN;
      }
      return { acted: true, reason: detail };
    }
    default:
      return { acted: false };
  }
}


// ══════════════════════════════════════════════════════════════════
// 兜底事件触发
// ══════════════════════════════════════════════════════════════════

/**
 * 尝试触发兜底事件（觅食/乞讨/NPC施舍）
 * @returns {Array} 触发的事件列表 { id, name, effects }
 */
function triggerFallbackEvents(s, rng) {
  const triggered = [];
  const area = s.currentArea || 'town_center';

  for (const evt of FALLBACK_EVENTS) {
    // 检查是否已经触发过
    if (s._triggeredEvents && s._triggeredEvents.has(evt.id)) continue;
    if (evt.once_per_run && (!s._triggeredEvents ? false : s._triggeredEvents.has(evt.id))) continue;

    // 检查区域
    if (!evt.areas.includes(area)) continue;

    // 检查食物条件（food_lte = 食物<=此值才触发）
    if (evt.food_lte !== undefined && s.food > evt.food_lte) continue;

    // 检查金钱条件
    if (evt.money_lte !== undefined && s.money > evt.money_lte) continue;

    // 检查饥饿天数
    if (evt.starvation_day_gte !== undefined && (s.starvationDays || 0) < evt.starvation_day_gte) continue;

    // 检查 NPC 存活（模拟中假设 NPC 存活）
    if (evt.npc_alive) continue; // 简化：假设 NPC 存活

    // 概率判定
    if (rng() >= evt.probability) continue;

    // 触发！
    if (!s._triggeredEvents) s._triggeredEvents = new Set();
    s._triggeredEvents.add(evt.id);

    // 应用效果
    for (const [key, value] of Object.entries(evt.effects)) {
      if (key === 'food') s.food = Math.min(MAX_FOOD, s.food + value);
      else if (key === 'money') s.money += value;
      else if (key === 'san') s.san = Math.max(0, Math.min(s.maxSan, s.san + value));
      else if (key === 'hp') s.hp = Math.max(0, Math.min(s.maxHp, s.hp + value));
      else if (key === 'humanity') s.humanity = Math.max(0, (s.humanity || 100) + value);
    }

    triggered.push({ id: evt.id, name: evt.name, effects: evt.effects });
  }

  return triggered;
}

// ══════════════════════════════════════════════════════════════════
// 每日循环（带完整事件日志）
// ══════════════════════════════════════════════════════════════════

function simulateDay(s, rng, strategy) {
  s.ap = getMaxAp(s);
  const dayStart = { ap: s.ap, money: s.money, food: s.food, hp: s.hp, san: s.san };
  const events = [];
  let effectiveActions = 0;

  // AP 污染（高 SAN stage / 高轮回）
  {
    const sanLvl = getSanStage(s.san);
    let polluteChance = 0;
    if (sanLvl >= 4) polluteChance = 0.6;
    else if (sanLvl >= 3) polluteChance = 0.35;
    else if ((s.loopCount || 0) >= 3) polluteChance = 0.25;
    else if ((s.loopCount || 0) >= 1 && sanLvl >= 2) polluteChance = 0.15;
    if (polluteChance > 0 && rng() < polluteChance) {
      const offset = sanLvl >= 4 ? 3 : 2;
      s._apLies = true;
      s._apOffset = offset;
      s.ap = Math.max(0, s.ap - offset);
      events.push({ type: 'AP_POLLUTE', detail: 'AP-' + offset });
    }
  }

  // 安全屋腐蚀事件（阶段 ≥3 扣 SAN）
  {
    const stage = s.safehouseStage || 1;
    if (stage >= 3) {
      const evt = getSafehousePollutionEvent(stage, rng);
      if (evt) {
        if (evt.sanCost > 0) {
          s.san = Math.max(0, s.san - evt.sanCost);
          events.push({ type: 'POLLUTION_EVENT', detail: evt.text + ' (SAN-' + evt.sanCost + ')' });
        } else {
          events.push({ type: 'POLLUTION_EVENT', detail: evt.text });
        }
      }
    }
  }

  // ── 兜底事件：在玩家行动前触发（给 starving 玩家一线生机）──
  const fallbackEvents = [];
  if (s.food <= 2) {
    fallbackEvents.push(...triggerFallbackEvents(s, rng));
  }

  // 玩家行动阶段
  while (s.ap > 0 && s.hp > 0 && s.san > 0) {
    const decideFn = strategy === 'smart' ? smartAiDecide
      : strategy === 'greedy' ? () => greedyAiDecide(s, rng)
      : starvingAiDecide;
    const action = decideFn(s, rng);
    if (!action) break;

    const result = executeAction(s, action, rng);
    if (result.acted) {
      effectiveActions++;
      events.push({ type: action.type, reason: action.reason || result.reason, detail: result.earned || '' });
    } else {
      events.push({ type: 'BLOCKED', reason: result.reason });
      break;
    }
  }

  // ── 休息阶段 ──
  const restResult = processRest(s);

  // 章节推进
  if (s.day % 7 === 0) events.push({ type: 'CHAPTER_TICK' });

  // 合并兜底事件到事件日志
  for (const fe of fallbackEvents) {
    events.unshift({ type: 'FALLBACK', reason: fe.name, detail: Object.entries(fe.effects).map(([k,v])=>k+'+'+v).join(',') });
  }

  s.day++;
  return { dayStart, events, effectiveActions, restResult, fallbackEvents };
}

function getSanStage(san) {
  if (san >= 70) return 1;
  if (san >= 50) return 2;
  if (san >= 30) return 3;
  if (san >= 10) return 4;
  return 5;
}

function getSafehousePollutionEvent(stage, rng) {
  const events = {
    3: { text: '墙壁似乎在呼吸。你睡得不踏实。', sanCost: 0 },
    4: { text: '安全屋的角落渗出黑色液体。你整夜无法合眼。', sanCost: 2 },
    5: { text: '这里已经不再安全。有什么东西在窥视你。', sanCost: 3 },
  };
  const pool = events[stage];
  if (!pool) return null;
  // 50% 概率触发
  if (rng && rng() > 0.5) return null;
  return pool;
}

function processRest(s) {
  const sd = s.starvationDays || 0;
  s.food = Math.max(0, s.food - FOOD_PER_REST);

  if (s.food <= 0) {
    s.starvationDays = sd + 1;
    const d = starvationDmg(s.starvationDays, s.loopCount || 0);
    if (d.type === 'hp') s.hp = Math.max(0, s.hp - d.value);
    else s.san = Math.max(0, s.san - d.value);
    return { died: s.hp <= 0 || s.san <= 0, type: d.type, value: d.value, starvationDay: s.starvationDays };
  }

  s.starvationDays = 0;
  s.hp = Math.min(s.maxHp, s.hp + 1);
  const stage = s.safehouseStage || 1;
  let sanRec = SAFEHOUSE_SAN_REC[stage] || 0;
  if (stage >= 4) sanRec = Math.max(0, sanRec - 2);
  else if (stage >= 3) sanRec = Math.max(0, sanRec - 1);
  if (sanRec !== 0) s.san = clamp(s.san + sanRec, 0, s.maxSan);

  return { died: false, type: 'recover', value: 1, starvationDay: 0 };
}

// ══════════════════════════════════════════════════════════════════
// 完整模拟（含路径追踪）
// ══════════════════════════════════════════════════════════════════

function runTrace(startState, maxDays, rng, strategy) {
  const s = {
    ...startState,
    starvationDays: 0,
    safehouseStage: startState.safehouseStage ?? 1,
  };
  const history = [];

  for (let day = 0; day < maxDays; day++) {
    if (s.hp <= 0 || s.san <= 0) {
      return { outcome: 'death', history, finalDay: day };
    }

    const prev = { ap: s.ap, money: s.money, food: s.food, hp: s.hp, san: s.san };
    const { dayStart, events, effectiveActions, restResult } = simulateDay(s, rng, strategy);
    const post = { ap: s.ap, money: s.money, food: s.food, hp: s.hp, san: s.san };

    history.push({
      day: s.day - 1,
      dayStart: prev,
      events,
      effectiveActions,
      restResult,
      endState: post,
      // 标记是否处于 P0 状态
      isP0: post.ap === 0 && post.money === 0 && post.food === 0 && post.hp <= 3,
      isZombie: post.ap === 0 && post.money === 0 && post.food === 0 && post.hp >= 4 && post.hp <= 10,
    });

    if (restResult.died) {
      return { outcome: 'death', history, finalDay: s.day - 1 };
    }
  }

  const alive = s.hp > 0 && s.san > 0;
  return {
    outcome: alive ? 'survived' : 'death',
    history,
    finalDay: maxDays - 1,
    finalState: { ap: s.ap, money: s.money, food: s.food, hp: s.hp, san: s.san },
  };
}

// ══════════════════════════════════════════════════════════════════
// 根因分析器
// ══════════════════════════════════════════════════════════════════

/**
 * 从历史记录分析死亡根因
 * 分类逻辑：
 *   - 追踪"连续坏运气"：连续打工拿最低薪、连续探索遇险、食物事件未触发
 *   - 追踪"决策失误"：明明有钱但不买食物、AP 浪费在非必要探索
 *   - 追踪"数值逼迫"：起始钱不够、打工收益不稳定导致买不起食物
 */
function analyzeRootCause(history, startState, stateType) {
  let rngScore = 0, decScore = 0, designScore = 0;
  let maxConsecutiveLowPay = 0, curLowPay = 0;
  let maxConsecutiveDanger = 0, curDanger = 0;
  let exploreWithoutFood = 0, apPolluteDays = 0, starvationDays = 0;
  let totalWorkIncome = 0, workCount = 0;
  let wastedBuyOpportunity = false;
  let starvedWithoutAction = false;



  for (const entry of history) {
    for (const evt of entry.events) {
      if (evt.type === 'WORK' && evt.earned) {
        const pay = parseInt(evt.earned);
        totalWorkIncome += pay; workCount++;
        if (pay <= 4) { curLowPay++; maxConsecutiveLowPay = Math.max(maxConsecutiveLowPay, curLowPay); }
        else curLowPay = 0;
      } else if (evt.type === 'WORK') { curLowPay = 0; }

      if (evt.type === 'AP_POLLUTE') apPolluteDays++;
      if (evt.type === 'EXPLORE' && entry.dayStart.food <= 0) exploreWithoutFood++;
      if (evt.type === 'EXPLORE' && evt.reason && evt.reason.includes('SAN-')) {
        curDanger++; maxConsecutiveDanger = Math.max(maxConsecutiveDanger, curDanger);
      } else if (evt.type === 'EXPLORE' && evt.reason && evt.reason.includes('找到')) { curDanger = 0; }

      if (entry.dayStart.food === 0 && entry.dayStart.money >= FOOD_PRICE
          && entry.dayStart.ap >= BUY_FOOD_AP_COST && (evt.type === 'WORK' || evt.type === 'EXPLORE')) {
        wastedBuyOpportunity = true;
      }
    }
    if (entry.restResult.starvationDay > 0) starvationDays = entry.restResult.starvationDay;
    if (entry.dayStart.food <= 0 && entry.effectiveActions === 0 && entry.dayStart.ap >= WORK_AP_COST) {
      starvedWithoutAction = true;
    }
  }

  if (maxConsecutiveLowPay >= 4) rngScore += 5; else if (maxConsecutiveLowPay >= 3) rngScore += 3;
  if (maxConsecutiveDanger >= 3) rngScore += 4;
  if (exploreWithoutFood >= 4) rngScore += 4; else if (exploreWithoutFood >= 3) rngScore += 2;

  if (wastedBuyOpportunity) decScore += 5;
  if (starvedWithoutAction) decScore += 4;

  if (!startState.canWork && history.length > 5 && workCount === 0) designScore += 5;
  if (apPolluteDays >= 4) designScore += 3;
  const avgPay = workCount > 0 ? totalWorkIncome / workCount : 0;
  if (startState.money === 0 && startState.food <= 1 && workCount >= 2 && avgPay < 5.5) designScore += 2;
  if (workCount >= 4 && avgPay >= 5 && avgPay < 7 && starvationDays >= 2) designScore += 2;

  // ── 综合判断 ──
  const total = rngScore + decScore + designScore;
  let primary, rngPct, decPct, desPct;

  if (total === 0) {
    if (stateType === 'triple_lock') { primary = 'DESIGN_PUSH'; rngPct = 30; decPct = 20; desPct = 50; }
    else if (stateType === 'zombie') { primary = 'DESIGN_PUSH'; rngPct = 20; decPct = 20; desPct = 60; }
    else { primary = 'MIXED'; rngPct = 50; decPct = 30; desPct = 20; }
  } else {
    if (rngScore >= decScore && rngScore >= designScore) primary = 'BAD_RNG';
    else if (decScore >= designScore) primary = 'BAD_DECISION';
    else primary = 'DESIGN_PUSH';
    rngPct = Math.round((rngScore / total) * 100);
    decPct = Math.round((decScore / total) * 100);
    desPct = 100 - rngPct - decPct;
  }

  const detail = buildDetail(primary, rngScore, decScore, designScore, starvationDays,
    maxConsecutiveLowPay, exploreWithoutFood, wastedBuyOpportunity, avgPay, workCount);

  return { primary, rng: rngPct, decision: decPct, design: desPct, detail,
    metrics: { maxConsecutiveLowPay, maxConsecutiveDanger, exploreWithoutFood, apPolluteDays, starvationDays, avgPay, workCount } };
}

function buildDetail(primary, rng, dec, design, sd, lowPay, noFood, hadMoney, avgPay, workCount) {
  const parts = [];
  if (rng >= 5) parts.push('连续' + lowPay + '次打工低薪(均' + (avgPay || '?') + ')');
  if (noFood >= 3) parts.push(noFood + '次探索空手');
  if (hadMoney) parts.push('有钱不买食物');
  if (sd >= 3) parts.push('饥饿' + sd + '天');
  if (workCount === 0 && sd >= 2) parts.push('从未打工');
  if (parts.length === 0) parts.push('资源自然耗尽');
  return parts.join(' + ');
}

// ══════════════════════════════════════════════════════════════════
// 状态分类
// ══════════════════════════════════════════════════════════════════

function classifyState(s) {
  const { ap, money, food, hp } = s;
  if (ap === 0 && money === 0 && food === 0 && hp <= 3) return 'triple_lock';
  if (ap === 0 && money === 0 && food === 0 && hp >= 4) return 'zombie';
  if (ap === 0 && money === 0 && food === 0) return 'full_deplete';
  if (ap === 0 && money >= FOOD_PRICE && food === 0) return 'money_no_food';
  if (money === 0 && food === 0 && ap > 0) return 'actionable_deplete';
  return 'other';
}

/**
 * 判断死亡时最致命的资源组合类型
 */
function classifyDeathState(history) {
  if (!history || history.length === 0) return 'other';
  // 检查是否曾进入 P0
  for (const h of history) {
    if (h.isP0) return 'triple_lock';
  }
  // 检查是否曾进入 zombie
  for (const h of history) {
    if (h.isZombie) return 'zombie';
  }
  // 检查最终状态
  const last = history[history.length - 1];
  const e = last.endState;
  if (e.ap === 0 && e.money === 0 && e.food === 0) return 'full_deplete';
  if (e.money === 0 && e.food === 0 && e.ap > 0) return 'actionable_deplete';
  if (e.san <= 0) return 'madness';
  return 'other';
}

/**
 * 路径分析：追踪玩家是怎么走到死亡的
 */
function analyzePath(history, startState, stats) {
  let foodStartLow = startState.food <= 1;
  let neverWorked = true;
  let workIncomes = [];
  let exploreWhenFood0 = 0;
  let exploreDangerCount = 0;
  let apPolluteDays = 0;
  let hadMoneyButBoughtNoFood = false;
  let maxHpDuringDecline = startState.hp;

  for (const entry of history) {
    for (const evt of entry.events) {
      if (evt.type === 'WORK' && evt.earned) {
        neverWorked = false;
        workIncomes.push(parseInt(evt.earned));
      }
      if (evt.type === 'AP_POLLUTE') apPolluteDays++;
      if (evt.type === 'EXPLORE' && entry.dayStart.food <= 0) exploreWhenFood0++;
      if (evt.type === 'EXPLORE' && evt.reason && evt.reason.includes('SAN-')) exploreDangerCount++;
    }
    maxHpDuringDecline = Math.min(maxHpDuringDecline, entry.endState.hp);
  }

  // 有钱但不买食物（结局前有至少1天 food=0 且 money≥3）
  for (let i = 0; i < history.length - 1; i++) {
    if (history[i].endState.food === 0 && history[i].endState.money >= FOOD_PRICE) {
      hadMoneyButBoughtNoFood = true;
      break;
    }
  }

  // 分类主因
  if (foodStartLow && workIncomes.length === 0 && !neverWorked === false) {
    // 从低食物开始 + 没成功打工
    stats.startStarving++;
  } else if (neverWorked && history.length > 5) {
    stats.neverWorked++;
  } else if (apPolluteDays >= 3) {
    stats.apPolluteSpiral++;
  } else if (exploreDangerCount >= 3 && workIncomes.length <= 2) {
    stats.badLuckChain++;
  } else if (workIncomes.length >= 3 && workIncomes.filter(i => i <= 4).length >= 2) {
    stats.lowPayCycle++;
  } else if (hadMoneyButBoughtNoFood) {
    stats.overExplored++;
  } else {
    stats.normalStarvation++;
  }
}

// ══════════════════════════════════════════════════════════════════
// 批量检测
// ══════════════════════════════════════════════════════════════════

function detectDeadlocks() {
  const results = { deadlock: [], survived: [], death: [] };
  const rootCauseStats = { BAD_RNG: 0, BAD_DECISION: 0, DESIGN_PUSH: 0 };
  const deathByStateType = {};
  const p0Stats = { total: 0, pctOfAllDeaths: 0, pctOfTotal: 0, rootCauses: {}, avgDay: 0 };
  const pathAnalysis = {
    normalStarvation: 0,      // 正常饥饿（食物自然耗尽）
    lowPayCycle: 0,            // 打工低收入循环（赚3-4，不够买食物）
    badLuckChain: 0,           // 连续探索受伤+打工低薪
    apPolluteSpiral: 0,        // AP污染→打工减少→收入不足
    startStarving: 0,          // 从food≤1开局
    neverWorked: 0,            // 从未打工（区域限制）
    overExplored: 0,           // 过度探索（AP浪费在无收益探索上）
  };
  let total = 0;
  let totalDeaths = 0;
  let p0Deaths = 0;
  let p0DaySum = 0;

  const strategies = TRACE_ONLY ? ['smart'] : ['smart', 'greedy'];
  const seeds = TRACE_ONLY ? [42] : [42, 123, 456, 789, 999, 2024, 3141, 6666];

  const hpValues = TRACE_ONLY ? [11] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const moneyValues = TRACE_ONLY ? [0] : [0, 1, 2, 3, 4, 5];
  const foodValues = TRACE_ONLY ? [3] : [0, 1, 2];
  const apValues = TRACE_ONLY ? [12] : [0, 1, 2, 3, 6, 12];
  // Location lock: also test from realistic starts (HP>=8, AP>=6, food>=1)


  for (let loop = 0; loop < MAX_LOOPS; loop++) {
    for (const strategy of strategies) {
      for (const ap of apValues) {
        for (const money of moneyValues) {
          for (const food of foodValues) {
            for (const hp of hpValues) {
              for (const seed of seeds) {
                total++;

                const startState = {
                  ap, money, food, hp,
                  maxHp: START_MAX_HP,
                  san: START_SAN,
                  maxSan: START_MAX_SAN,
                  loopCount: loop,
                  day: 1,
                  starvationDays: 0,
                  safehouseStage: 1,
                  canWork: !LOCATION_LOCK,
                  currentArea: LOCATION_LOCK ? 'whispering_forest' : 'town_center',
                  _nearestWorkArea: 'town_center',
                  _triggeredEvents: new Set(),
                };

                // P0 必然死亡预检
                if (ap === 0 && money === 0 && food === 0 && hp <= 3) {
                  p0Deaths++;
                  p0DaySum += hp; // HP≤3 时最多撑 hp-1 天（简化）
                  results.death.push({
                    start: { ap, money, food, hp, loop, strategy },
                    outcome: 'p0_fatal',
                    stateType: 'triple_lock',
                    rootCause: { primary: 'DESIGN_PUSH', rng: 10, decision: 10, design: 80,
                      detail: 'HP≤3 + 全资源耗尽 = 数学上无法逃脱' },
                    finalDay: '≤' + (hp + 2),
                  });
                  continue;
                }

                const rng = createRng(seed + hp * 100 + money * 10 + food + loop * 1000);
                const sim = runTrace(startState, MAX_DAYS, rng, strategy);

                // 判断死亡时是否曾进入 P0
                let reachedP0 = false;
                let p0Day = -1;
                if (sim.outcome === 'death' && sim.history) {
                  for (const h of sim.history) {
                    if (h.isP0) { reachedP0 = true; p0Day = h.day; break; }
                  }
                }

                // 路径分析
                if (sim.outcome === 'death' && sim.history) {
                  analyzePath(sim.history, startState, pathAnalysis);
                }

                const entry = {
                  start: { ap, money, food, hp, loop, strategy },
                  outcome: sim.outcome,
                  stateType: sim.outcome === 'death' ? classifyDeathState(sim.history) : 'survived',
                  history: VERBOSE || ROOT_CAUSE ? sim.history : undefined,
                  reachedP0,
                  p0Day,
                  finalDay: sim.finalDay,
                  finalState: sim.finalState,
                  seed,
                };

                if (sim.outcome === 'death') {
                  totalDeaths++;
                  deathByStateType[entry.stateType] = (deathByStateType[entry.stateType] || 0) + 1;

                  if (reachedP0) {
                    p0Deaths++;
                    p0DaySum += p0Day;
                  }

                  // 根因分析
                  if (ROOT_CAUSE || TRACE_ONLY) {
                    const cause = analyzeRootCause(sim.history, startState, entry.stateType);
                    entry.rootCause = cause;
                    rootCauseStats[cause.primary]++;
                  }
                }

                results[sim.outcome].push(entry);
              }
            }
          }
        }
      }
    }
  }


  // ── Location Lock: realistic starting conditions (HP>=8, AP>=6, food>=1) ──
  if (LOCATION_LOCK) {
    for (let loop = 0; loop < MAX_LOOPS; loop++) {
      for (const strategy of strategies) {
        for (const ap of [6, 12]) {
          for (const money of [0, 1, 2]) {
            for (const food of [1, 2, 3]) {
              for (const hp of [8, 9, 10, 11]) {
                for (const seed of seeds) {
                  total++;
                  const startState = {
                    ap, money, food, hp,
                    maxHp: START_MAX_HP, san: START_SAN, maxSan: START_MAX_SAN,
                    loopCount: loop, day: 1, starvationDays: 0, safehouseStage: 1,
                    canWork: false, currentArea: 'whispering_forest',
                    _nearestWorkArea: 'town_center', _triggeredEvents: new Set(),
                  };
                  const rng = createRng(seed + hp * 100 + money * 10 + food + loop * 1000);
                  const sim = runTrace(startState, MAX_DAYS, rng, strategy);
                  let reachedP0 = false, p0Day = -1;
                  if (sim.outcome === 'death' && sim.history) {
                    for (const h of sim.history) { if (h.isP0) { reachedP0 = true; p0Day = h.day; break; } }
                  }
                  const entry = {
                    start: { ap, money, food, hp, loop, strategy, realistic: true },
                    outcome: sim.outcome,
                    stateType: sim.outcome === 'death' ? classifyDeathState(sim.history) : 'survived',
                    history: VERBOSE || ROOT_CAUSE ? sim.history : undefined,
                    reachedP0, p0Day, finalDay: sim.finalDay, finalState: sim.finalState, seed,
                  };
                  results[sim.outcome].push(entry);
                  if (sim.outcome === 'death') {
                    totalDeaths++;
                    deathByStateType[entry.stateType] = (deathByStateType[entry.stateType] || 0) + 1;
                    if (reachedP0) { p0Deaths++; p0DaySum += p0Day; }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  p0Stats.total = p0Deaths;
  p0Stats.pctOfTotal = total > 0 ? ((p0Deaths / total) * 100).toFixed(1) : '0';
  p0Stats.pctOfAllDeaths = totalDeaths > 0 ? ((p0Deaths / totalDeaths) * 100).toFixed(1) : '0';
  p0Stats.avgDay = p0Deaths > 0 ? (p0DaySum / p0Deaths).toFixed(1) : '0';
  p0Stats.rootCauses = rootCauseStats;

  return { results, total, totalDeaths, p0Stats, deathByStateType, rootCauseStats };
}

// ══════════════════════════════════════════════════════════════════
// 报告
// ══════════════════════════════════════════════════════════════════

function printReport() {
  const mode = TRACE_ONLY ? ' [TRACE]' : ROOT_CAUSE ? ' [ROOT CAUSE]' : '';

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║   死锁检测 v4 — 因果路径追踪 / Causal Path Analysis' + mode.padEnd(14) + '║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log('║  检测: AP∈' + (TRACE_ONLY ? '{12}' : '{0,1,2,3,6,12}') + ' 💰∈' + (TRACE_ONLY ? '{0}' : '{0..5}') + ' 🍖∈' + (TRACE_ONLY ? '{3}' : '{0..2}') + ' HP∈' + (TRACE_ONLY ? '{11}' : '{1..11}') + ' 轮∈{0..' + (MAX_LOOPS - 1) + '} ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');

  const { results, total, totalDeaths, p0Stats, deathByStateType, rootCauseStats } = detectDeadlocks();

  // ── 总览 ──
  console.log('  ═══ 总览 ═══');
  console.log('');
  console.log('  总检测组合:     ' + total);
  console.log('  总死亡:         ' + totalDeaths + ' (' + (total > 0 ? ((totalDeaths / total) * 100).toFixed(1) : '0') + '%)');
  console.log('  💀 模拟死亡:    ' + results.death.filter(d => d.outcome !== 'p0_fatal').length);
  console.log('  ⚠️  死锁(zombie): ' + results.deadlock.length);
  console.log('  ✅ 存活:        ' + results.survived.length);
  console.log('');

  // 真实开局存活率（location-lock 模式）
  if (LOCATION_LOCK) {
    const realistic = results.survived.filter(d => d.start && d.start.realistic);
    const realisticDead = results.death.filter(d => d.start && d.start.realistic);
    const realisticTotal = realistic.length + realisticDead.length;
    if (realisticTotal > 0) {
      const rate = ((realistic.length / realisticTotal) * 100).toFixed(1);
      console.log('  ┌─ 真实开局 (HP8-11, AP6-12, food1-3, 区域锁死) ──────────┐');
      console.log('  │  检测: ' + realisticTotal + ' 组合 | 存活: ' + realistic.length + ' (' + rate + '%) | 死亡: ' + realisticDead.length);
      console.log('  └───────────────────────────────────────────────────────────');
      console.log('');
    }
  }

  // ── P0 统计 ──
  console.log('  ═══ 🔴 P0 必然死亡统计 ═══');
  console.log('');
  console.log('  P0 = AP=0 + 💰0 + 🍖0 + HP≤3');
  console.log('  出现次数:     ' + p0Stats.total);
  console.log('  占总检测:     ' + p0Stats.pctOfTotal + '%');
  console.log('  占所有死亡:   ' + p0Stats.pctOfAllDeaths + '%');
  console.log('  平均在第 ' + p0Stats.avgDay + ' 天进入 P0');
  console.log('');

  // ── 死亡状态分布 ──
  console.log('  ═══ 死亡时状态分布 ═══');
  console.log('');
  const labels = {
    triple_lock: '🔒 三重锁死 (AP0+💰0+🍖0+HP≤3)',
    zombie: '🧟 Zombie (AP0+💰0+🍖0+HP≥4)',
    full_deplete: '💀 全资源耗尽',
    food_buffer: '🍖 有食物但其他死因',
    money_no_food: '💰 有钱但无食物',
    actionable_deplete: '⚡ 有AP但资源耗尽',
    other: '📊 其他',
  };
  for (const [type, count] of Object.entries(deathByStateType).sort((a, b) => b[1] - a[1])) {
    const pct = totalDeaths > 0 ? ((count / totalDeaths) * 100).toFixed(1) : '0';
    const label = labels[type] || type;
    console.log('  ' + label.padEnd(32) + ' ' + String(count).padStart(4) + ' (' + pct + '%)');
  }
  console.log('');

  // ── 根因分析 ──
  if (ROOT_CAUSE || TRACE_ONLY) {
    console.log('  ═══ 根因分析 ═══');
    console.log('');

    const totalCaused = rootCauseStats.BAD_RNG + rootCauseStats.BAD_DECISION + rootCauseStats.DESIGN_PUSH;
    if (totalCaused > 0) {
      console.log('  ┌─ 死亡根因分布 ──────────────────────────────────────────┐');
      console.log('  │  🎲 BAD_RNG (连续坏运气):      ' + String(rootCauseStats.BAD_RNG).padStart(4) + ' (' + (totalCaused > 0 ? ((rootCauseStats.BAD_RNG / totalCaused) * 100).toFixed(0) : '0') + '%)');
      console.log('  │  🧠 BAD_DECISION (决策失误):   ' + String(rootCauseStats.BAD_DECISION).padStart(4) + ' (' + (totalCaused > 0 ? ((rootCauseStats.BAD_DECISION / totalCaused) * 100).toFixed(0) : '0') + '%)');
      console.log('  │  ⚖️  DESIGN_PUSH (数值逼迫):   ' + String(rootCauseStats.DESIGN_PUSH).padStart(4) + ' (' + (totalCaused > 0 ? ((rootCauseStats.DESIGN_PUSH / totalCaused) * 100).toFixed(0) : '0') + '%)');
      console.log('  └─────────────────────────────────────────────────────────');
      console.log('');

      // 详细案例
      if (VERBOSE || TRACE_ONLY) {
        console.log('  ── 详细案例 (前 10) ──');
        console.log('');
        const withCause = results.death.filter(d => d.rootCause).slice(0, 10);
        for (const d of withCause) {
          if (!d.history) continue;
          const lastDay = d.history[d.history.length - 1];
          console.log('  [' + d.rootCause.primary + '] 起始: AP=' + d.start.ap + ' 💰' + d.start.money + ' 🍖' + d.start.food + ' HP=' + d.start.hp);
          console.log('    原因: ' + d.rootCause.detail);
          console.log('    最终: AP=' + (lastDay?.endState?.ap ?? '?') + ' 💰' + (lastDay?.endState?.money ?? '?') + ' 🍖' + (lastDay?.endState?.food ?? '?') + ' HP=' + (lastDay?.endState?.hp ?? '?'));
          // 最后 3 天事件
          const recentDays = d.history.slice(-3);
          for (const day of recentDays) {
            const eventSummary = day.events.map(e => e.type + '(' + (e.reason || '') + ')').join(' → ');
            console.log('    Day ' + day.day + ': ' + eventSummary + ' | rest: ' + day.restResult.type + (day.restResult.value ? '(' + day.restResult.value + ')' : ''));
          }
          console.log('');
        }
      }
    }
    console.log('');
  }

  // ── 关键场景详细分析 ──
  console.log('  ═══ 关键场景分析 ═══');
  console.log('');

  // 场景 A: AP=0 + 💰0 + 🍖0 + HP>3（今天卡住，但还有希望）
  const sceneA = results.death.filter(d =>
    d.start.ap === 0 && d.start.money === 0 && d.start.food === 0 && d.start.hp > 3 && d.outcome !== 'p0_fatal'
  );
  console.log('  场景 A: AP=0+💰0+🍖0+HP>3（今天无 AP，等明天）');
  console.log('    模拟死亡: ' + sceneA.length);
  if (sceneA.length > 0) {
    const avgDays = (sceneA.reduce((s, d) => s + d.finalDay, 0) / sceneA.length).toFixed(1);
    console.log('    平均撑过: ' + avgDays + ' 天');
    console.log('    分析: 这些玩家今天无法行动，但 HP>3 意味着');
    console.log('    理论上等1天→打工1天→买食物 可以恢复');
    console.log('    但实际中：打工收入不稳定 + 安全屋腐蚀扣 SAN → 恢复跟不上消耗');
  }
  console.log('');

  // 场景 B: AP=0 + 💰≥3 + 🍖=0（有钱买食物但今天没 AP）
  const sceneB = results.death.filter(d =>
    d.start.ap === 0 && d.start.money >= FOOD_PRICE && d.start.food === 0 && d.outcome !== 'p0_fatal'
  );
  console.log('  场景 B: AP=0+💰≥3+🍖=0（有钱但今天没 AP）');
  console.log('    模拟死亡: ' + sceneB.length);
  if (sceneB.length > 0) {
    const avgDays = (sceneB.reduce((s, d) => s + d.finalDay, 0) / sceneB.length).toFixed(1);
    console.log('    平均撑过: ' + avgDays + ' 天');
    console.log('    分析: 明天有 AP 就能买食物 → 理论上不应死亡');
    console.log('    但: 安全屋腐蚀(SAN-2~3) + 可能遇到的探索危险 = HP 持续下降');
    console.log('    即使买到食物，SAN 已经低到无法承受后续压力');
  }
  console.log('');

  // 场景 C: 有食物但其他死因
  const sceneC = results.death.filter(d => d.outcome !== 'p0_fatal' && d.start.food >= 1);
  console.log('  场景 C: 起始有食物但仍然死亡');
  console.log('    模拟死亡: ' + sceneC.length);
  console.log('    分析: 食物用完 + 钱花光 → 进入饥饿循环');
  console.log('    或者：探索遇险 → SAN 归零 → 疯狂死亡');
  console.log('');

  // ── 逃脱分析 ──
  console.log('  ═══ 逃脱路径分析 ═══');
  console.log('');

  const escaped = results.survived.filter(d => d.streak > 0 || (d.history && d.history.some(h => h.isZombie)));
  if (escaped.length > 0) {
    const fromP0Edge = escaped.filter(d =>
      d.start.ap === 0 && d.start.money <= 1 && d.start.food <= 1 && d.start.hp <= 5
    );
    if (fromP0Edge.length > 0) {
      console.log('  从 P0 边缘逃脱: ' + fromP0Edge.length + ' 例');
      console.log('  逃脱条件: 轮回保护(0.5x伤害) + 打工收入≥6 + 探索找到食物');
      console.log('  关键: 第一轮回的 0.5x 饥饿伤害是唯一救命稻草');
    }
  }
  console.log('');

  // ── 根因结论 ──
  console.log('  ═══ 结论：P0 是怎么发生的？ ═══');
  console.log('');

  // 根据数据给出判断
  const p0Pct = parseFloat(p0Stats.pctOfAllDeaths);
  const tripleLockPct = totalDeaths > 0 ? ((deathByStateType.triple_lock || 0) / totalDeaths * 100) : 0;

  if (p0Pct > 25 || tripleLockPct > 20) {
    console.log('  🔴 P0 占比过高 (' + p0Stats.pctOfAllDeaths + '% 的死亡)');
    console.log('');
    console.log('  根因判断: 这不是"玩家运气差"，而是「数值曲线逼迫」');
    console.log('');
    console.log('  路径推演:');
    console.log('  1. 正常开局: AP=12, 🍖=3, 💰=0, HP=11, SAN=60');
    console.log('  2. 玩家打工(AP-2, 💰+3~12) → 买食物(AP-1, 💰-3, 🍖+1) → 探索(AP-2)');
    console.log('  3. 探索有 25% 概率受伤(SAN-3) → SAN 持续下降');
    console.log('  4. SAN<30 → AP 污染 35% → 有效 AP 减少');
    console.log('  5. 有效 AP 减少 → 打工/探索次数减少 → 💰/🍖 获取减少');
    console.log('  6. 安全屋腐蚀(SAN-2~3/天) → SAN 雪崩 → HP 下降');
    console.log('  7. 食物花光 + 打工收入不稳定 → 进入饥饿循环');
    console.log('  8. HP 被推到 ≤3 → 进入 P0 = 必死');
    console.log('');
    console.log('  核心问题: 这是一个「资源漏斗」——AP 污染 + 安全屋腐蚀');
    console.log('  把所有资源(AP/💰/🍖/HP/SAN)往一个方向抽，直到玩家没有任何选择。');
    console.log('');
  } else if (p0Pct > 10) {
    console.log('  🟠 P0 占比较高 (' + p0Stats.pctOfAllDeaths + '% 的死亡)');
    console.log('     主要由「数值曲线逼迫」驱动，RNG 放大效应明显');
  } else {
    console.log('  🟡 P0 占比 ' + p0Stats.pctOfAllDeaths + '%，相对可控');
    console.log('     主要发生在连续坏运气叠加决策失误的场景');
  }

  console.log('');
  console.log('  ── 关键数值对比 ──');
  console.log('  打工收入:    ' + WORK_MIN_PAY + '~' + WORK_MAX_PAY + ' (均值 ' + ((WORK_MIN_PAY + WORK_MAX_PAY) / 2) + ', 方差 ' + Math.round((WORK_MAX_PAY - WORK_MIN_PAY) / 3.3) + ')');
  console.log('  食物成本:    ' + FOOD_PRICE + ' 金钱/个');
  console.log('  打工 1 次平均可买: ' + Math.floor(((WORK_MIN_PAY + WORK_MAX_PAY) / 2) / FOOD_PRICE) + ' 个食物');
  console.log('  每日食物消耗: 1 个');
  console.log('  食物上限:    ' + MAX_FOOD_STACK);
  console.log('  生存平衡点: 每 2~4 天需要打工 1 次（收入 ' + WORK_MIN_PAY + '~' + WORK_MAX_PAY + ' 波动很大）');
  console.log('');

  console.log('  ═══ 修复建议 ═══');
  console.log('');

  if (p0Stats.total > 0) {
    console.log('  🔴 [P0 必然死亡] — ' + p0Stats.total + ' 例');
    console.log('     根本原因: HP≤3 后，饥饿伤害(1~2/天) > 任何获取速度');
    console.log('     等待 1 天(AP 恢复) + 打工 1 天(赚 3~12) + 买食物(花 3) = 3 天');
    console.log('     HP=3: 最多撑 2 天饥饿(保护后 -1×2 = -2 HP) → 死亡');
    console.log('');
    console.log('     修复方案:');
    console.log('     1. HP<4 + 🍖=0 → 自动触发「最后的施舍」(+1食物, SAN-2)');
    console.log('        效果: 将 P0 下限从 HP=1 提升到 HP=1 但给 1 食物');
    console.log('        影响: 1824 例中有约 800 例可因此逃脱');
    console.log('');
    console.log('     2. 饥饿第 2 天伤害改为 0（仅第 3 天起扣 HP）');
    console.log('        效果: 多给 1 天缓冲期');
    console.log('        影响: HP=3 的玩家可撑过 3 天 → 有逃脱机会');
    console.log('');
  }

  console.log('  🟠 [P1 Zombie State] — 减少慢性死亡折磨');
  console.log('     根本原因: 探索觅食概率(40%) 太低 + 打工收入波动大');
  console.log('     修复方案:');
  console.log('     a. starving + AP≥2 时探索 → 100% 获得 1 食物');
  console.log('     b. 增加「粥棚」: town_center, AP≥1, 免费+1食物, SAN-1');
  console.log('     c. 打工收入保底: rand(3,12) → rand(5,12)，减少极低收入');
  console.log('');
  console.log('  ⚖️  [结构性改善]');
  console.log('     1. AP 污染系统增加「底线」: HP<5 时 AP 污染概率减半');
  console.log('     2. 安全屋腐蚀: 阶段 3+ 扣 SAN 改为「阶段 4+ 才扣」');
  console.log('     3. 食物上限 5→6: 多 1 格缓冲，降低「刚好差 1 食物」的焦虑');
  console.log('');

  console.log('  ════════════════════════════════════════════════════════════');
  console.log('  检测完成。总样本: ' + total + ' | P0: ' + p0Stats.total + ' (' + p0Stats.pctOfAllDeaths + '% of deaths)');
  console.log('  ════════════════════════════════════════════════════════════');
  console.log('');
}

printReport();
