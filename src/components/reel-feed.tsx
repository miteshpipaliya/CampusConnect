'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {ReelCard,type Reel} from './reel-card';
import {dedupeReels} from '@/lib/core/reel-views';
export function ReelFeed(){
 const [reels,setReels]=useState<Reel[]>([]),[cursor,setCursor]=useState<string|null>(null),[loading,setLoading]=useState(true),[more,setMore]=useState(false),[active,setActive]=useState(0),[muted,setMuted]=useState(true),[error,setError]=useState('');
 const scroller=useRef<HTMLDivElement>(null),end=useRef<HTMLDivElement>(null),fetching=useRef(false);
 const load=useCallback(async(next?:string)=>{
  if(fetching.current)return;fetching.current=true;setError('');if(next)setMore(true);else setLoading(true);
  try{
   const response=await fetch('/api/reels?limit=10'+(next?'&cursor='+encodeURIComponent(next):''),{cache:'no-store'});
   const result=await response.json();if(!response.ok)throw Error(result.error||'Reels unavailable');
   const items:Array<Reel>=Array.isArray(result.reels)?result.reels:[];
   setReels(old=>next?dedupeReels(old,items):items);
   setCursor(typeof result.nextCursor==='string'?result.nextCursor:null);
  }catch(e){setError(e instanceof Error?e.message:'Reels unavailable')}finally{fetching.current=false;setLoading(false);setMore(false)}
 },[]);
 useEffect(()=>{void load()},[load]);
 useEffect(()=>{
  const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)&&cursor&&!fetching.current)void load(cursor)},{root:scroller.current,rootMargin:'500px'});
  if(end.current)observer.observe(end.current);return()=>observer.disconnect();
 },[cursor,load]);
 const onScroll=()=>{
  const el=scroller.current;if(!el)return;
  const cards=Array.from(el.querySelectorAll<HTMLElement>('[data-reel-card]'));
  const center=el.scrollTop+el.clientHeight/2;
  const idx=cards.findIndex(node=>node.offsetTop<=center&&node.offsetTop+node.offsetHeight>=center);
  if(idx>=0)setActive(idx);
 };
 useEffect(()=>{const handle=(e:KeyboardEvent)=>{if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)return;
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const delta=e.key==='ArrowDown'?1:-1;scroller.current?.querySelectorAll<HTMLElement>('[data-reel-card]')[Math.max(0,Math.min(reels.length-1,active+delta))]?.scrollIntoView({behavior:'smooth',block:'start'})}
 };window.addEventListener('keydown',handle);return()=>window.removeEventListener('keydown',handle)},[active,reels.length]);
 if(loading&&!reels.length)return <section className="cc-reel-empty">Loading Reels…</section>;
 return <section aria-label="Campus Reels" className="cc-reel-page">
  {error&&<p role="alert" className="cc-reel-error">{error} <button onClick={()=>void load(cursor??undefined)}>Retry</button></p>}
  <div className="cc-reel-feed" ref={scroller} onScroll={onScroll}>
   {!reels.length?<div className="cc-reel-empty">No campus Reels yet. Create a Reel to get started.</div>:reels.map((r,i)=><ReelCard key={r.id} reel={r} active={i===active} muted={muted} onMute={setMuted}/>)}
   <div ref={end} className="cc-reel-end">{more&&'Loading more Reels…'}{!cursor&&reels.length>0&&'You are all caught up'}</div>
  </div>
 </section>;
}
