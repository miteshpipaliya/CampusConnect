import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/server/services';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {blockedEitherWayMany,canViewMany} from '@/lib/server/privacy';
import {hydrateAvatars} from '@/lib/server/avatar-hydration';
import {mintUrls} from '@/lib/server/media-urls';
import {notificationUnread,normalizeNotificationType} from '@/lib/core/notification-grouping';
export const runtime='nodejs';
export async function GET(req:NextRequest){
 const user=await session(req);if(!user)return errorResponse(401,'Sign in required');
 const cursor=req.nextUrl.searchParams.get('cursor');
 if(cursor&&!/^[0-9a-zA-Z_-]{10,128}$/.test(cursor))return errorResponse(400,'Invalid cursor');
 try{
  const ref=db().collection('users').doc(user.uid).collection('notifications');
  let query=ref.orderBy('createdAt','desc');
  if(cursor){const previous=await ref.doc(cursor).get();if(!previous.exists)return errorResponse(400,'Invalid cursor');query=query.startAfter(previous)}
  const snap=await query.limit(30).get();
  const store=db(),actorIds=[...new Set(snap.docs.flatMap(d=>{const x=d.data();return [String(x.actorUid||''),...(Array.isArray(x.actorUids)?x.actorUids.filter((id:unknown):id is string=>typeof id==='string'):[])].filter(Boolean)}))];
  const denied=await blockedEitherWayMany(user.uid,actorIds);
  const visible=snap.docs.filter(d=>{const actor=String(d.data().actorUid||d.data().actorUids?.[0]||'');return actor&&!denied.has(actor)});
  const actors=actorIds.filter(id=>!denied.has(id));
  const [avatars,follows]=await Promise.all([hydrateAvatars(actors,user.uid),actors.length?store.getAll(...actors.map(id=>store.collection('follows').doc(user.uid+'_'+id))):Promise.resolve([])]);
  const followById=new Map(actors.map((id,i)=>[id,String(follows[i]?.data()?.status||'none')]));
  const postIds=[...new Set(visible.map(d=>d.data().postId).filter((id:unknown):id is string=>typeof id==='string'&&Boolean(id)))];
  const storyIds=[...new Set(visible.map(d=>d.data().storyId).filter((id:unknown):id is string=>typeof id==='string'&&Boolean(id)))];
  const refs=[...postIds.map(id=>store.collection('posts').doc(id)),...storyIds.map(id=>store.collection('stories').doc(id))];
  const targets=refs.length?await store.getAll(...refs):[];
  const posts=new Map(postIds.map((id,i)=>[id,targets[i]?.data()]));
  const stories=new Map(storyIds.map((id,i)=>[id,targets[postIds.length+i]?.data()]));
  const authors=await canViewMany(user.uid,targets.map(d=>String(d.data()?.authorUid||'')).filter(Boolean));
  const targetMedia=(x:FirebaseFirestore.DocumentData)=>{const t=posts.get(x.postId)||stories.get(x.storyId);return t&&!t.deletedAt&&!t.archived&&authors.get(String(t.authorUid||''))?String(t.mediaId||''):''};
  const ids=[...new Set(visible.map(d=>targetMedia(d.data())).filter(Boolean))];
  const media=ids.length?await store.getAll(...ids.map(id=>store.collection('media').doc(id))):[];
  const urls=await mintUrls(media.filter(d=>d.exists).map(d=>({id:d.id,...d.data()})),{viewerUid:user.uid});
  const mime=new Map(media.map(d=>[d.id,String(d.data()?.contentType||'')]));

  const items=visible.map(d=>{
   const x=d.data(),actor=String(x.actorUid||x.actorUids?.[0]||'');
   const p=posts.get(x.postId),mid=targetMedia(x),kind=x.commentId?'comment':x.storyId?'story':p?.type==='reel'?'reel':'post';
   const actorList=[...new Set([actor,...(Array.isArray(x.actorUids)?x.actorUids.filter((id:unknown):id is string=>typeof id==='string'):[])])].filter(id=>!denied.has(id));
   return {id:d.id,targetKind:kind,thumbUrl:urls[mid]?'/api/media?id='+encodeURIComponent(mid):null,thumbContentType:mime.get(mid)||'',followStatus:followById.get(actor)||'none',actors:actorList.slice(0,2).map(uid=>({uid,handle:avatars[uid]?.handle||'Member',avatarUrl:avatars[uid]?.avatarUrl??null})),type:normalizeNotificationType(String(x.type||'')),actorUid:actor,actorHandle:avatars[actor]?.handle||String(x.actorHandle||''),actorAvatarUrl:avatars[actor]?.avatarUrl??null,
    actorUids:actorList,count:Math.max(1,Math.min(Number(x.count||1),actorList.length)),postId:x.postId||null,storyId:x.storyId||null,commentId:x.commentId||null,
    createdAt:x.createdAt?.toDate?.()?.toISOString()??null,unread:notificationUnread(x)};
  });
  return NextResponse.json({items,notifications:items,nextCursor:snap.size===30?snap.docs.at(-1)?.id??null:null},{headers:safeHeaders});
 }catch{return errorResponse(503,'Notifications unavailable')}
}
