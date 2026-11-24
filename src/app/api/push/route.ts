import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {guard} from '@/lib/server/guard';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {pushConfig} from '@/lib/server/push-config';
import {PUSH_COOKIE,registerPush,registeredPush,revokePush} from '@/lib/server/push-delivery';
import {PUSH_MAX_AGE_MS} from '@/lib/core/push-policy';
export const runtime='nodejs';
const schema=z.discriminatedUnion('action',[z.object({action:z.literal('register'),token:z.string().min(21).max(4096)}).strict(),z.object({action:z.literal('disable')}).strict()]);
export async function GET(req:NextRequest){const user=await session(req);if(!user)return errorResponse(401,'Sign in required');const config=pushConfig();try{return NextResponse.json({enabled:Boolean(config),registered:config?await registeredPush(user.uid,req.cookies.get(PUSH_COOKIE)?.value):false,config},{headers:safeHeaders})}catch{return errorResponse(503,'Push configuration unavailable')}}
export async function POST(req:NextRequest){const g=await guard(req,{write:true,schema,rateLimit:{key:'push-register:{uid}',limit:30,windowSec:3600}});if(!g.ok)return g.response;const input=schema.parse(g.input),old=req.cookies.get(PUSH_COOKIE)?.value;try{if(input.action==='disable'){await revokePush(g.user.uid,old);const r=NextResponse.json({ok:true},{headers:safeHeaders});r.cookies.delete(PUSH_COOKIE);return r}if(!pushConfig())return errorResponse(503,'Push is not configured');const id=await registerPush(g.user.uid,input.token);if(old&&old!==id)await revokePush(g.user.uid,old);const r=NextResponse.json({ok:true},{headers:safeHeaders});r.cookies.set(PUSH_COOKIE,id,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:PUSH_MAX_AGE_MS/1000});return r}catch{return errorResponse(503,'Unable to update push subscription')}}
