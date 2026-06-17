#!/usr/bin/env node
/**
 * scripts/sim28balance.cjs
 * 28-Day Single-Loop Balance Simulation Framework
 */

const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
function ga(n,d){const i=args.indexOf("--"+n);return i===-1?d:(args[i+1]||d);}
function hf(n){return args.includes("--"+n);}
const RUNS=parseInt(ga("runs","100"),10),SEED=ga("seed",null),REPORT=ga("report",null),FEAR=ga("fear","all"),DIFFICULTY=ga("difficulty","normal").toLowerCase(),VERBOSE=hf("verbose"),PHASE=hf("phase-detail");

let _s=SEED?parseInt(SEED,10):Date.now();const IS=_s;
function sr(){_s^=_s<<13;_s^=_s>>17;_s^=_s<<5;return(_s>>>0)/4294967296;}
function ri(a,b){return Math.floor(sr()*(b-a+1))+a;}
function pk(a){return a[Math.floor(sr()*a.length)];}
function cl(v,lo,hi){return Math.max(lo,Math.min(hi,v));}
function wp(items,w){let t=w.reduce((a,b)=>a+b,0),r=sr()*t;for(let i=0;i<items.length;i++){r-=w[i];if(r<=0)return items[i];}return items[items.length-1];}

let GD={};try{GD=JSON.parse(fs.readFileSync(path.join(ROOT,"game_base.json"),"utf8"));}catch(e){console.error("No game_base.json");process.exit(1);}
// 恐惧画像系统 - 简单平衡版本

// 恐惧画像系统 - 激进平衡版本
// survival_modifier: < 1.0 = 更容易存活, > 1.0 = 更难存活

// 恐惧画像系统 - 极端平衡版本
const FEARS = {
  thalassophobia: { name: '深海恐惧', san_mod: 2.0, hp_mod: 0.5 },   // SAN+100%, HP-50%
  claustrophobia: { name: '幽闭恐惧', san_mod: 0.3, hp_mod: 2.0 },   // SAN-70%, HP+100%
  nyctophobia: { name: '黑暗恐惧', san_mod: 0.5, hp_mod: 1.5 },       // SAN-50%, HP+50%
  acrophobia: { name: '高空恐惧', san_mod: 1.5, hp_mod: 0.7 },       // SAN+50%, HP-30%
  insectophobia: { name: '虫类恐惧', san_mod: 1.0, hp_mod: 1.0 }     // 无变化
};





// Protection Functions
function getPhaseProtection(protection, day) {
  if (day <= 3) return protection.day_1_3;
  if (day <= 7) return protection.day_4_7;
  if (day <= 14) return protection.day_8_14;
  return protection.day_15_21;
}
function applyProtection(loss, day, protectionConfig, maxPerAction) {
  const mult = getPhaseProtection(protectionConfig, day);
  let protected_loss = Math.max(1, Math.round(loss * mult));
  return Math.min(protected_loss, maxPerAction);
}
function isAreaRestricted(day, area) {
  if (day > CFG.safe_zone_restriction) return false;
  const areaData = AREAS[area];
  if (!areaData) return false;
  if (CFG.safe_zone_restriction >= 7 && areaData.danger >= 4) return true;
  if (CFG.safe_zone_restriction >= 5 && areaData.danger >= 4) return true;
  if (CFG.safe_zone_restriction >= 3 && areaData.danger >= 5) return true;
  return false;
}

const AREAS={};
(GD.areas||GD.module2_areas||[]).forEach(a=>{AREAS[a.id]={id:a.id,danger:a.danger_level||1,conn:a.connected_areas||[]};});
if(!Object.keys(AREAS).length){
  [{id:"town_center",d:1,c:["harbor_district","voxchester_manor","whispering_forest","catacombs_entrance"]},
   {id:"harbor_district",d:2,c:["town_center","lighthouse"]},
   {id:"voxchester_manor",d:3,c:["town_center","catacombs_entrance"]},
   {id:"whispering_forest",d:3,c:["town_center","forbidden_grove"]},
   {id:"catacombs_entrance",d:4,c:["town_center","deep_catacombs"]},
   {id:"deep_catacombs",d:5,c:["catacombs_entrance","ruins_of_yith"]},
   {id:"lighthouse",d:3,c:["harbor_district"]},
   {id:"forbidden_grove",d:4,c:["whispering_forest"]},
   {id:"ruins_of_yith",d:5,c:["deep_catacombs"]}].forEach(a=>AREAS[a.id]={id:a.id,danger:a.d,conn:a.c});
}



// ═══════════════════════════════════════════════════════════
// Protection Functions
// ═══════════════════════════════════════════════════════════
function getPhaseProtection(protection, day) {
  if (day <= 3) return protection.day_1_3;
  if (day <= 7) return protection.day_4_7;
  if (day <= 14) return protection.day_8_14;
  if (day <= 21) return protection.day_15_21;
  return protection.day_22_28;
}

function applyProtection(loss, day, protectionConfig, maxPerAction) {
  const mult = getPhaseProtection(protectionConfig, day);
  let protected_loss = Math.max(1, Math.round(loss * mult));
  return Math.min(protected_loss, maxPerAction);
}

function isAreaRestricted(day, area) {
  if (day > CFG.safe_zone_restriction) return false;
  const areaData = AREAS[area];
  if (!areaData) return false;
  if (CFG.safe_zone_restriction >= 7 && areaData.danger >= 4) return true;
  if (CFG.safe_zone_restriction >= 5 && areaData.danger >= 4) return true;
  if (CFG.safe_zone_restriction >= 3 && areaData.danger >= 5) return true;
  return false;
}

const NPCS=(GD.npcs||GD.module3_npcs||[]).map(n=>({name:n.name,area:n.area||"town_center"}));
if(!NPCS.length)[{n:"Fisher",a:"harbor_district"},{n:"Martha",a:"town_center"},{n:"Hilda",a:"voxchester_manor"},{n:"Isabella",a:"town_center"},{n:"Joshua",a:"harbor_district"},{n:"Elias",a:"catacombs_entrance"},{n:"Tommy",a:"town_center"}].forEach(x=>NPCS.push({name:x.n,area:x.a}));



// ═══════════════════════════════════════════════════════════
// Difficulty Configuration
// ═══════════════════════════════════════════════════════════
const DIFFICULTY_CONFIG = {
  easy: {
    name: 'Easy', description: 'Extra protection for casual players',
    san_protection: { day_1_3: 0.3, day_4_7: 0.5, day_8_14: 0.7, day_15_21: 0.85, day_22_28: 1.0 },
    hp_protection: { day_1_3: 0.3, day_4_7: 0.5, day_8_14: 0.7, day_15_21: 0.85, day_22_28: 1.0 },
    max_san_per_action: 2, max_san_per_day: 6, max_hp_per_action: 1, max_hp_per_day: 3,
    explore_san_chance: 0.10, explore_danger_mult: 0.03, monster_hp_chance: 0.05, monster_hp_max: 2,
    rest_san_recovery: 3, talk_san_recovery: { chance: 0.4, min: 2, max: 4 },
    day_recovery: { interval: 2, san: 2, hp: 1 }, safe_zone_restriction: 7,
  },
  normal: {
    name: 'Normal', description: 'Balanced protection',
    san_protection: { day_1_3: 0.35, day_4_7: 0.55, day_8_14: 0.75, day_15_21: 0.85, day_22_28: 1.0 },
    hp_protection: { day_1_3: 0.35, day_4_7: 0.55, day_8_14: 0.75, day_15_21: 0.85, day_22_28: 1.0 },
    max_san_per_action: 3, max_san_per_day: 8, max_hp_per_action: 2, max_hp_per_day: 4,
    explore_san_chance: 0.10, explore_danger_mult: 0.03, monster_hp_chance: 0.06, monster_hp_max: 3,
    rest_san_recovery: 3, talk_san_recovery: { chance: 0.4, min: 1, max: 3 },
    day_recovery: { interval: 2, san: 1, hp: 1 }, safe_zone_restriction: 6,
  },
  hard: {
    name: 'Hard', description: 'Reduced protection',
    san_protection: { day_1_3: 0.7, day_4_7: 0.85, day_8_14: 0.95, day_15_21: 1.0, day_22_28: 1.0 },
    hp_protection: { day_1_3: 0.7, day_4_7: 0.85, day_8_14: 0.95, day_15_21: 1.0, day_22_28: 1.0 },
    max_san_per_action: 4, max_san_per_day: 10, max_hp_per_action: 3, max_hp_per_day: 5,
    explore_san_chance: 0.18, explore_danger_mult: 0.06, monster_hp_chance: 0.12, monster_hp_max: 4,
    rest_san_recovery: 1, talk_san_recovery: { chance: 0.3, min: 1, max: 2 },
    day_recovery: { interval: 4, san: 1, hp: 0 }, safe_zone_restriction: 3,
  },
  nightmare: {
    name: 'Nightmare', description: 'Original v1 difficulty - no protection',
    san_protection: { day_1_3: 1.0, day_4_7: 1.0, day_8_14: 1.0, day_15_21: 1.0, day_22_28: 1.0 },
    hp_protection: { day_1_3: 1.0, day_4_7: 1.0, day_8_14: 1.0, day_15_21: 1.0, day_22_28: 1.0 },
    max_san_per_action: 999, max_san_per_day: 999, max_hp_per_action: 999, max_hp_per_day: 999,
    explore_san_chance: 0.30, explore_danger_mult: 0.10, monster_hp_chance: 0.15, monster_hp_max: 4,
    rest_san_recovery: 1, talk_san_recovery: { chance: 0.3, min: 1, max: 2 },
    day_recovery: { interval: 999, san: 0, hp: 0 }, safe_zone_restriction: 0,
  }
};
const CFG = DIFFICULTY_CONFIG[DIFFICULTY] || DIFFICULTY_CONFIG.normal;


const PROFS={journalist:{scout:40,talk:35},professor:{knowledge:45,occult:30,will:35},detective:{scout:45,fight:30,dodge:25},doctor:{medicine:40,will:35},occultist:{occult:45,knowledge:35}};
const PS={balanced:{w:{mv:.2,ex:.3,tk:.2,wr:.1,bu:.08,rs:.12},r:.5},explorer:{w:{mv:.25,ex:.4,tk:.1,wr:.05,bu:.08,rs:.12},r:.7},investigator:{w:{mv:.15,ex:.35,tk:.25,wr:.05,bu:.08,rs:.12},r:.4},social:{w:{mv:.15,ex:.15,tk:.4,wr:.1,bu:.08,rs:.12},r:.3},reckless:{w:{mv:.15,ex:.25,tk:.1,wr:.05,bu:.05,rs:.1},r:.95}};

function sealState(d){const ss=GD.world?.seal_state_machine||[];for(let i=ss.length-1;i>=0;i--)if(d>=ss[i].trigger_day)return ss[i];return ss[0]||{global_modifier:{san_loss_multiplier:0.8}};}

// NEW: Day protection mechanism




function simRun(idx,fearKey,profKey,pKey){
  const fear = FEARS[fearKey] || { san_mod: 1.0, hp_mod: 1.0 };
  const fearSanMod = fear.san_mod;
  const fearHpMod = fear.hp_mod;

  const prof=PROFS[profKey]||PROFS.journalist;
  const fearMod=FEARS[fearKey]||{};
  const s={day:1,ap:12,mAp:12,hp:11,mHp:11,san:60,mSan:99,area:"town_center",vis:["town_center"],clues:[],skills:{...prof.skills},nt:{},food:3,mFood:5,money:5,starve:0,corr:0};
  const tk={idx,fear:fearKey,prof:profKey,personality:pKey,days:0,death:null,san:[60],apW:0,
    ph:{"1_7":{sl:0,hl:0,cl:0,ap:0},"8_14":{sl:0,hl:0,cl:0,ap:0},"15_21":{sl:0,hl:0,cl:0,ap:0},"22_28":{sl:0,hl:0,cl:0,ap:0}}};
  const pk_=d=>d<=7?"1_7":d<=14?"8_14":d<=21?"15_21":"22_28";

  for(let day=1;day<=28;day++){
    s.day=day;s.ap=s.mAp;s.sanLostToday=0;s.hpLostToday=0;
    const ph=pk_(day),ss0=s.san,sh0=s.hp,sc0=s.clues.length;
    if(day % CFG.day_recovery.interval === 0 && day > 1) { s.san = cl(s.san + CFG.day_recovery.san, 0, s.mSan); s.hp = cl(s.hp + CFG.day_recovery.hp, 0, s.mHp); }
    while(s.ap>0&&s.hp>0&&s.san>0){
      const p=PS[pKey]||PS.balanced;
      const acts=[];
      if(s.ap>=1){const c=AREAS[s.area];if(c)c.conn.forEach(t=>{if(AREAS[t]&&!isAreaRestricted(day,t))acts.push({t:"mv",d:t,c:1});});}
      if(s.ap>=2)acts.push({t:"ex",c:2});
      if(s.ap>=1)NPCS.filter(n=>n.area===s.area).forEach(n=>acts.push({t:"tk",n:n.name,c:1}));
      if(s.ap>=2&&["town_center","harbor_district"].includes(s.area))acts.push({t:"wr",c:2});
      if(s.ap>=1&&s.money>=3&&s.food<s.mFood)acts.push({t:"bu",c:1});
      if(!acts.length)break;
      const af=acts.filter(a=>a.c<=s.ap);
      if(!af.length)break;
      const sc=af.map(a=>{
        let v=0;
        switch(a.t){
          case"mv":v=p.w.mv;const tg=AREAS[a.d];if(tg&&tg.danger>2&&s.san<30)v*=.3;break;
          case"ex":v=p.w.ex;if(s.san<20)v*=.5;break;
          case"tk":v=p.w.tk+(s.nt[a.n]||0)*.03;break;
          case"wr":v=p.w.wr;if(s.money<3)v*=2;break;
          case"bu":v=p.w.bu;if(s.food<=1)v*=3;break;
          default:v=.05;
        }
        return Math.max(.01,v*(.7+sr()*.6));
      });
      const act=wp(af,sc);
      switch(act.t){
        case"mv":
          s.ap--;s.area=act.d;if(!s.vis.includes(act.d))s.vis.push(act.d);
          const ar=AREAS[act.d];const fm=fearMod[act.d]||1;
          if(ar&&ar.danger>=3&&sr()<.08*ar.danger){let loss=ri(1,Math.round(ar.danger*fm*fearSanMod));loss=applyProtection(loss,s.day,CFG.san_protection,CFG.max_san_per_action);if(s.sanLostToday+loss<=CFG.max_san_per_day){s.san=cl(s.san-loss,0,s.mSan);s.sanLostToday+=loss;}}
          break;
        case"ex":{
          s.ap--;const ar2=AREAS[s.area];const d=ar2?ar2.danger:1;const sm=sealState(s.day).global_modifier?.san_loss_multiplier||1;
          if(sr()<CFG.explore_san_chance+d*CFG.explore_danger_mult){let loss=Math.round(ri(1,2+d)*sm*fearSanMod);loss=applyProtection(loss,s.day,CFG.san_protection,CFG.max_san_per_action);if(s.sanLostToday+loss<=CFG.max_san_per_day){s.san=cl(s.san-loss,0,s.mSan);s.sanLostToday+=loss;}}
          if(sr()<.25)s.clues.push("c"+s.clues.length);
          if(d>=4&&sr()<CFG.monster_hp_chance*d*(s.day>14?1.5:1)){let hpLoss=Math.round(ri(1,CFG.monster_hp_max)*fearHpMod);hpLoss=applyProtection(hpLoss,day,CFG.hp_protection,CFG.max_hp_per_action);if(s.hpLostToday+hpLoss<=CFG.max_hp_per_day){s.hp=Math.max(0,s.hp-hpLoss);s.hpLostToday+=hpLoss;}}
          break;}
        case"tk":{s.ap--;const tr=s.nt[act.n]||0;if(sr()<.4&&tr<5)s.nt[act.n]=tr+1;if(tr>=2&&sr()<CFG.talk_san_recovery.chance)s.san=cl(s.san+ri(CFG.talk_san_recovery.min,CFG.talk_san_recovery.max),0,s.mSan);break;}
        case"wr":s.ap--;s.money+=ri(3,12);break;
        case"bu":s.ap--;s.money-=3;s.food=Math.min(s.mFood,s.food+1);break;
      }
    }
    tk.apW+=s.ap;
    s.food=Math.max(0,s.food-1);
    if(s.food<=0){s.starve++;if(s.starve===1)s.san=cl(s.san-1,0,s.mSan);else if(s.starve===2)s.hp=Math.max(0,s.hp-1);else s.hp=Math.max(0,s.hp-2);}
    else{s.starve=0;s.hp=cl(s.hp+1,0,s.mHp);s.san=cl(s.san+CFG.rest_san_recovery,0,s.mSan);}
    const seal=sealState(day);s.corr=Math.min(100,s.corr+Math.round((seal.global_modifier?.npc_corruption_rate||.05)*10+ri(0,2)));
    tk.san.push(s.san);
    tk.ph[ph].sl+=Math.max(0,ss0-s.san);tk.ph[ph].hl+=Math.max(0,sh0-s.hp);tk.ph[ph].cl+=(s.clues.length-sc0);
    if(s.hp<=0||s.san<=0){tk.days=day;tk.death=s.hp<=0?"HP":"SAN";break;}
    tk.days=day;
  }
  tk.fSan=s.san;tk.fHp=s.hp;tk.fCl=s.clues.length;tk.vis=[...s.vis];tk.nt={...s.nt};
  return tk;
}

function agg(results){
  const n=results.length;
  const st={n,overall:{avgDays:0,surv:"0%",avgSan:0,avgHp:0,avgCl:0,avgApW:0,deaths:{HP:0,SAN:0,surv:0}},
    phases:{},byFear:{},byProf:{},byP:{},sanCurve:[],npcT:{},areaV:{}};
  let td=0,ts=0,th=0,tc=0,ta=0;
  ["1_7","8_14","15_21","22_28"].forEach(p=>st.phases[p]={sl:0,hl:0,cl:0,ap:0});
  for(const r of results){
    td+=r.days;ts+=r.fSan;th+=r.fHp;tc+=r.fCl;ta+=r.apW;
    if(r.death)st.overall.deaths[r.death]++;else st.overall.deaths.surv++;
    if(!st.byFear[r.fear])st.byFear[r.fear]={n:0,d:0,s:0};st.byFear[r.fear].n++;st.byFear[r.fear].d+=r.days;if(!r.death)st.byFear[r.fear].s++;
    if(!st.byProf[r.prof])st.byProf[r.prof]={n:0,d:0,s:0};st.byProf[r.prof].n++;st.byProf[r.prof].d+=r.days;if(!r.death)st.byProf[r.prof].s++;
    if(!st.byP[r.personality])st.byP[r.personality]={n:0,d:0,s:0};st.byP[r.personality].n++;st.byP[r.personality].d+=r.days;if(!r.death)st.byP[r.personality].s++;
    ["1_7","8_14","15_21","22_28"].forEach(p=>{st.phases[p].sl+=r.ph[p].sl;st.phases[p].hl+=r.ph[p].hl;st.phases[p].cl+=r.ph[p].cl;st.phases[p].ap+=r.ph[p].ap;});
    for(const[k,v]of Object.entries(r.nt)){if(!st.npcT[k])st.npcT[k]={t:0,n:0};st.npcT[k].t+=v;st.npcT[k].n++;}
    r.vis.forEach(a=>{st.areaV[a]=(st.areaV[a]||0)+1;});
  }
  st.overall.avgDays=(td/n).toFixed(2);st.overall.surv=((st.overall.deaths.surv/n)*100).toFixed(1)+"%";
  st.overall.avgSan=(ts/n).toFixed(2);st.overall.avgHp=(th/n).toFixed(2);st.overall.avgCl=(tc/n).toFixed(2);st.overall.avgApW=(ta/n).toFixed(2);
  ["1_7","8_14","15_21","22_28"].forEach(p=>{st.phases[p].sl=(st.phases[p].sl/n).toFixed(2);st.phases[p].hl=(st.phases[p].hl/n).toFixed(2);st.phases[p].cl=(st.phases[p].cl/n).toFixed(2);st.phases[p].ap=(st.phases[p].ap/n).toFixed(2);});
  for(const[k,d]of Object.entries(st.byFear)){d.avg=(d.d/d.n).toFixed(2);d.surv=((d.s/d.n)*100).toFixed(1)+"%";delete d.d;delete d.s;}
  for(const[k,d]of Object.entries(st.byProf)){d.avg=(d.d/d.n).toFixed(2);d.surv=((d.s/d.n)*100).toFixed(1)+"%";delete d.d;delete d.s;}
  for(const[k,d]of Object.entries(st.byP)){d.avg=(d.d/d.n).toFixed(2);d.surv=((d.s/d.n)*100).toFixed(1)+"%";delete d.d;delete d.s;}
  for(const[k,d]of Object.entries(st.npcT))st.npcT[k]=(d.t/d.n).toFixed(2);
  const sbd={};results.forEach(r=>{r.san.forEach((v,i)=>{if(!sbd[i])sbd[i]={t:0,n:0};sbd[i].t+=v;sbd[i].n++;});});
  for(let d=0;d<=28;d++)if(sbd[d])st.sanCurve.push({day:d,avg:(sbd[d].t/sbd[d].n).toFixed(2)});
  return st;
}

console.log("=== 28-Day Balance Simulation v3 (" + CFG.name + " Difficulty) ===");
console.log("Runs:",RUNS,"Seed:",IS,"Fear:",FEAR);
console.log("SAN Protection:", JSON.stringify(CFG.san_protection));
console.log("HP Protection:", JSON.stringify(CFG.hp_protection));
console.log("Limits: Max " + CFG.max_san_per_action + " SAN/action, Max " + CFG.max_san_per_day + " SAN/day");
const t0=Date.now();
const results=[];
const fk=Object.keys(FEARS),pk_=Object.keys(PROFS),pkk=Object.keys(PS);
for(let i=0;i<RUNS;i++){
  let f=fk[i%fk.length];if(FEAR==="random")f=pk(fk);
  results.push(simRun(i,f,pk_[i%pk_.length],pkk[i%pkk.length]));
  if(VERBOSE&&i%100===0)console.log("[",i+1,"/",RUNS,"]");
}
console.log("Done in",((Date.now()-t0)/1000).toFixed(2)+"s");

const st=agg(results);
console.log("");
console.log("=== Overall ===");
console.log("Avg days:",st.overall.avgDays,"| Survival:",st.overall.surv);
console.log("Avg SAN:",st.overall.avgSan,"| Avg HP:",st.overall.avgHp);
console.log("Avg clues:",st.overall.avgCl,"| Avg AP wasted:",st.overall.avgApW);
console.log("Deaths: HP="+st.overall.deaths.HP+", SAN="+st.overall.deaths.SAN+", survived="+st.overall.deaths.surv);

if(PHASE){
  console.log("");
  console.log("=== Phase Details ===");
  for(const[p,d]of Object.entries(st.phases))console.log("  Day "+p.replace("_","-")+": SAN-"+d.sl+", HP-"+d.hl+", clues="+d.cl+", AP="+d.ap);
}

console.log("");
console.log("=== By Fear Profile ===");
for(const[k,d]of Object.entries(st.byFear))console.log("  "+k+": avg "+d.avg+" days, surv "+d.surv+" (n="+d.n+")");

console.log("");
console.log("=== By Profession ===");
for(const[k,d]of Object.entries(st.byProf))console.log("  "+k+": avg "+d.avg+" days, surv "+d.surv+" (n="+d.n+")");

console.log("");
console.log("=== By Personality ===");
for(const[k,d]of Object.entries(st.byP))console.log("  "+k+": avg "+d.avg+" days, surv "+d.surv+" (n="+d.n+")");

console.log("");
console.log("=== NPC Trust ===");
for(const[k,v]of Object.entries(st.npcT))console.log("  "+k+": "+v);

console.log("");
console.log("=== Area Visits ===");
Object.entries(st.areaV).sort((a,b)=>b[1]-a[1]).forEach(([a,c])=>console.log("  "+a+": "+c+" ("+((c/RUNS)*100).toFixed(1)+"%)"));

console.log("");
console.log("=== SAN Curve ===");
st.sanCurve.forEach(p=>{const bar="=".repeat(Math.max(0,Math.round(p.avg/3)));console.log("  Day "+String(p.day).padStart(2)+": "+p.avg+" "+bar);});

if(REPORT){
  fs.writeFileSync(REPORT,JSON.stringify({meta:{ts:new Date().toISOString(),runs:RUNS,seed:IS,version:"v2_with_protection"},stats:st,sample:results.slice(0,20)},null,2));
  console.log("Report saved to",REPORT);
}
console.log("");
console.log("=== COMPLETE ===");

