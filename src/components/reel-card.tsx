'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import Link from 'next/link';
import {Avatar} from './avatar';
import {Heart,MessageCircle,Bookmark,Repeat2,Volume2,VolumeX,Send,Play,Ellipsis} from 'lucide-react';
import {safeVideoAspect} from '@/lib/core/reel-discovery';
import {fitReelFrame} from '@/lib/core/reel-layout';
import {ChatShareSheet} from './chat/chat-share-sheet';

export type Reel={id:string;authorUid:string;authorHandle:string;authorName:string;avatarUrl:string|null;caption:string;mediaId:string;mediaUrl:string|null;contentType?:string;likes:number;comments:number;reposts:number;views:number;liked:boolean;saved:boolean;reposted:boolean;isMine:boolean;followStatus:string;createdAt:number};
type Action='like'|'save'|'repost';
const format=(n:number)=>n>=1000000?(n/1000000).toFixed(1).replace(/\.0$/,'')+'M':n>=1000?(n/1000).toFixed(1).replace(/\.0$/,'')+'K':String(Math.max(0,n));

export function ReelCard({reel,active,muted,onMute}:{reel:Reel;active:boolean;muted:boolean;onMute:(v:boolean)=>void}){
 const player=useRef<HTMLVideoElement>(null),stageRef=useRef<HTMLDivElement>(null),actionsRef=useRef<HTMLDivElement>(null),counted=useRef(false),lastTick=useRef(0),playedMs=useRef(0);
 const [paused,setPaused]=useState(false),[ratio,setRatio]=useState(9/16),[progress,setProgress]=useState(0),[frame,setFrame]=useState<{width:number;height:number}|null>(null);
 const [liked,setLiked]=useState(reel.liked),[saved,setSaved]=useState(reel.saved),[reposted,setReposted]=useState(reel.reposted),[likes,setLikes]=useState(reel.likes);
 const [busy,setBusy]=useState(false),[share,setShare]=useState(false),[comments,setComments]=useState(false),[follow,setFollow]=useState(reel.followStatus),[error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{const v=player.current;if(!v)return;if(active&&!paused&&!document.hidden)void v.play().catch(()=>{});else v.pause()},[active,paused]);
 useEffect(()=>{const handler=()=>{if(document.hidden){player.current?.pause();lastTick.current=0}else if(active&&!paused)void player.current?.play().catch(()=>{})};
  document.addEventListener('visibilitychange',handler);return()=>document.removeEventListener('visibilitychange',handler)
 },[active,paused]);
 useEffect(()=>{setLiked(reel.liked);setSaved(reel.saved);setReposted(reel.reposted);setLikes(reel.likes)},[reel.liked,reel.saved,reel.reposted,reel.likes]);
 // Fit the actual source aspect ratio into the available Reel workspace. Do not
 // rely on calc(length * CSS variable), which can be treated as invalid width
 // and leave the video at its tiny intrinsic size.
 useEffect(()=>{
  const stage=stageRef.current;if(!stage)return;
  const measure=()=>{
   const controls=actionsRef.current;
   const gap=Number.parseFloat(window.getComputedStyle(stage).columnGap)||16;
   const railWidth=controls?.getBoundingClientRect().width||62;
   const width=Math.max(0,stage.clientWidth-railWidth-gap-12);
   const height=Math.max(0,stage.clientHeight-20);
   const next=fitReelFrame(width,height,ratio);
   setFrame(prev=>prev?.width===next.width&&prev?.height===next.height?prev:next);
  };
  measure();
  const observer=new ResizeObserver(measure);
  observer.observe(stage);
  if(actionsRef.current)observer.observe(actionsRef.current);
  return()=>observer.disconnect();
 },[ratio]);
 async function action(which:Action){
  if(busy)return;setBusy(true);setError('');const old=[liked,saved,reposted,likes] as const;
  if(which==='like'){setLiked(!liked);setLikes(x=>Math.max(0,x+(liked?-1:1)))}
  if(which==='save')setSaved(!saved);
  if(which==='repost')setReposted(!reposted);
  try{
   const url=which==='like'?'/api/posts/'+reel.id+'/likes':which==='save'?'/api/saves':'/api/reposts';
   const response=await fetch(url,{method:which==='save'&&saved?'DELETE':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(which==='like'?{}:{postId:reel.id})});
   const result=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(result.error||'Unable to update');
   if(which==='like')setLiked(Boolean(result.liked));
   if(which==='save')setSaved(Boolean(result.saved));
   if(which==='repost')setReposted(Boolean(result.reposted));
  }catch(e){setLiked(old[0]);setSaved(old[1]);setReposted(old[2]);setLikes(old[3]);setError(e instanceof Error?e.message:'Action failed')}
  finally{setBusy(false)}
 }
 async function followToggle(){
  const old=follow,isFollowing=old==='active'||old==='pending';setFollow(isFollowing?'none':'active');
  try{
   const res=await fetch('/api/follow',{method:isFollowing?'DELETE':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({handle:reel.authorHandle})});
   const result=await res.json().catch(()=>({}));if(!res.ok)throw Error(result.error||'Follow unavailable');
   setFollow(String(result.status||'none'));
  }catch(e){setFollow(old);setError(e instanceof Error?e.message:'Follow failed')}
 }
 function onTimeUpdate(){
  const el=player.current;if(!el)return;
  if(el.duration>0)setProgress(el.currentTime/el.duration);
  if(!active||el.paused)return;
  const now=performance.now();
  if(lastTick.current)playedMs.current+=Math.min(900,now-lastTick.current);
  lastTick.current=now;
  if(!counted.current&&playedMs.current>=3000){
   counted.current=true;
   void fetch('/api/posts/'+reel.id+'/view',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({watchMs:Math.floor(playedMs.current)})}).catch(()=>{counted.current=false});
  }
 }
 async function copyLink(){
  try{await navigator.clipboard.writeText(window.location.origin+'/posts/'+encodeURIComponent(reel.id));setNotice('Link copied')}
  catch{setError('Unable to copy the Reel link')}
 }
 const videoStyle={aspectRatio:String(ratio),...(frame&&frame.width>0&&frame.height>0?{width:frame.width,height:frame.height}:{} )} as CSSProperties;
 return <article data-reel-card className="cc-reel-card" aria-label={'Reel by '+reel.authorHandle}>
  <div className="cc-reel-stage" ref={stageRef}>
   <div className="cc-reel-video-box" style={videoStyle}>
    {reel.mediaUrl?<video ref={player} src={reel.mediaUrl} playsInline muted={muted} loop preload={active?'auto':'metadata'}
     disablePictureInPicture disableRemotePlayback controlsList="nodownload nofullscreen noremoteplayback"
     onContextMenu={e=>e.preventDefault()} onTimeUpdate={onTimeUpdate} onPause={()=>{lastTick.current=0}}
     onLoadedMetadata={e=>setRatio(safeVideoAspect(e.currentTarget.videoWidth,e.currentTarget.videoHeight))}
     onClick={()=>setPaused(v=>!v)} onError={()=>setError('This Reel could not be loaded. Retry by refreshing the page.')}/>:<p>Video unavailable</p>}
    {paused&&<button type="button" className="cc-reel-play" aria-label="Resume Reel" onClick={()=>setPaused(false)}><Play size={28} fill="white"/></button>}
    <button type="button" className="cc-reel-mute" aria-label={muted?'Unmute Reel':'Mute Reel'} onClick={()=>onMute(!muted)}>{muted?<VolumeX size={19}/>:<Volume2 size={19}/>}</button>
    <div className="cc-reel-caption">
     <div className="cc-reel-author">
      <Link href={'/profile/'+encodeURIComponent(reel.authorHandle)}><Avatar user={{name:reel.authorName,handle:reel.authorHandle,avatarUrl:reel.avatarUrl}} size={32}/><strong>@{reel.authorHandle}</strong></Link>
      {!reel.isMine&&<button type="button" onClick={()=>void followToggle()}>{follow==='active'?'Following':follow==='pending'?'Requested':'Follow'}</button>}
     </div>
     {reel.caption&&<p>{reel.caption}</p>}
     <small>Original audio</small>
    </div>
    <div className="cc-reel-progress" role="progressbar" aria-label="Video playback progress" aria-valuenow={Math.round(progress*100)} aria-valuemin={0} aria-valuemax={100}><span style={{width:(progress*100)+'%'}}/></div>
   </div>
   <div className="cc-reel-actions" aria-label="Reel actions" ref={actionsRef}>
    <button type="button" onClick={()=>void action('like')} aria-label={liked?'Unlike Reel':'Like Reel'} aria-pressed={liked}><Heart fill={liked?'currentColor':'none'} size={27}/><small>{format(likes)}</small></button>
    <button type="button" onClick={()=>setComments(true)} aria-label="View comments"><MessageCircle size={27}/><small>{format(reel.comments)}</small></button>
    <button type="button" onClick={()=>void action('repost')} aria-pressed={reposted} aria-label={reposted?'Undo repost':'Repost'}><Repeat2 size={27}/><small>{format(reel.reposts+(reposted&&!reel.reposted?1:!reposted&&reel.reposted?-1:0))}</small></button>
    <button type="button" onClick={()=>setShare(true)} aria-label="Send Reel"><Send size={27}/></button>
    <button type="button" onClick={()=>void action('save')} aria-pressed={saved} aria-label={saved?'Unsave Reel':'Save Reel'}><Bookmark fill={saved?'currentColor':'none'} size={27}/></button>
    <button type="button" onClick={()=>void copyLink()} aria-label="Copy Reel link"><Ellipsis size={26}/></button>
   </div>
  </div>
  {notice&&<p className="cc-reel-notice" role="status">{notice}</p>}
  {error&&<p className="cc-reel-notice" role="alert">{error}</p>}
  {comments&&<ReelComments id={reel.id} onClose={()=>setComments(false)}/>}
  {share&&<div className="cc-reel-share-panel"><ChatShareSheet postId={reel.id} onClose={()=>setShare(false)}/></div>}
 </article>;
}

function ReelComments({id,onClose}:{id:string;onClose:()=>void}){
 const [items,setItems]=useState<Array<{id:string;handle:string;text:string}>>([]),[text,setText]=useState(''),[error,setError]=useState(''),[sending,setSending]=useState(false);
 const load=async()=>{const r=await fetch('/api/posts/'+id+'/comments',{cache:'no-store'}),d=await r.json();if(!r.ok)throw Error(d.error||'Comments unavailable');setItems(Array.isArray(d.comments)?d.comments:[])};
 useEffect(()=>{void load().catch(e=>setError(e instanceof Error?e.message:'Comments unavailable'))},[id]);
 async function send(){
  if(sending||!text.trim())return;setSending(true);setError('');
  try{const r=await fetch('/api/posts/'+id+'/comments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:text.trim()})});if(!r.ok)throw Error((await r.json()).error||'Comment failed');setText('');await load()}
  catch(e){setError(e instanceof Error?e.message:'Comment failed')}finally{setSending(false)}
 }
 return <section className="cc-reel-comments" role="dialog" aria-modal="true" aria-label="Reel comments">
  <header><strong>Comments</strong><button type="button" onClick={onClose}>Close</button></header>
  <div className="cc-reel-comment-list">{items.map(c=><p key={c.id}><b>@{c.handle}</b> {c.text}</p>)}</div>
  <form onSubmit={e=>{e.preventDefault();void send()}}><input required value={text} onChange={e=>setText(e.target.value)} maxLength={1000} placeholder="Write a comment…" aria-label="Write Reel comment"/><button disabled={sending||!text.trim()}>{sending?'Posting…':'Post'}</button></form>
  {error&&<p role="alert">{error}</p>}
 </section>;
}
