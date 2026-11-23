'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {ChevronUp,ChevronDown} from 'lucide-react';
import {ReelCard,type Reel} from './reel-card';
import {dedupeReels} from '@/lib/core/reel-views';
const REFRESH_MS=8000;
type Page={reels:Reel[];nextCursor:string|null};

export function ReelFeed(){
 const [reels,setReels]=useState<Reel[]>([]),[cursor,setCursor]=useState<string|null>(null),
 [loading,setLoading]=useState(true),[more,setMore]=useState(false),[active,setActive]=useState(0),
 [muted,setMuted]=useState(true),[error,setError]=useState(''),[newReels,setNewReels]=useState(false);
 const scroller=useRef<HTMLDivElement>(null),end=useRef<HTMLDivElement>(null),fetching=useRef(false);
 const itemsRef=useRef<Reel[]>([]);itemsRef.current=reels;
 const load=useCallback(async(next?:string)=>{
  if(fetching.current)return;fetching.current=true;setError('');
  if(next)setMore(true);else if(!itemsRef.current.length)setLoading(true);
  try{
   const response=await fetch('/api/reels?limit=10'+(next?'&cursor='+encodeURIComponent(next):''),{cache:'no-store'});
   const result:unknown=await response.json().catch(()=>null);
   if(!response.ok||!result||typeof result!=='object')throw Error(result&&typeof result==='object'&&'error'in result?String(result.error):'Reels unavailable');
   const data=result as Page,items=Array.isArray(data.reels)?data.reels:[];
   setReels(old=>next?dedupeReels(old,items):items);
   setCursor(typeof data.nextCursor==='string'?data.nextCursor:null);
   setNewReels(false);
  }catch(e){setError(e instanceof Error?e.message:'Reels unavailable')}
  finally{fetching.current=false;setLoading(false);setMore(false)}
 },[]);
 useEffect(()=>{void load()},[load]);
 const refresh=useCallback(async()=>{
  if(fetching.current||document.visibilityState!=='visible')return;
  try{
   const response=await fetch('/api/reels?limit=10',{cache:'no-store'});
   if(!response.ok)return;
   const data=await response.json() as Page;
   const incoming=Array.isArray(data.reels)?data.reels:[];
   if(!incoming.length)return;
   const existing=itemsRef.current;
   const hasUnseen=incoming.some(item=>!existing.some(old=>old.id===item.id));
   if(!existing.length){setReels(incoming);setCursor(data.nextCursor??null);setError('');return}
   if(hasUnseen){
    if((scroller.current?.scrollTop??0)<80){
     setReels(old=>dedupeReels(incoming,old));
     setActive(0);
    }else setNewReels(true);
   }
  }catch{/* keep existing feed available during transient network errors */}
 },[]);
 useEffect(()=>{
  const timer=window.setInterval(()=>{void refresh()},REFRESH_MS);
  const focus=()=>{void refresh()};
  document.addEventListener('visibilitychange',focus);
  window.addEventListener('focus',focus);
  window.addEventListener('campusconnect:reel-published',focus);
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',focus);window.removeEventListener('focus',focus);window.removeEventListener('campusconnect:reel-published',focus)};
 },[refresh]);
 useEffect(()=>{
  const observer=new IntersectionObserver(entries=>{
   if(entries.some(e=>e.isIntersecting)&&cursor&&!fetching.current)void load(cursor);
  },{root:scroller.current,rootMargin:'350px'});
  if(end.current)observer.observe(end.current);
  return()=>observer.disconnect();
 },[cursor,load]);
 function navigate(delta:number){
  const next=Math.max(0,Math.min(reels.length-1,active+delta));
  const card=scroller.current?.querySelectorAll<HTMLElement>('[data-reel-card]')[next];
  card?.scrollIntoView({behavior:'smooth',block:'start'});
  setActive(next);
 }
 function onScroll(){
  const el=scroller.current;if(!el)return;
  const middle=el.scrollTop+el.clientHeight/2;
  const cards=Array.from(el.querySelectorAll<HTMLElement>('[data-reel-card]'));
  const index=cards.findIndex(x=>x.offsetTop<=middle&&x.offsetTop+x.offsetHeight>=middle);
  if(index>=0)setActive(index);
 }
 useEffect(()=>{
  const handle=(e:KeyboardEvent)=>{
   if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)return;
   if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();navigate(e.key==='ArrowDown'?1:-1)}
  };
  window.addEventListener('keydown',handle);return()=>window.removeEventListener('keydown',handle);
 },[active,reels.length]);
 useEffect(()=>{
  if(!reels.length)return;
  const target=new URLSearchParams(window.location.search).get('reel');
  if(!target)return;
  const index=reels.findIndex(x=>x.id===target);
  if(index>=0){
   scroller.current?.querySelectorAll<HTMLElement>('[data-reel-card]')[index]?.scrollIntoView({block:'start'});
   setActive(index);
   window.history.replaceState(null,'','/reels');
  }
 },[reels.length]);
 return <section aria-label="Campus Reels" className="cc-reel-page">
  {newReels&&<button type="button" className="cc-reel-new" onClick={()=>{setNewReels(false);setActive(0);scroller.current?.scrollTo({top:0});void load()}}>New Reels — Show</button>}
  {error&&<p role="alert" className="cc-reel-error">{error} <button type="button" onClick={()=>void load()}>Retry</button></p>}
  <div className="cc-reel-feed" ref={scroller} onScroll={onScroll}>
   {loading&&!reels.length?<div className="cc-reel-empty">Loading campus Reels…</div>:
    !reels.length&&!error?<div className="cc-reel-empty">No campus Reels yet. Publish a video to start the feed.</div>:
    reels.map((reel,index)=><ReelCard key={reel.id} reel={reel} active={index===active} muted={muted} onMute={setMuted}/>)}
   <div ref={end} className="cc-reel-end">{more?'Loading more Reels…':!cursor&&reels.length>0?'You are all caught up':''}</div>
  </div>
  {reels.length>1&&<nav className="cc-reel-nav" aria-label="Navigate Reels">
   <button type="button" aria-label="Previous Reel" disabled={active<=0} onClick={()=>navigate(-1)}><ChevronUp size={23}/></button>
   <button type="button" aria-label="Next Reel" disabled={active>=reels.length-1} onClick={()=>navigate(1)}><ChevronDown size={23}/></button>
  </nav>}
 </section>;
}
