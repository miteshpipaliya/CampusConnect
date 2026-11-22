'use client';
import {useEffect,useState} from 'react';
import {Avatar} from '@/components/avatar';
type Member={uid:string;handle:string;name:string;avatarMediaId?:string|null;avatarUrl?:string|null};
export function ChatShareSheet({postId,onClose}:{postId:string;onClose:()=>void}){
 const [query,setQuery]=useState(''),[people,setPeople]=useState<Member[]>([]),[selected,setSelected]=useState<Member[]>([]),[message,setMessage]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[searching,setSearching]=useState(false);
 useEffect(()=>{
  if(query.trim().length<2){setPeople([]);setSearching(false);return}
  const abort=new AbortController(),timer=setTimeout(()=>{
   setSearching(true);setError('');
   void fetch('/api/chat?directory=1&q='+encodeURIComponent(query.trim()),{signal:abort.signal,cache:'no-store'}).then(async response=>{
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(data.error||'Search unavailable');
    if(!abort.signal.aborted)setPeople(Array.isArray(data.members)?data.members:[]);
   }).catch(e=>{if(!abort.signal.aborted)setError(e instanceof Error?e.message:'Search unavailable')}).finally(()=>{if(!abort.signal.aborted)setSearching(false)});
  },350);
  return()=>{clearTimeout(timer);abort.abort()};
 },[query]);
 const send=async()=>{
  if(!selected.length||busy)return;
  setBusy(true);setError('');setNotice('');
  let completed=0;
  for(const member of selected){
   try{
    const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'shareContent',recipientHandle:member.handle,postId,text:message.trim()})});
    if(!response.ok)throw Error((await response.json().catch(()=>({}))).error||'Share failed');
    completed++;
   }catch(e){setError('Unable to share with @'+member.handle+': '+(e instanceof Error?e.message:'Unknown error'));break}
  }
  if(completed){setNotice('Shared with '+completed+' member'+(completed===1?'':'s'));setSelected(previous=>previous.slice(completed))}
  setBusy(false);
 };
 return <section aria-label="Share CampusConnect post" role="dialog" aria-modal="false" style={{border:'1px solid var(--cc-border,#7775)',borderRadius:14,padding:14,marginTop:8,maxWidth:400,background:'var(--cc-surface,#292434)',color:'inherit'}}>
  <header style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center'}}><h3 style={{margin:0}}>Send to a campus member</h3><button type="button" onClick={onClose}>Close</button></header>
  <label htmlFor={'cc-share-query-'+postId}>Find a student by name or username</label>
  <input id={'cc-share-query-'+postId} aria-label="Search recipients" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Enter at least two letters" style={{display:'block',width:'100%',padding:10,borderRadius:10}}/>
  {searching&&<p role="status">Searching campus members…</p>}
  {!searching&&query.trim().length>=2&&people.length===0&&<p>No matching members.</p>}
  <div style={{maxHeight:190,overflow:'auto'}}>{people.map(member=><label key={member.uid} style={{display:'flex',alignItems:'center',gap:10,padding:6}}>
   <input type="checkbox" aria-label={'Select '+member.handle} checked={selected.some(m=>m.uid===member.uid)} disabled={busy||selected.length>=5&&!selected.some(m=>m.uid===member.uid)} onChange={e=>setSelected(old=>e.target.checked?[...old,member]:old.filter(m=>m.uid!==member.uid))}/>
   <Avatar user={{name:member.name,handle:member.handle,avatarMediaId:member.avatarMediaId??null,avatarUrl:member.avatarUrl??null}} size={32}/>
   <span>{member.name}<small style={{display:'block'}}>@{member.handle}</small></span>
  </label>)}</div>
  <p>{selected.length} of 5 recipients selected</p>
  <label htmlFor={'cc-share-text-'+postId}>Optional message</label>
  <textarea id={'cc-share-text-'+postId} rows={2} maxLength={2000} value={message} onChange={e=>setMessage(e.target.value)} style={{display:'block',width:'100%',borderRadius:10}}/>
  <div style={{display:'flex',gap:8,marginTop:8}}>
   <button type="button" disabled={busy||selected.length===0} onClick={()=>void send()}>{busy?'Sending…':'Send'}</button>
   <button type="button" onClick={()=>void navigator.clipboard.writeText(window.location.origin+'/posts/'+encodeURIComponent(postId)).then(()=>setNotice('Link copied')).catch(()=>setError('Unable to copy link'))}>Copy link</button>
  </div>
  {notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}
 </section>;
}
