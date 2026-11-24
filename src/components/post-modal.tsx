'use client';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {LivePostDetail} from './live-post-detail';
export function PostModal({id}:{id:string}){
 const router=useRouter();
 useEffect(()=>{
  const handle=(e:KeyboardEvent)=>{if(e.key==='Escape')router.back()};
  window.addEventListener('keydown',handle);return()=>window.removeEventListener('keydown',handle);
 },[router]);
 return <div className="cc-post-modal-backdrop" role="presentation" onClick={()=>router.back()}>
   <section className="cc-post-modal-panel" role="dialog" aria-modal="true" aria-label="Post detail" onClick={e=>e.stopPropagation()}>
    <button type="button" className="cc-post-modal-close" onClick={()=>router.back()} aria-label="Close post detail">×</button>
    <LivePostDetail id={id}/>
   </section>
 </div>;
}
