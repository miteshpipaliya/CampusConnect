import {NextRequest,NextResponse} from 'next/server';
import {createHmac} from 'node:crypto';
import {db} from '@/lib/server/services';
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
  const record=await db().collection('users').doc(auth.uid).get();
  if(!record.exists)return errorResponse(403,'Campus profile required');
  const data=record.data()||{};
  const user={id:auth.uid,name:String(data.name||data.handle||'Student'),username:String(data.handle||''),image:typeof data.photoURL==='string'?data.photoURL:undefined};
  const url=new URL('https://chat.stream-io-api.com/api/v2/chat/users');
  url.searchParams.set('api_key',apiKey);
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':token(secret,{server:true}),'stream-auth-type':'jwt'},body:JSON.stringify({users:{[auth.uid]:user}}),cache:'no-store'});
  if(!response.ok){
   const failure=await response.json().catch(()=>({}));
   console.error('Stream user upsert failed',{status:response.status,code:failure.code,message:failure.message});
   return errorResponse(503,'Chat service unavailable');
  }
  return NextResponse.json({token:token(secret,{user_id:auth.uid}),apiKey,user},{headers:safeHeaders});
 }catch(error){
  console.error('Chat token endpoint failed',error instanceof Error?error.message:'unknown');
  return errorResponse(503,'Chat service unavailable');
 }
}
