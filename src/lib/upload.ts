export type UploadPurpose='avatar'|'post'|'story'|'reel'|'chat';
export async function uploadFile({file,purpose,onProgress,signal,maxRetries=2,durationSec}:{file:File;purpose:UploadPurpose;onProgress?:(fraction:number)=>void;signal?:AbortSignal;maxRetries?:number;durationSec?:number}):Promise<string>{
 for(let attempt=0;attempt<=maxRetries;attempt++){
  try{
   const reserved=await fetch('/api/media',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({action:'reserve',contentType:file.type,size:file.size,purpose,...(durationSec?{durationSec}:{})}),...(signal?{signal}:{})});
   if(!reserved.ok)throw Error('Upload reservation failed');
   const data:unknown=await reserved.json();
   if(!data||typeof data!=='object'||!('id' in data)||!('uploadUrl' in data)||typeof data.id!=='string'||typeof data.uploadUrl!=='string')throw Error('Invalid reservation');
   const id=data.id as string, uploadUrl=data.uploadUrl as string;
   await new Promise<void>((resolve,reject)=>{const xhr=new XMLHttpRequest();xhr.open('PUT',uploadUrl);xhr.setRequestHeader('Content-Type',file.type);xhr.upload.onprogress=e=>{if(e.lengthComputable)onProgress?.(e.loaded/e.total)};xhr.onload=()=>xhr.status>=200&&xhr.status<300?resolve():reject(Error('Upload failed'));xhr.onerror=()=>reject(Error('Network error'));xhr.onabort=()=>reject(Error('Upload aborted'));signal?.addEventListener('abort',()=>xhr.abort(),{once:true});xhr.send(file)});
   const confirmed=await fetch('/api/media',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({action:'confirm',id}),...(signal?{signal}:{})});
   if(!confirmed.ok)throw Error('Upload confirmation failed');
   return id;
  }catch(error){if(signal?.aborted||attempt===maxRetries)throw error;await new Promise(resolve=>setTimeout(resolve,250*2**attempt))}
 }
 throw Error('Upload failed');
}
export async function readImageSize(file:File):Promise<{width:number;height:number}>{
 const bitmap=await createImageBitmap(file);try{return {width:bitmap.width,height:bitmap.height}}finally{bitmap.close()}
}
export async function resizeImage(file:File,{maxEdge,quality=0.85}:{maxEdge:number;quality?:number}):Promise<File>{
 const bitmap=await createImageBitmap(file);
 try{const scale=Math.min(1,maxEdge/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d')?.drawImage(bitmap,0,0,canvas.width,canvas.height);const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Image conversion failed')),'image/jpeg',quality));return new File([blob],file.name.replace(/\.[^.]+$/,'.jpg'),{type:'image/jpeg'})}finally{bitmap.close()}
}
export async function captureVideoPoster(file:File):Promise<Blob>{
 const url=URL.createObjectURL(file),video=document.createElement('video');video.muted=true;video.preload='metadata';video.src=url;
 try{await new Promise<void>((resolve,reject)=>{video.onloadeddata=()=>resolve();video.onerror=()=>reject(Error('Video decode failed'))});const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;canvas.getContext('2d')?.drawImage(video,0,0);return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Poster failed')),'image/jpeg',0.8))}finally{URL.revokeObjectURL(url);video.removeAttribute('src');video.load()}
}

export async function readVideoDuration(file:File):Promise<number>{
 const url=URL.createObjectURL(file),video=document.createElement('video');video.preload='metadata';video.src=url;
 try{return await new Promise<number>((resolve,reject)=>{video.onloadedmetadata=()=>Number.isFinite(video.duration)&&video.duration>0?resolve(video.duration):reject(Error('Invalid video duration'));video.onerror=()=>reject(Error('Cannot read video'))})}
 finally{URL.revokeObjectURL(url);video.removeAttribute('src');video.load()}
}
