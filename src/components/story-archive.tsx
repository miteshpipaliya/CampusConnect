'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
type Entry={id:string;caption:string;mediaUrl:string|null;contentType:string;createdAt:number};
export function StoryArchive(){
 const [items,setItems]=useState<Entry[]>([]),[title,setTitle]=useState(''),[selected,setSelected]=useState<string[]>([]),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const load=async()=>{
  const r=await fetch('/api/archive',{cache:'no-store'}),d=await r.json();
  if(!r.ok)throw Error(d.error||'Archive unavailable');setItems(Array.isArray(d.items)?d.items:[]);
 };
 useEffect(()=>{let alive=true;void fetch('/api/archive',{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'Archive unavailable');if(alive)setItems(Array.isArray(d.items)?d.items:[])}).catch(e=>{if(alive)setError(String(e))}).finally(()=>{if(alive)setLoading(false)});return()=>{alive=false}},[]);
 const toggle=(id:string)=>setSelected(old=>old.includes(id)?old.filter(x=>x!==id):old.length<50?[...old,id]:old);
 async function create(){
  if(!title.trim()||!selected.length||busy)return;
  setError('');setNotice('');setBusy(true);
  try{
   const response=await fetch('/api/highlights',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:title.trim(),storyIds:selected})});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Unable to create highlight');
   setTitle('');setSelected([]);setNotice('Highlight created. It is now visible on your profile.');await load();
  }catch(e){setError(e instanceof Error?e.message:'Unable to create highlight')}
  finally{setBusy(false)}
 }
 return <section style={{padding:20}}><h2>Story archive</h2><p>Expired stories are private to you until you add them to a highlight.</p>
  {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice} <Link href="/profile/me">View profile</Link></p>}
  {loading?<p>Loading…</p>:!items.length?<p>No archived stories.</p>:<>
   <form onSubmit={e=>{e.preventDefault();void create()}} style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
    <input aria-label="Highlight name" required value={title} maxLength={40} placeholder="New highlight name" onChange={e=>setTitle(e.target.value)} />
    <button disabled={busy||!selected.length||!title.trim()}>Create highlight ({selected.length}/50 selected)</button>
   </form>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:12}}>
    {items.map(entry=><label key={entry.id} style={{display:'grid',gap:5,cursor:'pointer',border:selected.includes(entry.id)?'2px solid #9374fc':'2px solid transparent',borderRadius:12,overflow:'hidden'}}>
     {entry.mediaUrl?(entry.contentType.startsWith('video/')?<video src={entry.mediaUrl} playsInline muted preload="metadata" style={{width:'100%',aspectRatio:'9/16',objectFit:'cover'}}/>:<img src={entry.mediaUrl} loading="lazy" alt={entry.caption||'Archived story'} style={{width:'100%',aspectRatio:'9/16',objectFit:'cover'}}/>):<span>Media unavailable</span>}
     <span><input type="checkbox" checked={selected.includes(entry.id)} onChange={()=>toggle(entry.id)} disabled={!selected.includes(entry.id)&&selected.length>=50}/> {entry.caption||new Date(entry.createdAt).toLocaleDateString()}</span>
    </label>)}
   </div>
  </>}
 </section>;
}
