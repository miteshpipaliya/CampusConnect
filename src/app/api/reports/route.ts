import {NextRequest,NextResponse} from 'next/server';
import {FieldValue} from 'firebase-admin/firestore';
import {z} from 'zod';
import {db} from '@/lib/server/services';
import {guard} from '@/lib/server/guard';
import {errorResponse,safeHeaders} from '@/lib/server/session';
import {REPORT_REASONS} from '@/lib/core/report-rules';
export const runtime='nodejs';
const schema=z.object({
 targetType:z.enum(['post','comment','user','story']),
 targetId:z.string().regex(/^[A-Za-z0-9_-]{10,128}$/),
 reason:z.enum(REPORT_REASONS),
 details:z.string().trim().max(300).optional(),postId:z.string().regex(/^[A-Za-z0-9_-]{10,100}$/).optional()
}).strict();
export async function POST(req:NextRequest){
 const checked=await guard(req,{write:true,schema,rateLimit:{key:'reports:{uid}',limit:5,windowSec:3600}});
 if(!checked.ok)return checked.response;
 const data=schema.parse(checked.input),store=db();
 const key=checked.user.uid+'_'+data.targetType+'_'+data.targetId,ref=store.collection('reports').doc(key);
 try{
  const collection=data.targetType==='post'?'posts':data.targetType==='user'?'users':data.targetType==='story'?'stories':null;
  if(collection){
   const exists=await store.collection(collection).doc(data.targetId).get();
   if(!exists.exists||exists.data()?.deletedAt)return errorResponse(404,'Reported item unavailable');
  }else{
   if(!data.postId)return errorResponse(400,'Comment report requires its parent post');
   const post=await store.collection('posts').doc(data.postId).get();
   if(!post.exists||post.data()?.deletedAt)return errorResponse(404,'Reported post unavailable');
   const comment=await post.ref.collection('comments').doc(data.targetId).get();
   if(!comment.exists||comment.data()?.deletedAt)return errorResponse(404,'Reported comment unavailable');
  }
  const duplicate=await ref.get();
  if(duplicate.exists)return NextResponse.json({ok:true,alreadyReported:true},{headers:safeHeaders});
  try{
   await ref.create({reporterUid:checked.user.uid,targetType:data.targetType,targetId:data.targetId,reason:data.reason,details:data.details||'',...(data.postId?{postId:data.postId}:{}),status:'open',createdAt:FieldValue.serverTimestamp()});
  }catch(error){
   if((error as {code?:unknown}).code===6)return NextResponse.json({ok:true,alreadyReported:true},{headers:safeHeaders});
   throw error;
  }
  return NextResponse.json({ok:true,alreadyReported:false},{status:201,headers:safeHeaders});
 }catch{return errorResponse(503,'Unable to submit report')}
}
