#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
function ga(n,d){const i=args.indexOf('--'+n);return i===-1?d:(args[i+1]||d);}
function hf(n){return args.includes('--'+n);}
const RUNS=parseInt(ga('runs','100'),10),SEED=ga('seed',null),REPORT=ga('report',null),FEAR=ga('fear','all'),DIFFICULTY=ga('difficulty','normal').toLowerCase(),VERBOSE=hf('verbose'),PHASE=hf('phase-detail');
let _s=SEED?parseInt(SEED,10):Date.now();const IS=_s;
function sr(){_s^=_s<<13;_s^=_s>>17;_s^=_s<<5;return(_s>>>0)/4294967296;}
function ri(a,b){return Math.floor(sr()*(b-a+1))+a;}
function pk(a){return a[Math.floor(sr()*a.length)];}
function cl(v,lo,hi){return Math.max(lo,Math.min(hi,v));}
function wp(items,w){let t=w.reduce((a,b)=>a+b,0),r=sr()*t;for(let i=0;i<items.length;i++){r-=w[i];if(r<=0)return items[i];}return items[items.length-1];}
let GD={};try{GD=JSON.parse(fs.readFileSync(path.join(ROOT,'game_base.json'),'utf8'));}catch(e){console.error('No game_base.json');process.exit(1);}
console.log('v3 script loaded successfully');
console.log('Difficulty modes: easy, normal, hard, nightmare');
