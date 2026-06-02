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
import { ensureExtendedState, mergeExtendedEvents, loadChapterData } from './reducers/extendedEventsLoader.js';
import { shouldTriggerMissing600, createMissing600Event } from './data/events_missing_600.js';
import { checkOmens } from './data/events_omens_600.js';
import { initExtendedEvents } from './reducers/extendedEventsInit.js';
import { resolveDeath } from './reducers/deathSystem.js';
import { PROLOGUE_EVENTS } from './data/prologue_events.js';
import { initPrologueState, handlePrologueChoice, handleSkipPrologue, getPrologueEvent, getPrologueSceneOrder } from './reducers/prologueReducer.js';
import { getFearEventWeightModifier, applyFearLens, getFearNpcLine, applyFearCorruption } from './systems/fearLens.js';
// sanVisualCorruption.js replaced by SanPollutionLayer.jsx component
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
  // SSOT: only fires at reality_dissolution and below (level >= 4, SAN <= 24)
  if(state.san>24)return;
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
// Game logic is split into slice handlers (core/explore/npc/daily/dark/ui).
// Each slice receives (s, action, c) where c is a context with narr/log/ensureMutableArrays.
function gameReducer(state,action){
  // Update module-level fear tuning for corruption functions
  _currentFearTuning = state.fearTuning || null;
  // Shallow copy of state; arrays stay as references until explicitly cloned
  let s={...state};
  let _cloned={};
  const ensureArr=(k)=>{if(!_cloned[k]){s[k]=[...(state[k]||[])];_cloned[k]=true;}};
  const ensureObj=(k)=>{if(!_cloned[k]){s[k]={...(state[k]||{})};_cloned[k]=true;}};
  // Build context for slice handlers (narr, log, clone helpers, etc.)
  const c=buildReducerCtx(s,state,ensureArr,ensureObj);
  // Daily action tracking for behavior endings
  const trackableTypes=['MOVE','EXPLORE','TALK_NPC','USE_ITEM','SWITCH_SAFEHOUSE','REST','GAMBLE_CHOICE','DO_SKILL_CHECK','NPC_RESPONSE','WORK','PREACH','ATTACK','BUY_FOOD'];
  if(trackableTypes.includes(action.type)&&action.type!=='REST'){
    if(!s._dayActions)s._dayActions=[];
    s._dayActions.push(action.type==='NPC_RESPONSE'?action.choice||'talk':action.type);
  }
  // Phase 5: Behavioral profiling — record action history for event selection
  if(typeof recordActionHistory==='function')recordActionHistory(s,action.type);
  // Track food/money hoarding
  if((s.food||0)>(c.bt.hoarded_food_max||0))c.bt.hoarded_food_max=s.food;
  if((s.money||0)>(c.bt.hoarded_money_max||0))c.bt.hoarded_money_max=s.money;
  // Dispatch to slice handlers (each returns s or null if unhandled)
  let result;
  result=handleCoreAction(s,action,c);    if(result)return result;
  result=handleExploreAction(s,action,c); if(result)return result;
  result=handleNpcAction(s,action,c);     if(result)return result;
  result=handleDailyAction(s,action,c);   if(result)return result;
  result=handleDarkAction(s,action,c);    if(result)return result;
  result=handleUiAction(s,action,c);      if(result)return result;
  return s;
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
  // Dual store: initialize game store bridge for useGameStore/useSan/useDay selectors
  useEffect(function() { initGameStore(state, dispatch); }, []);
  updateGameStore(state);
  // UI state from external store (replaces 7 useState calls)
  const ui = uiStore();
  const settings = ui.settings || getSettings();
  const savedExists = useMemo(()=>hasSave(),[ui.saveTick]);

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
    dispatch({type:'ACCESSIBILITY_TOGGLE',key:'visual_distortion',value:!!settings.visualDistortion});
    dispatch({type:'ACCESSIBILITY_TOGGLE',key:'flicker_control',value:!!settings.flickerEffect});
    dispatch({type:'SET_META_FIELD',field:'_visualPollution',value:settings.visualPollution??50});
  },[settings]);

  const handleSettingsChange=(s)=>updateSettings(s);
  const fontSizeClass='narrative-size-'+settings.narrativeFontSize;
  const handleLoadSlot=(loaded)=>{dispatch({type:'CONTINUE_GAME', savedState: loaded});notifySave('从存档中醒来','load');};

  // 结局CG预加载：SAN < 30 时静默预加载，暗示结局临近
  // SSOT: preload ending CGs at explanation_loss and below (level >= 3, SAN <= 39)
  useEffect(()=>{if(state.screen==='game'&&state.san<40)preloadEndingCGs();},[state.san,state.screen]);

  // Lazy-load ch2+ game data (web mode only — skipped if already merged at build time)
  // Chapter-gated: load ch2+ at day 5, meta at day 10 (reduces initial load)
  useEffect(()=>{
    if(state.screen!=='game')return;
    if(!GD._extendedEventsLoaded)return;
    try{
      if(state.day>=5)loadChapterData(GD,'ch2plus','game_ch2plus.json');
      if(state.day>=10)loadChapterData(GD,'meta','game_meta.json');
    }catch(e){/* non-fatal: game continues with existing data */}
  },[state.day,state.screen]);

  // SAN visual corruption: now handled by <SanPollutionLayer> component (see render below)

  if(state.screen==='title')return <>
    <TitleScreen
      onStart={()=>dispatch({type:'START_GAME'})}
      saveExists={savedExists}
      onContinue={()=>{uiStore.setState({saveLoadMode:'load',saveLoadOpen:true});}}
      onSettingsOpen={()=>uiStore.setState({settingsOpen:true})}
      onAchOpen={()=>uiStore.setState({achOpen:true})}
    />
    <SettingsModal open={ui.settingsOpen} onClose={()=>uiStore.setState({settingsOpen:false})} settings={settings} onChange={handleSettingsChange} onAchOpen={()=>uiStore.setState({achOpen:true})}/>
    <SaveLoadModal open={ui.saveLoadOpen} onClose={()=>uiStore.setState({saveLoadOpen:false})} state={null} onLoad={handleLoadSlot} mode="load" onSaved={notifySave}/>
    <AchievementGallery open={ui.achOpen} onClose={()=>uiStore.setState({achOpen:false})}/>
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
  const allowVisualFX=visualDistortion!==false;
  // SSOT: CSS classes aligned with san_stages
  //   san-tremor: explanation_loss [25,39] — text shakes
  //   san-fracture: reality_dissolution [10,24] — extreme distortion
  //   san-death: narrative_death [1,9] — maximum visual corruption
  const sanClass=allowVisualFX?(state.san<10?' san-fracture san-death':state.san<25?' san-fracture':state.san<40?' san-tremor':''):'';
  return <>
    <DevPanel state={state} dispatch={dispatch}/>
    <SanPollutionLayer san={state.san} loopCount={state.loopCount} corruption={state.safehouseCorruption||0} enabled={state.screen==='game' && allowVisualFX} intensity={settings.visualPollution??50}/>
    <AbyssPopup san={state.san}/>
    <div className={'game-layout '+(corrLevel>0?'corruption-'+corrLevel+' ':'')+sanClass+' '+fontSizeClass}>
      <GameHeader state={state} dispatch={dispatch} areas={areas} onSettingsOpen={()=>uiStore.setState({settingsOpen:true})} onUgcOpen={()=>uiStore.setState({ugcOpen:true})} onSaveOpen={()=>{uiStore.setState({saveLoadMode:'save',saveLoadOpen:true});}}/>
      <LeftPanel state={state}/>
      <CenterPanel state={state} dispatch={dispatch}/>
      <RightPanel state={state} dispatch={dispatch}/>
    </div>
    <SettingsModal open={ui.settingsOpen} onClose={()=>uiStore.setState({settingsOpen:false})} settings={settings} onChange={handleSettingsChange} onAchOpen={()=>uiStore.setState({achOpen:true})}/>
    <SaveLoadModal open={ui.saveLoadOpen} onClose={()=>uiStore.setState({saveLoadOpen:false})} state={state} onLoad={handleLoadSlot} mode={ui.saveLoadMode} onSaved={notifySave}/>
    <AchievementGallery open={ui.achOpen} onClose={()=>uiStore.setState({achOpen:false})}/>
    {ui.ugcOpen&&<Modal open={ui.ugcOpen} onClose={()=>uiStore.setState({ugcOpen:false})} title="模组管理" width="720px"><UgcPanel onClose={()=>uiStore.setState({ugcOpen:false})} GD={GD}/></Modal>}
    {ui.toasts.length>0&&<div className="achievement-toast-container">
      {ui.toasts.map(t=><AppToast key={t.key} toast={t} onDismiss={()=>removeUiToast(t.key)}/>)}
    </div>}
  </>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<ErrorBoundary><App/></ErrorBoundary>);
