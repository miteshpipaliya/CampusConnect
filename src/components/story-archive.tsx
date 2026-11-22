'use client';
import {useEffect,useState} from 'react';
type Entry={id:string;caption:string;mediaUrl:string|null;createdAt:number};
export function StoryArchive(){
 const [items,setItems]=useState<Entry[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{void fetch('/api/archive',{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'Archive unavailable');setItems(d.items)}).catch(e=>setError(String(e))).finally(()=>setLoading(false))},[]);
 return <section style={{padding:20}}><h2>Story archive</h2><p>Expired stories in your archive are visible only to you.</p>{error&&<p role="alert">{error}</p>}{loading?<p>Loading…</p>:!items.length?<p>No archived stories.</p>:<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:12}}>{items.map(x=><article key={x.id}>{x.mediaUrl&&<img src={x.mediaUrl} loading="lazy" alt={x.caption||'Archived story'} style={{width:'100%',aspectRatio:'9/16',objectFit:'cover'}}/>}<p>{x.caption}</p></article>)}</div>}</section>;
}
