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

// === NPC Memory Lines (extracted from TALK_NPC in app.jsx to avoid per-call allocation) ===
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

/**
 * Handle NPC memory tier logic for loop >= 3. Returns lines to narrate or null.
 * Also mutates state for loop 10+ behavior memory.
 */
function handleNpcMemoryTier(s, npc, narr){
  const loop = s.loopCount;
  if(loop < 3) return;
  const npcLines = NPC_MEMORY_LINES[npc.name];
  if(!npcLines) return;
  let tier, probability;
  if(loop>=10){ tier='t4'; probability=1.0; }
  else if(loop>=8){ tier='t3'; probability=0.6; }
  else if(loop>=5){ tier='t2'; probability=0.4; }
  else{ tier='t1'; probability=0.25; }
  if(npcLines[tier] && Math.random()<probability){
    narr('system', npc.name+'突然说："'+pick(npcLines[tier])+'"');
  }
  // Loop 10+：NPC 行为变化（信任回响）
  if(loop>=10 && npcLines.t4){
    const behaviorMemory=s._npcBehaviorMemory||{};
    if(!behaviorMemory[npc.name]){
      if(!s._npcBehaviorMemory)s._npcBehaviorMemory={};
      s._npcBehaviorMemory={...s._npcBehaviorMemory,[npc.name]:true};
      const currentTrust=s.npcTrust[npc.name]||0;
      if(currentTrust<3){
        s.npcTrust={...s.npcTrust,[npc.name]:Math.min(3,currentTrust+1)};
        narr('system','（'+npc.name+'看着你，像是在确认什么。信任度悄然提升。）',{isSpecial:true});
      }
    }
  }
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

// === Critical Progress Guards Data ===
const CRITICAL_PROGRESS_GUARDS = [
  {
    id: 'guard_harbor_chain', deadlineDay: 6,
    requiredClues: ['clue_1_1', 'clue_1_2', 'clue_1_3'], chainId: 'chain_harbor',
    minCluesNeeded: 1, fallbackArea: 'harbor_district',
    fallbackNarrative: '你在码头边徘徊，注意到一张被海浪冲上岸的纸片。上面的字迹已经被海水模糊，但你依稀能辨认出几个数字和一个名字。',
    fallbackClueHint: 'clue_1_1', guardFlag: 'guard_harbor_chain_fired'
  },
  {
    id: 'guard_lighthouse_signal', deadlineDay: 10,
    requiredClues: ['clue_2_1', 'clue_2_2'], chainId: 'chain_lighthouse',
    minCluesNeeded: 1, fallbackArea: 'lighthouse',
    fallbackNarrative: '你安全屋的窗户突然发出一阵震动。远处灯塔的光在浓雾中划出一道异常的轨迹——三短、三长、三短。你把这个图案记了下来。',
    fallbackClueHint: 'clue_2_1', guardFlag: 'guard_lighthouse_signal_fired'
  },
  {
    id: 'guard_morris_chain', deadlineDay: 8,
    requiredClues: ['clue_m_1', 'clue_m_2', 'clue_m_3'], chainId: 'chain_morris',
    minCluesNeeded: 1, fallbackArea: 'voxchester_manor',
    fallbackNarrative: '你翻阅旧笔记时，一张泛黄的便签从笔记本里滑落。上面是莫里斯家族的族谱碎片——至少给你指了一个方向。',
    fallbackClueHint: 'clue_m_1', guardFlag: 'guard_morris_chain_fired'
  },
  {
    id: 'guard_heretical_chain', deadlineDay: 7,
    requiredClues: ['clue_h_1', 'clue_h_2', 'clue_h_3'], chainId: 'chain_heretical',
    minCluesNeeded: 1, fallbackArea: 'town_center',
    fallbackNarrative: '教堂的钟声在凌晨三点响起。不是十三声——只有三声。你记下了钟声的节奏，它似乎在传达某种信息。',
    fallbackClueHint: 'clue_h_1', guardFlag: 'guard_heretical_chain_fired'
  }
];

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
// === MAP_LAYOUT ===
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
// === MAP_EDGES ===
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
// === MAP_ZONES ===
const MAP_ZONES=[
    {label:'镇 区',x:42,y:16,areas:['town_center','voxchester_manor']},
    {label:'海 岸',x:16,y:42,areas:['harbor_district','lighthouse']},
    {label:'地 下',x:52,y:68,areas:['catacombs_entrance','deep_catacombs']},
    {label:'森 林',x:78,y:42,areas:['whispering_forest','forbidden_grove']},
    {label:'遗 迹',x:40,y:84,areas:['ruins_of_yith']},
  ];
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
