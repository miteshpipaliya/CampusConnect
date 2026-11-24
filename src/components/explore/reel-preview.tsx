'use client';
import {useEffect,useRef,useState} from 'react';
/** A single hovered player is mounted by the parent; detached legacy frame decoders are serialized. */
let queue:Promise<void>=Promise.resolve();
function capture(src:string,signal:AbortSignal):Promise<string|null>{return new Promise(resolve=>{
 const v=document.createElement('video');v.muted=true;v.playsInline=true;v.crossOrigin='anonymous';v.preload='auto';
 let done=false;const timer=window.setTimeout(()=>finish(null),6000);
 function finish(url:string|null){if(done){if(url)URL.revokeObjectURL(url);return}done=true;clearTimeout(timer);signal.removeEventListener('abort',cancel);v.onloadeddata=null;v.onerror=null;v.pause();v.removeAttribute('src');v.load();resolve(url)}
 const cancel=()=>finish(null);signal.addEventListener('abort',cancel,{once:true});if(signal.aborted){cancel();return}
 v.onerror=()=>finish(null);v.onloadeddata=()=>{try{const c=document.createElement('canvas'),scale=Math.min(1,480/Math.max(v.videoWidth,v.videoHeight));c.width=Math.max(1,Math.round(v.videoWidth*scale));c.height=Math.max(1,Math.round(v.videoHeight*scale));const ctx=c.getContext('2d');if(!ctx){finish(null);return}ctx.drawImage(v,0,0,c.width,c.height);c.toBlob(blob=>finish(blob?URL.createObjectURL(blob):null),'image/jpeg',.8)}catch{finish(null)}};v.src=src;
})}
export function useLegacyPoster(src:string|null,enabled:boolean){
 const node=useRef<HTMLDivElement>(null),[url,setUrl]=useState<string|null>(null);
 useEffect(()=>{const el=node.current;if(!src||!enabled||!el)return;const controller=new AbortController();let owned:string|null=null;
 const obs=new IntersectionObserver(entries=>{if(!entries.some(e=>e.isIntersecting))return;obs.disconnect();queue=queue.catch(()=>{}).then(async()=>{if(controller.signal.aborted)return;const result=await capture(src,controller.signal);if(controller.signal.aborted){if(result)URL.revokeObjectURL(result);return}owned=result;setUrl(result)})},{rootMargin:'80px'});obs.observe(el);
 return()=>{obs.disconnect();controller.abort();if(owned)URL.revokeObjectURL(owned);setUrl(null)}
 },[src,enabled]);return {node,url};
}
export function HoverVideo({src,onFailure}:{src:string;onFailure:()=>void}){
 const ref=useRef<HTMLVideoElement>(null),failed=useRef(onFailure);failed.current=onFailure;
 useEffect(()=>{const v=ref.current;if(!v)return;let alive=true;v.muted=true;v.defaultMuted=true;v.src=src;const hide=()=>{if(document.hidden)v.pause();else void Promise.resolve(v.play()).catch(()=>{})};void Promise.resolve(v.play()).catch(()=>{if(alive)failed.current()});document.addEventListener('visibilitychange',hide);return()=>{alive=false;document.removeEventListener('visibilitychange',hide);v.pause();v.removeAttribute('src');v.load()}},[src]);
 return <video ref={ref} className="cc-explore-hover-video" muted loop playsInline preload="none" aria-hidden="true" disablePictureInPicture onError={()=>failed.current()}/>;
}
