'use client';
import Link from 'next/link';
import { useEffect,useState, type FormEvent } from 'react';
import { Heart,MessageCircle,Camera,LogOut } from 'lucide-react';
import { degreeCourses } from '@/lib/student-email';

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
 const [fields,setFields]=useState({email:'',password:'',handle:'',name:'',degree:'BTech',enrollmentNumber:'',branch:'',division:'',relationshipStatus:'',relationshipVisibility:'me',acceptTerms:false,acknowledgePrivacy:false});
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [awaitingVerification,setAwaitingVerification]=useState(false);
 const [step,setStep]=useState(0);
 const groups=[['name','handle'],['degree','branch'],['enrollmentNumber','email'],['division','relationshipStatus'],['relationshipVisibility','password'],['acceptTerms','acknowledgePrivacy']] as const;
 const advance=()=>{
  const inputs=Array.from(document.querySelectorAll<HTMLInputElement|HTMLSelectElement>('.auth-form input, .auth-form select'));
  const invalid=inputs.find(x=>!x.checkValidity());
  if(invalid){invalid.reportValidity();return;}
  setStep(x=>Math.min(x+1,groups.length-1));
 };
 const previous=()=>setStep(x=>Math.max(0,x-1));
 useEffect(()=>{
  if(mode!=='register'||!awaitingVerification)return;
  let active=true;
  const check=async()=>{
   try{
    await api('/api/auth','POST',{action:'login',email:fields.email,password:fields.password});
    if(active)window.location.assign('/home');
   }catch(e){
    if(active&&e instanceof Error&&e.message!=='Verify your email before signing in'&&e.message!=='Authentication unavailable or credentials invalid')setMessage(e.message);
   }
  };
  const interval=window.setInterval(check,15000);
  return()=>{active=false;window.clearInterval(interval)};
 },[awaitingVerification,mode,fields.email,fields.password]);
 const edit=(k:keyof typeof fields,v:string|boolean)=>setFields(f=>({...f,[k]:v}));
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(mode==='register'&&step<groups.length-1){advance();return;}setBusy(true);setMessage('');
  try{
   const result=await api<{message?:string}>('/api/auth','POST',{action:mode==='register'?'register':'login',
    ...fields,handle:fields.handle.toLowerCase().trim()});
   if(mode==='login')window.location.assign('/home');
   else {setAwaitingVerification(true);setMessage('Account created! Open the verification email sent to your BVM address. After verification, this page will sign you in automatically. Keep this tab open.');}
  }catch(e){setMessage(e instanceof Error?e.message:'Please try again')}finally{setBusy(false)}
 }
 return <main className="auth-page">
  <Link className="brand" href="/"><span className="brand-mark">CC</span><span>Campus<span className="brand-lite">Connect</span></span></Link>
  <section className="auth-card wide"><h1>{mode==='login'?'Sign in to CampusConnect':'Join CampusConnect'}</h1>
   <p>Student social network · secure server-side authentication</p>
   {mode==='register'&&<p className="auth-legal">Step {step+1} of {groups.length} · Two details at a time</p>}
   {awaitingVerification&&<p role="status">{message} Verification is required before access; this page will sign you in automatically afterward.</p>}
   <form className="auth-form" onSubmit={submit}>
    {mode==='register'&&<>
     {step===0&&<label>Your name<input required maxLength={70} value={fields.name} onChange={e=>edit('name',e.target.value)}/></label>}
     {step===0&&<label>Username<input required pattern="[a-z][a-z0-9._]{2,29}" maxLength={30} placeholder="first.last" value={fields.handle} onChange={e=>edit('handle',e.target.value.toLowerCase())}/></label>}
     {step===1&&<label>Degree<select required value={fields.degree} onChange={e=>{setFields(f=>({...f,degree:e.target.value,branch:''}))}}><option value="BTech">B.Tech</option><option value="MTech">M.Tech</option></select></label>}
     {step===1&&<label>Branch / Specialization<select required value={fields.branch} onChange={e=>edit('branch',e.target.value)}><option value="">Select your course</option>{degreeCourses[fields.degree as keyof typeof degreeCourses].map(c=><option key={c} value={c}>{c}</option>)}</select></label>}
     {step===3&&<label>Division<input required maxLength={20} value={fields.division} onChange={e=>edit('division',e.target.value)}/></label>}
     {step===3&&<label>Relationship status (required)<select required value={fields.relationshipStatus} onChange={e=>edit('relationshipStatus',e.target.value)}>
      <option value="">Select your status</option>
      {['Single','In Relationship','Engaged','Married','Situationship'].map(x=><option key={x} value={x}>{x}</option>)}
     </select></label>}
     {step===4&&<label>Relationship visibility<select value={fields.relationshipVisibility} onChange={e=>edit('relationshipVisibility',e.target.value)}>
      <option value="me">Only me</option><option value="followers">Followers</option><option value="campus">Campus members</option>
     </select></label>}
     {step===5&&<label><input type="checkbox" required checked={fields.acceptTerms} onChange={e=>edit('acceptTerms',e.target.checked)}/> I accept the Terms of Service</label>}
     {step===5&&<label><input type="checkbox" required checked={fields.acknowledgePrivacy} onChange={e=>edit('acknowledgePrivacy',e.target.checked)}/> I acknowledge the Privacy Policy</label>}
    </>}
    {mode==='login'||step===2?<label>Institutional BVM email<input required type="email" placeholder="26cp309@bvmengineering.ac.in" autoComplete="email" maxLength={254} value={fields.email} onChange={e=>edit('email',e.target.value)}/></label>:null}
    {mode==='login'||step===4?<label>Password<input required type="password" autoComplete={mode==='login'?'current-password':'new-password'}
     minLength={mode==='register'?12:1} maxLength={128} value={fields.password} onChange={e=>edit('password',e.target.value)}/></label>:null}
    {mode==='register'&&step===2&&<label>Enrollment number<input required pattern="[0-9]{2}[a-zA-Z]{2}[0-9]{3,8}" placeholder="26cp309" value={fields.enrollmentNumber} onChange={e=>edit('enrollmentNumber',e.target.value.toLowerCase())}/></label>}
    {mode==='register'&&step===2&&<p className="auth-legal">Enrollment number must exactly match the part before @ in your institutional email. Branch codes are provisional and require college confirmation.</p>}
    {message&&!awaitingVerification&&<p role="status" className="form-error">{message}</p>}
    {mode==='register'&&step>0&&<button type="button" onClick={previous}>Back</button>}
    <button disabled={busy} type="submit" className="primary-button full">{busy?'Processing...':mode==='login'?'Sign in':step<groups.length-1?'Continue':'Create account'}</button>
   </form>
   <p className="auth-foot">{mode==='login'?<Link href="/register">Create an account</Link>:<Link href="/login">Already registered? Sign in</Link>}</p>
   <p className="auth-legal">Email verification is required. Google sign-in is not yet connected; Firebase Google provider setup alone does not enable the website button.</p>
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
