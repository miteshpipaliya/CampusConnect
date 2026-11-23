import {NextRequest,NextResponse} from 'next/server';import {db} from '@/lib/server/services';import {session,errorResponse,safeHeaders} from '@/lib/server/session';import {notificationUnread} from '@/lib/core/notification-grouping';import {getStreamUnread} from '@/lib/server/stream-unread';
export const runtime='nodejs';export async function GET(req:NextRequest){
 const user=await session(req);if(!user)return errorResponse(401,'Sign in required');
 try{const [snap,messages]=await Promise.all([db().collection('users').doc(user.uid).collection('notifications').orderBy('createdAt','desc').limit(100).get(),getStreamUnread(user.uid)]);
  const unread=snap.docs.filter(d=>notificationUnread(d.data())).length;
  return NextResponse.json({unread,unreadMessages:messages??0,messagesAvailable:messages!==null},{headers:safeHeaders});
 }catch{return errorResponse(503,'Notification summary unavailable')}
}
