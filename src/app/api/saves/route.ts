import {NextRequest,NextResponse} from 'next/server';
import {FieldValue} from 'firebase-admin/firestore';
import {z} from 'zod';
import {db} from '@/lib/server/services';
import {guard} from '@/lib/server/guard';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {canViewMany} from '@/lib/server/privacy';
import {mintUrls} from '@/lib/server/media-urls';
import {collectionCounts} from '@/lib/core/save-collections';
export const runtime='nodejs';
const schema=z.object({postId:z.string().regex(/^[A-Za-z0-9_-]{10,100}$/),collectionName:z.string().trim().min(1).max(40).optional()}).strict();
export async function GET(req:NextRequest){
 const user=await session(req);if(!user)return errorResponse(401,'Sign in required');
 const cursor=req.nextUrl.searchParams.get('cursor'),filter=req.nextUrl.searchParams.get('collection')?.trim()||null;
 if(cursor&&!/^[A-Za-z0-9_-]{10,100}$/.test(cursor))return errorResponse(400,'Invalid cursor');
 if(filter&&filter.length>40)return errorResponse(400,'Invalid collection');
 const limit=Math.max(1,Math.min(40,Number(req.nextUrl.searchParams.get('limit')||24)||24));
 try{
  const store=db(),ref=store.collection('users').doc(user.uid).collection('saves');
  const inventory=await ref.orderBy('createdAt','desc').limit(500).get();
  const collections=collectionCounts(inventory.docs.map(d=>String(d.data().collectionName||'')));
  let query=ref.orderBy('createdAt','desc');
  if(cursor){const previous=await ref.doc(cursor).get();if(!previous.exists)return errorResponse(400,'Invalid cursor');query=query.startAfter(previous)}
  const selected:FirebaseFirestore.QueryDocumentSnapshot[]=[],visited:FirebaseFirestore.QueryDocumentSnapshot[]=[];
  for(let page=0;page<5&&selected.length<limit;page++){
   const snap=await query.limit(50).get();if(snap.empty)break;
   for(const d of snap.docs){
    visited.push(d);
    if(!filter||d.data().collectionName===filter)selected.push(d);
    if(selected.length>=limit)break;
   }
   if(selected.length>=limit||snap.size<50)break;
   query=query.startAfter(snap.docs.at(-1)!);
  }
  const posts=selected.length?await store.getAll(...selected.map(d=>store.collection('posts').doc(d.id))):[];
  const allowed=await canViewMany(user.uid,posts.filter(d=>d.exists).map(d=>String(d.data()?.authorUid||'')));
  const visible=posts.filter(d=>d.exists&&!d.data()?.deletedAt&&!d.data()?.archived&&allowed.get(String(d.data()?.authorUid||'')));
  const mediaIds=[...new Set(visible.map(d=>String(d.data()?.mediaId||'')).filter(Boolean))];
  const media=mediaIds.length?await store.getAll(...mediaIds.map(id=>store.collection('media').doc(id))):[];
  const urls=await mintUrls(media.filter(d=>d.exists).map(d=>({id:d.id,...(d.data()||{})})),{viewerUid:user.uid});
  const savedName=new Map(selected.map(d=>[d.id,String(d.data().collectionName||'')]));
  return NextResponse.json({
   items:visible.map(d=>({id:d.id,caption:d.data()?.caption??'',handle:d.data()?.authorHandle??'',collectionName:savedName.get(d.id)||null,mediaUrl:urls[d.data()?.mediaId]?.url??null})),
   collections,nextCursor:visited.length&&selected.length>=limit?visited.at(-1)?.id??null:null,
   collectionsTruncated:inventory.size===500
  },{headers:safeHeaders});
 }catch{return errorResponse(503,'Saved posts unavailable')}
}
async function update(req:NextRequest,remove:boolean){
 const checked=await guard(req,{write:true,schema,rateLimit:{key:'saves:{uid}',limit:80,windowSec:3600}});if(!checked.ok)return checked.response;
 const parsed=schema.parse(checked.input);
 const store=db(),post=store.collection('posts').doc(parsed.postId),save=store.collection('users').doc(checked.user.uid).collection('saves').doc(parsed.postId);
 try{
  const existing=await post.get();
  if(!existing.exists||existing.data()?.deletedAt||!(await canViewMany(checked.user.uid,[String(existing.data()?.authorUid||'')])).get(String(existing.data()?.authorUid||'')))return errorResponse(404,'Post unavailable');
  const saved=await store.runTransaction(async tx=>{
   const [p,s]=await Promise.all([tx.get(post),tx.get(save)]);
   if(!p.exists||p.data()?.deletedAt)throw Error('MISSING');
   if(remove&&s.exists){tx.delete(save);tx.update(post,{'counters.saves':FieldValue.increment(-1)});return false}
   if(!remove&&!s.exists){tx.create(save,{postId:post.id,collectionName:parsed.collectionName||null,createdAt:FieldValue.serverTimestamp()});tx.update(post,{'counters.saves':FieldValue.increment(1)});return true}
   if(!remove&&s.exists&&parsed.collectionName){tx.set(save,{collectionName:parsed.collectionName},{merge:true})}
   return s.exists;
  });
  return NextResponse.json({saved},{headers:safeHeaders});
 }catch{return errorResponse(503,'Save operation unavailable')}
}
export async function POST(req:NextRequest){return update(req,false)}
export async function DELETE(req:NextRequest){return update(req,true)}
