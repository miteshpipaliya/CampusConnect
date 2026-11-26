'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
export function clearMediaSession(){
 if(typeof navigator==='undefined'||!('mediaSession' in navigator))return;
 const s=navigator.mediaSession;
 try{s.metadata=null;s.playbackState='none'}catch{}
 const actions:MediaSessionAction[]=['play','pause','stop','seekbackward','seekforward','seekto','previoustrack','nexttrack'];
 for(const action of actions){try{s.setActionHandler(action,null)}catch{}}
 try{s.setPositionState()}catch{}
}
const eligible=(m:HTMLMediaElement)=>!m.srcObject&&!m.hasAttribute('data-cc-call-media');
const playing=(m:HTMLMediaElement)=>eligible(m)&&!m.paused&&!m.ended;
export function MediaLifecycle(){
 const path=usePathname();
 useEffect(()=>{
  const tracked=new Set<HTMLMediaElement>();
  const media=()=>Array.from(document.querySelectorAll<HTMLMediaElement>('audio,video')).filter(eligible);
  const clearIfIdle=()=>{if(!media().some(playing))clearMediaSession()};
  const pauseAll=()=>{for(const m of media())m.pause();clearIfIdle()};
  const observer=new IntersectionObserver(entries=>{for(const e of entries){const m=e.target as HTMLMediaElement;if(e.intersectionRatio===0&&playing(m)&&!m.hidden)m.pause()}},{threshold:[0,.01]});
  const scan=()=>{for(const m of media()){if(!tracked.has(m)){tracked.add(m);if(m.tagName==='VIDEO')observer.observe(m)}}for(const m of tracked){if(!m.isConnected){m.pause();observer.unobserve(m);tracked.delete(m)}}clearIfIdle()};
  const onPlay=(e:Event)=>{const m=e.target;if(!(m instanceof HTMLMediaElement)||!eligible(m))return;if(document.hidden||!m.isConnected){m.pause();return}if(!m.muted&&m.volume>0){for(const other of media())if(other!==m&&playing(other)&&!other.muted&&other.volume>0)other.pause()}};
  const onPause=()=>queueMicrotask(clearIfIdle);
  const visibility=()=>{if(document.hidden)pauseAll()};
  const mutations=new MutationObserver(scan);
  mutations.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('play',onPlay,true);document.addEventListener('pause',onPause,true);document.addEventListener('ended',onPause,true);
  document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',pauseAll);scan();
  return()=>{mutations.disconnect();observer.disconnect();document.removeEventListener('play',onPlay,true);document.removeEventListener('pause',onPause,true);document.removeEventListener('ended',onPause,true);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',pauseAll);for(const m of tracked)if(!m.hidden)m.pause();clearIfIdle()};
 },[path]);
 return null;
}
