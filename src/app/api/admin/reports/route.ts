import {NextRequest,NextResponse} from 'next/server';
import {FieldValue} from 'firebase-admin/firestore';
import {z} from 'zod';
import {guard} from '@/lib/server/guard';
import {isAdmin} from '@/lib/server/admin';
import {db,auth} from '@/lib/server/services';
import {errorResponse,safeHeaders} from '@/lib/server/session';
import {mayModerate} from '@/lib/core/admin-action-rules';
export const runtime='nodejs';
const schema=z.object({id:z.string().regex(/^[A-Za-z0-9_-]{10,260}$/),action:z.enum(['dismiss','remove-content','disable-account'])}).strict();
async function permitted(uid:string){return isAdmin(uid)}
export async function GET(req:NextRequest){
 const checked=await guard(req);if(!checked.ok)return checked.response;
 if(!await permitted(checked.user.uid))return errorResponse(403,'Administrator access required');
 const cursor=req.nextUrl.searchParams.get('cursor');
 if(cursor&&!/^[A-Za-z0-9_-]{10,260}$/.test(cursor))return errorResponse(400,'Invalid cursor');
 try{
  const ref=db().collection('reports');
  let query=ref.where('status','==','open').orderBy('createdAt','desc');
  if(cursor){const previous=await ref.doc(cursor).get();if(!previous.exists)return errorResponse(400,'Invalid cursor');query=query.startAfter(previous)}
  let snap:FirebaseFirestore.QuerySnapshot;
  try{snap=await query.limit(30).get()}
  catch(error){if((error as {code?:unknown}).code!==9)throw error;snap=await ref.where('status','==','open').limit(30).get()}
  return NextResponse.json({items:snap.docs.map(d=>({id:d.id,...d.data(),createdAt:d.data().createdAt?.toDate?.()?.toISOString()??null})),
   nextCursor:snap.size===30?snap.docs.at(-1)?.id??null:null},{headers:safeHeaders});
 }catch{return errorResponse(503,'Moderation queue unavailable')}
}
export async function POST(req:NextRequest){
 const checked=await guard(req,{write:true,schema,rateLimit:{key:'admin-moderation:{uid}',limit:60,windowSec:3600}});
 if(!checked.ok)return checked.response;
 if(!await permitted(checked.user.uid))return errorResponse(403,'Administrator access required');
 const {id,action}=schema.parse(checked.input),store=db(),ref=store.collection('reports').doc(id),report=await ref.get();
 if(!report.exists)return errorResponse(404,'Report unavailable');
 const details=report.data()!,targetType=String(details.targetType||''),targetId=String(details.targetId||'');
 if(!mayModerate(action,targetType))return errorResponse(400,'Action is not valid for this report');
 if(report.data()?.status!=='open')return errorResponse(409,'Report already reviewed');
 if(action==='remove-content'&&targetType==='comment'&&!details.postId)return errorResponse(409,'Reported comment is missing its parent post reference');
 try{
  if(action==='disable-account'){
   if(targetId===checked.user.uid)return errorResponse(403,'Cannot disable your own admin account');
   await auth().updateUser(targetId,{disabled:true});
  }
  await store.runTransaction(async tx=>{
   const current=await tx.get(ref);
   if(!current.exists||current.data()?.status!=='open')throw Error('CLOSED');
   if(action==='remove-content'){
    const target=targetType==='comment'
     ?store.collection('posts').doc(String(details.postId)).collection('comments').doc(targetId)
     :store.collection(targetType==='story'?'stories':'posts').doc(targetId);
    const existing=await tx.get(target);
    if(existing.exists)tx.update(target,{deletedAt:FieldValue.serverTimestamp()});
   }
   if(action==='disable-account')tx.set(store.collection('users').doc(targetId),{suspendedAt:FieldValue.serverTimestamp()},{merge:true});
   tx.update(ref,{status:action==='dismiss'?'dismissed':'resolved',moderationAction:action,moderatorUid:checked.user.uid,moderatedAt:FieldValue.serverTimestamp()});
   tx.create(store.collection('adminLog').doc(),{actorUid:checked.user.uid,reportId:id,action,targetType,targetId,createdAt:FieldValue.serverTimestamp()});
  });
  return NextResponse.json({ok:true,action},{headers:safeHeaders});
 }catch(error){if(error instanceof Error&&error.message==='CLOSED')return errorResponse(409,'Report already reviewed');return errorResponse(503,'Moderation action unavailable')}
}
