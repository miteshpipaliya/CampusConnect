import 'server-only';
import {createHash} from 'node:crypto';
import {Timestamp} from 'firebase-admin/firestore';
import {NextRequest,NextResponse} from 'next/server';
import {auth,db} from './services';
import {pendingRules} from '../core/rules-onboarding';
import {isRevoked} from '../core/session-denylist';
import {isAllowedEmail} from '../student-email';
export const safeHeaders={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
export const errorResponse=(status:number,message:string)=>NextResponse.json({error:message},{status,headers:safeHeaders});
export function sameOrigin(request:NextRequest){const origin=request.headers.get('origin');return Boolean(origin&&origin===request.nextUrl.origin)}
const digest=(cookie:string)=>createHash('sha256').update(cookie).digest('hex');
export async function sessionRevoked(cookie:string){const doc=await db().collection('revokedSessions').doc(digest(cookie)).get();return isRevoked(doc.exists,doc.data()?.expiresAt?.toMillis?.(),Date.now())}
export async function revokeSession(cookie:string){
 // The five-day upper bound covers every session cookie this application issues.
 await db().collection('revokedSessions').doc(digest(cookie)).set({expiresAt:Timestamp.fromMillis(Date.now()+5*86400000)});
}
export async function session(request:NextRequest){
 const cookie=request.cookies.get('cc_session')?.value;if(!cookie)return null;
 try{
  const verified=await auth().verifySessionCookie(cookie,true);
  // One-time release cutoff: existing signed Firebase sessions must reauthenticate.
  if(verified.auth_time<Math.floor(Date.parse('2026-11-25T20:48:00Z')/1000))return null;
  if(!verified.email_verified||!verified.email||!isAllowedEmail(verified.email,process.env.APPROVED_TEST_EMAILS))return null;
  const [profile,revoked]=await Promise.all([db().collection('users').doc(verified.uid).get(),sessionRevoked(cookie)]);
  if(revoked||!profile.exists||profile.data()?.deletedAt||profile.data()?.suspendedAt)return null;
  // Pending students may load their own real read-only feed, but cannot use normal
  // mutation endpoints or obtain new chat tokens until server completion.
  const path=request.nextUrl.pathname;
  if(pendingRules(profile.data())&&!['GET','HEAD'].includes(request.method)&&!['/api/auth','/api/rules-onboarding'].includes(path))return null;
  if(pendingRules(profile.data())&&path==='/api/chat/token')return null;
  return {uid:verified.uid,email:verified.email,admin:verified.admin===true};
 }catch{return null}
}
export function setSession(response:NextResponse,value:string){response.cookies.set('cc_session',value,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',maxAge:60*60*24*5,path:'/'})}
export function clearSession(response:NextResponse){response.cookies.set('cc_session','',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',expires:new Date(0),path:'/'})}
