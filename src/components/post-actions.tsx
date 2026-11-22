'use client';
import {useEffect,useState} from 'react';
type Member={uid:string;handle:string;name:string};
export function PostActions({id,caption,authorUid,onChanged}:{id:string;caption:string;authorUid?:string;onChanged?:()=>void}){
 const [mine,setMine]=useState(false),[open,setOpen]=useState(false),[share,setShare]=useState(false),[edit,setEdit]=useState(false),[draft,setDraft]=useState(caption),[members,setMembers]=useState<Member[]>([]),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let alive=true;void fetch('/api/auth',{cache:'no-store'}).then(r=>r.json()).then(d=>{if(alive)setMine(Boolean(authorUid&&d.user?.uid===authorUid))}).catch(()=>{});return()=>{alive=false}},[authorUid]);
 async function manage(action:'edit'|'archive'|'delete'){
  if(action==='delete'&&!window.confirm('Permanently hide this post from CampusConnect?'))return;
  setBusy(true);setError('');
  try{const r=await fetch('/api/posts/'+encodeURIComponent(id)+'/manage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(action==='edit'?{action,caption:draft}:action==='archive'?{action,archived:true}:{action})});const d=await r.json();if(!r.ok)throw Error(d.error||'Action failed');setEdit(false);setOpen(false);setNotice(action==='edit'?'Post updated':action==='archive'?'Post archived':'Post deleted');onChanged?.()}catch(e){setError(String(e))}finally{setBusy(false)}
 }
 async function showShare(){setShare(v=>!v);setOpen(false);try{const r=await fetch('/api/connections?type=following',{cache:'no-store'});if(r.ok){const d=await r.json();setMembers(d.items||[])}}catch{}}
 async function sendTo(handle:string){setBusy(true);setError('');try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'send',recipientHandle:handle,text:window.location.origin+'/posts/'+encodeURIComponent(id)})});const d=await r.json();if(!r.ok)throw Error(d.error||'Unable to share');setNotice('Shared with @'+handle)}catch(e){setError(String(e))}finally{setBusy(false)}}
 async function copy(){try{await navigator.clipboard.writeText(window.location.origin+'/posts/'+encodeURIComponent(id));setNotice('Post link copied')}catch{setError('Unable to copy link')}}
 return <div style={{position:'relative',margin:'8px 0'}}>
  <button type="button" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>⋯ Options</button>
  <button type="button" onClick={()=>void showShare()}>Share</button>
  {open&&<div style={{display:'grid',gap:8,padding:12,background:'#1c1c22',borderRadius:10,maxWidth:240}}>
   {mine&&<><button disabled={busy} onClick={()=>{setEdit(true);setOpen(false)}}>Edit</button><button disabled={busy} onClick={()=>void manage('archive')}>Archive</button><button disabled={busy} onClick={()=>void manage('delete')}>Delete</button></>}
   <button onClick={()=>void showShare()}>Share</button>
  </div>}
  {edit&&<div style={{padding:12}}><label>Edit caption<textarea value={draft} maxLength={2200} onChange={e=>setDraft(e.target.value)}/></label><button disabled={busy||!draft.trim()} onClick={()=>void manage('edit')}>Save changes</button><button onClick={()=>setEdit(false)}>Cancel</button></div>}
  {share&&<section aria-label="Share post" style={{padding:12,border:'1px solid #444',borderRadius:12}}><h3>Share post</h3><button onClick={()=>void copy()}>Copy link</button><p>Following</p>{members.length?members.map(m=><div key={m.uid}>@{m.handle} · {m.name} <button disabled={busy} onClick={()=>void sendTo(m.handle)}>Send</button></div>):<p>No followed students yet.</p>}<button onClick={()=>setShare(false)}>Close</button></section>}
  {notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}
 </div>
}
