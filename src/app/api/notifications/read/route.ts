import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {FieldValue} from 'firebase-admin/firestore';
import {guard} from '@/lib/server/guard';
import {db} from '@/lib/server/services';
import {errorResponse,safeHeaders} from '@/lib/server/session';
import {notificationUnread} from '@/lib/core/notification-grouping';
export const runtime='nodejs';
const idSchema=z.string().regex(/^[A-Za-z0-9_-]{10,128}$/);
const schema=z.object({id:idSchema.optional(),ids:z.array(idSchema).min(1).max(100).optional(),all:z.boolean().optional()}).strict();

export async function POST(req:NextRequest){
 const checked=await guard(req,{write:true,schema,rateLimit:{key:'notifications-read:{uid}',limit:80,windowSec:3600}});
 if(!checked.ok)return checked.response;
 const input=schema.parse(checked.input);
 if(!input.id&&!input.ids&&!input.all)return errorResponse(400,'Specify one notification or all');
 const ref=db().collection('users').doc(checked.user.uid).collection('notifications');
 try{
  if(input.ids){
   const ids=[...new Set(input.ids)];
   const updated=await db().runTransaction(async tx=>{const docs=await tx.getAll(...ids.map(id=>ref.doc(id)));let count=0;for(const doc of docs){if(!doc.exists||!notificationUnread(doc.data()||{}))continue;tx.set(doc.ref,{read:true,readAt:FieldValue.serverTimestamp()},{merge:true});count++}return count});
   return NextResponse.json({ok:true,updated},{headers:safeHeaders});
  }
  if(input.id){
   const doc=await ref.doc(input.id).get();
   if(!doc.exists)return errorResponse(404,'Notification missing');
   await doc.ref.set({read:true,readAt:FieldValue.serverTimestamp()},{merge:true});
   return NextResponse.json({ok:true},{headers:safeHeaders});
  }
  let count=0,scanned=0;
  let cursor:FirebaseFirestore.QueryDocumentSnapshot|undefined;
  // Scan both older readAt-only documents and the new read:false format.
  for(let page=0;page<20;page++){
   let query=ref.orderBy('createdAt','desc');
   if(cursor)query=query.startAfter(cursor);
   const snap=await query.limit(100).get();
   if(snap.empty)break;
   const batch=db().batch();let pending=0;
   for(const doc of snap.docs){
    if(!notificationUnread(doc.data()))continue;
    batch.set(doc.ref,{read:true,readAt:FieldValue.serverTimestamp()},{merge:true});
    pending++;count++;
   }
   if(pending)await batch.commit();
   scanned+=snap.size;
   cursor=snap.docs.at(-1);
   if(snap.size<100)break;
  }
  return NextResponse.json({ok:true,updated:count,partial:scanned>=2000},{headers:safeHeaders});
 }catch{return errorResponse(503,'Unable to update notifications')}
}
