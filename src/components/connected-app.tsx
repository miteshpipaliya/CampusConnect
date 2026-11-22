'use client';
import { SocialPanels } from './social-panels';
import {Avatar} from './avatar';
import { isAllowedEmail } from '@/lib/student-email';
import { LiveStories } from './live-stories';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect,useState, type FormEvent } from 'react';
import { Heart,MessageCircle,Repeat2,Bookmark } from 'lucide-react';

type Post={id:string;caption:string;authorHandle:string;mediaId:string|null;mediaUrl?:string|null;avatarMediaId?:string|null;avatarUrl?:string|null;likes:number;liked:boolean;saved?:boolean;comments:number};
type Me={uid:string;email:string;profile:{handle:string;name:string;branch:string;division:string}|null};
async function api<T>(path:string,method='GET',data?:object):Promise<T>{
 const r=await fetch(path,{method,cache:'no-store',credentials:'same-origin',
  ...(data?{headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{})});
 if(!(r.headers.get('content-type')||'').includes('application/json'))throw Error('Server returned a webpage instead of API data. Check deployment logs.');
 const result=await r.json().catch(()=>null);if(!result||typeof result!=='object')throw Error('Invalid server response');
 if(!r.ok)throw Error(result.error||'Request failed');return result as T;
}
export function CampusAuth({mode}:{mode:'login'|'register'}){
 const [email,setEmail]=useState(''),[code,setCode]=useState(''),[password,setPassword]=useState(''),[resetMode,setResetMode]=useState(false),[needsProfile,setNeedsProfile]=useState(false),[stage,setStage]=useState<'email'|'otp'|'profile'|'privacy'|'password'|'done'>('email');
 const [name,setName]=useState(''),[handle,setHandle]=useState(''),[relationshipStatus,setRelationshipStatus]=useState(''),[relationshipVisibility,setRelationshipVisibility]=useState('me');
 const [acceptTerms,setAcceptTerms]=useState(false),[acknowledgePrivacy,setAcknowledgePrivacy]=useState(false);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[resendAt,setResendAt]=useState(0);
 const parsed=/^(\d{2})(cp|el|ec|it|me|cl|ee|pr)(\d{3,8})@bvmengineering\.ac\.in$/i.exec(email.trim());
 const branchName:Record<string,string>={cp:'Computer Engineering',el:'Electrical Engineering',ec:'Electronics & Communication Engineering',it:'Information Technology',me:'Mechanical Engineering',cl:'Civil Engineering',ee:'Electronics Engineering',pr:'Production Engineering'};
 const enrollment=parsed?.[1]&&parsed?.[2]&&parsed?.[3]?`${parsed[1]}${parsed[2]}${parsed[3]}`:'';
 const branch=parsed?.[2]?branchName[parsed[2].toLowerCase()]??'':'';
 async function requestCode(){
  if(!isAllowedEmail(email)&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())){setMessage('Enter a valid BVM student email, for example 26el309@bvmengineering.ac.in');return}
  setBusy(true);setMessage('');
  try{const r=await api<{message:string}>('/api/auth','POST',{action:'requestOtp',email:email.trim().toLowerCase()});setStage('otp');setResendAt(Date.now()+60000);setMessage(r.message)}
  catch(e){setMessage(e instanceof Error?e.message:'Unable to send code')}finally{setBusy(false)}
 }
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setMessage('');
  if(stage==='email'){if(mode==='login'&&!resetMode){setBusy(true);try{await api('/api/auth','POST',{action:'loginPassword',email:email.trim().toLowerCase(),password});window.location.assign('/home')}catch(e){setMessage(e instanceof Error?e.message:'Sign-in failed')}finally{setBusy(false)}}else await requestCode();return}
  if(stage==='profile'){setStage('privacy');return}
  if(stage==='otp'){
   setBusy(true);
   try{const r=await api<{needsProfile:boolean}>('/api/auth','POST',{action:'verifyOtp',email:email.trim().toLowerCase(),code});setNeedsProfile(r.needsProfile);if(r.needsProfile){setStage('profile');setMessage('Email verified. Complete your campus profile.')}else{setStage('password');setMessage('Email verified. Create a password to sign in next time.')}}
   catch(e){setMessage(e instanceof Error?e.message:'Verification failed')}finally{setBusy(false)}
   return;
  }
  if(stage==='privacy'){if(!acceptTerms||!acknowledgePrivacy){setMessage('Accept the terms and acknowledge the privacy policy to continue');return}setStage('password');return}
  if(stage==='password'){
   if(password.length<12){setMessage('Use a password with at least 12 characters');return}
   setBusy(true);
   try{await api('/api/auth','POST',{action:'finishOtp',email:email.trim().toLowerCase(),password,...(needsProfile?{profile:{name,handle:handle.toLowerCase().trim(),relationshipStatus,relationshipVisibility,acceptTerms,acknowledgePrivacy}}:{})});window.location.assign('/home')}
   catch(e){setMessage(e instanceof Error?e.message:'Account creation failed')}finally{setBusy(false)}
  }
 }
 return <main className="auth-page">
  <Link className="brand" href="/"><span className="brand-mark">CC</span><span>Campus<span className="brand-lite">Connect</span></span></Link>
  <section className="auth-card wide cc-otp-card">
   <div className="cc-otp-icon" aria-hidden="true">✦</div>
   <h1>{stage==='email'?'Welcome to CampusConnect':stage==='otp'?'Verify your college email':stage==='password'?'Create your password':'Make it yours'}</h1>
   <p>{stage==='email'?(mode==='login'&&!resetMode?'Sign in with your campus email and password.':'Verify your BVM email or approved test account.'):stage==='otp'?'Enter the six-digit code sent to your institutional inbox.':'A few details to finish your verified campus profile.'}</p>
   <div className="cc-otp-steps" aria-label="Registration progress"><span className="active"/><span className={stage!=='email'?'active':''}/><span className={stage==='profile'||stage==='privacy'?'active':''}/></div>
   <form className="auth-form" onSubmit={submit}>
    {stage==='email'&&<>
     <label>BVM student email or approved tester<input autoFocus required type="email" autoComplete="email" placeholder="26el309@bvmengineering.ac.in" value={email} onChange={e=>setEmail(e.target.value.toLowerCase().trim())}/></label>
     {mode==='login'&&!resetMode&&<label>Password<input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your password"/></label>}
     {parsed&&<div className="cc-email-preview"><strong>Student details detected</strong><span>Enrollment: {enrollment.toLowerCase()}</span><span>Branch: {branch}</span><small>Branch mapping is provisional and must be confirmed by BVM.</small></div>}
    </>}
    {stage==='otp'&&<>
     <div className="cc-email-preview">Code sent to <strong>{email}</strong></div>
     <label>Verification code<input autoFocus required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="000000" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/></label>
     <button type="button" className="cc-text-action" disabled={busy||Date.now()<resendAt} onClick={requestCode}>Resend verification code (after 60 seconds)</button>
     <button type="button" className="cc-text-action" onClick={()=>{setStage('email');setCode('');setMessage('')}}>Change email address</button>
    </>}
    {stage==='password'&&<label>Create password (12+ characters)<input autoFocus required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Create a secure password"/></label>}
    {stage==='profile'&&<>
     <label>Full name<input autoFocus required minLength={2} maxLength={70} autoComplete="name" placeholder="Your full name" value={name} onChange={e=>setName(e.target.value)}/></label>
     <label>Username<input required pattern="[a-z][a-z0-9._]{2,29}" maxLength={30} placeholder="your.username" value={handle} onChange={e=>setHandle(e.target.value.toLowerCase())}/></label>
    </>}
    {stage==='privacy'&&<>
     <label>Relationship status<select required value={relationshipStatus} onChange={e=>setRelationshipStatus(e.target.value)}><option value="">Choose your status</option>{['Single','In Relationship','Engaged','Married','Situationship'].map(x=><option key={x} value={x}>{x}</option>)}</select></label>
     <label>Who can see your relationship status?<select required value={relationshipVisibility} onChange={e=>setRelationshipVisibility(e.target.value)}><option value="me">Only me (recommended)</option><option value="followers">Followers only</option><option value="campus">Campus members</option></select></label>
     <label className="cc-check"><input type="checkbox" required checked={acceptTerms} onChange={e=>setAcceptTerms(e.target.checked)}/> I accept the Terms of Service</label>
     <label className="cc-check"><input type="checkbox" required checked={acknowledgePrivacy} onChange={e=>setAcknowledgePrivacy(e.target.checked)}/> I acknowledge the Privacy Policy</label>
    </>}
    {message&&<p role="status" className={message.toLowerCase().includes('failed')||message.toLowerCase().includes('invalid')||message.toLowerCase().includes('unable')?'form-error':'auth-legal'}>{message}</p>}
    {stage==='privacy'&&<button type="button" className="cc-text-action" onClick={()=>setStage('profile')}>Back</button>}
    {stage==='email'&&mode==='login'&&<button type="button" className="cc-text-action" onClick={()=>{setResetMode(v=>!v);setMessage('')}}>{resetMode?'Back to password login':'Set or reset password using email verification'}</button>}
    <button disabled={busy} type="submit" className="primary-button full">{busy?'Please wait…':stage==='email'?(mode==='login'&&!resetMode?'Sign in':'Send verification code'):stage==='otp'?'Verify code':stage==='profile'?'Continue':stage==='privacy'?'Continue':'Save password & enter CampusConnect'}</button>
   </form>
   <p className="auth-foot">Already registered? <Link href="/login">Sign in with email and password</Link></p>
   <p className="auth-legal">BVM institutional email required, except one approved testing account. Email verification is required to register or reset a password. Subsequent logins use email and password.</p>
  </section>
 </main>;
}
let feedCache:Post[]|null=null;
let accountCache:Me|null=null;
export function ConnectedFeed(){
 const params=useSearchParams();
 const [me,setMe]=useState<Me|null>(accountCache),[posts,setPosts]=useState<Post[]>(feedCache||[]);
 const [caption,setCaption]=useState(''),[file,setFile]=useState<File|null>(null);
 const [section,setSection]=useState('home');
 const [composeOpen,setComposeOpen]=useState(false),[previewUrl,setPreviewUrl]=useState<string|null>(null),[mediaStep,setMediaStep]=useState<'preview'|'caption'>('preview');
 const [busy,setBusy]=useState(false),[status,setStatus]=useState(''),[loading,setLoading]=useState(feedCache===null);
 const [opened,setOpened]=useState<string|null>(null),[comments,setComments]=useState<Record<string,Array<{id:string;handle:string;text:string}>>>({}),[reply,setReply]=useState('');
 async function refresh(){const x=await api<{posts:Post[]}>('/api/posts');feedCache=x.posts;setPosts(x.posts)}
 useEffect(()=>{Promise.all([api<{user:Me}>('/api/auth'),api<{posts:Post[]}>('/api/posts')])
  .then(([account,feed])=>{accountCache=account.user;feedCache=feed.posts;setMe(account.user);setPosts(feed.posts)})
  .catch(()=>setStatus('Sign in to view the live feed.')).finally(()=>setLoading(false));},[]);
 useEffect(()=>{const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void refresh().catch(()=>{});},10000);return()=>window.clearInterval(timer)},[]);
 useEffect(()=>{if(!file){setPreviewUrl(null);return}const url=URL.createObjectURL(file);setPreviewUrl(url);return()=>URL.revokeObjectURL(url)},[file]);
 useEffect(()=>{const selected=params.get('section')||'home';setSection(['home','reels','chat','notifications','search','community'].includes(selected)?selected:'home');if(params.get('compose')==='1')setComposeOpen(true)},[params]);
 async function toggleLike(id:string){try{await api('/api/posts/'+id+'/likes','POST',{});await refresh()}catch(e){setStatus(e instanceof Error?e.message:'Like failed')}}
 async function toggleSave(id:string,saved:boolean){try{await api('/api/saves',saved?'DELETE':'POST',{postId:id});await refresh();setStatus(saved?'Removed from saved posts':'Saved privately')}catch(e){setStatus(e instanceof Error?e.message:'Save failed')}}
 async function repost(id:string){try{const result=await api<{reposted:boolean}>('/api/reposts','POST',{postId:id});setStatus(result.reposted?'Added to your reposts':'Removed from reposts')}catch(e){setStatus(e instanceof Error?e.message:'Repost failed')}}
 async function openComments(id:string){if(opened===id){setOpened(null);return}try{const r=await api<{comments:Array<{id:string;handle:string;text:string}>}>('/api/posts/'+id+'/comments');setComments(c=>({...c,[id]:r.comments}));setOpened(id)}catch(e){setStatus(e instanceof Error?e.message:'Comments unavailable')}}
 async function sendComment(event:FormEvent<HTMLFormElement>,id:string){event.preventDefault();try{await api('/api/posts/'+id+'/comments','POST',{text:reply});setReply('');const r=await api<{comments:Array<{id:string;handle:string;text:string}>}>('/api/posts/'+id+'/comments');setComments(c=>({...c,[id]:r.comments}));await refresh()}catch(e){setStatus(e instanceof Error?e.message:'Comment failed')}}
 async function publish(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setStatus('');
  try{
   let mediaId:string|undefined;
   if(file){
    const reservation=await api<{id:string;uploadUrl:string}>('/api/media','POST',{action:'reserve',contentType:file.type,size:file.size});
    const upload=await fetch(reservation.uploadUrl,{method:'PUT',body:file,headers:{'Content-Type':file.type}});
    if(!upload.ok)throw Error('R2 upload failed. Check CORS settings.');
    await api('/api/media','POST',{action:'confirm',id:reservation.id});mediaId=reservation.id;
   }
   await api('/api/posts','POST',{caption,...(mediaId?{mediaId}:{})});
   setCaption('');setFile(null);setComposeOpen(false);setMediaStep('preview');setStatus('Post published');await refresh();
  }catch(e){setStatus(e instanceof Error?e.message:'Unable to publish')}finally{setBusy(false)}
 }
 return <section className={'cc-connected-feed'+(section==='chat'?' cc-chat-view':'')}><SocialPanels section={section}/>
  {status&&<p role="status">{status}</p>}
  {composeOpen&&<div className="cc-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setComposeOpen(false)}}>
   <section className="cc-dialog" role="dialog" aria-modal="true" aria-label="Create a campus post">
    <header><h2>{mediaStep==='preview'?'Preview your post':'Caption and hashtags'}</h2><button type="button" aria-label="Close" disabled={busy} onClick={()=>setComposeOpen(false)}>✕</button></header>
    <form onSubmit={e=>{if(mediaStep==='preview'){e.preventDefault();setMediaStep('caption')}else void publish(e)}}>
    {mediaStep==='preview'?<><label>Select a photo or video<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
     {previewUrl&&(file?.type.startsWith('video/')?<video src={previewUrl} controls playsInline style={{maxWidth:'100%',maxHeight:380}}/>:<img className="cc-dialog-preview" src={previewUrl} alt="Preview of selected upload" style={{maxHeight:380,objectFit:'contain'}}/>)}
     <p className="cc-dialog-note">Review your selected media before continuing. You can also publish a text-only post.</p><button type="submit" className="cc-primary">Next: Caption</button></>:
     <><label>Caption and hashtags<textarea required maxLength={2200} placeholder="Write a caption and add #hashtags" value={caption} onChange={e=>setCaption(e.target.value)}/></label>
     {previewUrl&&(file?.type.startsWith('video/')?<video src={previewUrl} controls playsInline style={{maxWidth:'100%',maxHeight:230}}/>:<img className="cc-dialog-preview" src={previewUrl} alt="Your selected post media"/>)}
     <div style={{display:'flex',justifyContent:'space-between',gap:12}}><button type="button" disabled={busy} onClick={()=>setMediaStep('preview')}>Back</button><button className="cc-primary" type="submit" disabled={busy||!caption.trim()}>{busy?'Publishing…':'Confirm & Share'}</button></div></>}
    </form>
   </section>
  </div>}
  {(section==='home'||section==='community')&&<LiveStories/>}
  {(section==='home'||section==='community')&&(loading&&!feedCache?<p className="cc-feed-skeleton" aria-label="Loading posts"/>:posts.length?posts.map(post=><article key={post.id} className="cc-live-entry">
   <Link href={'/profile/'+encodeURIComponent(post.authorHandle)} style={{display:'flex',alignItems:'center',gap:8}}><Avatar user={{handle:post.authorHandle,avatarMediaId:post.avatarMediaId,avatarUrl:post.avatarUrl}} size={32}/><strong>@{post.authorHandle}</strong></Link>
   {post.mediaId&&<img src={post.mediaUrl||'/api/media?id='+encodeURIComponent(post.mediaId)} loading="lazy" alt="Shared campus media"/>}
   <p>{post.caption}</p>
   <div><button type="button" onClick={()=>toggleLike(post.id)}><Heart size={20} fill={post.liked?'currentColor':'none'}/> {post.likes||0}</button>
   <button type="button" onClick={()=>openComments(post.id)}><MessageCircle size={20}/> {post.comments||0}</button><button type="button" onClick={()=>repost(post.id)} aria-label="Toggle repost"><Repeat2 size={20}/> Repost</button><button type="button" aria-label={post.saved?'Remove saved post':'Save post'} onClick={()=>void toggleSave(post.id,Boolean(post.saved))}><Bookmark size={20} fill={post.saved?'currentColor':'none'}/> {post.saved?'Saved':'Save'}</button></div>
   {opened===post.id&&<div className="cc-live-comments">
    {(comments[post.id]||[]).map(c=><p key={c.id}><b>@{c.handle}</b> {c.text}</p>)}
    <form onSubmit={e=>sendComment(e,post.id)}><input value={reply} onChange={e=>setReply(e.target.value)} maxLength={1000} placeholder="Write a comment" required/><button disabled={!reply.trim()}>Post</button></form>
   </div>}
  </article>):<div className="cc-live-empty">No published posts yet. Be the first to share.</div>)}
 </section>;
}
