// src/components/NPCDialog.jsx - NPC dialog component (extracted from GamePanels.jsx)
const { useState, useEffect, useRef, useMemo, useCallback, memo } = React;

export function NPCDialog({npc,trust,layer,dispatch,state}){
  const [show,setShow]=useState(false);
  const [confirmAction,setConfirmAction]=useState(null);
  // 对话分组折叠状态：交谈/帮助 默认展开，特殊 默认折叠
  const [collapsedGroups,setCollapsedGroups]=useState({talk:false,help:false,special:true});
  const toggleGroup=(g)=>setCollapsedGroups(prev=>({...prev,[g]:!prev[g]}));
  const ns=state?.npcStates?.[npc.name]||{};
  const npcImage=getNpcImage(npc.name,state?.npcStates);
  const postKill=state?.pendingNpc?.postKill;
  if(postKill){
    return <div className="narrative-block npc-dialogue"><div className="skill-check" style={{borderLeft:'2px solid var(--danger)'}}>
      <div style={{color:'var(--danger2)',fontSize:'0.9rem',marginBottom:'0.3rem'}}>{npc.name} 已死</div>
      <div style={{color:'var(--text-dim)',fontSize:'0.8rem',lineHeight:'1.7',marginBottom:'0.6rem'}}>尸体在你面前。你需要决定接下来怎么做。</div>
      <div style={{display:'flex',flexDirection:'column',gap:'0.3rem'}}>
        <button className="btn btn-sm" onClick={()=>dispatch({type:'NPC_RESPONSE',choice:'post_kill_hide'})}>隐藏尸体<span className="cost">1 AP 痕迹+1</span></button>
        <button className="btn btn-sm" style={{color:'var(--danger2)'}} onClick={()=>dispatch({type:'NPC_RESPONSE',choice:'post_kill_cannibal'})}>食用<span className="cost">食物+2 SAN大幅下降</span></button>
        <button className="btn btn-sm" onClick={()=>dispatch({type:'NPC_RESPONSE',choice:'post_kill_leave'})}>离开现场</button>
      </div>
    </div></div>;
  }
  // 检查是否有任何特殊选项可显示
  const hasSpecial=trust>=3||trust>=2||ns.corrupted&&trust>=2;
  const doResponse=(choice)=>{
    const delay=getChoiceDelay(state?.san||60);
    if(delay>0){setTimeout(()=>{dispatch({type:'NPC_RESPONSE',choice});setShow(false);},delay);}
    else{dispatch({type:'NPC_RESPONSE',choice});setShow(false);}
  };
  return <div className="narrative-block npc-dialogue"><div className="skill-check">
    {npcImage&&<img className="npc-portrait" src={npcImage} alt={npc.name+'立绘'} onError={e=>{e.currentTarget.style.display='none';}}/>}
    <div style={{color:'var(--cyan)',fontSize:'0.9rem',marginBottom:'0.3rem'}}>与 {npc.name} 交谈</div>
    <div style={{fontSize:'0.7rem',color:'var(--text-dim)',marginBottom:'0.3rem'}}>{npc.role}</div>
    <div style={{fontSize:'0.75rem',color:'var(--gold)',marginBottom:'0.3rem',letterSpacing:'0.1em'}}>信任：{Array.from({length:5},(_, i)=><span key={i} style={{color:i<trust?'var(--gold)':'var(--border2)',textShadow:i<trust?'0 0 4px rgba(184,150,58,0.3)':'none'}}>★</span>)}</div>
    {ns.corrupted&&<div style={{fontSize:'0.7rem',color:'var(--danger2)',marginBottom:'0.3rem'}}>⚠ 该NPC已被腐蚀</div>}
    {ns.fled&&<div style={{fontSize:'0.7rem',color:'var(--danger2)',marginBottom:'0.3rem'}}>⚠ 该NPC已逃走</div>}
    {layer&&<div style={{color:'var(--text)',lineHeight:'1.8',marginBottom:'0.5rem',fontSize:'0.85rem'}}>{ns.corrupted?'（'+npc.name+'的状态不对，说话含混不清。）':layer.dialogue}</div>}
    {layer?.hint&&!ns.corrupted&&<div style={{fontSize:'0.7rem',color:'var(--gold)',fontStyle:'italic',marginBottom:'0.5rem'}}>{layer.hint}</div>}
    {!show?<button className="btn btn-sm" onClick={()=>setShow(true)}>回应</button>
    :<div>
      {/* 确认操作（攻击/背叛） */}
      {confirmAction&&<div className="npc-confirm">
        <div style={{color:'var(--danger2)',fontSize:'0.8rem',marginBottom:'0.4rem'}}>⚠ 确定要{confirmAction==='attack'?'攻击':'背叛'}吗？此操作不可撤销。</div>
        <div style={{display:'flex',gap:'0.4rem'}}>
          <button className="btn btn-sm btn-danger" onClick={()=>{dispatch({type:'NPC_RESPONSE',choice:confirmAction});setShow(false);setConfirmAction(null);}}>确认</button>
          <button className="btn btn-sm" onClick={()=>setConfirmAction(null)}>取消</button>
        </div>
      </div>}
      {/* 交谈组 */}
      <div className="npc-dialog-group">
        <div className="npc-dialog-group-title" onClick={()=>toggleGroup('talk')}>
          <span className={'chevron'+(collapsedGroups.talk?'':' open')}>▶</span> 交谈
        </div>
        {!collapsedGroups.talk&&<div className="npc-dialog-group-body">
          {trust<5&&(()=>{const already=state?._dailyTrustGains?.[npc.name];const gate=checkTrustGate(trust+1,state,npc.name);if(already)return <div style={{fontSize:'0.7rem',color:'var(--text-dim)',padding:'0.2rem 0'}}>⏳ 今日已提升信赖（{already==='talk'?'对话':'食物'}）</div>;if(gate)return <div style={{fontSize:'0.7rem',color:'var(--text-dim)',padding:'0.2rem 0',lineHeight:'1.6'}}>🔒 {trust<2?'尝试建立信任':'加深了解'}（1 AP 信任+1）<br/><span style={{fontSize:'0.62rem',color:'var(--gold)'}}>{gate}</span></div>;return <button className="btn btn-sm" onClick={()=>doResponse('trust_up')}>{trust<2?'尝试建立信任':'加深了解'}<span className="cost">1 AP 信任+1</span></button>;})()}
          <button className="btn btn-sm" onClick={()=>doResponse('silence')}>保持沉默</button>
        </div>}
      </div>
      {/* 帮助组 */}
      <div className="npc-dialog-group">
        <div className="npc-dialog-group-title" onClick={()=>toggleGroup('help')}>
          <span className={'chevron'+(collapsedGroups.help?'':' open')}>▶</span> 帮助
        </div>
        {!collapsedGroups.help&&<div className="npc-dialog-group-body">
          {trust>=1&&npc.secrets&&trust<=npc.secrets.length&&<button className="btn btn-sm" onClick={()=>doResponse('get_item')}>询问更多信息</button>}
          {(()=>{const already=state?._dailyTrustGains?.[npc.name];const curTrust=state?.npcTrust?.[npc.name]||0;const gate=trust<5?checkTrustGate(curTrust+1,state,npc.name):'max';if(already)return null;if(trust>=5)return null;return <button className="btn btn-sm" onClick={()=>doResponse('share_food')} disabled={(state?.food||0)<1||(state?.ap||0)<1||!!gate} title={gate||''}>分享食物{gate?<span className="cost">🔒 {gate.slice(0,15)}…</span>:<span className="cost">1 AP 食物-1 信任+1</span>}</button>;})()}
          {ns.corrupted&&trust>=4&&<button className="btn btn-sm" style={{color:'var(--gold)'}} onClick={()=>doResponse('redeem')}>尝试救赎</button>}
        </div>}
      </div>
      {/* 特殊组（默认折叠） */}
      {hasSpecial&&<div className="npc-dialog-group npc-dialog-group--danger">
        <div className="npc-dialog-group-title" onClick={()=>toggleGroup('special')}>
          <span className={'chevron'+(collapsedGroups.special?'':' open')}>▶</span> 特殊
        </div>
        {!collapsedGroups.special&&<div className="npc-dialog-group-body">
          {trust>=3&&<button className="btn btn-sm" style={{color:'var(--text-dim)',fontSize:'0.72rem'}} onClick={()=>doResponse('preach')}>⚠ 传教（2 AP 神秘学检定）</button>}
          {trust>=2&&<button className="btn btn-sm" style={{color:'var(--danger2)',fontSize:'0.72rem'}} onClick={()=>doResponse('incite')}>⚠ 陷害（2 AP 话术检定）</button>}
          {trust>=2&&<button className="btn btn-sm" style={{color:'var(--text-dim)',fontSize:'0.72rem'}} onClick={()=>doResponse('exploit_npc')}>⚠ 利用（1 AP 信任-2）</button>}
          {trust>=3&&<button className="btn btn-sm" style={{color:'var(--danger2)',fontSize:'0.72rem'}} onClick={()=>setConfirmAction('betray_npc')}>⚠ 背叛（1 AP 信任清零）</button>}
          {ns.corrupted&&trust>=2&&<button className="btn btn-sm" style={{color:'var(--danger2)',fontSize:'0.72rem'}} onClick={()=>doResponse('intimacy')}>⚠ 靠近（2 AP SAN-）</button>}
          <button className="btn btn-sm btn-danger" style={{fontSize:'0.72rem'}} onClick={()=>setConfirmAction('attack')}>⚠ 攻击（2 AP 格斗检定）</button>
        </div>}
      </div>}
      {/* 离开（始终可见） */}
      <div style={{marginTop:'0.35rem',borderTop:'1px solid rgba(42,42,48,0.2)',paddingTop:'0.3rem'}}>
        <button className="btn btn-sm" onClick={()=>doResponse('leave')}>告别</button>
      </div>
    </div>}
  </div></div>;
}

