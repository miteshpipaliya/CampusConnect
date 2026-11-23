'use client';
import Link from 'next/link';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {mergeChronologicalMessages} from '@/lib/core/chat-pagination';
import {chatRefreshIntervalMs,shouldRefreshChat} from '@/lib/core/chat-refresh';
import {Avatar} from '@/components/avatar';
import {useStreamConnection} from './stream-connection';
import {ChatMediaUpload} from './chat-media-upload';
import {ChatSharedContentCard} from './chat-shared-content-card';
type Message={id:string;text:string;senderUid:string;createdAt:string|null;seen:boolean;quotedMessageId?:string|null;reactionCounts?:Record<string,number>;ownReactions?:string[];mediaId?:string|null;mediaType?:string|null;contentId?:string|null;contentType?:string|null};
type Emoji='love'|'laugh'|'wow'|'like'|'fire';
export function ChatThread({handle}:{handle:string}){
 const [messages,setMessages]=useState<Message[]>([]),[uid,setUid]=useState(''),[draft,setDraft]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [replyTo,setReplyTo]=useState<Message|null>(null);
 const [older,setOlder]=useState<Message[]>([]),[nextCursor,setNextCursor]=useState<string|null>(null),[loadingOlder,setLoadingOlder]=useState(false);
 const olderLoaded=useRef(false),requestVersion=useRef(0);
 const displayed=useMemo(()=>mergeChronologicalMessages(older,messages),[older,messages]);
 const last=useRef<HTMLDivElement>(null);
 const {client,status}=useStreamConnection();
 const [channelId,setChannelId]=useState(''),[peerUid,setPeerUid]=useState(''),[peerName,setPeerName]=useState(''),[peerOnline,setPeerOnline]=useState(false),[presenceAllowed,setPresenceAllowed]=useState(false),[peerTyping,setPeerTyping]=useState(false);
 const typingRef=useRef<ReturnType<typeof setTimeout>|null>(null),lastTypingRef=useRef(0);
 // Never allow a slow previous HTTP response to replace newer socket/poll results.
 const refresh=useCallback(async(signal?:AbortSignal,lightweight=false)=>{
  const version=++requestVersion.current;
  const endpoint='/api/chat?with='+encodeURIComponent(handle)+(lightweight?'&refresh=1':'');
  const r=await fetch(endpoint,{cache:'no-store',signal:signal??null});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(data.error||'Chat unavailable');
  if(signal?.aborted||version!==requestVersion.current)return;
  setMessages(Array.isArray(data.messages)?data.messages:[]);
  if(!olderLoaded.current)setNextCursor(typeof data.nextCursor==='string'?data.nextCursor:null);
  setUid(data.myUid||'');setChannelId(data.channelId||'');setPeerUid(data.peerUid||'');setPeerName(data.peerName||handle);
 },[handle]);
 useEffect(()=>{
  olderLoaded.current=false;setOlder([]);setMessages([]);setNextCursor(null);setLoading(true);setError('');
  const controller=new AbortController();
  refresh(controller.signal).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Chat unavailable')})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false)});
  return()=>{controller.abort();requestVersion.current++};
 },[refresh]);
 // WebSockets provide immediate changes when enabled; authenticated polling
 // recovers missed events and also works when the socket feature flag is off.
 useEffect(()=>{
  let active=true,inFlight=false;
  const tick=async()=>{
   if(!active||!shouldRefreshChat({visible:document.visibilityState==='visible',online:navigator.onLine,inFlight}))return;
   inFlight=true;
   try{await refresh(undefined,true)}catch{/* Keep the last known messages during a temporary outage. */}
   finally{inFlight=false}
  };
  const resume=()=>{void tick()};
  const timer=window.setInterval(resume,chatRefreshIntervalMs(status,'thread'));
  document.addEventListener('visibilitychange',resume);
  window.addEventListener('online',resume);
  return()=>{active=false;window.clearInterval(timer);document.removeEventListener('visibilitychange',resume);window.removeEventListener('online',resume)};
 },[refresh,status]);
 const loadOlder=async()=>{
  if(loadingOlder||!nextCursor)return;
  setLoadingOlder(true);setError('');
  try{
   const response=await fetch('/api/chat?with='+encodeURIComponent(handle)+'&before='+encodeURIComponent(nextCursor),{cache:'no-store'});
   const result=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(result.error||'Older messages unavailable');
   olderLoaded.current=true;
   setOlder(previous=>mergeChronologicalMessages(previous,Array.isArray(result.messages)?result.messages:[]));
   setNextCursor(typeof result.nextCursor==='string'&&result.nextCursor!==nextCursor?result.nextCursor:null);
  }catch(cause){setError(cause instanceof Error?cause.message:'Could not load older messages')}
  finally{setLoadingOlder(false)}
 };
 useEffect(()=>{last.current?.scrollIntoView({behavior:'smooth',block:'end'})},[messages.length]);
 const notifyTyping=useCallback((typing:boolean)=>{if(status!=='connected')return;void fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'typing',recipientHandle:handle,typing})}).catch(()=>{})},[status,handle]);
 const changeDraft=(next:string)=>{setDraft(next);if(status!=='connected')return;const now=Date.now();if(now-lastTypingRef.current>=2000){lastTypingRef.current=now;notifyTyping(true)}if(typingRef.current)clearTimeout(typingRef.current);typingRef.current=setTimeout(()=>notifyTyping(false),3500)};
 useEffect(()=>()=>{if(typingRef.current)clearTimeout(typingRef.current);notifyTyping(false)},[notifyTyping]);
 useEffect(()=>{if(!peerUid)return;let live=true;setPresenceAllowed(false);void fetch('/api/chat/presence?uids='+encodeURIComponent(peerUid),{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{if(live)setPresenceAllowed(d?.allowed?.[peerUid]===true)}).catch(()=>{if(live)setPresenceAllowed(false)});return()=>{live=false}},[peerUid]);
 useEffect(()=>{if(!client||status!=='connected'||!channelId||!peerUid)return;let live=true;let peerTypingTimer:ReturnType<typeof setTimeout>|null=null;const channel=client.channel('messaging',channelId);const release=channel.activate();
  void channel.watch({presence:true}).then(()=>{if(live){setPeerOnline(channel.state.members[peerUid]?.user?.online===true);if(document.visibilityState==='visible')void fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'read',recipientHandle:handle})}).catch(()=>{})}}).catch(()=>{if(live)setPeerOnline(false)});
  const update=()=>{if(!live)return;void refresh(undefined,true).catch(()=>{});if(document.visibilityState==='visible')void fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'read',recipientHandle:handle})}).catch(()=>{})};
  const subscriptions=[channel.on('message.new',update),channel.on('message.deleted',update),channel.on('message.read',update),channel.on('reaction.new',update),channel.on('reaction.deleted',update),channel.on('typing.start',event=>{if(live&&event.user?.id===peerUid){setPeerTyping(true);if(peerTypingTimer)clearTimeout(peerTypingTimer);peerTypingTimer=setTimeout(()=>{if(live)setPeerTyping(false)},6500)}}),channel.on('typing.stop',event=>{if(live&&event.user?.id===peerUid){if(peerTypingTimer)clearTimeout(peerTypingTimer);peerTypingTimer=null;setPeerTyping(false)}}),client.on('user.presence.changed',event=>{if(live&&event.user?.id===peerUid)setPeerOnline(event.user.online===true)})];
  return()=>{live=false;if(peerTypingTimer)clearTimeout(peerTypingTimer);subscriptions.forEach(s=>s.unsubscribe());release();setPeerOnline(false);setPeerTyping(false)};
 },[client,status,channelId,peerUid,refresh,handle]);
 const send=async()=>{notifyTyping(false);if(typingRef.current)clearTimeout(typingRef.current);const text=draft.trim();if(!text||busy)return;setBusy(true);setError('');try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'send',recipientHandle:handle,text,...(replyTo?{quotedMessageId:replyTo.id}:{})})});if(!r.ok)throw Error((await r.json().catch(()=>({}))).error||'Unable to send');setDraft('');setReplyTo(null);setNotice('Sent');void refresh(undefined,true).catch(()=>{})}catch(e){setError(e instanceof Error?e.message:'Send failed')}finally{setBusy(false)}};
 const action=async(kind:'unsend'|'deleteForMe',messageId:string)=>{setError('');try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:kind,recipientHandle:handle,messageId})});if(!r.ok)throw Error((await r.json().catch(()=>({}))).error||'Action failed');setOlder(previous=>previous.filter(message=>message.id!==messageId));setNotice('Updated');void refresh(undefined,true).catch(()=>{})}catch(e){setError(e instanceof Error?e.message:'Action failed')}};
 const reactTo=async(messageId:string,emoji:Emoji,remove:boolean)=>{
  setError('');try{
   const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'reaction',recipientHandle:handle,messageId,emoji,remove})});
   if(!response.ok)throw Error((await response.json().catch(()=>({}))).error||'Unable to update reaction');
   setNotice('Reaction updated');void refresh(undefined,true).catch(()=>{});
  }catch(error){setError(error instanceof Error?error.message:'Reaction failed')}
 };
 return <section aria-label={'Chat with '+handle} style={{display:'flex',flexDirection:'column',height:'min(78dvh,820px)',minHeight:400,maxWidth:850,margin:'0 auto',border:'1px solid var(--cc-border,#7774)',borderRadius:16,overflow:'hidden'}}>
 <header style={{display:'flex',gap:12,alignItems:'center',padding:16,borderBottom:'1px solid var(--cc-border,#7774)'}}><Link href="/messages" aria-label="Back to inbox">←</Link><Avatar user={{name:peerName||handle,handle}} size={44} online={peerOnline&&status==='connected'} activityAllowed={presenceAllowed}/><div><strong>{peerName||handle}</strong><small style={{display:'block',opacity:.7}}>@{handle}{peerTyping?' · Typing…':presenceAllowed&&status==='connected'?(peerOnline?' · Online':' · Offline'):''}</small></div></header>
 {status!=='connected'&&<p role="status" style={{padding:'4px 16px'}}>Real-time connection {status==='disabled'?'is not enabled':'is unavailable'}. Messages refresh automatically while this tab is open.</p>}
 <div role="log" aria-live="polite" aria-relevant="additions" style={{flex:1,overflowY:'auto',padding:16,display:'flex',flexDirection:'column',gap:10}}>
 {loading?<p>Loading messages…</p>:displayed.length===0?<p>No messages yet.</p>:<>{nextCursor&&<button type="button" onClick={()=>void loadOlder()} disabled={loadingOlder} style={{alignSelf:'center',padding:9}}>{loadingOlder?'Loading earlier messages…':'Load earlier messages'}</button>}{displayed.map(m=><div key={m.id} id={'cc-msg-'+m.id} style={{alignSelf:m.senderUid===uid?'flex-end':'flex-start',maxWidth:'82%',padding:'10px 14px',borderRadius:16,background:m.senderUid===uid?'#6240a9':'var(--cc-surface,#5553)',color:m.senderUid===uid?'white':'inherit',overflowWrap:'anywhere'}}>
 {m.quotedMessageId&&<a href={'#cc-msg-'+m.quotedMessageId} style={{display:'block',fontSize:12,marginBottom:8,padding:7,background:'#7773',borderRadius:8,color:'inherit'}}>↪ {displayed.find(item=>item.id===m.quotedMessageId)?.text.slice(0,100)||'Message unavailable'}</a>}
 {m.mediaId&&(m.mediaType==='video'?<video controls playsInline preload="metadata" src={'/api/media?id='+encodeURIComponent(m.mediaId)} style={{display:'block',maxWidth:'100%',maxHeight:340,borderRadius:10}}/>:<a href={'/api/media?id='+encodeURIComponent(m.mediaId)} target="_blank" rel="noopener noreferrer" aria-label="Open chat image"><img loading="lazy" src={'/api/media?id='+encodeURIComponent(m.mediaId)} alt="Chat attachment" style={{display:'block',maxWidth:'100%',maxHeight:340,objectFit:'contain',borderRadius:10}}/></a>)}
 {m.contentId&&<ChatSharedContentCard postId={m.contentId} kind={m.contentType==='reel'?'reel':'post'}/>}<p style={{whiteSpace:'pre-wrap',margin:0}}>{m.text}</p><small style={{display:'block',opacity:.75,marginTop:4}}>{m.createdAt?new Date(m.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):''}{m.senderUid===uid?(m.seen?' · Seen':' · Sent'):''}</small>
 <div style={{display:'flex',gap:7,marginTop:7,flexWrap:'wrap',alignItems:'center'}}>
 <button type="button" onClick={()=>setReplyTo(m)}>Reply</button>
 {m.text&&<button type="button" onClick={()=>navigator.clipboard.writeText(m.text).then(()=>setNotice('Copied')).catch(()=>setError('Copy failed'))}>Copy</button>}
 <button type="button" onClick={()=>void action('deleteForMe',m.id)}>Remove for me</button>
 {m.senderUid===uid&&<button type="button" onClick={()=>void action('unsend',m.id)}>Unsend</button>}
 {(['love','laugh','fire'] as const).map(emoji=><button type="button" key={emoji} aria-label={(m.ownReactions?.includes(emoji)?'Remove ':'React with ')+emoji} onClick={()=>void reactTo(m.id,emoji,m.ownReactions?.includes(emoji)===true)}>{emoji==='love'?'❤️':emoji==='laugh'?'😂':'🔥'} {m.reactionCounts?.[emoji]??0}</button>)}
 </div>
 </div>)}</>}<div ref={last}/></div>
 {error&&<p role="alert" style={{padding:'0 16px',color:'#ef4444'}}>{error}</p>}{notice&&<p role="status" style={{padding:'0 16px'}}>{notice}</p>}
 {replyTo&&<div style={{display:'flex',gap:10,alignItems:'center',justifyContent:'space-between',padding:'8px 16px',background:'var(--cc-surface,#7772)'}}><span>Replying to: {replyTo.text.slice(0,100)}</span><button type="button" onClick={()=>setReplyTo(null)}>Cancel reply</button></div>}
 <ChatMediaUpload recipientHandle={handle} onSent={refresh}/>
 <form onSubmit={e=>{e.preventDefault();void send()}} style={{display:'flex',gap:8,padding:12,borderTop:'1px solid var(--cc-border,#7774)'}}>
 <textarea aria-label="Message" value={draft} onChange={e=>changeDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void send()}}} maxLength={2000} rows={2} placeholder="Write a message…" style={{flex:1,minWidth:0,borderRadius:12,padding:10,resize:'none'}}/>
 <button type="submit" disabled={busy||!draft.trim()}>{busy?'Sending…':'Send'}</button></form>
 </section>
}
