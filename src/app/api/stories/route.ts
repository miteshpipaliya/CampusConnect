import {NextRequest,NextResponse} from 'next/server';
import {FieldValue,Timestamp} from 'firebase-admin/firestore';
import {z} from 'zod';
import {db} from '@/lib/server/services';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {guard} from '@/lib/server/guard';
import {RATE_LIMITS} from '@/lib/server/rate-limit';
import {mintUrls} from '@/lib/server/media-urls';
export const runtime='nodejs';
const schema=z.object({mediaId:z.string().uuid(),caption:z.string().trim().max(250).default('')});
export async function GET(request:NextRequest){
 const user=await session(request);if(!user)return errorResponse(401,'Sign in required');
 try{
  const now=Timestamp.now();
  const snapshot=await db().collection('stories').where('expiresAt','>',now).limit(100).get();
  const stories=snapshot.docs.filter(d=>d.data().visibility==='campus'||d.data().authorUid===user.uid).map(d=>({id:d.id,authorHandle:d.data().authorHandle,authorUid:d.data().authorUid,mediaId:d.data().mediaId,contentType:d.data().contentType||'image/jpeg',caption:d.data().caption||'',highlight:Boolean(d.data().highlight),isMine:d.data().authorUid===user.uid,createdAt:d.data().createdAt?.toMillis?.()||0})).sort((a,b)=>b.createdAt-a.createdAt);
  const mediaIds=stories.map(story=>story.mediaId).filter((id):id is string=>typeof id==='string');
  const media=mediaIds.length?await db().getAll(...mediaIds.map(id=>db().collection('media').doc(id))):[];
  const urls=await mintUrls(media.filter(doc=>doc.exists).map(doc=>({id:doc.id,...(doc.data()??{})})),{viewerUid:user.uid});
  return NextResponse.json({stories:stories.map(story=>({...story,mediaUrl:urls[story.mediaId]?.url??null}))},{headers:safeHeaders});
 }catch{return errorResponse(503,'Stories unavailable')}
}
export async function POST(request:NextRequest){
 const checked=await guard(request,{write:true,schema,invalidMessage:'Invalid story',rateLimit:{key:'stories:{uid}',...RATE_LIMITS.stories}});
 if(!checked.ok)return checked.response;
 const user=checked.user;
 try{
  const parsed=schema.safeParse(checked.input);if(!parsed.success)return errorResponse(400,'Invalid story');
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
 const checked=await guard(request,{write:true});if(!checked.ok)return checked.response;
 const user=checked.user;
 const id=request.nextUrl.searchParams.get('id')||'';
 if(!/^[A-Za-z0-9_-]{10,40}$/.test(id))return errorResponse(400,'Invalid story ID');
 try{const ref=db().collection('stories').doc(id),story=await ref.get();if(!story.exists)return errorResponse(404,'Story not found');if(story.data()?.authorUid!==user.uid)return errorResponse(403,'Not your story');await ref.delete();return NextResponse.json({deleted:true},{headers:safeHeaders})}catch{return errorResponse(503,'Unable to delete story')}
}

export async function PATCH(request:NextRequest){
 if(!sameOrigin(request))return errorResponse(403,'Untrusted request origin');
 const user=await session(request);if(!user)return errorResponse(401,'Sign in required');
 const input=z.object({id:z.string().min(10).max(40),highlight:z.boolean()}).safeParse(await request.json().catch(()=>null));
 if(!input.success)return errorResponse(400,'Invalid highlight request');
 try{const ref=db().collection('stories').doc(input.data.id),doc=await ref.get();
  if(!doc.exists)return errorResponse(404,'Story not found');
  if(doc.data()?.authorUid!==user.uid)return errorResponse(403,'Not your story');
  await ref.update({highlight:input.data.highlight});
  return NextResponse.json({ok:true},{headers:safeHeaders});
 }catch{return errorResponse(503,'Unable to update highlight')}
}
