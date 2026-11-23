'use client';
import {useEffect,useState} from 'react';
import {X,Share2} from 'lucide-react';

type Post={id:string;caption?:string;authorHandle?:string;type?:string;mediaUrl?:string|null;media?:Array<{url?:string|null;contentType?:string}>};
type Props={recipientHandle:string;onClose:()=>void;onSent:()=>Promise<void>};

export function ChatPostPicker({recipientHandle,onClose,onSent}:Props){
 const [posts,setPosts]=useState<Post[]>([]),[loading,setLoading]=useState(true),[filter,setFilter]=useState(''),[selected,setSelected]=useState<string|null>(null);
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  let live=true;const controller=new AbortController();
  void fetch('/api/posts?limit=20',{credentials:'same-origin',cache:'no-store',signal:controller.signal}).then(async r=>{
   const payload:unknown=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(payload&&typeof payload==='object'&&'error' in payload?String(payload.error):'Unable to load posts');
   if(live&&payload&&typeof payload==='object'&&'posts' in payload)setPosts(Array.isArray(payload.posts)?payload.posts:[]);
  }).catch(e=>{if(live)setError(e instanceof Error?e.message:'Unable to load posts')})
   .finally(()=>{if(live)setLoading(false)});
  return()=>{live=false;controller.abort()};
 },[]);
 const send=async()=>{
  if(!selected||busy)return;
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/chat',{method:'POST',credentials:'same-origin',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'shareContent',recipientHandle,postId:selected,text:message.trim()})});
   const data:unknown=await response.json().catch(()=>null);
   if(!response.ok)throw Error(data&&typeof data==='object'&&'error' in data?String(data.error):'Unable to share post');
   onClose();
   void onSent().catch(()=>{});
  }catch(e){setError(e instanceof Error?e.message:'Unable to share post')}
  finally{setBusy(false)}
 };
 const shown=posts.filter(post=>(post.caption||'').toLowerCase().includes(filter.toLowerCase())||(post.authorHandle||'').toLowerCase().includes(filter.toLowerCase()));
 return <div className="cc-dm-modal-overlay" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose()}}>
  <section role="dialog" aria-modal="true" aria-label="Share a campus post" className="cc-dm-share-dialog">
   <header><div><strong>Share a post or Reel</strong><small>Only content visible to both members can be sent</small></div>
    <button type="button" className="cc-dm-icon" aria-label="Close post picker" onClick={onClose} disabled={busy}><X size={20}/></button>
   </header>
   <input aria-label="Search campus posts" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Search captions or authors"/>
   {loading&&<p role="status">Loading campus posts…</p>}
   {error&&<p role="alert" className="cc-dm-error">{error}</p>}
   {!loading&&shown.length===0&&<p className="cc-dm-muted">No accessible posts found.</p>}
   <div className="cc-dm-share-results">{shown.map(post=>{
    const media=post.media?.[0]?.url||post.mediaUrl;
    return <button type="button" className={'cc-dm-share-item'+(selected===post.id?' selected':'')} key={post.id}
      aria-pressed={selected===post.id} disabled={busy} onClick={()=>setSelected(post.id)}>
      {media?<img src={media} alt="" loading="lazy"/>:<span className="cc-dm-share-placeholder"><Share2 size={20}/></span>}
      <span><strong>{post.type==='reel'?'Reel':'Post'} · @{post.authorHandle||'campus'}</strong><small>{post.caption||'View original post'}</small></span>
    </button>;
   })}</div>
   <textarea aria-label="Optional message with shared post" rows={2} maxLength={2000} placeholder="Add a message (optional)…" value={message} onChange={e=>setMessage(e.target.value)}/>
   <button type="button" className="cc-dm-share-submit" onClick={()=>void send()} disabled={!selected||busy}>{busy?'Sharing…':'Share in conversation'}</button>
  </section>
 </div>;
}
