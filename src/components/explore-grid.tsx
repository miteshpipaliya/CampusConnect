'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';import {Clapperboard,Images} from 'lucide-react';
export type ExploreItem={id:string;caption:string;type:string;authorHandle:string;mediaUrl:string|null;mediaType:string;likes:number;comments:number;mediaCount:number};
export function ExploreGrid({tag,sort}:{tag?:string;sort?:string}){
 const [items,setItems]=useState<ExploreItem[]>([]),[cursor,setCursor]=useState<string|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const last=useRef<HTMLDivElement>(null),inflight=useRef(false);
 const load=useCallback(async(next?:string)=>{
  if(inflight.current)return;inflight.current=true;setBusy(true);if(!next)setLoading(true);setError('');
  const path=tag?'/api/explore/tags/'+encodeURIComponent(tag):'/api/explore';
  const qs=new URLSearchParams();if(next)qs.set('cursor',next);if(sort)qs.set('sort',sort);
  try{const r=await fetch(path+'?'+qs.toString(),{cache:'no-store'}),d=await r.json();if(!r.ok)throw Error(d.error||'Explore unavailable');
   const incoming:ExploreItem[]=Array.isArray(d.items)?d.items:[];
   setItems(old=>next?[...new Map([...old,...incoming].map(i=>[i.id,i])).values()]:incoming);setCursor(typeof d.nextCursor==='string'?d.nextCursor:null)
  }catch(e){setError(e instanceof Error?e.message:'Unable to load Explore')}finally{inflight.current=false;setBusy(false);setLoading(false)}
 },[tag,sort]);
 useEffect(()=>{void load()},[load]);
 useEffect(()=>{const obs=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)&&cursor)void load(cursor)},{rootMargin:'450px'});
  if(last.current)obs.observe(last.current);return()=>obs.disconnect()
 },[cursor,load]);
 return <section className="cc-explore-section" aria-label={tag?'Hashtag posts':'Explore campus posts'}>
  {loading&&<div className="cc-explore-skeleton">Loading campus posts…</div>}
  {error&&<p role="alert">{error} <button onClick={()=>void load(cursor??undefined)}>Retry</button></p>}
  {!loading&&!items.length&&<p>No accessible campus posts yet.</p>}
  <div className="cc-explore-grid">{items.map((post,i)=><Link key={post.id} className={post.type==='reel'&&i%10===0?'cc-explore-tile cc-explore-large':'cc-explore-tile'} href={post.type==='reel'?'/reels':'/posts/'+encodeURIComponent(post.id)} aria-label={post.caption||'Open campus post'}>
   {post.mediaUrl?(post.mediaType.startsWith('video/')?<video src={post.mediaUrl} preload="metadata" muted playsInline/>:<img loading="lazy" src={post.mediaUrl} alt={post.caption||'Campus post'}/>):<span>Media unavailable</span>}
   <span className="cc-explore-icon">{post.type==='reel'?<Clapperboard size={20}/>:post.mediaCount>1?<Images size={20}/>:null}</span>
   <span className="cc-explore-overlay">♥ {post.likes} &nbsp; ◉ {post.comments}</span>
  </Link>)}</div><div ref={last} className="cc-explore-end">{busy&&!loading?'Loading more…':!cursor&&items.length?'You are all caught up':''}</div>
 </section>;
}
