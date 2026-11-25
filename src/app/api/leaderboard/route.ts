import {NextRequest,NextResponse} from 'next/server';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {readLimit} from '@/lib/server/read-limit';
import {referralLeaderboard} from '@/lib/server/referral-views';
export const runtime='nodejs';
export async function GET(req:NextRequest){const user=await session(req);if(!user)return errorResponse(401,'Sign in required');const limited=await readLimit(user.uid,'leaderboard',40);if(limited)return limited;const page=Math.min(500,Math.max(0,Number.parseInt(req.nextUrl.searchParams.get('page')||'0',10)||0));const id=req.nextUrl.searchParams.get('competition')||undefined;if(id&&!/^[A-Za-z0-9_-]{1,80}$/.test(id))return errorResponse(400,'Invalid competition');try{return NextResponse.json({...await referralLeaderboard(user.uid,page,id),admin:user.admin},{headers:safeHeaders})}catch{return errorResponse(503,'Leaderboard unavailable')}}
