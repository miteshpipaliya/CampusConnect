'use client';
import {SafeImg} from '@/components/safe-img';
import {useEffect,useRef,useState} from 'react';
import {usePathname,useRouter} from 'next/navigation';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {Search,X,Hash,BadgeCheck,Image as ImageIcon} from 'lucide-react';
import {Avatar} from '../avatar';
import {useShellUid} from '../shell-session';
import {rememberExploreScroll} from '@/lib/client/explore-scroll';
import {userKey} from '@/lib/queries';
type Item={uid?:string;handle?:string;name?:string;avatarUrl?:string|null;verified?:boolean;tag?:string;postCount?:number;id?:string;caption?:string;thumbUrl?:string|null;type?:string;authorHandle?:string};
type History={id:string;query:string};
type Filter='accounts'|'tags'|'posts';
async function get<T>(path:string,signal?:AbortSignal):Promise<T>{const r=await fetch(path,{cache:'no-store',signal:signal??null});if(!r.ok)throw Error('Search unavailable');return r.json() as Promise<T>}
export function ExploreSearchBar(){
 const uid=useShellUid(),client=useQueryClient(),router=useRouter(),path=usePathname(),root=useRef<HTMLDivElement>(null),input=useRef<HTMLInputElement>(null);
 const [query,setQuery]=useState(''),[term,setTerm]=useState(''),[open,setOpen]=useState(false),[filter,setFilter]=useState<Filter>('accounts'),[selected,setSelected]=useState(-1),[error,setError]=useState('');
 const trimmed=query.trim();
 useEffect(()=>{const t=setTimeout(()=>setTerm(trimmed),250);return()=>clearTimeout(t)},[trimmed]);
 useEffect(()=>{setOpen(false)},[path]);
 useEffect(()=>{if(!open)return;const close=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false)};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close)},[open]);
 const history=useQuery({queryKey:userKey(uid,'search-history'),enabled:Boolean(uid&&open&&trimmed.length<2),queryFn:({signal})=>get<{items:History[]}>('/api/search/history',signal),staleTime:60000});
 const results=useQuery({queryKey:userKey(uid,'explore-search',filter,term),enabled:Boolean(uid&&open&&term.length>=2&&term===trimmed),queryFn:({signal})=>get<{items:Item[]}>('/api/search?type='+filter+'&q='+encodeURIComponent(term),signal),staleTime:60000});
 const items=term===trimmed?(results.data?.items||[]):[],recent=history.data?.items||[];
 async function remember(value:string){if(!value.trim())return;try{const r=await fetch('/api/search/history',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:value.trim()})});if(r.ok)void client.invalidateQueries({queryKey:userKey(uid,'search-history')})}catch{/* Search navigation should still work. */}}
 async function remove(id?:string){try{const r=await fetch('/api/search/history'+(id?'?id='+encodeURIComponent(id):''),{method:'DELETE'});if(!r.ok)throw Error('Unable to clear recent searches');void client.invalidateQueries({queryKey:userKey(uid,'search-history')});setError('')}catch{setError('Unable to clear recent searches')}}
 function choose(item:Item){const target=filter==='accounts'?'/profile/'+encodeURIComponent(item.handle||''):filter==='tags'?'/explore/tags/'+encodeURIComponent(item.tag||''):item.type==='reel'?'/reels?start='+encodeURIComponent(item.id||''):'/posts/'+encodeURIComponent(item.id||'');void remember(trimmed);setOpen(false);rememberExploreScroll(uid);router.push(target,{scroll:item.type==='reel'||filter!=='posts'})}
 const pending=trimmed.length>=2&&(term!==trimmed||results.isPending);
 return <div className="cc-explore-search-sticky"><div className="cc-explore-search-root" ref={root}>
 <div className="cc-explore-search-input"><Search size={18}/><input ref={input} aria-label="Search CampusConnect" role="combobox" aria-expanded={open} aria-controls="cc-explore-results" aria-autocomplete="list" {...(open&&selected>=0&&selected<items.length?{'aria-activedescendant':'cc-explore-option-'+selected}:{})} value={query} placeholder="Search" onFocus={()=>setOpen(true)} onChange={event=>{setQuery(event.target.value);setOpen(true);setSelected(-1)}} onKeyDown={event=>{if(event.key==='Escape'){setOpen(false);return}if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();setOpen(true);setSelected(old=>Math.max(-1,Math.min(items.length-1,old+(event.key==='ArrowDown'?1:-1))))}if(event.key==='Enter'){event.preventDefault();const item=items[selected];if(item)choose(item);else{void remember(trimmed);setOpen(true)}}}}/>{query&&<button aria-label="Clear search" onClick={()=>{setQuery('');setSelected(-1);input.current?.focus()}}><X size={17}/></button>}</div>
 {open&&<div className="cc-explore-dropdown" id="cc-explore-results">
 {trimmed.length>=2?<><nav aria-label="Search filters" className="cc-explore-filters">{(['accounts','tags','posts'] as const).map(f=><button key={f} aria-pressed={filter===f} onClick={()=>{setFilter(f);setSelected(-1);input.current?.focus()}}>{f}</button>)}</nav>
 {pending?<div aria-label="Searching" role="status">{Array.from({length:5},(_,i)=><div className="cc-explore-search-skeleton" key={i}><i/><b/></div>)}</div>:results.isError?<p role="alert">Search unavailable. <button onClick={()=>void results.refetch()}>Retry</button></p>:<div role="listbox" aria-label="Search results">{!items.length&&<p>No results found.</p>}{items.map((item,i)=><button type="button" role="option" aria-selected={selected===i} id={'cc-explore-option-'+i} className="cc-explore-result" key={item.uid||item.tag||item.id||i} onClick={()=>choose(item)}>{filter==='accounts'?<Avatar user={{handle:item.handle||'',name:item.name||'',avatarUrl:item.avatarUrl??null}} size={44}/>:filter==='tags'?<span className="cc-explore-result-icon"><Hash/></span>:item.thumbUrl?<SafeImg src={item.thumbUrl} width={44} height={44} loading="lazy" decoding="async" alt=""/>:<span className="cc-explore-result-icon"><ImageIcon/></span>}<span><strong>{filter==='accounts'?item.handle:filter==='tags'?'#'+item.tag:item.caption||'Campus post'} {item.verified&&<BadgeCheck size={14}/>}</strong><small>{filter==='accounts'?item.name:filter==='tags'?(item.postCount||0)+' posts':item.authorHandle}</small></span></button>)}</div>}</>:<><header><strong>Recent</strong><button onClick={()=>void remove()}>Clear all</button></header>{history.isPending?<div className="cc-explore-search-skeleton"><i/><b/></div>:history.isError?<p>Recent searches unavailable.</p>:recent.length?recent.map(h=><div key={h.id} className="cc-explore-history-row"><button onClick={()=>{setQuery(h.query);setSelected(-1);input.current?.focus()}}><Search size={18}/>{h.query}</button><button aria-label={'Remove '+h.query} onClick={()=>void remove(h.id)}><X size={16}/></button></div>):<p>No recent searches.</p>}</>}
 {error&&<p role="alert">{error}</p>}</div>}
 </div></div>
}
