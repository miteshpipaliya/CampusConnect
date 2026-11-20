import { NextRequest,NextResponse } from 'next/server';
import { db } from '@/lib/server/services';
import { session,errorResponse,safeHeaders } from '@/lib/server/session';
export const runtime='nodejs';
export async function GET(request:NextRequest){
 const user=await session(request);if(!user)return errorResponse(401,'Sign in required');
 try{const snap=await db().collection('users').doc(user.uid).collection('notifications').orderBy('createdAt','desc').limit(50).get();
 return NextResponse.json({notifications:snap.docs.map(d=>({id:d.id,...d.data(),createdAt:d.data().createdAt?.toDate?.()?.toISOString()??null}))},{headers:safeHeaders});}
 catch{return errorResponse(503,'Notifications unavailable')}
}