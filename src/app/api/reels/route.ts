import {NextRequest,NextResponse} from 'next/server';
import {FieldPath} from 'firebase-admin/firestore';
import {db} from '@/lib/server/services';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {canViewMany} from '@/lib/server/privacy';
import {hydrateAvatars} from '@/lib/server/avatar-hydration';
import {mintUrls} from '@/lib/server/media-urls';
import {clampLimit} from '@/lib/core/cursor';
import {couldBeReel,isPlayableReelMedia,reelMediaId} from '@/lib/core/reel-discovery';
import {rankRelatedReels} from '@/lib/core/reel-recommendations';
import {reelMetadata} from '@/lib/core/reel-payload';
export const runtime='nodejs';

/**
 * Use the SAME createdAt-ordered posts source as Home.
 * The previous query where(type == reel).orderBy(createdAt) failed when its
 * Firestore composite index was missing, and could never discover older video
 * posts published with type='post'. Keep all visibility checks server-side.
 */
import {routeTiming} from '@/lib/server/route-timing';
export async function GET(req:NextRequest){return routeTiming('reels',()=>readRoute(req))}
async function readRoute(req:NextRequest){
 const user=await session(req);if(!user)return errorResponse(401,'Sign in required');
 const cursor=req.nextUrl.searchParams.get('cursor'),start=req.nextUrl.searchParams.get('start');
 const limit=clampLimit(req.nextUrl.searchParams.get('limit'),10,20);
 if((cursor&&!/^[A-Za-z0-9_-]{10,100}$/.test(cursor))||(start&&!/^[A-Za-z0-9_-]{10,100}$/.test(start)))return errorResponse(400,'Invalid cursor');
 try{
  const store=db();
  const mutedSnap=await store.collection('mutes').where('ownerUid','==',user.uid).limit(200).get();
  const muted=new Set(mutedSnap.docs.filter(d=>d.data().posts!==false).map(d=>String(d.data().targetUid||'')));
  let query=store.collection('posts').orderBy('createdAt','desc').orderBy(FieldPath.documentId(),'desc');
  if(cursor){
   const previous=await store.collection('posts').doc(cursor).get();
   if(!previous.exists||!previous.data()?.createdAt)return errorResponse(400,'Invalid cursor');
   query=query.startAfter(previous);
  }
  type Candidate={doc:FirebaseFirestore.DocumentSnapshot;media:FirebaseFirestore.DocumentSnapshot;mediaId:string};
  const selected:Candidate[]=[];
  let seed:Candidate|undefined;
  if(start){
   const doc=await store.collection('posts').doc(start).get(),data=doc.data();
   if(!data||!couldBeReel(data))return errorResponse(404,'Reel unavailable');
   const uid=String(data.authorUid||''),mediaId=reelMediaId(data);
   if(!mediaId||muted.has(uid)||!(await canViewMany(user.uid,[uid])).get(uid))return errorResponse(404,'Reel unavailable');
   const media=await store.collection('media').doc(mediaId).get();
   if(!media.exists||!isPlayableReelMedia(media.data()))return errorResponse(404,'Reel unavailable');
   seed={doc,media,mediaId};
  }
  let lastScanned:FirebaseFirestore.QueryDocumentSnapshot|undefined;
  let morePossible=false;
  // Scan a bounded number of recent posts; do not require the optional
  // reels-specific composite index to have been installed in Firestore.
  for(let page=0;page<10&&selected.length<limit;page++){
   const snap=await query.limit(50).get();
   if(snap.empty)break;
   morePossible=snap.size===50;
   const candidates=snap.docs.filter(d=>couldBeReel(d.data()));
   const ids=[...new Set(candidates.map(d=>reelMediaId(d.data())).filter((id):id is string=>id!==null))];
   const [mediaDocs,visible]=await Promise.all([ids.length?store.getAll(...ids.map(id=>store.collection('media').doc(id))):Promise.resolve([]),canViewMany(user.uid,candidates.map(d=>String(d.data().authorUid||'')))]);
   const mediaById=new Map(mediaDocs.map(d=>[d.id,d]));
   for(const doc of snap.docs){
    lastScanned=doc;
    if(doc.id===start||!couldBeReel(doc.data()))continue;
    const data=doc.data(),uid=String(data.authorUid||''),mediaId=reelMediaId(data);
    if(!mediaId||!visible.get(uid)||muted.has(uid))continue;
    const media=mediaById.get(mediaId);
    if(!media||!media.exists||!isPlayableReelMedia(media.data()))continue;
    selected.push({doc,media,mediaId});
    if(selected.length>=limit)break;
   }
   if(selected.length>=limit||snap.size<50)break;
   query=query.startAfter(snap.docs.at(-1)!);
  }
  const nextCursor=lastScanned&&(selected.length>=limit||morePossible)?lastScanned.id:null;
  if(seed){
   const affinity=(c:Candidate)=>({id:c.doc.id,authorUid:String(c.doc.data()?.authorUid||''),hashtags:c.doc.data()?.hashtags,createdAt:c.doc.data()?.createdAt?.toMillis?.()??0});
   const ranked=rankRelatedReels(selected.map(c=>({...affinity(c),candidate:c})),affinity(seed)).map(x=>x.candidate);
   selected.splice(0,selected.length,...(!cursor?[seed]:[]),...ranked);
  }
  const authors=[...new Set(selected.map(s=>String(s.doc.data()?.authorUid||'')))];
  const uniqueMedia=[...new Map(selected.map(s=>[s.mediaId,s.media])).values()];
  const [avatars,signed,likes,saves,reposts,follows]=await Promise.all([
   hydrateAvatars(authors,user.uid),mintUrls(uniqueMedia.map(d=>({id:d.id,...(d.data()||{})})),{viewerUid:user.uid}),
   selected.length?store.getAll(...selected.map(s=>s.doc.ref.collection('likes').doc(user.uid))):Promise.resolve([]),
   selected.length?store.getAll(...selected.map(s=>store.collection('users').doc(user.uid).collection('saves').doc(s.doc.id))):Promise.resolve([]),
   selected.length?store.getAll(...selected.map(s=>store.collection('reposts').doc(user.uid+'_'+s.doc.id))):Promise.resolve([]),
   authors.length?store.getAll(...authors.map(uid=>store.collection('follows').doc(user.uid+'_'+uid))):Promise.resolve([])
  ]);
  const followStatus=new Map(authors.map((uid,i)=>[uid,String(follows[i]?.data()?.status||'none')]));
  const reels=selected.map(({doc,mediaId,media},i)=>{
   const data=doc.data()!,uid=String(data.authorUid||'');
   return {...reelMetadata(media.data(),Array.isArray(data.media)?data.media[0]:undefined,data,avatars[uid]?.verified),id:doc.id,authorUid:uid,authorHandle:avatars[uid]?.handle||String(data.authorHandle||''),
    authorName:avatars[uid]?.name||'Student',avatarUrl:avatars[uid]?.avatarUrl??null,
    isMine:uid===user.uid,caption:String(data.caption||''),mediaId,
    mediaUrl:signed[mediaId]?.url??'/api/media?id='+encodeURIComponent(mediaId),
    contentType:String(media.data()?.contentType||'video/mp4'),
    createdAt:data.createdAt?.toMillis?.()??0,
    likes:Number(data.counters?.likes||0),comments:Number(data.counters?.comments||0),
    reposts:Number(data.counters?.reposts||0),views:Number(data.counters?.views||0),
    liked:likes[i]?.exists??false,saved:saves[i]?.exists??false,reposted:reposts[i]?.exists??false,
    followStatus:followStatus.get(uid)||'none'};
  });
  const response=NextResponse.json({reels,nextCursor},{headers:safeHeaders});
  response.headers.set('Cache-Control','private, no-store');
  return response;
 }catch(error){
  console.error('Reel feed failed',error instanceof Error?error.message:'unknown');
  return errorResponse(503,'Reels unavailable');
 }
}
