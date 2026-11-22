import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/server/services';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {mintUrls} from '@/lib/server/media-urls';
import {canViewMany} from '@/lib/server/privacy';
export const runtime='nodejs';
export async function GET(request:NextRequest){
 const user=await session(request);if(!user)return errorResponse(401,'Sign in required');
 try{
 const store=db(),limit=Math.min(30,Math.max(1,Number(request.nextUrl.searchParams.get('limit'))||20));
 const mutedDocs=await store.collection('mutes').where('ownerUid','==',user.uid).limit(200).get();
 const muted=new Set(mutedDocs.docs.filter(d=>d.data().posts!==false).map(d=>String(d.data().targetUid||'')));
 let query=store.collection('posts').orderBy('createdAt','desc');
 const entries:Array<{id:string;caption:string;authorHandle:string;mediaId:string}>=[];
 for(let page=0;page<4&&entries.length<limit;page++){
  const snap=await query.limit(100).get();if(snap.empty)break;
  const candidates=snap.docs.filter(d=>d.data().mediaId&&!d.data().deletedAt&&!d.data().archived&&!muted.has(String(d.data().authorUid||'')));
  const visibility=await canViewMany(user.uid,candidates.map(d=>String(d.data().authorUid||'')));
  const visible=candidates.filter(d=>visibility.get(String(d.data().authorUid||'')));
  const mediaDocs=visible.length?await store.getAll(...visible.map(d=>store.collection('media').doc(String(d.data().mediaId)))):[];
  visible.forEach((d,i)=>{const media=mediaDocs[i];if(media?.exists&&media.data()?.status==='uploaded'&&String(media.data()?.contentType||'').startsWith('video/'))entries.push({id:d.id,caption:String(d.data().caption||''),authorHandle:String(d.data().authorHandle||''),mediaId:String(d.data().mediaId)})});
  if(snap.size<100)break;
  query=query.startAfter(snap.docs.at(-1)!);
 }
 entries.splice(limit);
 const mediaRefs=entries.map(entry=>store.collection('media').doc(entry.mediaId));
 const mediaDocs=mediaRefs.length?await store.getAll(...mediaRefs):[];
 const urls=await mintUrls(mediaDocs.filter(doc=>doc.exists).map(doc=>({id:doc.id,...(doc.data()??{})})),{viewerUid:user.uid});
 return NextResponse.json({reels:entries.map(entry=>({...entry,mediaUrl:urls[entry.mediaId]?.url??null}))},{headers:safeHeaders});
 }catch{return errorResponse(503,'Reels unavailable')}
}