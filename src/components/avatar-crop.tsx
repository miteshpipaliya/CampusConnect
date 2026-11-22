'use client';
import {useEffect,useRef,useState} from 'react';
type Props={file:File;onCancel:()=>void;onConfirm:(file:File)=>Promise<void>};
const SIZE=320;
export function AvatarCrop({file,onCancel,onConfirm}:Props){
 const canvas=useRef<HTMLCanvasElement>(null),image=useRef<HTMLImageElement|null>(null),drag=useRef<{x:number;y:number;panX:number;panY:number}|null>(null);
 const [zoom,setZoom]=useState(1),[pan,setPan]=useState({x:0,y:0}),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  let active=true;const url=URL.createObjectURL(file);const img=new Image();
  img.onload=()=>{if(active){image.current=img;setReady(true)}};img.onerror=()=>{if(active)setError('Could not read this image')};img.src=url;
  return()=>{active=false;image.current=null;URL.revokeObjectURL(url)};
 },[file]);
 function draw(target:HTMLCanvasElement){
  const ctx=target.getContext('2d'),img=image.current;if(!ctx||!img)return false;
  const side=target.width,scale=Math.max(side/img.naturalWidth,side/img.naturalHeight)*zoom,w=img.naturalWidth*scale,h=img.naturalHeight*scale;
  ctx.clearRect(0,0,side,side);ctx.drawImage(img,(side-w)/2+pan.x*(w-side)/2,(side-h)/2+pan.y*(h-side)/2,w,h);
  return true;
 }
 useEffect(()=>{if(canvas.current&&ready)draw(canvas.current)},[zoom,pan,ready]);
 function move(event:React.PointerEvent<HTMLCanvasElement>){
  if(!drag.current||!image.current)return;
  const img=image.current,scale=Math.max(SIZE/img.naturalWidth,SIZE/img.naturalHeight)*zoom;
  const extraX=Math.max(0,img.naturalWidth*scale-SIZE),extraY=Math.max(0,img.naturalHeight*scale-SIZE);
  const start=drag.current;
  setPan({x:extraX?Math.max(-1,Math.min(1,start.panX+2*(event.clientX-start.x)/extraX)):0,y:extraY?Math.max(-1,Math.min(1,start.panY+2*(event.clientY-start.y)/extraY)):0});
 }
 async function save(){
  if(!image.current)return;setBusy(true);setError('');
  try{
   const output=document.createElement('canvas');output.width=512;output.height=512;
   if(!draw(output))throw Error('Could not crop photo');
   const blob=await new Promise<Blob>((resolve,reject)=>output.toBlob(result=>result?resolve(result):reject(Error('Could not save photo')),'image/jpeg',0.9));
   await onConfirm(new File([blob],'avatar.jpg',{type:'image/jpeg'}));
  }catch(e){setError(e instanceof Error?e.message:'Crop failed');setBusy(false)}
 }
 return <div role="dialog" aria-modal="true" aria-label="Crop profile photo" style={{position:'fixed',inset:0,zIndex:1000,background:'#000c',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
  <section style={{maxWidth:370,width:'100%',background:'#191527',color:'#fff',borderRadius:16,padding:20,display:'grid',gap:14}}>
   <h2>Crop profile photo</h2><p>Drag to position the photo, then adjust the zoom.</p>
   <canvas ref={canvas} width={SIZE} height={SIZE} role="img" aria-label="Profile photo crop preview" onPointerDown={e=>{drag.current={x:e.clientX,y:e.clientY,panX:pan.x,panY:pan.y};e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={move} onPointerUp={()=>{drag.current=null}} onPointerCancel={()=>{drag.current=null}} style={{width:'100%',aspectRatio:'1',borderRadius:12,touchAction:'none',cursor:'move',background:'#2a2636'}}/>
   <label>Zoom <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={e=>setZoom(Number(e.target.value))} style={{width:'100%'}}/></label>
   {error&&<p role="alert">{error}</p>}
   <div style={{display:'flex',gap:12}}><button type="button" onClick={onCancel} disabled={busy}>Cancel</button><button type="button" disabled={!ready||busy} onClick={()=>void save()}>{busy?'Uploading…':'Save photo'}</button></div>
  </section>
 </div>;
}
