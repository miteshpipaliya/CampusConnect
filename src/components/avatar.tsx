'use client';
import {useMemo} from 'react';
type AvatarUser={name?:string;handle?:string;avatarUrl?:string|null;avatarMediaId?:string|null};
type Props={user?:AvatarUser;uid?:string;handle?:string;size?:24|32|44|56|150;ring?:'none'|'unseen'|'seen'|'close';className?:string};
export function Avatar({user,handle,size=44,ring='none',className=''}:Props){
 const display=user?.name||user?.handle||handle||'Student';
 const initials=useMemo(()=>display.trim().split(/\s+/).slice(0,2).map(word=>word[0]?.toUpperCase()||'').join('')||'?', [display]);
 const src=user?.avatarUrl||(user?.avatarMediaId?'/api/media?id='+encodeURIComponent(user.avatarMediaId):null);
 const ringStyle=ring==='unseen'?'2px solid #a855f7':ring==='close'?'2px solid #22c55e':ring==='seen'?'2px solid #777':'2px solid transparent';
 return <span className={className} aria-label={display+' avatar'} style={{display:'inline-flex',width:size,height:size,flexShrink:0,alignItems:'center',justifyContent:'center',borderRadius:'50%',border:ringStyle,overflow:'hidden',background:'#302a47',color:'#fff',fontWeight:700,fontSize:Math.max(11,Math.floor(size/3)),lineHeight:1}}>
 {src?<img src={src} loading="lazy" alt={display+' avatar'} width={size} height={size} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:initials}</span>;
}
