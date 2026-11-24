import {NextRequest,NextResponse} from 'next/server';
import {FieldValue} from 'firebase-admin/firestore';
import {z} from 'zod';
import {db} from '@/lib/server/services';
import {guard} from '@/lib/server/guard';
import {errorResponse,safeHeaders} from '@/lib/server/session';
import {REPORT_REASONS} from '@/lib/core/report-rules';
import {canViewAuthor,isBlockedEitherWay} from '@/lib/server/privacy';
import {authorizedStory} from '@/lib/server/story-service';
import {mayReport} from '@/lib/core/report-authorization';
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
  const uid=checked.user.uid;
  const unavailable=()=>errorResponse(404,'Reported item unavailable');
  if(data.targetType==='story'){
   const story=await authorizedStory(uid,data.targetId,{allowHighlighted:true});
   if(!story||!mayReport({exists:true,visible:true,blocked:false,self:story.authorUid===uid}))return unavailable();
  }else if(data.targetType==='user'){
   const target=await store.collection('users').doc(data.targetId).get();
   if(!mayReport({exists:target.exists&&!target.data()?.deletedAt,visible:true,blocked:await isBlockedEitherWay(uid,data.targetId),self:uid===data.targetId}))return unavailable();
  }else{
   const postId=data.targetType==='post'?data.targetId:data.postId;
   if(!postId)return unavailable();
   const post=await store.collection('posts').doc(postId).get(),p=post.data(),author=String(p?.authorUid||'');
   if(!post.exists||p?.deletedAt||p?.archived||!author||!(await canViewAuthor(uid,author)))return unavailable();
   if(data.targetType==='comment'){
    const comment=await post.ref.collection('comments').doc(data.targetId).get(),c=comment.data(),writer=String(c?.uid||'');
    if(!mayReport({exists:comment.exists&&!c?.deletedAt,visible:Boolean(writer),blocked:writer?await isBlockedEitherWay(uid,writer):true,self:writer===uid}))return unavailable();
   }else if(!mayReport({exists:true,visible:true,blocked:false,self:author===uid}))return unavailable();
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
