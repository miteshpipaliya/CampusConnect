'use client';
import {useCallback,useEffect,useMemo,useRef,useState,type FormEvent,type KeyboardEvent} from 'react';
import Link from 'next/link';
import {ChevronDown,ChevronLeft,Edit3,Search,Smile,Sticker,Share2,Send,MoreHorizontal,Check,RefreshCw,X} from 'lucide-react';
import {Avatar} from '@/components/avatar';
import {mergeChronologicalMessages} from '@/lib/core/chat-pagination';
import {ChatMediaUpload} from './chat-media-upload';
import {ChatSharedContentCard} from './chat-shared-content-card';
import {ChatPostPicker} from './chat-post-picker';
import {useStreamConnection} from './stream-connection';

type Member={uid:string;handle:string;name:string;avatarMediaId?:string|null;avatarUrl?:string|null};
type Conversation=Member&{preview:string;updatedAt:string;channelId?:string;peerUid?:string;unreadCount?:number};
type Message={id:string;text:string;senderUid:string;createdAt:string|null;seen:boolean;quotedMessageId?:string|null;
 reactionCounts?:Record<string,number>;ownReactions?:string[];mediaId?:string|null;mediaType?:string|null;contentId?:string|null;contentType?:string|null};
type ConversationResponse={messages:Message[];myUid:string;peerName?:string;peerUid?:string;channelId?:string;nextCursor?:string|null};
type Reaction='love'|'laugh'|'fire';

async function requestJson<T>(path:string,body?:object):Promise<T>{
 const response=await fetch(path,{cache:'no-store',credentials:'same-origin',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
 const payload:unknown=await response.json().catch(()=>null);
 if(!response.ok)throw Error(payload&&typeof payload==='object'&&'error' in payload?String(payload.error):'Chat request failed ('+response.status+')');
 if(!payload||typeof payload!=='object')throw Error('Invalid chat response');
 return payload as T;
}
function formattedTime(value:string|null|undefined,short=false){
 if(!value)return '';
 const time=Date.parse(value);
 if(!Number.isFinite(time))return '';
 return short?new Date(time).toLocaleDateString([], {month:'short',day:'numeric'}):new Date(time).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
}
const emojiChoices=['❤️','😂','🔥','🥰','👍','✨','🎉','😊','🙌','💜'];

export function ChatWorkspace({initialPeer=''}:{initialPeer?:string}){
 const [peer,setPeer]=useState(initialPeer),[viewerHandle,setViewerHandle]=useState(''),
  [conversations,setConversations]=useState<Conversation[]>([]),[directory,setDirectory]=useState<Member[]>([]),
  [search,setSearch]=useState(''),[directoryQuery,setDirectoryQuery]=useState(''),[newMessage,setNewMessage]=useState(false),
  [tab,setTab]=useState<'primary'|'unread'>('primary'),[messages,setMessages]=useState<Message[]>([]),[older,setOlder]=useState<Message[]>([]),
  [cursor,setCursor]=useState<string|null>(null),[loadingOlder,setLoadingOlder]=useState(false),
  [myUid,setMyUid]=useState(''),[peerName,setPeerName]=useState(''),[channelId,setChannelId]=useState(''),[peerUid,setPeerUid]=useState(''),
  [typing,setTyping]=useState(false),[online,setOnline]=useState(false),[channelWatching,setChannelWatching]=useState(false),[presenceAllowed,setPresenceAllowed]=useState(false),
  [draft,setDraft]=useState(''),[replyTo,setReplyTo]=useState<Message|null>(null),[selectedMessage,setSelectedMessage]=useState<string|null>(null),
  [emojiMode,setEmojiMode]=useState<'insert'|'sticker'|null>(null),[showPostPicker,setShowPostPicker]=useState(false),
  [sending,setSending]=useState(false),[loading,setLoading]=useState(Boolean(initialPeer)),[error,setError]=useState(''),
  [inboxError,setInboxError]=useState(''),[notice,setNotice]=useState(''),[inboxLoading,setInboxLoading]=useState(true);
 const {client,status}=useStreamConnection();
 const active=useRef(peer),sequence=useRef(0),inboxSeq=useRef(0),readKeys=useRef(new Map<string,string>()),
  lastTyping=useRef(0),typingTimer=useRef<ReturnType<typeof setTimeout>|null>(null),sendingLock=useRef(false),
  bottom=useRef<HTMLDivElement|null>(null),draftInput=useRef<HTMLTextAreaElement|null>(null);
 active.current=peer;

 const refreshInbox=useCallback(async()=>{
  const version=++inboxSeq.current;
  const d=await requestJson<{conversations:Conversation[]}>('/api/chat');
  if(version!==inboxSeq.current)return;
  const items=Array.isArray(d.conversations)?d.conversations:[];
  setConversations(previous=>JSON.stringify(previous)===JSON.stringify(items)?previous:items);
  setInboxError('');setInboxLoading(false);
 },[]);

 const refreshConversation=useCallback(async(handle:string,lightweight=false)=>{
  const version=++sequence.current;
  const data=await requestJson<ConversationResponse>('/api/chat?with='+encodeURIComponent(handle)+(lightweight?'&refresh=1':''));
  if(active.current!==handle||sequence.current!==version)return;
  const incoming=Array.isArray(data.messages)?data.messages:[];
  setMessages(previous=>{
   const optimistic=previous.filter(m=>m.id.startsWith('cc-optimistic-')&&!incoming.some(real=>
    real.senderUid===m.senderUid&&real.text===m.text&&Math.abs(Date.parse(real.createdAt||'')-Date.parse(m.createdAt||''))<20000));
   const valid=optimistic.filter(m=>Date.now()-Date.parse(m.createdAt||'')<30000);
   return mergeChronologicalMessages(incoming,valid);
  });
  setCursor(previous=>lightweight?previous:typeof data.nextCursor==='string'?data.nextCursor:null);
  setMyUid(data.myUid||'');setPeerName(data.peerName||handle);setPeerUid(data.peerUid||'');setChannelId(data.channelId||'');
  setLoading(false);setError('');
  // Read receipts are idempotent, but should only be sent once per newest
  // inbound message, rather than on every three-second HTTP refresh.
  if(document.visibilityState==='visible'){
   const latest=[...incoming].reverse().find(m=>m.senderUid!==data.myUid);
   if(latest&&readKeys.current.get(handle)!==latest.id){
    readKeys.current.set(handle,latest.id);
    void requestJson('/api/chat',{action:'read',recipientHandle:handle}).catch(()=>readKeys.current.delete(handle));
   }
  }
 },[]);

 const selectPeer=useCallback((handle:string)=>{
  if(active.current!==handle){
   sequence.current++;
   setMessages([]);setOlder([]);setCursor(null);setLoading(Boolean(handle));
   setError('');setNotice('');setReplyTo(null);setSelectedMessage(null);setPeerName('');setChannelId('');setPeerUid('');setTyping(false);setOnline(false);setChannelWatching(false);
  }
  active.current=handle;setPeer(handle);setSearch('');setNewMessage(false);setDirectoryQuery('');
  const target=handle?'/messages/'+encodeURIComponent(handle):'/messages';
  if(window.location.pathname!==target)window.history.pushState(null,'',target);
 },[]);

 useEffect(()=>{
  const sync=()=>{
   const pathname=window.location.pathname;
   const handle=pathname.startsWith('/messages/')?decodeURIComponent(pathname.slice('/messages/'.length)):'';
   if(handle!==active.current)selectPeer(handle);
  };
  window.addEventListener('popstate',sync);
  return()=>window.removeEventListener('popstate',sync);
 },[selectPeer]);

 useEffect(()=>{
  let live=true;
  void refreshInbox().catch(e=>{if(live){setInboxLoading(false);setInboxError(e instanceof Error?e.message:'Inbox unavailable')}});
  void requestJson<{members:Member[]}>('/api/chat?directory=1')
   .then(data=>{if(live)setDirectory(Array.isArray(data.members)?data.members:[])}).catch(()=>{});
  void requestJson<{user?:{profile?:{handle?:string}}}>('/api/auth')
   .then(data=>{if(live)setViewerHandle(data.user?.profile?.handle||'')}).catch(()=>{});
  return()=>{live=false;inboxSeq.current++};
 },[refreshInbox]);

 useEffect(()=>{
  if(!peer)return;
  let live=true,inFlight=false;
  setError('');
  const tick=async()=>{
   if(!live||inFlight||document.visibilityState==='hidden'||!navigator.onLine)return;
   inFlight=true;
   try{await refreshConversation(peer,true)}catch(e){if(live){setLoading(false);setError(e instanceof Error?e.message:'Unable to load conversation')}}
   finally{inFlight=false}
  };
  void refreshConversation(peer).catch(e=>{if(live){setLoading(false);setError(e instanceof Error?e.message:'Unable to load conversation')}});
  const timer=window.setInterval(tick,status==='connected'&&channelWatching?15000:3000);
  const onResume=()=>{void tick()};
  document.addEventListener('visibilitychange',onResume);window.addEventListener('online',onResume);
  return()=>{live=false;sequence.current++;window.clearInterval(timer);document.removeEventListener('visibilitychange',onResume);window.removeEventListener('online',onResume)};
 },[peer,status,channelWatching,refreshConversation]);

 useEffect(()=>{
  let live=true,inFlight=false;
  const tick=async()=>{
   if(!live||inFlight||document.visibilityState==='hidden'||!navigator.onLine)return;
   inFlight=true;try{await refreshInbox()}catch(e){if(live)setInboxError(e instanceof Error?e.message:'Inbox refresh unavailable')}finally{inFlight=false}
  };
  const timer=window.setInterval(tick,status==='connected'?20000:6000);
  document.addEventListener('visibilitychange',tick);
  return()=>{live=false;window.clearInterval(timer);document.removeEventListener('visibilitychange',tick)};
 },[refreshInbox,status]);

 useEffect(()=>{
  if(!client||status!=='connected')return;
  const changed=()=>{void refreshInbox().catch(()=>{})};
  const subscriptions=[client.on('notification.message_new',changed),client.on('message.new',changed),client.on('message.deleted',changed)];
  return()=>subscriptions.forEach(s=>s.unsubscribe());
 },[client,status,refreshInbox]);

 useEffect(()=>{
  if(!client||status!=='connected'||!peer||!peerUid||!channelId)return;
  let live=true;let expires:ReturnType<typeof setTimeout>|null=null;
  setChannelWatching(false);
  const ch=client.channel('messaging',channelId),release=ch.activate();
  void ch.watch({presence:true}).then(()=>{
   if(live){setChannelWatching(true);setOnline(ch.state.members[peerUid]?.user?.online===true)}
  }).catch(()=>{if(live){setChannelWatching(false);setOnline(false)}});
  const updated=()=>{if(live)void refreshConversation(peer,true).catch(()=>{})};
  const subscriptions=[
   ch.on('message.new',updated),ch.on('message.deleted',updated),ch.on('message.updated',updated),
   ch.on('reaction.new',updated),ch.on('reaction.deleted',updated),ch.on('message.read',updated),
   ch.on('typing.start',event=>{if(event.user?.id===peerUid&&live){setTyping(true);if(expires)clearTimeout(expires);expires=setTimeout(()=>{if(live)setTyping(false)},6000)}}),
   ch.on('typing.stop',event=>{if(event.user?.id===peerUid&&live){setTyping(false);if(expires)clearTimeout(expires)}}),
   client.on('user.presence.changed',event=>{if(live&&event.user?.id===peerUid)setOnline(event.user.online===true)}),
   client.on('user.updated',event=>{if(live&&event.user?.id===peerUid)setOnline(event.user.online===true)})
  ];
  return()=>{live=false;if(expires)clearTimeout(expires);subscriptions.forEach(s=>s.unsubscribe());release();setOnline(false);setTyping(false);setChannelWatching(false)};
 },[client,status,peer,peerUid,channelId,refreshConversation]);

 useEffect(()=>{
  if(!peerUid){setPresenceAllowed(false);return}
  let live=true;setPresenceAllowed(false);
  void requestJson<{allowed:Record<string,boolean>}>('/api/chat/presence?uids='+encodeURIComponent(peerUid))
   .then(d=>{if(live)setPresenceAllowed(d.allowed?.[peerUid]===true)})
   .catch(()=>{if(live)setPresenceAllowed(false)});
  return()=>{live=false};
 },[peerUid]);

 useEffect(()=>{bottom.current?.scrollIntoView({block:'end',behavior:'auto'})},[peer,messages.length]);
 useEffect(()=>()=>{if(typingTimer.current)clearTimeout(typingTimer.current)},[]);

 useEffect(()=>{
  if(!newMessage)return;
  const q=directoryQuery.trim();
  if(q.length<2)return;
  let live=true;const ctrl=new AbortController(),timeout=window.setTimeout(()=>{
   void fetch('/api/chat?directory=1&q='+encodeURIComponent(q),{cache:'no-store',signal:ctrl.signal})
    .then(r=>r.ok?r.json():null).then(d=>{if(live&&Array.isArray(d?.members))setDirectory(d.members)}).catch(()=>{});
  },370);
  return()=>{live=false;ctrl.abort();window.clearTimeout(timeout)};
 },[directoryQuery,newMessage]);

 const markTyping=(value:boolean)=>{
  if(!peer||!channelId||!client||status!=='connected'||!channelWatching)return;
  // Send typing directly on the authorized watched Stream channel. This avoids
  // a full Next.js/Firestore/Stream round-trip on every keystroke.
  const channel=client.channel('messaging',channelId);
  void (value?channel.keystroke():channel.stopTyping()).catch(()=>{});
 };
 const changeDraft=(value:string)=>{
  setDraft(value);
  if(status!=='connected'||!channelWatching||!peer)return;
  const now=Date.now();
  if(now-lastTyping.current>2200){lastTyping.current=now;markTyping(true)}
  if(typingTimer.current)clearTimeout(typingTimer.current);
  typingTimer.current=setTimeout(()=>markTyping(false),3000);
 };
 const sendText=async(text:string)=>{
  const handle=peer;const value=text.trim();
  if(!handle||!value||sendingLock.current)return;
  sendingLock.current=true;setSending(true);setError('');setNotice('');
  const optimisticId='cc-optimistic-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
  const currentReply=replyTo;
  // Clear the composer immediately; message appears locally without waiting for
  // Stream, while the server keeps authority over the real delivery result.
  setDraft('');setReplyTo(null);markTyping(false);
  const tmp:Message={id:optimisticId,text:value,senderUid:myUid,createdAt:new Date().toISOString(),seen:false};
  setMessages(prev=>mergeChronologicalMessages(prev,[tmp]));
  try{
   const sent=await requestJson<{ok:boolean;messageId?:string}>('/api/chat',{action:'send',recipientHandle:handle,text:value,...(currentReply?{quotedMessageId:currentReply.id}:{})});
   if(active.current===handle&&sent.messageId){
    setMessages(prev=>{
     const exists=prev.some(m=>m.id===sent.messageId);
     return exists?prev.filter(m=>m.id!==optimisticId):prev.map(m=>m.id===optimisticId?{...m,id:sent.messageId!}:m);
    });
   }
   if(active.current===handle){
    void refreshConversation(handle,true).catch(()=>{});
    void refreshInbox().catch(()=>{});
   }
  }catch(e){
   if(active.current===handle){
    setMessages(prev=>prev.filter(m=>m.id!==optimisticId));
    setDraft(current=>current||value);
    setReplyTo(current=>current||currentReply);
    setError(e instanceof Error?e.message:'Unable to send message');
   }
  }finally{sendingLock.current=false;setSending(false)}
 };
 const submit=(event:FormEvent)=>{event.preventDefault();void sendText(draft)};
 const keyDown=(event:KeyboardEvent<HTMLTextAreaElement>)=>{
  if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();event.currentTarget.form?.requestSubmit()}
 };
 const act=async(action:'deleteForMe'|'unsend',message:Message)=>{
  setSelectedMessage(null);
  try{
   await requestJson('/api/chat',{action,recipientHandle:peer,messageId:message.id});
   setMessages(prev=>prev.filter(m=>m.id!==message.id));setOlder(prev=>prev.filter(m=>m.id!==message.id));
   void refreshConversation(peer,true).catch(()=>{});
  }catch(e){setError(e instanceof Error?e.message:'Message operation failed')}
 };
 const react=async(message:Message,emoji:Reaction)=>{
  setSelectedMessage(null);
  try{
   await requestJson('/api/chat',{action:'reaction',recipientHandle:peer,messageId:message.id,emoji,remove:message.ownReactions?.includes(emoji)===true});
   void refreshConversation(peer,true).catch(()=>{});
  }catch(e){setError(e instanceof Error?e.message:'Reaction unavailable')}
 };
 const loadOlder=async()=>{
  if(!cursor||loadingOlder||!peer)return;
  setLoadingOlder(true);
  try{
   const d=await requestJson<ConversationResponse>('/api/chat?with='+encodeURIComponent(peer)+'&before='+encodeURIComponent(cursor));
   setOlder(existing=>mergeChronologicalMessages(existing,Array.isArray(d.messages)?d.messages:[]));
   setCursor(typeof d.nextCursor==='string'&&d.nextCursor!==cursor?d.nextCursor:null);
  }catch(e){setError(e instanceof Error?e.message:'Could not load older messages')}
  finally{setLoadingOlder(false)}
 };
 const all=useMemo(()=>mergeChronologicalMessages(older,messages),[older,messages]);
 const visible=useMemo(()=>conversations.filter(c=>{
  return (tab==='primary'||(c.unreadCount??0)>0)&&(c.name+' '+c.handle).toLowerCase().includes(search.toLowerCase());
 }),[conversations,tab,search]);
 const selected=conversations.find(c=>c.handle===peer)||directory.find(c=>c.handle===peer);
 return <div className={'cc-dm-final'+(peer?' cc-dm-open':'')}>
  <aside className="cc-dm-people" aria-label="Conversations">
   <header className="cc-dm-people-head">
    <h1>{viewerHandle||'Messages'} <ChevronDown aria-hidden="true" size={17}/></h1>
    <button type="button" className="cc-dm-icon" title="New conversation" aria-label="New message" onClick={()=>setNewMessage(true)}><Edit3 size={22}/></button>
   </header>
   <nav aria-label="Conversation filters" className="cc-dm-tabs">
    <button type="button" className={tab==='primary'?'active':''} aria-current={tab==='primary'?'page':undefined} onClick={()=>setTab('primary')}>Primary</button>
    <button type="button" className={tab==='unread'?'active':''} aria-current={tab==='unread'?'page':undefined} onClick={()=>setTab('unread')}>Unread</button>
   </nav>
   <label className="cc-dm-search"><Search size={17}/><input aria-label="Search conversations" placeholder="Search" value={search} onChange={e=>setSearch(e.target.value)}/></label>
   <div className="cc-dm-quick-people" aria-label="Campus members">
    {directory.slice(0,6).map(member=><button key={member.uid} type="button" title={'Message @'+member.handle} onClick={()=>selectPeer(member.handle)}>
     <Avatar user={member} size={44}/><span>{member.name.split(' ')[0]}</span>
    </button>)}
   </div>
   {inboxError&&<p role="alert" className="cc-dm-error">Inbox: {inboxError} <button type="button" onClick={()=>void refreshInbox().catch(()=>{})}>Retry</button></p>}
   <div className="cc-dm-conversations">
    {inboxLoading&&<p className="cc-dm-muted">Loading conversations…</p>}
    {!inboxLoading&&visible.length===0&&<p className="cc-dm-muted">{search?'No matches.':tab==='unread'?'No unread messages.':'Select a campus member above to start a chat.'}</p>}
    {visible.map(c=><button key={c.handle} type="button" className={'cc-dm-person'+(peer===c.handle?' selected':'')} onClick={()=>selectPeer(c.handle)}>
     <Avatar user={c} size={44}/><span className="cc-dm-person-text"><strong>{c.name||c.handle}</strong><small className={typing&&c.handle===peer?'cc-dm-green-typing':''}>{typing&&c.handle===peer?'● Typing…':c.preview||'Send a message'}</small></span>
     <span className="cc-dm-person-meta"><time dateTime={c.updatedAt||undefined}>{formattedTime(c.updatedAt,true)}</time>{(c.unreadCount??0)>0&&<b aria-label={c.unreadCount+' unread messages'}>{c.unreadCount}</b>}</span>
    </button>)}
   </div>
  </aside>
  <section className="cc-dm-thread" aria-label={peer?'Conversation with '+peer:'No conversation selected'}>
   {peer?<><header className="cc-dm-thread-header">
    <button type="button" className="cc-dm-back" onClick={()=>selectPeer('')} aria-label="Back to conversations"><ChevronLeft size={24}/></button>
    <Link href={'/profile/'+encodeURIComponent(peer)} className="cc-dm-peer-profile">
     <Avatar user={{name:peerName||selected?.name||peer,handle:peer,avatarMediaId:selected?.avatarMediaId??null,avatarUrl:selected?.avatarUrl??null}} size={44} activityAllowed={presenceAllowed} online={online&&status==='connected'&&channelWatching}/>
     <span><strong>{peerName||selected?.name||peer}</strong><small className={typing?'cc-dm-green-typing':''}>@{peer}{typing?' · Typing…':presenceAllowed&&status==='connected'&&channelWatching?(online?' · Online':' · Offline'):''}</small></span>
    </Link>
    <div className="cc-dm-thread-actions"><span aria-label={status==='connected'&&channelWatching?'Chat connected':'Chat refresh active'} className={'cc-dm-connection'+(status==='connected'&&channelWatching?' connected':'')}><span/>{status==='connected'&&channelWatching?'Live':'Syncing'}</span>
     <button type="button" className="cc-dm-icon" title="Refresh messages" aria-label="Refresh messages" onClick={()=>void refreshConversation(peer,true).catch(e=>setError(String(e)))}><RefreshCw size={18}/></button>
     <Link href={'/profile/'+encodeURIComponent(peer)} aria-label="View member profile" className="cc-dm-icon"><MoreHorizontal size={22}/></Link>
    </div>
   </header>
   <div className="cc-dm-history" role="log" aria-live="polite" aria-relevant="additions">
    {loading&&all.length===0&&<p className="cc-dm-muted">Loading conversation…</p>}
    {!loading&&all.length===0&&<div className="cc-dm-empty-thread"><Smile size={40}/><strong>Say hello to {peerName||peer}</strong><p>Your private conversation starts here.</p></div>}
    {cursor&&<button type="button" className="cc-dm-older" disabled={loadingOlder} onClick={()=>void loadOlder()}>{loadingOlder?'Loading…':'Load earlier messages'}</button>}
    {all.map(m=><article key={m.id} className={'cc-dm-msg'+(m.senderUid===myUid?' mine':' theirs')}>
     <div className="cc-dm-msg-body">
      {m.quotedMessageId&&<a className="cc-dm-quote" href={'#cc-msg-'+m.quotedMessageId}>↪ {all.find(item=>item.id===m.quotedMessageId)?.text.slice(0,100)||'Previous message'}</a>}
      {m.mediaId&&(m.mediaType==='video'?<video src={'/api/media?id='+encodeURIComponent(m.mediaId)} controls playsInline preload="metadata" className="cc-dm-sent-media"/>:<a href={'/api/media?id='+encodeURIComponent(m.mediaId)} target="_blank" rel="noopener noreferrer"><img loading="lazy" src={'/api/media?id='+encodeURIComponent(m.mediaId)} alt="Shared chat attachment" className="cc-dm-sent-media"/></a>)}
      {m.contentId&&<ChatSharedContentCard postId={m.contentId} kind={m.contentType==='reel'?'reel':'post'}/>}
      {m.text&&<span className="cc-dm-msg-text">{m.text}</span>}
      <small>{formattedTime(m.createdAt)}{m.senderUid===myUid?' · '+(m.id.startsWith('cc-optimistic-')?'Sending…':m.seen?'Seen':'Sent'):''}</small>
     </div>
     <div className="cc-dm-message-menu">
      <button type="button" className="cc-dm-icon" aria-label="Message options" aria-expanded={selectedMessage===m.id} onClick={()=>setSelectedMessage(prev=>prev===m.id?null:m.id)}><MoreHorizontal size={17}/></button>
      {selectedMessage===m.id&&<div className="cc-dm-menu-items" id={'cc-msg-'+m.id}>
       <button type="button" onClick={()=>{setReplyTo(m);setSelectedMessage(null);draftInput.current?.focus()}}>Reply</button>
       {m.text&&<button type="button" onClick={()=>{void navigator.clipboard.writeText(m.text).then(()=>setNotice('Copied')).catch(()=>setError('Could not copy'));setSelectedMessage(null)}}>Copy</button>}
       {(['love','laugh','fire'] as const).map(emoji=><button key={emoji} type="button" onClick={()=>void react(m,emoji)}>{emoji==='love'?'❤️':emoji==='laugh'?'😂':'🔥'}</button>)}
       <button type="button" onClick={()=>void act('deleteForMe',m)}>Remove for me</button>
       {m.senderUid===myUid&&<button type="button" onClick={()=>void act('unsend',m)}>Unsend</button>}
      </div>}
     </div>
     {m.reactionCounts&&Object.values(m.reactionCounts).some(n=>n>0)&&<div className="cc-dm-reactions">{Object.entries(m.reactionCounts).filter(([,n])=>n>0).map(([key,n])=><small key={key}>{key==='love'?'❤️':key==='laugh'?'😂':key==='fire'?'🔥':'👍'} {n}</small>)}</div>}
    </article>)}
    <div ref={bottom}/>
   </div>
   {typing&&<div className="cc-dm-typing-indicator" role="status" aria-live="polite"><span className="cc-dm-typing-dot"/> {peerName||peer} is typing…</div>}
   {error&&<p role="alert" className="cc-dm-thread-error">{error} <button type="button" onClick={()=>{setError('');void refreshConversation(peer,true).catch(()=>{})}}>Retry</button></p>}
   {notice&&<p role="status" className="cc-dm-status" onClick={()=>setNotice('')}>{notice}</p>}
   {replyTo&&<div className="cc-dm-reply"><span>Replying to: {replyTo.text.slice(0,90)||'attachment'}</span><button type="button" aria-label="Cancel reply" onClick={()=>setReplyTo(null)}><X size={16}/></button></div>}
   {emojiMode&&<div className="cc-dm-emoji-panel" role="group" aria-label={emojiMode==='insert'?'Insert emoji':'Send an emoji sticker'}>
    {emojiChoices.map(e=><button key={e} type="button" title={emojiMode==='insert'?'Insert emoji':'Send emoji sticker'} onClick={()=>{if(emojiMode==='insert'){changeDraft(draft+e);draftInput.current?.focus()}else void sendText(e);setEmojiMode(null)}}>{e}</button>)}
    <button type="button" aria-label="Close emojis" onClick={()=>setEmojiMode(null)}><X size={16}/></button>
   </div>}
   <form className="cc-dm-composer" onSubmit={submit}>
    <button type="button" className="cc-dm-composer-icon" aria-label="Choose emoji" title="Emoji" onClick={()=>setEmojiMode(emojiMode==='insert'?null:'insert')}><Smile size={22}/></button>
    <textarea ref={draftInput} aria-label="Message" rows={1} maxLength={2000} placeholder="Message…" value={draft} onChange={e=>changeDraft(e.target.value)} onKeyDown={keyDown}/>
    <ChatMediaUpload compact recipientHandle={peer} onSent={async()=>{await refreshConversation(peer,true);void refreshInbox().catch(()=>{})}}/>
    <button type="button" className="cc-dm-composer-icon" aria-label="Send an emoji sticker" title="Emoji sticker" onClick={()=>setEmojiMode(emojiMode==='sticker'?null:'sticker')}><Sticker size={22}/></button>
    <button type="button" className="cc-dm-composer-icon" aria-label="Share a post or Reel" title="Share a post" onClick={()=>setShowPostPicker(true)}><Share2 size={21}/></button>
    <button type="submit" className="cc-dm-send" aria-label="Send message" disabled={!draft.trim()||sending}>{sending?'Sending…':<><Send size={18}/><span>Send</span></>}</button>
   </form>
  </>:<div className="cc-dm-unselected"><Send size={50}/><h2>Your messages</h2><p>Connect privately with other students at BVM.</p><button type="button" onClick={()=>setNewMessage(true)}>Send a message</button></div>}
  </section>
  {newMessage&&<div className="cc-dm-modal-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setNewMessage(false)}}>
   <section role="dialog" aria-modal="true" aria-label="New message" className="cc-dm-new-dialog">
    <header><h2>New message</h2><button type="button" aria-label="Close new message" onClick={()=>setNewMessage(false)}><X size={21}/></button></header>
    <label className="cc-dm-search"><Search size={18}/><input autoFocus aria-label="Find a student" placeholder="Search campus students…" value={directoryQuery} onChange={e=>setDirectoryQuery(e.target.value)}/></label>
    <div className="cc-dm-new-results">{directory.filter(m=>(m.handle+' '+m.name).toLowerCase().includes(directoryQuery.toLowerCase())).map(m=><button type="button" key={m.uid} onClick={()=>selectPeer(m.handle)}><Avatar user={m} size={44}/><span><strong>{m.name}</strong><small>@{m.handle}</small></span><ChevronLeft size={16}/></button>)}</div>
   </section>
  </div>}
  {showPostPicker&&peer&&<ChatPostPicker recipientHandle={peer} onClose={()=>setShowPostPicker(false)}
    onSent={async()=>{await refreshConversation(peer,true);void refreshInbox().catch(()=>{})}}/>}
 </div>;
}
