import {NextRequest,NextResponse} from 'next/server';
import {FieldValue} from 'firebase-admin/firestore';
import {guard} from '@/lib/server/guard';
import {RATE_LIMITS} from '@/lib/server/rate-limit';
import {db} from '@/lib/server/services';
import {canViewAuthor} from '@/lib/server/privacy';
import {errorResponse,safeHeaders} from '@/lib/server/session';
import {notify} from '@/lib/server/notify';
export const runtime='nodejs';
async function update(req:NextRequest,{params}:{params:Promise<{id:string;commentId:string}>},remove:boolean){
 const checked=await guard(req,{write:true,rateLimit:{key:'comment-like:{uid}',...RATE_LIMITS.commentLikes}});
 if(!checked.ok)return checked.response;
 const {id,commentId}=await params;
 if(!/^[A-Za-z0-9_-]{10,100}$/.test(id)||!/^[A-Za-z0-9_-]{10,100}$/.test(commentId))return errorResponse(400,'Invalid comment');
 const store=db(),post=store.collection('posts').doc(id),comment=post.collection('comments').doc(commentId),like=comment.collection('likes').doc(checked.user.uid);
 try{
  const p=await post.get();
  if(!p.exists||p.data()?.deletedAt||p.data()?.archived||!(await canViewAuthor(checked.user.uid,String(p.data()?.authorUid||''))))return errorResponse(404,'Post unavailable');
  const response=await store.runTransaction(async tx=>{
   const [c,l]=await Promise.all([tx.get(comment),tx.get(like)]);
   if(!c.exists)return null;
   const uid=String(c.data()?.uid||''),current=Math.max(0,Number(c.data()?.counters?.likes||0));
   if(remove&&l.exists){tx.delete(like);tx.update(comment,{'counters.likes':Math.max(0,current-1)});return {liked:false,notifyUid:''}}
   if(!remove&&!l.exists){tx.create(like,{uid:checked.user.uid,createdAt:FieldValue.serverTimestamp()});tx.update(comment,{'counters.likes':current+1});return {liked:true,notifyUid:uid}}
   return {liked:l.exists,notifyUid:''};
  });
  if(!response)return errorResponse(404,'Comment unavailable');
  if(response.notifyUid)await notify({recipientUid:response.notifyUid,actorUid:checked.user.uid,type:'comment_like',postId:id,commentId}).catch(()=>{});
  return NextResponse.json({liked:response.liked},{headers:safeHeaders});
 }catch{return errorResponse(503,'Unable to like comment')}
}
export async function POST(req:NextRequest,ctx:{params:Promise<{id:string;commentId:string}>}){return update(req,ctx,false)}
export async function DELETE(req:NextRequest,ctx:{params:Promise<{id:string;commentId:string}>}){return update(req,ctx,true)}
