// src/reducers/slices/dailySlice.js - Extracted from gameReducer
// REST, WORK, BUY_FOOD

function handleDailyAction(s, action, c) {
  switch(action.type){
  case 'REST':{c.ensureMutableArrays();
    // Capture start-of-day values for daily summary
    const _startSan=s.san,_startHp=s.hp,_startClues=(s.clues||[]).length;
    const _startArea=s._dayStartArea||s.currentArea;
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
        c.narr('system','你腹中空空。胃部的抽搐让你难以集中注意力。',{isSpecial:true});
      }else if(sd===2){
        // Day 2: HP -1, skill check -5
        s.hp=Math.max(0,s.hp-1);
        c.narr('system','饥饿在啃噬你的意志。你的手脚开始发软，动作变得迟缓。',{isSpecial:true});
      }else{
        // Day 3+: HP -2, skill check -10, death chance
        s.hp=Math.max(0,s.hp-2);
        c.narr('system','你的身体已经开始消耗自身。视线模糊，每一个动作都是折磨。',{isSpecial:true});
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
      const deathCtx={mode:deathMode,type:deathType,area:s.currentArea,day:s.day,loop:s.loopCount,sourceEventId:null,sourceEventName:'饥饿致死',finalText:deathText,residueFlag:'death_echo_starvation'};
      applyDeathResolution(s, deathCtx, c.narr);
      return s;
    }
    // Safehouse degradation (5-stage system)
    s.safehouseCorruption=processSafehouseNight(s,ctx);
    // World decay — daily corruption advancement (player behavior + world entropy)
    {const dailyCorr=calculateDailyCorruption(s,ctx);
    s.safehouseCorruption=Math.min(100,(s.safehouseCorruption||0)+dailyCorr);
    s.pollution=Math.min(1,(s.pollution||0)+dailyCorr*0.003);}
    // Area-specific corruption tracking (player investigation accelerates area decay)
    if(typeof updateAreaCorruption==='function')updateAreaCorruption(s,ctx);
    // Safehouse 5-stage visual + mechanical system
    const visStage=getSafehouseVisualStage(s.safehouseCorruption||0);
    const shStage=getSafehouseStage(s.safehouseCorruption,ctx);
    audioManager.playEffect(visStage.sound);
    // Safehouse atmosphere narration per stage
    if(visStage.atmosphere&&Math.random()<0.5)c.narr('system',visStage.atmosphere,{isSpecial:true});
    // Safehouse pollution event (random chance based on stage)
    {const pollutionEvt=getSafehousePollutionEvent(visStage.stage);
    if(pollutionEvt){
      c.narr('system','【安全屋】'+pollutionEvt.text,{isSpecial:true});
      if(pollutionEvt.sanCost>0){s.san=clamp(s.san-pollutionEvt.sanCost,0,s.maxSan);c.narr('system','SAN -'+pollutionEvt.sanCost,{isEffect:true});}
    }}
    // Safehouse stage transition announcement
    {const prevStage=s._prevSafehouseStage||0;
    if(visStage.stage>prevStage&&visStage.stage>=2){
      c.narr('system','【'+visStage.name+'】'+visStage.description,{isSpecial:true});
    }
    s._prevSafehouseStage=visStage.stage;}
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
      c.narr('system','没有食物，你无法从休息中恢复。',{isSpecial:true});
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
      c.narr('system',chTransition.event_text,{isSpecial:true});
      if(chTransition.san_cost)s.san=clamp(s.san+chTransition.san_cost,0,s.maxSan);
      if(chTransition.mythos_gain)s.mythosLevel=(s.mythosLevel||0)+chTransition.mythos_gain;
    }
    // Motif flavor: fog/bell/water based on corruption
    if(Math.random()<0.2){
      const motifType=pick(['fog','bell','water']);
      const motifText=getMotifFlavorText(motifType,s.safehouseCorruption||0,ctx);
      if(motifText)c.narr('system',motifText);
    }
    const stage=getSanStage(s.san,ctx);
    if(stage.apMod!==0){s.ap=clamp(s.ap+stage.apMod,0,s.maxAp);c.narr('system','【'+stage.name+'】'+stage.desc+' AP修正：'+stage.apMod);}
    // Chapter 2 unlock announcement
    if(s.day===8){
      c.narr('system','浓雾稍微散去。你注意到之前忽略的小径——低语森林和灯塔的方向似乎不再那么遥不可及。',{isSpecial:true});
    }
    // Chapter progression events
    const progEvents=GD.implementation_notes?.chapter_progression_events||[];
    const todayEvent=progEvents.find(e=>e.day===s.day);
    if(todayEvent){
      c.narr('system','【事件】'+todayEvent.name+'——'+todayEvent.description,{isSpecial:true});
      if(todayEvent.effect?.all_npc_san){
        (GD.npcs||[]).forEach(npc=>{if(!s.npcStates[npc.name]?.dead)s.san=clamp(s.san+todayEvent.effect.all_npc_san,0,s.maxSan);});
      }
    }
    // Phase 5: Day-specific critical events (world actively attacks)
    {const dayCrit=getDayCriticalEvent(s.day);
    if(dayCrit&&!s.triggeredEvents.includes('day_crit_'+s.day)){
      s.triggeredEvents.push('day_crit_'+s.day);
      c.narr('event',dayCrit.text,{eventTitle:'第 '+s.day+' 天',eventType:'milestone',isSpecial:true});
      if(dayCrit.sanCost>0){s.san=clamp(s.san-dayCrit.sanCost,0,s.maxSan);c.narr('system','SAN -'+dayCrit.sanCost,{isEffect:true});}
      if(dayCrit.corruptionGain>0)s.safehouseCorruption=Math.min(100,(s.safehouseCorruption||0)+dayCrit.corruptionGain);
      addRunMemory(s,dayCrit.text.split('\\n')[0],'world_decay');
    }}
    // Phase 5: World decay atmosphere narrative (30% chance each night)
    if(Math.random()<0.3){
      const decayText=getWorldDecayNarrative(s.day,s.safehouseCorruption||0,s);
      if(decayText)c.narr('system',decayText);
    }
    // NPC trigger-based corruption (P0-3)
    const corruptionTriggers=checkNPCCorruption(s,ctx);
    for(const {npc,trigger} of corruptionTriggers){
      applyNPCCorruption(s,npc,trigger,c.narr);
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
    checkSilentEvent(s,c.narr,'safehouse');
    // SAN破壁事件 (P1-3)
    checkBreakWallEvent(s,c.narr);
    // Phase 6: Process daily resources (fatigue, infection, light)
    processDailyResources(s);
    // Phase 6: Resource-based narrative warnings
    {const resNarr=getResourceNarrative(s);if(resNarr)c.narr('system',resNarr,{isSpecial:true});}
    // Phase 3: Logic corruption at low SAN
    {const fakeMsg=maybeGetFakeMessage(s.san,s.loopCount);if(fakeMsg)c.narr('system',fakeMsg,{isSpecial:true,madness:{name:'幻觉',description:'你看到了不存在的东西。'}});}
    maybeInsertFalseMemory(c.narr,s.san,s.loopCount,s.day);
    // Meta-layer corruption: false events, false logs, save name pollution
    applyMetaCorruption(s, c, s._visualPollution);
    // Daily summary card (P2-2) — extracted to appHelpers.js
    narrDailySummary(s, c.narr, _startSan, _startHp, _startClues, _startArea);
    c.narr('system','\n═══ 第 '+s.day+' 天 ═══ 天气：'+s.weather+' ═══ 封印：'+s.sealState+' ═══');
    const area=getAreaInfo(s.currentArea,ctx);
    if(area)c.narr('location',area.description,{locationName:getAreaDisplayName(area,s),imageSrc:getAreaSceneImage(s.currentArea,s),imageAlt:getAreaDisplayName(area,s)});
    // Phase 5: Forced narrative hooks (progression-based micro-events)
    {const hook=checkForcedNarrativeHook(s);
    if(hook){s.triggeredEvents.push(hook.id);c.narr('system',hook.text,{isSpecial:true});
    if(hook.sanCost)s.san=clamp(s.san-hook.sanCost,0,s.maxSan);}}
    const ending=checkEnding(s,ctx);if(ending)s.ending={...ending,recap:buildDeathRecap(s)};
    if(s.day>28){
      s.deathContext={mode:'hp',type:'physical',area:s.currentArea,day:s.day,loop:s.loopCount,sourceEventId:null,sourceEventName:'时间耗尽',finalText:'封印崩溃，沃切斯特沉入深渊。',residueFlag:'death_echo_time'};
      s.lastDeathType='physical';s.lastDeathMode='hp';
      audioManager.playEffect('death_physical');
      s.ending={name:'时间耗尽',type:'bad',description:'封印崩溃，沃切斯特沉入深渊。',recap:buildDeathRecap(s)};
    }
    s.objectives=genObjectives(s.day,ctx);
    s.stats_run.days_best=Math.max(s.stats_run.days_best,s.day);
    c.log('第'+s.day+'天开始');

    // Check for new knowledge earned
    checkKnowledgeEarned(s);

    // Daily pattern analysis for behavior endings — extracted to appHelpers.js
    trackDailyBehaviorPatterns(s, c.bt);
    s._dayActions=[];
    s._dailyTrustGains={};
    s._todayEventTypes=[];
    s._dayStartArea=s.currentArea;

    // Auto-save after rest
    saveGame(s);audioManager.playUI('save');
    s.transition='rest';
    if(!s.tutorialSeen.first_rest)s.tutorialSeen={...s.tutorialSeen,first_rest:true};
    return s;
  }
  case 'WORK':{
    if(s.ap<2){c.narr('system','行动点不足（需要2AP）。');return s;}
    s.ap-=2;const earned=rand(3,12);s.money=(s.money||0)+earned;c.bt.work_count=(c.bt.work_count||0)+1;
    if((s.money||0)>(c.bt.hoarded_money_max||0))c.bt.hoarded_money_max=s.money;
    c.narr('system','你在码头帮了半天工。报酬微薄，但至少口袋里多了几枚硬币。金钱 +'+earned);
    c.log('打工挣钱');return s;
  }
  case 'BUY_FOOD':{
    if(s.ap<1){c.narr('system','行动点不足（需要1AP）。');return s;}
    const foodPrice=3;
    if((s.money||0)<foodPrice){c.narr('system','你的钱不够。购买食物需要 '+foodPrice+' 金钱。');return s;}
    if((s.food||0)>=(s.maxFood||5)){c.narr('system','你的食物已经满了。');return s;}
    s.ap-=1;s.money-=foodPrice;s.food=Math.min(s.maxFood,(s.food||0)+1);
    c.narr('system','你在杂货店买了一些食物。食物 +1，金钱 -'+foodPrice);
    c.log('购买食物');return s;
  }
  default:return null;
  }
}
