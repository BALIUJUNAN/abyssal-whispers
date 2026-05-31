// src/app.jsx - 深渊低语：沃切斯特之影 游戏主逻辑
// Imports stripped by build.py bundler — each import must map to an actual export
import { rand, d100, d3, clamp, pick, rollDice, shuffle } from './reducers/utils.js';
import { getPhase, getSealState, getSealStateId, getWeather, getAreaInfo, getConnectedAreas, getDistortedName } from './reducers/worldReducer.js';
import { getSanStage, getSanTextVariant, getSanSceneVariant, processSanLoss, rollMadness } from './reducers/sanReducer.js';
import { getSafehouseStage, processSafehouseNight } from './reducers/safehouseReducer.js';
import { checkTrigger, selectEvent, doSkillCheck, getGambleOptions, processNormalAnchorEvent } from './reducers/eventReducer.js';
import { applyEffects, applyLegacyEffects } from './reducers/effectReducer.js';
import { getItemDef, useItemByDef } from './reducers/itemReducer.js';
import { genObjectives, checkObjCompletion } from './reducers/objectiveReducer.js';
import { saveGame, loadGame, clearSave, hasSave, getAllSlots, autoSave, manualSave, loadSlot, deleteSlotById, migrateOldSave, exportSave, importSave } from './reducers/saveReducer.js';
import { loadSettings, saveSettings } from './reducers/settingsReducer.js';
import { loadAchievements, saveAchievements, checkAchievements, getAchievementDef, getAllAchievements, incrementStat, resetRunStats } from './reducers/achievementReducer.js';
import { getPollutionText, initLoopState } from './reducers/loopReducer.js';
import { getChapterForDay, getMythosCap, getChapterAlias, checkChapterTransition, getMotifFlavorText, getMonsterManifestation } from './reducers/chapterReducer.js';
import { checkConclusions, checkFalseInterpretations } from './reducers/conclusionReducer.js';
import { checkEnding } from './reducers/endingReducer.js';
import { checkNPCCorruption, applyNPCCorruption, setCorruptionFlag } from './reducers/npcReducer.js';
import { selectEventV2, checkTriggerExtended, resetDailyCategoryCounts, buildPreviousRunSummary, applyExtendedEffect, getEligibleEvents, chooseWeightedEvent, commitSelectedEvent, getEventWeight } from './reducers/extendedEvents.js';
import { ensureExtendedState, mergeExtendedEvents } from './reducers/extendedEventsLoader.js';
import { shouldTriggerMissing600, createMissing600Event } from './data/events_missing_600.js';
import { checkOmens } from './data/events_omens_600.js';
import { initExtendedEvents } from './reducers/extendedEventsInit.js';
import { resolveDeath } from './reducers/deathSystem.js';
import { PROLOGUE_EVENTS } from './data/prologue_events.js';
import { initPrologueState, handlePrologueChoice, handleSkipPrologue, getPrologueEvent, getPrologueSceneOrder } from './reducers/prologueReducer.js';
import { getFearEventWeightModifier, applyFearLens, getFearNpcLine, applyFearCorruption } from './systems/fearLens.js';
import { UgcPanel } from './components/UgcImportExport.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
/* [TRACKER-IMPORT] 测试期错误追踪模块 — 正式版删除此行即可移除 */
import { createErrorTracker } from './utils/errorTracker.js';

// GAME_DATA placeholder is replaced at build time (see line 33)

const {useState,useReducer,useEffect,useRef,useMemo,useCallback,memo}=React;

const GD=initExtendedEvents(__GAME_DATA__);
const ctx={GD};
/* [TRACKER-INIT] 初始化 — GD 之后，dispatch 之前 */
const errorTracker = createErrorTracker();
if (typeof window !== 'undefined') { window.errorTracker = errorTracker; }

// === 提取到独立模块的代码 ===
// clueNameMap.js: CLUE_NAME_MAP, resolveClueName, hasClueId
// gameHelpers.js: initSkills, getNpcsHere, applyChainCompletionEffects, checkChainCompletion, etc.
// initialState.js: initialState()
// AudioManager.js: audioManager
// TitleScreen.jsx, AppToast.jsx: UI components

import { audioManager } from './managers/AudioManager.js';
import { TitleScreen } from './components/TitleScreen.js';
import { AppToast } from './components/AppToast.js';

// === P0-6: CHAPTER 1 VERTICAL SLICE SCRIPT ===
const CH1_INTRO=[
  {type:'system',text:'公元1926年，马萨诸塞州东南海岸。'},
  {type:'system',text:'你乘坐的长途汽车在浓雾中停了下来。司机回头看了一眼，没有说话，只是指了指车窗外隐约可见的路牌：\n\n沃切斯特 —— 3英里'},
  {type:'location',text:'鹅卵石街道在雨后泛着暗沉的光泽，两侧的维多利亚式建筑虽然外表还算完整，但窗后的窗帘永远紧闭。市政厅前的广场上矗立着一座建城者雕像，雕像的面容在岁月侵蚀下变得模糊不清。\n\n公告栏上贴满了失踪人口的告示，日期跨度长达三年。',locationName:'沃切斯特镇中心'},
  {type:'system',text:'教堂的钟响了。\n一下。两下。三下。\n……\n十二下。\n……\n十三下。\n\n没有人抬头。'},
  {type:'system',text:'【提示】你可以在镇中心和码头区自由活动。对话NPC获取情报，探索区域收集线索。\n注意SAN值——正常事件不会消耗你的理智，但深究异常需要付出代价。'}
];

function checkSilentEvent(state, narr, location){
  const pool=(GD.implementation_notes?.silent_events?.event_pool||[]).filter(e=>{
    if(e.location!==location)return false;
    if(e.repeat_behavior==='only_once'&&state.triggeredSilentEvents.includes(e.id))return false;
    if(e.trigger_condition&&e.trigger_condition!=='always'){
      if(e.trigger_condition.startsWith('day>=')){if(state.day<parseInt(e.trigger_condition.split('>=')[1]))return false;}
      if(e.trigger_condition.startsWith('corruption>=')){if((state.safehouseCorruption||0)<parseInt(e.trigger_condition.split('>=')[1]))return false;}
    }
    return true;
  });
  if(pool.length===0)return false;
  const evt=pick(pool);
  state.triggeredSilentEvents.push(evt.id);
  narr('system',evt.text);
  if(evt.mechanical_effect?.san){state.san=clamp(state.san+evt.mechanical_effect.san,0,state.maxSan);}
  return true;
}

function checkKnowledgeEarned(state){
  const k=state.retainedKnowledge;
  if(state.visitedAreas.includes('lighthouse')||state.visitedAreas.includes('catacombs_entrance')){
    if(!k.includes('knowledge_dark_passages'))k.push('knowledge_dark_passages');
  }
  if(Object.values(state.npcTrust).some(t=>t>=3)){
    if(!k.includes('knowledge_npc_weaknesses'))k.push('knowledge_npc_weaknesses');
  }
  if(state.visitedAreas.length>=5){
    if(!k.includes('knowledge_map_structure'))k.push('knowledge_map_structure');
  }
  if((state.completedChains||[]).length>0){
    if(!k.includes('knowledge_clue_relations'))k.push('knowledge_clue_relations');
  }
  if(Object.values(state.npcTrust).some(t=>t>=2)){
    if(!k.includes('knowledge_npc_trust_shadow'))k.push('knowledge_npc_trust_shadow');
  }
  // Achievement: areas explored (systems.progression)
  if(!state.stats_run.areas_explored)state.stats_run.areas_explored=state.visitedAreas.length;
  else state.stats_run.areas_explored=Math.max(state.stats_run.areas_explored,state.visitedAreas.length);
}

function getAvailableSafehouses(state){
  const alts=GD.systems?.safehouse?.relocation_rules?.alternative_safehouses||[];
  return alts.filter(sh=>{
    const npcName=sh.unlock_condition.includes('伊莱亚斯')?'伊莱亚斯·沃德':sh.unlock_condition.includes('希尔达')?'希尔达·莫里斯':null;
    const trustNeeded=parseInt(sh.unlock_condition.match(/\d+/)?.[0]||'99');
    return npcName&&(state.npcTrust[npcName]||0)>=trustNeeded;
  });
}

function checkWrongInference(state, narr){
  if(state.triggeredEvents.includes('wrong_inference_checked'))return;
  const wi=GD.systems?.wrong_inference?.consequences||[];
  for(const inf of wi){
    if(inf.id==='wrong_lighthouse_destroy'&&state.visitedAreas.includes('lighthouse')&&state.triggeredEvents.includes('evt_lighthouse_light')&&!hasClueId(state.clues,'clue_2_2')){
      state.triggeredEvents.push('wrong_inference_checked');
      narr('system','【错误推断】你开始怀疑灯塔是邪恶的源头。也许破坏它能解决问题……',{isSpecial:true});
      break;
    }
  }
}

// === UI Corruption Layer (systems.ui_corruption) ===
function getUICorruptionLayer(san, loopCount, safehouseCorruption){
  if(san<25||safehouseCorruption>=80)return 4; // hostile
  if(san<40||safehouseCorruption>=60)return 3; // contradictory
  if(san<55||loopCount>=3)return 2; // repetitive
  if(san<70||safehouseCorruption>=20)return 1; // fogged
  return 0; // clean
}

function getCorruptedSystemText(baseText, layer){
  // Fear lens corruption: prologue-derived fear-specific UI corruption
  // Applied before generic corruption
  if(layer>0&&_currentFearTuning&&_currentFearTuning.primary){
    const fearCorrupted=applyFearCorruption({fearTuning:_currentFearTuning},baseText,layer);
    if(fearCorrupted!==baseText)return fearCorrupted;
  }
  if(layer<=0||Math.random()>0.3)return baseText;
  const corruptions=GD.systems?.ui_corruption?.layers;
  if(!corruptions)return baseText;
  const layerKey='layer_'+layer+'_'+['clean','fogged','repetitive','contradictory','hostile','abyssal'][Math.min(layer,5)];
  const layerData=corruptions[layerKey];
  if(!layerData)return baseText;
  // Occasionally return a corrupted example instead
  if(layer>=3&&Math.random()<0.15){
    const ex=layerData.examples;
    if(ex){
      const keys=Object.keys(ex);
      return ex[keys[Math.floor(Math.random()*keys.length)]]||baseText;
    }
  }
  // Layer 1-2: append mild suffix
  if(layer===1&&Math.random()<0.4)return baseText+'（你确定吗？）';
  if(layer===2&&Math.random()<0.3)return baseText+' / '+baseText;
  return baseText;
}

// === Humanity Tracking (implementation_notes.ending_system_v2) ===
function modHumanity(state, amount, reason){
  state.humanityScore=clamp((state.humanityScore??50)+amount,0,100);
  if(Math.abs(amount)>=5){
    const narr=state.narrative;
    const label=amount>0?'人性光辉':'人性暗面';
    narr.push({id:Date.now()+Math.random(),type:'system',text:'【'+label+'】'+reason,isSpecial:true});
  }
}

function getHumanityTier(score){
  if(score>=60)return 'high';
  if(score>=30)return 'fragile';
  return 'lost';
}

// === Run Memory (death-recap system) ===
function addRunMemory(state, text, type='choice'){
  if(!state.runMemory)state.runMemory=[];
  state.runMemory.push({day:state.day,type,text:'第 '+state.day+' 天：'+text});
  if(state.runMemory.length>12)state.runMemory=state.runMemory.slice(-12);
}
function buildDeathRecap(state, deathContext=null){
  const mem=state.runMemory||[];
  // Use precise death type from resolveDeath if available, fall back to binary check
  const HP_TYPES=['drowning','bleeding','infection','starvation','falling','darkness_taken','physical'];
  const SAN_TYPES=['madness','possession','identity_erasure','mythos_absorption','loop_collapse','becomes_event','mental'];
  let deathType;
  if(deathContext?.type){
    deathType = HP_TYPES.includes(deathContext.type) ? 'physical' : SAN_TYPES.includes(deathContext.type) ? 'mental' : 'hybrid';
  } else {
    deathType=state.hp<=0?'physical':state.san<=0?'mental':state.day>28?'time':'unknown';
  }
  const deathEntry=mem.filter(m=>m.type==='death').slice(-1)[0];
  const causeEvent=deathEntry?deathEntry.text.replace(/^第 \d+ 天：/,''):(state.day>28?'封印崩溃，时间耗尽。':'你倒在了沃切斯特的黑暗中。');
  const timeline=mem.length>0?mem.slice(-8).map(m=>({day:m.day,type:m.type,text:typeof m==='string'?m:m.text})):[{day:state.day,type:'death',text:'第 '+state.day+' 天：你走到了记录无法继续的地方。'}];
  const keyDiscoveries=(state.clues||[]).slice(-5).map(c=>typeof c==='object'?c.name:c);
  const conclusionsUnlocked=(state.discoveredConclusions||[]);
  const npcEntries=Object.entries(state.npcTrust||{}).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,3);
  const pollutionGained=state.pollution||0;
  const adviceLines=[];
  if(deathType==='physical')adviceLines.push('也许下次该更加小心，或者准备一些治疗物品。');
  else if(deathType==='mental')adviceLines.push('理智比你想的更加脆弱。也许该寻找能帮助你保持清醒的盟友。');
  if(state.day<=3)adviceLines.push('你走得还不够远。试着多和人交谈，获取更多信息。');
  else if(state.day<=7)adviceLines.push('你已经开始触及真相了。保持耐心。');
  else adviceLines.push('你已经走了很远。下一个轮回，你会记得更多。');
  return {deathType,day:state.day,causeEvent,timeline,keyDiscoveries,conclusionsUnlocked,npcTrustHighlights:npcEntries,permanentUnlocks:state.activeBlessings||[],pollutionGained,adviceLine:adviceLines[0]||'雾不会放弃。你也不应该。'};
}

// === SAN破壁事件 (P1-3) ===
function checkBreakWallEvent(state, narr){
  if(state.san>=30)return;
  if(Math.random()>=0.10)return;
  const r=Math.random();
  audioManager.playEffect('wall_break');audioManager.playEffect('safehouse_wall');audioManager.playEffect('bell_wrong');
  if(r<0.33){
    // Effect 1: Fake save message
    narr('system','存档完成。Day '+state.day+' - '+(state.currentArea||'???'),{isSpecial:true});
    setTimeout(()=>{try{narr('system','它在看着你写入这段存档。',{isSpecial:true});}catch(e){}},3000);
    addRunMemory(state,'你听见自己的名字在系统提示之外出现。','break_wall');
  }else if(r<0.66){
    // Effect 2: Fake error
    narr('system','⚠ 检测到不稳定叙事层\n正在修复……\n修复失败\n它已经知道你在读这段文字了',{isSpecial:true});
    addRunMemory(state,'现实出现了裂痕——检测到不稳定叙事层。','break_wall');
  }else{
    // Effect 3: Item description篡改
    const items=state.inventory;
    if(items.length>0){
      const corruptedItem=pick(items);
      const replacements={'怀表':'它在计算你还剩多少时间','急救包':'它不确定你是否值得被救','手电筒':'光在回避你','笔记本和笔':'你写的字在自行修改'};
      const corrupted=replacements[corruptedItem.name]||corruptedItem.name+'……它刚才动了？';
      narr('system','【'+corruptedItem.name+'】……不对。是【'+corrupted+'】',{isSpecial:true});
      addRunMemory(state,corruptedItem.name+'的描述被篡改了。','break_wall');
    }
  }
}

// === Perception Corruption (systems.perception_corruption) ===
function getPerceptionLevels(state){
  const san=state.san||0;
  const loop=state.loopCount||0;
  const corr=(state.safehouseCorruption||0);
  const mythos=state.mythosLevel||0;
  let focus=0,edge=0,audio=0,input=0,text=0;
  if(san<50){focus++;text++;}
  if(mythos>=10){audio++;edge++;}
  if(loop>=3){text++;input++;}
  if(corr>=50){focus++;edge++;audio++;input++;text++;}
  if(['deep_catacombs','ruins_of_yith'].includes(state.currentArea)){focus++;edge++;audio++;input++;text++;}
  return {focus:Math.min(3,focus),edge:Math.min(3,edge),audio:Math.min(4,audio),input:Math.min(4,input),text:Math.min(4,text)};
}

// === Loop Blessings (P0-2) ===
function applyBlessing(state, blessing, narr){
  if(!blessing)return;
  const eff=blessing.effect||{};
  narr('system','【恩赐·'+blessing.name+'】'+blessing.description,{isSpecial:true});
  if(eff.type==='unlock_knowledge'&&eff.knowledge_id){
    if(!state.retainedKnowledge.includes(eff.knowledge_id))state.retainedKnowledge.push(eff.knowledge_id);
  }
  if(eff.type==='npc_trust_bonus'){
    const coreNpcs=(GD.npcs||[]).filter(n=>n.chapter_1_availability==='core');
    if(coreNpcs.length>0){const t=pick(coreNpcs);state.npcTrust[t.name]=(state.npcTrust[t.name]||0)+(eff.amount||1);}
  }
  if(eff.type==='skip_intro'){state.ch1IntroComplete=true;}
  if(blessing.bonus_skill_points){
    const skills=Object.keys(state.skills);
    if(skills.length>0){const sk=pick(skills);state.skills[sk]=(state.skills[sk]||0)+blessing.bonus_skill_points;}
  }
}

// === Trust Gate System (per-NPC) ===
function checkTrustGate(nextTrust, s, npcName) {
  const visited = s.visitedAreas || [];
  const clues = s.clues || [];
  const chains = s.completedChains || [];
  const day = s.day || 1;
  const harborVisits = (s.behaviorTracking?.harbor_visits) || 0;
  const hasChain = (id) => chains.includes(id);
  const hasClue = (id) => hasClueId(clues, id);
  const hasAnyClueFrom = (ids) => ids.some(id => hasClue(id));
  const harborClues = ['clue_1_1', 'clue_1_2', 'clue_1_3'];
  const morrisClues = ['clue_m_1', 'clue_m_2', 'clue_m_3'];
  const heresyClues = ['clue_h_1', 'clue_h_2', 'clue_h_3'];

  // 伊莱亚斯·沃德 — 退休教授，神秘学家
  if (npcName === '伊莱亚斯·沃德') {
    if (nextTrust === 3) {
      if (!visited.includes('lighthouse') && !visited.includes('catacombs_entrance') && clues.length < 1)
        return '你需要先去探索灯塔或墓穴入口，或找到一些线索，他才会愿意深谈。';
      return null;
    }
    if (nextTrust === 4) {
      if (!hasAnyClueFrom([...morrisClues, ...heresyClues]) && day < 5)
        return '他对你还不够了解。试着调查莫里斯家族或教堂的秘密，或者等到第5天。';
      return null;
    }
    if (nextTrust === 5) {
      if (chains.length < 1 && !(s.discoveredConclusions?.length > 0))
        return '他需要看到你真正触及了真相的证据。完成一条线索链或达成一个结论。';
      return null;
    }
  }

  // 玛莎·格雷 — 码头酒吧老板娘
  if (npcName === '玛莎·格雷') {
    if (nextTrust === 3) {
      if (!visited.includes('harbor_district'))
        return '你还没去过码头区。去看看她丈夫曾经工作的地方吧。';
      return null;
    }
    if (nextTrust === 4) {
      if (!hasAnyClueFrom(harborClues) && harborVisits < 2)
        return '你需要在码头区找到更多线索（失踪者名单、潮汐时刻表、酒馆传闻），或者多去几次码头。';
      return null;
    }
    if (nextTrust === 5) {
      if (!hasChain('chain_harbor'))
        return '你还没有解开港口失踪案的真相。完成这条线索链，她才会告诉你最后的秘密。';
      return null;
    }
  }

  // 约书亚·布莱克 — 前海军陆战队员
  if (npcName === '约书亚·布莱克') {
    if (nextTrust === 3) {
      if (!visited.includes('lighthouse') && harborVisits < 2)
        return '他只信任见过灯塔的人。去灯塔看看，或者多去几次码头。';
      return null;
    }
    if (nextTrust === 4) {
      if (!hasAnyClueFrom([...harborClues, 'clue_2_1', 'clue_2_2']) && day < 4)
        return '他需要你带来灯塔或码头的情报。继续调查吧。';
      return null;
    }
    if (nextTrust === 5) {
      if (!hasChain('chain_harbor') && !visited.includes('deep_catacombs'))
        return '他想知道你是否真的见过深渊。完成港口失踪案，或深入地下墓穴。';
      return null;
    }
  }

  // 希尔达·莫里斯 — 莫里斯家族继承人
  if (npcName === '希尔达·莫里斯') {
    if (nextTrust === 3) {
      if (!visited.includes('voxchester_manor'))
        return '你还没有去过沃切斯特庄园。去她的家看看。';
      return null;
    }
    if (nextTrust === 4) {
      if (!hasAnyClueFrom(morrisClues))
        return '你需要在庄园里找到关于莫里斯家族的秘密线索。';
      return null;
    }
    if (nextTrust === 5) {
      if (!hasChain('chain_morris'))
        return '你还没有揭开莫里斯家族诅咒的真相。完成这条线索链。';
      return null;
    }
  }

  // 汤米·陈 — 杂货店老板，业余摄影师
  if (npcName === '汤米·陈') {
    if (nextTrust === 3) {
      if (clues.length < 2)
        return '他对你还不够信任。多收集一些线索再来。';
      return null;
    }
    if (nextTrust === 4) {
      if (visited.length < 3)
        return '他想看看你是不是认真在调查。多探索几个区域。';
      return null;
    }
    if (nextTrust === 5) {
      if (chains.length < 1)
        return '他需要你完成一条线索链，才会把最重要的照片给你看。';
      return null;
    }
  }

  // 伊莎贝拉·韦伯 — 教堂执事，秘密异端研究者
  if (npcName === '伊莎贝拉·韦伯') {
    if (nextTrust === 3) {
      if (!hasClue('clue_h_1') && !hasClue('clue_h_2'))
        return '你还没有注意到教堂的异常。去听听那十三声钟响。';
      return null;
    }
    if (nextTrust === 4) {
      if (!hasAnyClueFrom(heresyClues) && day < 4)
        return '你需要深入调查教堂的秘密。找找异端仪式的线索。';
      return null;
    }
    if (nextTrust === 5) {
      if (!hasChain('chain_heretical'))
        return '你还没有揭开教堂异端仪式的真相。完成这条线索链。';
      return null;
    }
  }

  // 老费舍 — 老渔夫，深潜者混血后裔
  if (npcName === '老费舍') {
    if (nextTrust === 3) {
      if (!visited.includes('harbor_district'))
        return '他只在码头附近活动。去码头区找他。';
      return null;
    }
    if (nextTrust === 4) {
      if (harborVisits < 2 && day < 4)
        return '他需要看到你对码头的执着。多去几次，或者等到第4天。';
      return null;
    }
    if (nextTrust === 5) {
      if (!hasChain('chain_harbor') && !visited.includes('lighthouse'))
        return '他想知道你是否了解海的秘密。完成港口失踪案，或亲眼看看灯塔。';
      return null;
    }
  }

  // 埃德加·洛夫克拉夫特 — 作家
  if (npcName === '埃德加·洛夫克拉夫特') {
    if (nextTrust === 3) {
      if (clues.length < 1)
        return '他是一个作家，需要素材。带一些线索来，他会更愿意交谈。';
      return null;
    }
    if (nextTrust === 4) {
      if (clues.length < 3)
        return '他需要更多故事素材。收集更多线索。';
      return null;
    }
    if (nextTrust === 5) {
      if (chains.length < 1 && !(s.discoveredConclusions?.length > 0))
        return '他需要一个完整的故事。完成一条线索链或达成一个结论。';
      return null;
    }
  }

  return null;
}

// Fear lens: module-level reference for corruption function
let _currentFearTuning = null;

// ═══════════════════════════════════════════════════════════
// P0-3: Critical Clue Progress Guard System
// ═══════════════════════════════════════════════════════════
// Ensures key storyline clues remain reachable even with bad RNG.
// Does NOT hand out final answers — uses intermediate/nudge events.
// Guards are checked before normal random event selection.
//
// Design principles:
// 1. Only triggers when the player is at risk of missing a critical clue
//    before its deadline (chapter boundary or day limit).
// 2. Uses gentle narrative nudges (NPC hints, safehouse anomalies, dreams)
//    rather than direct clue drops.
// 3. Each guard can only fire once per run to avoid repetition.
// 4. Guards reference real event IDs, clue IDs, and chain IDs from the
//    project's game data.
// 5. Easy to extend: add a new entry to CRITICAL_PROGRESS_GUARDS.

const CRITICAL_PROGRESS_GUARDS = [
  {
    id: 'guard_harbor_chain',
    // Harbor chain: chapter 1 deadline day 6
    deadlineDay: 6,
    requiredClues: ['clue_1_1', 'clue_1_2', 'clue_1_3'],
    chainId: 'chain_harbor',
    // Minimum clues needed by deadline day to avoid guard firing
    minCluesNeeded: 1,
    // Fallback: nudge event that introduces a harbor clue opportunity
    // Uses a real area event from the harbor area that adds a clue
    fallbackArea: 'harbor_district',
    fallbackNarrative: '你在码头边徘徊，注意到一张被海浪冲上岸的纸片。上面的字迹已经被海水模糊，但你依稀能辨认出几个数字和一个名字。',
    fallbackClueHint: 'clue_1_1',
    guardFlag: 'guard_harbor_chain_fired'
  },
  {
    id: 'guard_lighthouse_signal',
    // Lighthouse clues: chapter 2 area, deadline day 10
    deadlineDay: 10,
    requiredClues: ['clue_2_1', 'clue_2_2'],
    chainId: 'chain_lighthouse',
    minCluesNeeded: 1,
    fallbackArea: 'lighthouse',
    fallbackNarrative: '你安全屋的窗户突然发出一阵震动。远处灯塔的光在浓雾中划出一道异常的轨迹——三短、三长、三短。你把这个图案记了下来。',
    fallbackClueHint: 'clue_2_1',
    guardFlag: 'guard_lighthouse_signal_fired'
  },
  {
    id: 'guard_morris_chain',
    // Morris family chain: deadline day 8
    deadlineDay: 8,
    requiredClues: ['clue_m_1', 'clue_m_2', 'clue_m_3'],
    chainId: 'chain_morris',
    minCluesNeeded: 1,
    fallbackArea: 'voxchester_manor',
    fallbackNarrative: '你翻阅旧笔记时，一张泛黄的便签从笔记本里滑落。上面是莫里斯家族的族谱碎片——至少给你指了一个方向。',
    fallbackClueHint: 'clue_m_1',
    guardFlag: 'guard_morris_chain_fired'
  },
  {
    id: 'guard_heretical_chain',
    // Church heresy chain: deadline day 7
    deadlineDay: 7,
    requiredClues: ['clue_h_1', 'clue_h_2', 'clue_h_3'],
    chainId: 'chain_heretical',
    minCluesNeeded: 1,
    fallbackArea: 'town_center',
    fallbackNarrative: '教堂的钟声在凌晨三点响起。不是十三声——只有三声。你记下了钟声的节奏，它似乎在传达某种信息。',
    fallbackClueHint: 'clue_h_1',
    guardFlag: 'guard_heretical_chain_fired'
  }
];

/**
 * P0-3: Check if a critical progress guard should fire.
 * Called before normal event selection in EXPLORE.
 *
 * Returns a guard object if one should fire, or null.
 * Only considers guards that haven't already fired this run.
 *
 * @param {object} state - game state
 * @param {object} ctx - context with GD
 * @returns {object|null} guard entry to fire, or null
 */
function getForcedProgressGuard(state, ctx) {
  const day = state.day || 1;
  const clues = state.clues || [];
  const triggered = state.triggeredEvents || [];

  for (const guard of CRITICAL_PROGRESS_GUARDS) {
    // Skip if already fired this run
    if (triggered.includes(guard.guardFlag)) continue;

    // Skip if past deadline (guard no longer needed)
    if (day > guard.deadlineDay) continue;

    // Skip if chain already completed
    if ((state.completedChains || []).includes(guard.chainId)) continue;

    // Count how many of the required clues the player has
    const foundCount = guard.requiredClues.filter(c => hasClueId(clues, c)).length;

    // If player already has enough clues, skip
    if (foundCount >= guard.minCluesNeeded) continue;

    // Check urgency: closer to deadline = higher chance
    // Only fire if within 2 days of deadline and still missing clues
    const daysUntilDeadline = guard.deadlineDay - day;
    if (daysUntilDeadline > 2) continue;

    // Probability scales: 2 days out = 30%, 1 day out = 60%, deadline day = 90%
    const fireProbability = daysUntilDeadline <= 0 ? 0.9 : daysUntilDeadline === 1 ? 0.6 : 0.3;
    if (Math.random() >= fireProbability) continue;

    return guard;
  }

  return null;
}

/**
 * P0-3: Execute a forced progress guard.
 * Produces a gentle narrative nudge and marks the guard as fired.
 * Does NOT directly give the clue — it nudges the player toward the right area/event.
 *
 * @param {object} guard - guard entry from CRITICAL_PROGRESS_GUARDS
 * @param {object} state - game state (will be mutated)
 * @param {function} narr - narrative function
 */
function executeForcedProgressGuard(guard, state, narr) {
  // Mark guard as fired so it doesn't repeat
  if (!state.triggeredEvents.includes(guard.guardFlag)) {
    state.triggeredEvents.push(guard.guardFlag);
  }

  // Add narrative nudge
  narr('system', guard.fallbackNarrative, { isSpecial: true });

  // Give a small nudge: add the first missing clue from the required set as a hint
  // This is not the full chain — just enough to get started
  const missingClues = guard.requiredClues.filter(c => !hasClueId(state.clues, c));
  if (missingClues.length > 0) {
    // Only give the hint clue (first missing), not all of them
    const hintClue = guard.fallbackClueHint || missingClues[0];
    if (!hasClueId(state.clues, hintClue)) {
      state.clues.push(hintClue);
      narr('system', '（你将这条信息记录在了笔记本上。）', { isSpecial: true });
    }
  }

  // Small cost: SAN -1 to maintain game tension
  state.san = Math.max(0, (state.san || 0) - 1);
  narr('system', 'SAN -1', { isEffect: true });
}

// === REDUCER ===
// Lazy-clone pattern: arrays/objects are only cloned when a given action actually mutates them.
// Helper functions (checkSilentEvent, addRunMemory, checkChainCompletion, etc.) receive `s`
// and may push into its arrays, so we ensure those arrays are cloned before calling them.
function gameReducer(state,action){
  // Update module-level fear tuning for corruption functions
  _currentFearTuning = state.fearTuning || null;
  // Shallow copy of state; arrays stay as references until explicitly cloned
  let s={...state};
  let _cloned={};
  const ensureArr=(k)=>{if(!_cloned[k]){s[k]=[...(state[k]||[])];_cloned[k]=true;}};
  const ensureObj=(k)=>{if(!_cloned[k]){s[k]={...(state[k]||{})};_cloned[k]=true;}};
  // narrative and eventLog have their own flags for the narr/log helpers
  let _narrCloned=false,_evtLogCloned=false,_invCloned=false;
  const cloneNarr=()=>{if(!_narrCloned){s.narrative=[...(state.narrative||[])];_narrCloned=true;}};
  const cloneEvtLog=()=>{if(!_evtLogCloned){s.eventLog=[...(state.eventLog||[])];_evtLogCloned=true;}};
  const cloneInv=()=>{if(!_invCloned){s.inventory=state.inventory.map(i=>({...i}));_invCloned=true;}};
  // Ensure all arrays that helper functions may push into are cloned upfront.
  // This is the safe baseline — the savings come from skipping arrays that NO action touches.
  const ensureMutableArrays=()=>{
    ['triggeredEvents','triggeredSilentEvents','longTermEffects','clues',
     'completedChains','objectives','retainedKnowledge','runMemory',
     'visitedAreas','discoveredConclusions','activeBlessings'
    ].forEach(ensureArr);
    ['npcTrust','npcStates','stats','skills','lastVisitedDates','stats_run','behaviorTracking'].forEach(ensureObj);
    // 数组截断保护：防止无限增长
    if(s.triggeredEvents.length>1000)s.triggeredEvents=s.triggeredEvents.slice(-1000);
  };
  const bt=s.behaviorTracking;
  const _narrCorrLayer=getUICorruptionLayer(s.san,s.loopCount,s.safehouseCorruption);
  const MAX_NARRATIVE_ENTRIES=250;
  const narr=(type,text,extra={})=>{
    cloneNarr();
    const entry={id:Date.now()+Math.random(),type,text,...extra};
    // getCorruptedSystemText: only for system/event text, skip special/recovery/madness
    if(_narrCorrLayer>0&&(type==='system'||type==='event')&&!extra.isSpecial&&!extra.isEffect&&!extra.madness){
      const corrupted=getCorruptedSystemText(text,_narrCorrLayer);
      if(corrupted!==text){entry._originalText=text;entry.text=corrupted;}
    }
    s.narrative.push(entry);
    // P0-5: Cap narrative array to prevent unbounded growth in long sessions
    if(s.narrative.length>MAX_NARRATIVE_ENTRIES){
      s.narrative=s.narrative.slice(-MAX_NARRATIVE_ENTRIES);
    }
  };
  const log=(text)=>{cloneEvtLog();s.eventLog.push({day:s.day,text});};
  // Daily action tracking for behavior endings
  const trackableTypes=['MOVE','EXPLORE','TALK_NPC','USE_ITEM','SWITCH_SAFEHOUSE','REST','GAMBLE_CHOICE','DO_SKILL_CHECK','NPC_RESPONSE','WORK','PREACH','ATTACK','BUY_FOOD'];
  if(trackableTypes.includes(action.type)&&action.type!=='REST'){
    if(!s._dayActions)s._dayActions=[];
    s._dayActions.push(action.type==='NPC_RESPONSE'?action.choice||'talk':action.type);
  }
  // Track food hoarding
  if((s.food||0)>(bt.hoarded_food_max||0))bt.hoarded_food_max=s.food;
  // Track money hoarding
  if((s.money||0)>(bt.hoarded_money_max||0))bt.hoarded_money_max=s.money;

  switch(action.type){
  case 'START_GAME':s.screen='prologue';s.prologue=initPrologueState();s.fearTuning=null;s.skills=initSkills();return s;
  case 'SET_DIFFICULTY':s.difficulty=action.difficulty;return s;
  case 'SET_ARCHETYPE':s.archetype=action.archetypeId;return s;
  case 'ROLL_STATS':{
    const d=(GD.systems?.player?.default_template||GD.module5_player?.default_template||{}).base_stats||{};
    const st={};
    Object.entries(d).forEach(([k,v])=>{st[k]=typeof v==='object'?rollDice(v.dice)*(v.multiplier??5):50;});
    // Apply archetype stat modifiers (P1-1)
    const archDef=(GD.systems?.player?.archetypes||[]).find(a=>a.id===s.archetype);
    if(archDef?.stat_modifiers){Object.entries(archDef.stat_modifiers).forEach(([k,v])=>{st[k]=(st[k]||50)+v;});}
    s.stats=st;s.maxHp=Math.floor((st.CON+st.SIZ)/10);s.hp=s.maxHp;
    s.san=st.POW;s.maxSan=99;s.luck=rollDice('3d6')*5;s.mp=Math.floor(st.POW/5);
    // Occultist SAN penalty
    if(archDef?.starting_san_penalty){s.san=Math.max(1,s.san-archDef.starting_san_penalty);s.maxSan=Math.floor(s.maxSan*0.7);}
    s.skills={...initSkills()};s.skills['闪避']=Math.floor(st.DEX/2);s.skills['意志']=Math.floor(st.POW/2);
    // Apply archetype skill bonuses (P1-1)
    if(archDef?.skill_bonuses){Object.entries(archDef.skill_bonuses).forEach(([k,v])=>{s.skills[k]=(s.skills[k]||0)+v;});}
    return s;
  }
  case 'BEGIN_ADVENTURE':{
    s.screen='game';ensureMutableArrays();
    s.objectives=genObjectives(1,ctx);
    audioManager.playEffect('begin');audioManager.playAreaAmbient(s.currentArea||'town_center','morning');
    s.currentChapter=getChapterForDay(s.day,ctx).key||'chapter_1';
    // Apply archetype NPC trust mods (P1-1)
    const archDef2=(GD.systems?.player?.archetypes||[]).find(a=>a.id===s.archetype);
    if(archDef2?.npc_trust_mod){Object.entries(archDef2.npc_trust_mod).forEach(([npc,v])=>{s.npcTrust[npc]=(s.npcTrust[npc]||0)+v;});}
    if(s.loopCount>0){
      audioManager.playEffect('loop_restart');audioManager.playEffect('loop_memory');audioManager.playEffect('bell_memory');
      const drt=GD.implementation_notes?.death_restart_text?.death_types;
      const restartTexts=s.lastDeathType==='mental'?drt?.mental_death?.restart_text:drt?.physical_death?.restart_text;
      const loopKey=s.loopCount>=5?'loop_5_plus':s.loopCount>=3&&s.lastDeathType==='mental'?'loop_3_plus':'loop_'+s.loopCount;
      const restartText=restartTexts?.[loopKey];
      if(restartText){
        narr('system',restartText,{locationName:'轮回·第'+s.loopCount+'次'});
      }else{
        narr('system','你再次睁开眼。浓雾、鹅卵石、紧闭的窗帘——一切都似曾相识。',{locationName:'轮回·第'+s.loopCount+'次'});
      }
      if(s.pollution>0){
        narr('system','世界似乎比你记忆中的更加……不对劲。污染指数：'+Math.round(s.pollution*100)+'%');
      }
      // Apply loop blessings
      const bKey2=s.loopCount<=5?'loop_'+s.loopCount:'loop_6_plus';
      const curBlessing=GD.systems?.loop?.loop_blessings?.[bKey2];
      if(curBlessing)applyBlessing(s,curBlessing,narr);
    }
    CH1_INTRO.forEach(block=>narr(block.type,block.text,{locationName:block.locationName}));
    // P2: Day 1 unskippable opening cut — "那一刀"
    if(!s.triggeredEvents.includes('evt_day1_opening_cut')){
      s.triggeredEvents.push('evt_day1_opening_cut');
      const cutText='公告栏最下面有一张新的失踪告示。\n纸面干燥，边缘还没有卷起。\n\n照片里的人低着头，外套领口沾着海盐。\n\n你认出那件外套。\n\n你低头看了一眼自己。\n同一颗纽扣，缺了一半。\n\n告示下方写着：\n失踪时间：今天傍晚。';
      narr('event',cutText,{eventTitle:'第一张告示',eventType:'opening_cut',isSpecial:true,imageSrc:getAreaSceneImage(s.currentArea,s),imageAlt:'第一张告示'});
      if(!hasClueId(s.clues,'clue_missing_notice_self'))s.clues.push({id:'clue_missing_notice_self',name:'你的失踪告示'});
      addRunMemory(s,'你在公告栏上看见了自己的失踪告示。','opening_cut');
    }
    s.ch1IntroComplete=true;
    addRunMemory(s,s.loopCount>0?'再次踏入沃切斯特':'初次踏入沃切斯特','loop');
    log(s.loopCount>0?'第'+s.loopCount+'次轮回开始':'冒险开始');
    return s;
  }
  case 'MOVE':{ensureMutableArrays();
    if(s.ap<1){narr('system','行动点不足。');return s;}
    const target=action.areaId;
    const cur=getAreaInfo(s.currentArea,ctx);
    if(!cur||!cur.connected_areas.includes(target)){narr('system','无法到达该区域。');return s;}
    const targetArea=getAreaInfo(target,ctx);
    if(!targetArea){narr('system','未知区域。');return s;}
    if(!isAreaUnlocked(targetArea,s)){narr('system','你还没有找到通往'+targetArea.name+'的路径。也许需要更多线索。');return s;}
    s.ap-=action.cost||1;s.currentArea=target;
    if(!s.visitedAreas.includes(target))s.visitedAreas.push(target);
    if(target==='harbor_district'){bt.harbor_visits=(bt.harbor_visits||0)+1;audioManager.playEffect('harbor_water_omen');}
    if(target==='lighthouse')audioManager.playEffect('lighthouse_lens_crack');
    if(target==='catacombs_entrance'||target==='deep_catacombs')audioManager.playEffect('catacombs_stone');
    if(targetArea.danger_level>(s.stats_run.deepest_area_danger||0))s.stats_run.deepest_area_danger=targetArea.danger_level;
    if(!s.lastVisitedDates)s.lastVisitedDates={};
    s.lastVisitedDates={...s.lastVisitedDates,[target]:s.day};
    const displayName=getAreaDisplayName(targetArea,s);
    narr('system','你前往了'+displayName+'。');
    // Light level affects text corruption (P2-1)
    const lightCorrPenalty=(s.lightLevel||0)<(targetArea?.resource_pressure?.required_light_level||0)?2:1;
    let desc=getSanTextVariant(targetArea.description,s.san,pick,ctx);
    if(lightCorrPenalty>1&&Math.random()<0.3)desc+='\n\n光线不足。你不确定自己看到的是不是真的。';
    narr('location',desc,{locationName:displayName,imageSrc:getAreaSceneImage(target,s),imageAlt:displayName});
    // Switch ambient to match new area
    try{const phase=getPhase(s.ap,s.maxAp);audioManager.playAreaAmbient(target,phase);}catch(e){}
    if(targetArea.micro_events&&targetArea.micro_events.length>0&&Math.random()<0.35){
      const me=pick(targetArea.micro_events);
      const meText=getSanTextVariant(me.description,s.san,pick,ctx);
      narr('system',meText,{type:'微事件'});
      if(me.effect)Object.entries(me.effect).forEach(([k,v])=>{
        if(k==='SAN')s.san=clamp(s.san+v,0,s.maxSan);
        if(k==='HP')s.hp=clamp(s.hp+v,0,s.maxHp);
      });
    }
    // Silent events: 15% chance on move
    if(Math.random()<0.15)checkSilentEvent(s,narr,target);
    // SAN scene variants: location-based flavor text
    const sceneKeyMap={'harbor_district':'harbor_water','voxchester_manor':'hilda_portrait','catacombs_entrance':'catacombs_entrance_text'};
    const sceneKey=sceneKeyMap[target];
    if(sceneKey&&s.san<70&&Math.random()<0.2){
      const sceneText=getSanSceneVariant(sceneKey,s.san,ctx);
      if(sceneText)narr('system',sceneText);
    }
    s.objectives=checkObjCompletion(s.objectives,s);
    s.transition='move';
    log('前往'+displayName);if(!s.tutorialSeen.first_move)s.tutorialSeen={...s.tutorialSeen,first_move:true};return s;
  }
  case 'EXPLORE':{ensureMutableArrays();cloneInv();
    if(s.ap<2){narr('system','行动点不足（需要2AP）。');return s;}
    s.ap-=2;
    // P0-3: Critical clue progress guard — check before normal event selection
    const _guard=getForcedProgressGuard(s,ctx);
    if(_guard){
      executeForcedProgressGuard(_guard,s,narr);
      // Guard provides a clue hint but doesn't consume the explore — let normal event also fire
    }
    // P0-1: Use pure functions for candidate filtering to avoid state pollution.
    // Only the final selected event calls commitSelectedEvent.
    let evt;
    let _alreadyCommitted=false;
    if(GD._extendedEventsLoaded){
      // Get eligible candidates (pure, no state mutation)
      const candidates=getEligibleEvents(s.currentArea,s,ctx);
      if(candidates.length>0){
        if(s.fearTuning&&s.fearTuning.primary){
          // Fear lens: score each candidate, choose by fear-adjusted weight
          const fearScored=candidates.map(c=>({
            evt:c,
            weight:getEventWeight(c,s.currentArea,s,ctx)*getFearEventWeightModifier(c,s)
          })).filter(x=>x.weight>0);
          if(fearScored.length>0){
            // Weighted random from fear-scored pool
            const totalW=fearScored.reduce((a,b)=>a+b.weight,0);
            let roll=Math.random()*totalW;
            for(const item of fearScored){
              roll-=item.weight;
              if(roll<=0){evt=item.evt;break;}
            }
            if(!evt)evt=fearScored[fearScored.length-1].evt;
          }
        }
        if(!evt){
          // Standard weighted random (pure, no state mutation)
          evt=chooseWeightedEvent(candidates,s.currentArea,s,ctx,pick);
        }
      }
      // Special event checks (omen/600) that bypass normal pool
      if(!evt){
        const allEvts=GD.events||[];
        const omen=checkOmens(state);
        if(omen){
          evt=omen;commitSelectedEvent(omen,s);_alreadyCommitted=true;
        }else{
          const extEvts=GD._extendedEvents||(allEvts.length>(GD._deathEchoCount||0)?allEvts.slice(0,allEvts.length-(GD._deathEchoCount||0)):allEvts);
          if(shouldTriggerMissing600(s,extEvts)&&Math.random()<0.35){
            evt=createMissing600Event(s);commitSelectedEvent(evt,s);_alreadyCommitted=true;
          }
        }
      }
      // Commit the final event (only if not already committed by special checks)
      if(evt&&!_alreadyCommitted){
        commitSelectedEvent(evt,s);
      }
    }else{
      evt=selectEvent(s.currentArea,s,ctx,pick);
    }
    if(!evt){
      narr('system','四周平静，暂时没有发现异常。');
      const chains=GD.event_chains||GD.module4_event_extensions?.event_chains||[];
      for(const ch of chains){
        for(const eid of ch.sequence){
          const fe=GD.events?.find(e=>e.id===eid)||GD.module4_events?.find(e=>e.id===eid);
          if(fe&&!s.triggeredEvents.includes(eid)&&checkTrigger(fe,s)){
            narr('system','【保底推进】你注意到一些之前忽略的细节。',{isSpecial:true});
            s.triggeredEvents.push(eid);
            narr('event',fe.description,{eventTitle:fe.name,eventType:fe.type||fe.event_classification,imageSrc:getEventImage(fe.id)||getAreaSceneImage(s.currentArea,s),imageAlt:fe.name});
            return s;
          }
        }
      }
      return s;
    }
    s.triggeredEvents.push(evt.id);
    let evtText=getPollutionText(getSanTextVariant(evt.description,s.san,pick,ctx),s.pollution||0);
    // Fear lens: append fear-related flavor text
    if(s.fearTuning&&s.fearTuning.primary)evtText=applyFearLens(evt,evtText,s);
    narr('event',evtText,{eventTitle:evt.name,eventType:evt.type||evt.event_classification,imageSrc:getEventImage(evt.id)||getAreaSceneImage(s.currentArea,s),imageAlt:evt.name,_ugcAuthor:evt._ugcAuthor||null});
    // Event choices: if event has non-empty choices, present them and wait
    if(evt.choices&&evt.choices.length>0){
      applyLegacyEffects(s,evt.effects);
      s.pendingChoice={evt,choices:evt.choices};
      return s;
    }
    // SAN赌博机制：25%概率触发选择
    const gambleOpts=getGambleOptions(evt,s,ctx);
    if(gambleOpts){
      s.pendingGamble={evt,options:gambleOpts,apSpent:2};
      narr('system','你感到某种冲动——是就此收手，还是更深入地探究？',{isSpecial:true});
      return s;
    }
    const anchorResult=processNormalAnchorEvent(evt,s);
    if(anchorResult.sanGain>0){
      s.san=clamp(s.san+anchorResult.sanGain,0,s.maxSan);
      narr('san-recovery',anchorResult.text);
    }else if(anchorResult.text){
      narr('system',anchorResult.text,{isSpecial:true});
    }
    let sanDmg=Math.abs(evt.sanity_damage||0);
    if(sanDmg>0){
      const isChapter1=s.day<=7;
      const isMidnight=getPhase(s.ap,s.maxAp)==='midnight';
      const ch1Cap=Math.abs(GD.systems?.sanity?.san_loss_scale?.chapter_1_cap||5);
      if(isChapter1&&sanDmg>ch1Cap&&!isMidnight){
        sanDmg=ch1Cap;narr('system','（你的直觉告诉你现在不应该深入探究。也许深夜再来会不同。）');
      }
      sanDmg=processSanLoss(sanDmg,s.inventory.map(i=>i.name),s.weather,s.day,s.difficulty,ctx);
      if(sanDmg>0){
        if(evt.skill_check){
          audioManager.playSkillEffect('roll');
          const check=doSkillCheck(evt.skill_check.skill,evt.skill_check.threshold||50,s,s.difficulty,ctx);
          if(check.success){
            audioManager.playSkillEffect('success');
            sanDmg=Math.max(1,Math.round(sanDmg*0.5));
            narr('system','【技能检定：'+check.skillName+'】掷骰 '+check.roll+' / 技能'+check.playerSkill+' —— 成功！SAN损失减半。');
            s.stats_run.checks_passed++;
          }else{
            audioManager.playSkillEffect(check.isCritFail?'critical_fail':'fail');
            narr('system','【技能检定：'+check.skillName+'】掷骰 '+check.roll+' / 技能'+check.playerSkill+' —— 失败！');
            s.stats_run.checks_failed++;
          }
        }
        s.san=clamp(s.san-sanDmg,0,s.maxSan);
        narr('system','SAN -'+sanDmg,{isEffect:true});
        if(sanDmg>=3)s.transition='san-loss';
        // Achievement tracking
        s.stats_run.max_san_loss_single=Math.max(s.stats_run.max_san_loss_single||0,sanDmg);
        s.stats_run.total_san_loss=(s.stats_run.total_san_loss||0)+sanDmg;
        if(sanDmg>=1){addRunMemory(s,'在'+(s.currentArea||'某处')+'遭遇了什么——SAN -'+sanDmg,'san_loss');audioManager.playSanLoss(sanDmg);}
      }
    }
    applyLegacyEffects(s, evt.effects);
    if(sanDmg>=5){
      const mad=rollMadness(ctx);s.madnessActive=mad;
      try{incrementStat('madness_count');}catch(e){}
      narr('madness','【临时疯狂：'+mad.name+'】'+mad.description,{madness:mad});
      addRunMemory(s,'经历了临时疯狂——'+mad.name,'madness');
      audioManager.playEffect('madness');audioManager.playEffect('madness_loop');
    }
    // --- Death resolution (unified) ---
    {
      const deathCtx = resolveDeath(s, evt, null);
      if(deathCtx){
        s.deathContext = deathCtx;
        s.lastDeathType = deathCtx.type;
        s.lastDeathMode = deathCtx.mode;
        // Play death sound based on type
        const HP_TYPES=['drowning','bleeding','infection','starvation','falling','darkness_taken','physical'];
        const SAN_TYPES=['madness','possession','identity_erasure','mythos_absorption','loop_collapse','becomes_event','mental'];
        if(HP_TYPES.includes(deathCtx.type))audioManager.playEffect('death_physical');
        else if(SAN_TYPES.includes(deathCtx.type))audioManager.playEffect('death_mental');
        else audioManager.playEffect('death_hybrid');
        // Write death narrative
        narr('death', deathCtx.finalText, { isSpecial: true });
        // Build ending object
        if(deathCtx.mode === 'hp'){
          const failPhys=GD.implementation_notes?.failure_states?.failure_types?.physical_death;
          s.ending={name:failPhys?.name||deathCtx.type,type:'bad',description:deathCtx.finalText,recap:buildDeathRecap(s,deathCtx)};
        }else if(deathCtx.mode === 'san'){
          const ending=checkEnding(s,ctx);
          if(ending){s.ending={...ending,recap:buildDeathRecap(s,deathCtx)};}else{
            const failMental=GD.implementation_notes?.failure_states?.failure_types?.mental_death;
            s.ending={name:failMental?.name||deathCtx.type,type:'bad',description:deathCtx.finalText,permanent_pollution:failMental?.permanent_pollution||0,recap:buildDeathRecap(s,deathCtx)};
          }
        }else{
          // hybrid
          s.ending={name:'身心俱灭',type:'bad',description:deathCtx.finalText,recap:buildDeathRecap(s,deathCtx)};
        }
        addRunMemory(s, deathCtx.finalText.split('\n')[0], 'death');
        if(!s.tutorialSeen.first_death)s.tutorialSeen={...s.tutorialSeen,first_death:true};
      }
    }
    s.objectives=checkObjCompletion(s.objectives,s);
    // Event chain progress: check if triggered event advances a chain
    const chains=GD.event_chains||[];
    for(const ch of chains){
      const seq=ch.sequence||[];
      const idx=seq.indexOf(evt.id);
      if(idx>=0){
        const progress=seq.filter(eid=>s.triggeredEvents.includes(eid)).length;
        if(idx<seq.length-1){
          narr('system','【事件链：'+ch.name+'】进度 '+progress+'/'+seq.length,{isSpecial:true});
        }
      }
    }
    checkChainCompletion(s,narr);
    checkWrongInference(s,narr);
    // Conclusion checking (clue_conclusion system)
    const newConclusions=checkConclusions(s,ctx);
    for(const conc of newConclusions){
      s.discoveredConclusions.push(conc.id);
      narr('system','【结论达成】'+conc.name,{isSpecial:true});
      audioManager.playEffect('clue_found');
      conc.evidence.forEach(e=>narr('system','  · '+e));
      // Add unlocks as clues
      conc.unlocks.forEach(u=>{if(!hasClueId(s.clues,u)){const _rn=resolveClueName(u);s.clues.push(_rn&&_rn!==u?{id:u,name:_rn}:u);}});
    }
    // False interpretation warnings
    const falseInts=checkFalseInterpretations(s,ctx);
    for(const fi of falseInts){
      narr('system','【注意】你隐约觉得"'+fi.interpretation+'"这个想法不太对劲。'+(fi.consequence||''),{isSpecial:true});
    }
    // Monster manifestation flavor (10% chance on explore)
    if(Math.random()<0.1){
      const creature=pick(['deep_ones','night_gaunts','shoggoth']);
      const manifest=getMonsterManifestation(creature,s.day,ctx);
      if(manifest){
        const stageNames={absence:'异常',trace:'痕迹',influence:'影响',partial_presence:'阴影',full_presence:'出现'};
        narr('system','【'+(stageNames[manifest.stage]||'异常')+'】'+manifest.manifestation);
      }
    }
    // Event-related tracking for behavior endings
    if(evt.tags){
      if(evt.tags.includes('fusion')){bt.fusion_accepted_count=(bt.fusion_accepted_count||0)+1;bt.fusion_and_self_harm_total=(bt.fusion_and_self_harm_total||0)+1;}
      if(evt.tags.includes('possession'))bt.possession_accepted_count=(bt.possession_accepted_count||0)+1;
      if(evt.tags.includes('bell')||evt.tags.includes('thirteenth'))bt.thirteenth_bell_obsession=(bt.thirteenth_bell_obsession||0)+1;
      if(evt.tags.includes('meta')||evt.tags.includes('loop'))bt.meta_boundary_breaks=(bt.meta_boundary_breaks||0)+1;
      if(evt.tags.includes('sea')||evt.tags.includes('tide')||evt.tags.includes('harbor_deep'))bt.sea_acceptance_flags=(bt.sea_acceptance_flags||0)+1;
    }
    if(evt.event_classification==='超自然遭遇'||evt.event_classification==='怪物遭遇')bt.meta_boundary_breaks=(bt.meta_boundary_breaks||0)+1;
    log('探索：'+evt.name);if(!s.tutorialSeen.first_explore)s.tutorialSeen={...s.tutorialSeen,first_explore:true};return s;
  }
  case 'DO_SKILL_CHECK':{
    if(!s.pendingEvent||s.pendingEvent.rolled)return s;
    const evt=s.pendingEvent;const sc=evt.effects?.skill_check;
    if(!sc){s.pendingEvent={...evt,rolled:true,result:'no_check'};return s;}
    audioManager.playSkillEffect('roll');
    const result=doSkillCheck(sc.skill,sc.threshold||50,s,s.difficulty,ctx);
    s.pendingEvent={...evt,rolled:true,result:result.success?'success':'failure',roll:result.roll,playerSkill:result.playerSkill,threshold:result.threshold};
    if(result.success){
      audioManager.playSkillEffect('success');
      s.stats_run.checks_passed++;
      narr('system','【技能检定：'+result.skillName+'】掷骰 '+result.roll+' / 技能'+result.playerSkill+' / 难度'+result.threshold+' —— 成功！');
      narr('system',sc.success?.text||sc.success||'检定成功。');
      if(Math.random()<0.1)s.skills[result.skillName]=(s.skills[result.skillName]||0)+rand(1,3);
    }else{
      audioManager.playSkillEffect(result.isCritFail?'critical_fail':'fail');
      s.stats_run.checks_failed++;
      narr('system','【技能检定：'+result.skillName+'】掷骰 '+result.roll+' / 技能'+result.playerSkill+' / 难度'+result.threshold+' —— 失败！'+(result.isCritFail?'（大失败！）':''));
      narr('system',sc.failure?.text||sc.failure||'检定失败。');
    }
    return s;
  }
  case 'TALK_NPC':{
    if(s.ap<1){narr('system','行动点不足。');return s;}
    s.ap-=1;
    try{incrementStat('run_npc_talks');}catch(e){}ensureMutableArrays();const npc=action.npc;const trust=s.npcTrust[npc.name]||0;const ns=s.npcStates[npc.name]||{};
    const layer=npc.trust_layers?npc.trust_layers.find(l=>l.level===trust)||npc.trust_layers[0]:null;
    s.pendingNpc={npc,trust,layer};
    // Loop text variants: NPC dialogue changes with loop count
    if(s.loopCount>0){
      const npcVariantMap={'玛莎·格雷':'martha_grey','老费舍':'old_fisher','希尔达·莫里斯':'hilda_morris','伊莎贝拉·韦伯':'isabella_weber','约书亚·布莱克':'joshua_black','伊莱亚斯·沃德':'elias_ward'};
      const variantKey=npcVariantMap[npc.name];
      const variants=variantKey?GD.implementation_notes?.loop_text_variants?.npc_variants?.[variantKey]:null;
      if(variants){
        const loopKey=s.loopCount>=5?'loop_5_plus':'loop_'+s.loopCount;
        const variantText=variants[loopKey];
        if(variantText)narr('system',variantText);
      }
    }
    if(ns.corrupted){
      const corrLoss=processSanLoss(2,s.inventory.map(i=>i.name),s.weather,s.day,s.difficulty,ctx);
      if(corrLoss>0){s.san=clamp(s.san-corrLoss,0,s.maxSan);narr('system',npc.name+'的状态不对劲。SAN -'+corrLoss);}
      if(trust>=3)modHumanity(s,-5,'明知'+npc.name+'已被腐蚀仍继续利用');
    }else{
      const sanRec=GD.npcs?.find(n=>n.name===npc.name)?.san_recovery_effect;
      if(sanRec&&sanRec.normal_chat){
        if(sanRec.normal_chat.includes('SAN+1')){s.san=clamp(s.san+1,0,s.maxSan);narr('san-recovery',sanRec.description||('与'+npc.name+'交谈让你感到安慰。SAN +1'));}
        else{narr('system',sanRec.description||sanRec.normal_chat);}
      }else if(trust<3){
        const rec=d3()-1;if(rec>0){s.san=clamp(s.san+rec,0,s.maxSan);narr('san-recovery','与'+npc.name+'交谈让你感到些许安慰。SAN +'+rec);}
      }
    }
    // NPC fear line: subtle observation based on prologue fear profile
    if(s.fearTuning&&s.fearTuning.primary){
      const fearLine=getFearNpcLine(npc.name,s);
      if(fearLine)narr('system',npc.name+'突然说："'+fearLine+'"');
    }
    // NPC 记忆渐进深化系统（替代旧版 flat 25% 概率）
    // 4 个记忆层级，概率递增，台词递深，Loop 10 触发行为变化
    if(s.loopCount>=3){
      const loop=s.loopCount;
      // 每个 NPC 在不同循环深度的个性化台词
      const NPC_MEMORY_LINES={
        '玛莎·格雷':{
          t1:['又来了……我是说，欢迎光临。','你上次来过。对吧？','你看起来很面熟。'],
          t2:['你这次又住几天？','别点啤酒了。你上次没喝完。','你是不是……每个月都来一次？'],
          t3:['这是第四次了。我不再问你了。','你要的房间一直空着。我没有给别人。','有些客人会回来。你是最执着的一个。'],
          t4:['（她没有说话，只是把一杯没动过的酒推到你面前。）','（她看了你一眼，然后把你上次坐的椅子拉了出来。）']
        },
        '老费舍':{
          t1:['你……又来了？','我好像在哪见过你。不是在岸上。','海会记住所有回来的人。'],
          t2:['你身上的盐味更重了。','你比上次看起来更像一个水手了。','又是你。鱼都不惊讶了。'],
          t3:['我不数了。反正你还会回来。','你是不是已经知道海底有什么了？','每次你来，潮汐都退得更早一些。'],
          t4:['（他把你带到了码头尽头，指着水面。水面上映着你很多个倒影。）','（他把一个贝壳递给你。贝壳里传来你的声音——上一次的你。）']
        },
        '希尔达·莫里斯':{
          t1:['你看起来……像是来过这个庄园。','走廊里的画像今天换了表情。你注意到了吗？','我们以前见过？你的步伐很熟悉。'],
          t2:['你认识去书房的路。不用我带了。','你上次走的时候，有一扇窗户自己关上了。','你是不是知道地下室的秘密？你的眼神说你知道。'],
          t3:['你是我见过的最执着的访客。或者说，最执着的回来者。','我把族谱放在了你知道的地方。不用谢。','你是唯一一个看过诅咒之后还回来的人。'],
          t4:['（她站在门口等你。好像她一直知道你会在这个时间出现。）','（桌上已经放好了茶。两杯。你还没有敲门。）']
        },
        '伊莎贝拉·韦伯':{
          t1:['你的眼神让我想起了一个梦。','教堂的蜡烛今天自己亮了。有人要来。','你……你不是第一次来这里。'],
          t2:['你已经听过十三声钟响了。你还在。','你比大多数人都更接近真相。也更接近危险。','你上次问我的问题，我在你走之后想了很久。'],
          t3:['我不再劝你离开了。因为我知道你不会听。','你每次来，圣坛上的十字架都会转一个角度。','你是被选中的。不是被神选中的——是被这个地方。'],
          t4:['（她跪在圣坛前。你进来的时候，她没有抬头。她说："我知道你来了。坐下吧。"）','（她翻开了一本你从未见过的书。书的第一页写着你的名字。）']
        },
        '约书亚·布莱克':{
          t1:['你……你看起来像是见过战场。或者见过比战场更糟的东西。','我在你身上闻到了重复的味道。','你又来了。我认得你的伤疤。'],
          t2:['你走路的姿势变了。比上次更谨慎。','你上次差点死在那条巷子里。你以为我不知道？','你是不是在循环什么东西？你的眼神像困兽。'],
          t3:['你是唯一一个让我觉得"回来"是一件可怕的事情的人。','我不问了。你告诉我该怎么做。','你这次要杀谁？或者，你要救谁？'],
          t4:['（他坐在角落里擦枪。你进来的时候，他把枪放在了桌上——不是对着你，是给你。）','（他什么都没说。但他的眼神里有一种东西——不是恐惧，是认命。）']
        },
        '伊莱亚斯·沃德':{
          t1:['你的存在本身就是一个悖论。你知道吗？','我在研究轮回理论。你的案例……很有趣。','你让我想起了一篇论文。关于时间的回文结构。'],
          t2:['你的记忆保留率高于理论值。我们需要谈谈。','你已经读过了那些书。我能从你的沉默中听出来。','你来了。很好。我有一些新的发现需要验证。'],
          t3:['你不再是一个调查者了。你是一个现象。','我把你的名字写进了研究笔记。不是作为案例——是作为合作者。','你是唯一一个能告诉我"上一次"发生了什么的人。'],
          t4:['（他桌上放着一份手稿。标题是《论沃切斯特的第十三次钟声》。作者栏是空白的——但笔迹是你的。）','（他把你带到了一面镜子前。镜子里的你穿着不同年代的衣服。他问："你看到了几个自己？"）']
        }
      };
      // 确定当前记忆层级和概率
      let tier, probability;
      if(loop>=10){ tier='t4'; probability=1.0; }
      else if(loop>=8){ tier='t3'; probability=0.6; }
      else if(loop>=5){ tier='t2'; probability=0.4; }
      else{ tier='t1'; probability=0.25; }
      const npcLines=NPC_MEMORY_LINES[npc.name];
      if(npcLines&&npcLines[tier]&&Math.random()<probability){
        narr('system',npc.name+'突然说："'+pick(npcLines[tier])+'"');
      }
      // Loop 10+：NPC 行为变化（不仅说话，还改变初始信任/交互）
      if(loop>=10&&npcLines&&npcLines.t4){
        const behaviorMemory=s._npcBehaviorMemory||{};
        if(!behaviorMemory[npc.name]){
          if(!s._npcBehaviorMemory)s._npcBehaviorMemory={};
          s._npcBehaviorMemory={...s._npcBehaviorMemory,[npc.name]:true};
          // 高循环 NPC 信任回响：免费 +1 信任（他们记得你）
          const currentTrust=s.npcTrust[npc.name]||0;
          if(currentTrust<3){
            s.npcTrust={...s.npcTrust,[npc.name]:Math.min(3,currentTrust+1)};
            narr('system','（'+npc.name+'看着你，像是在确认什么。信任度悄然提升。）',{isSpecial:true});
          }
        }
      }
    }
    log('与'+npc.name+'对话');if(!s.tutorialSeen.first_talk)s.tutorialSeen={...s.tutorialSeen,first_talk:true};return s;
  }
  case 'NPC_RESPONSE':{
    const npc=s.pendingNpc.npc;const trust=s.npcTrust[npc.name]||0;const choice=action.choice;const ns=s.npcStates[npc.name]||{};
    if(choice==='trust_up'){
      // Daily limit: each NPC can only gain trust once per day
      if(s._dailyTrustGains&&s._dailyTrustGains[npc.name]){
        narr('system',npc.name+'今天已经对你敞开心扉了。也许明天再来，关系会更进一步。');
        s.pendingNpc=null;
      }else if(s.ap<1){
        narr('system','你需要行动点来深入交谈。（需要1 AP）');
        s.pendingNpc=null;
      }else{
        // Trust gate: levels 3/4/5 require progression conditions
        const nextTrust=trust+1;
        const gate=checkTrustGate(nextTrust,s,npc.name);
        if(gate){
          narr('system',npc.name+'似乎想对你说些什么，但犹豫了。'+gate);
          s.pendingNpc=null;
        }else if(ns.corrupted&&Math.random()<0.6){
          narr('system',npc.name+'似乎很热情地回应你，但你隐约感到有些不对劲。');
          s.pendingNpc=null;
        }else{
          s.ap-=1;
          const newTrust=Math.min(5,nextTrust);
          s.npcTrust[npc.name]=newTrust;
          if(!s._dailyTrustGains)s._dailyTrustGains={};
          s._dailyTrustGains[npc.name]='talk';
          for(let lv=trust+1;lv<=newTrust;lv++){
            const layer=npc.trust_layers?npc.trust_layers.find(l=>l.level===lv):null;
            if(layer?.unlocks)layer.unlocks.forEach(u=>{if(!hasClueId(s.clues,u)){const _rn=resolveClueName(u);s.clues.push(_rn&&_rn!==u?{id:u,name:_rn}:u);}});
          }
          narr('system',npc.name+'对你的信任度提升了。（信任等级：'+newTrust+'）');
          modHumanity(s,3,'与'+npc.name+'建立真诚的联系');
          addRunMemory(s,npc.name+'开始相信你。','npc');
          // Keep dialog open with updated trust & layer
          const newLayer=npc.trust_layers?npc.trust_layers.find(l=>l.level===newTrust)||npc.trust_layers[0]:null;
          s.pendingNpc={npc,trust:newTrust,layer:newLayer};
        }
      }
    }else if(choice==='get_item'){
      if(npc.secrets&&npc.secrets.length>trust){
        const secret=npc.secrets[Math.min(trust,npc.secrets.length-1)];
        narr('system',npc.name+'低声告诉你："'+secret+'"');
        if(!hasClueId(s.clues,secret)){const _rn=resolveClueName(secret);s.clues.push(_rn&&_rn!==secret?{id:secret,name:_rn}:secret);}
        // Corruption triggers: asking NPC for info sets flags
        if(npc.name==='玛莎·格雷'&&trust>=2)setCorruptionFlag(s,'player_asked_harbor_watch');
        if(npc.name==='老费舍'&&trust>=2)setCorruptionFlag(s,'player_insisted_fisher_explain_tide');
        if(npc.name==='伊莎贝拉·韦伯'&&trust>=3)setCorruptionFlag(s,'player_accused_isabella_heretic');
      }else{
        narr('system',npc.name+'暂时没有更多信息了。');
      }
    }else if(choice==='redeem'){
      const npcRedemptionMap={'希尔达·莫里斯':'hilda_morris','老费舍':'old_fisher','伊莎贝拉·韦伯':'isabella_weber','约书亚·布莱克':'joshua_black'};
      const rKey=npcRedemptionMap[npc.name];
      const redemption=GD.implementation_notes?.npc_redemption?.characters?.[rKey];
      if(redemption){
        narr('system',redemption.redemption_text);
        s.npcStates[npc.name]={...s.npcStates[npc.name],corrupted:false,redeemed:true};
        bt.redeemed_npcs=(bt.redeemed_npcs||0)+1;
        modHumanity(s,15,'选择自己承担代价，救赎'+npc.name);
      }else{
        narr('system','你尝试与'+npc.name+'建立更深的联系，但对方的状态似乎无法挽回。');
      }
    }else if(choice==='silence'){
      const silenceEntries=GD.implementation_notes?.philosophical_mechanics?.silence_is_choice?.silence_journal_entries||[];
      narr('system',silenceEntries.length>0?pick(silenceEntries):'你没有回答。沉默也是一种回答。');
      s.san=clamp(s.san-1,0,s.maxSan);
      modHumanity(s,-5,'在'+npc.name+'面前选择沉默，隐瞒真相');
      addRunMemory(s,'你没有回答。沉默也被记录了。','humanity');
    }else if(choice==='share_food'){
      if(s._dailyTrustGains&&s._dailyTrustGains[npc.name]){
        narr('system',npc.name+'今天已经接受过你的心意了。明天再来吧。');
      }else if(s.ap<1){
        narr('system','你需要行动点来照顾对方。（需要1 AP）');
      }else if((s.food||0)<1){
        narr('system','你没有食物可以分享了。');
      }else{
        // Check trust gate before consuming resources
        const curTrust=s.npcTrust[npc.name]||0;
        const gate=checkTrustGate(curTrust+1,s,npc.name);
        if(gate){
          narr('system',npc.name+'看着你递来的食物，摇了摇头。'+gate);
        }else{
          s.ap-=1;s.food--;
          const npcResourceMap={'约书亚·布莱克':'joshua','汤米·陈':'tommy','希尔达·莫里斯':'hilda','老费舍':'old_fisher'};
          const rKey=npcResourceMap[npc.name];
          const foodChoices=GD.systems?.resources?.resources?.food?.usage_choices||[];
          const choice_data=foodChoices.find(c=>c.target===rKey);
          if(choice_data){
            narr('system',choice_data.description||('你把食物分给了'+npc.name+'。'));
            if(choice_data.humanity_impact)modHumanity(s,choice_data.humanity_impact,'把食物分给'+npc.name);
            if(choice_data.effect)narr('system',choice_data.effect);
          }else{
            narr('system','你把食物分给了'+npc.name+'。对方默默接了过去。');
            modHumanity(s,2,'把食物分给'+npc.name);
          }
          const newTrust=Math.min(5,curTrust+1);
          s.npcTrust[npc.name]=newTrust;
          if(!s._dailyTrustGains)s._dailyTrustGains={};
          s._dailyTrustGains[npc.name]='food';
          addRunMemory(s,'你把食物分给了'+npc.name+'。','npc');
          // Update dialog with new trust
          const newLayer=npc.trust_layers?npc.trust_layers.find(l=>l.level===newTrust)||npc.trust_layers[0]:null;
          s.pendingNpc={npc,trust:newTrust,layer:newLayer};
        }
      }
    }else if(choice==='leave'){s.pendingNpc=null;s.objectives=checkObjCompletion(s.objectives,s);}
    else if(choice==='attack'){
      if(s.ap<2){narr('system','行动点不足（需要2AP）。');s.pendingNpc=null;return s;}
      s.ap-=2;
      try{incrementStat('run_combat');}catch(e){}
      const fightSkill=s.skills['格斗']||s.skills['潜行']||20;
      const npcDiff=npc.chapter_1_role==='core'?55:40;
      const roll=rand(1,100);
      const success=roll<=fightSkill&&roll<=npcDiff;
      if(success){
        bt.direct_kill_count=(bt.direct_kill_count||0)+1;
        s.npcStates[npc.name]={...ns,dead:true,killedByPlayer:true};
        const sanLoss=rand(4,12);
        s.san=clamp(s.san-sanLoss,0,s.maxSan);
        modHumanity(s,-20,'亲手杀害了'+npc.name);
        addRunMemory(s,'你杀了'+npc.name+'。','death');
        narr('system','【攻击】掷骰 '+roll+' / 格斗'+fightSkill+' —— 成功！'+npc.name+'倒下了。SAN -'+sanLoss,{isSpecial:true});
        s.pendingNpc={...s.pendingNpc,postKill:true};
      }else{
        const dmg=rand(2,8);
        s.hp=Math.max(0,s.hp-dmg);
        s.npcTrust[npc.name]=Math.max(0,(s.npcTrust[npc.name]||0)-2);
        narr('system','【攻击】掷骰 '+roll+' / 格斗'+fightSkill+' —— 失败！'+npc.name+'激烈反抗。HP -'+dmg);
        if(Math.random()<0.5){
          s.npcStates[npc.name]={...ns,fled:true};
          narr('system',npc.name+'惊恐地逃走了。你可能再也找不到他了。');
        }
        s.pendingNpc=null;
      }
    }else if(choice==='post_kill_hide'){
      bt.clean_kill_pattern=(bt.clean_kill_pattern||0)+1;
      if(s.ap>=1){s.ap-=1;narr('system','你花了一些时间处理现场。痕迹被抹去了。');}
      else{narr('system','你没有时间仔细处理，但你尽力隐藏了能隐藏的一切。');}
      s.san=clamp(s.san-2,0,s.maxSan);
      modHumanity(s,-5,'冷静地隐藏了'+npc.name+'的尸体');
      s.pendingNpc=null;
    }else if(choice==='post_kill_cannibal'){
      bt.cannibalism_count=(bt.cannibalism_count||0)+1;
      s.food=Math.min(s.maxFood,(s.food||0)+2);
      s.starvationDays=0; // 饥饿解除
      const sanLoss=rand(8,20);
      s.san=clamp(s.san-sanLoss,0,s.maxSan);
      modHumanity(s,-30,'食用了'+npc.name+'的肉体');
      addRunMemory(s,'你吃了'+npc.name+'。饥饿比道德更真实。','death');
      narr('system','你做了无法挽回的事。食物+2。某种东西在你体内扎了根。SAN -'+sanLoss,{isSpecial:true});
      s.pendingNpc=null;
    }else if(choice==='post_kill_leave'){
      s.pendingNpc=null;
      const witnesses=getNpcsHere(s).filter(n2=>n2.name!==npc.name);
      if(witnesses.length>0&&Math.random()<0.4){
        narr('system','你匆忙离开了。但愿没有人注意到你的行踪。');
      }
    }else if(choice==='incite'){
      if(s.ap<2){narr('system','行动点不足（需要2AP）。');s.pendingNpc=null;return s;}
      s.ap-=2;
      const socialSkill=s.skills['话术']||s.skills['心理学']||25;
      const roll=rand(1,100);
      if(roll<=socialSkill){
        bt.npc_deaths_by_manipulation=(bt.npc_deaths_by_manipulation||0)+1;
        s.npcStates[npc.name]={...ns,dead:true,manipulatedDeath:true};
        const sanLoss=rand(3,8);
        s.san=clamp(s.san-sanLoss,0,s.maxSan);
        modHumanity(s,-15,'操纵导致'+npc.name+'的死亡');
        addRunMemory(s,'你说了一些话。'+npc.name+'走向了危险。','death');
        narr('system','【陷害】掷骰 '+roll+' / 话术'+socialSkill+' —— 成功。'+npc.name+'对你深信不疑，走向了你指出的"线索"。几天后，人们在码头发现了尸体。SAN -'+sanLoss,{isSpecial:true});
      }else{
        narr('system','【陷害】掷骰 '+roll+' / 话术'+socialSkill+' —— 失败。'+npc.name+'看穿了你的意图。');
        s.npcTrust[npc.name]=Math.max(0,(s.npcTrust[npc.name]||0)-1);
      }
      s.pendingNpc=null;
    }else if(choice==='exploit_npc'){
      if(s.ap<1){narr('system','行动点不足。');s.pendingNpc=null;return s;}
      s.ap-=1;bt.npc_as_resource_count=(bt.npc_as_resource_count||0)+1;
      s.npcTrust[npc.name]=Math.max(0,(s.npcTrust[npc.name]||0)-2);
      const gain=rand(2,6);s.money=(s.money||0)+gain;
      modHumanity(s,-12,'把'+npc.name+'当作资源利用');
      addRunMemory(s,'你利用了'+npc.name+'。效率很高。','npc');
      narr('system','你利用了'+npc.name+'的信任。金钱 +'+gain+'。对方的眼神里多了一丝怀疑。');
      s.pendingNpc=null;
    }else if(choice==='betray_npc'){
      if(s.ap<1){narr('system','行动点不足。');s.pendingNpc=null;return s;}
      s.ap-=1;bt.betrayed_high_trust_npcs=(bt.betrayed_high_trust_npcs||0)+1;
      s.npcTrust[npc.name]=0;
      if(!bt._npc_harm_tally)bt._npc_harm_tally={};
      bt._npc_harm_tally[npc.name]=(bt._npc_harm_tally[npc.name]||0)+1;
      bt.same_npc_harm_max=Math.max(bt.same_npc_harm_max||0,bt._npc_harm_tally[npc.name]);
      modHumanity(s,-20,'背叛了高度信任的'+npc.name);
      addRunMemory(s,'你背叛了'+npc.name+'。信任是一种货币。你把它兑现了。','npc');
      narr('system','你把'+npc.name+'的秘密告诉了不该告诉的人。信任归零。你得到了一些东西——但不是钱。',{isSpecial:true});
      s.pendingNpc=null;
    }else if(choice==='intimacy'){
      if(s.ap<2){narr('system','行动点不足。');s.pendingNpc=null;return s;}
      s.ap-=2;bt.forbidden_intimacy_flags=(bt.forbidden_intimacy_flags||0)+1;
      const sanLoss=rand(3,8);s.san=clamp(s.san-sanLoss,0,s.maxSan);
      s.pollution=Math.min(1,(s.pollution||0)+0.1);audioManager.playEffect('loop_pollution');
      modHumanity(s,-8,'与'+npc.name+'发生了禁忌的亲密');
      narr('system','你靠近了'+npc.name+'。你没有问这是否正确。对方没有回答——但也没有退开。SAN -'+sanLoss,{isSpecial:true});
      s.pendingNpc=null;
    }else if(choice==='preach'){
      if(s.ap<2){narr('system','行动点不足（需要2AP）。');s.pendingNpc=null;return s;}
      s.ap-=2;
      const cultSkill=s.skills['神秘学']||s.skills['话术']||20;
      const roll=rand(1,100);
      if(roll<=cultSkill){
        bt.cult_leader_score=(bt.cult_leader_score||0)+1;
        s.npcStates[npc.name]={...ns,follower:true};
        const sanLoss=rand(2,6);
        s.san=clamp(s.san-sanLoss,0,s.maxSan);
        modHumanity(s,-10,'将'+npc.name+'引入歧途，建立邪教追随');
        addRunMemory(s,npc.name+'开始追随你。不是信任——是信仰。','npc');
        narr('system','【传教】掷骰 '+roll+' / 神秘学'+cultSkill+' —— 成功。'+npc.name+'眼中不再有疑问。你所说的每一个字，都被当作了真理。SAN -'+sanLoss,{isSpecial:true});
        s.npcTrust[npc.name]=Math.min(5,(s.npcTrust[npc.name]||0)+1);
      }else{
        narr('system','【传教】掷骰 '+roll+' / 神秘学'+cultSkill+' —— 失败。'+npc.name+'后退了一步，表情变得警惕。');
        s.npcTrust[npc.name]=Math.max(0,(s.npcTrust[npc.name]||0)-1);
      }
      s.pendingNpc=null;
    }
    return s;
  }
  case 'USE_ITEM':{cloneInv();
    const item=action.item;const idx=s.inventory.findIndex(i=>i.name===item.name);
    if(idx<0||s.inventory[idx].uses===0)return s;
    audioManager.playEffect('item_use');
    const consume=()=>{if(s.inventory[idx].uses>0){s.inventory[idx].uses--;if(s.inventory[idx].uses<=0)s.inventory.splice(idx,1);}};

    const def=getItemDef(item.id,ctx);
    if(def){
      const shouldConsume=useItemByDef(s,item,narr,ctx);
      if(shouldConsume)consume();
      return s;
    }
    narr('system','你不知道如何使用'+item.name+'。');
    return s;
  }
  case 'REST':{ensureMutableArrays();
    // Capture start-of-day values for daily summary
    const _startSan=state.san,_startHp=state.hp,_startClues=(state.clues||[]).length;
    const _startArea=state._dayStartArea||state.currentArea;
    // Food consumption (with area resource_pressure modifier)
    const restArea=getAreaInfo(s.currentArea,ctx);
    const foodMod=restArea?.resource_pressure?.food_consumption_modifier||1.0;
    const foodConsume=Math.ceil(1*foodMod);
    s.food=Math.max(0,(s.food??0)-foodConsume);
    // Starvation system: track consecutive days without food
    if(s.food<=0){
      s.starvationDays=(s.starvationDays||0)+1;
      const sd=s.starvationDays;
      if(sd===1){
        // Day 1: SAN -1, light hunger text
        s.san=clamp(s.san-1,0,s.maxSan);
        narr('system','你腹中空空。胃部的抽搐让你难以集中注意力。',{isSpecial:true});
      }else if(sd===2){
        // Day 2: HP -1, skill check -5
        s.hp=Math.max(0,s.hp-1);
        narr('system','饥饿在啃噬你的意志。你的手脚开始发软，动作变得迟缓。',{isSpecial:true});
      }else{
        // Day 3+: HP -2, skill check -10, death chance
        s.hp=Math.max(0,s.hp-2);
        narr('system','你的身体已经开始消耗自身。视线模糊，每一个动作都是折磨。',{isSpecial:true});
      }
      // Starvation: NPC trust decay chance
      const npcs=GD.npcs||GD.module3_npcs||[];
      npcs.forEach(npc=>{
        if(s.npcTrust[npc.name]>0&&Math.random()<0.3){
          s.npcTrust[npc.name]=Math.max(0,s.npcTrust[npc.name]-1);
        }
      });
    }else{
      // Food recovered — reset starvation counter
      s.starvationDays=0;
    }
    // Death check after starvation damage (before recovery would heal the dead)
    if(s.hp<=0||s.san<=0){
      const deathType=s.hp<=0?'starvation':'madness';
      const deathMode=s.hp<=0?'hp':'san';
      const deathText=s.hp<=0?'饥饿耗尽了你最后的体力。你倒在了沃切斯特的街道上，再也没有站起来。':'你的精神再也无法承受。意识在低语中碎裂，你再也分不清现实与幻觉。';
      s.deathContext={mode:deathMode,type:deathType,area:s.currentArea,day:s.day,loop:s.loopCount,sourceEventId:null,sourceEventName:'饥饿致死',finalText:deathText,residueFlag:'death_echo_starvation'};
      s.lastDeathType=deathType;s.lastDeathMode=deathMode;
      if(deathMode==='hp')audioManager.playEffect('death_physical');else audioManager.playEffect('death_mental');
      narr('death',deathText,{isSpecial:true});
      const failDef=deathMode==='hp'?GD.implementation_notes?.failure_states?.failure_types?.physical_death:GD.implementation_notes?.failure_states?.failure_types?.mental_death;
      s.ending={name:failDef?.name||deathType,type:'bad',description:deathText,recap:buildDeathRecap(s,s.deathContext)};
      addRunMemory(s,deathText.split('\n')[0],'death');
      if(!s.tutorialSeen.first_death)s.tutorialSeen={...s.tutorialSeen,first_death:true};
      return s;
    }
    // Safehouse degradation
    s.safehouseCorruption=processSafehouseNight(s,ctx);
    const shStage=getSafehouseStage(s.safehouseCorruption,ctx);
    // Safehouse voice lines based on corruption
    if(s.safehouseCorruption>=60)audioManager.playEffect('safehouse_not_safe');
    else if(s.safehouseCorruption>=30)audioManager.playEffect('safehouse_breath');
    else audioManager.playEffect(Math.random()<0.5?'rest_generic':'rest_alt');
    let sanRec=shStage.available_functions?.san_recovery||0;
    const fatigueRec=shStage.available_functions?.fatigue_recovery||30;
    // Alternative safehouse bonus
    if(s.currentSafehouse!=='main'){
      const alts=GD.systems?.safehouse?.relocation_rules?.alternative_safehouses||[];
      const curAlt=alts.find(a=>a.name===s.currentSafehouse);
      if(curAlt?.functions?.san_restore) sanRec+=curAlt.functions.san_restore;
    }
    if((s.food||0)>0){
      if(sanRec>0)s.san=clamp(s.san+sanRec,0,s.maxSan);
      if(sanRec<0)s.san=clamp(s.san+sanRec,0,s.maxSan);
      s.hp=clamp(s.hp+1,0,s.maxHp);
    }else{
      narr('system','没有食物，你无法从休息中恢复。',{isSpecial:true});
    }
    s.longTermEffects.forEach(l=>{if(l.daysRemaining>0)l.daysRemaining--;});
    s.longTermEffects=s.longTermEffects.filter(l=>l.daysRemaining>0);
    if(s.tempSkillBonus){s.tempSkillBonus.days--;if(s.tempSkillBonus.days<=0)s.tempSkillBonus=null;}
    s.harborRiskReduction=0;
    const oldDay=s.day;
    s.day++;s.ap=s.maxAp;s.weather=getWeather(pick).name;s.sealState=getSealStateId(s.day,ctx);
    try{incrementStat('night_survived');if(s.san<=10)incrementStat('low_san_days');}catch(e){}
    audioManager.playEffect('rest_generic');
    try{const phase=getPhase(s.ap,s.maxAp);audioManager.playAreaAmbient(s.currentArea,phase);}catch(e){audioManager.playAreaAmbient('town_center','morning');}
    // Clear area name cache on new day
    s.areaNameCache={};
    // Reset daily event category counts (extended events)
    resetDailyCategoryCounts(s);
    // Chapter transition
    const chTransition=checkChapterTransition(oldDay,s.day,ctx);
    if(chTransition){
      s.currentChapter=getChapterForDay(s.day,ctx).key;
      s.transition='chapter';
      narr('system',chTransition.event_text,{isSpecial:true});
      if(chTransition.san_cost)s.san=clamp(s.san+chTransition.san_cost,0,s.maxSan);
      if(chTransition.mythos_gain)s.mythosLevel=(s.mythosLevel||0)+chTransition.mythos_gain;
    }
    // Motif flavor: fog/bell/water based on corruption
    if(Math.random()<0.2){
      const motifType=pick(['fog','bell','water']);
      const motifText=getMotifFlavorText(motifType,s.safehouseCorruption||0,ctx);
      if(motifText)narr('system',motifText);
    }
    const stage=getSanStage(s.san,ctx);
    if(stage.apMod!==0){s.ap=clamp(s.ap+stage.apMod,0,s.maxAp);narr('system','【'+stage.name+'】'+stage.desc+' AP修正：'+stage.apMod);}
    if(shStage.stage>=3){
      narr('system','【安全屋】'+shStage.name+' —— '+(shStage.description||'安全屋的状态在恶化。'),{isSpecial:true});
    }
    // Chapter 2 unlock announcement
    if(s.day===8){
      narr('system','浓雾稍微散去。你注意到之前忽略的小径——低语森林和灯塔的方向似乎不再那么遥不可及。',{isSpecial:true});
    }
    // Chapter progression events
    const progEvents=GD.implementation_notes?.chapter_progression_events||[];
    const todayEvent=progEvents.find(e=>e.day===s.day);
    if(todayEvent){
      narr('system','【事件】'+todayEvent.name+'——'+todayEvent.description,{isSpecial:true});
      if(todayEvent.effect?.all_npc_san){
        (GD.npcs||[]).forEach(npc=>{if(!s.npcStates[npc.name]?.dead)s.san=clamp(s.san+todayEvent.effect.all_npc_san,0,s.maxSan);});
      }
    }
    // NPC trigger-based corruption (P0-3)
    const corruptionTriggers=checkNPCCorruption(s,ctx);
    for(const {npc,trigger} of corruptionTriggers){
      applyNPCCorruption(s,npc,trigger,narr);
      addRunMemory(s,npc.name+'被腐蚀了——'+(trigger.id||'未知原因'),'npc');
    }
    // Seal state accelerated corruption (reduced rate, only for non-triggered NPCs)
    const sm=getSealState(s.day,ctx).global_modifier;
    const sealRate=(sm?.npc_corruption_rate||0.05)*0.3;
    (GD.npcs||GD.module3_npcs||[]).forEach(npc=>{
      if(s.npcStates[npc.name]?.dead||s.npcStates[npc.name]?.corrupted)return;
      if(Math.random()<sealRate)s.npcStates[npc.name]={...s.npcStates[npc.name],corrupted:true,corruptionSource:'seal_decay'};
    });
    // Silent events at safehouse
    checkSilentEvent(s,narr,'safehouse');
    // SAN破壁事件 (P1-3)
    checkBreakWallEvent(s,narr);
    // Daily summary card (P2-2)
    {
      const acts=s._dayActions||[];
      const areaObj=getAreaInfo(_startArea,ctx);
      const areaName=areaObj?.name||'沃切斯特';
      const sanDelta=s.san-_startSan;
      const hpDelta=s.hp-_startHp;
      const cluesFound=(s.clues?.length||0)-_startClues;
      const parts=['今日在'+areaName+'活动。'];
      if(acts.length===0)parts.push('整天待在安全屋休息。');
      else{
        const actCounts={};acts.forEach(a=>{actCounts[a]=(actCounts[a]||0)+1;});
        const actNames={MOVE:'移动',EXPLORE:'探索',TALK_NPC:'交谈',WORK:'打工',BUY_FOOD:'购买食物',USE_ITEM:'使用物品',SWITCH_SAFEHOUSE:'更换安全屋'};
        const desc=Object.entries(actCounts).map(([k,v])=>(actNames[k]||k)+(v>1?'×'+v:'')).join('、');
        parts.push('行动：'+desc+'。');
      }
      if(sanDelta!==0)parts.push('精神'+(sanDelta>0?'+':'')+sanDelta);
      if(hpDelta!==0)parts.push('体力'+(hpDelta>0?'+':'')+hpDelta);
      if(cluesFound>0)parts.push('发现'+cluesFound+'条线索');
      if(acts.includes('EXPLORE')&&cluesFound===0)parts.push('探索未发现新线索');
      narr('system','【今日总结】'+parts.join('，')+'。',{isSpecial:true});
    }
    narr('system','\n═══ 第 '+s.day+' 天 ═══ 天气：'+s.weather+' ═══ 封印：'+s.sealState+' ═══');
    const area=getAreaInfo(s.currentArea,ctx);
    if(area)narr('location',area.description,{locationName:getAreaDisplayName(area,s),imageSrc:getAreaSceneImage(s.currentArea,s),imageAlt:getAreaDisplayName(area,s)});
    const ending=checkEnding(s,ctx);if(ending)s.ending={...ending,recap:buildDeathRecap(s)};
    if(s.day>28){
      s.deathContext={mode:'hp',type:'physical',area:s.currentArea,day:s.day,loop:s.loopCount,sourceEventId:null,sourceEventName:'时间耗尽',finalText:'封印崩溃，沃切斯特沉入深渊。',residueFlag:'death_echo_time'};
      s.lastDeathType='physical';s.lastDeathMode='hp';
      audioManager.playEffect('death_physical');
      s.ending={name:'时间耗尽',type:'bad',description:'封印崩溃，沃切斯特沉入深渊。',recap:buildDeathRecap(s)};
    }
    s.objectives=genObjectives(s.day,ctx);
    s.stats_run.days_best=Math.max(s.stats_run.days_best,s.day);
    log('第'+s.day+'天开始');

    // Check for new knowledge earned
    checkKnowledgeEarned(s);

    // Daily pattern analysis for behavior endings
    const acts=s._dayActions||[];
    if(acts.length===0){bt.sleep_streak=(bt.sleep_streak||0)+1;}else{bt.sleep_streak=0;}
    if(acts.length<=1){bt.low_intervention_count=(bt.low_intervention_count||0)+1;}
    const hasMove=acts.includes('MOVE'),hasExplore=acts.includes('EXPLORE'),hasTalk=acts.some(a=>a==='TALK_NPC'||a==='trust_up'||a==='get_item'||a==='silence'||a==='share_food'||a==='redeem'||a==='incite'||a==='preach'||a==='attack');
    const hasWork=acts.includes('WORK')||acts.includes('BUY_FOOD'),hasItem=acts.includes('USE_ITEM');
    const stayedInArea=!hasMove;
    if(stayedInArea){bt.safehouse_stay_days=(bt.safehouse_stay_days||0)+1;}
    if(hasWork&&!hasExplore&&!hasTalk&&!hasMove){bt.work_only_days=(bt.work_only_days||0)+1;}
    if(hasMove&&!hasExplore&&!hasTalk&&!hasWork){bt.move_only_days=(bt.move_only_days||0)+1;}
    if(hasItem&&!hasMove&&!hasExplore&&!hasTalk&&!hasWork){bt.record_only_days=(bt.record_only_days||0)+1;}
    s._dayActions=[];
    s._dailyTrustGains={};
    s._dayStartArea=s.currentArea;

    // Auto-save after rest
    saveGame(s);audioManager.playUI('save');
    s.transition='rest';
    if(!s.tutorialSeen.first_rest)s.tutorialSeen={...s.tutorialSeen,first_rest:true};
    return s;
  }
  case 'WORK':{
    if(s.ap<2){narr('system','行动点不足（需要2AP）。');return s;}
    s.ap-=2;const earned=rand(3,12);s.money=(s.money||0)+earned;bt.work_count=(bt.work_count||0)+1;
    if((s.money||0)>(bt.hoarded_money_max||0))bt.hoarded_money_max=s.money;
    narr('system','你在码头帮了半天工。报酬微薄，但至少口袋里多了几枚硬币。金钱 +'+earned);
    log('打工挣钱');return s;
  }
  case 'BUY_FOOD':{
    if(s.ap<1){narr('system','行动点不足（需要1AP）。');return s;}
    const foodPrice=3;
    if((s.money||0)<foodPrice){narr('system','你的钱不够。购买食物需要 '+foodPrice+' 金钱。');return s;}
    if((s.food||0)>=(s.maxFood||5)){narr('system','你的食物已经满了。');return s;}
    s.ap-=1;s.money-=foodPrice;s.food=Math.min(s.maxFood,(s.food||0)+1);
    narr('system','你在杂货店买了一些食物。食物 +1，金钱 -'+foodPrice);
    log('购买食物');return s;
  }
  // Dark actions
  case 'SELF_HARM':{
    if(s.ap<2){narr('system','行动点不足。');return s;}
    s.ap-=2;bt.self_harm_ritual_count=(bt.self_harm_ritual_count||0)+1;bt.fusion_and_self_harm_total=(bt.fusion_and_self_harm_total||0)+1;
    const sanLoss=rand(3,10);s.san=clamp(s.san-sanLoss,0,s.maxSan);
    modHumanity(s,-10,'用刀在自己身上刻下符号');
    addRunMemory(s,'第'+(bt.self_harm_ritual_count)+'次。刀锋划过皮肤的时候，你觉得你正在写下什么东西。','madness');
    narr('system','你用刀尖在皮肤上刻下了一个符号。你不知道它是什么意思。但你的手知道。SAN -'+sanLoss,{isSpecial:true});
    if(Math.random()<0.3){s.pollution=Math.min(1,(s.pollution||0)+0.05);narr('system','符号在皮肤下微微发光，然后暗了下去。');audioManager.playEffect('loop_pollution');}
    return s;
  }
  case 'SPREAD_PROPHECY':{
    if(s.ap<2){narr('system','行动点不足。');return s;}
    s.ap-=2;bt.prophecy_spread_count=(bt.prophecy_spread_count||0)+1;
    bt.cult_leader_score=(bt.cult_leader_score||0)+1;
    const sanLoss=rand(2,5);s.san=clamp(s.san-sanLoss,0,s.maxSan);
    modHumanity(s,-8,'向镇民散布不祥的预言');
    narr('system','你站在镇中心的井边，对路过的人低声说出预言。他们的表情从怀疑变成了恐惧。但恐惧中有一丝——期待。SAN -'+sanLoss,{isSpecial:true});
    return s;
  }
  case 'CONSUME_ARCHIVE':{
    if(s.ap<2){narr('system','行动点不足。');return s;}
    if(!s.clues||s.clues.length===0){narr('system','你没有可以吞噬的档案。');return s;}
    s.ap-=2;bt.archive_consumed_count=(bt.archive_consumed_count||0)+1;
    const removed=s.clues.pop();s.mythosLevel=(s.mythosLevel||0)+1;
    modHumanity(s,-5,'吞噬了一条线索——让真相永远消失');
    narr('system','你把笔记本上的一页撕下来，放进嘴里。纸是苦的。但你咽下去的时候，某种知识进入了你的血液。线索「'+(removed||'未知')+'」永远消失了。克苏鲁神话 +1',{isSpecial:true});
    return s;
  }
  case 'SELF_SACRIFICE':{
    if(s.ap<3){narr('system','行动点不足（需要3AP）。');return s;}
    s.ap-=3;bt.self_sacrifice_for_power=(bt.self_sacrifice_for_power||0)+1;
    s.mythosLevel=(s.mythosLevel||0)+3;s.pollution=Math.min(1,(s.pollution||0)+0.15);audioManager.playEffect('loop_pollution');
    const hpLoss=rand(4,10);s.hp=Math.max(1,s.hp-hpLoss);
    s.maxSan=Math.max(10,s.maxSan-5);s.san=clamp(s.san-rand(5,15),0,s.maxSan);
    modHumanity(s,-25,'为了力量献祭了自己的一部分');
    addRunMemory(s,'你割下了自己的一部分。不是血肉——是更重要的东西。然后你感觉到了它。力量。冰冷，安静，确凿。','madness');
    narr('system','你闭上眼，放弃了某种无法命名但你知道一直在那里的东西。然后——力量来了。冰冷，安静，确凿。HP -'+hpLoss+'，SAN上限永久 -5，克苏鲁神话 +3',{isSpecial:true});
    return s;
  }
  // Area-specific actions
  case 'DESECRATE':{
    if(s.ap<2){narr('system','行动点不足。');return s;}
    const desecrateAreas=['town_center','harbor_district'];
    if(!desecrateAreas.includes(s.currentArea)){narr('system','这里没有可以亵渎的圣地。');return s;}
    s.ap-=2;bt.sacred_desecration_count=(bt.sacred_desecration_count||0)+1;
    const sanLoss=rand(4,12);s.san=clamp(s.san-sanLoss,0,s.maxSan);
    modHumanity(s,-15,'亵渎了神圣之地');
    narr('system','你找到了角落里那座被遗忘的神龛。你做了不可挽回的事。地面在你脚下微微震动——然后停了。仿佛某种东西屏住了呼吸。SAN -'+sanLoss,{isSpecial:true});
    if(s.currentArea==='town_center')s.safehouseCorruption=(s.safehouseCorruption||0)+2;
    return s;
  }
  case 'BREAK_SEAL':{
    if(s.ap<3){narr('system','行动点不足（需要3AP）。');return s;}
    if(!['catacombs_entrance','deep_catacombs','ruins_of_yith'].includes(s.currentArea)){narr('system','这里没有封印可以破坏。');return s;}
    s.ap-=3;setCorruptionFlag(s,'seal_desecrated');
    if(['deep_catacombs','ruins_of_yith'].includes(s.currentArea))setCorruptionFlag(s,'destroyed_time_core');
    s.sealState='critical';s.pollution=Math.min(1,(s.pollution||0)+0.2);audioManager.playEffect('loop_pollution');
    bt.loop_break_attempts=(bt.loop_break_attempts||0)+1;
    const sanLoss=rand(8,20);s.san=clamp(s.san-sanLoss,0,s.maxSan);
    modHumanity(s,-25,'试图破坏封印');
    addRunMemory(s,'你把手放在封印上。然后你推了。','death');
    narr('system','封印表面出现了一道裂痕。光从裂缝中漏出来。不是自然的光——是某种粘稠的、缓慢流动的光。你感到整个世界晃了一下。SAN -'+sanLoss,{isSpecial:true});
    return s;
  }
  case 'CHOICE_SELECT':{ensureMutableArrays();cloneInv();
    const pc=s.pendingChoice;if(!pc)return s;
    const choiceIdx=action.choiceIdx;
    const choice=pc.choices[choiceIdx];
    if(!choice){s.pendingChoice=null;return s;}
    s.pendingChoice=null;
    narr('system',choice.text,{isSpecial:true});
    applyLegacyEffects(s,choice.effects);
    // Death check after choice effects
    {const deathCtx=resolveDeath(s,pc.evt,choice);
      if(deathCtx){
        s.deathContext=deathCtx;s.lastDeathType=deathCtx.type;s.lastDeathMode=deathCtx.mode;
        const HP_T2=['drowning','bleeding','infection','starvation','falling','darkness_taken','physical'];
        const SAN_T2=['madness','possession','identity_erasure','mythos_absorption','loop_collapse','becomes_event','mental'];
        if(HP_T2.includes(deathCtx.type))audioManager.playEffect('death_physical');
        else if(SAN_T2.includes(deathCtx.type))audioManager.playEffect('death_mental');
        else audioManager.playEffect('death_hybrid');
        narr('death',deathCtx.finalText,{isSpecial:true});
        const ending=checkEnding(s,ctx);
        if(ending)s.ending={...ending,recap:buildDeathRecap(s,deathCtx)};
        else s.ending={name:deathCtx.type,type:'bad',description:deathCtx.finalText,recap:buildDeathRecap(s,deathCtx)};
        addRunMemory(s,deathCtx.finalText.split('\n')[0],'death');
      }}
    s.objectives=checkObjCompletion(s.objectives,s);
    log('选择：'+choice.label);
    return s;
  }
  case 'DISMISS_PENDING':s.pendingEvent=null;s.pendingNpc=null;s.pendingGamble=null;s.pendingChoice=null;ensureArr('objectives');s.objectives=checkObjCompletion(s.objectives,s);return s;
  case 'CLEAR_TRANSITION':s.transition=null;return s;
  case 'AUDIO_MUTE_TOGGLE':s.audioMuted=!s.audioMuted;audioManager.setMuted(s.audioMuted);return s;
  case 'ACCESSIBILITY_TOGGLE':{
    const key=action.key;
    if(!s.accessibilityOptions)s.accessibilityOptions={};
    if(key==='visual_distortion'){
      const val=action.value||(s.accessibilityOptions.visual_distortion==='off'?'medium':'off');
      s.accessibilityOptions={...s.accessibilityOptions,visual_distortion:val};
    }else if(key==='flicker_control'){
      const val=action.value||(s.accessibilityOptions.flicker_control==='off'?'medium':'off');
      s.accessibilityOptions={...s.accessibilityOptions,flicker_control:val};
    }else if(key==='sudden_sounds'){
      const cur=s.accessibilityOptions.sudden_sounds;
      s.accessibilityOptions={...s.accessibilityOptions,sudden_sounds:cur==='off'?'on':'off'};
      audioManager.suddenMuted=s.accessibilityOptions.sudden_sounds==='off';
    }
    return s;
  }
  case 'GAMBLE_CHOICE':{
    const g=s.pendingGamble;if(!g)return s;
    const choiceId=action.choiceId;
    const opt=g.options.find(o=>o.id===choiceId);
    if(!opt){s.pendingGamble=null;return s;}
    s.pendingGamble=null;
    const evt=g.evt;
    if(choiceId==='safe'){
      // Safe: normal SAN damage flow
      narr('system',opt.text);
      let sanDmg=Math.abs(evt.sanity_damage||0);
      if(sanDmg>0){
        sanDmg=processSanLoss(sanDmg,s.inventory.map(i=>i.name),s.weather,s.day,s.difficulty,ctx);
        if(sanDmg>0){
          if(evt.skill_check){
            audioManager.playSkillEffect('roll');
            const check=doSkillCheck(evt.skill_check.skill,evt.skill_check.threshold||50,s,s.difficulty,ctx);
            if(check.success){audioManager.playSkillEffect('success');sanDmg=Math.max(1,Math.round(sanDmg*0.5));narr('system','【技能检定：'+check.skillName+'】成功！SAN损失减半。');s.stats_run.checks_passed++;}
            else{audioManager.playSkillEffect(check.isCritFail?'critical_fail':'fail');narr('system','【技能检定：'+check.skillName+'】失败！');s.stats_run.checks_failed++;}
          }
          s.san=clamp(s.san-sanDmg,0,s.maxSan);
          narr('system','SAN -'+sanDmg,{isEffect:true});
          s.stats_run.max_san_loss_single=Math.max(s.stats_run.max_san_loss_single||0,sanDmg);
          s.stats_run.total_san_loss=(s.stats_run.total_san_loss||0)+sanDmg;
          if(sanDmg>=1){audioManager.playSanLoss(sanDmg);s.transition='san-loss';}
        }
      }
    }else if(choiceId==='deep_investigate'){
      // Deep investigate: roll 1d6 SAN loss, then check for reward
      const sanRoll=rand(1,6);
      narr('system',opt.text);
      s.san=clamp(s.san-sanRoll,0,s.maxSan);
      narr('system','SAN -'+sanRoll,{isEffect:true});
      s.stats_run.max_san_loss_single=Math.max(s.stats_run.max_san_loss_single||0,sanRoll);
      s.stats_run.total_san_loss=(s.stats_run.total_san_loss||0)+sanRoll;
      if(sanRoll>=1){audioManager.playSanLoss(sanRoll);s.transition='san-loss';}
      // Independent reward check
      const reward=opt.reward||{};
      const r=Math.random();
      if(r<reward.clue_chance){
        // Clue found — causal feedback
        const availableClues=(GD.clue_chains||[]).flatMap(c=>c.clues||[]).filter(c=>!hasClueId(s.clues,c.id));
        if(availableClues.length>0){
          const found=pick(availableClues);
          s.clues.push({id:found.id,name:found.name||found.id});audioManager.playEffect('clue_found');if(!s.tutorialSeen.first_clue&&s.clues.length===1)s.tutorialSeen={...s.tutorialSeen,first_clue:true};
          narr('system',reward.text_on_success+' 线索：'+(found.name||found.id),{isSpecial:true});
        }else{
          narr('system',reward.text_on_success,{isSpecial:true});
        }
        narr('system','这是你继续观察才发现的东西。如果刚才选择了收手，你永远不会知道。',{isSpecial:true});
        addRunMemory(s,'你选择继续观察，而不是移开视线。发现了「'+(availableClues.length>0?(availableClues[0]?.name||'未知'):'线索')+'」。','choice');
      }else if(r<reward.clue_chance+reward.san_gain_chance){
        // SAN recovery — no special causal text (neutral outcome)
        const gain=rand(1,3);
        s.san=clamp(s.san+gain,0,s.maxSan);
        narr('san-recovery','你在混乱中找到了某种秩序。SAN +'+gain);
        narr('system','它只学会了你的呼吸频率。',{isSpecial:true});
      }else if(r<reward.clue_chance+reward.san_gain_chance+reward.madness_risk){
        // Madness — causal feedback: you've been noticed
        const mad=rollMadness(ctx);s.madnessActive=mad;
        narr('madness','【临时疯狂：'+mad.name+'】'+mad.description,{madness:mad});
        narr('system',reward.text_on_madness,{isSpecial:true});
        narr('system','被某种东西记住了。',{isSpecial:true});
        addRunMemory(s,'深入探究时被某种东西记住了——'+mad.name,'madness');
        audioManager.playEffect('madness');audioManager.playEffect('madness_loop');
      }else{
        // No special outcome — default causal feedback
        narr('system','它只学会了你的呼吸频率。',{isSpecial:true});
      }
      // Also apply base event SAN damage
      let baseSanDmg=Math.abs(evt.sanity_damage||0);
      if(baseSanDmg>0){
        baseSanDmg=processSanLoss(baseSanDmg,s.inventory.map(i=>i.name),s.weather,s.day,s.difficulty,ctx);
        if(baseSanDmg>0){s.san=clamp(s.san-baseSanDmg,0,s.maxSan);narr('system','SAN -'+baseSanDmg,{isEffect:true});audioManager.playSanLoss(baseSanDmg);}
      }
    }
    // Apply event effects BEFORE death check
    applyLegacyEffects(s,evt.effects);
    // Post-gamble: check death (unified)
    {
      const deathCtx = resolveDeath(s, evt, null);
      if(deathCtx){
        s.deathContext = deathCtx;
        s.lastDeathType = deathCtx.type;
        s.lastDeathMode = deathCtx.mode;
        const HP_T3=['drowning','bleeding','infection','starvation','falling','darkness_taken','physical'];
        const SAN_T3=['madness','possession','identity_erasure','mythos_absorption','loop_collapse','becomes_event','mental'];
        if(HP_T3.includes(deathCtx.type))audioManager.playEffect('death_physical');
        else if(SAN_T3.includes(deathCtx.type))audioManager.playEffect('death_mental');
        else audioManager.playEffect('death_hybrid');
        narr('death', deathCtx.finalText, { isSpecial: true });
        const ending=checkEnding(s,ctx);
        if(ending)s.ending={...ending,recap:buildDeathRecap(s,deathCtx)};
        else{s.ending={name:deathCtx.type,type:'bad',description:deathCtx.finalText,recap:buildDeathRecap(s,deathCtx)};}
      }
    }
    s.objectives=checkObjCompletion(s.objectives,s);
    log('探索(赌博)：'+evt.name);
    return s;
  }
  case 'NEW_GAME':{
    // Track refusal of final choice (player chose to loop again rather than accept ending)
    if(s.ending)bt.final_choice_refused_count=(bt.final_choice_refused_count||0)+1;
    // Achievement stats
    try{incrementStat('total_runs');if(s.hp<=0||s.san<=0)incrementStat('total_deaths');}catch(e){}
    // Build previous run summary before reset (extended events system)
    const prevSummary = buildPreviousRunSummary(s);
    const f=initialState();
    // P0-L: 全部循环搬入逻辑已提取至 loopReducer.initLoopState()
    initLoopState(f, s, ctx, { prevSummary });
    clearSave();
    return f;
  }
  case 'SWITCH_SAFEHOUSE':{
    const shName=action.safehouse;
    if(shName==='main'){
      s.currentSafehouse='main';
      narr('system','你决定回到原来的酒馆安全屋。');
    }else{
      const alts=GD.systems?.safehouse?.relocation_rules?.alternative_safehouses||[];
      const sh=alts.find(a=>a.name===shName);
      if(sh){
        s.currentSafehouse=sh.name;
        narr('system','你搬到了'+sh.name+'。'+(sh.drawback||''));
      }
    }
    return s;
  }
  case 'CONTINUE_GAME':{
    const loaded={ ...action.savedState, screen: 'game', transition: null, narrative: [{id:Date.now(),type:'system',text:'—— 你从存档中醒来。'}] };
    // Ensure extended state fields exist (backward-compatible migration)
    return ensureExtendedState(loaded);
  }
  // ═══════════════════════════════════════════
  // 前传系统 actions
  // ═══════════════════════════════════════════
  case 'START_PROLOGUE':{
    s.screen='prologue';
    s.prologue=initPrologueState();
    s.fearTuning=null;
    // 前传初始状态：SAN满，AP重置
    s.san=s.maxSan;
    s.ap=s.maxAp;
    s.clues=[];
    s.narrative=[{
      id:Date.now(),
      type:'system',
      text:'这不是沃切斯特的第一份档案。',
      isSpecial:true
    }];
    return s;
  }
  case 'PROLOGUE_CHOICE':{
    if(!s.prologue||s.prologue.completed)return s;
    const currentEvent=getPrologueEvent(s.prologue.currentScene);
    if(!currentEvent)return s;
    const pChoice=currentEvent.choices.find(c=>c.id===action.choiceId);
    if(!pChoice)return s;
    // AP消耗（前传中简化）
    if(pChoice.cost&&pChoice.cost>0){
      s.ap=Math.max(0,s.ap-pChoice.cost);
    }
    // handlePrologueChoice 现在返回 { state, narration, nextScene, completed }
    const result=handlePrologueChoice(s,action.choiceId);
    // 用返回的新 state 替换 s（不可变）
    s=result.state;
    // 添加叙述文本
    for(const block of result.narration){
      narr(block.type,block.text,{isEffect:block.isEffect,isSpecial:block.isSpecial});
    }
    // 如果完成前传，恢复初始状态用于角色创建
    if(result.completed){
      s.san=s.maxSan;
      s.ap=s.maxAp;
    }
    return s;
  }
  case 'COMPLETE_PROLOGUE':{
    // 前传完成，显示生存指南（首次）或直接进入角色创建
    s.screen=s.guideSeen?'creation':'guide';
    s.skills=initSkills();
    // 保留前传结果
    s.prologue.completed=true;
    return s;
  }
  case 'DISMISS_GUIDE':{
    s.guideSeen=true;
    s.screen='creation';
    return s;
  }
  case 'SKIP_PROLOGUE':{
    handleSkipPrologue(s);
    s.screen=s.guideSeen?'creation':'guide';
    s.skills=initSkills();
    return s;
  }
  default:return s;
  }
}

// === COMPONENTS === (TitleScreen extracted to components/TitleScreen.jsx)

// ═══════════════════════════════════════════════════════════
// 前传：入城前夜 — PrologueScreen
// ═══════════════════════════════════════════════════════════
function PrologueScreen({state,dispatch}){
  const prologue=state.prologue;
  if(!prologue)return null;

  const currentEvent=getPrologueEvent(prologue.currentScene);
  const [showHint,setShowHint]=useState(false);
  const [choiceMade,setChoiceMade]=useState(false);
  const [selectedChoice,setSelectedChoice]=useState(null);

  // 当场景变化时重置
  useEffect(()=>{
    setChoiceMade(false);
    setSelectedChoice(null);
    setShowHint(false);
  },[prologue.currentScene]);

  if(!currentEvent)return null;

  const isDawn=currentEvent.id==='prologue_dawn';
  const isCompleted=prologue.completed;

  // 前传完成画面
  if(isCompleted){
    return <div className="prologue-screen prologue-complete">
      <div className="prologue-bg"/>
      <div className="prologue-vignette"/>
      <main className="prologue-content">
        <div className="prologue-kicker">前传档案 / 入城前夜</div>
        <div className="prologue-complete-text">
          <p>档案已建立。</p>
          <p>你害怕的东西，比你先一步抵达。</p>
        </div>
        <div className="prologue-choices">
          <button className="btn btn-primary" onClick={()=>dispatch({type:'COMPLETE_PROLOGUE'})}>
            继续
          </button>
        </div>
      </main>
    </div>;
  }

  const handleChoice=(choiceId)=>{
    setChoiceMade(true);
    setSelectedChoice(choiceId);
    // 延迟dispatch以显示选择反馈
    setTimeout(()=>{
      dispatch({type:'PROLOGUE_CHOICE',choiceId});
    },800);
  };

  const handleSkip=()=>{
    if(confirm('跳过前传？你可以随时从主菜单重新开始。')){
      dispatch({type:'SKIP_PROLOGUE'});
    }
  };

  return <div className="prologue-screen">
    <div className="prologue-bg"/>
    <div className="prologue-vignette"/>
    <div className="prologue-fog-layer fog-1"/>
    <div className="prologue-fog-layer fog-2"/>
    <main className="prologue-content">
      <div className="prologue-kicker">前传 / 入城前夜</div>

      {/* 场景标题 */}
      <h2 className="prologue-scene-title">{currentEvent.name}</h2>

      {/* 叙述文本 */}
      <div className="narrative-block prologue-narrative">
        {currentEvent.description.split('\n').map((line,i)=>
          <p key={i} className="narrative-line">{line}</p>
        )}
      </div>

      {/* 教学提示 */}
      {currentEvent.tutorial_hint&&<div className="prologue-hint" onClick={()=>setShowHint(!showHint)}>
        <span className="prologue-hint-icon">?</span>
        <span className="prologue-hint-text">{currentEvent.tutorial_hint}</span>
      </div>}

      {/* AP显示（如果场景有AP消耗） */}
      {currentEvent.ap_cost&&<div className="prologue-ap">
        <span className="prologue-ap-label">行动点：</span>
        <span className="prologue-ap-value">{state.ap}</span>
      </div>}

      {/* 选择按钮 */}
      {!choiceMade&&<div className="prologue-choices">
        {currentEvent.choices.map(choice=>
          <button key={choice.id}
            className={'action-btn prologue-choice-btn'+(choice.cost?' has-cost':'')}
            onClick={()=>handleChoice(choice.id)}>
            <span className="choice-label">{choice.label}</span>
            {choice.cost&&<span className="choice-cost">AP -{choice.cost}</span>}
          </button>
        )}
      </div>}

      {/* 选择反馈 */}
      {choiceMade&&selectedChoice&&<div className="prologue-choice-feedback">
        <div className="feedback-indicator"/>
      </div>}

      {/* 跳过按钮（非最后一个场景） */}
      {!isDawn&&!isCompleted&&<div className="prologue-skip">
        <button className="btn btn-sm" onClick={handleSkip}>跳过前传</button>
      </div>}

      {/* 底部状态栏 */}
      <div className="prologue-footer">
        <span className="prologue-footer-item">SAN：{state.san}</span>
        <span className="prologue-footer-separator">·</span>
        <span className="prologue-footer-item">场景 {getPrologueSceneOrder().indexOf(prologue.currentScene)+1}/{getPrologueSceneOrder().length}</span>
        {state.clues.length>0&&<>
          <span className="prologue-footer-separator">·</span>
          <span className="prologue-footer-item">线索：{state.clues.length}</span>
        </>}
      </div>
    </main>
  </div>;
}

// ═══════════════════════════════════════════════════════════
// 沃切斯特生存指南 — SurvivalGuide
// 前传结束后首次展示，以日记残页风格呈现核心机制
// ═══════════════════════════════════════════════════════════
function SurvivalGuide({onContinue}){
  const [visibleItems,setVisibleItems]=useState(0);
  useEffect(()=>{
    const items=[
      {id:0,delay:400},{id:1,delay:900},{id:2,delay:1500},
      {id:3,delay:2200},{id:4,delay:3000},{id:5,delay:3900},
      {id:6,delay:4900},{id:7,delay:6000},{id:8,delay:7200},
    ];
    const timers=items.map(it=>setTimeout(()=>setVisibleItems(v=>v+1),it.delay));
    return ()=>timers.forEach(clearTimeout);
  },[]);
  const guideItems=[
    {label:'行动点',icon:'◐',text:'每天有12点行动。移动、探索、对话、使用物品——每一步都在消耗你所剩不多的时间。太阳不会等你。'},
    {label:'理智',icon:'◈',text:'直面不该直面之物，你的理智会被侵蚀。低理智看到的世界……不再是同一个世界。'},
    {label:'食物',icon:'◎',text:'不吃东西会饿死。吃了不该吃的——你不会想知道后果。'},
    {label:'灯',icon:'◇',text:'黑暗中什么都能看到你。手电筒是有电量的。'},
    {label:'信任',icon:'◆',text:'这里的人不会轻易信任外来者。但如果你帮他们，他们会记住你。'},
    {label:'线索',icon:'▣',text:'用笔记本记下一切——尤其是那些你觉得"不可能"的事。线索会连成链，链会指向真相。真相可能不会指向出口。'},
    {label:'探索',icon:'▷',text:'每个区域都有自己的秘密和危险。你不会在第一次探索中就看到全部。'},
    {label:'轮回',icon:'↻',text:'死亡不是终点。你会回来。你会记得一些事情。沃切斯特也会记得你来过。'},
    {label:'安全屋',icon:'⌂',text:'当你精疲力竭时，安全屋是唯一的避风港。但请记住——在沃切斯特，连墙壁都不是完全安全的。'},
  ];
  return <div className="prologue-screen survival-guide-screen">
    <div className="prologue-bg"/>
    <div className="prologue-vignette"/>
    <main className="prologue-content">
      <div className="guide-journal">
        <div className="guide-journal-header">
          <div className="guide-journal-title">生存指南</div>
          <div className="guide-journal-subtitle">—— 从某本旧日记中撕下的一页 ——</div>
        </div>
        <div className="guide-journal-body">
          <div className="guide-journal-intro">到沃切斯特的第三天，我开始记录这些规则。不是为了教谁——是为了让下一个人活得比我久一点。</div>
          <div className="guide-items">
            {guideItems.slice(0,visibleItems).map((item,i)=>
              <div key={item.id} className="guide-item" style={{animationDelay:(i*0.1)+'s'}}>
                <span className="guide-item-icon">{item.icon}</span>
                <div className="guide-item-content">
                  <div className="guide-item-label">{item.label}</div>
                  <div className="guide-item-text">{item.text}</div>
                </div>
              </div>
            )}
          </div>
          {visibleItems>=9&&<div className="guide-journal-closing" style={{animation:'guideFadeIn 1.5s ease-out both'}}>
            <div className="guide-closing-line">钟声会响十三下。数到第十三下的时候，不要抬头。</div>
            <button className="btn btn-primary guide-continue-btn" onClick={onContinue}>我记住了</button>
          </div>}
        </div>
      </div>
    </main>
  </div>;
}

function CharCreation({state,onRoll,onStart,onSetDifficulty,onSetArchetype}){
  const s=state.stats;const rolled=s.STR!==50;
  const diffs=GD.core_loop?.difficulty_levels||{normal:{},hard:{},nightmare:{}};
  const diffInfo={normal:'标准难度，适合初次游玩',hard:'SAN损失×1.5，检定难度-10',nightmare:'SAN损失×2，检定难度-20'};
  const archetypes=GD.systems?.player?.archetypes||[];
  const selectedArch=archetypes.find(a=>a.id===state.archetype);
  return <div className="char-creation">
    <h2>调查员档案</h2>
    <div style={{textAlign:'center',marginBottom:'1rem'}}>
      <div style={{color:'var(--text-dim)',fontSize:'0.8rem',marginBottom:'0.5rem'}}>难度选择</div>
      <div style={{display:'flex',gap:'0.5rem',justifyContent:'center',marginBottom:'1rem'}}>
        {Object.keys(diffs).map(d=><button key={d} className={'btn btn-sm'+(state.difficulty===d?' btn-primary':'')} onClick={()=>onSetDifficulty(d)} title={diffInfo[d]}>{d==='normal'?'普通':d==='hard'?'困难':'噩梦'}</button>)}
      </div>
      <div style={{color:'var(--text-dim)',fontSize:'0.7rem',marginBottom:'1rem'}}>{diffInfo[state.difficulty]}</div>
    </div>
    {archetypes.length>0&&<div style={{marginBottom:'1rem'}}>
      <div style={{color:'var(--text-dim)',fontSize:'0.8rem',marginBottom:'0.5rem',textAlign:'center'}}>职业选择</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.4rem'}}>
        {archetypes.map(a=><button key={a.id} className={'btn btn-sm'+(state.archetype===a.id?' btn-primary':'')} onClick={()=>onSetArchetype(a.id)} title={a.special} style={{textAlign:'left',padding:'0.4rem',fontSize:'0.7rem',lineHeight:'1.4'}}>
          <div style={{fontWeight:'bold',fontSize:'0.8rem'}}>{a.name}</div>
          <div style={{color:'var(--text-dim)'}}>{a.description.slice(0,30)}...</div>
          {a.special&&<div style={{color:'var(--gold)',fontSize:'0.65rem'}}>{a.special.slice(0,20)}</div>}
        </button>)}
      </div>
      {selectedArch&&<div style={{color:'var(--text)',fontSize:'0.75rem',marginTop:'0.4rem',textAlign:'center',lineHeight:'1.6'}}>
        <strong>{selectedArch.name}</strong>：{selectedArch.description}
        <br/><span style={{color:'var(--gold)'}}>{selectedArch.special}</span>
        {selectedArch.stat_modifiers&&<div style={{fontSize:'0.65rem',color:'var(--text-dim)',marginTop:'0.2rem'}}>{Object.entries(selectedArch.stat_modifiers).map(([k,v])=>{const statNames={STR:'力量',CON:'体质',DEX:'敏捷',APP:'外貌',POW:'意志',INT:'智力',SIZ:'体型',EDU:'教育'};return <span key={k} style={{margin:'0 0.3rem'}}>{statNames[k]||k}{v>0?'+':''}{v}</span>;})}</div>}
      </div>}
    </div>}
    <div style={{textAlign:'center',marginBottom:'1rem'}}><button className="btn" onClick={onRoll}>{rolled?'重新掷骰':'掷骰生成属性'}</button></div>
    {rolled&&<>
      <div className="stat-grid">{Object.entries(s).map(([k,v])=>{const mod=selectedArch?.stat_modifiers?.[k]||0;const statNames={STR:'力量',CON:'体质',DEX:'敏捷',APP:'外貌',POW:'意志',INT:'智力',SIZ:'体型',EDU:'教育'};return <div key={k} className="stat-item"><div className="label">{k}<span style={{fontSize:'0.6rem',color:'var(--text-dim)',marginLeft:'0.2rem'}}>{statNames[k]||''}</span></div><div className="value">{v}{mod!==0&&<span style={{fontSize:'0.65rem',color:mod>0?'var(--accent2)':'var(--danger2)'}}>{mod>0?'+':''}{mod}</span>}</div></div>;})}</div>
      <div className="derived-stats"><h3>衍生属性</h3><div className="derived-row">
        <span className="derived-item"><span className="label">HP </span><span className="value">{Math.floor((s.CON+s.SIZ)/10)}</span></span>
        <span className="derived-item"><span className="label"> SAN </span><span className="value">{s.POW}</span></span>
        <span className="derived-item"><span className="label"> MP </span><span className="value">{Math.floor(s.POW/5)}</span></span>
        <span className="derived-item"><span className="label"> 闪避 </span><span className="value">{Math.floor(s.DEX/2)}</span></span>
        <span className="derived-item"><span className="label"> 意志 </span><span className="value">{Math.floor(s.POW/2)}</span></span>
      </div></div>
      <div style={{textAlign:'center'}}><button className="btn btn-primary" onClick={onStart}>开始调查</button></div>
    </>}
  </div>;
}

function StatBar({label,value,max,cls,colorMap}){
  const pct=max>0?(value/max)*100:0;
  const bg=colorMap?(pct>60?colorMap[0]:pct>30?colorMap[1]:colorMap[2]):undefined;
  return <div className={'stat-bar '+(cls||'')}><div className="bar-label"><span className="name">{label}</span><span className="val">{value}/{max}</span></div><div className="bar-track"><div className="bar-fill" style={bg?{width:pct+'%',background:bg}:{width:pct+'%'}}/></div></div>;
}

// Modal — 通用弹窗组件
function Modal({open,onClose,title,children,width}){
  useEffect(()=>{
    if(!open) return;
    const handler=e=>{if(e.key==='Escape')onClose();};
    window.addEventListener('keydown',handler);
    return ()=>window.removeEventListener('keydown',handler);
  },[open,onClose]);
  if(!open) return null;
  return <div className="modal-backdrop" onClick={onClose}>
    <div className="modal-content" style={width?{maxWidth:width}:undefined} onClick={e=>e.stopPropagation()}>
      <div className="modal-header">
        <span className="modal-title">{title}</span>
        <button className="modal-close" onClick={onClose}>×</button>
      </div>
      <div className="modal-body">{children}</div>
    </div>
  </div>;
}

// CollapsibleSection — 档案折叠区
function CollapsibleSection({title,count,defaultOpen,summary,children}){
  const [open,setOpen]=useState(defaultOpen||false);
  return <div className="dossier-section">
    <div className="dossier-section-title" onClick={()=>setOpen(!open)}>
      <span>{title}{count!=null&&' ('+count+')'}{!open&&summary&&<span className="section-summary">{summary}</span>}</span>
      <span className={'chevron'+(open?' open':'')}>▶</span>
    </div>
    <div className={'dossier-section-body'+(open?' expanded':' collapsed')} style={open?{maxHeight:'600px'}:undefined}>
      {children}
    </div>
  </div>;
}

const LeftPanel=memo(function LeftPanel({state}){
  const seal=useMemo(()=>(GD.world?.seal_state_machine||[]).find(s=>s.id===state.sealState)||(GD.module8_time_schedule?.seal_state_machine?.states||[]).find(s=>s.id===state.sealState),[state.sealState]);
  const shStage=useMemo(()=>getSafehouseStage(state.safehouseCorruption,ctx),[state.safehouseCorruption]);
  // 快捷键 I：滚动到随身物件
  useEffect(()=>{
    const handler=()=>{
      const el=document.querySelector('[data-section="inventory"]');
      if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
    };
    window.addEventListener('kbd:showInventory',handler);
    return()=>window.removeEventListener('kbd:showInventory',handler);
  },[]);
  const altSanRestore=useMemo(()=>{
    if(state.currentSafehouse==='main')return 0;
    return (GD.systems?.safehouse?.relocation_rules?.alternative_safehouses||[]).find(a=>a.name===state.currentSafehouse)?.functions?.san_restore||0;
  },[state.currentSafehouse]);
  const playerImage=getPlayerImage(state);
  return <div className="left-panel">
    {playerImage&&<div className="player-portrait-container"><img className="portrait-img player-portrait" src={playerImage} alt="我" onError={e=>{e.currentTarget.style.display='none';}}/></div>}
    {/* 常驻：生存状态 */}
    <div className="dossier-section">
      <div className="dossier-section-title" style={{cursor:'default'}}>调查员状态</div>
      <StatBar label="HP" value={state.hp} max={state.maxHp} cls="hp" colorMap={['var(--accent2)','var(--gold)','var(--danger)']}/>
      <StatBar label="精神" value={state.san} max={state.maxSan} cls={'san'+(state.san<=30?' low':state.san<=50?' mid':'')} colorMap={['var(--san-high)','var(--san-mid)','var(--san-low)']}/>
      <StatBar label="行动力" value={state.ap} max={state.maxAp} cls="ap"/>
      <StatBar label="食物" value={state.food||0} max={state.maxFood||5} cls="food"/>
      <div style={{fontSize:'0.7rem',padding:'0.1rem 0',display:'flex',justifyContent:'space-between'}}><span style={{color:'var(--text-dim)'}}>金钱</span><span style={{color:'var(--gold)',fontFamily:'JetBrains Mono,monospace'}}>{state.money||0}</span></div>
    </div>
    {/* 折叠：身体记录 */}
    <CollapsibleSection title="身体记录" defaultOpen={false}>
      <div className="base-stats">{Object.entries(state.stats).map(([k,v])=><div key={k} className="base-stat"><div className="label">{k}</div><div className="val">{v}</div></div>)}</div>
    </CollapsibleSection>
    {/* 折叠：调查技能 */}
    {(()=>{const top=Object.entries(state.skills).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1])[0];return <CollapsibleSection title="调查技能" defaultOpen={false} summary={top?top[0]:''}>
      {Object.entries(state.skills).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([k,v])=><div key={k} className="skill-item"><span className="name">{k}</span><span className="val">{v}%</span></div>)}
    </CollapsibleSection>;})()}
    {/* 折叠：随身物件 */}
    <div data-section="inventory"><CollapsibleSection title="随身物件" count={state.inventory.length} defaultOpen={true}>
      {state.inventory.map((item,i)=><div key={i} className="item-entry"><span className="name">{item.name}</span>{item.uses>0&&<span className="uses"> ×{item.uses}</span>}{item.uses===-1&&<span className="uses"> ∞</span>}</div>)}
    </CollapsibleSection></div>
    {/* 折叠：已知线索 */}
    {state.clues.length>0&&<CollapsibleSection title="已知线索" count={state.clues.length} defaultOpen={true} summary={(()=>{const _lc=state.clues[state.clues.length-1];return(typeof _lc==='object'?_lc.name:resolveClueName(_lc||'')).slice(0,12)||'';})()}>
      {state.clues.slice(-5).map((c,i)=><div key={i} className="clue-entry">· {typeof c==='object'?c.name:resolveClueName(c)}</div>)}
    </CollapsibleSection>}
    {/* 折叠：封印记录 */}
    {seal&&<CollapsibleSection title="封印记录" defaultOpen={false} summary={seal?.name||''}>
      <div className={'seal-status '+(state.sealState||'intact')}><div className="state">{seal.name}</div><div style={{fontSize:'0.62rem',color:'var(--text-dim)'}}>{(seal.description||'').slice(0,40)}...</div></div>
    </CollapsibleSection>}
    {/* 折叠：避难所状态 */}
    <CollapsibleSection title="避难所状态" summary={shStage.name}>
      <div className={'safehouse-info s'+shStage.stage}><div className="stage-name">{shStage.name}{state.currentSafehouse!=='main'?' · '+state.currentSafehouse:''}</div><div style={{fontSize:'0.62rem',color:'var(--text-dim)'}}>恢复：{shStage.available_functions?.san_recovery||0}{altSanRestore>0?' +'+altSanRestore:''} | 污染：{state.safehouseCorruption}%</div></div>
    </CollapsibleSection>
    {/* 折叠：环境记录 */}
    <CollapsibleSection title="环境记录" defaultOpen={false} summary={state.weather}>
      <div className="weather-info">天气：{state.weather} | 光源：Lv.{state.lightLevel||0}</div>
    </CollapsibleSection>
  </div>;
})

const EVENT_TYPE_LABELS={opening_cut:'序章',area_event:'区域事件',mythos:'神秘事件',resource:'资源事件',humanity:'人性事件',meta:'隐秘事件',silent:'静默事件',prologue:'前传',area_deep:'深层探索',npc_cross:'NPC交错',loop_locked:'轮回锁定',clue:'线索',ending:'结局',madness_immunity:'疯狂免疫',identify_false_clue:'辨别伪证',mechanism:'机关',horror:'恐怖',investigation:'调查',minor_abnormal:'轻微异常',normal:'普通',bad:'负面',good:'正面',hidden:'隐藏',consumable:'消耗品',key_item:'关键物品',add_clue:'线索获取',add_flag:'标记',modify_event_weight:'事件权重',modify_npc_trust:'信任变动',modify_resource:'资源变动'};
const NarrativeBlock=memo(function NarrativeBlock({block}){
  if(!block)return null;
  const isSanRecovery=block.type==='san-recovery';
  const mythosTypes=['超自然遭遇','怪物遭遇','神秘事件','mythos'];
  const isMythos=block.eventType&&mythosTypes.includes(block.eventType);
  const eventTypeLabel=block.eventType?(EVENT_TYPE_LABELS[block.eventType]||block.eventType):null;
  return <div className={'narrative-block'+(block.type==='system'?' system':'')+(block.isEffect?' system':'')+(block.isSpecial?' system':'')+(block.type==='death'?' death-narrative':'')+(isSanRecovery?' san-recovery':'')+(isMythos?' mythos-text':'')}>
    {block.locationName&&<div className="location-name">📍 {block.locationName}</div>}
    {block.eventTitle&&<div className="event-title">{block._ugcAuthor?<span className="ugc-badge" title={'MOD by '+block._ugcAuthor}>🏷️ [MOD]</span>:null}{block.eventTitle}</div>}
    {block.eventType&&<div className={'event-type '+block.eventType}>{eventTypeLabel}</div>}
    {block.imageSrc&&<img className="narrative-image" src={block.imageSrc} alt={block.imageAlt||block.eventTitle||block.locationName||'事件插图'} onError={e=>{e.currentTarget.style.display='none';}}/>}
    <div className="narrative-text">{block.text}</div>
    {block.madness&&<div className="madness-effect">⚠ {block.madness.name}：{block.madness.description}</div>}
  </div>;
})

function NPCDialog({npc,trust,layer,dispatch,state}){
  const [show,setShow]=useState(false);
  const [confirmAction,setConfirmAction]=useState(null);
  // 对话分组折叠状态：交谈/帮助 默认展开，特殊 默认折叠
  const [collapsedGroups,setCollapsedGroups]=useState({talk:false,help:false,special:true});
  const toggleGroup=(g)=>setCollapsedGroups(prev=>({...prev,[g]:!prev[g]}));
  const ns=state?.npcStates?.[npc.name]||{};
  const npcImage=getNpcImage(npc.name,state?.npcStates);
  const postKill=state?.pendingNpc?.postKill;
  if(postKill){
    return <div className="narrative-block npc-dialogue"><div className="skill-check" style={{borderLeft:'2px solid var(--danger)'}}>
      <div style={{color:'var(--danger2)',fontSize:'0.9rem',marginBottom:'0.3rem'}}>{npc.name} 已死</div>
      <div style={{color:'var(--text-dim)',fontSize:'0.8rem',lineHeight:'1.7',marginBottom:'0.6rem'}}>尸体在你面前。你需要决定接下来怎么做。</div>
      <div style={{display:'flex',flexDirection:'column',gap:'0.3rem'}}>
        <button className="btn btn-sm" onClick={()=>dispatch({type:'NPC_RESPONSE',choice:'post_kill_hide'})}>隐藏尸体<span className="cost">1 AP 痕迹+1</span></button>
        <button className="btn btn-sm" style={{color:'var(--danger2)'}} onClick={()=>dispatch({type:'NPC_RESPONSE',choice:'post_kill_cannibal'})}>食用<span className="cost">食物+2 SAN大幅下降</span></button>
        <button className="btn btn-sm" onClick={()=>dispatch({type:'NPC_RESPONSE',choice:'post_kill_leave'})}>离开现场</button>
      </div>
    </div></div>;
  }
  // 检查是否有任何特殊选项可显示
  const hasSpecial=trust>=3||trust>=2||ns.corrupted&&trust>=2;
  const doResponse=(choice)=>{dispatch({type:'NPC_RESPONSE',choice});setShow(false)};
  return <div className="narrative-block npc-dialogue"><div className="skill-check">
    {npcImage&&<img className="npc-portrait" src={npcImage} alt={npc.name+'立绘'} onError={e=>{e.currentTarget.style.display='none';}}/>}
    <div style={{color:'var(--cyan)',fontSize:'0.9rem',marginBottom:'0.3rem'}}>与 {npc.name} 交谈</div>
    <div style={{fontSize:'0.7rem',color:'var(--text-dim)',marginBottom:'0.3rem'}}>{npc.role}</div>
    <div style={{fontSize:'0.75rem',color:'var(--gold)',marginBottom:'0.3rem',letterSpacing:'0.1em'}}>信任：{Array.from({length:5},(_, i)=><span key={i} style={{color:i<trust?'var(--gold)':'var(--border2)',textShadow:i<trust?'0 0 4px rgba(184,150,58,0.3)':'none'}}>★</span>)}</div>
    {ns.corrupted&&<div style={{fontSize:'0.7rem',color:'var(--danger2)',marginBottom:'0.3rem'}}>⚠ 该NPC已被腐蚀</div>}
    {ns.fled&&<div style={{fontSize:'0.7rem',color:'var(--danger2)',marginBottom:'0.3rem'}}>⚠ 该NPC已逃走</div>}
    {layer&&<div style={{color:'var(--text)',lineHeight:'1.8',marginBottom:'0.5rem',fontSize:'0.85rem'}}>{ns.corrupted?'（'+npc.name+'的状态不对，说话含混不清。）':layer.dialogue}</div>}
    {layer?.hint&&!ns.corrupted&&<div style={{fontSize:'0.7rem',color:'var(--gold)',fontStyle:'italic',marginBottom:'0.5rem'}}>{layer.hint}</div>}
    {!show?<button className="btn btn-sm" onClick={()=>setShow(true)}>回应</button>
    :<div>
      {/* 确认操作（攻击/背叛） */}
      {confirmAction&&<div className="npc-confirm">
        <div style={{color:'var(--danger2)',fontSize:'0.8rem',marginBottom:'0.4rem'}}>⚠ 确定要{confirmAction==='attack'?'攻击':'背叛'}吗？此操作不可撤销。</div>
        <div style={{display:'flex',gap:'0.4rem'}}>
          <button className="btn btn-sm btn-danger" onClick={()=>{dispatch({type:'NPC_RESPONSE',choice:confirmAction});setShow(false);setConfirmAction(null);}}>确认</button>
          <button className="btn btn-sm" onClick={()=>setConfirmAction(null)}>取消</button>
        </div>
      </div>}
      {/* 交谈组 */}
      <div className="npc-dialog-group">
        <div className="npc-dialog-group-title" onClick={()=>toggleGroup('talk')}>
          <span className={'chevron'+(collapsedGroups.talk?'':' open')}>▶</span> 交谈
        </div>
        {!collapsedGroups.talk&&<div className="npc-dialog-group-body">
          {trust<5&&(()=>{const already=state?._dailyTrustGains?.[npc.name];const gate=checkTrustGate(trust+1,state,npc.name);if(already)return <div style={{fontSize:'0.7rem',color:'var(--text-dim)',padding:'0.2rem 0'}}>⏳ 今日已提升信赖（{already==='talk'?'对话':'食物'}）</div>;if(gate)return <div style={{fontSize:'0.7rem',color:'var(--text-dim)',padding:'0.2rem 0',lineHeight:'1.6'}}>🔒 {trust<2?'尝试建立信任':'加深了解'}（1 AP 信任+1）<br/><span style={{fontSize:'0.62rem',color:'var(--gold)'}}>{gate}</span></div>;return <button className="btn btn-sm" onClick={()=>doResponse('trust_up')}>{trust<2?'尝试建立信任':'加深了解'}<span className="cost">1 AP 信任+1</span></button>;})()}
          <button className="btn btn-sm" onClick={()=>doResponse('silence')}>保持沉默</button>
        </div>}
      </div>
      {/* 帮助组 */}
      <div className="npc-dialog-group">
        <div className="npc-dialog-group-title" onClick={()=>toggleGroup('help')}>
          <span className={'chevron'+(collapsedGroups.help?'':' open')}>▶</span> 帮助
        </div>
        {!collapsedGroups.help&&<div className="npc-dialog-group-body">
          {trust>=1&&npc.secrets&&trust<=npc.secrets.length&&<button className="btn btn-sm" onClick={()=>doResponse('get_item')}>询问更多信息</button>}
          {(()=>{const already=state?._dailyTrustGains?.[npc.name];const curTrust=state?.npcTrust?.[npc.name]||0;const gate=trust<5?checkTrustGate(curTrust+1,state,npc.name):'max';if(already)return null;if(trust>=5)return null;return <button className="btn btn-sm" onClick={()=>doResponse('share_food')} disabled={(state?.food||0)<1||(state?.ap||0)<1||!!gate} title={gate||''}>分享食物{gate?<span className="cost">🔒 {gate.slice(0,15)}…</span>:<span className="cost">1 AP 食物-1 信任+1</span>}</button>;})()}
          {ns.corrupted&&trust>=4&&<button className="btn btn-sm" style={{color:'var(--gold)'}} onClick={()=>doResponse('redeem')}>尝试救赎</button>}
        </div>}
      </div>
      {/* 特殊组（默认折叠） */}
      {hasSpecial&&<div className="npc-dialog-group npc-dialog-group--danger">
        <div className="npc-dialog-group-title" onClick={()=>toggleGroup('special')}>
          <span className={'chevron'+(collapsedGroups.special?'':' open')}>▶</span> 特殊
        </div>
        {!collapsedGroups.special&&<div className="npc-dialog-group-body">
          {trust>=3&&<button className="btn btn-sm" style={{color:'var(--text-dim)',fontSize:'0.72rem'}} onClick={()=>doResponse('preach')}>⚠ 传教（2 AP 神秘学检定）</button>}
          {trust>=2&&<button className="btn btn-sm" style={{color:'var(--danger2)',fontSize:'0.72rem'}} onClick={()=>doResponse('incite')}>⚠ 陷害（2 AP 话术检定）</button>}
          {trust>=2&&<button className="btn btn-sm" style={{color:'var(--text-dim)',fontSize:'0.72rem'}} onClick={()=>doResponse('exploit_npc')}>⚠ 利用（1 AP 信任-2）</button>}
          {trust>=3&&<button className="btn btn-sm" style={{color:'var(--danger2)',fontSize:'0.72rem'}} onClick={()=>setConfirmAction('betray_npc')}>⚠ 背叛（1 AP 信任清零）</button>}
          {ns.corrupted&&trust>=2&&<button className="btn btn-sm" style={{color:'var(--danger2)',fontSize:'0.72rem'}} onClick={()=>doResponse('intimacy')}>⚠ 靠近（2 AP SAN-）</button>}
          <button className="btn btn-sm btn-danger" style={{fontSize:'0.72rem'}} onClick={()=>setConfirmAction('attack')}>⚠ 攻击（2 AP 格斗检定）</button>
        </div>}
      </div>}
      {/* 离开（始终可见） */}
      <div style={{marginTop:'0.35rem',borderTop:'1px solid rgba(42,42,48,0.2)',paddingTop:'0.3rem'}}>
        <button className="btn btn-sm" onClick={()=>doResponse('leave')}>告别</button>
      </div>
    </div>}
  </div></div>;
}

const CenterPanel=memo(function CenterPanel({state,dispatch}){
  const ref=useRef(null);
  const transitionTimer=useRef(null);
  const [forbiddenOpen,setForbiddenOpen]=useState(false);
  const [logOpen,setLogOpen]=useState(false);
  // 操作分组折叠状态
  const [collapsedGroups,setCollapsedGroups]=useState({});
  const toggleActionGroup=(g)=>setCollapsedGroups(prev=>({...prev,[g]:!prev[g]}));
  useEffect(()=>{if(ref.current)ref.current.scrollTop=ref.current.scrollHeight},[state.narrative.length]);
  // Keyboard shortcuts: 1-9, Space, Enter, M, I, J
  useEffect(()=>{
    const isPending=state.pendingEvent?.rolled||state.pendingNpc||state.pendingGamble||state.pendingChoice||state.ending;
    const handler=(e)=>{
      if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;
      const key=e.key;
      // 1-9: select action button (always active)
      if(key>='1'&&key<='9'){
        const idx=parseInt(key)-1;
        const btns=document.querySelectorAll('.action-area .action-btn:not(:disabled)');
        if(btns[idx]){btns[idx].click();e.preventDefault();}
        return;
      }
      if(isPending)return;
      // Space/Enter: click first enabled action
      if(key===' '||key==='Enter'){
        const btn=document.querySelector('.action-area .action-btn:not(:disabled)');
        if(btn){btn.click();e.preventDefault();}
        return;
      }
      // M: toggle map tab
      if(key==='m'||key==='M'){window.dispatchEvent(new Event('kbd:toggleMap'));return;}
      // I: scroll to inventory in left panel
      if(key==='i'||key==='I'){window.dispatchEvent(new Event('kbd:showInventory'));return;}
      // J: switch to clues tab
      if(key==='j'||key==='J'){window.dispatchEvent(new Event('kbd:showClues'));return;}
    };
    window.addEventListener('keydown',handler);
    return ()=>window.removeEventListener('keydown',handler);
  },[state.ap,state.currentArea,state.day,state.pendingEvent,state.pendingNpc,state.pendingGamble,state.pendingChoice,state.ending,dispatch]);
  // Auto-clear transition overlays after animation
  useEffect(()=>{
    if(!state.transition)return;
    const dur={move:800,rest:1800,'san-loss':500,chapter:2500}[state.transition]||800;
    if(transitionTimer.current)clearTimeout(transitionTimer.current);
    transitionTimer.current=setTimeout(()=>dispatch({type:'CLEAR_TRANSITION'}),dur);
    return ()=>{if(transitionTimer.current)clearTimeout(transitionTimer.current);};
  },[state.transition,dispatch]);
  const conn=useMemo(()=>getConnectedAreas(state.currentArea,ctx),[state.currentArea]);
  const npcs=useMemo(()=>getNpcsHere(state),[state.day,state.currentArea,state.npcStates,state.npcTrust]);
  const areas=GD.areas||GD.module2_areas||[];
  const itemUseInfo=useMemo(()=>{const m={};(GD.items||[]).forEach(def=>{if(def.use_hint)m[def.name]=def.use_hint;});return m;},[]);
  // P3: perception levels — respect accessibility
  const percCls=useMemo(()=>{
    const raw=state.accessibilityOptions?.visual_distortion==='off'?{focus:0,edge:0,audio:0,input:0,text:0}:getPerceptionLevels(state);
    return (raw.text>0?' perception-text-'+Math.min(3,raw.text):'')
      +(raw.focus>1?' perception-focus-'+Math.min(3,raw.focus):'')
      +(raw.edge>0?' perception-edge-'+Math.min(3,raw.edge):'');
  },[state.san,state.loopCount,state.safehouseCorruption,state.currentArea,state.accessibilityOptions?.visual_distortion]);
  // audio perception → volume modulation (safe, no side effect on render)
  const perceptionAudio=state.accessibilityOptions?.visual_distortion==='off'?0:getPerceptionLevels(state).audio;
  try{if(perceptionAudio>=2){audioManager._volumeScale=0.6+perceptionAudio*0.15;}else{audioManager._volumeScale=1;}}catch(e){}

  return <div className="center-panel">
    {state.transition&&<div className={'transition-overlay transition-'+state.transition}>
      {state.transition==='rest'&&<div className="transition-day">第 {state.day} 天</div>}
      {state.transition==='chapter'&&<div className="transition-chapter-content"><div className="transition-chapter-label">— 章节 —</div><div className="transition-chapter-name">{(()=>{const ch=getChapterForDay(state.day,ctx);return ch?.name||'未知章节';})()}</div><div className="transition-chapter-day">第 {state.day} 天</div></div>}
    </div>}
    <div className={'narrative-area'+percCls} ref={ref}>
      {state.narrative.map(b=><NarrativeBlock key={b.id} block={b}/>)}
      {state.pendingEvent&&!state.pendingEvent.rolled&&state.pendingEvent.effects?.skill_check&&<div className="narrative-block"><div className="skill-check"><div className="check-title">技能检定：{state.pendingEvent.effects.skill_check.skill}（阈值 {state.pendingEvent.effects.skill_check.threshold||50}）</div><button className="btn btn-sm" onClick={()=>dispatch({type:'DO_SKILL_CHECK'})} style={{marginTop:'0.3rem'}}>掷骰 (d100)</button></div></div>}
      {state.pendingEvent?.rolled&&<div className="narrative-block"><div className="skill-check"><div className="roll-result"><div className={'roll-num '+(state.pendingEvent.result==='success'?'success':'fail')}>{state.pendingEvent.roll} / 技能{state.pendingEvent.playerSkill} / 难度{state.pendingEvent.threshold}</div><div className={state.pendingEvent.result==='success'?'result-success':'result-fail'}>{state.pendingEvent.result==='success'?'成功！':'失败！'}</div></div><button className="btn btn-sm" onClick={()=>dispatch({type:'DISMISS_PENDING'})} style={{marginTop:'0.3rem'}}>继续</button></div></div>}
      {state.pendingNpc&&<NPCDialog npc={state.pendingNpc.npc} trust={state.pendingNpc.trust} layer={state.pendingNpc.layer} dispatch={dispatch} state={state}/>}
      {state.pendingGamble&&<div className="narrative-block"><div className="skill-check">
        <div className="check-title" style={{color:'var(--danger2)'}}>深入探究？</div>
        <div style={{fontSize:'0.8rem',color:'var(--text)',lineHeight:'1.6',margin:'0.5rem 0'}}>某些东西一旦看到就无法忘记。你可以选择就此收手，或者更深入地观察——代价未知。</div>
        <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap'}}>
          {state.pendingGamble.options.map(opt=>{
            const label=opt.id==='safe'?getOptionText('gamble_safe',state.san)||opt.label:getOptionText('gamble_deep',state.san)||opt.label;
            const risk=opt.cost?'（SAN损失 1d6）':'（安全）';
            return <button key={opt.id} className={'btn btn-sm'+(opt.id==='deep_investigate'?' btn-danger':'')} onClick={()=>dispatch({type:'GAMBLE_CHOICE',choiceId:opt.id})}>{label}<span className="cost">{risk}</span></button>;
          })}
        </div>
      </div></div>}
      {state.pendingChoice&&<div className="narrative-block"><div className="skill-check">
        <div className="check-title">选择</div>
        <div style={{display:'flex',flexDirection:'column',gap:'0.3rem',marginTop:'0.3rem'}}>
          {state.pendingChoice.choices.map((ch,i)=><button key={i} className="btn btn-sm" onClick={()=>dispatch({type:'CHOICE_SELECT',choiceIdx:i})}>{ch.label}</button>)}
        </div>
      </div></div>}
    </div>
    {!state.pendingEvent?.rolled&&!state.pendingNpc&&!state.pendingGamble&&!state.pendingChoice&&!state.ending&&<div className="action-area">
      {(()=>{window.__n=0;return null;})()}
      {(() => {
        const ts=state.tutorialSeen||{};
        const hints=[
          {key:'first_explore',text:'探索区域可能发现线索或遭遇异常。需要2AP。'},
          {key:'first_move',text:'移动到相邻区域会消耗1AP。试试和NPC交谈获取情报。'},
          {key:'first_talk',text:'和NPC交谈可以获取情报，建立信任会解锁更多内容。'},
          {key:'first_clue',text:'你发现了一条线索！线索会保存在右侧面板。'},
          {key:'first_rest',text:'结束一天会消耗食物恢复AP和SAN。注意食物管理。'},
        ];
        const hint=hints.find(h=>!ts[h.key]);
        if(!hint)return null;
        return <div className="tutorial-hint" key={hint.key}>{hint.text}</div>;
      })()}

      {/* A. 调查行动 */}
      <div className="action-group">
        <div className="action-group-title" onClick={()=>toggleActionGroup('investigate')}><span className={'chevron'+(collapsedGroups.investigate?'':' open')}>▶</span><span className="action-group-icon">🔍</span>调查行动</div>
        <div className={'action-group-grid'+(collapsedGroups.investigate?' collapsed':'')}>
          <button className="action-btn primary-action" onClick={()=>dispatch({type:'EXPLORE'})} disabled={state.ap<2}><span className="btn-hint">{(()=>{window.__n=(window.__n||0)+1;return window.__n;})()}</span><span className="action-icon">🔍</span>{getOptionText('investigate_sound',state.san)||'探索区域'}<span className="cost">2 AP</span></button>
          {conn.map(aid=>{const a=areas.find(ar=>ar.id===aid);if(!a)return null;const unlocked=isAreaUnlocked(a,state);const isRumor=a.chapter_1_role==='rumor_only'&&!unlocked;window.__n=(window.__n||0)+1;const n=window.__n;return <button key={aid} className="action-btn primary-action" onClick={()=>dispatch({type:'MOVE',areaId:aid})} disabled={state.ap<1||!unlocked}><span className="btn-hint">{n}</span><span className="action-icon">{isRumor?'?':'👣'}</span>{isRumor?'听说：':''}{a.name}{!unlocked?' [锁定]':''}<span className="cost">{!unlocked?'需要线索':'1 AP'}</span></button>;})}
          {npcs.map(npc=>{window.__n=(window.__n||0)+1;const n=window.__n;return <button key={npc.name} className="action-btn" onClick={()=>dispatch({type:'TALK_NPC',npc:npc})} disabled={state.ap<1}><span className="btn-hint">{n}</span><span className="action-icon">💬</span>{npc.name}<span className="cost">1 AP</span></button>;})}
        </div>
      </div>

      {/* B. 随身物件 */}
      {state.inventory.filter(i=>i.uses!==0).some(it=>itemUseInfo[it.name])&&<div className="action-group">
        <div className="action-group-title" onClick={()=>toggleActionGroup('items')}><span className={'chevron'+(collapsedGroups.items?'':' open')}>▶</span><span className="action-group-icon">🎒</span>随身物件</div>
        <div className={'action-group-grid'+(collapsedGroups.items?' collapsed':'')}>
          {state.inventory.filter(i=>i.uses!==0).map((it,i)=>{
            const label=itemUseInfo[it.name];if(!label)return null;
            window.__n=(window.__n||0)+1;const n=window.__n;
            return <button key={i} className="action-btn" onClick={()=>dispatch({type:'USE_ITEM',item:it})}><span className="btn-hint">{n}</span><span className="action-icon">🧪</span>{it.name}<span className="cost">{label}{it.uses>0?' ×'+it.uses:''}</span></button>;
          })}
        </div>
      </div>}

      {/* C. 日常行动 */}
      <div className="action-group">
        <div className="action-group-title" onClick={()=>toggleActionGroup('daily')}><span className={'chevron'+(collapsedGroups.daily?'':' open')}>▶</span><span className="action-group-icon">☀️</span>日常行动</div>
        <div className={'action-group-grid'+(collapsedGroups.daily?' collapsed':'')}>
          {getAvailableSafehouses(state).filter(sh=>state.currentSafehouse!==sh.name).map(sh=>{window.__n=(window.__n||0)+1;const n=window.__n;return <button key={sh.name} className="action-btn" onClick={()=>dispatch({type:'SWITCH_SAFEHOUSE',safehouse:sh.name})}><span className="btn-hint">{n}</span><span className="action-icon">🏠</span>搬到{sh.name}<span className="cost">恢复+{sh.functions?.san_restore||0}</span></button>;})}
          {state.currentSafehouse!=='main'&&(()=>{window.__n=(window.__n||0)+1;const n=window.__n;return <button className="action-btn" onClick={()=>dispatch({type:'SWITCH_SAFEHOUSE',safehouse:'main'})}><span className="btn-hint">{n}</span><span className="action-icon">🍺</span>回酒馆<span className="cost">返回原处</span></button>;})()}
          {(()=>{window.__n=(window.__n||0)+1;const n=window.__n;return <button className="action-btn" onClick={()=>dispatch({type:'WORK'})} disabled={state.ap<2}><span className="btn-hint">{n}</span><span className="action-icon">💰</span>打工挣钱<span className="cost">2 AP</span></button>;})()}
          {state.currentArea==='town_center'&&(()=>{window.__n=(window.__n||0)+1;const n=window.__n;const canBuy=state.ap>=1&&(state.money||0)>=3&&(state.food||0)<(state.maxFood||5);return <button className="action-btn" onClick={()=>dispatch({type:'BUY_FOOD'})} disabled={!canBuy}><span className="btn-hint">{n}</span><span className="action-icon">🛒</span>杂货店买食物<span className="cost">1 AP · 3金钱</span></button>;})()}
          {(()=>{window.__n=(window.__n||0)+1;const n=window.__n;return <button className="action-btn" onClick={()=>dispatch({type:'REST'})}><span className="btn-hint">{n}</span><span className="action-icon">🏕️</span>{getOptionText('rest_at_safehouse',state.san)||'结束今日'}<span className="cost">休息恢复</span></button>;})()}
        </div>
      </div>

      {/* D. 禁忌批注 */}
      {(()=>{
        const dangerActions=[];
        if(['town_center','harbor_district'].includes(state.currentArea))dangerActions.push({type:'DESECRATE',label:'亵渎圣地',cost:'2 AP',costAp:2});
        if(['catacombs_entrance','deep_catacombs','ruins_of_yith'].includes(state.currentArea))dangerActions.push({type:'BREAK_SEAL',label:'破坏封印',cost:'3 AP',costAp:3});
        if(state.san<60||state.pollution>0.2)dangerActions.push({type:'SELF_HARM',label:'自残仪式',cost:'2 AP',costAp:2});
        if((state.behaviorTracking.cult_leader_score||0)>=1||(state.mythosLevel||0)>=2)dangerActions.push({type:'SPREAD_PROPHECY',label:'散布预言',cost:'2 AP',costAp:2});
        if(state.clues&&state.clues.length>=2)dangerActions.push({type:'CONSUME_ARCHIVE',label:'吞噬档案',cost:'2 AP',costAp:2});
        if((state.mythosLevel||0)>=2)dangerActions.push({type:'SELF_SACRIFICE',label:'自我献祭',cost:'3 AP',costAp:3});
        if(dangerActions.length===0)return null;
        return <div className={'action-group forbidden'+(forbiddenOpen?' open':'')}>
          <button type="button" className="forbidden-toggle" onClick={()=>{setForbiddenOpen(v=>{audioManager.playUI(v?'panel_close':'panel_open');return !v;});}}>
            <span className="forbidden-mark">{forbiddenOpen?'▾':'▸'}</span>
            <span className="forbidden-title">{forbiddenOpen?'禁忌批注':'不要翻开这一页'}</span>
            <span className="forbidden-count">{dangerActions.length}</span>
          </button>
          {forbiddenOpen&&<div className="forbidden-actions">
            <div className="forbidden-warning">这些选择会留下痕迹。不是所有痕迹都会消失在下一次轮回里。</div>
            <div className="action-group-grid forbidden-grid">
              {dangerActions.map(da=>{window.__n=(window.__n||0)+1;const n=window.__n;return <button key={da.type} className="action-btn forbidden-btn" onClick={()=>dispatch({type:da.type})} disabled={state.ap<da.costAp}><span className="btn-hint">{n}</span><span className="forbidden-bullet">※</span>{da.label}<span className="cost">{da.cost}</span></button>;})}
            </div>
          </div>}
        </div>;
      })()}
      <div className="keyboard-hint">快捷键：1-9选择 · Space确认 · M地图 · I物品 · J线索</div>
    </div>}
    {state.eventLog.length>0&&<div className="event-log">
      <div className="event-log-header" onClick={()=>setLogOpen(v=>!v)}>
        <span className="event-log-toggle">{logOpen?'▾':'▸'}</span>
        <span>事件日志 ({state.eventLog.length})</span>
      </div>
      {logOpen&&<div className="event-log-body">{state.eventLog.slice(-8).map((l,i)=><div key={i} className="log-entry"><span className="log-day">[Day {l.day}]</span> {l.text}</div>)}</div>}
    </div>}
  </div>;
})

const MAP_LAYOUT={
  town_center:{x:48,y:30,label:'镇中心'},
  voxchester_manor:{x:72,y:22,label:'庄园'},
  harbor_district:{x:32,y:52,label:'码头'},
  lighthouse:{x:14,y:72,label:'灯塔'},
  catacombs_entrance:{x:58,y:58,label:'墓穴入口'},
  deep_catacombs:{x:62,y:78,label:'深层墓穴'},
  whispering_forest:{x:82,y:54,label:'低语森林'},
  forbidden_grove:{x:88,y:76,label:'禁忌林地'},
  ruins_of_yith:{x:48,y:90,label:'伊斯遗迹'},
};

// NOTE: MAP_EDGES 需与各区域 connected_areas 保持一致，避免"地图显示能走但实际不能走"
const MAP_EDGES=[
  ['town_center','voxchester_manor'],
  ['town_center','harbor_district'],
  ['harbor_district','lighthouse'],
  ['town_center','catacombs_entrance'],
  ['catacombs_entrance','deep_catacombs'],
  ['town_center','whispering_forest'],
  ['whispering_forest','forbidden_grove'],
  ['deep_catacombs','ruins_of_yith'],
  // 以下 2 条为 connected_areas 中存在但此前遗漏的边
  ['voxchester_manor','catacombs_entrance'],
  ['whispering_forest','ruins_of_yith'],
];

function CitySketchMap({areas,state,dispatch,conn}){
  const [fullscreen,setFullscreen]=useState(false);
  const areaById=useMemo(()=>{
    const map={};
    areas.forEach(a=>{map[a.id]=a;});
    return map;
  },[areas]);
  const canShowNode=(area)=>{
    if(!area)return false;
    const visited=state.visitedAreas.includes(area.id);
    const unlocked=isAreaUnlocked(area,state);
    const rumor=area.chapter_1_role==='rumor_only';
    return visited||unlocked||rumor;
  };
  // 区域分区标签 — 帮助玩家理解空间关系
  const MAP_ZONES=[
    {label:'镇 区',x:42,y:16,areas:['town_center','voxchester_manor']},
    {label:'海 岸',x:16,y:42,areas:['harbor_district','lighthouse']},
    {label:'地 下',x:52,y:68,areas:['catacombs_entrance','deep_catacombs']},
    {label:'森 林',x:78,y:42,areas:['whispering_forest','forbidden_grove']},
    {label:'遗 迹',x:40,y:84,areas:['ruins_of_yith']},
  ];
  // 边的状态判定：active(当前可达) / known(可见但非当前) / faint(锁/传闻)
  const getEdgeState=(from,to)=>{
    const fromVis=canShowNode(areaById[from]);
    const toVis=canShowNode(areaById[to]);
    if(!fromVis||!toVis)return 'hidden';
    const fromReach=conn.includes(from)||state.currentArea===from;
    const toReach=conn.includes(to)||state.currentArea===to;
    const currentArea=state.currentArea;
    // 当前区域到可达区域 = active
    if((from===currentArea&&conn.includes(to))||(to===currentArea&&conn.includes(from)))return 'active';
    // 两端都已访问/解锁 = known
    const fromUnlocked=isAreaUnlocked(areaById[from],state)||state.visitedAreas.includes(from);
    const toUnlocked=isAreaUnlocked(areaById[to],state)||state.visitedAreas.includes(to);
    if(fromUnlocked&&toUnlocked)return 'known';
    return 'faint';
  };
  const renderNode=(areaId)=>{
    const area=areaById[areaId];
    const pos=MAP_LAYOUT[areaId];
    if(!area||!pos||!canShowNode(area))return null;
    const visited=state.visitedAreas.includes(area.id);
    const reachable=conn.includes(area.id);
    const unlocked=isAreaUnlocked(area,state);
    const locked=!unlocked&&!visited;
    const rumor=area.chapter_1_role==='rumor_only'&&!visited;
    const current=state.currentArea===area.id;
    const displayName=visited?getAreaDisplayName(area,state):rumor?area.early_game_alias||'???':'???';
    const cls=['sketch-map-node',current?'current':'',visited?'visited':'',reachable?'reachable':'',locked?'locked':'',rumor?'rumor':''].filter(Boolean).join(' ');
    return <button key={area.id} className={cls} style={{left:pos.x+'%',top:pos.y+'%'}} disabled={!reachable||!unlocked||state.ap<1} onClick={()=>dispatch({type:'MOVE',areaId:area.id})} title={area.name}>
      <span className="sketch-map-pin"/>
      <span className="sketch-map-node-name">{displayName}</span>
      <span className={'sketch-map-danger d'+area.danger_level}>{'★'.repeat(Math.max(0,area.danger_level))}</span>
    </button>;
  };
  // 当前区域名称 & 可前往列表（地图下方辅助信息）
  const currentAreaObj=areaById[state.currentArea];
  const currentName=currentAreaObj?getAreaDisplayName(currentAreaObj,state):'???';
  const reachableNames=conn.map(id=>{
    const a=areaById[id];
    if(!a)return null;
    const unlocked=isAreaUnlocked(a,state);
    if(!unlocked)return null;
    const visited=state.visitedAreas.includes(a.id);
    return visited?getAreaDisplayName(a,state):a.early_game_alias||'???';
  }).filter(Boolean);
  // 地图内容渲染函数（复用于普通和全屏模式）
  const renderMapContent=()=>(
    <>
      {/* SVG 路径连线 — 按状态分三层渲染 */}
      <svg className="sketch-map-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
        {MAP_EDGES.map(([from,to])=>{
          const a=MAP_LAYOUT[from];const b=MAP_LAYOUT[to];
          if(!a||!b)return null;
          const edgeState=getEdgeState(from,to);
          if(edgeState==='hidden')return null;
          const mx=(a.x+b.x)/2+((a.y-b.y)*0.12);
          const my=(a.y+b.y)/2+((b.x-a.x)*0.08);
          const cls='sketch-map-line sketch-map-line--'+edgeState;
          return <path key={from+'-'+to} className={cls} d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}/>;
        })}
      </svg>
      <div className="sketch-map-coastline"/>
      <div className="sketch-map-fog"/>
      {MAP_ZONES.map(z=>{
        const hasVisible=z.areas.some(id=>canShowNode(areaById[id]));
        if(!hasVisible)return null;
        return <div key={z.label} className="sketch-map-zone-label" style={{left:z.x+'%',top:z.y+'%'}}>{z.label}</div>;
      })}
      {Object.keys(MAP_LAYOUT).map(renderNode)}
      <div className="sketch-map-legend">
        <span className="legend-item legend-current">● 当前</span>
        <span className="legend-item legend-reachable">● 可前往</span>
        <span className="legend-item legend-known">﹍ 已知路径</span>
        <span className="legend-item legend-active-path">━ 可行路径</span>
        <span className="legend-item legend-rumor">◌ 传闻</span>
        <span className="legend-item legend-locked">○ 锁定</span>
      </div>
    </>
  );

  // 全屏模式
  if(fullscreen) return <div className="map-fullscreen-overlay" onClick={(e)=>{if(e.target===e.currentTarget)setFullscreen(false);}}>
    <button className="map-fullscreen-close" onClick={()=>setFullscreen(false)} title="关闭全屏">✕ 关闭全屏</button>
    <div>
      <div className="sketch-map">{renderMapContent()}</div>
      <div className="sketch-map-info">
        <div className="sketch-map-info-row"><span className="sketch-map-info-label">当前位置</span><span className="sketch-map-info-value">{currentName}</span></div>
        {reachableNames.length>0&&<div className="sketch-map-info-row"><span className="sketch-map-info-label">可前往</span><span className="sketch-map-info-value">{reachableNames.join(' / ')}</span></div>}
      </div>
    </div>
  </div>;

  return <div className="sketch-map-wrapper">
    <div className="sketch-map">
      <button className="map-fullscreen-btn" onClick={()=>setFullscreen(true)} title="全屏查看地图">⛶ 全屏</button>
      {renderMapContent()}
    </div>
    {/* 地图下方辅助信息 */}
    <div className="sketch-map-info">
      <div className="sketch-map-info-row"><span className="sketch-map-info-label">当前位置</span><span className="sketch-map-info-value">{currentName}</span></div>
      {reachableNames.length>0&&<div className="sketch-map-info-row"><span className="sketch-map-info-label">可前往</span><span className="sketch-map-info-value">{reachableNames.join(' / ')}</span></div>}
    </div>
  </div>;
}

const RightPanel=memo(function RightPanel({state,dispatch}){
  const [tab,setTab]=useState('map');
  // 快捷键事件监听：M切换地图，J切换线索
  useEffect(()=>{
    const onMap=()=>setTab(prev=>prev==='map'?'map':'map');
    const onClues=()=>setTab('clues');
    window.addEventListener('kbd:toggleMap',onMap);
    window.addEventListener('kbd:showClues',onClues);
    return()=>{window.removeEventListener('kbd:toggleMap',onMap);window.removeEventListener('kbd:showClues',onClues);};
  },[]);
  const areas=GD.areas||GD.module2_areas||[];
  const npcs=GD.npcs||GD.module3_npcs||[];
  const conn=useMemo(()=>getConnectedAreas(state.currentArea,ctx),[state.currentArea]);
  const inProgressConclusions=useMemo(()=>{
    return (GD.systems?.clue_conclusion?.conclusions||[]).filter(c=>!(state.discoveredConclusions||[]).includes(c.id)).map(conc=>{
      const satisfied=(conc.evidence_pool||[]).filter(ev=>{
        if(ev.source&&state.triggeredEvents.includes(ev.source))return true;
        const tm=ev.source&&ev.source.match(/^(.+?)\s+trust>=(\d+)$/);
        if(tm)return (state.npcTrust[tm[1]]||0)>=parseInt(tm[2]);
        return false;
      });
      const needed=conc.required_evidence_count||2;
      if(satisfied.length===0)return null;
      return <div key={conc.id} style={{fontSize:'0.65rem',color:'var(--text-dim)',padding:'0.15rem 0',borderLeft:'2px solid var(--border)',paddingLeft:'0.4rem',marginBottom:'0.2rem'}}>
        {conc.name} [{satisfied.length}/{needed}]
        {satisfied.map((ev,ei)=><div key={ei} style={{color:'var(--blue)',paddingLeft:'0.3rem'}}>· {ev.description.slice(0,25)}</div>)}
      </div>;
    }).filter(Boolean);
  },[state.discoveredConclusions,state.triggeredEvents,state.npcTrust]);
  const tabs=[{id:'map',label:'地图'},{id:'people',label:'人物'},{id:'clues',label:'线索'},{id:'goals',label:'目标'}];
  const clueCount=state.clues.length+(state.completedChains?.length||0)+(state.discoveredConclusions?.length||0);
  return <div className="right-panel">
    <div className="right-panel-tabs">{tabs.map(t=><button key={t.id} className={'tab-btn'+(tab===t.id?' active':'')} onClick={()=>setTab(t.id)}>{t.label}{t.id==='clues'&&clueCount>0&&<span className="tab-badge">{clueCount}</span>}</button>)}</div>
    {tab==='map'&&<div className="tab-content">
      <div className="panel-title">沃切斯特地图</div>
      <div className="map-section"><CitySketchMap areas={areas} state={state} dispatch={dispatch} conn={conn}/></div>
    </div>}
    {tab==='people'&&<div className="tab-content">
      <div className="panel-title">NPC</div>
      <div className="npc-section">{npcs.filter(n=>!state.npcStates[n.name]?.dead).map(n=>{
        const trust=state.npcTrust[n.name]||0;const ns=state.npcStates[n.name]||{};
        const d=((state.day-1)%5)+1;const sch=(n.schedule||[]).find(s=>s.startsWith('day'+d));
        const loc=sch?sch.split(':')[1]:'???';const ln=(areas.find(a=>a.id===loc)||{}).name||loc;
        return <div key={n.name} className="npc-entry">
          <div className="npc-name">{n.name}{n.chapter_1_availability==='core'&&<span style={{fontSize:'0.6rem',color:'var(--gold)',marginLeft:'0.2rem'}}>核心</span>}{ns.corrupted&&<span className="npc-status corrupted"> [腐蚀]</span>}{ns.dead&&<span className="npc-status dead"> [死亡]</span>}</div>
          <div className="npc-role">{n.role}</div><div className="npc-trust">{'★'.repeat(Math.max(0,trust))}{'☆'.repeat(Math.max(0,5-trust))} | {ln}</div>
        </div>;
      })}</div>
      {state.activeBlessings&&state.activeBlessings.length>0&&<><div className="panel-title" style={{color:'var(--gold)'}}>恩赐</div>{state.activeBlessings.map((bkey,i)=>{
        const b=GD.systems?.loop?.loop_blessings?.[bkey];
        return b?<div key={i} style={{fontSize:'0.7rem',color:'var(--gold)',padding:'0.15rem 0'}}>★ {b.name}</div>:null;
      })}</>}
      {(state.humanityScore!==undefined&&state.humanityScore!==50)&&<><div className="panel-title" style={{color:state.humanityScore>=60?'var(--accent2)':state.humanityScore>=30?'var(--gold)':'var(--danger2)'}}>人性</div><div style={{fontSize:'0.7rem',color:state.humanityScore>=60?'var(--accent2)':state.humanityScore>=30?'var(--gold)':'var(--danger2)',padding:'0.15rem 0'}}>{state.humanityScore>=60?'尚存人性':state.humanityScore>=30?'人性脆弱':'人性迷失'} ({state.humanityScore})</div></>}
    </div>}
    {tab==='clues'&&<div className="tab-content">
      {state.clues.length>0&&<><div className="panel-title">线索 ({state.clues.length})</div><div className="clues-section">{state.clues.map((c,i)=><div key={i} className="clue-entry">• {typeof c==='object'?c.name:resolveClueName(c)}</div>)}</div></>}
      {state.completedChains&&state.completedChains.length>0&&<><div className="panel-title">事件链 ({state.completedChains.length})</div><div className="clues-section">{state.completedChains.map((cid,i)=><div key={i} style={{fontSize:'0.7rem',color:'var(--san-high)',padding:'0.15rem 0'}}>✓ {cid}</div>)}</div></>}
      {state.discoveredConclusions&&state.discoveredConclusions.length>0&&<><div className="panel-title" style={{color:'var(--gold)'}}>结论</div><div className="clues-section">{state.discoveredConclusions.map((cid,i)=>{
        const conc=(GD.systems?.clue_conclusion?.conclusions||[]).find(c=>c.id===cid);
        return <div key={i} className="conclusion-entry">★ {conc?.name||cid}</div>;
      })}</div></>}
      {inProgressConclusions}
      {state.loopCount>0&&<><div className="panel-title" style={{color:'var(--purple)'}}>轮回</div><div style={{fontSize:'0.7rem',color:'var(--purple)',padding:'0.15rem 0'}}>第 {state.loopCount} 次轮回 | 污染：{Math.round((state.pollution||0)*100)}%</div></>}
    </div>}
    {tab==='goals'&&<div className="tab-content">
      {state.objectives&&state.objectives.length>0&&<><div className="panel-title">当前目标</div><div className="clues-section">{state.objectives.map((o,i)=><div key={i} style={{fontSize:'0.7rem',padding:'0.15rem 0',color:o.done?'var(--san-high)':'var(--text-dim)'}}>{o.icon} {o.text} {o.done?'✓':''}</div>)}</div></>}
      {state.eventLog.length>0&&<><div className="panel-title">事件记录</div><div className="clues-section">{state.eventLog.slice(-10).map((l,i)=><div key={i} style={{fontSize:'0.65rem',color:'var(--text-dim)',padding:'0.1rem 0'}}><span style={{color:'var(--text-dim)',opacity:0.5}}>[Day {l.day}]</span> {l.text}</div>)}</div></>}
    </div>}
  </div>;
})

function EndingScreen({ending,state,dispatch}){
  const tc=ending.type==='good'?'good':ending.type==='bad'?'bad':ending.type==='hidden'?'hidden':'neutral';
  const recap=ending.recap;
  const endingImage=ending.id?getEndingCgImage(ending.id):null;
  const isStructured=recap&&typeof recap==='object'&&!Array.isArray(recap)&&recap.deathType;
  const isFirstDeath=state.loopCount===0&&tc==='bad';
  const deathAnimClass=isFirstDeath?(isStructured&&recap.deathType==='mental'?'death-anim-mental':'death-anim-physical'):'';
  return <div className={'ending-screen '+tc+' '+deathAnimClass}>
    <h2>{ending.name}</h2>
    {endingImage&&<img className="ending-cg" src={endingImage} alt={ending.name+'结局图'} onError={e=>{e.currentTarget.style.display='none';}}/>}
    <div className="ending-desc">{ending.description.split('\n').filter(Boolean).map((p,i)=><p key={i}>{p}</p>)}</div>
    {ending.rewards&&<div className="rewards"><div style={{marginBottom:'0.3rem'}}>奖励：</div>{ending.rewards.map((r,i)=><div key={i}>{r}</div>)}</div>}
    {ending.behaviorAnnotations&&ending.behaviorAnnotations.length>0&&<div className="behavior-annotations">
      <div className="annotation-label">档案附注</div>
      {ending.behaviorAnnotations.map((a,i)=><div key={i} className="annotation-line">{a.name}：{(a.description||'').split('\n')[0].slice(0,80)}{(a.description||'').length>80?'……':''}</div>)}
    </div>}
    {isFirstDeath&&<div className="tutorial-hint" style={{maxWidth:'500px',margin:'0 auto 1rem'}}>死亡不是终点。你的部分知识会在下一轮保留。点击"再次踏入深渊"开始新的轮回。</div>}
    {isStructured?<>
      <div className={'death-recap death-report '+(recap.deathType==='mental'?'death-san':'death-physical')}>
        <div className="death-report-header">
          <div className="death-report-icon">{recap.deathType==='mental'?' ':recap.deathType==='physical'?' ':'⏱️'}</div>
          <div className="death-report-title">死因报告</div>
          <div className={'death-report-badge death-badge-'+recap.deathType}>{recap.deathType==='physical'?'肉体消亡':recap.deathType==='mental'?'理智崩塌':recap.deathType==='time'?'时间耗尽':'未知'}</div>
        </div>
        <div className="death-report-stats">
          <div className="death-stat-row"><span className="death-stat-label">存活</span><span className="death-stat-value">{recap.day} 天</span></div>
          <div className="death-stat-row"><span className="death-stat-label">SAN</span><span className="death-stat-value" style={{color:state.san<=0?'var(--danger2)':'var(--san-low)'}}>{state.san}/{state.maxSan}</span></div>
          <div className="death-stat-row"><span className="death-stat-label">HP</span><span className="death-stat-value" style={{color:state.hp<=0?'var(--danger2)':'var(--text)'}}>{state.hp}/{state.maxHp}</span></div>
          <div className="death-stat-row"><span className="death-stat-label">污染</span><span className="death-stat-value" style={{color:'var(--purple)'}}>{Math.round((state.pollution||0)*100)}%</span></div>
        </div>
        <div className="recap-section death-cause-section">
          <div className="recap-section-label">终结事件</div>
          <div className="recap-section-content">{recap.causeEvent}</div>
        </div>
        {recap.keyDiscoveries.length>0&&<div className="recap-section">
          <div className="recap-section-label">关键发现 ({recap.keyDiscoveries.length})</div>
          {recap.keyDiscoveries.map((d,i)=><div key={i} className="recap-section-item">⚡ {d}</div>)}
        </div>}
        {recap.conclusionsUnlocked.length>0&&<div className="recap-section">
          <div className="recap-section-label">已解锁结论</div>
          {recap.conclusionsUnlocked.map((c,i)=><div key={i} className="recap-section-item">  {typeof c==='string'?c:c}</div>)}
        </div>}
        {recap.npcTrustHighlights.length>0&&<div className="recap-section">
          <div className="recap-section-label">NPC关系</div>
          {recap.npcTrustHighlights.map(([name,trust],i)=><div key={i} className="recap-section-item">{name}：{'★'.repeat(trust)}{'☆'.repeat(5-trust)}</div>)}
        </div>}
        {recap.permanentUnlocks.length>0&&<div className="recap-section">
          <div className="recap-section-label">永久解锁</div>
          {recap.permanentUnlocks.map((b,i)=><div key={i} className="recap-section-item">{b}</div>)}
        </div>}
        {recap.pollutionGained>0&&<div className="recap-section">
          <div className="recap-section-label">污染扩散</div>
          <div className="recap-section-content" style={{color:'var(--purple)'}}>世界污染 +{Math.round(recap.pollutionGained*100)}%</div>
        </div>}
        {recap.adviceLine&&<div className="recap-section">
          <div className="recap-section-label">分析建议</div>
          <div className="recap-section-content" style={{fontStyle:'italic'}}>{recap.adviceLine}</div>
        </div>}
        {recap.timeline.length>0&&<div className="recap-section">
          <div className="recap-section-label">时间线</div>
          <div className="death-timeline">
            {recap.timeline.map((m,i)=><div key={i} className="timeline-entry"><span className="timeline-day">D{m.day}</span><span className="timeline-text">{m.text.replace(/^第 \d+ 天：/,'')}</span></div>)}
          </div>
        </div>}
        <div className="recap-final">{state.san<=0?'疯狂不是终点。它记住了你的选择。':'死亡不是终点。雾会把你送回原处。'}</div>
      </div>
    </>:(recap&&Array.isArray(recap)?<div className="death-recap">
      <div className="recap-title">本轮留下的痕迹</div>
      {recap.slice(-5).map((m,i)=><div key={i} className="recap-line">{typeof m==='string'?m:m.text}</div>)}
      <div className="recap-final">{state.san<=0?'疯狂不是终点。它记住了你的选择。':'死亡不是终点。雾会把你送回原处。'}</div>
    </div>:null)}
    <div className="stats-summary">存活天数：{state.day} | 收集线索：{state.clues.length} | 最终SAN：{state.san} | 检定成功：{state.stats_run.checks_passed} | 探索区域：{state.stats_run.areas_explored||state.visitedAreas.length} | 总轮数：{state.stats_run.runs}{state.loopCount>0?' | 轮回：'+state.loopCount+'次':''}{state.humanityScore!==undefined?' | 人性：'+(state.humanityScore>=60?'尚存':state.humanityScore>=30?'脆弱':'迷失'):''}{state.discoveredConclusions?.length>0?' | 结论：'+state.discoveredConclusions.length+'个':''}</div>
    <button className="btn btn-primary" onClick={()=>dispatch({type:'NEW_GAME'})}>{state.loopCount>0?'这次不一样':'再次踏入深渊'}</button>
  </div>;
}

function GameHeader({state,dispatch,areas,onSettingsOpen,onUgcOpen,onSaveOpen}){
  const area=areas.find(a=>a.id===state.currentArea);
  const areaName=area?getAreaDisplayName(area,state):state.currentArea;
  const sanStage=getSanStage(state.san,ctx);
  const sanClass=state.san>=80?'stable':state.san>=60?'tense':state.san>=40?'shaken':state.san>=20?'critical':'abyssal';
  const sealLabel=state.sealState==='intact'?'完整':state.sealState==='weakening'?'削弱':state.sealState==='critical'?'危急':state.sealState==='collapsing'?'崩塌':'破裂';
  const sanDanger=state.san<=20?'san-danger-critical':state.san<=40?'san-danger-low':'';
  return <header className={'game-header'+(sanDanger?' '+sanDanger:'')}>
    <div className="header-brand">
      <div className="header-title">深渊低语</div>
      <div className="header-subtitle">沃切斯特之影</div>
    </div>
    <div className="header-meta">
      <span className="header-meta-item">第 {state.day} 日</span>
      <span className="header-meta-separator">·</span>
      {state.loopCount>0&&<><span className="header-meta-item">第 {state.loopCount} 次轮回</span><span className="header-meta-separator">·</span></>}
      <span className="header-meta-item location">{areaName}</span>
      <span className="header-meta-separator">·</span>
      <span className="header-meta-item weather">{state.weather}</span>
    </div>
    <div className="header-status">
      <span className={'header-status-pill mental '+sanClass}>精神：{sanStage.name}<span className="san-mini-bar"><span className="san-mini-fill" style={{width:(state.san/state.maxSan*100)+'%'}}/></span></span>
      <span className={'header-status-pill seal seal-'+state.sealState}>封印：{sealLabel}</span>
      <span className="header-status-pill ap">行动余裕：{state.ap}/{state.maxAp}</span>
    </div>
    <div className="header-controls">
      {onUgcOpen&&<button className="header-btn" onClick={onUgcOpen} title="模组管理">🧩</button>}
      <button className="header-btn" onClick={onSettingsOpen} title="设置">⚙️</button>
      <button className="header-btn" onClick={()=>dispatch({type:'AUDIO_MUTE_TOGGLE'})} title={state.audioMuted?'取消静音':'静音'}>{state.audioMuted?'🔇':'🔊'}</button>
      <button className="header-btn header-btn-state" onClick={()=>dispatch({type:'ACCESSIBILITY_TOGGLE',key:'visual_distortion'})} title="切换视觉特效">{state.accessibilityOptions?.visual_distortion==='off'?'特效:关':'特效:开'}</button>
      <button className="header-btn" onClick={()=>{onSaveOpen&&onSaveOpen();audioManager.playUI('panel_open');}} title="写入调查记录">💾</button>
    </div>
  </header>;
}

function SettingsModal({open,onClose,settings,onChange,onAchOpen}){
  const update=(key,val)=>onChange({...settings,[key]:val});
  return <Modal open={open} onClose={onClose} title="设置" width="400px">
    <div className="settings-group-title">音频</div>
    <div className="settings-row">
      <span className="settings-label">主音量</span>
      <input type="range" className="settings-slider" min="0" max="100" value={settings.volume} onChange={e=>update('volume',Number(e.target.value))}/>
      <span style={{fontSize:'0.7rem',color:'var(--text-dim)',width:'2.5rem',textAlign:'right'}}>{settings.volume}%</span>
    </div>
    <div className="settings-row">
      <span className="settings-label">环境音</span>
      <input type="range" className="settings-slider" min="0" max="100" value={settings.ambientVolume??80} onChange={e=>update('ambientVolume',Number(e.target.value))}/>
      <span style={{fontSize:'0.7rem',color:'var(--text-dim)',width:'2.5rem',textAlign:'right'}}>{settings.ambientVolume??80}%</span>
    </div>
    <div className="settings-row">
      <span className="settings-label">效果音</span>
      <input type="range" className="settings-slider" min="0" max="100" value={settings.effectVolume??80} onChange={e=>update('effectVolume',Number(e.target.value))}/>
      <span style={{fontSize:'0.7rem',color:'var(--text-dim)',width:'2.5rem',textAlign:'right'}}>{settings.effectVolume??80}%</span>
    </div>
    <div className="settings-row">
      <span className="settings-label">界面音</span>
      <input type="range" className="settings-slider" min="0" max="100" value={settings.uiVolume??80} onChange={e=>update('uiVolume',Number(e.target.value))}/>
      <span style={{fontSize:'0.7rem',color:'var(--text-dim)',width:'2.5rem',textAlign:'right'}}>{settings.uiVolume??80}%</span>
    </div>
    <div className="settings-row">
      <span className="settings-label">突袭音效</span>
      <button className={'settings-toggle'+(settings.suddenSounds?' on':'')} onClick={()=>update('suddenSounds',!settings.suddenSounds)}/>
    </div>
    <div className="settings-group-title">显示</div>
    <div className="settings-row">
      <span className="settings-label">叙事字号</span>
      <div className="font-size-group">
        {[['small','小'],['medium','中'],['large','大']].map(([k,l])=>
          <button key={k} className={'font-size-btn'+(settings.narrativeFontSize===k?' active':'')} onClick={()=>update('narrativeFontSize',k)}>{l}</button>
        )}
      </div>
    </div>
    <div className="settings-group-title">效果</div>
    <div className="settings-row">
      <span className="settings-label">视觉抖动</span>
      <button className={'settings-toggle'+(settings.visualDistortion?' on':'')} onClick={()=>update('visualDistortion',!settings.visualDistortion)}/>
    </div>
    <div className="settings-row">
      <span className="settings-label">闪烁效果</span>
      <button className={'settings-toggle'+(settings.flickerEffect?' on':'')} onClick={()=>update('flickerEffect',!settings.flickerEffect)}/>
    </div>
    {onAchOpen&&<><div className="settings-group-title">其他</div>
    <div className="settings-row">
      <span className="settings-label">成就</span>
      <button className="btn btn-sm" onClick={()=>{onClose();onAchOpen();}}>查看成就</button>
    </div></>}
  </Modal>;
}

function SaveLoadModal({open,onClose,state,onLoad,mode,onSaved}){
  const slots=getAllSlots();
  const autoSlots=slots.filter(s=>s.slotId.startsWith('auto'));
  const manualSlots=slots.filter(s=>s.slotId.startsWith('manual'));
  const formatTime=(ts)=>{if(!ts)return'—';const d=new Date(ts);return d.toLocaleDateString()+' '+d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});};
  const renderSlot=(slot)=>{
    const isManual=slot.slotId.startsWith('manual');
    const label=isManual?'手动 '+slot.slotId.split('_')[1]:slot.slotId==='auto_1'?'最近自动':'自动 '+slot.slotId.split('_')[1];
    if(!slot.exists)return <div key={slot.slotId} className="save-slot empty" onClick={()=>{if(mode==='save'&&isManual){manualSave(slot.slotId,state);onClose();onSaved&&onSaved('存档成功');}}}>
      <div className="save-slot-label">{label}</div>
      <div className="save-slot-meta">空</div>
    </div>;
    const m=slot.meta||{};
    return <div key={slot.slotId} className={'save-slot'+(isManual?' manual':' auto')} onClick={()=>{
      if(mode==='save'&&isManual){if(confirm('覆盖此存档？')){manualSave(slot.slotId,state);onClose();onSaved&&onSaved('存档成功');}}
      else if(mode==='load'){const loaded=loadSlot(slot.slotId);if(loaded&&!loaded.incompatible){onLoad(loaded);onClose();}else if(loaded?.incompatible){alert('存档版本不兼容');}}
    }}>
      <div className="save-slot-label">{label}</div>
      <div className="save-slot-meta">第{m.day||'?'}日 · {m.area||'?'} · SAN:{m.san||'?'}</div>
      <div className="save-slot-time">{formatTime(slot.timestamp)}</div>
    </div>;
  };
  return <Modal open={open} onClose={onClose} title={mode==='save'?'写入调查记录':'读取调查记录'} width="440px">
    {mode==='save'&&<div style={{fontSize:'0.7rem',color:'var(--text-dim)',marginBottom:'0.6rem'}}>手动存档槽位（点击覆盖）：</div>}
    {mode==='save'&&<div className="save-slots-grid">{manualSlots.map(renderSlot)}</div>}
    {mode==='load'&&<>
      {manualSlots.some(s=>s.exists)&&<><div style={{fontSize:'0.7rem',color:'var(--text-dim)',marginBottom:'0.4rem'}}>手动存档：</div><div className="save-slots-grid">{manualSlots.map(renderSlot)}</div></>}
      <div style={{fontSize:'0.7rem',color:'var(--text-dim)',margin:'0.8rem 0 0.4rem',borderTop:'1px solid var(--border)',paddingTop:'0.5rem'}}>自动存档：</div>
      <div className="save-slots-grid">{autoSlots.map(renderSlot)}</div>
    </>}
    <div className="save-io-bar">
      <button className="btn btn-sm save-io-btn" onClick={()=>{exportSave();}}>导出存档</button>
      <label className="btn btn-sm save-io-btn">导入存档<input type="file" accept=".json" style={{display:'none'}} onChange={e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{const res=importSave(r.result);if(res.ok){onSaved&&onSaved('导入成功');onClose();}else{alert(res.error);}};r.readAsText(f);e.target.value='';}}/></label>
    </div>
  </Modal>;
}

function AchievementGallery({open,onClose}){
  const all=getAllAchievements();
  const data=loadAchievements();
  return <Modal open={open} onClose={onClose} title="成就" width="480px">
    <div className="achievement-gallery">
      {all.map(ach=>{
        const unlocked=data.unlocked.includes(ach.id);
        return <div key={ach.id} className={'achievement-card'+(unlocked?'':' locked')}>
          <div className="achievement-card-icon">{unlocked?ach.icon:'❓'}</div>
          <div className="achievement-card-info">
            <div className="achievement-card-name">{ach.name}</div>
            <div className="achievement-card-desc">{unlocked?ach.desc:'???'}</div>
          </div>
        </div>;
      })}
    </div>
  </Modal>;
}

// === 结局 CG 预加载 ===
const ENDING_CGS=['人肉税','伊莎贝拉 救赎','伊莎贝拉：第十二声','伊莱亚斯 守门人','伪神','删档祈愿者','十三响的先知','升座的牺牲品','囚徒','回音','埃德加 观测者','多余的餐具','守财奴','守门人','容器','封印的亲吻','屠宰场','希尔达的选择','希尔达：封印代价','希尔达：终局知情','异端降临','归海','循环的蛀虫','悦纳者','愉悦的先知','成为事件的残页','整洁的屠夫','断环','无效档案','旧汗渍','最佳员工','最后的人事','木偶师','档案吞噬者','永恒记录员','污圣徒','洗不掉的印记','海上逃离','深渊吞噬','溶盐者','漂浮的外套','漫游者','潮声之婚','王座上的蛆','玩家成为事件','白页','空白事件卡','空白墓碑','第600事件：笔记本最后一页','第600结局：墨水化','第600预兆：事件日志问号','第600预兆：路人低语','第十二声','筹码','约书亚 救赎','老费舍 最后的人事','血肉合唱','被观察者','裂痕','观测者','证据逃离','账房先生','超越者','身心俱灭','轮回破壁','镜中缺席者','长眠者','页码599变600','餐具','骨头落地的声音','黑暗中的手','黑潮圣婚'];
let _cgPreloaded=false;
function preloadEndingCGs(){
  if(_cgPreloaded)return;_cgPreloaded=true;
  const batch=(start)=>{
    const end=Math.min(start+5,ENDING_CGS.length);
    for(let i=start;i<end;i++){const img=new Image();img.src='assets/webp_ending/'+encodeURIComponent(ENDING_CGS[i])+'.webp';}
    if(end<ENDING_CGS.length){const sched=window.requestIdleCallback||window.requestAnimationFrame||((cb)=>setTimeout(cb,200));sched(()=>batch(end));}
  };
  batch(0);
}

function App(){
  const [state,rawDispatch]=useReducer(gameReducer,null,initialState);
  /* [TRACKER-DISPATCH] 包装 dispatch — 自动记录每步操作 */
  const dispatch = useCallback((action) => {
    errorTracker.record(action, state);
    return rawDispatch(action);
  }, [state]);
  const [settings,setSettings]=useState(loadSettings);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [saveLoadOpen,setSaveLoadOpen]=useState(false);
  const [saveLoadMode,setSaveLoadMode]=useState('save');
  const [achOpen,setAchOpen]=useState(false);
  const [ugcOpen,setUgcOpen]=useState(false);
  const [toasts,setToasts]=useState([]);
  const [saveTick,setSaveTick]=useState(0);
  const savedExists = useMemo(()=>hasSave(),[saveTick]);
  const notifySave=(msg,type)=>{setSaveTick(t=>t+1);setToasts(prev=>[...prev,{id:'save_'+Date.now(),type:type||'save',def:{icon:type==='load'?'📖':'💾',name:msg||'已存档',desc:''},key:Date.now()}]);};

  // Achievement checking
  useEffect(()=>{
    const achData=loadAchievements();
    const newUnlocks=checkAchievements(state,achData.unlocked,achData.stats);
    if(newUnlocks.length>0){
      achData.unlocked.push(...newUnlocks);
      saveAchievements(achData);
      newUnlocks.forEach(id=>{
        const def=getAchievementDef(id);
        if(def)setToasts(prev=>[...prev,{id,def,key:Date.now()}]);
      });
    }
  },[state.day,state.ending,state.visitedAreas?.length,state.clues?.length]);

  useEffect(()=>{migrateOldSave();},[]);

  useEffect(()=>{
    audioManager._volumeScale=settings.volume/100;
    audioManager._ambientScale=(settings.ambientVolume??80)/100;
    audioManager._effectScale=(settings.effectVolume??80)/100;
    audioManager._uiScale=(settings.uiVolume??80)/100;
    audioManager.suddenMuted=!settings.suddenSounds;
    dispatch({type:'ACCESSIBILITY_TOGGLE',key:'visual_distortion',value:settings.visualDistortion?'medium':'off'});
    dispatch({type:'ACCESSIBILITY_TOGGLE',key:'flicker_control',value:settings.flickerEffect?'medium':'off'});
  },[settings]);

  // 结局CG预加载：SAN < 30 时静默预加载，暗示结局临近
  useEffect(()=>{if(state.screen==='game'&&state.san<30)preloadEndingCGs();},[state.san,state.screen]);

  const handleSettingsChange=(s)=>{saveSettings(s);setSettings(s);};
  const fontSizeClass='narrative-size-'+settings.narrativeFontSize;

  const handleLoadSlot=(loaded)=>{dispatch({type:'CONTINUE_GAME', savedState: loaded});notifySave('从存档中醒来','load');};

  if(state.screen==='title')return <>
    <TitleScreen
      onStart={()=>dispatch({type:'START_GAME'})}
      saveExists={savedExists}
      onContinue={()=>{setSaveLoadMode('load');setSaveLoadOpen(true);}}
      onSettingsOpen={()=>setSettingsOpen(true)}
      onAchOpen={()=>setAchOpen(true)}
    />
    <SettingsModal open={settingsOpen} onClose={()=>setSettingsOpen(false)} settings={settings} onChange={handleSettingsChange} onAchOpen={()=>setAchOpen(true)}/>
    <SaveLoadModal open={saveLoadOpen} onClose={()=>setSaveLoadOpen(false)} state={null} onLoad={handleLoadSlot} mode="load" onSaved={notifySave}/>
    <AchievementGallery open={achOpen} onClose={()=>setAchOpen(false)}/>
  </>;
  if(state.screen==='prologue')return <>
    <PrologueScreen state={state} dispatch={dispatch}/>
  </>;
  if(state.screen==='guide')return <SurvivalGuide onContinue={()=>dispatch({type:'DISMISS_GUIDE'})}/>;
  if(state.screen==='creation')return <CharCreation state={state} onRoll={()=>dispatch({type:'ROLL_STATS'})} onStart={()=>dispatch({type:'BEGIN_ADVENTURE'})} onSetDifficulty={(d)=>dispatch({type:'SET_DIFFICULTY',difficulty:d})} onSetArchetype={(id)=>dispatch({type:'SET_ARCHETYPE',archetypeId:id})}/>;
  if(state.ending)return <EndingScreen ending={state.ending} state={state} dispatch={dispatch}/>;
  const corrLevel=getCorruptionLevel(state.san,state.loopCount);
  const areas=GD.areas||GD.module2_areas||[];
  const visualDistortion=state.accessibilityOptions?.visual_distortion;
  const allowVisualFX=visualDistortion!=='none'&&visualDistortion!=='off';
  const sanClass=allowVisualFX?(state.san<20?' san-fracture':state.san<40?' san-tremor':''):'';
  return <>
    <div className={'game-layout '+(corrLevel>0?'corruption-'+corrLevel+' ':'')+sanClass+' '+fontSizeClass}>
      <GameHeader state={state} dispatch={dispatch} areas={areas} onSettingsOpen={()=>setSettingsOpen(true)} onUgcOpen={()=>setUgcOpen(true)} onSaveOpen={()=>{setSaveLoadMode('save');setSaveLoadOpen(true);}}/>
      <LeftPanel state={state}/>
      <CenterPanel state={state} dispatch={dispatch}/>
      <RightPanel state={state} dispatch={dispatch}/>
    </div>
    <SettingsModal open={settingsOpen} onClose={()=>setSettingsOpen(false)} settings={settings} onChange={handleSettingsChange} onAchOpen={()=>setAchOpen(true)}/>
    <SaveLoadModal open={saveLoadOpen} onClose={()=>setSaveLoadOpen(false)} state={state} onLoad={handleLoadSlot} mode={saveLoadMode} onSaved={notifySave}/>
    <AchievementGallery open={achOpen} onClose={()=>setAchOpen(false)}/>
    {ugcOpen&&<Modal open={ugcOpen} onClose={()=>setUgcOpen(false)} title="模组管理" width="720px"><UgcPanel onClose={()=>setUgcOpen(false)} GD={GD}/></Modal>}
    {toasts.length>0&&<div className="achievement-toast-container">
      {toasts.map(t=><AppToast key={t.key} toast={t} onDismiss={()=>setToasts(prev=>prev.filter(x=>x.key!==t.key))}/>)}
    </div>}
  </>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<ErrorBoundary><App/></ErrorBoundary>);
