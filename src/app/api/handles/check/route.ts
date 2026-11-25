import {readLimit} from '@/lib/server/read-limit';
import {NextRequest,NextResponse} from 'next/server';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {db} from '@/lib/server/services';
export const runtime='nodejs';
export async function GET(request:NextRequest){
 const user=await session(request);if(!user)return errorResponse(401,'Sign in required');
 const limited=await readLimit(user.uid,'handles/check',30);if(limited)return limited;
 const handle=request.nextUrl.searchParams.get('handle')?.trim().toLowerCase()??'';
 if(!/^[a-z][a-z0-9._]{2,29}$/.test(handle))return errorResponse(400,'Invalid username');
 try{const doc=await db().collection('handles').doc(handle).get();return NextResponse.json({available:!doc.exists||doc.data()?.uid===user.uid},{headers:safeHeaders})}
 catch{return errorResponse(503,'Username lookup unavailable')}
}
