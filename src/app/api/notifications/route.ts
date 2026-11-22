import { NextRequest,NextResponse } from 'next/server';
import { db } from '@/lib/server/services';
import {isBlockedEitherWay} from '@/lib/server/privacy';
import { session,errorResponse,safeHeaders } from '@/lib/server/session';
export const runtime='nodejs';
export async function GET(request:NextRequest){
 const user=await session(request);if(!user)return errorResponse(401,'Sign in required');
 try{const snap=await db().collection('users').doc(user.uid).collection('notifications').orderBy('createdAt','desc').limit(50).get();
 const allowed=await Promise.all(snap.docs.map(async d=>!(typeof d.data().actorUid==='string'&&await isBlockedEitherWay(user.uid,d.data().actorUid))));
 return NextResponse.json({notifications:snap.docs.filter((d,i)=>allowed[i]).map(d=>({id:d.id,...d.data(),createdAt:d.data().createdAt?.toDate?.()?.toISOString()??null}))},{headers:safeHeaders});}
 catch{return errorResponse(503,'Notifications unavailable')}
}