import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, randomInt, createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { auth, db, identityKey } from '@/lib/server/services';
import { proposedCodes, relationshipStatuses, relationshipVisibilities } from '@/lib/student-email';
import { session, setSession, clearSession, sameOrigin, errorResponse, safeHeaders } from '@/lib/server/session';

export const runtime='nodejs';
const emailSchema=z.string().trim().toLowerCase().email().max(254);
const emailPattern=/^(\d{2})(cp|el|ec|it|me|cl|ee|pr)(\d{3,8})@bvmengineering\.ac\.in$/;
const profileSchema=z.object({name:z.string().trim().min(2).max(70),handle:z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9._]{2,29}$/),relationshipStatus:z.enum(relationshipStatuses),relationshipVisibility:z.enum(relationshipVisibilities),acceptTerms:z.literal(true),acknowledgePrivacy:z.literal(true)});
const secret=()=>{const s=process.env.OTP_SIGNING_SECRET;if(!s||s.length<32)throw Error('OTP signing secret missing');return s};
const digest=(s:string)=>createHmac('sha256',secret()).update(s).digest('hex');
const otpCookie='cc_otp';
const challengeRef=(email:string)=>db().collection('emailOtpChallenges').doc(digest(email));
const cookieOptions={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/',maxAge:600};
const branchFor=(code:keyof typeof proposedCodes)=>code==='it'?'Information Technology':proposedCodes[code]+' Engineering';
async function signIn(uid:string,response:NextResponse){
 const token=await auth().createCustomToken(uid);
 const r=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key='+encodeURIComponent(identityKey()),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,returnSecureToken:true}),cache:'no-store'});
 const result=await r.json() as {idToken?:string};
 if(!r.ok||!result.idToken)throw Error('Unable to establish Firebase session');
 const cookie=await auth().createSessionCookie(result.idToken,{expiresIn:5*24*60*60*1000});
 setSession(response,cookie);
}
export async function GET(request:NextRequest){
 const user=await session(request);if(!user)return errorResponse(401,'Sign in required');
 try{const doc=await db().collection('users').doc(user.uid).get();return NextResponse.json({user:{uid:user.uid,email:user.email,profile:doc.exists?doc.data():null}},{headers:safeHeaders})}
 catch{return errorResponse(503,'Account service unavailable')}
}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,'Untrusted request origin');
 if(!request.headers.get('content-type')?.includes('application/json')||Number(request.headers.get('content-length')||0)>8192)return errorResponse(400,'Invalid request');
 let raw:unknown;try{raw=await request.json()}catch{return errorResponse(400,'Invalid JSON')}
 const action=(raw as {action?:string})?.action;
 if(action==='logout'){const r=NextResponse.json({ok:true},{headers:safeHeaders});clearSession(r);r.cookies.delete(otpCookie);return r}
 if(action==='requestOtp'){
  const parsed=emailSchema.safeParse((raw as {email?:unknown}).email);
  if(!parsed.success||!emailPattern.test(parsed.data))return errorResponse(400,'Enter your valid BVM institutional email');
  const email=parsed.data;
  try{
   const apiKey=process.env.RESEND_API_KEY, sender=process.env.RESEND_FROM_EMAIL;
   if(!apiKey||!sender)return errorResponse(503,'Email verification is not configured yet');
   const ref=challengeRef(email),now=Date.now(),code=String(randomInt(0,1000000)).padStart(6,'0'),nonce=randomBytes(20).toString('hex');
   await db().runTransaction(async tx=>{
    const old=await tx.get(ref),data=old.data();
    if(data&&typeof data.lastSent==='number'&&now-data.lastSent<60000)throw Error('COOLDOWN');
    if(data&&typeof data.windowStart==='number'&&now-data.windowStart<3600000&&data.sends>=5)throw Error('LIMIT');
    tx.set(ref,{email,codeHash:digest(email+':'+nonce+':'+code),nonce,expires:now+600000,lastSent:now,windowStart:data&&now-data.windowStart<3600000?data.windowStart:now,sends:data&&now-data.windowStart<3600000?data.sends+1:1,attempts:0,verified:false,used:false});
   });
   const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+apiKey},body:JSON.stringify({from:'CampusConnect <'+sender+'>',to:[email],subject:'Your CampusConnect verification code',text:'Your CampusConnect verification code is '+code+'. It expires in 10 minutes. Do not share it.'}),cache:'no-store'});
   if(!r.ok){await ref.delete();return errorResponse(502,'Email delivery failed. Check Resend domain verification and email logs')}
   return NextResponse.json({ok:true,message:'A six-digit code was sent to your BVM email.'},{headers:safeHeaders});
  }catch(e){if(e instanceof Error&&e.message==='COOLDOWN')return errorResponse(429,'Wait 60 seconds before requesting another code');if(e instanceof Error&&e.message==='LIMIT')return errorResponse(429,'Too many codes requested. Try again in one hour');return errorResponse(503,'Unable to send verification code')}
 }
 if(action==='verifyOtp'){
  const parsed=z.object({email:emailSchema,code:z.string().regex(/^\d{6}$/)}).safeParse(raw);
  if(!parsed.success)return errorResponse(400,'Enter your six-digit code');
  try{
   const email=parsed.data.email,ref=challengeRef(email),now=Date.now();
   const nonce=await db().runTransaction(async tx=>{
    const doc=await tx.get(ref),data=doc.data();
    if(!data||data.used||data.verified||data.expires<now||data.attempts>=5)throw Error('INVALID');
    const expected=Buffer.from(data.codeHash,'hex'),actual=Buffer.from(digest(email+':'+data.nonce+':'+parsed.data.code),'hex');
    if(expected.length!==actual.length||!timingSafeEqual(expected,actual)){tx.update(ref,{attempts:FieldValue.increment(1)});return null}
    tx.update(ref,{verified:true,codeHash:FieldValue.delete()});return data.nonce as string;
   });
   if(!nonce)return errorResponse(400,'Incorrect code. Please try again');
   const proof=randomBytes(32).toString('hex');
   await ref.update({proofHash:digest(proof),proofExpires:now+600000});
   const existing=await auth().getUserByEmail(email).catch(e=>{if((e as {code?:string}).code==='auth/user-not-found')return null;throw e});
   const profile=existing?await db().collection('users').doc(existing.uid).get():null;
   const needsProfile=!existing||!profile?.exists;
   const response=NextResponse.json({ok:true,needsProfile,email},{headers:safeHeaders});
   response.cookies.set(otpCookie,proof,cookieOptions);
   return response;
  }catch{return errorResponse(400,'Code expired or verification failed. Request a new code')}
 }
 if(action==='finishOtp'){
  const parsed=z.object({email:emailSchema,profile:profileSchema.optional()}).safeParse(raw);
  if(!parsed.success)return errorResponse(400,'Please complete all required details');
  const email=parsed.data.email,proof=request.cookies.get(otpCookie)?.value;
  if(!proof||!emailPattern.test(email))return errorResponse(403,'Verify your college email first');
  try{
   const ref=challengeRef(email),challenge=await ref.get(),data=challenge.data();
   if(!data||!data.verified||data.used||data.proofExpires<Date.now()||data.proofHash!==digest(proof))return errorResponse(403,'Verification expired. Request a new code');
   let user=await auth().getUserByEmail(email).catch(e=>{if((e as {code?:string}).code==='auth/user-not-found')return null;throw e});
   const existingProfile=user?await db().collection('users').doc(user.uid).get():null;
   if(!existingProfile?.exists){
    if(!parsed.data.profile)return errorResponse(400,'Complete your profile first');
    const p=parsed.data.profile,parts=emailPattern.exec(email)!;
    const branch=branchFor(parts[2] as keyof typeof proposedCodes);
    if(!user)user=await auth().createUser({email,emailVerified:true,disabled:false});
    else await auth().updateUser(user.uid,{emailVerified:true});
    try{
     await db().runTransaction(async tx=>{
      const handle=db().collection('handles').doc(p.handle),profile=db().collection('users').doc(user!.uid);
      if((await tx.get(handle)).exists)throw Error('HANDLE_TAKEN');
      if((await tx.get(profile)).exists)throw Error('PROFILE_EXISTS');
      tx.create(handle,{uid:user!.uid});
      tx.create(profile,{uid:user!.uid,email,handle:p.handle,name:p.name,degree:'BTech',enrollmentNumber:`${parts[1]!}${parts[2]!}${parts[3]!}`,branch,division:'',branchKey:branch.toLowerCase(),divisionKey:'',privacy:'campus',bio:'',relationshipStatus:p.relationshipStatus,relationshipVisibility:p.relationshipVisibility,emailYear:2000+Number(parts[1]),emailBranchCode:parts[2],verifiedInstitutionalEmail:true,createdAt:FieldValue.serverTimestamp()});
     });
    }catch(e){if(e instanceof Error&&e.message==='HANDLE_TAKEN')return errorResponse(409,'Username already taken. Choose another');if(e instanceof Error&&e.message==='PROFILE_EXISTS')return errorResponse(409,'Account already exists. Sign in');throw e}
   }else if(user&&!user.emailVerified)await auth().updateUser(user.uid,{emailVerified:true});
   if(!user)throw Error('User creation failed');
   const response=NextResponse.json({ok:true},{headers:safeHeaders});
   await signIn(user.uid,response);
   await ref.update({used:true,proofHash:FieldValue.delete()});
   response.cookies.delete(otpCookie);
   return response;
  }catch{return errorResponse(503,'Unable to complete sign-in. Please retry')}
 }
 return errorResponse(400,'Unsupported action');
}
