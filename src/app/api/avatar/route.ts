import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/server/services';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {isBlockedEitherWay} from '@/lib/server/privacy';
export const runtime='nodejs';
export async function GET(req:NextRequest){
 const viewer=await session(req);if(!viewer)return errorResponse(401,'Sign in required');
 const handle=req.nextUrl.searchParams.get('handle')?.trim().toLowerCase()||'';
 if(!/^[a-z][a-z0-9._]{2,29}$/.test(handle))return errorResponse(400,'Invalid handle');
 try{const store=db(),claim=await store.collection('handles').doc(handle).get();
  if(!claim.exists||typeof claim.data()?.uid!=='string')return errorResponse(404,'Account unavailable');
  const uid=String(claim.data()?.uid),profile=await store.collection('users').doc(uid).get();
  if(!profile.exists||profile.data()?.deletedAt||await isBlockedEitherWay(viewer.uid,uid))return errorResponse(404,'Account unavailable');
  return NextResponse.json({avatarMediaId:profile.data()?.avatarMediaId||null},{headers:{...safeHeaders,'Cache-Control':'private, no-store'}});
 }catch{return errorResponse(503,'Avatar unavailable')}
}
