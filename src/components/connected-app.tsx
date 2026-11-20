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
 const [fields,setFields]=useState({email:'',password:'',handle:'',name:'',branch:'Computer Engineering',division:'4',relationshipStatus:'',relationshipVisibility:'me',acceptTerms:false,acknowledgePrivacy:false});
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const edit=(k:keyof typeof fields,v:string|boolean)=>setFields(f=>({...f,[k]:v}));
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setMessage('');
  try{
   const result=await api<{message?:string}>('/api/auth','POST',{action:mode==='register'?'register':'login',
    ...fields,handle:fields.handle.toLowerCase().trim()});
   if(mode==='login')window.location.assign('/home');
   else setMessage(result.message||'Account created. Verify your email then sign in.');
  }catch(e){setMessage(e instanceof Error?e.message:'Please try again')}finally{setBusy(false)}
 }
 return <main className="auth-page">
  <Link className="brand" href="/"><span className="brand-mark">CC</span><span>Campus<span className="brand-lite">Connect</span></span></Link>
  <section className="auth-card wide"><h1>{mode==='login'?'Sign in to CampusConnect':'Join CampusConnect'}</h1>
   <p>Student social network · secure server-side authentication</p>
   <form className="auth-form" onSubmit={submit}>
    {mode==='register'&&<>
     <label>Your name<input required maxLength={70} value={fields.name} onChange={e=>edit('name',e.target.value)}/></label>
     <label>Username<input required pattern="[a-z][a-z0-9._]{2,29}" maxLength={30} placeholder="first.last" value={fields.handle} onChange={e=>edit('handle',e.target.value.toLowerCase())}/></label>
     <label>Branch<input required maxLength={70} value={fields.branch} onChange={e=>edit('branch',e.target.value)}/></label>
     <label>Division<input required maxLength={20} value={fields.division} onChange={e=>edit('division',e.target.value)}/></label>
     <label>Relationship status (required)<select required value={fields.relationshipStatus} onChange={e=>edit('relationshipStatus',e.target.value)}>
      <option value="">Select your status</option>
      {['Single','In Relationship','Engaged','Married','Situationship'].map(x=><option key={x} value={x}>{x}</option>)}
     </select></label>
     <label>Relationship visibility<select value={fields.relationshipVisibility} onChange={e=>edit('relationshipVisibility',e.target.value)}>
      <option value="me">Only me</option><option value="followers">Followers</option><option value="campus">Campus members</option>
     </select></label>
     <label><input type="checkbox" required checked={fields.acceptTerms} onChange={e=>edit('acceptTerms',e.target.checked)}/> I accept the Terms of Service</label>
     <label><input type="checkbox" required checked={fields.acknowledgePrivacy} onChange={e=>edit('acknowledgePrivacy',e.target.checked)}/> I acknowledge the Privacy Policy</label>
    </>}
    <label>Institutional BVM email<input required type="email" placeholder="26cp309@bvmengineering.ac.in" autoComplete="email" maxLength={254} value={fields.email} onChange={e=>edit('email',e.target.value)}/></label>
    <label>Password<input required type="password" autoComplete={mode==='login'?'current-password':'new-password'}
     minLength={mode==='register'?12:1} maxLength={128} value={fields.password} onChange={e=>edit('password',e.target.value)}/></label>
    {message&&<p role="status" className="form-error">{message}</p>}
    <button disabled={busy} type="submit" className="primary-button full">{busy?'Processing...':mode==='login'?'Sign in':'Create account'}</button>
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
