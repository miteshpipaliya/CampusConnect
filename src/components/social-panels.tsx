'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {Avatar} from './avatar';
import {ChatMediaUpload} from './chat/chat-media-upload';
import {ChatSharedContentCard} from './chat/chat-shared-content-card';
type Member={handle:string;name:string;avatarUrl?:string|null;avatarMediaId?:string|null};
type Conversation=Member&{preview:string;updatedAt:string};
type Message={id:string;senderUid:string;text:string;seen:boolean;createdAt:string|null;mediaId?:string|null;mediaType?:string|null;contentId?:string|null;contentType?:string|null;quotedMessageId?:string|null;reactionCounts?:Record<string,number>;ownReactions?:string[]};
type Notification={id:string;type:string;actorHandle:string;postId?:string;messageId?:string};
async function get<T>(url:string):Promise<T>{const r=await fetch(url,{cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Request failed ('+r.status+')');return d as T}
async function post(url:string,data:object){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Request failed ('+r.status+')');return d}
export function SocialPanels({section,initialPeer}:{section:string;initialPeer?:string}){
 const [members,setMembers]=useState<Member[]>([]),[conversations,setConversations]=useState<Conversation[]>([]),[peer,setPeer]=useState(initialPeer||''),[messages,setMessages]=useState<Message[]>([]);
 const [myUid,setMyUid]=useState(''),[typing,setTyping]=useState(false),[draft,setDraft]=useState(''),[notice,setNotice]=useState('');
 const [search,setSearch]=useState(''),[showDirectory,setShowDirectory]=useState(false),[loadingChat,setLoadingChat]=useState(false),lastTyping=useRef(0);
 const [modalSearch,setModalSearch]=useState('');
 const [selectedMessage,setSelectedMessage]=useState<string|null>(null),[sending,setSending]=useState(false),[retryCount,setRetryCount]=useState(0),bottomRef=useRef<HTMLDivElement>(null);
 const [notifications,setNotifications]=useState<Notification[]>([]);
 const [reels,setReels]=useState<Array<{id:string;caption:string;authorHandle:string;mediaId:string}>>([]);
 const [replyTo,setReplyTo]=useState<Message|null>(null);
 // Preserve the original split-pane chat, but keep /messages as its canonical URL.
 const selectPeer=(handle:string)=>{
  if(handle!==peer){setMessages([]);setReplyTo(null);setSelectedMessage(null);setLoadingChat(Boolean(handle));setNotice('');}
  setPeer(handle);
  const direct=window.location.pathname.startsWith('/messages');
  const url=direct?(handle?'/messages/'+encodeURIComponent(handle):'/messages'):(handle?'/home?section=chat&with='+encodeURIComponent(handle):'/home?section=chat');
  window.history.pushState(null,'',url);
 };
 useEffect(()=>{
  if(section!=='chat')return;
  const sync=()=>{
   const path=window.location.pathname,selected=path.startsWith('/messages/')?decodeURIComponent(path.slice('/messages/'.length)):new URLSearchParams(window.location.search).get('with')||'';
   setPeer(selected);
  };
  window.addEventListener('popstate',sync);
  return()=>window.removeEventListener('popstate',sync);
 },[section]);
 useEffect(()=>{if(section==='chat'){const withHandle=new URLSearchParams(window.location.search).get('with');if(withHandle)setPeer(withHandle)}if(section==='chat')get<{conversations:Conversation[]}>('/api/chat').then(d=>setConversations(d.conversations)).catch(e=>setNotice(String(e)));
 if(section==='chat')get<{members:Member[]}>('/api/chat?directory=1').then(d=>setMembers(d.members)).catch(()=>{});
 if(section==='search')get<{members:Member[]}>('/api/chat?directory=1').then(d=>setMembers(d.members)).catch(e=>setNotice(String(e)));
 if(section==='notifications')get<{notifications:Notification[]}>('/api/notifications').then(d=>setNotifications(d.notifications)).catch(e=>setNotice(String(e)));
 if(section==='reels')get<{reels:Array<{id:string;caption:string;authorHandle:string;mediaId:string}>}>('/api/reels').then(d=>setReels(d.reels)).catch(e=>setNotice(String(e)));},[section]);
 useEffect(()=>{if(section!=='reels'&&section!=='notifications')return;
 const refresh=()=>{if(document.visibilityState!=='visible')return;
 if(section==='reels')void get<{reels:Array<{id:string;caption:string;authorHandle:string;mediaId:string}>}>('/api/reels').then(d=>setReels(d.reels)).catch(()=>{});
 if(section==='notifications')void get<{notifications:Notification[]}>('/api/notifications').then(d=>setNotifications(d.notifications)).catch(()=>{});
 };const timer=window.setInterval(refresh,10000);return()=>window.clearInterval(timer)},[section]);
 useEffect(()=>{if(section!=='chat'||!peer)return;
 let active=true,inFlight=false;const refresh=async()=>{if(inFlight||document.visibilityState==='hidden')return;inFlight=true;try{const d=await get<{messages:Message[];peerTyping:boolean;myUid:string}>('/api/chat?with='+encodeURIComponent(peer));if(!active)return;setLoadingChat(false);setNotice('');setMessages(current=>{const pending=current.filter(m=>m.id.startsWith('pending-'));return [...d.messages,...pending.filter(p=>!d.messages.some(m=>m.senderUid===p.senderUid&&m.text===p.text))]});setTyping(d.peerTyping);setMyUid(d.myUid);
 if(d.messages.some(m=>m.senderUid!==d.myUid&&!m.seen))await post('/api/chat',{action:'read',recipientHandle:peer});
 }catch(e){if(active){setLoadingChat(false);setNotice(e instanceof Error?e.message:'Chat unavailable')}}finally{inFlight=false}};
 void refresh();const timer=setInterval(()=>void refresh(),3000);return()=>{active=false;clearInterval(timer);void post('/api/chat',{action:'typing',recipientHandle:peer,typing:false}).catch(()=>{})}},[section,peer,retryCount]);
 useEffect(()=>{if(section==='chat'&&peer)bottomRef.current?.scrollIntoView({block:'end',behavior:'smooth'})},[section,peer,messages.length]);
 useEffect(()=>{if(section!=='chat')return;const timer=window.setInterval(()=>{if(document.visibilityState!=='visible')return;void get<{conversations:Conversation[]}>('/api/chat').then(d=>setConversations(d.conversations)).catch(()=>{})},7000);return()=>window.clearInterval(timer)},[section]);
 async function send(e:FormEvent){e.preventDefault();const text=draft.trim();if(!text||!peer||sending)return;const recipient=peer;const tempId='pending-'+Date.now();setDraft('');setMessages(current=>[...current,{id:tempId,senderUid:myUid,text,seen:false,createdAt:new Date().toISOString()}]);setSending(true);try{await post('/api/chat',{action:'send',recipientHandle:recipient,text,...(replyTo?{quotedMessageId:replyTo.id}:{})});setNotice('');setReplyTo(null);void post('/api/chat',{action:'typing',recipientHandle:recipient,typing:false}).catch(()=>{});void get<{messages:Message[]}>('/api/chat?with='+encodeURIComponent(recipient)).then(d=>{if(peer===recipient)setMessages(d.messages)}).catch(()=>{})}catch(e){setMessages(current=>current.filter(m=>m.id!==tempId));setDraft(current=>current||text);setNotice(String(e))}finally{setSending(false)}}
 async function reactTo(message:Message,emoji:'love'|'laugh'|'fire'){
  if(!peer)return;
  try{await post('/api/chat',{action:'reaction',recipientHandle:peer,messageId:message.id,emoji,remove:message.ownReactions?.includes(emoji)===true});
   const currentPeer=peer;void get<{messages:Message[]}>('/api/chat?with='+encodeURIComponent(currentPeer)).then(d=>{if(peer===currentPeer)setMessages(d.messages)}).catch(()=>{});
  }catch(e){setNotice(e instanceof Error?e.message:'Reaction failed')}
 }
 async function messageAction(action:'deleteForMe'|'unsend',m:Message){if(!peer||m.id.startsWith('pending-'))return;setSelectedMessage(null);try{await post('/api/chat',{action,recipientHandle:peer,messageId:m.id});setMessages(current=>current.filter(x=>x.id!==m.id));setNotice('')}catch(e){setNotice(String(e))}}

 if(section==='home'||section==='community')return null;
 return <div className="cc-social" style={{padding:'24px 0'}}>
  {notice&&<div role="alert" className="cc-chat-error">Chat problem: {notice}. <button type="button" onClick={()=>{setNotice('');setRetryCount(n=>n+1)}}>Retry</button></div>}
  {section==='search'&&<section><h2>Search campus members</h2><input aria-label="Search students" placeholder="Search by username or name" value={search} onChange={e=>setSearch(e.target.value)}/><div className="cc-member-list">{members.filter(m=>(m.handle+' '+m.name).toLowerCase().includes(search.toLowerCase())).map(m=><p key={m.handle}><Link href={'/profile/'+encodeURIComponent(m.handle)}>@{m.handle} — {m.name}</Link> · <a href={'/messages/'+encodeURIComponent(m.handle)}>Message</a></p>)}</div></section>}
  {section==='notifications'&&<section><h2>Notifications</h2>{notifications.length?notifications.map(n=><p key={n.id}>{n.type==='chat_message'?<Link href={'/messages/'+encodeURIComponent(n.actorHandle)}>@{n.actorHandle} sent you a message</Link>:<span>@{n.actorHandle} {n.type==='like'?'liked':n.type==='follow'?'followed you':'interacted with'} {n.postId?'your post':'your profile'}</span>}</p>):<p>No notifications yet.</p>}</section>}
  {section==='reels'&&<section><h2>Reels</h2>{reels.length?reels.map(r=><article key={r.id}><strong>@{r.authorHandle}</strong><video src={'/api/media?id='+encodeURIComponent(r.mediaId)} controls playsInline preload="metadata" style={{width:'100%',maxHeight:650,display:'block',margin:'14px 0'}}/><p>{r.caption}</p></article>):<p>No video reels published yet. Upload a video post to appear here.</p>}</section>}
  {section==='chat'&&<section className="cc-messages-section"><div className={'cc-chat-layout'+(peer?' cc-chat-has-peer':'')}>
   <aside className={'cc-chat-people'+(peer?' cc-chat-people-selected':'')}>
    <div className="cc-inbox-title"><h2>Messages</h2><button type="button" aria-label="New message" onClick={()=>setShowDirectory(true)}>✎</button></div>
    <input aria-label="Search past conversations" placeholder="Search messages or students" value={search} onChange={e=>setSearch(e.target.value)}/>
    {(search.trim()||!conversations.length?members.filter(m=>!conversations.some(c=>c.handle===m.handle)&&(!search||((m.name+' '+m.handle).toLowerCase().includes(search.toLowerCase())))):[]).slice(0,20).map(m=><button key={'member-'+m.handle} type="button" onClick={()=>{selectPeer(m.handle);setShowDirectory(false);setSearch('')}}><Avatar user={{name:m.name,handle:m.handle,avatarMediaId:m.avatarMediaId??null,avatarUrl:m.avatarUrl??null}} size={44} className="cc-chat-avatar"/><span className="cc-chat-person-info"><b>{m.name}</b><small>@{m.handle} · New message</small></span></button>)}
    {conversations.filter(c=>(c.handle+' '+c.name).toLowerCase().includes(search.toLowerCase())).map(c=><button className={peer===c.handle?'active':''} key={c.handle} type="button" onClick={()=>selectPeer(c.handle)}>
      <Avatar user={{name:c.name,handle:c.handle,avatarMediaId:c.avatarMediaId??null,avatarUrl:c.avatarUrl??null}} size={44} className="cc-chat-avatar"/><span className="cc-chat-person-info"><b>{c.name}</b><small>{c.preview||'@'+c.handle}{c.updatedAt&&Number.isFinite(Date.parse(c.updatedAt))?' · '+new Date(c.updatedAt).toLocaleDateString():''}</small></span>
    </button>)}
    {!conversations.length&&!showDirectory&&!search&&<p className="cc-chat-empty">Suggested people — select a campus member above to start chatting.</p>}
   </aside>
   <div className="cc-chat-thread">
    {peer?<><header className="cc-chat-header"><button className="cc-chat-back" type="button" onClick={()=>selectPeer('')} aria-label="Back to messages">‹</button><Link href={'/profile/'+encodeURIComponent(peer)}><Avatar user={{name:conversations.find(c=>c.handle===peer)?.name??peer,handle:peer,avatarMediaId:conversations.find(c=>c.handle===peer)?.avatarMediaId??null,avatarUrl:conversations.find(c=>c.handle===peer)?.avatarUrl??null}} size={44} className="cc-chat-avatar"/><span className="cc-chat-person-info"><strong>{conversations.find(c=>c.handle===peer)?.name||peer}</strong><small>@{peer}</small></span></Link><Link className="cc-chat-view-profile" href={'/profile/'+encodeURIComponent(peer)}>View profile</Link></header>
    <div className="cc-chat-messages" aria-live="polite">{loadingChat&&messages.length===0&&<p className="cc-chat-loading">Loading messages…</p>}{messages.map(m=><div key={m.id} className={'cc-message-item '+(m.senderUid===myUid?'mine':'theirs')}><button type="button" className="cc-message-bubble" onClick={()=>setSelectedMessage(selectedMessage===m.id?null:m.id)} aria-label="Message options">{m.quotedMessageId&&<small style={{display:'block',opacity:.7}}>↪ Reply</small>}
  
  
  <span>{m.text}</span>{m.senderUid===myUid&&<small>{m.id.startsWith('pending-')?'Sending…':m.seen?'Seen':'Sent'}</small>}</button>
 {m.mediaId&&(m.mediaType==='video'?<video src={'/api/media?id='+encodeURIComponent(m.mediaId)} controls playsInline preload="metadata" style={{width:'100%',maxHeight:260}}/>:<img src={'/api/media?id='+encodeURIComponent(m.mediaId)} alt="Chat attachment" style={{width:'100%',maxHeight:260,objectFit:'contain'}}/>)}
 {m.contentId&&<ChatSharedContentCard postId={m.contentId} kind={m.contentType==='reel'?'reel':'post'}/>}{selectedMessage===m.id&&<div className="cc-message-actions">{!m.id.startsWith('pending-')&&<><button type="button" onClick={()=>void messageAction('deleteForMe',m)}>Delete for me</button>{m.senderUid===myUid&&<button type="button" onClick={()=>void messageAction('unsend',m)}>Unsend for everyone</button>}
   <button type="button" onClick={()=>{setReplyTo(m);setSelectedMessage(null)}}>Reply</button>
   {(['love','laugh','fire'] as const).map(emoji=><button key={emoji} type="button" aria-label={'React '+emoji} onClick={()=>{setSelectedMessage(null);void reactTo(m,emoji)}}>{emoji==='love'?'❤️':emoji==='laugh'?'😂':'🔥'} {m.reactionCounts?.[emoji]??0}</button>)}</>}</div>}</div>)}<div ref={bottomRef}/></div>
    <ChatMediaUpload recipientHandle={peer} onSent={async()=>{const target=peer;const latest=await get<{messages:Message[]}>('/api/chat?with='+encodeURIComponent(target)).catch(()=>null);if(latest&&peer===target)setMessages(latest.messages)}}/>
    {replyTo&&<div className="cc-chat-reply"><span>Replying to: {replyTo.text.slice(0,80)}</span><button type="button" onClick={()=>setReplyTo(null)}>Cancel</button></div>}
    <p className="cc-typing" aria-live="polite">{typing?'@'+peer+' is typing…':' '}</p>
    <form onSubmit={send}><textarea aria-label="Message" value={draft} rows={1} maxLength={2000} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.currentTarget.form?.requestSubmit()}}} onChange={e=>{setDraft(e.target.value);if(Date.now()-lastTyping.current>2000){lastTyping.current=Date.now();void post('/api/chat',{action:'typing',recipientHandle:peer,typing:Boolean(e.target.value)}).catch(()=>{})}}} placeholder="Message…"/><button disabled={!draft.trim()||sending}>Send</button></form></>:<div className="cc-chat-placeholder"><div className="cc-chat-placeholder-icon" aria-hidden="true">➤</div><h2>Your messages</h2><p>Send a message to start a chat.</p><button type="button" onClick={()=>{const field=document.querySelector<HTMLInputElement>('input[aria-label="Search past conversations"]');field?.focus()}}>Send message</button></div>}
   </div>
  </div>{showDirectory&&<div className="cc-dm-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowDirectory(false)}}><section className="cc-dm-modal" role="dialog" aria-modal="true" aria-label="New message"><header><h2>New message</h2><button type="button" aria-label="Close new message" onClick={()=>setShowDirectory(false)}>×</button></header><input autoFocus aria-label="Find campus member" placeholder="Search people…" value={modalSearch} onChange={e=>setModalSearch(e.target.value)}/><div className="cc-dm-modal-results">{members.filter(m=>(m.name+' '+m.handle).toLowerCase().includes(modalSearch.toLowerCase())).map(m=><button type="button" key={m.handle} onClick={()=>{selectPeer(m.handle);setShowDirectory(false);setModalSearch('')}}><Avatar user={{name:m.name,handle:m.handle,avatarMediaId:m.avatarMediaId??null,avatarUrl:m.avatarUrl??null}} size={44} className="cc-chat-avatar"/><span><strong>{m.name}</strong><small>@{m.handle}</small></span><span className="cc-dm-action">Chat</span></button>)}</div></section></div>}</section>}
 </div>;
}
