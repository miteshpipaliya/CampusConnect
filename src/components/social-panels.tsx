'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import Link from 'next/link';
type Member={handle:string;name:string};
type Conversation=Member&{preview:string;updatedAt:string};
type Message={id:string;senderUid:string;text:string;seen:boolean;createdAt:string|null};
type Notification={id:string;type:string;actorHandle:string;postId:string};
async function get<T>(url:string):Promise<T>{const r=await fetch(url,{cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error||'Request failed');return d}
async function post(url:string,data:object){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const d=await r.json();if(!r.ok)throw Error(d.error||'Request failed');return d}
export function SocialPanels({section}:{section:string}){
 const [members,setMembers]=useState<Member[]>([]),[conversations,setConversations]=useState<Conversation[]>([]),[peer,setPeer]=useState(''),[messages,setMessages]=useState<Message[]>([]);
 const [myUid,setMyUid]=useState(''),[typing,setTyping]=useState(false),[draft,setDraft]=useState(''),[notice,setNotice]=useState('');
 const [search,setSearch]=useState(''),[showDirectory,setShowDirectory]=useState(false),[loadingChat,setLoadingChat]=useState(false),lastTyping=useRef(0);
 const [modalSearch,setModalSearch]=useState('');
 const [sending,setSending]=useState(false),[retryCount,setRetryCount]=useState(0),bottomRef=useRef<HTMLDivElement>(null);
 const [notifications,setNotifications]=useState<Notification[]>([]);
 const [reels,setReels]=useState<Array<{id:string;caption:string;authorHandle:string;mediaId:string}>>([]);
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
 let active=true;const refresh=async()=>{try{const d=await get<{messages:Message[];peerTyping:boolean;myUid:string}>('/api/chat?with='+encodeURIComponent(peer));if(!active)return;setLoadingChat(false);setNotice('');setMessages(d.messages);setTyping(d.peerTyping);setMyUid(d.myUid);
 if(d.messages.some(m=>m.senderUid!==d.myUid&&!m.seen))await post('/api/chat',{action:'read',recipientHandle:peer});
 }catch(e){if(active){setLoadingChat(false);setNotice(String(e))}}};
 void refresh();const timer=setInterval(()=>void refresh(),3000);return()=>{active=false;clearInterval(timer);void post('/api/chat',{action:'typing',recipientHandle:peer,typing:false}).catch(()=>{})}},[section,peer,retryCount]);
 useEffect(()=>{if(section==='chat'&&peer)bottomRef.current?.scrollIntoView({block:'end',behavior:'smooth'})},[section,peer,messages.length]);
 useEffect(()=>{if(section!=='chat')return;const timer=window.setInterval(()=>{if(document.visibilityState!=='visible')return;void get<{conversations:Conversation[]}>('/api/chat').then(d=>setConversations(d.conversations)).catch(()=>{})},7000);return()=>window.clearInterval(timer)},[section]);
 async function send(e:FormEvent){e.preventDefault();if(!draft.trim()||!peer||sending)return;setSending(true);try{await post('/api/chat',{action:'send',recipientHandle:peer,text:draft});setDraft('');setNotice('');void post('/api/chat',{action:'typing',recipientHandle:peer,typing:false}).catch(()=>{});const d=await get<{messages:Message[]}>('/api/chat?with='+encodeURIComponent(peer));setMessages(d.messages)}catch(e){setNotice(String(e))}finally{setSending(false)}}
 if(section==='home'||section==='community')return null;
 return <div className="cc-social" style={{padding:'24px 0'}}>
  {notice&&<div role="alert" className="cc-chat-error">Couldn&apos;t connect. <button type="button" onClick={()=>{setNotice('');setRetryCount(n=>n+1)}}>Retry</button></div>}
  {section==='search'&&<section><h2>Search campus members</h2><input aria-label="Search students" placeholder="Search by username or name" value={search} onChange={e=>setSearch(e.target.value)}/><div className="cc-member-list">{members.filter(m=>(m.handle+' '+m.name).toLowerCase().includes(search.toLowerCase())).map(m=><p key={m.handle}><Link href={'/profile/'+encodeURIComponent(m.handle)}>@{m.handle} — {m.name}</Link> · <a href={'/home?section=chat&with='+encodeURIComponent(m.handle)}>Message</a></p>)}</div></section>}
  {section==='notifications'&&<section><h2>Notifications</h2>{notifications.length?notifications.map(n=><p key={n.id}>@{n.actorHandle} {n.type==='like'?'liked':'commented on'} your post</p>):<p>No notifications yet.</p>}</section>}
  {section==='reels'&&<section><h2>Reels</h2>{reels.length?reels.map(r=><article key={r.id}><strong>@{r.authorHandle}</strong><video src={'/api/media?id='+encodeURIComponent(r.mediaId)} controls playsInline preload="metadata" style={{width:'100%',maxHeight:650,display:'block',margin:'14px 0'}}/><p>{r.caption}</p></article>):<p>No video reels published yet. Upload a video post to appear here.</p>}</section>}
  {section==='chat'&&<section className="cc-messages-section"><div className="cc-chat-layout">
   <aside className={'cc-chat-people'+(peer?' cc-chat-people-selected':'')}>
    <div className="cc-inbox-title"><h2>Messages</h2><button type="button" aria-label="New message" onClick={()=>setShowDirectory(true)}>✎</button></div>
    <input aria-label="Search past conversations" placeholder="Search messages or students" value={search} onChange={e=>setSearch(e.target.value)}/>
    {(search.trim()||!conversations.length?members.filter(m=>!conversations.some(c=>c.handle===m.handle)&&(!search||((m.name+' '+m.handle).toLowerCase().includes(search.toLowerCase())))):[]).slice(0,20).map(m=><button key={'member-'+m.handle} type="button" onClick={()=>{setPeer(m.handle);setShowDirectory(false);setSearch('');setLoadingChat(true);window.history.replaceState(null,'','/home?section=chat&with='+encodeURIComponent(m.handle))}}><span className="cc-chat-avatar">{m.name.slice(0,1).toUpperCase()}</span><span className="cc-chat-person-info"><b>{m.name}</b><small>@{m.handle} · New message</small></span></button>)}
    {conversations.filter(c=>(c.handle+' '+c.name).toLowerCase().includes(search.toLowerCase())).map(c=><button className={peer===c.handle?'active':''} key={c.handle} type="button" onClick={()=>{setPeer(c.handle);setLoadingChat(true);setMessages([]);setNotice('');window.history.replaceState(null,'','/home?section=chat&with='+encodeURIComponent(c.handle))}}>
      <span className="cc-chat-avatar">{c.name.slice(0,1).toUpperCase()}</span><span className="cc-chat-person-info"><b>{c.name}</b><small>{c.preview||'@'+c.handle}{c.updatedAt?' · '+new Date(c.updatedAt).toLocaleDateString():''}</small></span>
    </button>)}
    {!conversations.length&&!showDirectory&&!search&&<p className="cc-chat-empty">Suggested people — select a campus member above to start chatting.</p>}
   </aside>
   <div className="cc-chat-thread">
    {peer?<><header className="cc-chat-header"><button className="cc-chat-back" type="button" onClick={()=>{setPeer('');window.history.replaceState(null,'','/home?section=chat')}} aria-label="Back to messages">‹</button><Link href={'/profile/'+encodeURIComponent(peer)}><span className="cc-chat-avatar">{peer.slice(0,1).toUpperCase()}</span><span className="cc-chat-person-info"><strong>{conversations.find(c=>c.handle===peer)?.name||peer}</strong><small>@{peer}</small></span></Link><Link className="cc-chat-view-profile" href={'/profile/'+encodeURIComponent(peer)}>View profile</Link></header>
    <div className="cc-chat-messages" aria-live="polite">{loadingChat&&<p className="cc-chat-loading">Loading messages…</p>}{messages.map(m=><p key={m.id} className={m.senderUid===myUid?'mine':''}><span>{m.text}</span>{m.senderUid===myUid&&<small>{m.seen?'Seen':'Sent'}</small>}</p>)}<div ref={bottomRef}/></div>
    <p className="cc-typing" aria-live="polite">{typing?'@'+peer+' is typing…':' '}</p>
    <form onSubmit={send}><textarea aria-label="Message" value={draft} rows={1} maxLength={2000} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.currentTarget.form?.requestSubmit()}}} onChange={e=>{setDraft(e.target.value);if(Date.now()-lastTyping.current>2000){lastTyping.current=Date.now();void post('/api/chat',{action:'typing',recipientHandle:peer,typing:Boolean(e.target.value)}).catch(()=>{})}}} placeholder="Message…"/><button disabled={!draft.trim()||sending}>{sending?'Sending…':'Send'}</button></form></>:<div className="cc-chat-placeholder"><div className="cc-chat-placeholder-icon" aria-hidden="true">➤</div><h2>Your messages</h2><p>Send a message to start a chat.</p><button type="button" onClick={()=>{const field=document.querySelector<HTMLInputElement>('input[aria-label="Search past conversations"]');field?.focus()}}>Send message</button></div>}
   </div>
  </div>{showDirectory&&<div className="cc-dm-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowDirectory(false)}}><section className="cc-dm-modal" role="dialog" aria-modal="true" aria-label="New message"><header><h2>New message</h2><button type="button" aria-label="Close new message" onClick={()=>setShowDirectory(false)}>×</button></header><input autoFocus aria-label="Find campus member" placeholder="Search people…" value={modalSearch} onChange={e=>setModalSearch(e.target.value)}/><div className="cc-dm-modal-results">{members.filter(m=>(m.name+' '+m.handle).toLowerCase().includes(modalSearch.toLowerCase())).map(m=><button type="button" key={m.handle} onClick={()=>{setPeer(m.handle);setShowDirectory(false);setModalSearch('');setMessages([]);setLoadingChat(true);window.history.replaceState(null,'','/home?section=chat&with='+encodeURIComponent(m.handle))}}><span className="cc-chat-avatar">{m.name[0]?.toUpperCase()}</span><span><strong>{m.name}</strong><small>@{m.handle}</small></span><span className="cc-dm-action">Chat</span></button>)}</div></section></div>}</section>}
 </div>;
}
