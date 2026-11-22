import {NextRequest,NextResponse} from 'next/server';
import {FieldValue} from 'firebase-admin/firestore';
import {z} from 'zod';
import {db} from '@/lib/server/services';
import {errorResponse,safeHeaders} from '@/lib/server/session';
import {guard} from '@/lib/server/guard';
import {RATE_LIMITS} from '@/lib/server/rate-limit';
import {canViewAuthor} from '@/lib/server/privacy';
export const runtime='nodejs';
const schema=z.object({postId:z.string().min(10).max(100)});
export async function POST(request:NextRequest){
 const checked=await guard(request,{write:true,schema,invalidMessage:'Invalid post',rateLimit:{key:'reposts:{uid}',...RATE_LIMITS.reposts}});
 if(!checked.ok)return checked.response;
 const user=checked.user,input=schema.safeParse(checked.input);
 if(!input.success)return errorResponse(400,'Invalid post');
 try{
  const store=db(),post=store.collection('posts').doc(input.data.postId),ref=store.collection('reposts').doc(user.uid+'_'+input.data.postId);
  const source=await post.get();
  if(!source.exists||source.data()?.deletedAt||!(await canViewAuthor(user.uid,String(source.data()?.authorUid||''))))return errorResponse(404,'Post unavailable');
  const reposted=await store.runTransaction(async t=>{
   const original=await t.get(post);if(!original.exists||original.data()?.deletedAt)throw Error('NOT_FOUND');
   const existing=await t.get(ref);
   if(existing.exists)t.delete(ref);else t.create(ref,{ownerUid:user.uid,postId:input.data.postId,createdAt:FieldValue.serverTimestamp()});
   const count=Number(original.data()?.counters?.reposts);
   const current=Number.isFinite(count)?Math.max(0,Math.floor(count)):0;
   t.set(post,{counters:{reposts:Math.max(0,current+(existing.exists?-1:1))}},{merge:true});
   return !existing.exists;
  });
  return NextResponse.json({reposted},{status:reposted?201:200,headers:safeHeaders});
 }catch{return errorResponse(503,'Unable to update repost')}
}
