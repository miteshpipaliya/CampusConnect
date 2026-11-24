'use client';
import {useEffect,useState} from 'react';
import {ChatShareSheet} from './chat/chat-share-sheet';
import {ReportDialog} from './report-dialog';
type Action='edit'|'archive'|'delete'|'hideLikes'|'commentsOff'|'pin';
type Flags={hideLikeCount:boolean;commentsOff:boolean;pinned:boolean};
export function PostActions({id,caption,authorUid,isMine,hideLikeCount=false,commentsOff=false,pinned=false,onChanged}:{id:string;caption:string;authorUid?:string|undefined;isMine?:boolean;hideLikeCount?:boolean;commentsOff?:boolean;pinned?:boolean;onChanged?:()=>void}){
 const [mine,setMine]=useState(isMine??false),[open,setOpen]=useState(false),[share,setShare]=useState(false),[report,setReport]=useState(false),[edit,setEdit]=useState(false),[draft,setDraft]=useState(caption),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const [flags,setFlags]=useState<Flags>({hideLikeCount,commentsOff,pinned});
 useEffect(()=>{setFlags({hideLikeCount,commentsOff,pinned})},[hideLikeCount,commentsOff,pinned]);
 useEffect(()=>{if(isMine!==undefined){setMine(isMine);return}let alive=true;void fetch('/api/auth',{cache:'no-store'}).then(r=>r.json()).then(d=>{if(alive)setMine(Boolean(authorUid&&d.user?.uid===authorUid))}).catch(()=>{});return()=>{alive=false}},[authorUid,isMine]);
 async function manage(action:Action){
  if(action==='delete'&&!window.confirm('Delete this post from CampusConnect?'))return;
  setBusy(true);setError('');
  try{
   const payload=action==='edit'?{action,caption:draft}:action==='archive'?{action,archived:true}:action==='delete'?{action}:action==='pin'?{action,value:!flags.pinned}:action==='hideLikes'?{action,value:!flags.hideLikeCount}:{action,value:!flags.commentsOff};
   const r=await fetch('/api/posts/'+encodeURIComponent(id)+'/manage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
   const data=await r.json();if(!r.ok)throw Error(data.error||'Action failed');
   if(action==='pin'||action==='hideLikes'||action==='commentsOff')setFlags(f=>({...f,[action==='hideLikes'?'hideLikeCount':action==='pin'?'pinned':'commentsOff']:payload.value}));
   setEdit(false);setOpen(false);setNotice(data.fanoutPartial?'Saved, but follower feed cleanup may be incomplete':'Post settings updated');onChanged?.();
  }catch(e){setError(e instanceof Error?e.message:'Action failed')}finally{setBusy(false)}
 }
 async function copy(){try{await navigator.clipboard.writeText(window.location.origin+'/posts/'+encodeURIComponent(id));setNotice('Post link copied')}catch{setError('Unable to copy link')}}
 return <div className="cc-post-menu-wrap">
  <button type="button" aria-label="More options" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>⋯</button>
  
  {open&&<div className="cc-post-menu-backdrop" onClick={()=>setOpen(false)}><div className="cc-post-menu-sheet" role="dialog" aria-label="Post options" onClick={e=>e.stopPropagation()}>
   {mine&&<><button disabled={busy} onClick={()=>{setEdit(true);setOpen(false)}}>Edit</button>
    <button disabled={busy} onClick={()=>void manage('pin')}>{flags.pinned?'Unpin from profile':'Pin to profile'}</button>
    <button disabled={busy} onClick={()=>void manage('hideLikes')}>{flags.hideLikeCount?'Show like counts':'Hide like counts'}</button>
    <button disabled={busy} onClick={()=>void manage('commentsOff')}>{flags.commentsOff?'Turn on comments':'Turn off comments'}</button>
    <button disabled={busy} onClick={()=>void manage('archive')}>Archive</button>
    <button disabled={busy} onClick={()=>void manage('delete')}>Delete</button></>}
   {!mine&&<button onClick={()=>{setReport(true);setOpen(false)}}>Report post</button>}
   <button onClick={()=>{setShare(true);setOpen(false)}}>Share</button>
   <button onClick={()=>void copy()}>Copy link</button><button onClick={()=>setOpen(false)}>Cancel</button>
  </div></div>}
  {edit&&<div style={{padding:12}}><label>Edit caption<textarea value={draft} maxLength={2200} onChange={e=>setDraft(e.target.value)}/></label><button disabled={busy||!draft.trim()} onClick={()=>void manage('edit')}>Save changes</button><button onClick={()=>setEdit(false)}>Cancel</button></div>}
  {share&&<ChatShareSheet postId={id} onClose={()=>setShare(false)}/>}
  {report&&<ReportDialog targetType="post" targetId={id} onClose={()=>setReport(false)}/>}
  {notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}
 </div>;
}
