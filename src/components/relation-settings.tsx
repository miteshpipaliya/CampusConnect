'use client';
import {useCallback,useEffect,useState} from 'react';
export function RelationSettings({kind}:{kind:'blocks'|'mutes'|'close-friends'}){
 const [items,setItems]=useState<Array<{handle:string}>>([]),[handle,setHandle]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const refresh=useCallback(async()=>{const r=await fetch('/api/'+kind,{cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error||'Unavailable');setItems(d.items)},[kind]);
 useEffect(()=>{void refresh().catch(e=>setError(String(e)))},[refresh]);
 async function change(method:'POST'|'DELETE',name:string){setBusy(true);setError('');try{const r=await fetch('/api/'+kind,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify({handle:name})});const d=await r.json();if(!r.ok)throw Error(d.error||'Unable to update');await refresh();setHandle('');if(kind==='blocks'&&d.streamSynced===false)setError('Block saved locally. Stream Chat has not yet confirmed synchronization.')}catch(e){setError(String(e))}finally{setBusy(false)}}
 return <section style={{display:'grid',gap:14,padding:20}}><h2>{kind.replaceAll('-',' ')}</h2><form onSubmit={e=>{e.preventDefault();void change('POST',handle)}}><input aria-label="Campus username" required pattern="[a-z][a-z0-9._]{2,29}" placeholder="Campus username" value={handle} onChange={e=>setHandle(e.target.value.toLowerCase())}/><button disabled={busy} type="submit">Add</button></form>{items.map(item=><div key={item.handle} style={{display:'flex',justifyContent:'space-between'}}><span>@{item.handle}</span><button disabled={busy} onClick={()=>void change('DELETE',item.handle)}>Remove</button></div>)}{error&&<p role="alert">{error}</p>}</section>
}
