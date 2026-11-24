'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useStreamConnection} from './stream-connection';
type Group={id:string;name:string;ownerUid:string;memberUids:string[]};
type Message={id:string;text:string;created_at?:string;user_id?:string;user?:{id?:string;name?:string}};
async function api<T>(url:string,body?:object):Promise<T>{
 const response=await fetch(url,{cache:'no-store',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
 const result:unknown=await response.json().catch(()=>null);
 if(!response.ok)throw Error(result&&typeof result==='object'&&'error'in result?String(result.error):'Group request unavailable');
 return result as T;
}
export function GroupChatWorkspace({id}:{id?:string}){
 const router=useRouter(),{client,status}=useStreamConnection();
 const [groups,setGroups]=useState<Group[]>([]),[group,setGroup]=useState<Group|null>(null),[myUid,setMyUid]=useState(''),[messages,setMessages]=useState<Message[]>([]),
 [name,setName]=useState(''),[members,setMembers]=useState(''),[draft,setDraft]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const refresh=useCallback(async()=>{
  if(id){const data=await api<{group:Group;myUid:string;messages:Message[]}>('/api/chat/groups/'+encodeURIComponent(id));setGroup(data.group);setMyUid(data.myUid);setMessages(data.messages);}
  else{const data=await api<{groups:Group[]}>('/api/chat/groups');setGroups(data.groups);}
 },[id]);
 useEffect(()=>{let alive=true;void refresh().catch(e=>{if(alive)setError(e instanceof Error?e.message:'Groups unavailable')});
  const timer=window.setInterval(()=>{if(alive&&document.visibilityState==='visible')void refresh().catch(()=>{})},status==='connected'?15000:3000);
  return()=>{alive=false;window.clearInterval(timer)};
 },[refresh,status]);
 useEffect(()=>{if(!id||!client||status!=='connected')return;const c=client.channel('messaging',id);
  const event=()=>{void refresh().catch(()=>{})};const sub=[c.on('message.new',event),c.on('message.deleted',event),c.on('member.removed',event)];
  return()=>sub.forEach(s=>s.unsubscribe());
 },[id,client,status,refresh]);
 async function create(){if(busy)return;setBusy(true);setError('');try{
  const input=members.split(',').map(x=>x.trim()).filter(Boolean);
  const result=await api<{id:string}>('/api/chat/groups',{name,handles:input});
  router.push('/messages/groups/'+encodeURIComponent(result.id));
 }catch(e){setError(e instanceof Error?e.message:'Unable to create group')}finally{setBusy(false)}}
 async function act(action:'send'|'rename'|'leave'){
  if(!id||busy)return;setBusy(true);setError('');
  try{
   await api('/api/chat/groups/'+encodeURIComponent(id),{action,...(action==='send'?{text:draft}:action==='rename'?{name}:{})});
   if(action==='leave'){router.push('/messages/groups');return}
   if(action==='send')setDraft('');
   setNotice(action==='rename'?'Group renamed':'');await refresh();
  }catch(e){setError(e instanceof Error?e.message:'Group action failed')}finally{setBusy(false)}
 }
 return <section style={{maxWidth:820,margin:'0 auto',padding:22,color:'#fff'}}>
  <p><Link href="/messages">Messages</Link> / <Link href="/messages/groups">Groups</Link></p>
  {id?<><header style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
   <h1>{group?.name||'Group'}</h1><button onClick={()=>void act('leave')} disabled={busy}>Leave group</button></header>
   {group?.ownerUid===myUid&&<div style={{display:'flex',gap:7,marginBottom:14}}><input aria-label="Rename group" placeholder="Group name" value={name} onChange={e=>setName(e.target.value)} maxLength={60}/><button disabled={busy||!name.trim()} onClick={()=>void act('rename')}>Rename</button></div>}
   <div style={{display:'grid',gap:8,minHeight:300,maxHeight:'65dvh',overflowY:'auto',padding:10,background:'#15171d',borderRadius:12}}>
    {messages.map(m=><article key={m.id} style={{justifySelf:m.user_id===myUid||m.user?.id===myUid?'end':'start',maxWidth:'80%',background:m.user_id===myUid||m.user?.id===myUid?'#4d43b2':'#282b34',padding:'9px 14px',borderRadius:12}}>
     <small>{m.user?.name||m.user?.id||m.user_id||'Member'}</small><p style={{margin:'5px 0'}}>{m.text}</p>
    </article>)}
   </div>
   <form onSubmit={e=>{e.preventDefault();void act('send')}} style={{display:'flex',gap:8,marginTop:14}}>
    <input required aria-label="Group message" placeholder="Message group..." value={draft} onChange={e=>setDraft(e.target.value)} maxLength={2000} style={{flex:1,minWidth:0}}/>
    <button disabled={busy||!draft.trim()}>Send</button>
   </form>
  </>:<><h1>Campus group chats</h1>
   <section style={{display:'grid',gap:10,padding:14,border:'1px solid #333',borderRadius:12}}>
    <label>Group name<input value={name} onChange={e=>setName(e.target.value)} maxLength={60} placeholder="Project team"/></label>
    <label>Members&apos; handles (comma-separated, 2–8)<input value={members} onChange={e=>setMembers(e.target.value)} placeholder="student.one, student.two"/></label>
    <button disabled={busy||!name.trim()||!members.trim()} onClick={()=>void create()}>Create group</button>
   </section>
   {groups.map(g=><Link href={'/messages/groups/'+encodeURIComponent(g.id)} key={g.id} style={{display:'block',padding:14,borderBottom:'1px solid #333'}}><strong>{g.name}</strong><small style={{display:'block'}}>{g.memberUids.length} members</small></Link>)}
  </>}
  {notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error} <button onClick={()=>void refresh().catch(()=>{})}>Retry</button></p>}
 </section>;
}
