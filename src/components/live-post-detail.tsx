'use client';
import {useEffect,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {Avatar} from './avatar';
import {PostActions} from './post-actions';
import {MediaCarousel,type CarouselMedia} from './media-carousel';
import {Bookmark,Heart,MessageCircle,Repeat2} from 'lucide-react';
type Post={id:string;caption:string;media?:CarouselMedia[];authorUid?:string;authorHandle:string;authorName:string;avatarMediaId:string|null;avatarUrl:string|null;mediaUrl:string|null;mediaContentType:string|null;likes:number;comments:number;liked:boolean;saved:boolean};
type Comment={id:string;handle:string;text:string};
export function LivePostDetail({id}:{id:string}){
 const [post,setPost]=useState<Post|null>(null),[comments,setComments]=useState<Comment[]>([]),[reply,setReply]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 async function get<T>(url:string):Promise<T>{const r=await fetch(url,{cache:'no-store'}),d=await r.json();if(!r.ok)throw Error(d.error||'Request failed');return d}
 async function update(url:string,method='POST',body?:object){const r=await fetch(url,{method,headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const d=await r.json();if(!r.ok)throw Error(d.error||'Request failed');return d}
 async function load(){const data=await get<{post:Post}>('/api/posts/'+encodeURIComponent(id));setPost(data.post)}
 async function loadComments(){const data=await get<{comments:Comment[]}>('/api/posts/'+encodeURIComponent(id)+'/comments');setComments(data.comments)}
 useEffect(()=>{void load().catch(e=>setError(String(e)));void loadComments().catch(()=>{})},[id]);
 async function action(kind:'like'|'save'|'repost'){if(!post||busy)return;setBusy(true);setError('');try{
  if(kind==='like')await update('/api/posts/'+encodeURIComponent(id)+'/likes','POST',{});
  if(kind==='save')await update('/api/saves',post.saved?'DELETE':'POST',{postId:id});
  if(kind==='repost')await update('/api/reposts','POST',{postId:id});
  await load();setNotice(kind==='save'?(post.saved?'Removed from saved':'Saved privately'):'Updated');
 }catch(e){setError(String(e))}finally{setBusy(false)}}
 async function comment(e:FormEvent){e.preventDefault();if(!reply.trim()||busy)return;setBusy(true);setError('');try{await update('/api/posts/'+encodeURIComponent(id)+'/comments','POST',{text:reply.trim()});setReply('');await Promise.all([load(),loadComments()])}catch(e){setError(String(e))}finally{setBusy(false)}}
 if(error&&!post)return <section className="cc-live-empty" role="alert">{error} <Link href="/home">Go home</Link></section>;
 if(!post)return <section className="cc-live-empty">Loading post…</section>;
 return <article className="cc-live-entry" style={{maxWidth:720,margin:'0 auto',padding:24}}>
  <header style={{display:'flex',alignItems:'center',gap:10}}><Link href={'/profile/'+encodeURIComponent(post.authorHandle)}><Avatar user={{name:post.authorName,handle:post.authorHandle,avatarMediaId:post.avatarMediaId,avatarUrl:post.avatarUrl}} size={44}/></Link><Link href={'/profile/'+encodeURIComponent(post.authorHandle)}><b>@{post.authorHandle}</b><small style={{display:'block'}}>{post.authorName}</small></Link></header>
  {post.media?.length?<MediaCarousel items={post.media}/>:post.mediaUrl&&(post.mediaContentType?.startsWith('video/')?<video controls playsInline src={post.mediaUrl} style={{maxWidth:'100%',maxHeight:650}}/>:<img src={post.mediaUrl} loading="lazy" alt={post.caption||'Campus post'} style={{width:'100%',objectFit:'contain'}}/>)}
  <p>{post.caption}</p><PostActions id={post.id} caption={post.caption} authorUid={post.authorUid} onChanged={()=>void load()}/>
  <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
   <button disabled={busy} onClick={()=>void action('like')}><Heart size={20} fill={post.liked?'currentColor':'none'}/> {post.likes}</button>
   <button disabled={busy} onClick={()=>void action('save')}><Bookmark size={20} fill={post.saved?'currentColor':'none'}/> {post.saved?'Saved':'Save'}</button>
   <button disabled={busy} onClick={()=>void action('repost')}><Repeat2 size={20}/> Repost</button>
   <span><MessageCircle size={20}/> {post.comments}</span>
  </div>
  {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  <section aria-label="Comments"><h2>Comments</h2>{comments.map(c=><p key={c.id}><b>@{c.handle}</b> {c.text}</p>)}<form onSubmit={comment}><input required maxLength={1000} value={reply} onChange={e=>setReply(e.target.value)} aria-label="Write a comment" placeholder="Write a comment…"/><button disabled={!reply.trim()||busy} type="submit">Post</button></form></section>
 </article>;
}
