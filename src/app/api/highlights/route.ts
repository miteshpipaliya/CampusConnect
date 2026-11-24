import {NextRequest,NextResponse} from 'next/server';
import {FieldValue} from 'firebase-admin/firestore';
import {z} from 'zod';
import {db} from '@/lib/server/services';
import {guard} from '@/lib/server/guard';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {canViewAuthor} from '@/lib/server/privacy';
import {mintUrls} from '@/lib/server/media-urls';
export const runtime='nodejs';
const idSchema=z.string().regex(/^[a-zA-Z0-9_-]{10,100}$/);
const schema=z.object({title:z.string().trim().min(1).max(40),storyIds:z.array(idSchema).min(1).max(50),coverMediaId:z.string().uuid().optional()}).strict();

export async function GET(req:NextRequest){
 const user=await session(req);if(!user)return errorResponse(401,'Sign in required');
 const handle=req.nextUrl.searchParams.get('handle')?.trim().toLowerCase()||'';
 try{
  const store=db();let ownerUid=user.uid;
  if(handle){
   const match=await store.collection('handles').doc(handle).get();
   if(!match.exists||typeof match.data()?.uid!=='string')return errorResponse(404,'Profile unavailable');
   ownerUid=String(match.data()?.uid);
  }
  if(!(await canViewAuthor(user.uid,ownerUid)))return errorResponse(404,'Profile unavailable');
  const snap=await store.collection('highlights').where('ownerUid','==',ownerUid).limit(50).get();
  const highlights=snap.docs.map(d=>({id:d.id,title:String(d.data().title||''),storyIds:(Array.isArray(d.data().storyIds)?d.data().storyIds:[]) as string[],order:Number(d.data().order||0)}));
  const ids=[...new Set(highlights.flatMap(h=>h.storyIds))].slice(0,500);
  const stories=ids.length?await store.getAll(...ids.map(id=>store.collection('stories').doc(id))):[];
  const storyMap=new Map(stories.filter(d=>d.exists&&d.data()?.authorUid===ownerUid).map(d=>[d.id,d]));
  let close=false;
  if(ownerUid!==user.uid){
   const relation=await store.collection('closeFriends').doc(ownerUid+'_'+user.uid).get();close=relation.exists;
  }
  const visible=highlights.map(h=>{
   const storyDocs=h.storyIds.map(id=>storyMap.get(id)).filter((d):d is NonNullable<typeof d>=>Boolean(d));
   const allowed=storyDocs.filter(d=>ownerUid===user.uid||d.data()?.audience!=='close'||close);
   return {...h,storyDocs:allowed};
  }).filter(h=>h.storyDocs.length);
  const mediaIds=[...new Set(visible.flatMap(h=>h.storyDocs.map(d=>String(d.data()?.mediaId||''))).filter(Boolean))];
  const media=mediaIds.length?await store.getAll(...mediaIds.map(id=>store.collection('media').doc(id))):[];
  const signed=await mintUrls(media.filter(d=>d.exists).map(d=>({id:d.id,...(d.data()||{})})),{viewerUid:user.uid});
  const mediaTypes=new Map(media.map(d=>[d.id,String(d.data()?.contentType||'image/jpeg')]));
  return NextResponse.json({items:visible.map(h=>{
   const cover=String(h.storyDocs[0]?.data()?.mediaId||'');
   return {id:h.id,title:h.title,coverUrl:signed[cover]?.url??null,coverContentType:mediaTypes.get(cover)||'image/jpeg',storyCount:h.storyDocs.length,order:h.order,...(user.uid===ownerUid?{storyIds:h.storyDocs.map(d=>d.id)}:{})};
  }).sort((a,b)=>a.order-b.order)},{headers:safeHeaders});
 }catch{return errorResponse(503,'Highlights unavailable')}
}
export async function POST(req:NextRequest){
 const checked=await guard(req,{write:true,schema,rateLimit:{key:'highlights:{uid}',limit:30,windowSec:3600}});if(!checked.ok)return checked.response;
 const input=schema.parse(checked.input),store=db(),ids=[...new Set(input.storyIds)];
 try{
  const own=await store.collection('highlights').where('ownerUid','==',checked.user.uid).limit(51).get();
  if(own.size>=50)return errorResponse(409,'Maximum 50 highlights');
  const docs=await store.getAll(...ids.map(id=>store.collection('stories').doc(id)));
  if(docs.some(d=>!d.exists||d.data()?.authorUid!==checked.user.uid))return errorResponse(403,'One or more stories unavailable');
  const mediaIds=docs.map(d=>String(d.data()?.mediaId||''));
  if(input.coverMediaId&&!mediaIds.includes(input.coverMediaId))return errorResponse(400,'Cover must belong to this highlight');
  const ref=store.collection('highlights').doc(),batch=store.batch();
  batch.create(ref,{ownerUid:checked.user.uid,title:input.title,storyIds:ids,coverMediaId:input.coverMediaId||mediaIds[0]||null,order:Date.now(),createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});
  for(const doc of docs)batch.update(doc.ref,{highlight:true,highlightManaged:true});
  await batch.commit();
  return NextResponse.json({id:ref.id},{status:201,headers:safeHeaders});
 }catch{return errorResponse(503,'Could not create highlight')}
}
