// src/app.jsx - 深渊低语：沃切斯特之影 游戏主逻辑
// Imports stripped by build.py bundler
import { getDistortedName } from './reducers/worldReducer.js';
import { getPollutionText } from './reducers/loopReducer.js';
import { getChapterForDay, getMythosCap, getChapterAlias, checkChapterTransition, getMotifFlavorText, getMonsterManifestation } from './reducers/chapterReducer.js';
import { checkConclusions, checkFalseInterpretations } from './reducers/conclusionReducer.js';
import { getGambleOptions } from './reducers/eventReducer.js';
import { checkNPCCorruption, applyNPCCorruption, setCorruptionFlag } from './reducers/npcReducer.js';
// __GAME_DATA__ 占位符在构建时替换为实际 JSON 数据

const {useState,useReducer,useEffect,useRef,useMemo,useCallback,memo}=React;
const GD=__GAME_DATA__;
const ctx={GD};

// === Audio Manager (Module 4) ===
const AUDIO_PATHS={
  ambient_day:'/audio/ambient_day_loop.mp3',
  ambient_night:'/audio/ambient_night_loop.mp3',
  san_loss:'/audio/san_drop_heartbeat.mp3',
  wall_break:'/audio/break_wall_noise.mp3',
  madness:'/audio/madness_tinnitus.mp3',
  begin:'/audio/begin_low_bell.mp3'
};
const audioManager={
  muted:false,suddenMuted:false,ambientEl:null,_volumeScale:1,
  _play(src,loop=false){
    try{
      if(this.muted)return null;
      const el=new Audio(src);el.loop=loop;el.volume=0.5*(this._volumeScale||1);el.play().catch(()=>{});return el;
    }catch(e){return null;}
  },
  playAmbientDay(){try{this.stopAmbient();this.ambientEl=this._play(AUDIO_PATHS.ambient_day,true);}catch(e){}},
  playAmbientNight(){try{this.stopAmbient();this.ambientEl=this._play(AUDIO_PATHS.ambient_night,true);}catch(e){}},
  playEffect(type){
    try{
      const sudden=['san_loss','wall_break','madness'];
      if(this.suddenMuted&&sudden.includes(type))return;
      const src=AUDIO_PATHS[type];if(src)this._play(src);
    }catch(e){}
  },
  stopAmbient(){try{if(this.ambientEl){this.ambientEl.pause();this.ambientEl.currentTime=0;this.ambientEl=null;}}catch(e){}},
  setMuted(m){this.muted=m;if(m)this.stopAmbient();}
};

// === P0-6: CHAPTER 1 VERTICAL SLICE SCRIPT ===
const CH1_INTRO=[
  {type:'system',text:'公元1926年，马萨诸塞州东南海岸。'},
  {type:'system',text:'你乘坐的长途汽车在浓雾中停了下来。司机回头看了一眼，没有说话，只是指了指车窗外隐约可见的路牌：\n\n沃切斯特 —— 3英里'},
  {type:'location',text:'鹅卵石街道在雨后泛着暗沉的光泽，两侧的维多利亚式建筑虽然外表还算完整，但窗后的窗帘永远紧闭。市政厅前的广场上矗立着一座建城者雕像，雕像的面容在岁月侵蚀下变得模糊不清。\n\n公告栏上贴满了失踪人口的告示，日期跨度长达三年。',locationName:'沃切斯特镇中心'},
  {type:'system',text:'教堂的钟响了。\n一下。两下。三下。\n……\n十二下。\n……\n十三下。\n\n没有人抬头。'},
  {type:'system',text:'【提示】你可以在镇中心和码头区自由活动。对话NPC获取情报，探索区域收集线索。\n注意SAN值——正常事件不会消耗你的理智，但深究异常需要付出代价。'}
];

// === AREA UNLOCK LOGIC ===
function isAreaUnlocked(area, day) {
  if (area.chapter_1_role === 'locked') return false;
  if (area.chapter_1_role === 'fully_accessible') return true;
  if (area.chapter_unlock === 'chapter_2' && day > 7) return true;
  return false;
}

function getAreaDisplayName(area, state) {
  return getDistortedName(area, state);
}

// === GAME STATE ===
const initialState=()=>({
  screen:'title',day:1,ap:12,maxAp:12,
  stats:{STR:50,CON:55,DEX:55,APP:50,POW:60,INT:65,SIZ:60,EDU:70},
  hp:11,maxHp:11,san:60,maxSan:60,luck:50,mp:12,
  currentArea:'town_center',visitedAreas:['town_center'],
  inventory:(GD.systems?.player?.starting_items?.starting_items||[]).map(item=>{
    const idMap={'手电筒':'flashlight','笔记本和笔':'notebook','急救包':'first_aid_kit','怀表':'pocket_watch'};
    return {id:idMap[item.name]||item.name,name:item.name,uses:item.uses};
  }),
  clues:[],skills:{},npcTrust:{},npcStates:{},
  sealState:'intact',weather:'阴天',
  triggeredEvents:[],triggeredSilentEvents:[],longTermEffects:[],madnessActive:null,
  objectives:[],completedChains:[],
  difficulty:'normal',
  narrative:[],eventLog:[],pendingEvent:null,pendingNpc:null,pendingGamble:null,ending:null,
  safehouseCorruption:0,currentSafehouse:'main',
  harborRiskReduction:0,
  tempSkillBonus:null,
  stats_run:{deaths:0,runs:1,checks_passed:0,checks_failed:0,days_best:0,max_san_loss_single:0,total_san_loss:0,deepest_area_danger:0},
  ch1IntroComplete:false,
  food:3,maxFood:5,lightLevel:2,
  loopCount:0,pollution:0,
  areaNameCache:{},
  retainedKnowledge:[],
  lastVisitedDates:{},
  lastDeathType:null,
  mythosLevel:0,currentChapter:'chapter_1',
  humanityScore:50,discoveredConclusions:[],
  accessibilityOptions:{visual_distortion:'medium',flicker_control:'medium',pseudo_error_style:'immersive'},
  activeBlessings:[],
  archetype:null,
  runMemory:[],
  audioMuted:false,
  tutorialSeen:{}
});

function initSkills(){
  const base={};
  (GD.systems?.player?.skills||GD.module5_player?.skills||[]).forEach(s=>{let v=s.base;if(typeof v==='string')v=50;base[s.name]=v;});
  return base;
}

function getNpcsHere(state){
  const npcs=GD.npcs||GD.module3_npcs||[];
  return npcs.filter(n=>{
    if(state.npcStates[n.name]?.dead)return false;
    const d=((state.day-1)%5)+1;
    const sch=(n.schedule||[]).find(x=>x.startsWith('day'+d));
    return sch&&sch.split(':')[1]===state.currentArea;
  });
}

function checkChainCompletion(state, narr){
  const chains=GD.clue_chains||[];
  for(const chain of chains){
    const chainClues=chain.clues||[];
    for(const clue of chainClues){
      if(state.clues.includes(clue.id))continue;
      // Check event-based unlocks
      if(clue.source&&state.triggeredEvents.includes(clue.source)&&!state.clues.includes(clue.id)){
        state.clues.push(clue.id);
        narr('system','【线索链：'+chain.name+'】发现线索「'+clue.name+'」',{isSpecial:true});
      }
    }
  }
}

function getSanVariant(san){
  if(san<=39)return 'abyssal';
  if(san<=59)return 'paranoid';
  if(san<=79)return 'anxious';
  return 'normal';
}

function getCorruptionLevel(san, loopCount){
  if(san<=20||loopCount>=5)return 3;
  if(san<=40||loopCount>=3)return 2;
  if(san<=60)return 1;
  return 0;
}

function getOptionText(key, san){
  const variants=GD.systems?.subjective_reality?.option_variants?.[key];
  if(!variants)return null;
  return variants[getSanVariant(san)]||variants.normal||null;
}

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
    if(inf.id==='wrong_lighthouse_destroy'&&state.visitedAreas.includes('lighthouse')&&state.triggeredEvents.includes('evt_lighthouse_light')&&!state.clues.includes('clue_2_2')){
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
  state.humanityScore=clamp((state.humanityScore||50)+amount,0,100);
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
function buildDeathRecap(state){
  const mem=state.runMemory||[];
  const deathType=state.hp<=0?'physical':state.san<=0?'mental':state.day>28?'time':'unknown';
  const deathEntry=mem.filter(m=>m.type==='death').slice(-1)[0];
  const causeEvent=deathEntry?deathEntry.text.replace(/^第 \d+ 天：/,''):(state.day>28?'封印崩溃，时间耗尽。':'你倒在了沃切斯特的黑暗中。');
  const timeline=mem.length>0?mem.slice(-8).map(m=>({day:m.day,type:m.type,text:typeof m==='string'?m:m.text})):[{day:state.day,type:'death',text:'第 '+state.day+' 天：你走到了记录无法继续的地方。'}];
  const keyDiscoveries=(state.clues||[]).slice(-5).map(c=>typeof c==='object'?c.text:c);
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
  audioManager.playEffect('wall_break');
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

// === REDUCER ===
// Lazy-clone pattern: arrays/objects are only cloned when a given action actually mutates them.
// Helper functions (checkSilentEvent, addRunMemory, checkChainCompletion, etc.) receive `s`
// and may push into its arrays, so we ensure those arrays are cloned before calling them.
function gameReducer(state,action){
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
    ['npcTrust','npcStates','stats','skills','lastVisitedDates','stats_run'].forEach(ensureObj);
  };
  const _narrCorrLayer=getUICorruptionLayer(s.san,s.loopCount,s.safehouseCorruption);
  const narr=(type,text,extra={})=>{
    cloneNarr();
    const entry={id:Date.now()+Math.random(),type,text,...extra};
    // getCorruptedSystemText: only for system/event text, skip special/recovery/madness
    if(_narrCorrLayer>0&&(type==='system'||type==='event')&&!extra.isSpecial&&!extra.isEffect&&!extra.madness){
      const corrupted=getCorruptedSystemText(text,_narrCorrLayer);
      if(corrupted!==text){entry._originalText=text;entry.text=corrupted;}
    }
    s.narrative.push(entry);
  };
  const log=(text)=>{cloneEvtLog();s.eventLog.push({day:s.day,text});};

  switch(action.type){
  case 'START_GAME':s.screen='creation';s.skills=initSkills();return s;
  case 'SET_DIFFICULTY':s.difficulty=action.difficulty;return s;
  case 'SET_ARCHETYPE':s.archetype=action.archetypeId;return s;
  case 'ROLL_STATS':{
    const d=(GD.systems?.player?.default_template||GD.module5_player?.default_template||{}).base_stats||{};
    const st={};
    Object.entries(d).forEach(([k,v])=>{st[k]=typeof v==='object'?rollDice(v.dice)*(v.multiplier||5):50;});
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
    audioManager.playEffect('begin');audioManager.playAmbientDay();
    s.currentChapter=getChapterForDay(s.day,ctx).key||'chapter_1';
    // Apply archetype NPC trust mods (P1-1)
    const archDef2=(GD.systems?.player?.archetypes||[]).find(a=>a.id===s.archetype);
    if(archDef2?.npc_trust_mod){Object.entries(archDef2.npc_trust_mod).forEach(([npc,v])=>{s.npcTrust[npc]=(s.npcTrust[npc]||0)+v;});}
    if(s.loopCount>0){
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
      narr('event',cutText,{eventTitle:'第一张告示',eventType:'opening_cut',isSpecial:true});
      if(!s.clues.includes('clue_missing_notice_self'))s.clues.push('clue_missing_notice_self');
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
    if(!isAreaUnlocked(targetArea,s.day)){narr('system','你还没有找到通往'+targetArea.name+'的路径。也许需要更多线索。');return s;}
    s.ap-=action.cost||1;s.currentArea=target;
    if(!s.visitedAreas.includes(target))s.visitedAreas.push(target);
    if(targetArea.danger_level>(s.stats_run.deepest_area_danger||0))s.stats_run.deepest_area_danger=targetArea.danger_level;
    if(!s.lastVisitedDates)s.lastVisitedDates={};
    s.lastVisitedDates={...s.lastVisitedDates,[target]:s.day};
    const displayName=getAreaDisplayName(targetArea,s);
    narr('system','你前往了'+displayName+'。');
    // Light level affects text corruption (P2-1)
    const lightCorrPenalty=(s.lightLevel||0)<(targetArea?.resource_pressure?.required_light_level||0)?2:1;
    let desc=getSanTextVariant(targetArea.description,s.san,pick,ctx);
    if(lightCorrPenalty>1&&Math.random()<0.3)desc+='\n\n光线不足。你不确定自己看到的是不是真的。';
    narr('location',desc,{locationName:displayName});
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
    log('前往'+displayName);if(!s.tutorialSeen.first_move)s.tutorialSeen={...s.tutorialSeen,first_move:true};return s;
  }
  case 'EXPLORE':{ensureMutableArrays();cloneInv();
    if(s.ap<2){narr('system','行动点不足（需要2AP）。');return s;}
    s.ap-=2;
    const evt=selectEvent(s.currentArea,s,ctx,pick);
    if(!evt){
      narr('system','四周平静，暂时没有发现异常。');
      const chains=GD.event_chains||GD.module4_event_extensions?.event_chains||[];
      for(const ch of chains){
        for(const eid of ch.sequence){
          const fe=GD.events?.find(e=>e.id===eid)||GD.module4_events?.find(e=>e.id===eid);
          if(fe&&!s.triggeredEvents.includes(eid)&&checkTrigger(fe,s)){
            narr('system','【保底推进】你注意到一些之前忽略的细节。',{isSpecial:true});
            s.triggeredEvents.push(eid);
            narr('event',fe.description,{eventTitle:fe.name,eventType:fe.type||fe.event_classification});
            return s;
          }
        }
      }
      return s;
    }
    s.triggeredEvents.push(evt.id);
    const evtText=getPollutionText(getSanTextVariant(evt.description,s.san,pick,ctx),s.pollution||0);
    narr('event',evtText,{eventTitle:evt.name,eventType:evt.type||evt.event_classification});
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
          const check=doSkillCheck(evt.skill_check.skill,evt.skill_check.threshold||50,s,s.difficulty,ctx);
          if(check.success){
            sanDmg=Math.max(1,Math.round(sanDmg*0.5));
            narr('system','【技能检定：'+check.skillName+'】掷骰 '+check.roll+' / 技能'+check.playerSkill+' —— 成功！SAN损失减半。');
            s.stats_run.checks_passed++;
          }else{
            narr('system','【技能检定：'+check.skillName+'】掷骰 '+check.roll+' / 技能'+check.playerSkill+' —— 失败！');
            s.stats_run.checks_failed++;
          }
        }
        s.san=clamp(s.san-sanDmg,0,s.maxSan);
        narr('system','SAN -'+sanDmg,{isEffect:true});
        // Achievement tracking
        s.stats_run.max_san_loss_single=Math.max(s.stats_run.max_san_loss_single||0,sanDmg);
        s.stats_run.total_san_loss=(s.stats_run.total_san_loss||0)+sanDmg;
        if(sanDmg>=3){addRunMemory(s,'在'+(s.currentArea||'某处')+'遭遇了什么——SAN -'+sanDmg,'san_loss');audioManager.playEffect('san_loss');}
      }
    }
    applyLegacyEffects(s, evt.effects);
    if(sanDmg>=5){
      const mad=rollMadness(ctx);s.madnessActive=mad;
      narr('madness','【临时疯狂：'+mad.name+'】'+mad.description,{madness:mad});
      addRunMemory(s,'经历了临时疯狂——'+mad.name,'madness');
      audioManager.playEffect('madness');
    }
    if(s.hp<=0){
      const failPhys=GD.implementation_notes?.failure_states?.failure_types?.physical_death;
      s.ending={name:failPhys?.name||'死亡',type:'bad',description:failPhys?.narrative_result||'你倒在了沃切斯特的黑暗中。',recap:buildDeathRecap(s)};
      addRunMemory(s,'在'+(s.currentArea||'某处')+'倒下，肉体消亡。','death');
      if(!s.tutorialSeen.first_death)s.tutorialSeen={...s.tutorialSeen,first_death:true};
    }
    if(s.san<=0){
      const ending=checkEnding(s,ctx);
      if(ending){s.ending={...ending,recap:buildDeathRecap(s)};}else{
        const failMental=GD.implementation_notes?.failure_states?.failure_types?.mental_death;
        s.ending={name:failMental?.name||'疯狂',type:'bad',description:failMental?.narrative_result||'你的理智彻底崩塌。',permanent_pollution:failMental?.permanent_pollution||0,recap:buildDeathRecap(s)};
      }
      addRunMemory(s,'理智归零，灵魂沉入深渊。','death');
      if(!s.tutorialSeen.first_death)s.tutorialSeen={...s.tutorialSeen,first_death:true};
    }
    s.objectives=checkObjCompletion(s.objectives,s);
    // Event chain progress: check if triggered event advances a chain
    const chains=GD.event_chains||[];
    for(const ch of chains){
      const seq=ch.sequence||[];
      const idx=seq.indexOf(evt.id);
      if(idx>=0){
        const progress=seq.filter(eid=>s.triggeredEvents.includes(eid)).length;
        if(progress>=seq.length){
          narr('system','【事件链完成】'+ch.name+'——这条线索已经完整了。',{isSpecial:true});
        }else if(idx<seq.length-1){
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
      conc.evidence.forEach(e=>narr('system','  · '+e));
      // Add unlocks as clues
      conc.unlocks.forEach(u=>{if(!s.clues.includes(u))s.clues.push(u)});
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
    log('探索：'+evt.name);if(!s.tutorialSeen.first_explore)s.tutorialSeen={...s.tutorialSeen,first_explore:true};return s;
  }
  case 'DO_SKILL_CHECK':{
    if(!s.pendingEvent||s.pendingEvent.rolled)return s;
    const evt=s.pendingEvent;const sc=evt.effects?.skill_check;
    if(!sc){s.pendingEvent={...evt,rolled:true,result:'no_check'};return s;}
    const result=doSkillCheck(sc.skill,sc.threshold||50,s,s.difficulty,ctx);
    s.pendingEvent={...evt,rolled:true,result:result.success?'success':'failure',roll:result.roll,playerSkill:result.playerSkill,threshold:result.threshold};
    if(result.success){
      s.stats_run.checks_passed++;
      narr('system','【技能检定：'+result.skillName+'】掷骰 '+result.roll+' / 技能'+result.playerSkill+' / 难度'+result.threshold+' —— 成功！');
      narr('system',sc.success?.text||sc.success||'检定成功。');
      if(Math.random()<0.1)s.skills[result.skillName]=(s.skills[result.skillName]||0)+rand(1,3);
    }else{
      s.stats_run.checks_failed++;
      narr('system','【技能检定：'+result.skillName+'】掷骰 '+result.roll+' / 技能'+result.playerSkill+' / 难度'+result.threshold+' —— 失败！'+(result.isCritFail?'（大失败！）':''));
      narr('system',sc.failure?.text||sc.failure||'检定失败。');
    }
    return s;
  }
  case 'TALK_NPC':{
    if(s.ap<1){narr('system','行动点不足。');return s;}
    s.ap-=1;ensureMutableArrays();const npc=action.npc;const trust=s.npcTrust[npc.name]||0;const ns=s.npcStates[npc.name]||{};
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
    // NPC déjà vu: loop threshold-based awareness
    if(s.loopCount>=3){
      const dejaVuRules=GD.systems?.loop?.npc_deja_vu_rules||[];
      let dejaVuLines=[];
      if(s.loopCount>=7){
        dejaVuLines=['你不需要说。我知道你是谁。你是所有版本的你。','这个世界在等你放弃。但它等不到的，对吗？','……你还在？'];
      }else if(s.loopCount>=5){
        dejaVuLines=['你又来了。这次不只是我记得。连世界都记得。','我昨晚梦到了你。梦里你已经来过很多次了。','你觉得如果我不说，你就不知道我已经知道了？'];
      }else{
        dejaVuLines=['……你来了。和上次一样。','等等，我是不是在哪见过你？不……不是这次。','你的眼神让我想起一个梦。梦里你也是这样看着我。','你……你不是昨天才来过吗？什么，今天是第一天？'];
      }
      if(Math.random()<0.25){
        narr('system',npc.name+'突然说："'+pick(dejaVuLines)+'"');
      }
    }
    log('与'+npc.name+'对话');if(!s.tutorialSeen.first_talk)s.tutorialSeen={...s.tutorialSeen,first_talk:true};return s;
  }
  case 'NPC_RESPONSE':{
    const npc=s.pendingNpc.npc;const trust=s.npcTrust[npc.name]||0;const choice=action.choice;const ns=s.npcStates[npc.name]||{};
    if(choice==='trust_up'){
      if(ns.corrupted&&Math.random()<0.6){
        narr('system',npc.name+'似乎很热情地回应你，但你隐约感到有些不对劲。');
      }else{
        const newTrust=Math.min(5,trust+1);
        s.npcTrust[npc.name]=newTrust;
        for(let lv=trust+1;lv<=newTrust;lv++){
          const layer=npc.trust_layers?npc.trust_layers.find(l=>l.level===lv):null;
          if(layer?.unlocks)layer.unlocks.forEach(u=>{if(!s.clues.includes(u))s.clues.push(u)});
        }
        narr('system',npc.name+'对你的信任度提升了。（信任等级：'+newTrust+'）');
        modHumanity(s,3,'与'+npc.name+'建立真诚的联系');
        addRunMemory(s,npc.name+'开始相信你。','npc');
      }
    }else if(choice==='get_item'){
      if(npc.secrets&&npc.secrets.length>trust){
        const secret=npc.secrets[Math.min(trust,npc.secrets.length-1)];
        narr('system',npc.name+'低声告诉你："'+secret+'"');
        if(!s.clues.includes(secret))s.clues.push(secret);
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
        s.npcStates[npc.name]={...s.npcStates[npc.name],corrupted:false};
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
      if((s.food||0)>=1){
        s.food--;
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
        // Trust bonus for sharing food
        s.npcTrust[npc.name]=Math.min(5,(s.npcTrust[npc.name]||0)+1);
        addRunMemory(s,'你把食物分给了'+npc.name+'。','npc');
      }else{
        narr('system','你没有食物可以分享了。');
      }
    }else if(choice==='leave'){s.pendingNpc=null;s.objectives=checkObjCompletion(s.objectives,s);}
    return s;
  }
  case 'USE_ITEM':{cloneInv();
    const item=action.item;const idx=s.inventory.findIndex(i=>i.name===item.name);
    if(idx<0||s.inventory[idx].uses===0)return s;
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
    // Food consumption (with area resource_pressure modifier)
    const restArea=getAreaInfo(s.currentArea,ctx);
    const foodMod=restArea?.resource_pressure?.food_consumption_modifier||1.0;
    const foodConsume=Math.ceil(1*foodMod);
    s.food=Math.max(0,(s.food||3)-foodConsume);
    if(s.food<=0){
      narr('system','你腹中空空，饥饿让意志动摇。疲劳感加剧。',{isSpecial:true});
      // Starvation: NPC trust decay chance
      const npcs=GD.npcs||GD.module3_npcs||[];
      npcs.forEach(npc=>{
        if(s.npcTrust[npc.name]>0&&Math.random()<0.3){
          s.npcTrust[npc.name]=Math.max(0,s.npcTrust[npc.name]-1);
        }
      });
    }
    // Safehouse degradation
    s.safehouseCorruption=processSafehouseNight(s,ctx);
    const shStage=getSafehouseStage(s.safehouseCorruption,ctx);
    let sanRec=shStage.available_functions?.san_recovery||0;
    const fatigueRec=shStage.available_functions?.fatigue_recovery||30;
    // Alternative safehouse bonus
    if(s.currentSafehouse!=='main'){
      const alts=GD.systems?.safehouse?.relocation_rules?.alternative_safehouses||[];
      const curAlt=alts.find(a=>a.name===s.currentSafehouse);
      if(curAlt?.functions?.san_restore) sanRec+=curAlt.functions.san_restore;
    }
    if(sanRec>0)s.san=clamp(s.san+sanRec,0,s.maxSan);
    if(sanRec<0)s.san=clamp(s.san+sanRec,0,s.maxSan);
    s.hp=clamp(s.hp+1,0,s.maxHp);
    s.longTermEffects.forEach(l=>{if(l.daysRemaining>0)l.daysRemaining--;});
    s.longTermEffects=s.longTermEffects.filter(l=>l.daysRemaining>0);
    if(s.tempSkillBonus){s.tempSkillBonus.days--;if(s.tempSkillBonus.days<=0)s.tempSkillBonus=null;}
    s.harborRiskReduction=0;
    const oldDay=s.day;
    s.day++;s.ap=s.maxAp;s.weather=getWeather(pick).name;s.sealState=getSealStateId(s.day,ctx);
    audioManager.playEffect('rest');
    try{const phase=getPhase(s.ap,s.maxAp);if(phase==='night'||phase==='midnight')audioManager.playAmbientNight();else audioManager.playAmbientDay();}catch(e){audioManager.playAmbientDay();}
    // Clear area name cache on new day
    s.areaNameCache={};
    // Chapter transition
    const chTransition=checkChapterTransition(oldDay,s.day,ctx);
    if(chTransition){
      s.currentChapter=getChapterForDay(s.day,ctx).key;
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
    narr('system','\n═══ 第 '+s.day+' 天 ═══ 天气：'+s.weather+' ═══ 封印：'+s.sealState+' ═══');
    const area=getAreaInfo(s.currentArea,ctx);
    if(area)narr('location',area.description,{locationName:getAreaDisplayName(area,s)});
    const ending=checkEnding(s,ctx);if(ending)s.ending={...ending,recap:buildDeathRecap(s)};
    if(s.day>28)s.ending={name:'时间耗尽',type:'bad',description:'封印崩溃，沃切斯特沉入深渊。',recap:buildDeathRecap(s)};
    s.objectives=genObjectives(s.day,ctx);
    s.stats_run.days_best=Math.max(s.stats_run.days_best,s.day);
    log('第'+s.day+'天开始');

    // Check for new knowledge earned
    checkKnowledgeEarned(s);

    // Auto-save after rest
    saveGame(s);
    if(!s.tutorialSeen.first_rest)s.tutorialSeen={...s.tutorialSeen,first_rest:true};
    return s;
  }
  case 'DISMISS_PENDING':s.pendingEvent=null;s.pendingNpc=null;s.pendingGamble=null;ensureArr('objectives');s.objectives=checkObjCompletion(s.objectives,s);return s;
  case 'AUDIO_MUTE_TOGGLE':s.audioMuted=!s.audioMuted;audioManager.setMuted(s.audioMuted);return s;
  case 'ACCESSIBILITY_TOGGLE':{
    const key=action.key;
    if(!s.accessibilityOptions)s.accessibilityOptions={};
    if(key==='visual_distortion'){
      s.accessibilityOptions={...s.accessibilityOptions,visual_distortion:s.accessibilityOptions.visual_distortion==='off'?'medium':'off'};
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
            const check=doSkillCheck(evt.skill_check.skill,evt.skill_check.threshold||50,s,s.difficulty,ctx);
            if(check.success){sanDmg=Math.max(1,Math.round(sanDmg*0.5));narr('system','【技能检定：'+check.skillName+'】成功！SAN损失减半。');s.stats_run.checks_passed++;}
            else{narr('system','【技能检定：'+check.skillName+'】失败！');s.stats_run.checks_failed++;}
          }
          s.san=clamp(s.san-sanDmg,0,s.maxSan);
          narr('system','SAN -'+sanDmg,{isEffect:true});
          s.stats_run.max_san_loss_single=Math.max(s.stats_run.max_san_loss_single||0,sanDmg);
          s.stats_run.total_san_loss=(s.stats_run.total_san_loss||0)+sanDmg;
          if(sanDmg>=3)audioManager.playEffect('san_loss');
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
      if(sanRoll>=3)audioManager.playEffect('san_loss');
      // Independent reward check
      const reward=opt.reward||{};
      const r=Math.random();
      if(r<reward.clue_chance){
        // Clue found — causal feedback
        const availableClues=(GD.clue_chains||[]).flatMap(c=>c.clues||[]).filter(c=>!s.clues.includes(c.id));
        if(availableClues.length>0){
          const found=pick(availableClues);
          s.clues.push(found.id);if(!s.tutorialSeen.first_clue&&s.clues.length===1)s.tutorialSeen={...s.tutorialSeen,first_clue:true};
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
        audioManager.playEffect('madness');
      }else{
        // No special outcome — default causal feedback
        narr('system','它只学会了你的呼吸频率。',{isSpecial:true});
      }
      // Also apply base event SAN damage
      let baseSanDmg=Math.abs(evt.sanity_damage||0);
      if(baseSanDmg>0){
        baseSanDmg=processSanLoss(baseSanDmg,s.inventory.map(i=>i.name),s.weather,s.day,s.difficulty,ctx);
        if(baseSanDmg>0){s.san=clamp(s.san-baseSanDmg,0,s.maxSan);narr('system','SAN -'+baseSanDmg,{isEffect:true});if(baseSanDmg>=3)audioManager.playEffect('san_loss');}
      }
    }
    // Post-gamble: check death
    if(s.san<=0){
      const ending=checkEnding(s,ctx);
      if(ending)s.ending={...ending,recap:buildDeathRecap(s)};
      else{s.ending={name:'疯狂',type:'bad',description:'你的理智彻底崩塌。',recap:buildDeathRecap(s)};}
    }
    applyLegacyEffects(s,evt.effects);
    s.objectives=checkObjCompletion(s.objectives,s);
    log('探索(赌博)：'+evt.name);
    return s;
  }
  case 'NEW_GAME':{
    const f=initialState();
    f.stats_run.deaths=s.stats_run.deaths+(s.hp<=0||s.san<=0?1:0);
    f.stats_run.runs=s.stats_run.runs+1;
    f.lastDeathType=s.hp<=0?'physical':s.san<=0?'mental':null;
    // Loop system
    f.loopCount=(s.loopCount||0)+1;
    const loopKey=f.loopCount<=5?'loop_'+f.loopCount:'loop_6_plus';
    const loopEffect=GD.systems?.loop?.loop_count_effects?.[loopKey];
    if(loopEffect){
      f.maxSan=Math.max(10,99+(loopEffect.san_cap_reduction||0));
      f.san=Math.min(f.san,f.maxSan);
      f.pollution=loopEffect.pollution_intensity||0;
    }
    // Carry over partial knowledge (30% skill retention)
    if(f.loopCount>1){
      const retainRate=0.3;
      Object.entries(s.skills).forEach(([k,v])=>{
        if(v>0)f.skills[k]=Math.max(f.skills[k]||0,Math.floor(v*retainRate));
      });
    }
    // Apply pollution rules
    if(f.pollution>0){
      const rules=GD.systems?.loop?.pollution_rules||[];
      rules.forEach(rule=>{
        if(rule.cumulative&&rule.id==='pollution_san_cap'){
          f.maxSan=Math.max(10,f.maxSan-5);
          f.san=Math.min(f.san,f.maxSan);
        }
      });
    }
    // Apply loop blessings (P0-2)
    const blessings=GD.systems?.loop?.loop_blessings||{};
    const bKey=f.loopCount<=5?'loop_'+f.loopCount:'loop_6_plus';
    const blessing=blessings[bKey];
    if(blessing){
      f.activeBlessings=[...(s.activeBlessings||[]),bKey];
    }
    // Carry over retained knowledge and conclusions
    f.retainedKnowledge=[...(s.retainedKnowledge||[])];
    f.discoveredConclusions=[...(s.discoveredConclusions||[])];
    f.humanityScore=s.humanityScore||50;
    f.tutorialSeen={...(s.tutorialSeen||{})};
    f.mythosLevel=Math.max(0,(s.mythosLevel||0)-2); // Mythos fades slightly between loops
    // Apply knowledge effects
    if(f.retainedKnowledge.includes('knowledge_npc_trust_shadow')){
      const coreNpcs=(GD.npcs||[]).filter(n=>n.chapter_1_availability==='core');
      if(coreNpcs.length>0){
        const target=pick(coreNpcs);
        f.npcTrust[target.name]=1;
      }
    }
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
    return { ...action.savedState, screen: 'game', narrative: [{id:Date.now(),type:'system',text:'—— 你从存档中醒来。'}] };
  }
  default:return s;
  }
}

// === COMPONENTS ===
function TitleScreen({onStart, onContinue, saveExists}){
  return <div className="title-screen">
    <h1>深渊低语</h1><h2>沃切斯特之影</h2>
    <div className="subtitle">公元1926年，马萨诸塞州，一座被浓雾笼罩的港口城市。失踪、疯狂、不可名状的低语——你被卷入了一场超越人类认知的噩梦。在理智崩塌之前，揭开古老封印的秘密。</div>
    <div style={{display:'flex',gap:'1rem',flexDirection:'column',alignItems:'center'}}>
      <button className="btn btn-primary" onClick={onStart}>踏入深渊</button>
      {saveExists && <button className="btn" onClick={onContinue}>继续游戏</button>}
    </div>
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
      </div>}
    </div>}
    <div style={{textAlign:'center',marginBottom:'1rem'}}><button className="btn" onClick={onRoll}>{rolled?'重新掷骰':'掷骰生成属性'}</button></div>
    {rolled&&<>
      <div className="stat-grid">{Object.entries(s).map(([k,v])=>{const mod=selectedArch?.stat_modifiers?.[k]||0;return <div key={k} className="stat-item"><div className="label">{k}</div><div className="value">{v}{mod!==0&&<span style={{fontSize:'0.65rem',color:mod>0?'var(--accent2)':'var(--danger2)'}}>{mod>0?'+':''}{mod}</span>}</div></div>;})}</div>
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

function StatBar({label,value,max,cls}){
  const pct=max>0?(value/max)*100:0;
  return <div className={'stat-bar '+(cls||'')}><div className="bar-label"><span className="name">{label}</span><span className="val">{value}/{max}</span></div><div className="bar-track"><div className="bar-fill" style={{width:pct+'%'}}/></div></div>;
}

const LeftPanel=memo(function LeftPanel({state}){
  const seal=useMemo(()=>(GD.world?.seal_state_machine||[]).find(s=>s.id===state.sealState)||(GD.module8_time_schedule?.seal_state_machine?.states||[]).find(s=>s.id===state.sealState),[state.sealState]);
  const shStage=useMemo(()=>getSafehouseStage(state.safehouseCorruption,ctx),[state.safehouseCorruption]);
  const altSanRestore=useMemo(()=>{
    if(state.currentSafehouse==='main')return 0;
    return (GD.systems?.safehouse?.relocation_rules?.alternative_safehouses||[]).find(a=>a.name===state.currentSafehouse)?.functions?.san_restore||0;
  },[state.currentSafehouse]);
  return <div className="left-panel">
    <div className="panel-title">状态</div>
    <StatBar label="HP" value={state.hp} max={state.maxHp} cls="hp"/>
    <StatBar label="SAN" value={state.san} max={state.maxSan} cls={'san'+(state.san<=30?' low':state.san<=50?' mid':'')}/>
    <StatBar label="AP" value={state.ap} max={state.maxAp} cls="ap"/>
    <StatBar label="食物" value={state.food||0} max={state.maxFood||5} cls="food"/>
    <div className="panel-title" style={{marginTop:'0.5rem'}}>属性</div>
    <div className="base-stats">{Object.entries(state.stats).map(([k,v])=><div key={k} className="base-stat"><div className="label">{k}</div><div className="val">{v}</div></div>)}</div>
    <div className="panel-title">技能 Top10</div>
    <div className="skills-section">{Object.entries(state.skills).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([k,v])=><div key={k} className="skill-item"><span className="name">{k}</span><span className="val">{v}%</span></div>)}</div>
    <div className="panel-title">道具 ({state.inventory.length})</div>
    <div className="items-section">{state.inventory.map((item,i)=><div key={i} className="item-entry"><span className="name">{item.name}</span>{item.uses>0&&<span className="uses"> ×{item.uses}</span>}{item.uses===-1&&<span className="uses"> ∞</span>}</div>)}</div>
    {seal&&<div className={'seal-status '+(state.sealState||'intact')}><div className="panel-title">封印状态</div><div className="state">{seal.name}</div><div style={{fontSize:'0.65rem',color:'var(--text-dim)'}}>{(seal.description||'').slice(0,50)}...</div></div>}
    <div className={'safehouse-info s'+shStage.stage}><div className="panel-title">安全屋{state.currentSafehouse!=='main'?' · '+state.currentSafehouse:''}</div><div className="stage-name">{shStage.name}</div><div style={{fontSize:'0.65rem',color:'var(--text-dim)'}}>SAN恢复：{shStage.available_functions?.san_recovery||0}{altSanRestore>0?' +'+altSanRestore:''} | 污染：{state.safehouseCorruption}%</div></div>
    <div className="weather-info">天气：{state.weather} | 光源：Lv.{state.lightLevel||0}</div>
    {state.clues.length>0&&<><div className="panel-title" style={{marginTop:'0.5rem'}}>线索 ({state.clues.length})</div>{state.clues.slice(-5).map((c,i)=><div key={i} style={{fontSize:'0.7rem',color:'var(--blue)',padding:'0.1rem 0'}}>• {c}</div>)}</>}
  </div>;
})

const NarrativeBlock=memo(function NarrativeBlock({block}){
  if(!block)return null;
  const isSanRecovery=block.type==='san-recovery';
  return <div className={'narrative-block'+(block.type==='system'?' system':'')+(block.isEffect?' system':'')+(block.isSpecial?' system':'')+(isSanRecovery?' san-recovery':'')}>
    {block.locationName&&<div className="location-name">📍 {block.locationName}</div>}
    {block.eventTitle&&<div className="event-title">{block.eventTitle}</div>}
    {block.eventType&&<div className={'event-type '+block.eventType}>{block.eventType}</div>}
    <div className="narrative-text">{block.text}</div>
    {block.madness&&<div className="madness-effect">⚠ {block.madness.name}：{block.madness.description}</div>}
  </div>;
})

function NPCDialog({npc,trust,layer,dispatch,state}){
  const [show,setShow]=useState(false);
  const ns=state?.npcStates?.[npc.name]||{};
  return <div className="narrative-block"><div className="skill-check">
    <div style={{color:'var(--cyan)',fontSize:'0.9rem',marginBottom:'0.3rem'}}>与 {npc.name} 交谈</div>
    <div style={{fontSize:'0.7rem',color:'var(--text-dim)',marginBottom:'0.3rem'}}>{npc.role}</div>
    <div style={{fontSize:'0.75rem',color:'var(--gold)',marginBottom:'0.3rem'}}>信任：{'★'.repeat(Math.max(0,trust))}{'☆'.repeat(Math.max(0,5-trust))}</div>
    {ns.corrupted&&<div style={{fontSize:'0.7rem',color:'var(--danger2)',marginBottom:'0.3rem'}}>⚠ 该NPC已被腐蚀</div>}
    {layer&&<div style={{color:'var(--text)',lineHeight:'1.8',marginBottom:'0.5rem',fontSize:'0.85rem'}}>{ns.corrupted?'（'+npc.name+'的状态不对，说话含混不清。）':layer.dialogue}</div>}
    {layer?.hint&&!ns.corrupted&&<div style={{fontSize:'0.7rem',color:'var(--gold)',fontStyle:'italic',marginBottom:'0.5rem'}}>{layer.hint}</div>}
    {!show?<button className="btn btn-sm" onClick={()=>setShow(true)}>回应</button>
    :<div style={{display:'flex',flexDirection:'column',gap:'0.3rem'}}>
      {trust<5&&<button className="btn btn-sm" onClick={()=>{dispatch({type:'NPC_RESPONSE',choice:'trust_up'});setShow(false)}}>{trust<2?'尝试建立信任':'加深了解'}（信任+1）</button>}
      {trust>=1&&npc.secrets&&trust<=npc.secrets.length&&<button className="btn btn-sm" onClick={()=>{dispatch({type:'NPC_RESPONSE',choice:'get_item'});setShow(false)}}>询问更多信息</button>}
      {state?.food>0&&<button className="btn btn-sm" onClick={()=>{dispatch({type:'NPC_RESPONSE',choice:'share_food'});setShow(false)}}>分享食物<span className="cost">食物-1 信任+1</span></button>}
      {ns.corrupted&&trust>=4&&<button className="btn btn-sm" style={{color:'var(--gold)'}} onClick={()=>{dispatch({type:'NPC_RESPONSE',choice:'redeem'});setShow(false)}}>尝试救赎</button>}
      <button className="btn btn-sm" onClick={()=>{dispatch({type:'NPC_RESPONSE',choice:'silence'});setShow(false)}}>沉默</button>
      <button className="btn btn-sm" onClick={()=>{dispatch({type:'NPC_RESPONSE',choice:'leave'});setShow(false)}}>告别</button>
    </div>}
  </div></div>;
}

const CenterPanel=memo(function CenterPanel({state,dispatch}){
  const ref=useRef(null);
  useEffect(()=>{if(ref.current)ref.current.scrollTop=ref.current.scrollHeight},[state.narrative.length]);
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
    </div>
    {!state.pendingEvent?.rolled&&!state.pendingNpc&&!state.pendingGamble&&!state.ending&&<div className="action-area">
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
      <div className="action-grid">
      <button className="action-btn" onClick={()=>dispatch({type:'EXPLORE'})} disabled={state.ap<2}>{getOptionText('investigate_sound',state.san)||'探索区域'}<span className="cost">2 AP</span></button>
      {conn.map(aid=>{const a=areas.find(ar=>ar.id===aid);if(!a)return null;const unlocked=isAreaUnlocked(a,state.day);const isRumor=a.chapter_1_role==='rumor_only'&&!unlocked;return <button key={aid} className="action-btn" onClick={()=>dispatch({type:'MOVE',areaId:aid})} disabled={state.ap<1||!unlocked}>{isRumor?'听说：':''}前往{a.name}{!unlocked?' [锁定]':''}<span className="cost">{!unlocked?'需要线索':'1 AP'}</span></button>;})}
      {npcs.map(n=><button key={n.name} className="action-btn" onClick={()=>dispatch({type:'TALK_NPC',npc:n})} disabled={state.ap<1}>与{n.name}交谈<span className="cost">1 AP</span></button>)}
      {state.inventory.filter(i=>i.uses!==0).map((it,i)=>{
        const label=itemUseInfo[it.name];if(!label)return null;
        return <button key={i} className="action-btn" onClick={()=>dispatch({type:'USE_ITEM',item:it})}>{'使用'+it.name}<span className="cost">{label}{it.uses>0?' ×'+it.uses:''}</span></button>;
      })}
      {getAvailableSafehouses(state).filter(sh=>state.currentSafehouse!==sh.name).map(sh=><button key={sh.name} className="action-btn" onClick={()=>dispatch({type:'SWITCH_SAFEHOUSE',safehouse:sh.name})}>搬到{sh.name}<span className="cost">SAN恢复+{sh.functions?.san_restore||0}</span></button>)}
      {state.currentSafehouse!=='main'&&<button className="action-btn" onClick={()=>dispatch({type:'SWITCH_SAFEHOUSE',safehouse:'main'})}>回酒馆<span className="cost">返回原安全屋</span></button>}
      <button className="action-btn" onClick={()=>dispatch({type:'REST'})}>{getOptionText('rest_at_safehouse',state.san)||'结束今日'}<span className="cost">休息恢复</span></button>
    </div></div>}
    {state.eventLog.length>0&&<div className="event-log">{state.eventLog.slice(-8).map((l,i)=><div key={i} className="log-entry"><span className="log-day">[Day {l.day}]</span> {l.text}</div>)}</div>}
  </div>;
})

const RightPanel=memo(function RightPanel({state,dispatch}){
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
  return <div className="right-panel">
    <div className="panel-title">地图</div>
    <div className="map-section">{areas.map(a=>{
      const vis=state.visitedAreas.includes(a.id);const reach=conn.includes(a.id);
      const unlocked=isAreaUnlocked(a,state.day);
      const isLocked=!unlocked&&!vis;
      const isRumor=a.chapter_1_role==='rumor_only'&&!unlocked&&!vis;
      const displayName=vis?getAreaDisplayName(a,state):(isRumor?a.early_game_alias||'???':'???');
      return <div key={a.id} className={'area-node'+(state.currentArea===a.id?' current':'')+(isLocked?' locked':'')+(isRumor?' rumor':'')} style={{opacity:vis?1:(isLocked?0.3:0.5)}} onClick={()=>{if(reach&&unlocked&&state.ap>=1)dispatch({type:'MOVE',areaId:a.id})}}>
        <div className="area-name">{displayName}</div><div className="area-type">{a.type}</div>
        <span className={'area-danger d'+a.danger_level}>危险 {'★'.repeat(Math.max(0,a.danger_level))}</span>
      </div>;
    })}</div>
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
    {state.objectives&&state.objectives.length>0&&<><div className="panel-title">当前目标</div><div className="clues-section">{state.objectives.map((o,i)=><div key={i} style={{fontSize:'0.7rem',padding:'0.15rem 0',color:o.done?'var(--san-high)':'var(--text-dim)'}}>{o.icon} {o.text} {o.done?'✓':''}</div>)}</div></>}
    {state.clues.length>0&&<><div className="panel-title">线索 ({state.clues.length})</div><div className="clues-section">{state.clues.map((c,i)=><div key={i} className="clue-entry">• {c}</div>)}</div></>}
    {state.completedChains&&state.completedChains.length>0&&<><div className="panel-title">事件链 ({state.completedChains.length})</div><div className="clues-section">{state.completedChains.map((cid,i)=><div key={i} style={{fontSize:'0.7rem',color:'var(--san-high)',padding:'0.15rem 0'}}>✓ {cid}</div>)}</div></>}
    {state.loopCount>0&&<><div className="panel-title" style={{color:'var(--purple)'}}>轮回</div><div style={{fontSize:'0.7rem',color:'var(--purple)',padding:'0.15rem 0'}}>第 {state.loopCount} 次轮回 | 污染：{Math.round((state.pollution||0)*100)}%</div></>}
    {state.activeBlessings&&state.activeBlessings.length>0&&<><div className="panel-title" style={{color:'var(--gold)'}}>恩赐</div>{state.activeBlessings.map((bkey,i)=>{
      const b=GD.systems?.loop?.loop_blessings?.[bkey];
      return b?<div key={i} style={{fontSize:'0.7rem',color:'var(--gold)',padding:'0.15rem 0'}}>★ {b.name}</div>:null;
    })}</>}
    {state.discoveredConclusions&&state.discoveredConclusions.length>0&&<><div className="panel-title" style={{color:'var(--gold)'}}>结论</div><div className="clues-section">{state.discoveredConclusions.map((cid,i)=>{
      const conc=(GD.systems?.clue_conclusion?.conclusions||[]).find(c=>c.id===cid);
      return <div key={i} className="conclusion-entry">★ {conc?.name||cid}</div>;
    })}</div></>}
    {/* In-progress conclusions (P2-2) */}
    {inProgressConclusions}
    {(state.humanityScore!==undefined&&state.humanityScore!==50)&&<><div className="panel-title" style={{color:state.humanityScore>=60?'var(--accent2)':state.humanityScore>=30?'var(--gold)':'var(--danger2)'}}>人性</div><div style={{fontSize:'0.7rem',color:state.humanityScore>=60?'var(--accent2)':state.humanityScore>=30?'var(--gold)':'var(--danger2)',padding:'0.15rem 0'}}>{state.humanityScore>=60?'尚存人性':state.humanityScore>=30?'人性脆弱':'人性迷失'} ({state.humanityScore})</div></>}
  </div>;
})

function EndingScreen({ending,state,dispatch}){
  const tc=ending.type==='good'?'good':ending.type==='bad'?'bad':ending.type==='hidden'?'hidden':'neutral';
  const recap=ending.recap;
  const isStructured=recap&&typeof recap==='object'&&!Array.isArray(recap)&&recap.deathType;
  const isFirstDeath=state.loopCount===0&&tc==='bad';
  const deathAnimClass=isFirstDeath?(isStructured&&recap.deathType==='mental'?'death-anim-mental':'death-anim-physical'):'';
  return <div className={'ending-screen '+tc+' '+deathAnimClass}>
    <h2>{ending.name}</h2>
    <div className="ending-desc">{ending.description}</div>
    {ending.rewards&&<div className="rewards"><div style={{marginBottom:'0.3rem'}}>奖励：</div>{ending.rewards.map((r,i)=><div key={i}>{r}</div>)}</div>}
    {isFirstDeath&&<div className="tutorial-hint" style={{maxWidth:'500px',margin:'0 auto 1rem'}}>死亡不是终点。你的部分知识会在下一轮保留。点击"再次踏入深渊"开始新的轮回。</div>}
    {isStructured?<>
      <div className="death-recap">
        <div className="recap-title">死因报告</div>
        <div className="recap-section">
          <div className="recap-section-label">终结</div>
          <div className="recap-section-content">{recap.causeEvent}</div>
          <div className="recap-section-meta">Day {recap.day} · {recap.deathType==='physical'?'肉体消亡':recap.deathType==='mental'?'理智崩塌':recap.deathType==='time'?'时间耗尽':'未知'}</div>
        </div>
        {recap.keyDiscoveries.length>0&&<div className="recap-section">
          <div className="recap-section-label">关键发现</div>
          {recap.keyDiscoveries.map((d,i)=><div key={i} className="recap-section-item">⚡ {d}</div>)}
        </div>}
        {recap.conclusionsUnlocked.length>0&&<div className="recap-section">
          <div className="recap-section-label">已解锁结论</div>
          {recap.conclusionsUnlocked.map((c,i)=><div key={i} className="recap-section-item">  {typeof c==='string'?c:c}</div>)}
        </div>}
        {recap.npcTrustHighlights.length>0&&<div className="recap-section">
          <div className="recap-section-label">NPC关系</div>
          {recap.npcTrustHighlights.map(([name,trust],i)=><div key={i} className="recap-section-item">{name}：信任 {trust}/5</div>)}
        </div>}
        {recap.permanentUnlocks.length>0&&<div className="recap-section">
          <div className="recap-section-label">永久解锁</div>
          {recap.permanentUnlocks.map((b,i)=><div key={i} className="recap-section-item">{b}</div>)}
        </div>}
        {recap.pollutionGained>0&&<div className="recap-section">
          <div className="recap-section-label">污染</div>
          <div className="recap-section-content" style={{color:'var(--purple)'}}>世界污染 {Math.round(recap.pollutionGained*100)}%</div>
        </div>}
        {recap.adviceLine&&<div className="recap-section">
          <div className="recap-section-label">建议</div>
          <div className="recap-section-content" style={{fontStyle:'italic'}}>{recap.adviceLine}</div>
        </div>}
        {recap.timeline.length>0&&<div className="recap-section">
          <div className="recap-section-label">时间线</div>
          {recap.timeline.map((m,i)=><div key={i} className="recap-line">Day {m.day}｜{m.text.replace(/^第 \d+ 天：/,'')}</div>)}
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

function App(){
  const [state,dispatch]=useReducer(gameReducer,null,initialState);
  const savedExists = hasSave();

  if(state.screen==='title')return <TitleScreen
    onStart={()=>dispatch({type:'START_GAME'})}
    saveExists={savedExists}
    onContinue={()=>{
      const loaded = loadGame();
      if (loaded && !loaded.incompatible) {
        dispatch({type:'CONTINUE_GAME', savedState: loaded});
      } else if (loaded && loaded.incompatible) {
        alert('存档版本不兼容，请开始新游戏。');
        clearSave();
      }
    }}
  />;
  if(state.screen==='creation')return <CharCreation state={state} onRoll={()=>dispatch({type:'ROLL_STATS'})} onStart={()=>dispatch({type:'BEGIN_ADVENTURE'})} onSetDifficulty={(d)=>dispatch({type:'SET_DIFFICULTY',difficulty:d})} onSetArchetype={(id)=>dispatch({type:'SET_ARCHETYPE',archetypeId:id})}/>;
  if(state.ending)return <EndingScreen ending={state.ending} state={state} dispatch={dispatch}/>;
  const corrLevel=getCorruptionLevel(state.san,state.loopCount);
  const visualDistortion=state.accessibilityOptions?.visual_distortion;
  const allowVisualFX=visualDistortion!=='none'&&visualDistortion!=='off';
  const sanClass=allowVisualFX?(state.san<20?' san-fracture':state.san<40?' san-tremor':''):'';
  return <div className={'game-layout'+(corrLevel>0?' corruption-'+corrLevel:'')+sanClass}>
    <div className="game-header">
      <span className="title">深渊低语：沃切斯特之影</span>
      <div className="day-info">
        <span><span className="label">章节 </span><span className="value" style={{color:'var(--purple)'}}>{(getChapterForDay(state.day,ctx).name)||'序章'}</span></span>
        <span><span className="label">日期 </span><span className="value">Day {state.day}</span></span>
        <span><span className="label">AP </span><span className="value">{state.ap}/{state.maxAp}</span></span>
        <span><span className="label">封印 </span><span className="value" style={{color:state.sealState==='intact'?'var(--san-high)':state.sealState==='weakening'?'var(--san-mid)':'var(--san-low)'}}>{state.sealState}</span></span>
        <span><span className="label">天气 </span><span className="value">{state.weather}</span></span>
        <span><span className="label">SAN </span><span className="value" style={{color:getSanStage(state.san,ctx).color}}>{getSanStage(state.san,ctx).name}</span></span>
        {(state.mythosLevel||0)>0&&<span><span className="label">神话 </span><span className="value" style={{color:'var(--purple)'}}>Lv.{state.mythosLevel}</span></span>}
        <span style={{display:'flex',gap:'0.3rem',alignItems:'center'}}>
          <button className="btn btn-sm" onClick={()=>dispatch({type:'AUDIO_MUTE_TOGGLE'})} style={{padding:'0.1rem 0.4rem',fontSize:'0.65rem'}} title={state.audioMuted?'取消静音':'静音'}>{state.audioMuted?'🔇':'🔊'}</button>
          <button className="btn btn-sm" onClick={()=>dispatch({type:'ACCESSIBILITY_TOGGLE',key:'sudden_sounds'})} style={{padding:'0.1rem 0.4rem',fontSize:'0.65rem',opacity:state.accessibilityOptions?.sudden_sounds==='off'?1:0.5}} title={state.accessibilityOptions?.sudden_sounds==='off'?'突发音效：已关闭':'降低突发音效'}>⚡</button>
          <button className="btn btn-sm" onClick={()=>dispatch({type:'ACCESSIBILITY_TOGGLE',key:'visual_distortion'})} style={{padding:'0.1rem 0.4rem',fontSize:'0.65rem',opacity:state.accessibilityOptions?.visual_distortion==='off'?1:0.5}} title={state.accessibilityOptions?.visual_distortion==='off'?'视觉特效：已关闭':'关闭视觉特效'}>👁</button>
        </span>
      </div>
    </div>
    <LeftPanel state={state}/>
    <CenterPanel state={state} dispatch={dispatch}/>
    <RightPanel state={state} dispatch={dispatch}/>
  </div>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
