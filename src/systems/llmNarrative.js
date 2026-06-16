// src/systems/llmNarrative.js - LLM-powered narrative enhancement layer
// Optional enhancer: all functions fall back to static text on failure.
// NEVER called inside reducers (async). Called from UI / event handlers.
// Architecture: Reducer -> static data (sync). UI layer -> LLM enhance (async).

import { glmChat, glmChatQueued, isGlmAvailable, clearGlmCache, clearGlmQueue } from '../utils/glmClient.js';
import { getSanStageFromGD } from '../reducers/sanReducer.js';

var GAME_SYSTEM_PROMPT =
  '你是《深渊低语：沃切斯特之影》的叙事助手。\n' +
  '这是一款克苏鲁风格的文字冒险Roguelike游戏。\n' +
  '你的任务是根据玩家的游戏状态，生成沉浸感强、氛围一致的中文叙事文本。\n' +
  '规则：\n' +
  '1. 使用第二人称（你），简洁有力，符合洛夫拉夫特式恐怖调性\n' +
  '2. 不要暴露游戏机制（SAN值、检定、周目等），只用叙事语言\n' +
  '3. 文本长度：50-150字，适合游戏内显示\n' +
  '4. 根据玩家的SAN值/感染度/周目数调整叙事扭曲程度\n' +
  '5. 低SAN时文本更加不可靠、碎片化、幻觉化\n' +
  '6. 高周目时文本暗示轮回感、既视感\n' +
  '7. 不要使用markdown格式，直接输出纯文本';

// =============================================================
// 1. DEATH SUMMARY - LLM-enhanced 4-section narrative
// =============================================================

/**
 * Generate an LLM-enhanced death narrative.
 * @param {object} state - game state at death
 * @param {object} deathCtx - from resolveDeath()
 * @param {object} staticData - from buildDeathSummary()
 * @returns {Promise<object>} enhanced sections or nulls
 */
export async function enhanceDeathSummary(state, deathCtx, staticData) {
  if (!isGlmAvailable()) return _nullSections();
  var san = state.san || 60;
  var loop = state.loopCount || 0;
  var stage = getSanStageFromGD(san);
  var corruption = state.safehouseCorruption || 0;
  var infection = state.infection || 0;
  var day = state.day || 1;
  var area = state.currentArea || '未知';
  var cause = (deathCtx && deathCtx.type) || 'unknown';

  var contextLines = [];
  contextLines.push('死亡原因: ' + cause);
  contextLines.push('区域: ' + area + '，第' + day + '天');
  contextLines.push('SAN阶段: ' + (stage.name || '未知') + '，SAN=' + san);
  contextLines.push('周目: ' + loop + '，腐蚀度: ' + corruption + '%，感染度: ' + infection + '%');

  var clues = state.clues || [];
  if (clues.length > 0) {
    var clueNames = clues.slice(0, 5).map(function (x) {
      return typeof x === 'string' ? x : (x.name || x.id || '');
    });
    contextLines.push('发现线索: ' + clueNames.join('、'));
  }

  var npcTrust = state.npcTrust || {};
  var trustedNpcs = [];
  var npcKeys = Object.keys(npcTrust);
  for (var ii = 0; ii < npcKeys.length; ii++) {
    if (npcTrust[npcKeys[ii]] >= 3) trustedNpcs.push(npcKeys[ii]);
  }
  if (trustedNpcs.length > 0) {
    contextLines.push('信任你的NPC: ' + trustedNpcs.join('、'));
  }

  var bt = state.behaviorTracking || {};
  if (bt.direct_kill_count > 0) contextLines.push('击杀数: ' + bt.direct_kill_count);
  if (bt.clue_finds > 0) contextLines.push('线索发现: ' + bt.clue_finds);
  if (bt.areas_explored > 0) contextLines.push('探索区域: ' + bt.areas_explored);

  var contextStr = contextLines.join('\n');
  var promises = [
    _generateDeathSection('section1', '你如何死去', contextStr, san, loop, corruption, infection),
    _generateDeathSection('section2', '你本轮发现了什么', contextStr, san, loop, corruption, infection),
    _generateDeathSection('section3', '世界因此改变了什么', contextStr, san, loop, corruption, infection),
    _generateDeathSection('section4', '下一轮你可以尝试什么', contextStr, san, loop, corruption, infection),
  ];
  var results = await Promise.allSettled(promises);
  return {
    section1: results[0].status === 'fulfilled' ? results[0].value : null,
    section2: results[1].status === 'fulfilled' ? results[1].value : null,
    section3: results[2].status === 'fulfilled' ? results[2].value : null,
    section4: results[3].status === 'fulfilled' ? results[3].value : null,
  };
}

async function _generateDeathSection(sectionId, sectionTitle, contextStr, san, loop, corruption, infection) {
  var distortionGuide = '';
  if (san <= 20) distortionGuide = '你的SAN极低，文本应该是破碎的、充满幻觉的、不可靠的叙述。可以用省略号、括号插入幻觉、句子突然中断。';
  else if (san <= 40) distortionGuide = '你的SAN较低，文本应该有轻微的不确定感和认知偏差。';
  else if (loop >= 5) distortionGuide = '你经历了多次轮回，文本应暗示既视感和时间重叠。';
  else if (corruption >= 50) distortionGuide = '世界腐蚀度很高，文本应带有诡异的现实扭曲感。';
  else if (infection >= 50) distortionGuide = '你的感染度很高，文本应带有海洋/身体变异的暗示。';

  var prompt =
    '游戏状态:\n' + contextStr + '\n\n' +
    '请为死亡总结页面的「' + sectionTitle + '」部分生成一段叙事文本。' +
    distortionGuide + '\n' +
    '要求：50-150字，中文，第二人称，克苏鲁风格。不要输出标题，只输出正文。';

  // Use queued variant — death sections are batch requests that must serialize
  var result = await glmChatQueued(prompt, { system: GAME_SYSTEM_PROMPT, temperature: 0.85, maxTokens: 300 });
  return result.ok && result.text ? result.text : null;
}

function _nullSections() { return { section1: null, section2: null, section3: null, section4: null }; }

// =============================================================
// 2. NPC DYNAMIC DIALOGUE - context-aware generation
// =============================================================

var NPC_PERSONAS = {
  '玛莎·格雷': '玛莎·格雷是沃切斯特"深渊之锚"酒馆的老板娘。她精明、务实，见过太多来来去去的人。她说话直接，偶尔带着黑色幽默。',
  '老费舍': '老费舍是码头区的老渔夫，沉默寡言。他知道海里有东西，但从不正面说出来。他用手势和沉默交流。',
  '希尔达·莫里斯': '希尔达·莫里斯是莫里斯庄园的女主人，优雅但疏离。她对沃切斯特的秘密知道得比任何人都多。',
  '伊莎贝拉·韦伯': '伊莎贝拉·韦伯是小镇教堂的修女，虔诚而矛盾。她在信仰和真相之间挣扎。',
  '约书亚·布莱克': '约书亚·布莱克是灯塔看守人，前军人。他务实、警惕，习惯性地保护他人。',
  '伊莱亚斯·沃德': '伊莱亚斯·沃德是小镇唯一的医生，理性、好奇。他把一切当作研究对象，包括你。',
  '汤米·陈': '汤米·陈是摄影师兼记者，年轻、好奇。他用镜头记录沃切斯特的一切，但镜头也记录了他不该看到的东西。',
  '埃德加·洛夫克拉夫特': '埃德加·洛夫克拉夫特是作家，在沃切斯特寻找创作灵感。他模糊了虚构和现实的边界。',
};

/**
 * Generate dynamic NPC dialogue based on game context.
 * @param {string} npcName - NPC display name
 * @param {string} topic - conversation topic
 * @param {object} state - current game state
 * @returns {Promise<string|null>} enhanced dialogue or null
 */
export async function generateNpcDialogue(npcName, topic, state) {
  if (!isGlmAvailable()) return null;
  var persona = NPC_PERSONAS[npcName] || (npcName + '是沃切斯特的居民。');
  var trust = (state.npcTrust || {})[npcName] || 0;
  var san = state.san || 60;
  var loop = state.loopCount || 0;
  var corruption = state.safehouseCorruption || 0;
  var infection = state.infection || 0;
  var stage = getSanStageFromGD(san);

  var systemPrompt = GAME_SYSTEM_PROMPT + '\n\n' +
    '你现在扮演NPC「' + npcName + '」：' + persona + '\n' +
    '你必须以该NPC的第一人称说话，直接输出对话内容。' +
    '不要输出动作描述的括号标注除非是对话的一部分。' +
    '输出2-4句话，每句简短有力。';

  var contextParts = [];
  contextParts.push('玩家与' + npcName + '的信任等级: ' + trust + '/5');
  contextParts.push('玩家SAN阶段: ' + (stage.name || '未知'));
  contextParts.push('当前周目: ' + loop + '，腐蚀度: ' + corruption + '%');

  if (trust <= 0) contextParts.push('玩家与该NPC无信任，对话应冷淡或警惕。');
  else if (trust >= 4) contextParts.push('玩家与该NPC高度信任，对话应温暖但可能透露危险信息。');

  if (loop >= 5) contextParts.push('玩家已经轮回多次，NPC可能隐约感觉到不对劲。');
  if (loop >= 8) contextParts.push('NPC对轮回有强烈的既视感，可能说出不该知道的事。');
  if (corruption >= 50) contextParts.push('世界腐蚀度很高，NPC周围环境扭曲。');
  if (infection >= 50) contextParts.push('玩家感染度高，NPC可能注意到玩家身体的异常变化。');
  if (san <= 25) contextParts.push('玩家SAN极低，他看到的NPC可能不是真实的。');

  var userPrompt = contextParts.join('\n') + '\n\n对话主题: ' + (topic || '日常问候') + '\n\n请生成' + npcName + '的对话。';

  var result = await glmChat(userPrompt, { system: systemPrompt, temperature: 0.9, maxTokens: 256 });
  return result.ok && result.text ? result.text : null;
}

// =============================================================
// 3. META CORRUPTION - LLM-generated false events
// =============================================================

export async function generateMetaCorruptionEvent(state) {
  if (!isGlmAvailable()) return null;
  var san = state.san || 60;
  var loop = state.loopCount || 0;
  var corruption = state.safehouseCorruption || 0;
  var day = state.day || 1;
  var area = state.currentArea || '安全屋';
  var distortionLevel = san <= 10 ? '极度' : san <= 25 ? '高度' : '中度';

  var prompt =
    '你正在为一个克苏鲁恐怖游戏生成"系统入侵"文本。' +
    '这些文本会在玩家休息时随机出现，模拟游戏系统被未知力量入侵的感觉。\n\n' +
    '玩家状态：SAN=' + san + '(失真等级:' + distortionLevel + ')，第' + day + '天，周目' + loop + '，' +
    '在' + area + '，腐蚀度' + corruption + '%\n\n' +
    '要求：\n' +
    '1. 生成一条"伪系统消息"，模拟游戏日志/存档/时钟被篡改的感觉\n' +
    '2. 50-100字，中文\n' +
    '3. 风格参考：存档被修改、时间倒流、窗外有人、镜中倒影异常\n' +
    '4. 根据失真等级调整扭曲程度：极度=完全不可理喻，中度=微妙不安\n' +
    '5. 输出格式：先写方括号前缀标签如[系统错误]、[记忆碎片]、[时序异常]，然后换行写正文\n' +
    '6. 不要重复常见的意象，创造新的';

  var result = await glmChat(prompt, { system: GAME_SYSTEM_PROMPT, temperature: 0.95, maxTokens: 200 });
  if (!result.ok || !result.text) return null;
  var text = result.text;
  var prefix = '[异象]';
  var bracketMatch = text.match(/^\[([^\]]+)\]\s*/);
  if (bracketMatch) {
    prefix = '[' + bracketMatch[1] + ']';
    text = text.slice(bracketMatch[0].length);
  }
  return { text: text.trim(), prefix: prefix };
}

// =============================================================
// 4. EVENT TEXT ENHANCEMENT
// =============================================================

export async function enhanceEventDescription(event, state) {
  if (!isGlmAvailable()) return null;
  if (!event || !event.description) return null;
  var san = state.san || 60;
  var loop = state.loopCount || 0;
  var corruption = state.safehouseCorruption || 0;
  var infection = state.infection || 0;
  var stage = getSanStageFromGD(san);
  var area = state.currentArea || '沃切斯特';
  var day = state.day || 1;

  var prompt =
    '原始事件描述:\n「' + event.description + '」\n\n' +
    '玩家状态: SAN=' + san + '(' + (stage.name || '') + ')' +
    '，第' + day + '天，周目' + loop +
    '，在' + area + '，腐蚀度' + corruption + '%，感染度' + infection + '%\n\n' +
    '请根据玩家状态重新润色这段事件描述，使其更加沉浸。\n' +
    '要求：\n' +
    '1. 保持核心事件含义不变\n' +
    '2. 根据SAN/腐蚀度/感染度添加适当的感官扭曲\n' +
    '3. 80-200字，中文，第二人称\n' +
    '4. 不要改变事件的性质\n' +
    '5. 只输出润色后的描述文本';

  var result = await glmChat(prompt, { system: GAME_SYSTEM_PROMPT, temperature: 0.8, maxTokens: 300 });
  return result.ok && result.text ? result.text : null;
}

// =============================================================
// 5. AFTERGLOW / LEGACY NARRATIVE
// =============================================================

export async function generateAfterglow(state, deathCtx) {
  if (!isGlmAvailable()) return null;
  var san = state.san || 60;
  var loop = state.loopCount || 0;
  var day = state.day || 1;
  var cause = (deathCtx && deathCtx.type) || '未知';
  var area = state.currentArea || '沃切斯特';

  var prompt =
    '玩家在克苏鲁恐怖游戏中死亡。请写一段50-100字的"余韵"文本——' +
    '不是总结，而是一种诗意的、朦胧的、让人回味的氛围描写。\n\n' +
    '死亡信息: ' + cause + '，在' + area + '，第' + day + '天，周目' + loop + '\n' +
    'SAN=' + san + '\n\n' +
    '风格要求：\n' +
    '- 洛夫克拉夫特式的宇宙恐怖余韵\n' +
    '- 暗示死亡不是终点，轮回即将开始\n' +
    '- 用意象而非直接叙述：海浪、钟声、雾、影子、水\n' +
    '- 不要出现游戏术语\n' +
    '- 直接输出正文，不要标题';

  // Use queued variant — called alongside death summary sections (batch)
  var result = await glmChatQueued(prompt, { system: GAME_SYSTEM_PROMPT, temperature: 0.9, maxTokens: 200 });
  return result.ok && result.text ? result.text : null;
}

// =============================================================
// 6. SAN POLLUTION TEXT - low-SAN unreliable narration
// =============================================================

export async function generateSanCorruptedText(originalText, state) {
  if (!isGlmAvailable()) return null;
  if (!originalText || originalText.length < 20) return null;
  var san = state.san || 60;
  var infection = state.infection || 0;
  if (san > 30) return null;

  var corruptionLevel = san <= 10 ? '极度' : san <= 20 ? '高度' : '中度';
  var distortionDetail;
  if (san <= 10) {
    distortionDetail = '词语扭曲、句子断裂、插入不存在的感官、文字本身被污染';
  } else if (san <= 20) {
    distortionDetail = '某些细节被替换、时间感错乱、括号内插入幻觉';
  } else {
    distortionDetail = '微妙的不一致、一两个词被替换、轻微的时间感偏差';
  }

  var prompt =
    '原始叙述文本:\n「' + originalText + '」\n\n' +
    '玩家SAN=' + san + '(失真:' + corruptionLevel + ')，感染度=' + infection + '%\n\n' +
    '请将这段文本改写为"不可靠叙述"版本。规则:\n' +
    '1. 保持核心语义大致可理解\n' +
    '2. ' + corruptionLevel + '失真：' + distortionDetail + '\n' +
    '3. 保持50-200字长度\n' +
    '4. 直接输出改写后的文本';

  var result = await glmChat(prompt, { system: GAME_SYSTEM_PROMPT, temperature: 0.92, maxTokens: 300 });
  return result.ok && result.text ? result.text : null;
}

// =============================================================
// 7. PERSONALITY REFLECTION - LLM-enhanced ending reflection
// =============================================================

export async function generatePersonalityReflection(state, traits) {
  if (!isGlmAvailable()) return null;
  if (!traits || traits.length === 0) return null;
  var san = state.san || 60;
  var loop = state.loopCount || 0;
  var day = state.day || 1;
  var corruption = state.safehouseCorruption || 0;

  var traitDescs = traits.slice(0, 3).map(function (t) { return t.id + ': ' + (t.desc || ''); });
  var prompt =
    '玩家在克苏鲁恐怖游戏中死亡。以下是他的行为特征:\n' +
    traitDescs.join('\n') + '\n\n' +
    '游戏状态: SAN=' + san + '，第' + day + '天，周目' + loop + '，腐蚀度=' + corruption + '%\n\n' +
    '请写3段"档案附注"风格的自我审视文本。每段40-80字。\n' +
    '规则:\n' +
    '1. 第二人称（你），像是一个旁观者在审视玩家\n' +
    '2. 不要直接说"你是XX主义者"，用隐喻和意象\n' +
    '3. 语气冷淡、客观，像病历记录\n' +
    '4. 暗示行为模式但不评判\n' +
    '5. 每段之间用空行分隔\n' +
    '6. 不要使用markdown格式';

  var result = await glmChat(prompt, { system: GAME_SYSTEM_PROMPT, temperature: 0.88, maxTokens: 400 });
  if (!result.ok || !result.text) return null;
  // 按空行分段
  return result.text.split(/\n\s*\n/).filter(function (p) { return p.trim().length > 10; }).slice(0, 3);
}

// =============================================================
// 8. LOOP OPENING - new loop narrative after death
// =============================================================

export async function generateLoopOpening(state, deathCtx) {
  if (!isGlmAvailable()) return null;
  var loop = state.loopCount || 0;
  if (loop < 1) return null;
  var san = state.san || 60;
  var day = state.day || 1;
  var cause = (deathCtx && deathCtx.type) || '未知';
  var area = state.currentArea || '沃切斯特';
  var pollution = state.pollution || 0;

  var clueCount = (state.clues || []).length;
  var npcTrust = state.npcTrust || {};
  var trustedNpcs = Object.keys(npcTrust).filter(function (k) { return npcTrust[k] >= 3; });

  var prompt =
    '玩家在克苏鲁恐怖轮回游戏中开始了第' + loop + '次轮回。\n\n' +
    '上一轮信息: 死因=' + cause + '，在' + area + '，第' + day + '天\n' +
    '当前状态: SAN=' + san + '，污染=' + Math.round(pollution * 100) + '%，线索=' + clueCount + '条\n' +
    (trustedNpcs.length > 0 ? '上轮信任的NPC: ' + trustedNpcs.join('、') + '\n' : '') +
    '\n请写一段50-120字的"轮回开始"叙事文本。\n' +
    '规则:\n' +
    '1. 第二人称（你），你再次醒来\n' +
    '2. 暗示既视感——你来过这里，但记忆模糊\n' +
    '3. 轮回次数越多，既视感越强\n' +
    '4. 用感官描写：雾、钟声、海水味、旧木头\n' +
    '5. 不要出现游戏术语（SAN、周目、检定等）\n' +
    '6. 直接输出正文，不要标题';

  var result = await glmChat(prompt, { system: GAME_SYSTEM_PROMPT, temperature: 0.85, maxTokens: 200 });
  return result.ok && result.text ? result.text : null;
}

// =============================================================
// 9. SAVE NAME CORRUPTION - LLM-generated corrupted save names
// =============================================================

export async function generateCorruptedSaveName(originalName, state) {
  if (!isGlmAvailable()) return null;
  var san = state.san || 60;
  if (san > 20) return null;
  var corruptionLevel = san <= 10 ? '极度' : '中度';

  var prompt =
    '原始存档名: 「' + originalName + '」\n' +
    '玩家SAN=' + san + '(失真:' + corruptionLevel + ')\n\n' +
    '请将这个存档名"篡改"为一个诡异版本。规则:\n' +
    '1. 保持大致可辨认，但有1-2处替换/扭曲\n' +
    '2. ' + (san <= 10 ? '极度扭曲：部分字符被替换为不可读符号或反义词' : '中度扭曲：个别字被替换为同音异义或暗示性词汇') + '\n' +
    '3. 只输出篡改后的存档名，10字以内\n' +
    '4. 不要加引号或解释';

  var result = await glmChat(prompt, { system: GAME_SYSTEM_PROMPT, temperature: 0.95, maxTokens: 50, noCache: true });
  return result.ok && result.text ? result.text.slice(0, 20) : null;
}

// =============================================================
// UTILITY
// =============================================================

export function buildStateSummary(state) {
  if (!state) return '无状态';
  var parts = [];
  parts.push('SAN=' + (state.san || 60));
  parts.push('Day=' + (state.day || 1));
  parts.push('Loop=' + (state.loopCount || 0));
  parts.push('Area=' + (state.currentArea || '?'));
  parts.push('Corruption=' + (state.safehouseCorruption || 0) + '%');
  parts.push('Infection=' + (state.infection || 0) + '%');
  parts.push('Food=' + (state.food || 0));
  parts.push('Light=' + (state.light || 0));
  var clues = state.clues || [];
  if (clues.length > 0) parts.push('Clues=' + clues.length);
  return parts.join(', ');
}

export { clearGlmCache, clearGlmQueue, isGlmAvailable };
