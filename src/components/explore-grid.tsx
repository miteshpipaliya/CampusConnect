'use client';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {HoverVideo,useLegacyPoster} from './explore/reel-preview';
import {rememberExploreIds} from '@/lib/client/explore-neighbors';
import {rememberExploreScroll,takeExploreScroll} from '@/lib/client/explore-scroll';
import {Heart,MessageCircle,Images,Play,Image as ImageIcon} from 'lucide-react';
import {useInfiniteQuery} from '@tanstack/react-query';
import {useShellUid} from './shell-session';
import {userKey} from '@/lib/queries';
export type ExploreItem={id:string;caption:string;type:string;authorHandle:string;thumbUrl?:string|null;previewUrl?:string|null;mediaUrl?:string|null;mediaType:string;likes:number;hideLikeCount?:boolean;comments:number;mediaCount:number;width?:number|null;height?:number|null};
type Page={items:ExploreItem[];nextCursor:string|null};
export function ExploreGrid({tag,sort}:{tag?:string;sort?:string}){
 const uid=useShellUid(),last=useRef<HTMLDivElement>(null),pathname=usePathname();
 const [hovered,setHovered]=useState<string|null>(null);const restore=useRef<number|null>(null);
 useEffect(()=>{setHovered(null)},[pathname]);
 useEffect(()=>{const stop=()=>setHovered(null);window.addEventListener('blur',stop);return()=>window.removeEventListener('blur',stop)},[]);
 const query=useInfiniteQuery({queryKey:userKey(uid,'explore-grid',tag||'',sort||''),enabled:Boolean(uid),initialPageParam:'',queryFn:async({pageParam,signal})=>{const qs=new URLSearchParams();if(pageParam)qs.set('cursor',pageParam);if(sort)qs.set('sort',sort);const r=await fetch((tag?'/api/explore/tags/'+encodeURIComponent(tag):'/api/explore')+'?'+qs.toString(),{cache:'no-store',signal});if(!r.ok)throw Error('Explore unavailable');return r.json() as Promise<Page>},getNextPageParam:page=>page.nextCursor||undefined,staleTime:30000});
 const {hasNextPage,isFetchingNextPage,fetchNextPage}=query;
 useEffect(()=>{const node=last.current;if(!node)return;const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)&&hasNextPage&&!isFetchingNextPage)void fetchNextPage()},{rootMargin:'450px'});observer.observe(node);return()=>observer.disconnect()},[hasNextPage,isFetchingNextPage,fetchNextPage]);
 const items=[...new Map((query.data?.pages.flatMap(p=>p.items)||[]).map(p=>[p.id,p])).values()];
 useLayoutEffect(()=>{if(uid&&pathname.startsWith('/explore'))restore.current=takeExploreScroll(uid,location.pathname+location.search)},[uid,pathname]);
 useLayoutEffect(()=>{if(query.isPending||restore.current===null||!pathname.startsWith('/explore'))return;const y=restore.current;const id=requestAnimationFrame(()=>{window.scrollTo(0,y);if(window.scrollY>=y-2||!hasNextPage)restore.current=null;else if(!isFetchingNextPage)void fetchNextPage()});return()=>cancelAnimationFrame(id)},[query.isPending,items.length,pathname,hasNextPage,isFetchingNextPage,fetchNextPage]);
 return <section className="cc-explore-section" aria-label={tag?'Hashtag posts':'Explore campus posts'}>
 {query.isError&&<p role="alert">Explore unavailable. <button onClick={()=>void query.refetch()}>Retry</button></p>}
 {!query.isPending&&!items.length&&!query.isError&&<p>No accessible campus posts yet.</p>}
 <div className="cc-explore-grid">{query.isPending?Array.from({length:12},(_,i)=><div key={i} className="cc-explore-tile cc-explore-placeholder" aria-hidden="true"/>):items.map(post=><ExploreTile key={post.id} post={post} hovered={hovered===post.id&&pathname.startsWith('/explore')} enabled={pathname.startsWith('/explore')} onHover={value=>setHovered(old=>value?post.id:old===post.id?null:old)} onOpen={()=>{setHovered(null);rememberExploreScroll(uid);rememberExploreIds(uid,items.filter(p=>p.type!=='reel').map(p=>p.id))}}/>)}
 </div><div ref={last} className="cc-explore-end">{isFetchingNextPage?<span aria-label="Fetching more posts" className="cc-explore-more-skeleton"/>:!hasNextPage&&items.length?'You are all caught up':''}</div></section>
}

function ExploreTile({post,hovered,enabled,onHover,onOpen}:{post:ExploreItem;hovered:boolean;enabled:boolean;onHover:(v:boolean)=>void;onOpen:()=>void}){
 const thumb=post.thumbUrl||(!post.mediaType.startsWith('video/')?post.mediaUrl:null),reel=post.type==='reel',src=reel?post.previewUrl||null:null;
 const legacy=useLegacyPoster(!thumb?src:null,enabled);const hoverTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const clear=()=>{if(hoverTimer.current!==null)clearTimeout(hoverTimer.current);hoverTimer.current=null};useEffect(()=>()=>{if(hoverTimer.current!==null)clearTimeout(hoverTimer.current)},[]);
 return <Link className="cc-explore-tile" href={reel?'/reels?start='+encodeURIComponent(post.id):'/posts/'+encodeURIComponent(post.id)} scroll={reel} aria-label={post.authorHandle+': '+(post.caption||'Open campus post')} onPointerEnter={event=>{if(event.pointerType==='mouse'&&src&&matchMedia('(hover: hover)').matches&&!matchMedia('(prefers-reduced-motion: reduce)').matches){clear();hoverTimer.current=setTimeout(()=>onHover(true),120)}}} onPointerLeave={()=>{clear();onHover(false)}} onClick={()=>{clear();onOpen()}}>
 <div ref={legacy.node} className="cc-explore-preview">{thumb||legacy.url?<img src={(thumb||legacy.url)!} width={post.width||300} height={post.height||400} loading="lazy" decoding="async" alt=""/>:<span className="cc-explore-no-preview" aria-label="Preview unavailable">{reel?<Play size={28}/>:<ImageIcon size={28}/>}</span>}
 {hovered&&src&&<HoverVideo src={src} onFailure={()=>onHover(false)}/>}</div>
 {reel?<span className="cc-explore-icon cc-explore-play" aria-label="Reel"><Play size={14} fill="currentColor"/></span>:post.mediaCount>1?<span className="cc-explore-icon" aria-label="Carousel"><Images size={22}/></span>:null}
 <span className="cc-explore-overlay">{!post.hideLikeCount&&<><Heart size={20} fill="currentColor"/> {post.likes}</>} <MessageCircle size={20} fill="currentColor"/> {post.comments}</span></Link>
}
