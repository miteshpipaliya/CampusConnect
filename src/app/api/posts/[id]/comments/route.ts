import {FieldValue} from 'firebase-admin/firestore';
import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/server/services';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {guard} from '@/lib/server/guard';
import {RATE_LIMITS} from '@/lib/server/rate-limit';
import {canViewAuthor} from '@/lib/server/privacy';
import {z} from 'zod';
import {notify} from '@/lib/server/notify';
export const runtime='nodejs';
const schema=z.object({text:z.string().trim().min(1).max(1000)});
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const user=await session(request);if(!user)return errorResponse(401,'Sign in required');
 const {id}=await params;
 try{const post=db().collection('posts').doc(id),p=await post.get();
  if(!p.exists||p.data()?.deletedAt||!(await canViewAuthor(user.uid,String(p.data()?.authorUid||''))))return errorResponse(404,'Post unavailable');
  const snap=await post.collection('comments').orderBy('createdAt','desc').limit(40).get();
  return NextResponse.json({comments:snap.docs.map(d=>({id:d.id,handle:d.data().handle,text:d.data().text}))},{headers:safeHeaders});
 }catch{return errorResponse(503,'Comments unavailable')}
}
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const checked=await guard(request,{write:true,schema,invalidMessage:'Invalid comment',rateLimit:{key:'comments:{uid}',...RATE_LIMITS.comments}});
 if(!checked.ok)return checked.response;
 const user=checked.user,parsed=schema.safeParse(checked.input);
 if(!parsed.success)return errorResponse(400,'Invalid comment');
 const {id}=await params;
 try{const store=db(),post=store.collection('posts').doc(id),comment=post.collection('comments').doc();
  const profile=await store.collection('users').doc(user.uid).get();
  if(!profile.exists)return errorResponse(404,'Post unavailable');
  let ownerUid:string|undefined;
  const original=await post.get();
  if(!original.exists||original.data()?.deletedAt||!(await canViewAuthor(user.uid,String(original.data()?.authorUid||''))))return errorResponse(404,'Post unavailable');
  await store.runTransaction(async t=>{
   const p=await t.get(post);
   if(!p.exists||p.data()?.deletedAt)throw Error('NOT_FOUND');
   ownerUid=p.data()?.authorUid;
   t.create(comment,{uid:user.uid,handle:profile.data()?.handle,text:parsed.data.text,createdAt:FieldValue.serverTimestamp()});
   t.set(post,{counters:{comments:FieldValue.increment(1)}},{merge:true});
  });
  if(ownerUid)await notify({recipientUid:ownerUid,actorUid:user.uid,type:'comment',postId:id,commentId:comment.id}).catch(()=>{});
  return NextResponse.json({ok:true,id:comment.id},{headers:safeHeaders});
 }catch{return errorResponse(503,'Unable to comment')}
}

export async function DELETE(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const checked=await guard(request,{write:true,rateLimit:{key:'comments:{uid}',...RATE_LIMITS.comments}});
 if(!checked.ok)return checked.response;
 const {id}=await params,commentId=request.nextUrl.searchParams.get('commentId')||'';
 if(!/^[A-Za-z0-9_-]{10,100}$/.test(id)||!/^[A-Za-z0-9_-]{10,100}$/.test(commentId))return errorResponse(400,'Invalid comment ID');
 try{
  const store=db(),post=store.collection('posts').doc(id),comment=post.collection('comments').doc(commentId);
  const removed=await store.runTransaction(async tx=>{
   const [p,c]=await Promise.all([tx.get(post),tx.get(comment)]);
   if(!p.exists||!c.exists)return false;
   if(c.data()?.uid!==checked.user.uid&&p.data()?.authorUid!==checked.user.uid)throw Error('FORBIDDEN');
   tx.delete(comment);
   const count=Number(p.data()?.counters?.comments||0);
   tx.set(post,{counters:{comments:Math.max(0,count-1)}},{merge:true});
   return true;
  });
  if(!removed)return errorResponse(404,'Comment unavailable');
  return NextResponse.json({ok:true},{headers:safeHeaders});
 }catch(e){if(e instanceof Error&&e.message==='FORBIDDEN')return errorResponse(403,'Cannot delete this comment');return errorResponse(503,'Unable to delete comment')}
}
