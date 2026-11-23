'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {Avatar} from './avatar';
import {Heart,MessageCircle,Bookmark,Repeat2,Volume2,VolumeX,Share2,Play,Pause} from 'lucide-react';
import {ChatShareSheet} from './chat/chat-share-sheet';
export type Reel={id:string;authorUid:string;authorHandle:string;authorName:string;avatarUrl:string|null;caption:string;mediaId:string;mediaUrl:string|null;likes:number;comments:number;reposts:number;views:number;liked:boolean;saved:boolean;followStatus:string;createdAt:number};
type Action='like'|'save'|'repost';
export function ReelCard({reel,active,muted,onMute}:{reel:Reel;active:boolean;muted:boolean;onMute:(v:boolean)=>void}){
 const player=useRef<HTMLVideoElement>(null),counted=useRef(false),lastTime=useRef(0),played=useRef(0);
 const [paused,setPaused]=useState(false),[liked,setLiked]=useState(reel.liked),[saved,setSaved]=useState(reel.saved),[likes,setLikes]=useState(reel.likes),[busy,setBusy]=useState(false),[share,setShare]=useState(false),[comments,setComments]=useState(false),[follow,setFollow]=useState(reel.followStatus),[error,setError]=useState('');
 useEffect(()=>{const v=player.current;if(!v)return;if(active&&!paused&&document.visibilityState==='visible')void v.play().catch(()=>{});else v.pause()},[active,paused]);
 useEffect(()=>{const handler=()=>{if(document.hidden)player.current?.pause();else if(active&&!paused)void player.current?.play().catch(()=>{})};document.addEventListener('visibilitychange',handler);return()=>document.removeEventListener('visibilitychange',handler)},[active,paused]);
 async function action(which:Action){
  if(busy)return;setBusy(true);setError('');
  const oldLike=liked,oldSaved=saved,oldCount=likes;
  if(which==='like'){setLiked(!liked);setLikes(x=>x+(liked?-1:1))}
  if(which==='save')setSaved(!saved);
  try{const url=which==='like'?'/api/posts/'+reel.id+'/likes':which==='save'?'/api/saves':'/api/reposts';
   const resp=await fetch(url,{method:which==='save'&&saved?'DELETE':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(which==='like'?{}:{postId:reel.id})});
   if(!resp.ok)throw Error((await resp.json().catch(()=>({}))).error||'Unable to update');
  }catch(e){setLiked(oldLike);setSaved(oldSaved);setLikes(oldCount);setError(String(e))}finally{setBusy(false)}
 }
 async function followToggle(){
  const previous=follow;setFollow(previous==='active'?'none':'active');
  try{const r=await fetch('/api/follow',{method:previous==='active'?'DELETE':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({handle:reel.authorHandle})});if(!r.ok)throw Error('Follow unavailable');const d=await r.json();setFollow(d.status||'none')}
  catch(e){setFollow(previous);setError(String(e))}
 }
 const progress=()=>{
  const v=player.current;if(!v||!active||v.paused)return;
  const now=performance.now();if(lastTime.current)played.current+=Math.min(500,now-lastTime.current);lastTime.current=now;
  if(!counted.current&&played.current>=3000){counted.current=true;void fetch('/api/posts/'+reel.id+'/view',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({watchMs:Math.floor(played.current)})}).catch(()=>{})}
 };
 return <article data-reel-card className="cc-reel-card" aria-label={'Reel by '+reel.authorHandle}>
  <div className="cc-reel-video-box">
   {reel.mediaUrl?<video ref={player} src={reel.mediaUrl} playsInline muted={muted} loop preload={active?'auto':'metadata'} onTimeUpdate={progress} onPause={()=>{lastTime.current=0}} onClick={()=>setPaused(v=>!v)}/>:<p>Video unavailable</p>}
   {paused&&<button className="cc-reel-play" aria-label="Resume video" onClick={()=>setPaused(false)}><Play/></button>}
   <button className="cc-reel-mute" aria-label={muted?'Unmute':'Mute'} onClick={()=>onMute(!muted)}>{muted?<VolumeX/>:<Volume2/>}</button>
   <div className="cc-reel-caption"><Link href={'/profile/'+encodeURIComponent(reel.authorHandle)}><Avatar user={{name:reel.authorName,handle:reel.authorHandle,avatarUrl:reel.avatarUrl}} size={32}/> @{reel.authorHandle}</Link>
    <button onClick={()=>void followToggle()}>{follow==='active'?'Following':follow==='pending'?'Requested':'Follow'}</button><p>{reel.caption}</p><small>Original audio</small></div>
  </div>
  <div className="cc-reel-actions">
   <button onClick={()=>void action('like')} aria-label="Like Reel"><Heart fill={liked?'currentColor':'none'}/> <small>{likes}</small></button>
   <button onClick={()=>setComments(true)} aria-label="Comments"><MessageCircle/><small>{reel.comments}</small></button>
   <button onClick={()=>setShare(true)} aria-label="Share Reel"><Share2/></button>
   <button onClick={()=>void action('repost')} aria-label="Repost"><Repeat2/></button>
   <button onClick={()=>void action('save')} aria-label="Save Reel"><Bookmark fill={saved?'currentColor':'none'}/></button>
   <button onClick={()=>setPaused(x=>!x)} aria-label={paused?'Play Reel':'Pause Reel'}>{paused?<Play/>:<Pause/>}</button>
  </div>
  {error&&<p role="alert" className="cc-reel-error">{error}</p>}
  {comments&&<ReelComments id={reel.id} onClose={()=>setComments(false)}/>}
  {share&&<ChatShareSheet postId={reel.id} onClose={()=>setShare(false)}/>}
 </article>;
}
function ReelComments({id,onClose}:{id:string;onClose:()=>void}){
 const [items,setItems]=useState<Array<{id:string;handle:string;text:string}>>([]),[text,setText]=useState(''),[error,setError]=useState('');
 const load=()=>fetch('/api/posts/'+id+'/comments').then(r=>r.json()).then(d=>{if(Array.isArray(d.comments))setItems(d.comments)});
 useEffect(()=>{void load().catch(()=>setError('Comments unavailable'))},[id]);
 async function send(){const r=await fetch('/api/posts/'+id+'/comments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});if(!r.ok){setError('Comment failed');return}setText('');void load()}
 return <div className="cc-reel-comments" role="dialog" aria-modal="true" aria-label="Reel comments"><header><strong>Comments</strong><button onClick={onClose}>Close</button></header><div className="cc-reel-comment-list">{items.map(c=><p key={c.id}><b>@{c.handle}</b> {c.text}</p>)}</div><form onSubmit={e=>{e.preventDefault();void send()}}><input required value={text} onChange={e=>setText(e.target.value)} maxLength={1000} placeholder="Write a comment…" aria-label="Write a Reel comment"/><button>Post</button></form>{error&&<p role="alert">{error}</p>}</div>;
}
