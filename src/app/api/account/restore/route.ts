import {NextRequest,NextResponse} from 'next/server';
import {db,auth} from '@/lib/server/services';
import {sameOrigin,sessionRevoked,errorResponse,safeHeaders} from '@/lib/server/session';
import {checkRateLimit} from '@/lib/server/rate-limit';
import {deletionDue} from '@/lib/core/phase2-rules';
export const runtime='nodejs';
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,'Untrusted request origin');
 const cookie=request.cookies.get('cc_session')?.value;if(!cookie)return errorResponse(401,'Sign in required');
 try{
  const verified=await auth().verifySessionCookie(cookie,true);
  if(await sessionRevoked(cookie))return errorResponse(401,'Sign in required');
  const limit=await checkRateLimit({key:'restore:'+verified.uid,limit:5,windowSec:3600,failClosed:true});if(!limit.allowed)return NextResponse.json({error:'Too many requests'},{status:429,headers:{...safeHeaders,'Retry-After':String(limit.retryAfterSec)}});
  const identity=await auth().getUser(verified.uid);
  if(identity.disabled||!identity.emailVerified)return errorResponse(403,'Identity unavailable');
  const store=db(),ref=store.collection('users').doc(verified.uid);
  const result=await store.runTransaction(async tx=>{
   const profile=await tx.get(ref),deleted=profile.data()?.deletedAt;
   if(!profile.exists||!deleted||typeof deleted.toMillis!=='function')return 'NOT_DELETED';
   if(deletionDue(deleted.toMillis(),Date.now()))return 'EXPIRED';
   tx.update(ref,{deletedAt:null,deletionRequestedAt:null});return 'RESTORED';
  });
  if(result==='EXPIRED')return errorResponse(410,'Restoration window expired');
  if(result==='NOT_DELETED')return errorResponse(409,'Account is not pending deletion');
  return NextResponse.json({ok:true,restored:true},{headers:safeHeaders});
 }catch{return errorResponse(503,'Restoration unavailable')}
}
