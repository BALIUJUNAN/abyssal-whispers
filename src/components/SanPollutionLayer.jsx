// src/components/SanPollutionLayer.jsx - SAN visual corruption (SSOT, 6 stages)
const { useEffect, useRef, useCallback, useState, memo } = React;
const FPS_CAP = 15; const FRAME_MS = 1000 / FPS_CAP; const LERP = 0.06;
function lerp(a, b, t) { return a + (b - a) * t; }
var _noise = null;
function getNoise(w, h) {
  if (_noise && _noise.width === w && _noise.height === h) return _noise;
  _noise = document.createElement('canvas'); _noise.width = w; _noise.height = h;
  var nc = _noise.getContext('2d'); var id = nc.createImageData(w, h); var d = id.data;
  for (var i = 0; i < d.length; i += 4) { var v = Math.random() * 255; d[i] = d[i+1] = d[i+2] = v; d[i+3] = 18; }
  nc.putImageData(id, 0, 0); return _noise;
}
var _CLEAN_VIS = {saturation:0,vignette:0,scanline:0,noise:0,barrel_distortion:0,chromatic_aberration:0,rotation:0,text_shadow:false,text_tremble:false,glow:false};

function getVisualForSan(san) {
  var GD = (typeof window !== 'undefined' && window.GD) || {};
  var stages = (GD.systems && GD.systems.sanity && GD.systems.sanity.san_stages) || [];
  if (stages.length === 0) return {sat:0,vig:0,scan:0,noise:0,barrel:0,chroma:0,rot:0,shadow:false,tremble:false,glow:false,level:0};
  var curIdx = 0;
  for (var i = 0; i < stages.length; i++) {
    if (san >= stages[i].range[0] && san <= stages[i].range[1]) { curIdx = i; break; }
    if (san < stages[i].range[0] && (i === stages.length - 1 || san >= stages[i+1].range[0])) { curIdx = i; break; }
  }
  if (san < stages[stages.length-1].range[0]) curIdx = stages.length - 1;
  var cur = stages[curIdx]; var curVis = cur.visual || _CLEAN_VIS;
  if (curIdx >= stages.length - 1 || san >= 75) {
    return {sat:curVis.saturation||0,vig:curVis.vignette||0,scan:curVis.scanline||0,noise:curVis.noise||0,barrel:curVis.barrel_distortion||0,chroma:curVis.chromatic_aberration||0,rot:curVis.rotation||0,shadow:!!curVis.text_shadow,tremble:!!curVis.text_tremble,glow:!!curVis.glow,level:cur.level||0};
  }
  var rangeSize = cur.range[1] - cur.range[0];
  var blend = rangeSize > 0 ? Math.max(0, Math.min(1, (cur.range[1] - san) / rangeSize)) : 0;
  var next = stages[curIdx + 1]; var nextVis = next.visual || _CLEAN_VIS;
  return {
    sat:lerp(curVis.saturation||0,nextVis.saturation||0,blend), vig:lerp(curVis.vignette||0,nextVis.vignette||0,blend),
    scan:lerp(curVis.scanline||0,nextVis.scanline||0,blend), noise:lerp(curVis.noise||0,nextVis.noise||0,blend),
    barrel:lerp(curVis.barrel_distortion||0,nextVis.barrel_distortion||0,blend), chroma:lerp(curVis.chromatic_aberration||0,nextVis.chromatic_aberration||0,blend),
    rot:lerp(curVis.rotation||0,nextVis.rotation||0,blend),
    shadow:curVis.text_shadow||(blend>0.5&&nextVis.text_shadow), tremble:curVis.text_tremble||(blend>0.3&&nextVis.text_tremble),
    glow:curVis.glow||(blend>0.5&&nextVis.glow), level:cur.level||0
  };
}

// === Canvas Renderer ===
var SanPollutionLayer = memo(function SanPollutionLayer(props) {
  var san=props.san, loopCount=props.loopCount, corruption=props.corruption;
  var enabled=props.enabled, intensity=props.intensity;
  var canvasRef=useRef(null);
  var st=useRef({cR:0,cG:0,cB:0,cA:0,scanA:0,tearP:0,noiseA:0,vigA:0,chromaA:0,barrelS:0,rotA:0,lastT:0,raf:0});
  var I=Math.max(0,Math.min(100,intensity!=null?intensity:50))/100;
  var resize=useCallback(function(){var c=canvasRef.current;if(!c)return;var dpr=Math.min(window.devicePixelRatio||1,2);c.width=window.innerWidth*dpr;c.height=window.innerHeight*dpr;c.getContext('2d').setTransform(dpr,0,0,dpr,0,0);},[]);
  useEffect(function(){resize();window.addEventListener('resize',resize);return function(){window.removeEventListener('resize',resize);};},[resize]);
  useEffect(function(){
    var canvas=canvasRef.current;if(!canvas||!enabled)return;
    var ctx=canvas.getContext('2d');var s=st.current;var alive=true;
    function frame(now){
      if(!alive)return;s.raf=requestAnimationFrame(frame);
      if(now-s.lastT<FRAME_MS)return;s.lastT=now;
      var w=window.innerWidth,h=window.innerHeight;ctx.clearRect(0,0,w,h);
      var V=getVisualForSan(san);var corF=Math.min(1,(corruption||0)/80)*I;
      var totalI=Math.abs(V.sat)+V.vig+V.scan+V.noise+V.barrel+V.chroma+V.rot;
      if(totalI<0.5&&corF<0.01){if(canvas.style.opacity!=='0')canvas.style.opacity='0';canvas.style.filter='none';return;}
      if(canvas.style.opacity!=='1')canvas.style.opacity='1';
      // Color shift
      var colorI=Math.max(0,-V.sat/60)*I;
      s.cR=lerp(s.cR,20+colorI*50,LERP);s.cG=lerp(s.cG,colorI*2,LERP);s.cB=lerp(s.cB,8+colorI*25,LERP);
      s.cA=lerp(s.cA,colorI*0.08+corF*0.03,LERP);
      if(s.cA>0.003){ctx.fillStyle='rgba('+(s.cR|0)+','+(s.cG|0)+','+(s.cB|0)+','+s.cA.toFixed(3)+')';ctx.fillRect(0,0,w,h);}
      // Noise
      var targetNoise=(V.noise*I+corF*0.02)*(1+0.3*Math.sin(now*0.002));
      s.noiseA=lerp(s.noiseA,targetNoise,LERP);
      if(s.noiseA>0.003){ctx.globalAlpha=s.noiseA;ctx.drawImage(getNoise(w|0,h|0),0,0,w,h);ctx.globalAlpha=1;}
      // Scanlines
      var targetScan=V.scan*0.12*I;s.scanA=lerp(s.scanA,targetScan,LERP);
      if(s.scanA>0.003){ctx.strokeStyle='rgba(0,0,0,'+s.scanA.toFixed(4)+')';ctx.lineWidth=0.8;var off=(now*0.015)%4;for(var y=off;y<h;y+=2.5){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}}
      // Vignette
      var targetVig=V.vig*I*(1+0.3*Math.sin(now*0.001));s.vigA=lerp(s.vigA,targetVig+corF*0.05,LERP);
      if(s.vigA>0.01){var vigR=V.level>=4?0.10:0.25;var g=ctx.createRadialGradient(w/2,h/2,w*vigR,w/2,h/2,w*0.68);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(12,0,8,'+s.vigA.toFixed(3)+')');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}
      // Chromatic aberration
      var targetChroma=V.chroma*0.015*I;s.chromaA=lerp(s.chromaA,targetChroma,LERP);
      if(s.chromaA>0.005){var edgeW=Math.min(0.20,0.08+V.chroma*0.02)*w;var cr=ctx.createLinearGradient(0,0,edgeW,0);cr.addColorStop(0,'rgba(180,20,30,'+s.chromaA.toFixed(3)+')');cr.addColorStop(1,'rgba(180,20,30,0)');ctx.fillStyle=cr;ctx.fillRect(0,0,edgeW,h);var cb=ctx.createLinearGradient(w-edgeW,0,w,0);cb.addColorStop(0,'rgba(30,40,180,0)');cb.addColorStop(1,'rgba(30,40,180,'+s.chromaA.toFixed(3)+')');ctx.fillStyle=cb;ctx.fillRect(w-edgeW,0,edgeW,h);}
      // Barrel + rotation
      s.barrelS=lerp(s.barrelS,V.barrel*I,LERP);s.rotA=lerp(s.rotA,V.rot*I,LERP);
      var breathPulse=1+0.004*Math.sin(now*0.0008)*(V.level>=3?1:0);
      var blurAmt=s.barrelS>0.02?s.barrelS*8:0;
      var rotDeg=s.rotA*Math.sin(now*0.0003)*0.5;
      canvas.style.filter=(blurAmt>0.02?'blur('+blurAmt.toFixed(1)+'px) ':'');
      canvas.style.transform='scale('+breathPulse.toFixed(4)+') rotate('+rotDeg.toFixed(2)+'deg)';
      // Screen tears (level>=4)
      if(V.level>=4){var tearProb=(V.level>=5?0.18:0.06)*I;s.tearP=lerp(s.tearP,tearProb,LERP);if(Math.random()<s.tearP){var sy=Math.random()*h,sh=1+Math.random()*8;var sx=(Math.random()-0.5)*20*I;try{var id=ctx.getImageData(0,sy|0,w|0,sh|0);ctx.putImageData(id,sx|0,sy|0);}catch(e){}}}
    }
    s.raf=requestAnimationFrame(frame);return function(){alive=false;cancelAnimationFrame(s.raf);};
  },[san,loopCount,corruption,enabled,I]);
  if(!enabled)return null;
  var V=getVisualForSan(san);
  var tier=V.level>=4?'spl-extreme':V.level>=3?'spl-hostile':V.level>=2?'spl-mid':V.level>=1?'spl-low':'';
  return React.createElement('canvas',{ref:canvasRef,className:'san-pollution-layer '+tier,'aria-hidden':'true'});
});

// === CorruptibleChoice: stage-aware hover corruption ===
var _CG='█▓▒░▄▀▌▐■▬▲▼●○☼★';
var _CP=[['探索','窥视'],['移动','爬行'],['交谈','低语'],['休息','放弃'],['深入','坠入'],['调查','挖掘'],['离开','逃跑'],['相信','服从'],['质疑','背叛'],['安全','暂时'],['选择','屈服']];
var CorruptibleChoice=memo(function(props){
  var children=props.children,san=props.san,onClick=props.onClick,className=props.className,disabled=props.disabled;
  var _l=useState(0);var level=_l[0],setLevel=_l[1];
  var hoverRef=useRef(false),tickRef=useRef(null),decayRef=useRef(null);
  var V=getVisualForSan(san);var active=V.level>=1&&!disabled;
  var hoverDelay=V.level>=5?400:V.level>=4?800:V.level>=3?600:V.level>=2?1200:0;
  var startCorruption=useCallback(function(){
    if(!active||hoverDelay<=0)return;hoverRef.current=true;
    var delay=hoverDelay+Math.random()*200;
    tickRef.current=setTimeout(function(){setLevel(10);tickRef.current=setInterval(function(){setLevel(function(p){return Math.min(100,p+10);});},200);},delay);
  },[active,hoverDelay]);
  var stopCorruption=useCallback(function(){
    hoverRef.current=false;
    if(tickRef.current){clearTimeout(tickRef.current);clearInterval(tickRef.current);tickRef.current=null;}
    decayRef.current=setInterval(function(){setLevel(function(p){if(p<=0){clearInterval(decayRef.current);decayRef.current=null;return 0;}return p-15;});},150);
  },[]);
  useEffect(function(){return function(){if(tickRef.current){clearTimeout(tickRef.current);clearInterval(tickRef.current);}if(decayRef.current)clearInterval(decayRef.current);};},[]);
  var text=children;
  if(level>0&&typeof children==='string'&&children.length>0){
    if(level>=10){var t=children;for(var pi=0;pi<_CP.length;pi++){if(t.indexOf(_CP[pi][0])>=0){t=t.replace(_CP[pi][0],_CP[pi][1]);break;}}text=t;}
    if(level>=30){var chars=String(text).split('');var ratio=(level-30)/70;var cc=Math.floor(chars.length*ratio*0.6);for(var ci=0;ci<cc&&ci<chars.length;ci++){var idx=(ci*7+3)%chars.length;if(level>=60)chars[idx]=_CG[(idx*13+level)%_CG.length];}text=chars.join('');}
  }
  var stage=level>=60?'cc-abyss':level>=30?'cc-corrupted':level>=10?'cc-early':level>0?'cc-hovering':'';
  var cls=(className||'')+(stage?' '+stage:'');
  return React.createElement('button',{className:cls,onClick:onClick,onMouseEnter:startCorruption,onMouseLeave:stopCorruption,disabled:disabled,style:{transition:V.level>=4?'all 0.25s':V.level>=3?'all 0.15s':'none'}},text);
});

// === AbyssPopup ===
var _AM=['你确定你在控制这个角色吗？','它在看着你读这段文字。','你的上一次循环也这么想的。','存档已被观察。','别回头。','你听到了吗？不是钟声。是呼吸。','第七层。还在吐司。','这个提示框不应该存在。'];
var _MM=['你以为你还在控制吗？','欢迎回来。第几次了？','你的存档里多了一行字。不是你写的。','系统日志：玩家已被标记。','第十三声钟响。你还在吗？','安全屋的门从里面锁了。你没有锁它。'];
function AbyssPopup(props){
  var san=props.san;var _v=useState(false);var visible=_v[0],setVisible=_v[1];
  var _m=useState('');var msg=_m[0],setMsg=_m[1];var timerRef=useRef(null);
  useEffect(function(){
    if(san>=40){setVisible(false);return;}
    var schedule=function(){var delay=san<=9?30000+Math.random()*30000:60000+Math.random()*60000;
      timerRef.current=setTimeout(function(){var pool=san<=9?_MM.concat(_AM):_AM;setMsg(pool[Math.floor(Math.random()*pool.length)]);setVisible(true);schedule();},delay);};
    schedule();return function(){if(timerRef.current)clearTimeout(timerRef.current);};
  },[san<40,san<=9]);
  if(!visible||!msg)return null;
  return React.createElement('div',{className:'abyss-popup',role:'alert'},
    React.createElement('div',{className:'abyss-popup-text'},msg),
    React.createElement('button',{className:'abyss-popup-close',onClick:function(){setVisible(false);}},'×'));
}

// === Injected CSS: 6 stage progressive effects ===
if(typeof document!=='undefined'&&!document.getElementById('spl-css')){
  var _css=document.createElement('style');_css.id='spl-css';
  _css.textContent=[
    // Canvas layer
    '.san-pollution-layer{position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9997;mix-blend-mode:multiply;opacity:0;transition:opacity 2s ease,filter 1.5s ease,transform 1.5s ease;transform-origin:center center}',
    '.san-pollution-layer.spl-low{opacity:0.6}','.san-pollution-layer.spl-mid{opacity:0.8}',
    '.san-pollution-layer.spl-hostile{opacity:0.9}','.san-pollution-layer.spl-extreme{opacity:1}',
    // Stage 1: mild_erosion [55,74] — shadow + cold hue + breathing
    '.san-stage-1 .narrative-block,.san-stage-1 .event-text{animation:splMildShadow 10s ease-in-out infinite}',
    '.san-stage-1 .game-layout{filter:hue-rotate(-8deg) saturate(0.95);animation:splBreath 30s ease-in-out infinite}',
    '@keyframes splMildShadow{0%,85%,100%{text-shadow:none}88%{text-shadow:0 0 2px rgba(100,120,160,0.15)}92%{text-shadow:0 1px 1px rgba(100,120,160,0.1)}}',
    '@keyframes splBreath{0%,100%{transform:scale(1)}50%{transform:scale(1.003)}}',
    // Stage 2: perception_shift [40,54] — tremble + glow
    '.san-stage-2 .narrative-block,.san-stage-2 .event-text{animation:splTremble 0.15s ease-in-out infinite}',
    '.san-stage-2 .game-layout{filter:hue-rotate(-12deg) saturate(0.85)}',
    '.san-stage-2 .area-name,.san-stage-2 .event-title{animation:splGlow 3s ease-in-out infinite}',
    '@keyframes splTremble{0%,100%{transform:translate(0,0)}25%{transform:translate(0.5px,-0.5px)}50%{transform:translate(-0.5px,0.5px)}75%{transform:translate(0.5px,0.5px)}}',
    '@keyframes splGlow{0%,100%{text-shadow:none;opacity:1}50%{text-shadow:0 0 6px rgba(160,140,200,0.2);opacity:0.95}}',
    // Stage 3: explanation_loss [25,39] — strong tremble + barrel
    '.san-stage-3 .game-layout{filter:hue-rotate(-15deg) saturate(0.75)}',
    '.san-stage-3 .narrative-block,.san-stage-3 .event-text{animation:splTrembleStrong 0.12s ease-in-out infinite}',
    '@keyframes splTrembleStrong{0%,100%{transform:translate(0,0)}25%{transform:translate(1px,-1px)}50%{transform:translate(-1px,0.5px)}75%{transform:translate(0.5px,1px)}}',
    // Stage 4: reality_dissolution [10,24] — button flicker + displacement
    '.san-stage-4 .game-layout{filter:hue-rotate(-18deg) saturate(0.6)}',
    '.san-stage-4 .action-btn{animation:splFlicker 4s ease-in-out infinite}',
    '.san-stage-4 .action-btn:nth-child(2n){animation-delay:1.3s}',
    '.san-stage-4 .action-btn:nth-child(3n){animation-delay:2.7s}',
    '@keyframes splFlicker{0%,92%,100%{opacity:1;transform:translate(0,0)}93%{opacity:0.7;transform:translate(1px,0)}95%{opacity:1;transform:translate(-1px,0)}97%{opacity:0.8;transform:translate(0,1px)}}',
    // Stage 5: narrative_death [1,9] — extreme everything + cursor
    '.san-stage-5 .game-layout{filter:hue-rotate(-22deg) saturate(0.4) contrast(1.1)}',
    '.san-stage-5 .action-btn{animation:splFlicker 2s ease-in-out infinite,splTrembleStrong 0.1s ease-in-out infinite;cursor:crosshair}',
    '.san-stage-5 .narrative-block{animation:splTrembleStrong 0.08s ease-in-out infinite}',
    // CorruptibleChoice
    '.cc-hovering{opacity:0.92!important;transition:opacity 0.3s}',
    '.cc-early{color:var(--text)!important;opacity:0.88!important;text-shadow:0 0 4px rgba(180,30,30,0.3)}',
    '.cc-corrupted{color:var(--danger2)!important;font-style:italic;opacity:0.82!important;text-shadow:0 0 8px rgba(180,30,30,0.4);animation:ccFlicker 0.6s ease-in-out infinite}',
    '.cc-abyss{color:#6a1b1b!important;font-style:italic;opacity:0.75!important;text-shadow:0 0 12px rgba(180,30,30,0.6);animation:ccAbyss 0.4s ease-in-out infinite;letter-spacing:0.05em}',
    '@keyframes ccFlicker{0%,100%{opacity:0.82}50%{opacity:0.62}}',
    '@keyframes ccAbyss{0%,100%{opacity:0.75;transform:translateX(0)}25%{opacity:0.6;transform:translateX(-1px)}75%{opacity:0.65;transform:translateX(1px)}}',
    // Abyss popup
    '.abyss-popup{position:fixed;bottom:12%;right:5%;z-index:10001;background:rgba(8,2,12,0.92);border:1px solid rgba(120,30,30,0.35);color:rgba(180,140,140,0.9);padding:0.7rem 1rem;font-size:0.82rem;font-family:"Noto Serif SC","Songti SC",serif;max-width:280px;pointer-events:auto;animation:abyssAppear 1.5s ease-out;box-shadow:0 0 30px rgba(80,10,10,0.2)}',
    '.abyss-popup-text{line-height:1.5}',
    '.abyss-popup-close{position:absolute;top:0.2rem;right:0.5rem;background:none;border:none;color:rgba(180,140,140,0.5);cursor:pointer;font-size:1rem;padding:0.2rem}',
    '.abyss-popup-close:hover{color:rgba(180,140,140,0.8)}',
    '@keyframes abyssAppear{0%{opacity:0;transform:translateY(20px)}100%{opacity:1;transform:translateY(0)}}',
  ].join('');
  document.head.appendChild(_css);
}
