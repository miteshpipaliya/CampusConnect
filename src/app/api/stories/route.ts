import {NextRequest,NextResponse} from 'next/server';
import {FieldValue,Timestamp} from 'firebase-admin/firestore';
import {z} from 'zod';
import {db} from '@/lib/server/services';
import {session,sameOrigin,errorResponse,safeHeaders} from '@/lib/server/session';
export const runtime='nodejs';
const schema=z.object({mediaId:z.string().uuid(),caption:z.string().trim().max(250).default('')});
export async function GET(request:NextRequest){
 const user=await session(request);if(!user)return errorResponse(401,'Sign in required');
 try{
  const now=Timestamp.now();
  const snapshot=await db().collection('stories').where('expiresAt','>',now).limit(100).get();
  const stories=snapshot.docs.filter(d=>d.data().visibility==='campus'||d.data().authorUid===user.uid).map(d=>({id:d.id,authorHandle:d.data().authorHandle,authorUid:d.data().authorUid,mediaId:d.data().mediaId,contentType:d.data().contentType||'image/jpeg',caption:d.data().caption||'',createdAt:d.data().createdAt?.toMillis?.()||0})).sort((a,b)=>b.createdAt-a.createdAt);
  return NextResponse.json({stories},{headers:safeHeaders});
 }catch{return errorResponse(503,'Stories unavailable')}
}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,'Untrusted request origin');
 const user=await session(request);if(!user)return errorResponse(401,'Sign in required');
 try{
  const parsed=schema.safeParse(await request.json());if(!parsed.success)return errorResponse(400,'Invalid story');
  const store=db(),profile=await store.collection('users').doc(user.uid).get();
  if(!profile.exists)return errorResponse(403,'Profile missing');
  const mediaRef=store.collection('media').doc(parsed.data.mediaId),storyRef=store.collection('stories').doc();
  await store.runTransaction(async t=>{
   const media=await t.get(mediaRef);
   if(!media.exists||media.data()?.ownerUid!==user.uid||media.data()?.status!=='uploaded'||media.data()?.postId||media.data()?.storyId)throw Error('Media unavailable');
   t.create(storyRef,{authorUid:user.uid,authorHandle:profile.data()?.handle,mediaId:parsed.data.mediaId,contentType:media.data()?.contentType||'image/jpeg',caption:parsed.data.caption,visibility:'campus',createdAt:FieldValue.serverTimestamp(),expiresAt:Timestamp.fromMillis(Date.now()+86400000)});
   t.update(mediaRef,{storyId:storyRef.id});
  });
  return NextResponse.json({id:storyRef.id},{status:201,headers:safeHeaders});
 }catch{return errorResponse(400,'Unable to publish story')}
}
export async function DELETE(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,'Untrusted request origin');
 const user=await session(request);if(!user)return errorResponse(401,'Sign in required');
 const id=request.nextUrl.searchParams.get('id')||'';
 if(!/^[A-Za-z0-9_-]{10,40}$/.test(id))return errorResponse(400,'Invalid story ID');
 try{const ref=db().collection('stories').doc(id),story=await ref.get();if(!story.exists)return errorResponse(404,'Story not found');if(story.data()?.authorUid!==user.uid)return errorResponse(403,'Not your story');await ref.delete();return NextResponse.json({deleted:true},{headers:safeHeaders})}catch{return errorResponse(503,'Unable to delete story')}
}
