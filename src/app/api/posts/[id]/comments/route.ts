import {FieldValue} from 'firebase-admin/firestore';
import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/server/services';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {guard} from '@/lib/server/guard';
import {RATE_LIMITS} from '@/lib/server/rate-limit';
import {canViewAuthor} from '@/lib/server/privacy';
import {hydrateAvatars} from '@/lib/server/avatar-hydration';
import {groupCommentTree} from '@/lib/core/comment-tree';
import {parseCaption} from '@/lib/core/content-rules';
import {removePostComment} from '@/lib/server/comment-operations';
import {z} from 'zod';
import {notify} from '@/lib/server/notify';
export const runtime='nodejs';
const schema=z.object({text:z.string().trim().min(1).max(1000),parentId:z.string().regex(/^[A-Za-z0-9_-]{10,100}$/).optional()});
const valid=(id:string)=>/^[A-Za-z0-9_-]{10,100}$/.test(id);

export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const user=await session(request);if(!user)return errorResponse(401,'Sign in required');
 const {id}=await params;if(!valid(id))return errorResponse(400,'Invalid post');
 const cursor=request.nextUrl.searchParams.get('cursor');
 if(cursor&&!valid(cursor))return errorResponse(400,'Invalid cursor');
 try{
  const store=db(),ref=store.collection('posts').doc(id),p=await ref.get();
  if(!p.exists||p.data()?.deletedAt||(p.data()?.archived&&p.data()?.authorUid!==user.uid)||!(await canViewAuthor(user.uid,String(p.data()?.authorUid||''))))return errorResponse(404,'Post unavailable');
  let query=ref.collection('comments').orderBy('createdAt','desc');
  if(cursor){const prev=await ref.collection('comments').doc(cursor).get();if(!prev.exists)return errorResponse(400,'Invalid cursor');query=query.startAfter(prev)}
  const snap=await query.limit(80).get(),uids=[...new Set(snap.docs.map(d=>String(d.data().uid||'')).filter(Boolean))];
  const [avatars,likes]=await Promise.all([
   hydrateAvatars(uids,user.uid),
   snap.docs.length?store.getAll(...snap.docs.map(d=>d.ref.collection('likes').doc(user.uid))):Promise.resolve([])
  ]);
  const flat=snap.docs.map((d,i)=>{const x=d.data(),uid=String(x.uid||'');
   return {id:d.id,uid,handle:avatars[uid]?.handle||String(x.handle||''),avatarUrl:avatars[uid]?.avatarUrl??null,
    text:String(x.text||''),createdAt:x.createdAt?.toMillis?.()??0,likes:Number(x.counters?.likes||0),
    liked:likes[i]?.exists??false,parentId:String(x.parentId||''),pinned:x.pinned===true};
  });
  return NextResponse.json({comments:groupCommentTree(flat),nextCursor:snap.size===80?snap.docs.at(-1)?.id??null:null},{headers:safeHeaders});
 }catch(error){console.error('Read comments failed',error instanceof Error?error.name:'unknown');return errorResponse(503,'Comments unavailable')}
}
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const checked=await guard(request,{write:true,schema,invalidMessage:'Invalid comment',rateLimit:{key:'comments:{uid}',...RATE_LIMITS.comments}});
 if(!checked.ok)return checked.response;
 const {id}=await params;if(!valid(id))return errorResponse(400,'Invalid post');
 const input=schema.parse(checked.input),store=db(),post=store.collection('posts').doc(id),comment=post.collection('comments').doc();
 try{
  const [p,profile,parent]=await Promise.all([
   post.get(),store.collection('users').doc(checked.user.uid).get(),
   input.parentId?post.collection('comments').doc(input.parentId).get():Promise.resolve(null)
  ]);
  if(!profile.exists||!p.exists||p.data()?.deletedAt||p.data()?.archived||!(await canViewAuthor(checked.user.uid,String(p.data()?.authorUid||''))))return errorResponse(404,'Post unavailable');
  if(p.data()?.commentsOff)return errorResponse(403,'Comments are turned off');
  if(input.parentId&&(!parent?.exists||parent.data()?.parentId))return errorResponse(404,'Parent comment unavailable');
  await store.runTransaction(async tx=>{
   const ref=await tx.get(post);
   if(!ref.exists||ref.data()?.deletedAt||ref.data()?.archived||ref.data()?.commentsOff)throw Error('CLOSED');
   if(input.parentId){const current=await tx.get(post.collection('comments').doc(input.parentId));if(!current.exists||current.data()?.parentId)throw Error('NO_PARENT')}
   tx.create(comment,{uid:checked.user.uid,handle:profile.data()?.handle||'',text:input.text,parentId:input.parentId||'',pinned:false,counters:{likes:0},createdAt:FieldValue.serverTimestamp()});
   tx.update(post,{'counters.comments':FieldValue.increment(1)});
  });
  const ownerUid=String((input.parentId?parent?.data()?.uid:null)||p.data()?.authorUid||'');
  await notify({recipientUid:ownerUid,actorUid:checked.user.uid,type:input.parentId?'reply':'comment',postId:id,commentId:comment.id}).catch(()=>{});
  for(const handle of parseCaption(input.text).mentions){
   try{
    const match=await store.collection('users').where('handle','==',handle).limit(1).get();
    const target=match.docs[0];if(target)await notify({recipientUid:target.id,actorUid:checked.user.uid,type:'mention',postId:id,commentId:comment.id}).catch(()=>{});
   }catch{}
  }
  return NextResponse.json({ok:true,id:comment.id,parentId:input.parentId||''},{headers:safeHeaders});
 }catch(e){if(e instanceof Error&&e.message==='CLOSED')return errorResponse(403,'Comments are turned off');if(e instanceof Error&&e.message==='NO_PARENT')return errorResponse(404,'Parent comment unavailable');return errorResponse(503,'Unable to comment')}
}
// Keep the earlier query-param delete contract for old clients.
export async function DELETE(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const checked=await guard(request,{write:true,rateLimit:{key:'comment-delete:{uid}',...RATE_LIMITS.commentDelete}});
 if(!checked.ok)return checked.response;
 const {id}=await params,commentId=request.nextUrl.searchParams.get('commentId')||'';
 if(!valid(id)||!valid(commentId))return errorResponse(400,'Invalid comment ID');
 try{
  const result=await removePostComment(checked.user.uid,id,commentId);
  if(result==='missing')return errorResponse(404,'Comment unavailable');
  if(result==='forbidden')return errorResponse(403,'Cannot delete this comment');
  if(result==='too-many')return errorResponse(409,'Too many replies to delete at once');
  return NextResponse.json({ok:true},{headers:safeHeaders});
 }catch{return errorResponse(503,'Unable to delete comment')}
}
