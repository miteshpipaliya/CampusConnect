'use client';
import {useCallback,useEffect,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {Avatar} from './avatar';
import {PostActions} from './post-actions';
import {ReportDialog} from './report-dialog';
import {MediaCarousel,type CarouselMedia} from './media-carousel';
import {Bookmark,Heart,MessageCircle,Repeat2} from 'lucide-react';
type Post={id:string;caption:string;media?:CarouselMedia[];authorUid?:string;authorHandle:string;authorName:string;avatarMediaId:string|null;avatarUrl:string|null;mediaUrl:string|null;mediaContentType:string|null;likes:number;comments:number;liked:boolean;saved:boolean;hideLikeCount?:boolean;commentsOff?:boolean;pinned?:boolean};
type Comment={id:string;uid:string;handle:string;avatarUrl:string|null;text:string;createdAt:number;likes:number;liked:boolean;pinned:boolean;parentId:string;replies:Comment[]};
async function get<T>(url:string):Promise<T>{const r=await fetch(url,{cache:'no-store'}),d=await r.json();if(!r.ok)throw Error(d.error||'Request failed');return d}
export function LivePostDetail({id}:{id:string}){
 const [post,setPost]=useState<Post|null>(null),[comments,setComments]=useState<Comment[]>([]),[reply,setReply]=useState(''),[replyTo,setReplyTo]=useState<string|null>(null),[viewer,setViewer]=useState(''),[reportComment,setReportComment]=useState<string|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 async function update(url:string,method='POST',body?:object){const r=await fetch(url,{method,headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),d=await r.json();if(!r.ok)throw Error(d.error||'Request failed');return d}
 const load=useCallback(async()=>{const data=await get<{post:Post}>('/api/posts/'+encodeURIComponent(id));setPost(data.post)},[id]);
 const loadComments=useCallback(async()=>{const data=await get<{comments:Comment[]}>('/api/posts/'+encodeURIComponent(id)+'/comments');setComments(data.comments)},[id]);
 useEffect(()=>{void load().catch(e=>setError(String(e)));void loadComments().catch(()=>{});void get<{user?:{uid?:string}}>('/api/auth').then(x=>setViewer(x.user?.uid||'')).catch(()=>{})},[id,load,loadComments]);
 async function action(kind:'like'|'save'|'repost'){if(!post||busy)return;setBusy(true);setError('');try{
  if(kind==='like')await update('/api/posts/'+encodeURIComponent(id)+'/likes','POST',{});
  if(kind==='save')await update('/api/saves',post.saved?'DELETE':'POST',{postId:id});
  if(kind==='repost')await update('/api/reposts','POST',{postId:id});
  await load();setNotice(kind==='save'?(post.saved?'Removed from saved':'Saved privately'):'Updated');
 }catch(e){setError(String(e))}finally{setBusy(false)}}
 async function comment(e:FormEvent){e.preventDefault();if(!reply.trim()||busy)return;setBusy(true);setError('');try{
  await update('/api/posts/'+encodeURIComponent(id)+'/comments','POST',{text:reply.trim(),...(replyTo?{parentId:replyTo}:{})});
  setReply('');setReplyTo(null);await Promise.all([load(),loadComments()]);
 }catch(e){setError(String(e))}finally{setBusy(false)}}
 async function commentAction(item:Comment,kind:'like'|'pin'|'delete'){
  setBusy(true);setError('');
  try{
   const url='/api/posts/'+encodeURIComponent(id)+'/comments/'+encodeURIComponent(item.id)+(kind==='like'?'/like':kind==='pin'?'/pin':'');
   await update(url,kind==='delete'?'DELETE':kind==='like'&&item.liked?'DELETE':kind==='pin'&&item.pinned?'DELETE':'POST');
   await Promise.all([loadComments(),load()]);
  }catch(e){setError(e instanceof Error?e.message:'Comment action unavailable')}finally{setBusy(false)}
 }
 function row(c:Comment,child=false){
  return <div key={c.id} style={{marginLeft:child?34:0,padding:'10px 0',borderBottom:'1px solid #ffffff15'}}>
   <p style={{margin:0}}>{c.pinned&&<span>📌 Pinned · </span>}<b>@{c.handle}</b> {c.text}</p>
   <div style={{display:'flex',gap:12,flexWrap:'wrap',fontSize:12,paddingTop:6}}>
    <button disabled={busy} onClick={()=>void commentAction(c,'like')}>{c.liked?'♥':'♡'} {c.likes}</button>
    {!child&&!post?.commentsOff&&<button onClick={()=>setReplyTo(c.id)}>Reply</button>}
    {(c.uid===viewer||post?.authorUid===viewer)&&<button disabled={busy} onClick={()=>void commentAction(c,'delete')}>Delete</button>}
    {post?.authorUid===viewer&&!child&&<button disabled={busy} onClick={()=>void commentAction(c,'pin')}>{c.pinned?'Unpin':'Pin'}</button>}
    {c.uid!==viewer&&<button onClick={()=>setReportComment(c.id)}>Report</button>}
   </div>
   {!child&&c.replies?.map(x=>row(x,true))}
  </div>
 }
 if(error&&!post)return <section className="cc-live-empty" role="alert">{error} <Link href="/home">Go home</Link></section>;
 if(!post)return <section className="cc-live-empty">Loading post…</section>;
 return <article className="cc-live-entry" style={{maxWidth:720,margin:'0 auto',padding:24}}>
  <header style={{display:'flex',alignItems:'center',gap:10}}><Link href={'/profile/'+encodeURIComponent(post.authorHandle)}><Avatar user={{name:post.authorName,handle:post.authorHandle,avatarMediaId:post.avatarMediaId,avatarUrl:post.avatarUrl}} size={44}/></Link><Link href={'/profile/'+encodeURIComponent(post.authorHandle)}><b>@{post.authorHandle}</b><small style={{display:'block'}}>{post.authorName}</small></Link></header>
  {post.media?.length?<MediaCarousel items={post.media}/>:post.mediaUrl&&(post.mediaContentType?.startsWith('video/')?<video controls playsInline src={post.mediaUrl} style={{maxWidth:'100%',maxHeight:650}}/>:<img src={post.mediaUrl} loading="lazy" alt={post.caption||'Campus post'} style={{width:'100%',objectFit:'contain'}}/>)}
  <p>{post.caption}</p><PostActions id={post.id} caption={post.caption} authorUid={post.authorUid} hideLikeCount={post.hideLikeCount??false} commentsOff={post.commentsOff??false} pinned={post.pinned??false} onChanged={()=>void load()}/>
  <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
   <button disabled={busy} onClick={()=>void action('like')}><Heart size={20} fill={post.liked?'currentColor':'none'}/> {post.hideLikeCount?'Like':post.likes}</button>
   <button disabled={busy} onClick={()=>void action('save')}><Bookmark size={20} fill={post.saved?'currentColor':'none'}/> {post.saved?'Saved':'Save'}</button>
   <button disabled={busy} onClick={()=>void action('repost')}><Repeat2 size={20}/> Repost</button>
   <span><MessageCircle size={20}/> {post.comments}</span>
  </div>
  {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  <section aria-label="Comments"><h2>Comments</h2>{comments.map(c=>row(c))}
  {post.commentsOff?<p>Comments are turned off for this post.</p>:<form onSubmit={comment}>
   {replyTo&&<p>Replying to a comment <button type="button" onClick={()=>setReplyTo(null)}>Cancel</button></p>}
   <input required maxLength={1000} value={reply} onChange={e=>setReply(e.target.value)} aria-label="Write a comment" placeholder="Write a comment…"/>
   <button disabled={!reply.trim()||busy} type="submit">{replyTo?'Reply':'Post'}</button>
  </form>}</section>
  {reportComment&&<ReportDialog targetType="comment" targetId={reportComment} postId={id} onClose={()=>setReportComment(null)}/>}
 </article>;
}
