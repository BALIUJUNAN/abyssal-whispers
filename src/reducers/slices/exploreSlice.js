// src/reducers/slices/exploreSlice.js - Extracted from gameReducer
// MOVE, EXPLORE, DO_SKILL_CHECK

// §3.3: Meta event real consequences
function applyMetaEffect(effectType, state, evt, c) {
  if (!effectType) return;
  switch (effectType) {
    case 'overwrite_save_slot':
      // §3.3: "虚假的存档" — 标记存档槽被覆盖
      state._metaSaveOverwritten = true;
      c.narr('system', '存档已更新为最新版本。你可能失去了什么。', { isSpecial: true });
      break;
    case 'npc_trust_lock_random':
    case 'npc_trust_lock_and_achievement':
      // §3.3: NPC信任锁定为0 + 解锁成就
      var trustNpcs = Object.entries(state.npcTrust || {}).filter(function(kv) { return kv[1] >= 3; });
      if (trustNpcs.length > 0) {
        var target = trustNpcs[Math.floor(Math.random() * trustNpcs.length)];
        state.npcTrust[target[0]] = 0;
        state._npcTrustLocked = state._npcTrustLocked || {};
        state._npcTrustLocked[target[0]] = true;
        c.narr('system', target[0] + '突然说了一串你听不懂的话。然后沉默了。你感到——有什么东西断裂了。', { isSpecial: true });
      }
      if (effectType === 'npc_trust_lock_and_achievement') {
        state._achievements = state._achievements || [];
        if (!state._achievements.includes('achievement_fourth_wall')) {
          state._achievements.push('achievement_fourth_wall');
          c.narr('system', '【成就解锁】打破第四面墙', { isSpecial: true });
        }
      }
      break;
    case 'npc_permanent_disappear':
      // §3.3: "作者的提示" — 随机NPC永久失踪
      var aliveNpcs = Object.entries(state.npcStates || {}).filter(function(kv) { return !kv[1].dead; });
      if (aliveNpcs.length > 0) {
        var victim = aliveNpcs[Math.floor(Math.random() * aliveNpcs.length)];
        state.npcStates[victim[0]] = { ...state.npcStates[victim[0]], dead: true, disappearance: 'meta_vanish' };
        c.narr('system', victim[0] + '失踪了。没有人记得他/她是什么时候消失的。好像从来没有存在过。', { isSpecial: true });
      }
      break;
    case 'delete_dialogue_branch':
      // §3.3: "选择的消失" — 删除一个未选择的对话分支
      state._deletedBranches = state._deletedBranches || [];
      state._deletedBranches.push({ day: state.day, source: evt.id });
      c.narr('system', '你感到——某种可能性消失了。一条你没有走过的路，现在永远走不了了。', { isSpecial: true });
      break;
  }
}

// P1: Quality tier dynamic truncation
// Tier S: full display (no change)
// Tier A: full display (no change)
// Tier B: normal display
// Tier C: first trigger = truncate to 2 sentences; subsequent = generic replacement
var _QT_GENERIC_REPLACEMENT = '你又有一种熟悉的感觉，但你想不起细节了。沃切斯特的日常就是这样。';
function applyQualityTier(text, evt, state) {
  var qt = evt.quality_tier;
  if (!qt || qt === 'S' || qt === 'A' || qt === 'B') return text;
  // Tier C: check trigger count
  if (qt === 'C') {
    var triggered = state.triggeredEvents || [];
    var count = 0;
    for (var i = 0; i < triggered.length; i++) {
      if (triggered[i] === evt.id) count++;
    }
    if (count >= 2) return _QT_GENERIC_REPLACEMENT;
    // First trigger: truncate to first 2 sentences
    var sentences = text.split(/[。\n]/);
    var result = [];
    for (var j = 0; j < sentences.length && result.length < 2; j++) {
      var s = sentences[j].trim();
      if (s.length > 0) result.push(s);
    }
    return result.join('。') + '。';
  }
  return text;
}

function handleExploreAction(s, action, c) {
  switch(action.type){
  case 'MOVE':{c.ensureMutableArrays();
    if(s.ap<1){c.narr('system','行动点不足。');return s;}
    const target=action.areaId;
    const cur=getAreaInfo(s.currentArea,ctx);
    if(!cur||!cur.connected_areas.includes(target)){c.narr('system','无法到达该区域。');return s;}
    const targetArea=getAreaInfo(target,ctx);
    if(!targetArea){c.narr('system','未知区域。');return s;}
    if(!isAreaUnlocked(targetArea,s)){c.narr('system','你还没有找到通往'+targetArea.name+'的路径。也许需要更多线索。');return s;}
    s.ap-=action.cost||1;s.currentArea=target;
    if(!s.visitedAreas.includes(target))s.visitedAreas.push(target);
    if(target==='harbor_district'){c.bt.harbor_visits=(c.bt.harbor_visits||0)+1;audioManager.playEffect('harbor_water_omen');}
    if(target==='lighthouse')audioManager.playEffect('lighthouse_lens_crack');
    if(target==='catacombs_entrance'||target==='deep_catacombs')audioManager.playEffect('catacombs_stone');
    if(targetArea.danger_level>(s.stats_run.deepest_area_danger||0))s.stats_run.deepest_area_danger=targetArea.danger_level;
    if(!s.lastVisitedDates)s.lastVisitedDates={};
    s.lastVisitedDates={...s.lastVisitedDates,[target]:s.day};
    const displayName=getAreaDisplayName(targetArea,s);
    c.narr('system','你前往了'+displayName+'。');
    // Light level affects text corruption (P2-1)
    const lightCorrPenalty=(s.lightLevel||0)<(targetArea?.resource_pressure?.required_light_level||0)?2:1;
    let desc=getSanTextVariant(targetArea.description,s.san,pick,ctx);
    if(lightCorrPenalty>1&&Math.random()<0.3)desc+='\n\n光线不足。你不确定自己看到的是不是真的。';
    // Phase 6: Resource-based text corruption on area descriptions
    desc=applyResourceTextCorruption(desc,s);
    c.narr('location',desc,{locationName:displayName,imageSrc:getAreaSceneImage(target,s),imageAlt:displayName});
    // Switch ambient to match new area
    try{const phase=getPhase(s.ap,s.maxAp);audioManager.playAreaAmbient(target,phase);}catch(e){}
    if(targetArea.micro_events&&targetArea.micro_events.length>0&&Math.random()<0.35){
      const me=pick(targetArea.micro_events);
      const meText=getSanTextVariant(me.description,s.san,pick,ctx);
      c.narr('system',meText,{type:'微事件'});
      if(me.effect)Object.entries(me.effect).forEach(([k,v])=>{
        if(k==='SAN')s.san=clamp(s.san+v,0,s.maxSan);
        if(k==='HP')s.hp=clamp(s.hp+v,0,s.maxHp);
      });
    }
    // Silent events: 15% chance on move
    if(Math.random()<0.15)checkSilentEvent(s,c.narr,target);
    // SAN scene variants: location-based flavor text
    const sceneKeyMap={'harbor_district':'harbor_water','voxchester_manor':'hilda_portrait','catacombs_entrance':'catacombs_entrance_text'};
    const sceneKey=sceneKeyMap[target];
    if(sceneKey&&s.san<70&&Math.random()<0.2){
      const sceneText=getSanSceneVariant(sceneKey,s.san,ctx);
      if(sceneText)c.narr('system',sceneText);
    }
    // Phase 6: Area corruption narrative on arrival
    if(typeof getAreaCorruptionNarrative==='function'){
      const areaNarr=getAreaCorruptionNarrative(target,s);
      if(areaNarr)c.narr('system',areaNarr,{isSpecial:true});
    }
    s.objectives=checkObjCompletion(s.objectives,s);
    s.transition='move';
    c.log('前往'+displayName);if(!s.tutorialSeen.first_move)s.tutorialSeen={...s.tutorialSeen,first_move:true};return s;
  }
  case 'EXPLORE':{c.ensureMutableArrays();c.cloneInv();
    if(s.ap<2){c.narr('system','行动点不足（需要2AP）。');return s;}
    s.ap-=2;
    // Phase 4 Layer 1: Chapter milestone events (highest priority)
    {const _milestone=checkChapterMilestone(s.day,s);
    if(_milestone){
      const _milestoneEvt=createMilestoneEvent(_milestone);
      s.triggeredEvents.push(_milestoneEvt.id);
      c.narr('event',_milestoneEvt.description,{eventTitle:_milestoneEvt.name,eventType:'milestone',isSpecial:true});
      if(_milestoneEvt.sanity_damage>0){s.san=clamp(s.san-_milestoneEvt.sanity_damage,0,s.maxSan);c.narr('system','SAN -'+_milestoneEvt.sanity_damage,{isEffect:true});}
      if(_milestoneEvt._corruptionGain>0){s.safehouseCorruption=Math.min(100,(s.safehouseCorruption||0)+_milestoneEvt._corruptionGain);}
      addRunMemory(s,_milestoneEvt.name,'milestone');
    }}
    // P0-3: Critical clue progress guard — check before normal event selection
    const _guard=getForcedProgressGuard(s,ctx);
    if(_guard){
      executeForcedProgressGuard(_guard,s,c.narr);
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
        const omen=checkOmens(s);
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
      c.narr('system','四周平静，暂时没有发现异常。');
      const chains=GD.event_chains||GD.module4_event_extensions?.event_chains||[];
      for(const ch of chains){
        for(const eid of ch.sequence){
          const fe=GD.events?.find(e=>e.id===eid)||GD.module4_events?.find(e=>e.id===eid);
          if(fe&&!s.triggeredEvents.includes(eid)&&checkTrigger(fe,s)){
            c.narr('system','【保底推进】你注意到一些之前忽略的细节。',{isSpecial:true});
            s.triggeredEvents.push(eid);
            var feText=applyQualityTier(fe.description,fe,s);
            c.narr('event',feText,{eventTitle:fe.name,eventType:fe.type||fe.event_classification,imageSrc:getEventImage(fe.id)||getAreaSceneImage(s.currentArea,s),imageAlt:fe.name});
            return s;
          }
        }
      }
      return s;
    }
    s.triggeredEvents.push(evt.id);
    // Phase 4: Check for distortion variant (alternative text based on SAN/loop)
    let evtText=getDistortionVariant(evt,s)||evt.description;
    // Phase 4b: Quality tier dynamic truncation (P1)
    evtText=applyQualityTier(evtText,evt,s);
    evtText=getPollutionText(getSanTextVariant(evtText,s.san,pick,ctx),s.pollution||0);
    // Fear lens: append fear-related flavor text
    if(s.fearTuning&&s.fearTuning.primary)evtText=applyFearLens(evt,evtText,s);
    // Phase 3: Text hallucination at low SAN
    evtText=applyTextHallucination(evtText,s.san);
    // Phase 6: Resource-based text corruption
    evtText=applyResourceTextCorruption(evtText,s);
    c.narr('event',evtText,{eventTitle:evt.name,eventType:evt.type||evt.event_classification,imageSrc:getEventImage(evt.id)||getAreaSceneImage(s.currentArea,s),imageAlt:evt.name,_ugcAuthor:evt._ugcAuthor||null});
    // §3.3: Meta event real consequences
    if(evt.effects&&evt.effects._meta_effect){
      applyMetaEffect(evt.effects._meta_effect,s,evt,c);
    }
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
      c.narr('system','你感到某种冲动——是就此收手，还是更深入地探究？',{isSpecial:true});
      return s;
    }
    const anchorResult=processNormalAnchorEvent(evt,s);
    if(anchorResult.sanGain>0){
      s.san=clamp(s.san+anchorResult.sanGain,0,s.maxSan);
      c.narr('san-recovery',anchorResult.text);
    }else if(anchorResult.text){
      c.narr('system',anchorResult.text,{isSpecial:true});
    }
    let sanDmg=Math.abs(evt.sanity_damage||0);
    if(sanDmg>0){
      const isChapter1=s.day<=7;
      const isMidnight=getPhase(s.ap,s.maxAp)==='midnight';
      const ch1Cap=Math.abs(GD.systems?.sanity?.san_loss_scale?.chapter_1_cap||5);
      if(isChapter1&&sanDmg>ch1Cap&&!isMidnight){
        sanDmg=ch1Cap;c.narr('system','（你的直觉告诉你现在不应该深入探究。也许深夜再来会不同。）');
      }
      sanDmg=processSanLoss(sanDmg,s.inventory.map(i=>i.name),s.weather,s.day,s.difficulty,ctx);
      if(sanDmg>0){
        if(evt.skill_check){
          audioManager.playSkillEffect('roll');
          const check=doSkillCheck(evt.skill_check.skill,evt.skill_check.threshold||50,s,s.difficulty,ctx);
          if(check.success){
            audioManager.playSkillEffect('success');
            sanDmg=Math.max(1,Math.round(sanDmg*0.5));
            c.narr('system','【技能检定：'+check.skillName+'】掷骰 '+check.roll+' / 技能'+check.playerSkill+' —— 成功！SAN损失减半。');
            s.stats_run.checks_passed++;
          }else{
            audioManager.playSkillEffect(check.isCritFail?'critical_fail':'fail');
            c.narr('system','【技能检定：'+check.skillName+'】掷骰 '+check.roll+' / 技能'+check.playerSkill+' —— 失败！');
            s.stats_run.checks_failed++;
          }
        }
        s.san=clamp(s.san-sanDmg,0,s.maxSan);
        c.narr('system','SAN -'+sanDmg,{isEffect:true});
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
      c.narr('madness','【临时疯狂：'+mad.name+'】'+mad.description,{madness:mad});
      addRunMemory(s,'经历了临时疯狂——'+mad.name,'madness');
      audioManager.playEffect('madness');audioManager.playEffect('madness_loop');
    }
    // --- Death resolution (unified via applyDeathResolution) ---
    {const deathCtx = resolveDeath(s, evt, null);
    if(deathCtx) applyDeathResolution(s, deathCtx, c.narr);}
    s.objectives=checkObjCompletion(s.objectives,s);
    // Event chain progress: check if triggered event advances a chain
    const chains=GD.event_chains||[];
    for(const ch of chains){
      const seq=ch.sequence||[];
      const idx=seq.indexOf(evt.id);
      if(idx>=0){
        const progress=seq.filter(eid=>s.triggeredEvents.includes(eid)).length;
        if(idx<seq.length-1){
          c.narr('system','【事件链：'+ch.name+'】进度 '+progress+'/'+seq.length,{isSpecial:true});
        }
      }
    }
    // Phase 6: Area-specific corruption narrative (world responds to investigation)
    if(typeof getAreaCorruptionNarrative==='function'){
      const areaNarr=getAreaCorruptionNarrative(s.currentArea,s);
      if(areaNarr)c.narr('system',areaNarr,{isSpecial:true});
    }
    checkChainCompletion(s,c.narr);
    checkWrongInference(s,c.narr);
    // Conclusion checking (clue_conclusion system)
    const newConclusions=checkConclusions(s,ctx);
    for(const conc of newConclusions){
      s.discoveredConclusions.push(conc.id);
      c.narr('system','【结论达成】'+conc.name,{isSpecial:true});
      audioManager.playEffect('clue_found');
      conc.evidence.forEach(e=>c.narr('system','  · '+e));
      // Add unlocks as clues
      conc.unlocks.forEach(u=>{if(!hasClueId(s.clues,u)){const _rn=resolveClueName(u);s.clues.push(_rn&&_rn!==u?{id:u,name:_rn}:u);}});
    }
    // False interpretation warnings
    const falseInts=checkFalseInterpretations(s,ctx);
    for(const fi of falseInts){
      c.narr('system','【注意】你隐约觉得"'+fi.interpretation+'"这个想法不太对劲。'+(fi.consequence||''),{isSpecial:true});
    }
    // Monster manifestation flavor (10% chance on explore)
    if(Math.random()<0.1){
      const creature=pick(['deep_ones','night_gaunts','shoggoth']);
      const manifest=getMonsterManifestation(creature,s.day,ctx);
      if(manifest){
        const stageNames={absence:'异常',trace:'痕迹',influence:'影响',partial_presence:'阴影',full_presence:'出现'};
        c.narr('system','【'+(stageNames[manifest.stage]||'异常')+'】'+manifest.manifestation);
      }
    }
    // Event-related tracking for behavior endings
    if(evt.tags){
      if(evt.tags.includes('fusion')){c.bt.fusion_accepted_count=(c.bt.fusion_accepted_count||0)+1;c.bt.fusion_and_self_harm_total=(c.bt.fusion_and_self_harm_total||0)+1;}
      if(evt.tags.includes('possession'))c.bt.possession_accepted_count=(c.bt.possession_accepted_count||0)+1;
      if(evt.tags.includes('bell')||evt.tags.includes('thirteenth'))c.bt.thirteenth_bell_obsession=(c.bt.thirteenth_bell_obsession||0)+1;
      if(evt.tags.includes('meta')||evt.tags.includes('loop'))c.bt.meta_boundary_breaks=(c.bt.meta_boundary_breaks||0)+1;
      if(evt.tags.includes('sea')||evt.tags.includes('tide')||evt.tags.includes('harbor_deep'))c.bt.sea_acceptance_flags=(c.bt.sea_acceptance_flags||0)+1;
    }
    if(evt.event_classification==='超自然遭遇'||evt.event_classification==='怪物遭遇')c.bt.meta_boundary_breaks=(c.bt.meta_boundary_breaks||0)+1;
    c.log('探索：'+evt.name);if(!s.tutorialSeen.first_explore)s.tutorialSeen={...s.tutorialSeen,first_explore:true};return s;
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
      c.narr('system','【技能检定：'+result.skillName+'】掷骰 '+result.roll+' / 技能'+result.playerSkill+' / 难度'+result.threshold+' —— 成功！');
      c.narr('system',sc.success?.text||sc.success||'检定成功。');
      if(Math.random()<0.1)s.skills[result.skillName]=(s.skills[result.skillName]||0)+rand(1,3);
    }else{
      audioManager.playSkillEffect(result.isCritFail?'critical_fail':'fail');
      s.stats_run.checks_failed++;
      c.narr('system','【技能检定：'+result.skillName+'】掷骰 '+result.roll+' / 技能'+result.playerSkill+' / 难度'+result.threshold+' —— 失败！'+(result.isCritFail?'（大失败！）':''));
      c.narr('system',sc.failure?.text||sc.failure||'检定失败。');
    }
    return s;
  }
  default:return null;
  }
}
