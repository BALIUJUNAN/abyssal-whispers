// src/utils/gameHelpers.js — 游戏逻辑工具函数（从 app.jsx 提取）

// GD 和 ctx 将在 bundle 时由 app.jsx 中的全局变量提供
// build.py 会剥离 import/export 语句，所以这些函数可以直接使用同作用域的 GD

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
    return sch&&(sch.split(':')[1]||'').trim()===state.currentArea;
  });
}

function applyChainCompletionEffects(state, effects, narr){
  if(!effects||!Array.isArray(effects))return;
  for(const eff of effects){
    switch(eff.type){
      case 'add_flag':
        if(eff.flag_id&&!state.triggeredEvents.includes(eff.flag_id))state.triggeredEvents.push(eff.flag_id);
        break;
      case 'modify_npc_trust':
        if(eff.npc_id){state.npcTrust[eff.npc_id]=Math.min(5,(state.npcTrust[eff.npc_id]||0)+(eff.amount||0));}
        break;
      case 'unlock_area':
        if(eff.area_id&&!state.visitedAreas.includes(eff.area_id))state.visitedAreas.push(eff.area_id);
        break;
      case 'unlock_final_option':
      case 'unlock_ritual_step':
        if(eff.option_id&&!state.triggeredEvents.includes(eff.option_id))state.triggeredEvents.push(eff.option_id);
        if(eff.step_id&&!state.triggeredEvents.includes(eff.step_id))state.triggeredEvents.push(eff.step_id);
        break;
      case 'modify_npc_agency':
        if(eff.npc_id){const key=eff.npc_id+'_agency';state[key]=(state[key]||0)+(eff.amount||0);}
        break;
      case 'unlock_conclusion':
        if(eff.conclusion_id&&!state.discoveredConclusions.includes(eff.conclusion_id))state.discoveredConclusions.push(eff.conclusion_id);
        break;
      case 'set_variable':
        if(eff.variable)state[eff.variable]=eff.value;
        break;
    }
  }
}

function checkChainCompletion(state, narr){
  const chains=GD.clue_chains||[];
  for(const chain of chains){
    const chainClues=chain.clues||[];
    for(const clue of chainClues){
      if(state.clues.some(c=>(typeof c==='string'?c:c.id)===clue.id))continue;
      if(clue.source&&state.triggeredEvents.includes(clue.source)&&!state.clues.some(c=>(typeof c==='string'?c:c.id)===clue.id)){
        state.clues.push(clue.id);
        narr('system','【线索链：'+chain.name+'】发现线索「'+clue.name+'」',{isSpecial:true});
      }
    }
    if(state.completedChains.includes(chain.id))continue;
    const allFound=chainClues.length>0&&chainClues.every(c=>state.clues.some(cc=>(typeof cc==='string'?cc:cc.id)===c.id));
    if(allFound){
      state.completedChains.push(chain.id);
      narr('system','【线索链完成】'+chain.name+' —— '+(chain.chain_reward||'线索已全部收集'),{isSpecial:true});
      const effects=chain.completion_effects;
      if(effects&&Array.isArray(effects)&&effects.length>0){
        applyChainCompletionEffects(state,effects,narr);
      }
    }
  }
  const eventChains=GD.event_chains||[];
  for(const chain of eventChains){
    if(state.completedChains.includes(chain.id))continue;
    const seq=chain.sequence||[];
    const allTriggered=seq.length>0&&seq.every(eid=>state.triggeredEvents.includes(eid));
    if(allTriggered){
      state.completedChains.push(chain.id);
      narr('system','【事件链完成】'+chain.name+' —— '+(chain.chain_reward||'事件链已完结'),{isSpecial:true});
      const effects=chain.completion_effects;
      if(effects&&Array.isArray(effects)&&effects.length>0){
        applyChainCompletionEffects(state,effects,narr);
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

function isAreaUnlocked(area, state) {
  if (area.chapter_1_role === 'locked') return false;
  if (area.chapter_1_role === 'fully_accessible') return true;
  const day = state.day || 1;
  if (area.chapter_unlock === 'chapter_2' && day > 7) return true;
  if (area.unlock_clue && !(state.clues || []).includes(area.unlock_clue)) return false;
  return false;
}

function getAreaDisplayName(area, state) {
  return getDistortedName(area, state);
}
