'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ReportDialog} from './report-dialog';
import type {Reel} from './reel-card';
export function ReelMenu({reel,following,onClose,onRemoved,onNotice,onUnfollow}:{reel:Reel;following:boolean;onClose:()=>void;onRemoved:()=>void;onNotice:(s:string)=>void;onUnfollow:()=>void}){
 const ref=useRef<HTMLDivElement>(null),[report,setReport]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()};const outside=(e:PointerEvent)=>{if(!report&&ref.current&&!ref.current.contains(e.target as Node))onClose()};document.addEventListener('keydown',key);document.addEventListener('pointerdown',outside);return()=>{document.removeEventListener('keydown',key);document.removeEventListener('pointerdown',outside)}},[onClose,report]);
 async function mutate(kind:'unfollow'|'mute'|'delete'){
  if(kind==='delete'&&!window.confirm('Delete this Reel?'))return;
  setBusy(true);setError('');
  try{const url=kind==='delete'?'/api/posts/'+encodeURIComponent(reel.id)+'/manage':kind==='mute'?'/api/mutes':'/api/follow';const response=await fetch(url,{method:kind==='unfollow'?'DELETE':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(kind==='delete'?{action:'delete'}:{handle:reel.authorHandle})});if(!response.ok)throw Error((await response.json()).error||'Action failed');if(kind==='unfollow')onUnfollow();if(kind==='delete'||kind==='mute')onRemoved();onNotice(kind==='delete'?'Reel deleted':kind==='mute'?'Account muted':'Unfollowed');onClose()}catch(e){setError(String(e))}finally{setBusy(false)}
 }
 return <div ref={ref} className="cc-reel-menu" role="dialog" aria-label="Reel options">
 <button type="button" onClick={()=>void navigator.clipboard.writeText(window.location.origin+'/posts/'+encodeURIComponent(reel.id)).then(()=>{onNotice('Link copied');onClose()}).catch(()=>setError('Unable to copy link'))}>Copy link</button>
 <Link href={'/posts/'+encodeURIComponent(reel.id)}>Go to post</Link>
 {!reel.isMine&&<><button onClick={()=>setReport(true)}>Report</button>{following&&<button disabled={busy} onClick={()=>void mutate('unfollow')}>Unfollow</button>}<button disabled={busy} onClick={()=>void mutate('mute')}>Mute this person</button></>}
 {reel.isMine&&<button disabled={busy} onClick={()=>void mutate('delete')}>Delete Reel</button>}
 <button onClick={onClose}>Close</button>{error&&<p role="alert">{error}</p>}{report&&<ReportDialog targetType="post" targetId={reel.id} onClose={()=>setReport(false)}/>}
 </div>
}
