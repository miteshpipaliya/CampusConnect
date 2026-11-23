import {NextRequest,NextResponse} from 'next/server';
import {PutObjectCommand} from '@aws-sdk/client-s3';
import {db,storage} from '@/lib/server/services';
import {session,sameOrigin,errorResponse,safeHeaders} from '@/lib/server/session';
import {signatureMatches} from '@/lib/core/media-signature';
import {MAX_CHAT_PROXY_BYTES,canProxyChatUpload} from '@/lib/core/chat-upload';
import {checkRateLimit} from '@/lib/server/rate-limit';

export const runtime='nodejs';

// Vercel Functions have a request-body limit. This fallback is intentionally
// restricted to small signed-chat uploads; larger files use R2 presigned PUT.
export async function PUT(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,'Untrusted upload origin');
 const user=await session(request);
 if(!user)return errorResponse(401,'Sign in required');
 const id=request.nextUrl.searchParams.get('id')??'';
 if(!/^[0-9a-f-]{36}$/.test(id))return errorResponse(400,'Invalid upload ID');
 const sizeHeader=request.headers.get('content-length');
 if(sizeHeader!==null&&(!/^\d+$/.test(sizeHeader)||Number(sizeHeader)>MAX_CHAT_PROXY_BYTES))return errorResponse(413,'Use direct R2 upload for larger media');
 const limited=await checkRateLimit({key:'media:proxy:'+user.uid,limit:12,windowSec:60});
 if(!limited.allowed)return errorResponse(429,'Too many upload retries');
 try{
  const item=await db().collection('media').doc(id).get(),data=item.data();
  if(!item.exists||data?.status!=='pending'||data?.ownerUid!==user.uid||data?.purpose!=='chat')
   return errorResponse(404,'Pending chat upload not found');
  if(typeof data.size!=='number'||!canProxyChatUpload(data.size))
   return errorResponse(413,'Use direct R2 upload for larger media');
  const contentType=request.headers.get('content-type')??'';
  if(contentType!==data.contentType)return errorResponse(400,'Unexpected media content type');
  const created=data.createdAt?.toMillis?.();
  if(typeof created==='number'&&Date.now()-created>10*60*1000)return errorResponse(410,'Upload reservation expired');
  const raw=new Uint8Array(await request.arrayBuffer());
  if(raw.byteLength!==data.size||raw.byteLength>MAX_CHAT_PROXY_BYTES)return errorResponse(400,'Uploaded file size does not match reservation');
  if(!signatureMatches(contentType,raw.subarray(0,32)))return errorResponse(400,'Uploaded file type does not match its content');
  const {client,Bucket}=storage();
  await client.send(new PutObjectCommand({
   Bucket,Key:String(data.key),ContentType:contentType,ContentLength:raw.byteLength,Body:raw
  }));
  return NextResponse.json({ok:true},{headers:safeHeaders});
 }catch(error){
  console.error('Small chat upload proxy failed',error instanceof Error?error.name:'unknown');
  return errorResponse(503,'Unable to upload media. Check storage configuration and try again');
 }
}
