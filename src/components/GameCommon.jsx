// src/components/GameCommon.jsx - Common UI components extracted from app.jsx
// StatBar, Modal, CollapsibleSection, NarrativeBlock
// All use React hooks from global scope (useState, useEffect, memo, etc.)

export function StatBar({label,value,max,cls,colorMap}){
  const pct=max>0?(value/max)*100:0;
  const bg=colorMap?(pct>60?colorMap[0]:pct>30?colorMap[1]:colorMap[2]):undefined;
  return <div className={'stat-bar '+(cls||'')}><div className="bar-label"><span className="name">{label}</span><span className="val">{value}/{max}</span></div><div className="bar-track"><div className="bar-fill" style={bg?{width:pct+'%',background:bg}:{width:pct+'%'}}/></div></div>;
}

export function Modal({open,onClose,title,children,width}){
  useEffect(()=>{
    if(!open) return;
    const handler=e=>{if(e.key==='Escape')onClose();};
    window.addEventListener('keydown',handler);
    return ()=>window.removeEventListener('keydown',handler);
  },[open,onClose]);
  if(!open) return null;
  return <div className="modal-backdrop" onClick={onClose}>
    <div className="modal-content" style={width?{maxWidth:width}:undefined} onClick={e=>e.stopPropagation()}>
      <div className="modal-header">
        <span className="modal-title">{title}</span>
        <button className="modal-close" onClick={onClose}>×</button>
      </div>
      <div className="modal-body">{children}</div>
    </div>
  </div>;
}

export function CollapsibleSection({title,count,defaultOpen,summary,children}){
  const [open,setOpen]=useState(defaultOpen||false);
  return <div className="dossier-section">
    <div className="dossier-section-title" onClick={()=>setOpen(!open)}>
      <span>{title}{count!=null&&' ('+count+')'}{!open&&summary&&<span className="section-summary">{summary}</span>}</span>
      <span className={'chevron'+(open?' open':'')}>▶</span>
    </div>
    <div className={'dossier-section-body'+(open?' expanded':' collapsed')} style={open?{maxHeight:'600px'}:undefined}>
      {children}
    </div>
  </div>;
}

export const NarrativeBlock=memo(function NarrativeBlock({block}){
  if(!block)return null;
  const isSanRecovery=block.type==='san-recovery';
  const mythosTypes=['超自然遭遇','怪物遭遇','神秘事件','mythos'];
  const isMythos=block.eventType&&mythosTypes.includes(block.eventType);
  const eventTypeLabel=block.eventType?(EVENT_TYPE_LABELS[block.eventType]||block.eventType):null;
  return <div className={'narrative-block'+(block.type==='system'?' system':'')+(block.isEffect?' system':'')+(block.isSpecial?' system':'')+(block.type==='death'?' death-narrative':'')+(isSanRecovery?' san-recovery':'')+(isMythos?' mythos-text':'')+(block._areaClass?' '+block._areaClass:'')}>
    {block.locationName&&<div className="location-name">📍 {block.locationName}</div>}
    {block.eventTitle&&<div className="event-title">{block._ugcAuthor?<span className="ugc-badge" title={'MOD by '+block._ugcAuthor}>🏷️ [MOD]</span>:null}{block.eventTitle}</div>}
    {block.eventType&&<div className={'event-type '+block.eventType}>{eventTypeLabel}</div>}
    {block.imageSrc&&<img className="narrative-image" src={block.imageSrc} alt={block.imageAlt||block.eventTitle||block.locationName||'事件插图'} onError={e=>{e.currentTarget.style.display='none';}}/>}
    <div className="narrative-text">{block.text}</div>
    {block.madness&&<div className="madness-effect">⚠ {block.madness.name}：{block.madness.description}</div>}
  </div>;
})
