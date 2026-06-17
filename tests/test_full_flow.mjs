import { readFileSync } from "fs";
const baseData = JSON.parse(readFileSync("game_base.json", "utf-8"));
function createSeededRng(seed, idx) { let h = 0; const s = seed + ":" + idx; for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; let state = Math.abs(h) || 1; return { next() { state = (state * 1664525 + 1013904223) & 0x7fffffff; return state / 0x7fffffff; }, pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }, intBetween(min, max) { return Math.floor(this.next() * (max - min + 1)) + min; } }; }
import { rand, d100, clamp, pick, makeRand } from "../src/reducers/utils.js";
import { getMotifFlavorText, getMonsterManifestation } from "../src/reducers/chapterReducer.js";
import { checkFalseInterpretations } from "../src/reducers/conclusionReducer.js";
import { getPollutionText } from "../src/reducers/loopReducer.js";
import { getForcedProgressGuard } from "../src/reducers/objectiveReducer.js";
import { selectEvent, doSkillCheck, getGambleOptions } from "../src/reducers/eventReducer.js";
import { applyLightTextCorruption, canDetectFalseOption, processSafehouseNight } from "../src/reducers/miscReducer.js";
import { hasClueId } from "../src/utils/clueNameMap.js";
import { checkTriggerExtended, getEligibleEvents, chooseWeightedEvent, selectEventV2 } from "../src/reducers/extendedEvents.js";
import { initExtendedEvents } from "../src/reducers/extendedEventsInit.js";
import { getPrologueEvent } from "../src/reducers/prologueReducer.js";
const GD = initExtendedEvents(baseData); const ctx = { GD }; const rng = createSeededRng("test_run_1", 0);
const state = { screen:"game",day:1,san:60,maxSan:60,hp:10,maxHp:10,ap:6,maxAp:6,food:3,money:10,lightLevel:2,currentArea:"town_center",visitedAreas:["town_center"],currentChapter:"chapter_1",loopCount:0,runSeed:"test_run_1",skills:{},triggeredEvents:[],clues:[],inventory:[],npcTrust:{},npcStates:{},eventLog:[],everTriggeredEvents:[],safehouseCorruption:0,pollution:0,mythosLevel:0,humanityScore:50,fearTuning:null,accessibilityOptions:{},prologue:{completed:true,currentScene:"dawn",fearProfile:{},copingProfile:{},choicesMade:[],resultingFlags:[]},stats_run:{},stats_today:{},categoryCountsToday:{},categoryCountsRun:{},abnormalStreak:0,eventCooldowns:{},_madnessApMultiplier:1,_actionIndex:0 };
let passed=0,failed=0;function assert(n,c){if(c){passed++;console.log("  PASS "+n)}else{failed++;console.error("  FAIL "+n)}}
console.log("=== 1. utils ===");
{ const r1=makeRand(rng);assert("makeRand(rng) fn",typeof r1==="function");assert("makeRand(rng)()",r1()>=0&&r1()<1);assert("makeRand(null)",typeof makeRand(null)==="function");assert("rand(1,100,rng)",rand(1,100,rng)>=1&&rand(1,100,rng)<=100);assert("d100(rng)",d100(rng)>=1&&d100(rng)<=100);assert("pick(arr,rng)",["a","b","c"].includes(pick(["a","b","c"],rng)));}
console.log("=== 2. getMotifFlavorText ===");
{const r=getMotifFlavorText("fog",80,ctx,rng);assert("str|null",r===null||typeof r==="string");assert("bad=null",getMotifFlavorText("xxx",80,ctx,rng)===null);}
console.log("=== 3. getMonsterManifestation ===");
{const m=getMonsterManifestation("deep_ones",10,ctx,rng);assert("obj|null",m===null||(m.stage&&m.manifestation));assert("bad=null",getMonsterManifestation("xxx",10,ctx,rng)===null);}
console.log("=== 4. checkFalseInterpretations ===");
assert("array",Array.isArray(checkFalseInterpretations(state,ctx,rng)));
console.log("=== 5. getPollutionText ===");
assert("p=0 orig",getPollutionText("text",0,rng)==="text");assert("p=0 null",getPollutionText("text",0,null)==="text");assert("p=50 str",typeof getPollutionText("text",50,rng)==="string");
console.log("=== 6. getForcedProgressGuard ===");
{const g=getForcedProgressGuard(state,ctx,rng);assert("obj|null",g===null||typeof g==="object");assert("null ok",getForcedProgressGuard(state,ctx,null)===null||typeof getForcedProgressGuard(state,ctx,null)==="object");}
console.log("=== 7. selectEvent ===");
{const e=selectEvent("town_center",state,ctx,pick,rng);assert("evt|null",e===null||(e.id&&e.description));const e2=selectEvent("town_center",state,ctx,pick,null);assert("null ok",e2===null||(e2.id&&e2.description));}
console.log("=== 8. doSkillCheck ===");
{const r=doSkillCheck("edit",50,state,"normal",ctx,rng);assert("result",r&&typeof r.roll==="number"&&typeof r.success==="boolean");assert("roll [1,100]",r.roll>=1&&r.roll<=100);const r2=doSkillCheck("edit",50,state,"normal",ctx,null);assert("null ok",r2&&typeof r2.roll==="number");}
console.log("=== 9. getGambleOptions ===");
{const go=getGambleOptions({sanity_damage:3},state,ctx,rng);assert("arr|null",go===null||Array.isArray(go));assert("no dmg=null",getGambleOptions({sanity_damage:0},state,ctx,rng)===null);}
console.log("=== 10. applyLightTextCorruption ===");
assert("l=2 orig",applyLightTextCorruption("text",2,ctx,rng)==="text");assert("empty",applyLightTextCorruption("",0,ctx,rng)==="");assert("l=0 str",typeof applyLightTextCorruption("text",0,ctx,rng)==="string");
console.log("=== 11. canDetectFalseOption ===");
assert("bool",typeof canDetectFalseOption(2,ctx,rng)==="boolean");assert("null ok",typeof canDetectFalseOption(0,ctx,null)==="boolean");
console.log("=== 12. processSafehouseNight ===");
{const s1={...state,npcStates:{}};assert("num",typeof processSafehouseNight(s1,ctx,rng)==="number");assert("null ok",typeof processSafehouseNight(s1,ctx,null)==="number");}
console.log("=== 13. checkTriggerExtended ===");
{const s1={...state,clues:[{id:"ct",name:"test"}]};assert("has clue",checkTriggerExtended({trigger:{areas:["town_center"],requires_clues:["ct"]}},s1,ctx)===true);assert("no clue",checkTriggerExtended({trigger:{areas:["town_center"],requires_clues:["cx"]}},s1,ctx)===false);assert("forbidden",checkTriggerExtended({trigger:{areas:["town_center"],forbidden_flags:["ct"]}},s1,ctx)===false);}
console.log("=== 14. getEligibleEvents ===");
{const el=getEligibleEvents("town_center",state,ctx);assert("array",Array.isArray(el));assert("candidates",el.length>0);}
console.log("=== 15. chooseWeightedEvent ===");
{const el=getEligibleEvents("town_center",state,ctx);if(el.length>0){const c=chooseWeightedEvent(el,"town_center",state,ctx,pick,rng);assert("evt|null",c===null||(c.id&&c.description));}}
console.log("=== 16. selectEventV2 ===");
{const evt=selectEventV2("town_center",state,ctx,pick,rng);assert("evt|null",evt===null||(evt.id&&evt.description));}
console.log("=== 17. Supplement ===");
{const events=GD.events||[];const sup=events.filter(e=>e.id&&(e.id.startsWith("grove_")||e.id.startsWith("yith_")||e.id.startsWith("light_")||e.id.startsWith("cata_")||e.id.startsWith("manor_")||e.id.startsWith("deep_")));assert("loaded "+sup.length,sup.length>100);assert("qt",sup.every(e=>e.quality_tier));assert("anchor",sup.every(e=>typeof e.normalcy_anchor==="boolean"));assert("unrel",sup.every(e=>typeof e.unreliable_narration_level==="number"));const monsters=sup.filter(e=>e.type==="怪物遭遇");assert("monsters san_lte=50 ("+monsters.length+")",monsters.every(e=>e.trigger.san_lte===50));const supers=sup.filter(e=>e.type==="超自然遭遇");assert("supers san_lte=60 ("+supers.length+")",supers.every(e=>e.trigger.san_lte===60));const metas=sup.filter(e=>e.type==="meta");assert("meta min_loop=2 ("+metas.length+")",metas.every(e=>e.trigger.min_loop===2));}
console.log("=== 18. prologue ===");
{const pe=getPrologueEvent("station");assert("ok",pe&&pe.id==="prologue_station");}
console.log("=== 19. hasClueId ===");
{const clues=[{id:"a",name:"A"},"b"];assert("obj",hasClueId(clues,"a")===true);assert("str",hasClueId(clues,"b")===true);assert("miss",hasClueId(clues,"c")===false);}
console.log("=".repeat(50));
console.log("Total: "+passed+" passed, "+failed+" failed");
if(failed>0)process.exit(1);else console.log("ALL TESTS PASSED");