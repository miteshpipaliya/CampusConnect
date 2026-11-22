import {NextRequest,NextResponse} from 'next/server';
import {auth} from '@/lib/server/services';
import {guard} from '@/lib/server/guard';
import {clearSession,errorResponse,safeHeaders} from '@/lib/server/session';
export const runtime='nodejs';
export async function POST(req:NextRequest){
 const checked=await guard(req,{write:true,rateLimit:{key:'sessions:{uid}',limit:5,windowSec:3600}});
 if(!checked.ok)return checked.response;
 try{
  await auth().revokeRefreshTokens(checked.user.uid);
  const response=NextResponse.json({ok:true},{headers:safeHeaders});
  clearSession(response);return response;
 }catch{return errorResponse(503,'Unable to revoke sessions')}
}
