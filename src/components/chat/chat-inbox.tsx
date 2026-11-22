'use client';
import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {Avatar} from '@/components/avatar';
type Conversation={handle:string;name:string;preview:string;updatedAt:string;avatarMediaId?:string|null;avatarUrl?:string|null};
export function ChatInbox(){
 const [items,setItems]=useState<Conversation[]>([]),[query,setQuery]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{const controller=new AbortController();fetch('/api/chat',{cache:'no-store',signal:controller.signal}).then(async r=>{if(!r.ok)throw Error((await r.json().catch(()=>({}))).error||'Unable to load conversations');return r.json()}).then(d=>setItems(Array.isArray(d.conversations)?d.conversations:[])).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Chat unavailable')}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});return()=>controller.abort()},[]);
 const visible=useMemo(()=>items.filter(c=>(c.handle+' '+c.name).toLowerCase().includes(query.trim().toLowerCase())),[items,query]);
 return <section className="cc-dm-inbox" aria-label="Messages" style={{maxWidth:780,margin:'0 auto',padding:20}}>
  <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}><h1>Messages</h1><Link href="/home?section=search">New message</Link></header>
  <label htmlFor="cc-chat-search">Search conversations</label><input id="cc-chat-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search people" style={{width:'100%',padding:12,borderRadius:12}}/>
  {loading?<p role="status">Loading conversations…</p>:error?<p role="alert">{error}</p>:visible.length===0?<p>{query?'No matching conversations.':'No conversations yet. Find a campus member to start chatting.'}</p>:
   <ul style={{listStyle:'none',padding:0}}>{visible.map(c=><li key={c.handle}><Link href={'/messages/'+encodeURIComponent(c.handle)} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 4px',borderBottom:'1px solid var(--cc-border,#7773)',textDecoration:'none',color:'inherit'}}>
   <Avatar user={{name:c.name,handle:c.handle,avatarMediaId:c.avatarMediaId,avatarUrl:c.avatarUrl}} size={44}/>
   <span style={{minWidth:0,flex:1}}><strong>{c.name||c.handle}</strong><small style={{display:'block',opacity:.75}}>@{c.handle}</small><span style={{display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.preview||'Start a conversation'}</span></span>
   {c.updatedAt&&<time dateTime={c.updatedAt} style={{fontSize:12,opacity:.7}}>{new Date(c.updatedAt).toLocaleDateString()}</time>}
   </Link></li>)}</ul>}
 </section>
}
