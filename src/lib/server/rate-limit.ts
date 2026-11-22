import 'server-only';
import { Timestamp } from 'firebase-admin/firestore';
import { db } from './services';
import {windowStart,retryAfterSec} from '../core/rate-window';
export const RATE_LIMITS={likes:{limit:30,windowSec:60},comments:{limit:10,windowSec:60},posts:{limit:10,windowSec:3600},reposts:{limit:30,windowSec:60},stories:{limit:10,windowSec:3600},avatar:{limit:10,windowSec:3600},media:{limit:30,windowSec:60}} as const;
export async function checkRateLimit({key,limit,windowSec}:{key:string;limit:number;windowSec:number}):Promise<{allowed:boolean;retryAfterSec:number}>{
 const now=Date.now(),start=windowStart(now,windowSec),retry=retryAfterSec(now,windowSec);
 try{
  const ref=db().collection('rateLimits').doc(key+':'+start);
  const allowed=await db().runTransaction(async tx=>{
   const snapshot=await tx.get(ref);
   const count=Number(snapshot.data()?.count??0);
   if(count>=limit)return false;
   tx.set(ref,{count:count+1,expiresAt:Timestamp.fromMillis(start+windowSec*1000)},{merge:true});
   return true;
  });
  return {allowed,retryAfterSec:retry};
 }catch(error){console.error('Rate limit backend unavailable',error instanceof Error?error.name:'unknown');return {allowed:true,retryAfterSec:0}}
}
