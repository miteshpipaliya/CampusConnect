'use client';
import {useEffect,useRef,useState} from 'react';
type Preview={url:string;expiresAt:number};
export function usePreviewBatch(uid:string|null,enabled:boolean,version:string){
 const grid=useRef<HTMLDivElement>(null);
 const [state,setState]=useState<{uid:string;items:Record<string,Preview>}|null>(null);
 useEffect(()=>{
  const root=grid.current;if(!uid||!enabled||!root)return;const accountUid=uid;
  let active=true,busy=false,timer:ReturnType<typeof setTimeout>|undefined;
  const pending=new Set<string>(),sent=new Set<string>(),controller=new AbortController();
  const schedule=()=>{if(active&&!busy&&pending.size&&timer===undefined)timer=setTimeout(()=>{timer=undefined;void flush()},200)};
  async function flush(){
   if(!active||busy||!pending.size)return;busy=true;
   const ids=[...pending].slice(0,12);ids.forEach(id=>{pending.delete(id);sent.add(id)});
   try{
    const response=await fetch('/api/explore/previews',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids}),cache:'no-store',signal:controller.signal});
    if(!response.ok)return;
    const body=await response.json() as {previews?:Record<string,Preview>};
    const entries=ids.flatMap(id=>{const value=body.previews?.[id];return value&&typeof value.url==='string'&&value.url.startsWith('https://')&&typeof value.expiresAt==='number'&&value.expiresAt>Date.now()?[[id,value] as const]:[]});
    if(active)setState(old=>({uid:accountUid,items:{...(old?.uid===accountUid?old.items:{}),...Object.fromEntries(entries)}}));
   }catch{/* The authenticated per-media endpoint remains the fallback. */}
   finally{busy=false;schedule()}
  }
  const observer=new IntersectionObserver(entries=>{for(const entry of entries){const id=(entry.target as HTMLElement).dataset.previewId;if(id&&entry.isIntersecting&&!sent.has(id))pending.add(id);else if(id&&!entry.isIntersecting)pending.delete(id)}schedule()},{rootMargin:'80px'});
  root.querySelectorAll('[data-preview-id]').forEach(node=>observer.observe(node));
  return()=>{active=false;observer.disconnect();controller.abort();if(timer!==undefined)clearTimeout(timer)};
 },[uid,enabled,version]);
 return {grid,previews:state?.uid===uid?state.items:{}};
}
