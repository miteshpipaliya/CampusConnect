import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';import {FieldValue} from 'firebase-admin/firestore';
import {guard} from '@/lib/server/guard';import {db} from '@/lib/server/services';
import {errorResponse,safeHeaders} from '@/lib/server/session';
import {syncHighlightMembership} from '@/lib/server/highlight-membership';
export const runtime='nodejs';
const schema=z.object({title:z.string().trim().min(1).max(40).optional(),storyIds:z.array(z.string().regex(/^[A-Za-z0-9_-]{10,100}$/)).min(1).max(50).optional(),coverMediaId:z.string().uuid().nullable().optional(),order:z.number().int().min(0).optional()}).strict();
const valid=(id:string)=>/^[a-zA-Z0-9_-]{10,100}$/.test(id);
export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const checked=await guard(req,{write:true,schema,rateLimit:{key:'highlights-update:{uid}',limit:40,windowSec:3600}});if(!checked.ok)return checked.response;
 const {id}=await params;if(!valid(id))return errorResponse(400,'Invalid highlight');
 const input=schema.parse(checked.input),store=db(),ref=store.collection('highlights').doc(id),doc=await ref.get();
 if(!doc.exists)return errorResponse(404,'Not found');if(doc.data()?.ownerUid!==checked.user.uid)return errorResponse(403,'Not allowed');
 const existing:Array<string>=Array.isArray(doc.data()?.storyIds)?doc.data()!.storyIds:[],next=input.storyIds?[...new Set(input.storyIds)]:existing;
 if(input.storyIds||input.coverMediaId){
  const stories=next.length?await store.getAll(...next.map(key=>store.collection('stories').doc(key))):[];
  if(stories.some(d=>!d.exists||d.data()?.authorUid!==checked.user.uid))return errorResponse(403,'Story unavailable');
  if(input.coverMediaId&&!stories.some(d=>d.data()?.mediaId===input.coverMediaId))return errorResponse(400,'Invalid cover');
 }
 try{
  await ref.update({...input,...(input.storyIds?{storyIds:next}:{}),updatedAt:FieldValue.serverTimestamp()});
  if(input.storyIds)await syncHighlightMembership(checked.user.uid,[...existing,...next]);
  return NextResponse.json({ok:true},{headers:safeHeaders});
 }catch{return errorResponse(503,'Highlight update unavailable')}
}
export async function DELETE(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const checked=await guard(req,{write:true,rateLimit:{key:'highlights-delete:{uid}',limit:20,windowSec:3600}});if(!checked.ok)return checked.response;
 const {id}=await params;if(!valid(id))return errorResponse(400,'Invalid highlight');
 const ref=db().collection('highlights').doc(id),doc=await ref.get();
 if(!doc.exists)return errorResponse(404,'Not found');if(doc.data()?.ownerUid!==checked.user.uid)return errorResponse(403,'Not allowed');
 try{
  const ids:Array<string>=Array.isArray(doc.data()?.storyIds)?doc.data()!.storyIds:[];
  await ref.delete();await syncHighlightMembership(checked.user.uid,ids);
  return NextResponse.json({ok:true},{headers:safeHeaders});
 }catch{return errorResponse(503,'Could not delete highlight')}
}
