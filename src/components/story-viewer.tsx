'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {Pause,Play,Volume2,VolumeX,X,ChevronLeft,ChevronRight} from 'lucide-react';
type Story={id:string;mediaUrl:string|null;contentType:string;caption:string;createdAt:number;expiresAt:number;isMine:boolean;poll?:{question:string;options:[string,string]}|null;overlay?:{text?:string;color?:string}|null};
type Group={handle:string;name:string;avatarUrl:string|null;isMine:boolean;stories:Story[]};
async function json<T>(url:string,body?:object):Promise<T>{const r=await fetch(url,{cache:'no-store',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});const d:unknown=await r.json().catch(()=>null);if(!r.ok)throw Error(d&&typeof d==='object'&&'error'in d?String(d.error):'Request failed');return d as T}
export function StoryViewer({handle}:{handle:string}){
 const router=useRouter(),video=useRef<HTMLVideoElement>(null),start=useRef(0);
 const [groups,setGroups]=useState<Group[]>([]),[g,setG]=useState(0),[s,setS]=useState(0),[progress,setProgress]=useState(0),[paused,setPaused]=useState(false),[muted,setMuted]=useState(true),[error,setError]=useState(''),[loading,setLoading]=useState(true),[reply,setReply]=useState(''),[sending,setSending]=useState(false),[views,setViews]=useState<number|null>(null);
 const group=groups[g],story=group?.stories[s];
 useEffect(()=>{let alive=true;void json<{groups:Group[]}>('/api/stories/tray').then(d=>{if(!alive)return;setGroups(d.groups);const index=d.groups.findIndex(x=>x.handle.toLowerCase()===handle.toLowerCase());if(index<0)setError('Story unavailable');else setG(index)}).catch(e=>{if(alive)setError(String(e))}).finally(()=>{if(alive)setLoading(false)});return()=>{alive=false}},[handle]);
 const advance=(delta:number)=>{
  let gi=g,si=s+delta;const current=groups[g];if(!current)return;
  if(si>=current.stories.length){gi++;si=0}if(si<0){gi--;si=Math.max(0,(groups[gi]?.stories.length??1)-1)}
  if(!groups[gi]){router.push('/home');return}
  setG(gi);setS(si);setProgress(0);setPaused(false);start.current=0;setViews(null);
  const next=groups[gi]?.handle;if(next&&next!==handle)window.history.replaceState(null,'','/stories/'+encodeURIComponent(next));
 };
 useEffect(()=>{if(!story)return;void json('/api/stories/'+story.id+'/view',{}).catch(()=>{});if(group?.isMine)void json<{total:number}>('/api/stories/'+story.id+'/views').then(d=>setViews(d.total)).catch(()=>{})},[story?.id,group?.isMine]);
 useEffect(()=>{if(!story||paused)return;let id=0,alive=true;start.current=performance.now()-progress*5000;
  const tick=(now:number)=>{if(!alive)return;if(Date.now()>=story.expiresAt){setError('Story expired');return}
   const value=story.contentType.startsWith('video/')&&video.current?.duration?video.current.currentTime/video.current.duration:(now-start.current)/5000;
   if(value>=1){advance(1);return}setProgress(Math.max(0,value));id=requestAnimationFrame(tick)};
  id=requestAnimationFrame(tick);return()=>{alive=false;cancelAnimationFrame(id)};
 },[story?.id,paused,g,s]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape')router.push('/home');if(e.key==='ArrowRight')advance(1);if(e.key==='ArrowLeft')advance(-1)};const visibility=()=>setPaused(document.hidden);window.addEventListener('keydown',key);document.addEventListener('visibilitychange',visibility);return()=>{window.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility)}},[groups,g,s]);
 async function send(){if(!story||!reply.trim()||sending)return;setSending(true);try{await json('/api/stories/'+story.id+'/reply',{text:reply});setReply('')}catch(e){setError(String(e))}finally{setSending(false)}}
 if(loading)return <div className="cc-story-screen">Loading stories…</div>;
 if(!story||!group)return <div className="cc-story-screen"><p role="alert">{error||'Story unavailable'}</p><Link href="/home">Back to home</Link></div>;
 return <section className="cc-story-screen"><article className="cc-story-viewer">
  <div className="cc-story-progress">{group.stories.map((item,i)=><span key={item.id}><b style={{width:(i<s?100:i===s?progress*100:0)+'%'}}/></span>)}</div>
  <header><Link href={'/profile/'+group.handle}>{group.name} <small>@{group.handle}</small></Link><button aria-label="Pause or resume" onClick={()=>setPaused(x=>!x)}>{paused?<Play/>:<Pause/>}</button><button aria-label="Mute toggle" onClick={()=>setMuted(x=>!x)}>{muted?<VolumeX/>:<Volume2/>}</button><Link href="/home" aria-label="Close"><X/></Link></header>
  <div className="cc-story-media" onPointerDown={()=>setPaused(true)} onPointerUp={()=>setPaused(false)}>
   {story.mediaUrl?story.contentType.startsWith('video/')?<video key={story.id} ref={video} autoPlay playsInline muted={muted} src={story.mediaUrl} onEnded={()=>advance(1)}/>:<img src={story.mediaUrl} alt={story.caption||'Campus story'}/>:<p>Media unavailable</p>}
   {story.overlay?.text&&<strong className="cc-story-overlay">{story.overlay.text}</strong>}
   <button aria-label="Previous" className="cc-story-left" onClick={()=>advance(-1)}><ChevronLeft/></button><button aria-label="Next" className="cc-story-right" onClick={()=>advance(1)}><ChevronRight/></button>
  </div>
  {story.caption&&<p className="cc-story-caption">{story.caption}</p>}
  {story.poll&&<div className="cc-story-poll"><strong>{story.poll.question}</strong>{story.poll.options.map((option,i)=><button key={i} onClick={()=>void json('/api/stories/vote',{storyId:story.id,option:i}).then(()=>setError('Vote saved')).catch(e=>setError(String(e)))}>{option}</button>)}</div>}
  {group.isMine?<footer>{views===null?'Loading viewers…':views+' unique views'}</footer>:<footer><input value={reply} maxLength={1000} placeholder="Reply to story…" aria-label="Reply to story" onChange={e=>setReply(e.target.value)}/><button onClick={()=>void send()} disabled={sending||!reply.trim()}>Send</button>{(['❤️','😂','🔥'] as const).map(emoji=><button key={emoji} aria-label={'React '+emoji} onClick={()=>void json('/api/stories/'+story.id+'/react',{emoji}).catch(e=>setError(String(e)))}>{emoji}</button>)}</footer>}
  {error&&<p role="status">{error}</p>}
 </article></section>
}
