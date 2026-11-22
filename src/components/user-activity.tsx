'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
type Item={type:'like'|'repost'|'comment';postId:string;commentId:string|null;text:string;createdAt:number};
export function UserActivity(){
 const [items,setItems]=useState<Item[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(''),[loading,setLoading]=useState(true);
 async function refresh(){const r=await fetch('/api/activity',{cache:'no-store'}),d=await r.json();if(!r.ok)throw Error(d.error||'Activity unavailable');setItems(d.items)}
 useEffect(()=>{void refresh().catch(e=>setError(String(e))).finally(()=>setLoading(false))},[]);
 async function undo(item:Item){
  const key=item.type+item.postId+item.commentId;setBusy(key);setError('');
  try{
   const url=item.type==='comment'?'/api/posts/'+encodeURIComponent(item.postId)+'/comments?commentId='+encodeURIComponent(item.commentId||''):item.type==='like'?'/api/posts/'+encodeURIComponent(item.postId)+'/likes':'/api/reposts';
   const r=await fetch(url,{method:item.type==='comment'?'DELETE':'POST',...(item.type==='repost'?{headers:{'Content-Type':'application/json'},body:JSON.stringify({postId:item.postId})}:{})});
   const d=await r.json();if(!r.ok)throw Error(d.error||'Unable to remove activity');await refresh();
  }catch(e){setError(String(e))}finally{setBusy('')}
 }
 return <section style={{padding:20}}><h2>Your activity</h2><p>Only you can view or remove your likes, reposts and comments.</p>{loading?<p>Loading…</p>:error&&<p role="alert">{error}</p>}
 {!loading&&(items.length?<ul style={{display:'grid',gap:12}}>{items.map((item,i)=><li key={item.type+item.postId+item.commentId+i} style={{display:'flex',gap:12,alignItems:'center',justifyContent:'space-between'}}><Link href={'/posts/'+encodeURIComponent(item.postId)}>{item.type==='like'?'Liked':item.type==='repost'?'Reposted':'Commented on'} a post {item.text&&'— '+item.text}</Link><button type="button" disabled={busy===item.type+item.postId+item.commentId} onClick={()=>void undo(item)}>Remove</button></li>)}</ul>:<p>No recent activity.</p>)}</section>;
}
