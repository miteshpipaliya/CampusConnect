import 'server-only';
import {NextRequest,NextResponse} from 'next/server';
import type {ZodType} from 'zod';
import {session,sameOrigin,errorResponse,safeHeaders} from './session';
import {checkRateLimit} from './rate-limit';
export type GuardOptions={write?:boolean;schema?:ZodType;invalidMessage?:string;rateLimit?:{key:string;limit:number;windowSec:number};admin?:boolean};
type AuthUser=NonNullable<Awaited<ReturnType<typeof session>>>;
export async function guard(request:NextRequest,opts:GuardOptions={}):Promise<{ok:true;user:AuthUser;input:unknown;ip:string}|{ok:false;response:NextResponse}>{
 if(opts.write&&!sameOrigin(request))return {ok:false,response:errorResponse(403,'Untrusted request origin')};
 const user=await session(request);
 if(!user)return {ok:false,response:errorResponse(401,'Sign in required')};
 if(opts.admin)return {ok:false,response:errorResponse(403,'Administrator access required')};
 let input:unknown=null;
 if(opts.schema){
  try{const body:unknown=await request.json();const parsed=opts.schema.safeParse(body);if(!parsed.success)return {ok:false,response:errorResponse(400,opts.invalidMessage??'Invalid request')};input=parsed.data}
  catch{return {ok:false,response:errorResponse(400,opts.invalidMessage??'Invalid request')}}
 }
 const ip=(request.headers.get('x-forwarded-for')?.split(',')[0]??'unknown').trim().replace(/[^a-zA-Z0-9.:_-]/g,'').slice(0,64)||'unknown';
 if(opts.rateLimit){
  const {key,limit,windowSec}=opts.rateLimit;
  const result=await checkRateLimit({key:key.replace('{uid}',user.uid).replace('{ip}',ip),limit,windowSec});
  if(!result.allowed)return {ok:false,response:NextResponse.json({error:'Too many requests'},{status:429,headers:{...safeHeaders,'Retry-After':String(result.retryAfterSec)}})};
 }
 return {ok:true,user,input,ip};
}
