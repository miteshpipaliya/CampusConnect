'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {Grid3X3,Clapperboard,Repeat2,Plus} from 'lucide-react';
import {Avatar} from './avatar';
type Profile={handle:string;name:string;branch:string;division:string;bio?:string;relationshipStatus?:string;avatarMediaId?:string|null;avatarUrl?:string|null};
type Post={id:string;caption:string;mediaId:string|null;contentType?:string|null;authorHandle?:string;postId?:string};
type Highlight={id:string;mediaId:string;caption:string;active:boolean};
type Data={self:boolean;private?:boolean;profile:Profile;posts:Post[];reposts:Post[];highlights:Highlight[]};
type Tab='posts'|'reels'|'reposts';
export function RealProfile({username}:{username:string}){
 const [followStatus,setFollowStatus]=useState<'none'|'pending'|'active'>('none'),[followBusy,setFollowBusy]=useState(false);
 const [data,setData]=useState<Data|null>(null),[error,setError]=useState(''),[tab,setTab]=useState<Tab>('posts');
 const load=async()=>{const r=await fetch('/api/profile/'+encodeURIComponent(username),{cache:'no-store'});const x=await r.json();if(!r.ok)throw Error(x.error||'Profile unavailable');setData(x)};
 useEffect(()=>{void load().catch(e=>setError(e instanceof Error?e.message:'Profile unavailable'));if(username!=='me')void fetch('/api/follow?handle='+encodeURIComponent(username)).then(r=>r.json()).then(d=>setFollowStatus(d.status||'none')).catch(()=>{})},[username]);
 async function toggleFollow(){setFollowBusy(true);setError('');try{const r=await fetch('/api/follow',{method:followStatus==='none'?'POST':'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({handle:profileHandle})});const d=await r.json();if(!r.ok)throw Error(d.error||'Follow unavailable');setFollowStatus(d.status);await load()}catch(e){setError(String(e))}finally{setFollowBusy(false)}}
 const profileHandle=data?.profile.handle||username;
 async function toggleHighlight(id:string,highlight:boolean){try{const r=await fetch('/api/stories',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,highlight})});if(!r.ok)throw Error('Highlight update failed');await load()}catch(e){setError(String(e))}}
 if(error&&!data)return <div className="cc-live-empty" role="alert">{error} <Link href="/home">Back to Home</Link></div>;
 if(!data)return <div className="cc-live-empty">Loading profile…</div>;
 const {profile,posts,reposts,highlights,self}=data;
 const entries=tab==='posts'?posts:tab==='reposts'?reposts:posts.filter(p=>p.contentType?.startsWith('video/'));
 return <section className="cc-real-profile cc-profile-instagram">
  {error&&<p role="alert" className="form-error">{error}</p>}
  <header className="cc-profile-hero"><div className="cc-profile-avatar" style={{width:150,height:150,flex:'0 0 150px',borderRadius:'50%',overflow:'hidden',border:'none',outline:'none',padding:0,background:'transparent',boxShadow:'none'}}><Avatar user={profile} size={150}/></div>
   <div className="cc-profile-details"><div className="cc-profile-name"><h1>{profile.handle}</h1>{self?<Link href="/settings/edit-profile" className="cc-profile-action">Edit profile</Link>:<Link href={'/home?section=chat&with='+encodeURIComponent(profile.handle)} className="cc-profile-action">Message</Link>}{!self&&<button className="cc-profile-action" type="button" disabled={followBusy} onClick={()=>void toggleFollow()}>{followStatus==='active'?'Following':followStatus==='pending'?'Requested':'Follow'}</button>}</div>

    <div className="cc-profile-counts"><Link href={'/connections?handle='+encodeURIComponent(profile.handle)}><b>{posts.length}</b> posts · <b>{reposts.length}</b> reposts · <b>{highlights.length}</b> highlights</Link></div>
    <strong>{profile.name}</strong><p>{profile.bio||'No bio added yet.'}</p><p>{profile.branch}{profile.division?' · Division '+profile.division:''}</p>
    {profile.relationshipStatus&&<p>Relationship: {profile.relationshipStatus}</p>}
   </div>
  </header>
  {data.private&&<p role="status" style={{padding:20}}>This account is private. Follow to request access to posts and stories.</p>}

  <div className="cc-profile-highlights"><h2>Story highlights</h2><div className="cc-profile-highlight-row">{highlights.map(h=><div key={h.id} className="cc-profile-highlight"><a href={'/api/media?id='+encodeURIComponent(h.mediaId)} target="_blank" rel="noreferrer"><span className="cc-profile-highlight-circle"><img src={'/api/media?id='+encodeURIComponent(h.mediaId)} alt={h.caption||'Saved story'}/></span></a><small>{h.caption||'Highlight'}</small>{self&&<button type="button" onClick={()=>void toggleHighlight(h.id,false)}>Remove</button>}</div>)}{!highlights.length&&<p>No saved highlights yet. {self?'Open your story to add one.':''}</p>}</div></div>
  <div className="cc-profile-tabs" role="tablist" aria-label="Profile content">
   {([{key:'posts',label:'Posts',Icon:Grid3X3},{key:'reels',label:'Reels',Icon:Clapperboard},{key:'reposts',label:'Reposts',Icon:Repeat2}] as const).map(({key,label,Icon})=><button type="button" role="tab" aria-selected={tab===key} className={tab===key?'active':''} key={key} onClick={()=>setTab(key)}><Icon size={18}/>{label}</button>)}
  </div>
  {entries.length?<div className="cc-profile-grid">{entries.map(p=><article key={p.id} className="cc-profile-tile"><Link href={'/posts/'+encodeURIComponent(p.postId||p.id)}>{p.mediaId?(p.contentType?.startsWith('video/')?<video src={'/api/media?id='+encodeURIComponent(p.mediaId)} controls playsInline preload="metadata"/>:<img src={'/api/media?id='+encodeURIComponent(p.mediaId)} loading="lazy" alt={p.caption||'Campus post'}/>):<div className="cc-profile-text-tile">{p.caption}</div>}</Link><small>{p.caption}</small></article>)}</div>:<div className="cc-profile-empty"><Grid3X3 size={30}/><p>No {tab} yet.</p>{self&&tab==='posts'&&<Link href="/home?compose=1"><Plus size={16}/> Create a post</Link>}</div>}
 </section>;
}
