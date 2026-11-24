import {NextRequest,NextResponse} from 'next/server';
import {Timestamp} from 'firebase-admin/firestore';
import {db} from '@/lib/server/services';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {canViewMany} from '@/lib/server/privacy';
import {hydrateAvatars} from '@/lib/server/avatar-hydration';
import {mintUrls} from '@/lib/server/media-urls';
import {isStoryActive} from '@/lib/core/story-expiry';
import {chunkAudienceIds,uniqueStoryDocs} from '@/lib/core/story-tray-batching';
export const runtime='nodejs';
import {routeTiming} from '@/lib/server/route-timing';
export async function GET(req:NextRequest){return routeTiming('stories/tray',()=>readRoute(req))}
async function readRoute(req:NextRequest){
 const viewer=await session(req);if(!viewer)return errorResponse(401,'Sign in required');
 try{
  const store=db(),now=Date.now();
  // Author-first fetch prevents recent stories from unrelated campus members
  // exhausting the previous global limit of 150 before followed students appear.
  const followUids:string[]=[];
  let followQuery=store.collection('follows').where('followerUid','==',viewer.uid).limit(200);
  for(let page=0;page<5;page++){
   const snap=await followQuery.get();
   for(const doc of snap.docs)if(doc.data().status==='active'&&typeof doc.data().followingUid==='string')followUids.push(doc.data().followingUid);
   if(snap.size<200||!snap.docs.at(-1))break;
   followQuery=followQuery.startAfter(snap.docs.at(-1)!);
  }
  const permitted=[...new Set([viewer.uid,...followUids])];
  const collected:FirebaseFirestore.QueryDocumentSnapshot[]=[];
  try{
   for(const authors of chunkAudienceIds(permitted,30)){
    let query=store.collection('stories').where('authorUid','in',authors).where('expiresAt','>',Timestamp.fromMillis(now));
    for(let page=0;page<5;page++){
     const snap=await query.limit(150).get();
     collected.push(...snap.docs);
     if(snap.size<150||!snap.docs.at(-1))break;
     query=query.startAfter(snap.docs.at(-1)!);
    }
   }
  }catch(error){
   // An unprovisioned authorUid+expiresAt composite index must not crash Home.
   if((error as {code?:unknown}).code!==9)throw error;
   console.warn('Story tray missing Firestore author/expiry index; bounded fallback active');
   const fallback=await store.collection('stories').where('expiresAt','>',Timestamp.fromMillis(now)).limit(1000).get();
   collected.length=0;collected.push(...fallback.docs);
  }
  const eligible=uniqueStoryDocs(collected).filter(d=>isStoryActive(d.data(),now));
  const authorUids=[...new Set(eligible.map(d=>String(d.data().authorUid||'')))];
  const [visibility,mutes,avatars]=await Promise.all([
   canViewMany(viewer.uid,authorUids),
   store.collection('mutes').where('ownerUid','==',viewer.uid).limit(200).get(),
   hydrateAvatars(authorUids,viewer.uid)
  ]);
  const muted=new Set(mutes.docs.filter(d=>d.data().stories!==false).map(d=>String(d.data().targetUid||'')));
  const followed=new Set(followUids);
  const allowed=eligible.filter(d=>{
   const author=String(d.data().authorUid||'');
   return (author===viewer.uid||followed.has(author))&&visibility.get(author)&&!muted.has(author);
  });
  const closeAuthors=[...new Set(allowed.filter(d=>d.data().audience==='close'&&d.data().authorUid!==viewer.uid).map(d=>String(d.data().authorUid)))];
  const friendDocs=closeAuthors.length?await store.getAll(...closeAuthors.map(uid=>store.collection('closeFriends').doc(uid+'_'+viewer.uid))):[];
  const friends=new Set(closeAuthors.filter((_,i)=>friendDocs[i]?.exists));
  const stories=allowed.filter(d=>d.data().audience!=='close'||d.data().authorUid===viewer.uid||friends.has(String(d.data().authorUid)));
  const mediaRefs=stories.map(d=>d.data().mediaId).filter((id):id is string=>typeof id==='string');
  const [readDocs,media]=await Promise.all([stories.length?store.getAll(...stories.map(d=>d.ref.collection('views').doc(viewer.uid))):Promise.resolve([]),mediaRefs.length?store.getAll(...[...new Set(mediaRefs)].map(id=>store.collection('media').doc(id))):Promise.resolve([])]);
  const expiry=new Map(stories.map(d=>[String(d.data().mediaId||''),d.data().expiresAt?.toMillis?.()??0]));
  const urls=await mintUrls(media.filter(d=>d.exists).map(d=>({id:d.id,...(d.data()??{}),storyExpiresAt:expiry.get(d.id)})),{viewerUid:viewer.uid});
  const groups=new Map<string,{authorUid:string;handle:string;name:string;avatarUrl:string|null;seen:boolean;close:boolean;isMine:boolean;stories:Array<{id:string;mediaUrl:string|null;mediaId:string;contentType:string;caption:string;createdAt:number;expiresAt:number;overlay:unknown;poll:unknown;seen:boolean;isMine:boolean}>}>();
  stories.forEach((doc,i)=>{
   const data=doc.data(),authorUid=String(data.authorUid||''),seen=readDocs[i]?.exists===true;
   let group=groups.get(authorUid);
   if(!group){group={authorUid,handle:avatars[authorUid]?.handle||String(data.authorHandle||''),name:avatars[authorUid]?.name||'Student',avatarUrl:avatars[authorUid]?.avatarUrl??null,seen:true,close:false,isMine:authorUid===viewer.uid,stories:[]};groups.set(authorUid,group)}
   group.seen=group.seen&&seen;group.close=group.close||data.audience==='close';
   group.stories.push({id:doc.id,mediaUrl:urls[String(data.mediaId)]?.url?'/api/media?id='+encodeURIComponent(String(data.mediaId)):null,mediaId:String(data.mediaId||''),contentType:String(data.contentType||'image/jpeg'),caption:String(data.caption||''),createdAt:data.createdAt?.toMillis?.()??0,expiresAt:data.expiresAt?.toMillis?.()??0,overlay:data.overlay||null,poll:data.poll||null,seen,isMine:authorUid===viewer.uid});
  });
  const result=[...groups.values()].map(g=>({...g,stories:g.stories.sort((a,b)=>a.createdAt-b.createdAt)}));
  result.sort((a,b)=>Number(b.isMine)-Number(a.isMine)||Number(a.seen)-Number(b.seen)||((b.stories.at(-1)?.createdAt??0)-(a.stories.at(-1)?.createdAt??0)));
  return NextResponse.json({groups:result},{headers:safeHeaders});
 }catch(error){console.error('Story tray failed',error instanceof Error?error.name:'error');return errorResponse(503,'Story tray unavailable')}
}
