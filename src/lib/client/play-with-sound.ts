import {normalizeVolume,mayRetryMuted} from '../core/audio-policy';
const gestures=['pointerdown','pointerup','keydown','touchstart','touchend','wheel'] as const;
let stopCurrent:(()=>void)|null=null;
export function setVideoVolume(video:HTMLVideoElement,value:number){const volume=normalizeVolume(value);video.volume=volume;video.muted=volume===0}
/** The active video owns playback; cancel stale retries and gesture listeners on navigation. */
export function playWithSound(video:HTMLVideoElement,value:number):()=>void{
 stopCurrent?.();let active=true,unlocking=false;const volume=normalizeVolume(value);
 const detach=()=>gestures.forEach(event=>document.removeEventListener(event,unlock,true));
 const stop=()=>{if(!active)return;active=false;detach();video.pause();video.muted=true;if(stopCurrent===stop)stopCurrent=null};
 const unlock=()=>{if(!active||document.hidden||unlocking||video.paused)return;unlocking=true;setVideoVolume(video,volume);void video.play().then(()=>{detach()}).catch(()=>{if(active)video.muted=true}).finally(()=>{unlocking=false})};
 stopCurrent=stop;
 setVideoVolume(video,volume);
 void video.play().catch(async error=>{if(!active||!mayRetryMuted(error,volume))return;video.muted=true;gestures.forEach(event=>document.addEventListener(event,unlock,{capture:true,passive:true}));try{await video.play()}catch{detach()}if(!active)video.pause()});
 return stop;
}
