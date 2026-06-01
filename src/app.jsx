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
import { initSanVisualOverlay, updateSanVisualOverlay, destroySanVisualOverlay } from './systems/sanVisualCorruption.js';
import { applyTextHallucination, maybeGetFakeMessage, getChoiceDelay, maybeInsertFalseMemory, corruptEventWeights } from './systems/logicCorruption.js';
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

// Fear lens: module-level reference for corruption function
let _currentFearTuning = null;

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

/**
 * P0-3: Execute a forced progress guard.
 * Produces a gentle narrative nudge and marks the guard as fired.
 * Does NOT directly give the clue — it nudges the player toward the right area/event.
 *
 * @param {object} guard - guard entry from CRITICAL_PROGRESS_GUARDS
 * @param {object} state - game state (will be mutated)
 * @param {function} narr - narrative function
 */

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
    // Phase 3: Init SAN visual corruption overlay
    try{initSanVisualOverlay();}catch(e){}
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
    // Phase 6: Resource-based text corruption on area descriptions
    desc=applyResourceTextCorruption(desc,s);
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
    // Phase 4 Layer 1: Chapter milestone events (highest priority)
    {const _milestone=checkChapterMilestone(s.day,s);
    if(_milestone){
      const _milestoneEvt=createMilestoneEvent(_milestone);
      s.triggeredEvents.push(_milestoneEvt.id);
      narr('event',_milestoneEvt.description,{eventTitle:_milestoneEvt.name,eventType:'milestone',isSpecial:true});
      if(_milestoneEvt.sanity_damage>0){s.san=clamp(s.san-_milestoneEvt.sanity_damage,0,s.maxSan);narr('system','SAN -'+_milestoneEvt.sanity_damage,{isEffect:true});}
      if(_milestoneEvt._corruptionGain>0){s.safehouseCorruption=Math.min(100,(s.safehouseCorruption||0)+_milestoneEvt._corruptionGain);}
      addRunMemory(s,_milestoneEvt.name,'milestone');
    }}
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
    // Phase 4: Check for distortion variant (alternative text based on SAN/loop)
    let evtText=getDistortionVariant(evt,s)||evt.description;
    evtText=getPollutionText(getSanTextVariant(evtText,s.san,pick,ctx),s.pollution||0);
    // Fear lens: append fear-related flavor text
    if(s.fearTuning&&s.fearTuning.primary)evtText=applyFearLens(evt,evtText,s);
    // Phase 3: Text hallucination at low SAN
    evtText=applyTextHallucination(evtText,s.san);
    // Phase 6: Resource-based text corruption
    evtText=applyResourceTextCorruption(evtText,s);
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
    // Phase 7: Corruption-aware NPC dialogue
    {const corrVariant=getNpcDialogueVariant(npc.name,trust,s);
    if(corrVariant!=='normal'){
      const corrLines=NPC_CORRUPTION_LINES[npc.name];
      if(corrLines){
        const lines=corrVariant==='heavy_corruption'?corrLines.heavy:corrLines.light;
        if(lines&&lines.length>0&&Math.random()<0.4)narr('system',npc.name+': "'+lines[Math.floor(Math.random()*lines.length)]+'"');
      }
    }}
    // Phase 7: NPC fatigue at high loops
    {const fatigue=getNpcFatigueEffect(npc.name,s.loopCount,s);
    if(fatigue&&Math.random()<0.3){
      narr('system',fatigue.text,{isSpecial:true});
      if(fatigue.trustModifier!==0)s.npcTrust[npc.name]=Math.max(0,(s.npcTrust[npc.name]||0)+fatigue.trustModifier);
    }}
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
    // Phase 5: World decay — daily corruption advancement (player behavior + world entropy)
    {const dailyCorr=calculateDailyCorruption(s,ctx);
    s.safehouseCorruption=Math.min(100,(s.safehouseCorruption||0)+dailyCorr);
    // Pollution also increases with world decay
    s.pollution=Math.min(1,(s.pollution||0)+dailyCorr*0.003);}
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
    // Phase 6: Enhanced safehouse visual stage display
    {const visStage=getSafehouseVisualStage(s.safehouseCorruption||0);
    if(visStage.stage>=2){
      narr('system','【'+visStage.name+'】'+visStage.description,{isSpecial:true});
      if(visStage.stage>=3)audioManager.playEffect(visStage.sound);
    }}
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
    // Phase 5: Day-specific critical events (world actively attacks)
    {const dayCrit=getDayCriticalEvent(s.day);
    if(dayCrit&&!s.triggeredEvents.includes('day_crit_'+s.day)){
      s.triggeredEvents.push('day_crit_'+s.day);
      narr('event',dayCrit.text,{eventTitle:'第 '+s.day+' 天',eventType:'milestone',isSpecial:true});
      if(dayCrit.sanCost>0){s.san=clamp(s.san-dayCrit.sanCost,0,s.maxSan);narr('system','SAN -'+dayCrit.sanCost,{isEffect:true});}
      if(dayCrit.corruptionGain>0)s.safehouseCorruption=Math.min(100,(s.safehouseCorruption||0)+dayCrit.corruptionGain);
      addRunMemory(s,dayCrit.text.split('\\n')[0],'world_decay');
    }}
    // Phase 5: World decay atmosphere narrative (30% chance each night)
    if(Math.random()<0.3){
      const decayText=getWorldDecayNarrative(s.day,s.safehouseCorruption||0,s);
      if(decayText)narr('system',decayText);
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
    // Phase 6: Process daily resources (fatigue, infection, light)
    processDailyResources(s);
    // Phase 6: Resource-based narrative warnings
    {const resNarr=getResourceNarrative(s);if(resNarr)narr('system',resNarr,{isSpecial:true});}
    // Phase 3: Logic corruption at low SAN
    {const fakeMsg=maybeGetFakeMessage(s.san,s.loopCount);if(fakeMsg)narr('system',fakeMsg,{isSpecial:true,madness:{name:'幻觉',description:'你看到了不存在的东西。'}});}
    maybeInsertFalseMemory(narr,s.san,s.loopCount,s.day);
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

function App(){
  const [state,rawDispatch]=useReducer(gameReducer,null,initialState);
  /* [TRACKER-DISPATCH] 包装 dispatch — 自动记录每步操作 */
  const stateRef=useRef(state);
  stateRef.current=state;
  const dispatch = useCallback((action) => {
    errorTracker.record(action, stateRef.current);
    return rawDispatch(action);
  }, []);
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

  // Phase 3: SAN visual corruption canvas overlay
  useEffect(()=>{
    if(state.screen!=='game')return;
    const allowVisualFX=state.accessibilityOptions?.visual_distortion!=='off';
    if(!allowVisualFX){destroySanVisualOverlay();return;}
    try{updateSanVisualOverlay(state.san,state.loopCount,state.safehouseCorruption||0);}catch(e){}
  },[state.san,state.loopCount,state.safehouseCorruption,state.screen,state.accessibilityOptions?.visual_distortion]);

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
