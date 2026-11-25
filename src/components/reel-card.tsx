'use client';
import {useCallback,useEffect,useRef,useState,type CSSProperties} from 'react';
import Link from 'next/link';
import {playWithSound} from '@/lib/client/play-with-sound';
import {VolumeControl} from './volume-control';
import {Avatar} from './avatar';
import {Heart,MessageCircle,Bookmark,Repeat2,Send,Play,Ellipsis,MapPin,BadgeCheck,Music2} from 'lucide-react';
import {safeVideoAspect} from '@/lib/core/reel-discovery';
import {metaPlacement} from '@/lib/core/reel-meta-layout';
import {fitReelFrame} from '@/lib/core/reel-layout';
import {clampCaption} from '@/lib/core/caption-clamp';
import {ReelMenu} from './reel-menu';
import {ChatShareSheet} from './chat/chat-share-sheet';

export type Reel={id:string;authorUid:string;authorHandle:string;authorName:string;avatarUrl:string|null;caption:string;mediaId:string;mediaUrl:string|null;contentType?:string;likes:number;comments:number;reposts:number;views:number;liked:boolean;saved:boolean;reposted:boolean;isMine:boolean;followStatus:string;createdAt:number;width?:number|null;height?:number|null;location?:string|null;verified?:boolean;shares?:number;saves?:number;commentsOff?:boolean;hideLikeCount?:boolean};
type Action='like'|'save'|'repost';
const format=(n:number)=>n>=1000000?(n/1000000).toFixed(1).replace(/\.0$/,'')+'M':n>=1000?(n/1000).toFixed(1).replace(/\.0$/,'')+'K':String(Math.max(0,n));

export function ReelCard({reel,active,volume,onVolume,mounted=true,preloadNext=false}:{reel:Reel;active:boolean;volume:number;onVolume:(v:number)=>void;mounted?:boolean;preloadNext?:boolean}){
 const player=useRef<HTMLVideoElement>(null),stageRef=useRef<HTMLDivElement>(null),actionsRef=useRef<HTMLDivElement>(null),counted=useRef(false),lastTick=useRef(0),playedMs=useRef(0);
 const [paused,setPaused]=useState(false),[ratio,setRatio]=useState(()=>safeVideoAspect(reel.width??0,reel.height??0)),[progress,setProgress]=useState(0),[frame,setFrame]=useState<{width:number;height:number}|null>(null),[placement,setPlacement]=useState<'left'|'overlay'>('overlay'),[metaWidth,setMetaWidth]=useState(0);
 const [liked,setLiked]=useState(reel.liked),[saved,setSaved]=useState(reel.saved),[reposted,setReposted]=useState(reel.reposted),[likes,setLikes]=useState(reel.likes);
 const [busy,setBusy]=useState(false),[share,setShare]=useState(false),[comments,setComments]=useState(false),[follow,setFollow]=useState(reel.followStatus),[error,setError]=useState(''),[notice,setNotice]=useState(''),[expanded,setExpanded]=useState(false),[menu,setMenu]=useState(false),[removed,setRemoved]=useState(false);
 useEffect(()=>{const v=player.current;if(!v)return;let stop:(()=>void)|undefined;const update=()=>{stop?.();stop=undefined;if(active&&!paused&&!document.hidden)stop=playWithSound(v,volume);else{v.pause();v.muted=true;lastTick.current=0}};update();document.addEventListener('visibilitychange',update);return()=>{document.removeEventListener('visibilitychange',update);stop?.();v.pause()}},[active,paused,mounted,volume,reel.mediaUrl]);
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
   const width=Math.max(0,stage.clientWidth-(window.innerWidth<=768?0:railWidth+gap));
   const height=Math.max(0,stage.clientHeight);
   const next=fitReelFrame(width,height,ratio);
   const meta=metaPlacement(stage.clientWidth,next.width);setMetaWidth(meta.width);
   setPlacement(window.innerWidth>720&&ratio<.9&&meta.placement==='outside'?'left':'overlay');
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
   void fetch('/api/posts/'+reel.id+'/view',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({watchMs:Math.floor(playedMs.current)})}).then(r=>{if(!r.ok)counted.current=false}).catch(()=>{counted.current=false});
  }
 }
 const caption=clampCaption(reel.caption);
 if(removed)return <article data-reel-card className="cc-reel-card"><p>Reel removed.</p></article>;
 const videoStyle={aspectRatio:String(ratio),...(frame&&frame.width>0&&frame.height>0?{width:frame.width,height:frame.height}:{} )} as CSSProperties;
 const authorBlock=<div className={"cc-reel-caption cc-reel-caption-"+placement} data-caption-placement={placement} style={placement==='left'?{width:metaWidth}:undefined}>
     <Link className="cc-reel-caption-avatar" href={'/profile/'+encodeURIComponent(reel.authorHandle)} aria-label={'Profile of '+reel.authorHandle}><Avatar user={{name:reel.authorName,handle:reel.authorHandle,avatarUrl:reel.avatarUrl}} size={40}/></Link><div className="cc-reel-caption-copy">
     <div className="cc-reel-author">
      <Link href={'/profile/'+encodeURIComponent(reel.authorHandle)}><strong>@{reel.authorHandle}</strong>{reel.verified&&<BadgeCheck size={15} aria-label="Verified"/>}</Link>
      {!reel.isMine&&<button type="button" onClick={()=>void followToggle()}>{follow==='active'?'Following':follow==='pending'?'Requested':'Follow'}</button>}
     </div>
     <small className="cc-reel-audio-line"><Music2 size={12}/> Original audio</small>
     {reel.location&&<small className="cc-reel-location"><MapPin size={12}/>{reel.location}</small>}{reel.caption&&<><p className={expanded?'cc-caption-expanded':'cc-caption-short'}>{(expanded?reel.caption:caption.short).split(/([#@][a-zA-Z0-9_.]+)/g).map((part,i)=>part.startsWith('#')?<Link key={i} href={'/explore/tags/'+encodeURIComponent(part.slice(1))}>{part}</Link>:part.startsWith('@')?<Link key={i} href={'/profile/'+encodeURIComponent(part.slice(1))}>{part}</Link>:part)}</p>{(caption.truncated||reel.caption.length>45)&&<button className="cc-caption-more" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}>{expanded?'Less':'… more'}</button>}</>}
    </div></div>;
 return <article data-reel-card className="cc-reel-card" aria-label={'Reel by '+reel.authorHandle}>
  <div className={"cc-reel-stage cc-reel-stage-"+placement} ref={stageRef}>
   {placement==='left'&&authorBlock}
   <div className="cc-reel-video-box" style={videoStyle}>
    {mounted&&reel.mediaUrl?<video ref={player} src={reel.mediaUrl} playsInline loop preload={active||preloadNext?'auto':'none'}
     disablePictureInPicture disableRemotePlayback controlsList="nodownload nofullscreen noremoteplayback"
     onContextMenu={e=>e.preventDefault()} onTimeUpdate={onTimeUpdate} onPause={()=>{lastTick.current=0}}
     onLoadedMetadata={e=>setRatio(safeVideoAspect(e.currentTarget.videoWidth,e.currentTarget.videoHeight))}
     onClick={()=>setPaused(v=>!v)} onDoubleClick={()=>{if(!liked)void action('like')}} onError={()=>setError('This Reel could not be loaded. Retry by refreshing the page.')}/>:mounted?<p>Video unavailable</p>:null}
    {paused&&<button type="button" className="cc-reel-play" aria-label="Resume Reel" onClick={()=>setPaused(false)}><Play size={28} fill="white"/></button>}
    {active&&<VolumeControl volume={volume} onChange={onVolume}/>}
    {placement==='overlay'&&authorBlock}
    <div className="cc-reel-progress" role="progressbar" aria-label="Video playback progress" aria-valuenow={Math.round(progress*100)} aria-valuemin={0} aria-valuemax={100}><span style={{width:(progress*100)+'%'}}/></div>
   </div>
   <div className="cc-reel-actions" aria-label="Reel actions" ref={actionsRef}>
    <button type="button" onClick={()=>void action('like')} aria-label={liked?'Unlike Reel':'Like Reel'} aria-pressed={liked}><Heart fill={liked?'currentColor':'none'} size={27}/>{!reel.hideLikeCount&&<small>{format(likes)}</small>}</button>
    <button type="button" onClick={()=>setComments(true)} aria-label="View comments"><MessageCircle size={27}/><small>{format(reel.comments)}</small></button>
    <button type="button" onClick={()=>void action('repost')} aria-pressed={reposted} aria-label={reposted?'Undo repost':'Repost'}><Repeat2 size={27}/><small>{format(reel.reposts+(reposted&&!reel.reposted?1:!reposted&&reel.reposted?-1:0))}</small></button>
    <button type="button" onClick={()=>setShare(true)} aria-label="Send Reel"><Send size={27}/><small>{format(reel.shares??0)}</small></button>
    <button type="button" onClick={()=>void action('save')} aria-pressed={saved} aria-label={saved?'Unsave Reel':'Save Reel'}><Bookmark fill={saved?'currentColor':'none'} size={27}/></button>
    <button type="button" onClick={()=>setMenu(v=>!v)} aria-label="Reel options" aria-expanded={menu}><Ellipsis size={26}/></button>
    <Link className="cc-reel-audio-cover" href={'/profile/'+encodeURIComponent(reel.authorHandle)} aria-label="Author profile"><Avatar user={{handle:reel.authorHandle,avatarUrl:reel.avatarUrl}} size={24}/></Link>
   </div>
  </div>
  {notice&&<p className="cc-reel-notice" role="status">{notice}</p>}
  {error&&<p className="cc-reel-notice" role="alert">{error}</p>}
  {menu&&<ReelMenu reel={reel} following={follow==='active'} onClose={()=>setMenu(false)} onRemoved={()=>setRemoved(true)} onNotice={setNotice} onUnfollow={()=>setFollow('none')}/>}
  {comments&&<ReelComments id={reel.id} onClose={()=>setComments(false)}/>}
  {share&&<div className="cc-reel-share-panel"><ChatShareSheet postId={reel.id} onClose={()=>setShare(false)}/></div>}
 </article>;
}

function ReelComments({id,onClose}:{id:string;onClose:()=>void}){
 const [items,setItems]=useState<Array<{id:string;handle:string;text:string}>>([]),[text,setText]=useState(''),[error,setError]=useState(''),[sending,setSending]=useState(false);
 const load=useCallback(async()=>{const r=await fetch('/api/posts/'+id+'/comments',{cache:'no-store'}),d=await r.json();if(!r.ok)throw Error(d.error||'Comments unavailable');setItems(Array.isArray(d.comments)?d.comments:[])},[id]);
 useEffect(()=>{void load().catch(e=>setError(e instanceof Error?e.message:'Comments unavailable'))},[load]);
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
