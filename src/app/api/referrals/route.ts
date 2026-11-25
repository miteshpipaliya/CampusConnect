import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {guard,parsedInput} from '@/lib/server/guard';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {readLimit} from '@/lib/server/read-limit';
import {ensureReferralCode,settleReferral} from '@/lib/server/referrals';
import {referralDashboard} from '@/lib/server/referral-views';
const schema=z.discriminatedUnion('action',[z.object({action:z.literal('bootstrap')}).strict(),z.object({action:z.literal('apply'),code:z.string().trim().min(1).max(64)}).strict(),z.object({action:z.literal('skip')}).strict()]);
export const runtime='nodejs';
export async function GET(req:NextRequest){const user=await session(req);if(!user)return errorResponse(401,'Sign in required');const limited=await readLimit(user.uid,'referrals',40);if(limited)return limited;const page=Math.min(500,Math.max(0,Number.parseInt(req.nextUrl.searchParams.get('page')||'0',10)||0));try{const origin=process.env.NODE_ENV==='production'?'https://campusconnectbvm.online':req.nextUrl.origin;return NextResponse.json(await referralDashboard(user.uid,origin,page),{headers:safeHeaders})}catch{return errorResponse(503,'Referral information unavailable')}}
export async function POST(req:NextRequest){const g=await guard(req,{write:true,schema,rateLimit:{key:'referrals:{uid}',limit:30,windowSec:3600},ipRateLimit:{limit:300,windowSec:3600}});if(!g.ok)return g.response;const input=parsedInput<z.infer<typeof schema>>(g);try{
 if(input.action==='bootstrap')await ensureReferralCode(g.user.uid);
 const status=await settleReferral(g.user.uid,input.action,input.action==='apply'?input.code:undefined);
 if(status==='invalid')return errorResponse(400,'Invalid referral code. Please check the code and try again.');
 if(status==='retry')return errorResponse(409,'Referral changed. Please retry.');
 return NextResponse.json({status},{headers:safeHeaders});
 }catch{console.error('Referral request failed');return errorResponse(503,'Referral service unavailable. Please retry.')}}
