import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { db } from '@/lib/server/services';
import { session,sameOrigin,errorResponse,safeHeaders } from '@/lib/server/session';

export const runtime='nodejs';
const schema=z.object({caption:z.string().trim().min(1).max(2200),mediaId:z.string().uuid().optional()});
export async function GET(request:NextRequest){
 const user=await session(request);if(!user)return errorResponse(401,'Sign in required');
 try{
  const snap=await db().collection('posts').orderBy('createdAt','desc').limit(30).get();
  const visible=snap.docs.filter(d=>d.data().visibility==='campus'||d.data().authorUid===user.uid);
  const posts=await Promise.all(visible.map(async d=>{
   const [likes,comments,ownLike]=await Promise.all([d.ref.collection('likes').count().get(),d.ref.collection('comments').count().get(),d.ref.collection('likes').doc(user.uid).get()]);
   return {id:d.id,caption:d.data().caption,authorHandle:d.data().authorHandle,authorUid:d.data().authorUid,mediaId:d.data().mediaId||null,likes:likes.data().count,comments:comments.data().count,liked:ownLike.exists};
  }));
  return NextResponse.json({posts},{headers:safeHeaders});
 }catch{return errorResponse(503,'Feed unavailable')}
}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,'Untrusted request origin');
 const user=await session(request);if(!user)return errorResponse(401,'Sign in required');
 try{
  const parsed=schema.safeParse(await request.json());
  if(!parsed.success)return errorResponse(400,'Invalid post');
  const store=db(),profile=await store.collection('users').doc(user.uid).get();
  if(!profile.exists)return errorResponse(403,'Profile missing');
  const mediaId=parsed.data.mediaId;
  const newPost=store.collection('posts').doc();
  await store.runTransaction(async transaction=>{
   if(mediaId){
    const media=store.collection('media').doc(mediaId);
    const info=await transaction.get(media);
    if(!info.exists||info.data()?.ownerUid!==user.uid||info.data()?.status!=='uploaded'||info.data()?.postId||info.data()?.storyId)throw Error('INVALID_MEDIA');
    transaction.update(media,{postId:newPost.id});
   }
   transaction.create(newPost,{authorUid:user.uid,authorHandle:profile.data()!.handle,
    caption:parsed.data.caption,mediaId:mediaId||null,
    visibility:profile.data()!.privacy==='private'?'private':'campus',createdAt:FieldValue.serverTimestamp()});
  });
  return NextResponse.json({ok:true,id:newPost.id},{headers:safeHeaders});
 }catch{return errorResponse(503,'Unable to publish post')}
}
