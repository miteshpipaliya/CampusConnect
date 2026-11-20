import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest,NextResponse } from 'next/server';
import { db } from '@/lib/server/services';
import { session,sameOrigin,errorResponse,safeHeaders } from '@/lib/server/session';
import { z } from 'zod';

export const runtime='nodejs';
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const user=await session(request);if(!user)return errorResponse(401,'Sign in required');
 const {id}=await params;
 try{const post=db().collection('posts').doc(id),p=await post.get();
  if(!p.exists||!(p.data()?.visibility==='campus'||p.data()?.authorUid===user.uid))return errorResponse(404,'Post unavailable');
  const snap=await post.collection('comments').orderBy('createdAt','desc').limit(40).get();
  return NextResponse.json({comments:snap.docs.map(d=>({id:d.id,handle:d.data().handle,text:d.data().text}))},{headers:safeHeaders});
 }catch{return errorResponse(503,'Comments unavailable')}
}
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 if(!sameOrigin(request))return errorResponse(403,'Untrusted origin');
 const user=await session(request);if(!user)return errorResponse(401,'Sign in required');
 const parsed=z.object({text:z.string().trim().min(1).max(1000)}).safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return errorResponse(400,'Invalid comment');
 const {id}=await params;
 try{const store=db(),post=store.collection('posts').doc(id);
  const [p,profile]=await Promise.all([post.get(),store.collection('users').doc(user.uid).get()]);
  if(!p.exists||!(p.data()?.visibility==='campus'||p.data()?.authorUid===user.uid)||!profile.exists)return errorResponse(404,'Post unavailable');
  const ref=await post.collection('comments').add({uid:user.uid,handle:profile.data()?.handle,text:parsed.data.text,createdAt:FieldValue.serverTimestamp()});
  const ownerUid=p.data()?.authorUid;if(ownerUid&&ownerUid!==user.uid)await store.collection('users').doc(ownerUid).collection('notifications').add({type:'comment',actorUid:user.uid,actorHandle:profile.data()?.handle??'Member',postId:id,createdAt:FieldValue.serverTimestamp()});
  return NextResponse.json({ok:true,id:ref.id},{headers:safeHeaders});
 }catch{return errorResponse(503,'Unable to comment')}
}