// src/portraitMap.js - 立绘/场景图片路径映射
// 纯数据模块，零依赖，供 app.jsx 使用

export var PORTRAIT_BASE = 'assets/webp/';

export var NPC_IMAGE_MAP = {
  '伊莱亚斯·沃德': { normal: '伊莱亚斯·沃德 正常.webp', corrupted: '伊莱亚斯·沃德 污染.webp' },
  '玛莎·格雷': { normal: '玛莎·格雷 正常.webp', corrupted: '玛莎·格雷 污染.webp' },
  '约书亚·布莱克': { normal: '约书亚·布莱克 正常.webp', corrupted: '约书亚·布莱克 污染.webp' },
  '希尔达·莫里斯': {
    normal: '希尔达·莫里斯 正常.webp',
    corrupted: '希尔达·莫里斯 污染.webp',
    redeemed: '希尔达 救赎.webp',
  },
  '汤米·陈': { normal: '汤米·陈 正常.webp', corrupted: '汤米·陈 污染.webp' },
  '伊莎贝拉·韦伯': { normal: '伊莎贝拉·韦伯 正常.webp', corrupted: '伊莎贝拉·韦伯 污染.webp' },
  老费舍: {
    normal: '老费舍 正常.webp',
    corrupted: '老费舍 污染.webp',
    redeemed: '老费舍 救赎.webp',
  },
  '埃德加·洛夫克拉夫特': {
    normal: '埃德加·洛夫克拉夫特 正常.webp',
    corrupted: '埃德加·洛夫克拉夫特 污染.webp',
  },
  // 次要 NPC（事件中出现）
  医生: { normal: '医生 正常.webp', corrupted: '医生 污染.webp' },
  治安官: { normal: '治安官 正常.webp', corrupted: '治安官 污染.webp' },
  报童: { normal: '报童 正常.webp', corrupted: '报童 污染.webp' },
  疯乞丐: { normal: '疯乞丐 正常.webp', corrupted: '疯乞丐 污染.webp' },
  可疑摊贩: { normal: '可疑摊贩 正常.webp', corrupted: '可疑摊贩 污染.webp' },
  晨星会教徒: { normal: '晨星会教徒 正常.webp', corrupted: '晨星会教徒 污染.webp' },
  晨星会祭司: { normal: '晨星会祭司 正常.webp', corrupted: '晨星会祭司 污染.webp' },
  教堂祈祷者: { normal: '教堂祈祷者 正常.webp', corrupted: '教堂祈祷者 污染.webp' },
  失踪者家属: { normal: '失踪者家属 正常.webp', corrupted: '失踪者家属 崩溃.webp' },
  溺亡水手: {
    normal: '溺亡水手  失踪者残影 正常.webp',
    corrupted: '溺亡水手  失踪者残影 污染.webp',
  },
  码头工人: { normal: '码头工人  渔民 正常.webp', corrupted: '码头工人  渔民 污染.webp' },
  镇民: { normal: '镇民 正常.webp', corrupted: '镇民 污染.webp' },
  庄园仆人幽影: { normal: '庄园仆人幽影 正常.webp', corrupted: '庄园仆人幽影 污染.webp' },
  夜魔: { normal: '夜魔 正常.webp', corrupted: '夜魔 污染.webp' },
  // 怪物（仅一种形态）
  深潜者: { normal: '深潜者 普通.webp', corrupted: '深潜者 领袖.webp' },
  修格斯: { normal: '修格斯.webp', corrupted: '修格斯.webp' },
  食尸鬼: { normal: '食尸鬼.webp', corrupted: '食尸鬼.webp' },
  半转化妇人: { normal: '半转化妇人 污染.webp', corrupted: '半转化妇人 污染.webp' },
  半转化镇民: { normal: '半转化镇民 污染.webp', corrupted: '半转化镇民 污染.webp' },
  无脸访客: { normal: '无脸访客靠近.webp', corrupted: '无脸访客靠近.webp' },
  伊斯残影: { normal: '伊斯残影.webp', corrupted: '伊斯残影.webp' },
};

export var AREA_IMAGE_MAP = {
  town_center: {
    default: '沃切斯特全景 白天.webp',
    night: '沃切斯特全景 深夜.webp',
    corruptionHigh: '沃切斯特全景 崩坏.webp',
  },
  harbor_district: {
    default: '沃切斯特码头 白天.webp',
    night: '沃切斯特码头 深夜.webp',
    corruptionHigh: '沉锚酒馆外观 污染.webp',
  },
  whispering_forest: {
    default: '低语森林入口.webp',
    deep: '低语森林深处.webp',
    alt: '森林石碑区.webp',
  },
  voxchester_manor: {
    default: '莫里斯庄园外观 白天.webp',
    night: '莫里斯庄园外观 深夜.webp',
    interior: '莫里斯庄园大厅.webp',
  },
  catacombs_entrance: {
    default: '地下墓穴入口.webp',
    deep: '地下墓道.webp',
  },
  deep_catacombs: {
    default: '墓穴深层大厅.webp',
    alt: '地下墓道.webp',
  },
  lighthouse: {
    default: '灯塔远景 白天.webp',
    night: '灯塔远景 晚上.webp',
    interior: '灯塔内部 楼梯.webp',
  },
  ruins_of_yith: {
    default: '海底遗迹入口.webp',
    deep: '海底遗迹大厅.webp',
  },
  forbidden_grove: {
    default: '森林石碑区.webp',
    alt: '森林废弃木屋.webp',
  },
};

export var PLAYER_STATE_IMAGE = {
  normal: '我 正常.webp',
  injured: '我 受伤.webp',
  polluted: '我 污染.webp',
  mad: '我 疯狂.webp',
  loop: '我 轮回.webp',
  replaced: '我 被替换.webp',
  reporter: '我 记者.webp',
  sealed: '我 被封印容器.webp',
  escaped: '我 逃脱.webp',
};

export var EVENT_IMAGE_MAP = {
  evt_seal_collapse: '封印崩塌.webp',
  evt_endless_stairs: '无尽楼梯.webp',
  evt_portraits_turn: '肖像全部转头.webp',
  evt_portrait_watch: '肖像全部转头.webp',
  evt_face_approaches: '无脸访客靠近.webp',
  evt_second_self: '第二个自己.webp',
  evt_fourth_return: '第四次归来.webp',
  evt_time_stopped: '时间停止的街道.webp',
  evt_loop_reset: 'Loop重置瞬间.webp',
  evt_mass_ritual: '深夜集体祈祷.webp',
  evt_harbor_return: '深夜港口集体归海.webp',
  evt_tide_street: '海潮第一次进入街道.webp',
  evt_deep_shadow: '海边巨大阴影出现.webp',
  seal_weakening: '封印石门.webp',
  seal_critical: '封印核心 石门版.webp',
  seal_collapse: '封印崩塌.webp',
  loop_return: '我 轮回1.webp',
  deep_ritual: '教堂地下仪式.webp',
  deep_altar: '教堂地下祭坛.webp',
  deep_shadow_sea: '海底巨大阴影.webp',
  deep_abyss_edge: '海底深渊边缘.webp',
  deep_altar_sea: '海底祭坛.webp',
  safehouse_dream: '梦境安全屋.webp',
  dream_corridor: '梦境长廊.webp',
  dream_harbor: '梦境港口.webp',
  dream_visitor: '梦境访客.webp',
  tavern_normal: '沉锚酒馆 正式营业.webp',
  tavern_fewer: '沉锚酒馆 客人变少.webp',
  tavern_chaos: '沉锚酒馆 完全失控.webp',
  tavern_floor_water: '沉锚酒馆外 地板渗水.webp',
  tavern_night: '沉锚酒馆外观 夜晚.webp',
  tavern_day: '沉锚酒馆外观 白天.webp',
  tavern_corrupted: '沉锚酒馆外观 污染.webp',
  church_day: '教堂大厅 白天.webp',
  church_night_ritual: '教堂大厅 深夜仪式.webp',
  church_underground: '教堂地下室入口.webp',
  church_underground_ritual: '教堂地下仪式.webp',
  lighthouse_beam: '灯塔绿光.webp',
  lighthouse_stopped: '灯塔停止转动.webp',
  lighthouse_well_open: '灯塔井下开启.webp',
  lighthouse_well_exist: '灯塔井下存在.webp',
  lighthouse_mirror: '灯塔镜室.webp',
  lighthouse_deep_well: '灯塔地下井 深层.webp',
  lighthouse_well_entrance: '灯塔地下井入口.webp',
  manor_study: '莫里斯庄园书房.webp',
  manor_basement: '莫里斯庄园地下室.webp',
  manor_portrait_gallery: '莫里斯庄园肖像长廊.webp',
  abandoned_boat: '废弃渔船内部.webp',
  shore_reef: '海岸礁石区.webp',
  forest_cabin: '森林废弃木屋.webp',
  forest_stones: '森林石碑区.webp',
  loop_entry_1: '沃切斯特入口 Loop1.webp',
  loop_entry_3: '沃切斯特入口 Loop3.webp',
  loop_entry_5: '沃切斯特入口 Loop5.webp',
  voxchester_end: '沃切斯特终局.webp',
  poster: '海报.webp',
  poster2: '海报 2.webp',
  // 区域变体/备用图（用于特定事件或污染状态切换）
  church_exterior_day: '沃切斯特教堂外观 白天.webp',
  church_exterior_night: '沃切斯特教堂外观 深夜.webp',
  tavern_patron_normal: '镇民  酒馆客人 正常.webp',
  tavern_patron_polluted: '镇民  酒馆客人 污染.webp',
};

// === 查询函数 ===
// 资源层只关心显示状态，不读游戏 state 全结构。
// 调用方负责从 state 中提取 { phase, visits, pollution, san, hp, ... } 再传入。

/**
 * Get NPC portrait. Accepts Chinese name or stable id.
 * Phase B compat: tries NPC_IMAGE_MAP (by name), then NPC_REGISTRY (by id → portrait).
 */
export function getNpcImage(npcInput, npcStates) {
  if (!npcInput) return null;
  var entry = null;
  var lookupKey = npcInput;
  // Try direct lookup in legacy name-keyed map
  entry = NPC_IMAGE_MAP[npcInput];
  // If not found, try resolveNpcId → getNpcName → NPC_IMAGE_MAP
  if (!entry && typeof resolveNpcId === 'function') {
    var resolved = resolveNpcId(npcInput);
    if (resolved !== npcInput) {
      // Input was a name or alias; look up by resolved id's display name
      var displayName = typeof getNpcName === 'function' ? getNpcName(resolved) : resolved;
      entry = NPC_IMAGE_MAP[displayName];
      if (entry) lookupKey = displayName;
    }
  }
  // If still not found, try NPC_REGISTRY portraits
  if (!entry && typeof NPC_REGISTRY !== 'undefined') {
    var regEntry = NPC_REGISTRY[npcInput] || NPC_REGISTRY[resolveNpcId(npcInput)];
    if (regEntry && regEntry.portrait) entry = regEntry.portrait;
  }
  if (!entry) return null;
  // Look up npcStates by both name and id
  var ns = (npcStates || {})[npcInput] || {};
  if (!ns.corrupted && typeof resolveNpcId === 'function') {
    var altKey = resolveNpcId(npcInput);
    if (altKey !== npcInput) ns = (npcStates || {})[altKey] || ns;
  }
  if (ns.redeemed && entry.redeemed) return PORTRAIT_BASE + entry.redeemed;
  if (ns.corrupted) return PORTRAIT_BASE + (entry.corrupted || entry.normal);
  return PORTRAIT_BASE + entry.normal;
}

/**
 * @param {object} view - { san, hp, maxHp, pollution, loopCount, madnessActive }
 */
export function getPlayerImage(view) {
  if (!view) return PORTRAIT_BASE + PLAYER_STATE_IMAGE.normal;
  var key = 'normal';
  if (view.san < 20 || view.madnessActive) key = 'mad';
  else if (view.pollution > 0.3) key = 'polluted';
  else if (view.hp < view.maxHp * 0.5) key = 'injured';
  else if (view.loopCount > 0) key = 'loop';
  return PORTRAIT_BASE + (PLAYER_STATE_IMAGE[key] || PLAYER_STATE_IMAGE.normal);
}

/**
 * @param {string} areaId
 * @param {object} view - { phase, visits, pollution } — 调用方从 state 提取
 */
export function getAreaSceneImage(areaId, view) {
  if (!areaId) return null;
  var entry = AREA_IMAGE_MAP[areaId];
  if (!entry) return null;
  var phase = view.phase;
  var isNight = phase === 'midnight' || phase === 'evening';
  var visits = view.visits || 0;
  var pollution = view.pollution || 0;
  var variant = 'default';
  if (isNight && entry.night) variant = 'night';
  else if (pollution > 0.5 && entry.corruptionHigh) variant = 'corruptionHigh';
  else if (visits >= 2 && entry.deep) variant = 'deep';
  var filename = entry[variant] || entry.default;
  return PORTRAIT_BASE + filename;
}

export function getEventImage(eventId) {
  if (!eventId) return null;
  var filename = EVENT_IMAGE_MAP[eventId];
  return filename ? PORTRAIT_BASE + filename : null;
}

// === 结局CG映射 (webp_ending/) ===
export var ENDING_CG_BASE = 'assets/webp_ending/';

var ENDING_CG_MAP = {
  // Behavior endings (36)
  ending_self_harm_ritual: '裂痕.webp',
  ending_dissolution: '溶盐者.webp',
  ending_vessel: '容器.webp',
  ending_tide_marriage: '潮声之婚.webp',
  ending_embrace: '悦纳者.webp',
  ending_black_tide_wedding: '黑潮圣婚.webp',
  ending_cannibal: '多余的餐具.webp',
  ending_slaughterhouse: '屠宰场.webp',
  ending_echo: '回音.webp',
  ending_flesh_tax: '人肉税.webp',
  ending_betrayer: '筹码.webp',
  ending_false_god: '伪神.webp',
  ending_maggots_on_throne: '王座上的蛆.webp',
  ending_seal_kiss: '封印的亲吻.webp',
  ending_ascended_victim: '升座的牺牲品.webp',
  ending_sleeper: '长眠者.webp',
  ending_accountant: '账房先生.webp',
  ending_prisoner: '囚徒.webp',
  ending_wanderer: '漫游者.webp',
  ending_miser: '守财奴.webp',
  ending_return_to_sea: '归海.webp',
  ending_archive_devourer: '档案吞噬者.webp',
  ending_eternal_recorder: '永恒记录员.webp',
  ending_observer: '埃德加 观测者.webp',
  ending_delete_wish: '删档祈愿者.webp',
  ending_loop_moth: '循环的蛀虫.webp',
  ending_joyful_prophet: '愉悦的先知.webp',
  ending_filth_saint: '污圣徒.webp',
  ending_thirteenth_prophet: '十三响的先知.webp',
  ending_flesh_choir: '血肉合唱.webp',
  ending_best_employee: '最佳员工.webp',
  ending_tidy_butcher: '整洁的屠夫.webp',
  ending_puppeteer: '木偶师.webp',
  ending_broken_loop: '断环.webp',
  ending_white_page: '白页.webp',
  ending_invalid_archive: '无效档案.webp',
  // Main story endings
  ending_heretical_dawn: '异端降临.webp',
  ending_abyss_consumed: '深渊吞噬.webp',
  ending_transcendence: '超越者.webp',
  ending_evidence_escape: '证据逃离.webp',
  ending_escape_by_sea: '归海.webp',
  ending_seal_player_keeper: '守门人.webp',
  ending_seal_hilda_choice: '希尔达的选择.webp',
  ending_seal_old_fisher_blood: '老费舍 码头残影.webp',
  ending_isabella_twelfth_bell: '伊莎贝拉：第十二声.webp',
  ending_loop_truth: '断环.webp',
  ending_player_becomes_event: '成为事件的残页.webp',
  // NPC redemption / special endings
  ending_hilda_redeemed: '希尔达 救赎.webp',
  ending_hilda_seal_cost: '希尔达：封印代价.webp',
  ending_hilda_endgame: '希尔达：终局知情.webp',
  ending_isabella_redeemed: '伊莎贝拉 救赎.webp',
  ending_elias_gatekeeper: '伊莱亚斯 守门人.webp',
  ending_edgar_observer: '埃德加 观测者.webp',
  ending_joshua_redeemed: '约书亚 救赎.webp',
  // Additional CGs
  ending_thirteenth_bell: '第十二声.webp',
  ending_load_failed: '无效档案.webp',
  ending_silence_contract: '空白事件卡.webp',
  ending_clean_seal: '洗不掉的印记.webp',
  ending_witness_protection: '证据逃离.webp',
  ending_retired_priest: '伊莎贝拉：第十二声.webp',
  ending_hall_of_bones: '骨头落地的声音.webp',
  ending_absent_thirteenth: '镜中缺席者.webp',
  ending_old_sweat: '旧汗渍.webp',
  ending_sea_cargo: '海上逃离.webp',
  ending_blank_tape: '空白墓碑.webp',
  ending_blank_fragment: '成为事件的残页.webp',
  ending_white_page_clean: '白页.webp',
  ending_event_600_last_page: '第600事件：笔记本最后一页.webp',
  ending_event_600_ink: '第600结局：墨水化.webp',
  ending_event_600_log: '第600预兆：事件日志问号.webp',
  ending_event_600_whisper: '第600预兆：路人低语.webp',
  ending_page_599_600: '页码599变600.webp',
  ending_becomes_event: '玩家成为事件.webp',
  ending_death_reaper: '身心俱灭.webp',
  ending_dark_hand: '黑暗中的手.webp',
  ending_be_observed: '被观察者.webp',
  ending_horse_fish: '骨头落地的声音.webp',
  ending_candle_oath: '潮声之婚.webp',
  ending_premium_seat: '升座的牺牲品.webp',
  ending_blank_record: '空白事件卡.webp',
  ending_seal_of_kiss: '封印的亲吻.webp',
  ending_abyss_consumed_alt: '深渊吞噬.webp',
  // 行为结局变体CG（备选/高质量版本）
  ending_loop_worm: '循环的蛀虫.webp',
  ending_pleased_prophet: '愉悦的先知.webp',
  ending_clean_butcher: '整洁的屠夫.webp',
  ending_cannibal_alt: '餐具.webp',
  // NPC/角色特殊结局CG
  ending_old_fisher_epilogue: '最后的人事.webp',
  ending_old_fisher_last: '老费舍 最后的人事.webp',
  ending_observer_alt: '观测者.webp',
  // 特殊事件/轮回CG
  ending_loop_breakthrough: '轮回破壁.webp',
  ending_death_echo_coat: '漂浮的外套.webp',
};

// 结局类型→打字机前导词
var ENDING_TYPEWRITER_PRELUDE = {
  good: [
    '潮水退去了。\n你听见远处传来一声钟响——\n是第十三声，还是第一声，\n你已经分不清了。',
    '雾开始散了。\n码头边的石阶上，\n有人放了一枝花。\n你不知道是谁放的。\n但你知道那是给你的。',
  ],
  neutral: [
    '雾开始散开。\n海面上有光。\n你没有回头。\n你知道回头会看见什么。',
    '海平线在远处闪烁。\n潮声渐渐远去。\n你站在码头边，\n手里有一张船票。\n上面没有目的地。',
  ],
  bad: [
    '黑暗从边缘渗进来。\n钟声停了。\n海潮声越来越近。\n你闭上眼睛。',
    '你听到自己的呼吸声。\n一下。两下。\n……\n停了。\n\n然后你听到了第十三声钟响。',
  ],
  hidden: [
    '页码翻到了最后一页。\n上面没有字。\n但你认得这个空白——\n它一直在等你。',
    '你看见了。\n……\n你不应该看见的。\n……\n现在它也知道你看见了。',
  ],
  behavior: [
    '系统在整理你的档案。\n你的选择被归档。\n你的行为被分类。\n你不再是一个角色。\n你是一段记录。',
    '你每天做同样的事。\n说同样的话。\n走同样的路。\n……\n然后有一天，\n沃切斯特记住了你。',
  ],
};

function getEndingCgImage(endingId) {
  if (!endingId) return null;
  var filename = ENDING_CG_MAP[endingId];
  if (!filename) return null;
  return filename.indexOf('assets/') === 0 ? filename : ENDING_CG_BASE + filename;
}

function getEndingPrelude(endingType) {
  var pool = ENDING_TYPEWRITER_PRELUDE[endingType] || ENDING_TYPEWRITER_PRELUDE.bad;
  return pool[Math.floor(Math.random() * pool.length)];
}
