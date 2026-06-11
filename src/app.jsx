// src/app.jsx - 深渊低语：沃切斯特之影 游戏主逻辑
// All imports are stripped by build.py bundler at build time.
// In Vite (ESM), these imports resolve to real modules.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { produce } from 'immer';

// ── Core reducers & systems ──
import { rand, d100, d3, clamp, pick, rollDice, shuffle } from './reducers/utils.js';
import { getPhase, getSealState, getSealStateId, getWeather, getAreaInfo, getConnectedAreas, getDistortedName } from './engine/WorldTimeSystem.js';
import { getSanStage, getSanTextVariant, getSanSceneVariant, processSanLoss, rollMadness } from './reducers/sanReducer.js';
import { getSafehouseStage, processSafehouseNight, getItemDef, useItemByDef, loadSettings, saveSettings } from './reducers/miscReducer.js';
import { checkTrigger, selectEvent, doSkillCheck, getGambleOptions, processNormalAnchorEvent } from './reducers/eventReducer.js';
import { applyEffects, applyLegacyEffects } from './reducers/effectReducer.js';
import { genObjectives, checkObjCompletion } from './reducers/objectiveReducer.js';
import { saveGame, loadGame, clearSave, hasSave, getAllSlots, autoSave, manualSave, loadSlot, deleteSlotById, migrateOldSave, exportSave, importSave } from './engine/SaveManager.js';
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
import { applyTextHallucination, maybeGetFakeMessage, getChoiceDelay, maybeInsertFalseMemory, corruptEventWeights } from './engine/PollutionManager.js';

// ── Engine & runtime ──
import { recordActionHistory } from './engine/EventEngine.js';
import { runPostReducerEffects } from './runtime/effectExecutor.js';

// ── Reducer slice handlers ──
import { handleCoreAction } from './reducers/slices/coreSlice.js';
import { handleExploreAction } from './reducers/slices/exploreSlice.js';
import { handleNpcAction } from './reducers/slices/npcSlice.js';
import { handleDailyAction } from './reducers/slices/dailySlice.js';
import { handleDarkAction } from './reducers/slices/darkSlice.js';
import { handleUiAction } from './reducers/slices/uiSlice.js';

// ── Utilities ──
import { addRunMemory, preloadEndingCGs, buildReducerCtx } from './utils/appHelpers.js';
import { getCorruptionLevel } from './utils/gameHelpers.js';
import { createErrorTracker } from './utils/errorTracker.js';

// ── State stores ──
import { initGameStore, updateGameStore } from './state/gameStore.js';
import { uiStore, getSettings, addUiToast, removeUiToast, notifySave } from './state/uiStore.js';
import { initialState } from './state/initialState.js';

// ── Components ──
import { UgcPanel } from './components/UgcImportExport.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { InteractiveTownMap, HotspotNode, MapPaths } from './components/InteractiveTownMap.js';
import { AreaPanelModal } from './components/AreaPanelModal.js';
import { FloatingInfoBar, NarrativeFloatingPanel } from './components/FloatingInfoBar.js';
import { GameLayout } from './components/GameLayout.js';
import { TOWN_HOTSPOTS, getVisibleHotspots, isHotspotUnlocked, getHotspotState } from './data/townHotspots.js';
import { audioManager } from './managers/AudioManager.js';
import { TitleScreen } from './components/TitleScreen.js';
import { AppToast } from './components/AppToast.js';
import { SettingsModal, SaveLoadModal, AchievementGallery } from './components/GameModals.jsx';
import { PrologueScreen, SurvivalGuide, CharCreation } from './components/GameScreens.jsx';
import { AbyssPopup } from './components/SanPollutionLayer.jsx';
import { DevPanel } from './components/ui/DevPanel.jsx';
import { EndingScreen, GameHeader, LeftPanel, CenterPanel, RightPanel } from './components/GamePanels.jsx';

// GAME_DATA placeholder is replaced at build time by build.py.
// In Vite, __GAME_DATA__ is set on window by main.vite.jsx before this module loads.

const {useState,useReducer,useEffect,useRef,useMemo,useCallback,memo}=React;

const GD=initExtendedEvents(__GAME_DATA__);
const ctx={GD};
/* [TRACKER-INIT] 初始化 — GD 之后，dispatch 之前 */
const errorTracker = createErrorTracker();
if (typeof window !== 'undefined') { window.errorTracker = errorTracker; }

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
// Pure state mutation: narrates and records memory. Returns side-effect descriptors for audio/timers.
function checkBreakWallEvent(state, narr){
  // SSOT: only fires at reality_dissolution and below (level >= 4, SAN <= 24)
  if(state.san>24)return null;
  if(Math.random()>=0.10)return null;
  const r=Math.random();
  const fx=[
    {type:'AUDIO_PLAY',id:'wall_break'},
    {type:'AUDIO_PLAY',id:'safehouse_wall'},
    {type:'AUDIO_PLAY',id:'bell_wrong'},
  ];
  if(r<0.33){
    // Effect 1: Fake save message
    narr('system','存档完成。Day '+state.day+' - '+(state.currentArea||'???'),{isSpecial:true});
    fx.push({type:'NARRATE_DELAYED',delay:3000,text:'它在看着你写入这段存档。',extra:{isSpecial:true}});
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
  return fx;
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

// === REDUCER (Immer) ===
// Immer draft: all direct mutations (s.xxx = ..., .push(), .pop()) are safe.
// Slice handlers receive (draft, action, c) and return draft if handled, null otherwise.
function gameReducer(state,action){
  return produce(state,(s)=>{
    _currentFearTuning = s.fearTuning || null;
    const c=buildReducerCtx(s);
    // Daily action tracking for behavior endings
    const trackableTypes=['MOVE','EXPLORE','TALK_NPC','USE_ITEM','SWITCH_SAFEHOUSE','REST','GAMBLE_CHOICE','DO_SKILL_CHECK','NPC_RESPONSE','WORK','PREACH','ATTACK','BUY_FOOD'];
    if(trackableTypes.includes(action.type)&&action.type!=='REST'){
      s._dayActions.push(action.type==='NPC_RESPONSE'?action.choice||'talk':action.type);
    }
    // Phase 5: Behavioral profiling — record action history for event selection
    if(typeof recordActionHistory==='function')recordActionHistory(s,action.type);
    // Track food/money hoarding
    if((s.food||0)>(c.bt.hoarded_food_max||0))c.bt.hoarded_food_max=s.food;
    if((s.money||0)>(c.bt.hoarded_money_max||0))c.bt.hoarded_money_max=s.money;
    // Dispatch to slice handlers (each returns s if handled, null otherwise)
    let r;
    r=handleCoreAction(s,action,c);    if(r)return;
    r=handleExploreAction(s,action,c,ctx); if(r)return;
    r=handleNpcAction(s,action,c);     if(r)return;
    r=handleDailyAction(s,action,c,ctx);   if(r)return;
    r=handleDarkAction(s,action,c);    if(r)return;
    r=handleUiAction(s,action,c);      if(r)return;
    // Tag effects deterministically from action.meta.actionId (no Date.now/random in reducer)
    if(c.effects.length>0){
      const batchId=action.meta?.actionId||'anon';
      c.effects.forEach((fx,i)=>{fx._fxId=batchId+'_'+i;});
      s._effects=c.effects;
    }
  });
}

function App(){
  const [state,rawDispatch]=useReducer(gameReducer,null,initialState);
  /* [TRACKER-DISPATCH] 包装 dispatch — 自动记录每步操作 */
  const stateRef=useRef(state);
  stateRef.current=state;
  const dispatch = useCallback((action) => {
    // Attach deterministic actionId for effect dedup (keeps reducer pure)
    if(!action.meta)action.meta={};
    if(!action.meta.actionId)action.meta.actionId=Date.now()+'_'+Math.random().toString(16).slice(2,6);
    errorTracker.record(action, stateRef.current);
    const result = rawDispatch(action);
    // Execute post-reducer side effects (audio, delayed narrate, etc.)
    try { runPostReducerEffects(result._effects, dispatch); } catch(e) {}
    // _effects consumed above; dedup Set prevents re-execution, toPersistedState strips on save
    return result;
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
        if(def)addUiToast({id,def,type:'achievement'});
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
    // SSOT: three independent pollution sliders
    dispatch({type:'SET_META_FIELD',field:'_visualPollution',value:settings.visualPollution??50});
    dispatch({type:'SET_META_FIELD',field:'_interactionPollution',value:settings.interactionPollution??50});
    dispatch({type:'SET_META_FIELD',field:'_metaPollution',value:settings.metaPollution??50});
    // Light pollution mode: override all sliders to minimum
    if(settings.lightPollutionMode){
      dispatch({type:'SET_META_FIELD',field:'_visualPollution',value:10});
      dispatch({type:'SET_META_FIELD',field:'_interactionPollution',value:5});
      dispatch({type:'SET_META_FIELD',field:'_metaPollution',value:25});
    }
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
    <SettingsModal open={ui.settingsOpen} onClose={()=>uiStore.setState({settingsOpen:false})} settings={settings} onChange={handleSettingsChange} onAchOpen={()=>uiStore.setState({achOpen:true})} dispatch={dispatch}/>
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
  // SSOT: stage class for CSS-driven effects (matches san_stages levels)
  const sanStageClass=allowVisualFX?(state.san<=9?' san-stage-5':state.san<=24?' san-stage-4':state.san<=39?' san-stage-3':state.san<=54?' san-stage-2':state.san<=74?' san-stage-1':''):'';
  const sanClass=allowVisualFX?(state.san<10?' san-fracture san-death':state.san<25?' san-fracture':state.san<40?' san-tremor':''):'';
  return <>
    <DevPanel state={state} dispatch={dispatch}/>
    <SanPollutionLayer san={state.san} loopCount={state.loopCount} corruption={state.safehouseCorruption||0} enabled={state.screen==='game' && allowVisualFX} intensity={settings.visualPollution??50} interactionPollution={settings.interactionPollution??50} metaPollution={settings.metaPollution??50}/>
    <AbyssPopup san={state.san}/>
    <div className={'game-root '+(corrLevel>0?'corruption-'+corrLevel+' ':'')+sanClass+sanStageClass+' '+fontSizeClass}>
      <GameLayout state={state} dispatch={dispatch} areas={areas} settings={settings}/>
    </div>
    <SettingsModal open={ui.settingsOpen} onClose={()=>uiStore.setState({settingsOpen:false})} settings={settings} onChange={handleSettingsChange} onAchOpen={()=>uiStore.setState({achOpen:true})} dispatch={dispatch}/>
    <SaveLoadModal open={ui.saveLoadOpen} onClose={()=>uiStore.setState({saveLoadOpen:false})} state={state} onLoad={handleLoadSlot} mode={ui.saveLoadMode} onSaved={notifySave}/>
    <AchievementGallery open={ui.achOpen} onClose={()=>uiStore.setState({achOpen:false})}/>
    {ui.ugcOpen&&<Modal open={ui.ugcOpen} onClose={()=>uiStore.setState({ugcOpen:false})} title="模组管理" width="720px"><UgcPanel onClose={()=>uiStore.setState({ugcOpen:false})} GD={GD}/></Modal>}
    {ui.toasts.length>0&&<div className="achievement-toast-container">
      {ui.toasts.map(t=><AppToast key={t.key} toast={t} onDismiss={()=>removeUiToast(t.key)}/>)}
    </div>}
  </>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<ErrorBoundary><App/></ErrorBoundary>);
