'use client';
import {useState} from 'react';
type TargetType='post'|'comment'|'user'|'story';
export function ReportDialog({targetType,targetId,onClose}:{targetType:TargetType;targetId:string;onClose:()=>void}){
 const [reason,setReason]=useState('spam'),[details,setDetails]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState(false);
 async function submit(){
  if(busy)return;setBusy(true);setError('');
  try{
   const response=await fetch('/api/reports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({targetType,targetId,reason,details})});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Report could not be submitted');
   setSuccess(true);
  }catch(e){setError(e instanceof Error?e.message:'Unable to report')}finally{setBusy(false)}
 }
 return <div role="dialog" aria-modal="true" aria-label="Report content" className="cc-report-overlay">
  <section className="cc-report-panel">
   <header><h2>Report {targetType}</h2><button type="button" onClick={onClose} aria-label="Close report dialog">×</button></header>
   {success?<><p>Thank you. Your report was submitted for review.</p><button onClick={onClose}>Done</button></>:<>
    <label>Why are you reporting this?
     <select value={reason} onChange={e=>setReason(e.target.value)}>
      <option value="spam">Spam</option><option value="harassment">Bullying or harassment</option>
      <option value="nudity">Nudity</option><option value="violence">Violence</option>
      <option value="false-info">False information</option><option value="other">Other</option>
     </select>
    </label>
    <label>Additional details (optional)<textarea maxLength={300} value={details} onChange={e=>setDetails(e.target.value)}/></label>
    <p>Read the <a href="/community-guidelines">Community Guidelines</a>.</p>
    <button type="button" onClick={()=>void submit()} disabled={busy}>{busy?'Submitting…':'Submit report'}</button>
    {error&&<p role="alert">{error}</p>}
   </>}
  </section>
 </div>;
}
