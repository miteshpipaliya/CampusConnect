'use client';
import {SafeImg} from '@/components/safe-img';
import '@/app/post-modal-upgrade.css';
import {useCallback,useEffect,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {Avatar} from './avatar';
import {PostActions} from './post-actions';
import {ReportDialog} from './report-dialog';
import {MediaCarousel,type CarouselMedia} from './media-carousel';
import {ChatShareSheet} from './chat/chat-share-sheet';
import {fullPostDate,relativePostDate} from '@/lib/core/post-detail-date';
import {Bookmark,Heart,MessageCircle,Repeat2,Send,BadgeCheck,Smile} from 'lucide-react';
type Post={id:string;caption:string;media?:CarouselMedia[];authorUid?:string;authorHandle:string;authorName:string;avatarMediaId:string|null;avatarUrl:string|null;mediaUrl:string|null;mediaContentType:string|null;likes:number;comments:number;liked:boolean;saved:boolean;hideLikeCount?:boolean;commentsOff?:boolean;pinned?:boolean;verified?:boolean;createdAt?:number;followStatus?:string};
type Comment={id:string;uid:string;handle:string;avatarUrl:string|null;text:string;createdAt:number;likes:number;liked:boolean;pinned:boolean;parentId:string;replies:Comment[]};
async function get<T>(url:string):Promise<T>{const r=await fetch(url,{cache:'no-store'}),d=await r.json();if(!r.ok)throw Error(d.error||'Request failed');return d}
export function LivePostDetail({id,modal=false}:{id:string;modal?:boolean}){
 const [post,setPost]=useState<Post|null>(null),[comments,setComments]=useState<Comment[]>([]),[reply,setReply]=useState(''),[replyTo,setReplyTo]=useState<string|null>(null),[viewer,setViewer]=useState(''),[reportComment,setReportComment]=useState<string|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[share,setShare]=useState(false),[emojiOpen,setEmojiOpen]=useState(false);
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
   <p className="cc-post-detail-comment" style={{margin:0}}><Avatar user={{handle:c.handle,avatarUrl:c.avatarUrl}} size={32}/>{c.pinned&&<span>📌 Pinned · </span>}<b>@{c.handle}</b> {c.text}</p>
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
 if(!post)return <section className="cc-post-detail-loading" role="status" aria-label="Loading post"><div/><div/></section>;
 const profile='/profile/'+encodeURIComponent(post.authorHandle);
 const follow=async()=>{if(busy)return;setBusy(true);try{await update('/api/follow',post.followStatus==='active'?'DELETE':'POST',{handle:post.authorHandle});await load()}catch{setError('Follow update unavailable')}finally{setBusy(false)}};
 const media=post.media?.length?<MediaCarousel items={post.media}/>:post.mediaUrl&&(post.mediaContentType?.startsWith('video/')?<video controls playsInline src={post.mediaUrl}/>:<SafeImg src={post.mediaUrl} loading="lazy" alt={post.caption||'Campus post'}/>);
 return <article className={'cc-post-detail '+(modal?'cc-post-detail-split':'cc-post-detail-page')}>
 <div className="cc-post-detail-media">{media}</div>
 <div className="cc-post-detail-info">
 <header className="cc-post-detail-header"><Link href={profile}><Avatar user={{name:post.authorName,handle:post.authorHandle,avatarMediaId:post.avatarMediaId,avatarUrl:post.avatarUrl}} size={32}/></Link><Link href={profile}><b>@{post.authorHandle}</b>{post.verified&&<BadgeCheck size={14}/>}</Link>{viewer&&post.authorUid!==viewer&&<button type="button" className="cc-post-detail-follow" disabled={busy||post.followStatus==='pending'} onClick={()=>void follow()}>{post.followStatus==='active'?'Following':post.followStatus==='pending'?'Requested':'• Follow'}</button>}<PostActions id={post.id} caption={post.caption} authorUid={post.authorUid} hideLikeCount={post.hideLikeCount??false} commentsOff={post.commentsOff??false} pinned={post.pinned??false} onChanged={()=>void load()}/></header>
 <section className="cc-post-detail-scroll" aria-label="Comments"><div className="cc-post-detail-caption"><Avatar user={{handle:post.authorHandle,avatarUrl:post.avatarUrl}} size={32}/><div><Link href={profile}><b>@{post.authorHandle}</b></Link> {post.caption.split(/([#@][a-zA-Z0-9_.]+)/g).map((part,i)=>part.startsWith('#')&&part.length>1?<Link key={i} href={'/explore/tags/'+encodeURIComponent(part.slice(1))}>{part}</Link>:part.startsWith('@')&&part.length>1?<Link key={i} href={'/profile/'+encodeURIComponent(part.slice(1))}>{part}</Link>:part)}{post.createdAt&&<small className="cc-post-detail-date">{relativePostDate(post.createdAt)}</small>}</div></div>
 {comments.map(c=>row(c))}{!comments.length&&!post.commentsOff&&<p className="cc-post-detail-empty">No comments yet.</p>}</section>
 <footer className="cc-post-detail-footer"><div className="cc-post-detail-actions">
 <button aria-label={post.liked?'Unlike post':'Like post'} disabled={busy} onClick={()=>void action('like')}><Heart size={24} fill={post.liked?'currentColor':'none'}/></button>
 <button aria-label="Comment" onClick={()=>document.getElementById('cc-post-comment-input')?.focus()} disabled={post.commentsOff}><MessageCircle size={24}/></button>
 <button aria-label="Repost" disabled={busy} onClick={()=>void action('repost')}><Repeat2 size={24}/></button>
 <button aria-label="Share post" onClick={()=>setShare(true)}><Send size={24}/></button>
 <button className="cc-post-detail-save" aria-label={post.saved?'Unsave post':'Save post'} disabled={busy} onClick={()=>void action('save')}><Bookmark size={24} fill={post.saved?'currentColor':'none'}/></button></div>
 {!post.hideLikeCount&&<strong>{post.likes} {post.likes===1?'like':'likes'}</strong>}{post.createdAt&&<small>{fullPostDate(post.createdAt)}</small>}
 {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}</footer>
 {post.commentsOff?<p className="cc-post-detail-form">Comments are turned off for this post.</p>:<form className="cc-post-detail-form" onSubmit={comment}>{replyTo&&<button type="button" onClick={()=>setReplyTo(null)}>Cancel reply</button>}<button type="button" aria-label="Choose emoji" aria-expanded={emojiOpen} onClick={()=>setEmojiOpen(v=>!v)}><Smile size={22}/></button>{emojiOpen&&<span className="cc-post-emoji-picker">{['😀','😂','❤️','🔥','🙌','👏'].map(emoji=><button key={emoji} type="button" onClick={()=>{setReply(v=>(v+emoji).slice(0,1000));setEmojiOpen(false);document.getElementById('cc-post-comment-input')?.focus()}}>{emoji}</button>)}</span>}<input id="cc-post-comment-input" required maxLength={1000} value={reply} onChange={e=>setReply(e.target.value)} aria-label="Write a comment" placeholder="Add a comment…"/><button disabled={!reply.trim()||busy} type="submit">{replyTo?'Reply':'Post'}</button></form>}
 </div>{share&&<ChatShareSheet postId={id} onClose={()=>setShare(false)}/>}
 {reportComment&&<ReportDialog targetType="comment" targetId={reportComment} postId={id} onClose={()=>setReportComment(null)}/>}
 </article>;
}
