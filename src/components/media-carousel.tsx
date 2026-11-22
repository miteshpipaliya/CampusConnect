'use client';
import {useState} from 'react';
export type CarouselMedia={mediaId:string;url?:string|null;alt?:string;contentType?:string};
export function MediaCarousel({items,ratio='1 / 1'}:{items:CarouselMedia[];ratio?:string}){
 const [index,setIndex]=useState(0),item=items[index];if(!item)return null;
 const src=item.url||'/api/media?id='+encodeURIComponent(item.mediaId);
 return <div tabIndex={0} aria-label="Post media carousel" onKeyDown={e=>{if(e.key==='ArrowLeft')setIndex(i=>Math.max(0,i-1));if(e.key==='ArrowRight')setIndex(i=>Math.min(items.length-1,i+1))}} style={{position:'relative',maxWidth:'100%'}}>
  <div style={{aspectRatio:ratio,overflow:'hidden',display:'grid',placeItems:'center'}}>{item.contentType?.startsWith('video/')?<video src={src} controls playsInline style={{maxWidth:'100%',maxHeight:'100%'}}/>:<img src={src} alt={item.alt||'Campus post media'} loading="lazy" style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}}/>}</div>
  {items.length>1&&<div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><button aria-label="Previous media" disabled={index===0} onClick={()=>setIndex(i=>i-1)}>←</button><span>{index+1} / {items.length}</span><button aria-label="Next media" disabled={index===items.length-1} onClick={()=>setIndex(i=>i+1)}>→</button></div>}
 </div>
}
