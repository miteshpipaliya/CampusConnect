import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { auth,db,identityKey } from '@/lib/server/services';
import { checkStudentEmail, relationshipStatuses, relationshipVisibilities } from '@/lib/student-email';
import { session, setSession, clearSession, sameOrigin, errorResponse, safeHeaders } from '@/lib/server/session';

export const runtime='nodejs';
const creds=z.object({email:z.string().email().max(254),password:z.string().min(12).max(128)});
const signup=creds.extend({handle:z.string().regex(/^[a-z][a-z0-9._]{2,29}$/),name:z.string().trim().min(2).max(70),branch:z.string().trim().min(2).max(70),division:z.string().trim().min(1).max(20),relationshipStatus:z.enum(relationshipStatuses),relationshipVisibility:z.enum(relationshipVisibilities),acceptTerms:z.literal(true),acknowledgePrivacy:z.literal(true)});
async function firebaseIdentity(action:string,body:object){
 const url='https://identitytoolkit.googleapis.com/v1/accounts:'+action+'?key='+encodeURIComponent(identityKey());
 const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
 const result=await r.json() as {idToken?:string;localId?:string};
 if(!r.ok)throw Error('IDENTITY_FAILED');
 return result;
}
export async function GET(request:NextRequest){
 const user=await session(request);if(!user)return errorResponse(401,'Sign in required');
 try{
  const doc=await db().collection('users').doc(user.uid).get();
  return NextResponse.json({user:{uid:user.uid,email:user.email,profile:doc.exists?doc.data():null}},{headers:safeHeaders});
 }catch{return errorResponse(503,'Account service unavailable')}
}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,'Untrusted request origin');
 try{
  if(!request.headers.get('content-type')?.includes('application/json')||Number(request.headers.get('content-length')||0)>8192)return errorResponse(400,'Invalid request');
  const raw:unknown=await request.json();
  const action=(raw as {action?:string})?.action;
  if(action==='logout'){
   const res=NextResponse.json({ok:true},{headers:safeHeaders});clearSession(res);return res;
  }
  if(action==='register'){
   const parsed=signup.safeParse(raw);
   if(!parsed.success)return errorResponse(400,'Invalid registration details; password must have 12+ characters');
   const {email,password,handle,name,branch,division,relationshipStatus,relationshipVisibility}=parsed.data;
   const institutional=checkStudentEmail(email,branch);
   if(!institutional.ok)return errorResponse(400,institutional.reason);
   const result=await firebaseIdentity('signUp',{email:institutional.normalized,password,returnSecureToken:true});
   if(!result.localId||!result.idToken)throw Error('IDENTITY_FAILED');
   const userId=result.localId;
   try{
    await db().runTransaction(async t=>{
     const handleRef=db().collection('handles').doc(handle);
     if((await t.get(handleRef)).exists)throw Error('HANDLE_TAKEN');
     t.create(handleRef,{uid:userId});
     t.create(db().collection('users').doc(userId),{
      uid:userId,handle,name,branch,division,branchKey:branch.toLowerCase(),divisionKey:division.toLowerCase(),
      privacy:'campus',bio:'',relationshipStatus,relationshipVisibility,
      emailYear:institutional.year,emailBranchCode:institutional.code,
      verifiedInstitutionalEmail:false,createdAt:FieldValue.serverTimestamp()
     });
    });
   }catch(e){await auth().deleteUser(userId).catch(()=>{});if(e instanceof Error&&e.message==='HANDLE_TAKEN')return errorResponse(409,'Username already in use');throw e}
   await firebaseIdentity('sendOobCode',{requestType:'VERIFY_EMAIL',idToken:result.idToken}).catch(()=>{});
   return NextResponse.json({ok:true,message:'Check your email and verify your account before signing in.'},{headers:safeHeaders});
  }
  if(action==='login'){
   const parsed=creds.extend({password:z.string().min(1).max(128)}).safeParse(raw);
   if(!parsed.success)return errorResponse(400,'Invalid sign-in details');
   const loginEmail=parsed.data.email.trim().toLowerCase();
   if(!loginEmail.endsWith('@bvmengineering.ac.in'))return errorResponse(401,'Invalid credentials');
   const login=await firebaseIdentity('signInWithPassword',{...parsed.data,email:loginEmail,returnSecureToken:true});
   if(!login.idToken)return errorResponse(401,'Invalid credentials');
   const verified=await auth().verifyIdToken(login.idToken);
   const record=await auth().getUser(verified.uid);
   if(!record.emailVerified)return errorResponse(403,'Verify your email before signing in');
   if(record.disabled)return errorResponse(403,'Account disabled');
   const profile=await db().collection('users').doc(record.uid).get();
   if(!profile.exists||!profile.data()?.relationshipStatus)return errorResponse(403,'Complete campus onboarding before signing in');
   const college=checkStudentEmail(record.email||'',profile.data()?.branch||'');
   if(!college.ok)return errorResponse(403,'Institutional email verification required');
   const cookie=await auth().createSessionCookie(login.idToken,{expiresIn:5*24*60*60*1000});
   const response=NextResponse.json({ok:true},{headers:safeHeaders});setSession(response,cookie);return response;
  }
  return errorResponse(400,'Unsupported action');
 }catch{return errorResponse(503,'Authentication unavailable or credentials invalid')}
}
