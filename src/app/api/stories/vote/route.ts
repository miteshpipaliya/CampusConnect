import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {FieldValue} from 'firebase-admin/firestore';
import {db} from '@/lib/server/services';
import {guard} from '@/lib/server/guard';
import {canViewAuthor} from '@/lib/server/privacy';
import {errorResponse,safeHeaders} from '@/lib/server/session';
export const runtime='nodejs';
const schema=z.object({storyId:z.string().min(10).max(40),option:z.number().int().min(0).max(1)});
export async function POST(req:NextRequest){
 const checked=await guard(req,{write:true,schema,rateLimit:{key:'story-vote:{uid}',limit:60,windowSec:3600}});if(!checked.ok)return checked.response;
 const parsed=schema.safeParse(checked.input);if(!parsed.success)return errorResponse(400,'Invalid vote');
 try{const store=db(),storyRef=store.collection('stories').doc(parsed.data.storyId),story=await storyRef.get();
  if(!story.exists||!story.data()?.poll||story.data()?.expiresAt?.toMillis?.()<=Date.now())return errorResponse(404,'Poll unavailable');
  const authorUid=String(story.data()?.authorUid||'');
  if(!(await canViewAuthor(checked.user.uid,authorUid)))return errorResponse(403,'Poll unavailable');
  if(story.data()?.audience==='close'&&authorUid!==checked.user.uid){const friend=await store.collection('closeFriends').doc(authorUid+'_'+checked.user.uid).get();if(!friend.exists)return errorResponse(403,'Poll unavailable')}
  const ref=storyRef.collection('votes').doc(checked.user.uid);
  await store.runTransaction(async tx=>{const old=await tx.get(ref);if(old.exists)throw Error('ALREADY_VOTED');tx.create(ref,{option:parsed.data.option,createdAt:FieldValue.serverTimestamp()})});
  return NextResponse.json({ok:true},{headers:safeHeaders});
 }catch{return errorResponse(409,'Vote unavailable or already recorded')}
}
