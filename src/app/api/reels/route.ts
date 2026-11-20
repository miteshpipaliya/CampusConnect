import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/server/services';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
export const runtime='nodejs';
export async function GET(request:NextRequest){
 const user=await session(request);if(!user)return errorResponse(401,'Sign in required');
 try{const s=await db().collection('posts').orderBy('createdAt','desc').limit(100).get();
 const entries=await Promise.all(s.docs.filter(d=>d.data().mediaId&&(d.data().visibility==='campus'||d.data().authorUid===user.uid)).map(async d=>{
 const media=await db().collection('media').doc(d.data().mediaId).get();
 if(!media.exists||media.data()?.status!=='uploaded'||!String(media.data()?.contentType).startsWith('video/'))return null;
 return {id:d.id,caption:d.data().caption,authorHandle:d.data().authorHandle,mediaId:d.data().mediaId};
 }));
 return NextResponse.json({reels:entries.filter(Boolean)},{headers:safeHeaders});
 }catch{return errorResponse(503,'Reels unavailable')}
}