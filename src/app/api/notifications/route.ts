import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/server/services';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {isBlockedEitherWay} from '@/lib/server/privacy';
import {hydrateAvatars} from '@/lib/server/avatar-hydration';
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
  const allowed=await Promise.all(snap.docs.map(async d=>{const actor=String(d.data().actorUid||d.data().actorUids?.[0]||'');return actor&&!await isBlockedEitherWay(user.uid,actor)}));
  const visible=snap.docs.filter((_,i)=>allowed[i]),actors=[...new Set(visible.map(d=>String(d.data().actorUid||d.data().actorUids?.[0]||'')).filter(Boolean))];
  const avatars=await hydrateAvatars(actors,user.uid);
  const items=visible.map(d=>{
   const x=d.data(),actor=String(x.actorUid||x.actorUids?.[0]||'');
   return {id:d.id,type:normalizeNotificationType(String(x.type||'')),actorUid:actor,actorHandle:avatars[actor]?.handle||String(x.actorHandle||''),actorAvatarUrl:avatars[actor]?.avatarUrl??null,
    actorUids:Array.isArray(x.actorUids)?x.actorUids:[actor],count:Number(x.count||1),postId:x.postId||null,storyId:x.storyId||null,commentId:x.commentId||null,
    createdAt:x.createdAt?.toDate?.()?.toISOString()??null,unread:notificationUnread(x)};
  });
  return NextResponse.json({items,notifications:items,nextCursor:snap.size===30?snap.docs.at(-1)?.id??null:null},{headers:safeHeaders});
 }catch{return errorResponse(503,'Notifications unavailable')}
}
