import {NextRequest,NextResponse} from 'next/server';
import {GetObjectCommand} from '@aws-sdk/client-s3';
import {z} from 'zod';
import {db,storage} from '@/lib/server/services';
import {errorResponse,safeHeaders} from '@/lib/server/session';
import {guard} from '@/lib/server/guard';
import {RATE_LIMITS} from '@/lib/server/rate-limit';
export const runtime='nodejs';
const schema=z.object({mediaId:z.string().uuid()});
export async function POST(request:NextRequest){
 const checked=await guard(request,{write:true,schema,invalidMessage:'Invalid avatar request',rateLimit:{key:'avatar:{uid}',...RATE_LIMITS.avatar}});if(!checked.ok)return checked.response;
 const user=checked.user;
 const parsed=schema.safeParse(checked.input);
 if(!parsed.success)return errorResponse(400,'Invalid avatar request');
 try{
  const store=db(),ref=store.collection('media').doc(parsed.data.mediaId);
  const snap=await ref.get(),data=snap.data();
  if(!data||data.ownerUid!==user.uid||data.status!=='uploaded'||!['image/jpeg','image/png'].includes(data.contentType)||data.size>5*1024*1024)return errorResponse(400,'Upload a JPG or PNG image under 5 MB');
  const {client,Bucket}=storage();
  const object=await client.send(new GetObjectCommand({Bucket,Key:data.key,Range:'bytes=0-15'}));
  const bytes=object.Body?await object.Body.transformToByteArray():new Uint8Array();
  const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  const png=[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
  if(data.contentType==='image/jpeg'?!jpg:!png)return errorResponse(400,'File signature does not match image format');
  await store.collection('users').doc(user.uid).update({avatarMediaId:parsed.data.mediaId});
  await ref.update({avatarOwnerUid:user.uid});
  return NextResponse.json({ok:true,mediaId:parsed.data.mediaId},{headers:safeHeaders});
 }catch{return errorResponse(503,'Avatar update unavailable')}
}
