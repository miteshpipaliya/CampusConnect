import {normalizeVolume,mayRetryMuted} from '../core/audio-policy';
const gestures=['pointerdown','pointerup','keydown','touchstart','touchend','wheel'] as const;
type Route={source:MediaElementAudioSourceNode;gain:GainNode;connected:boolean};
const routes=new WeakMap<HTMLVideoElement,Route>();
let context:AudioContext|null=null;
let stopCurrent:(()=>void)|null=null;
const isCall=(video:HTMLVideoElement)=>Boolean(video.srcObject||video.hasAttribute('data-cc-call-media'));
function audioContext(){
 if(context)return context;
 const Ctor=window.AudioContext||(window as Window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
 if(!Ctor)return null;
 try{context=new Ctor();return context}catch{return null}
}
function resumeContext(){if(context&&context.state!=='running')void context.resume().catch(()=>{})}
function routeVideo(video:HTMLVideoElement):Route|undefined{
 if(isCall(video))return;
 // Preserve Safari/iOS native audio behaviour; Android Chrome is the target of this change.
 if(!routes.has(video)&&/iPad|iPhone|iPod/.test(navigator.userAgent))return;
 let route=routes.get(video);
 if(!route){
  // A CORS-enabled load is essential: cross-origin media otherwise outputs silence.
  if(video.crossOrigin===null||video.readyState<1)return;
  const ctx=audioContext();if(!ctx)return;
  try{const gain=ctx.createGain();gain.gain.value=0;const source=ctx.createMediaElementSource(video);route={source,gain,connected:false};routes.set(video,route)}catch{return}
 }
 if(!route.connected){try{route.source.connect(route.gain);route.gain.connect(route.source.context.destination);route.connected=true}catch{return}}
 return route
}
// Retry a failed CORS media request using native playback, before a graph owns the element.
export function retryNativeVideo(video:HTMLVideoElement):boolean{
 if(video.crossOrigin===null||routes.has(video)||isCall(video))return false;
 video.removeAttribute('crossorigin');video.load();return true;
}
export function releaseVideoAudio(video:HTMLVideoElement){
 const route=routes.get(video);if(!route)return;
 route.gain.gain.value=0;route.source.disconnect();route.gain.disconnect();route.connected=false;
 // Keep the weak entry: the same element cannot be passed to createMediaElementSource twice.
}
export function setVideoVolume(video:HTMLVideoElement,value:number){
 const volume=normalizeVolume(value),route=routes.get(video);
 if(route?.connected){route.gain.gain.value=volume;video.volume=1;video.muted=false}
 else{video.volume=volume;video.muted=volume===0}
}
export function playWithSound(video:HTMLVideoElement,value:number):()=>void{
 if(isCall(video))return ()=>{};
 stopCurrent?.();let active=true,unlocking=false,waiting=false;const volume=normalizeVolume(value);
 const detach=()=>gestures.forEach(event=>document.removeEventListener(event,unlock,true));
 const attach=()=>gestures.forEach(event=>document.addEventListener(event,unlock,{capture:true,passive:true}));
 const silence=()=>{const route=routes.get(video);if(route?.connected)route.gain.gain.value=0;video.muted=true};
 const apply=()=>{if(!active)return;routeVideo(video);resumeContext();setVideoVolume(video,volume);if(context&&routes.get(video)?.connected&&context.state!=='running'&&volume>0){waiting=true;attach()}};
 const ready=()=>{if(active&&!waiting){apply();if(video.paused)void video.play().catch(error=>{if(active&&mayRetryMuted(error,volume)){waiting=true;silence();attach();void video.play().catch(()=>detach())}})}};
 const stop=()=>{if(!active)return;active=false;detach();video.removeEventListener('loadedmetadata',ready);video.pause();silence();if(stopCurrent===stop)stopCurrent=null};
 const unlock=()=>{if(!active||document.hidden||unlocking)return;unlocking=true;waiting=false;apply();resumeContext();void video.play().then(()=>{if(active&&(!routes.get(video)?.connected||context?.state==='running'))detach()}).catch(()=>{if(active){waiting=true;silence();attach()}}).finally(()=>{unlocking=false;if(!active)video.pause()})};
 stopCurrent=stop;
 video.addEventListener('loadedmetadata',ready);
 apply();
 void video.play().catch(async error=>{if(!active||!mayRetryMuted(error,volume))return;waiting=true;silence();attach();try{await video.play()}catch{detach()}if(!active)video.pause()});
 return stop;
}
