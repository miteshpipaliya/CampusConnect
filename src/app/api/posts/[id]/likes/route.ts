import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest,NextResponse } from 'next/server';
import { db } from '@/lib/server/services';
import { session,sameOrigin,errorResponse,safeHeaders } from '@/lib/server/session';
export const runtime='nodejs';
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 if(!sameOrigin(request))return errorResponse(403,'Untrusted origin');
 const user=await session(request);if(!user)return errorResponse(401,'Sign in required');
 const {id}=await params;
 try{const store=db(),post=store.collection('posts').doc(id),like=post.collection('likes').doc(user.uid);
  const liked=await store.runTransaction(async t=>{const p=await t.get(post);
   if(!p.exists||!(p.data()?.visibility==='campus'||p.data()?.authorUid===user.uid))throw Error('NOT_FOUND');
   const old=await t.get(like);if(old.exists)t.delete(like);else t.create(like,{uid:user.uid,createdAt:new Date()});return !old.exists;});
  if(liked){const [owner,actor]=await Promise.all([post.get(),store.collection('users').doc(user.uid).get()]);const uid=owner.data()?.authorUid;if(uid&&uid!==user.uid)await store.collection('users').doc(uid).collection('notifications').add({type:'like',actorUid:user.uid,actorHandle:actor.data()?.handle??'Member',postId:id,createdAt:FieldValue.serverTimestamp()});}
  return NextResponse.json({liked},{headers:safeHeaders});
 }catch{return errorResponse(404,'Post unavailable')}
}