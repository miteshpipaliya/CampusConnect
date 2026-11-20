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
  return NextResponse.json({liked},{headers:safeHeaders});
 }catch{return errorResponse(404,'Post unavailable')}
}