// src/components/AppToast.jsx — 吐司通知组件
import { audioManager } from '../managers/AudioManager.js';
const { useState, useEffect, useRef, useMemo, useCallback, memo } = React;

export function AppToast({toast,onDismiss}){
  const isAch=!!toast.def?.icon&&toast.type!=='save'&&toast.type!=='load';
  useEffect(()=>{if(isAch)audioManager.playEffect('clue_found');const t=setTimeout(onDismiss,isAch?5000:2500);return()=>clearTimeout(t);},[onDismiss]);
  const icon=toast.def?.icon||'💾';
  const label=toast.type==='save'?'已存档':toast.type==='load'?'读取成功':'成就解锁';
  return <div className={'app-toast'+(toast.type==='save'||toast.type==='load'?' toast-save':'')} onClick={onDismiss}>
    <div className="app-toast-icon">{icon}</div>
    <div className="app-toast-text">
      <div className="app-toast-label">{label}</div>
      <div className="app-toast-name">{toast.def?.name||''}</div>
      {toast.def?.desc&&<div className="app-toast-desc">{toast.def?.desc}</div>}
    </div>
  </div>;
}
