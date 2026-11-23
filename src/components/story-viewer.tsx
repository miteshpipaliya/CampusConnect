'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {Pause,Play,Volume2,VolumeX,X,ChevronLeft,ChevronRight} from 'lucide-react';
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
 const [groups,setGroups]=useState<Group[]>([]),[g,setG]=useState(0),[s,setS]=useState(0),[progress,setProgress]=useState(0),[paused,setPaused]=useState(false),[muted,setMuted]=useState(true),[error,setError]=useState(''),[loading,setLoading]=useState(true),[reply,setReply]=useState(''),[sending,setSending]=useState(false),[views,setViews]=useState<number|null>(null);
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
 function advance(delta:number){
  let gi=g,si=s+delta;
  const current=groups[gi];if(!current)return;
  if(si>=current.stories.length){gi++;si=0}
  if(si<0){gi--;si=Math.max(0,(groups[gi]?.stories.length??1)-1)}
  if(!groups[gi]){router.push(highlightId?'/profile/'+encodeURIComponent(current.handle):'/home');return}
  const target=groups[gi]?.handle;
  setG(gi);setS(si);setProgress(0);setPaused(false);setViews(null);elapsed.current=0;started.current=0;setReply('');
  if(!highlightId&&target&&target!==handle)window.history.replaceState(null,'','/stories/'+encodeURIComponent(target));
 }
 useEffect(()=>{if(!story)return;
  void json('/api/stories/'+story.id+'/view',{}).catch(()=>{});
  if(group?.isMine)void json<{total:number}>('/api/stories/'+story.id+'/views').then(d=>setViews(d.total)).catch(()=>{});
 },[story?.id,group?.isMine]);
 useEffect(()=>{elapsed.current=0;setProgress(0)},[story?.id]);
 useEffect(()=>{
  const element=video.current;if(!element)return;
  if(paused)element.pause();
  else if(document.visibilityState==='visible')void element.play().catch(()=>{});
 },[paused,story?.id]);
 useEffect(()=>{
  if(!story||paused)return;
  let frame=0,active=true;started.current=performance.now()-elapsed.current;
  const tick=(now:number)=>{
   if(!active)return;
   if(!highlightId&&Date.now()>=story.expiresAt){advance(1);return}
   const duration=video.current?.duration||0;
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
 },[story?.id,paused,g,s,highlightId]);
 useEffect(()=>{
  const key=(e:KeyboardEvent)=>{
   if(e.key==='Escape')router.push(highlightId?'/profile/'+encodeURIComponent(group?.handle||'me'):'/home');
   if(e.key==='ArrowRight')advance(1);
   if(e.key==='ArrowLeft')advance(-1);
   if(e.code==='Space'&&e.target===document.body){e.preventDefault();setPaused(v=>!v)}
  };
  const visibility=()=>setPaused(document.hidden);
  window.addEventListener('keydown',key);document.addEventListener('visibilitychange',visibility);
  return()=>{window.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility)};
 },[groups,g,s,highlightId,router]);
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
  <header><Link href={'/profile/'+encodeURIComponent(group.handle)}>{group.avatarUrl&&<img src={group.avatarUrl} alt="" width={32} height={32} style={{borderRadius:'50%'}}/>}{group.name} <small>@{group.handle}</small></Link>
   <button type="button" aria-label={paused?'Resume story':'Pause story'} onClick={()=>setPaused(v=>!v)}>{paused?<Play/>:<Pause/>}</button>
   <button type="button" aria-label={muted?'Unmute story':'Mute story'} onClick={()=>setMuted(v=>!v)}>{muted?<VolumeX/>:<Volume2/>}</button>
   <Link href={highlightId?'/profile/'+encodeURIComponent(group.handle):'/home'} aria-label="Close stories"><X/></Link>
  </header>
  <div className="cc-story-media" onPointerDown={e=>{touchX.current=e.clientX;setPaused(true)}} onPointerUp={e=>{const dx=e.clientX-touchX.current;setPaused(false);if(Math.abs(dx)>60)advance(dx<0?1:-1)}} onPointerCancel={()=>setPaused(false)}>
   {story.mediaUrl?story.contentType.startsWith('video/')?<video key={story.id} ref={video} playsInline muted={muted} src={story.mediaUrl} autoPlay onEnded={()=>advance(1)}/>:<img src={story.mediaUrl} alt={story.caption||'Campus story'}/>:<p>Media unavailable</p>}
   {story.overlay?.text&&<strong className="cc-story-overlay" style={{color:story.overlay.color||'#fff',left:Math.round((story.overlay.x??.5)*100)+'%',top:Math.round((story.overlay.y??.5)*100)+'%'}}>{story.overlay.text}</strong>}
   <button type="button" aria-label="Previous story" className="cc-story-left" onClick={()=>advance(-1)}><ChevronLeft/></button>
   <button type="button" aria-label="Next story" className="cc-story-right" onClick={()=>advance(1)}><ChevronRight/></button>
  </div>
  {story.caption&&<p className="cc-story-caption">{story.caption}</p>}
  {story.poll&&!expired&&<div className="cc-story-poll"><strong>{story.poll.question}</strong>{story.poll.options.map((option,i)=><button key={i} type="button" onClick={()=>void json('/api/stories/vote',{storyId:story.id,option:i}).then(()=>setError('Vote saved')).catch(e=>setError(e instanceof Error?e.message:'Vote unavailable'))}>{option}</button>)}</div>}
  {group.isMine?<footer>{views===null?'Loading viewers…':views+' unique views'}</footer>:
   <footer><input value={reply} maxLength={1000} placeholder="Reply to story…" aria-label="Reply to story" onChange={e=>setReply(e.target.value)}/><button onClick={()=>void send()} disabled={sending||!reply.trim()}>Send</button>{(['❤️','😂','🔥'] as const).map(emoji=><button key={emoji} aria-label={'React '+emoji} onClick={()=>void json('/api/stories/'+story.id+'/react',{emoji}).catch(e=>setError(e instanceof Error?e.message:'Reaction unavailable'))}>{emoji}</button>)}</footer>}
  {error&&<p role="status">{error}</p>}
  </article>
 </section>;
}
