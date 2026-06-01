// src/utils/appHelpers.js - Extracted from app.jsx
// All functions use global GD, ctx, pick, clamp from bundle scope.

function getUICorruptionLayer(san, loopCount, safehouseCorruption){
  if(san<=5||safehouseCorruption>=80)return 4; // hostile — 濒死疯狂（SAN=0已触发死亡，≤5是最后可见窗口）
  if(san<=10||safehouseCorruption>=60)return 3; // contradictory — 濒临疯狂
  if(san<=30||loopCount>=3)return 2; // repetitive — 动摇
  if(san<=50||safehouseCorruption>=20)return 1; // fogged — 不安
  return 0; // clean — 理智
}

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

function getAvailableSafehouses(state){
  const alts=GD.systems?.safehouse?.relocation_rules?.alternative_safehouses||[];
  return alts.filter(sh=>{
    const npcName=sh.unlock_condition.includes('伊莱亚斯')?'伊莱亚斯·沃德':sh.unlock_condition.includes('希尔达')?'希尔达·莫里斯':null;
    const trustNeeded=parseInt(sh.unlock_condition.match(/\d+/)?.[0]||'99');
    return npcName&&(state.npcTrust[npcName]||0)>=trustNeeded;
  });
}

// === Death Resolution (extracted from 4 duplicate blocks in app.jsx) ===
const _DEATH_HP_TYPES=['drowning','bleeding','infection','starvation','falling','darkness_taken','physical'];
const _DEATH_SAN_TYPES=['madness','possession','identity_erasure','mythos_absorption','loop_collapse','becomes_event','mental'];

/**
 * Play death sound, write narrative, build ending, track memory.
 * Mutates `s` directly (same as gameReducer convention).
 *
 * @param {object} s          - mutable game state
 * @param {object} deathCtx   - from resolveDeath()
 * @param {function} narr     - narrative pusher
 */
function applyDeathResolution(s, deathCtx, narr){
  s.deathContext = deathCtx;
  s.lastDeathType = deathCtx.type;
  s.lastDeathMode = deathCtx.mode;
  // Sound
  if(_DEATH_HP_TYPES.includes(deathCtx.type))audioManager.playEffect('death_physical');
  else if(_DEATH_SAN_TYPES.includes(deathCtx.type))audioManager.playEffect('death_mental');
  else audioManager.playEffect('death_hybrid');
  // Narrative
  narr('death', deathCtx.finalText, { isSpecial: true });
  // Ending
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
    s.ending={name:'身心俱灭',type:'bad',description:deathCtx.finalText,recap:buildDeathRecap(s,deathCtx)};
  }
  addRunMemory(s, deathCtx.finalText.split('\n')[0], 'death');
  if(!s.tutorialSeen.first_death)s.tutorialSeen={...s.tutorialSeen,first_death:true};
}

// === Daily Summary Card (extracted from REST case in app.jsx) ===
const _ACT_NAMES={MOVE:'移动',EXPLORE:'探索',TALK_NPC:'交谈',WORK:'打工',BUY_FOOD:'购买食物',USE_ITEM:'使用物品',SWITCH_SAFEHOUSE:'更换安全屋'};

function narrDailySummary(s, narr, _startSan, _startHp, _startClues, _startArea){
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
    const desc=Object.entries(actCounts).map(([k,v])=>(_ACT_NAMES[k]||k)+(v>1?'×'+v:'')).join('、');
    parts.push('行动：'+desc+'。');
  }
  if(sanDelta!==0)parts.push('精神'+(sanDelta>0?'+':'')+sanDelta);
  if(hpDelta!==0)parts.push('体力'+(hpDelta>0?'+':'')+hpDelta);
  if(cluesFound>0)parts.push('发现'+cluesFound+'条线索');
  if(acts.includes('EXPLORE')&&cluesFound===0)parts.push('探索未发现新线索');
  narr('system','【今日总结】'+parts.join('，')+'。',{isSpecial:true});
}

// === Daily Behavior Pattern Analysis (extracted from REST case) ===
function trackDailyBehaviorPatterns(s, bt){
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

// === CH1 Vertical Slice Script ===
const CH1_INTRO=[
  {type:'system',text:'公元1926年，马萨诸塞州东南海岸。'},
  {type:'system',text:'你乘坐的长途汽车在浓雾中停了下来。司机回头看了一眼，没有说话，只是指了指车窗外隐约可见的路牌：\n\n沃切斯特 —— 3英里'},
  {type:'location',text:'鹅卵石街道在雨后泛着暗沉的光泽，两侧的维多利亚式建筑虽然外表还算完整，但窗后的窗帘永远紧闭。市政厅前的广场上矗立着一座建城者雕像，雕像的面容在岁月侵蚀下变得模糊不清。\n\n公告栏上贴满了失踪人口的告示，日期跨度长达三年。',locationName:'沃切斯特镇中心'},
  {type:'system',text:'教堂的钟响了。\n一下。两下。三下。\n……\n十二下。\n……\n十三下。\n\n没有人抬头。'},
  {type:'system',text:'【提示】你可以在镇中心和码头区自由活动。对话NPC获取情报，探索区域收集线索。\n注意SAN值——正常事件不会消耗你的理智，但深究异常需要付出代价。'}
];
// === Event Type Labels ===
const EVENT_TYPE_LABELS={opening_cut:'序章',area_event:'区域事件',mythos:'神秘事件',resource:'资源事件',humanity:'人性事件',meta:'隐秘事件',silent:'静默事件',prologue:'前传',area_deep:'深层探索',npc_cross:'NPC交错',loop_locked:'轮回锁定',clue:'线索',ending:'结局',madness_immunity:'疯狂免疫',identify_false_clue:'辨别伪证',mechanism:'机关',horror:'恐怖',investigation:'调查',minor_abnormal:'轻微异常',normal:'普通',bad:'负面',good:'正面',hidden:'隐藏',consumable:'消耗品',key_item:'关键物品',add_clue:'线索获取',add_flag:'标记',modify_event_weight:'事件权重',modify_npc_trust:'信任变动',modify_resource:'资源变动'};
// === Ending CG Preload ===
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

// === Reducer Context Builder ===
// Builds the shared context object passed to all slice handlers from gameReducer.
// Each slice receives (s, action, c) where c is this context.
function buildReducerCtx(s, state, ensureArrFn, ensureObjFn) {
  const MAX_NARRATIVE_ENTRIES=250;
  const _narrCorrLayer=getUICorruptionLayer(s.san,s.loopCount,s.safehouseCorruption);
  const bt=s.behaviorTracking;
  let _narrCloned=false,_evtLogCloned=false,_invCloned=false;
  const cloneNarr=()=>{if(!_narrCloned){s.narrative=[...(state.narrative||[])];_narrCloned=true;}};
  const cloneEvtLog=()=>{if(!_evtLogCloned){s.eventLog=[...(state.eventLog||[])];_evtLogCloned=true;}};
  const cloneInv=()=>{if(!_invCloned){s.inventory=state.inventory.map(i=>({...i}));_invCloned=true;}};
  const narr=(type,text,extra={})=>{
    cloneNarr();
    const entry={id:Date.now()+Math.random(),type,text,...extra};
    if(_narrCorrLayer>0&&(type==='system'||type==='event')&&!extra.isSpecial&&!extra.isEffect&&!extra.madness){
      const corrupted=getCorruptedSystemText(text,_narrCorrLayer);
      if(corrupted!==text){entry._originalText=text;entry.text=corrupted;}
    }
    s.narrative.push(entry);
    if(s.narrative.length>MAX_NARRATIVE_ENTRIES){s.narrative=s.narrative.slice(-MAX_NARRATIVE_ENTRIES);}
  };
  const log=(text)=>{cloneEvtLog();s.eventLog.push({day:s.day,text});};
  const ensureMutableArrays=()=>{
    ['triggeredEvents','triggeredSilentEvents','longTermEffects','clues',
     'completedChains','objectives','retainedKnowledge','runMemory',
     'visitedAreas','discoveredConclusions','activeBlessings'
    ].forEach(ensureArrFn);
    ['npcTrust','npcStates','stats','skills','lastVisitedDates','stats_run','behaviorTracking'].forEach(ensureObjFn);
    if(s.triggeredEvents.length>1000)s.triggeredEvents=s.triggeredEvents.slice(-1000);
  };
  return {
    narr, log, ensureMutableArrays, bt,
    ensureArr: ensureArrFn, ensureObj: ensureObjFn,
    cloneInv, cloneNarr, cloneEvtLog,
  };
}
