import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/server/services';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {canViewMany} from '@/lib/server/privacy';
import {hydrateAvatars} from '@/lib/server/avatar-hydration';
import {mintUrls} from '@/lib/server/media-urls';
import {clampLimit} from '@/lib/core/cursor';
export const runtime='nodejs';
export async function GET(req:NextRequest){
 const user=await session(req);if(!user)return errorResponse(401,'Sign in required');
 const cursor=req.nextUrl.searchParams.get('cursor'),limit=clampLimit(req.nextUrl.searchParams.get('limit'),10,20);
 if(cursor&&!/^[a-zA-Z0-9_-]{10,100}$/.test(cursor))return errorResponse(400,'Invalid cursor');
 try{
  const store=db(),mutedSnap=await store.collection('mutes').where('ownerUid','==',user.uid).limit(200).get();
  const muted=new Set(mutedSnap.docs.filter(d=>d.data().posts!==false).map(d=>String(d.data().targetUid||'')));
  let query=store.collection('posts').where('type','==','reel').orderBy('createdAt','desc');
  if(cursor){const previous=await store.collection('posts').doc(cursor).get();if(!previous.exists||previous.data()?.type!=='reel')return errorResponse(400,'Invalid cursor');query=query.startAfter(previous)}
  const selected:FirebaseFirestore.QueryDocumentSnapshot[]=[];let last:FirebaseFirestore.QueryDocumentSnapshot|undefined;
  for(let page=0;page<4&&selected.length<limit;page++){
   const snap=await query.limit(30).get();if(snap.empty)break;
   const visible=await canViewMany(user.uid,snap.docs.map(d=>String(d.data().authorUid||'')));
   const candidates=snap.docs.filter(d=>visible.get(String(d.data().authorUid||''))&&!d.data().deletedAt&&!d.data().archived&&!muted.has(String(d.data().authorUid||''))&&typeof d.data().mediaId==='string');
   const media=candidates.length?await store.getAll(...candidates.map(d=>store.collection('media').doc(String(d.data().mediaId)))):[];
   for(let i=0;i<snap.docs.length;i++){
    const d=snap.docs[i]!;last=d;
    const found=candidates.findIndex(x=>x.id===d.id);
    if(found<0)continue;
    const m=media[found];if(m?.data()?.status==='uploaded'&&String(m.data()?.contentType||'').startsWith('video/'))selected.push(d);
    if(selected.length>=limit)break;
   }
   if(snap.size<30)break;query=query.startAfter(snap.docs.at(-1)!);
  }
  const ids=[...new Set(selected.map(d=>String(d.data().authorUid||'')))];
  const avatars=await hydrateAvatars(ids,user.uid);
  const mediaIds=[...new Set(selected.map(d=>String(d.data().mediaId||'')))],media=mediaIds.length?await store.getAll(...mediaIds.map(id=>store.collection('media').doc(id))):[];
  const urls=await mintUrls(media.filter(d=>d.exists).map(d=>({id:d.id,...(d.data()??{})})),{viewerUid:user.uid});
  const [likes,saves,follows]=await Promise.all([
   selected.length?store.getAll(...selected.map(d=>d.ref.collection('likes').doc(user.uid))):Promise.resolve([]),
   selected.length?store.getAll(...selected.map(d=>store.collection('users').doc(user.uid).collection('saves').doc(d.id))):Promise.resolve([]),
   ids.length?store.getAll(...ids.map(uid=>store.collection('follows').doc(user.uid+'_'+uid))):Promise.resolve([])
  ]);
  const relation=new Map(ids.map((uid,i)=>[uid,follows[i]?.data()?.status||'none']));
  const reels=selected.map((d,i)=>{
   const x=d.data(),id=String(x.mediaId||''),uid=String(x.authorUid||'');
   return {id:d.id,authorUid:uid,authorHandle:avatars[uid]?.handle||String(x.authorHandle||''),authorName:avatars[uid]?.name||'Student',avatarUrl:avatars[uid]?.avatarUrl??null,
    caption:String(x.caption||''),mediaId:id,mediaUrl:urls[id]?.url??null,createdAt:x.createdAt?.toMillis?.()??0,likes:Number(x.counters?.likes||0),comments:Number(x.counters?.comments||0),reposts:Number(x.counters?.reposts||0),views:Number(x.counters?.views||0),liked:likes[i]?.exists??false,saved:saves[i]?.exists??false,followStatus:relation.get(uid)||'none'};
  });
  return NextResponse.json({reels,nextCursor:selected.length>=limit&&last?last.id:null},{headers:safeHeaders});
 }catch(error){console.error('Reel feed failed',error instanceof Error?error.name:'error');return errorResponse(503,'Reels unavailable')}
}
