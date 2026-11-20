'use client';
import Link from 'next/link';
import { useEffect,useState, type FormEvent } from 'react';
import { Heart,MessageCircle,Camera,LogOut } from 'lucide-react';

type Post={id:string;caption:string;authorHandle:string;mediaId:string|null;likes:number;liked:boolean;comments:number};
type Me={uid:string;email:string;profile:{handle:string;name:string;branch:string;division:string}|null};
async function api<T>(path:string,method='GET',data?:object):Promise<T>{
 const r=await fetch(path,{method,cache:'no-store',credentials:'same-origin',
  ...(data?{headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{})});
 if(!(r.headers.get('content-type')||'').includes('application/json'))throw Error('Server returned a webpage instead of API data. Check deployment logs.');
 const result=await r.json().catch(()=>null);if(!result||typeof result!=='object')throw Error('Invalid server response');
 if(!r.ok)throw Error(result.error||'Request failed');return result as T;
}
export function CampusAuth({mode}:{mode:'login'|'register'}){
 const [email,setEmail]=useState(''),[code,setCode]=useState(''),[stage,setStage]=useState<'email'|'otp'|'profile'|'privacy'|'done'>('email');
 const [name,setName]=useState(''),[handle,setHandle]=useState(''),[relationshipStatus,setRelationshipStatus]=useState(''),[relationshipVisibility,setRelationshipVisibility]=useState('me');
 const [acceptTerms,setAcceptTerms]=useState(false),[acknowledgePrivacy,setAcknowledgePrivacy]=useState(false);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[resendAt,setResendAt]=useState(0);
 const parsed=/^(\\d{2})(cp|el|ec|it|me|cl|ee|pr)(\\d{3,8})@bvmengineering\\.ac\\.in$/i.exec(email.trim());
 const branchName:Record<string,string>={cp:'Computer Engineering',el:'Electrical Engineering',ec:'Electronics & Communication Engineering',it:'Information Technology',me:'Mechanical Engineering',cl:'Civil Engineering',ee:'Electronics Engineering',pr:'Production Engineering'};
 const enrollment=parsed?parsed[1]+parsed[2]+parsed[3]:'';
 const branch=parsed?branchName[parsed[2].toLowerCase()]:'';
 async function requestCode(){
  if(!parsed){setMessage('Enter a valid BVM student email, for example 26el309@bvmengineering.ac.in');return}
  setBusy(true);setMessage('');
  try{const r=await api<{message:string}>('/api/auth','POST',{action:'requestOtp',email:email.trim().toLowerCase()});setStage('otp');setResendAt(Date.now()+60000);setMessage(r.message)}
  catch(e){setMessage(e instanceof Error?e.message:'Unable to send code')}finally{setBusy(false)}
 }
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setMessage('');
  if(stage==='email'){await requestCode();return}
  if(stage==='profile'){setStage('privacy');return}
  if(stage==='otp'){
   setBusy(true);
   try{const r=await api<{needsProfile:boolean}>('/api/auth','POST',{action:'verifyOtp',email:email.trim().toLowerCase(),code});if(r.needsProfile){setStage('profile');setMessage('Email verified. Complete your campus profile.')}else{await api('/api/auth','POST',{action:'finishOtp',email:email.trim().toLowerCase()});window.location.assign('/home')}}
   catch(e){setMessage(e instanceof Error?e.message:'Verification failed')}finally{setBusy(false)}
   return;
  }
  if(stage==='privacy'){
   if(!acceptTerms||!acknowledgePrivacy){setMessage('Accept the terms and acknowledge the privacy policy to continue');return}
   setBusy(true);
   try{await api('/api/auth','POST',{action:'finishOtp',email:email.trim().toLowerCase(),profile:{name,handle:handle.toLowerCase().trim(),relationshipStatus,relationshipVisibility,acceptTerms,acknowledgePrivacy}});window.location.assign('/home')}
   catch(e){setMessage(e instanceof Error?e.message:'Account creation failed')}finally{setBusy(false)}
  }
 }
 return <main className="auth-page">
  <Link className="brand" href="/"><span className="brand-mark">CC</span><span>Campus<span className="brand-lite">Connect</span></span></Link>
  <section className="auth-card wide cc-otp-card">
   <div className="cc-otp-icon" aria-hidden="true">✦</div>
   <h1>{stage==='email'?'Welcome to CampusConnect':stage==='otp'?'Verify your college email':'Make it yours'}</h1>
   <p>{stage==='email'?'Your campus, your community. Start with your BVM email.':stage==='otp'?'Enter the six-digit code sent to your institutional inbox.':'A few details to finish your verified campus profile.'}</p>
   <div className="cc-otp-steps" aria-label="Registration progress"><span className="active"/><span className={stage!=='email'?'active':''}/><span className={stage==='profile'||stage==='privacy'?'active':''}/></div>
   <form className="auth-form" onSubmit={submit}>
    {stage==='email'&&<>
     <label>BVM student email<input autoFocus required type="email" autoComplete="email" placeholder="26el309@bvmengineering.ac.in" value={email} onChange={e=>setEmail(e.target.value.toLowerCase().trim())}/></label>
     {parsed&&<div className="cc-email-preview"><strong>Student details detected</strong><span>Enrollment: {enrollment.toLowerCase()}</span><span>Branch: {branch}</span><small>Branch mapping is provisional and must be confirmed by BVM.</small></div>}
    </>}
    {stage==='otp'&&<>
     <div className="cc-email-preview">Code sent to <strong>{email}</strong></div>
     <label>Verification code<input autoFocus required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="000000" value={code} onChange={e=>setCode(e.target.value.replace(/\\D/g,''))}/></label>
     <button type="button" className="cc-text-action" disabled={busy||Date.now()<resendAt} onClick={requestCode}>Resend verification code (after 60 seconds)</button>
     <button type="button" className="cc-text-action" onClick={()=>{setStage('email');setCode('');setMessage('')}}>Change email address</button>
    </>}
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
    <button disabled={busy} type="submit" className="primary-button full">{busy?'Please wait…':stage==='email'?'Send verification code':stage==='otp'?'Verify code':stage==='profile'?'Continue':'Create account & enter CampusConnect'}</button>
   </form>
   <p className="auth-foot">Already registered? <Link href="/login">Sign in with email OTP</Link></p>
   <p className="auth-legal">Only verified BVM institutional addresses are accepted. No password needed.</p>
  </section>
 </main>;
}
export function ConnectedFeed(){
 const [me,setMe]=useState<Me|null>(null),[posts,setPosts]=useState<Post[]>([]);
 const [caption,setCaption]=useState(''),[file,setFile]=useState<File|null>(null);
 const [busy,setBusy]=useState(false),[status,setStatus]=useState(''),[loading,setLoading]=useState(true);
 const [opened,setOpened]=useState<string|null>(null),[comments,setComments]=useState<Record<string,Array<{id:string;handle:string;text:string}>>>({}),[reply,setReply]=useState('');
 async function refresh(){const x=await api<{posts:Post[]}>('/api/posts');setPosts(x.posts)}
 useEffect(()=>{Promise.all([api<{user:Me}>('/api/auth'),api<{posts:Post[]}>('/api/posts')])
  .then(([account,feed])=>{setMe(account.user);setPosts(feed.posts)})
  .catch(()=>setStatus('Sign in to view the live feed.')).finally(()=>setLoading(false));},[]);
 async function toggleLike(id:string){try{await api('/api/posts/'+id+'/likes','POST',{});await refresh()}catch(e){setStatus(e instanceof Error?e.message:'Like failed')}}
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
   setCaption('');setFile(null);setStatus('Post published');await refresh();
  }catch(e){setStatus(e instanceof Error?e.message:'Unable to publish')}finally{setBusy(false)}
 }
 return <section className="cc-connected-feed">
  <header className="cc-live-bar"><h1>Home</h1>
   {me?<div><span>{me.profile?.handle||me.email}</span><button type="button" onClick={async()=>{await api('/api/auth','POST',{action:'logout'});window.location.assign('/login')}} aria-label="Log out"><LogOut size={19}/></button></div>:<Link href="/login">Sign in</Link>}
  </header>
  {!me&&!loading?<div className="cc-live-empty"><h2>Sign in to CampusConnect</h2><Link href="/login">Sign in</Link></div>:<>
  <form className="cc-compose-live" onSubmit={publish}>
   <h2>Share a campus moment</h2><textarea placeholder="What happened on campus?" required maxLength={2200} value={caption} onChange={e=>setCaption(e.target.value)}/>
   <div><label><Camera size={18}/> Add image or video<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
    {file&&<small>{file.name}</small>}<button disabled={busy||!caption.trim()}>{busy?'Uploading...':'Share post'}</button></div>
   {status&&<p role="status">{status}</p>}
  </form>
  {loading?<p>Loading posts...</p>:posts.length?posts.map(post=><article key={post.id} className="cc-live-entry">
   <Link href={'/profile/'+encodeURIComponent(post.authorHandle)}><strong>@{post.authorHandle}</strong></Link>
   {post.mediaId&&<img src={'/api/media?id='+encodeURIComponent(post.mediaId)} loading="lazy" alt="Shared campus media"/>}
   <p>{post.caption}</p>
   <div><button type="button" onClick={()=>toggleLike(post.id)}><Heart size={20} fill={post.liked?'currentColor':'none'}/> {post.likes||0}</button>
   <button type="button" onClick={()=>openComments(post.id)}><MessageCircle size={20}/> {post.comments||0}</button></div>
   {opened===post.id&&<div className="cc-live-comments">
    {(comments[post.id]||[]).map(c=><p key={c.id}><b>@{c.handle}</b> {c.text}</p>)}
    <form onSubmit={e=>sendComment(e,post.id)}><input value={reply} onChange={e=>setReply(e.target.value)} maxLength={1000} placeholder="Write a comment" required/><button disabled={!reply.trim()}>Post</button></form>
   </div>}
  </article>):<div className="cc-live-empty">No published posts yet. Be the first to share.</div>}
  </>}
 </section>;
}
