'use client';
import {LoadingSkeleton} from './loading-skeleton';
import Link from 'next/link';
import {useCallback,useEffect,useState} from 'react';
import {Grid3X3,Clapperboard,Repeat2,Plus,Bookmark,AtSign,BadgeCheck} from 'lucide-react';
import {ReportDialog} from './report-dialog';
import {Avatar} from './avatar';
import {ProfileVideoPreview} from './profile-video-preview';
import {ProfileHighlights} from './profile-highlights';
type Profile={uid?:string;handle:string;name:string;branch:string;division:string;bio?:string;relationshipStatus?:string;avatarMediaId?:string|null;avatarUrl?:string|null;verified?:boolean};
type Post={type?:'post'|'reel';views?:number;id:string;caption:string;mediaId:string|null;contentType?:string|null;authorHandle?:string;postId?:string;mediaUrl?:string|null;pinned?:boolean};
type Highlight={id:string;mediaId:string;caption:string;active:boolean};
type Data={self:boolean;private?:boolean;profile:Profile;posts:Post[];reposts:Post[];tagged?:Post[];highlights:Highlight[];counters?:{posts:number;followers:number;following:number;reposts?:number};verified?:boolean;viewerRelation?:string};
type Tab='posts'|'reels'|'reposts'|'saved'|'tagged';
export function RealProfile({username}:{username:string}){
 const [followStatus,setFollowStatus]=useState<'none'|'pending'|'active'>('none'),[followBusy,setFollowBusy]=useState(false);
 const [data,setData]=useState<Data|null>(null),[error,setError]=useState(''),[tab,setTab]=useState<Tab>('posts'),[saved,setSaved]=useState<Post[]>([]),[menu,setMenu]=useState(false),[report,setReport]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const load=useCallback(async()=>{const r=await fetch('/api/profile/'+encodeURIComponent(username),{cache:'no-store'});const x=await r.json();if(!r.ok)throw Error(x.error||'Profile unavailable');setData(x)},[username]);
 useEffect(()=>{void load().catch(e=>setError(e instanceof Error?e.message:'Profile unavailable'));if(username!=='me')void fetch('/api/follow?handle='+encodeURIComponent(username)).then(r=>r.json()).then(d=>setFollowStatus(d.status||'none')).catch(()=>{})},[username,load]);
 async function toggleFollow(){setFollowBusy(true);setError('');try{const r=await fetch('/api/follow',{method:followStatus==='none'?'POST':'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({handle:profileHandle})});const d=await r.json();if(!r.ok)throw Error(d.error||'Follow unavailable');setFollowStatus(d.status);await load()}catch(e){setError(String(e))}finally{setFollowBusy(false)}}
 const profileHandle=data?.profile.handle||username;
 useEffect(()=>{if(tab!=='saved'||!data?.self)return;let active=true;void fetch('/api/saves',{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'Saved posts unavailable');if(active)setSaved(d.items||[])}).catch(e=>{if(active)setError(String(e))});return()=>{active=false}},[tab,data?.self]);
 async function block(){if(!window.confirm('Block this account?'))return;setBusy(true);try{const r=await fetch('/api/blocks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({handle:profileHandle})});if(!r.ok)throw Error((await r.json()).error||'Unable to block');setNotice('Account blocked');setMenu(false)}catch(e){setError(String(e))}finally{setBusy(false)}}

 if(error&&!data)return <div className="cc-live-empty" role="alert">{error} <Link href="/home">Back to Home</Link></div>;
 if(!data)return <LoadingSkeleton kind="profile"/>;
 const {profile,posts,reposts,self}=data;
 const entries=tab==='posts'?posts.filter(p=>p.type!=='reel'):tab==='reposts'?reposts:tab==='saved'?saved:tab==='tagged'?(data.tagged||[]):posts.filter(p=>p.type==='reel');
 const stats=data.counters||{posts:posts.length,followers:0,following:0};
 return <section className="cc-real-profile cc-profile-instagram">
  {error&&<p role="alert" className="form-error">{error}</p>}{notice&&<p role="status">{notice}</p>}
  <header className="cc-profile-hero"><div className="cc-profile-avatar cc-profile-avatar-audit"><Avatar user={profile} size={150}/></div>
   <div className="cc-profile-details"><div className="cc-profile-name"><h1>{profile.handle}</h1>{(profile.verified||data.verified)&&<BadgeCheck size={20} color="#4f9cff" aria-label="Verified BVM account"/>}{self?<Link href="/settings/edit-profile" className="cc-profile-action">Edit profile</Link>:<Link href={'/home?section=chat&with='+encodeURIComponent(profile.handle)} className="cc-profile-action">Message</Link>}{!self&&<button className="cc-profile-action" type="button" disabled={followBusy} onClick={()=>void toggleFollow()}>{followStatus==='active'?'Following':followStatus==='pending'?'Requested':'Follow'}</button>}
     {!self&&<button className="cc-profile-action" type="button" aria-label="Profile options" onClick={()=>setMenu(v=>!v)}>⋯</button>}
     {menu&&<div className="cc-profile-options"><button disabled={busy} onClick={()=>void block()}>Block account</button><button onClick={()=>{setReport(true);setMenu(false)}}>Report profile</button><button onClick={()=>{void navigator.clipboard.writeText(window.location.href).then(()=>setNotice('Profile link copied'))}}>Copy profile link</button></div>}</div>

    <div className="cc-profile-counts"><span><b>{stats.posts}</b> posts</span> · <Link href={'/connections?handle='+encodeURIComponent(profile.handle)+'&tab=followers'}><b>{stats.followers}</b> followers</Link> · <Link href={'/connections?handle='+encodeURIComponent(profile.handle)+'&tab=following'}><b>{stats.following}</b> following</Link></div>
    <strong>{profile.name}</strong><p>{profile.bio||'No bio added yet.'}</p><p>{profile.branch}{profile.division?' · Division '+profile.division:''}</p>
    {profile.relationshipStatus&&<p>Relationship: {profile.relationshipStatus}</p>}
   </div>
  </header>
  {data.private&&<p role="status" className="cc-profile-private-notice">This account is private. Follow to request access to posts and stories.</p>}

  <ProfileHighlights handle={profile.handle} self={self}/>
  <div className="cc-profile-tabs" role="tablist" aria-label="Profile content">
   {([{key:'posts',label:'Posts',Icon:Grid3X3},{key:'reels',label:'Reels',Icon:Clapperboard},{key:'reposts',label:'Reposts',Icon:Repeat2},...(self?[{key:'saved' as const,label:'Saved',Icon:Bookmark}]:[]),{key:'tagged',label:'Tagged',Icon:AtSign}] as const).map(({key,label,Icon})=><button type="button" role="tab" aria-selected={tab===key} className={tab===key?'active':''} key={key} onClick={()=>setTab(key)}><Icon size={18}/>{label}</button>)}
  </div>
  {entries.length?<div className={"cc-profile-grid"+(tab==="reels"?" cc-profile-reel-grid":"")}>{entries.map(p=><article key={p.id} className="cc-profile-tile"><Link href={'/posts/'+encodeURIComponent(p.postId||p.id)}>{tab==='reels'&&<span className="cc-profile-reel-views"><Clapperboard size={16}/> {p.views??0}</span>}{p.pinned&&<span aria-label="Pinned post">📌</span>}{(p.mediaUrl||p.mediaId)?(p.contentType?.startsWith('video/')?<ProfileVideoPreview key={p.mediaUrl||p.mediaId} id={p.id} src={p.mediaUrl||'/api/media?id='+encodeURIComponent(p.mediaId||'')}/>:<img src={p.mediaUrl||'/api/media?id='+encodeURIComponent(p.mediaId||'')} loading="lazy" alt={p.caption||'Campus post'}/>):<div className="cc-profile-text-tile">{p.caption}</div>}</Link><small>{p.caption}</small></article>)}</div>:<div className="cc-profile-empty"><Grid3X3 size={30}/><p>No {tab} yet.</p>{self&&tab==='posts'&&<Link href="/home?compose=1"><Plus size={16}/> Create a post</Link>}</div>}
  {report&&profile.uid&&<ReportDialog targetType="user" targetId={profile.uid} onClose={()=>setReport(false)}/>}
 </section>;
}
