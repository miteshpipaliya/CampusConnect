'use client';
import {useEffect,useRef} from 'react';
import Link from 'next/link';
import {Heart,MessageCircle,Images,Play,Image as ImageIcon} from 'lucide-react';
import {useInfiniteQuery} from '@tanstack/react-query';
import {useShellUid} from './shell-session';
import {userKey} from '@/lib/queries';
export type ExploreItem={id:string;caption:string;type:string;authorHandle:string;thumbUrl?:string|null;mediaUrl?:string|null;mediaType:string;likes:number;comments:number;mediaCount:number;width?:number|null;height?:number|null};
type Page={items:ExploreItem[];nextCursor:string|null};
export function ExploreGrid({tag,sort}:{tag?:string;sort?:string}){
 const uid=useShellUid(),last=useRef<HTMLDivElement>(null);
 const query=useInfiniteQuery({queryKey:userKey(uid,'explore-grid',tag||'',sort||''),enabled:Boolean(uid),initialPageParam:'',queryFn:async({pageParam,signal})=>{const qs=new URLSearchParams();if(pageParam)qs.set('cursor',pageParam);if(sort)qs.set('sort',sort);const r=await fetch((tag?'/api/explore/tags/'+encodeURIComponent(tag):'/api/explore')+'?'+qs.toString(),{cache:'no-store',signal});if(!r.ok)throw Error('Explore unavailable');return r.json() as Promise<Page>},getNextPageParam:page=>page.nextCursor||undefined,staleTime:30000});
 const {hasNextPage,isFetchingNextPage,fetchNextPage}=query;
 useEffect(()=>{const node=last.current;if(!node)return;const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)&&hasNextPage&&!isFetchingNextPage)void fetchNextPage()},{rootMargin:'450px'});observer.observe(node);return()=>observer.disconnect()},[hasNextPage,isFetchingNextPage,fetchNextPage]);
 const items=[...new Map((query.data?.pages.flatMap(p=>p.items)||[]).map(p=>[p.id,p])).values()];
 return <section className="cc-explore-section" aria-label={tag?'Hashtag posts':'Explore campus posts'}>
 {query.isError&&<p role="alert">Explore unavailable. <button onClick={()=>void query.refetch()}>Retry</button></p>}
 {!query.isPending&&!items.length&&!query.isError&&<p>No accessible campus posts yet.</p>}
 <div className="cc-explore-grid">{query.isPending?Array.from({length:12},(_,i)=><div key={i} className="cc-explore-tile cc-explore-placeholder" aria-hidden="true"/>):items.map(post=>{const thumb=post.thumbUrl||(!post.mediaType.startsWith('video/')?post.mediaUrl:null);return <Link key={post.id} className="cc-explore-tile" href={post.type==='reel'?'/reels?start='+encodeURIComponent(post.id):'/posts/'+encodeURIComponent(post.id)} aria-label={post.authorHandle+': '+(post.caption||'Open campus post')}>
 {thumb?<img src={thumb} width={post.width||300} height={post.height||400} loading="lazy" decoding="async" alt=""/>:<span className="cc-explore-no-preview" aria-label="Preview unavailable">{post.type==='reel'?<Play size={28}/>:<ImageIcon size={28}/>}</span>}
 {post.type==='reel'?<span className="cc-explore-icon cc-explore-play" aria-label="Reel"><Play size={14} fill="currentColor"/></span>:post.mediaCount>1?<span className="cc-explore-icon" aria-label="Carousel"><Images size={22}/></span>:null}
 <span className="cc-explore-overlay"><Heart size={20} fill="currentColor"/> {post.likes} <MessageCircle size={20} fill="currentColor"/> {post.comments}</span></Link>})}
 </div><div ref={last} className="cc-explore-end">{isFetchingNextPage?<span aria-label="Fetching more posts" className="cc-explore-more-skeleton"/>:!hasNextPage&&items.length?'You are all caught up':''}</div></section>
}
