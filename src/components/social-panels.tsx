'use client';
import {useEffect,useState,type FormEvent} from 'react';
type Member={handle:string;name:string};
type Message={id:string;senderUid:string;text:string;seen:boolean;createdAt:string|null};
type Notification={id:string;type:string;actorHandle:string;postId:string};
async function get<T>(url:string):Promise<T>{const r=await fetch(url,{cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error||'Request failed');return d}
async function post(url:string,data:object){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const d=await r.json();if(!r.ok)throw Error(d.error||'Request failed');return d}
export function SocialPanels(){
 const [tab,setTab]=useState<'home'|'reels'|'chat'|'notifications'>('home');
 const [members,setMembers]=useState<Member[]>([]),[peer,setPeer]=useState(''),[messages,setMessages]=useState<Message[]>([]);
 const [myUid,setMyUid]=useState(''),[typing,setTyping]=useState(false),[draft,setDraft]=useState(''),[notice,setNotice]=useState('');
 const [notifications,setNotifications]=useState<Notification[]>([]);
 const [reels,setReels]=useState<Array<{id:string;caption:string;authorHandle:string;mediaId:string}>>([]);
 useEffect(()=>{if(tab==='chat')get<{members:Member[]}>('/api/chat').then(d=>setMembers(d.members)).catch(e=>setNotice(String(e)));
 if(tab==='notifications')get<{notifications:Notification[]}>('/api/notifications').then(d=>setNotifications(d.notifications)).catch(e=>setNotice(String(e)));
 if(tab==='reels')get<{reels:Array<{id:string;caption:string;authorHandle:string;mediaId:string}>}>('/api/reels').then(d=>setReels(d.reels)).catch(e=>setNotice(String(e)));},[tab]);
 useEffect(()=>{if(tab!=='chat'||!peer)return;
 let active=true;const refresh=async()=>{try{const d=await get<{messages:Message[];peerTyping:boolean;myUid:string}>('/api/chat?with='+encodeURIComponent(peer));if(!active)return;setMessages(d.messages);setTyping(d.peerTyping);setMyUid(d.myUid);
 if(d.messages.some(m=>m.senderUid!==d.myUid&&!m.seen))await post('/api/chat',{action:'read',recipientHandle:peer});
 }catch(e){if(active)setNotice(String(e))}};
 void refresh();const timer=setInterval(()=>void refresh(),3000);return()=>{active=false;clearInterval(timer)}},[tab,peer]);
 async function send(e:FormEvent){e.preventDefault();if(!draft.trim()||!peer)return;try{await post('/api/chat',{action:'send',recipientHandle:peer,text:draft});setDraft('');const d=await get<{messages:Message[]}>('/api/chat?with='+encodeURIComponent(peer));setMessages(d.messages)}catch(e){setNotice(String(e))}}
 return <div className="cc-social">
  <nav className="cc-social-tabs" aria-label="Campus sections">
   {(['home','reels','chat','notifications'] as const).map(t=><button key={t} type="button" className={tab===t?'selected':''} onClick={()=>{setTab(t);setNotice('')}}>{t==='home'?'Home':t==='reels'?'Reels':t==='chat'?'Chat':'Notifications'}</button>)}
  </nav>
  {notice&&<p role="alert">{notice}</p>}
  {tab==='home'&&<p className="cc-social-hint">Your live campus feed is below.</p>}
  {tab==='notifications'&&<section><h2>Notifications</h2>{notifications.length?notifications.map(n=><p key={n.id}>@{n.actorHandle} {n.type==='like'?'liked':'commented on'} your post</p>):<p>No notifications yet.</p>}</section>}
  {tab==='reels'&&<section><h2>Reels</h2>{reels.length?reels.map(r=><article key={r.id}><strong>@{r.authorHandle}</strong><video src={'/api/media?id='+encodeURIComponent(r.mediaId)} controls playsInline preload="metadata" style={{width:'100%',maxHeight:520,display:'block'}}/><p>{r.caption}</p></article>):<p>No video reels published yet. Upload a video post to appear here.</p>}</section>}
  {tab==='chat'&&<section><h2>Messages</h2><label>Choose a campus member <select value={peer} onChange={e=>{setPeer(e.target.value);setMessages([])}}><option value="">Select a member</option>{members.map(m=><option key={m.handle} value={m.handle}>@{m.handle} — {m.name}</option>)}</select></label>
   {peer&&<><div className="cc-chat-messages" aria-live="polite">{messages.map(m=><p key={m.id} className={m.senderUid===myUid?'mine':''}><span>{m.text}</span>{m.senderUid===myUid&&<small>{m.seen?'Seen':'Sent'}</small>}</p>)}</div><p aria-live="polite">{typing?'Typing…':''}</p><form onSubmit={send}><input aria-label="Message" value={draft} maxLength={2000} onChange={e=>{setDraft(e.target.value);void post('/api/chat',{action:'typing',recipientHandle:peer,typing:Boolean(e.target.value)}).catch(()=>{})}} placeholder={'Message @'+peer}/><button disabled={!draft.trim()}>Send</button></form></>}
  </section>}
 </div>
}
