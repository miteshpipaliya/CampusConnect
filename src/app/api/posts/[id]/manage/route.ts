import {NextRequest,NextResponse} from 'next/server';
import {FieldValue} from 'firebase-admin/firestore';
import {z} from 'zod';
import {db} from '@/lib/server/services';
import {guard} from '@/lib/server/guard';
import {errorResponse,safeHeaders} from '@/lib/server/session';
export const runtime='nodejs';
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('edit'),caption:z.string().trim().min(1).max(2200)}),
 z.object({action:z.literal('archive'),archived:z.boolean()}),
 z.object({action:z.literal('delete')})
]);
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const checked=await guard(request,{write:true,schema,rateLimit:{key:'post-management:{uid}',limit:40,windowSec:3600}});
 if(!checked.ok)return checked.response;
 const parsed=schema.safeParse(checked.input);if(!parsed.success)return errorResponse(400,'Invalid action');
 const {id}=await params;if(!/^[A-Za-z0-9_-]{10,100}$/.test(id))return errorResponse(400,'Invalid post');
 try{
  const store=db(),ref=store.collection('posts').doc(id),post=await ref.get();
  if(!post.exists||post.data()?.deletedAt)return errorResponse(404,'Post unavailable');
  if(post.data()?.authorUid!==checked.user.uid)return errorResponse(403,'Only the author can manage this post');
  const action=parsed.data;
  if(action.action==='edit')await ref.update({caption:action.caption,editedAt:FieldValue.serverTimestamp()});
  if(action.action==='archive')await ref.update({archived:action.archived,updatedAt:FieldValue.serverTimestamp()});
  if(action.action==='delete')await ref.update({deletedAt:FieldValue.serverTimestamp(),archived:true});
  return NextResponse.json({ok:true,action:action.action},{headers:safeHeaders});
 }catch{return errorResponse(503,'Post update unavailable')}
}
