import {NextRequest,NextResponse} from 'next/server';
import {createHmac} from 'node:crypto';
import {syncStreamUser} from '@/lib/server/stream-user';
import {session,sameOrigin,errorResponse,safeHeaders} from '@/lib/server/session';
export const runtime='nodejs';
function token(secret:string,claims:Record<string,unknown>){
 const encode=(v:object)=>Buffer.from(JSON.stringify(v)).toString('base64url');
 const payload=encode({alg:'HS256',typ:'JWT'})+'.'+encode(claims);
 return payload+'.'+createHmac('sha256',secret).update(payload).digest('base64url');
}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,'Untrusted origin');
 const auth=await session(request);
 if(!auth)return errorResponse(401,'Sign in required');
 const apiKey=process.env.STREAM_API_KEY?.trim(),secret=process.env.STREAM_API_SECRET?.trim();
 if(!apiKey||!secret)return errorResponse(503,'Chat configuration unavailable');
 try{
  const {synced,user}=await syncStreamUser(auth.uid);
  if(!synced)return errorResponse(503,'Unable to synchronize Stream profile');
  return NextResponse.json({token:token(secret,{user_id:auth.uid}),apiKey,user},{headers:safeHeaders});
 }catch(error){
  console.error('Chat token endpoint failed',error instanceof Error?error.message:'unknown');
  return errorResponse(503,'Chat service unavailable');
 }
}
