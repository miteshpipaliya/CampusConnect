import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/server/services';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {mintUrls} from '@/lib/server/media-urls';
import {canViewAuthor} from '@/lib/server/privacy';
export const runtime='nodejs';
export async function GET(request:NextRequest){
 const user=await session(request);if(!user)return errorResponse(401,'Sign in required');
 try{const s=await db().collection('posts').orderBy('createdAt','desc').limit(100).get();
 const allowed=await Promise.all(s.docs.map(d=>canViewAuthor(user.uid,String(d.data().authorUid||''))));
 const entries=await Promise.all(s.docs.filter((d,i)=>d.data().mediaId&&allowed[i]&&!d.data().deletedAt).map(async d=>{
 const media=await db().collection('media').doc(d.data().mediaId).get();
 if(!media.exists||media.data()?.status!=='uploaded'||!String(media.data()?.contentType).startsWith('video/'))return null;
 return {id:d.id,caption:d.data().caption,authorHandle:d.data().authorHandle,mediaId:d.data().mediaId};
 }));
 const mediaRefs=entries.filter((entry):entry is NonNullable<typeof entry>=>entry!==null).map(entry=>db().collection('media').doc(entry.mediaId));
 const mediaDocs=mediaRefs.length?await db().getAll(...mediaRefs):[];
 const urls=await mintUrls(mediaDocs.filter(doc=>doc.exists).map(doc=>({id:doc.id,...(doc.data()??{})})),{viewerUid:user.uid});
 return NextResponse.json({reels:entries.filter((entry):entry is NonNullable<typeof entry>=>entry!==null).map(entry=>({...entry,mediaUrl:urls[entry.mediaId]?.url??null}))},{headers:safeHeaders});
 }catch{return errorResponse(503,'Reels unavailable')}
}