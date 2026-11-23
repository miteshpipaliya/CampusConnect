import {NextRequest,NextResponse} from 'next/server';import {FieldValue} from 'firebase-admin/firestore';import {z} from 'zod';
import {db} from '@/lib/server/services';import {guard} from '@/lib/server/guard';import {session,errorResponse,safeHeaders} from '@/lib/server/session';import {canViewAuthor} from '@/lib/server/privacy';
export const runtime='nodejs';
const schema=z.object({title:z.string().trim().min(1).max(40),storyIds:z.array(z.string().min(10).max(100)).min(1).max(50),coverMediaId:z.string().uuid().optional()});
export async function GET(req:NextRequest){
 const user=await session(req);if(!user)return errorResponse(401,'Sign in required');
 const handle=req.nextUrl.searchParams.get('handle')||'';
 try{
  const store=db();let uid=user.uid;
  if(handle){const match=await store.collection('handles').doc(handle.toLowerCase()).get();uid=String(match.data()?.uid||'');if(!uid)return errorResponse(404,'Profile unavailable')}
  if(!(await canViewAuthor(user.uid,uid)))return errorResponse(404,'Profile unavailable');
  const docs=await store.collection('highlights').where('ownerUid','==',uid).limit(50).get();
  return NextResponse.json({items:docs.docs.map(d=>({id:d.id,title:d.data().title,storyIds:d.data().storyIds??[],coverMediaId:d.data().coverMediaId||null,order:d.data().order??0})).sort((a,b)=>a.order-b.order)},{headers:safeHeaders});
 }catch{return errorResponse(503,'Highlights unavailable')}
}
export async function POST(req:NextRequest){
 const checked=await guard(req,{write:true,schema,rateLimit:{key:'highlights:{uid}',limit:30,windowSec:3600}});if(!checked.ok)return checked.response;
 const input=schema.parse(checked.input),store=db(),ids=[...new Set(input.storyIds)];
 try{
  const docs=await store.getAll(...ids.map(id=>store.collection('stories').doc(id)));
  if(docs.some(d=>!d.exists||d.data()?.authorUid!==checked.user.uid))return errorResponse(403,'One or more stories are unavailable');
  const id=store.collection('highlights').doc();
  await id.set({ownerUid:checked.user.uid,title:input.title,storyIds:ids,coverMediaId:input.coverMediaId??null,order:Date.now(),createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});
  return NextResponse.json({id:id.id},{status:201,headers:safeHeaders});
 }catch{return errorResponse(503,'Could not create highlight')}
}
