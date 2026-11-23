'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';import {Avatar} from './avatar';import {Bell,CheckCheck} from 'lucide-react';
type Notification={id:string;type:string;actorUid:string;actorHandle:string;actorAvatarUrl:string|null;actorUids:string[];count:number;postId:string|null;storyId:string|null;createdAt:string|null;unread:boolean};
function label(n:Notification){
 const actor='@'+(n.actorHandle||'member'),extra=n.count>1?' and '+(n.count-1)+' others':'';
 const action:Record<string,string>={like:'liked your post',comment:'commented on your post',reply:'replied to your comment',mention:'mentioned you',comment_like:'liked your comment',follow:'followed you',follow_request:'requested to follow you',follow_accept:'accepted your follow request',repost:'reposted your post',story_reply:'reacted or replied to your story',story_mention:'mentioned you in a story',share:'shared your post'};
 return actor+extra+' '+(action[n.type]||'interacted with your content');
}
function dayGroup(n:Notification){
 if(n.unread)return 'New';
 const ms=Date.parse(n.createdAt||'');if(!Number.isFinite(ms))return 'Earlier';
 return Date.now()-ms<7*86400000?'This week':'Earlier';
}
export function NotificationsFeed(){
 const [items,setItems]=useState<Notification[]>([]),[cursor,setCursor]=useState<string|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const load=useCallback(async(next?:string)=>{
  setError('');setBusy(true);
  try{
   const response=await fetch('/api/notifications'+(next?'?cursor='+encodeURIComponent(next):''),{cache:'no-store'});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Notifications unavailable');
   const incoming:Notification[]=Array.isArray(data.items)?data.items:[];
   setItems(old=>next?[...new Map([...old,...incoming].map(x=>[x.id,x])).values()]:incoming);setCursor(typeof data.nextCursor==='string'?data.nextCursor:null);
  }catch(e){setError(e instanceof Error?e.message:'Notifications unavailable')}finally{setBusy(false);setLoading(false)}
 },[]);
 useEffect(()=>{void load()},[load]);
 const groups=useMemo(()=>Object.entries({New:items.filter(x=>dayGroup(x)==='New'),'This week':items.filter(x=>dayGroup(x)==='This week'),Earlier:items.filter(x=>dayGroup(x)==='Earlier')}),[items]);
 const mark=async(id?:string)=>{try{
  const r=await fetch('/api/notifications/read',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(id?{id}:{all:true})});
  if(!r.ok)throw Error('Unable to mark notifications read');
  setItems(old=>old.map(n=>!id||n.id===id?{...n,unread:false}:n));window.dispatchEvent(new Event('cc-notifications-updated'));
 }catch(e){setError(String(e))}};
 const respond=async(n:Notification,action:'accept'|'decline')=>{try{
  const r=await fetch('/api/follow-requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uid:n.actorUid,action})});
  if(!r.ok)throw Error((await r.json()).error||'Unable to respond');
  setNotice(action==='accept'?'Follow request accepted':'Follow request declined');await mark(n.id);
 }catch(e){setError(String(e))}};
 const followBack=async(n:Notification)=>{try{
  const r=await fetch('/api/follow',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({handle:n.actorHandle})});if(!r.ok)throw Error('Unable to follow');
  setNotice('Follow status updated');await mark(n.id);
 }catch(e){setError(String(e))}};
 return <section className="cc-notifications-page" aria-label="Campus notifications">
  <header><div><h1>Notifications</h1><p>See activity from your campus community.</p></div><button onClick={()=>void mark()}><CheckCheck size={17}/> Mark all as read</button></header>
  {loading&&<p role="status">Loading your notifications…</p>}
  {error&&<p role="alert">{error} <button onClick={()=>void load()}>Retry</button></p>}
  {notice&&<p role="status">{notice}</p>}
  {!loading&&items.length===0&&<div className="cc-notifications-empty"><Bell size={40}/><h2>Nothing new yet</h2><p>When students interact with your posts and stories, you'll see it here.</p></div>}
  {groups.map(([section,group])=>group.length>0&&<div key={section} className="cc-notification-group"><h2>{section}</h2>{group.map(n=>{
   const href=n.postId?'/posts/'+encodeURIComponent(n.postId):n.storyId?'/home':'/profile/'+encodeURIComponent(n.actorHandle||'me');
   const time=Date.parse(n.createdAt||''),relative=Number.isFinite(time)?new Date(time).toLocaleDateString([], {month:'short',day:'numeric'}):'';
   return <article key={n.id} className={'cc-notification-row'+(n.unread?' unread':'')}>
    <Link href={href} onClick={()=>void mark(n.id)} className="cc-notification-main">
     <Avatar user={{name:n.actorHandle,handle:n.actorHandle,avatarUrl:n.actorAvatarUrl}} size={44}/>
     <span><strong>{label(n)}</strong><small>{relative}</small></span>
     {n.unread&&<b className="cc-notification-dot" aria-label="Unread"/>}
    </Link>
    {n.type==='follow_request'&&<div className="cc-notification-actions"><button onClick={()=>void respond(n,'accept')}>Confirm</button><button onClick={()=>void respond(n,'decline')}>Delete</button></div>}
    {n.type==='follow'&&<button onClick={()=>void followBack(n)} className="cc-follow-back">Follow back</button>}
   </article>;
  })}</div>)}
  {cursor&&<button className="cc-notifications-more" disabled={busy} onClick={()=>void load(cursor)}>{busy?'Loading…':'Load older notifications'}</button>}
 </section>;
}
