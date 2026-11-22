'use client';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState} from 'react';
type Message={id:string;text:string;senderUid:string;createdAt:string|null;seen:boolean};
export function ChatThread({handle}:{handle:string}){
 const [messages,setMessages]=useState<Message[]>([]),[uid,setUid]=useState(''),[draft,setDraft]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const last=useRef<HTMLDivElement>(null);
 const refresh=useCallback(async(signal?:AbortSignal)=>{const r=await fetch('/api/chat?with='+encodeURIComponent(handle),{cache:'no-store',signal});const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||'Chat unavailable');setMessages(Array.isArray(data.messages)?data.messages:[]);setUid(data.myUid||'')},[handle]);
 useEffect(()=>{const controller=new AbortController();refresh(controller.signal).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Chat unavailable')}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});return()=>controller.abort()},[refresh]);
 useEffect(()=>{last.current?.scrollIntoView({behavior:'smooth',block:'end'})},[messages.length]);
 const send=async()=>{const text=draft.trim();if(!text||busy)return;setBusy(true);setError('');try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'send',recipientHandle:handle,text})});if(!r.ok)throw Error((await r.json().catch(()=>({}))).error||'Unable to send');setDraft('');setNotice('Sent');await refresh()}catch(e){setError(e instanceof Error?e.message:'Send failed')}finally{setBusy(false)}};
 const action=async(kind:'unsend'|'deleteForMe',messageId:string)=>{setError('');try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:kind,recipientHandle:handle,messageId})});if(!r.ok)throw Error((await r.json().catch(()=>({}))).error||'Action failed');await refresh()}catch(e){setError(e instanceof Error?e.message:'Action failed')}};
 return <section aria-label={'Chat with '+handle} style={{display:'flex',flexDirection:'column',height:'min(78dvh,820px)',minHeight:400,maxWidth:850,margin:'0 auto',border:'1px solid var(--cc-border,#7774)',borderRadius:16,overflow:'hidden'}}>
 <header style={{display:'flex',gap:12,alignItems:'center',padding:16,borderBottom:'1px solid var(--cc-border,#7774)'}}><Link href="/messages" aria-label="Back to inbox">←</Link><strong>@{handle}</strong></header>
 <div role="log" aria-live="polite" aria-relevant="additions" style={{flex:1,overflowY:'auto',padding:16,display:'flex',flexDirection:'column',gap:10}}>
 {loading?<p>Loading messages…</p>:messages.length===0?<p>No messages yet.</p>:messages.map(m=><div key={m.id} style={{alignSelf:m.senderUid===uid?'flex-end':'flex-start',maxWidth:'82%',padding:'10px 14px',borderRadius:16,background:m.senderUid===uid?'#6240a9':'var(--cc-surface,#5553)',color:m.senderUid===uid?'white':'inherit',overflowWrap:'anywhere'}}>
 <p style={{whiteSpace:'pre-wrap',margin:0}}>{m.text}</p><small style={{display:'block',opacity:.75,marginTop:4}}>{m.createdAt?new Date(m.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):''}{m.senderUid===uid?(m.seen?' · Seen':' · Sent'):''}</small>
 <div style={{display:'flex',gap:8,marginTop:6}}>{m.text&&<button type="button" onClick={()=>navigator.clipboard.writeText(m.text).then(()=>setNotice('Copied')).catch(()=>setError('Copy failed'))}>Copy</button>}<button type="button" onClick={()=>void action('deleteForMe',m.id)}>Remove for me</button>{m.senderUid===uid&&<button type="button" onClick={()=>void action('unsend',m.id)}>Unsend</button>}</div>
 </div>)}<div ref={last}/></div>
 {error&&<p role="alert" style={{padding:'0 16px',color:'#ef4444'}}>{error}</p>}{notice&&<p role="status" style={{padding:'0 16px'}}>{notice}</p>}
 <form onSubmit={e=>{e.preventDefault();void send()}} style={{display:'flex',gap:8,padding:12,borderTop:'1px solid var(--cc-border,#7774)'}}>
 <textarea aria-label="Message" value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void send()}}} maxLength={2000} rows={2} placeholder="Write a message…" style={{flex:1,minWidth:0,borderRadius:12,padding:10,resize:'none'}}/>
 <button type="submit" disabled={busy||!draft.trim()}>{busy?'Sending…':'Send'}</button></form>
 </section>
}
