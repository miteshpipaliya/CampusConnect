'use client';
import {SafeImg} from '@/components/safe-img';
import {useEffect,useState} from 'react';
import Link from 'next/link';
type Item={id:string;title:string;coverUrl:string|null;coverContentType:string;storyCount:number};
export function ProfileHighlights({handle,self}:{handle:string;self:boolean}){
 const [items,setItems]=useState<Item[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const load=async()=>{
  const r=await fetch('/api/highlights?handle='+encodeURIComponent(handle),{cache:'no-store'});
  const d=await r.json();if(!r.ok)throw Error(d.error||'Highlights unavailable');
  setItems(Array.isArray(d.items)?d.items:[]);
 };
 useEffect(()=>{let alive=true;void fetch('/api/highlights?handle='+encodeURIComponent(handle),{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'Highlights unavailable');if(alive)setItems(Array.isArray(d.items)?d.items:[])}).catch(e=>{if(alive)setError(String(e))});return()=>{alive=false}},[handle]);
 async function remove(id:string){
  if(!window.confirm('Remove this highlight from your profile? Your archived stories will remain.'))return;
  setBusy(true);setError('');
  try{const r=await fetch('/api/highlights/'+encodeURIComponent(id),{method:'DELETE'});if(!r.ok)throw Error((await r.json()).error||'Removal failed');await load()}
  catch(e){setError(e instanceof Error?e.message:'Could not remove highlight')}
  finally{setBusy(false)}
 }
 if(!self&&!items.length&&!error)return null;
 return <section className="cc-profile-highlights" aria-label="Story highlights">
  <h2>Story highlights</h2>
  {error&&<p role="alert">{error}</p>}
  <div className="cc-profile-highlight-row">
  {items.map(h=><div className="cc-profile-highlight" key={h.id}>
    <Link href={'/highlights/'+encodeURIComponent(h.id)} aria-label={'View '+h.title+' highlight'}>
     <span className="cc-profile-highlight-circle">{h.coverUrl?(h.coverContentType.startsWith('video/')?<video src={h.coverUrl} muted playsInline preload="metadata" aria-label={h.title} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<SafeImg src={h.coverUrl} loading="lazy" alt={h.title}/>):<span aria-hidden="true">◌</span>}</span>
    </Link>
    <small>{h.title} ({h.storyCount})</small>
    {self&&<button disabled={busy} type="button" onClick={()=>void remove(h.id)}>Remove</button>}
   </div>)}
  {self&&<Link className="cc-profile-highlight" href="/settings/archive"><span className="cc-profile-highlight-circle" aria-hidden="true">+</span><small>New highlight</small></Link>}
  </div>
 </section>;
}
