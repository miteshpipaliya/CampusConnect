import {NextRequest,NextResponse} from 'next/server';
import {FieldValue,Timestamp,FieldPath} from 'firebase-admin/firestore';
import {z} from 'zod';
import {db} from '@/lib/server/services';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {guard} from '@/lib/server/guard';
import {RATE_LIMITS} from '@/lib/server/rate-limit';
import {clampLimit,decodeCursor,encodeCursor} from '@/lib/core/cursor';
import {normalizeCounters} from '@/lib/core/counters';
import {canViewAuthor} from '@/lib/server/privacy';
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
   const authorCache=new Map<string,Promise<boolean>>();
   const visible=await Promise.all(snap.docs.map(doc=>{
    const uid=String(doc.data().authorUid||'');
    let allowed=authorCache.get(uid);if(!allowed){allowed=canViewAuthor(user.uid,uid);authorCache.set(uid,allowed)}
    return allowed;
   }));
   for(let i=0;i<snap.docs.length;i++){const doc=snap.docs[i]!;if(visible[i]&&!doc.data().deletedAt){selected.push(doc);if(selected.length===limit)break}}
   if(snap.docs.length<50)break;
   const last=snap.docs.at(-1);if(!last)break;
   query=query.startAfter(last);
  }
  const muteSnaps=await store.collection('mutes').where('ownerUid','==',user.uid).limit(200).get();
  const muted=new Set(muteSnaps.docs.filter(d=>d.data().posts!==false).map(d=>String(d.data().targetUid||'')));
  const filtered=selected.filter(d=>!muted.has(String(d.data().authorUid||'')));
  selected.splice(0,selected.length,...filtered);
  const likeRefs=selected.map(d=>d.ref.collection('likes').doc(user.uid));
  const saveRefs=selected.map(d=>store.collection('users').doc(user.uid).collection('saves').doc(d.id));
  const [ownLikes,ownSaves]=await Promise.all([
   likeRefs.length?store.getAll(...likeRefs):Promise.resolve([]),
   saveRefs.length?store.getAll(...saveRefs):Promise.resolve([])
  ]);
  const authorIds=[...new Set(selected.map(d=>String(d.data().authorUid||'')).filter(Boolean))];
  const users=authorIds.length?await store.getAll(...authorIds.map(id=>store.collection('users').doc(id))):[];
  const authors=new Map(users.filter(d=>d.exists).map(d=>[d.id,d.data()]));
  const mediaIds=[...new Set([
   ...selected.map(d=>d.data().mediaId),
   ...users.map(d=>d.data()?.avatarMediaId)
  ].filter((id):id is string=>typeof id==='string'&&id.length>0))];
  const mediaSnaps=mediaIds.length?await store.getAll(...mediaIds.map(id=>store.collection('media').doc(id))):[];
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
   const author=authors.get(String(data.authorUid||''));
   const avatarMediaId=typeof author?.avatarMediaId==='string'?author.avatarMediaId:null;
   return {id:d.id,caption:data.caption,authorHandle:data.authorHandle,authorUid:data.authorUid,mediaId,likes:counters.likes,comments:counters.comments,reposts:counters.reposts,liked:ownLikes[i]?.exists??false,saved:ownSaves[i]?.exists??false,avatarMediaId,avatarUrl:avatarMediaId?mediaUrls[avatarMediaId]?.url??null:null,mediaUrl:mediaId?mediaUrls[mediaId]?.url??null:null};
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
