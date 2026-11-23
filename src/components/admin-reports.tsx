'use client';
import {useEffect,useState} from 'react';
type Report={id:string;targetType:string;targetId:string;reason:string;details?:string;status:string;createdAt:string|null};
export function AdminReports(){
 const [items,setItems]=useState<Report[]>([]),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const load=async()=>{const r=await fetch('/api/admin/reports',{cache:'no-store'}),d=await r.json();if(!r.ok)throw Error(d.error||'Unavailable');setItems(d.items||[])};
 useEffect(()=>{void load().catch(e=>setError(e instanceof Error?e.message:'Moderation unavailable'))},[]);
 async function act(id:string,action:'dismiss'|'remove-content'|'disable-account'){
  if(action!=='dismiss'&&!window.confirm('Confirm moderation action: '+action+'?'))return;
  setBusy(true);setError('');
  try{const r=await fetch('/api/admin/reports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,action})}),d=await r.json();if(!r.ok)throw Error(d.error||'Action unavailable');setNotice(action+' completed');await load()}
  catch(e){setError(e instanceof Error?e.message:'Action failed')}finally{setBusy(false)}
 }
 return <section style={{padding:24,maxWidth:900,margin:'0 auto'}}><h1>Campus moderation</h1>{error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  {items.length===0?<p>No open reports.</p>:items.map(item=><article key={item.id} style={{padding:16,border:'1px solid #494958',borderRadius:10,margin:'12px 0'}}>
   <strong>{item.targetType} · {item.reason}</strong><p>{item.details||'No additional details'}</p><small>Target: {item.targetId}</small>
   <div style={{display:'flex',gap:10,marginTop:10}}>
    <button disabled={busy} onClick={()=>void act(item.id,'dismiss')}>Dismiss</button>
    {item.targetType!=='user'&&<button disabled={busy} onClick={()=>void act(item.id,'remove-content')}>Remove content</button>}
    {item.targetType==='user'&&<button disabled={busy} onClick={()=>void act(item.id,'disable-account')}>Disable account</button>}
   </div>
  </article>)}
 </section>;
}
