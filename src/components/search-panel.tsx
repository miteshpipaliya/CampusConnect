'use client';
import {useEffect,useState} from 'react';import Link from 'next/link';import {Search,X} from 'lucide-react';
type Item={uid?:string;handle?:string;name?:string;avatarUrl?:string|null;tag?:string;postCount?:number;id?:string;caption?:string;mediaUrl?:string|null;type?:string};
type History={id:string;query:string};
export function SearchPanel(){
 const [query,setQuery]=useState(''),[type,setType]=useState<'accounts'|'tags'|'posts'>('accounts'),[items,setItems]=useState<Item[]>([]),[history,setHistory]=useState<History[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const historyLoad=()=>fetch('/api/search/history',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>setHistory(Array.isArray(d?.items)?d.items:[]));
 useEffect(()=>{void historyLoad().catch(()=>{})},[]);
 useEffect(()=>{
  if(query.trim().length<2){setItems([]);return}
  const ctrl=new AbortController();const timer=setTimeout(()=>{
   setLoading(true);setError('');
   void fetch('/api/search?type='+type+'&q='+encodeURIComponent(query),{cache:'no-store',signal:ctrl.signal})
    .then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'Search unavailable');return d})
    .then(d=>setItems(Array.isArray(d.items)?d.items:[]))
    .catch(e=>{if(!ctrl.signal.aborted)setError(e instanceof Error?e.message:'Search failed')})
    .finally(()=>{if(!ctrl.signal.aborted)setLoading(false)});
  },250);
  return()=>{clearTimeout(timer);ctrl.abort()}
 },[query,type]);
 const remember=async(term:string)=>{if(!term.trim())return;await fetch('/api/search/history',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:term})}).catch(()=>{});void historyLoad().catch(()=>{})};
 const remove=async(id?:string)=>{await fetch('/api/search/history'+(id?'?id='+id:''),{method:'DELETE'});void historyLoad().catch(()=>{})};
 return <section className="cc-search-panel" aria-label="Search campus">
  <h1>Search</h1>
  <label className="cc-search-input"><Search size={18}/><input aria-label="Search CampusConnect" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search students, tags, posts…" onKeyDown={e=>{if(e.key==='Enter')void remember(query)}}/><button onClick={()=>{setQuery('');setItems([])}} aria-label="Clear search"><X size={16}/></button></label>
  <div className="cc-search-tabs">{(['accounts','tags','posts'] as const).map(t=><button key={t} className={type===t?'active':''} onClick={()=>setType(t)}>{t}</button>)}</div>
  {loading&&<p role="status">Searching…</p>}{error&&<p role="alert">{error}</p>}
  {query.length>=2?<div className="cc-search-results">{!loading&&!items.length&&<p>No results</p>}{items.map((item,i)=>{
   const href=type==='accounts'?'/profile/'+encodeURIComponent(item.handle||''):type==='tags'?'/explore/tags/'+encodeURIComponent(item.tag||''):'/posts/'+encodeURIComponent(item.id||'');
   return <Link key={item.uid||item.tag||item.id||i} href={href} onClick={()=>void remember(query)}>
    {type==='accounts'&&item.avatarUrl&&<img width={40} height={40} src={item.avatarUrl} alt=""/>}
    {type==='posts'&&item.mediaUrl&&<img width={40} height={40} src={item.mediaUrl} alt=""/>}
    <span><strong>{type==='accounts'?'@'+item.handle:type==='tags'?'#'+item.tag:item.caption||'Open post'}</strong><small>{type==='accounts'?item.name:type==='tags'?(item.postCount||0)+' posts':item.type}</small></span>
   </Link>})}</div>:
   <div className="cc-search-history"><header><strong>Recent searches</strong><button onClick={()=>void remove()}>Clear all</button></header>{history.map(h=><div key={h.id}><button onClick={()=>setQuery(h.query)}>{h.query}</button><button aria-label={'Remove '+h.query} onClick={()=>void remove(h.id)}><X size={14}/></button></div>)}</div>}
 </section>;
}
