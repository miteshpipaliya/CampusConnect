'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {Avatar} from '@/components/avatar';
type Post={id:string;caption:string;authorHandle:string;authorName:string;avatarMediaId?:string|null;avatarUrl?:string|null;mediaUrl?:string|null;media?:Array<{url?:string|null;contentType?:string}>};
export function ChatSharedContentCard({postId,kind}:{postId:string;kind:'post'|'reel'}){
 const [post,setPost]=useState<Post|null>(null),[unavailable,setUnavailable]=useState(false);
 useEffect(()=>{let alive=true;const abort=new AbortController();setPost(null);setUnavailable(false);
  void fetch('/api/posts/'+encodeURIComponent(postId),{signal:abort.signal,cache:'no-store'}).then(async response=>{
   if(!response.ok)throw Error('Unavailable');
   const data=await response.json();
   if(alive)setPost(data.post??null);
  }).catch(()=>{if(alive)setUnavailable(true)});
  return()=>{alive=false;abort.abort()};
 },[postId]);
 if(unavailable)return <div style={{padding:12,border:'1px solid #7775',borderRadius:12}}>This {kind} is no longer available to you.</div>;
 if(!post)return <p role="status">Loading shared {kind}…</p>;
 const preview=post.media?.[0]?.url||post.mediaUrl;
 const video=post.media?.[0]?.contentType?.startsWith('video/');
 return <Link href={'/posts/'+encodeURIComponent(postId)} style={{display:'block',color:'inherit',textDecoration:'none',border:'1px solid #7775',borderRadius:12,padding:10,maxWidth:290}}>
  <small>Shared {kind==='reel'?'Reel':'post'}</small>
  <div style={{display:'flex',alignItems:'center',gap:8,margin:'6px 0'}}><Avatar user={{name:post.authorName,handle:post.authorHandle,avatarMediaId:post.avatarMediaId??null,avatarUrl:post.avatarUrl??null}} size={32}/><strong>@{post.authorHandle}</strong></div>
  {preview&&(video?<video src={preview} preload="metadata" muted playsInline style={{maxWidth:'100%',maxHeight:180,borderRadius:8}}/>:<img src={preview} alt="Shared post preview" loading="lazy" style={{maxWidth:'100%',maxHeight:180,objectFit:'cover',borderRadius:8}}/>)}
  <p style={{margin:'6px 0',overflowWrap:'anywhere'}}>{post.caption.slice(0,160)||'Open original content'}</p>
  <small>View original {kind}</small>
 </Link>;
}
