'use client';
import Link from 'next/link';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {chatRefreshIntervalMs,shouldRefreshChat} from '@/lib/core/chat-refresh';
import {Avatar} from '@/components/avatar';
import {useStreamConnection} from './stream-connection';

type Conversation={handle:string;name:string;preview:string;updatedAt:string;peerUid?:string;channelId?:string;unreadCount?:number;avatarMediaId?:string|null;avatarUrl?:string|null};
type Member={uid:string;handle:string;name:string;avatarMediaId?:string|null;avatarUrl?:string|null};

export function ChatInbox(){
 const {client,userId,status,retry}=useStreamConnection();
 const [items,setItems]=useState<Conversation[]>([]),[query,setQuery]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [showPeople,setShowPeople]=useState(false),[memberQuery,setMemberQuery]=useState(''),[members,setMembers]=useState<Member[]>([]),[searching,setSearching]=useState(false),[searchError,setSearchError]=useState('');
 const requestVersion=useRef(0);
 const [allowedUids,setAllowedUids]=useState<Set<string>>(new Set()),[onlineUids,setOnlineUids]=useState<Set<string>>(new Set());
 const refresh=useCallback(async(signal?:AbortSignal)=>{
  const version=++requestVersion.current;
  const response=await fetch('/api/chat',{cache:'no-store',signal:signal??null});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.error||'Unable to load conversations');
  if(signal?.aborted||version!==requestVersion.current)return;
  const conversations:Conversation[]=Array.isArray(data.conversations)?data.conversations:[];
  // Avoid rewatching every channel whenever an unchanged inbox is polled.
  setItems(previous=>JSON.stringify(previous)===JSON.stringify(conversations)?previous:conversations);
  setError('');
 },[]);
 useEffect(()=>{
  const abort=new AbortController();
  refresh(abort.signal).catch(e=>{if(!abort.signal.aborted)setError(e instanceof Error?e.message:'Chat unavailable')})
   .finally(()=>{if(!abort.signal.aborted)setLoading(false)});
  return()=>{abort.abort();requestVersion.current++};
 },[refresh]);
 useEffect(()=>{
  if(loading)return;
  let active=true,inFlight=false;
  const tick=async()=>{
   if(!active||!shouldRefreshChat({visible:document.visibilityState==='visible',online:navigator.onLine,inFlight}))return;
   inFlight=true;try{await refresh()}catch{/* Keep the last inbox while retrying later. */}finally{inFlight=false}
  };
  const resume=()=>{void tick()};
  const timer=window.setInterval(resume,chatRefreshIntervalMs(status,'inbox'));
  document.addEventListener('visibilitychange',resume);
  window.addEventListener('online',resume);
  return()=>{active=false;window.clearInterval(timer);document.removeEventListener('visibilitychange',resume);window.removeEventListener('online',resume)};
 },[refresh,status,loading]);
 useEffect(()=>{
  if(!client||status!=='connected')return;
  const changed=()=>{void refresh().catch(()=>{})};
  const subs=[client.on('message.new',changed),client.on('notification.message_new',changed),client.on('message.deleted',changed)];
  return()=>subs.forEach(s=>s.unsubscribe());
 },[client,status,refresh]);
 useEffect(()=>{
  if(!client||status!=='connected'||!userId||!items.length){setOnlineUids(new Set());return}
  let live=true;
  const uids=[...new Set(items.map(c=>c.peerUid).filter((id):id is string=>Boolean(id)))];
  setAllowedUids(new Set());
  void fetch('/api/chat/presence?uids='+encodeURIComponent(uids.join(',')),{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{
   if(!live)return;
   setAllowedUids(new Set(uids.filter(id=>d?.allowed?.[id]===true)));
  }).catch(()=>{if(live)setAllowedUids(new Set())});
  void client.queryChannelsAndHydrate({
   filter_conditions:{type:'messaging',members:{$in:[userId]}},
   limit:30,
   sort:[{field:'last_message_at',direction:-1}],
   presence:true
  }).then(()=>{
   if(!live)return;
   setOnlineUids(new Set(items.filter(c=>c.channelId&&c.peerUid&&client.channel('messaging',c.channelId).state.members[c.peerUid]?.user?.online===true).map(c=>c.peerUid!)));
  }).catch(()=>{if(live)setOnlineUids(new Set())});
  const sub=client.on('user.presence.changed',event=>{
   if(!live||!event.user?.id)return;
   const uid=event.user.id;
   setOnlineUids(previous=>{const next=new Set(previous);if(event.user?.online===true)next.add(uid);else next.delete(uid);return next});
  });
  return()=>{live=false;sub.unsubscribe()};
 },[client,status,userId,items]);
 useEffect(()=>{
  const q=memberQuery.trim();
  if(q.length<2){setMembers([]);setSearchError('');setSearching(false);return}
  const controller=new AbortController();
  const timer=setTimeout(()=>{
   setSearching(true);setSearchError('');
   void fetch('/api/chat?directory=1&q='+encodeURIComponent(q),{signal:controller.signal,cache:'no-store'}).then(async r=>{
    const data=await r.json().catch(()=>({}));
    if(!r.ok)throw Error(data.error||'Unable to search campus members');
    if(!controller.signal.aborted)setMembers(Array.isArray(data.members)?data.members:[]);
   }).catch(e=>{if(!controller.signal.aborted)setSearchError(e instanceof Error?e.message:'Member search unavailable')}).finally(()=>{if(!controller.signal.aborted)setSearching(false)});
  },350);
  return()=>{clearTimeout(timer);controller.abort()};
 },[memberQuery]);
 const visible=useMemo(()=>items.filter(c=>(c.handle+' '+c.name).toLowerCase().includes(query.trim().toLowerCase())),[items,query]);
 return <section className="cc-dm-inbox" aria-label="Messages" style={{maxWidth:780,margin:'0 auto',padding:20}}>
  <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}><h1>Messages</h1><button type="button" onClick={()=>setShowPeople(value=>!value)} aria-expanded={showPeople} aria-controls="cc-people-search">New message</button></header>
  {showPeople&&<section id="cc-people-search" aria-label="Start a conversation" style={{padding:12,border:'1px solid var(--cc-border,#7774)',borderRadius:14,marginBottom:14}}>
   <label htmlFor="cc-member-search">Find a campus member</label>
   <input id="cc-member-search" value={memberQuery} onChange={event=>setMemberQuery(event.target.value)} placeholder="Search by name or username" style={{width:'100%',padding:12,borderRadius:12}}/>
   {searching&&<p role="status">Searching members…</p>}
   {searchError&&<p role="alert">{searchError}</p>}
   {!searching&&!searchError&&memberQuery.trim().length>=2&&members.length===0&&<p>No matching campus members.</p>}
   <ul style={{listStyle:'none',padding:0,margin:'6px 0'}}>{members.map(member=><li key={member.uid}><Link href={'/messages/'+encodeURIComponent(member.handle)} style={{display:'flex',alignItems:'center',gap:12,padding:10}}>
    <Avatar user={{handle:member.handle,name:member.name,avatarMediaId:member.avatarMediaId??null,avatarUrl:member.avatarUrl??null}} size={44}/>
    <span><strong>{member.name}</strong><small style={{display:'block'}}>@{member.handle}</small></span>
   </Link></li>)}</ul>
  </section>}
  <label htmlFor="cc-chat-search">Search conversations</label>
  <input id="cc-chat-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search existing chats" style={{width:'100%',padding:12,borderRadius:12}}/>
  {status==='error'?<p role="alert">Couldn&apos;t connect. <button type="button" onClick={retry}>Retry</button></p>:status!=='connected'&&<p role="status">{status==='disabled'?'Real-time chat connection is not enabled.':'Chat is reconnecting.'} Your conversations refresh automatically.</p>}
  {loading?<p role="status">Loading conversations…</p>:error?<p role="alert">{error}</p>:visible.length===0?<p>{query?'No matching conversations.':'No conversations yet. Find a campus member to start chatting.'}</p>:
   <ul style={{listStyle:'none',padding:0}}>{visible.map(c=><li key={c.handle}><Link href={'/messages/'+encodeURIComponent(c.handle)} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 4px',borderBottom:'1px solid var(--cc-border,#7773)',textDecoration:'none',color:'inherit'}}>
   <Avatar user={{name:c.name,handle:c.handle,avatarMediaId:c.avatarMediaId??null,avatarUrl:c.avatarUrl??null}} size={44} online={status==='connected'&&Boolean(c.peerUid)&&onlineUids.has(c.peerUid||'')} activityAllowed={Boolean(c.peerUid)&&allowedUids.has(c.peerUid||'')}/>
   <span style={{minWidth:0,flex:1}}><strong>{c.name||c.handle}</strong><small style={{display:'block',opacity:.75}}>@{c.handle}</small><span style={{display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.preview||'Start a conversation'}</span></span>{(c.unreadCount??0)>0&&<strong aria-label={(c.unreadCount??0)+' unread messages'} style={{borderRadius:20,background:'#9b59ef',color:'#fff',padding:'3px 8px',fontSize:12}}>{c.unreadCount}</strong>}
   {c.updatedAt&&<time dateTime={c.updatedAt} style={{fontSize:12,opacity:.7}}>{new Date(c.updatedAt).toLocaleDateString()}</time>}
   </Link></li>)}</ul>}
 </section>;
}
