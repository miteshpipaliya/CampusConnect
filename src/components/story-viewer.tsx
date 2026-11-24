'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {Pause,Play,X,ChevronLeft,ChevronRight,Heart,Send,Users,Ellipsis} from 'lucide-react';
import {playWithSound} from '@/lib/client/play-with-sound';
import {Avatar} from './avatar';
import {relativeTime} from '@/lib/core/feed-presentation';
type Viewer={uid:string;handle:string;name:string;avatarUrl:string|null};
type Story={id:string;mediaUrl:string|null;contentType:string;caption:string;createdAt:number;expiresAt:number;isMine:boolean;highlight?:boolean;poll?:{question:string;options:[string,string]}|null;overlay?:{text?:string;color?:string;x?:number;y?:number}|null};
type Group={handle:string;name:string;avatarUrl:string|null;isMine:boolean;stories:Story[]};
async function json<T>(url:string,body?:object):Promise<T>{
 const r=await fetch(url,{cache:'no-store',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
 const d:unknown=await r.json().catch(()=>null);
 if(!r.ok)throw Error(d&&typeof d==='object'&&'error'in d?String(d.error):'Request failed');
 return d as T;
}
export function StoryViewer({handle,highlightId}:{handle:string;highlightId?:string}){
 const router=useRouter(),video=useRef<HTMLVideoElement>(null),started=useRef(0),elapsed=useRef(0),touchX=useRef(0);
 const [groups,setGroups]=useState<Group[]>([]),[g,setG]=useState(0),[s,setS]=useState(0),[progress,setProgress]=useState(0),[paused,setPaused]=useState(false),[error,setError]=useState(''),[loading,setLoading]=useState(true),[reply,setReply]=useState(''),[sending,setSending]=useState(false),[views,setViews]=useState<number|null>(null);
 const [people,setPeople]=useState<Viewer[]>([]),[peopleOpen,setPeopleOpen]=useState(false),[options,setOptions]=useState(false),[liked,setLiked]=useState(false),[ready,setReady]=useState(false);
 const group=groups[g],story=group?.stories[s];
 useEffect(()=>{
  let alive=true;
  const endpoint=highlightId?'/api/highlights/'+encodeURIComponent(highlightId)+'/stories':'/api/stories/tray';
  setLoading(true);
  void json<{groups:Group[]}>(endpoint).then(d=>{
   if(!alive)return;
   setGroups(d.groups);
   const index=highlightId?0:d.groups.findIndex(x=>x.handle.toLowerCase()===handle.toLowerCase());
   if(index<0||!d.groups[index]?.stories.length)setError('Story unavailable');else{setG(index);setS(0);setError('')}
  }).catch(e=>{if(alive)setError(e instanceof Error?e.message:'Stories unavailable')}).finally(()=>{if(alive)setLoading(false)});
  return()=>{alive=false};
 },[handle,highlightId]);
 const advance=useCallback((delta:number)=>{
  let gi=g,si=s+delta;
  const current=groups[gi];if(!current)return;
  if(si>=current.stories.length){gi++;si=0}
  if(si<0){gi--;si=Math.max(0,(groups[gi]?.stories.length??1)-1)}
  if(!groups[gi]){router.push(highlightId?'/profile/'+encodeURIComponent(current.handle):'/home');return}
  const target=groups[gi]?.handle;
  setG(gi);setS(si);setProgress(0);setPaused(false);setViews(null);setPeople([]);setPeopleOpen(false);setOptions(false);setLiked(false);setReady(false);elapsed.current=0;started.current=0;setReply('');
  if(!highlightId&&target&&target!==handle)window.history.replaceState(null,'','/stories/'+encodeURIComponent(target));
 },[g,s,groups,router,highlightId,handle]);
 const storyId=story?.id,mine=group?.isMine===true;
 useEffect(()=>{if(!storyId||!ready)return;let live=true;if(!mine)void json('/api/stories/'+storyId+'/view',{}).catch(()=>{});else void json<{total:number;viewers:Viewer[]}>('/api/stories/'+storyId+'/views').then(d=>{if(live){setViews(d.total);setPeople(d.viewers)}}).catch(()=>{});return()=>{live=false}},[storyId,mine,ready]);
 useEffect(()=>{elapsed.current=0;setProgress(0)},[story?.id]);
 useEffect(()=>{
  const element=video.current;if(!element)return;
  if(paused||peopleOpen||options||document.hidden){element.pause();return}
  return playWithSound(element,1);
 },[paused,storyId,peopleOpen,options]);
 useEffect(()=>{
  if(!story||paused||!ready||peopleOpen||options)return;
  let frame=0,active=true;started.current=performance.now()-elapsed.current;
  const tick=(now:number)=>{
   if(!active)return;
   if(!highlightId&&Date.now()>=story.expiresAt){advance(1);return}
   const duration=video.current?.duration||0;if(story.contentType.startsWith('video/')&&(!Number.isFinite(duration)||duration<=0)){frame=requestAnimationFrame(tick);return}
   const value=story.contentType.startsWith('video/')&&duration>0
     ?video.current!.currentTime/duration
     :Math.min(1,(now-started.current)/5000);
   const clamped=Math.max(0,Math.min(1,value));
   setProgress(clamped);
   if(clamped>=1){advance(1);return}
   frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);
  return()=>{active=false;elapsed.current=Math.max(0,performance.now()-started.current);cancelAnimationFrame(frame)};
 },[story,paused,ready,peopleOpen,options,highlightId,advance]);
 useEffect(()=>{
  const key=(e:KeyboardEvent)=>{
   if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)return;
   if(e.key==='Escape'&&(peopleOpen||options)){setPeopleOpen(false);setOptions(false);return}
   if(e.key==='Escape')router.push(highlightId?'/profile/'+encodeURIComponent(group?.handle||'me'):'/home');
   if(e.key==='ArrowRight')advance(1);
   if(e.key==='ArrowLeft')advance(-1);
   if(e.code==='Space'&&e.target===document.body){e.preventDefault();setPaused(v=>!v)}
  };
  const visibility=()=>setPaused(document.hidden);
  window.addEventListener('keydown',key);document.addEventListener('visibilitychange',visibility);
  return()=>{window.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility)};
 },[advance,group?.handle,highlightId,router,peopleOpen,options]);
 async function send(){
  if(!story||!reply.trim()||sending)return;setSending(true);setError('');
  try{await json('/api/stories/'+story.id+'/reply',{text:reply.trim()});setReply('')}
  catch(e){setError(e instanceof Error?e.message:'Reply unavailable')}
  finally{setSending(false)}
 }
 if(loading)return <div className="cc-story-screen">Loading stories…</div>;
 if(!story||!group)return <div className="cc-story-screen"><p role="alert">{error||'Story unavailable'}</p><Link href="/home">Back to home</Link></div>;
 const expired=Date.now()>=story.expiresAt;
 return <section className="cc-story-screen" aria-label={'Stories by '+group.handle}>
  <article className="cc-story-viewer">
  <div className="cc-story-progress">{group.stories.map((entry,i)=><span key={entry.id}><b style={{width:(i<s?100:i===s?progress*100:0)+'%'}}/></span>)}</div>
  <header><Link href={'/profile/'+encodeURIComponent(group.handle)}><Avatar user={{handle:group.handle,name:group.name,avatarUrl:group.avatarUrl}} size={32}/><b>{group.handle}</b><small>{relativeTime(story.createdAt)}</small></Link>
   <button type="button" aria-label={paused?'Resume story':'Pause story'} onClick={()=>setPaused(v=>!v)}>{paused?<Play/>:<Pause/>}</button>
   <button aria-label="Story options" onClick={()=>setOptions(v=>!v)}><Ellipsis/></button><Link href={highlightId?'/profile/'+encodeURIComponent(group.handle):'/home'} aria-label="Close stories"><X/></Link>
  </header>
  <div className="cc-story-media" onPointerDown={e=>{touchX.current=e.clientX;setPaused(true)}} onPointerUp={e=>{const dx=e.clientX-touchX.current;setPaused(false);if(Math.abs(dx)>60)advance(dx<0?1:-1)}} onPointerCancel={()=>setPaused(false)}>
   {story.mediaUrl?story.contentType.startsWith('video/')?<video key={story.id} ref={video} playsInline src={story.mediaUrl||undefined} onLoadedData={()=>setReady(true)} onError={()=>setError('Story media unavailable')} onEnded={()=>advance(1)}/>:<img src={story.mediaUrl||undefined} onLoad={()=>setReady(true)} onError={()=>setError('Story media unavailable')} alt={story.caption||'Campus story'}/>:<p>Media unavailable</p>}
   {story.overlay?.text&&<strong className="cc-story-overlay" style={{color:story.overlay.color||'#fff',left:Math.round((story.overlay.x??.5)*100)+'%',top:Math.round((story.overlay.y??.5)*100)+'%'}}>{story.overlay.text}</strong>}
   <button type="button" aria-label="Previous story" className="cc-story-left" onClick={()=>advance(-1)}><ChevronLeft/></button>
   <button type="button" aria-label="Next story" className="cc-story-right" onClick={()=>advance(1)}><ChevronRight/></button>
  </div>
  {story.caption&&<p className="cc-story-caption">{story.caption}</p>}
  {story.poll&&!expired&&<div className="cc-story-poll"><strong>{story.poll.question}</strong>{story.poll.options.map((option,i)=><button key={i} type="button" onClick={()=>void json('/api/stories/vote',{storyId:story.id,option:i}).then(()=>setError('Vote saved')).catch(e=>setError(e instanceof Error?e.message:'Vote unavailable'))}>{option}</button>)}</div>}
  {group.isMine?<footer><button className="cc-story-people" onClick={()=>{setPeopleOpen(true);void json<{total:number;viewers:Viewer[]}>('/api/stories/'+story.id+'/views').then(d=>{setViews(d.total);setPeople(d.viewers)}).catch(e=>setError(String(e)))}}><Users size={22}/> People · {views??0}</button></footer>:<footer><input value={reply} maxLength={1000} placeholder={'Reply to '+group.handle+'…'} aria-label="Reply to story" onFocus={()=>setPaused(true)} onChange={e=>setReply(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void send()}}/><button aria-label="Send reply" disabled={sending||!reply.trim()} onClick={()=>void send()}><Send size={22}/></button><button aria-label="Like story" aria-pressed={liked} onClick={()=>void json('/api/stories/'+story.id+'/react',{emoji:'❤️'}).then(()=>setLiked(true)).catch(e=>setError(String(e)))}><Heart fill={liked?'#ff3040':'none'} size={24}/></button><button aria-label="Copy story link" onClick={()=>void navigator.clipboard.writeText(window.location.origin+'/stories/'+encodeURIComponent(group.handle)).then(()=>setError('Story link copied')).catch(()=>setError('Could not copy link'))}><Send size={24}/></button></footer>}
  {peopleOpen&&<section className="cc-story-people-sheet" role="dialog" aria-label="Story viewers"><header><strong>People · {views??0}</strong><button aria-label="Close viewers" onClick={()=>setPeopleOpen(false)}><X/></button></header>{people.length?people.map(p=><Link key={p.uid} href={'/profile/'+encodeURIComponent(p.handle)}><Avatar user={{handle:p.handle,name:p.name,avatarUrl:p.avatarUrl}} size={44}/><span><b>{p.handle}</b><small>{p.name}</small></span></Link>):<p>No viewers yet.</p>}</section>}
  {options&&<section className="cc-story-people-sheet" role="dialog" aria-label="Story options"><button onClick={()=>setOptions(false)}>Cancel</button>{group.isMine&&<button onClick={async()=>{if(!window.confirm('Delete this story?'))return;const r=await fetch('/api/stories?id='+encodeURIComponent(story.id),{method:'DELETE'});if(r.ok)router.push('/home');else setError('Unable to delete story')}}>Delete story</button>}<button onClick={()=>void navigator.clipboard.writeText(window.location.origin+'/stories/'+encodeURIComponent(group.handle)).then(()=>setOptions(false)).catch(()=>setError('Unable to copy link'))}>Copy link</button></section>}
  {error&&<p role="status">{error}</p>}
  </article>
 </section>;
}
