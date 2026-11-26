import {NextRequest,NextResponse} from 'next/server';
import {createHash} from 'node:crypto';
import {sameOrigin,safeHeaders,errorResponse} from '@/lib/server/session';
import {clientIp} from '@/lib/server/auth-throttle';
import {checkRateLimit} from '@/lib/server/rate-limit';
import {introSecret,introCompleted,INTRO_COOKIE} from '@/lib/server/introduction';
import {newIntroProof,finishIntroProof} from '@/lib/core/introduction-proof';
export const runtime='nodejs';
const reply=(completed:boolean)=>NextResponse.json({completed},{headers:safeHeaders});
const setCookie=(r:NextResponse,token:string,done:boolean)=>r.cookies.set(INTRO_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:done?30*86400:1800});
export async function GET(req:NextRequest){return reply(introCompleted(req.cookies.get(INTRO_COOKIE)?.value))}
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return errorResponse(403,'Untrusted request origin');
 if(!req.headers.get('content-type')?.includes('application/json'))return errorResponse(400,'Invalid request');
 let action:unknown;try{const text=await req.text();if(text.length>128)return errorResponse(400,'Invalid request');action=JSON.parse(text).action}catch{return errorResponse(400,'Invalid request')}
 if(action!=='start'&&action!=='finish')return errorResponse(400,'Invalid introduction action');
 try{
 const cookie=req.cookies.get(INTRO_COOKIE)?.value;
 if(introCompleted(cookie))return reply(true);
 const key=introSecret();
 const limited=await checkRateLimit({key:'intro:'+action+':'+createHash('sha256').update(clientIp(req)).digest('hex'),limit:action==='start'?30:60,windowSec:3600,failClosed:true});
 if(!limited.allowed)return errorResponse(429,'Introduction service temporarily busy. Please try again.');
 if(action==='start'){const r=reply(false);setCookie(r,newIntroProof(key),false);return r}
 const completed=finishIntroProof(cookie,key);if(!completed)return errorResponse(409,'Introduction not yet completed. Please retry.');
 const r=reply(true);setCookie(r,completed,true);return r
 }catch{return errorResponse(503,'Introduction service unavailable. Please retry.')}
}
