'use client';
import {useEffect,useRef,useState} from 'react';
import {Play,Pause,ChevronLeft,ChevronRight} from 'lucide-react';
import {VolumeControl} from './volume-control';
import {playWithSound,setVideoVolume} from '@/lib/client/play-with-sound';
export type CarouselMedia={mediaId:string;url?:string|null;alt?:string;contentType?:string};
function InlineVideo({src}:{src:string}){
 const player=useRef<HTMLVideoElement>(null),[playing,setPlaying]=useState(false),[volume,setVolume]=useState(1),stop=useRef<(()=>void)|null>(null);
 useEffect(()=>{const v=player.current;if(v)setVideoVolume(v,volume)},[volume,src]);
 useEffect(()=>{const hide=()=>{if(document.hidden){stop.current?.();player.current?.pause()}};document.addEventListener('visibilitychange',hide);return()=>{document.removeEventListener('visibilitychange',hide);stop.current?.()}},[]);
 function toggle(){const video=player.current;if(!video)return;if(video.paused){stop.current?.();stop.current=playWithSound(video,volume)}else{stop.current?.();video.pause()}}
 return <div className="cc-inline-video" style={{position:'relative',width:'100%',maxWidth:'100%',display:'grid',placeItems:'center',background:'#0d0f14'}}>
  <video ref={player} src={src} playsInline preload="metadata"
   disablePictureInPicture disableRemotePlayback controlsList="nodownload nofullscreen noremoteplayback"
   onContextMenu={e=>e.preventDefault()} onClick={toggle} onEnded={()=>setPlaying(false)} onPause={()=>setPlaying(false)} onPlay={()=>setPlaying(true)}
   style={{display:'block',width:'100%',height:'auto',maxHeight:'68dvh',objectFit:'contain',cursor:'pointer'}}/>
  <button type="button" aria-label={playing?'Pause video':'Play video'} onClick={toggle} style={{position:'absolute',left:12,bottom:12,border:'0',borderRadius:30,padding:8,color:'#fff',background:'#0009',display:'grid',placeItems:'center'}}>
   {playing?<Pause size={21}/>:<Play size={21}/>}</button>
  <VolumeControl volume={volume} onChange={setVolume}/>
 </div>
}
export function MediaCarousel({items,ratio='1 / 1'}:{items:CarouselMedia[];ratio?:string}){
 const [index,setIndex]=useState(0),item=items[index];
 if(!item)return null;
 const src=item.url||'/api/media?id='+encodeURIComponent(item.mediaId);
 const video=Boolean(item.contentType?.startsWith('video/'));
 return <div className="cc-media-carousel" tabIndex={0} aria-label="Post media carousel" onKeyDown={e=>{if(e.target instanceof HTMLInputElement)return;if(e.key==='ArrowLeft')setIndex(i=>Math.max(0,i-1));if(e.key==='ArrowRight')setIndex(i=>Math.min(items.length-1,i+1))}} style={{position:'relative',maxWidth:'100%'}}>
  <div style={{...(video?{}:{aspectRatio:ratio}),overflow:'hidden',display:'grid',placeItems:'center'}}>
   {video?<InlineVideo key={item.mediaId} src={src}/>:<img src={src} alt={item.alt||'Campus post media'} loading="lazy" style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}}/>}
  </div>
  {items.length>1&&<div className="cc-media-carousel-controls" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
   <button aria-label="Previous media" disabled={index===0} onClick={()=>setIndex(i=>i-1)}><ChevronLeft size={18}/></button>
   <span className="cc-carousel-dots" aria-label={'Media '+(index+1)+' of '+items.length}>{items.map((m,i)=><button key={m.mediaId} type="button" aria-label={'Show media '+(i+1)} aria-current={i===index} onClick={()=>setIndex(i)}/>)}</span>
   <button aria-label="Next media" disabled={index===items.length-1} onClick={()=>setIndex(i=>i+1)}><ChevronRight size={18}/></button>
  </div>}
 </div>;
}
