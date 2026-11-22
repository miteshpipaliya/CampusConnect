import {NextRequest,NextResponse} from 'next/server';
import {FieldValue,Timestamp,FieldPath} from 'firebase-admin/firestore';
import {z} from 'zod';
import {db} from '@/lib/server/services';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {guard} from '@/lib/server/guard';
import {RATE_LIMITS} from '@/lib/server/rate-limit';
import {clampLimit,decodeCursor,encodeCursor} from '@/lib/core/cursor';
import {normalizeCounters} from '@/lib/core/counters';
import {mintUrls} from '@/lib/server/media-urls';
export const runtime='nodejs';
const schema=z.object({caption:z.string().trim().min(1).max(2200),mediaId:z.string().uuid().optional()});
export async function GET(request:NextRequest){
 const user=await session(request);if(!user)return errorResponse(401,'Sign in required');
 const cursorValue=request.nextUrl.searchParams.get('cursor');
 const hasPaging=cursorValue!==null||request.nextUrl.searchParams.has('limit');
 const limit=hasPaging?clampLimit(request.nextUrl.searchParams.get('limit'),10,30):30;
 const cursor=cursorValue?decodeCursor(cursorValue):null;
 if(cursorValue&&!cursor)return errorResponse(400,'Invalid cursor');
 try{
  const store=db();const selected:FirebaseFirestore.QueryDocumentSnapshot[]=[];
  let query=store.collection('posts').orderBy('createdAt','desc').orderBy(FieldPath.documentId(),'desc');
  if(cursor)query=query.startAfter(Timestamp.fromMillis(cursor.millis),cursor.id);
  for(let page=0;page<4&&selected.length<limit;page++){
   const snap=await query.limit(50).get();
   for(const doc of snap.docs){if(doc.data().visibility==='campus'||doc.data().authorUid===user.uid){selected.push(doc);if(selected.length===limit)break}}
   if(snap.docs.length<50)break;
   const last=snap.docs.at(-1);if(!last)break;
   query=query.startAfter(last);
  }
  const likeRefs=selected.map(d=>d.ref.collection('likes').doc(user.uid));
  const ownLikes=likeRefs.length?await store.getAll(...likeRefs):[];
  const ids=selected.map(d=>d.data().mediaId).filter((x):x is string=>typeof x==='string'&&x.length>0);
  const mediaSnaps=ids.length?await store.getAll(...ids.map(id=>store.collection('media').doc(id))):[];
  const mediaUrls=await mintUrls(mediaSnaps.filter(x=>x.exists).map(x=>({id:x.id,...(x.data()??{})})),{viewerUid:user.uid});
  const posts=await Promise.all(selected.map(async(d,i)=>{
   const data=d.data(),normalized=normalizeCounters(data.counters);
   let counters=normalized;
   if(normalized.isLegacy){
    const [likes,comments]=await Promise.all([d.ref.collection('likes').count().get(),d.ref.collection('comments').count().get()]);
    counters={...normalized,likes:likes.data().count,comments:comments.data().count};
    void d.ref.set({counters:{likes:counters.likes,comments:counters.comments,reposts:counters.reposts,saves:0,shares:0,views:0}},{merge:true}).catch(()=>{});
   }
   const mediaId=typeof data.mediaId==='string'?data.mediaId:null;
   return {id:d.id,caption:data.caption,authorHandle:data.authorHandle,authorUid:data.authorUid,mediaId,likes:counters.likes,comments:counters.comments,reposts:counters.reposts,liked:ownLikes[i]?.exists??false,mediaUrl:mediaId?mediaUrls[mediaId]?.url??null:null};
  }));
  const last=selected.at(-1);
  const lastMs=last?.data().createdAt?.toMillis?.();
  const nextCursor=last&&typeof lastMs==='number'?encodeCursor(lastMs,last.id):null;
  return NextResponse.json({posts,nextCursor},{headers:safeHeaders});
 }catch{return errorResponse(503,'Feed unavailable')}
}
export async function POST(request:NextRequest){
 const checked=await guard(request,{write:true,schema,invalidMessage:'Invalid post',rateLimit:{key:'posts:{uid}',...RATE_LIMITS.posts}});
 if(!checked.ok)return checked.response;
 const {user}=checked;
 const parsed=schema.safeParse(checked.input);
 if(!parsed.success)return errorResponse(400,'Invalid post');
 try{
  const store=db(),profile=await store.collection('users').doc(user.uid).get();
  if(!profile.exists)return errorResponse(403,'Profile missing');
  const mediaId=parsed.data.mediaId,newPost=store.collection('posts').doc();
  await store.runTransaction(async transaction=>{
   if(mediaId){const media=store.collection('media').doc(mediaId),info=await transaction.get(media);
    if(!info.exists||info.data()?.ownerUid!==user.uid||info.data()?.status!=='uploaded'||info.data()?.postId||info.data()?.storyId)throw Error('INVALID_MEDIA');
    transaction.update(media,{postId:newPost.id});
   }
   transaction.create(newPost,{authorUid:user.uid,authorHandle:profile.data()!.handle,caption:parsed.data.caption,mediaId:mediaId||null,visibility:profile.data()!.privacy==='private'?'private':'campus',createdAt:FieldValue.serverTimestamp(),type:'post',deletedAt:null,counters:{likes:0,comments:0,reposts:0,saves:0,shares:0,views:0}});
  });
  return NextResponse.json({ok:true,id:newPost.id},{headers:safeHeaders});
 }catch{return errorResponse(503,'Unable to publish post')}
}
