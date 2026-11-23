'use client';
import {useRef,useState} from 'react';
import {uploadFile,readVideoDuration} from '@/lib/upload';
import {StoryTray} from './story-tray';
export function LiveStories(){
 const picker=useRef<HTMLInputElement>(null),[audience,setAudience]=useState<'all'|'close'>('all'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[epoch,setEpoch]=useState(0);
 async function upload(file:File){setBusy(true);setError('');
  try{
   const duration=file.type.startsWith('video/')?await readVideoDuration(file):undefined;
   if(duration&&duration>60)throw Error('Stories must be 60 seconds or shorter');
   const mediaId=await uploadFile({file,purpose:'story',...(duration?{durationSec:duration}:{})});
   const res=await fetch('/api/stories',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mediaId,caption:'',audience})});
   const data=await res.json().catch(()=>({}));if(!res.ok)throw Error(data.error||'Unable to publish story');
   setEpoch(x=>x+1);
  }catch(e){setError(e instanceof Error?e.message:'Story upload failed')}
  finally{setBusy(false);if(picker.current)picker.current.value=''}
 }
 return <div><StoryTray key={epoch} onAdd={()=>picker.current?.click()}/>
  <label className="cc-story-audience">Share with <select aria-label="Story audience" value={audience} onChange={e=>setAudience(e.target.value as 'all'|'close')}><option value="all">Campus</option><option value="close">Close friends</option></select></label>
  <input hidden ref={picker} type="file" disabled={busy} accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file)}}/>
  {busy&&<p role="status">Uploading story…</p>}{error&&<p role="alert">{error}</p>}
 </div>;
}