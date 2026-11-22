import 'server-only';
import {createHash} from 'node:crypto';
import {createTtlCache} from '../core/session-cache';
const cache=createTtlCache<{uid:string;email:string|undefined;admin:boolean}>({ttlMs:60000,max:500});
import { NextRequest, NextResponse } from 'next/server';
import { auth } from './services';

export const safeHeaders={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
export const errorResponse=(status:number,message:string)=>NextResponse.json({error:message},{status,headers:safeHeaders});
export function sameOrigin(request:NextRequest){
 const origin=request.headers.get('origin');
 return Boolean(origin&&origin===request.nextUrl.origin);
}
export async function session(request:NextRequest){
 const cookie=request.cookies.get('cc_session')?.value;
 if(!cookie)return null;
 const key=createHash('sha256').update(cookie).digest('hex');
 const cached=cache.get(key);if(cached)return cached;
 try{
  const verified=await auth().verifySessionCookie(cookie,true);
  const record=await auth().getUser(verified.uid);
  const profile=await (await import('./services')).db().collection('users').doc(record.uid).get();
  if(!profile.exists||profile.data()?.deletedAt)return null;
  const result=record.emailVerified&&!record.disabled&&(record.email?.toLowerCase().endsWith('@bvmengineering.ac.in')||(process.env.APPROVED_TEST_EMAILS||'').split(',').map(email=>email.trim().toLowerCase()).filter(Boolean).includes(record.email?.toLowerCase()||''))?{uid:record.uid,email:record.email,admin:verified.admin===true}:null;
  if(result)cache.set(key,result);
  return result;
 }catch{return null}
}
export function setSession(response:NextResponse,value:string){
 response.cookies.set('cc_session',value,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',maxAge:60*60*24*5,path:'/'});
}
export function clearSession(response:NextResponse){
 response.cookies.set('cc_session','',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',expires:new Date(0),path:'/'});
}
