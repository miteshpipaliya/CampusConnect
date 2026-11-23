import {NextRequest,NextResponse} from 'next/server';import {z} from 'zod';import {FieldValue} from 'firebase-admin/firestore';import {guard} from '@/lib/server/guard';import {db} from '@/lib/server/services';import {errorResponse,safeHeaders} from '@/lib/server/session';
export const runtime='nodejs';const schema=z.object({title:z.string().trim().min(1).max(40).optional(),storyIds:z.array(z.string().min(10).max(100)).max(50).optional(),coverMediaId:z.string().uuid().nullable().optional(),order:z.number().int().min(0).optional()});
export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const checked=await guard(req,{write:true,schema,rateLimit:{key:'highlights-update:{uid}',limit:40,windowSec:3600}});if(!checked.ok)return checked.response;
 const {id}=await params;if(!/^[a-zA-Z0-9_-]{10,100}$/.test(id))return errorResponse(400,'Invalid highlight');
 const input=schema.parse(checked.input),store=db(),ref=store.collection('highlights').doc(id),doc=await ref.get();
 if(!doc.exists)return errorResponse(404,'Not found');if(doc.data()?.ownerUid!==checked.user.uid)return errorResponse(403,'Not allowed');
 if(input.storyIds){const data=await store.getAll(...input.storyIds.map(storyId=>store.collection('stories').doc(storyId)));if(data.some(d=>!d.exists||d.data()?.authorUid!==checked.user.uid))return errorResponse(403,'Story unavailable')}
 await ref.update({...input,updatedAt:FieldValue.serverTimestamp()});return NextResponse.json({ok:true},{headers:safeHeaders});
}
export async function DELETE(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const checked=await guard(req,{write:true,rateLimit:{key:'highlights-delete:{uid}',limit:20,windowSec:3600}});if(!checked.ok)return checked.response;
 const {id}=await params;const ref=db().collection('highlights').doc(id),doc=await ref.get();
 if(!doc.exists)return errorResponse(404,'Not found');if(doc.data()?.ownerUid!==checked.user.uid)return errorResponse(403,'Not allowed');
 await ref.delete();return NextResponse.json({ok:true},{headers:safeHeaders});
}
