import {NextRequest,NextResponse} from 'next/server';import {z} from 'zod';import {FieldValue} from 'firebase-admin/firestore';
import {guard} from '@/lib/server/guard';import {db} from '@/lib/server/services';import {errorResponse,safeHeaders} from '@/lib/server/session';
import {notificationUnread} from '@/lib/core/notification-grouping';
export const runtime='nodejs';const schema=z.object({id:z.string().min(10).max(128).optional(),all:z.boolean().optional()});
export async function POST(req:NextRequest){
 const checked=await guard(req,{write:true,schema,rateLimit:{key:'notifications-read:{uid}',limit:80,windowSec:3600}});if(!checked.ok)return checked.response;
 const input=schema.parse(checked.input);if(!input.id&&!input.all)return errorResponse(400,'Specify a notification or all');
 const ref=db().collection('users').doc(checked.user.uid).collection('notifications');
 if(input.id){const doc=await ref.doc(input.id).get();if(!doc.exists)return errorResponse(404,'Notification missing');await doc.ref.set({read:true,readAt:FieldValue.serverTimestamp()},{mer let count=0,scanned=0;let cursor:FirebaseFirestore.QueryDocumentSnapshot|undefined;
 // Scan both legacy readAt-only and current read:false notifications without skipping older documents.
 for(let page=0;page<20;page++){
  let query=ref.orderBy('createdAt','desc');
  if(cursor)query=query.startAfter(cursor);
  const snap=await query.limit(100).get();
  if(snap.empty)break;
  const batch=db().batch();let pending=0;
  for(const doc of snap.docs){
   if(!notificationUnread(doc.data()))continue;
   batch.set(doc.ref,{read:true,readAt:FieldValue.serverTimestamp()},{merge:true});pending++;count++;
  }
  if(pending)await batch.commit();
  scanned+=snap.size;cursor=snap.docs.at(-1);
  if(snap.size<100)break;
 }
erTimestamp()},{merge:true}));await batch.commit();count+=snap.size}
 return NextResponse.json({ok:true,updated:count,partial:scanned>=2000},{headers:safeHeaders});
}
