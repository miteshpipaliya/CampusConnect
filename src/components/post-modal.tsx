'use client';
import {useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import {useRouter} from 'next/navigation';
import {LivePostDetail} from './live-post-detail';
import '@/app/post-modal-upgrade.css';
export function PostModal({id}:{id:string}){
 const router=useRouter(),close=useRef<HTMLButtonElement>(null),panel=useRef<HTMLElement>(null);
 useEffect(()=>{const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';close.current?.focus({preventScroll:true});
  const handle=(e:KeyboardEvent)=>{if(e.key==='Escape'){if(document.querySelectorAll('[role="dialog"]').length<=1)router.back();return}if(e.key==='Tab'){const nodes=Array.from(panel.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),[tabindex="0"]')||[]).filter(el=>el.getClientRects().length);const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}};
  window.addEventListener('keydown',handle);return()=>{window.removeEventListener('keydown',handle);document.body.style.overflow=overflow;previous?.focus({preventScroll:true})}
 },[router]);
 if(typeof document==='undefined')return null;
 return createPortal(<div className="cc-post-modal-backdrop cc-post-modal-v2" role="presentation" onClick={()=>router.back()}>
   <section ref={panel} className="cc-post-modal-panel" role="dialog" aria-modal="true" aria-label="Post detail" onClick={e=>e.stopPropagation()}>
    <button ref={close} type="button" className="cc-post-modal-close" onClick={()=>router.back()} aria-label="Close post detail">×</button>
    <LivePostDetail key={id} id={id} modal/>
   </section>
 </div>,document.body);
}
