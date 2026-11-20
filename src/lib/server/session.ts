import 'server-only';
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
 try{
  const verified=await auth().verifySessionCookie(cookie,true);
  const record=await auth().getUser(verified.uid);
  return record.emailVerified&&!record.disabled&&record.email?.toLowerCase().endsWith('@bvmengineering.ac.in')?{uid:record.uid,email:record.email}:null;
 }catch{return null}
}
export function setSession(response:NextResponse,value:string){
 response.cookies.set('cc_session',value,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',maxAge:60*60*24*5,path:'/'});
}
export function clearSession(response:NextResponse){
 response.cookies.set('cc_session','',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',expires:new Date(0),path:'/'});
}
