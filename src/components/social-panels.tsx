'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import Link from 'next/link';
type Member={handle:string;name:string};
type Message={id:string;senderUid:string;text:string;seen:boolean;createdAt:string|null};
type Notification={id:string;type:string;actorHandle:string;postId:string};
async function get<T>(url:string):Promise<T>{const r=await fetch(url,{cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error||'Request failed');return d}
async function post(url:string,data:object){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const d=await r.json();if(!r.ok)throw Error(d.error||'Request failed');return d}
export function SocialPanels({section}:{section:string}){
 const [members,setMembers]=useState<Member[]>([]),[peer,setPeer]=useState(''),[messages,setMessages]=useState<Message[]>([]);
 const [myUid,setMyUid]=useState(''),[typing,setTyping]=useState(false),[draft,setDraft]=useState(''),[notice,setNotice]=useState('');
 const [search,setSearch]=useState(''),lastTyping=useRef(0);
 const [notifications,setNotifications]=useState<Notification[]>([]);
 const [reels,setReels]=useState<Array<{id:string;caption:string;authorHandle:string;mediaId:string}>>([]);
 useEffect(()=>{if(section==='chat'||section==='search')get<{members:Member[]}>('/api/chat').then(d=>setMembers(d.members)).catch(e=>setNotice(String(e)));
 if(section==='notifications')get<{notifications:Notification[]}>('/api/notifications').then(d=>setNotifications(d.notifications)).catch(e=>setNotice(String(e)));
 if(section==='reels')get<{reels:Array<{id:string;caption:string;authorHandle:string;mediaId:string}>}>('/api/reels').then(d=>setReels(d.reels)).catch(e=>setNotice(String(e)));},[section]);
 useEffect(()=>{if(section!=='chat'||!peer)return;
 let active=true;const refresh=async()=>{try{const d=await get<{messages:Message[];peerTyping:boolean;myUid:string}>('/api/chat?with='+encodeURIComponent(peer));if(!active)return;setMessages(d.messages);setTyping(d.peerTyping);setMyUid(d.myUid);
 if(d.messages.some(m=>m.senderUid!==d.myUid&&!m.seen))await post('/api/chat',{action:'read',recipientHandle:peer});
 }catch(e){if(active)setNotice(String(e))}};
 void refresh();const timer=setInterval(()=>void refresh(),3000);return()=>{active=false;clearInterval(timer);void post('/api/chat',{action:'typing',recipientHandle:peer,typing:false}).catch(()=>{})}},[section,peer]);
 async function send(e:FormEvent){e.preventDefault();if(!draft.trim()||!peer)return;try{await post('/api/chat',{action:'send',recipientHandle:peer,text:draft});setDraft('');void post('/api/chat',{action:'typing',recipientHandle:peer,typing:false}).catch(()=>{});const d=await get<{messages:Message[]}>('/api/chat?with='+encodeURIComponent(peer));setMessages(d.messages)}catch(e){setNotice(String(e))}}
 if(section==='home'||section==='community')return null;
 return <div className="cc-social" style={{padding:'24px 0'}}>
  {notice&&<p role="alert">{notice}</p>}
  {section==='search'&&<section><h2>Search campus members</h2><input aria-label="Search students" placeholder="Search by username or name" value={search} onChange={e=>setSearch(e.target.value)}/><div className="cc-member-list">{members.filter(m=>(m.handle+' '+m.name).toLowerCase().includes(search.toLowerCase())).map(m=><p key={m.handle}><Link href={'/profile/'+encodeURIComponent(m.handle)}>@{m.handle} — {m.name}</Link> · <a href={'/home?section=chat&with='+encodeURIComponent(m.handle)}>Message</a></p>)}</div></section>}
  {section==='notifications'&&<section><h2>Notifications</h2>{notifications.length?notifications.map(n=><p key={n.id}>@{n.actorHandle} {n.type==='like'?'liked':'commented on'} your post</p>):<p>No notifications yet.</p>}</section>}
  {section==='reels'&&<section><h2>Reels</h2>{reels.length?reels.map(r=><article key={r.id}><strong>@{r.authorHandle}</strong><video src={'/api/media?id='+encodeURIComponent(r.mediaId)} controls playsInline preload="metadata" style={{width:'100%',maxHeight:650,display:'block',margin:'14px 0'}}/><p>{r.caption}</p></article>):<p>No video reels published yet. Upload a video post to appear here.</p>}</section>}
  {section==='chat'&&<section><h2>Messages</h2><div className="cc-chat-layout"><aside className="cc-chat-people"><input aria-label="Find a member" placeholder="Search messages" value={search} onChange={e=>setSearch(e.target.value)}/>{members.filter(m=>(m.handle+' '+m.name).toLowerCase().includes(search.toLowerCase())).map(m=><button className={peer===m.handle?'active':''} key={m.handle} type="button" onClick={()=>{setPeer(m.handle);setMessages([]);setNotice('')}}><b>@{m.handle}</b><small>{m.name}</small></button>)}</aside><div className="cc-chat-thread">
   {peer?<><h3>@{peer}</h3><div className="cc-chat-messages" aria-live="polite">{messages.map(m=><p key={m.id} className={m.senderUid===myUid?'mine':''}><span>{m.text}</span>{m.senderUid===myUid&&<small>{m.seen?'Seen':'Sent'}</small>}</p>)}</div><p className="cc-typing" aria-live="polite">{typing?'@'+peer+' is typing…':' '}</p><form onSubmit={send}><input aria-label="Message" value={draft} maxLength={2000} onChange={e=>{setDraft(e.target.value);if(Date.now()-lastTyping.current>2000){lastTyping.current=Date.now();void post('/api/chat',{action:'typing',recipientHandle:peer,typing:Boolean(e.target.value)}).catch(()=>{})}}} placeholder={'Message @'+peer}/><button disabled={!draft.trim()}>Send</button></form></>:<div className="cc-chat-placeholder">Choose a student to start a private conversation.</div>}
  </div></div></section>}
 </div>;
}
