import {normalizeVolume,mayRetryMuted} from '../core/audio-policy';
const gestures=['pointerdown','keydown','touchstart','wheel'] as const;
export function setVideoVolume(video:HTMLVideoElement,value:number){const volume=normalizeVolume(value);video.volume=volume;video.muted=volume===0}
/** A cancellation handle prevents a rejected play or a later gesture from reviving an inactive video. */
export function playWithSound(video:HTMLVideoElement,value:number):()=>void{
 let active=true;const volume=normalizeVolume(value);
 const detach=()=>gestures.forEach(event=>document.removeEventListener(event,unlock,true));
 const unlock=()=>{detach();if(!active||document.hidden||video.paused)return;setVideoVolume(video,volume);void video.play().catch(()=>{if(active)video.muted=true})};
 setVideoVolume(video,volume);
 void video.play().catch(async error=>{if(!active||!mayRetryMuted(error,volume))return;video.muted=true;try{await video.play()}catch{return}if(active)gestures.forEach(event=>document.addEventListener(event,unlock,{capture:true,passive:true,once:true}));else video.pause()});
 return()=>{active=false;detach();video.pause();video.muted=true};
}
