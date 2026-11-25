'use client';
import {clearPwaDevice} from '@/lib/client/pwa-device';
import {useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
export function SessionActions(){
 const queryClient=useQueryClient();
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function logout(everywhere:boolean){
  setBusy(true);setError('');
  try{
   const r=await fetch(everywhere?'/api/account/sessions':'/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(everywhere?{}:{action:'logout'})});
   const d=await r.json();if(!r.ok)throw Error(d.error||'Sign-out failed');
   queryClient.clear();await clearPwaDevice();
   window.location.assign('/login');
  }catch(e){setError(String(e));setBusy(false)}
 }
 return <section style={{padding:20,display:'grid',gap:12}}><h2>Sign out</h2><button type="button" disabled={busy} onClick={()=>void logout(false)}>Sign out of this device</button><button type="button" disabled={busy} onClick={()=>void logout(true)}>Sign out of all devices</button>{error&&<p role="alert">{error}</p>}</section>;
}
