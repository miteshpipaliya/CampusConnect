import {NextRequest,NextResponse} from 'next/server';import {z} from 'zod';import {FieldValue} from 'firebase-admin/firestore';
import {guard} from '@/lib/server/guard';import {db} from '@/lib/server/services';import {errorResponse,safeHeaders} from '@/lib/server/session';
export const runtime='nodejs';const schema=z.object({id:z.string().min(10).max(128).optional(),all:z.boolean().optional()});
export async function POST(req:NextRequest){
 const checked=await guard(req,{write:true,schema,rateLimit:{key:'notifications-read:{uid}',limit:80,windowSec:3600}});if(!checked.ok)return checked.response;
 const input=schema.parse(checked.input);if(!input.id&&!input.all)return errorResponse(400,'Specify a notification or all');
 const ref=db().collection('users').doc(checked.user.uid).collection('notifications');
 if(input.id){const doc=await ref.doc(input.id).get();if(!doc.exists)return errorResponse(404,'Notification missing');await doc.ref.set({read:true,readAt:FieldValue.serverTimestamp()},{merge:true});return NextResponse.json({ok:true},{headers:safeHeaders})}
 let count=0;for(let i=0;i<5;i++){const snap=await ref.where('read','==',false).limit(100).get();if(snap.empty)break;const batch=db().batch();snap.docs.forEach(d=>batch.set(d.ref,{read:true,readAt:FieldValue.serverTimestamp()},{merge:true}));await batch.commit();count+=snap.size}
 return NextResponse.json({ok:true,updated:count},{headers:safeHeaders});
}
