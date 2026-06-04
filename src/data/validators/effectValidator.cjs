
// Effect Validator — effect key validation + migration guardrails
function validateEffects(base, ch2plus) {
  var errors = [];
  var warn = function(r,m,c){errors.push({level:'warn',rule:r,message:m,context:c});};
  var error = function(r,m,c){errors.push({level:'error',rule:r,message:m,context:c});};

  var events = [].concat(base.events||[]).concat((ch2plus||{}).events||[]);
  var endings = [].concat(base.endings||[]).concat((ch2plus||{}).endings||[]);
  var npcs = base.npcs||[];
  var npcNames = npcs.map(function(n){return n.name;});

  var VALID_EFFECT_KEYS = new Set([
    'HP','hp','san','food','mythos','humanity',
    'add_flag','add_clue','add_item','npc_trust',
    'safehouseCorruption','add_run_memory',
    'unlock_ending_condition','death_hint',
    'items','npc_changes','fatigue',
    'harbor_night_risk_reduction','investigation_bonus',
    '_meta_effect',
  ]);

  // E03: effect keys recognized
  events.forEach(function(evt){
    var eff=evt.effects;
    if(!eff||typeof eff!=='object')return;
    Object.keys(eff).forEach(function(key){
      if(!VALID_EFFECT_KEYS.has(key))warn('E03','Unknown effect key "'+key+'" in '+evt.id);
    });
  });

  // Load baselines
  var BASELINES = {chineseNpcRefs:22,chineseItemRefs:106,chineseNpcConditions:8};
  try{var b=require('./baselines.json');Object.assign(BASELINES,b);}catch(e){}

  // E11: Chinese NPC refs (baseline ratchet)
  var e11Count=0;
  events.forEach(function(evt){
    (evt.effects?.npc_changes||[]).forEach(function(c){
      var name=c.name||c.npc;
      if(name&&npcNames.indexOf(name)>=0)e11Count++;
    });
  });
  if(e11Count>BASELINES.chineseNpcRefs)error('E11_BASELINE','Chinese NPC refs '+e11Count+' exceeds baseline '+BASELINES.chineseNpcRefs);
  else if(e11Count>0)warn('E11','Chinese NPC refs: '+e11Count+'/'+BASELINES.chineseNpcRefs);

  // E12: Chinese item refs (baseline ratchet)
  var e12Count=0;
  events.forEach(function(evt){
    (evt.effects?.items||[]).forEach(function(item){
      if(typeof item==='string'&&/[一-鿿]/.test(item))e12Count++;
    });
  });
  if(e12Count>BASELINES.chineseItemRefs)error('E12_BASELINE','Chinese item refs '+e12Count+' exceeds baseline '+BASELINES.chineseItemRefs);
  else if(e12Count>0)warn('E12','Chinese item refs: '+e12Count+'/'+BASELINES.chineseItemRefs);

  // E13: Chinese NPC in ending conditions (baseline ratchet)
  var e13Count=0;
  endings.forEach(function(end){
    var allConds=[].concat(end.required_conditions||[]).concat(end.blocking_conditions||[]).concat([JSON.stringify(end.npc_requirements||{})]).join(' ');
    npcNames.forEach(function(name){if(allConds.indexOf(name)>=0)e13Count++;});
  });
  if(e13Count>BASELINES.chineseNpcConditions)error('E13_BASELINE','Chinese NPC ending conds '+e13Count+' exceeds baseline '+BASELINES.chineseNpcConditions);
  else if(e13Count>0)warn('E13','Chinese NPC ending conds: '+e13Count+'/'+BASELINES.chineseNpcConditions);

  // E14: Unknown Chinese NPC references
  events.forEach(function(evt){
    (evt.effects?.npc_changes||[]).forEach(function(c){
      var name=c.name||c.npc;
      if(name&&npcNames.indexOf(name)<0&&/[一-鿿]/.test(name))error('E14','Unknown Chinese NPC in '+evt.id+': '+name);
    });
  });

  // E15-E18: Item registry checks
  var itemRegistry=null;
  try{itemRegistry=require('./itemRegistry.cjs');}catch(e){}
  try{if(!itemRegistry)itemRegistry=require('../registry/itemRegistry.cjs');}catch(e){}
  if(itemRegistry&&itemRegistry.ITEM_REGISTRY){
    var knownNames=new Set(Object.values(itemRegistry.ITEM_REGISTRY).map(function(e){return e.name;}));
    // E15: unknown items
    events.forEach(function(evt){
      (evt.effects?.items||[]).forEach(function(item){
        if(typeof item==='string'){
          var resolved=itemRegistry.resolveItemId(item);
          if(resolved===item&&/[一-鿿]/.test(item)&&!knownNames.has(item))error('E15','Unknown item in '+evt.id+': '+item);
        }
      });
    });
    // E16: duplicate aliases
    var aliasMap={};
    for(var aid in itemRegistry.ITEM_REGISTRY){
      (itemRegistry.ITEM_REGISTRY[aid].aliases||[]).forEach(function(alias){
        if(aliasMap[alias])error('E16','Dup alias: "'+alias+'" in '+aid+' and '+aliasMap[alias]);
        aliasMap[alias]=aid;
      });
    }
    // E17: id naming
    for(var iid in itemRegistry.ITEM_REGISTRY){
      if(!/^[a-z][a-z0-9_]*$/.test(iid))warn('E17','Item id not snake_case: '+iid);
    }
    // E18: item type
    var VALID_TYPES=new Set(['food','light','tool','healing','key','clue','weapon','ritual','misc']);
    for(var tid in itemRegistry.ITEM_REGISTRY){
      var t=itemRegistry.ITEM_REGISTRY[tid].type;
      if(t&&!VALID_TYPES.has(t))warn('E18','Invalid item type in '+tid+': '+t);
    }
  }

  return errors;
}
try{module.exports={validateEffects};}catch(e){}
