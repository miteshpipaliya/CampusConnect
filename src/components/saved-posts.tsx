'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
type Post={id:string;caption:string;handle:string;mediaUrl:string|null};
export function SavedPosts(){
 const [posts,setPosts]=useState<Post[]>([]),[busy,setBusy]=useState(''),[error,setError]=useState(''),[loaded,setLoaded]=useState(false);
 async function refresh(){const response=await fetch('/api/saves',{cache:'no-store'});const data=await response.json();if(!response.ok)throw Error(data.error||'Saved posts unavailable');setPosts(data.items);setLoaded(true)}
 useEffect(()=>{void refresh().catch(e=>setError(String(e)))},[]);
 async function remove(postId:string){setBusy(postId);setError('');try{const r=await fetch('/api/saves',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({postId})});if(!r.ok)throw Error('Unable to remove saved post');await refresh()}catch(e){setError(String(e))}finally{setBusy('')}}
 return <section style={{maxWidth:900,margin:'0 auto',padding:24}}><h1>Saved posts</h1><p>Only you can see the posts you saved.</p>{error&&<p role="alert">{error}</p>}
 {!loaded&&!error?<p>Loading saved posts…</p>:!posts.length?<p>You have no saved posts yet.</p>:<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',gap:16}}>{posts.map(post=><article key={post.id} style={{display:'grid',gap:8}}><Link href={'/posts/'+encodeURIComponent(post.id)}>{post.mediaUrl?<img src={post.mediaUrl} alt={post.caption||'Saved post'} style={{width:'100%',aspectRatio:'1',objectFit:'cover'}}/>:<p>{post.caption}</p>}<small>@{post.handle}</small></Link><button type="button" disabled={busy===post.id} onClick={()=>void remove(post.id)}>Remove from saved</button></article>)}</div>}</section>;
}
