'use client';
import {useEffect,useRef,useState,type ChangeEvent} from 'react';
import {validateFileForPurpose} from '@/lib/core/content-rules';
import {ImagePlus} from 'lucide-react';

type Props={recipientHandle:string;onSent:()=>Promise<void>;compact?:boolean};
async function postJson(path:string,body:object,signal?:AbortSignal):Promise<Record<string,unknown>>{
 const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(body),...(signal?{signal}:{})});
 const data:Record<string,unknown>=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(typeof data.error==='string'?data.error:'Request failed ('+response.status+')');
 return data;
}
async function uploadSigned(url:string,file:File,xhr:XMLHttpRequest,progress:(value:number)=>void):Promise<void>{
 return new Promise((resolve,reject)=>{
  xhr.open('PUT',url);
  xhr.timeout=60000;
  xhr.setRequestHeader('Content-Type',file.type);
  xhr.upload.onprogress=event=>{if(event.lengthComputable)progress(Math.round(event.loaded/event.total*100))};
  xhr.onload=()=>xhr.status>=200&&xhr.status<300?resolve():reject(Error('Upload failed ('+xhr.status+'). Try again.'));
  xhr.onerror=()=>reject(Error('Browser could not reach the R2 upload URL (network or CORS)'));
  xhr.ontimeout=()=>reject(Error('Direct R2 upload timed out'));
  xhr.onabort=()=>reject(Error('Upload canceled'));
  xhr.send(file);
 });
}
async function uploadSmallFallback(id:string,file:File,signal:AbortSignal):Promise<void>{
 const response=await fetch('/api/media/upload?id='+encodeURIComponent(id),{
  method:'PUT',credentials:'same-origin',headers:{'Content-Type':file.type},body:file,signal
 });
 if(!response.ok){
  const detail:unknown=await response.json().catch(()=>null);
  throw Error(detail&&typeof detail==='object'&&'error' in detail?String(detail.error):'Same-origin upload failed ('+response.status+')');
 }
}
export function ChatMediaUpload({recipientHandle,onSent,compact=false}:Props){
 const [file,setFile]=useState<File|null>(null),[preview,setPreview]=useState<string|null>(null),[progress,setProgress]=useState(0),[error,setError]=useState(''),[busy,setBusy]=useState(false),[sending,setSending]=useState(false);
 const fileInput=useRef<HTMLInputElement|null>(null);
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
   try{
    await uploadSigned(reserved.uploadUrl,file,request,setProgress);
   }catch(uploadError){
    if(controller.signal.aborted)throw uploadError;
    // Browsers reject direct presigned PUT when the bucket CORS policy is missing.
    // Vercel can accept small files through an authenticated, same-origin route.
    if(file.size>3*1024*1024)throw Error('Direct media upload blocked. Check Cloudflare R2 CORS (allowed origin, PUT and Content-Type). Large files require direct upload.');
    setProgress(0);
    await uploadSmallFallback(reserved.id,file,controller.signal);
    setProgress(100);
   }
   xhr.current=null;
   if(controller.signal.aborted)throw Error('Upload canceled');
   await postJson('/api/media',{action:'confirm',id:reserved.id},controller.signal);
   if(controller.signal.aborted)throw Error('Upload canceled');
   // Sending the final chat message is not cancellable: its server request may already commit.
   phase.current='send';setSending(true);
   await postJson('/api/chat',{action:'sendMedia',recipientHandle,mediaId:reserved.id});
   setFile(null);setProgress(0);
   setError('');
   // A confirmed upload/send must not be reported as failed due to refresh errors.
   void onSent().catch(()=>{});
  }catch(cause){setError(controller.signal.aborted?'Upload canceled':cause instanceof Error?cause.message:'Attachment failed; retry the file')}
  finally{setBusy(false);setSending(false);xhr.current=null;abort.current=null;phase.current='idle'}
 };
 return <section className={compact?'cc-dm-media-control':'cc-dm-media-legacy'} aria-label="Media attachment">
  {compact?<button type="button" className="cc-dm-composer-icon" title="Attach a photo or video" aria-label="Attach a photo or video" disabled={busy} onClick={()=>fileInput.current?.click()}><ImagePlus size={21} strokeWidth={1.9}/></button>:
   <label style={{display:'inline-block',cursor:'pointer'}}>Attach a photo or video</label>}
  <input ref={fileInput} aria-label="Choose photo or video" type="file"
    accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
    onChange={select} disabled={busy}
    className={compact?'cc-dm-hidden-file':'cc-dm-visible-file'}/>
  {(file||busy||error)&&<div className={compact?'cc-dm-attachment-popover':'cc-dm-attachment-inline'} role="group" aria-label="Attachment preview">
   {file&&<div className="cc-dm-attachment-content">
    {preview&&(file.type.startsWith('video/')?<video aria-label="Selected video preview" src={preview} controls playsInline style={{width:100,maxHeight:130}}/>:<img src={preview} alt="Selected attachment preview" style={{width:100,maxHeight:130,objectFit:'contain'}}/>)}
    <div className="cc-dm-attachment-detail"><strong>{file.name}</strong><small>{(file.size/1048576).toFixed(1)} MB</small></div>
   </div>}
   {busy&&<><progress aria-label="Attachment upload progress" value={progress} max={100} style={{width:'100%'}}/><small role="status">{sending?'Delivering media…':progress===0?'Preparing upload…':progress+'% uploaded'}</small></>}
   {error&&<p role="alert" className="cc-dm-upload-error">{error}</p>}
   <div className="cc-dm-attachment-buttons">
    {file&&<button type="button" onClick={()=>void send()} disabled={busy}>{sending?'Sending…':busy?'Uploading…':'Send attachment'}</button>}
    {file&&<button type="button" disabled={sending} onClick={()=>{if(phase.current==='send')return;abort.current?.abort();xhr.current?.abort();setFile(null);setProgress(0);setError('')}}>{sending?'Sending…':busy?'Cancel upload':'Remove'}</button>}
    {!file&&!busy&&<button type="button" onClick={()=>setError('')}>Close</button>}
   </div>
  </div>}
 </section>;
}
