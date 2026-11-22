import {NextRequest,NextResponse} from 'next/server';
import {FieldValue,Timestamp} from 'firebase-admin/firestore';
import {z} from 'zod';
import {db} from '@/lib/server/services';
import {session,errorResponse,safeHeaders} from '@/lib/server/session';
import {guard} from '@/lib/server/guard';
import {RATE_LIMITS} from '@/lib/server/rate-limit';
import {canViewMany} from '@/lib/server/privacy';
import {hydrateAvatars} from '@/lib/server/avatar-hydration';
import {mintUrls} from '@/lib/server/media-urls';
import {claimMedia} from '@/lib/server/media-service';
export const runtime='nodejs';
const schema=z.object({mediaId:z.string().uuid(),caption:z.string().trim().max(250).default(''),overlay:z.object({text:z.string().max(150),color:z.string().max(30),x:z.number().min(0).max(1),y:z.number().min(0).max(1)}).optional(),poll:z.object({question:z.string().max(100),options:z.tuple([z.string().min(1).max(50),z.string().min(1).max(50)])}).optional(),audience:z.enum(['all','close']).default('all')});
export async function GET(request:NextRequest){
 const user=await session(request);if(!user)return errorResponse(401,'Sign in required');
 try{
  const now=Timestamp.now();
  const snapshot=await db().collection('stories').where('expiresAt','>',now).limit(100).get();
  const visibilityMap=await canViewMany(user.uid,snapshot.docs.map(d=>String(d.data().authorUid||'')));
  const visibility=snapshot.docs.map(d=>visibilityMap.get(String(d.data().authorUid||''))??false);
  const closeAuthors=[...new Set(snapshot.docs.filter(d=>d.data().audience==='close').map(d=>String(d.data().authorUid||'')))];
  const friendChecks=await Promise.all(closeAuthors.map(uid=>uid===user.uid?Promise.resolve(true):db().collection('closeFriends').doc(uid+'_'+user.uid).get().then(s=>s.exists)));
  const closeAccess=new Map(closeAuthors.map((uid,i)=>[uid,friendChecks[i]]));
  const muteSnap=await db().collection('mutes').where('ownerUid','==',user.uid).limit(200).get();
  const mutedStories=new Set(muteSnap.docs.filter(d=>d.data().stories!==false).map(d=>String(d.data().targetUid||'')));
  const stories=snapshot.docs.filter((d,i)=>visibility[i]&&!mutedStories.has(String(d.data().authorUid||''))&&(d.data().audience!=='close'||closeAccess.get(String(d.data().authorUid||''))===true)).map(d=>({id:d.id,authorHandle:d.data().authorHandle,authorUid:d.data().authorUid,mediaId:d.data().mediaId,contentType:d.data().contentType||'image/jpeg',caption:d.data().caption||'',overlay:d.data().overlay||null,poll:d.data().poll||null,highlight:Boolean(d.data().highlight),isMine:d.data().authorUid===user.uid,createdAt:d.data().createdAt?.toMillis?.()||0})).sort((a,b)=>b.createdAt-a.createdAt);
  const authors=await hydrateAvatars(stories.map(story=>story.authorUid),user.uid);
  const mediaIds=stories.map(story=>story.mediaId).filter((id):id is string=>typeof id==='string');
  const media=mediaIds.length?await db().getAll(...mediaIds.map(id=>db().collection('media').doc(id))):[];
  const expiresByMedia=new Map(snapshot.docs.map(doc=>[doc.data().mediaId,doc.data().expiresAt?.toMillis?.()]));
  const urls=await mintUrls(media.filter(doc=>doc.exists).map(doc=>{const expiry=expiresByMedia.get(doc.id);return {id:doc.id,...(doc.data()??{}),...(typeof expiry==='number'?{storyExpiresAt:expiry}:{})}}),{viewerUid:user.uid});
  return NextResponse.json({stories:stories.map(story=>({...story,avatarMediaId:authors[story.authorUid]?.avatarMediaId??null,avatarUrl:authors[story.authorUid]?.avatarUrl??null,mediaUrl:urls[story.mediaId]?.url??null}))},{headers:safeHeaders});
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
   if(!media.exists)throw Error('Media unavailable');
   await claimMedia(t,{uid:user.uid,mediaRefs:[mediaRef],kind:'story',attachmentId:storyRef.id});
   t.create(storyRef,{authorUid:user.uid,authorHandle:profile.data()?.handle,mediaId:parsed.data.mediaId,contentType:media.data()?.contentType||'image/jpeg',caption:parsed.data.caption,overlay:parsed.data.overlay||null,poll:parsed.data.poll||null,audience:parsed.data.audience,visibility:profile.data()?.privacy==='private'?'private':'campus',archived:true,createdAt:FieldValue.serverTimestamp(),expiresAt:Timestamp.fromMillis(Date.now()+86400000)});
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
 const checked=await guard(request,{write:true});if(!checked.ok)return checked.response;
 const user=checked.user;
 const input=z.object({id:z.string().min(10).max(40),highlight:z.boolean()}).safeParse(await request.json().catch(()=>null));
 if(!input.success)return errorResponse(400,'Invalid highlight request');
 try{const ref=db().collection('stories').doc(input.data.id),doc=await ref.get();
  if(!doc.exists)return errorResponse(404,'Story not found');
  if(doc.data()?.authorUid!==user.uid)return errorResponse(403,'Not your story');
  await ref.update({highlight:input.data.highlight});
  return NextResponse.json({ok:true},{headers:safeHeaders});
 }catch{return errorResponse(503,'Unable to update highlight')}
}
