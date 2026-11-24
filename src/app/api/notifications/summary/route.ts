import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/server/services';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {notificationUnread} from '@/lib/core/notification-grouping';
import {getStreamUnread} from '@/lib/server/stream-unread';
export const runtime='nodejs';
export async function GET(req:NextRequest){
 const user=await session(req);if(!user)return errorResponse(401,'Sign in required');
 try{
  const store=db(),ref=store.collection('users').doc(user.uid).collection('notifications');
  // Prefer aggregate queries for modern documents; legacy accounts still use the bounded scan.
  // Read beyond the old 100-notification cap. Legacy documents may lack readAt,
  // so a query aggregating only readAt==null would silently omit them.
  const read=async()=>{
   try{const [total,read,unread]=await Promise.all([ref.count().get(),ref.where('read','==',true).count().get(),ref.where('read','==',false).count().get()]);if(total.data().count===read.data().count+unread.data().count)return {count:unread.data().count,truncated:false}}catch{/* legacy fallback */}
   let count=0,cursor:FirebaseFirestore.QueryDocumentSnapshot|undefined;
   for(let page=0;page<25;page++){
    let query=ref.orderBy('createdAt','desc');
    if(cursor)query=query.startAfter(cursor);
    const snap=await query.limit(100).get();
    for(const doc of snap.docs)if(notificationUnread(doc.data()))count++;
    cursor=snap.docs.at(-1);
    if(snap.size<100)return {count,truncated:false};
   }
   return {count,truncated:true};
  };
  const [notifications,messages]=await Promise.all([read(),req.nextUrl.searchParams.get('messages')==='0'?Promise.resolve(null):getStreamUnread(user.uid)]);
  return NextResponse.json({unread:notifications.count,unreadTruncated:notifications.truncated,unreadMessages:messages??0,messagesAvailable:messages!==null},{headers:safeHeaders});
 }catch{return errorResponse(503,'Notification summary unavailable')}
}
