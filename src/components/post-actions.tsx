'use client';
import {useEffect,useState} from 'react';
import {ChatShareSheet} from './chat/chat-share-sheet';
export function PostActions({id,caption,authorUid,onChanged}:{id:string;caption:string;authorUid?:string|undefined;onChanged?:()=>void}){
 const [mine,setMine]=useState(false),[open,setOpen]=useState(false),[share,setShare]=useState(false),[edit,setEdit]=useState(false),[draft,setDraft]=useState(caption),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let alive=true;void fetch('/api/auth',{cache:'no-store'}).then(r=>r.json()).then(d=>{if(alive)setMine(Boolean(authorUid&&d.user?.uid===authorUid))}).catch(()=>{});return()=>{alive=false}},[authorUid]);
 async function manage(action:'edit'|'archive'|'delete'){
  if(action==='delete'&&!window.confirm('Permanently hide this post from CampusConnect?'))return;
  setBusy(true);setError('');
  try{const r=await fetch('/api/posts/'+encodeURIComponent(id)+'/manage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(action==='edit'?{action,caption:draft}:action==='archive'?{action,archived:true}:{action})});const d=await r.json();if(!r.ok)throw Error(d.error||'Action failed');setEdit(false);setOpen(false);setNotice(action==='edit'?'Post updated':action==='archive'?'Post archived':'Post deleted');onChanged?.()}catch(e){setError(String(e))}finally{setBusy(false)}
 }
 async function showShare(){setShare(v=>!v);setOpen(false)}
 async function copy(){try{await navigator.clipboard.writeText(window.location.origin+'/posts/'+encodeURIComponent(id));setNotice('Post link copied')}catch{setError('Unable to copy link')}}
 return <div style={{position:'relative',margin:'8px 0'}}>
  <button type="button" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>⋯ Options</button>
  <button type="button" onClick={()=>void showShare()}>Share</button>
  {open&&<div style={{display:'grid',gap:8,padding:12,background:'#1c1c22',borderRadius:10,maxWidth:240}}>
   {mine&&<><button disabled={busy} onClick={()=>{setEdit(true);setOpen(false)}}>Edit</button><button disabled={busy} onClick={()=>void manage('archive')}>Archive</button><button disabled={busy} onClick={()=>void manage('delete')}>Delete</button></>}
   <button onClick={()=>void showShare()}>Share</button>
  </div>}
  {edit&&<div style={{padding:12}}><label>Edit caption<textarea value={draft} maxLength={2200} onChange={e=>setDraft(e.target.value)}/></label><button disabled={busy||!draft.trim()} onClick={()=>void manage('edit')}>Save changes</button><button onClick={()=>setEdit(false)}>Cancel</button></div>}
  {share&&<ChatShareSheet postId={id} onClose={()=>setShare(false)}/>}
  {notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}
 </div>
}
