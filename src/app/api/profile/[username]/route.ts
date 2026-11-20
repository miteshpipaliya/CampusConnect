import { NextRequest,NextResponse } from 'next/server';
import { db } from '@/lib/server/services';
import { session,errorResponse,safeHeaders } from '@/lib/server/session';
export const runtime='nodejs';
export async function GET(request:NextRequest,{params}:{params:Promise<{username:string}>}){
 const user=await session(request);if(!user)return errorResponse(401,'Sign in required');
 const {username}=await params;
 try{const store=db(),current=await store.collection('users').doc(user.uid).get();
  const self=username==='me'||username===current.data()?.handle;
  const target=self?current:await (async()=>{const handle=await store.collection('handles').doc(username.toLowerCase()).get();return handle.exists?store.collection('users').doc(handle.data()!.uid).get():null})();
  if(!target?.exists)return errorResponse(404,'Profile not found');
  const d=target.data()!,{handle,name,branch,division,bio='',relationshipStatus='',relationshipVisibility='me',avatarMediaId=null}=d;
  const [posts,reposts,stories]=await Promise.all([store.collection('posts').where('authorUid','==',target.id).limit(50).get(),store.collection('reposts').where('ownerUid','==',target.id).limit(50).get(),store.collection('stories').where('authorUid','==',target.id).limit(30).get()]);
  const visiblePosts=posts.docs.filter(p=>self||p.data().visibility==='campus');
  const detailedPosts=await Promise.all(visiblePosts.map(async p=>{const id=p.data().mediaId||null;const media=id?await store.collection('media').doc(id).get():null;return {id:p.id,caption:p.data().caption,mediaId:id,contentType:media?.data()?.contentType||null}}));
  const visibleReposts=await Promise.all(reposts.docs.map(async d=>{const original=await store.collection('posts').doc(d.data().postId).get();return original.exists&&original.data()?.visibility==='campus'?{id:d.id,postId:original.id,caption:original.data()?.caption||'',mediaId:original.data()?.mediaId||null,authorHandle:original.data()?.authorHandle||''}:null}));
  return NextResponse.json({self,profile:{handle,name,branch,division,bio,avatarMediaId,relationshipStatus:self||relationshipVisibility==='campus'?relationshipStatus:undefined},
   posts:detailedPosts,reposts:visibleReposts.filter(Boolean),highlights:stories.docs.filter(d=>d.data().highlight&&(self||d.data().visibility==='campus')).map(d=>({id:d.id,mediaId:d.data().mediaId,caption:d.data().caption||'',active:(d.data().expiresAt?.toMillis?.()||0)>Date.now()}))},{headers:safeHeaders});
 }catch{return errorResponse(503,'Profile unavailable')}
}