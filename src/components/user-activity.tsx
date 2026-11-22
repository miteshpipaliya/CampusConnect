'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
type Item={type:'like'|'repost'|'comment';postId:string;text:string;createdAt:number};
export function UserActivity(){
 const [items,setItems]=useState<Item[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{void fetch('/api/activity',{cache:'no-store'}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error||'Activity unavailable');setItems(data.items)}).catch(e=>setError(String(e))).finally(()=>setLoading(false))},[]);
 return <section style={{padding:20}}><h2>Your activity</h2><p>Only you can see this history of likes, reposts and comments.</p>{loading?<p>Loading…</p>:error?<p role="alert">{error}</p>:items.length?<ul>{items.map((item,i)=><li key={item.type+item.postId+i}><Link href={'/posts/'+encodeURIComponent(item.postId)}>{item.type==='like'?'Liked':item.type==='repost'?'Reposted':'Commented on'} a post {item.text&&'— '+item.text}</Link></li>)}</ul>:<p>No recent activity.</p>}</section>;
}
