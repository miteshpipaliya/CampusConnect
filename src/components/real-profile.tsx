'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {Grid3X3,Clapperboard,Repeat2,Plus} from 'lucide-react';
import {Avatar} from './avatar';
type Profile={handle:string;name:string;branch:string;division:string;bio?:string;relationshipStatus?:string;avatarMediaId?:string|null};
type Post={id:string;caption:string;mediaId:string|null;contentType?:string|null;authorHandle?:string;postId?:string};
type Highlight={id:string;mediaId:string;caption:string;active:boolean};
type Data={self:boolean;profile:Profile;posts:Post[];reposts:Post[];highlights:Highlight[]};
type Tab='posts'|'reels'|'reposts';
export function RealProfile({username}:{username:string}){
 const uploadInput=useRef<HTMLInputElement>(null);const [uploading,setUploading]=useState(false);const [data,setData]=useState<Data|null>(null),[error,setError]=useState(''),[tab,setTab]=useState<Tab>('posts');
 const load=async()=>{const r=await fetch('/api/profile/'+encodeURIComponent(username),{cache:'no-store'});const x=await r.json();if(!r.ok)throw Error(x.error||'Profile unavailable');setData(x)};
 useEffect(()=>{void load().catch(e=>setError(e instanceof Error?e.message:'Profile unavailable'))},[username]);
 async function removeAvatar(){setUploading(true);setError('');try{const response=await fetch('/api/profile/avatar',{method:'DELETE'});if(!response.ok)throw Error('Unable to remove avatar');await load()}catch(e){setError(String(e))}finally{setUploading(false)}}
 async function toggleHighlight(id:string,highlight:boolean){try{const r=await fetch('/api/stories',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,highlight})});if(!r.ok)throw Error('Highlight update failed');await load()}catch(e){setError(String(e))}}
 async function uploadAvatar(file:File){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){setError('Select a JPG, PNG or WebP under 5 MB');return}
  setUploading(true);
  try{
   const call=async(url:string,body:object)=>{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const x=await r.json();if(!r.ok)throw Error(x.error||'Upload failed');return x};
   const reserved=await call('/api/media',{action:'reserve',purpose:'avatar',contentType:file.type,size:file.size});
   const sent=await fetch(reserved.uploadUrl,{method:'PUT',headers:{'Content-Type':file.type},body:file});
   if(!sent.ok)throw Error('R2 upload failed. Check bucket CORS.');
   await call('/api/media',{action:'confirm',id:reserved.id});
   await call('/api/profile/avatar',{mediaId:reserved.id});
   await load();
  }catch(e){setError(e instanceof Error?e.message:'Avatar upload failed')}finally{setUploading(false);if(uploadInput.current)uploadInput.current.value=''}
 }
 if(error)return <div className="cc-live-empty" role="alert">{error} <Link href="/home">Back to Home</Link></div>;
 if(!data)return <div className="cc-live-empty">Loading profile…</div>;
 const {profile,posts,reposts,highlights,self}=data;
 const entries=tab==='posts'?posts:tab==='reposts'?reposts:posts.filter(p=>p.contentType?.startsWith('video/'));
 return <section className="cc-real-profile cc-profile-instagram">
  <header className="cc-profile-hero"><div className="cc-profile-avatar" style={{position:'relative',overflow:'hidden'}}>{<Avatar user={profile} size={150}/>}{self&&<><input ref={uploadInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e=>{const file=e.target.files?.[0];if(file)void uploadAvatar(file)}}/><button type="button" disabled={uploading} onClick={()=>uploadInput.current?.click()} aria-label="Upload profile picture" title="Upload JPG or PNG profile picture" style={{position:'absolute',bottom:0,left:0,right:0,padding:6,border:0,background:'#000b',fontSize:11,cursor:'pointer'}}>{uploading?'Uploading…':'Edit photo'}</button>{profile.avatarMediaId&&<button type="button" disabled={uploading} onClick={()=>void removeAvatar()} style={{position:'absolute',top:0,right:0,fontSize:11,background:'#000b',color:'#fff',border:0,padding:4}}>Remove</button>}</>}</div>
   <div className="cc-profile-details"><div className="cc-profile-name"><h1>{profile.handle}</h1>{self?<Link href="/settings" className="cc-profile-action">Edit profile</Link>:<Link href={'/home?section=chat&with='+encodeURIComponent(profile.handle)} className="cc-profile-action">Message</Link>}</div>
    <div className="cc-profile-counts"><span><b>{posts.length}</b> posts</span><span><b>{reposts.length}</b> reposts</span><span><b>{highlights.length}</b> highlights</span></div>
    <strong>{profile.name}</strong><p>{profile.bio||'No bio added yet.'}</p><p>{profile.branch}{profile.division?' · Division '+profile.division:''}</p>
    {profile.relationshipStatus&&<p>Relationship: {profile.relationshipStatus}</p>}
   </div>
  </header>
  <div className="cc-profile-highlights"><h2>Story highlights</h2><div className="cc-profile-highlight-row">{highlights.map(h=><div key={h.id} className="cc-profile-highlight"><a href={'/api/media?id='+encodeURIComponent(h.mediaId)} target="_blank" rel="noreferrer"><span className="cc-profile-highlight-circle"><img src={'/api/media?id='+encodeURIComponent(h.mediaId)} alt={h.caption||'Saved story'}/></span></a><small>{h.caption||'Highlight'}</small>{self&&<button type="button" onClick={()=>void toggleHighlight(h.id,false)}>Remove</button>}</div>)}{!highlights.length&&<p>No saved highlights yet. {self?'Open your story to add one.':''}</p>}</div></div>
  <div className="cc-profile-tabs" role="tablist" aria-label="Profile content">
   {([{key:'posts',label:'Posts',Icon:Grid3X3},{key:'reels',label:'Reels',Icon:Clapperboard},{key:'reposts',label:'Reposts',Icon:Repeat2}] as const).map(({key,label,Icon})=><button type="button" role="tab" aria-selected={tab===key} className={tab===key?'active':''} key={key} onClick={()=>setTab(key)}><Icon size={18}/>{label}</button>)}
  </div>
  {entries.length?<div className="cc-profile-grid">{entries.map(p=><article key={p.id} className="cc-profile-tile"><Link href={'/posts/'+encodeURIComponent(p.postId||p.id)}>{p.mediaId?(p.contentType?.startsWith('video/')?<video src={'/api/media?id='+encodeURIComponent(p.mediaId)} controls playsInline preload="metadata"/>:<img src={'/api/media?id='+encodeURIComponent(p.mediaId)} loading="lazy" alt={p.caption||'Campus post'}/>):<div className="cc-profile-text-tile">{p.caption}</div>}</Link><small>{p.caption}</small></article>)}</div>:<div className="cc-profile-empty"><Grid3X3 size={30}/><p>No {tab} yet.</p>{self&&tab==='posts'&&<Link href="/home?compose=1"><Plus size={16}/> Create a post</Link>}</div>}
 </section>;
}
