'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {Avatar} from './avatar';
type Story={overlay?:{text:string;color:string;x:number;y:number}|null;poll?:{question:string;options:[string,string]}|null;id:string;authorHandle:string;authorUid:string;mediaId:string;caption:string;createdAt:number;contentType?:string;highlight?:boolean;isMine?:boolean;avatarMediaId?:string|null;avatarUrl?:string|null;mediaUrl?:string|null};
async function request<T>(url:string,method='GET',body?:object):Promise<T>{const r=await fetch(url,{method,credentials:'same-origin',cache:'no-store',...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});const d=await r.json();if(!r.ok)throw Error(d.error||'Request failed');return d}
export function LiveStories(){
 const [stories,setStories]=useState<Story[]>([]),[selected,setSelected]=useState<number|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const input=useRef<HTMLInputElement>(null),[audience,setAudience]=useState<'all'|'close'>('all');
 const load=async()=>{const d=await request<{stories:Story[]}>('/api/stories');setStories(d.stories)};
 useEffect(()=>{void load().catch(e=>setError(String(e)));const id=setInterval(()=>{if(document.visibilityState==='visible')void load().catch(()=>{})},30000);return()=>clearInterval(id)},[]);
 useEffect(()=>{if(selected===null)return;const listener=(e:KeyboardEvent)=>{if(e.key==='Escape')setSelected(null);if(e.key==='ArrowRight')setSelected(i=>i===null?null:i+1>=stories.length?null:i+1);if(e.key==='ArrowLeft')setSelected(i=>i===null?null:Math.max(0,i-1))};window.addEventListener('keydown',listener);return()=>window.removeEventListener('keydown',listener)},[selected,stories.length]);
 async function upload(file:File){setBusy(true);setError('');try{
  if(!['image/jpeg','image/png','image/webp','video/mp4','video/webm'].includes(file.type))throw Error('Unsupported story format');
  const reserved=await request<{id:string;uploadUrl:string}>('/api/media','POST',{action:'reserve',contentType:file.type,size:file.size});
  const sent=await fetch(reserved.uploadUrl,{method:'PUT',headers:{'Content-Type':file.type},body:file});
  if(!sent.ok)throw Error('Media upload failed. Verify R2 CORS configuration.');
  await request('/api/media','POST',{action:'confirm',id:reserved.id});
  await request('/api/stories','POST',{mediaId:reserved.id,caption:'',audience});
  await load();
 }catch(e){setError(e instanceof Error?e.message:'Story upload failed')}finally{setBusy(false);if(input.current)input.current.value=''}}
 const story=selected===null?null:stories[selected];
 return <><div className="cc-live-stories" aria-label="Campus stories">
  <button type="button" className="cc-live-story" disabled={busy} onClick={()=>input.current?.click()}><span className="cc-live-story-ring cc-add-story">+</span><small>{busy?'Uploading…':'Your story'}</small></button>
  {stories.map((s,i)=><button type="button" className="cc-live-story" key={s.id} onClick={()=>setSelected(i)}><span className="cc-live-story-ring"><Avatar user={{handle:s.authorHandle,avatarMediaId:s.avatarMediaId??null,avatarUrl:s.avatarUrl??null}} ring="unseen" size={44}/></span><small>@{s.authorHandle}</small></button>)}
  <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12}}>Share with <select aria-label="Story audience" value={audience} onChange={e=>setAudience(e.target.value as 'all'|'close')}><option value="all">Campus</option><option value="close">Close friends</option></select></label>
  <input ref={input} type="file" hidden accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file)}}/>
 </div>{error&&<p role="alert" className="cc-story-error">{error}</p>}
 {story&&<div className="cc-live-story-overlay" role="presentation" onClick={()=>setSelected(null)}><section className="cc-live-story-dialog" role="dialog" aria-modal="true" aria-label={'Story from '+story.authorHandle} onClick={e=>e.stopPropagation()}>
  <header><Link href={'/profile/'+encodeURIComponent(story.authorHandle)}>@{story.authorHandle}</Link><button type="button" onClick={()=>setSelected(null)} aria-label="Close story">✕</button></header>
  {story.contentType?.startsWith('video/')?<video src={story.mediaUrl||'/api/media?id='+encodeURIComponent(story.mediaId)} controls playsInline autoPlay/>:<img src={'/api/media?id='+encodeURIComponent(story.mediaId)} alt={'Story by '+story.authorHandle}/>} 
  {story.overlay?.text&&<p style={{color:story.overlay.color,textAlign:'center',fontSize:22,fontWeight:700}}>{story.overlay.text}</p>}
  {story.poll&&<div style={{padding:12}}><strong>{story.poll.question}</strong><div>{story.poll.options.map((option,i)=><button key={i} type="button" onClick={()=>void request('/api/stories/vote','POST',{storyId:story.id,option:i}).then(()=>setError('Poll vote recorded')).catch(e=>setError(String(e)))}>{option}</button>)}</div></div>}
  {story.caption&&<p>{story.caption}</p>}
  <footer>{story.isMine&&<button type="button" onClick={async()=>{try{await request('/api/stories','PATCH',{id:story.id,highlight:!story.highlight});await load()}catch(e){setError(String(e))}}}>{story.highlight?'Remove highlight':'Add to highlights'}</button>}<button type="button" onClick={()=>setSelected(i=>i===null?null:Math.max(0,i-1))} disabled={selected===0}>‹ Previous</button><button type="button" onClick={()=>setSelected(i=>i===null?null:i+1>=stories.length?null:i+1)}>Next ›</button></footer>
 </section></div>}</>;
}
