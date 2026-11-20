'use client';
import Link from 'next/link';
import { useEffect,useState } from 'react';
type Profile={handle:string;name:string;branch:string;division:string;bio?:string;relationshipStatus?:string};
type Post={id:string;caption:string;mediaId:string|null};
export function RealProfile({username}:{username:string}){
 const [profile,setProfile]=useState<Profile|null>(null),[posts,setPosts]=useState<Post[]>([]),[error,setError]=useState(''),[self,setSelf]=useState(false);
 useEffect(()=>{let active=true;fetch('/api/profile/'+encodeURIComponent(username),{cache:'no-store'}).then(async r=>{const x=await r.json();if(!r.ok)throw Error(x.error||'Profile unavailable');return x}).then(x=>{if(active){setProfile(x.profile);setPosts(x.posts);setSelf(x.self)}}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[username]);
 if(error)return <div className="cc-live-empty"><h2>{error}</h2><Link href="/home">Back to Home</Link></div>;
 if(!profile)return <div className="cc-live-empty">Loading profile…</div>;
 return <section className="cc-real-profile"><header><div className="cc-real-avatar">{profile.name.slice(0,1).toUpperCase()}</div><div><h1>@{profile.handle}</h1><b>{profile.name}</b><p>{profile.branch} · Division {profile.division}</p>{profile.bio&&<p>{profile.bio}</p>}{profile.relationshipStatus&&<p>Relationship: {profile.relationshipStatus}</p>}{self&&<Link href="/settings">Account settings</Link>}</div></header><h2>Posts · {posts.length}</h2>{posts.length?posts.map(p=><article className="cc-live-entry" key={p.id}>{p.mediaId&&<img src={'/api/media?id='+encodeURIComponent(p.mediaId)} alt="Campus post" loading="lazy"/>}<p>{p.caption}</p></article>):<p>No posts yet. <Link href="/home">Share your first campus moment</Link></p>}</section>;
}