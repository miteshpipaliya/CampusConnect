'use client';
import {useEffect,useMemo,useState} from 'react';
import {OnlineIndicator} from './online-indicator';
type AvatarUser={name?:string;handle?:string;avatarUrl?:string|null;avatarMediaId?:string|null};
type Props={user?:AvatarUser;uid?:string;handle?:string;size?:24|32|40|44|56|150;ring?:'none'|'unseen'|'seen'|'close';className?:string;online?:boolean;activityAllowed?:boolean};
export function Avatar({user,handle,size=44,ring='none',className='',online=false,activityAllowed=false}:Props){
 const display=user?.name||user?.handle||handle||'Student';
 const initials=useMemo(()=>display.trim().split(/\s+/).slice(0,2).map(word=>word[0]?.toUpperCase()||'').join('')||'?', [display]);
 const [latestId,setLatestId]=useState<string|null|undefined>(undefined);
 const accountHandle=user?.handle||handle;
 useEffect(()=>{if(!accountHandle)return;let alive=true;
  async function update(){try{const r=await fetch('/api/avatar?handle='+encodeURIComponent(accountHandle!),{cache:'no-store'});if(!r.ok)return;const d=await r.json();if(alive)setLatestId(d.avatarMediaId||null)}catch{}}
  const refresh=()=>{if(!document.hidden)void update()};window.addEventListener('cc-avatar-updated',refresh);const timer=window.setInterval(refresh,60000);return()=>{alive=false;window.clearInterval(timer);window.removeEventListener('cc-avatar-updated',refresh)}
 },[accountHandle]);
 const id=latestId===undefined?user?.avatarMediaId:latestId;
 const src=latestId!==undefined?(id?'/api/media?id='+encodeURIComponent(id):null):user?.avatarUrl||(id?'/api/media?id='+encodeURIComponent(id):null);
 const ringStyle=ring==='unseen'?'2px solid #a855f7':ring==='close'?'2px solid #22c55e':ring==='seen'?'2px solid #777':'2px solid transparent';
 return <span className={className} style={{position:'relative',display:'inline-flex',height:size,width:size,flexShrink:0}}><span aria-label={display+' avatar'} style={{display:'inline-flex',width:size,height:size,flexShrink:0,alignItems:'center',justifyContent:'center',borderRadius:'50%',border:ringStyle,boxSizing:'border-box',overflow:'hidden',background:'#302a47',color:'#fff',fontWeight:700,fontSize:Math.max(11,Math.floor(size/3)),lineHeight:1}}>
 {src?<img src={src} loading="lazy" alt={display+' avatar'} width={size} height={size} style={{display:'block',width:'100%',height:'100%',minWidth:0,minHeight:0,objectFit:'cover',objectPosition:'center',borderRadius:'50%',flexShrink:0}}/>:initials}</span><OnlineIndicator online={online} allowed={activityAllowed} size={size===24?6:10}/></span>;
}
