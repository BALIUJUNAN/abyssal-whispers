/**
 * 语言污染系统 — SAN 越低，文本越不可靠
 *
 * 管线位置：applyTextFragmentation 之前、narr() 的 fearCorruption 之后
 * 不替换文本含义——让字本身变质
 *
 * 污染层级：
 *   Level 0 (SAN 80+)  — 无污染
 *   Level 1 (SAN 60-79) — 个别字被形近字替换（莎→纱，戊→戌）
 *   Level 2 (SAN 40-59) — 替换增多 + 随机插入 □ · 等占位符
 *   Level 3 (SAN 20-39) — 整词消失 + 占位符 + 重复关键词
 *   Level 4 (SAN 0-19)  — 接近乱码 + 偶尔露出一个真实词
 */

// ── 形近字映射表 ──────────────────────────────────────────
// key → [替代字列表]
var CHAR_SUBSTITUTES = {
  '的': ['得', '地'],
  '了': ['子', '孒'],
  '在': ['再', '在'],
  '是': ['事', '是'],
  '不': ['丕', '不'],
  '人': ['入', '人'],
  '有': ['冇', '有'],
  '来': ['夹', '来'],
  '到': ['至', '到'],
  '说': ['悦', '说'],
  '看': ['着', '看'],
  '走': ['赱', '走'],
  '开': ['卉', '开'],
  '门': ['们', '门'],
  '出': ['岀', '出'],
  '回': ['囬', '回'],
  '听': ['咡', '听'],
  '想': ['相', '想'],
  '知': ['智', '知'],
  '自': ['咱', '自'],
  '己': ['巳', '己'],
  '还': ['還', '还'],
  '这': ['适', '这'],
  '那': ['哪', '那'],
  '海': ['梅', '海'],
  '水': ['氺', '水'],
  '火': ['灬', '火'],
  '光': ['光明', '光'],
  '暗': ['黯', '暗'],
  '死': ['歹', '死'],
  '生': ['牟', '生'],
  '血': ['皿', '血'],
  '眼': ['眼', '眼'],
  '手': ['扌', '手'],
  '心': ['芯', '心'],
};

// ── 占位符集合 ──────────────────────────────────────────
var PLACEHOLDER_CHARS = ['□', '■', '·', '…', '？', '〰'];

// ── 乱码阶段真实词库（藏在污染中的线索） ──────────────────
// Level 4 时，污染文本中随机嵌入这些词——玩家需要辨认
var GHOST_WORDS = [
  '封印', '海底', '灯塔', '教堂', '墓穴',
  '深潜', '回声', '十三', '轮回', '归途',
];

// ── 核心函数 ──────────────────────────────────────────

/**
 * 获取污染级别 (0-4)
 */
export function getPollutionLevel(san) {
  if (san >= 80) return 0;
  if (san >= 60) return 1;
  if (san >= 40) return 2;
  if (san >= 20) return 3;
  return 4;
}

/**
 * 对单段文本施加语言污染
 * @param {string} text - 原始文本
 * @param {number} san - 当前理智值 (0-100)
 * @param {number} loopCount - 轮回次数 (每轮 +10% 强度)
 * @param {function} [rng] - 可选确定性随机
 * @returns {string} 污染后的文本
 */
export function applyTextPollution(text, san, loopCount, rng) {
  if (!text || typeof text !== 'string') return text;
  if (text.length < 4) return text;

  var level = getPollutionLevel(san);
  if (level === 0) return text;

  var _rand = rng ? rng.next.bind(rng) : Math.random;
  var chars = text.split('');
  var len = chars.length;
  var result = [];

  // Loop boost: 每轮 +10% 额外强度
  var loopBoost = Math.min(0.5, (loopCount || 0) * 0.1);
  var intensity = level + loopBoost;

  for (var i = 0; i < len; i++) {
    var ch = chars[i];
    var roll = _rand();

    // Level 4: 高概率乱码（但保留 ~15% 原字）
    if (intensity >= 4) {
      if (roll < 0.25) {
        // 用占位符替换
        result.push(pickPlaceholder(_rand));
        continue;
      }
      if (roll < 0.35 && ch.trim()) {
        // 形近字替换
        result.push(substituteChar(ch, _rand));
        continue;
      }
      // 60% 概率保留原字（可读但严重污染）
      result.push(ch);
      continue;
    }

    // Level 3: 整词消失 + 占位符 + 重复
    if (intensity >= 3) {
      if (roll < 0.08 && ch === '，') {
        // 逗号变占位符
        result.push(pickPlaceholder(_rand));
        continue;
      }
      if (roll < 0.12 && ch.trim() && isCJK(ch)) {
        // 约 12% 概率整字消失（CJK 字符）
        continue; // skip = 删除
      }
      if (roll < 0.18 && ch.trim() && isCJK(ch)) {
        // 关键词重复
        result.push(ch);
        result.push(ch);
        continue;
      }
      result.push(ch);
      continue;
    }

    // Level 2: 占位符 + 形近替换
    if (intensity >= 2) {
      if (roll < 0.04 && ch.trim()) {
        result.push(pickPlaceholder(_rand));
        continue;
      }
      if (roll < 0.10 && isCJK(ch)) {
        result.push(substituteChar(ch, _rand));
        continue;
      }
      result.push(ch);
      continue;
    }

    // Level 1: 仅形近替换（低概率）
    if (intensity >= 1) {
      if (roll < 0.06 && isCJK(ch)) {
        result.push(substituteChar(ch, _rand));
        continue;
      }
      result.push(ch);
      continue;
    }
  }

  var polluted = result.join('');

  // Level 4 额外处理：在句首/句尾偶尔嵌入一个"真实词"
  if (intensity >= 4 && _rand() < 0.4) {
    var ghostWord = GHOST_WORDS[Math.floor(_rand() * GHOST_WORDS.length)];
    if (_rand() < 0.5) {
      polluted = ghostWord + polluted;
    } else {
      polluted = polluted + ghostWord;
    }
  }

  return polluted;
}

// ── 辅助函数 ──────────────────────────────────────────

function isCJK(ch) {
  var code = ch.charCodeAt(0);
  // CJK Unified Ideographs: 4E00-9FFF
  // CJK Extension A: 3400-4DBF
  return (code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3400 && code <= 0x4DBF);
}

function substituteChar(ch, _rand) {
  var candidates = CHAR_SUBSTITUTES[ch];
  if (!candidates || candidates.length === 0) return ch;
  return candidates[Math.floor(_rand() * candidates.length)];
}

function pickPlaceholder(_rand) {
  var chars = PLACEHOLDER_CHARS;
  return chars[Math.floor(_rand() * chars.length)];
}
