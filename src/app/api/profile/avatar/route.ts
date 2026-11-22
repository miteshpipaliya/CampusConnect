import {NextRequest,NextResponse} from 'next/server';
import {GetObjectCommand} from '@aws-sdk/client-s3';
import {FieldValue} from 'firebase-admin/firestore';
import {z} from 'zod';
import {db,storage} from '@/lib/server/services';
import {errorResponse,safeHeaders} from '@/lib/server/session';
import {guard} from '@/lib/server/guard';
import {RATE_LIMITS} from '@/lib/server/rate-limit';
import {signatureMatches} from '@/lib/core/media-signature';
export const runtime='nodejs';
const schema=z.object({mediaId:z.string().uuid()});
export async function POST(request:NextRequest){
 const checked=await guard(request,{write:true,schema,invalidMessage:'Invalid avatar request',rateLimit:{key:'avatar:{uid}',...RATE_LIMITS.avatar}});
 if(!checked.ok)return checked.response;
 const parsed=schema.safeParse(checked.input);if(!parsed.success)return errorResponse(400,'Invalid avatar request');
 try{
  const store=db(),ref=store.collection('media').doc(parsed.data.mediaId);
  const snap=await ref.get(),data=snap.data();
  if(!data||data.ownerUid!==checked.user.uid||data.status!=='uploaded'||!['image/jpeg','image/png','image/webp'].includes(data.contentType)||data.size>5*1024*1024||data.purpose!=='avatar')return errorResponse(400,'Upload a JPG, PNG or WebP avatar under 5 MB');
  const {client,Bucket}=storage();
  const object=await client.send(new GetObjectCommand({Bucket,Key:data.key,Range:'bytes=0-31'}));
  const bytes=object.Body?await object.Body.transformToByteArray():new Uint8Array();
  if(!signatureMatches(data.contentType,bytes))return errorResponse(400,'File signature does not match image format');
  await store.runTransaction(async transaction=>{
   const profile=store.collection('users').doc(checked.user.uid);
   const existing=await transaction.get(profile);
   if(!existing.exists)throw Error('MISSING_PROFILE');
   transaction.update(profile,{avatarMediaId:parsed.data.mediaId,updatedAt:FieldValue.serverTimestamp()});
   transaction.update(ref,{avatarOwnerUid:checked.user.uid});
  });
  return NextResponse.json({ok:true,mediaId:parsed.data.mediaId},{headers:safeHeaders});
 }catch{return errorResponse(503,'Avatar update unavailable')}
}
export async function DELETE(request:NextRequest){
 const checked=await guard(request,{write:true,rateLimit:{key:'avatar:{uid}',...RATE_LIMITS.avatar}});
 if(!checked.ok)return checked.response;
 try{
  const profile=db().collection('users').doc(checked.user.uid);
  await profile.update({avatarMediaId:null,updatedAt:FieldValue.serverTimestamp()});
  return NextResponse.json({ok:true,mediaId:null},{headers:safeHeaders});
 }catch{return errorResponse(503,'Unable to remove avatar')}
}
