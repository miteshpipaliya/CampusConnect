'use client';
import {useEffect,useRef,useState,type ChangeEvent} from 'react';
import {validateFileForPurpose} from '@/lib/core/content-rules';

type Props={recipientHandle:string;onSent:()=>Promise<void>};
async function postJson(path:string,body:object,signal?:AbortSignal):Promise<Record<string,unknown>>{
 const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(body),...(signal?{signal}:{})});
 const data:Record<string,unknown>=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(typeof data.error==='string'?data.error:'Request failed ('+response.status+')');
 return data;
}
async function uploadSigned(url:string,file:File,xhr:XMLHttpRequest,progress:(value:number)=>void):Promise<void>{
 return new Promise((resolve,reject)=>{
  xhr.open('PUT',url);
  xhr.setRequestHeader('Content-Type',file.type);
  xhr.upload.onprogress=event=>{if(event.lengthComputable)progress(Math.round(event.loaded/event.total*100))};
  xhr.onload=()=>xhr.status>=200&&xhr.status<300?resolve():reject(Error('Upload failed ('+xhr.status+'). Try again.'));
  xhr.onerror=()=>reject(Error('Network error while uploading'));
  xhr.onabort=()=>reject(Error('Upload canceled'));
  xhr.send(file);
 });
}
export function ChatMediaUpload({recipientHandle,onSent}:Props){
 const [file,setFile]=useState<File|null>(null),[preview,setPreview]=useState<string|null>(null),[progress,setProgress]=useState(0),[error,setError]=useState(''),[busy,setBusy]=useState(false),[sending,setSending]=useState(false);
 const xhr=useRef<XMLHttpRequest|null>(null),abort=useRef<AbortController|null>(null),phase=useRef<'idle'|'upload'|'send'>('idle');
 useEffect(()=>()=>{abort.current?.abort();xhr.current?.abort()},[]);
 useEffect(()=>{
  if(!file){setPreview(null);return}
  const url=URL.createObjectURL(file);setPreview(url);
  return()=>URL.revokeObjectURL(url);
 },[file]);
 const select=(event:ChangeEvent<HTMLInputElement>)=>{
  const chosen=event.target.files?.[0]??null;
  event.target.value='';
  setError('');setProgress(0);
  if(!chosen){setFile(null);return}
  const valid=validateFileForPurpose(chosen,'chat');
  if(!valid.ok){setError(valid.message);setFile(null);return}
  setFile(chosen);
 };
 const send=async()=>{
  if(!file||busy)return;
  setBusy(true);setError('');setProgress(0);
  const controller=new AbortController();abort.current=controller;phase.current='upload';
  try{
   const reserved=await postJson('/api/media',{action:'reserve',purpose:'chat',contentType:file.type,size:file.size},controller.signal);
   if(controller.signal.aborted)throw Error('Upload canceled');
   if(typeof reserved.uploadUrl!=='string'||typeof reserved.id!=='string')throw Error('Upload reservation failed');
   const request=new XMLHttpRequest();xhr.current=request;
   await uploadSigned(reserved.uploadUrl,file,request,setProgress);
   xhr.current=null;
   if(controller.signal.aborted)throw Error('Upload canceled');
   await postJson('/api/media',{action:'confirm',id:reserved.id},controller.signal);
   if(controller.signal.aborted)throw Error('Upload canceled');
   // Sending the final chat message is not cancellable: its server request may already commit.
   phase.current='send';setSending(true);
   await postJson('/api/chat',{action:'sendMedia',recipientHandle,mediaId:reserved.id});
   setFile(null);setProgress(0);
   await onSent();
  }catch(cause){setError(controller.signal.aborted?'Upload canceled':cause instanceof Error?cause.message:'Attachment failed; retry the file')}
  finally{setBusy(false);setSending(false);xhr.current=null;abort.current=null;phase.current='idle'}
 };
 return <section aria-label="Media attachment" style={{padding:10,borderTop:'1px solid var(--cc-border,#7773)'}}>
  <label style={{display:'inline-block',cursor:'pointer'}}>Attach a photo or video
   <input aria-label="Choose photo or video" type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" onChange={select} disabled={busy} style={{display:'block',maxWidth:'100%'}}/>
  </label>
  {file&&<div style={{marginTop:8,display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
   {preview&&(file.type.startsWith('video/')?<video aria-label="Selected video preview" src={preview} controls playsInline style={{maxWidth:120,maxHeight:140}}/>:<img src={preview} alt="Selected attachment preview" style={{maxWidth:120,maxHeight:140,objectFit:'cover'}}/>)}
   <div><strong>{file.name}</strong><small style={{display:'block'}}>{(file.size/1048576).toFixed(1)} MB</small></div>
   <button type="button" onClick={()=>void send()} disabled={busy}>{busy?'Uploading…':'Send attachment'}</button>
   <button type="button" disabled={sending} onClick={()=>{if(phase.current==='send')return;abort.current?.abort();xhr.current?.abort();setFile(null);setProgress(0)}}>{sending?'Sending…':busy?'Cancel upload':'Remove'}</button>
  </div>}
  {busy&&<progress aria-label="Attachment upload progress" value={progress} max={100} style={{width:'100%'}}/>}
  {error&&<p role="alert" style={{color:'#ef4444'}}>{error} {file?'Select Send attachment to retry.':''}</p>}
 </section>;
}
