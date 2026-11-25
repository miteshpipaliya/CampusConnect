'use client';
import {PanelErrorBoundary} from '@/components/panel-error-boundary';

import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {useRouter} from 'next/navigation';
import {useShellUid} from './shell-session';
import {exploreIds} from '@/lib/client/explore-neighbors';
import {neighbors} from '@/lib/core/explore-neighbors';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import {LivePostDetail} from './live-post-detail';
import '@/app/post-modal-upgrade.css';
export function PostModal({id}:{id:string}){
 const uid=useShellUid();const [current,setCurrent]=useState(id),[ids,setIds]=useState<string[]>([]);useEffect(()=>{setCurrent(id)},[id]);useEffect(()=>{setIds(exploreIds(uid))},[uid]);
 const adjacent=neighbors(ids,current);
 const [mounted,setMounted]=useState(false);useEffect(()=>setMounted(true),[]);
 const router=useRouter(),close=useRef<HTMLButtonElement>(null),panel=useRef<HTMLElement>(null);
 useEffect(()=>{if(!mounted)return;const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';close.current?.focus({preventScroll:true});
  const handle=(e:KeyboardEvent)=>{if(e.key==='Escape'){if(document.querySelectorAll('[role="dialog"]').length<=1)router.back();return}if(e.key==='Tab'&&document.querySelectorAll('[role="dialog"]').length<=1){const nodes=Array.from(panel.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),[tabindex="0"]')||[]).filter(el=>el.getClientRects().length);const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}};
  window.addEventListener('keydown',handle);return()=>{window.removeEventListener('keydown',handle);document.body.style.overflow=overflow;previous?.focus({preventScroll:true})}
 },[router,mounted]);
 if(!mounted)return null;
 return createPortal(<div className="cc-post-modal-backdrop cc-post-modal-v2" role="presentation" onClick={()=>router.back()}>
   <section ref={panel} className="cc-post-modal-panel" role="dialog" aria-modal="true" aria-label="Post detail" onClick={e=>e.stopPropagation()}>
    <button ref={close} type="button" className="cc-post-modal-close" onClick={()=>router.back()} aria-label="Close post detail">×</button>
    {adjacent.previous&&<button type="button" className="cc-modal-neighbor previous" aria-label="Previous post" onClick={()=>setCurrent(adjacent.previous!)}><ChevronLeft/></button>}
    {adjacent.next&&<button type="button" className="cc-modal-neighbor next" aria-label="Next post" onClick={()=>setCurrent(adjacent.next!)}><ChevronRight/></button>}
    <PanelErrorBoundary key={current} label="Post"><LivePostDetail key={current} id={current} modal/></PanelErrorBoundary>
   </section>
 </div>,document.body);
}
