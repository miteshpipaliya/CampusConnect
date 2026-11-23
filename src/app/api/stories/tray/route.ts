import {NextRequest,NextResponse} from 'next/server';
import {Timestamp} from 'firebase-admin/firestore';
import {db} from '@/lib/server/services';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {canViewMany} from '@/lib/server/privacy';
import {hydrateAvatars} from '@/lib/server/avatar-hydration';
import {mintUrls} from '@/lib/server/media-urls';
import {isStoryActive} from '@/lib/core/story-expiry';
export const runtime='nodejs';
export async function GET(req:NextRequest){
 const viewer=await session(req);if(!viewer)return errorResponse(401,'Sign in required');
 try{
  const store=db(),now=Date.now();
  const snap=await store.collection('stories').where('expiresAt','>',Timestamp.fromMillis(now)).limit(150).get();
  const eligible=snap.docs.filter(d=>isStoryActive(d.data(),now));
  const authorUids=[...new Set(eligible.map(d=>String(d.data().authorUid||'')))];
  const [visibility,mutes,avatars,relations]=await Promise.all([
   canViewMany(viewer.uid,authorUids),
   store.collection('mutes').where('ownerUid','==',viewer.uid).limit(200).get(),
   hydrateAvatars(authorUids,viewer.uid),
   store.collection('follows').where('followerUid','==',viewer.uid).where('status','==','active').limit(500).get()
  ]);
  const muted=new Set(mutes.docs.filter(d=>d.data().stories!==false).map(d=>String(d.data().targetUid||'')));
  const followed=new Set(relations.docs.map(d=>String(d.data().followingUid||'')));
  const allowed=eligible.filter(d=>{
   const author=String(d.data().authorUid||'');
   return (author===viewer.uid||followed.has(author))&&visibility.get(author)&&!muted.has(author);
  });
  const closeAuthors=[...new Set(allowed.filter(d=>d.data().audience==='close'&&d.data().authorUid!==viewer.uid).map(d=>String(d.data().authorUid)))];
  const friendDocs=closeAuthors.length?await store.getAll(...closeAuthors.map(uid=>store.collection('closeFriends').doc(uid+'_'+viewer.uid))):[];
  const friends=new Set(closeAuthors.filter((_,i)=>friendDocs[i]?.exists));
  const stories=allowed.filter(d=>d.data().audience!=='close'||d.data().authorUid===viewer.uid||friends.has(String(d.data().authorUid)));
  const readDocs=stories.length?await store.getAll(...stories.map(d=>d.ref.collection('views').doc(viewer.uid))):[];
  const mediaRefs=stories.map(d=>d.data().mediaId).filter((id):id is string=>typeof id==='string');
  const media=mediaRefs.length?await store.getAll(...[...new Set(mediaRefs)].map(id=>store.collection('media').doc(id))):[];
  const expiry=new Map(stories.map(d=>[String(d.data().mediaId||''),d.data().expiresAt?.toMillis?.()??0]));
  const urls=await mintUrls(media.filter(d=>d.exists).map(d=>({id:d.id,...(d.data()??{}),storyExpiresAt:expiry.get(d.id)})),{viewerUid:viewer.uid});
  const groups=new Map<string,{authorUid:string;handle:string;name:string;avatarUrl:string|null;seen:boolean;close:boolean;isMine:boolean;stories:Array<{id:string;mediaUrl:string|null;mediaId:string;contentType:string;caption:string;createdAt:number;expiresAt:number;overlay:unknown;poll:unknown;seen:boolean;isMine:boolean}>}>();
  stories.forEach((doc,i)=>{
   const data=doc.data(),authorUid=String(data.authorUid||''),seen=readDocs[i]?.exists===true;
   let group=groups.get(authorUid);
   if(!group){group={authorUid,handle:avatars[authorUid]?.handle||String(data.authorHandle||''),name:avatars[authorUid]?.name||'Student',avatarUrl:avatars[authorUid]?.avatarUrl??null,seen:true,close:false,isMine:authorUid===viewer.uid,stories:[]};groups.set(authorUid,group)}
   group.seen=group.seen&&seen;group.close=group.close||data.audience==='close';
   group.stories.push({id:doc.id,mediaUrl:urls[String(data.mediaId)]?.url??null,mediaId:String(data.mediaId||''),contentType:String(data.contentType||'image/jpeg'),caption:String(data.caption||''),createdAt:data.createdAt?.toMillis?.()??0,expiresAt:data.expiresAt?.toMillis?.()??0,overlay:data.overlay||null,poll:data.poll||null,seen,isMine:authorUid===viewer.uid});
  });
  const result=[...groups.values()].map(g=>({...g,stories:g.stories.sort((a,b)=>a.createdAt-b.createdAt)}));
  result.sort((a,b)=>Number(b.isMine)-Number(a.isMine)||Number(a.seen)-Number(b.seen)||((b.stories.at(-1)?.createdAt??0)-(a.stories.at(-1)?.createdAt??0)));
  return NextResponse.json({groups:result},{headers:safeHeaders});
 }catch(error){console.error('Story tray failed',error instanceof Error?error.name:'error');return errorResponse(503,'Story tray unavailable')}
}
