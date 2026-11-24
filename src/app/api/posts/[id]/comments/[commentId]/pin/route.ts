import {NextRequest,NextResponse} from 'next/server';
import {guard} from '@/lib/server/guard';
import {RATE_LIMITS} from '@/lib/server/rate-limit';
import {db} from '@/lib/server/services';
import {errorResponse,safeHeaders} from '@/lib/server/session';
export const runtime='nodejs';
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string;commentId:string}>}){
 const checked=await guard(req,{write:true,rateLimit:{key:'comment-pin:{uid}',...RATE_LIMITS.commentPin}});if(!checked.ok)return checked.response;
 const {id,commentId}=await params;
 if(!/^[A-Za-z0-9_-]{10,100}$/.test(id)||!/^[A-Za-z0-9_-]{10,100}$/.test(commentId))return errorResponse(400,'Invalid comment');
 const store=db(),post=store.collection('posts').doc(id),comment=post.collection('comments').doc(commentId);
 try{
  const p=await post.get();
  if(!p.exists||p.data()?.deletedAt)return errorResponse(404,'Post unavailable');
  if(p.data()?.authorUid!==checked.user.uid)return errorResponse(403,'Not post owner');
  const result=await store.runTransaction(async tx=>{
   const c=await tx.get(comment);
   if(!c.exists||c.data()?.deletedAt||c.data()?.parentId)return 'missing';
   const existing=await tx.get(post.collection('comments').where('pinned','==',true).limit(2));
   if(existing.docs.some(d=>d.id!==commentId))return 'limit';
   tx.set(comment,{pinned:true},{merge:true});return 'ok';
  });
  if(result==='missing')return errorResponse(404,'Comment unavailable');
  if(result==='limit')return errorResponse(409,'One comment may be pinned');
  return NextResponse.json({ok:true,pinned:true},{headers:safeHeaders});
 }catch{return errorResponse(503,'Unable to pin comment')}
}
export async function DELETE(req:NextRequest,{params}:{params:Promise<{id:string;commentId:string}>}){
 const checked=await guard(req,{write:true,rateLimit:{key:'comment-pin:{uid}',...RATE_LIMITS.commentPin}});if(!checked.ok)return checked.response;
 const {id,commentId}=await params;
 const store=db(),post=store.collection('posts').doc(id),comment=post.collection('comments').doc(commentId);
 try{
  const p=await post.get();if(!p.exists)return errorResponse(404,'Post unavailable');
  if(p.data()?.authorUid!==checked.user.uid)return errorResponse(403,'Not post owner');
  const c=await comment.get();if(!c.exists)return errorResponse(404,'Comment unavailable');
  await comment.set({pinned:false},{merge:true});
  return NextResponse.json({ok:true,pinned:false},{headers:safeHeaders});
 }catch{return errorResponse(503,'Unable to unpin comment')}
}
