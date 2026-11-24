'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {Avatar} from '../avatar';
import {useStreamConnection} from './stream-connection';
import {unreadConversations} from '@/lib/core/chat-activity';
type Row={handle:string;name:string;avatarUrl:string|null;avatarMediaId:string|null;channelId:string;preview:string;unreadCount?:number};
export function LiveMessageActivity({onUnread,onRecent}:{onUnread:(n:number|null)=>void;onRecent:(rows:Row[])=>void}){
 const {client,status,userId}=useStreamConnection(),[toast,setToast]=useState<Row|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>{if(!client||status!=='connected'||!userId){onUnread(null);return}let live=true,seq=0;const refresh=async(cid?:string)=>{const current=++seq;try{const r=await fetch('/api/chat',{cache:'no-store'});if(!r.ok)return;const d=await r.json();if(!live||current!==seq||!Array.isArray(d.conversations))return;const rows=d.conversations as Row[];onUnread(unreadConversations(rows));onRecent(rows.slice(0,3));const row=cid?rows.find(c=>'messaging:'+c.channelId===cid&&(c.unreadCount??0)>0):undefined;if(row&&window.location.pathname!=='/messages/'+encodeURIComponent(row.handle)&&!document.hidden){setToast(row);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>setToast(null),4000)}}catch{/* preserve last authorized state */}};
 const changed=()=>{void refresh()};const incoming=(event:{cid?:string;user?:{id?:string};message?:{user?:{id?:string}}})=>{void refresh((event.message?.user?.id||event.user?.id)===userId?undefined:event.cid)};
 const subs=[client.on('notification.message_new',incoming),client.on('message.new',incoming),client.on('notification.mark_read',changed),client.on('notification.added_to_channel',changed),client.on('channel.updated',changed),client.on('connection.recovered',changed)];void refresh();return()=>{live=false;subs.forEach(s=>s.unsubscribe());if(timer.current)clearTimeout(timer.current);setToast(null)}},[client,status,userId,onUnread,onRecent]);
 return toast?<Link className="cc-live-message-toast" role="status" href={'/messages/'+encodeURIComponent(toast.handle)} onClick={()=>setToast(null)}><Avatar user={toast} size={44}/><span><b>{toast.name}</b><small>{toast.preview||'New message'}</small></span></Link>:null
}
