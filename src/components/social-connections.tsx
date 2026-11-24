'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
type Member={uid:string;handle:string;name:string;branch?:string;private?:boolean};
export function SocialConnections({handle,initialTab='followers'}:{handle?:string;initialTab?:'followers'|'following'|'suggestions'}){
 const [tab,setTab]=useState<'followers'|'following'|'suggestions'>(initialTab);
 const [members,setMembers]=useState<Member[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let active=true;setBusy(true);setError('');
  const url=tab==='suggestions'?'/api/suggestions':'/api/connections?type='+tab+(handle?'&handle='+encodeURIComponent(handle):'');
  void fetch(url,{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'Unable to load accounts');if(active)setMembers(d.members||d.items||[])}).catch(e=>{if(active)setError(String(e))}).finally(()=>{if(active)setBusy(false)});
  return()=>{active=false};
 },[tab,handle]);
 return <section style={{padding:20,maxWidth:680,margin:'0 auto'}}><h2>Campus connections</h2>
  <nav aria-label="Connections" style={{display:'flex',gap:12,marginBottom:18}}>{(['followers','following','suggestions'] as const).map(t=><button key={t} type="button" aria-pressed={tab===t} onClick={()=>setTab(t)}>{t==='suggestions'?'Suggested students':t}</button>)}</nav>
  {busy?<p>Loading…</p>:members.length===0?<p>No students to show yet.</p>:members.map(m=><div key={m.uid} style={{padding:12,display:'flex',justifyContent:'space-between',gap:16,borderBottom:'1px solid #333'}}><div><Link href={'/profile/'+encodeURIComponent(m.handle)}>@{m.handle}</Link><div>{m.name}{m.branch?' · '+m.branch:''}</div></div>{m.private&&<small>Private</small>}</div>)}
  {error&&<p role="alert">{error}</p>}
 </section>
}
