import {NextRequest,NextResponse} from 'next/server';
import {createHmac} from 'node:crypto';
import {syncStreamUser} from '@/lib/server/stream-user';
import {guard} from '@/lib/server/guard';
import {errorResponse,safeHeaders} from '@/lib/server/session';
export const runtime='nodejs';
export async function POST(request:NextRequest){
 if(process.env.STREAM_CLIENT_TOKENS_ENABLED!=='true')return errorResponse(403,'Direct Stream client tokens are disabled');
 const checked=await guard(request,{write:true,rateLimit:{key:'stream-client-token:{uid}',limit:30,windowSec:3600}});
 if(!checked.ok)return checked.response;
 const apiKey=process.env.STREAM_API_KEY?.trim(),secret=process.env.STREAM_API_SECRET?.trim();
 if(!apiKey||!secret)return errorResponse(503,'Chat configuration unavailable');
 try{
  const {synced,user}=await syncStreamUser(checked.user.uid);
  if(!synced)return errorResponse(503,'Unable to synchronize Stream profile');
  const issued=Math.floor(Date.now()/1000),expires=issued+3600;
  // stream-chat v10.2.0 is the browser SDK and has no server createToken API.
  // Keep the signed Stream HS256 claims compatible without adding an unreviewed SDK.
  const encode=(value:object)=>Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned=encode({alg:'HS256',typ:'JWT'})+'.'+encode({user_id:checked.user.uid,iat:issued,exp:expires});
  const token=unsigned+'.'+createHmac('sha256',secret).update(unsigned).digest('base64url');
  return NextResponse.json({token,apiKey,user,expiresAt:expires},{headers:safeHeaders});
 }catch(error){
  console.error('Chat token endpoint failed',error instanceof Error?error.message:'unknown');
  return errorResponse(503,'Chat service unavailable');
 }
}
