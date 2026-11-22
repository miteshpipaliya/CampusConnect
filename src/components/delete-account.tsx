'use client';
import {useState} from 'react';
export function DeleteAccount(){const [handle,setHandle]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(){if(!confirm('Request account deletion and sign out?'))return;setBusy(true);setError('');try{const r=await fetch('/api/account',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirmHandle:handle})});const d=await r.json();if(!r.ok)throw Error(d.error||'Unable to delete');window.location.assign('/login')}catch(e){setError(String(e))}finally{setBusy(false)}}
 return <section style={{padding:20,display:'grid',gap:16}}><h2>Delete account</h2><p>This disables your account immediately. After a 30-day retention period, the scheduled cleanup will permanently purge your data when enabled by the site operator. This action disables sign-in immediately.</p><label>Type your exact username<input value={handle} onChange={e=>setHandle(e.target.value)} /></label><button disabled={busy||handle.length<3} onClick={()=>void submit()}>Request account deletion</button>{error&&<p role="alert">{error}</p>}</section>
}
