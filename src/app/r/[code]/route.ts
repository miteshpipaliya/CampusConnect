import {NextRequest,NextResponse} from 'next/server';
import {createHash} from 'node:crypto';
import {normalizeCode,signAttribution,REFERRAL_COOKIE,LINK_TTL,readAttribution} from '@/lib/core/referral-policy';
import {activeOwner,referralSecret} from '@/lib/server/referrals';
import {checkRateLimit} from '@/lib/server/rate-limit';
import {clientIp} from '@/lib/server/auth-throttle';
export const runtime='nodejs';
export async function GET(req:NextRequest,{params}:{params:Promise<{code:string}>}){
 const response=NextResponse.redirect(new URL('/login',req.url));response.headers.set('Cache-Control','private, no-store');
 try{const code=normalizeCode((await params).code);if(!code)return response;const limit=await checkRateLimit({key:'referral-link:'+createHash('sha256').update(clientIp(req)).digest('hex'),limit:60,windowSec:3600,failClosed:true});if(!limit.allowed)return response;
 const key=referralSecret();const prior=readAttribution(req.cookies.get(REFERRAL_COOKIE)?.value,key);if(prior&&await activeOwner(prior.code))return response;
 if(!await activeOwner(code))return response;
 response.cookies.set(REFERRAL_COOKIE,signAttribution(code,key),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:LINK_TTL/1000});
 }catch{console.error('Referral link resolution unavailable')}
 return response;
}
