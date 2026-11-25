import {readLimit} from '@/lib/server/read-limit';
import {NextRequest,NextResponse} from 'next/server';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {explorePage} from '@/lib/server/explore-service';
export const runtime='nodejs';
export async function GET(req:NextRequest){
 const user=await session(req);if(!user)return errorResponse(401,'Sign in required');
 const limited=await readLimit(user.uid,'explore',60);if(limited)return limited;
 try{return NextResponse.json(await explorePage(user.uid,{cursor:req.nextUrl.searchParams.get('cursor'),limit:req.nextUrl.searchParams.get('limit')}),{headers:safeHeaders})}
 catch(e){return errorResponse(e instanceof Error&&e.message==='INVALID_CURSOR'?400:503,'Explore unavailable')}
}
