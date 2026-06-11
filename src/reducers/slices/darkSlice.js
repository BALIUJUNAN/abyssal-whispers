// src/reducers/slices/darkSlice.js - Extracted from gameReducer
// SELF_HARM, SPREAD_PROPHECY, CONSUME_ARCHIVE, SELF_SACRIFICE, DESECRATE, BREAK_SEAL

export function handleDarkAction(s, action, c) {
  switch(action.type){
  case 'SELF_HARM':{
    if(s.ap<2){c.narr('system','行动点不足。');return s;}
    s.ap-=2;c.bt.self_harm_ritual_count=(c.bt.self_harm_ritual_count||0)+1;c.bt.fusion_and_self_harm_total=(c.bt.fusion_and_self_harm_total||0)+1;
    const sanLoss=rand(3,10);s.san=clamp(s.san-sanLoss,0,s.maxSan);
    modHumanity(s,-10,'用刀在自己身上刻下符号');
    addRunMemory(s,'第'+(c.bt.self_harm_ritual_count)+'次。刀锋划过皮肤的时候，你觉得你正在写下什么东西。','madness');
    c.narr('system','你用刀尖在皮肤上刻下了一个符号。你不知道它是什么意思。但你的手知道。SAN -'+sanLoss,{isSpecial:true});
    if(Math.random()<0.3){s.pollution=Math.min(1,(s.pollution||0)+0.05);c.narr('system','符号在皮肤下微微发光，然后暗了下去。');c.effects.push({type:'AUDIO_PLAY',id:'loop_pollution'});}
    return s;
  }
  case 'SPREAD_PROPHECY':{
    if(s.ap<2){c.narr('system','行动点不足。');return s;}
    s.ap-=2;c.bt.prophecy_spread_count=(c.bt.prophecy_spread_count||0)+1;
    c.bt.cult_leader_score=(c.bt.cult_leader_score||0)+1;
    const sanLoss=rand(2,5);s.san=clamp(s.san-sanLoss,0,s.maxSan);
    modHumanity(s,-8,'向镇民散布不祥的预言');
    c.narr('system','你站在镇中心的井边，对路过的人低声说出预言。他们的表情从怀疑变成了恐惧。但恐惧中有一丝——期待。SAN -'+sanLoss,{isSpecial:true});
    return s;
  }
  case 'CONSUME_ARCHIVE':{
    if(s.ap<2){c.narr('system','行动点不足。');return s;}
    if(!s.clues||s.clues.length===0){c.narr('system','你没有可以吞噬的档案。');return s;}
    s.ap-=2;c.bt.archive_consumed_count=(c.bt.archive_consumed_count||0)+1;
    const removed=s.clues.pop();s.mythosLevel=(s.mythosLevel||0)+1;
    modHumanity(s,-5,'吞噬了一条线索——让真相永远消失');
    c.narr('system','你把笔记本上的一页撕下来，放进嘴里。纸是苦的。但你咽下去的时候，某种知识进入了你的血液。线索「'+(removed||'未知')+'」永远消失了。克苏鲁神话 +1',{isSpecial:true});
    return s;
  }
  case 'SELF_SACRIFICE':{
    if(s.ap<3){c.narr('system','行动点不足（需要3AP）。');return s;}
    s.ap-=3;c.bt.self_sacrifice_for_power=(c.bt.self_sacrifice_for_power||0)+1;
    s.mythosLevel=(s.mythosLevel||0)+3;s.pollution=Math.min(1,(s.pollution||0)+0.15);c.effects.push({type:'AUDIO_PLAY',id:'loop_pollution'});
    const hpLoss=rand(4,10);s.hp=Math.max(1,s.hp-hpLoss);
    s.maxSan=Math.max(10,s.maxSan-5);s.san=clamp(s.san-rand(5,15),0,s.maxSan);
    modHumanity(s,-25,'为了力量献祭了自己的一部分');
    addRunMemory(s,'你割下了自己的一部分。不是血肉——是更重要的东西。然后你感觉到了它。力量。冰冷，安静，确凿。','madness');
    c.narr('system','你闭上眼，放弃了某种无法命名但你知道一直在那里的东西。然后——力量来了。冰冷，安静，确凿。HP -'+hpLoss+'，SAN上限永久 -5，克苏鲁神话 +3',{isSpecial:true});
    return s;
  }
  case 'DESECRATE':{
    if(s.ap<2){c.narr('system','行动点不足。');return s;}
    const desecrateAreas=['town_center','harbor_district'];
    if(!desecrateAreas.includes(s.currentArea)){c.narr('system','这里没有可以亵渎的圣地。');return s;}
    s.ap-=2;c.bt.sacred_desecration_count=(c.bt.sacred_desecration_count||0)+1;
    const sanLoss=rand(4,12);s.san=clamp(s.san-sanLoss,0,s.maxSan);
    modHumanity(s,-15,'亵渎了神圣之地');
    c.narr('system','你找到了角落里那座被遗忘的神龛。你做了不可挽回的事。地面在你脚下微微震动——然后停了。仿佛某种东西屏住了呼吸。SAN -'+sanLoss,{isSpecial:true});
    if(s.currentArea==='town_center')s.safehouseCorruption=(s.safehouseCorruption||0)+2;
    return s;
  }
  case 'BREAK_SEAL':{
    if(s.ap<3){c.narr('system','行动点不足（需要3AP）。');return s;}
    if(!['catacombs_entrance','deep_catacombs','ruins_of_yith'].includes(s.currentArea)){c.narr('system','这里没有封印可以破坏。');return s;}
    s.ap-=3;setCorruptionFlag(s,'seal_desecrated');
    if(['deep_catacombs','ruins_of_yith'].includes(s.currentArea))setCorruptionFlag(s,'destroyed_time_core');
    s.sealState='critical';s.pollution=Math.min(1,(s.pollution||0)+0.2);c.effects.push({type:'AUDIO_PLAY',id:'loop_pollution'});
    c.bt.loop_break_attempts=(c.bt.loop_break_attempts||0)+1;
    const sanLoss=rand(8,20);s.san=clamp(s.san-sanLoss,0,s.maxSan);
    modHumanity(s,-25,'试图破坏封印');
    addRunMemory(s,'你把手放在封印上。然后你推了。','death');
    c.narr('system','封印表面出现了一道裂痕。光从裂缝中漏出来。不是自然的光——是某种粘稠的、缓慢流动的光。你感到整个世界晃了一下。SAN -'+sanLoss,{isSpecial:true});
    return s;
  }
  default:return null;
  }
}
