import 'server-only';
import {createHash} from 'node:crypto';
import {clientIp} from './auth-throttle';
import {NextRequest,NextResponse} from 'next/server';
import type {ZodType} from 'zod';
import {session,sameOrigin,errorResponse,safeHeaders} from './session';
import {checkRateLimit} from './rate-limit';
import {userRateKey,ipRateKey} from '../core/rate-key';
export type GuardOptions={write?:boolean;schema?:ZodType;invalidMessage?:string;rateLimit?:{key:string;limit:number;windowSec:number};admin?:boolean;ipRateLimit?:{limit:number;windowSec:number}};
type AuthUser=NonNullable<Awaited<ReturnType<typeof session>>>;
export async function guard(request:NextRequest,opts:GuardOptions={}):Promise<{ok:true;user:AuthUser;input:unknown;ip:string}|{ok:false;response:NextResponse}>{
 if(opts.write&&!sameOrigin(request))return {ok:false,response:errorResponse(403,'Untrusted request origin')};
 const user=await session(request);
 if(!user)return {ok:false,response:errorResponse(401,'Sign in required')};
 if(opts.admin&&!user.admin)return {ok:false,response:errorResponse(403,'Administrator access required')};
 let input:unknown=null;
 if(opts.schema){
  try{const reader=request.body?.getReader();if(!reader)throw Error('Missing body');const chunks:Uint8Array[]=[];let size=0;try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1048576){await reader.cancel();throw Error('Body too large')}chunks.push(value)}}finally{reader.releaseLock()}const body:unknown=JSON.parse(Buffer.concat(chunks).toString('utf8'));const parsed=opts.schema.safeParse(body);if(!parsed.success)return {ok:false,response:errorResponse(400,opts.invalidMessage??'Invalid request')};input=parsed.data}
  catch{return {ok:false,response:errorResponse(400,opts.invalidMessage??'Invalid request')}}
 }
 const ip=createHash('sha256').update(clientIp(request)).digest('hex');
 if(opts.rateLimit){
  const {key,limit,windowSec}=opts.rateLimit;
  const result=await checkRateLimit({key:userRateKey(key,user.uid),limit,windowSec,failClosed:true});
  if(!result.allowed)return {ok:false,response:NextResponse.json({error:'Too many requests'},{status:429,headers:{...safeHeaders,'Retry-After':String(result.retryAfterSec)}})};
 }
 if(opts.ipRateLimit){const route=opts.rateLimit?.key??request.nextUrl.pathname;const result=await checkRateLimit({key:ipRateKey(route,ip),...opts.ipRateLimit,failClosed:true});if(!result.allowed)return {ok:false,response:NextResponse.json({error:'Too many requests'},{status:429,headers:{...safeHeaders,'Retry-After':String(result.retryAfterSec)}})}}
 return {ok:true,user,input,ip};
}

export function parsedInput<T>(checked:{input:unknown}):T{return checked.input as T}
