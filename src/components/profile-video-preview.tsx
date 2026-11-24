'use client';
import {useEffect,useRef,useState} from 'react';
import {Clapperboard} from 'lucide-react';
import {reelPreviewTime} from '@/lib/core/reel-preview-time';
export function ProfileVideoPreview({src,id}:{src:string;id:string}){
 const root=useRef<HTMLDivElement>(null);
 const [near,setNear]=useState(false),[failed,setFailed]=useState(false),[ready,setReady]=useState(false);
 useEffect(()=>{const node=root.current;if(!node)return;if(!('IntersectionObserver' in window)){setNear(true);return}const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setNear(true);observer.disconnect()}},{rootMargin:'160px'});observer.observe(node);return()=>observer.disconnect()},[]);
 return <div ref={root} className="cc-profile-video-preview">{near&&!failed&&<video className="cc-profile-video-preview" src={src} muted playsInline preload="metadata" aria-hidden="true" onLoadedMetadata={event=>{const v=event.currentTarget;try{v.currentTime=reelPreviewTime(id,v.duration);if(v.currentTime===0&&v.readyState>=2)setReady(true)}catch{setReady(v.readyState>=2)}}} onSeeked={()=>setReady(true)} onLoadedData={event=>{if(!event.currentTarget.seeking)setReady(true)}} onError={()=>setFailed(true)}/>}
 {!ready&&<span className="cc-profile-preview-status"><Clapperboard size={22}/>{failed?'Preview unavailable':'Loading preview…'}</span>}</div>
}
