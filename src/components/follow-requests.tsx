'use client';
import {useEffect,useState} from 'react';
type Request={uid:string;handle:string;name:string};
export function FollowRequests(){
 const [items,setItems]=useState<Request[]>([]),[busy,setBusy]=useState(''),[error,setError]=useState('');
 async function refresh(){const r=await fetch('/api/follow-requests',{cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error||'Unable to load requests');setItems(d.requests)}
 useEffect(()=>{void refresh().catch(e=>setError(String(e)))},[]);
 async function respond(uid:string,action:'accept'|'decline'){setBusy(uid);setError('');try{const r=await fetch('/api/follow-requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uid,action})});const d=await r.json();if(!r.ok)throw Error(d.error||'Request failed');await refresh()}catch(e){setError(String(e))}finally{setBusy('')}}
 return <section style={{padding:20}}><h2>Follow requests</h2>{items.length===0?<p>No pending requests.</p>:items.map(item=><div key={item.uid} style={{display:'flex',alignItems:'center',gap:12,padding:12}}><span><strong>@{item.handle}</strong> {item.name}</span><button disabled={busy===item.uid} onClick={()=>void respond(item.uid,'accept')}>Accept</button><button disabled={busy===item.uid} onClick={()=>void respond(item.uid,'decline')}>Decline</button></div>)}{error&&<p role="alert">{error}</p>}</section>;
}
